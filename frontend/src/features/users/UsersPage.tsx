import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { createUser, fetchUsers, updateUser, type CreatableRole } from './api';
import { UserDevicesDialog } from './UserDevicesDialog';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuthStore } from '@/stores/authStore';
import type { User, UserRole } from '@/types/api';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Gestor',
  operator: 'Operador',
};

const EMPTY_FORM = {
  name: '',
  role: 'operator' as CreatableRole,
  pin: '',
  email: '',
  password: '',
  maxDevices: 2,
};

export function UsersPage() {
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');
  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [devicesUser, setDevicesUser] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate(form);
  };

  const isFormValid =
    form.name.trim().length > 0 &&
    (form.role === 'operator' ? form.pin.length === 4 : form.email.length > 0 && form.password.length >= 6);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Usuários</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setDialogOpen(true)}>
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
                {isAdmin && <TableCell align="right">Aparelhos</TableCell>}
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
                  {isAdmin && (
                    <TableCell align="right">
                      <Button size="small" onClick={() => setDevicesUser(user)}>
                        Ver aparelhos
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>Novo Usuário</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
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
            <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={!isFormValid || createMutation.isPending}>
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
    </Box>
  );
}
