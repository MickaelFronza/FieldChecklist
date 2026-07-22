import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/auth';
import { getSyncStatus, syncBatch, syncPhotos } from '../controllers/sync.controller';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const syncRoutes = Router();

syncRoutes.post('/sync/batch', authenticate, syncBatch);
syncRoutes.post('/sync/photos', authenticate, upload.any(), syncPhotos);
syncRoutes.get('/sync/status/:execId', authenticate, getSyncStatus);
