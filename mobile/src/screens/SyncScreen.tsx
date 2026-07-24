import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useChecklistStore } from '../stores/checklistStore';
import { useAuthStore } from '../stores/authStore';
import { useNetworkStore } from '../lib/network';
import { disconnectSocket } from '../lib/socketClient';
import {
  getExecutionById,
  getTodayExecutionsForOperator,
  type TodayExecutionSummary,
} from '../db/executionsRepository';
import { syncPendingExecutions } from '../services/syncService';
import { SHIFT_LABELS, todayISODate } from '../lib/shift';
import { colors, radius, shadow, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Sync'>;

type SyncState = 'syncing' | 'done' | 'failed';

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'Em andamento',
  completed: 'Concluído',
  incomplete: 'Incompleto',
};

export function SyncScreen({ navigation }: Props) {
  const { execution, reset } = useChecklistStore();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isOnline = useNetworkStore((state) => state.isOnline);
  const [state, setState] = useState<SyncState>('syncing');
  const [retrying, setRetrying] = useState(false);
  const [todayExecutions, setTodayExecutions] = useState<TodayExecutionSummary[]>([]);

  const checkStatus = useCallback(async () => {
    if (!execution) return;
    const row = await getExecutionById(execution.id);
    if (!row) {
      setState('done');
    } else if (row.sync_status === 'failed') {
      setState('failed');
    } else {
      setState('syncing');
    }
  }, [execution]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  useEffect(() => {
    if (state !== 'done' || !user) return;
    getTodayExecutionsForOperator(user.id, todayISODate()).then(setTodayExecutions);
  }, [state, user]);

  const handleRetry = async () => {
    setRetrying(true);
    setState('syncing');
    await syncPendingExecutions().catch(() => {});
    await checkStatus();
    setRetrying(false);
  };

  const handleNewChecklist = () => {
    reset();
    navigation.reset({ index: 0, routes: [{ name: 'VehicleSelection' }] });
  };

  const handleExitApp = () => {
    reset();
    disconnectSocket();
    logout();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.statusBadge, isOnline ? styles.online : styles.offline]}>
        <Text style={styles.statusBadgeText}>{isOnline ? 'Online' : 'Offline'}</Text>
      </View>

      {state === 'syncing' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.message}>
            {isOnline ? 'Enviando checklist...' : 'Sem internet no momento. O checklist está salvo e será enviado automaticamente assim que a conexão voltar.'}
          </Text>
        </View>
      )}

      {state === 'done' && (
        <View style={styles.doneContainer}>
          <View style={styles.doneHeader}>
            <View style={styles.successBadge}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.message}>Checklist enviado com sucesso!</Text>
          </View>

          {todayExecutions.length > 0 && (
            <>
              <Text style={styles.todayTitle}>Checklists de hoje</Text>
              <FlatList
                data={todayExecutions}
                keyExtractor={(item) => item.id}
                style={styles.todayList}
                renderItem={({ item }) => (
                  <View style={styles.todayRow}>
                    <Text style={styles.todayRowVehicle}>{item.vehicleName}</Text>
                    <Text style={styles.todayRowInfo}>
                      {SHIFT_LABELS[item.shift]} · {STATUS_LABELS[item.status] ?? item.status}
                    </Text>
                  </View>
                )}
              />
            </>
          )}

          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.7} onPress={handleNewChecklist}>
            <Text style={styles.primaryButtonText}>Novo Checklist</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.7} onPress={handleExitApp}>
            <Text style={styles.secondaryButtonText}>Sair</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === 'failed' && (
        <View style={styles.center}>
          <View style={styles.errorBadge}>
            <Text style={styles.errorIcon}>!</Text>
          </View>
          <Text style={styles.message}>Não foi possível enviar agora. Tente novamente.</Text>
          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.7} disabled={retrying} onPress={handleRetry}>
            <Text style={styles.primaryButtonText}>{retrying ? 'Tentando...' : 'Tentar Novamente'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xxl, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    marginTop: 40,
  },
  online: { backgroundColor: colors.primaryLight },
  offline: { backgroundColor: colors.border },
  statusBadgeText: { fontWeight: '600', color: colors.textPrimary },
  message: { fontSize: 18, textAlign: 'center', marginTop: spacing.xl, marginBottom: spacing.xxl, color: colors.textPrimary },
  successBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: { fontSize: 48, color: colors.primary, fontWeight: '700' },
  doneContainer: { flex: 1, paddingTop: spacing.xl },
  doneHeader: { alignItems: 'center' },
  todayTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  todayList: { flexGrow: 0, maxHeight: 220, marginBottom: spacing.lg },
  todayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
  todayRowVehicle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  todayRowInfo: { fontSize: 13, color: colors.textSecondary },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  secondaryButtonText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  errorBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIcon: { fontSize: 48, color: colors.error, fontWeight: '700' },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: radius.md,
    ...shadow.button,
  },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
