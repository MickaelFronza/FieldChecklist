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
  // aceita uma lista separada por virgula (ex.: dev local + container do
  // frontend rodando ao mesmo tempo) - um unico valor continua funcionando
  // igual antes, so vira um array de 1 posicao
  corsOrigin: (process.env.CORS_ORIGIN ?? '*').split(',').map((origin) => origin.trim()),

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
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    bucket: process.env.S3_BUCKET ?? 'field-checklist-photos',
    accessKey: process.env.S3_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
  },

  lateChecklistAlertTime: process.env.LATE_CHECKLIST_ALERT_TIME ?? '08:30',
};
