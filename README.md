<div align="center">

# VibeChat · 此刻被看见

**AI 驱动的情绪社交 —— 说出此刻说不清的感受，遇见也在这样的人。**

把你此刻的状态读成一个「型」，用一句话说中你，再把正在经历同一件事的人匿名匹配到一起聊聊。
温柔、不诊断、不留痕迹。

![stack](https://img.shields.io/badge/backend-FastAPI-009688) ![stack](https://img.shields.io/badge/frontend-Next.js%2014-000000) ![llm](https://img.shields.io/badge/LLM-OpenAI%20%2B%20Anthropic-ff7d4d) ![status](https://img.shields.io/badge/状态-可运行-22c55e)

</div>

---

## 100 字介绍

VibeChat 把每个用户此刻的状态分析成一个「型」——深夜内耗型、倒计时焦虑型——并用一句话说中你说不清的感受。每个用户是一条带记忆的 session，系统用混合检索（关键词 TF-IDF + 向量 + 同情绪通道）在用户间互相召回，把正在经历同一件事的人匿名匹配到一起聊天。匹配页展示「你们为何同频」，证明 AI 真正驱动了匹配。聊天中 AI 提供破冰建议、结束后生成纪念长图。支持 OpenAI / Anthropic 双标准接口适配，极端负面情绪触发安全兜底。不是心理咨询，是让此刻的感受成为连接的入口。

## 为什么不一样

普通方案：`输入文字 → LLM 返回"焦虑" → 展示标签 → 随机匹配`。VibeChat 在每一步都更进一步：

| 维度 | 普通做法 | VibeChat |
|---|---|---|
| **情绪理解** | 返回一个标签 | 一个「型」+ 镜子句（说中你）+ 侦探句（点出你没说出口的）+ 同型者真话 |
| **匹配** | 按标签随机分桶 | 跨 session 记忆**混合检索**（TF-IDF + 哈希向量 + 同情绪通道 + 等待加权） |
| **可信度** | 黑箱 | 匹配页展示「你们为何同频」（重合关键词、共享情绪、相似拉扯）——数据驱动证明因果 |
| **聊天** | 干聊 | 在场感（在线/正在输入/结束同步）+ AI 破冰建议（点一下上屏）+ 纪念长图 |
| **安全** | 无 | 极端负面情绪识别 → 安全兜底页（求助热线） |

## 核心功能

- 🎭 **「型」情绪分析** —— 型名 / 镜子句 / 侦探句 / 同型声音 / VAD（正负向·唤醒·强度）
- 🧲 **同频匹配** —— 跨 session 混合检索，匹配成功展示「同频点」，等待越久阈值越低（不卡死）
- 💬 **匿名实时聊天** —— WebSocket，系统生成情绪意象昵称（自动去重）
- 👀 **在场感** —— 对方在线 / 正在输入 / 暂时离开；**结束对话双方状态同步**
- ✨ **AI 破冰建议** —— 随对话语境随机出 3 句，点一下上屏，可换一批
- 🖼️ **纪念长图** —— 结束后用真实对话生成可分享长图（即时 SVG 模拟版 / gpt-image-2 精绘版），一键下载 PNG
- 🌈 **情绪可视化** —— 画布光晕 / 呼吸光球 / 环绕"频率"节点，颜色随情绪变化
- 🆘 **安全边界** —— 危机识别 → 援助热线兜底页
- 🔌 **双 LLM 适配** —— OpenAI / Anthropic 标准接口，环境变量一键切换，异常自动降级

> 🗺️ 规划中（见 `docs/plans/2026-06-21-vibechat-phase2.md`）：对话情绪小结、情绪轨迹回顾页。

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | FastAPI · uvicorn · WebSocket · httpx（内存存储） |
| 前端 | Next.js 14 (App Router) · TypeScript · Tailwind |
| LLM | OpenAI 标准接口 + Anthropic 标准接口（双适配，环境变量切换） |
| 匹配 | 关键词 TF-IDF + 哈希向量 + 同情绪通道 + 等待加权（纯 Python，无外部向量库） |
| 图像 | gpt-image-2（云雾代理）+ 服务端即时 SVG 长图 |

## 链路

```
用户输入 → /api/analyze（型 + 经历 + keywords + VAD + 镜子句/侦探句/同型声音）
        → /api/match（跨 session 混合检索）→ 匹配 + sync_points
        → WS /ws/rooms/{room_id}（匿名聊天 + 破冰 + 在场感 + 结束同步）
        → /api/suggest（AI 破冰建议）  /api/summary-image（纪念长图）
        → 极端负面 → /crisis（安全兜底）
```

- **每个用户 = 一个 session**（`session_key = vibe:{user_id}`），持有 memory / 状态 / room_id / 昵称。
- **匹配 = 跨 `waiting` 的 session 做 hybrid_match**，排除自己/已匹配，等待越久阈值越低。

## 目录结构

```
vibechat/
├── backend/
│   └── app/
│       ├── main.py              # FastAPI 入口 + CORS + 路由挂载
│       ├── config.py            # 双 LLM 配置加载
│       ├── soul.py              # AI 人格（深夜电台主播口吻）
│       ├── identity.py          # 情绪意象昵称（组合去重）
│       ├── llm/                 # 分析器(OpenAI/Anthropic) + 工厂 + 破冰建议
│       ├── session/manager.py   # 用户=session
│       ├── matching/store.py    # hybrid_match 混合检索
│       ├── chat/                # ConnectionManager + 破冰
│       ├── summary.py           # 纪念长图（SVG + gpt-image）
│       └── routers/             # analyze / match / chat_ws / suggest / summary_image
└── frontend/
    └── app/
        ├── page.tsx             # 落地页（Hero + 三步引导 + 输入 + SEO）
        ├── result/              # 「型」页（渐进揭示）
        ├── matching/            # 匹配（情绪场景 + 同频点）
        ├── chat/[roomId]/       # 聊天（在场感 + 破冰建议 + 结束 + 长图）
        ├── crisis/              # 安全兜底
        └── components/          # NavBar · EmotionScene
```

## 本地运行

### 后端

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # 填入 LLM 配置（见下）
uvicorn app.main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install
cp .env.example .env.local   # 默认指向 http://localhost:8000
npm run dev                  # http://localhost:3000
```

## LLM 配置（OpenAI / Anthropic 双标准适配）

通过环境变量 `LLM_PROVIDER` 切换，配置写在 `backend/.env`。

### OpenAI 标准接口模式

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1     # 兼容任意 OpenAI 标准代理
OPENAI_MODEL=gpt-4o-mini
```

> 兼容所有 OpenAI 标准代理。例如云雾：`OPENAI_BASE_URL=https://yunwu.ai/v1`，`OPENAI_MODEL=gemini-3.1-flash-lite`。

### Anthropic 标准接口模式

```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_BASE_URL=https://api.anthropic.com  # 调用 /v1/messages
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

改 `LLM_PROVIDER` 并重启后端即可切换；两种模式产出一致的 UserMemory 结构。外部 LLM 失败时 `/api/analyze` 返回兜底结构，前端流程不中断。

## 部署

- **后端 → Railway**：连仓库（根目录有 `Dockerfile`），设环境变量（`LLM_PROVIDER`/`OPENAI_*` + `CORS_ORIGINS=<前端域名>`）。
- **前端 → Vercel**：Root 设 `frontend`，设 `NEXT_PUBLIC_API_BASE=https://<后端>`、`NEXT_PUBLIC_WS_BASE=wss://<后端>`。

## 线上演示

- 前端地址：`<部署后填写，Vercel>`
- 后端地址：`<部署后填写，Railway/Render>`

## 测试

```bash
cd backend && .venv/bin/python -m pytest tests/ -v
```

## 演示建议

1. 打开两个无痕窗口（模拟两个用户）。
2. 两边输入**相似情绪**（如都写"考研焦虑、真题没做完"），可秒匹配。
3. 看匹配成功页"同频点" → 证明 AI 分析驱动了匹配。
4. 互发消息（看"正在输入"）、用 AI 破冰建议、结束对话生成纪念长图并下载。
5. 输入极端负面文字验证安全兜底。

---

<div align="center">
<sub>VibeChat · 让此刻的感受成为连接的入口 · 不是医疗产品</sub>
</div>
