"""E2E against the real backend and a controlled local Ollama protocol fixture.
Start backend with OLLAMA_URL=http://127.0.0.1:11555 and a disposable STUDIO_DATA, plus Vite.
This verifies transport/UI, NOT the quality of a real Qwen model.
"""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
import json
import os
import time
from pathlib import Path
from uuid import uuid4
import httpx
from playwright.sync_api import sync_playwright, expect

CODE='''(* Motore comandato da Start, allarme coincidente con Stop. *)
PROGRAM Main
VAR
 Start : BOOL := FALSE;
 Stop : BOOL := FALSE;
 MotorRun : BOOL := FALSE;
 Alarm : BOOL := FALSE;
 Count : INT := 0;
END_VAR
MotorRun := Start AND NOT Stop;
Alarm := Stop;
END_PROGRAM'''

def evidence(quote='MotorRun',origin='explicit'):
    return dict(origin=origin,source='st',quote=quote,confirmed=False)
def b(variable):return dict(variable=variable,**evidence(variable))
SPEC=[('motor','motor','Motore M1',{'state':b('MotorRun'),'alarm':b('Alarm')}),
      ('start','button','Avvio virtuale',{'command':b('Start')}),
      ('stop','button','Arresto virtuale',{'command':b('Stop')}),
      ('lamp','lamp','Spia marcia',{'state':b('MotorRun')}),
      ('numeric','numeric','Indicatore conteggio',{'value':b('Count')}),
      ('tank','tank','Serbatoio ipotizzato',{}),('sensor','sensor','Sensore ipotizzato',{}),
      ('pump','pump','Pompa ipotizzata',{}),('valve','valve','Valvola ipotizzata',{})]
class OllamaFixture(BaseHTTPRequestHandler):
    fail=False
    slow=False
    def log_message(self,*args):pass
    def do_GET(self):self.reply({'models':[{'name':'qwen2.5-coder:7b'}]})
    def do_POST(self):
        data=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        if self.fail:self.reply({'message':{'content':'{"nodes":[{"script":"alert(1)"}]}'}});return
        if self.slow:time.sleep(1.5)
        current=json.loads(data['messages'][-1]['content'])['current_layout']
        nodes=[dict(id=id,kind=kind,label=label,position={'x':(i%3)*225,'y':(i//3)*230},bindings=bindings,
                    evidence=evidence() if i<5 else evidence('',origin='hypothesis'),manual=False) for i,(id,kind,label,bindings) in enumerate(SPEC)]
        proposal={**current,'nodes':nodes,'edges':[],'deleted_node_ids':[],'deleted_edge_ids':[]}
        self.reply({'message':{'content':json.dumps(proposal)}})
    def reply(self,payload):
        raw=json.dumps(payload).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(raw)));self.end_headers()
        try:self.wfile.write(raw)
        except BrokenPipeError:pass

