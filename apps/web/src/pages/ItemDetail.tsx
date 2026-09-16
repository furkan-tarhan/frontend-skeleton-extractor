import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useListing } from '@/hooks/useListings';
import { fetchListings, buyListing, ApiError } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FloatBar } from '@/components/market/FloatBar';
import { ItemCarousel } from '@/components/market/ItemCarousel';
import { rarityTone, formatPrice } from '@/lib/rarity';
import { commissionBreakdown, COMMISSION_RATE } from '@/lib/commission';
import { useAuthStore } from '@/store/authStore';

export function ItemDetail() {
  const { id } = useParams();
  const { data, isLoading, isError } = useListing(id);
  const listing = data?.data;
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [confirming, setConfirming] = useState(false);
  const [tradeUrl, setTradeUrl] = useState('');

  const buyMutation = useMutation({
    mutationFn: () => buyListing(id!, tradeUrl || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing', id] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });

  const { data: relatedResult } = useQuery({
    queryKey: ['related-listings', listing?.weapon, listing?._id],
    queryFn: () => fetchListings({ weapon: listing!.weapon, limit: 10 }),
    enabled: Boolean(listing),
  });
  const related = relatedResult?.data.filter((l) => l._id !== listing?._id) ?? [];

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-20 text-center text-muted">Yükleniyor…</div>;
  }

  if (isError || !listing) {
    return <div className="mx-auto max-w-6xl px-4 py-20 text-center text-muted">İlan bulunamadı.</div>;
  }

  const fees = commissionBreakdown(listing.price);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-subtle bg-surface">
          <img src={listing.skin?.image} alt={listing.title} className="w-full object-cover" />
        </div>

        <div>
          {listing.isStatTrak && (
            <Badge tone="accent" className="mb-2">
              StatTrak™
            </Badge>
          )}
          <h1 className="text-2xl font-bold text-primary">{listing.title}</h1>
          <p className="text-sm text-muted">Satıcı: {listing.seller.username}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone={rarityTone(listing.rarity)}>{listing.rarity}</Badge>
            {listing.wear && <Badge tone="neutral">{listing.wear}</Badge>}
          </div>

          {typeof listing.floatValue === 'number' && (
            <div className="mt-6">
              <FloatBar float={listing.floatValue} />
            </div>
          )}

          <p className="mt-6 text-3xl font-bold text-primary">{formatPrice(listing.price, listing.currency)}</p>

          <Card className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">İlan fiyatı</span>
              <span className="text-primary">{formatPrice(fees.price, listing.currency)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Komisyonumuz (%{COMMISSION_RATE * 100})</span>
              <span className="text-primary">{formatPrice(fees.commission, listing.currency)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-subtle pt-2 text-sm">
              <span className="text-muted">Satıcı net alır</span>
              <span className="font-semibold text-primary">{formatPrice(fees.sellerNet, listing.currency)}</span>
            </div>
            <p className="pt-1 text-xs text-muted">Sen tam olarak ilan fiyatını ödersin — ekstra ücret yok. Komisyon satıcıdan kesilir.</p>
          </Card>

          {buyMutation.isSuccess ? (
            <Card className="mt-6 space-y-2">
              <p className="text-sm text-success">Satın alma başarılı!</p>
              {buyMutation.data.deliveryTradeOfferUrl ? (
                <a
                  href={buyMutation.data.deliveryTradeOfferUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline"
                >
                  Teslimatı onaylamak için Steam'e git
                </a>
              ) : (
                <p className="text-xs text-muted">
                  Satıcıyla teslimat manuel olarak koordine edilecek — bildirimlerini takip et.
                </p>
              )}
              <p className="text-xs text-muted">
                Ödeme, teslimatı onayladığında (Trade Offer sayfasından) satıcıya geçecek.
              </p>
            </Card>
          ) : listing.status !== 'active' ? (
            <p className="mt-6 text-sm text-muted">Bu ilan artık satın alınamıyor.</p>
          ) : currentUser && listing.seller._id === currentUser._id ? (
            <p className="mt-6 text-sm text-muted">Bu senin ilanın — kendi ilanını satın alamazsın.</p>
          ) : (
            <>
              <div className="mt-6 flex gap-3">
                {confirming ? (
                  <Button size="lg" onClick={() => buyMutation.mutate()} disabled={buyMutation.isPending}>
                    {buyMutation.isPending ? 'İşleniyor…' : 'Onayla'}
                  </Button>
                ) : (
                  <Button size="lg" onClick={() => setConfirming(true)}>
                    Satın Al
                  </Button>
                )}
                <Button variant="secondary" size="lg">
                  Sepete ekle
                </Button>
              </div>

              {confirming && (
                <div className="mt-3 space-y-2">
                  <Input
                    placeholder="Steam Trade URL (bazı ilanlar için gerekli)"
                    value={tradeUrl}
                    onChange={(e) => setTradeUrl(e.target.value)}
                  />
                  {buyMutation.isError && (
                    <p className="text-xs text-danger">
                      {buyMutation.error instanceof ApiError ? buyMutation.error.message : 'Satın alma başarısız oldu.'}
                      {buyMutation.error instanceof ApiError && buyMutation.error.message.includes('Yetersiz bakiye') && (
                        <>
                          {' '}
                          <Link to="/wallet" className="underline">
                            Cüzdana git
                          </Link>
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-16">
          <ItemCarousel title="Benzer ilanlar" listings={related} />
        </div>
      )}
    </div>
  );
}
