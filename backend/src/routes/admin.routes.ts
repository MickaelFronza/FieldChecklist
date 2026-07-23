import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { listDeviceMonitor } from '../controllers/devices.controller';

export const adminRoutes = Router();

adminRoutes.get('/admin/devices', authenticate, authorize('admin'), listDeviceMonitor);
