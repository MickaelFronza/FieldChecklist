import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { Alert, Avatar, Box, Button, Paper, TextField, Typography } from '@mui/material';
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl';
import { useLogin } from './useLogin';

function getLoginErrorMessage(error: unknown): string {
  if (isAxiosError<{ error?: string }>(error) && error.response?.data?.error) {
    return error.response.data.error;
  }
  return 'Email ou senha inválidos. Tente novamente.';
}

export function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    loginMutation.mutate(
      { email, password },
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

        <TextField
          sx={{ mt: 3 }}
          fullWidth
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <TextField
          sx={{ mt: 2 }}
          fullWidth
          label="Senha"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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
          disabled={!email || !password || loginMutation.isPending}
        >
          {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
        </Button>
      </Paper>
    </Box>
  );
}
