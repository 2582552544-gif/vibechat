import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..chat.manager import manager
from ..chat.icebreaker import get_icebreaker
from ..session.manager import sessions

router = APIRouter()


@router.websocket("/ws/rooms/{room_id}")
async def chat_ws(ws: WebSocket, room_id: str, user_id: str, nickname: str = "匿名"):
    await manager.connect(room_id, user_id, ws)
    s = sessions.get(user_id)
    if s:
        s.status = "chatting"
    await manager.broadcast(
        room_id,
        {"type": "system", "data": {"content": f"{nickname} 加入了", "online": manager.online(room_id)}},
    )
    if manager.online(room_id) == 2:
        pts = s.sync_points if s else []
        await manager.broadcast(
            room_id, {"type": "icebreaker", "data": {"content": get_icebreaker(pts)}}
        )
    try:
        while True:
            msg = await ws.receive_json()
            # 正在输入：广播给房间，不入消息流
            if msg.get("type") == "typing":
                await manager.broadcast(
                    room_id,
                    {"type": "typing", "data": {"from": user_id, "on": bool(msg.get("on"))}},
                )
                continue
            # 主动结束对话：通知双方进入"已结束"状态（状态同步）
            if msg.get("type") == "end":
                await manager.broadcast(
                    room_id, {"type": "ended", "data": {"by": nickname, "from": user_id}}
                )
                continue
            await manager.broadcast(
                room_id,
                {
                    "type": "chat",
                    "data": {
                        "from": user_id,
                        "nickname": nickname,
                        "content": msg.get("content", ""),
                        "ts": time.time(),
                    },
                },
            )
    except WebSocketDisconnect:
        manager.disconnect(room_id, user_id)
        await manager.broadcast(
            room_id,
            {
                "type": "system",
                "data": {
                    "content": f"{nickname} 的频率暂时离开了",
                    "online": manager.online(room_id),
                },
            },
        )
