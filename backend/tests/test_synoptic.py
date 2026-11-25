import json
import sqlite3
from copy import deepcopy
import httpx
import pytest
from studio import ai,storage,synoptic
from studio.synoptic_models import Layout

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

def evidence(origin='manual',confirmed=True):
    return {'origin':origin,'source':'manual' if origin=='manual' else 'st','quote':'','confirmed':confirmed}

def node(id,kind='motor',bindings=None):
    return {'id':id,'kind':kind,'label':id,'position':{'x':20,'y':30},'evidence':evidence(),
            'bindings':bindings or {},'manual':True}

def binding(name,confirmed=True):return {**evidence(confirmed=confirmed),'variable':name}

def layout():
    return Layout(nodes=[node('motor',bindings={'state':binding('MotorRun'),'alarm':binding('Alarm')}),
        node('start','button',{'command':binding('Start')}), node('stop','button',{'command':binding('Stop')}),
        node('counter','numeric',{'value':binding('Count'),'command':binding('Count')})]).model_dump()

def test_saved_layout_revisions_archive_legacy_clients(client):
    drawing=layout()
    body={'name':'Sinottico','family':'M241','code':CODE,'synoptic':drawing}
    id=client.post('/api/projects',json=body).json()['id']
    changed=deepcopy(drawing);changed['nodes'][0]['position']['x']=777
    client.put('/api/projects/'+id,json={**body,'synoptic':changed})
    client.put('/api/projects/'+id,json={'name':'Client precedente','family':'M241','code':CODE})
    current=client.get('/api/projects').json()[0]
    assert current['synoptic']['nodes'][0]['position']['x']==777
    history=client.get('/api/projects/'+id+'/revisions').json()
    assert history[-1]['synoptic']['nodes'][0]['position']['x']==20
    assert client.get('/api/archive/projects/'+id).json()['project']['synoptic']==changed
    assert client.post('/api/projects',json={**body,'synoptic':{'nodes':[{'svg':'<script/>'}]}}).status_code==422
    storage.init()
    assert client.get('/api/projects').json()[0]['synoptic']==changed


def test_legacy_database_migration_is_additive(tmp_path,monkeypatch):
    monkeypatch.setattr(storage,'ROOT',tmp_path)
    c=sqlite3.connect(tmp_path/'studio.sqlite3')
    c.executescript("""CREATE TABLE projects(id TEXT PRIMARY KEY,name TEXT,family TEXT,code TEXT,updated TEXT);
    CREATE TABLE revisions(id INTEGER PRIMARY KEY,project_id TEXT,code TEXT,family TEXT,note TEXT,created TEXT);
    INSERT INTO projects VALUES('old','Legacy','M241','code','date');""")
    c.commit();c.close();storage.init();storage.init()
    with storage.db() as c:
        record=storage.decode_project(c.execute('SELECT * FROM projects').fetchone())
        assert record['id']=='old' and record['code']=='code' and record['synoptic'] is None


def test_simulation_reuses_scan_logic_and_reports_values(client):
    drawing=layout();base={'code':CODE,'layout':drawing}
    first=client.post('/api/synoptic/simulate',json={**base,'commands':{'start':True,'counter':7}})
    assert first.status_code==200,first.text
    assert first.json()['values']['motor']['state'] is True
    assert first.json()['values']['counter']['value']==7
    second=client.post('/api/synoptic/simulate',json={**base,'history':[{'start':True,'counter':7}],'commands':{'stop':True}}).json()
    assert second['scan']==2 and second['values']['motor']=={'state':False,'alarm':True}
    assert second['values']['counter']['value']==7

@pytest.mark.parametrize('mutation', ['unconfirmed','output','removed','wrong_type','overflow'])
def test_virtual_commands_fail_closed(client,mutation):
    drawing=layout();commands={'start':True}
    if mutation=='unconfirmed': drawing['nodes'][1]['bindings']['command']['confirmed']=False
    if mutation=='output': drawing['nodes'][1]['bindings']['command']['variable']='MotorRun'
    if mutation=='removed': drawing['nodes'][1]['bindings']['command']['variable']='Missing'
    if mutation=='wrong_type': commands={'start':1}
    if mutation=='overflow':commands={'counter':32768}
    r=client.post('/api/synoptic/simulate',json={'code':CODE,'layout':drawing,'commands':commands})
    assert r.status_code==422,r.text


