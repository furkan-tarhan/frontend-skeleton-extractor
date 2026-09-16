import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export interface PlaceholderPageProps {
  title: string;
  phase: string;
  description: string;
  children?: ReactNode;
}

export function PlaceholderPage({ title, phase, description, children }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Badge tone="accent">{phase}</Badge>
      <h1 className="mt-3 text-3xl font-bold text-primary">{title}</h1>
      <p className="mt-2 max-w-2xl text-muted">{description}</p>

      {children ?? (
        <Card className="mt-8">
          <p className="text-sm text-muted">Bu sayfa henüz planlanan fazda uygulanmadı.</p>
        </Card>
      )}
    </div>
  );
}
