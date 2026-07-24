import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
import type { ChecklistTemplate, FuelLevel, Vehicle, VehicleCategory } from '../types/api';
import type { RootStackParamList } from '../navigation/RootNavigator';

// mesmo mapeamento do painel web (VehiclesPage.tsx) - decidido junto com o
// campo "category" do veiculo, separado do "type" livre usado pra casar com
// os Templates
const CATEGORY_ICONS: Record<VehicleCategory, string> = {
  carro: '🚗',
  onibus: '🚌',
  navio: '🚢',
  caminhao: '🚚',
  trator: '🚜',
  moto: '🏍️',
  outro: '📦',
};

const FUEL_OPTIONS: { value: FuelLevel; label: string }[] = [
  { value: 'vazio', label: 'Vazio' },
  { value: 'quarto', label: '1/4' },
  { value: 'metade', label: '1/2' },
  { value: 'tres_quartos', label: '3/4' },
  { value: 'cheio', label: 'Cheio' },
];

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
  const [startModal, setStartModal] = useState<{ vehicle: Vehicle; template: ChecklistTemplate } | null>(null);
  const [odometerInput, setOdometerInput] = useState('');
  const [fuelLevel, setFuelLevel] = useState<FuelLevel | null>(null);
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
  // sem isso, criar/editar/desativar um veiculo (ou mudar quem e responsavel
  // por ele) enquanto o operador ja esta olhando essa tela (sem trocar de
  // tela, ou pior, precisando fechar e reabrir o app) nunca refletia
  useEffect(() => {
    if (!accessToken) return;

    const socket = connectSocket(accessToken);
    const handleVehicleChanged = () => {
      loadVehicles();
    };
    socket.on('vehicle:changed', handleVehicleChanged);

    return () => {
      socket.off('vehicle:changed', handleVehicleChanged);
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
        // replace (nao navigate) - sem isso dava pra voltar (gesto/hardware
        // back) pra essa tela e reabrir o checklist, deixando responder itens
        // ja confirmados de novo
        navigation.replace('Checklist');
        return;
      }

      const template = templates.find((t) => t.vehicleType === vehicle.type) ?? templates.find((t) => !t.vehicleType);
      if (!template) {
        setError('Nenhum template de checklist disponível para este veículo.');
        return;
      }

      // checklist novo (nao retomando um em andamento) - pede odometro/
      // combustivel antes de criar a execucao de fato
      setOdometerInput('');
      setFuelLevel(null);
      setStartModal({ vehicle, template });
    } finally {
      setStartingVehicleId(null);
    }
  };

  const handleCancelStart = () => {
    setStartModal(null);
    setOdometerInput('');
    setFuelLevel(null);
  };

  const handleConfirmStart = async () => {
    if (!startModal || !user) return;
    const odometerKm = Number(odometerInput);
    if (!odometerInput || Number.isNaN(odometerKm) || odometerKm < 0 || !fuelLevel) return;

    const { vehicle, template } = startModal;
    setStartingVehicleId(vehicle.id);

    try {
      const deviceId = await getDeviceId();
      // best-effort: nao bloqueia a abertura do checklist se a localizacao
      // for negada ou indisponivel (comum em campo)
      const location = await getCurrentLocation();
      const newExecution: ExecutionRow = {
        id: generateUUID(),
        template_id: template.id,
        vehicle_id: vehicle.id,
        operator_id: user.id,
        shift: getCurrentShift(),
        status: 'in_progress',
        sync_status: 'local',
        sync_queue_id: null,
        started_at: new Date().toISOString(),
        completed_at: null,
        started_lat: location?.lat ?? null,
        started_lng: location?.lng ?? null,
        odometer_km: odometerKm,
        fuel_level: fuelLevel,
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
      setStartModal(null);
      navigation.replace('Checklist');
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
                <Text style={styles.vehicleIcon}>{CATEGORY_ICONS[item.category] ?? '🚗'}</Text>
                <Text style={styles.vehicleCode}>{item.code}</Text>
                <Text style={styles.vehicleName}>{item.name}</Text>
                {item.plate && <Text style={styles.vehiclePlate}>{item.plate}</Text>}
              </>
            )}
          </TouchableOpacity>
        )}
      />

      <Modal visible={Boolean(startModal)} transparent animationType="fade" onRequestClose={handleCancelStart}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Antes de começar</Text>
            <Text style={styles.modalSubtitle}>{startModal?.vehicle.name}</Text>

            <Text style={styles.modalLabel}>Odômetro (km)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="Ex.: 128500"
              value={odometerInput}
              onChangeText={(text) => setOdometerInput(text.replace(/\D/g, ''))}
            />

            <Text style={styles.modalLabel}>Combustível</Text>
            <View style={styles.fuelRow}>
              {FUEL_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.fuelOption, fuelLevel === option.value && styles.fuelOptionSelected]}
                  activeOpacity={0.7}
                  onPress={() => setFuelLevel(option.value)}
                >
                  <Text style={[styles.fuelOptionText, fuelLevel === option.value && styles.fuelOptionTextSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={handleCancelStart} activeOpacity={0.6}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalConfirmButton,
                (!odometerInput || !fuelLevel || startingVehicleId !== null) && styles.disabledButton,
              ]}
              activeOpacity={0.7}
              disabled={!odometerInput || !fuelLevel || startingVehicleId !== null}
              onPress={handleConfirmStart}
            >
              {startingVehicleId !== null ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalConfirmText}>Continuar</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  vehiclePlate: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs, fontFamily: 'monospace' },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    ...shadow.card,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  modalSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 16,
    marginBottom: spacing.lg,
    color: colors.textPrimary,
  },
  fuelRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xl, flexWrap: 'wrap' },
  fuelOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  fuelOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  fuelOptionText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  fuelOptionTextSelected: { color: '#fff' },
  modalCancelText: { textAlign: 'center', color: colors.textSecondary, fontSize: 16, marginBottom: spacing.md },
  modalConfirmButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: radius.md,
    alignItems: 'center',
    ...shadow.button,
  },
  modalConfirmText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  disabledButton: { opacity: 0.4, shadowOpacity: 0, elevation: 0 },
});
