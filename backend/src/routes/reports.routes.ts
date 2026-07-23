import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { getDailyReport, getOperatorReport, getOperatorStatusToday } from '../controllers/reports.controller';

export const reportsRoutes = Router();

reportsRoutes.get('/reports/daily', authenticate, authorize('admin', 'manager'), getDailyReport);
reportsRoutes.get('/reports/operator', authenticate, authorize('admin', 'manager'), getOperatorReport);
reportsRoutes.get('/reports/status-today', authenticate, authorize('admin', 'manager'), getOperatorStatusToday);
