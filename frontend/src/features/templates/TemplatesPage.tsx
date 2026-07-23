import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { createTemplate, fetchTemplates, updateTemplate } from './api';
import { TemplateFormDialog, type TemplateFormValues } from './TemplateFormDialog';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import type { ChecklistTemplate } from '@/types/api';

export function TemplatesPage() {
  const queryClient = useQueryClient();
  const { data: templates, isLoading } = useQuery({ queryKey: ['templates'], queryFn: fetchTemplates });

  const [createOpen, setCreateOpen] = useState(false);
  const [versioningTemplate, setVersioningTemplate] = useState<ChecklistTemplate | null>(null);

  const createMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setCreateOpen(false);
    },
  });

  const versionMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: TemplateFormValues }) =>
      updateTemplate(id, { name: values.name, items: values.items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setVersioningTemplate(null);
    },
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Templates de Checklist</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setCreateOpen(true)}>
          Novo Template
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {isLoading ? (
          <LoadingState />
        ) : templates?.length === 0 ? (
          <EmptyState message="Nenhum template cadastrado ainda." />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Tipo de Veículo</TableCell>
                <TableCell>Versão</TableCell>
                <TableCell>Itens</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates?.map((template) => (
                <TableRow key={template.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{template.name}</TableCell>
                  <TableCell>{template.vehicleType ?? 'Todos'}</TableCell>
                  <TableCell>v{template.version}</TableCell>
                  <TableCell>{template.items?.length ?? 0}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={template.active ? 'Ativo' : 'Substituído'}
                      color={template.active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {template.active && (
                      <Button size="small" onClick={() => setVersioningTemplate(template)}>
                        Nova Versão
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <TemplateFormDialog
        open={createOpen}
        title="Novo Template"
        submitLabel="Criar"
        submitting={createMutation.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={(values) =>
          createMutation.mutate({ name: values.name, vehicleType: values.vehicleType || undefined, items: values.items })
        }
      />

      <TemplateFormDialog
        open={Boolean(versioningTemplate)}
        title={`Nova Versão — ${versioningTemplate?.name ?? ''}`}
        submitLabel="Salvar Nova Versão"
        submitting={versionMutation.isPending}
        initialValues={
          versioningTemplate
            ? {
                name: versioningTemplate.name,
                vehicleType: versioningTemplate.vehicleType ?? '',
                items: (versioningTemplate.items ?? []).map((item) => ({
                  title: item.title,
                  description: item.description ?? '',
                  photoRequired: item.photoRequired,
                  isBlocking: item.isBlocking,
                  category: item.category ?? '',
                })),
              }
            : undefined
        }
        onClose={() => setVersioningTemplate(null)}
        onSubmit={(values) => {
          if (versioningTemplate) versionMutation.mutate({ id: versioningTemplate.id, values });
        }}
      />
    </Box>
  );
}
