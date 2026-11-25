"""UI acceptance test. Requires backend and Vite running against a disposable database."""
import os
from uuid import uuid4
import httpx
from playwright.sync_api import sync_playwright

BASE='http://127.0.0.1:8765/api'
old='PROGRAM Main VAR ArchiveLegacyPump : BOOL; END_VAR ArchiveLegacyPump := TRUE; END_PROGRAM'
new='PROGRAM Main VAR ArchiveCurrentMotor : BOOL; END_VAR ArchiveCurrentMotor := FALSE; END_PROGRAM'
with httpx.Client(base_url=BASE,trust_env=False) as client:
    name='Test archivio pompa '+uuid4().hex[:6]
    project={'name':name, 'family':'M241', 'code':old}
    response=client.post('/projects',json=project);response.raise_for_status();id=response.json()['id']
    response=client.put('/projects/'+id,json={**project,'family':'M262','code':new});response.raise_for_status()
    before=client.get('/archive/projects/'+id).json()
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1510,'height':950})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://127.0.0.1:5173')
        page.get_by_role('button',name='Archivio progetti',exact=True).click()
        page.get_by_label('Cerca in nome, codice e note delle revisioni').fill('ArchiveLegacyPump')
        entry=page.get_by_role('dialog').get_by_role('button',name=name,exact=False)
        entry.wait_for();entry.click()
        select=page.get_by_label('Versione da consultare')
        select.wait_for()
        assert 'M262' in select.input_value() or select.input_value()==''
        oldest=before['revisions'][-1]
        select.select_option(str(oldest['id']))
        page.locator('.archive-editor .monaco-editor').wait_for()
        page.wait_for_function("document.querySelector('.archive-editor').innerText.includes('ArchiveLegacyPump')")
        assert page.locator('.archive-editor textarea').get_attribute('readonly') is not None
        with page.expect_download() as download:
            page.get_by_role('button',name='Esporta questa versione ST').click()
        assert download.value.suggested_filename=='Main.st'
        assert open(download.value.path()).read()==old
        page.screenshot(path='docs/archive.png',full_page=True)
        page.get_by_role('button',name='Crea bozza da questa versione').click()
        assert page.get_by_label('Nome progetto',exact=True).input_value()==name+' (copia)'
        page.get_by_role('button',name='Salva',exact=True).click()
        page.get_by_text('Revisione salvata in SQLite',exact=True).wait_for()
        page.reload()
        page.get_by_role('button',name='Archivio progetti',exact=True).click()
        page.get_by_label('Cerca in nome, codice e note delle revisioni').fill(name+' (copia)')
        page.get_by_role('dialog').get_by_role('button',name=name+' (copia)',exact=False).wait_for()
        page.get_by_label('Famiglia PLC attuale').select_option('M580')
        page.get_by_text('Nessun progetto trovato.',exact=False).wait_for()
        page.keyboard.press('Escape')
        assert page.get_by_role('dialog').count()==0
        assert client.get('/archive/projects/'+id).json()==before
        assert not errors,errors
        print('PASS: historical search, readonly revision, exact ST export, copy, save/reload, family filter, original unchanged; no JS errors')
        browser.close()
