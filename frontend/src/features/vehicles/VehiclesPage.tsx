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
  MenuItem,
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
import DeleteIcon from '@mui/icons-material/Delete';
import BuildIcon from '@mui/icons-material/Build';
import {
  createVehicle,
  deleteVehicle,
  fetchVehicles,
  markMaintenanceDone,
  updateVehicle,
  updateVehicleOperators,
} from './api';
import { fetchUsers } from '@/features/users/api';
import { fetchVehicleTypes } from '@/features/vehicleTypes/api';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { ManageVehicleTypesDialog } from '@/components/common/ManageVehicleTypesDialog';
import type { User, Vehicle, VehicleCategory } from '@/types/api';

type OperatorOption = Pick<User, 'id' | 'name'>;

// so define o icone/rotulo mostrado aqui e no app mobile - decidido separado
// do campo "Tipo" (que fica livre, usado pro casamento com Templates)
const CATEGORY_OPTIONS: { value: VehicleCategory; label: string; icon: string }[] = [
  { value: 'carro', label: 'Carro', icon: '🚗' },
  { value: 'onibus', label: 'Ônibus', icon: '🚌' },
  { value: 'navio', label: 'Navio', icon: '🚢' },
  { value: 'caminhao', label: 'Caminhão', icon: '🚚' },
  { value: 'trator', label: 'Trator', icon: '🚜' },
  { value: 'moto', label: 'Moto', icon: '🏍️' },
  { value: 'outro', label: 'Outro', icon: '📦' },
];

