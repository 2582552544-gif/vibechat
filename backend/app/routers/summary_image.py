from fastapi import APIRouter
from pydantic import BaseModel

from ..summary import build_poster_svg, build_image_prompt, generate_ai_image

router = APIRouter()


class SummaryReq(BaseModel):
    me_nick: str = "我"
    partner_nick: str = "对方"
    title_emotion: str = "此刻"
    sync_points: list[str] = []
    messages: list[dict] = []  # [{"mine": bool, "text": str}]
    mode: str = "mock"  # mock(即时SVG) | ai(gpt-image-2)


@router.post("/api/summary-image")
async def summary_image(req: SummaryReq):
    if req.mode == "ai":
        try:
            prompt = build_image_prompt(
                req.title_emotion, req.me_nick, req.partner_nick, req.messages, req.sync_points
            )
            img = await generate_ai_image(prompt)
            return {"mode": "ai", "image": img}
        except Exception:
            # 生成失败回退到即时 SVG，保证一定有图
            pass
    img = build_poster_svg(
        req.title_emotion, req.me_nick, req.partner_nick, req.messages, req.sync_points
    )
    return {"mode": "mock", "image": img}
