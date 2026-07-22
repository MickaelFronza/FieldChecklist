import { create } from 'zustand';

interface ExecutionFilters {
  date: string;
  machineId: string;
  operatorId: string;
  status: string;
}

interface ReportFiltersState {
  executionFilters: ExecutionFilters;
  setExecutionFilters: (filters: Partial<ExecutionFilters>) => void;
}

const today = new Date().toISOString().slice(0, 10);

export const useReportFiltersStore = create<ReportFiltersState>((set) => ({
  executionFilters: { date: today, machineId: '', operatorId: '', status: '' },
  setExecutionFilters: (filters) =>
    set((state) => ({ executionFilters: { ...state.executionFilters, ...filters } })),
}));
