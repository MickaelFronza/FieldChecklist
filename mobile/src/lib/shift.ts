import { apiClient } from './apiClient';
import type { Shift } from '../types/api';

interface ShiftWindows {
  morningStartHour: number;
  afternoonStartHour: number;
  nightStartHour: number;
}

// mesmos valores que ja eram fixos no codigo - usados ate o app conseguir
// buscar a configuracao do admin pelo menos uma vez, e como fallback offline
const DEFAULT_SHIFT_WINDOWS: ShiftWindows = {
  morningStartHour: 0,
  afternoonStartHour: 12,
  nightStartHour: 18,
};

let cachedShiftWindows: ShiftWindows = DEFAULT_SHIFT_WINDOWS;

// best-effort: nunca bloqueia o app por causa de rede - se falhar, mantem o
// que ja estava em memoria (default na 1a chamada, ou o ultimo valor buscado
// com sucesso numa sessao anterior)
export async function refreshShiftWindows(): Promise<void> {
  try {
    const { data } = await apiClient.get<ShiftWindows>('/shift-windows');
    cachedShiftWindows = data;
  } catch {
    // offline ou erro - mantem o valor ja cacheado
  }
}

export function getCurrentShift(date: Date = new Date()): Shift {
  const hour = date.getHours();
  const { morningStartHour, afternoonStartHour, nightStartHour } = cachedShiftWindows;
  if (hour >= nightStartHour) return 'noite';
  if (hour >= afternoonStartHour) return 'tarde';
  if (hour >= morningStartHour) return 'manha';
  return 'noite';
}

export function todayISODate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export const SHIFT_LABELS: Record<Shift, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};
