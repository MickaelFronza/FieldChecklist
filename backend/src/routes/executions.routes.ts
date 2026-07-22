import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { getExecutionDetail, listExecutions } from '../controllers/executions.controller';

export const executionsRoutes = Router();

executionsRoutes.get('/executions', authenticate, authorize('admin', 'manager'), listExecutions);
executionsRoutes.get('/executions/:id', authenticate, authorize('admin', 'manager'), getExecutionDetail);
