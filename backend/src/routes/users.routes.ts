import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import {
  createUser,
  listUserDevices,
  listUsers,
  updateUser,
  updateUserDevice,
} from '../controllers/users.controller';

export const usersRoutes = Router();

usersRoutes.get('/users', authenticate, authorize('admin', 'manager'), listUsers);
usersRoutes.post('/users', authenticate, authorize('admin'), createUser);
usersRoutes.put('/users/:id', authenticate, authorize('admin'), updateUser);
usersRoutes.get('/users/:id/devices', authenticate, authorize('admin', 'manager'), listUserDevices);
usersRoutes.put('/users/:id/devices/:deviceId', authenticate, authorize('admin'), updateUserDevice);
