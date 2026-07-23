import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  // quantos reverse proxies confiaveis existem na frente do backend (cada um
  // que faz "hop" no X-Forwarded-For) - 1 pra um unico proxy (Traefik OU
  // nginx sozinho), 2 se tiver Cloudflare NA FRENTE de outro proxy tambem.
  // Errado aqui faz req.ip virar o IP de um dos proxies, nao do cliente real
  // - quebra silenciosamente a deteccao de regiao anomala e o rate limit.
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS ?? 1),
  // aceita uma lista separada por virgula (ex.: dev local + container do
  // frontend rodando ao mesmo tempo) - um unico valor continua funcionando
  // igual antes, so vira um array de 1 posicao. Obrigatorio (nao cai pra "*")
  // pra nunca liberar qualquer origem por esquecimento de configuracao.
  corsOrigin: required('CORS_ORIGIN')
    .split(',')
    .map((origin) => origin.trim()),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  jwtRefreshExpiresInWeb: process.env.JWT_REFRESH_EXPIRES_IN_WEB ?? '90d',

  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),

  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    name: process.env.DB_NAME ?? 'field_checklist',
    user: process.env.DB_USER ?? 'field_checklist',
    password: process.env.DB_PASSWORD ?? 'field_checklist',
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // console web do MinIO, so acessivel dentro da rede interna do compose -
  // proxied pelo backend (ver app.ts) pra nunca precisar expor a porta 9001
  // pra internet
  minioConsoleUrl: process.env.MINIO_CONSOLE_URL ?? 'http://minio:9001',

  s3: {
    // endpoint que o BACKEND usa pra falar com o MinIO (upload e demais
    // operacoes internas) - pode ser o hostname interno do compose (rapido,
    // nunca sai da rede docker)
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    // endpoint usado so pra MONTAR a URL pre-assinada que o NAVEGADOR do
    // gestor acessa direto pra ver a foto - precisa ser um endereco
    // publico/resolvivel de fora. Se nao setado, cai no mesmo endpoint
    // interno acima (comportamento de antes, ok pra dev local onde os dois
    // sao a mesma coisa).
    publicEndpoint: process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    bucket: process.env.S3_BUCKET ?? 'field-checklist-photos',
    accessKey: process.env.S3_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
  },

  lateChecklistAlertTime: process.env.LATE_CHECKLIST_ALERT_TIME ?? '08:30',
};
