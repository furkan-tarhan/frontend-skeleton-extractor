import { NavLink } from 'react-router-dom';
import { Wallet, Package, LifeBuoy, LineChart, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { AuthAction } from '@/components/auth/AuthAction';

interface NavLinkItem {
  to: string;
  label: string;
  icon?: LucideIcon;
}

const links: NavLinkItem[] = [
  { to: '/market', label: 'Market' },
  { to: '/inventory', label: 'Envanter', icon: Package },
  { to: '/portfolio', label: 'Portföy', icon: LineChart },
  { to: '/wallet', label: 'Cüzdan', icon: Wallet },
  { to: '/support', label: 'Destek', icon: LifeBuoy },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-subtle bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <NavLink to="/" className="font-display text-lg font-bold text-primary">
          Loop<span className="text-glow">Skins</span>
        </NavLink>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-primary',
                  isActive && 'text-primary'
                )
              }
            >
              {Icon && <Icon size={16} />}
              {label}
            </NavLink>
          ))}
        </nav>

        <AuthAction />
      </div>
    </header>
  );
}
