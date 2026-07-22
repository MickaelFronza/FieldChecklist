import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { env } from '../config/env';
import { redisConnection } from '../config/redis';
import { verifyAccessToken } from '../services/auth.service';

export const MANAGERS_ROOM = 'managers';

export function createSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: env.corsOrigin },
  });

  const pubClient = new Redis(redisConnection);
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token as string | undefined;
      if (!token) throw new Error('missing token');
      socket.data.user = verifyAccessToken(token);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { role } = socket.data.user;
    if (role === 'admin' || role === 'manager') {
      socket.join(MANAGERS_ROOM);
    }

    socket.on('sync:heartbeat', () => {
      socket.to(MANAGERS_ROOM).emit('operator:online', { userId: socket.data.user.sub });
    });
  });

  return io;
}
