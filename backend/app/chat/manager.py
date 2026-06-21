from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.rooms: dict[str, dict[str, WebSocket]] = {}

    async def connect(self, room: str, uid: str, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(room, {})[uid] = ws

    def disconnect(self, room: str, uid: str):
        if room in self.rooms:
            self.rooms[room].pop(uid, None)

    async def broadcast(self, room: str, msg: dict, exclude: str | None = None):
        for uid, ws in list(self.rooms.get(room, {}).items()):
            if uid == exclude:
                continue
            try:
                await ws.send_json(msg)
            except Exception:
                self.disconnect(room, uid)

    def online(self, room: str) -> int:
        return len(self.rooms.get(room, {}))


manager = ConnectionManager()
