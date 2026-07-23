import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function connectSocket(accessToken: string): Socket {
  if (socket?.connected && socket.auth && (socket.auth as { token: string }).token === accessToken) {
    return socket;
  }

  socket?.disconnect();
  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    autoConnect: true,
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
