import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { listDeviceMonitor } from '../controllers/devices.controller';
import { getAppSettings, getMinioConsoleToken, updateAppSettings } from '../controllers/settings.controller';

export const adminRoutes = Router();

adminRoutes.get('/admin/devices', authenticate, authorize('admin'), listDeviceMonitor);
adminRoutes.get('/admin/settings', authenticate, authorize('admin'), getAppSettings);
adminRoutes.put('/admin/settings', authenticate, authorize('admin'), updateAppSettings);
adminRoutes.get('/admin/minio-console-token', authenticate, authorize('admin'), getMinioConsoleToken);
