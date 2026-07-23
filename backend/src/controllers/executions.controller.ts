import { Request, Response } from 'express';
import { Op, WhereOptions } from 'sequelize';
import { ChecklistExecution, ExecutionItem, Vehicle, TemplateItem, User } from '../models';
import { getPhotoPresignedUrl } from '../services/storage.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';

export const listExecutions = asyncHandler(async (req: Request, res: Response) => {
  const { date, vehicleId, operatorId, status } = req.query as Record<string, string | undefined>;

  const where: WhereOptions = {};
  if (date) {
    where.startedAt = {
      [Op.between]: [new Date(`${date}T00:00:00`), new Date(`${date}T23:59:59.999`)],
    };
  }
  if (vehicleId) where.vehicleId = vehicleId;
  if (operatorId) where.operatorId = operatorId;
  if (status) where.status = status;

  const executions = await ChecklistExecution.findAll({
    where,
    include: [
      { model: Vehicle, as: 'vehicle' },
      { model: User, as: 'operator', attributes: ['id', 'name'] },
    ],
    order: [['startedAt', 'DESC']],
  });

  res.json(executions);
});

export const getExecutionDetail = asyncHandler(async (req: Request, res: Response) => {
  const execution = await ChecklistExecution.findByPk(req.params.id, {
    include: [
      { model: Vehicle, as: 'vehicle' },
      { model: User, as: 'operator', attributes: ['id', 'name'] },
      { model: ExecutionItem, as: 'items', include: [{ model: TemplateItem, as: 'templateItem' }] },
    ],
  });

  if (!execution) {
    throw new ApiError(404, 'Execucao nao encontrada');
  }

  const items = await Promise.all(
    (execution.items ?? []).map(async (item) => ({
      ...item.toJSON(),
      photoUrl: item.photoKey ? await getPhotoPresignedUrl(item.photoKey) : null,
    })),
  );

  res.json({ ...execution.toJSON(), items });
});
