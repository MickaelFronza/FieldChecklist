import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { fetchUserDevices, updateUserDevice } from './api';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';

interface UserDevicesDialogProps {
  userId: string | null;
  userName: string;
  onClose: () => void;
}

export function UserDevicesDialog({ userId, userName, onClose }: UserDevicesDialogProps) {
  const queryClient = useQueryClient();

  const { data: devices, isLoading } = useQuery({
    queryKey: ['users', userId, 'devices'],
    queryFn: () => fetchUserDevices(userId as string),
    enabled: Boolean(userId),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ deviceId, active }: { deviceId: string; active: boolean }) =>
      updateUserDevice(userId as string, deviceId, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', userId, 'devices'] }),
  });

  return (
    <Dialog open={Boolean(userId)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Aparelhos de {userName}</DialogTitle>
      <DialogContent>
        {isLoading ? (
          <LoadingState />
        ) : devices?.length === 0 ? (
          <EmptyState message="Nenhum aparelho registrado ainda." />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Device ID</TableCell>
                <TableCell>Primeiro acesso</TableCell>
                <TableCell>Último acesso</TableCell>
                <TableCell>Ativo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {devices?.map((device) => (
                <TableRow key={device.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {device.deviceId.slice(0, 16)}
                    {device.deviceId.length > 16 ? '…' : ''}
                  </TableCell>
                  <TableCell>{new Date(device.firstSeenAt).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>{new Date(device.lastSeenAt).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>
                    <Switch
                      checked={device.active}
                      onChange={(event) =>
                        toggleMutation.mutate({ deviceId: device.deviceId, active: event.target.checked })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Desative um aparelho pra liberar uma vaga e permitir login em um novo device.
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
