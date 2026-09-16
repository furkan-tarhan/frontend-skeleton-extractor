import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';

export function RequireAuth() {
  const { data: user, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-20 text-center text-muted">Yükleniyor…</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
