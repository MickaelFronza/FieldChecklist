import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { sequelize } from './config/database';
import './models';
import { createSocketServer } from './sockets';

async function start(): Promise<void> {
  await sequelize.authenticate();
  console.log('Conectado ao banco de dados');

  const app = createApp();
  const httpServer = createServer(app);

  createSocketServer(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`API rodando na porta ${env.port}`);
  });
}

start().catch((err) => {
  console.error('Falha ao iniciar o servidor', err);
  process.exit(1);
});
