from app.matching.store import hybrid_match


def _m(emotion, kws, v=-0.7, i=0.8):
    return {"primary_emotion": emotion, "keywords": kws, "valence": v, "intensity": i, "经历": {}}


def test_keyword_overlap_wins():
    me = _m("anxiety", ["考研", "真题", "倒计时"])
    cands = [_m("anxiety", ["分手", "前任"]), _m("anxiety", ["考研", "真题", "来不及"])]
    i, score, pts = hybrid_match(me, cands, [0.0, 0.0])
    assert i == 1  # 关键词重合的赢
    assert score > 0
    assert len(pts) >= 2


def test_empty_pool():
    i, score, pts = hybrid_match(_m("anxiety", ["考研"]), [], [])
    assert i is None
