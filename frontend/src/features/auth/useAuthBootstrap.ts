import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { fetchCurrentUser, refreshWithToken } from './api';

// Restaura a sessao apos reload da pagina: o access token so vive em memoria,
// mas o refresh token persiste no localStorage. O endpoint de refresh so
// devolve o access token (sem dados do usuario), entao completamos com
// GET /auth/me usando o token recem-emitido.
export function useAuthBootstrap(): boolean {
  const { accessToken, refreshToken, setSession, setAccessToken, logout } = useAuthStore();
  const [isReady, setIsReady] = useState(Boolean(accessToken) || !refreshToken);

  useEffect(() => {
    if (accessToken || !refreshToken) {
      setIsReady(true);
      return;
    }

    (async () => {
      try {
        const { accessToken: newAccessToken } = await refreshWithToken(refreshToken);
        setAccessToken(newAccessToken);
        const user = await fetchCurrentUser();
        setSession({ user, accessToken: newAccessToken, refreshToken });
      } catch {
        logout();
      } finally {
        setIsReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isReady;
}
