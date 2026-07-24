import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
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
import { downloadCsv, downloadPdfTable } from '@/lib/exportUtils';
import { SHIFT_LABEL } from '@/lib/shift';
import type { ChecklistExecution } from '@/types/api';

const STATUS_LABEL: Record<ChecklistExecution['status'], string> = {
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  incomplete: 'Incompleto',
};

const FUEL_LABEL: Record<NonNullable<ChecklistExecution['fuelLevel']>, string> = {
  vazio: 'Vazio',
  quarto: '1/4',
  metade: '1/2',
  tres_quartos: '3/4',
  cheio: 'Cheio',
};

function formatOdometer(execution: ChecklistExecution): string {
  return execution.odometerKm != null ? `${execution.odometerKm} km` : '—';
}

function formatFuel(execution: ChecklistExecution): string {
  return execution.fuelLevel ? FUEL_LABEL[execution.fuelLevel] : '—';
}

function hasReusedPhoto(execution: ChecklistExecution): boolean {
  return Boolean(execution.items?.some((item) => item.photoReused));
}

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
          <>
            <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
              <StatTile label="Total de execuções" value={dailyReport.totalExecutions} />
              <StatTile label="Concluídas" value={dailyReport.completedExecutions} color="success.main" />
              <StatTile label="Incompletas" value={dailyReport.incompleteExecutions} color="warning.main" />
              <StatTile label="Itens não conformes" value={dailyReport.nonConformantItems} color="error.main" />
            </Stack>

            {dailyReport.executions.length > 0 && (
              <>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      downloadCsv(
                        `relatorio-diario-${date}.csv`,
                        ['Operador', 'Veículo', 'Turno', 'Status', 'Odômetro', 'Combustível', 'Foto suspeita'],
                        dailyReport.executions.map((execution) => [
                          execution.operator?.name ?? execution.operatorId,
                          execution.vehicle?.name ?? execution.vehicleId,
                          SHIFT_LABEL[execution.shift],
                          STATUS_LABEL[execution.status],
                          formatOdometer(execution),
                          formatFuel(execution),
                          hasReusedPhoto(execution) ? 'Sim' : 'Não',
                        ]),
                      )
                    }
                  >
                    Exportar CSV
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      downloadPdfTable(
                        `relatorio-diario-${date}.pdf`,
                        `Relatório Diário — ${date}`,
                        ['Operador', 'Veículo', 'Turno', 'Status', 'Odômetro', 'Combustível', 'Foto suspeita'],
                        dailyReport.executions.map((execution) => [
                          execution.operator?.name ?? execution.operatorId,
                          execution.vehicle?.name ?? execution.vehicleId,
                          SHIFT_LABEL[execution.shift],
                          STATUS_LABEL[execution.status],
                          formatOdometer(execution),
                          formatFuel(execution),
                          hasReusedPhoto(execution) ? 'Sim' : 'Não',
                        ]),
                      )
                    }
                  >
                    Exportar PDF
                  </Button>
                </Stack>

                <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 4 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Operador</TableCell>
                        <TableCell>Veículo</TableCell>
                        <TableCell>Turno</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Odômetro</TableCell>
                        <TableCell>Combustível</TableCell>
                        <TableCell>Foto suspeita</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dailyReport.executions.map((execution) => (
                        <TableRow key={execution.id} hover>
                          <TableCell>{execution.operator?.name ?? execution.operatorId}</TableCell>
                          <TableCell>{execution.vehicle?.name ?? execution.vehicleId}</TableCell>
                          <TableCell>{SHIFT_LABEL[execution.shift]}</TableCell>
                          <TableCell>
                            <ExecutionStatusChip status={execution.status} />
                          </TableCell>
                          <TableCell>{formatOdometer(execution)}</TableCell>
                          <TableCell>{formatFuel(execution)}</TableCell>
                          <TableCell>
                            {hasReusedPhoto(execution) && <Chip size="small" color="warning" label="Suspeita" />}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              </>
            )}
          </>
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
        <>
          {operatorReport.executions.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  downloadCsv(
                    `relatorio-operador-${operatorReport.operator.name}.csv`,
                    ['Data', 'Veículo', 'Turno', 'Status', 'Odômetro', 'Combustível', 'Foto suspeita'],
                    operatorReport.executions.map((execution) => [
                      new Date(execution.startedAt).toLocaleDateString('pt-BR'),
                      execution.vehicle?.name ?? execution.vehicleId,
                      SHIFT_LABEL[execution.shift],
                      STATUS_LABEL[execution.status],
                      formatOdometer(execution),
                      formatFuel(execution),
                      hasReusedPhoto(execution) ? 'Sim' : 'Não',
                    ]),
                  )
                }
              >
                Exportar CSV
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  downloadPdfTable(
                    `relatorio-operador-${operatorReport.operator.name}.pdf`,
                    `Relatório — ${operatorReport.operator.name}`,
                    ['Data', 'Veículo', 'Turno', 'Status', 'Odômetro', 'Combustível', 'Foto suspeita'],
                    operatorReport.executions.map((execution) => [
                      new Date(execution.startedAt).toLocaleDateString('pt-BR'),
                      execution.vehicle?.name ?? execution.vehicleId,
                      SHIFT_LABEL[execution.shift],
                      STATUS_LABEL[execution.status],
                      formatOdometer(execution),
                      formatFuel(execution),
                      hasReusedPhoto(execution) ? 'Sim' : 'Não',
                    ]),
                  )
                }
              >
                Exportar PDF
              </Button>
            </Stack>
          )}

          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            {operatorReport.executions.length === 0 ? (
              <EmptyState message="Nenhuma execução encontrada para este operador." />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell>Veículo</TableCell>
                    <TableCell>Turno</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Odômetro</TableCell>
                    <TableCell>Combustível</TableCell>
                    <TableCell>Foto suspeita</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {operatorReport.executions.map((execution) => (
                    <TableRow key={execution.id} hover>
                      <TableCell>{new Date(execution.startedAt).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{execution.vehicle?.name ?? execution.vehicleId}</TableCell>
                      <TableCell>{SHIFT_LABEL[execution.shift]}</TableCell>
                      <TableCell>
                        <ExecutionStatusChip status={execution.status} />
                      </TableCell>
                      <TableCell>{formatOdometer(execution)}</TableCell>
                      <TableCell>{formatFuel(execution)}</TableCell>
                      <TableCell>
                        {hasReusedPhoto(execution) && <Chip size="small" color="warning" label="Suspeita" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
}