server=ThreadingHTTPServer(('127.0.0.1',11555),OllamaFixture)
Thread(target=server.serve_forever,daemon=True).start()
try:
 with httpx.Client(base_url='http://127.0.0.1:8765/api',trust_env=False) as client:
  name='Sinottico E2E '+uuid4().hex[:6]
  r=client.post('/projects',json={'name':name,'family':'M241','code':CODE});r.raise_for_status();id=r.json()['id']
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
   page=browser.new_page(viewport={'width':1510,'height':1050})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto('http://127.0.0.1:5173')
   page.locator('.tree-file').filter(has_text=name).click()
   page.get_by_role('tab',name='Sinottico impianto',exact=True).click()
   page.get_by_role('tab',name='Sinottico impianto',exact=True).focus()
   page.keyboard.press('ArrowLeft')
   expect(page.get_by_role('tab',name='Codice ST')).to_have_attribute('aria-selected','true')
   page.keyboard.press('ArrowRight')
   page.get_by_label('Descrizione impianto',exact=True).fill('Banco logico motore. Nessuna dinamica serbatoio definita.')
   page.get_by_label('Lista I/O',exact=True).fill('Start BOOL comando virtuale; Stop BOOL comando virtuale; MotorRun BOOL stato')
   page.get_by_role('button',name='Genera / rigenera AI',exact=True).click()
   page.get_by_text('Proposta funzionale AI:',exact=False).wait_for()
   expect(page.locator('.plant-node')).to_have_count(9)
   # Manual label and position must survive regeneration.
   page.get_by_label('Elemento del sinottico',exact=True).select_option('motor')
   page.get_by_label('Etichetta elemento',exact=True).fill('Motore personalizzato')
   page.get_by_label('Posizione X',exact=True).fill('20')
   # Confirm state/alarm association separately from the equipment hypothesis.
   for channel in ('state','alarm'):
    page.locator(f'[data-channel="{channel}"]').get_by_role('checkbox').check()
   # Remove a speculative item and regenerate: it must remain deleted.
   page.get_by_label('Elemento del sinottico',exact=True).select_option('tank')
   page.get_by_role('button',name='Rimuovi elemento (annullabile)').click()
   page.get_by_role('button',name='Genera / rigenera AI',exact=True).click()
   page.get_by_text('Proposta funzionale AI:',exact=False).wait_for()
   expect(page.locator('.plant-node')).to_have_count(8)
   page.get_by_label('Elemento del sinottico',exact=True).select_option('motor')
   expect(page.get_by_label('Etichetta elemento',exact=True)).to_have_value('Motore personalizzato')
   expect(page.get_by_label('Posizione X',exact=True)).to_have_value('20')
   # Keyboard alternative to creating connections.
   page.get_by_label('Origine',exact=True).select_option('start')
   page.get_by_label('Destinazione',exact=True).select_option('motor')
   page.get_by_role('button',name='Aggiungi relazione funzionale',exact=True).click()
   expect(page.locator('.react-flow__edge')).to_have_count(1)
   # Confirm and prepare BOOL command, then single step existing ST interpreter.
   page.get_by_label('Elemento del sinottico',exact=True).select_option('start')
   group=page.locator('[data-channel=command]')
   group.get_by_role('checkbox').check()
   page.get_by_label('Valore comando virtuale',exact=False).select_option('true')
   page.get_by_role('button',name='Esegui scansione',exact=True).click()
   page.get_by_text('Scansione logica offline.',exact=False).wait_for()
   expect(page.locator('[data-id="motor"] .plant-node')).to_have_class('plant-node running unresolved')
   page.get_by_role('tab',name='Codice ST',exact=True).click()
   page.get_by_role('tab',name='Sinottico impianto',exact=True).click()
   expect(page.locator('.synoptic-simulation')).to_contain_text('Scansione 1/100')
   page.get_by_label('Elemento del sinottico',exact=True).select_option('stop')
   page.locator('[data-channel=command]').get_by_role('checkbox').check()
   # Binding edits reset the scan session, so include Start again via its prepared value.
   page.get_by_label('Valore comando virtuale',exact=False).select_option('true')
   page.get_by_role('button',name='Esegui scansione',exact=True).click()
   page.get_by_text('Scansione logica offline.',exact=False).wait_for()
   expect(page.locator('[data-id="motor"] .plant-node')).to_have_class('plant-node alarm unresolved')
   page.locator('.synoptic-inspector').evaluate('(el)=>el.scrollTop=0')
   page.locator('.react-flow__controls-fitview').click()
   page.screenshot(path='docs/synoptic.png',full_page=True)
   page.get_by_role('button',name='Salva revisione',exact=True).click()
   page.get_by_text('Revisione salvata in SQLite',exact=True).wait_for()
   saved=client.get('/archive/projects/'+id).json()
   assert len(saved['revisions'])==2 and len(saved['project']['synoptic']['nodes'])==8
   assert saved['project']['synoptic']['nodes'][0]['label']=='Motore personalizzato'
   # Reopen persisted version after page reload.
   page.reload();page.locator('.tree-file').filter(has_text=name).click()
   page.get_by_role('tab',name='Sinottico impianto',exact=True).click()
   expect(page.locator('.plant-node')).to_have_count(8)
   page.get_by_label('Elemento del sinottico',exact=True).select_option('motor')
   expect(page.get_by_label('Etichetta elemento',exact=True)).to_have_value('Motore personalizzato')
   # Malformed model response must preserve the graph and show recoverable error.
   OllamaFixture.fail=True
   page.get_by_role('button',name='Genera / rigenera AI',exact=True).click()
   page.get_by_role('alert').filter(has_text='Proposta JSON non valida').wait_for()
   expect(page.locator('.plant-node')).to_have_count(8)
   OllamaFixture.fail=False
   OllamaFixture.slow=True
   page.get_by_role('button',name='Genera / rigenera AI',exact=True).click()
   page.get_by_role('button',name='Annulla',exact=True).click()
   page.get_by_role('alert').filter(has_text='Generazione annullata').wait_for()
   expect(page.locator('.plant-node')).to_have_count(8)
   OllamaFixture.slow=False
   page.get_by_role('tab',name='Codice ST',exact=True).click()
   page.locator('.monaco-editor .view-lines').click(position={'x':150,'y':30})
   page.keyboard.press('Control+a')
   page.keyboard.insert_text(CODE.replace('MotorRun','MotorRunning'))
   page.get_by_role('tab',name='Sinottico impianto',exact=True).click()
   page.get_by_text('Variabile eliminata, rinominata o non riconosciuta: MotorRun',exact=False).first.wait_for()
   page.set_viewport_size({'width':1100,'height':800})
   page.emulate_media(reduced_motion='reduce')
   expect(page.get_by_role('button',name='Genera / rigenera AI',exact=True)).to_be_visible()
   expect(page.get_by_role('button',name='Esegui scansione',exact=True)).to_be_visible()
   assert not errors,errors
   browser.close()
   print('PASS: local Ollama protocol/schema, 8 SVG kinds, edits, functional link, regeneration/tombstones, commands/state/alarm, save/reload, malformed response/cancel recovery, rename warnings, narrow desktop, no JS errors')
finally:
 server.shutdown();server.server_close()
