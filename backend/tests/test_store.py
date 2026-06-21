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


def test_embedding_channel_breaks_tie_by_semantics():
    # 两个候选关键词/情绪完全相同（无 embedding 时打平），仅靠语义向量区分：
    # cand1 的向量与 me 几乎同向（相似），cand0 接近正交（无关）→ 应选 cand1。
    me = _m("anxiety", ["考研"])
    cands = [_m("anxiety", ["考研"]), _m("anxiety", ["考研"])]
    me_vec = [1.0, 0.0]
    cand_vecs = [[0.10, 0.99], [0.96, 0.28]]
    i, score, pts = hybrid_match(
        me, cands, [0.0, 0.0], me_vec=me_vec, cand_vecs=cand_vecs
    )
    assert i == 1


def test_embedding_missing_falls_back_to_hash():
    # me_vec 为 None 时不应报错，走哈希回退路径（向后兼容）。
    me = _m("anxiety", ["考研", "真题"])
    cands = [_m("anxiety", ["考研", "真题"])]
    i, score, pts = hybrid_match(me, cands, [0.0], me_vec=None, cand_vecs=[None])
    assert i == 0 and score > 0
