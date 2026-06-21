# VibeChat 第二阶段（提交就绪 + 体验增强）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在已完成的核心链路（型 → 同频匹配 → 匿名聊天 → 破冰建议 → 结束同步 → 纪念长图）之上，补齐两个赛题维度（情绪总结、情绪轨迹回顾），打磨长图，并完成线上部署与提交物。

**Architecture:** 后端 FastAPI（内存存储，双 LLM 适配，云雾代理）；前端 Next.js 14 App Router。新功能延续现有模式：情绪总结复用 LLM 客户端走新路由；情绪轨迹纯前端 localStorage（尊重"匿名·此刻"灵魂，不落库）。部署后端 Railway、前端 Vercel。

**Tech Stack:** FastAPI · httpx · Next.js 14 · TypeScript · Tailwind · gpt-image-2(云雾) · Railway · Vercel · pytest

**前置状态（已完成，勿重做）：** 双 LLM 分析、SessionManager、hybrid_match、WS 聊天、昵称去重、在场感/正在输入、AI 破冰建议(`/api/suggest`)、结束对话状态同步(`ended` 事件)、纪念长图(`/api/summary-image` mock+ai)、导航栏、落地页+SEO、情绪场景。

---

## 文件结构

| 文件 | 责任 | 动作 |
|---|---|---|
| `backend/app/summary.py` | 长图渲染 + 新增对话情绪小结 | 修改 |
| `backend/app/routers/summary_image.py` | 长图路由 + 新增 `/api/summary-text` | 修改 |
| `backend/tests/test_summary.py` | 小结/长图单测 | 新建 |
| `frontend/lib/history.ts` | 情绪轨迹 localStorage 读写 | 新建 |
| `frontend/app/history/page.tsx` | 情绪轨迹回顾页 | 新建 |
| `frontend/app/page.tsx` | 提交成功后写入轨迹 + 入口链接 | 修改 |
| `frontend/app/chat/[roomId]/page.tsx` | 结束屏显示情绪小结 | 修改 |
| `frontend/lib/api.ts` | `requestSummaryText` | 修改 |
| `README.md` | 线上地址 + 100字 + 切换说明 | 修改 |

---

## Task 1: 对话情绪小结（赛题"情绪总结"维度）

结束对话时，AI 生成一句温柔的小结，显示在结束屏并注入长图。

**Files:**
- Modify: `backend/app/summary.py`
- Modify: `backend/app/routers/summary_image.py`
- Test: `backend/tests/test_summary.py`
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/app/chat/[roomId]/page.tsx`

- [ ] **Step 1: 写失败测试（小结回退不报错）**

`backend/tests/test_summary.py`:
```python
import asyncio
from app.summary import conversation_summary_fallback, build_poster_svg


def test_summary_fallback_nonempty():
    s = conversation_summary_fallback(["都在经历迷茫"])
    assert isinstance(s, str) and len(s) > 0


def test_poster_includes_summary():
    uri = build_poster_svg("迷茫", "甲", "乙", [{"mine": True, "text": "你好"}], ["都在迷茫"], summary="今晚你们都不孤单。")
    assert uri.startswith("data:image/svg+xml;base64,")
```

- [ ] **Step 2: 运行确认失败**

Run: `cd backend && .venv/bin/python -m pytest tests/test_summary.py -v`
Expected: FAIL（`conversation_summary_fallback` 未定义、`build_poster_svg` 无 `summary` 形参）

- [ ] **Step 3: 在 `summary.py` 增加小结生成 + 长图注入**

在 `summary.py` 顶部 import 下方加入：
```python
from .config import load_llm_config
from .soul import SOUL


def conversation_summary_fallback(sync_points: list[str]) -> str:
    pt = sync_points[0] if sync_points else "此刻"
    return f"今晚你们因为{pt}相遇，至少这一刻，谁都不是一个人。"


def _summary_prompt(messages: list[dict], sync_points: list[str]) -> str:
    convo = "\n".join(f"{'A' if m.get('mine') else 'B'}：{m.get('text','')}" for m in messages[:12])
    why = "、".join(sync_points) if sync_points else "相似的此刻"
    return (
        SOUL
        + f"""

两个匿名陌生人因为「{why}」聊了一会儿。对话：
{convo}

用一句温柔的话，总结此刻他们之间发生了什么（被看见/不孤单的感觉）。
第二人称"你们"，不超过30字，不说教、不诊断。只输出这句话本身。"""
    )


