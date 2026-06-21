"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { analyze, getUserId } from "@/lib/api";
import NavBar from "./components/NavBar";
import EmotionScene from "./components/EmotionScene";

const MOODS = [
  { key: "anxiety", emoji: "🤯", label: "焦虑" },
  { key: "sadness", emoji: "😔", label: "有点丧" },
  { key: "loneliness", emoji: "🌙", label: "孤独" },
  { key: "emptiness", emoji: "🫠", label: "空虚" },
  { key: "calm", emoji: "🍃", label: "平静" },
  { key: "joy", emoji: "😊", label: "开心" },
  { key: "frustration", emoji: "💢", label: "烦躁" },
  { key: "confusion", emoji: "🌀", label: "说不清" },
];

const SITUATIONS = ["学业", "工作", "感情", "家庭", "社交", "自己", "健康", "其他"];

const STEPS = [
  { n: "01", t: "说出此刻", d: "选一个最接近的感受，或直接打一句话。说不清也没关系。" },
  { n: "02", t: "收到你的「型」", d: "AI 给你一个名字和一句也许正中你的话，还有同型的人此刻在说什么。" },
  { n: "03", t: "遇见同频的人", d: "把正在经历同一件事的人匿名匹配给你，看到「你们为何同频」，聊聊。" },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "VibeChat",
  applicationCategory: "SocialNetworkingApplication",
  description:
    "AI 情绪社交：说出此刻的感受，收到一个「型」，遇见正在经历同一件事的人匿名聊聊。",
  inLanguage: "zh-CN",
  offers: { "@type": "Offer", price: "0" },
};

export default function Home() {
  const router = useRouter();
  const [mood, setMood] = useState("");
  const [situation, setSituation] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (text.trim().length < 2) return;
    setLoading(true);
    try {
      getUserId();
      const result = await analyze({
        text: text.trim(),
        mood: mood || undefined,
        situation_hint: situation || undefined,
      });
      sessionStorage.setItem("vibe_memory", JSON.stringify(result));
      router.push(result.safety_level === "crisis" ? "/crisis" : "/result");
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="canvas min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <NavBar />

      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden">
        <EmotionScene rgb="255, 125, 77" mode="self" intensity={0.5} />
        <div className="relative z-10 max-w-3xl mx-auto px-5 pt-20 pb-16 text-center flex flex-col items-center gap-6">
          <span className="text-xs tracking-[0.4em] text-dim animate-fadeUp">AI 情绪社交</span>
          <h1 className="display text-4xl sm:text-5xl leading-[1.25] font-medium animate-fadeUp text-balance">
            说出此刻说不清的感受，
            <br />
            <span className="ink-glow">遇见也在这样的人。</span>
          </h1>
          <p className="text-muted max-w-md leading-relaxed animate-fadeUp" style={{ animationDelay: "0.1s" }}>
            VibeChat 把你此刻的状态读成一个「型」，用一句话说中你，
            再把正在经历同一件事的人匿名匹配给你。匿名，不留痕迹。
          </p>
          <div className="flex items-center gap-3 animate-fadeUp" style={{ animationDelay: "0.18s" }}>
            <a href="#say" className="btn-ember px-7 py-3.5 text-base">
              说说此刻 →
            </a>
            <a href="#how" className="btn-ghost px-6 py-3.5 text-sm">
              怎么玩
            </a>
          </div>
        </div>
      </section>

      {/* ---- 怎么玩：三步引导（小白一眼懂）---- */}
      <section id="how" className="relative z-10 max-w-5xl mx-auto px-5 py-12">
        <h2 className="display text-2xl text-center mb-8">三步，从「没人懂」到「原来你也是」</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="step-card p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="step-num text-sm font-medium">{s.n}</span>
                <span className="display text-lg">{s.t}</span>
              </div>
              <p className="text-sm text-muted leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- 输入区 ---- */}
      <section id="say" className="relative z-10 max-w-md mx-auto px-5 py-12 scroll-mt-20">
        <div className="card p-6 flex flex-col gap-7">
          <div className="text-center flex flex-col gap-1.5">
            <h2 className="display text-2xl">此刻，你的感受是<span className="ink-glow">——</span></h2>
            <p className="text-sm text-muted">说出来，让一个也在经历的人听见你。</p>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">先选一个最接近的</p>
            <div className="grid grid-cols-4 gap-2.5">
              {MOODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMood(m.key)}
                  className={`chip flex flex-col items-center gap-1.5 py-3.5 text-xs ${mood === m.key ? "chip-on" : ""}`}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">跟什么有关</p>
            <div className="flex flex-wrap gap-2">
              {SITUATIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSituation(s)}
                  className={`chip px-4 py-1.5 text-sm ${situation === s ? "chip-on" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="想多说一句也可以，比如「考研还有190天，什么都没准备好…」"
            className="field w-full p-4 text-sm leading-relaxed resize-none"
          />

          <button
            onClick={submit}
            disabled={loading || text.trim().length < 2}
            className="btn-ember w-full py-4 text-base"
          >
            {loading ? "正在感受你的情绪…" : "寻找同频的人"}
          </button>

          <p className="text-center text-xs text-dim">你的输入不会被存储，也不会透露给任何人。</p>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[var(--border)] mt-6">
        <div className="max-w-5xl mx-auto px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-dim">
          <span>VibeChat · 让此刻的感受成为连接的入口</span>
          <span>匿名 · 不留痕迹 · 不是医疗产品</span>
        </div>
      </footer>
    </div>
  );
}
