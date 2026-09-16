import { useSession } from '@/hooks/useSession';
import { Card } from '@/components/ui/Card';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';

export function Profile() {
  const { data: user } = useSession();

  if (!user) return null;

  const avatar = user.steamProfile?.avatar ?? user.profile?.avatar;

  return (
    <PlaceholderPage
      title="Profil"
      phase="Faz 4"
      description="Ayarlar ve trade geçmişi burada olacak. Şimdilik backend'den gelen özet:"
    >
      <div className="mt-8 grid gap-4 sm:grid-cols-[auto_1fr]">
        <Card className="flex items-center gap-4">
          {avatar ? (
            <img src={avatar} alt={user.username} className="h-16 w-16 rounded-full" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-lg font-bold text-ink">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium text-primary">{user.username}</p>
            <p className="text-sm text-muted">{user.email}</p>
            {user.steamId && <p className="mt-1 text-xs text-muted">SteamID: {user.steamId}</p>}
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <p className="text-xs text-muted">Bakiye</p>
            <p className="mt-1 text-xl font-bold text-primary">${user.balance.toFixed(2)}</p>
          </Card>
          <Card>
            <p className="text-xs text-muted">Aktif ilan</p>
            <p className="mt-1 text-xl font-bold text-primary">{user.stats.activeListings}</p>
          </Card>
          <Card>
            <p className="text-xs text-muted">Tamamlanan satış</p>
            <p className="mt-1 text-xl font-bold text-primary">{user.stats.completedSales}</p>
          </Card>
        </div>
      </div>
    </PlaceholderPage>
  );
}
