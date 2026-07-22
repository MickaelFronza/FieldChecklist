import { Router } from 'express';
import { login, refresh } from '../controllers/auth.controller';

export const authRoutes = Router();

authRoutes.post('/login', login);
authRoutes.post('/refresh', refresh);
