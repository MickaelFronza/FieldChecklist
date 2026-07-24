import { Request, Response } from 'express';
import { z } from 'zod';
import { User, Vehicle, VehicleOperator } from '../models';
import { redisClient } from '../config/redisClient';
import { socketEmitter } from '../queues/emitter';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';

const VEHICLES_CACHE_KEY = 'vehicles:active';
const VEHICLES_CACHE_TTL_SECONDS = 60 * 60;

interface CachedVehicle {
  id: string;
  operators?: { id: string }[];
  [key: string]: unknown;
}

export const getActiveVehicles = asyncHandler(async (req: Request, res: Response) => {
  let vehicles: CachedVehicle[];
  const cached = await redisClient.get(VEHICLES_CACHE_KEY);
  if (cached) {
    vehicles = JSON.parse(cached);
  } else {
    vehicles = (await Vehicle.findAll({
      where: { active: true },
      include: [{ model: User, as: 'operators', attributes: ['id'], through: { attributes: [] } }],
      order: [['name', 'ASC']],
    })) as unknown as CachedVehicle[];
    await redisClient.set(VEHICLES_CACHE_KEY, JSON.stringify(vehicles), 'EX', VEHICLES_CACHE_TTL_SECONDS);
  }

  // operador so ve veiculo sem nenhum responsavel definido (livre pra
  // qualquer um) ou onde ele proprio esta na lista de responsaveis; admin/
  // manager sempre veem tudo (nao usam essa rota pra decidir o que aparece
  // pra si mesmos, so pra cadastro/relatorio)
  const visible =
    req.user!.role === 'operator'
      ? vehicles.filter((v) => !v.operators?.length || v.operators.some((op) => op.id === req.user!.sub))
      : vehicles;

  res.json(visible.map(({ operators, ...vehicle }) => vehicle));
});

export const listVehicles = asyncHandler(async (_req: Request, res: Response) => {
  const vehicles = await Vehicle.findAll({
    include: [{ model: User, as: 'operators', attributes: ['id', 'name'], through: { attributes: [] } }],
    order: [['createdAt', 'DESC']],
  });
  res.json(vehicles);
});

const VEHICLE_CATEGORIES = ['carro', 'onibus', 'navio', 'caminhao', 'trator', 'moto', 'outro'] as const;

const vehicleSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  category: z.enum(VEHICLE_CATEGORIES).default('outro'),
  // texto livre - aceita formato antigo (ABC-1234) e Mercosul (BEY-0C83) sem
  // travar num regex unico; nem todo veiculo tem placa nesse padrao
  plate: z.string().max(20).nullable().optional(),
});

export const createVehicle = asyncHandler(async (req: Request, res: Response) => {
  const data = vehicleSchema.parse(req.body);
  const vehicle = await Vehicle.create(data);
  await redisClient.del(VEHICLES_CACHE_KEY);
  // avisa o app mobile na hora - sem isso o veiculo novo so aparecia pro
  // operador quando a tela de selecao ganhasse foco de novo (ex.: fechar e
  // reabrir o app)
  socketEmitter.emit('vehicle:changed', { vehicleId: vehicle.id });
  res.status(201).json(vehicle);
});

const updateVehicleSchema = vehicleSchema.partial().extend({ active: z.boolean().optional() });

export const updateVehicle = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await Vehicle.findByPk(req.params.id);
  if (!vehicle) throw new ApiError(404, 'Veiculo nao encontrado');

  const data = updateVehicleSchema.parse(req.body);
  await vehicle.update(data);
  await redisClient.del(VEHICLES_CACHE_KEY);
  // mesma notificacao pra qualquer edicao (ativar/desativar/trocar
  // nome/codigo/tipo) - o app mobile so precisa saber que a lista mudou e
  // refazer a busca, nao qual campo mudou
  socketEmitter.emit('vehicle:changed', { vehicleId: vehicle.id });

  res.json(vehicle);
});

export const deleteVehicle = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await Vehicle.findByPk(req.params.id);
  if (!vehicle) throw new ApiError(404, 'Veiculo nao encontrado');

  // vehicle_operators e' so a associacao de "responsavel", sem valor
  // historico proprio - apagar junto e' seguro (diferente de
  // checklist_executions, que fica protegido pela FK sem onDelete e vira um
  // 409 claro via errorHandler se o veiculo tiver historico)
  await VehicleOperator.destroy({ where: { vehicleId: vehicle.id } });
  await vehicle.destroy();
  await redisClient.del(VEHICLES_CACHE_KEY);
  socketEmitter.emit('vehicle:changed', { vehicleId: vehicle.id });
  res.status(204).send();
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
  await redisClient.del(VEHICLES_CACHE_KEY);
  // muda quem enxerga esse veiculo no app - o operador recem-adicionado
  // precisa ver ele aparecer na hora, e um operador removido precisa ver ele
  // sumir na hora tambem
  socketEmitter.emit('vehicle:changed', { vehicleId: vehicle.id });

  const updated = await Vehicle.findByPk(vehicle.id, {
    include: [{ model: User, as: 'operators', attributes: ['id', 'name'], through: { attributes: [] } }],
  });
  res.json(updated);
});
