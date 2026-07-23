import { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useChecklistStore } from '../stores/checklistStore';
import { markExecutionCompleted } from '../db/executionsRepository';
import { syncPendingExecutions } from '../services/syncService';
import { colors, radius, shadow, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { ExecutionItemStatus } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Summary'>;

const STATUS_LABELS: Record<ExecutionItemStatus, { label: string; color: string }> = {
  ok: { label: 'OK', color: colors.primary },
  non_conformant: { label: 'Não Conforme', color: colors.error },
  not_applicable: { label: 'Não Aplicável', color: colors.textSecondary },
  pending: { label: 'Pendente', color: colors.warning },
};

export function SummaryScreen({ navigation }: Props) {
  const { template, items, execution } = useChecklistStore();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!execution) return;
    setSubmitting(true);
    await markExecutionCompleted(execution.id, new Date().toISOString());
    navigation.replace('Sync');
    // dispara uma tentativa imediata; se estiver offline, o loop de retry
    // em background assume dali pra frente
    syncPendingExecutions().catch(() => {});
  };

  const allAnswered = template?.items.every((templateItem) => {
    const item = items.find((i) => i.template_item_id === templateItem.id);
    return item && item.status !== 'pending';
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resumo do Checklist</Text>

      <FlatList
        data={template?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item: templateItem }) => {
          const executionItem = items.find((i) => i.template_item_id === templateItem.id);
          const status = executionItem?.status ?? 'pending';
          const config = STATUS_LABELS[status];
          return (
            <View style={styles.row}>
              <Text style={styles.rowTitle}>{templateItem.title}</Text>
              <Text style={[styles.rowStatus, { color: config.color }]}>{config.label}</Text>
            </View>
          );
        }}
      />

      <TouchableOpacity
        style={[styles.submitButton, (!allAnswered || submitting) && styles.disabledButton]}
        activeOpacity={0.7}
        disabled={!allAnswered || submitting}
        onPress={handleSubmit}
      >
        <Text style={styles.submitButtonText}>{submitting ? 'Enviando...' : 'Enviar'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, paddingTop: 56, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '700', marginBottom: spacing.xl, textAlign: 'center', color: colors.textPrimary },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
  rowTitle: { fontSize: 16, flex: 1, paddingRight: spacing.md, color: colors.textPrimary },
  rowStatus: { fontSize: 15, fontWeight: '700' },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 20,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadow.button,
  },
  submitButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  disabledButton: { opacity: 0.4, shadowOpacity: 0, elevation: 0 },
});
