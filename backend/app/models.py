from pydantic import BaseModel
from typing import Optional


class AnalyzeRequest(BaseModel):
    text: str
    mood: Optional[str] = None
    situation_hint: Optional[str] = None


class UserMemory(BaseModel):
    emotion_detected: bool = True
    型: str = "此刻的你"
    primary_emotion: str = "calm"
    valence: float = 0.0
    arousal: float = 0.0
    intensity: float = 0.5
    keywords: list[str] = []
    经历: dict = {}
    镜子句: str = ""
    侦探句: str = ""
    同型声音: list[str] = []
    safety_level: str = "normal"
    suggestion: str = ""
