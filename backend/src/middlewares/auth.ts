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
// o token tambem via querystring (?token=) ou por um cookie que essa mesma
// funcao grava na 1a requisicao valida (as chamadas seguintes que o proprio
// console do MinIO faz - JS/CSS/API dele - nao tem como repetir o query
// param, mas o navegador manda o cookie sozinho por serem do mesmo path).
// Por vir na URL (risco de vazar em log/historico/Referer), so aceita um
// token com o escopo esperado ali - nunca o access token geral, que daria
// acesso a API inteira se vazasse.
function cookieNameForScope(scope: string): string {
  return `fc_scoped_${scope}`;
}

export function authenticateFromQueryOrHeader(expectedScope: string) {
  const cookieName = cookieNameForScope(expectedScope);

  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    const fromHeader = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    const fromQuery = req.query.token as string | undefined;
    const fromCookie = (req.cookies as Record<string, string> | undefined)?.[cookieName];

    const token = fromHeader ?? fromQuery ?? fromCookie;
    if (!token) {
      throw new ApiError(401, 'Token de acesso ausente');
    }

    try {
      const payload = verifyAccessToken(token);
      // via query/cookie precisa ser o token escopado (curto/unico
      // proposito); via header (chamada direta de API, nao iframe) o access
      // token normal de admin continua valendo, ja protegido por authorize
      if (!fromHeader && payload.scope !== expectedScope) {
        throw new Error('scope invalido para uso via querystring/cookie');
      }
      req.user = payload;

      // 1a requisicao (com ?token= na URL) grava o cookie pras chamadas
      // seguintes do mesmo path nao precisarem do query param. SameSite=None
      // (+ Secure, exigido junto) e obrigatorio aqui - o iframe roda dentro
      // de uma pagina de outro (sub)dominio (frontend em fieldcheck.X,
      // backend em fieldcheck-api.X), entao pro navegador isso conta como
      // contexto de terceiros; com SameSite=Lax (o padrao) o cookie e
      // silenciosamente descartado e as chamadas seguintes do console viram
      // 401 - so a navegacao inicial (que carrega o ?token= na propria URL)
      // funcionava, dando exatamente a tela de "conexao" quebrada no iframe.
      if (fromQuery) {
        res.cookie(cookieName, fromQuery, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 5 * 60 * 1000,
          path: '/api/v1/admin/minio-console',
        });
      }

      next();
    } catch {
      throw new ApiError(401, 'Token de acesso invalido ou expirado');
    }
  };
}

export function authorize(...roles: JwtPayload['role'][]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'Sem permissao para acessar este recurso');
    }
    next();
  };
}
