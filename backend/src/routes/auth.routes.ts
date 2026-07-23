import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { getCurrentUser, getLoginOptions, login, loginWithPassword, refresh } from '../controllers/auth.controller';

export const authRoutes = Router();

authRoutes.get('/login-options', getLoginOptions);
authRoutes.post('/login', login);
authRoutes.post('/login-password', loginWithPassword);
authRoutes.post('/refresh', refresh);
authRoutes.get('/me', authenticate, getCurrentUser);
