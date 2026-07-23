import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
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

  // proxy do console web do MinIO (admin-only) - montado ANTES do
  // express.json() pra nao consumir o body da requisicao antes de repassar
  // pro MinIO (senao um login no console, por exemplo, nunca chegaria com o
  // corpo original). A porta 9001 do MinIO nunca fica exposta pra internet -
  // so acessivel via essa rota, atras de autenticacao de admin. Usa
  // authenticateFromQueryOrHeader (nao o authenticate padrao) porque isso e
  // carregado num <iframe src="...">, e o navegador nao permite anexar um
  // header Authorization numa navegacao de iframe.
  app.use(
    '/api/v1/admin/minio-console',
    authenticateFromQueryOrHeader,
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

  app.use('/api/v1', apiV1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
