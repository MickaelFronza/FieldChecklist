import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { z } from 'zod';
import { User, UserDevice } from '../models';
import { hashPassword, hashPin } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';

// Admin nunca aparece aqui - e uma conta especial, fora do CRUD normal de
// usuarios (bootstrap via seeder, ver database/seeders)
export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.findAll({
    where: { role: { [Op.ne]: 'admin' } },
    attributes: { exclude: ['pinHash', 'passwordHash'] },
    order: [['name', 'ASC']],
  });
  res.json(users);
});

const createUserSchema = z
  .object({
    name: z.string().min(1),
    role: z.enum(['manager', 'operator']),
    pin: z.string().regex(/^\d{4}$/).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    maxDevices: z.number().int().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'operator' && !data.pin) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'PIN é obrigatório para operador', path: ['pin'] });
    }
    if (data.role === 'manager' && (!data.email || !data.password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Email e senha são obrigatórios para gestor',
        path: ['email'],
      });
    }
  });

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const data = createUserSchema.parse(req.body);

  const user = await User.create({
    name: data.name,
    role: data.role,
    pinHash: data.role === 'operator' ? await hashPin(data.pin as string) : null,
    email: data.role === 'manager' ? data.email : null,
    passwordHash: data.role === 'manager' ? await hashPassword(data.password as string) : null,
    maxDevices: data.maxDevices ?? 2,
  });

  res.status(201).json({
    id: user.id,
    name: user.name,
    role: user.role,
    active: user.active,
    maxDevices: user.maxDevices,
    email: user.email,
  });
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
  maxDevices: z.number().int().min(1).optional(),
  pin: z.string().regex(/^\d{4}$/).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByPk(req.params.id);
  if (!user || user.role === 'admin') throw new ApiError(404, 'Usuario nao encontrado');

  const data = updateUserSchema.parse(req.body);

  await user.update({
    name: data.name ?? user.name,
    active: data.active ?? user.active,
    maxDevices: data.maxDevices ?? user.maxDevices,
    pinHash: data.pin && user.role === 'operator' ? await hashPin(data.pin) : user.pinHash,
    email: data.email && user.role === 'manager' ? data.email : user.email,
    passwordHash: data.password && user.role === 'manager' ? await hashPassword(data.password) : user.passwordHash,
  });

  res.json({
    id: user.id,
    name: user.name,
    role: user.role,
    active: user.active,
    maxDevices: user.maxDevices,
    email: user.email,
  });
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
