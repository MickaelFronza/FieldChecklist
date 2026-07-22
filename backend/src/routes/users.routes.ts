import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { createUser, listUsers, updateUser } from '../controllers/users.controller';

export const usersRoutes = Router();

usersRoutes.get('/users', authenticate, authorize('admin', 'manager'), listUsers);
usersRoutes.post('/users', authenticate, authorize('admin'), createUser);
usersRoutes.put('/users/:id', authenticate, authorize('admin'), updateUser);
