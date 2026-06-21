import time
import uuid

from fastapi import APIRouter
from pydantic import BaseModel

from ..session.manager import sessions
from ..matching.store import hybrid_match
from ..matching.embedding import embed_memory
from ..identity import gen_nickname

router = APIRouter()
THRESH_FULL, THRESH_LOW = 0.35, 0.18  # hybrid_match 分数尺度


class MatchReq(BaseModel):
    user_id: str
    memory: dict


@router.post("/api/match")
async def match(req: MatchReq):
    if req.memory.get("safety_level") == "crisis":
        return {"status": "crisis"}
    me = sessions.upsert(req.user_id, req.memory)
    me.embedding = await embed_memory(me.memory)  # 真实语义向量（失败返回 None → 回退哈希）
    cands = sessions.waiting(exclude=req.user_id)
    if cands:
        # 候选一般在自己 /api/match 时已算过向量；漏算的当场补一次（缓存命中则秒回）
        for s in cands:
            if s.embedding is None:
                s.embedding = await embed_memory(s.memory)
        idx, score, pts = hybrid_match(
            me.memory,
            [s.memory for s in cands],
            [s.created_at for s in cands],
            me_vec=me.embedding,
            cand_vecs=[s.embedding for s in cands],
        )
        # 阈值随“候选方已等待多久”放宽：池里有人等久了就降低门槛优先成全
        # （不能用 me.created_at——每次发起匹配都会 upsert 重置，永远≈0）。
        cand_waited = time.time() - cands[idx].created_at if idx is not None else 0
        thr = THRESH_FULL if cand_waited < 15 else THRESH_LOW
        if idx is not None and score >= thr:
            other = cands[idx]
            # 同房间昵称去重：两人同情绪时可能撞名，给对方换一个
            if other.nickname == me.nickname:
                other.nickname = gen_nickname(
                    other.memory.get("primary_emotion", "calm"), avoid=me.nickname
                )
            room = "room_" + uuid.uuid4().hex[:8]
            for a, b in ((me, other), (other, me)):
                a.room_id = room
                a.status = "matched"
                a.partner_id = b.user_id
                a.partner_nick = b.nickname
                a.sync_points = pts
            return {
                "status": "matched",
                "room_id": room,
                "me": {"nickname": me.nickname, "color": me.color},
                "partner": {"nickname": other.nickname, "color": other.color},
                "sync_points": pts,
            }
    return {"status": "waiting", "nickname": me.nickname, "color": me.color}


@router.get("/api/match/check")
async def check(user_id: str):
    sessions.touch(user_id)  # 刷新心跳：标记该等待用户仍在线，避免被当幽灵淘汰
    s = sessions.get(user_id)
    if s and s.room_id:
        return {
            "status": "matched",
            "room_id": s.room_id,
            "me": {"nickname": s.nickname, "color": s.color},
            "partner_nick": s.partner_nick,
            "sync_points": s.sync_points,
        }
    return {"status": "waiting"}
