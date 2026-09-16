import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import type { ListingSort } from '@/types/listing';
import { RARITY_OPTIONS } from '@/lib/rarity';

const RARITY_TABS = [{ value: 'all', label: 'Tümü' }, ...RARITY_OPTIONS.map((r) => ({ value: r, label: r }))];

const WEARS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];

const SORTS: Array<{ value: ListingSort; label: string }> = [
  { value: 'newest', label: 'En yeni' },
  { value: 'oldest', label: 'En eski' },
  { value: 'price-asc', label: 'Fiyat (Artan)' },
  { value: 'price-desc', label: 'Fiyat (Azalan)' },
];

export interface MarketFiltersValue {
  search: string;
  rarity: string;
  sort: ListingSort;
  wear: string;
  statTrak: boolean;
  minPrice: string;
  maxPrice: string;
}

export interface MarketFiltersProps {
  value: MarketFiltersValue;
  onChange: (value: MarketFiltersValue) => void;
}

export function MarketFilters({ value, onChange }: MarketFiltersProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={value.search}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            placeholder="Silah veya skin ara…"
            className="pl-9"
          />
        </div>

        <select
          value={value.sort}
          onChange={(e) => onChange({ ...value, sort: e.target.value as ListingSort })}
          className="h-10 rounded-md border border-subtle bg-surface px-3 text-sm text-primary outline-none focus:border-accent"
        >
          {SORTS.map((sort) => (
            <option key={sort.value} value={sort.value}>
              {sort.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <Tabs items={RARITY_TABS} value={value.rarity} onChange={(rarity) => onChange({ ...value, rarity })} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={value.wear}
          onChange={(e) => onChange({ ...value, wear: e.target.value })}
          className="h-9 rounded-md border border-subtle bg-surface px-3 text-sm text-primary outline-none focus:border-accent"
        >
          <option value="">Tüm koşullar</option>
          {WEARS.map((wear) => (
            <option key={wear} value={wear}>
              {wear}
            </option>
          ))}
        </select>

        <label className="flex h-9 items-center gap-2 rounded-md border border-subtle bg-surface px-3 text-sm text-primary">
          <input
            type="checkbox"
            checked={value.statTrak}
            onChange={(e) => onChange({ ...value, statTrak: e.target.checked })}
            className="accent-accent"
          />
          StatTrak™
        </label>

        <div className="flex items-center gap-2">
          <Input
            value={value.minPrice}
            onChange={(e) => onChange({ ...value, minPrice: e.target.value })}
            placeholder="Min $"
            inputMode="decimal"
            className="h-9 w-24"
          />
          <span className="text-muted">–</span>
          <Input
            value={value.maxPrice}
            onChange={(e) => onChange({ ...value, maxPrice: e.target.value })}
            placeholder="Max $"
            inputMode="decimal"
            className="h-9 w-24"
          />
        </div>
      </div>
    </div>
  );
}
