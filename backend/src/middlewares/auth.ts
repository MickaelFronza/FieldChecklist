import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/apiError';
import { JwtPayload, verifyAccessToken } from '../services/auth.service';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Token de acesso ausente');
  }

  try {
    req.user = verifyAccessToken(header.slice('Bearer '.length));
    next();
  } catch {
    throw new ApiError(401, 'Token de acesso invalido ou expirado');
  }
}

// variante do authenticate pra rotas carregadas via <iframe src="...">, onde
// o navegador nao deixa anexar um header Authorization na navegacao - aceita
// o token tambem via querystring (?token=), alem do header normal
export function authenticateFromQueryOrHeader(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : (req.query.token as string | undefined);

  if (!token) {
    throw new ApiError(401, 'Token de acesso ausente');
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw new ApiError(401, 'Token de acesso invalido ou expirado');
  }
}

export function authorize(...roles: JwtPayload['role'][]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'Sem permissao para acessar este recurso');
    }
    next();
  };
}
