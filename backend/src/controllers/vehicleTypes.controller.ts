import { Request, Response } from 'express';
import { z } from 'zod';
import { VehicleType } from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';

export const listVehicleTypes = asyncHandler(async (_req: Request, res: Response) => {
  const types = await VehicleType.findAll({ order: [['name', 'ASC']] });
  res.json(types);
});

const createVehicleTypeSchema = z.object({
  name: z.string().min(1).max(50),
});

export const createVehicleType = asyncHandler(async (req: Request, res: Response) => {
  const data = createVehicleTypeSchema.parse(req.body);
  const type = await VehicleType.create(data);
  res.status(201).json(type);
});

export const deleteVehicleType = asyncHandler(async (req: Request, res: Response) => {
  const type = await VehicleType.findByPk(req.params.id);
  if (!type) throw new ApiError(404, 'Tipo nao encontrado');

  await type.destroy();
  res.status(204).send();
});
