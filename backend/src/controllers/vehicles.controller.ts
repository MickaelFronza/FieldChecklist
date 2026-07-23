import { Request, Response } from 'express';
import { z } from 'zod';
import { User, Vehicle, VehicleOperator } from '../models';
import { redisClient } from '../config/redisClient';
import { socketEmitter } from '../queues/emitter';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';

const VEHICLES_CACHE_KEY = 'vehicles:active';
const VEHICLES_CACHE_TTL_SECONDS = 60 * 60;

export const getActiveVehicles = asyncHandler(async (_req: Request, res: Response) => {
  const cached = await redisClient.get(VEHICLES_CACHE_KEY);
  if (cached) {
    res.json(JSON.parse(cached));
    return;
  }

  const vehicles = await Vehicle.findAll({ where: { active: true }, order: [['name', 'ASC']] });
  await redisClient.set(VEHICLES_CACHE_KEY, JSON.stringify(vehicles), 'EX', VEHICLES_CACHE_TTL_SECONDS);
  res.json(vehicles);
});

export const listVehicles = asyncHandler(async (_req: Request, res: Response) => {
  const vehicles = await Vehicle.findAll({
    include: [{ model: User, as: 'operators', attributes: ['id', 'name'], through: { attributes: [] } }],
    order: [['createdAt', 'DESC']],
  });
  res.json(vehicles);
});

const vehicleSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
});

export const createVehicle = asyncHandler(async (req: Request, res: Response) => {
  const data = vehicleSchema.parse(req.body);
  const vehicle = await Vehicle.create(data);
  await redisClient.del(VEHICLES_CACHE_KEY);
  res.status(201).json(vehicle);
});

const updateVehicleSchema = vehicleSchema.partial().extend({ active: z.boolean().optional() });

export const updateVehicle = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await Vehicle.findByPk(req.params.id);
  if (!vehicle) throw new ApiError(404, 'Veiculo nao encontrado');

  const wasActive = vehicle.active;
  const data = updateVehicleSchema.parse(req.body);
  await vehicle.update(data);
  await redisClient.del(VEHICLES_CACHE_KEY);

  // notifica o app mobile quase na hora - sem isso o operador so veria o
  // veiculo desativado quando a tela de selecao ganhasse foco de novo
  if (wasActive && data.active === false) {
    socketEmitter.emit('vehicle:deactivated', { vehicleId: vehicle.id });
  }

  res.json(vehicle);
});

const updateVehicleOperatorsSchema = z.object({
  operatorIds: z.array(z.string().uuid()),
});

export const updateVehicleOperators = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await Vehicle.findByPk(req.params.id);
  if (!vehicle) throw new ApiError(404, 'Veiculo nao encontrado');

  const { operatorIds } = updateVehicleOperatorsSchema.parse(req.body);

  await VehicleOperator.destroy({ where: { vehicleId: vehicle.id } });
  if (operatorIds.length > 0) {
    await VehicleOperator.bulkCreate(operatorIds.map((userId) => ({ vehicleId: vehicle.id, userId })));
  }

  const updated = await Vehicle.findByPk(vehicle.id, {
    include: [{ model: User, as: 'operators', attributes: ['id', 'name'], through: { attributes: [] } }],
  });
  res.json(updated);
});
