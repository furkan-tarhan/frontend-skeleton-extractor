import { useMemo, useState } from 'react';
import { MarketFilters, type MarketFiltersValue } from '@/components/market/MarketFilters';
import { ItemGrid } from '@/components/market/ItemGrid';
import { useListings } from '@/hooks/useListings';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Wear } from '@/types/skin';

const DEFAULT_FILTERS: MarketFiltersValue = {
  search: '',
  rarity: 'all',
  sort: 'newest',
  wear: '',
  statTrak: false,
  minPrice: '',
  maxPrice: '',
};

export function Market() {
  const [filters, setFilters] = useState<MarketFiltersValue>(DEFAULT_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const debouncedMin = useDebouncedValue(filters.minPrice, 400);
  const debouncedMax = useDebouncedValue(filters.maxPrice, 400);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useListings({
    search: debouncedSearch || undefined,
    rarity: filters.rarity === 'all' ? undefined : filters.rarity,
    sort: filters.sort,
    wear: (filters.wear || undefined) as Wear | undefined,
    statTrak: filters.statTrak || undefined,
    minPrice: debouncedMin ? Number(debouncedMin) : undefined,
    maxPrice: debouncedMax ? Number(debouncedMax) : undefined,
  });

  const listings = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const total = data?.pages[0]?.pagination.total ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-primary">Market</h1>
      <p className="mt-1 text-sm text-muted">{isLoading ? 'Yükleniyor…' : `${total} ilan`}</p>

      <div className="mt-6">
        <MarketFilters value={filters} onChange={setFilters} />
      </div>

      <div className="mt-6">
        <ItemGrid
          listings={listings}
          isLoading={isLoading}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
        />
      </div>
    </div>
  );
}
