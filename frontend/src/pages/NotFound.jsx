import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_HOME } from '../lib/format.js';

export default function NotFound() {
  const { user } = useAuth();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <Compass size={28} aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-1 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">The page you are looking for does not exist or has been moved.</p>
      <Link to={user ? ROLE_HOME[user.role] : '/'} className="btn-primary mt-6">
        {user ? 'Back to dashboard' : 'Back to home'}
      </Link>
    </main>
  );
}
