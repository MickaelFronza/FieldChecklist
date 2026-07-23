import bcrypt from 'bcrypt';
import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { env } from '../config/env';

// fixa o algoritmo explicitamente (nunca aceitar "none" ou deixar o token
// escolher o algoritmo) - defesa contra ataques de confusao de algoritmo
const JWT_ALGORITHM = 'HS256';
const verifyOptions: VerifyOptions = { algorithms: [JWT_ALGORITHM] };

export interface JwtPayload {
  sub: string;
  role: 'admin' | 'manager' | 'operator';
  scope?: string;
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, env.bcryptSaltRounds);
}

export async function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  return bcrypt.compare(pin, pinHash);
}

// senha de Admin/Gestor usa o mesmo bcrypt do PIN - so o nome muda pra
// deixar a leitura do codigo clara em cada fluxo
export const hashPassword = hashPin;
export const verifyPassword = verifyPin;

export function signAccessToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
    algorithm: JWT_ALGORITHM,
  };
  return jwt.sign(payload, env.jwtSecret, options);
}

export function signRefreshToken(payload: JwtPayload, expiresIn?: string): string {
  const options: SignOptions = {
    expiresIn: (expiresIn ?? env.jwtRefreshExpiresIn) as SignOptions['expiresIn'],
    algorithm: JWT_ALGORITHM,
  };
  return jwt.sign(payload, env.jwtRefreshSecret, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret, verifyOptions) as JwtPayload;
}

// token de vida curta (5min) e com escopo unico ("minio-console"), usado so
// pro iframe do console do MinIO - reduz o estrago se essa URL vazar (log de
// acesso, historico do navegador, header Referer) na comparacao com colocar
// o access token normal (de horas de validade e com acesso a API inteira) na
// query string
export function signScopedToken(payload: JwtPayload, scope: string, expiresIn: string): string {
  const options: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'], algorithm: JWT_ALGORITHM };
  return jwt.sign({ ...payload, scope }, env.jwtSecret, options);
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtRefreshSecret, verifyOptions) as JwtPayload;
}
