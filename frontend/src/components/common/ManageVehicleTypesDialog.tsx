import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { createVehicleType, deleteVehicleType, fetchVehicleTypes, type VehicleType } from '@/features/vehicleTypes/api';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';

function getErrorMessage(error: unknown): string {
  if (isAxiosError<{ error?: string }>(error) && error.response?.data?.error) {
    return error.response.data.error;
  }
  return 'Não foi possível salvar. Tente novamente.';
}

interface ManageVehicleTypesDialogProps {
  open: boolean;
  onClose: () => void;
}

// compartilhado entre o cadastro de Veiculo e o de Template - os dois usam a
// mesma lista pra "Tipo" bater certinho entre os dois (ver vehicles.controller.ts
// e templates.controller.ts: o casamento e' por string exata)
export function ManageVehicleTypesDialog({ open, onClose }: ManageVehicleTypesDialogProps) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [deletingType, setDeletingType] = useState<VehicleType | null>(null);

  const { data: types, isLoading } = useQuery({
    queryKey: ['vehicle-types'],
    queryFn: fetchVehicleTypes,
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: createVehicleType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-types'] });
      setNewName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVehicleType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-types'] });
      setDeletingType(null);
    },
  });

  const handleAdd = () => {
    if (newName.trim().length === 0) return;
    createMutation.mutate(newName.trim());
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
        <DialogTitle>Gerenciar tipos de veículo</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {createMutation.isError && <Alert severity="error">{getErrorMessage(createMutation.error)}</Alert>}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Novo tipo"
              placeholder="Ex.: Trator"
              size="small"
              fullWidth
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Button variant="contained" onClick={handleAdd} disabled={createMutation.isPending}>
              Adicionar
            </Button>
          </Box>

          {isLoading ? (
            <LoadingState />
          ) : types?.length === 0 ? (
            <EmptyState message="Nenhum tipo cadastrado ainda." />
          ) : (
            <List dense>
              {types?.map((type) => (
                <ListItem
                  key={type.id}
                  secondaryAction={
                    <IconButton size="small" edge="end" onClick={() => setDeletingType(type)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemText primary={type.name} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deletingType)}
        title="Excluir tipo?"
        description={`"${deletingType?.name}" deixa de aparecer como opção pra novos cadastros. Veículos/templates que já usam esse tipo não são afetados.`}
        confirmLabel="Excluir"
        onCancel={() => setDeletingType(null)}
        onConfirm={() => deletingType && deleteMutation.mutate(deletingType.id)}
      />
    </>
  );
}
