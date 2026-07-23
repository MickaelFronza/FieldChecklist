import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { fetchDailyReport, fetchOperatorReport } from './api';
import { fetchUsers } from '@/features/users/api';
import { StatTile } from '@/components/common/StatTile';
import { ExecutionStatusChip } from '@/components/common/StatusChip';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';

export function ReportsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [operatorId, setOperatorId] = useState('');

  const { data: dailyReport, isLoading: loadingDaily } = useQuery({
    queryKey: ['reports', 'daily', date],
    queryFn: () => fetchDailyReport(date),
  });

  const { data: users } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const operators = users?.filter((user) => user.role === 'operator') ?? [];

  const { data: operatorReport } = useQuery({
    queryKey: ['reports', 'operator', operatorId],
    queryFn: () => fetchOperatorReport(operatorId),
    enabled: Boolean(operatorId),
  });

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Relatórios
      </Typography>

      <TextField
        label="Data"
        type="date"
        size="small"
        InputLabelProps={{ shrink: true }}
        value={date}
        onChange={(e) => setDate(e.target.value)}
        sx={{ mb: 2 }}
      />

      {loadingDaily ? (
        <LoadingState />
      ) : (
        dailyReport && (
          <Stack direction="row" spacing={2} sx={{ mb: 4, flexWrap: 'wrap' }}>
            <StatTile label="Total de execuções" value={dailyReport.totalExecutions} />
            <StatTile label="Concluídas" value={dailyReport.completedExecutions} color="success.main" />
            <StatTile label="Incompletas" value={dailyReport.incompleteExecutions} color="warning.main" />
            <StatTile label="Itens não conformes" value={dailyReport.nonConformantItems} color="error.main" />
          </Stack>
        )
      )}

      <Typography variant="h6" sx={{ mb: 1 }}>
        Histórico por Operador
      </Typography>

      <TextField
        select
        label="Operador"
        size="small"
        sx={{ minWidth: 220, mb: 2 }}
        value={operatorId}
        onChange={(e) => setOperatorId(e.target.value)}
      >
        <MenuItem value="">Selecione um operador</MenuItem>
        {operators.map((operator) => (
          <MenuItem key={operator.id} value={operator.id}>
            {operator.name}
          </MenuItem>
        ))}
      </TextField>

      {operatorReport && (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          {operatorReport.executions.length === 0 ? (
            <EmptyState message="Nenhuma execução encontrada para este operador." />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Turno</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {operatorReport.executions.map((execution) => (
                  <TableRow key={execution.id} hover>
                    <TableCell>{new Date(execution.startedAt).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{execution.shift}</TableCell>
                    <TableCell>
                      <ExecutionStatusChip status={execution.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}
    </Box>
  );
}
