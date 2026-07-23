import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import AndroidIcon from '@mui/icons-material/Android';
import { EmptyState } from '@/components/common/EmptyState';

const APK_DOWNLOAD_URL = import.meta.env.VITE_APK_DOWNLOAD_URL as string | undefined;

// domínios de exemplo/placeholder que nunca devem virar um QR real - se
// alguém copiar o valor de exemplo do eas.json sem substituir, isso evita
// gerar um QR que aponta pra um DNS que não existe
const PLACEHOLDER_HOST_PATTERNS = [/exemplo-cliente\.com/i, /substitua-pelo-dominio-do-cliente/i];

function isValidDownloadUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return !PLACEHOLDER_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname));
}

export function AppDownloadPage() {
  const isConfigured = Boolean(APK_DOWNLOAD_URL);
  const isValid = isConfigured && isValidDownloadUrl(APK_DOWNLOAD_URL as string);

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
        {isConfigured && !isValid ? (
          <Alert severity="warning">
            O link de download configurado (<code>VITE_APK_DOWNLOAD_URL</code>) parece inválido ou ainda é um valor
            de exemplo. Configure o link real de download do APK deste cliente antes de gerar o QR code.
          </Alert>
        ) : isValid ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <QRCodeSVG value={APK_DOWNLOAD_URL as string} size={220} level="M" />
            <Button
              variant="contained"
              fullWidth
              startIcon={<AndroidIcon />}
              href={APK_DOWNLOAD_URL as string}
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
