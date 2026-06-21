"""对话辅助：基于此刻语境，为用户生成 3 句可直接上屏的破冰/接话建议。

复用双 provider（OpenAI / Anthropic 标准接口），失败时回退到静态模板，
保证聊天页的"建议三句"模块永远有内容。
"""

import random

import httpx

from ..config import load_llm_config
from ..soul import SOUL
from .base import parse_json_loose


def _prompt(sync_points: list[str], my_type: str, recent: list[dict]) -> str:
    why = "、".join(sync_points) if sync_points else "相似的此刻"
    if recent:
        convo = "\n".join(
            f"{'我' if m.get('mine') else '对方'}：{m.get('text', '')}" for m in recent[-4:]
        )
        scene = f"我们已经聊了几句：\n{convo}\n请给我 3 句自然的接话。"
    else:
        scene = "我们还没开口。请给我 3 句自然的开场白。"
    return (
        SOUL
        + f"""

两个陌生人因为相似的此刻被匿名匹配到一起。我此刻是「{my_type or '此刻的自己'}」，
我们被匹配是因为：{why}。
{scene}

要求：
- 第二人称口语，真实、不端着，像深夜跟一个懂的人说话
- 每句不超过 30 字
- 三句风格不同：一句先暴露我自己的感受，一句好奇地问对方，一句轻一点/具体的小细节
- 不要说教、不要"你应该"、不要太正式、不要重复对方原话

只输出 JSON（不要 markdown）：{{"suggestions": ["句1", "句2", "句3"]}}"""
    )


def _fallback(sync_points: list[str]) -> list[str]:
    pt = sync_points[0] if sync_points else "此刻"
    pool = [
        f"看到我们{pt}，突然有点想说说话。",
        "你今天是怎么撑过来的？",
        "我先说吧——其实我现在挺乱的。",
        "你是醒着睡不着，还是不想睡？",
        "不用解释全部，你现在最重的一个感受是什么？",
    ]
    random.shuffle(pool)
    return pool[:3]


async def _call_openai(c, cfg, prompt: str) -> str:
    r = await c.post(
        f"{cfg.base_url}/chat/completions",
        headers={"Authorization": f"Bearer {cfg.api_key}"},
        json={
            "model": cfg.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 1.0,
        },
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


async def _call_anthropic(c, cfg, prompt: str) -> str:
    r = await c.post(
        f"{cfg.base_url}/v1/messages",
        headers={
            "x-api-key": cfg.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": cfg.model,
            "max_tokens": 512,
            "temperature": 1.0,
            "messages": [{"role": "user", "content": prompt}],
        },
    )
    r.raise_for_status()
    return r.json()["content"][0]["text"]


async def suggest_replies(
    sync_points: list[str], my_type: str = "", recent: list[dict] | None = None
) -> list[str]:
    cfg = load_llm_config()
    prompt = _prompt(sync_points, my_type, recent or [])
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            content = (
                await _call_anthropic(c, cfg, prompt)
                if cfg.provider == "anthropic"
                else await _call_openai(c, cfg, prompt)
            )
        out = parse_json_loose(content).get("suggestions", [])
        cleaned = [str(s).strip() for s in out if str(s).strip()][:3]
        return cleaned or _fallback(sync_points)
    except Exception:
        return _fallback(sync_points)
