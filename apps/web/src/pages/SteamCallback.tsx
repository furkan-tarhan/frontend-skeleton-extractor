import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { setToken } from '@/lib/token';

export function SteamCallback() {
  const [params] = useSearchParams();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (token) {
      setToken(token);
      // Best-effort — works when the opener is still same-origin at this
      // point; the opener's localStorage poll is the reliable path either way.
      try {
        window.opener?.postMessage({ type: 'loopskins-steam-auth', token }, window.location.origin);
      } catch {
        // ignore
      }
      if (window.opener) {
        window.close();
      } else {
        window.location.href = '/';
      }
      return;
    }

    if (error) {
      setFailed(true);
    }
  }, [params]);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      {failed ? (
        <>
          <p className="text-danger">Steam girişi başarısız oldu.</p>
          <p className="mt-2 text-sm text-muted">Bu pencereyi kapatıp tekrar deneyebilirsin.</p>
        </>
      ) : (
        <p className="text-muted">Steam girişi tamamlanıyor…</p>
      )}
    </div>
  );
}
