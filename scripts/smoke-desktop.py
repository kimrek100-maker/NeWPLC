from playwright.sync_api import sync_playwright
import httpx
with sync_playwright() as p:
    browser=p.chromium.connect_over_cdp('http://127.0.0.1:9229')
    context=browser.contexts[0]
    page=context.pages[0]
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.get_by_text('Backend locale',exact=True).wait_for()
    page.locator('.monaco-editor').wait_for()
    assert page.evaluate('typeof window.studio.token')=='string'
    assert page.evaluate('typeof window.require')=='undefined'
    assert httpx.get('http://127.0.0.1:8765/api/health',trust_env=False).status_code==401
    page.get_by_role('button',name='Salva',exact=True).click()
    page.get_by_text('Revisione salvata in SQLite',exact=True).wait_for()
    page.get_by_role('button',name='Analizza',exact=True).click()
    page.get_by_text('Nessun errore rilevato dai controlli eseguiti',exact=True).wait_for()
    with page.expect_download() as download:
        page.get_by_role('button',name='Esporta ST',exact=True).click()
    assert download.value.suggested_filename=='Main.st'
    page.screenshot(path='docs/workbench.png',full_page=True)
    print({'desktop':'Electron, built React, local backend, token, Monaco, save, lint and direct ST export','errors':errors})
    assert not errors
    page.close()
