import type { Listing } from '@/types/listing';
import { ItemCard } from './ItemCard';
import { Button } from '@/components/ui/Button';

export interface ItemGridProps {
  listings: Listing[];
  isLoading: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-lg border border-subtle bg-surface">
      <div className="aspect-[4/3] w-full animate-pulse bg-surface-raised" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface-raised" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-surface-raised" />
        <div className="h-5 w-1/2 animate-pulse rounded bg-surface-raised" />
      </div>
    </div>
  );
}

export function ItemGrid({ listings, isLoading, hasNextPage, isFetchingNextPage, onLoadMore }: ItemGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-lg border border-subtle bg-surface p-10 text-center text-sm text-muted">
        Aramanla eşleşen ürün bulunamadı.
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {listings.map((listing) => (
          <ItemCard key={listing._id} listing={listing} />
        ))}
      </div>

      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={onLoadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Yükleniyor…' : 'Daha fazla yükle'}
          </Button>
        </div>
      )}
    </div>
  );
}
