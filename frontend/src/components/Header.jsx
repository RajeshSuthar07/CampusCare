import { Menu } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown.jsx';

export default function Header({ user, base, onMenu }) {
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button type="button" className="btn-ghost !px-2 lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu size={22} aria-hidden="true" />
      </button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-2">
        <NotificationDropdown base={base} />
        <div className="flex items-center gap-2 pl-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800" aria-hidden="true">{initials}</span>
          <span className="hidden text-sm font-medium text-slate-700 sm:block">{user.name}</span>
        </div>
      </div>
    </header>
  );
}
