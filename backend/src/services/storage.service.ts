import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';

const s3Credentials = {
  accessKeyId: env.s3.accessKey,
  secretAccessKey: env.s3.secretKey,
};

// cliente pras operacoes internas do backend (upload) - usa o endpoint
// interno (mais rapido, nunca sai da rede docker)
export const s3Client = new S3Client({
  endpoint: env.s3.endpoint,
  region: env.s3.region,
  forcePathStyle: env.s3.forcePathStyle,
  credentials: s3Credentials,
});

// cliente separado so pra ASSINAR urls - precisa do endpoint PUBLICO, ja que
// e o navegador do gestor quem busca a foto direto, nao o backend. Em dev
// local os dois endpoints sao iguais (ver env.ts), entao isso nao muda nada
// aqui - so passa a importar em producao, com MinIO atras de um dominio
// proprio (ex.: Traefik).
const s3PublicClient = new S3Client({
  endpoint: env.s3.publicEndpoint,
  region: env.s3.region,
  forcePathStyle: env.s3.forcePathStyle,
  credentials: s3Credentials,
});

export async function uploadPhoto(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getPhotoPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env.s3.bucket, Key: key });
  return getSignedUrl(s3PublicClient, command, { expiresIn: expiresInSeconds });
}
