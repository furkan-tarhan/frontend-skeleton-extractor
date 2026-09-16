import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="font-display text-5xl font-bold text-accent">404</p>
      <h1 className="mt-3 text-xl font-semibold text-primary">Sayfa bulunamadı</h1>
      <p className="mt-2 text-sm text-muted">Aradığın sayfa taşınmış veya hiç var olmamış olabilir.</p>
      <Link to="/" className="mt-6 inline-block">
        <Button>Ana sayfaya dön</Button>
      </Link>
    </div>
  );
}
