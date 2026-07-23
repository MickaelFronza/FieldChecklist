import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
  setOnline: (isOnline: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  setOnline: (isOnline) => set({ isOnline }),
}));

export function initNetworkListener(): () => void {
  return NetInfo.addEventListener((state) => {
    useNetworkStore.getState().setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
}
