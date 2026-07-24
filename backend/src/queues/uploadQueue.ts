import { createQueue } from './connection';
import { ExecutionItem } from '../models';
import { uploadPhoto } from '../services/storage.service';

export interface UploadPhotoJobData {
  executionItemId: string;
  photoBase64: string;
  contentType: string;
  photoHash: string;
}

export const uploadQueue = createQueue<UploadPhotoJobData>('upload-photos');

uploadQueue.process(async (job) => {
  const { executionItemId, photoBase64, contentType, photoHash } = job.data;
  const buffer = Buffer.from(photoBase64, 'base64');
  const key = `executions/${executionItemId}.jpg`;

  await uploadPhoto(key, buffer, contentType);

  await ExecutionItem.update({ photoKey: key, photoHash }, { where: { id: executionItemId } });
});

// sem isso, uma falha aqui (bucket inexistente, MinIO fora do ar, etc.) fica
// completamente muda - o Bull so marca o job como failed no Redis, sem
// nenhum log ou alerta visivel pra quem esta operando o servidor
uploadQueue.on('failed', (job, err) => {
  console.error(`Falha ao enviar foto do item ${job.data.executionItemId}:`, err);
});
