import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { I, IconBubble, type IconName } from './Icon';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card animate-rise ${className}`}>{children}</section>;
}

export function ProgressBar({ value, tone = 'pink', height = 'h-3' }: { value: number; tone?: 'pink' | 'blue' | 'mint' | 'lav'; height?: string }) {
  const grad = {
    pink: 'from-peach-300 via-blush-400 to-lav-400',
    blue: 'from-sky-300 to-lav-400',
    mint: 'from-mint-300 to-sky-300',
    lav: 'from-lav-300 to-blush-400',
  }[tone];
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={`w-full overflow-hidden rounded-full bg-lav-100 ${height}`} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full bg-gradient-to-l ${grad} transition-[width] duration-1000 ease-out`} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Ring({ value, size = 112, stroke = 12, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#f48fb1" /><stop offset="100%" stopColor="#b39ddb" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#f6f2ff" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="url(#ringGrad)" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * v) / 100} style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-plum/30 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-cream-50 p-5 shadow-soft sm:rounded-3xl animate-rise ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <button className="btn-ghost !px-2 !py-1 text-xl" onClick={onClose} aria-label="إغلاق">✕</button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-plum-faint">{hint}</span>}
    </label>
  );
}

export function Empty({ icon = 'flower', text }: { icon?: IconName; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center text-plum-faint">
      <span className="animate-floaty"><IconBubble n={icon} size="h-12 w-12" icon={22} /></span>
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function Stat({ label, value, sub, icon, tone = 'lav' }: { label: string; value: ReactNode; sub?: ReactNode; icon?: IconName; tone?: 'lav' | 'pink' | 'blue' | 'mint' | 'cream' }) {
  const bg = { lav: 'bg-lav-50', pink: 'bg-blush-50', blue: 'bg-sky-50', mint: 'bg-mint-100', cream: 'bg-cream-100' }[tone];
  const ic = { lav: 'text-lav-500', pink: 'text-blush-500', blue: 'text-sky-400', mint: 'text-mint-500', cream: 'text-[#c99a06]' }[tone];
  return (
    <div className={`rounded-2xl ${bg} p-3`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-plum-soft">{icon && <I n={icon} size={15} className={ic} />}{label}</div>
      <div className="mt-1 text-xl font-bold leading-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-plum-faint">{sub}</div>}
    </div>
  );
}

// ---------- toasts ----------
type Toast = { id: number; text: string; tone: 'ok' | 'err' };
const ToastCtx = createContext<(text: string, tone?: 'ok' | 'err') => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, tone }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), tone === 'err' ? 6000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`pointer-events-auto max-w-md rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-soft animate-rise ${t.tone === 'ok' ? 'bg-white text-plum' : 'bg-blush-100 text-blush-500'}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