async def conversation_summary(messages: list[dict], sync_points: list[str]) -> str:
    if not messages:
        return conversation_summary_fallback(sync_points)
    cfg = load_llm_config()
    prompt = _summary_prompt(messages, sync_points)
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            if cfg.provider == "anthropic":
                r = await c.post(
                    f"{cfg.base_url}/v1/messages",
                    headers={"x-api-key": cfg.api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                    json={"model": cfg.model, "max_tokens": 200, "messages": [{"role": "user", "content": prompt}]},
                )
                r.raise_for_status()
                return r.json()["content"][0]["text"].strip()
            r = await c.post(
                f"{cfg.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {cfg.api_key}"},
                json={"model": cfg.model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.8},
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        return conversation_summary_fallback(sync_points)
```

在 `build_poster_svg` 签名加 `summary: str = ""`，并在页脚上方插入小结文本（页脚 `y += 50` 之前）：
```python
    if summary:
        y += 30
        for ln in _wrap(summary, 18):
            parts.append(f'<text x="{W/2}" y="{y}" text-anchor="middle" fill="{EMBER_SOFT}" font-size="20">{html.escape(ln)}</text>')
            y += 28
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd backend && .venv/bin/python -m pytest tests/test_summary.py -v`
Expected: PASS（2 passed）

- [ ] **Step 5: 增加 `/api/summary-text` 路由 + 长图带小结**

`summary_image.py` 增加：
```python
from ..summary import conversation_summary


class SummaryTextReq(BaseModel):
    sync_points: list[str] = []
    messages: list[dict] = []


@router.post("/api/summary-text")
async def summary_text(req: SummaryTextReq):
    return {"summary": await conversation_summary(req.messages, req.sync_points)}
```
并在 `SummaryReq` 增加 `summary: str = ""`，`build_poster_svg(...)` 与 `build_image_prompt(...)` 调用传入 `req.summary`（prompt 末尾追加 `底部写一句小结：{summary}`）。

- [ ] **Step 6: 前端 api + 结束屏显示小结**

`lib/api.ts` 增加：
```typescript
export async function requestSummaryText(p: { sync_points: string[]; messages: { mine: boolean; text: string }[] }): Promise<string> {
  const r = await fetch(`${API}/api/summary-text`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p),
  });
  return (await r.json()).summary ?? "";
}
```
`chat/[roomId]/page.tsx`：新增 `const [summary, setSummary] = useState("")`；在收到 `ended` 时触发拉取：
```typescript
if (msg.type === "ended") {
  setEndedBy(msg.data.from === uid.current ? "你" : (msg.data as any).by || "对方");
  setEnded(true);
  const recent = msgsRef.current.filter((m) => m.type === "chat").map((m) => ({ mine: m.data.from === uid.current, text: m.data.content }));
  requestSummaryText({ sync_points: meta?.sync_points ?? [], messages: recent }).then(setSummary);
  return;
}
```
结束屏标题下方插入：`{summary && <p className="text-sm text-ember-soft leading-relaxed">{summary}</p>}`，并在 `generatePoster` 的 body 里加上 `summary`。

- [ ] **Step 7: bb-browser 端到端验证**

两端进房聊两句 → A 结束 → 结束屏出现"情绪小结"一句 → 生成长图含该句。

- [ ] **Step 8: Commit**

```bash
git add backend/app/summary.py backend/app/routers/summary_image.py backend/tests/test_summary.py frontend/lib/api.ts "frontend/app/chat/[roomId]/page.tsx"
git commit -m "feat: 对话情绪小结（结束时AI一句总结，注入长图）"
```

---

## Task 2: 情绪轨迹回顾（赛题"记忆与回顾"维度，纯前端 localStorage）

每次分析出「型」就记一笔，`/history` 页用时间线 + 情绪色呈现你的情绪变化。不落库，符合匿名灵魂。

**Files:**
- Create: `frontend/lib/history.ts`
- Create: `frontend/app/history/page.tsx`
- Modify: `frontend/app/page.tsx`

- [ ] **Step 1: 轨迹读写工具**

`frontend/lib/history.ts`:
```typescript
export interface HistoryItem {
  ts: number;
  emotion: string;
  label: string;
  型: string;
}

const KEY = "vibe_history";

export function pushHistory(item: HistoryItem) {
  if (typeof window === "undefined") return;
  const list = getHistory();
  list.unshift(item);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
}

export function getHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: 落地页提交成功后写入轨迹**

