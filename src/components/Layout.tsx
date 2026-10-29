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
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-3 pb-28 pt-3 sm:px-4 sm:pb-10">
      <div className="overflow-hidden rounded-[28px] bg-white shadow-soft">
        {/* announcement bar */}
        <div className="flex items-center justify-between gap-2 bg-blush-100 px-4 py-2">
          <span className="text-gold-500" aria-hidden="true">✦ ✧</span>
          <p className="truncate text-center text-[11px] font-semibold tracking-[0.2em] text-lav-600">
            {d.me.role === 'guardian' ? 'لوحة ولي الأمر — خاصة ومحمية 🔒' : 'خطوة صغيرة كل يوم ✨ حلمك يقرب'}
          </p>
          <div className="flex items-center gap-0.5">
            <Bell />
            {d.me.role === 'guardian' && <NavLink to="/g/settings" className="btn-ghost !px-2 !py-1" aria-label="الإعدادات">⚙️</NavLink>}
            <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => supabase.auth.signOut()}>خروج</button>
          </div>
        </div>

        {/* centred two-tone logo */}
        <header className="relative px-4 pb-3 pt-4 text-center">
          <HeaderDecor />
          <Logo />
          <div className="mt-1 eyebrow">{d.me.role === 'guardian' ? 'GUARDIAN · ولي الأمر' : `LEARN · GROW · SHINE — ${d.me.display_name}`}</div>
        </header>

        {/* desktop nav strip */}
        <nav className="hidden justify-center gap-1 border-t border-blush-100 bg-blush-50 px-2 sm:flex">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/' || n.to === '/g'}
              className={({ isActive }) => `relative flex items-center gap-1.5 px-4 py-3 text-xs font-semibold tracking-[0.18em] transition ${isActive ? 'text-lav-600 after:absolute after:inset-x-4 after:bottom-0 after:h-[3px] after:rounded-full after:bg-gold-400' : 'text-plum-soft hover:text-lav-600'}`}>
              {n.label}
              {n.to === '/g/review' && pendingReview > 0 && <span className="chip bg-gold-500 text-white">{pendingReview}</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      <main className="mt-4 flex-1 space-y-4">{children}</main>

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-blush-100 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 shadow-[0_-8px_30px_-12px_rgba(194,74,119,.35)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md justify-between">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/' || n.to === '/g'}
              className={({ isActive }) => `relative flex min-w-0 flex-1 flex-col items-center rounded-xl py-1 text-[11px] font-semibold ${isActive ? 'text-lav-600' : 'text-plum-faint'}`}>
              {({ isActive }) => (<>
                <span className={`text-xl transition ${isActive ? 'scale-110' : 'grayscale-[40%]'}`}>{n.icon}</span>
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

/** "Candy Wishes"-style logo: two-tone script word with a little sun-burst. */
export function Logo({ size = 'text-5xl' }: { size?: string }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg viewBox="0 0 40 40" className="absolute -left-7 -top-3 h-9 w-9 text-gold-400" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => {
          const a = (-150 + i * 15) * (Math.PI / 180);
          return <line key={i} x1={20 + Math.cos(a) * 9} y1={30 + Math.sin(a) * 9} x2={20 + Math.cos(a) * 17} y2={30 + Math.sin(a) * 17} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />;
        })}
      </svg>
      {/* one connected word (Arabic letters must stay joined), shaded pink → gold */}
      <span className={`font-script ${size} bg-gradient-to-l from-blush-500 via-blush-400 to-gold-400 bg-clip-text pb-2 font-bold leading-tight text-transparent`}>
        رحلتي
      </span>
      <span className="absolute -right-5 top-0 text-sm text-gold-400" aria-hidden="true">✦</span>
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
