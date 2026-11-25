import io
import json
from pathlib import Path
import zipfile
import httpx
import pytest
from studio.simulator import simulate
from studio import ai, storage
from studio.main import Chat

CODE = (Path(__file__).resolve().parents[2]/'examples/Motor.st').read_text()
PAYLOAD={'name':'Motore','family':'M241','code':CODE}

def test_project_versions_and_export(client):
    id=client.post('/api/projects',json=PAYLOAD).json()['id']
    p={**PAYLOAD,'code':CODE.replace('MotorRun := Start','MotorRun := FALSE OR Start'),'family':'M251'}
    assert client.put('/api/projects/'+id,json=p).status_code==200
    assert client.get('/api/projects').json()[0]['family']=='M251'
    versions=client.get('/api/projects/'+id+'/revisions').json()
    assert len(versions)==2 and versions[1]['code']==CODE
    assert versions[1]['family']=='M241'
    st=client.post('/api/export/st',json=PAYLOAD)
    assert st.text==CODE
    assert 'Main.st' in st.headers['Content-Disposition']
    result=client.post('/api/export',json=PAYLOAD)
    assert result.status_code==200
    with zipfile.ZipFile(io.BytesIO(result.content)) as z:
        assert z.read('Main.st').decode()==CODE
        assert json.loads(z.read('manifest.json'))['vendor_compiled'] is False
        assert 'Control Expert' in z.read('IMPORTAZIONE.txt').decode()

def test_rag_filter_dedup_delete(client):
    content='Il temporizzatore TON è un blocco con ingresso IN e tempo PT.'
    r=client.post('/api/documents',files={'file':('manuale.txt',content.encode())},data={'family':'M241'})
    assert r.status_code==200
    id=r.json()['id']
    assert client.post('/api/documents',files={'file':('copia.txt',content.encode())},data={'family':'M241'}).json()['duplicate']
    hits=client.get('/api/search',params={'q':'temporizzatore TON','family':'M241'}).json()
    assert hits[0]['name']=='manuale.txt' and hits[0]['page']==1
    assert client.get('/api/search',params={'q':'TON','family':'M580'}).json()==[]
    client.delete('/api/documents/'+id)
    assert client.get('/api/search',params={'q':'TON'}).json()==[]
    assert client.post('/api/documents',files={'file':('a.pdf',b'invalid')}).status_code==422

def test_linter_valid_and_invalid(client):
    r=client.post('/api/analyze',json={'code':CODE,'family':'M241'}).json()
    assert r['status']=='static_checked',r
    assert not r['compiled']
    r=client.post('/api/analyze',json={'code':'PROGRAM Bad VAR END_VAR IF THEN END_PROGRAM','family':'M580'}).json()
    assert r['status']=='issues',r
    assert any(f['category']=='SYNTAX' for f in r['findings'])

def test_simulation_scan_state_and_stop_priority(client):
    cases=[{'inputs':{'Start':True,'Stop':False,'Permissive':True},'expected':{'MotorRun':True}},
        {'inputs':{'Start':False},'expected':{'MotorRun':True}},
        {'inputs':{'Start':True,'Stop':True},'expected':{'MotorRun':False}},
        {'inputs':{'Stop':False,'Permissive':False},'expected':{'MotorRun':False}}]
    r=client.post('/api/simulate',json={**PAYLOAD,'scenarios':cases})
    assert r.status_code==200,r.text
    assert all(s['passed'] for s in r.json()['scans'])
    bad=client.post('/api/simulate',json={**PAYLOAD,'scenarios':[{'inputs':{'Start':1}}]})
    assert bad.status_code==422

@pytest.mark.parametrize('code',[
    'PROGRAM X VAR t : TON; END_VAR t(IN := TRUE, PT := T#1s); END_PROGRAM',
    'PROGRAM X VAR a : INT; END_VAR WHILE TRUE DO a := 1; END_WHILE; END_PROGRAM',
    'PROGRAM X VAR a : BOOL; END_VAR a := Unknown; END_PROGRAM',
    'PROGRAM X VAR a : INT; END_VAR a := 32768; END_PROGRAM'])
def test_simulator_rejects_unsupported_or_invalid(code):
    with pytest.raises(ValueError): simulate(code,[{}])

