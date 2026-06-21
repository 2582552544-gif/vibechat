"use client";

import { useRouter } from "next/navigation";

export default function CrisisPage() {
  const router = useRouter();
  return (
    <main className="canvas flex flex-col items-center justify-center px-6 py-12">
      <div className="relative z-10 w-full max-w-md flex flex-col gap-6 text-center animate-fadeUp">
        {/* a steady, warm light — not an alarm */}
        <div className="mx-auto h-12 w-12 rounded-full bg-ember/15 flex items-center justify-center animate-breathe">
          <div className="h-2.5 w-2.5 rounded-full bg-ember shadow-glow" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="display text-2xl font-medium">我们听到了你的声音。</h1>
          <p className="text-muted">你不需要独自面对。</p>
        </div>

        <div className="card p-5 text-left flex flex-col gap-2">
          <p className="text-sm text-dim">24 小时心理援助热线</p>
          <p className="display text-xl text-ember-soft">400-161-9995</p>
          <p className="display text-xl text-ember-soft">010-82951332</p>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            如果你现在需要有人陪，可以拨打上方电话，会有专业的人倾听你。
          </p>
        </div>

        <p className="text-xs text-dim leading-relaxed">
          VibeChat 不是医疗产品，但我们希望你知道：
          你的感受是真实的，值得被认真对待。
        </p>

        <button onClick={() => router.push("/")} className="btn-ghost w-full py-3.5">
          我想换一种方式表达
        </button>
      </div>
    </main>
  );
}
