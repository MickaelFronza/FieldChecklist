import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { env } from './config/env';
import { apiV1Router } from './routes';
import { authenticateFromQueryOrHeader, authorize } from './middlewares/auth';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

export function createApp(): Express {
  const app = express();

  // necessario pra req.ip refletir o IP real do cliente quando atras de um
  // reverse proxy/load balancer na nuvem (Cloudflare, nginx, etc.) -
  // sem isso, checagem de regiao no refresh sempre veria o IP do proxy
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(cookieParser());

  // proxy do console web do MinIO (admin-only) - montado ANTES do
  // express.json() pra nao consumir o body da requisicao antes de repassar
  // pro MinIO (senao um login no console, por exemplo, nunca chegaria com o
  // corpo original). A porta 9001 do MinIO nunca fica exposta pra internet -
  // so acessivel via essa rota, atras de autenticacao de admin. Usa
  // authenticateFromQueryOrHeader (nao o authenticate padrao) porque isso e
  // carregado num <iframe src="...">, e o navegador nao permite anexar um
  // header Authorization numa navegacao de iframe. So a navegacao inicial
  // carrega ?token= - as chamadas seguintes que o proprio console do MinIO
  // faz (JS/CSS/API dele) nao tem como carregar esse query param, entao a
  // authenticateFromQueryOrHeader tambem grava um cookie de curta duracao na
  // 1a resposta valida, e essas chamadas seguintes se autenticam por ele.
  app.use(
    '/api/v1/admin/minio-console',
    authenticateFromQueryOrHeader('minio-console'),
    authorize('admin'),
    createProxyMiddleware({
      target: env.minioConsoleUrl,
      changeOrigin: true,
      ws: true,
      pathRewrite: { '^/api/v1/admin/minio-console': '' },
    }),
  );

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // limite geral por IP - alem do bloqueio ja existente por email/PIN no
  // login (que fica por identificador, em Redis), isso cobre qualquer outro
  // endpoint autenticado contra flood/abuso vindo de um mesmo IP
  const generalLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });

  // login especificamente ganha um limite mais apertado por IP, complementar
  // ao bloqueio por identificador (email/PIN) que ja existe no controller -
  // isso cobre um atacante tentando varios identificadores diferentes do
  // mesmo IP, o que o bloqueio por identificador sozinho nao pega
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/v1/auth', authLimiter);
  app.use('/api/v1', generalLimiter, apiV1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
