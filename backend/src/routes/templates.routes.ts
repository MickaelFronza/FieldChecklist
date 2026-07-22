import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { createTemplate, getActiveTemplates, listTemplates, updateTemplate } from '../controllers/templates.controller';

export const templatesRoutes = Router();

templatesRoutes.get('/templates/active', authenticate, getActiveTemplates);
templatesRoutes.get('/templates', authenticate, authorize('admin', 'manager'), listTemplates);
templatesRoutes.post('/templates', authenticate, authorize('admin'), createTemplate);
templatesRoutes.put('/templates/:id', authenticate, authorize('admin'), updateTemplate);
