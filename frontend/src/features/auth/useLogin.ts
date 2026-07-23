import { useMutation } from '@tanstack/react-query';
import { loginWithPassword } from './api';
import { useAuthStore } from '@/stores/authStore';

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => loginWithPassword(email, password),
    onSuccess: (data) => {
      setSession(data);
    },
  });
}
