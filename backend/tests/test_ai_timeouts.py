import asyncio

from studio import ai


class FakeResponse:
    def raise_for_status(self):
        pass

    def json(self):
        return {
            'message': {'content': '{}'},
            'choices': [{'message': {'content': '{}'}}],
        }


class FakeClient:
    seen = []

    def __init__(self, timeout, trust_env):
        FakeClient.seen.append((timeout, trust_env))

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def post(self, *args, **kwargs):
        return FakeResponse()


def test_local_and_cloud_timeouts_are_selected(monkeypatch):
    monkeypatch.setattr(ai.httpx, 'AsyncClient', FakeClient)
    monkeypatch.setenv('CLOUD_API_KEY', 'test')
    monkeypatch.setenv('CLOUD_API_URL', 'https://example.invalid/v1')
    FakeClient.seen.clear()

    asyncio.run(ai.request_json([{'role': 'user', 'content': 'prova'}], 'ollama'))
    asyncio.run(ai.request_json([{'role': 'user', 'content': 'prova'}], 'cloud'))

    assert FakeClient.seen == [(ai.OLLAMA_TIMEOUT, False), (ai.CLOUD_TIMEOUT, False)]
