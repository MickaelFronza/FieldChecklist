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
import { createUser, fetchUsers, updateUser } from './api';
import { UserDevicesDialog } from './UserDevicesDialog';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import type { User, UserRole } from '@/types/api';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Gestor',
  operator: 'Operador',
};

export function UsersPage() {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [devicesUser, setDevicesUser] = useState<User | null>(null);
  const [form, setForm] = useState<{ name: string; pin: string; role: UserRole; maxDevices: number }>({
    name: '',
    pin: '',
    role: 'operator',
    maxDevices: 2,
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDialogOpen(false);
      setForm({ name: '', pin: '', role: 'operator', maxDevices: 2 });
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
                <TableCell>Máx. aparelhos</TableCell>
                <TableCell>Ativo</TableCell>
                <TableCell align="right">Aparelhos</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{user.name}</TableCell>
                  <TableCell>{ROLE_LABELS[user.role]}</TableCell>
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
                  <TableCell>
                    <Switch
                      checked={user.active}
                      onChange={(event) => toggleActiveMutation.mutate({ id: user.id, active: event.target.checked })}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setDevicesUser(user)}>
                      Ver aparelhos
                    </Button>
                  </TableCell>
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
              label="PIN (4 dígitos)"
              required
              value={form.pin}
              onChange={(event) => setForm({ ...form, pin: event.target.value.replace(/\D/g, '').slice(0, 4) })}
            />
            <TextField
              select
              label="Perfil"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}
            >
              <MenuItem value="operator">Operador</MenuItem>
              <MenuItem value="manager">Gestor</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </TextField>
            <TextField
              label="Máx. de aparelhos"
              type="number"
              inputProps={{ min: 1 }}
              value={form.maxDevices}
              onChange={(event) => setForm({ ...form, maxDevices: Math.max(1, Number(event.target.value)) })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={form.pin.length !== 4 || createMutation.isPending}>
              Salvar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <UserDevicesDialog
        userId={devicesUser?.id ?? null}
        userName={devicesUser?.name ?? ''}
        onClose={() => setDevicesUser(null)}
      />
    </Box>
  );
}
