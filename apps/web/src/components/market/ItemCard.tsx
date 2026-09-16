import { Link } from 'react-router-dom';
import type { Listing } from '@/types/listing';
import { Badge } from '@/components/ui/Badge';
import { rarityTone, formatPrice } from '@/lib/rarity';

export interface ItemCardProps {
  listing: Listing;
}

export function ItemCard({ listing }: ItemCardProps) {
  return (
    <Link
      to={`/market/item/${listing._id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-subtle bg-surface transition-colors hover:border-accent"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-raised">
        <img
          src={listing.skin?.image}
          alt={listing.title}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
        {listing.isStatTrak && (
          <Badge tone="accent" className="absolute left-2 top-2">
            StatTrak™
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="truncate text-sm font-medium text-primary">{listing.title}</p>

        <div className="flex items-center justify-between gap-2">
          <Badge tone={rarityTone(listing.rarity)}>{listing.wear ?? listing.rarity}</Badge>
        </div>

        <p className="mt-auto text-lg font-semibold text-primary">
          {formatPrice(listing.price, listing.currency)}
        </p>
      </div>
    </Link>
  );
}
