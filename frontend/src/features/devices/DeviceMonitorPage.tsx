import { useQuery } from '@tanstack/react-query';
import { Box, Chip, Link, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { fetchDeviceMonitor } from './api';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';

export function DeviceMonitorPage() {
  const { data: devices, isLoading } = useQuery({ queryKey: ['admin', 'devices'], queryFn: fetchDeviceMonitor });

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Monitor de Aparelhos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Última localização conhecida (capturada na abertura do checklist) e último acesso de cada aparelho. Não há
        rastreamento contínuo em tempo real.
      </Typography>

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {isLoading ? (
          <LoadingState />
        ) : devices?.length === 0 ? (
          <EmptyState message="Nenhum aparelho registrado ainda." />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Usuário</TableCell>
                <TableCell>Perfil</TableCell>
                <TableCell>Device ID</TableCell>
                <TableCell>Ativo</TableCell>
                <TableCell>Visto por último</TableCell>
                <TableCell>Última localização</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {devices?.map((device) => (
                <TableRow key={device.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{device.user.name}</TableCell>
                  <TableCell>{device.user.role}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {device.deviceId.slice(0, 16)}
                    {device.deviceId.length > 16 ? '…' : ''}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={device.active ? 'Ativo' : 'Revogado'}
                      color={device.active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{new Date(device.lastSeenAt).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>
                    {device.lastLocation ? (
                      <Link
                        href={`https://www.google.com/maps?q=${device.lastLocation.lat},${device.lastLocation.lng}`}
                        target="_blank"
                        rel="noopener"
                      >
                        {new Date(device.lastLocation.at).toLocaleString('pt-BR')}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}
