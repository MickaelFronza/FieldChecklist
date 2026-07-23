import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Link,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { fetchExecutions } from './api';
import { fetchMachines } from '@/features/machines/api';
import { fetchUsers } from '@/features/users/api';
import { useReportFiltersStore } from '@/stores/reportFiltersStore';
import { ExecutionStatusChip } from '@/components/common/StatusChip';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';

export function ExecutionsPage() {
  const { executionFilters, setExecutionFilters } = useReportFiltersStore();

  const { data: executions, isLoading } = useQuery({
    queryKey: ['executions', executionFilters],
    queryFn: () => fetchExecutions(executionFilters),
  });

  const { data: machines } = useQuery({ queryKey: ['machines'], queryFn: fetchMachines });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const operators = users?.filter((user) => user.role === 'operator') ?? [];

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Execuções
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label="Data"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={executionFilters.date}
          onChange={(e) => setExecutionFilters({ date: e.target.value })}
        />
        <TextField
          label="Máquina"
          select
          size="small"
          sx={{ minWidth: 180 }}
          value={executionFilters.machineId}
          onChange={(e) => setExecutionFilters({ machineId: e.target.value })}
        >
          <MenuItem value="">Todas</MenuItem>
          {machines?.map((machine) => (
            <MenuItem key={machine.id} value={machine.id}>
              {machine.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Operador"
          select
          size="small"
          sx={{ minWidth: 180 }}
          value={executionFilters.operatorId}
          onChange={(e) => setExecutionFilters({ operatorId: e.target.value })}
        >
          <MenuItem value="">Todos</MenuItem>
          {operators.map((operator) => (
            <MenuItem key={operator.id} value={operator.id}>
              {operator.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Status"
          select
          size="small"
          sx={{ minWidth: 160 }}
          value={executionFilters.status}
          onChange={(e) => setExecutionFilters({ status: e.target.value })}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="in_progress">Em Andamento</MenuItem>
          <MenuItem value="completed">Concluído</MenuItem>
          <MenuItem value="incomplete">Incompleto</MenuItem>
        </TextField>
      </Box>

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {isLoading ? (
          <LoadingState />
        ) : executions?.length === 0 ? (
          <EmptyState message="Nenhuma execução encontrada para os filtros selecionados." />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Máquina</TableCell>
                <TableCell>Operador</TableCell>
                <TableCell>Turno</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Início</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {executions?.map((execution) => (
                <TableRow key={execution.id} hover>
                  <TableCell>
                    <Link component={RouterLink} to={`/executions/${execution.id}`} sx={{ fontWeight: 600 }}>
                      {execution.machine?.name ?? execution.machineId}
                    </Link>
                  </TableCell>
                  <TableCell>{execution.operator?.name ?? execution.operatorId}</TableCell>
                  <TableCell>{execution.shift}</TableCell>
                  <TableCell>
                    <ExecutionStatusChip status={execution.status} />
                  </TableCell>
                  <TableCell>{new Date(execution.startedAt).toLocaleString('pt-BR')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}
