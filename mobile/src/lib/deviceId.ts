import * as SecureStore from 'expo-secure-store';
import { generateUUID } from './uuid';

const DEVICE_ID_KEY = 'field_checklist_device_id';

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateUUID();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  }

  cachedDeviceId = deviceId;
  return deviceId;
}
