import math
import time

EMOTION_CN = {
    "anxiety": "焦虑",
    "loneliness": "孤独",
    "anger": "愤怒",
    "sadness": "低落",
    "excitement": "兴奋",
    "calm": "平静",
    "confusion": "迷茫",
    "emptiness": "空虚",
    "joy": "开心",
    "frustration": "烦躁",
}


def _tokens(m: dict) -> list[str]:
    return list(m.get("keywords", []) or [])


def _hash_vec(tokens: list[str], dim: int = 64) -> list[float]:
    """哈希投影模拟 embedding 的第二通道（无外部 API）。"""
    v = [0.0] * dim
    for t in tokens:
        h = hash(t)
        for i in range(dim):
            v[i] += 1.0 if (h >> (i % 62)) & 1 else -1.0
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / n for x in v]


def _vcos(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    return dot / (na * nb) if na and nb else 0.0


def _kw_cos(a: list[str], b: list[str], df: dict, n: int) -> float:
    def tfidf(toks: list[str]) -> dict:
        tf: dict[str, int] = {}
        for t in toks:
            tf[t] = tf.get(t, 0) + 1
        return {t: c * (math.log((n + 1) / (df.get(t, 0) + 1)) + 1) for t, c in tf.items()}

    x, y = tfidf(a), tfidf(b)
    common = set(x) & set(y)
    if not common:
        return 0.0
    dot = sum(x[k] * y[k] for k in common)
    nx = math.sqrt(sum(v * v for v in x.values()))
    ny = math.sqrt(sum(v * v for v in y.values()))
    return dot / (nx * ny) if nx and ny else 0.0


def _build_df(mems: list[dict]):
    df: dict[str, int] = {}
    for m in mems:
        for t in set(_tokens(m)):
            df[t] = df.get(t, 0) + 1
    return df, len(mems)


def _sync_points(me: dict, other: dict) -> list[str]:
    r: list[str] = []
    if me.get("primary_emotion") == other.get("primary_emotion"):
        r.append(f"都在经历{EMOTION_CN.get(me['primary_emotion'], '')}")
    shared = [t for t in _tokens(me) if t in set(_tokens(other))][:2]
    if shared:
        r.append("都提到了" + "、".join(shared))
    mc = me.get("经历", {}).get("内在冲突")
    oc = other.get("经历", {}).get("内在冲突")
    if mc and oc:
        r.append("都卡在相似的拉扯里")
    if 1 - abs(me.get("intensity", 0) - other.get("intensity", 0)) > 0.85:
        r.append("情绪强度接近")
    return r[:4]


def hybrid_match(me: dict, candidates: list[dict], created_ats: list[float]):
    """me: 我的 memory；candidates: 其他人的 memory 列表（与 created_ats 同序）。
    返回 (best_index 或 None, score, sync_points)。
    管道：关键词TF-IDF + 哈希向量 + 加权合并 + 基调过滤 + 等待加权。
    """
    if not candidates:
        return None, 0.0, []
    df, n = _build_df(candidates + [me])
    me_vec = _hash_vec(_tokens(me))
    now = time.time()
    best_i, best_score = None, -1.0
    me_emo = me.get("primary_emotion")
    for i, c in enumerate(candidates):
        kw = _kw_cos(_tokens(me), _tokens(c), df, n)  # 关键词通道
        vec = _vcos(me_vec, _hash_vec(_tokens(c)))  # 向量通道
        emo = 1.0 if me_emo and me_emo == c.get("primary_emotion") else 0.0  # 同情绪通道
        merged = 0.30 * vec + 0.40 * kw + 0.30 * emo
        # 情绪基调过滤：正负向相反则压分
        if me.get("valence", 0) * c.get("valence", 0) < -0.2:
            merged *= 0.5
        # 等待加权（替代时间衰减）：等越久越优先，最多 +50%
        waited = now - created_ats[i]
        merged *= 1 + min(waited, 60) / 120
        if merged > best_score:
            best_i, best_score = i, merged
    return best_i, best_score, _sync_points(me, candidates[best_i])
