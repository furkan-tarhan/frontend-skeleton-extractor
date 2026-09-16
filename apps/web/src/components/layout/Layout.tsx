import { Outlet } from 'react-router-dom';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { CoverflowBackground } from './CoverflowBackground';

export function Layout() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <CoverflowBackground />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Nav />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
