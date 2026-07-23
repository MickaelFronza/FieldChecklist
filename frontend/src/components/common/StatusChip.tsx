import { Chip } from '@mui/material';
import type { ExecutionItemStatus, ExecutionStatus, OperatorTodayStatus } from '@/types/api';

const ITEM_STATUS_CONFIG: Record<ExecutionItemStatus, { label: string; color: 'success' | 'error' | 'warning' | 'default' }> = {
  ok: { label: 'OK', color: 'success' },
  non_conformant: { label: 'Não Conforme', color: 'error' },
  not_applicable: { label: 'Não Aplicável', color: 'warning' },
  pending: { label: 'Pendente', color: 'default' },
};

const EXECUTION_STATUS_CONFIG: Record<ExecutionStatus, { label: string; color: 'success' | 'error' | 'warning' | 'default' }> = {
  completed: { label: 'Concluído', color: 'success' },
  in_progress: { label: 'Em Andamento', color: 'warning' },
  incomplete: { label: 'Incompleto', color: 'error' },
};

export function ItemStatusChip({ status }: { status: ExecutionItemStatus }) {
  const config = ITEM_STATUS_CONFIG[status];
  return <Chip size="small" label={config.label} color={config.color} />;
}

export function ExecutionStatusChip({ status }: { status: ExecutionStatus }) {
  const config = EXECUTION_STATUS_CONFIG[status];
  return <Chip size="small" label={config.label} color={config.color} />;
}

const OPERATOR_TODAY_STATUS_CONFIG: Record<
  OperatorTodayStatus,
  { label: string; color: 'success' | 'error' | 'warning' | 'default' }
> = {
  completed: { label: 'Concluído', color: 'success' },
  in_progress: { label: 'Em Andamento', color: 'warning' },
  not_started: { label: 'Pendente', color: 'error' },
};

export function OperatorStatusChip({ status }: { status: OperatorTodayStatus }) {
  const config = OPERATOR_TODAY_STATUS_CONFIG[status];
  return <Chip size="small" label={config.label} color={config.color} />;
}
