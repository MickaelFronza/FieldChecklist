import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiClient } from '../lib/apiClient';
import { connectSocket, disconnectSocket } from '../lib/socketClient';
import { useAuthStore } from '../stores/authStore';
import { useChecklistStore } from '../stores/checklistStore';
import { getCurrentShift, refreshShiftWindows, SHIFT_LABELS, todayISODate } from '../lib/shift';
import { getDeviceId } from '../lib/deviceId';
import { generateUUID } from '../lib/uuid';
import { getCurrentLocation } from '../lib/location';
import { colors, radius, shadow, spacing } from '../theme';
import {
  cacheVehicles,
  cacheTemplates,
  createExecution,
  findOpenExecution,
  getCachedVehicles,
  getCachedTemplates,
  getExecutionItems,
  upsertExecutionItem,
  type ExecutionRow,
} from '../db/executionsRepository';
import type { ChecklistTemplate, Vehicle } from '../types/api';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'VehicleSelection'>;

export function VehicleSelectionScreen({ navigation }: Props) {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const startChecklist = useChecklistStore((state) => state.start);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingVehicleId, setStartingVehicleId] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadVehicles = useCallback(async () => {
    if (!hasLoadedOnce.current) setLoading(true);
    refreshShiftWindows().catch(() => {});
    try {
      const [vehiclesResponse, templatesResponse] = await Promise.all([
        apiClient.get<Vehicle[]>('/vehicles/active'),
        apiClient.get<ChecklistTemplate[]>('/templates/active'),
      ]);
      if (!isMountedRef.current) return;
      setVehicles(vehiclesResponse.data);
      setTemplates(templatesResponse.data);
      await cacheVehicles(vehiclesResponse.data);
      await cacheTemplates(templatesResponse.data);
    } catch {
      if (!isMountedRef.current) return;
      // offline: usa o que ja foi cacheado numa sessao anterior
      const [cachedVehicles, cachedTemplates] = await Promise.all([getCachedVehicles(), getCachedTemplates()]);
      if (!isMountedRef.current) return;
      setVehicles(cachedVehicles);
      setTemplates(cachedTemplates);
      if (cachedVehicles.length === 0) {
        setError('Sem conexão e sem dados salvos. Conecte-se à internet ao menos uma vez.');
      }
    } finally {
      if (isMountedRef.current) {
        hasLoadedOnce.current = true;
        setLoading(false);
      }
    }
  }, []);

  // useFocusEffect (nao useEffect) para buscar dados toda vez que a tela
  // ganha foco - inclui voltar de outra tela e o app retomar do background.
  useFocusEffect(
    useCallback(() => {
      loadVehicles();
    }, [loadVehicles]),
  );

  // alem do refetch por foco, escuta o socket enquanto a tela esta montada -
  // sem isso, desativar um veiculo enquanto o operador ja esta olhando esta
  // tela (sem trocar de tela) nunca refletia ate o proximo foco
  useEffect(() => {
    if (!accessToken) return;

    const socket = connectSocket(accessToken);
    const handleVehicleDeactivated = () => {
      loadVehicles();
    };
    socket.on('vehicle:deactivated', handleVehicleDeactivated);

    return () => {
      socket.off('vehicle:deactivated', handleVehicleDeactivated);
      disconnectSocket();
    };
  }, [accessToken, loadVehicles]);

  const handleSelectVehicle = async (vehicle: Vehicle) => {
    if (!user) return;
    setStartingVehicleId(vehicle.id);
    setError(null);

    try {
      const shift = getCurrentShift();
      const today = todayISODate();

      const existing = await findOpenExecution(user.id, vehicle.id, shift, today);
      if (existing) {
        const items = await getExecutionItems(existing.id);
        const template = templates.find((t) => t.id === existing.template_id);
        if (!template) {
          setError('Template do checklist em andamento não foi encontrado.');
          return;
        }
        startChecklist({ execution: existing, template, vehicle, items });
        navigation.navigate('Checklist');
        return;
      }

      const template = templates.find((t) => t.vehicleType === vehicle.type) ?? templates.find((t) => !t.vehicleType);
      if (!template) {
        setError('Nenhum template de checklist disponível para este veículo.');
        return;
      }

      const deviceId = await getDeviceId();
      // best-effort: nao bloqueia a abertura do checklist se a localizacao
      // for negada ou indisponivel (comum em campo)
      const location = await getCurrentLocation();
      const newExecution: ExecutionRow = {
        id: generateUUID(),
        template_id: template.id,
        vehicle_id: vehicle.id,
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
      startChecklist({ execution: newExecution, template, vehicle, items });
      navigation.navigate('Checklist');
    } finally {
      setStartingVehicleId(null);
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
      <Text style={styles.title}>Escolha o veículo</Text>
      <Text style={styles.subtitle}>Turno atual: {SHIFT_LABELS[getCurrentShift()]}</Text>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{ gap: spacing.md }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.vehicleCard}
            activeOpacity={0.7}
            disabled={startingVehicleId !== null}
            onPress={() => handleSelectVehicle(item)}
          >
            {startingVehicleId === item.id ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={styles.vehicleIcon}>🚗</Text>
                <Text style={styles.vehicleCode}>{item.code}</Text>
                <Text style={styles.vehicleName}>{item.name}</Text>
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
  title: { fontSize: 26, fontWeight: '700', marginBottom: spacing.xs, textAlign: 'center', color: colors.textPrimary },
  subtitle: { fontSize: 14, marginBottom: spacing.lg, textAlign: 'center', color: colors.textSecondary },
  errorText: { color: colors.error, textAlign: 'center', marginBottom: spacing.md, fontSize: 16 },
  vehicleCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  vehicleIcon: { fontSize: 32, marginBottom: spacing.xs },
  vehicleCode: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.xs },
  vehicleName: { fontSize: 18, fontWeight: '600', textAlign: 'center', color: colors.textPrimary },
});
