import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiClient } from '../lib/apiClient';
import { useAuthStore } from '../stores/authStore';
import { useChecklistStore } from '../stores/checklistStore';
import { getCurrentShift, todayISODate } from '../lib/shift';
import { getDeviceId } from '../lib/deviceId';
import { generateUUID } from '../lib/uuid';
import { getCurrentLocation } from '../lib/location';
import { colors, radius, shadow, spacing } from '../theme';
import {
  cacheMachines,
  cacheTemplates,
  createExecution,
  findOpenExecution,
  getCachedMachines,
  getCachedTemplates,
  getExecutionItems,
  upsertExecutionItem,
  type ExecutionRow,
} from '../db/executionsRepository';
import type { ChecklistTemplate, Machine } from '../types/api';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'MachineSelection'>;

export function MachineSelectionScreen({ navigation }: Props) {
  const user = useAuthStore((state) => state.user);
  const startChecklist = useChecklistStore((state) => state.start);

  const [machines, setMachines] = useState<Machine[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingMachineId, setStartingMachineId] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  // useFocusEffect (nao useEffect) para buscar dados toda vez que a tela
  // ganha foco - inclui voltar de outra tela e o app retomar do background.
  // useEffect com deps [] so roda na 1a montagem, entao editar uma maquina
  // no painel web enquanto o operador ja estava nesta tela nunca refletia.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        if (!hasLoadedOnce.current) setLoading(true);
        try {
          const [machinesResponse, templatesResponse] = await Promise.all([
            apiClient.get<Machine[]>('/machines/active'),
            apiClient.get<ChecklistTemplate[]>('/templates/active'),
          ]);
          if (cancelled) return;
          setMachines(machinesResponse.data);
          setTemplates(templatesResponse.data);
          await cacheMachines(machinesResponse.data);
          await cacheTemplates(templatesResponse.data);
        } catch {
          if (cancelled) return;
          // offline: usa o que ja foi cacheado numa sessao anterior
          const [cachedMachines, cachedTemplates] = await Promise.all([getCachedMachines(), getCachedTemplates()]);
          if (cancelled) return;
          setMachines(cachedMachines);
          setTemplates(cachedTemplates);
          if (cachedMachines.length === 0) {
            setError('Sem conexão e sem dados salvos. Conecte-se à internet ao menos uma vez.');
          }
        } finally {
          if (!cancelled) {
            hasLoadedOnce.current = true;
            setLoading(false);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  const handleSelectMachine = async (machine: Machine) => {
    if (!user) return;
    setStartingMachineId(machine.id);
    setError(null);

    try {
      const shift = getCurrentShift();
      const today = todayISODate();

      const existing = await findOpenExecution(user.id, machine.id, shift, today);
      if (existing) {
        const items = await getExecutionItems(existing.id);
        const template = templates.find((t) => t.id === existing.template_id);
        if (!template) {
          setError('Template do checklist em andamento não foi encontrado.');
          return;
        }
        startChecklist({ execution: existing, template, machine, items });
        navigation.navigate('Checklist');
        return;
      }

      const template = templates.find((t) => t.machineType === machine.type) ?? templates.find((t) => !t.machineType);
      if (!template) {
        setError('Nenhum template de checklist disponível para esta máquina.');
        return;
      }

      const deviceId = await getDeviceId();
      // best-effort: nao bloqueia a abertura do checklist se a localizacao
      // for negada ou indisponivel (comum em campo)
      const location = await getCurrentLocation();
      const newExecution: ExecutionRow = {
        id: generateUUID(),
        template_id: template.id,
        machine_id: machine.id,
        operator_id: user.id,
        shift,
        status: 'in_progress',
        sync_status: 'local',
        sync_queue_id: null,
        started_at: new Date().toISOString(),
        completed_at: null,
        started_lat: location?.lat ?? null,
        started_lng: location?.lng ?? null,
        device_id: deviceId,
        app_version: Constants.expoConfig?.version ?? '1.0.0',
      };
      await createExecution(newExecution);

      for (const templateItem of template.items) {
        await upsertExecutionItem({
          id: generateUUID(),
          execution_id: newExecution.id,
          template_item_id: templateItem.id,
          status: 'pending',
          justification: null,
          photo_uri: null,
          photo_hash: null,
          marked_at: null,
        });
      }

      const items = await getExecutionItems(newExecution.id);
      startChecklist({ execution: newExecution, template, machine, items });
      navigation.navigate('Checklist');
    } finally {
      setStartingMachineId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Escolha a máquina</Text>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={machines}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{ gap: spacing.md }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.machineCard}
            activeOpacity={0.7}
            disabled={startingMachineId !== null}
            onPress={() => handleSelectMachine(item)}
          >
            {startingMachineId === item.id ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={styles.machineIcon}>🚜</Text>
                <Text style={styles.machineCode}>{item.code}</Text>
                <Text style={styles.machineName}>{item.name}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, paddingTop: 56, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', marginBottom: spacing.lg, textAlign: 'center', color: colors.textPrimary },
  errorText: { color: colors.error, textAlign: 'center', marginBottom: spacing.md, fontSize: 16 },
  machineCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  machineIcon: { fontSize: 32, marginBottom: spacing.xs },
  machineCode: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.xs },
  machineName: { fontSize: 18, fontWeight: '600', textAlign: 'center', color: colors.textPrimary },
});
