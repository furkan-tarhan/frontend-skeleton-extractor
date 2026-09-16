import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Home } from '@/pages/Home';
import { Market } from '@/pages/Market';
import { ItemDetail } from '@/pages/ItemDetail';
import { Trade } from '@/pages/Trade';
import { Wallet } from '@/pages/Wallet';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { SteamCallback } from '@/pages/SteamCallback';
import { Profile } from '@/pages/Profile';
import { Inventory } from '@/pages/Inventory';
import { Portfolio } from '@/pages/Portfolio';
import { History } from '@/pages/History';
import { Support } from '@/pages/Support';
import { Legal } from '@/pages/Legal';
import { NotFound } from '@/pages/NotFound';

export const router = createBrowserRouter([
  // No Layout/Nav/coverflow — this is a transient page the Steam OAuth
  // popup lands on, it never needs the chrome around it.
  { path: '/steam-callback', element: <SteamCallback /> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'market', element: <Market /> },
      { path: 'market/item/:id', element: <ItemDetail /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'support', element: <Support /> },
      { path: 'legal/:slug', element: <Legal /> },
      {
        element: <RequireAuth />,
        children: [
          { path: 'trade', element: <Trade /> },
          { path: 'wallet', element: <Wallet /> },
          { path: 'profile', element: <Profile /> },
          { path: 'inventory', element: <Inventory /> },
          { path: 'portfolio', element: <Portfolio /> },
          { path: 'history', element: <History /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
