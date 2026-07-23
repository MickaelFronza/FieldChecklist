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

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtRefreshSecret, verifyOptions) as JwtPayload;
}
