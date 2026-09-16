import { useQuery } from '@tanstack/react-query';
import { fetchMyTrades } from '@/lib/api';

export function useMyTrades() {
  return useQuery({
    queryKey: ['trades', 'mine'],
    queryFn: async () => (await fetchMyTrades()).data,
    refetchInterval: 10_000,
  });
}
