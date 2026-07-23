import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { isAxiosError } from 'axios';
import { apiClient } from '../lib/apiClient';
import { useAuthStore } from '../stores/authStore';
import { getDeviceId } from '../lib/deviceId';
import { colors, radius, shadow, spacing } from '../theme';
import type { LoginOption, LoginResponse } from '../types/api';

const PIN_LENGTH = 4;

export function LoginScreen() {
  const setSession = useAuthStore((state) => state.setSession);
  const [operators, setOperators] = useState<LoginOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [selected, setSelected] = useState<LoginOption | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient
      .get<LoginOption[]>('/auth/login-options')
      .then((response) => setOperators(response.data.filter((option) => option.role === 'operator')))
      .catch(() => setError('Não foi possível carregar a lista de operadores.'))
      .finally(() => setLoadingOptions(false));
  }, []);

  const handleDigit = (digit: string) => {
    if (pin.length >= PIN_LENGTH || submitting) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    if (nextPin.length === PIN_LENGTH && selected) {
      submit(selected.id, nextPin);
    }
  };

  const handleBackspace = () => setPin((current) => current.slice(0, -1));

  const submit = async (nameId: string, pinValue: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const deviceId = await getDeviceId();
      const { data } = await apiClient.post<LoginResponse>('/auth/login', { nameId, pin: pinValue, deviceId });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSession(data);
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message =
        isAxiosError<{ error?: string }>(err) && err.response?.data?.error
          ? err.response.data.error
          : 'PIN incorreto. Tente novamente.';
      setError(message);
      setPin('');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingOptions) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!selected) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Quem é você?</Text>
        <FlatList
          data={operators}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.nameButton} activeOpacity={0.7} onPress={() => setSelected(item)}>
              <Text style={styles.nameButtonText}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Olá, {selected.name}</Text>
      <Text style={styles.subtitle}>Digite seu PIN</Text>

      <View style={styles.pinDotsRow}>
        {Array.from({ length: PIN_LENGTH }).map((_, index) => (
          <View key={index} style={[styles.pinDot, index < pin.length && styles.pinDotFilled]} />
        ))}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
      {submitting && <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: spacing.md }} />}

      <View style={styles.keypad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.keypadButton, key === '' && styles.keypadButtonHidden]}
            activeOpacity={0.6}
            disabled={key === '' || submitting}
            onPress={() => (key === '⌫' ? handleBackspace() : handleDigit(key))}
          >
            <Text style={styles.keypadButtonText}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity activeOpacity={0.6} onPress={() => { setSelected(null); setPin(''); setError(null); }}>
        <Text style={styles.changeUserText}>Trocar de usuário</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xxl, paddingTop: 64, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: spacing.lg, textAlign: 'center', color: colors.textPrimary },
  subtitle: { fontSize: 18, color: colors.textSecondary, marginBottom: spacing.xxl, textAlign: 'center' },
  nameButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.xl,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    ...shadow.card,
  },
  nameButtonText: { fontSize: 22, fontWeight: '600', color: colors.textPrimary },
  pinDotsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginBottom: spacing.xxl },
  pinDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.primary },
  pinDotFilled: { backgroundColor: colors.primary },
  errorText: { color: colors.error, textAlign: 'center', marginBottom: spacing.md, fontSize: 16 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  keypadButton: {
    width: '30%',
    aspectRatio: 1.4,
    margin: '1.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.button,
  },
  keypadButtonHidden: { ...shadow.button, shadowOpacity: 0, elevation: 0, backgroundColor: 'transparent' },
  keypadButtonText: { fontSize: 28, fontWeight: '600', color: colors.textPrimary },
  changeUserText: { marginTop: spacing.xxl, textAlign: 'center', color: colors.primary, fontSize: 16, fontWeight: '600' },
});
