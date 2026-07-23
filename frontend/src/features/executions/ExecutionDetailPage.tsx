import { useParams, Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, Grid, Link, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { fetchExecutionDetail } from './api';
import { ExecutionStatusChip, ItemStatusChip } from '@/components/common/StatusChip';
import { SHIFT_LABEL } from '@/lib/shift';

export function ExecutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: execution, isLoading } = useQuery({
    queryKey: ['executions', id],
    queryFn: () => fetchExecutionDetail(id as string),
    enabled: Boolean(id),
  });

  if (isLoading || !execution) {
    return <Typography>Carregando...</Typography>;
  }

  return (
    <Box>
      <Link component={RouterLink} to="/executions" sx={{ display: 'inline-flex', alignItems: 'center', mb: 2 }}>
        <ArrowBackIcon fontSize="small" sx={{ mr: 0.5 }} /> Voltar
      </Link>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5">{execution.vehicle?.name ?? execution.vehicleId}</Typography>
            <ExecutionStatusChip status={execution.status} />
          </Box>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Operador
              </Typography>
              <Typography>{execution.operator?.name ?? execution.operatorId}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Turno
              </Typography>
              <Typography>{SHIFT_LABEL[execution.shift]}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Início
              </Typography>
              <Typography>{new Date(execution.startedAt).toLocaleString('pt-BR')}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Conclusão
              </Typography>
              <Typography>
                {execution.completedAt ? new Date(execution.completedAt).toLocaleString('pt-BR') : '—'}
              </Typography>
            </Grid>
            {execution.startedLat && execution.startedLng && (
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">
                  Localização
                </Typography>
                <Typography>
                  <Link
                    href={`https://www.google.com/maps?q=${execution.startedLat},${execution.startedLng}`}
                    target="_blank"
                    rel="noopener"
                  >
                    {Number(execution.startedLat).toFixed(5)}, {Number(execution.startedLng).toFixed(5)}
                  </Link>
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Itens do Checklist
      </Typography>

      <Grid container spacing={2}>
        {execution.items?.map((item) => (
          <Grid item xs={12} md={6} key={item.id}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="subtitle1">{item.templateItem?.title ?? item.templateItemId}</Typography>
                  <ItemStatusChip status={item.status} />
                </Box>
                {item.templateItem?.category && (
                  <Typography variant="caption" color="text.secondary">
                    {item.templateItem.category}
                  </Typography>
                )}
                {item.justification && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Justificativa: {item.justification}
                  </Typography>
                )}
                {item.photoUrl && (
                  <Box
                    component="a"
                    href={item.photoUrl}
                    target="_blank"
                    rel="noopener"
                    sx={{ display: 'block', mt: 1 }}
                  >
                    <Box
                      component="img"
                      src={item.photoUrl}
                      alt={item.templateItem?.title ?? 'Foto do item'}
                      sx={{
                        width: '100%',
                        maxHeight: 320,
                        objectFit: 'contain',
                        bgcolor: 'grey.100',
                        borderRadius: 1,
                        cursor: 'pointer',
                      }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {execution.items?.length === 0 && <Typography color="text.secondary">Nenhum item registrado.</Typography>}
    </Box>
  );
}
