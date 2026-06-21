"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 四步情绪旅程 —— 给小白一个"我在哪一步"的具象引导
const STEPS = [
  { key: "say", label: "说出此刻", paths: ["/", "/new"] },
  { key: "type", label: "你的型", paths: ["/result"] },
  { key: "tune", label: "同频", paths: ["/matching"] },
  { key: "walk", label: "同行", paths: ["/chat"] },
];

export default function NavBar() {
  const pathname = usePathname() || "/";
  const activeIdx = STEPS.findIndex((s) =>
    s.paths.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p))),
  );

  return (
    <nav className="navbar w-full">
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ember shadow-glow animate-breathe" />
          <span className="nav-brand text-[0.95rem] font-medium">VibeChat</span>
          <span className="hidden sm:inline text-xs text-dim">· 此刻被看见</span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          {STEPS.map((s, i) => {
            const state =
              activeIdx < 0
                ? ""
                : i === activeIdx
                  ? "nav-step-on"
                  : i < activeIdx
                    ? "nav-step-done"
                    : "";
            return (
              <div key={s.key} className={`nav-step flex items-center gap-1.5 ${state}`}>
                <span className="dot" />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{i + 1}</span>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
