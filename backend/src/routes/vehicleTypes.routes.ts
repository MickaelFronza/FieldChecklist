import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { createVehicleType, deleteVehicleType, listVehicleTypes } from '../controllers/vehicleTypes.controller';

export const vehicleTypesRoutes = Router();

vehicleTypesRoutes.get('/vehicle-types', authenticate, authorize('admin', 'manager'), listVehicleTypes);
vehicleTypesRoutes.post('/vehicle-types', authenticate, authorize('admin', 'manager'), createVehicleType);
vehicleTypesRoutes.delete('/vehicle-types/:id', authenticate, authorize('admin', 'manager'), deleteVehicleType);
