import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useMyTrades } from '@/hooks/useMyTrades';
import { confirmDelivery, ApiError } from '@/lib/api';
import type { DepositStatus, DeliveryStatus } from '@/types/trade';

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const STATUS_LABEL: Record<DepositStatus | DeliveryStatus, string> = {
  pending: 'Bekliyor',
  accepted: 'Onaylandı',
  declined: 'Reddedildi',
  canceled: 'İptal edildi',
  expired: 'Süresi doldu',
  escrow: 'Steam bekleme süresinde',
};

function statusTone(status: DepositStatus | DeliveryStatus): BadgeTone {
  if (status === 'accepted') return 'success';
  if (status === 'declined' || status === 'canceled' || status === 'expired') return 'danger';
  return 'neutral';
}

function TradeRow({
  title,
  status,
  tradeOfferUrl,
  meta,
  action,
}: {
  title: string;
  status: DepositStatus | DeliveryStatus;
  tradeOfferUrl?: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-subtle py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-primary">{title}</p>
        <div className="mt-1 flex items-center gap-2">
          <Badge tone={statusTone(status)}>{STATUS_LABEL[status]}</Badge>
          {meta && <span className="text-xs text-muted">{meta}</span>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {tradeOfferUrl && (
          <a href={tradeOfferUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
            Steam'de teklifi gör
          </a>
        )}
        {action}
      </div>
    </div>
  );
}

export function Trade() {
  const { data, isLoading } = useMyTrades();
  const queryClient = useQueryClient();
  const deposits = data?.deposits ?? [];
  const deliveries = data?.deliveries ?? [];
  const isEmpty = !isLoading && deposits.length === 0 && deliveries.length === 0;

  const confirmMutation = useMutation({
    mutationFn: confirmDelivery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-primary">Trade Offer</h1>
      <p className="mt-1 text-sm text-muted">
        Steam bot üzerinden yürüyen emanet (deposit) ve teslimat (delivery) tekliflerinin güncel durumu.
      </p>

      {isLoading ? (
        <Card className="mt-6 text-sm text-muted">Yükleniyor…</Card>
      ) : isEmpty ? (
        <Card className="mt-6 text-sm text-muted">Şu an bekleyen bir emanet/teslimat işlemin yok.</Card>
      ) : (
        <div className="mt-6 space-y-6">
          {deposits.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold text-primary">Emanet bekleyen ilanların</h2>
              <div className="mt-2">
                {deposits.map((d) => (
                  <TradeRow key={d.listingId} title={d.title} status={d.depositStatus} tradeOfferUrl={d.tradeOfferUrl} />
                ))}
              </div>
            </Card>
          )}

          {deliveries.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold text-primary">Teslim bekleyen alımların</h2>
              {confirmMutation.isError && (
                <p className="mt-2 text-xs text-danger">
                  {confirmMutation.error instanceof ApiError ? confirmMutation.error.message : 'Onaylanamadı.'}
                </p>
              )}
              <div className="mt-2">
                {deliveries.map((d) => (
                  <TradeRow
                    key={d.transactionId}
                    title={d.listingTitle}
                    status={d.deliveryStatus}
                    tradeOfferUrl={d.tradeOfferUrl}
                    meta={currencyFormatter.format(Math.abs(d.amount))}
                    action={
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => confirmMutation.mutate(d.transactionId)}
                        disabled={confirmMutation.isPending}
                      >
                        Item'ı aldım
                      </Button>
                    }
                  />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
