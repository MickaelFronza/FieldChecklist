import { Router } from 'express';
import { getLoginOptions, login, refresh } from '../controllers/auth.controller';

export const authRoutes = Router();

authRoutes.get('/login-options', getLoginOptions);
authRoutes.post('/login', login);
authRoutes.post('/refresh', refresh);
