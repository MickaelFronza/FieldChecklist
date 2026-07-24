import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import {
  Alert,
  Box,
  Button,
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
import { createUser, deleteUser, fetchUsers, updateUser, type CreatableRole } from './api';
import { UserDevicesDialog } from './UserDevicesDialog';
import { fetchOperatorReport } from '@/features/reports/api';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuthStore } from '@/stores/authStore';
import type { User, UserRole } from '@/types/api';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Gestor',
  operator: 'Operador',
};

function getUserMutationErrorMessage(error: unknown): string {
  if (isAxiosError<{ error?: string }>(error) && error.response?.data?.error) {
    return error.response.data.error;
  }
  return 'Não foi possível salvar. Tente novamente.';
}

const EMPTY_FORM = {
  name: '',
  role: 'operator' as CreatableRole,
  pin: '',
  email: '',
  password: '',
  maxDevices: 2,
};

const EMPTY_EDIT_FORM = { name: '', pin: '', email: '', password: '' };

export function UsersPage() {
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');
  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [devicesUser, setDevicesUser] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);

  const [lastChecklistUser, setLastChecklistUser] = useState<User | null>(null);
  const { data: lastChecklistReport, isLoading: loadingLastChecklist } = useQuery({
    queryKey: ['reports', 'operator', lastChecklistUser?.id],
    queryFn: () => fetchOperatorReport(lastChecklistUser!.id),
    enabled: Boolean(lastChecklistUser),
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateUser(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const maxDevicesMutation = useMutation({
    mutationFn: ({ id, maxDevices }: { id: string; maxDevices: number }) => updateUser(id, { maxDevices }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateUser>[1] }) => updateUser(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    // so manda os campos do perfil escolhido - mandar email/password (ou pin)
    // como string vazia pro outro perfil quebra a validacao no backend
    // (z.string().email()/.min(6) rejeitam '' mesmo sendo .optional(), já que
    // .optional() só dispensa a CHAVE ausente, não um valor vazio presente)
    createMutation.mutate({
      name: form.name,
      role: form.role,
      maxDevices: form.maxDevices,
      ...(form.role === 'operator' ? { pin: form.pin } : { email: form.email, password: form.password }),
    });
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    createMutation.reset();
  };

  const handleOpenEdit = (user: User) => {
    editMutation.reset();
    setEditingUser(user);
    setEditForm({ name: user.name, pin: '', email: user.email ?? '', password: '' });
  };

  const handleCloseEditDialog = () => {
    setEditingUser(null);
    editMutation.reset();
  };

  const handleEditSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;
    // pin/password em branco = manter o atual (so troca se o gestor digitar
    // um valor novo) - mesmo cuidado do form de criacao: nunca manda string
    // vazia pros campos do OUTRO perfil
    editMutation.mutate({
      id: editingUser.id,
      input: {
        name: editForm.name,
        ...(editingUser.role === 'operator'
          ? editForm.pin
            ? { pin: editForm.pin }
            : {}
          : {
              email: editForm.email,
              ...(editForm.password ? { password: editForm.password } : {}),
            }),
      },
    });
  };

  const handleDelete = (user: User) => {
    if (!window.confirm(`Excluir o usuário "${user.name}"? Isso não pode ser desfeito.`)) return;
    deleteMutation.mutate(user.id);
  };

  const isEditFormValid =
    editForm.name.trim().length > 0 &&
    (editingUser?.role === 'operator'
      ? editForm.pin.length === 0 || editForm.pin.length === 4
      : editForm.email.length > 0 && (editForm.password.length === 0 || editForm.password.length >= 6));

  const isFormValid =
    form.name.trim().length > 0 &&
    (form.role === 'operator' ? form.pin.length === 4 : form.email.length > 0 && form.password.length >= 6);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Usuários</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => {
            createMutation.reset();
            setDialogOpen(true);
          }}
        >
          Novo Usuário
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {isLoading ? (
          <LoadingState />
        ) : users?.length === 0 ? (
          <EmptyState message="Nenhum usuário cadastrado ainda." />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Perfil</TableCell>
                <TableCell>Contato</TableCell>
                {isAdmin && <TableCell>Máx. aparelhos</TableCell>}
                <TableCell>Ativo</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{user.name}</TableCell>
                  <TableCell>{ROLE_LABELS[user.role]}</TableCell>
                  <TableCell>{user.email ?? '—'}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        sx={{ width: 80 }}
                        value={user.maxDevices}
                        inputProps={{ min: 1 }}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          if (value >= 1) maxDevicesMutation.mutate({ id: user.id, maxDevices: value });
                        }}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Switch
                      checked={user.active}
                      onChange={(event) => toggleActiveMutation.mutate({ id: user.id, active: event.target.checked })}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {isAdmin && (
                      <Button size="small" onClick={() => setDevicesUser(user)}>
                        Ver aparelhos
                      </Button>
                    )}
                    {user.role === 'operator' && (
                      <Button size="small" onClick={() => setLastChecklistUser(user)}>
                        Último checklist
                      </Button>
                    )}
                    <IconButton size="small" onClick={() => handleOpenEdit(user)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(user)} disabled={deleteMutation.isPending}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>Novo Usuário</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {createMutation.isError && <Alert severity="error">{getUserMutationErrorMessage(createMutation.error)}</Alert>}
            <TextField
              label="Nome"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <TextField
              select
              label="Perfil"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value as CreatableRole })}
            >
              <MenuItem value="operator">Operador</MenuItem>
              <MenuItem value="manager">Gestor</MenuItem>
            </TextField>

            {form.role === 'operator' ? (
              <TextField
                label="PIN (4 dígitos)"
                required
                value={form.pin}
                onChange={(event) => setForm({ ...form, pin: event.target.value.replace(/\D/g, '').slice(0, 4) })}
              />
            ) : (
              <>
                <TextField
                  label="Email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
                <TextField
                  label="Senha (mín. 6 caracteres)"
                  type="password"
                  required
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                />
              </>
            )}

            {isAdmin && (
              <TextField
                label="Máx. de aparelhos"
                type="number"
                inputProps={{ min: 1 }}
                value={form.maxDevices}
                onChange={(event) => setForm({ ...form, maxDevices: Math.max(1, Number(event.target.value)) })}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={!isFormValid || createMutation.isPending}>
              Salvar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(editingUser)} onClose={handleCloseEditDialog} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleEditSubmit}>
          <DialogTitle>Editar Usuário — {editingUser?.name}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {editMutation.isError && <Alert severity="error">{getUserMutationErrorMessage(editMutation.error)}</Alert>}
            <TextField
              label="Nome"
              required
              value={editForm.name}
              onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
            />

            {editingUser?.role === 'operator' ? (
              <TextField
                label="Novo PIN (deixe em branco pra manter)"
                value={editForm.pin}
                onChange={(event) => setEditForm({ ...editForm, pin: event.target.value.replace(/\D/g, '').slice(0, 4) })}
              />
            ) : (
              <>
                <TextField
                  label="Email"
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(event) => setEditForm({ ...editForm, email: event.target.value })}
                />
                <TextField
                  label="Nova senha (deixe em branco pra manter)"
                  type="password"
                  value={editForm.password}
                  onChange={(event) => setEditForm({ ...editForm, password: event.target.value })}
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditDialog}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={!isEditFormValid || editMutation.isPending}>
              Salvar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {isAdmin && (
        <UserDevicesDialog
          userId={devicesUser?.id ?? null}
          userName={devicesUser?.name ?? ''}
          onClose={() => setDevicesUser(null)}
        />
      )}

      <Dialog open={Boolean(lastChecklistUser)} onClose={() => setLastChecklistUser(null)} fullWidth maxWidth="xs">
        <DialogTitle>Último checklist — {lastChecklistUser?.name}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {loadingLastChecklist ? (
            <LoadingState />
          ) : !lastChecklistReport?.executions.length ? (
            <EmptyState message="Nenhum checklist enviado por esse operador ainda." />
          ) : (
            (() => {
              const last = lastChecklistReport.executions[0];
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography>
                    <strong>Veículo:</strong> {last.vehicle?.name ?? last.vehicleId}
                  </Typography>
                  <Typography>
                    <strong>Iniciado em:</strong> {new Date(last.startedAt).toLocaleString('pt-BR')}
                  </Typography>
                  <Typography>
                    <strong>Enviado em:</strong>{' '}
                    {last.syncedAt
                      ? new Date(last.syncedAt).toLocaleString('pt-BR')
                      : last.status === 'in_progress'
                        ? 'Ainda em andamento'
                        : 'Aguardando confirmação de envio'}
                  </Typography>
                </Box>
              );
            })()
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLastChecklistUser(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
