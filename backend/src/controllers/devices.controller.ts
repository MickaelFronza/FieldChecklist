import { Request, Response } from 'express';
import { ChecklistExecution, User, UserDevice } from '../models';
import { asyncHandler } from '../utils/asyncHandler';

// Monitor de Aparelhos (admin-only): mostra a ultima localizacao conhecida
// (capturada na abertura de um checklist) e o ultimo login de cada device.
// Sem rastreio continuo/presenca em tempo real - o mobile nao mantem
// conexao persistente, entao "visto por ultimo" e o dado honesto disponivel.
export const listDeviceMonitor = asyncHandler(async (_req: Request, res: Response) => {
  const devices = await UserDevice.findAll({
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'role'] }],
    order: [['lastSeenAt', 'DESC']],
  });

  const results = await Promise.all(
    devices.map(async (device) => {
      const lastExecution = await ChecklistExecution.findOne({
        where: { deviceId: device.deviceId },
        order: [['syncedAt', 'DESC']],
        attributes: ['startedLat', 'startedLng', 'startedAt', 'syncedAt'],
      });

      return {
        id: device.id,
        deviceId: device.deviceId,
        active: device.active,
        lastSeenAt: device.lastSeenAt,
        user: device.user,
        lastLocation:
          lastExecution && lastExecution.startedLat && lastExecution.startedLng
            ? { lat: lastExecution.startedLat, lng: lastExecution.startedLng, at: lastExecution.startedAt }
            : null,
      };
    }),
  );

  res.json(results);
});