def test_security_and_validation(client,monkeypatch):
    from studio import main
    assert client.post('/api/projects',json={**PAYLOAD,'family':'UNKNOWN'}).status_code==422
    assert client.post('/api/chat',json={**PAYLOAD,'message':'test','iterations':99}).status_code==422
    assert client.get('/api/health',headers={'Origin':'https://attacker.example'}).status_code==403
    assert client.get('/api/health',headers={'Host':'attacker.example'}).status_code==403
    monkeypatch.setattr(main,'TOKEN','secret')
    assert client.get('/api/health').status_code==401
    assert client.get('/api/health',headers={'X-Studio-Token':'secret'}).status_code==200
    assert client.get('/api/deploy').status_code==401

def test_ai_agent_retries_and_citation_filter(client,monkeypatch):
    client.post('/api/documents',files={'file':('manuale.txt',b'Controllo motore Start Stop')},data={'family':'M241'})
    source_id=storage.retrieve('motore','M241')[0]['id']
    answers=[{'answer':'Prima bozza','code':'bad','plan':['generare'],'tests':[],'source_ids':['inventata',source_id]},
        {'answer':'Corretto','code':CODE,'plan':['correggere'],'tests':['stop prioritario'],'source_ids':['inventata',source_id]}]
    calls=[]
    class FakeClient:
        def __init__(self,**kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self,*args): pass
        async def post(self,url,**kwargs):
            calls.append(kwargs['json'])
            return httpx.Response(200,json={'message':{'content':json.dumps(answers.pop(0))}},request=httpx.Request('POST',url))
    async def fake_analyze(code,family):
        return {'status':'issues' if code=='bad' else 'static_checked','findings':[],'compiled':False}
    monkeypatch.setattr(ai.httpx,'AsyncClient',FakeClient)
    monkeypatch.setattr(ai,'analyze',fake_analyze)
    # Call coroutine directly: test HTTP client must remain real.
    import asyncio
    result=asyncio.run(ai.generate(Chat(message='motore',agent=True,family='M241')))
    assert len(calls)==2 and len(result['trace'])==2
    assert [s['id'] for s in result['sources']]==[source_id]
    assert result['status']=='generated_unverified'
    assert client.get('/api/projects').json()==[]

def test_cloud_requires_configuration(client,monkeypatch):
    monkeypatch.delenv('CLOUD_API_KEY',raising=False)
    r=client.post('/api/chat',json={'message':'Genera','provider':'cloud'})
    assert r.status_code==502

def test_agent_uses_failed_simulation_as_feedback(client,monkeypatch):
    import asyncio
    responses=[{'answer':'Bozza','code':CODE,'scenarios':[{'inputs':{'Start':True,'Permissive':True},'expected':{'MotorRun':False}}]},
               {'answer':'Test corretto','code':CODE,'scenarios':[{'inputs':{'Start':True,'Permissive':True},'expected':{'MotorRun':True}}]}]
    calls=[]
    class FakeClient:
        def __init__(self,**kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self,*args): pass
        async def post(self,url,**kwargs):
            calls.append(json.loads(json.dumps(kwargs['json'])))
            return httpx.Response(200,json={'message':{'content':json.dumps(responses.pop(0))}},request=httpx.Request('POST',url))
    monkeypatch.setattr(ai.httpx,'AsyncClient',FakeClient)
    result=asyncio.run(ai.generate(Chat(message='Prova il motore',agent=True)))
    assert len(result['trace'])==2
    assert result['trace'][0]['simulation']['scans'][0]['passed'] is False
    assert result['trace'][1]['simulation']['scans'][0]['passed'] is True
    assert 'simulation' in calls[1]['messages'][-1]['content']

def test_agent_response_schema_rejected(client,monkeypatch):
    import asyncio
    class FakeClient:
        def __init__(self,**kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self,*args): pass
        async def post(self,url,**kwargs):
            return httpx.Response(200,json={'message':{'content':'{"answer":"x", "code":123, "plan":{}}'}},request=httpx.Request('POST',url))
    monkeypatch.setattr(ai.httpx,'AsyncClient',FakeClient)
    with pytest.raises(ValueError): asyncio.run(ai.generate(Chat(message='test')))
