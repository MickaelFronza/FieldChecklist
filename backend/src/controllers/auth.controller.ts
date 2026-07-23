import { Request, Response } from 'express';
import { z } from 'zod';
import { User, UserDevice } from '../models';
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
  deviceId: z.string().min(1),
});

async function authorizeDevice(user: User, deviceId: string): Promise<void> {
  const existing = await UserDevice.findOne({ where: { userId: user.id, deviceId } });

  if (existing) {
    if (!existing.active) {
      throw new ApiError(403, 'Este aparelho foi desativado. Contate o administrador.');
    }
    await existing.update({ lastSeenAt: new Date() });
    return;
  }

  const activeDeviceCount = await UserDevice.count({ where: { userId: user.id, active: true } });
  if (activeDeviceCount >= user.maxDevices) {
    throw new ApiError(403, 'Limite de aparelhos atingido para este usuário. Contate o administrador.');
  }

  const now = new Date();
  await UserDevice.create({ userId: user.id, deviceId, firstSeenAt: now, lastSeenAt: now });
}

export const getLoginOptions = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.findAll({
    where: { active: true },
    attributes: ['id', 'name', 'role'],
    order: [['name', 'ASC']],
  });
  res.json(users);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { nameId, pin, deviceId } = loginSchema.parse(req.body);

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

  // controle de aparelhos: lanca ApiError(403) se o limite foi atingido ou o
  // device foi revogado pelo admin - antes de emitir qualquer token
  await authorizeDevice(user, deviceId);

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
