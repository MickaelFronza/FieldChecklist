import { create } from 'zustand';
import type { ChecklistTemplate, Vehicle } from '../types/api';
import type { ExecutionItemRow, ExecutionRow } from '../db/executionsRepository';

interface ChecklistState {
  execution: ExecutionRow | null;
  template: ChecklistTemplate | null;
  vehicle: Vehicle | null;
  items: ExecutionItemRow[];
  currentIndex: number;
  start: (params: {
    execution: ExecutionRow;
    template: ChecklistTemplate;
    vehicle: Vehicle;
    items: ExecutionItemRow[];
  }) => void;
  updateItem: (item: ExecutionItemRow) => void;
  goNext: () => void;
  reset: () => void;
}

export const useChecklistStore = create<ChecklistState>((set) => ({
  execution: null,
  template: null,
  vehicle: null,
  items: [],
  currentIndex: 0,

  start: ({ execution, template, vehicle, items }) => {
    // retoma no primeiro item ainda pendente, caso seja um checklist ja iniciado
    const firstPendingIndex = template.items.findIndex((templateItem) => {
      const item = items.find((i) => i.template_item_id === templateItem.id);
      return !item || item.status === 'pending';
    });

    set({
      execution,
      template,
      vehicle,
      items,
      currentIndex: firstPendingIndex === -1 ? 0 : firstPendingIndex,
    });
  },

  updateItem: (item) =>
    set((state) => ({
      items: state.items.some((i) => i.id === item.id)
        ? state.items.map((i) => (i.id === item.id ? item : i))
        : [...state.items, item],
    })),

  goNext: () => set((state) => ({ currentIndex: Math.min(state.currentIndex + 1, state.template!.items.length) })),

  reset: () => set({ execution: null, template: null, vehicle: null, items: [], currentIndex: 0 }),
}));
