import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models';
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
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const data = createUserSchema.parse(req.body);
  const pinHash = await hashPin(data.pin);
  const user = await User.create({ name: data.name, pinHash, role: data.role });
  res.status(201).json({ id: user.id, name: user.name, role: user.role, active: user.active });
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  pin: z.string().regex(/^\d{4}$/).optional(),
  role: z.enum(['admin', 'manager', 'operator']).optional(),
  active: z.boolean().optional(),
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
  });

  res.json({ id: user.id, name: user.name, role: user.role, active: user.active });
});
