import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectRealtime(token: string) {
  if (socket && socket.connected) return socket;
  const baseUrl = process.env.NEXT_PUBLIC_API_WS_URL || 'http://localhost:5000';
  socket = io(baseUrl, {
    transports: ['websocket'],
    auth: { token },
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectRealtime() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
