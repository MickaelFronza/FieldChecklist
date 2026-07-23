import { Router } from 'express';
import multer, { FileFilterCallback } from 'multer';
import type { Request } from 'express';
import { authenticate } from '../middlewares/auth';
import { getSyncStatus, syncBatch, syncPhotos } from '../controllers/sync.controller';

// so aceita tipos de imagem de verdade (checagem pelo Content-Type declarado
// pelo cliente) - sem isso, qualquer arquivo (executavel, HTML com script,
// etc.) podia ser enviado disfarcado de "foto do checklist"
const ALLOWED_PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

function photoFileFilter(_req: Request, file: Express.Multer.File, callback: FileFilterCallback): void {
  if (!ALLOWED_PHOTO_MIME_TYPES.has(file.mimetype)) {
    callback(new Error('Tipo de arquivo nao permitido - apenas imagens'));
    return;
  }
  callback(null, true);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: photoFileFilter,
});

export const syncRoutes = Router();

syncRoutes.post('/sync/batch', authenticate, syncBatch);
syncRoutes.post('/sync/photos', authenticate, upload.any(), syncPhotos);
syncRoutes.get('/sync/status/:execId', authenticate, getSyncStatus);
