import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '../lib/api.js';
import { timeAgo } from '../lib/format.js';

export default function NotificationDropdown({ base }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const root = useRef(null);

  const refreshCount = useCallback(() => {
    api.get('/notifications/unread-count').then((r) => setUnread(r.data.unreadCount)).catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 60000);
    return () => clearInterval(t);
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return undefined;
    setLoading(true);
    api
      .get('/notifications', { limit: 6 })
      .then((r) => {
        setItems(r.data);
        setUnread(r.unreadCount);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    const onDoc = (e) => !root.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function openItem(n) {
    setOpen(false);
    if (!n.isRead) {
      api.patch(`/notifications/${n._id}/read`).then(refreshCount).catch(() => {});
    }
    if (n.complaint?._id) navigate(`${base}/complaints/${n.complaint._id}`);
  }

  async function markAll() {
    await api.patch('/notifications/read-all').catch(() => {});
    setItems((list) => list.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  }

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={20} aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg" role="menu">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            {unread > 0 && (
              <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline" onClick={markAll}>
                <CheckCheck size={14} aria-hidden="true" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && <p className="p-4 text-sm text-slate-500">Loading...</p>}
            {!loading && items.length === 0 && <p className="p-6 text-center text-sm text-slate-500">You're all caught up.</p>}
            {items.map((n) => (
              <button
                key={n._id}
                type="button"
                role="menuitem"
                onClick={() => openItem(n)}
                className={`block w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50 ${n.isRead ? '' : 'bg-brand-50/50'}`}
              >
                <div className="flex items-start gap-2">
                  {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{n.title}</p>
                    <p className="line-clamp-2 text-xs text-slate-600">{n.message}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <Link to={`${base}/notifications`} onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-medium text-brand-700 hover:bg-slate-50">
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
