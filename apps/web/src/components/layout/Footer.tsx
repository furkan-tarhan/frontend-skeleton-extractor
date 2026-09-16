import { Link } from 'react-router-dom';

const columns = [
  {
    title: 'Ürün',
    links: [
      { to: '/market', label: 'Market' },
      { to: '/wallet', label: 'Cüzdan' },
    ],
  },
  {
    title: 'Destek',
    links: [
      { to: '/support', label: 'SSS' },
      { to: '/legal/terms', label: 'Kullanım Şartları' },
      { to: '/legal/privacy', label: 'Gizlilik' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-subtle">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="font-display text-lg font-bold text-primary">
            Loop<span className="text-glow">Skins</span>
          </p>
          <p className="mt-2 max-w-xs text-sm text-muted">
            CS2 skin trading için hızlı ve şeffaf bir pazar yeri.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-medium text-primary">{col.title}</p>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-muted hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-subtle px-4 py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} LoopSkins. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}
