"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { connectChat } from "@/lib/ws";
import { apiBase, getUserId, requestSuggest } from "@/lib/api";
import { themeOf } from "@/lib/theme";

interface Msg {
  type: string;
  data: { from?: string; nickname?: string; content: string; online?: number };
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [meta, setMeta] = useState<any>(null);
  const [online, setOnline] = useState(1);
  const [everPaired, setEverPaired] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [rgb, setRgb] = useState("255, 125, 77");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggLoading, setSuggLoading] = useState(false);
  const [suggOpen, setSuggOpen] = useState(true);
  const [ended, setEnded] = useState(false);
  const [endedBy, setEndedBy] = useState<string>("");
  const [poster, setPoster] = useState<string>("");
  const [posterLoading, setPosterLoading] = useState(false);
  const myType = useRef("");
  const emotionLabel = useRef("此刻");
  const msgsRef = useRef<Msg[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const uid = useRef("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<any>(null);
  const sendingTyping = useRef(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("vibe_room");
    if (!raw) {
      router.replace("/");
      return;
    }
    const m = JSON.parse(raw);
    setMeta(m);
    const mem = sessionStorage.getItem("vibe_memory");
    if (mem) {
      try {
        const parsed = JSON.parse(mem);
        const th = themeOf(parsed.primary_emotion);
        setRgb(th.rgb);
        emotionLabel.current = th.label;
        myType.current = parsed.型 ?? "";
      } catch {
        /* default */
      }
    }
    loadSuggest(m.sync_points ?? []);
    uid.current = getUserId();
    const ws = connectChat(roomId, uid.current, m.nickname, (msg: Msg) => {
      if (msg.type === "typing") {
        if (msg.data.from !== uid.current) setPartnerTyping(!!(msg.data as any).on);
        return;
      }
      if (typeof msg.data.online === "number") {
        setOnline(msg.data.online);
        if (msg.data.online >= 2) setEverPaired(true);
      }
      if (msg.type === "ended") {
        setEndedBy(msg.data.from === uid.current ? "你" : (msg.data as any).by || "对方");
        setEnded(true);
        return;
      }
      if (msg.type === "chat" || msg.type === "icebreaker") setPartnerTyping(false);
      setMsgs((prev) => {
        const next = [...prev, msg];
        msgsRef.current = next;
        return next;
      });
    });
    wsRef.current = ws;
    return () => ws.close();
  }, [roomId, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, partnerTyping]);

  function emitTyping(on: boolean) {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (sendingTyping.current === on) return;
    sendingTyping.current = on;
    wsRef.current.send(JSON.stringify({ type: "typing", on }));
  }

  function onInput(v: string) {
    setInput(v);
    emitTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(false), 1500);
  }

  async function loadSuggest(syncPts?: string[]) {
    setSuggLoading(true);
    try {
      const recent = msgsRef.current
        .filter((m) => m.type === "chat")
        .slice(-4)
        .map((m) => ({ mine: m.data.from === uid.current, text: m.data.content }));
      const lines = await requestSuggest({
        sync_points: syncPts ?? meta?.sync_points ?? [],
        my_type: myType.current,
        recent,
      });
      setSuggestions(lines);
      setSuggOpen(true);
    } finally {
      setSuggLoading(false);
    }
  }

  function send() {
    const text = input.trim();
    if (!text || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ content: text }));
    emitTyping(false);
    clearTimeout(typingTimer.current);
    setInput("");
  }

  function endConversation() {
    // 通知双方进入"已结束"（状态同步）；本端 ws 的 ended 回包会切到结束屏
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "end" }));
    } else {
      setEndedBy("你");
      setEnded(true);
    }
  }

  function goHome() {
    wsRef.current?.close();
    router.push("/");
  }

  function downloadPoster() {
    if (!poster) return;
    // PNG（AI 版）直接下载
    if (poster.startsWith("data:image/png")) {
      const a = document.createElement("a");
      a.href = poster;
      a.download = "vibechat-纪念长图.png";
      a.click();
      return;
    }
    // SVG（模拟版）→ canvas 转 PNG，保证到处可用、可分享
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = (img.naturalWidth || 720) * scale;
      canvas.height = (img.naturalHeight || 1280) * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "vibechat-纪念长图.png";
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.src = poster;
  }

  async function generatePoster(mode: "mock" | "ai") {
    setPosterLoading(true);
    try {
      const messages = msgs
        .filter((m) => m.type === "chat")
        .map((m) => ({ mine: m.data.from === uid.current, text: m.data.content }));
      const r = await fetch(`${apiBase()}/api/summary-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          me_nick: meta.nickname,
          partner_nick: meta.partner_nick,
          title_emotion: emotionLabel.current,
          sync_points: meta.sync_points ?? [],
          messages,
          mode,
        }),
      });
      const d = await r.json();
      setPoster(d.image || "");
    } finally {
      setPosterLoading(false);
    }
  }

  if (!meta) return null;

  const presence =
    online >= 2
      ? { dot: "bg-ember shadow-glow", text: "对方在线", cls: "text-ember-soft" }
      : everPaired
        ? { dot: "bg-[var(--ember-deep)]", text: "对方暂时离开了", cls: "text-dim" }
        : { dot: "bg-[var(--text-dim)] animate-breathe", text: "等待对方进入…", cls: "text-dim" };

  const hasChat = msgs.some((m) => m.type === "chat");

  return (
    <div
      className="canvas h-screen flex flex-col"
      style={{
        background: `radial-gradient(110% 50% at 50% 0%, rgba(${rgb}, 0.1) 0%, transparent 60%), var(--ink)`,
      }}
    >
      {/* 头部：配对 + 在场状态 */}
      <header className="relative z-10 border-b border-[var(--border)] backdrop-blur-md">
        <div className="max-w-2xl mx-auto w-full px-4 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <div className="display font-medium truncate">
              {meta.nickname} <span className="text-ember">×</span> {meta.partner_nick}
            </div>
            <div className="flex items-center gap-3 text-xs mt-0.5">
              <span className={`flex items-center gap-1.5 ${presence.cls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${presence.dot}`} />
                {presence.text}
              </span>
              {meta.sync_points?.[0] && (
                <span className="text-dim truncate">· 同频 {meta.sync_points[0]}</span>
              )}
            </div>
          </div>
          {!ended && (
            <button
              onClick={endConversation}
              className="text-sm text-dim hover:text-[var(--text)] transition shrink-0"
            >
              结束对话
            </button>
          )}
        </div>
      </header>

      {/* 消息区：居中阅读栏 */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-4 py-5 flex flex-col gap-3 min-h-full">
          {!hasChat && (
            <div className="m-auto text-center text-sm text-dim max-w-xs leading-relaxed">
              你们是被同一种感受牵到一起的。
              <br />
              不用客套，从此刻最重的那一点说起就好。
            </div>
          )}

          {msgs.map((m, i) => {
            if (m.type === "system") {
              return (
                <div key={i} className="text-center text-xs text-dim my-1">
                  {m.data.content}
                </div>
              );
            }
            if (m.type === "icebreaker") {
              return (
                <div
                  key={i}
                  className="mx-auto max-w-[90%] rounded-2xl px-4 py-2.5 text-sm text-ember-soft animate-fadeUp"
                  style={{
                    background: "rgba(255, 125, 77, 0.1)",
                    border: "1px solid rgba(255, 125, 77, 0.28)",
                  }}
                >
                  💡 {m.data.content}
                </div>
              );
            }
            const mine = m.data.from === uid.current;
            return (
              <div
                key={i}
                className={`flex flex-col gap-1 animate-fadeUp ${mine ? "items-end" : "items-start"}`}
              >
                {!mine && (
                  <span className="text-[0.7rem] text-dim px-1 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--ember-deep)]" />
                    {meta.partner_nick}
                  </span>
                )}
                <div
                  className={`max-w-[78%] px-4 py-2.5 text-sm leading-relaxed ${
                    mine ? "btn-ember rounded-2xl rounded-br-md" : "card rounded-2xl rounded-bl-md"
                  }`}
                  style={mine ? { boxShadow: "none" } : undefined}
                >
                  {m.data.content}
                </div>
              </div>
            );
          })}

          {partnerTyping && (
            <div className="flex items-center gap-2 text-xs text-dim px-1 animate-fadeUp">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-ember-soft animate-breathe" />
                <span
                  className="h-1.5 w-1.5 rounded-full bg-ember-soft animate-breathe"
                  style={{ animationDelay: "0.3s" }}
                />
                <span
                  className="h-1.5 w-1.5 rounded-full bg-ember-soft animate-breathe"
                  style={{ animationDelay: "0.6s" }}
                />
              </span>
              {meta.partner_nick} 正在说…
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* 对话结束：双方状态同步 + 纪念长图模块 */}
      {ended && (
        <div className="relative z-10 max-w-2xl mx-auto w-full px-4 pb-6">
          <div className="card p-6 flex flex-col gap-4 text-center animate-fadeUp">
            <div className="flex flex-col gap-1">
              <span className="text-xs tracking-[0.3em] text-dim">对话已结束</span>
              <h3 className="display text-xl">
                {endedBy === "你" ? "你结束了这次对话" : `${endedBy} 结束了这次对话`}
              </h3>
              <p className="text-sm text-muted">把这次相遇，留成一张图吧。</p>
            </div>

            {poster ? (
              <div className="flex flex-col gap-3">
                <img
                  src={poster}
                  alt="对话纪念长图"
                  className="w-full rounded-2xl border border-[var(--border)]"
                />
                <button onClick={downloadPoster} className="btn-ember py-3 text-sm">
                  ⬇ 下载图片（PNG）
                </button>
                <button onClick={goHome} className="btn-ghost py-2.5 text-sm">
                  返回首页
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => generatePoster("mock")}
                  disabled={posterLoading}
                  className="btn-ember w-full py-3.5 text-sm"
                >
                  {posterLoading ? "正在生成…" : "✨ 生成这次对话的纪念长图"}
                </button>
                <button
                  onClick={() => generatePoster("ai")}
                  disabled={posterLoading}
                  className="btn-ghost w-full py-2.5 text-xs"
                >
                  用 AI 精绘（gpt-image，约 1 分钟）
                </button>
                <p className="text-xs text-dim">演示为即时模拟版；AI 版调用 gpt-image 生成插画长图</p>
                <button onClick={goHome} className="text-xs text-dim hover:text-[var(--text)] mt-1">
                  直接返回首页
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!ended && (
        <>
      {/* AI 破冰建议：随机出 3 句，点一下上屏 */}
      <div className="relative z-10 max-w-2xl mx-auto w-full px-4">
        <div className="flex items-center justify-between mb-1.5">
          <button
            onClick={() => setSuggOpen((v) => !v)}
            className="text-xs text-muted flex items-center gap-1.5"
          >
            <span className="text-ember">✦</span> 不知道说什么？AI 帮你开口
            <span className="text-dim">{suggOpen ? "▾" : "▸"}</span>
          </button>
          <button
            onClick={() => loadSuggest()}
            disabled={suggLoading}
            className="text-xs text-dim hover:text-ember-soft transition disabled:opacity-40"
          >
            {suggLoading ? "正在想…" : "↻ 换一批"}
          </button>
        </div>
        {suggOpen && (
          <div className="flex flex-col gap-1.5 pb-2">
            {(suggLoading && suggestions.length === 0
              ? ["…", "…", "…"]
              : suggestions
            ).map((s, i) => (
              <button
                key={i}
                disabled={suggLoading}
                onClick={() => {
                  setInput(s);
                  setSuggOpen(false);
                }}
                className="text-left text-sm rounded-2xl px-4 py-2.5 transition disabled:opacity-50"
                style={{
                  background: "rgba(255, 125, 77, 0.08)",
                  border: "1px solid rgba(255, 125, 77, 0.22)",
                }}
              >
                <span className="text-ember-soft mr-1.5">{i + 1}.</span>
                <span className="text-[var(--text)]">{s}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="relative z-10 border-t border-[var(--border)] backdrop-blur-md">
        <div className="max-w-2xl mx-auto w-full px-4 py-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => onInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="输入消息…"
            className="field flex-1 px-4 py-2.5 text-sm rounded-full"
          />
          <button onClick={send} disabled={!input.trim()} className="btn-ember px-6 text-sm">
            发送
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