const CATEGORY_BY_VALUE = Object.fromEntries(CATEGORY_OPTIONS.map((option) => [option.value, option]));

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
  const { data: vehicleTypes } = useQuery({ queryKey: ['vehicle-types'], queryFn: fetchVehicleTypes });
  const operatorOptions: OperatorOption[] = users?.filter((user) => user.role === 'operator') ?? [];

  const [manageTypesOpen, setManageTypesOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    type: '',
    category: 'outro' as VehicleCategory,
    plate: '',
    maintenanceIntervalKm: '',
  });
  const [formOperators, setFormOperators] = useState<OperatorOption[]>([]);

  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editForm, setEditForm] = useState({
    code: '',
    name: '',
    type: '',
    category: 'outro' as VehicleCategory,
    plate: '',
    maintenanceIntervalKm: '',
  });
  const [editOperators, setEditOperators] = useState<OperatorOption[]>([]);

  useEffect(() => {
    setEditOperators(editingVehicle?.operators ?? []);
    setEditForm({
      code: editingVehicle?.code ?? '',
      name: editingVehicle?.name ?? '',
      type: editingVehicle?.type ?? '',
      category: editingVehicle?.category ?? 'outro',
      plate: editingVehicle?.plate ?? '',
      maintenanceIntervalKm: editingVehicle?.maintenanceIntervalKm?.toString() ?? '',
    });
  }, [editingVehicle]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const vehicle = await createVehicle({
        ...form,
        plate: form.plate.trim() || null,
        maintenanceIntervalKm: form.maintenanceIntervalKm ? Number(form.maintenanceIntervalKm) : null,
      });
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
      setForm({ code: '', name: '', type: '', category: 'outro', plate: '', maintenanceIntervalKm: '' });
      setFormOperators([]);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateVehicle(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingVehicle) return;
      await updateVehicle(editingVehicle.id, {
        ...editForm,
        plate: editForm.plate.trim() || null,
        maintenanceIntervalKm: editForm.maintenanceIntervalKm ? Number(editForm.maintenanceIntervalKm) : null,
      });
      await updateVehicleOperators(
        editingVehicle.id,
        editOperators.map((operator) => operator.id),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setEditingVehicle(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });

  const maintenanceDoneMutation = useMutation({
    mutationFn: markMaintenanceDone,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
    onError: (error) => window.alert(getMutationErrorMessage(error)),
  });

  const handleMarkMaintenanceDone = (vehicle: Vehicle) => {
    if (!window.confirm(`Marcar manutenção feita agora pra "${vehicle.name}" (${vehicle.latestOdometerKm ?? 0} km)?`)) {
      return;
    }
    maintenanceDoneMutation.mutate(vehicle.id);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate();
  };

  const handleCloseCreateDialog = () => {
    setDialogOpen(false);
    createMutation.reset();
  };

  const handleCloseEditDialog = () => {
    setEditingVehicle(null);
    editMutation.reset();
  };

  const handleEditSubmit = (event: FormEvent) => {
    event.preventDefault();
    editMutation.mutate();
  };

  const handleDelete = (vehicle: Vehicle) => {
    if (!window.confirm(`Excluir o veículo "${vehicle.name}"? Isso não pode ser desfeito.`)) return;
    deleteMutation.mutate(vehicle.id);
  };

  // se o tipo atual do veiculo foi excluido da lista gerenciada depois de
  // cadastrado, ainda precisa aparecer como opcao aqui - senao o Select fica
  // com um valor que nao bate com nenhum MenuItem
  const editTypeOptions =
    editingVehicle && editForm.type && !vehicleTypes?.some((type) => type.name === editForm.type)
      ? [{ id: 'current', name: editForm.type }, ...(vehicleTypes ?? [])]
      : (vehicleTypes ?? []);

  const isEditFormValid =
    editForm.code.trim().length > 0 && editForm.name.trim().length > 0 && editForm.type.trim().length > 0;

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
                <TableCell>Categoria</TableCell>
                <TableCell>Placa</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Operadores responsáveis</TableCell>
                <TableCell>Manutenção</TableCell>
                <TableCell>Ativo</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vehicles?.map((vehicle) => (
                <TableRow key={vehicle.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{vehicle.code}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{vehicle.name}</TableCell>
                  <TableCell>
                    {CATEGORY_BY_VALUE[vehicle.category]?.icon} {CATEGORY_BY_VALUE[vehicle.category]?.label}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{vehicle.plate ?? '—'}</TableCell>
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
                    {vehicle.maintenanceIntervalKm == null ? (
                      <Typography variant="body2" color="text.secondary">
                        Desligada
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          {vehicle.kmSinceLastMaintenance ?? 0} / {vehicle.maintenanceIntervalKm} km
                        </Typography>
                        {vehicle.maintenanceDue && <Chip size="small" color="warning" label="Vencida" />}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={vehicle.active}
                      onChange={(event) => toggleActiveMutation.mutate({ id: vehicle.id, active: event.target.checked })}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {vehicle.maintenanceIntervalKm != null && (
                      <IconButton
                        size="small"
                        onClick={() => handleMarkMaintenanceDone(vehicle)}
                        disabled={maintenanceDoneMutation.isPending}
                        title="Marcar manutenção feita"
                      >
                        <BuildIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton size="small" onClick={() => setEditingVehicle(vehicle)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(vehicle)} disabled={deleteMutation.isPending}>
                      <DeleteIcon fontSize="small" />
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
              select
              label="Tipo"
              required
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
            >
              <MenuItem value="" disabled>
                Selecione um tipo
              </MenuItem>
              {vehicleTypes?.map((type) => (
                <MenuItem key={type.id} value={type.name}>
                  {type.name}
                </MenuItem>
              ))}
            </TextField>
            <Button size="small" onClick={() => setManageTypesOpen(true)} sx={{ alignSelf: 'flex-start', mt: -1 }}>
              Gerenciar tipos
            </Button>
            <TextField
              select
              label="Categoria (ícone no app)"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value as VehicleCategory })}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Placa"
              placeholder="ABC-1234 ou BEY-0C83"
              value={form.plate}
              onChange={(event) => setForm({ ...form, plate: event.target.value.toUpperCase() })}
            />
            <TextField
              label="Intervalo de manutenção (km)"
              type="number"
              placeholder="Ex.: 10000 (vazio = desligada)"
              value={form.maintenanceIntervalKm}
              onChange={(event) => setForm({ ...form, maintenanceIntervalKm: event.target.value })}
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

      <Dialog open={Boolean(editingVehicle)} onClose={handleCloseEditDialog} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleEditSubmit}>
          <DialogTitle>Editar Veículo — {editingVehicle?.name}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {editMutation.isError && <Alert severity="error">{getMutationErrorMessage(editMutation.error)}</Alert>}
            <TextField
              label="Código"
              required
              value={editForm.code}
              onChange={(event) => setEditForm({ ...editForm, code: event.target.value })}
            />
            <TextField
              label="Nome"
              required
              value={editForm.name}
              onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
            />
            <TextField
              select
              label="Tipo"
              required
              value={editForm.type}
              onChange={(event) => setEditForm({ ...editForm, type: event.target.value })}
            >
              <MenuItem value="" disabled>
                Selecione um tipo
              </MenuItem>
              {editTypeOptions.map((type) => (
                <MenuItem key={type.id} value={type.name}>
                  {type.name}
                </MenuItem>
              ))}
            </TextField>
            <Button size="small" onClick={() => setManageTypesOpen(true)} sx={{ alignSelf: 'flex-start', mt: -1 }}>
              Gerenciar tipos
            </Button>
            <TextField
              select
              label="Categoria (ícone no app)"
              value={editForm.category}
              onChange={(event) => setEditForm({ ...editForm, category: event.target.value as VehicleCategory })}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Placa"
              placeholder="ABC-1234 ou BEY-0C83"
              value={editForm.plate}
              onChange={(event) => setEditForm({ ...editForm, plate: event.target.value.toUpperCase() })}
            />
            <TextField
              label="Intervalo de manutenção (km)"
              type="number"
              placeholder="Ex.: 10000 (vazio = desligada)"
              value={editForm.maintenanceIntervalKm}
              onChange={(event) => setEditForm({ ...editForm, maintenanceIntervalKm: event.target.value })}
            />
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
            <Button onClick={handleCloseEditDialog}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={!isEditFormValid || editMutation.isPending}>
              Salvar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ManageVehicleTypesDialog open={manageTypesOpen} onClose={() => setManageTypesOpen(false)} />
    </Box>
  );
}
