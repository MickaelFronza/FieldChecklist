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
  // reverse proxy/load balancer na nuvem (Cloudflare, Traefik, nginx, etc.) -
  // sem isso, checagem de regiao no refresh e o rate limit sempre veriam o
  // IP do ultimo proxy, nao o do cliente. Configuravel via TRUST_PROXY_HOPS
  // pra ambientes com mais de um proxy na frente (ex.: Cloudflare + Traefik).
  app.set('trust proxy', env.trustProxyHops);

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
      on: {
        proxyRes: (proxyRes) => {
          // o console do MinIO manda "X-Frame-Options: DENY" por padrao (ele
          // nao espera ser embutido em iframe nenhum) - o navegador obedece
          // isso literalmente e recusa renderizar, mostrando uma tela em
          // branco/quebrada mesmo com a requisicao respondendo 200 OK. Como
          // esse proxy so existe justamente pra ser carregado num iframe
          // (autenticado, admin-only, nunca teve a porta do console exposta
          // direto), remove o header pra permitir. Tambem tira um eventual
          // frame-ancestors restritivo do CSP do MinIO, mesma razao.
          delete proxyRes.headers['x-frame-options'];
          const csp = proxyRes.headers['content-security-policy'];
          if (typeof csp === 'string') {
            proxyRes.headers['content-security-policy'] = csp
              .split(';')
              .filter((directive) => !directive.trim().startsWith('frame-ancestors'))
              .join(';');
          }
        },
      },
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
