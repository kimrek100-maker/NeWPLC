from fastapi.testclient import TestClient
from studio import storage
from studio.main import app

OLD_CODE = 'PROGRAM Main VAR LegacyPump : BOOL; END_VAR LegacyPump := TRUE; END_PROGRAM'
NEW_CODE = 'PROGRAM Main VAR MotorRun : BOOL; END_VAR MotorRun := FALSE; END_PROGRAM'


def save_history(client):
    project = {'name':'Pompa storica', 'family':'M241', 'code':OLD_CODE, 'note':'Collaudo da eseguire'}
    id = client.post('/api/projects', json=project).json()['id']
    client.put('/api/projects/'+id, json={**project, 'code':NEW_CODE, 'family':'M262', 'note':'Revisione corrente'})
    return id


def test_archive_searches_past_code_and_notes_without_changing_data(client):
    id = save_history(client)
    before = client.get('/api/projects/'+id+'/revisions').json()
    for query in ('LegacyPump', 'collaudo', 'pompa'):
        result = client.get('/api/archive/projects', params={'q':query}).json()
        assert result['total'] == 1
        assert result['items'][0]['id'] == id
        assert result['items'][0]['revision_count'] == 2
        assert 'code' not in result['items'][0]
    assert client.get('/api/archive/projects', params={'q':'LegacyPump', 'family':'M241'}).json()['total'] == 0
    assert client.get('/api/archive/projects', params={'q':'LegacyPump', 'family':'M262'}).json()['total'] == 1
    detail = client.get('/api/archive/projects/'+id).json()
    assert detail['project']['code'] == NEW_CODE
    assert detail['revisions'][-1]['code'] == OLD_CODE
    assert detail['revisions'][-1]['family'] == 'M241'
    assert client.post('/api/export/st', json={**detail['project'], **detail['revisions'][-1]}).text == OLD_CODE
    assert client.get('/api/projects/'+id+'/revisions').json() == before


def test_archive_search_literals_pagination_and_validation(client):
    save_history(client)
    client.post('/api/projects', json={'name':'Valvola 100%_test', 'family':'M580', 'code':NEW_CODE})
    for query in ('%', '_test', '100%_test'):
        result = client.get('/api/archive/projects', params={'q':query}).json()
        assert result['total'] == 1
        assert result['items'][0]['name'] == 'Valvola 100%_test'
    assert client.get('/api/archive/projects', params={'q':"' OR 1=1 --"}).json()['total'] == 0
    page1 = client.get('/api/archive/projects', params={'limit':1}).json()
    page2 = client.get('/api/archive/projects', params={'limit':1,'offset':1}).json()
    assert page1['total'] == page2['total'] == 2
    assert page1['items'][0]['id'] != page2['items'][0]['id']
    assert client.get('/api/archive/projects', params={'family':'UNKNOWN'}).status_code == 422
    assert client.get('/api/archive/projects', params={'offset':-1}).status_code == 422
    assert client.get('/api/archive/projects/unknown').status_code == 404


def test_archive_survives_restart_and_reuses_existing_database(client):
    id = save_history(client)
    # The app startup can be repeated without recreating or losing existing records.
    storage.init()
    with TestClient(app) as reopened:
        assert reopened.get('/api/archive/projects').json()['items'][0]['id'] == id
        assert len(reopened.get('/api/archive/projects/'+id).json()['revisions']) == 2
        history = reopened.get('/api/archive/projects/'+id).json()
        old = history['revisions'][-1]
        copy = reopened.post('/api/projects', json={**old, 'name':'Pompa storica (copia)'}).json()
        assert copy['id'] != id
        assert reopened.get('/api/archive/projects/'+id).json() == history
