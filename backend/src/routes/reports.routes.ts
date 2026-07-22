import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { getDailyReport, getOperatorReport } from '../controllers/reports.controller';

export const reportsRoutes = Router();

reportsRoutes.get('/reports/daily', authenticate, authorize('admin', 'manager'), getDailyReport);
reportsRoutes.get('/reports/operator', authenticate, authorize('admin', 'manager'), getOperatorReport);
