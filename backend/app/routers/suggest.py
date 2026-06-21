from fastapi import APIRouter
from pydantic import BaseModel

from ..llm.suggest import suggest_replies

router = APIRouter()


class SuggestReq(BaseModel):
    sync_points: list[str] = []
    my_type: str = ""
    recent: list[dict] = []  # [{"mine": bool, "text": str}]


@router.post("/api/suggest")
async def suggest(req: SuggestReq):
    lines = await suggest_replies(req.sync_points, req.my_type, req.recent)
    return {"suggestions": lines}
