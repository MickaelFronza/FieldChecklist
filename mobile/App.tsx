import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { getDatabase } from './src/db/database';
import { initNetworkListener } from './src/lib/network';
import { registerBackgroundSync, initForegroundSyncLoop } from './src/services/backgroundSync';
import { loadPersistedSession, useAuthStore } from './src/stores/authStore';
import { useChecklistStore } from './src/stores/checklistStore';
import { refreshShiftWindows } from './src/lib/shift';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  // muda a key do RootNavigator pra forcar ele a remontar do zero (de volta
  // pra tela inicial) quando o ErrorBoundary recupera de um crash - sem isso
  // a arvore de navegacao ficaria presa na mesma tela que quebrou
  const [navigatorKey, setNavigatorKey] = useState(0);
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    (async () => {
      await getDatabase();

      const persisted = await loadPersistedSession();
      if (persisted) {
        try {
          const { data } = await axios.post<{ accessToken: string }>(`${API_URL}/auth/refresh`, {
            refreshToken: persisted.refreshToken,
          });
          setSession({ user: persisted.user, accessToken: data.accessToken, refreshToken: persisted.refreshToken });
        } catch {
          // refresh token expirado/invalido: segue para tela de login
        }
      }

      const unsubscribeNetwork = initNetworkListener();
      const unsubscribeSync = initForegroundSyncLoop();
      registerBackgroundSync().catch(() => {});
      refreshShiftWindows().catch(() => {});

      setIsReady(true);

      return () => {
        unsubscribeNetwork();
        unsubscribeSync();
      };
    })();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary
        onReset={() => {
          useChecklistStore.getState().reset();
          setNavigatorKey((key) => key + 1);
        }}
      >
        <RootNavigator key={navigatorKey} />
      </ErrorBoundary>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
