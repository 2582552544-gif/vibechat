"use client";

// 具象情绪场景：把空旷的黑屏变成"活着的"情绪画面。
// - 中心呼吸光球 = 你此刻的情绪
// - 环绕漂浮的节点 = 也在这里的其他频率（"不只你一个"）
// - 搜寻涟漪 = 系统正在为你寻找（仅 search 模式）
// 纯 CSS/SVG，无依赖，颜色由情绪驱动。

interface Props {
  rgb: string; // "r, g, b"
  mode?: "search" | "self";
  intensity?: number; // 0..1 → 光球大小/亮度（接 VAD 强度）
}

// 固定的节点布局（用索引派生，避免 Math.random —— SSR 安全）
const NODES = [
  { r: 150, size: 9, dur: 18, delay: 0 },
  { r: 210, size: 6, dur: 26, delay: -6 },
  { r: 180, size: 7, dur: 22, delay: -12 },
  { r: 260, size: 5, dur: 32, delay: -3 },
  { r: 130, size: 5, dur: 15, delay: -9 },
  { r: 240, size: 8, dur: 28, delay: -16 },
];

export default function EmotionScene({ rgb, mode = "self", intensity = 0.6 }: Props) {
  const orbSize = 180 + intensity * 160;
  const c = (a: number) => `rgba(${rgb}, ${a})`;

  return (
    <div className="scene" aria-hidden>
      {/* 顶部情绪天光 */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 70% at 50% 8%, ${c(0.16)} 0%, transparent 55%)`,
        }}
      />

      {/* 搜寻涟漪 */}
      {mode === "search" && (
        <>
          <span className="ripple" style={{ border: `1px solid ${c(0.4)}` }} />
          <span className="ripple" style={{ border: `1px solid ${c(0.4)}`, animationDelay: "1.3s" }} />
          <span className="ripple" style={{ border: `1px solid ${c(0.4)}`, animationDelay: "2.6s" }} />
        </>
      )}

      {/* 中心呼吸光球 */}
      <div
        className="orb animate-breathe"
        style={{
          width: orbSize,
          height: orbSize,
          background: `radial-gradient(circle at 50% 45%, ${c(0.75)} 0%, ${c(0.28)} 38%, transparent 70%)`,
        }}
      />

      {/* 环绕的其他频率 */}
      {NODES.map((n, i) => (
        <span
          key={i}
          className="node"
          style={{
            width: n.size,
            height: n.size,
            background: c(0.9),
            boxShadow: `0 0 ${n.size + 6}px ${c(0.7)}`,
            // @ts-expect-error CSS var
            "--r": `${n.r}px`,
            animation: `orbit ${n.dur}s linear ${n.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
