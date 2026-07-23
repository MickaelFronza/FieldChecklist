import { Request, Response } from 'express';
import { z } from 'zod';
import { User, UserDevice } from '../models';
import { hashPin } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.findAll({
    attributes: { exclude: ['pinHash'] },
    order: [['name', 'ASC']],
  });
  res.json(users);
});

const createUserSchema = z.object({
  name: z.string().min(1),
  pin: z.string().regex(/^\d{4}$/),
  role: z.enum(['admin', 'manager', 'operator']),
  maxDevices: z.number().int().min(1).optional(),
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const data = createUserSchema.parse(req.body);
  const pinHash = await hashPin(data.pin);
  const user = await User.create({
    name: data.name,
    pinHash,
    role: data.role,
    maxDevices: data.maxDevices ?? 2,
  });
  res.status(201).json({ id: user.id, name: user.name, role: user.role, active: user.active, maxDevices: user.maxDevices });
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  pin: z.string().regex(/^\d{4}$/).optional(),
  role: z.enum(['admin', 'manager', 'operator']).optional(),
  active: z.boolean().optional(),
  maxDevices: z.number().int().min(1).optional(),
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw new ApiError(404, 'Usuario nao encontrado');

  const data = updateUserSchema.parse(req.body);
  await user.update({
    name: data.name ?? user.name,
    pinHash: data.pin ? await hashPin(data.pin) : user.pinHash,
    role: data.role ?? user.role,
    active: data.active ?? user.active,
    maxDevices: data.maxDevices ?? user.maxDevices,
  });

  res.json({ id: user.id, name: user.name, role: user.role, active: user.active, maxDevices: user.maxDevices });
});

export const listUserDevices = asyncHandler(async (req: Request, res: Response) => {
  const devices = await UserDevice.findAll({
    where: { userId: req.params.id },
    order: [['lastSeenAt', 'DESC']],
  });
  res.json(devices);
});

const updateDeviceSchema = z.object({
  active: z.boolean(),
});

export const updateUserDevice = asyncHandler(async (req: Request, res: Response) => {
  const device = await UserDevice.findOne({
    where: { userId: req.params.id, deviceId: req.params.deviceId },
  });
  if (!device) throw new ApiError(404, 'Aparelho nao encontrado');

  const { active } = updateDeviceSchema.parse(req.body);
  await device.update({ active });
  res.json(device);
});
