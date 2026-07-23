import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { decodeAccessToken } from '@/lib/jwt';
import { fetchLoginOptions, refreshWithToken } from './api';

// Restaura a sessao apos reload da pagina: o access token so vive em memoria,
// mas o refresh token persiste no localStorage. O endpoint de refresh so
// devolve o access token (sem nome), entao completamos os dados do usuario
// consultando /auth/login-options (publico) pelo id decodificado do token.
export function useAuthBootstrap(): boolean {
  const { accessToken, refreshToken, setSession, logout } = useAuthStore();
  const [isReady, setIsReady] = useState(Boolean(accessToken) || !refreshToken);

  useEffect(() => {
    if (accessToken || !refreshToken) {
      setIsReady(true);
      return;
    }

    (async () => {
      try {
        const { accessToken: newAccessToken } = await refreshWithToken(refreshToken);
        const decoded = decodeAccessToken(newAccessToken);
        const options = await fetchLoginOptions();
        const matchedUser = options.find((option) => option.id === decoded.sub);

        if (!matchedUser) throw new Error('Usuario nao encontrado');

        setSession({
          user: { id: matchedUser.id, name: matchedUser.name, role: matchedUser.role, active: true, maxDevices: 2 },
          accessToken: newAccessToken,
          refreshToken,
        });
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
