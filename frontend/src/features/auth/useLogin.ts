import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchLoginOptions, login } from './api';
import { useAuthStore } from '@/stores/authStore';

export function useLoginOptions() {
  return useQuery({ queryKey: ['login-options'], queryFn: fetchLoginOptions });
}

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: ({ nameId, pin }: { nameId: string; pin: string }) => login(nameId, pin),
    onSuccess: (data) => {
      setSession(data);
    },
  });
}
