import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useChecklistStore } from '../stores/checklistStore';
import { useNetworkStore } from '../lib/network';
import { getExecutionById } from '../db/executionsRepository';
import { syncPendingExecutions } from '../services/syncService';
import { colors, radius, shadow, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Sync'>;

type SyncState = 'syncing' | 'done' | 'failed';

export function SyncScreen({ navigation }: Props) {
  const { execution, reset } = useChecklistStore();
  const isOnline = useNetworkStore((state) => state.isOnline);
  const [state, setState] = useState<SyncState>('syncing');
  const [retrying, setRetrying] = useState(false);

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
        <View style={styles.center}>
          <View style={styles.successBadge}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.message}>Checklist enviado com sucesso!</Text>
          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.7} onPress={handleNewChecklist}>
            <Text style={styles.primaryButtonText}>Novo Checklist</Text>
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
