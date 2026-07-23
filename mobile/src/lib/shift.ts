import type { Shift } from '../types/api';

export function getCurrentShift(date: Date = new Date()): Shift {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'night';
}

export function todayISODate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export const SHIFT_LABELS: Record<Shift, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  night: 'Noite',
};
