import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  FormControlLabel,
  Link,
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
import { fetchAppSettings, fetchDeviceMonitor, fetchMinioConsoleToken, updateAppSettings } from './api';
import { updateUserDevice } from '@/features/users/api';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export function DeviceMonitorPage() {
  const queryClient = useQueryClient();
  const [showMinioConsole, setShowMinioConsole] = useState(false);
  const { data: devices, isLoading } = useQuery({ queryKey: ['admin', 'devices'], queryFn: fetchDeviceMonitor });
  // token de vida curta (5min), com escopo so pra essa rota - buscado na hora
  // de abrir o console, nao reaproveita o access token normal na URL do
  // iframe (ver settings.controller.ts/getMinioConsoleToken)
  const { data: minioConsoleToken } = useQuery({
    queryKey: ['admin', 'minio-console-token'],
    queryFn: fetchMinioConsoleToken,
    enabled: showMinioConsole,
    staleTime: 4 * 60 * 1000,
  });
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: fetchAppSettings,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ userId, deviceId, active }: { userId: string; deviceId: string; active: boolean }) =>
      updateUserDevice(userId, deviceId, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'devices'] }),
  });

  const [capEnabled, setCapEnabled] = useState(false);
  const [capValue, setCapValue] = useState(10);

  const [morningStartHour, setMorningStartHour] = useState(0);
  const [afternoonStartHour, setAfternoonStartHour] = useState(12);
  const [nightStartHour, setNightStartHour] = useState(18);

  useEffect(() => {
    if (!settings) return;
    setCapEnabled(settings.maxTotalDevices != null);
    setCapValue(settings.maxTotalDevices ?? 10);
    setMorningStartHour(settings.morningStartHour);
    setAfternoonStartHour(settings.afternoonStartHour);
    setNightStartHour(settings.nightStartHour);
  }, [settings]);

  const settingsMutation = useMutation({
    mutationFn: () => updateAppSettings({ maxTotalDevices: capEnabled ? capValue : null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] }),
  });

  const shiftWindowsMutation = useMutation({
    mutationFn: () => updateAppSettings({ morningStartHour, afternoonStartHour, nightStartHour }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] }),
  });

  const activeTotal = devices?.filter((device) => device.active).length ?? 0;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Monitor de Aparelhos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Última localização conhecida (capturada na abertura do checklist) e último acesso de cada aparelho. Não há
        rastreamento contínuo em tempo real.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Limite total de aparelhos (toda a empresa)
        </Typography>
        {settingsLoading ? (
          <LoadingState />
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {activeTotal} aparelho{activeTotal === 1 ? '' : 's'} ativo{activeTotal === 1 ? '' : 's'} no momento.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={<Switch checked={capEnabled} onChange={(e) => setCapEnabled(e.target.checked)} />}
                label="Definir limite"
              />
              <TextField
                label="Máximo de aparelhos"
                type="number"
                size="small"
                disabled={!capEnabled}
                value={capValue}
                onChange={(e) => setCapValue(Math.max(1, Number(e.target.value)))}
                sx={{ width: 200 }}
              />
              <Button
                variant="contained"
                onClick={() => settingsMutation.mutate()}
                disabled={settingsMutation.isPending}
              >
                Salvar
              </Button>
            </Box>
          </>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Horários de turno (somente app mobile)
        </Typography>
        {settingsLoading ? (
          <LoadingState />
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Define em que hora do dia cada turno começa no app do operador. Não afeta o login web.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Início da manhã"
                type="number"
                size="small"
                value={morningStartHour}
                onChange={(e) => setMorningStartHour(Math.min(23, Math.max(0, Number(e.target.value))))}
                sx={{ width: 160 }}
              />
              <TextField
                label="Início da tarde"
                type="number"
                size="small"
                value={afternoonStartHour}
                onChange={(e) => setAfternoonStartHour(Math.min(23, Math.max(0, Number(e.target.value))))}
                sx={{ width: 160 }}
              />
              <TextField
                label="Início da noite"
                type="number"
                size="small"
                value={nightStartHour}
                onChange={(e) => setNightStartHour(Math.min(23, Math.max(0, Number(e.target.value))))}
                sx={{ width: 160 }}
              />
              <Button
                variant="contained"
                onClick={() => shiftWindowsMutation.mutate()}
                disabled={shiftWindowsMutation.isPending}
              >
                Salvar
              </Button>
            </Box>
          </>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Armazenamento de fotos (MinIO)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          O console de administração do MinIO não fica exposto direto na internet — esta tela abre um acesso
          interno via o próprio backend. No primeiro acesso é preciso logar manualmente no console.
        </Typography>
        {!showMinioConsole ? (
          <Button variant="outlined" onClick={() => setShowMinioConsole(true)}>
            Abrir console do MinIO
          </Button>
        ) : !minioConsoleToken ? (
          <LoadingState />
        ) : (
          <Box
            component="iframe"
            src={`${API_URL}/admin/minio-console/?token=${minioConsoleToken}`}
            sx={{ width: '100%', height: 600, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
          />
        )}
      </Paper>

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
                    <Switch
                      checked={device.active}
                      onChange={(event) =>
                        toggleMutation.mutate({
                          userId: device.user.id,
                          deviceId: device.deviceId,
                          active: event.target.checked,
                        })
                      }
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
