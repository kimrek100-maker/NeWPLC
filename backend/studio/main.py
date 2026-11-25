import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import hashlib
import io
import json
import os
import secrets
from typing import Literal
from uuid import uuid4
import zipfile

import httpx
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from pypdf import PdfReader
from . import storage
from .analysis import analyze
from .ai import generate, OLLAMA, MODEL
from .simulator import simulate
from .archive import router as archive_router
from .synoptic import router as synoptic_router
from .synoptic_models import Layout

Family = Literal['M241','M251','M262','M340','M580']
TOKEN = os.getenv('STUDIO_TOKEN','')
ORIGINS = ['http://127.0.0.1:5173','http://localhost:5173','http://127.0.0.1:8765','null']

def now(): return datetime.now(timezone.utc).isoformat()

@asynccontextmanager
async def lifespan(app):
    storage.init()
    yield

app = FastAPI(title='Schneider PLC AI Studio', version='0.1.0', lifespan=lifespan)
app.include_router(archive_router)
app.include_router(synoptic_router)
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=['GET','POST','PUT','DELETE'], allow_headers=['Content-Type','X-Studio-Token'])

@app.middleware('http')
async def local_only(request: Request, call_next):
    if request.headers.get('host','').split(':')[0] not in ('127.0.0.1','localhost','testserver'):
        return Response('Host non consentito',status_code=403)
    origin = request.headers.get('origin')
    if origin and origin not in ORIGINS:
        return Response('Origine non consentita',status_code=403)
    if TOKEN and request.url.path.startswith('/api') and request.method!='OPTIONS' and not secrets.compare_digest(request.headers.get('X-Studio-Token',''),TOKEN):
        return Response('Token locale richiesto',status_code=401)
    if request.headers.get('content-length','0').isdigit() and int(request.headers.get('content-length','0'))>22*1024*1024:
        return Response('Richiesta troppo grande',status_code=413)
    return await call_next(request)

class Source(BaseModel):
    code: str = Field(min_length=1,max_length=200000)
    family: Family = 'M241'

class Project(Source):
    synoptic: Layout | None = None
    name: str = Field(min_length=1,max_length=100)
    note: str = Field(default='Salvataggio manuale',max_length=300)

class History(BaseModel):
    role: Literal['user','assistant']
    content: str = Field(max_length=16000)

class Chat(Source):
    code: str = Field(default='',max_length=200000)
    message: str = Field(min_length=1,max_length=16000)
    history: list[History] = Field(default_factory=list,max_length=12)
    agent: bool = False
    iterations: int = Field(default=3,ge=1,le=5)
    provider: Literal['ollama','cloud'] = 'ollama'

class Simulation(Source):
    scenarios: list[dict] = Field(min_length=1,max_length=100)

@app.get('/api/health')
async def health():
    return {'status':'ok','model':MODEL,'cloud_configured':bool(os.getenv('CLOUD_API_KEY') and os.getenv('CLOUD_API_URL')), 'deployment':'disabled'}

@app.get('/api/models')
async def models():
    try:
        async with httpx.AsyncClient(timeout=3,trust_env=False) as c:
            r=await c.get(OLLAMA+'/api/tags'); r.raise_for_status()
        return {'available':True,'models':r.json().get('models',[]),'selected':MODEL}
    except (httpx.HTTPError,ValueError):
        return {'available':False,'models':[],'selected':MODEL,'message':'Avviare Ollama ed eseguire ollama pull '+MODEL}

@app.get('/api/projects')
def projects():
    with storage.db() as c: return [storage.decode_project(r) for r in c.execute('SELECT * FROM projects ORDER BY updated DESC')]

@app.post('/api/projects')
def create(p:Project):
    id=str(uuid4())
    save(id,p)
    return {'id':id}

@app.put('/api/projects/{id}')
def save(id:str,p:Project):
    with storage.db() as c:
        old=c.execute('SELECT synoptic FROM projects WHERE id=?',(id,)).fetchone()
        layout=json.dumps(p.synoptic.model_dump(),ensure_ascii=False) if p.synoptic else None
        if 'synoptic' not in p.model_fields_set and old:
            layout=old['synoptic']
        c.execute('INSERT INTO projects(id,name,family,code,updated,synoptic) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,family=excluded.family,code=excluded.code,updated=excluded.updated,synoptic=excluded.synoptic',(id,p.name,p.family,p.code,now(),layout))
        c.execute('INSERT INTO revisions(project_id,code,family,note,created,synoptic) VALUES(?,?,?,?,?,?)',(id,p.code,p.family,p.note,now(),layout))
    return {'id':id}

@app.get('/api/projects/{id}/revisions')
def revisions(id:str):
    with storage.db() as c: return [storage.decode_project(r) for r in c.execute('SELECT * FROM revisions WHERE project_id=? ORDER BY id DESC',(id,))]

@app.get('/api/blocks')
def blocks():
    with storage.db() as c: return [dict(r) for r in c.execute('SELECT * FROM blocks ORDER BY name')]

@app.post('/api/blocks')
def block(p:Project):
    id=str(uuid4())
    with storage.db() as c: c.execute('INSERT INTO blocks VALUES(?,?,?,?)',(id,p.name,p.family,p.code))
    return {'id':id}

@app.post('/api/analyze')
async def analysis(p:Source): return await analyze(p.code,p.family)

