import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useData } from '../lib/store';
import { fmtDateTime } from '../lib/dates';
import { HeaderDecor } from './Decor';

type NavItem = { to: string; label: string; icon: string };

const STUDENT_NAV: NavItem[] = [
  { to: '/', label: 'اليوم', icon: '🌷' },
  { to: '/week', label: 'أسبوعي', icon: '🗓️' },
  { to: '/courses', label: 'كورساتي', icon: '📚' },
  { to: '/rewards', label: 'حصالتي', icon: '💰' },
  { to: '/history', label: 'إنجازاتي', icon: '📝' },
];
const GUARDIAN_NAV: NavItem[] = [
  { to: '/g', label: 'الرئيسية', icon: '🏠' },
  { to: '/g/review', label: 'المراجعة', icon: '✅' },
  { to: '/g/courses', label: 'الكورسات', icon: '📚' },
  { to: '/g/schedule', label: 'الجدول', icon: '🗓️' },
  { to: '/g/rewards', label: 'المكافآت', icon: '💰' },
  { to: '/g/analytics', label: 'التحليلات', icon: '📊' },
];

export function Layout({ children }: { children: ReactNode }) {
  const d = useData();
  const nav = d.me.role === 'guardian' ? GUARDIAN_NAV : STUDENT_NAV;
  const pendingReview = d.checkins.filter((c) => c.status === 'pending').length + d.rewards.filter((r) => r.status === 'pending').length;
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-28 pt-4 sm:pb-10">
      <header className="relative mb-4 flex items-center justify-between gap-3 rounded-3xl bg-white/60 px-4 py-3 shadow-soft backdrop-blur">
        <HeaderDecor />
        <div className="relative flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-blush-200 to-lav-200 text-xl">{d.me.role === 'guardian' ? '🛡️' : '🌷'}</span>
          <div>
            <div className="font-display text-lg font-bold leading-tight">رحلتي</div>
            <div className="text-xs text-plum-soft">{d.me.role === 'guardian' ? 'لوحة ولي الأمر' : d.me.display_name}</div>
          </div>
        </div>
        <div className="relative flex items-center gap-1">
          <Bell />
          {d.me.role === 'guardian' && (
            <NavLink to="/g/settings" className="btn-ghost !px-2.5" aria-label="الإعدادات">⚙️</NavLink>
          )}
          <button className="btn-ghost !px-2.5 text-sm" onClick={() => supabase.auth.signOut()}>خروج</button>
        </div>
      </header>

      {/* desktop nav */}
      <nav className="mb-5 hidden gap-1 rounded-2xl bg-white/60 p-1.5 shadow-soft backdrop-blur sm:flex">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/' || n.to === '/g'}
            className={({ isActive }) => `flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-gradient-to-l from-blush-100 to-lav-100 text-lav-600' : 'text-plum-soft hover:bg-lav-50'}`}>
            <span>{n.icon}</span>{n.label}
            {n.to === '/g/review' && pendingReview > 0 && <span className="chip bg-blush-400 text-white">{pendingReview}</span>}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 space-y-4">{children}</main>

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white bg-white/85 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 shadow-[0_-8px_30px_-12px_rgba(115,88,199,.3)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md justify-between">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/' || n.to === '/g'}
              className={({ isActive }) => `relative flex min-w-0 flex-1 flex-col items-center rounded-xl py-1 text-[11px] font-semibold ${isActive ? 'text-lav-600' : 'text-plum-faint'}`}>
              {({ isActive }) => (<>
                <span className={`text-xl transition ${isActive ? 'scale-110' : 'grayscale-[40%]'}`}>{n.icon}</span>
                <span className="truncate">{n.label}</span>
                {n.to === '/g/review' && pendingReview > 0 && <span className="absolute right-2 top-0 h-2.5 w-2.5 rounded-full bg-blush-400" />}
              </>)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function Bell() {
  const d = useData();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const unread = d.notifications.filter((n) => !n.read_at).length;
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);
  const toggle = async () => {
    setOpen((o) => !o);
    if (!open && unread) {
      await supabase.rpc('mark_notifications_read');
      d.refresh();
    }
  };
  return (
    <div className="relative">
      <button className="btn-ghost relative !px-2.5" onClick={toggle} aria-label={`الإشعارات (${unread} جديدة)`}>
        🔔
        {unread > 0 && <span className="absolute -top-0.5 left-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-blush-400 px-1 text-[10px] text-white">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-4 top-20 z-50 max-h-[70vh] overflow-y-auto rounded-3xl bg-white p-3 shadow-soft sm:absolute sm:inset-x-auto sm:left-0 sm:top-12 sm:w-80 animate-rise">
            <div className="mb-2 px-1 font-display font-bold">الإشعارات</div>
            {d.notifications.length === 0 && <p className="p-3 text-center text-sm text-plum-faint">لا توجد إشعارات بعد 🌸</p>}
            <ul className="space-y-1">
              {d.notifications.slice(0, 30).map((n) => (
                <li key={n.id}>
                  <button className={`w-full rounded-2xl p-2.5 text-right transition hover:bg-lav-50 ${n.read_at ? '' : 'bg-blush-50'}`}
                    onClick={() => { setOpen(false); if (n.link) navigate(n.link); }}>
                    <div className="text-sm font-semibold">{n.title}</div>
                    {n.body && <div className="text-xs text-plum-soft">{n.body}</div>}
                    <div className="mt-0.5 text-[10px] text-plum-faint">{fmtDateTime(n.created_at)}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
