import time

from ..identity import gen_nickname, gen_color


class Session:
    def __init__(self, user_id: str, memory: dict):
        self.user_id = user_id
        self.memory = memory  # UserMemory dict（型+经历+keywords+vad）
        self.status = "waiting"  # analyzing→waiting→matched→chatting→ended
        self.room_id = None
        self.partner_id = None
        self.partner_nick = ""
        self.sync_points: list[str] = []
        self.created_at = time.time()
        self.nickname = gen_nickname(memory.get("primary_emotion", "calm"))
        self.color = gen_color()
        self.history: list[dict] = []


class SessionManager:
    def __init__(self):
        self.sessions: dict[str, Session] = {}

    def upsert(self, user_id: str, memory: dict) -> Session:
        s = Session(user_id, memory)
        self.sessions[user_id] = s
        return s

    def get(self, user_id: str) -> Session | None:
        return self.sessions.get(user_id)

    def waiting(self, exclude: str) -> list[Session]:
        return [
            s
            for s in self.sessions.values()
            if s.status == "waiting" and s.user_id != exclude and not s.room_id
        ]


sessions = SessionManager()
