import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
import { RootNavigator } from './src/navigation/RootNavigator';
import { getDatabase } from './src/db/database';
import { initNetworkListener } from './src/lib/network';
import { registerBackgroundSync, initForegroundSyncLoop } from './src/services/backgroundSync';
import { loadPersistedSession, useAuthStore } from './src/stores/authStore';
import { refreshShiftWindows } from './src/lib/shift';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export default function App() {
  const [isReady, setIsReady] = useState(false);
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
      <RootNavigator />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
