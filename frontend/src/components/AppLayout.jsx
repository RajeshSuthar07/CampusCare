import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_HOME } from '../lib/format.js';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await logout().catch(() => {});
    toast.success('You have been logged out');
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow">
        Skip to content
      </a>
      <Sidebar user={user} mobileOpen={open} onClose={() => setOpen(false)} onLogout={handleLogout} />
      <div className="lg:pl-64">
        <Header user={user} base={ROLE_HOME[user.role]} onMenu={() => setOpen(true)} />
        <main id="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