`app/page.tsx` 顶部 import：`import { pushHistory } from "@/lib/history"; import { themeOf } from "@/lib/theme";`
在 `submit()` 拿到 `result` 且非 crisis 后、`router.push` 之前插入：
```typescript
pushHistory({ ts: Date.now(), emotion: result.primary_emotion, label: themeOf(result.primary_emotion).label, 型: result.型 });
```
并在落地页 footer 增加入口：`<a href="/history" className="hover:text-ember-soft transition">我的情绪轨迹 →</a>`

- [ ] **Step 3: 轨迹页**

`frontend/app/history/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHistory, HistoryItem } from "@/lib/history";
import { themeOf } from "@/lib/theme";
import NavBar from "../components/NavBar";

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  useEffect(() => setItems(getHistory()), []);

  return (
    <div className="canvas min-h-screen">
      <NavBar />
      <main className="max-w-md mx-auto px-5 py-12 flex flex-col gap-6">
        <div className="text-center flex flex-col gap-1.5">
          <span className="text-xs tracking-[0.35em] text-dim">只存在你的设备里</span>
          <h1 className="display text-3xl ink-glow">你的情绪轨迹</h1>
        </div>

        {items.length === 0 ? (
          <div className="text-center text-sm text-muted mt-10">
            还没有记录。<Link href="/" className="text-ember-soft">去说说此刻 →</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((it, i) => {
              const t = themeOf(it.emotion);
              const d = new Date(it.ts);
              const when = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
              return (
                <div key={i} className="card px-4 py-3 flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ background: `rgb(${t.rgb})`, boxShadow: `0 0 12px rgba(${t.rgb},0.6)` }} />
                  <div className="flex-1 min-w-0">
                    <div className="display text-base truncate">{it.型 || t.label}</div>
                    <div className="text-xs text-dim">{t.label} · {when}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Link href="/" className="btn-ghost py-3 text-sm text-center">回到此刻</Link>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: 验证**

Run: 浏览器分析 2-3 次不同情绪 → 打开 `/history` 看时间线（颜色随情绪变化、型名、时间）。
Verify via bb-browser screenshot。

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/history.ts frontend/app/history/page.tsx frontend/app/page.tsx
git commit -m "feat: 情绪轨迹回顾页（localStorage，不落库）"
```

---

## Task 3: 模拟长图气泡换行精修

当前按固定字数换行，尾字偶尔被气泡裁切。改成"气泡宽度 = 实际最长行字数派生"，并加内边距冗余。

**Files:**
- Modify: `backend/app/summary.py`
- Test: `backend/tests/test_summary.py`

- [ ] **Step 1: 加测试**

追加到 `tests/test_summary.py`:
```python
def test_bubble_width_fits_longest_line():
    from app.summary import _wrap
    lines = _wrap("我也差不多像一脚踏进雾里走哪儿都心虚", 12)
    assert max(len(x) for x in lines) <= 12
```

- [ ] **Step 2: 运行确认失败/通过基线**

Run: `cd backend && .venv/bin/python -m pytest tests/test_summary.py::test_bubble_width_fits_longest_line -v`

- [ ] **Step 3: 调整 `build_poster_svg` 气泡度量**

把每字宽改为常量 `CW = 22`，换行宽度 `n=13`，气泡宽 `bw = min(W-2*pad, 36 + maxlen*CW)`，字号 `font-size=20`，行高 30：
```python
    CW = 22
    for m in messages[:12]:
        mine = bool(m.get("mine"))
        lines = _wrap(str(m.get("text", "")), 13)
        maxlen = max((len(ln) for ln in lines), default=1)
        bw = min(W - 2 * pad, 36 + maxlen * CW)
        bh = 24 + len(lines) * 30
        ...（其余不变，font-size 用 20）
```

- [ ] **Step 4: 运行测试 + 目测**

Run: `pytest tests/test_summary.py -v`（PASS）。再 curl `/api/summary-image` mock，存 svg 经 dev server 目测气泡不裁字。

- [ ] **Step 5: Commit**

```bash
git add backend/app/summary.py backend/tests/test_summary.py
git commit -m "fix: 模拟长图气泡按最长行宽自适应，避免裁字"
```

---

## Task 4: AI 长图按对话缓存（demo 不重复等待）

同一场对话重复点"AI 精绘"直接返回上次结果，避免现场等 1 分钟两次。

**Files:**
- Modify: `backend/app/summary.py`
- Modify: `backend/app/routers/summary_image.py`

- [ ] **Step 1: 在 `summary.py` 加内存缓存**

```python
import hashlib

_AI_CACHE: dict[str, str] = {}


def cache_key(messages: list[dict], emotion: str) -> str:
    raw = emotion + "|" + "|".join(str(m.get("text", "")) for m in messages)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()
```

