import { I, type IconName } from './Icon';
import { useEffect, useState, type ReactNode } from 'react';
import { Bell } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useData } from '../lib/store';
import { fmtDateTime } from '../lib/dates';
import { HeaderDecor } from './Decor';

type NavItem = { to: string; label: string; icon: IconName };

const STUDENT_NAV: NavItem[] = [
  { to: '/', label: 'اليوم', icon: 'tulip' },
  { to: '/week', label: 'أسبوعي', icon: 'calendar' },
  { to: '/courses', label: 'كورساتي', icon: 'book' },
  { to: '/rewards', label: 'حصالتي', icon: 'wallet' },
  { to: '/history', label: 'إنجازاتي', icon: 'notebook' },
];
const GUARDIAN_NAV: NavItem[] = [
  { to: '/g', label: 'الرئيسية', icon: 'house' },
  { to: '/g/review', label: 'المراجعة', icon: 'done' },
  { to: '/g/courses', label: 'الكورسات', icon: 'book' },
  { to: '/g/schedule', label: 'الجدول', icon: 'calendar' },
  { to: '/g/rewards', label: 'المكافآت', icon: 'wallet' },
  { to: '/g/analytics', label: 'التحليلات', icon: 'chart' },
];

export function Layout({ children }: { children: ReactNode }) {
  const d = useData();
  const nav = d.me.role === 'guardian' ? GUARDIAN_NAV : STUDENT_NAV;
  const pendingReview = d.checkins.filter((c) => c.status === 'pending').length + d.rewards.filter((r) => r.status === 'pending').length;
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-3 pb-28 pt-3 sm:px-5 sm:pb-10">
      <header className="relative flex items-center justify-between gap-3 rounded-full bg-white/80 px-4 py-2.5 shadow-soft backdrop-blur sm:px-6">
        <HeaderDecor />
        <div className="relative flex items-center gap-2">
          <Logo size="text-3xl" />
          <span className="hidden text-xs text-plum-faint sm:inline">{d.me.role === 'guardian' ? 'ولي الأمر' : d.me.display_name}</span>
        </div>
        {/* desktop links: active one is pink with a dot underneath */}
        <nav className="relative hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/' || n.to === '/g'}
              className={({ isActive }) => `relative flex flex-col items-center px-3 py-1.5 text-sm font-semibold transition ${isActive ? 'text-gold-500' : 'text-plum hover:text-gold-500'}`}>
              {({ isActive }) => (<>
                <span className="flex items-center gap-1">{n.label}
                  {n.to === '/g/review' && pendingReview > 0 && <span className="chip bg-gold-500 px-1.5 text-[10px] text-white">{pendingReview}</span>}</span>
                <span className={`mt-1 h-1.5 w-1.5 rounded-full ${isActive ? 'bg-gold-500' : 'bg-transparent'}`} />
              </>)}
            </NavLink>
          ))}
        </nav>
        <div className="relative flex items-center gap-1.5">
          <BellMenu />
          {d.me.role === 'guardian' && <NavLink to="/g/settings" className="btn-ghost !rounded-full !px-2.5" aria-label="الإعدادات"><I n="settings" /></NavLink>}
          <button className="btn-primary !px-4 !py-2 text-sm" onClick={() => supabase.auth.signOut()}>خروج <I n="external" size={15} /></button>
        </div>
      </header>

      {/* tablet nav (md hides it) */}
      <nav className="mt-3 hidden justify-center gap-1 rounded-full bg-white/70 p-1 shadow-soft sm:flex md:hidden">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/' || n.to === '/g'}
            className={({ isActive }) => `rounded-full px-3 py-1.5 text-sm font-semibold ${isActive ? 'bg-gold-500 text-white' : 'text-plum'}`}>{n.label}</NavLink>
        ))}
      </nav>

      <main className="mt-5 flex-1 space-y-5">{children}</main>

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-blush-100 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 shadow-[0_-8px_30px_-12px_rgba(194,74,119,.35)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md justify-between">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/' || n.to === '/g'}
              className={({ isActive }) => `relative flex min-w-0 flex-1 flex-col items-center rounded-xl py-1 text-[11px] font-semibold ${isActive ? 'text-lav-600' : 'text-plum-faint'}`}>
              {({ isActive }) => (<>
                <I n={n.icon} size={22} className={`transition ${isActive ? 'scale-110 text-blush-500' : ''}`} />
                <span className="truncate">{n.label}</span>
                {isActive && <span className="mt-0.5 h-1 w-5 rounded-full bg-gold-400" />}
                {n.to === '/g/review' && pendingReview > 0 && <span className="absolute right-2 top-0 h-2.5 w-2.5 rounded-full bg-gold-500" />}
              </>)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

/** Handwritten logo with a small heart, as in the reference. */
export function Logo({ size = 'text-5xl' }: { size?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-gold-500">
      <span className={`font-script ${size} font-bold leading-none`}>رحلتي</span>
      <I n="heart" size={18} className="-mt-3" />
    </span>
  );
}

function BellMenu() {
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
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
        {unread > 0 && <span className="absolute -top-0.5 left-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-blush-400 px-1 text-[10px] text-white">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-4 top-20 z-50 max-h-[70vh] overflow-y-auto rounded-3xl bg-white p-3 shadow-soft sm:absolute sm:inset-x-auto sm:left-0 sm:top-12 sm:w-80 animate-rise">
            <div className="mb-2 px-1 font-display font-bold">الإشعارات</div>
            {d.notifications.length === 0 && <p className="p-3 text-center text-sm text-plum-faint">لا توجد إشعارات بعد <I n="flower" /></p>}
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