@app.post('/api/simulate')
def simulation(p:Simulation):
    try: return simulate(p.code,p.scenarios)
    except (ValueError,RecursionError,KeyError,TypeError,AttributeError) as e: raise HTTPException(422,str(e)) from e

@app.post('/api/chat')
async def chat(p:Chat):
    try: return await generate(p)
    except (ValueError,KeyError,TypeError) as e: raise HTTPException(502,str(e)) from e
    except httpx.HTTPError as e: raise HTTPException(503,'Inferenza non disponibile. Verificare Ollama/modello o configurazione cloud. Nessun codice modificato.') from e

@app.get('/api/documents')
def documents():
    with storage.db() as c:
        return [dict(r) for r in c.execute('SELECT documents.*, COUNT(chunks.id) AS chunks FROM documents LEFT JOIN chunks ON documents.id=chunks.document_id GROUP BY documents.id')]

@app.post('/api/documents')
async def ingest(file:UploadFile=File(...), family:str=Form('ALL')):
    if family not in ('ALL','M241','M251','M262','M340','M580'): raise HTTPException(422,'Famiglia non valida')
    data=await file.read(20*1024*1024+1)
    if len(data)>20*1024*1024: raise HTTPException(413,'Limite documento 20 MB')
    name=(file.filename or 'documento').replace('\\','/').split('/')[-1][:150]
    try:
        if name.lower().endswith('.pdf'):
            reader=PdfReader(io.BytesIO(data))
            if reader.is_encrypted or len(reader.pages)>500: raise ValueError('PDF cifrato o oltre 500 pagine')
            pages=[(i+1,p.extract_text() or '') for i,p in enumerate(reader.pages)]
        elif name.lower().endswith(('.txt','.md','.st')): pages=[(1,data.decode('utf-8-sig'))]
        else: raise ValueError('Formati ammessi: PDF, TXT, MD, ST')
    except Exception as e: raise HTTPException(422,'Documento non leggibile: '+str(e)[:150]) from e
    if sum(len(t) for _,t in pages)>2000000: raise HTTPException(413,'Testo estratto oltre 2 milioni di caratteri')
    if not any(t.strip() for _,t in pages): raise HTTPException(422,'Nessun testo: i PDF scansiti richiedono OCR esterno')
    digest=hashlib.sha256(data).hexdigest()
    id=str(uuid4()); count=0
    with storage.db() as c:
        old=c.execute('SELECT id FROM documents WHERE digest=? AND family=?',(digest,family)).fetchone()
        if old: return {'id':old['id'],'duplicate':True}
        c.execute('INSERT INTO documents VALUES(?,?,?,?)',(id,name,family,digest))
        for page,text in pages:
            for start in range(0,len(text),1000):
                chunk=text[start:start+1200].strip()
                if not chunk: continue
                count+=1
                c.execute('INSERT INTO chunks VALUES(?,?,?,?,?)',(f'{id}:{count}',id,page,chunk,json.dumps(storage.vector(chunk))))
    return {'id':id,'chunks':count}

@app.delete('/api/documents/{id}')
def delete_document(id:str):
    with storage.db() as c:
        c.execute('DELETE FROM chunks WHERE document_id=?',(id,)); c.execute('DELETE FROM documents WHERE id=?',(id,))
    return {'deleted':id}

@app.get('/api/search')
def search(q:str,family:Family='M241'): return storage.retrieve(q[:16000],family)

@app.post('/api/export/st')
def export_st(p:Project):
    return Response(p.code, media_type='text/plain; charset=utf-8',
        headers={'Content-Disposition':'attachment; filename="Main.st"'})

@app.post('/api/export')
async def export(p:Project):
    report=await analyze(p.code,p.family)
    vendor='Machine Expert' if p.family in ('M241','M251','M262') else 'Control Expert'
    guide=f'''Schneider PLC AI Studio — {p.family} / {vendor}
Sorgente ST UTF-8 da trasferire manualmente. Non è un progetto nativo né un file XEF/XST.
Machine Expert: creare POU del tipo corretto, trasferire dichiarazioni e implementazione nelle rispettive aree.
Control Expert: creare variabili nel Data Editor e sezione ST; non incollare il wrapper PROGRAM/VAR nella sezione.
Non rinominare .st in estensioni proprietarie. Configurare task, I/O, librerie e target nel tool originale.
Stato: generato/importato; solo analisi generica se disponibile. Compilazione vendor NON eseguita.
Revisione tecnica e collaudo obbligatori prima della messa in servizio. Nessun deployment automatico.
Simulazione non certifica sicurezza. Verificare versione IDE, firmware, tipi, EFB/DFB e temporizzazioni.
'''
    out=io.BytesIO()
    with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('Main.st',p.code); z.writestr('IMPORTAZIONE.txt',guide)
        z.writestr('analysis.json',json.dumps(report,ensure_ascii=False,indent=2))
        z.writestr('manifest.json',json.dumps({'project':p.name,'family':p.family,'ide':vendor,'created':now(),'sha256':hashlib.sha256(p.code.encode()).hexdigest(),'vendor_compiled':False}))
    return Response(out.getvalue(),media_type='application/zip',headers={'Content-Disposition':'attachment; filename="plc-source.zip"'})

# Desktop serves bundled assets over loopback so Monaco workers have a real origin.
if os.getenv("STUDIO_FRONTEND"):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=os.environ["STUDIO_FRONTEND"], html=True), name="frontend")
