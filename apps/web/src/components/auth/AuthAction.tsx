import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { clearToken } from '@/lib/token';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';

export function AuthAction() {
  const { data: user, isLoading } = useSession();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();

  const logout = () => {
    clearToken();
    setUser(null);
    queryClient.setQueryData(['session'], null);
    navigate('/');
  };

  if (isLoading) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-surface-raised" />;
  }

  if (!user) {
    return (
      <Link to="/login">
        <Button variant="primary" size="sm">
          Giriş Yap
        </Button>
      </Link>
    );
  }

  const avatar = user.steamProfile?.avatar ?? user.profile?.avatar;

  return (
    <div className="flex items-center gap-3">
      <Link to="/profile" className="flex items-center gap-2">
        {avatar ? (
          <img src={avatar} alt={user.username} className="h-8 w-8 rounded-full" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-ink">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
        )}
        <span className="hidden text-sm font-medium text-primary sm:inline">{user.username}</span>
      </Link>
      <Button variant="ghost" size="sm" onClick={logout} aria-label="Çıkış yap">
        <LogOut size={16} />
      </Button>
    </div>
  );
}
