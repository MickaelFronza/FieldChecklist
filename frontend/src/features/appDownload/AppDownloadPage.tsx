import { Box, Button, Paper, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import AndroidIcon from '@mui/icons-material/Android';
import { EmptyState } from '@/components/common/EmptyState';

const APK_DOWNLOAD_URL = import.meta.env.VITE_APK_DOWNLOAD_URL as string | undefined;

export function AppDownloadPage() {
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Baixar App
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Peça para o operador escanear o QR code abaixo com a câmera do celular para baixar e instalar o app do
        checklist, já configurado para este servidor.
      </Typography>

      <Paper variant="outlined" sx={{ p: 4, maxWidth: 420 }}>
        {APK_DOWNLOAD_URL ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <QRCodeSVG value={APK_DOWNLOAD_URL} size={220} level="M" />
            <Button
              variant="contained"
              fullWidth
              startIcon={<AndroidIcon />}
              href={APK_DOWNLOAD_URL}
              target="_blank"
              rel="noopener"
            >
              Baixar App
            </Button>
          </Box>
        ) : (
          <EmptyState message="O link de download do app ainda não foi configurado para este servidor." />
        )}
      </Paper>
    </Box>
  );
}
