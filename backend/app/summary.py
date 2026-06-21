"""对话纪念长图生成。

两种模式：
- mock：服务端用真实对话数据即时渲染一张 SVG 长图（零延迟、零成本，用于演示/兜底）
- ai：调用 gpt-image-2（云雾代理）生成插画级长图

两者都返回 data URI，前端 <img> 直接显示。
"""

import base64
import html
import os

import httpx

IMAGE_API = os.getenv("IMAGE_API_URL", "https://yunwu.ai/v1/images/generations")
IMAGE_KEY = os.getenv("IMAGE_API_KEY", "")
IMAGE_MODEL = os.getenv("IMAGE_MODEL", "gpt-image-2")

INK = "#0b0a09"
EMBER = "#ff7d4d"
EMBER_SOFT = "#ffb08a"
TEXT = "#f3ede4"
MUTED = "#a39a8d"


def _wrap(text: str, n: int = 15) -> list[str]:
    text = text.strip()
    return [text[i : i + n] for i in range(0, len(text), n)] or [""]


def build_poster_svg(
    title_emotion: str,
    me_nick: str,
    partner_nick: str,
    messages: list[dict],
    sync_points: list[str],
) -> str:
    """根据真实对话即时渲染一张竖版长图（SVG）。"""
    W = 720
    pad = 48
    y = 0
    parts: list[str] = []

    # 头部
    y += 70
    parts.append(
        f'<text x="{W/2}" y="{y}" text-anchor="middle" fill="{EMBER}" '
        f'font-size="34" font-weight="700" font-family="serif">今晚，因为「{html.escape(title_emotion)}」相遇</text>'
    )
    y += 42
    parts.append(
        f'<text x="{W/2}" y="{y}" text-anchor="middle" fill="{MUTED}" font-size="20">'
        f'{html.escape(me_nick)}  ×  {html.escape(partner_nick)}</text>'
    )
    y += 50

    # 对话气泡（最多 12 条）
    for m in messages[:12]:
        mine = bool(m.get("mine"))
        lines = _wrap(str(m.get("text", "")), 15)
        bh = 26 + len(lines) * 30
        bw = min(520, 40 + max((len(ln) for ln in lines), default=0) * 19)
        bx = W - pad - bw if mine else pad
        fill = EMBER if mine else "rgba(255,248,240,0.07)"
        tcol = "#1a0f0a" if mine else TEXT
        parts.append(f'<rect x="{bx}" y="{y}" width="{bw}" height="{bh}" rx="18" fill="{fill}"/>')
        ty = y + 32
        for ln in lines:
            parts.append(
                f'<text x="{bx + 20}" y="{ty}" fill="{tcol}" font-size="21">{html.escape(ln)}</text>'
            )
            ty += 30
        if not mine:
            parts.append(
                f'<text x="{bx}" y="{y - 8}" fill="{MUTED}" font-size="14">{html.escape(partner_nick)}</text>'
            )
        y += bh + 22

    # 同频点
    if sync_points:
        y += 24
        parts.append(
            f'<text x="{pad}" y="{y}" fill="{EMBER_SOFT}" font-size="20" font-weight="600">你们的同频点</text>'
        )
        y += 36
        for p in sync_points[:4]:
            parts.append(
                f'<rect x="{pad}" y="{y - 22}" width="{W - 2*pad}" height="44" rx="14" fill="rgba(255,125,77,0.1)" stroke="rgba(255,125,77,0.3)"/>'
            )
            parts.append(
                f'<text x="{pad + 20}" y="{y + 6}" fill="{TEXT}" font-size="19">· {html.escape(p)}</text>'
            )
            y += 56

    # 页脚
    y += 50
    parts.append(
        f'<text x="{W/2}" y="{y}" text-anchor="middle" fill="{MUTED}" font-size="18">'
        f'VibeChat · 让此刻的感受成为连接的入口</text>'
    )
    y += 40

    H = y
    bg = (
        f'<rect width="{W}" height="{H}" fill="{INK}"/>'
        f'<ellipse cx="{W/2}" cy="0" rx="{W*0.7}" ry="240" fill="{EMBER}" opacity="0.12"/>'
    )
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
        f'viewBox="0 0 {W} {H}" font-family="-apple-system,PingFang SC,sans-serif">'
        f"{bg}{''.join(parts)}</svg>"
    )
    b64 = base64.b64encode(svg.encode("utf-8")).decode()
    return f"data:image/svg+xml;base64,{b64}"


def build_image_prompt(
    title_emotion: str, me_nick: str, partner_nick: str, messages: list[dict], sync_points: list[str]
) -> str:
    convo = "；".join(str(m.get("text", "")) for m in messages[:8] if m.get("text"))
    pts = "、".join(sync_points[:3])
    return (
        f"一张温暖治愈的竖版'情绪对话小结'长图海报，深色暖墨背景配珀橙色光晕，"
        f"深夜电台/网易云评论区风格。顶部标题：今晚，两个陌生人因为'{title_emotion}'相遇。"
        f"中间用聊天气泡形式呈现两人匿名对话（昵称：{me_nick} 与 {partner_nick}），"
        f"对话氛围：{convo}。底部三个小标签写'你们的同频点'：{pts}。"
        f"中文，干净，治愈，可分享到社交媒体，竖版。"
    )


async def generate_ai_image(prompt: str, size: str = "1024x1536") -> str:
    payload = {"model": IMAGE_MODEL, "prompt": prompt, "n": 1, "size": size, "quality": "high"}
    headers = {"Authorization": f"Bearer {IMAGE_KEY}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=300) as c:
        r = await c.post(IMAGE_API, json=payload, headers=headers)
        r.raise_for_status()
        data = r.json().get("data", [])
    for item in data:
        if item.get("b64_json"):
            return f"data:image/png;base64,{item['b64_json']}"
        if item.get("url"):
            async with httpx.AsyncClient(timeout=60) as c:
                ir = await c.get(item["url"])
                ir.raise_for_status()
                return "data:image/png;base64," + base64.b64encode(ir.content).decode()
    raise RuntimeError("no image returned")
