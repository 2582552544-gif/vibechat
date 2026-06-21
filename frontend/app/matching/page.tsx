"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { checkMatch, getUserId } from "@/lib/api";
import { themeOf } from "@/lib/theme";
import NavBar from "../components/NavBar";
import EmotionScene from "../components/EmotionScene";

export default function MatchingPage() {
  const router = useRouter();
  const [matched, setMatched] = useState<any>(null);
  const [secs, setSecs] = useState(0);
  const [rgb, setRgb] = useState("255, 125, 77");
  const startedChat = useRef(false);

  useEffect(() => {
    // 取出此刻情绪色，让搜寻画面是“你的”颜色
    const mem = sessionStorage.getItem("vibe_memory");
    if (mem) {
      try {
        setRgb(themeOf(JSON.parse(mem).primary_emotion).rgb);
      } catch {
        /* keep default */
      }
    }
    const raw = sessionStorage.getItem("vibe_match");
    if (!raw) {
      router.replace("/");
      return;
    }
    const initial = JSON.parse(raw);
    if (initial.status === "matched") {
      setMatched(initial);
      return;
    }
    if (initial.status === "crisis") {
      router.replace("/crisis");
      return;
    }
    const uid = getUserId();
    const tick = setInterval(() => setSecs((s) => s + 1), 1000);
    const poll = setInterval(async () => {
      const r = await checkMatch(uid);
      if (r.status === "matched") {
        clearInterval(poll);
        sessionStorage.setItem("vibe_match", JSON.stringify(r));
        setMatched(r);
      }
    }, 2000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [router]);

  function startChat() {
    if (startedChat.current || !matched) return;
    startedChat.current = true;
    sessionStorage.setItem(
      "vibe_room",
      JSON.stringify({
        room_id: matched.room_id,
        nickname: matched.me?.nickname ?? "匿名",
        partner_nick: matched.partner?.nickname ?? matched.partner_nick ?? "对方",
        sync_points: matched.sync_points ?? [],
      }),
    );
    router.push(`/chat/${matched.room_id}`);
  }

  return (
    <div className="canvas min-h-screen flex flex-col">
      <NavBar />
      <main className="relative flex-1 flex items-center justify-center px-6 py-10">
        <EmotionScene rgb={rgb} mode={matched ? "self" : "search"} intensity={0.7} />

        {matched ? (
          <div className="relative z-10 w-full max-w-md card p-7 flex flex-col gap-6 text-center animate-fadeUp">
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-xs tracking-[0.35em] text-dim">同频的人出现了</span>
              <div className="display text-3xl font-semibold ink-glow">✦ 找到了</div>
            </div>

            <div className="flex items-center justify-center gap-3 text-sm">
              <span className="chip chip-on px-4 py-2">{matched.me?.nickname}</span>
              <span className="text-ember">≈≈≈</span>
              <span className="chip chip-on px-4 py-2">
                {matched.partner?.nickname ?? matched.partner_nick}
              </span>
            </div>

            <div className="text-left flex flex-col gap-2.5">
              <p className="text-sm text-muted">你们的同频点</p>
              {(matched.sync_points ?? []).map((p: string, i: number) => (
                <div key={i} className="rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm">
                  <span className="text-ember-soft mr-1.5">·</span>
                  {p}
                </div>
              ))}
            </div>

            <button onClick={startChat} className="btn-ember w-full py-4 text-base">
              开始聊天
            </button>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center gap-5 text-center">
            <p className="display text-2xl">正在寻找和你同频的人…</p>
            <p className="text-sm text-muted leading-relaxed">情绪相似 · 正负向接近 · 经历重合</p>
            <div className="card px-4 py-1.5 text-xs text-dim">已等待 {secs} 秒</div>
            {secs >= 30 && (
              <button onClick={() => router.push("/")} className="btn-ghost px-5 py-2.5 text-sm mt-1">
                同频的人还在路上 · 回去换一种表达
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
