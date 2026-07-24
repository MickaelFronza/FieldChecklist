import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { fetchVehicleTypes } from '@/features/vehicleTypes/api';
import { ManageVehicleTypesDialog } from '@/components/common/ManageVehicleTypesDialog';
import type { TemplateItemInput } from './api';

const EMPTY_ITEM: TemplateItemInput = {
  title: '',
  description: '',
  photoRequired: true,
  isBlocking: true,
  category: '',
};

export interface TemplateFormValues {
  name: string;
  vehicleType: string;
  items: TemplateItemInput[];
}

interface TemplateFormDialogProps {
  open: boolean;
  title: string;
  submitLabel: string;
  initialValues?: TemplateFormValues;
  submitting: boolean;
  errorMessage?: string;
  onClose: () => void;
  onSubmit: (values: TemplateFormValues) => void;
}

export function TemplateFormDialog({
  open,
  title,
  submitLabel,
  initialValues,
  submitting,
  errorMessage,
  onClose,
  onSubmit,
}: TemplateFormDialogProps) {
  const [name, setName] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [items, setItems] = useState<TemplateItemInput[]>([{ ...EMPTY_ITEM }]);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);

  const { data: vehicleTypes } = useQuery({ queryKey: ['vehicle-types'], queryFn: fetchVehicleTypes });
  // mesma logica de fallback do cadastro de Veiculo - se o tipo salvo nesse
  // template ja foi excluido da lista gerenciada, ainda precisa aparecer
  // como opcao aqui pra nao quebrar o Select
  const typeOptions =
    vehicleType && !vehicleTypes?.some((type) => type.name === vehicleType)
      ? [{ id: 'current', name: vehicleType }, ...(vehicleTypes ?? [])]
      : (vehicleTypes ?? []);

  useEffect(() => {
    if (!open) return;
    setName(initialValues?.name ?? '');
    setVehicleType(initialValues?.vehicleType ?? '');
    setItems(initialValues?.items.length ? initialValues.items.map((item) => ({ ...item })) : [{ ...EMPTY_ITEM }]);
  }, [open, initialValues]);

  const updateItem = (index: number, patch: Partial<TemplateItemInput>) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index: number) => {
    setItems((current) => current.filter((_, i) => i !== index));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({ name, vehicleType, items });
  };

  const isValid = name.trim().length > 0 && items.length > 0 && items.every((item) => item.title.trim().length > 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          <TextField label="Nome do Template" required value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            select
            label="Tipo de Veículo"
            helperText="Vazio = aplica pra todos os tipos"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            {typeOptions.map((type) => (
              <MenuItem key={type.id} value={type.name}>
                {type.name}
              </MenuItem>
            ))}
          </TextField>
          <Button size="small" onClick={() => setManageTypesOpen(true)} sx={{ alignSelf: 'flex-start', mt: -1 }}>
            Gerenciar tipos
          </Button>

          <Divider />
          <Typography variant="subtitle2">Itens do Checklist</Typography>

          {items.map((item, index) => (
            <Box key={index} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  label="Título"
                  required
                  fullWidth
                  size="small"
                  value={item.title}
                  onChange={(e) => updateItem(index, { title: e.target.value })}
                />
                <IconButton onClick={() => removeItem(index)} disabled={items.length === 1}>
                  <DeleteIcon />
                </IconButton>
              </Box>
              <TextField
                label="Descrição"
                fullWidth
                size="small"
                sx={{ mt: 1 }}
                value={item.description}
                onChange={(e) => updateItem(index, { description: e.target.value })}
              />
              <TextField
                label="Categoria"
                placeholder="Ambiental, Segurança, Mecânico..."
                size="small"
                sx={{ mt: 1 }}
                value={item.category}
                onChange={(e) => updateItem(index, { category: e.target.value })}
              />
              <Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={item.photoRequired}
                      onChange={(e) => updateItem(index, { photoRequired: e.target.checked })}
                    />
                  }
                  label="Foto obrigatória"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={item.isBlocking}
                      onChange={(e) => updateItem(index, { isBlocking: e.target.checked })}
                    />
                  }
                  label="Bloqueante"
                />
              </Box>
            </Box>
          ))}

          <Button startIcon={<AddIcon />} onClick={() => setItems((current) => [...current, { ...EMPTY_ITEM }])}>
            Adicionar Item
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={!isValid || submitting}>
            {submitLabel}
          </Button>
        </DialogActions>
      </Box>

      <ManageVehicleTypesDialog open={manageTypesOpen} onClose={() => setManageTypesOpen(false)} />
    </Dialog>
  );
}