def test_renames_do_not_rebind_and_unsupported_physics(client):
    drawing=layout();changed=CODE.replace('MotorRun','MotorRunning')
    r=client.post('/api/synoptic/inspect',json={'code':changed,'layout':drawing}).json()
    assert any('rinominata' in i['message'] and 'MOTORRUNNING' in i['message'] for i in r['issues'])
    assert drawing['nodes'][0]['bindings']['state']['variable']=='MotorRun'
    timer='PROGRAM Main VAR t : TON; END_VAR t(IN:=TRUE,PT:=T#1s); END_PROGRAM'
    info=client.post('/api/synoptic/inspect',json={'code':timer,'layout':drawing}).json()
    assert info['simulation_supported'] is False
    assert client.post('/api/synoptic/simulate',json={'code':timer,'layout':drawing}).status_code==422


def test_generation_uses_existing_ollama_schema_and_protects_manual_data(client,monkeypatch):
    current=layout();current['nodes'][0]['position']['x']=500
    current['deleted_node_ids']=['deleted']
    generated=deepcopy(current);generated['deleted_node_ids']=[]
    generated['nodes'].append(node('deleted','tank'))
    generated['nodes'].append(node('new','pump',{'state':binding('MotorRun')}))
    generated['nodes'][0]['position']['x']=0
    generated['nodes'][-1]['evidence']={'origin':'explicit','source':'st','quote':'Not in source','confirmed':True}
    calls=[]
    class Fake:
        def __init__(self,**kwargs):pass
        async def __aenter__(self):return self
        async def __aexit__(self,*args):pass
        async def post(self,url,**kwargs):
            calls.append((url,kwargs))
            return httpx.Response(200,json={'message':{'content':json.dumps(generated)}},request=httpx.Request('POST',url))
    monkeypatch.setattr(ai.httpx,'AsyncClient',Fake)
    response=client.post('/api/synoptic/generate',json={'code':CODE,'layout':current})
    assert response.status_code==200,response.text
    drawing=response.json()['layout']
    assert calls[0][0].endswith('/api/chat')
    assert calls[0][1]['json']['format']['properties']['nodes']
    assert drawing['nodes'][0]==current['nodes'][0]
    assert 'deleted' not in [n['id'] for n in drawing['nodes']]
    assert drawing['nodes'][-1]['evidence']['origin']=='hypothesis'
    assert drawing['nodes'][-1]['bindings']['state']['confirmed'] is False
    assert len(drawing['source_hash'])==64

@pytest.mark.parametrize('bad', [
    {'nodes':[{'id':'x','kind':'motor','label':'x','svg':'<script>alert(1)</script>'}]},
    {'nodes':[node('x')],'edges':[{'id':'bad','source':'x','target':'x','kind':'physical'}]},
    {'nodes':[node('same'),node('same')]},
    {'nodes':[node('x')],'edges':[{'id':'bad','source':'x','target':'ghost'}]},
])
def test_invalid_ai_json_never_replaces_layout(client,monkeypatch,bad):
    async def fake(*args,**kwargs):return json.dumps(bad)
    monkeypatch.setattr(synoptic,'request_json',fake)
    original=layout()
    assert client.post('/api/synoptic/generate',json={'code':CODE,'layout':original}).status_code==422
    assert original==layout()


def test_local_unavailable_and_cloud_not_silently_used(client,monkeypatch):
    calls=[]
    async def unavailable(messages,provider,schema=None):
        calls.append(provider);raise httpx.ConnectError('offline')
    monkeypatch.setattr(synoptic,'request_json',unavailable)
    assert client.post('/api/synoptic/generate',json={'code':CODE,'layout':layout()}).status_code==503
    assert calls==['ollama']


def test_obsolete_cited_binding_blocks_command_until_manual_reassociation(client):
    drawing=layout()
    drawing['nodes'][1]['bindings']['command']={
        'variable':'Start','origin':'explicit','source':'description','quote':'Avvio di prova','confirmed':True}
    drawing['description']='Descrizione sostituita'
    request={'code':CODE,'layout':drawing,'commands':{'start':True}}
    info=client.post('/api/synoptic/inspect',json={'code':CODE,'layout':drawing}).json()
    assert any(i.get('channel')=='command' and 'Citazione' in i['message'] for i in info['issues'])
    assert client.post('/api/synoptic/simulate',json=request).status_code==422
    drawing['nodes'][1]['bindings']['command']=binding('Start')
    assert client.post('/api/synoptic/simulate',json=request).status_code==200
