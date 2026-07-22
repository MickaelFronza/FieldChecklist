import Redis from 'ioredis';
import { redisConnection } from './redis';

export const redisClient = new Redis(redisConnection);
