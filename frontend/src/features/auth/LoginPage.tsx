import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Autocomplete, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { useLogin, useLoginOptions } from './useLogin';
import type { LoginOption } from '@/types/api';

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
        bgcolor: 'grey.100',
      }}
    >
      <Paper component="form" onSubmit={handleSubmit} sx={{ p: 4, width: 360 }}>
        <Typography variant="h5" gutterBottom>
          Field Checklist
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Painel do Gestor/Admin
        </Typography>

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
            PIN invalido ou usuario bloqueado. Tente novamente.
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
