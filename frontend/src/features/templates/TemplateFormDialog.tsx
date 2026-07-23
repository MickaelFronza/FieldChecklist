import { useEffect, useState, type FormEvent } from 'react';
import {
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
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
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
  onClose: () => void;
  onSubmit: (values: TemplateFormValues) => void;
}

export function TemplateFormDialog({
  open,
  title,
  submitLabel,
  initialValues,
  submitting,
  onClose,
  onSubmit,
}: TemplateFormDialogProps) {
  const [name, setName] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [items, setItems] = useState<TemplateItemInput[]>([{ ...EMPTY_ITEM }]);

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
          <TextField label="Nome do Template" required value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            label="Tipo de Veículo"
            placeholder="Trator (vazio = todos)"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
          />

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
    </Dialog>
  );
}
