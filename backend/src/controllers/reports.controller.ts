import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { ChecklistExecution, ExecutionItem, User, Vehicle } from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';

export const getDailyReport = asyncHandler(async (req: Request, res: Response) => {
  const date = (req.query.date as string | undefined) ?? new Date().toISOString().slice(0, 10);
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59.999`);

  const executions = await ChecklistExecution.findAll({
    where: { startedAt: { [Op.between]: [start, end] } },
    include: [
      { model: ExecutionItem, as: 'items' },
      { model: Vehicle, as: 'vehicle' },
      { model: User, as: 'operator', attributes: ['id', 'name'] },
    ],
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
    include: [
      { model: ExecutionItem, as: 'items' },
      { model: Vehicle, as: 'vehicle' },
    ],
    order: [['startedAt', 'DESC']],
  });

  res.json({ operator, executions });
});

export const getOperatorStatusToday = asyncHandler(async (_req: Request, res: Response) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const operators = await User.findAll({
    where: { role: 'operator', active: true },
    order: [['name', 'ASC']],
  });

  const executions = await ChecklistExecution.findAll({
    where: { startedAt: { [Op.between]: [start, end] } },
    include: [{ model: Vehicle, as: 'vehicle' }],
    order: [['startedAt', 'DESC']],
  });

  // execucoes ja vem ordenadas por mais recente primeiro, entao o primeiro
  // match por operador e sempre o status mais atual dele hoje
  const latestByOperator = new Map<string, (typeof executions)[number]>();
  for (const execution of executions) {
    if (!latestByOperator.has(execution.operatorId)) {
      latestByOperator.set(execution.operatorId, execution);
    }
  }

  const operatorStatuses = operators.map((operator) => {
    const execution = latestByOperator.get(operator.id);
    const status: 'not_started' | 'in_progress' | 'completed' = !execution
      ? 'not_started'
      : execution.status === 'completed'
        ? 'completed'
        : 'in_progress';

    return {
      operatorId: operator.id,
      name: operator.name,
      status,
      vehicleName: execution?.vehicle?.name ?? null,
      lastStartedAt: execution?.startedAt ?? null,
    };
  });

  res.json({
    date: start.toISOString().slice(0, 10),
    totalOperators: operators.length,
    completed: operatorStatuses.filter((o) => o.status === 'completed').length,
    inProgress: operatorStatuses.filter((o) => o.status === 'in_progress').length,
    notStarted: operatorStatuses.filter((o) => o.status === 'not_started').length,
    operators: operatorStatuses,
  });
});
