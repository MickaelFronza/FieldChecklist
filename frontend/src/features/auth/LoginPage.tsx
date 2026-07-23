import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { Alert, Autocomplete, Avatar, Box, Button, Paper, TextField, Typography } from '@mui/material';
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl';
import { useLogin, useLoginOptions } from './useLogin';
import type { LoginOption } from '@/types/api';

function getLoginErrorMessage(error: unknown): string {
  if (isAxiosError<{ error?: string }>(error) && error.response?.data?.error) {
    return error.response.data.error;
  }
  return 'PIN invalido ou usuario bloqueado. Tente novamente.';
}

export function LoginPage() {
  const navigate = useNavigate();
  const { data: options, isLoading: loadingOptions } = useLoginOptions();
  const loginMutation = useLogin();
  const [selectedUser, setSelectedUser] = useState<LoginOption | null>(null);
  const [pin, setPin] = useState('');

  const staffOptions = (options ?? []).filter((option) => option.role !== 'operator');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedUser) return;

    loginMutation.mutate(
      { nameId: selectedUser.id, pin },
      { onSuccess: () => navigate('/executions', { replace: true }) },
    );
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #E8F5E9 0%, #FAFAFA 55%)',
      }}
    >
      <Paper component="form" onSubmit={handleSubmit} elevation={3} sx={{ p: 4, width: 360, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, mb: 1.5 }}>
            <ChecklistRtlIcon fontSize="large" />
          </Avatar>
          <Typography variant="h5" gutterBottom>
            Field Checklist
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Painel do Gestor/Admin
          </Typography>
        </Box>

        <Autocomplete
          sx={{ mt: 3 }}
          options={staffOptions}
          loading={loadingOptions}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          value={selectedUser}
          onChange={(_, value) => setSelectedUser(value)}
          renderInput={(params) => <TextField {...params} label="Nome" required />}
        />

        <TextField
          sx={{ mt: 2 }}
          fullWidth
          label="PIN"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
          required
        />

        {loginMutation.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {getLoginErrorMessage(loginMutation.error)}
          </Alert>
        )}

        <Button
          sx={{ mt: 3 }}
          type="submit"
          variant="contained"
          fullWidth
          disabled={!selectedUser || pin.length !== 4 || loginMutation.isPending}
        >
          {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
        </Button>
      </Paper>
    </Box>
  );
}
