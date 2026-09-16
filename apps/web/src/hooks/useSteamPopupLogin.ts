import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { steamLoginUrl } from '@/lib/api';
import { getToken } from '@/lib/token';

/**
 * The backend's Steam OpenID flow redirects through steamcommunity.com and
 * lands back on our own /steam-callback route with ?token=. It's meant to be
 * opened as a popup; postMessage back to the opener is unreliable across
 * that redirect chain (COOP headers), so /steam-callback just writes the
 * token to localStorage and we poll for it here instead.
 */
export function useSteamPopupLogin(onSuccess?: () => void, prepare?: () => Promise<unknown>) {
  const queryClient = useQueryClient();
  const pollRef = useRef<number | null>(null);

  const login = useCallback(async () => {
    // `prepare` (ör. steam-link-init) backend session'ına linkUserId'yi yazar, bu yüzden
    // popup açılmadan ÖNCE tamamlanmış olmalı.
    if (prepare) await prepare();

    const popup = window.open(steamLoginUrl(), 'loopskins-steam-login', 'width=500,height=640');
    if (!popup) return;

    const stopPolling = () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };

    pollRef.current = window.setInterval(() => {
      if (getToken()) {
        stopPolling();
        queryClient.invalidateQueries({ queryKey: ['session'] });
        onSuccess?.();
        return;
      }
      if (popup.closed) {
        stopPolling();
      }
    }, 500);
  }, [queryClient, onSuccess, prepare]);

  return login;
}
