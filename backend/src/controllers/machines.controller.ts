import { Request, Response } from 'express';
import { z } from 'zod';
import { Machine } from '../models';
import { redisClient } from '../config/redisClient';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';

const MACHINES_CACHE_KEY = 'machines:active';
const MACHINES_CACHE_TTL_SECONDS = 60 * 60;

export const getActiveMachines = asyncHandler(async (_req: Request, res: Response) => {
  const cached = await redisClient.get(MACHINES_CACHE_KEY);
  if (cached) {
    res.json(JSON.parse(cached));
    return;
  }

  const machines = await Machine.findAll({ where: { active: true }, order: [['name', 'ASC']] });
  await redisClient.set(MACHINES_CACHE_KEY, JSON.stringify(machines), 'EX', MACHINES_CACHE_TTL_SECONDS);
  res.json(machines);
});

export const listMachines = asyncHandler(async (_req: Request, res: Response) => {
  const machines = await Machine.findAll({ order: [['createdAt', 'DESC']] });
  res.json(machines);
});

const machineSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
});

export const createMachine = asyncHandler(async (req: Request, res: Response) => {
  const data = machineSchema.parse(req.body);
  const machine = await Machine.create(data);
  await redisClient.del(MACHINES_CACHE_KEY);
  res.status(201).json(machine);
});

const updateMachineSchema = machineSchema.partial().extend({ active: z.boolean().optional() });

export const updateMachine = asyncHandler(async (req: Request, res: Response) => {
  const machine = await Machine.findByPk(req.params.id);
  if (!machine) throw new ApiError(404, 'Maquina nao encontrada');

  const data = updateMachineSchema.parse(req.body);
  await machine.update(data);
  await redisClient.del(MACHINES_CACHE_KEY);
  res.json(machine);
});
