import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { SyncQueue } from '../models';
import { syncQueue } from '../queues/syncQueue';
import { uploadQueue } from '../queues/uploadQueue';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';
import type { SyncBatchItemPayload } from '../queues/syncQueue';

const batchSchema = z.object({
  deviceId: z.string().min(1),
  appVersion: z.string().min(1),
  execution: z.object({
    id: z.string().uuid(),
    templateId: z.string().uuid(),
    vehicleId: z.string().uuid(),
    operatorId: z.string().uuid(),
    shift: z.enum(['manha', 'tarde', 'noite']),
    status: z.enum(['in_progress', 'completed', 'incomplete']),
    startedAt: z.string(),
    completedAt: z.string().nullable().optional(),
    startedLat: z.number().nullable().optional(),
    startedLng: z.number().nullable().optional(),
  }),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      templateItemId: z.string().uuid(),
      status: z.enum(['ok', 'non_conformant', 'not_applicable', 'pending']),
      justification: z.string().nullable().optional(),
      photoHash: z.string().nullable().optional(),
      markedAt: z.string(),
    }),
  ),
});

export const syncBatch = asyncHandler(async (req: Request, res: Response) => {
  const data = batchSchema.parse(req.body);

  // idempotencia: mesmo execution_id + mesmo conteudo (hash) nao gera novo job
  const payloadHash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');

  const existing = await SyncQueue.findOne({
    where: { executionId: data.execution.id, payloadHash },
  });

  if (existing) {
    res.status(202).json({ syncQueueId: existing.id, status: existing.status });
    return;
  }

  const syncQueueEntry = await SyncQueue.create({
    deviceId: data.deviceId,
    executionId: data.execution.id,
    payloadHash,
    status: 'pending',
  });

  await syncQueue.add({
    syncQueueId: syncQueueEntry.id,
    deviceId: data.deviceId,
    appVersion: data.appVersion,
    execution: data.execution,
    items: data.items as SyncBatchItemPayload[],
  });

  res.status(202).json({ syncQueueId: syncQueueEntry.id, status: 'pending' });
});

// o Content-Type do multipart e so o que o cliente declarou (nao prova nada
// sozinho) - confere os magic bytes de verdade antes de aceitar qualquer
// arquivo como "foto", pra ninguem conseguir subir um HTML/script disfarcado
function isValidImageBuffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp =
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  const isHeic = buffer.subarray(4, 8).toString('ascii') === 'ftyp';

  return isJpeg || isPng || isWebp || isHeic;
}

export const syncPhotos = asyncHandler(async (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    throw new ApiError(400, 'Nenhuma foto enviada');
  }

  const executionItemIdSchema = z.string().uuid();

  for (const file of files) {
    if (!isValidImageBuffer(file.buffer)) {
      throw new ApiError(400, 'Arquivo enviado nao e uma imagem valida');
    }
  }

  const jobs = await Promise.all(
    files.map((file) => {
      // cada arquivo e enviado com fieldname = execution_item_id, associando
      // a foto ao item de checklist correspondente sem payload adicional
      const executionItemId = executionItemIdSchema.parse(file.fieldname);
      const photoHash = crypto.createHash('md5').update(file.buffer).digest('hex');

      return uploadQueue.add({
        executionItemId,
        photoBase64: file.buffer.toString('base64'),
        contentType: file.mimetype,
        photoHash,
      });
    }),
  );

  res.status(202).json({ queued: jobs.length });
});

export const getSyncStatus = asyncHandler(async (req: Request, res: Response) => {
  const entry = await SyncQueue.findOne({
    where: { executionId: req.params.execId },
    order: [['createdAt', 'DESC']],
  });

  if (!entry) {
    throw new ApiError(404, 'Execucao nao encontrada na fila de sincronizacao');
  }

  res.json({ status: entry.status, attempts: entry.attempts, processedAt: entry.processedAt });
});
