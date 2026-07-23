import { useQuery } from '@tanstack/react-query';
import {
  Box,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { fetchOperatorStatusToday } from '@/features/reports/api';
import { StatTile } from '@/components/common/StatTile';
import { OperatorStatusChip } from '@/components/common/StatusChip';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';

const STATUS_ORDER = { not_started: 0, in_progress: 1, completed: 2 } as const;

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'status-today'],
    queryFn: fetchOperatorStatusToday,
    refetchInterval: 30_000,
  });

  const completionRate = data && data.totalOperators > 0 ? Math.round((data.completed / data.totalOperators) * 100) : 0;

  const sortedOperators = data
    ? [...data.operators].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
    : [];

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Dashboard
      </Typography>

      {isLoading ? (
        <LoadingState />
      ) : (
        data && (
          <>
            <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
              <StatTile label="Operadores ativos" value={data.totalOperators} />
              <StatTile label="Concluíram hoje" value={data.completed} color="success.main" />
              <StatTile label="Em andamento" value={data.inProgress} color="warning.main" />
              <StatTile label="Pendentes" value={data.notStarted} color="error.main" />
            </Stack>

            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Checklists concluídos hoje
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {completionRate}%
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={completionRate} sx={{ height: 8, borderRadius: 4 }} />
            </Paper>

            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              {sortedOperators.length === 0 ? (
                <EmptyState message="Nenhum operador ativo cadastrado ainda." />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Operador</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Veículo</TableCell>
                      <TableCell>Último horário</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedOperators.map((operator) => (
                      <TableRow key={operator.operatorId} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{operator.name}</TableCell>
                        <TableCell>
                          <OperatorStatusChip status={operator.status} />
                        </TableCell>
                        <TableCell>{operator.vehicleName ?? '—'}</TableCell>
                        <TableCell>
                          {operator.lastStartedAt ? new Date(operator.lastStartedAt).toLocaleTimeString('pt-BR') : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          </>
        )
      )}
    </Box>
  );
}
