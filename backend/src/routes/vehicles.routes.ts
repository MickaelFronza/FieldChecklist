import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import {
  createVehicle,
  deleteVehicle,
  getActiveVehicles,
  listVehicles,
  markMaintenanceDone,
  updateVehicle,
  updateVehicleOperators,
} from '../controllers/vehicles.controller';

export const vehiclesRoutes = Router();

vehiclesRoutes.get('/vehicles/active', authenticate, getActiveVehicles);
vehiclesRoutes.get('/vehicles', authenticate, authorize('admin', 'manager'), listVehicles);
vehiclesRoutes.post('/vehicles', authenticate, authorize('admin', 'manager'), createVehicle);
vehiclesRoutes.put('/vehicles/:id', authenticate, authorize('admin', 'manager'), updateVehicle);
vehiclesRoutes.put('/vehicles/:id/operators', authenticate, authorize('admin', 'manager'), updateVehicleOperators);
vehiclesRoutes.put('/vehicles/:id/maintenance', authenticate, authorize('admin', 'manager'), markMaintenanceDone);
vehiclesRoutes.delete('/vehicles/:id', authenticate, authorize('admin', 'manager'), deleteVehicle);
