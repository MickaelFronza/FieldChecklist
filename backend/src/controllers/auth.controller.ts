import { Request, Response } from 'express';
import { z } from 'zod';
import { User, UserDevice } from '../models';
import {
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyPin,
  verifyRefreshToken,
} from '../services/auth.service';
import { lookupRegion } from '../services/geoLookup';
import { redisClient } from '../config/redisClient';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import { asyncHandler } from '../utils/asyncHandler';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const REFRESH_TOKEN_TTL_WEB_SECONDS = 90 * 24 * 60 * 60;

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

function requestIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? '';
}

// usado pelo frontend web pra reconstruir o usuario logado apos um refresh
// (POST /auth/refresh so devolve o access token, sem dados do usuario)
export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByPk(req.user?.sub, { attributes: { exclude: ['pinHash', 'passwordHash'] } });
  if (!user) throw new ApiError(404, 'Usuario nao encontrado');
  res.json(user);
});

// Operadores usam PIN (mobile/campo); esse endpoint so lista quem pode logar
// por PIN. Nunca expor admin/gestor aqui, que logam por email+senha.
export const getLoginOptions = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.findAll({
    where: { active: true, role: 'operator' },
    attributes: ['id', 'name', 'role'],
    order: [['name', 'ASC']],
  });
  res.json(users);
});

const loginSchema = z.object({
  nameId: z.string().uuid(),
  pin: z.string().regex(/^\d{4}$/),
  deviceId: z.string().min(1),
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { nameId, pin, deviceId } = loginSchema.parse(req.body);

  const attemptsKey = `login_attempts:${nameId}`;
  const attempts = Number((await redisClient.get(attemptsKey)) ?? 0);
  if (attempts >= MAX_ATTEMPTS) {
    throw new ApiError(429, 'Muitas tentativas erradas. Tente novamente em 15 minutos.');
  }

  const user = await User.findOne({ where: { id: nameId, active: true } });
  if (user && user.role !== 'operator') {
    throw new ApiError(400, 'Este usuário deve fazer login por email e senha.');
  }

  if (!user || !user.pinHash || !(await verifyPin(pin, user.pinHash))) {
    await redisClient.multi().incr(attemptsKey).expire(attemptsKey, LOCKOUT_SECONDS).exec();
    throw new ApiError(401, 'PIN invalido');
  }

  await redisClient.del(attemptsKey);
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

const loginPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// sem controle de aparelhos aqui: o limite de devices e uma preocupacao do
// operador de campo no mobile (evitar uso descontrolado do PIN em varios
// celulares) - o painel web de Admin/Gestor nunca deve ficar bloqueado por
// isso
export const loginWithPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginPasswordSchema.parse(req.body);

  const attemptsKey = `login_attempts:${email}`;
  const attempts = Number((await redisClient.get(attemptsKey)) ?? 0);
  if (attempts >= MAX_ATTEMPTS) {
    throw new ApiError(429, 'Muitas tentativas erradas. Tente novamente em 15 minutos.');
  }

  const user = await User.findOne({ where: { email, active: true } });
  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    await redisClient.multi().incr(attemptsKey).expire(attemptsKey, LOCKOUT_SECONDS).exec();
    throw new ApiError(401, 'Email ou senha inválidos');
  }

  if (user.role !== 'admin' && user.role !== 'manager') {
    throw new ApiError(400, 'Este usuário deve fazer login por PIN.');
  }

  await redisClient.del(attemptsKey);

  const payload = { sub: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload, env.jwtRefreshExpiresInWeb);

  await redisClient.set(`refresh_token:${user.id}`, refreshToken, 'EX', REFRESH_TOKEN_TTL_WEB_SECONDS);

  // guarda a regiao do login pra detectar troca suspeita de local no refresh;
  // IP privado/local (dev) nao resolve - nesse caso nao grava nada e o
  // refresh nunca vai bloquear por regiao (sem falso positivo em dev)
  const region = lookupRegion(requestIp(req));
  if (region) {
    await redisClient.set(`session_region:${user.id}`, region, 'EX', REFRESH_TOKEN_TTL_WEB_SECONDS);
  } else {
    await redisClient.del(`session_region:${user.id}`);
  }

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

  const storedRegion = await redisClient.get(`session_region:${payload.sub}`);
  if (storedRegion) {
    const currentRegion = lookupRegion(requestIp(req));
    if (currentRegion && currentRegion !== storedRegion) {
      await redisClient.del(`refresh_token:${payload.sub}`);
      await redisClient.del(`session_region:${payload.sub}`);
      throw new ApiError(401, 'Sessão encerrada por login de uma região diferente. Faça login novamente.');
    }
  }

  const accessToken = signAccessToken({ sub: payload.sub, role: payload.role });
  res.json({ accessToken });
});
