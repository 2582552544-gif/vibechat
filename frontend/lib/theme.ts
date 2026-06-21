// Emotion → a warm glow aura over the ink canvas (not a full wash) + a halo color
// for the 型 emoji. Hue shifts with the emotion, but everything stays dark and
// glow-based so it reads as one cohesive cinematic system, never a purple slop wash.

export interface EmotionTheme {
  rgb: string; // "r, g, b" — the emotion's signature light
  emoji: string;
  label: string;
}

export const THEME: Record<string, EmotionTheme> = {
  anxiety: { rgb: "120, 160, 255", emoji: "🌊", label: "焦虑" },
  loneliness: { rgb: "96, 132, 220", emoji: "🌙", label: "孤独" },
  anger: { rgb: "255, 92, 70", emoji: "🔥", label: "愤怒" },
  sadness: { rgb: "150, 168, 190", emoji: "🌧️", label: "低落" },
  excitement: { rgb: "255, 178, 92", emoji: "✨", label: "兴奋" },
  calm: { rgb: "120, 210, 170", emoji: "🍃", label: "平静" },
  confusion: { rgb: "180, 150, 235", emoji: "🌀", label: "迷茫" },
  emptiness: { rgb: "176, 168, 158", emoji: "🫧", label: "空虚" },
  joy: { rgb: "255, 206, 110", emoji: "🌻", label: "开心" },
  frustration: { rgb: "255, 120, 120", emoji: "💢", label: "烦躁" },
};

export const themeOf = (e: string): EmotionTheme => THEME[e] ?? THEME.calm;

// Full-page aura background for the result page — the emotion's light bleeding
// from above, warm ember anchoring it from below.
export const auraBg = (rgb: string): string =>
  `radial-gradient(120% 72% at 50% -8%, rgba(${rgb}, 0.22) 0%, transparent 56%),` +
  `radial-gradient(90% 60% at 80% 112%, rgba(255, 125, 77, 0.12) 0%, transparent 60%),` +
  `var(--ink)`;

export const halo = (rgb: string): string =>
  `drop-shadow(0 0 28px rgba(${rgb}, 0.55))`;
