import { env } from './env';

export const redisConnection = {
  host: env.redis.host,
  port: env.redis.port,
  password: env.redis.password,
};
