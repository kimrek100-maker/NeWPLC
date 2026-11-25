import asyncio
import json
import os
from pathlib import Path
import shutil

BASE = Path(__file__).resolve().parents[2]

async def analyze(code: str, family: str):
    node = os.environ.get('STUDIO_NODE') or shutil.which('node')
    script = Path(os.environ.get('STUDIO_LINTER', str(BASE / 'tools/lint.mjs')))
    if not node or not script.exists():
        return {'status': 'unavailable', 'findings': [], 'compiled': False, 'message': 'Linter non installato: nessuna verifica effettuata.'}
    env = dict(os.environ, ELECTRON_RUN_AS_NODE='1')
    try:
        process = await asyncio.create_subprocess_exec(node, str(script), stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, env=env)
    except OSError as e:
        return {'status':'unavailable', 'findings':[], 'compiled':False, 'message':f'Impossibile avviare il linter: {e}'}
    try:
        out, err = await asyncio.wait_for(process.communicate(json.dumps({'code': code}).encode()), 30)
        if process.returncode:
            raise ValueError(err.decode()[:400])
        result = json.loads(out)
    except (TimeoutError, ValueError) as e:
        if process.returncode is None:
            process.kill()
            await process.wait()
        return {'status': 'unavailable', 'findings': [], 'compiled': False, 'message': f'Verifica non conclusa: {e}'}
    result.update(compiled=False, family=family, message='Analisi generica IEC. Nessuna compilazione Schneider. Librerie, I/O, firmware e task da verificare nel tool vendor.')
    if family in ('M340', 'M580'):
        result['findings'].append({'severity':'info', 'category':'VENDOR_REVIEW', 'line':1, 'summary':'Control Expert: dichiarazioni nel Data Editor e corpo ST nella sezione. Verificare EFB/DFB e addressing.'})
    return result
