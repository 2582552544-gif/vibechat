"""真实语义 embedding（OpenAI 标准接口 / 云雾代理）。

替代原来的哈希投影向量 `_hash_vec`：把用户的「型 + 经历 + 关键词」拼成一段语义
文本，调 `/embeddings` 拿到 1536 维向量，匹配时用真实余弦衡量"是不是在经历同一件事"。

设计要点：
- 与 LLM_PROVIDER 解耦：embedding 始终走 OpenAI 标准接口（云雾兼容），即便分析用 anthropic。
- 进程内缓存：同一段文本只算一次，避免重复匹配时反复打 API。
- 优雅降级：缺 key / 网络失败 / 空文本 → 返回 None，调用方回退到哈希向量，流程不中断。
"""

import os

import httpx

# 同文本只算一次（key = model + "\x00" + text）
_CACHE: dict[str, list[float]] = {}


def _cfg() -> tuple[str, str, str]:
    """运行时读取（确保 dotenv 已加载）。返回 (url, key, model)。"""
    base = os.getenv("EMBED_BASE_URL") or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    key = os.getenv("EMBED_API_KEY") or os.getenv("OPENAI_API_KEY", "")
    model = os.getenv("EMBED_MODEL", "text-embedding-3-small")
    return base.rstrip("/") + "/embeddings", key, model


def memory_to_text(memory: dict) -> str:
    """把一条 UserMemory 拼成用于 embedding 的语义文本。

    比单纯关键词更有信息量：型名点出"是什么人"，处境/内在冲突给出语境，
    关键词补充具体名词。这样语义相近但用词不同的两个人也能被召回。
    """
    parts: list[str] = []
    if memory.get("型"):
        parts.append(str(memory["型"]))
    exp = memory.get("经历") or {}
    if isinstance(exp, dict):
        for k in ("处境", "内在冲突"):
            if exp.get(k):
                parts.append(str(exp[k]))
    kws = memory.get("keywords") or []
    if kws:
        parts.append("、".join(str(k) for k in kws))
    return "。".join(p for p in parts if p).strip()


async def embed_text(text: str) -> list[float] | None:
    """文本 → 向量；失败/空文本返回 None（调用方回退哈希向量）。"""
    text = (text or "").strip()
    if not text:
        return None
    url, key, model = _cfg()
    if not key:
        return None
    ck = model + "\x00" + text
    if ck in _CACHE:
        return _CACHE[ck]
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post(
                url,
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={"model": model, "input": text},
            )
            r.raise_for_status()
            vec = r.json()["data"][0]["embedding"]
    except Exception:
        return None
    if not isinstance(vec, list) or not vec:
        return None
    _CACHE[ck] = vec
    return vec


async def embed_memory(memory: dict) -> list[float] | None:
    """便捷包装：UserMemory → 语义向量。"""
    return await embed_text(memory_to_text(memory))
