import { Request, Response } from 'express';
import { z } from 'zod';
import { AppSettings } from '../models';
import { asyncHandler } from '../utils/asyncHandler';

const SETTINGS_ID = 1;

async function getOrCreateSettings(): Promise<AppSettings> {
  const [settings] = await AppSettings.findOrCreate({
    where: { id: SETTINGS_ID },
    defaults: { id: SETTINGS_ID, maxTotalDevices: null },
  });
  return settings;
}

export const getAppSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getOrCreateSettings();
  res.json({
    maxTotalDevices: settings.maxTotalDevices,
    morningStartHour: settings.morningStartHour,
    afternoonStartHour: settings.afternoonStartHour,
    nightStartHour: settings.nightStartHour,
  });
});

const updateSettingsSchema = z.object({
  maxTotalDevices: z.number().int().min(1).nullable().optional(),
  morningStartHour: z.number().int().min(0).max(23).optional(),
  afternoonStartHour: z.number().int().min(0).max(23).optional(),
  nightStartHour: z.number().int().min(0).max(23).optional(),
});

export const updateAppSettings = asyncHandler(async (req: Request, res: Response) => {
  const data = updateSettingsSchema.parse(req.body);
  const settings = await getOrCreateSettings();
  await settings.update(data);
  res.json({
    maxTotalDevices: settings.maxTotalDevices,
    morningStartHour: settings.morningStartHour,
    afternoonStartHour: settings.afternoonStartHour,
    nightStartHour: settings.nightStartHour,
  });
});

// endpoint de baixo privilegio (qualquer usuario autenticado, inclusive
// operador via PIN) - so os horarios de turno, sem o resto de /admin/settings
// que e admin-only
export const getShiftWindows = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getOrCreateSettings();
  res.json({
    morningStartHour: settings.morningStartHour,
    afternoonStartHour: settings.afternoonStartHour,
    nightStartHour: settings.nightStartHour,
  });
});
