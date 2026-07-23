import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { ExecutionsPage } from '@/features/executions/ExecutionsPage';
import { ExecutionDetailPage } from '@/features/executions/ExecutionDetailPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { TemplatesPage } from '@/features/templates/TemplatesPage';
import { MachinesPage } from '@/features/machines/MachinesPage';
import { UsersPage } from '@/features/users/UsersPage';
import { DeviceMonitorPage } from '@/features/devices/DeviceMonitorPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/executions" replace />} />
          <Route path="/executions" element={<ExecutionsPage />} />
          <Route path="/executions/:id" element={<ExecutionDetailPage />} />
          <Route path="/reports" element={<ReportsPage />} />

          <Route element={<ProtectedRoute allowedRoles={['admin', 'manager']} />}>
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/machines" element={<MachinesPage />} />
            <Route path="/users" element={<UsersPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/devices" element={<DeviceMonitorPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/executions" replace />} />
    </Routes>
  );
}
