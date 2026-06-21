import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.session.manager import sessions


@pytest.mark.asyncio
async def test_two_similar_match():
    sessions.sessions.clear()
    mem = {
        "primary_emotion": "anxiety",
        "keywords": ["考研", "真题"],
        "valence": -0.7,
        "intensity": 0.8,
        "经历": {},
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r1 = await c.post("/api/match", json={"user_id": "u1", "memory": mem})
        r2 = await c.post("/api/match", json={"user_id": "u2", "memory": dict(mem)})
    assert r1.json()["status"] == "waiting"
    assert r2.json()["status"] == "matched"
    assert len(r2.json()["sync_points"]) >= 1


@pytest.mark.asyncio
async def test_crisis_not_matched():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.post("/api/match", json={"user_id": "u9", "memory": {"safety_level": "crisis"}})
    assert r.json()["status"] == "crisis"
