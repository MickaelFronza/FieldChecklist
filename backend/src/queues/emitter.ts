import Redis from 'ioredis';
import { Emitter } from '@socket.io/redis-emitter';
import { redisConnection } from '../config/redis';

// Permite emitir eventos Socket.IO a partir do processo worker, que nao
// mantem uma instancia viva do servidor Socket.IO (essa vive na API).
// O Emitter publica no mesmo canal Redis que o @socket.io/redis-adapter
// consome no server, entao clientes conectados na API recebem normalmente.
const pubClient = new Redis(redisConnection);

export const socketEmitter = new Emitter(pubClient);
