import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { getShiftWindows } from '../controllers/settings.controller';

export const settingsRoutes = Router();

// qualquer usuario autenticado (inclusive operador via PIN) pode ler os
// horarios de turno - diferente de /admin/settings, que e admin-only
settingsRoutes.get('/shift-windows', authenticate, getShiftWindows);
