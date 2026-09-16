import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchWallet, fetchTransactions } from '@/lib/api';

const TRANSACTIONS_PAGE_SIZE = 20;

export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: async () => (await fetchWallet()).data,
  });
}

export function useTransactions() {
  return useInfiniteQuery({
    queryKey: ['wallet', 'transactions'],
    queryFn: ({ pageParam }) => fetchTransactions(pageParam, TRANSACTIONS_PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage.pagination;
      return page < pages ? page + 1 : undefined;
    },
  });
}
