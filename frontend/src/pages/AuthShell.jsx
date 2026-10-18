import { Link } from 'react-router-dom';
import { Brand } from '../components/Sidebar.jsx';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <Link to="/" className="mb-6" aria-label="CampusCare home"><Brand /></Link>
      <main className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </main>
      {footer && <p className="mt-5 text-sm text-slate-600">{footer}</p>}
    </div>
  );
}
