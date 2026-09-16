import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { usePortfolioHistory } from '@/hooks/usePortfolioHistory';
import { useSteamPopupLogin } from '@/hooks/useSteamPopupLogin';
import { linkSteamAccount, ApiError } from '@/lib/api';
import type { PortfolioHistoryPoint } from '@/types/portfolio';

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dateFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });

function formatDate(date: string): string {
  return dateFormatter.format(new Date(date));
}

function ConnectSteamCard() {
  const linkSteam = useSteamPopupLogin(() => window.location.reload(), linkSteamAccount);

  return (
    <Card className="mx-auto mt-10 max-w-md text-center">
      <h2 className="text-lg font-semibold text-primary">Steam hesabını bağla</h2>
      <p className="mt-2 text-sm text-muted">
        Portföy değerini takip edebilmemiz için envanterine erişebileceğimiz bir Steam hesabı gerekiyor.
      </p>
      <Button className="mt-4 w-full" variant="secondary" onClick={() => linkSteam()}>
        Steam hesabını bağla
      </Button>
    </Card>
  );
}

function PortfolioSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="h-28 animate-pulse bg-surface-raised" />
      <Card className="h-72 animate-pulse bg-surface-raised" />
    </div>
  );
}

function TrendChart({ history }: { history: PortfolioHistoryPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={history} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="portfolio-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          stroke="rgba(255,255,255,0.58)"
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          stroke="rgba(255,255,255,0.58)"
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => currencyFormatter.format(value)}
          width={72}
        />
        <Tooltip
          cursor={{ stroke: 'rgba(255,255,255,0.35)', strokeWidth: 1 }}
          contentStyle={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10 }}
          labelStyle={{ color: 'rgba(255,255,255,0.58)' }}
          itemStyle={{ color: '#ffffff' }}
          labelFormatter={(label) => formatDate(label as string)}
          formatter={(value) => [currencyFormatter.format(Number(value)), 'Değer']}
        />
        <Area type="monotone" dataKey="totalValue" stroke="#ffffff" strokeWidth={2} fill="url(#portfolio-fill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Portfolio() {
  const steamId = useAuthStore((s) => s.user?.steamId);
  const query = usePortfolioHistory();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-primary">
        Portf<span className="text-glow">öy</span>
      </h1>
      <p className="mt-1 text-sm text-muted">Steam envanterinin değeri zaman içinde nasıl değişiyor.</p>

      <div className="mt-6">
        {!steamId ? (
          <ConnectSteamCard />
        ) : query.isLoading ? (
          <PortfolioSkeleton />
        ) : query.isError ? (
          <Card className="text-center text-sm text-danger">
            {query.error instanceof ApiError ? query.error.message : 'Portföy verisi yüklenemedi.'}
          </Card>
        ) : query.data ? (
          <div className="space-y-6">
            <Card className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted">Toplam değer</p>
                <p className="mt-1 font-display text-4xl font-bold text-glow">
                  {currencyFormatter.format(query.data.today.totalValue)}
                </p>
                <p className="mt-1 text-xs text-muted">{query.data.today.itemCount} eşya</p>
              </div>
              {query.data.change && (
                <div
                  className={
                    'flex items-center gap-1.5 text-sm font-medium ' +
                    (query.data.change.abs >= 0 ? 'text-success' : 'text-danger')
                  }
                >
                  {query.data.change.abs >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {currencyFormatter.format(Math.abs(query.data.change.abs))} ({query.data.change.pct.toFixed(1)}%)
                  <span className="text-muted">dün</span>
                </div>
              )}
            </Card>

            <Card>
              {query.data.history.length < 2 ? (
                <p className="py-10 text-center text-sm text-muted">
                  Trend grafiği için geçmiş birikiyor — birkaç gün sonra tekrar bak.
                </p>
              ) : (
                <TrendChart history={query.data.history} />
              )}
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
