const API = process.env.NEXT_PUBLIC_API_BASE!;

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
  const r = await fetch(`${API}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  return r.json();
}

export async function requestMatch(user_id: string, memory: UserMemory) {
  const r = await fetch(`${API}/api/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, memory }),
  });
  return r.json();
}

export async function checkMatch(user_id: string) {
  const r = await fetch(`${API}/api/match/check?user_id=${user_id}`);
  return r.json();
}

export async function requestSuggest(p: {
  sync_points: string[];
  my_type?: string;
  recent?: { mine: boolean; text: string }[];
}): Promise<string[]> {
  const r = await fetch(`${API}/api/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  const d = await r.json();
  return d.suggestions ?? [];
}

export function getUserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("vibe_user_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("vibe_user_id", id);
  }
  return id;
}
