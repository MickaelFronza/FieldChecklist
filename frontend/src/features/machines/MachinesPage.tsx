import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { createMachine, fetchMachines, updateMachine } from './api';

export function MachinesPage() {
  const queryClient = useQueryClient();
  const { data: machines, isLoading } = useQuery({ queryKey: ['machines'], queryFn: fetchMachines });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: '' });

  const createMutation = useMutation({
    mutationFn: createMachine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      setDialogOpen(false);
      setForm({ code: '', name: '', type: '' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateMachine(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['machines'] }),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Máquinas</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setDialogOpen(true)}>
          Nova Máquina
        </Button>
      </Box>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Código</TableCell>
            <TableCell>Nome</TableCell>
            <TableCell>Tipo</TableCell>
            <TableCell>Ativa</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={4}>Carregando...</TableCell>
            </TableRow>
          )}
          {machines?.map((machine) => (
            <TableRow key={machine.id}>
              <TableCell>{machine.code}</TableCell>
              <TableCell>{machine.name}</TableCell>
              <TableCell>{machine.type}</TableCell>
              <TableCell>
                <Switch
                  checked={machine.active}
                  onChange={(event) => toggleActiveMutation.mutate({ id: machine.id, active: event.target.checked })}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>Nova Máquina</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
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
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              Salvar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
