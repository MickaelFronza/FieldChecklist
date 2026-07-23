import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';
import { LoginScreen } from '../screens/LoginScreen';
import { VehicleSelectionScreen } from '../screens/VehicleSelectionScreen';
import { ChecklistScreen } from '../screens/ChecklistScreen';
import { SummaryScreen } from '../screens/SummaryScreen';
import { SyncScreen } from '../screens/SyncScreen';

export type RootStackParamList = {
  Login: undefined;
  VehicleSelection: undefined;
  Checklist: undefined;
  Summary: undefined;
  Sync: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const user = useAuthStore((state) => state.user);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="VehicleSelection" component={VehicleSelectionScreen} />
            <Stack.Screen name="Checklist" component={ChecklistScreen} />
            <Stack.Screen name="Summary" component={SummaryScreen} />
            <Stack.Screen name="Sync" component={SyncScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
