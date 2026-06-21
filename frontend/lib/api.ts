const CONFIGURED_API = process.env.NEXT_PUBLIC_API_BASE || "";

function isLocalHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function apiBase(): string {
  if (typeof window === "undefined") return CONFIGURED_API;
  const configured = CONFIGURED_API.trim().replace(/\/$/, "");
  if (!configured) return "";
  try {
    const u = new URL(configured);
    if (isLocalHost(u.hostname) && !isLocalHost(window.location.hostname)) return "";
  } catch {
    return configured;
  }
  return configured;
}

export interface UserMemory {
  emotion_detected: boolean;
  型: string;
  primary_emotion: string;
  valence: number;
  arousal: number;
  intensity: number;
  keywords: string[];
  经历: Record<string, string>;
  镜子句: string;
  侦探句: string;
  同型声音: string[];
  safety_level: string;
  suggestion: string;
}

export async function analyze(p: {
  text: string;
  mood?: string;
  situation_hint?: string;
}): Promise<UserMemory> {
  const r = await fetch(`${apiBase()}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  return r.json();
}

export async function requestMatch(user_id: string, memory: UserMemory) {
  const r = await fetch(`${apiBase()}/api/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, memory }),
  });
  return r.json();
}

export async function checkMatch(user_id: string) {
  const r = await fetch(`${apiBase()}/api/match/check?user_id=${user_id}`);
  return r.json();
}

export async function requestSuggest(p: {
  sync_points: string[];
  my_type?: string;
  recent?: { mine: boolean; text: string }[];
}): Promise<string[]> {
  const r = await fetch(`${apiBase()}/api/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  const d = await r.json();
  return d.suggestions ?? [];
}

// crypto.randomUUID() 仅在安全上下文(HTTPS / localhost)可用。
// 线上若是纯 HTTP+IP，randomUUID 为 undefined，直接调用会抛错。
// getRandomValues 在非安全上下文也可用，作为回退；再不行用时间戳兜底。
function uuid(): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  if (c && typeof c.getRandomValues === "function") {
    const b = c.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
    return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
  }
  return `uid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getUserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("vibe_user_id");
  if (!id) {
    id = uuid();
    localStorage.setItem("vibe_user_id", id);
  }
  return id;
}
