import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { createMachine, getActiveMachines, listMachines, updateMachine } from '../controllers/machines.controller';

export const machinesRoutes = Router();

machinesRoutes.get('/machines/active', authenticate, getActiveMachines);
machinesRoutes.get('/machines', authenticate, authorize('admin', 'manager'), listMachines);
machinesRoutes.post('/machines', authenticate, authorize('admin'), createMachine);
machinesRoutes.put('/machines/:id', authenticate, authorize('admin'), updateMachine);
