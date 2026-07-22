import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { ChecklistExecution, ExecutionItem, User } from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';

export const getDailyReport = asyncHandler(async (req: Request, res: Response) => {
  const date = (req.query.date as string | undefined) ?? new Date().toISOString().slice(0, 10);
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59.999`);

  const executions = await ChecklistExecution.findAll({
    where: { startedAt: { [Op.between]: [start, end] } },
    include: [{ model: ExecutionItem, as: 'items' }],
  });

  const total = executions.length;
  const completed = executions.filter((e) => e.status === 'completed').length;
  const nonConformantItems = executions.reduce(
    (count, execution) => count + (execution.items ?? []).filter((item) => item.status === 'non_conformant').length,
    0,
  );

  res.json({
    date,
    totalExecutions: total,
    completedExecutions: completed,
    incompleteExecutions: total - completed,
    nonConformantItems,
    executions,
  });
});

export const getOperatorReport = asyncHandler(async (req: Request, res: Response) => {
  const { operatorId } = req.query as Record<string, string | undefined>;
  if (!operatorId) {
    throw new ApiError(400, 'operatorId e obrigatorio');
  }

  const operator = await User.findByPk(operatorId, { attributes: ['id', 'name', 'role'] });
  if (!operator) {
    throw new ApiError(404, 'Operador nao encontrado');
  }

  const executions = await ChecklistExecution.findAll({
    where: { operatorId },
    include: [{ model: ExecutionItem, as: 'items' }],
    order: [['startedAt', 'DESC']],
  });

  res.json({ operator, executions });
});
