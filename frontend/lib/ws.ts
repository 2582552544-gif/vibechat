export function connectChat(
  room: string,
  uid: string,
  nick: string,
  onMsg: (m: any) => void,
): WebSocket {
  // 优先用显式配置；为空时从当前页面 origin 推导（同源，经 nginx 反代到后端 /ws）
  const configured = (process.env.NEXT_PUBLIC_WS_BASE || "").trim().replace(/\/$/, "");
  const inferred =
    typeof window !== "undefined"
      ? `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`
      : "";
  let base = configured || inferred;
  if (typeof window !== "undefined" && configured) {
    try {
      const u = new URL(configured);
      const isLocal =
        u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "::1";
      const pageIsLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "::1";
      if (isLocal && !pageIsLocal) base = inferred;
    } catch {
      /* keep configured */
    }
  }
  const ws = new WebSocket(
    `${base}/ws/rooms/${room}?user_id=${uid}&nickname=${encodeURIComponent(nick)}`,
  );
  ws.onmessage = (e) => onMsg(JSON.parse(e.data));
  return ws;
}
