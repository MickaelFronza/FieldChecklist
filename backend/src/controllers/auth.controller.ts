import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models';
import { signAccessToken, signRefreshToken, verifyPin, verifyRefreshToken } from '../services/auth.service';
import { redisClient } from '../config/redisClient';
import { ApiError } from '../utils/apiError';
import { asyncHandler } from '../utils/asyncHandler';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

const loginSchema = z.object({
  nameId: z.string().uuid(),
  pin: z.string().regex(/^\d{4}$/),
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { nameId, pin } = loginSchema.parse(req.body);

  const attemptsKey = `login_attempts:${nameId}`;
  const attempts = Number((await redisClient.get(attemptsKey)) ?? 0);
  if (attempts >= MAX_ATTEMPTS) {
    throw new ApiError(429, 'Muitas tentativas erradas. Tente novamente em 15 minutos.');
  }

  const user = await User.findOne({ where: { id: nameId, active: true } });
  if (!user || !(await verifyPin(pin, user.pinHash))) {
    await redisClient.multi().incr(attemptsKey).expire(attemptsKey, LOCKOUT_SECONDS).exec();
    throw new ApiError(401, 'PIN invalido');
  }

  await redisClient.del(attemptsKey);

  const payload = { sub: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await redisClient.set(`refresh_token:${user.id}`, refreshToken, 'EX', REFRESH_TOKEN_TTL_SECONDS);

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, role: user.role },
  });
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'Refresh token invalido ou expirado');
  }

  const stored = await redisClient.get(`refresh_token:${payload.sub}`);
  if (stored !== refreshToken) {
    throw new ApiError(401, 'Refresh token invalido');
  }

  const accessToken = signAccessToken({ sub: payload.sub, role: payload.role });
  res.json({ accessToken });
});
