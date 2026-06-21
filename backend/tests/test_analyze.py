import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_analyze_fallback_no_key(monkeypatch):
    # 强制 LLM 失败（指向无效 endpoint），应返回 fallback 而非 500
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_BASE_URL", "http://127.0.0.1:1/v1")
    monkeypatch.setenv("OPENAI_API_KEY", "x")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.post("/api/analyze", json={"text": "测试"})
    assert r.status_code == 200
    assert r.json()["型"]
    assert r.json()["primary_emotion"]
