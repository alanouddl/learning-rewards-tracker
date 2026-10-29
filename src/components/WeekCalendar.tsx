import { DAY_SHORT, dow, fmtDate, todayStr } from '../lib/dates';
import { dayState, minutesOn, planFor, type DayState } from '../lib/plan';
import type { Data } from '../lib/store';

export const STATE_STYLE: Record<DayState, { bg: string; icon: string; label: string }> = {
  done: { bg: 'bg-mint-100 border-mint-300', icon: '✅', label: 'مكتمل' },
  awaiting: { bg: 'bg-lav-100 border-lav-300', icon: '⏳', label: 'بانتظار الموافقة' },
  partial: { bg: 'bg-peach-100 border-peach-300', icon: '🌤️', label: 'جزئي' },
  missed: { bg: 'bg-blush-50 border-blush-200', icon: '🌙', label: 'فاتك' },
  rescheduled: { bg: 'bg-sky-50 border-sky-200', icon: '📅', label: 'تم تعويضه' },
  today: { bg: 'bg-white border-gold-400 ring-4 ring-gold-100', icon: '✨', label: 'اليوم' },
  upcoming: { bg: 'bg-white/70 border-lav-100', icon: '🗓️', label: 'قادم' },
  rest: { bg: 'bg-cream-100 border-cream-200', icon: '🌸', label: 'راحة' },
  before: { bg: 'bg-white/50 border-lav-50', icon: '·', label: 'قبل البداية' },
};

export function WeekCalendar({ d, days, onPick, selected }: { d: Data; days: string[]; onPick?: (date: string) => void; selected?: string }) {
  const today = todayStr();
  return (
    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {days.map((x) => {
        const st = dayState(x, d, today);
        const p = planFor(x, d.schedule, d.planChanges);
        const m = minutesOn(x, d.checkins);
        const s = STATE_STYLE[x === today && (st === 'today' || st === 'partial') ? 'today' : st];
        return (
          <button key={x} type="button" onClick={() => onPick?.(x)}
            className={`flex min-w-0 flex-col items-center rounded-2xl border px-0.5 py-2 text-center transition hover:-translate-y-0.5 ${s.bg} ${selected === x ? 'outline outline-2 outline-lav-400' : ''}`}
            aria-label={`${DAY_SHORT[dow(x)]} ${fmtDate(x)}: ${STATE_STYLE[st].label}`}>
            <span className="text-[11px] font-semibold text-plum-soft">{DAY_SHORT[dow(x)]}</span>
            <span className="text-sm font-bold">{fmtDate(x, { day: 'numeric' })}</span>
            <span className="my-0.5 text-base leading-none">{s.icon}</span>
            <span className="text-[10px] text-plum-faint">{p.minutes ? `${m}/${p.minutes}` : m ? `${m}` : '—'}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Legend() {
  const keys: DayState[] = ['done', 'awaiting', 'partial', 'missed', 'rest'];
  return (
    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-plum-soft">
      {keys.map((k) => <span key={k}>{STATE_STYLE[k].icon} {STATE_STYLE[k].label}</span>)}
    </div>
  );
}
