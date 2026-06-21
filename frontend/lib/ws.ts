export function connectChat(
  room: string,
  uid: string,
  nick: string,
  onMsg: (m: any) => void,
): WebSocket {
  // 优先用显式配置；为空时从当前页面 origin 推导（同源，经 nginx 反代到后端 /ws）
  const base =
    process.env.NEXT_PUBLIC_WS_BASE ||
    (typeof window !== "undefined"
      ? `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`
      : "");
  const ws = new WebSocket(
    `${base}/ws/rooms/${room}?user_id=${uid}&nickname=${encodeURIComponent(nick)}`,
  );
  ws.onmessage = (e) => onMsg(JSON.parse(e.data));
  return ws;
}
