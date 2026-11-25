import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from studio import storage
from studio.main import app

@pytest.fixture
def client(tmp_path,monkeypatch):
    monkeypatch.setattr(storage,'ROOT',tmp_path)
    with TestClient(app) as c:
        yield c
