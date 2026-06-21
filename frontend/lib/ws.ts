export function connectChat(
  room: string,
  uid: string,
  nick: string,
  onMsg: (m: any) => void,
): WebSocket {
  const base = process.env.NEXT_PUBLIC_WS_BASE!;
  const ws = new WebSocket(
    `${base}/ws/rooms/${room}?user_id=${uid}&nickname=${encodeURIComponent(nick)}`,
  );
  ws.onmessage = (e) => onMsg(JSON.parse(e.data));
  return ws;
}
