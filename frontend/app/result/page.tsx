"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requestMatch, getUserId, UserMemory } from "@/lib/api";
import { themeOf, auraBg, halo } from "@/lib/theme";
import NavBar from "../components/NavBar";

export default function ResultPage() {
  const router = useRouter();
  const [mem, setMem] = useState<UserMemory | null>(null);
  const [reveal, setReveal] = useState(0); // 0..4 渐进揭示
  const [matching, setMatching] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("vibe_memory");
    if (!raw) {
      router.replace("/");
      return;
    }
    setMem(JSON.parse(raw));
  }, [router]);

  useEffect(() => {
    if (!mem) return;
    const timers = [1, 2, 3, 4].map((n) =>
      setTimeout(() => setReveal((r) => Math.max(r, n)), n * 1400),
    );
    return () => timers.forEach(clearTimeout);
  }, [mem]);

  async function findPeople() {
    if (!mem) return;
    setMatching(true);
    const r = await requestMatch(getUserId(), mem);
    sessionStorage.setItem("vibe_match", JSON.stringify(r));
    router.push("/matching");
  }

  if (!mem) return null;
  const t = themeOf(mem.primary_emotion);

  return (
    <div
      className="canvas min-h-screen transition-[background] duration-1000"
      style={{ background: auraBg(t.rgb) }}
    >
      <NavBar />
      <main className="relative z-10 w-full max-w-md mx-auto px-5 py-12 flex flex-col gap-7">
        {/* 型名 */}
        <div className="text-center mt-6 flex flex-col items-center gap-4 animate-fadeUp">
          <div className="text-6xl animate-drift" style={{ filter: halo(t.rgb) }}>
            {t.emoji}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs tracking-[0.35em] text-dim">你此刻是</span>
            <h1 className="display text-4xl font-semibold ink-glow">{mem.型}</h1>
          </div>
        </div>

        {/* 镜子句 */}
        {reveal >= 1 && mem.镜子句 && (
          <p className="display text-xl leading-relaxed text-center text-balance animate-fadeUp">
            {mem.镜子句}
          </p>
        )}

        {/* 侦探句 */}
        {reveal >= 2 && mem.侦探句 && (
          <div className="card px-5 py-4 text-[0.95rem] leading-relaxed text-muted animate-fadeUp">
            <span className="text-ember">看见你没说出口的：</span>
            <br />
            {mem.侦探句}
          </div>
        )}

        {/* 同型声音 */}
        {reveal >= 3 && mem.同型声音?.length > 0 && (
          <div className="flex flex-col gap-2.5 animate-fadeUp">
            <p className="text-sm text-muted">和你同型的人，此刻也在说——</p>
            {mem.同型声音.map((v, i) => (
              <div key={i} className="card px-4 py-3 text-sm leading-relaxed">
                <span className="text-ember-soft">「</span>
                {v}
                <span className="text-ember-soft">」</span>
              </div>
            ))}
          </div>
        )}

        {/* 行动 */}
        {reveal >= 4 && (
          <div className="flex flex-col gap-3 mt-2 animate-fadeUp">
            <button
              onClick={findPeople}
              disabled={matching}
              className="btn-ember w-full py-4 text-base"
            >
              {matching ? "正在寻找…" : "找一个也在经历这些的人"}
            </button>
            <button onClick={() => router.push("/")} className="btn-ghost w-full py-3 text-sm">
              我自己消化一下
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
