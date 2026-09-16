import { useParams } from 'react-router-dom';
import { PlaceholderPage } from '@/components/layout/PlaceholderPage';

const TITLES: Record<string, string> = {
  terms: 'Kullanım Şartları',
  privacy: 'Gizlilik Politikası',
  'responsible-trading': 'Sorumlu Trade',
};

export function Legal() {
  const { slug = 'terms' } = useParams();
  return (
    <PlaceholderPage
      title={TITLES[slug] ?? 'Yasal'}
      phase="Faz 5"
      description="Sadece layout shell — içerik en düşük öncelikli, en son yazılacak."
    />
  );
}
