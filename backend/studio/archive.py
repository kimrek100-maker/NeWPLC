"""Read-only catalogue of existing projects and their saved revisions."""
from typing import Literal
from fastapi import APIRouter, HTTPException, Query
from .storage import db, decode_project

router = APIRouter(prefix='/api/archive', tags=['archive'])
Family = Literal['M241', 'M251', 'M262', 'M340', 'M580']


@router.get('/projects')
def catalogue(q: str = Query(default='', max_length=200), family: Family | None = None,
              limit: int = Query(default=25, ge=1, le=100),
              offset: int = Query(default=0, ge=0)):
    # Treat wildcards literally. Match current code as well as past code/notes.
    term = q.strip().replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
    pattern = '%' + term + '%'
    where = r"""WHERE (? IS NULL OR p.family = ?) AND (
        p.name LIKE ? ESCAPE '\' OR p.code LIKE ? ESCAPE '\' OR EXISTS (
            SELECT 1 FROM revisions r WHERE r.project_id = p.id AND
            (r.code LIKE ? ESCAPE '\' OR r.note LIKE ? ESCAPE '\')
        ))"""
    params = (family, family, pattern, pattern, pattern, pattern)
    with db() as con:
        total = con.execute('SELECT COUNT(*) FROM projects p ' + where, params).fetchone()[0]
        rows = con.execute('''SELECT p.id, p.name, p.family, p.updated,
            (SELECT COUNT(*) FROM revisions r WHERE r.project_id=p.id) AS revision_count
            FROM projects p ''' + where + ' ORDER BY p.updated DESC, p.id LIMIT ? OFFSET ?',
            (*params, limit, offset)).fetchall()
    return {'items': [dict(row) for row in rows], 'total': total, 'offset': offset, 'limit': limit}


@router.get('/projects/{project_id}')
def project_history(project_id: str):
    with db() as con:
        project = con.execute('SELECT * FROM projects WHERE id=?', (project_id,)).fetchone()
        if project is None:
            raise HTTPException(404, 'Progetto non trovato nell’archivio')
        revisions = con.execute('SELECT * FROM revisions WHERE project_id=? ORDER BY id DESC',
                                (project_id,)).fetchall()
    return {'project': decode_project(project), 'revisions': [decode_project(row) for row in revisions]}
