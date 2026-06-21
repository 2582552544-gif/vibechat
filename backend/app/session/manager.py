import time

from ..identity import gen_nickname, gen_color

# 等待会话的存活窗口（秒）。前端 /matching 每 2s 轮询一次 /api/match/check，
# 每次轮询刷新 last_seen；超过该窗口没有心跳的会话视为“用户已离开”，
# 不再作为候选——避免新用户匹配到早已关掉页面的幽灵会话。
WAITING_TTL = 12


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
        self.last_seen = self.created_at  # 心跳：发起匹配 / 轮询 check 时刷新
        self.nickname = gen_nickname(memory.get("primary_emotion", "calm"))
        self.color = gen_color()
        self.history: list[dict] = []
        self.embedding: list[float] | None = None  # 语义向量（懒计算，匹配时填充）


class SessionManager:
    def __init__(self):
        self.sessions: dict[str, Session] = {}

    def upsert(self, user_id: str, memory: dict) -> Session:
        s = Session(user_id, memory)
        self.sessions[user_id] = s
        return s

    def get(self, user_id: str) -> Session | None:
        return self.sessions.get(user_id)

    def touch(self, user_id: str) -> None:
        """刷新心跳（前端轮询 check 时调用），标记该等待用户仍在线。"""
        s = self.sessions.get(user_id)
        if s:
            s.last_seen = time.time()

    def waiting(self, exclude: str) -> list[Session]:
        """返回仍在线的等待者：状态 waiting、无房间、近 WAITING_TTL 秒有心跳。
        顺带剔除已过期的幽灵会话，防止内存里无限堆积。
        """
        now = time.time()
        alive: list[Session] = []
        stale: list[str] = []
        for s in self.sessions.values():
            if s.status == "waiting" and not s.room_id and now - s.last_seen > WAITING_TTL:
                stale.append(s.user_id)
                continue
            if s.status == "waiting" and s.user_id != exclude and not s.room_id:
                alive.append(s)
        for uid in stale:
            del self.sessions[uid]
        return alive


sessions = SessionManager()
