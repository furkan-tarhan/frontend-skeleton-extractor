import { useQuery } from '@tanstack/react-query';
import { fetchPortfolioHistory } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export function usePortfolioHistory() {
  const steamId = useAuthStore((s) => s.user?.steamId);

  return useQuery({
    queryKey: ['portfolio', 'history'],
    queryFn: async () => (await fetchPortfolioHistory()).data,
    enabled: Boolean(steamId),
    staleTime: 60_000,
    // Steam'in fiyat ucu zaten rate-limit'e yatkın (bkz. steamApi.ts) — otomatik retry
    // aynı isteği tekrar tekrar Steam'e gönderip durumu kötüleştirir.
    retry: false,
  });
}
