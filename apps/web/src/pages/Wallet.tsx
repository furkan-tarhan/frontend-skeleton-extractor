import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { useWallet, useTransactions } from '@/hooks/useWallet';
import { depositFunds, withdrawFunds, ApiError } from '@/lib/api';
import { PAYOUT_NETWORKS, type Transaction, type TransactionType } from '@/types/wallet';

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const depositSchema = z.object({
  amount: z.coerce.number().min(5, 'En az 5 USD').max(10000, 'En fazla 10.000 USD'),
});
type DepositValues = z.infer<typeof depositSchema>;

const withdrawSchema = z.object({
  amount: z.coerce.number().min(10, 'En az 10 USD'),
  walletAddress: z.string().min(10, 'Geçerli bir cüzdan adresi girin'),
  network: z.enum(PAYOUT_NETWORKS, { errorMap: () => ({ message: 'Bir ağ seçin' }) }),
});
type WithdrawValues = z.infer<typeof withdrawSchema>;

const TYPE_LABEL: Record<TransactionType, string> = {
  deposit: 'Yükleme',
  withdrawal: 'Çekim',
  purchase: 'Satın alma',
  sale: 'Satış',
};

function transactionTone(tx: Transaction): BadgeTone {
  if (tx.status === 'failed') return 'danger';
  if (tx.status === 'pending') return 'neutral';
  return tx.amount >= 0 ? 'success' : 'neutral';
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const isCredit = tx.amount >= 0;
  // Başarısız/bekleyen bir işlemde tutar bakiyeye hiç yansımadı — yeşil "+" göstermek
  // kullanıcıya parayı almış gibi yanlış bir izlenim verir.
  const amountClass =
    tx.status === 'failed'
      ? 'text-muted line-through'
      : tx.status === 'pending'
        ? 'text-muted'
        : isCredit
          ? 'text-success'
          : 'text-danger';
  return (
    <div className="flex items-center justify-between border-b border-subtle py-3 last:border-0">
      <div>
        <div className="flex items-center gap-2">
          <Badge tone={transactionTone(tx)}>{TYPE_LABEL[tx.type]}</Badge>
          <span className="text-xs text-muted">{new Date(tx.createdAt).toLocaleString('tr-TR')}</span>
          {tx.status !== 'completed' && (
            <span className="text-xs text-muted">({tx.status === 'pending' ? 'bekliyor' : 'başarısız'})</span>
          )}
        </div>
        {tx.description && <p className="mt-1 text-xs text-muted">{tx.description}</p>}
      </div>
      <span className={`font-semibold ${amountClass}`}>
        {isCredit ? '+' : ''}
        {currencyFormatter.format(tx.amount)}
      </span>
    </div>
  );
}

export function Wallet() {
  const [searchParams] = useSearchParams();
  const depositPending = searchParams.get('deposit') === 'pending';
  const queryClient = useQueryClient();

  const wallet = useWallet();
  const transactions = useTransactions();
  const txList = useMemo(() => transactions.data?.pages.flatMap((p) => p.data) ?? [], [transactions.data]);

  const depositForm = useForm<DepositValues>({ resolver: zodResolver(depositSchema) });
  const depositMutation = useMutation({
    mutationFn: (values: DepositValues) => depositFunds(values.amount),
    onSuccess: (res) => {
      window.location.href = res.data.paymentPageUrl;
    },
  });

  const withdrawForm = useForm<WithdrawValues>({ resolver: zodResolver(withdrawSchema) });
  const withdrawMutation = useMutation({
    mutationFn: withdrawFunds,
    onSuccess: () => {
      withdrawForm.reset();
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-primary">Cüzdan</h1>

      {depositPending && (
        <Card className="mt-4 text-sm text-muted">
          Ödemeniz onaylanıyor — birkaç dakika içinde bakiyenize yansıyacak.
        </Card>
      )}

      <Card className="mt-6">
        <p className="text-sm text-muted">Bakiye</p>
        <p className="mt-1 font-display text-4xl font-bold text-glow">
          {wallet.isLoading ? '…' : currencyFormatter.format(wallet.data?.balance ?? 0)}
        </p>
      </Card>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-primary">Bakiye yükle</h2>
          <form
            className="mt-4 space-y-3"
            onSubmit={depositForm.handleSubmit((values) => depositMutation.mutate(values))}
          >
            <Input type="number" step="0.01" placeholder="Tutar (USD)" {...depositForm.register('amount')} />
            {depositForm.formState.errors.amount && (
              <p className="text-xs text-danger">{depositForm.formState.errors.amount.message}</p>
            )}
            {depositMutation.isError && (
              <p className="text-xs text-danger">
                {depositMutation.error instanceof ApiError ? depositMutation.error.message : 'Bir hata oluştu.'}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={depositMutation.isPending}>
              {depositMutation.isPending ? 'Yönlendiriliyor…' : 'Bakiye Yükle'}
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-primary">Para çek</h2>
          <form
            className="mt-4 space-y-3"
            onSubmit={withdrawForm.handleSubmit((values) => withdrawMutation.mutate(values))}
          >
            <Input type="number" step="0.01" placeholder="Tutar (USD)" {...withdrawForm.register('amount')} />
            {withdrawForm.formState.errors.amount && (
              <p className="text-xs text-danger">{withdrawForm.formState.errors.amount.message}</p>
            )}
            <Input placeholder="Cüzdan adresi" {...withdrawForm.register('walletAddress')} />
            {withdrawForm.formState.errors.walletAddress && (
              <p className="text-xs text-danger">{withdrawForm.formState.errors.walletAddress.message}</p>
            )}
            <select
              className="h-10 w-full rounded-md border border-subtle bg-surface px-3 text-sm text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              defaultValue=""
              {...withdrawForm.register('network')}
            >
              <option value="" disabled>
                Ağ seçin
              </option>
              {PAYOUT_NETWORKS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            {withdrawForm.formState.errors.network && (
              <p className="text-xs text-danger">{withdrawForm.formState.errors.network.message}</p>
            )}
            {withdrawMutation.isError && (
              <p className="text-xs text-danger">
                {withdrawMutation.error instanceof ApiError ? withdrawMutation.error.message : 'Bir hata oluştu.'}
              </p>
            )}
            {withdrawMutation.isSuccess && <p className="text-xs text-success">{withdrawMutation.data.message}</p>}
            <Button type="submit" variant="secondary" className="w-full" disabled={withdrawMutation.isPending}>
              {withdrawMutation.isPending ? 'Gönderiliyor…' : 'Çekim Talebi Oluştur'}
            </Button>
          </form>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-primary">İşlem geçmişi</h2>
        {transactions.isLoading ? (
          <p className="mt-4 text-sm text-muted">Yükleniyor…</p>
        ) : txList.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Henüz işlem yok.</p>
        ) : (
          <div className="mt-2">
            {txList.map((tx) => (
              <TransactionRow key={tx._id} tx={tx} />
            ))}
          </div>
        )}
        {transactions.hasNextPage && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="secondary"
              onClick={() => transactions.fetchNextPage()}
              disabled={transactions.isFetchingNextPage}
            >
              {transactions.isFetchingNextPage ? 'Yükleniyor…' : 'Daha fazla göster'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
