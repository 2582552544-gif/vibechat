import json
import re
from abc import ABC, abstractmethod

from ..soul import SOUL

ANALYZE_PROMPT = (
    SOUL
    + """

用户会描述当下状态。请严格输出 JSON（不要 markdown 包裹）：
{
  "emotion_detected": true,
  "型": "用一个有画面感的词概括此刻的人格，如 深夜内耗型/强撑微笑型/倒计时焦虑型",
  "primary_emotion": "anxiety|loneliness|anger|sadness|excitement|calm|confusion|emptiness|joy|frustration",
  "valence": -1.0到1.0之间的数, "arousal": 0.0到1.0之间的数, "intensity": 0.0到1.0之间的数,
  "keywords": ["从原文提取3-5个具体词"],
  "经历": {
    "处境": "TA 正在面对的具体情境",
    "内在冲突": "TA 内心拉扯的点",
    "不能说的部分": "TA 不敢对外说的"
  },
  "镜子句": "第二人称、朋友式口语，说中TA说不清的感受。不超过2句。",
  "侦探句": "指出TA思维里一个具体偏见，'你说X，但其实Y'。不超过2句。",
  "同型声音": ["3条和TA同型的人会说的匿名真话，口语化、具体、像评论区"]
}
若输入非情绪内容，返回 {"emotion_detected": false, "suggestion": "引导文案"}。
若提到自伤/自杀/不想活，加 "safety_level":"crisis"，镜子句改为温柔关怀。
只输出 JSON。"""
)


def parse_json_loose(text: str) -> dict:
    """从 LLM 文本中稳健提取 JSON：剥离 markdown 围栏，截取首个 {...}。"""
    t = text.strip()
    t = t.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", t, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


class BaseAnalyzer(ABC):
    def __init__(self, config):
        self.config = config

    @abstractmethod
    async def analyze(self, text: str) -> dict:
        """返回解析后的 dict，失败抛异常由上层降级。"""
