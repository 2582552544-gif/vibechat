from fastapi import APIRouter

from ..models import AnalyzeRequest, UserMemory
from ..llm.factory import get_analyzer

router = APIRouter()

FALLBACK = UserMemory(
    型="此刻的你",
    primary_emotion="calm",
    镜子句="AI 分析暂时不可用，但你的感受是真实的。",
    同型声音=["很多人此刻也在找共鸣", "你并不孤单", "慢慢来，没关系"],
    keywords=["此刻"],
)


@router.post("/api/analyze", response_model=UserMemory)
async def analyze(req: AnalyzeRequest):
    text = req.text
    if req.mood:
        text = f"[心情:{req.mood}][关于:{req.situation_hint or '未知'}] {req.text}"
    try:
        raw = await get_analyzer().analyze(text)
        return UserMemory(**raw)
    except Exception as e:  # noqa: BLE001 — 降级兜底，任何 LLM 失败都不应 500
        print(f"[analyze] fallback: {e}")
        return FALLBACK