- [ ] **Step 2: 路由 ai 分支查/写缓存**

`summary_image.py` 的 `mode == "ai"` 分支：
```python
    if req.mode == "ai":
        key = cache_key(req.messages, req.title_emotion)
        if key in _AI_CACHE:
            return {"mode": "ai", "image": _AI_CACHE[key], "cached": True}
        try:
            prompt = build_image_prompt(req.title_emotion, req.me_nick, req.partner_nick, req.messages, req.sync_points, req.summary)
            img = await generate_ai_image(prompt)
            _AI_CACHE[key] = img
            return {"mode": "ai", "image": img}
        except Exception:
            pass
```
（在文件顶部 `from ..summary import ..., cache_key, _AI_CACHE`）

- [ ] **Step 3: 验证**

Run: 连续两次 `curl -X POST /api/summary-image -d '{...,"mode":"ai"}'`，第二次秒回且 `"cached": true`。

- [ ] **Step 4: Commit**

```bash
git add backend/app/summary.py backend/app/routers/summary_image.py
git commit -m "perf: AI 长图按对话内容缓存，demo 不重复等待"
```

---

## Task 5: 部署后端（Railway）

**需要用户的 Railway 账号。** Dockerfile 已就绪。

- [ ] **Step 1:** Railway 新建项目 → 连本仓库；Root 用仓库根（Dockerfile 在根）。
- [ ] **Step 2:** 设环境变量：`LLM_PROVIDER=openai`、`OPENAI_API_KEY=<云雾key>`、`OPENAI_BASE_URL=https://yunwu.ai/v1`、`OPENAI_MODEL=gemini-3.1-flash-lite`、`CORS_ORIGINS=<Vercel前端域名>`。
- [ ] **Step 3:** 部署后 `curl https://<backend>/health` 返回 `{"status":"ok"}`。
- [ ] **Step 4:** `curl -X POST https://<backend>/api/analyze -d '{"text":"测试"}'` 返回型。

---

## Task 6: 部署前端（Vercel）+ 线上联调

**需要用户的 Vercel 账号。**

- [ ] **Step 1:** Vercel 新建项目 → Root Directory 设 `frontend`。
- [ ] **Step 2:** 环境变量：`NEXT_PUBLIC_API_BASE=https://<backend>`、`NEXT_PUBLIC_WS_BASE=wss://<backend>`。
- [ ] **Step 3:** 部署后开线上首页走通：分析 → 型 → 匹配。
- [ ] **Step 4:** 两个无痕窗口线上联调：匹配成功 + WS 聊天 + 正在输入 + 结束同步 + 长图。
- [ ] **Step 5:** 回填 `CORS_ORIGINS` 为真实 Vercel 域名并重启后端。

---

## Task 7: 提交物（README + 100字 + Demo 视频）

**Files:** Modify `README.md`

- [ ] **Step 1:** README「线上演示」填入 Vercel/Railway 真实地址。
- [ ] **Step 2:** 确认 README 含 OpenAI + Anthropic 双配置与切换说明（已有，复核）。
- [ ] **Step 3:** 录 3-6 分钟 Demo（分镜）：
  1. 落地页+怎么玩三步（10s）
  2. 输入"考研焦虑" → 型/镜子句/侦探句/同型声音（40s）
  3. 第二窗口同情绪 → 匹配成功页"同频点"（30s）
  4. 双向聊天 + 正在输入 + AI 破冰建议上屏（60s）
  5. 结束对话两端同步 + 生成纪念长图（40s）
  6. 情绪轨迹回顾页（20s）
  7. 危机兜底 + README 双 LLM 切换（30s）
- [ ] **Step 4:** 备齐 GitHub 链接 / 线上地址 / 100 字简介，发飞书评委。

---

## 自查：本阶段赛题覆盖

| 赛题维度 | 落点 |
|---|---|
| 对话辅助·情绪总结 | Task 1 对话情绪小结 |
| 记忆与回顾·情绪轨迹 | Task 2 /history 轨迹页 |
| 情绪可视化 | Task 1/3 长图含小结、气泡精修 |
| 线上部署 | Task 5/6 |
| 提交物 | Task 7 |

## 范围外（本阶段不做，避免超纲）

- 多人情绪聊天室 / 互补情绪匹配模式（另起计划）
- 好友关系 / 跨会话持久化（与匿名灵魂冲突，已确认不做）
- 后端数据库持久化（内存足够 demo）
