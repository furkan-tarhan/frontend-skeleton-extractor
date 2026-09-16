import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '@/lib/api';
import { getToken, clearToken } from '@/lib/token';
import { useAuthStore } from '@/store/authStore';

export function useSession() {
  const setUser = useAuthStore((s) => s.setUser);
  const hasToken = Boolean(getToken());

  const query = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        const res = await fetchMe();
        return res.data;
      } catch {
        // Invalid/expired token — drop it so we stop calling /me with it.
        clearToken();
        return null;
      }
    },
    enabled: hasToken,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (!hasToken) {
      setUser(null);
      return;
    }
    if (query.data !== undefined) setUser(query.data);
  }, [hasToken, query.data, setUser]);

  if (!hasToken) {
    return { data: null, isLoading: false, isError: false } as const;
  }
  return query;
}
