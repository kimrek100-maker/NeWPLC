import hashlib
import json
import math
import os
import re
import sqlite3
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(os.environ.get('STUDIO_DATA', str(Path.home() / '.plc-ai-studio')))

@contextmanager
def db():
    ROOT.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(ROOT / 'studio.sqlite3', timeout=15)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()

def init():
    with db() as c:
        c.executescript('''
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, name TEXT, family TEXT, code TEXT, updated TEXT);
        CREATE TABLE IF NOT EXISTS revisions(id INTEGER PRIMARY KEY, project_id TEXT, code TEXT, family TEXT, note TEXT, created TEXT);
        CREATE INDEX IF NOT EXISTS revisions_project_id ON revisions(project_id, id);
        CREATE TABLE IF NOT EXISTS blocks(id TEXT PRIMARY KEY, name TEXT, family TEXT, code TEXT);
        CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY, name TEXT, family TEXT, digest TEXT);
        CREATE TABLE IF NOT EXISTS chunks(id TEXT PRIMARY KEY, document_id TEXT, page INTEGER, text TEXT, vector TEXT);
        ''')
        for table in ('projects','revisions'):
            if 'synoptic' not in {r[1] for r in c.execute(f'PRAGMA table_info({table})')}:
                c.execute(f'ALTER TABLE {table} ADD COLUMN synoptic TEXT')

def decode_project(row):
    record=dict(row)
    record['synoptic']=json.loads(record['synoptic']) if record.get('synoptic') else None
    return record

def vector(text):
    # Sparse signed-free hashing, stable across processes; no model download.
    counts = {}
    for token in re.findall(r'[\w]+', text.lower()):
        if len(token) < 2:
            continue
        i = str(int.from_bytes(hashlib.sha256(token.encode()).digest()[:4], 'little') % 4096)
        counts[i] = counts.get(i, 0) + 1
    norm = math.sqrt(sum(x*x for x in counts.values())) or 1
    return {i: v/norm for i, v in counts.items()}

def retrieve(query, family, limit=5):
    q = vector(query)
    with db() as c:
        rows = c.execute('''SELECT chunks.*, documents.name FROM chunks JOIN documents
            ON documents.id=chunks.document_id WHERE documents.family IN (?, 'ALL')''', (family,)).fetchall()
    hits = []
    for r in rows:
        v = json.loads(r['vector'])
        score = sum(value*v.get(i, 0) for i, value in q.items())
        if score > 0:
            hits.append(dict(id=r['id'], name=r['name'], page=r['page'], text=r['text'], score=round(score, 4)))
    return sorted(hits, key=lambda x: x['score'], reverse=True)[:limit]
