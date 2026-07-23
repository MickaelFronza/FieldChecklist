import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { createVehicle, fetchVehicles, updateVehicle, updateVehicleOperators } from './api';
import { fetchUsers } from '@/features/users/api';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import type { User, Vehicle } from '@/types/api';

type OperatorOption = Pick<User, 'id' | 'name'>;

function getMutationErrorMessage(error: unknown): string {
  if (isAxiosError<{ error?: string }>(error) && error.response?.data?.error) {
    return error.response.data.error;
  }
  return 'Não foi possível salvar. Tente novamente.';
}

export function VehiclesPage() {
  const queryClient = useQueryClient();
  const { data: vehicles, isLoading } = useQuery({ queryKey: ['vehicles'], queryFn: fetchVehicles });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const operatorOptions: OperatorOption[] = users?.filter((user) => user.role === 'operator') ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: '' });
  const [formOperators, setFormOperators] = useState<OperatorOption[]>([]);

  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editOperators, setEditOperators] = useState<OperatorOption[]>([]);

  useEffect(() => {
    setEditOperators(editingVehicle?.operators ?? []);
  }, [editingVehicle]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const vehicle = await createVehicle(form);
      if (formOperators.length > 0) {
        await updateVehicleOperators(
          vehicle.id,
          formOperators.map((operator) => operator.id),
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setDialogOpen(false);
      setForm({ code: '', name: '', type: '' });
      setFormOperators([]);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateVehicle(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });

  const operatorsMutation = useMutation({
    mutationFn: ({ vehicleId, operatorIds }: { vehicleId: string; operatorIds: string[] }) =>
      updateVehicleOperators(vehicleId, operatorIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setEditingVehicle(null);
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate();
  };

  const handleCloseCreateDialog = () => {
    setDialogOpen(false);
    createMutation.reset();
  };

  const handleCloseOperatorsDialog = () => {
    setEditingVehicle(null);
    operatorsMutation.reset();
  };

  const handleSaveOperators = () => {
    if (!editingVehicle) return;
    operatorsMutation.mutate({
      vehicleId: editingVehicle.id,
      operatorIds: editOperators.map((operator) => operator.id),
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Veículos</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => {
            createMutation.reset();
            setDialogOpen(true);
          }}
        >
          Novo Veículo
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {isLoading ? (
          <LoadingState />
        ) : vehicles?.length === 0 ? (
          <EmptyState message="Nenhum veículo cadastrado ainda." />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Operadores responsáveis</TableCell>
                <TableCell>Ativo</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vehicles?.map((vehicle) => (
                <TableRow key={vehicle.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{vehicle.code}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{vehicle.name}</TableCell>
                  <TableCell>{vehicle.type}</TableCell>
                  <TableCell>
                    {vehicle.operators?.length ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {vehicle.operators.map((operator) => (
                          <Chip key={operator.id} size="small" label={operator.name} />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Nenhum
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={vehicle.active}
                      onChange={(event) => toggleActiveMutation.mutate({ id: vehicle.id, active: event.target.checked })}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => setEditingVehicle(vehicle)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={handleCloseCreateDialog} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>Novo Veículo</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {createMutation.isError && <Alert severity="error">{getMutationErrorMessage(createMutation.error)}</Alert>}
            <TextField
              label="Código"
              placeholder="TRATOR-01"
              required
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
            />
            <TextField
              label="Nome"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <TextField
              label="Tipo"
              placeholder="Trator"
              required
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
            />
            <Autocomplete
              multiple
              options={operatorOptions}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={formOperators}
              onChange={(_event, value) => setFormOperators(value)}
              renderInput={(params) => (
                <TextField {...params} label="Operadores responsáveis" placeholder="Opcional" />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCreateDialog}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              Salvar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(editingVehicle)} onClose={handleCloseOperatorsDialog} fullWidth maxWidth="xs">
        <DialogTitle>Operadores responsáveis — {editingVehicle?.name}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {operatorsMutation.isError && (
            <Alert severity="error">{getMutationErrorMessage(operatorsMutation.error)}</Alert>
          )}
          <Autocomplete
            multiple
            options={operatorOptions}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={editOperators}
            onChange={(_event, value) => setEditOperators(value)}
            renderInput={(params) => <TextField {...params} label="Operadores responsáveis" />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOperatorsDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveOperators} disabled={operatorsMutation.isPending}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
