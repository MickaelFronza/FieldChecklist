import { useEffect, useState, type ReactElement } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Chip,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Toolbar,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BarChartIcon from '@mui/icons-material/BarChart';
import ChecklistIcon from '@mui/icons-material/Checklist';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import PeopleIcon from '@mui/icons-material/People';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { connectSocket, disconnectSocket } from '@/lib/socketClient';
import type { UserRole } from '@/types/api';

const DRAWER_WIDTH = 220;

interface NavItem {
  label: string;
  path: string;
  icon: ReactElement;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Execuções', path: '/executions', icon: <AssignmentIcon />, roles: ['admin', 'manager'] },
  { label: 'Relatórios', path: '/reports', icon: <BarChartIcon />, roles: ['admin', 'manager'] },
  { label: 'Templates', path: '/templates', icon: <ChecklistIcon />, roles: ['admin'] },
  { label: 'Máquinas', path: '/machines', icon: <AgricultureIcon />, roles: ['admin'] },
  { label: 'Usuários', path: '/users', icon: <PeopleIcon />, roles: ['admin'] },
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, accessToken, logout } = useAuthStore();
  const [connected, setConnected] = useState(false);
  const [alert, setAlert] = useState<{ message: string; severity: 'warning' | 'error' } | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const socket = connectSocket(accessToken);

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleExecutionCompleted = () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] });
    };
    const handleExecutionAlert = () => {
      setAlert({ message: 'Item não conforme registrado em um checklist!', severity: 'error' });
      queryClient.invalidateQueries({ queryKey: ['executions'] });
    };
    const handleOperatorLate = (payload: { name: string }) => {
      setAlert({ message: `Operador ${payload.name} ainda não iniciou o checklist de hoje.`, severity: 'warning' });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('execution:completed', handleExecutionCompleted);
    socket.on('execution:alert', handleExecutionAlert);
    socket.on('operator:late', handleOperatorLate);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('execution:completed', handleExecutionCompleted);
      socket.off('execution:alert', handleExecutionAlert);
      socket.off('operator:late', handleOperatorLate);
    };
  }, [accessToken, queryClient]);

  useEffect(() => () => disconnectSocket(), []);

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login', { replace: true });
  };

  const visibleNavItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, borderBottom: '1px solid', borderColor: 'primary.dark' }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Field Checklist
          </Typography>
          <Chip
            size="small"
            label={connected ? 'Online' : 'Offline'}
            color={connected ? 'success' : 'default'}
            variant="outlined"
            sx={{ color: 'white', borderColor: 'white' }}
          />
          <Typography variant="body2">{user?.name}</Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', borderRight: '1px solid', borderColor: 'divider' },
        }}
      >
        <Toolbar />
        <List sx={{ px: 1 }}>
          {visibleNavItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <ListItemButton
                key={item.path}
                component={NavLink}
                to={item.path}
                selected={isActive}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'primary.light',
                    color: 'primary.dark',
                    '& .MuiListItemIcon-root': { color: 'primary.dark' },
                  },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: isActive ? 700 : 400 }} />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>

      <Snackbar open={Boolean(alert)} autoHideDuration={6000} onClose={() => setAlert(null)}>
        {alert ? (
          <Alert severity={alert.severity} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
