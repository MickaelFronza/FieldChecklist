import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useChecklistStore } from '../stores/checklistStore';
import { upsertExecutionItem, type ExecutionItemRow } from '../db/executionsRepository';
import { colors, radius, shadow, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Checklist'>;

type ScreenMode = 'view' | 'camera' | 'justification';

export function ChecklistScreen({ navigation }: Props) {
  const { template, items, currentIndex, updateItem, goNext } = useChecklistStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<ScreenMode>('view');
  const [pendingStatus, setPendingStatus] = useState<'non_conformant' | 'not_applicable' | null>(null);
  const [justification, setJustification] = useState('');
  const cameraRef = useRef<CameraView>(null);

  const templateItem = template?.items[currentIndex];
  const executionItem = useMemo(
    () => items.find((item) => item.template_item_id === templateItem?.id),
    [items, templateItem],
  );

  const needsPhoto = Boolean(templateItem?.photoRequired) && !executionItem?.photo_uri;

  useEffect(() => {
    if (!templateItem) return;
    if (needsPhoto && mode === 'view') {
      requestPermission();
      setMode('camera');
    }
  }, [templateItem?.id]);

  if (!template || !templateItem) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const persistAndAdvance = async (status: ExecutionItemRow['status'], justificationText: string | null) => {
    if (!executionItem) return;

    const updated: ExecutionItemRow = {
      ...executionItem,
      status,
      justification: justificationText,
      marked_at: new Date().toISOString(),
    };
    await upsertExecutionItem(updated);
    updateItem(updated);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setMode('view');
    setJustification('');
    setPendingStatus(null);

    if (currentIndex + 1 >= template.items.length) {
      navigation.navigate('Summary');
    } else {
      goNext();
    }
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current || !executionItem) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
    if (!photo) return;

    const dir = `${FileSystem.documentDirectory}checklist-photos/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
    const destination = `${dir}${executionItem.id}.jpg`;
    await FileSystem.copyAsync({ from: photo.uri, to: destination });

    const updated: ExecutionItemRow = { ...executionItem, photo_uri: destination };
    await upsertExecutionItem(updated);
    updateItem(updated);
    setMode('view');
  };

  const handleConfirmOk = () => persistAndAdvance('ok', null);

  const handleStatusPress = (status: 'non_conformant' | 'not_applicable') => {
    setPendingStatus(status);
    setMode('justification');
  };

  const progressLabel = `${currentIndex + 1} de ${template.items.length}`;
  const progressPercent = ((currentIndex + 1) / template.items.length) * 100;

  if (mode === 'camera') {
    if (!permission?.granted) {
      return (
        <View style={styles.center}>
          <Text style={styles.infoText}>Precisamos da câmera para tirar a foto do item.</Text>
          <TouchableOpacity style={styles.okButton} activeOpacity={0.7} onPress={requestPermission}>
            <Text style={styles.actionButtonText}>Permitir câmera</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
        <View style={styles.cameraOverlay}>
          <Text style={styles.cameraTitle}>{templateItem.title}</Text>
          <TouchableOpacity style={styles.shutterButton} activeOpacity={0.7} onPress={handleTakePhoto}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (mode === 'justification') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{templateItem.title}</Text>
        <Text style={styles.subtitle}>
          {pendingStatus === 'non_conformant' ? 'Por que não está conforme?' : 'Por que não se aplica?'}
        </Text>
        <TextInput
          style={styles.justificationInput}
          multiline
          value={justification}
          onChangeText={setJustification}
          placeholder="Escreva o motivo aqui"
        />
        <TouchableOpacity
          style={[styles.confirmButton, justification.trim().length === 0 && styles.disabledButton]}
          activeOpacity={0.7}
          disabled={justification.trim().length === 0}
          onPress={() => persistAndAdvance(pendingStatus as 'non_conformant' | 'not_applicable', justification.trim())}
        >
          <Text style={styles.actionButtonText}>Confirmar</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.6} onPress={() => setMode('view')}>
          <Text style={styles.cancelText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>
      <Text style={styles.progressLabel}>{progressLabel}</Text>

      <Text style={styles.title}>{templateItem.title}</Text>
      {templateItem.description ? <Text style={styles.description}>{templateItem.description}</Text> : null}
      {templateItem.category ? <Text style={styles.category}>{templateItem.category}</Text> : null}

      {executionItem?.photo_uri && (
        <Image source={{ uri: executionItem.photo_uri }} style={styles.photoPreview} />
      )}

      <TouchableOpacity style={styles.photoButton} activeOpacity={0.7} onPress={() => setMode('camera')}>
        <Text style={styles.actionButtonText}>
          {executionItem?.photo_uri ? 'Tirar outra foto' : 'Tirar Foto'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.okButton, needsPhoto && styles.disabledButton]}
        activeOpacity={0.7}
        disabled={needsPhoto}
        onPress={handleConfirmOk}
      >
        <Text style={styles.actionButtonText}>OK</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.nonConformantButton} activeOpacity={0.7} onPress={() => handleStatusPress('non_conformant')}>
        <Text style={styles.actionButtonText}>Não Conforme</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.naButton} activeOpacity={0.6} onPress={() => handleStatusPress('not_applicable')}>
        <Text style={styles.naButtonText}>Não Aplicável</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, paddingTop: 56, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  progressBarTrack: { height: 8, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden' },
  progressBarFill: { height: 8, backgroundColor: colors.primary, borderRadius: radius.pill },
  progressLabel: { textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl, color: colors.textSecondary, fontSize: 14 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: spacing.sm, color: colors.textPrimary },
  subtitle: { fontSize: 18, color: colors.textPrimary, marginBottom: spacing.lg },
  description: { fontSize: 16, color: colors.textPrimary, marginBottom: spacing.sm },
  category: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg },
  infoText: { fontSize: 18, textAlign: 'center', marginBottom: spacing.xl, color: colors.textPrimary },
  photoPreview: { width: '100%', height: 220, borderRadius: radius.md, marginBottom: spacing.lg },
  photoButton: {
    backgroundColor: '#455A64',
    paddingVertical: 18,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadow.button,
  },
  okButton: {
    backgroundColor: colors.primary,
    paddingVertical: 20,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadow.button,
  },
  nonConformantButton: {
    backgroundColor: colors.error,
    paddingVertical: 20,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadow.button,
  },
  naButton: { paddingVertical: 14, alignItems: 'center' },
  naButtonText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  disabledButton: { opacity: 0.4, shadowOpacity: 0, elevation: 0 },
  actionButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.xxl,
    alignItems: 'center',
    backgroundColor: colors.overlay,
  },
  cameraTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: spacing.lg, textAlign: 'center' },
  shutterButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  justificationInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    paddingVertical: 20,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadow.button,
  },
  cancelText: { textAlign: 'center', color: colors.textSecondary, fontSize: 16 },
});
