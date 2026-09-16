import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { SkinCarousel } from '@/components/SkinCarousel';
import { fetchPopularSkins } from '@/lib/api';

export function Home() {
  const { data } = useQuery({ queryKey: ['popular-skins'], queryFn: fetchPopularSkins });

  const trending = data?.data.slice(0, 8).map((skin) => ({
    id: skin.skinId,
    name: `${skin.weapon} | ${skin.name}`,
    price: `$${skin.price.min.toFixed(2)}`,
    image: skin.image,
  }));

  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="font-display text-4xl font-bold text-primary md:text-5xl">
          CS2 skinlerini <span className="text-glow">hızlı ve güvenle</span> takas et
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          LoopSkins; Steam ile giriş yap, envanterini gör, saniyeler içinde takas teklifi oluştur.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/market">
            <Button size="lg">Market'e göz at</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" size="lg">
              Giriş Yap
            </Button>
          </Link>
        </div>
      </section>

      {trending && trending.length > 0 && <SkinCarousel title="Popüler skinler" skins={trending} />}
    </div>
  );
}
