import { Box, Paper, Typography } from '@mui/material';

interface StatTileProps {
  label: string;
  value: number;
  color?: 'success.main' | 'warning.main' | 'error.main' | 'text.primary';
}

export function StatTile({ label, value, color = 'text.primary' }: StatTileProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2, minWidth: 160 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ typography: 'h3', fontWeight: 600, color, lineHeight: 1.2 }}>{value}</Box>
    </Paper>
  );
}
