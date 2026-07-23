import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { apiV1Router } from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

export function createApp(): Express {
  const app = express();

  // necessario pra req.ip refletir o IP real do cliente quando atras de um
  // reverse proxy/load balancer na nuvem (Cloudflare, Traefik, nginx, etc.) -
  // sem isso, checagem de regiao no refresh e o rate limit sempre veriam o
  // IP do ultimo proxy, nao o do cliente. Configuravel via TRUST_PROXY_HOPS
  // pra ambientes com mais de um proxy na frente (ex.: Cloudflare + Traefik).
  app.set('trust proxy', env.trustProxyHops);

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
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
