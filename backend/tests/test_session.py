from app.session.manager import SessionManager


def test_session_isolation_and_waiting():
    m = SessionManager()
    m.upsert("u1", {"primary_emotion": "anxiety"})
    m.upsert("u2", {"primary_emotion": "anxiety"})
    assert m.get("u1").nickname
    assert len(m.waiting(exclude="u1")) == 1  # 排除自己
