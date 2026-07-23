import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ForeignKeyConstraintError, UniqueConstraintError } from 'sequelize';
import { ApiError } from '../utils/apiError';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Rota nao encontrada: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Dados invalidos', details: err.issues });
    return;
  }

  if (err instanceof UniqueConstraintError) {
    const field = err.errors[0]?.path ?? 'campo';
    res.status(409).json({ error: `Já existe um registro com esse ${field}` });
    return;
  }

  if (err instanceof ForeignKeyConstraintError) {
    res.status(409).json({ error: 'Não é possível excluir: existem registros vinculados a este item (ex.: histórico de checklist). Desative em vez de excluir.' });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
}
