import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchListings, fetchListing } from '@/lib/api';
import type { ListingsQuery } from '@/types/listing';

const PAGE_SIZE = 12;

export function useListings(filters: Omit<ListingsQuery, 'page' | 'limit'>) {
  return useInfiniteQuery({
    queryKey: ['listings', filters],
    queryFn: ({ pageParam }) => fetchListings({ ...filters, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage.pagination;
      return page < pages ? page + 1 : undefined;
    },
  });
}

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: () => fetchListing(id!),
    enabled: Boolean(id),
  });
}
