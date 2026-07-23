import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { listPendingSyncExecutions } from '../db/executionsRepository';
import { useNetworkStore } from '../lib/network';
import { syncPendingExecutions } from './syncService';

const SYNC_TASK_NAME = 'field-checklist-background-sync';

TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  try {
    await syncPendingExecutions();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync();
  if (status !== BackgroundFetch.BackgroundFetchStatus.Available) return;

  const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME);
  if (!isRegistered) {
    // minimumInterval e so um pedido - o SO decide o intervalo real (>=15min),
    // por isso o loop de foreground abaixo e o caminho principal de sync
    await BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
}

const INITIAL_RETRY_DELAY_MS = 30_000;
const MAX_RETRY_DELAY_MS = 10 * 60 * 1000;

let currentDelayMs = INITIAL_RETRY_DELAY_MS;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

async function tick(): Promise<void> {
  if (useNetworkStore.getState().isOnline) {
    const before = await listPendingSyncExecutions();
    if (before.length > 0) {
      await syncPendingExecutions();
      const after = await listPendingSyncExecutions();
      currentDelayMs = after.length > 0 ? Math.min(currentDelayMs * 2, MAX_RETRY_DELAY_MS) : INITIAL_RETRY_DELAY_MS;
    }
  }
  retryTimer = setTimeout(tick, currentDelayMs);
}

export function initForegroundSyncLoop(): () => void {
  tick();

  const unsubscribe = useNetworkStore.subscribe((state, prevState) => {
    if (state.isOnline && !prevState.isOnline) {
      currentDelayMs = INITIAL_RETRY_DELAY_MS;
      if (retryTimer) clearTimeout(retryTimer);
      tick();
    }
  });

  return () => {
    unsubscribe();
    if (retryTimer) clearTimeout(retryTimer);
  };
}
