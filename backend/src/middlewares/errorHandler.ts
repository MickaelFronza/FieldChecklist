import { NextFunction, Request, Response } from 'express';
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

  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
}
