import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { templatesRoutes } from './templates.routes';
import { vehiclesRoutes } from './vehicles.routes';
import { usersRoutes } from './users.routes';
import { executionsRoutes } from './executions.routes';
import { reportsRoutes } from './reports.routes';
import { syncRoutes } from './sync.routes';
import { adminRoutes } from './admin.routes';
import { settingsRoutes } from './settings.routes';

export const apiV1Router = Router();

apiV1Router.use('/auth', authRoutes);
apiV1Router.use(templatesRoutes);
apiV1Router.use(vehiclesRoutes);
apiV1Router.use(usersRoutes);
apiV1Router.use(executionsRoutes);
apiV1Router.use(reportsRoutes);
apiV1Router.use(syncRoutes);
apiV1Router.use(adminRoutes);
apiV1Router.use(settingsRoutes);
