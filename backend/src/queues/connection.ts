import Bull from 'bull';
import { redisConnection } from '../config/redis';

export function createQueue<T>(name: string): Bull.Queue<T> {
  return new Bull<T>(name, { redis: redisConnection });
}
