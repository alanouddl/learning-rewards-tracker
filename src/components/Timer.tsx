import { useEffect, useState } from 'react';
import { supabase, friendlyError } from '../lib/supabase';
import { useData } from '../lib/store';
import { useToast } from './ui';

export function elapsedSeconds(t: { running: boolean; started_at: string | null; accumulated_seconds: number } | null, offsetMs: number) {
  if (!t) return 0;
  const live = t.running && t.started_at ? Math.max(0, (Date.now() + offsetMs - new Date(t.started_at).getTime()) / 1000) : 0;
  return Math.floor(t.accumulated_seconds + live);
}

const two = (n: number) => String(n).padStart(2, '0');
export const clock = (s: number) => `${s >= 3600 ? `${Math.floor(s / 3600)}:` : ''}${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;

/** Study timer stored in the database, so it survives reloads and works across devices. */
export function StudyTimer({ courseId, targetMinutes, onFinish }: { courseId: string | null; targetMinutes: number; onFinish: (minutes: number, courseId: string | null) => void }) {
  const d = useData();
  const toast = useToast();
  const [timer, setTimer] = useState(d.timer);
  const [offset, setOffset] = useState(d.clockOffsetMs);
  const [, tick] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setTimer(d.timer); setOffset(d.clockOffsetMs); }, [d.timer, d.clockOffsetMs]);
  useEffect(() => {
    if (!timer?.running) return;
    const i = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, [timer?.running]);

  const secs = elapsedSeconds(timer, offset);
  const started = !!timer && (timer.running || timer.accumulated_seconds > 0);
  const goal = targetMinutes * 60;
  const pct = goal ? Math.min(100, (secs / goal) * 100) : 0;

  async function act(action: 'start' | 'pause' | 'resume' | 'reset') {
    setBusy(true);
    const { data, error } = await supabase.rpc('timer_action', { p_action: action, p_course: courseId });
    setBusy(false);
    if (error) return toast(friendlyError(error), 'err');
    setTimer(data);
    setOffset(new Date(data.server_now).getTime() - Date.now());
    return data;
  }

  async function finish() {
    let t = timer;
    if (t?.running) t = await act('pause');
    const s = elapsedSeconds(t ?? null, offset);
    onFinish(Math.max(1, Math.round(s / 60)), t?.course_id ?? courseId);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative grid h-44 w-44 place-items-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
          <circle cx="50" cy="50" r="44" stroke="#ece4ff" strokeWidth="7" fill="none" />
          <circle cx="50" cy="50" r="44" stroke="url(#tg)" strokeWidth="7" fill="none" strokeLinecap="round"
            strokeDasharray={276.5} strokeDashoffset={276.5 - (276.5 * pct) / 100} style={{ transition: 'stroke-dashoffset .9s linear' }} />
          <defs><linearGradient id="tg"><stop offset="0" stopColor="#9dcdf4" /><stop offset="1" stopColor="#f27ea9" /></linearGradient></defs>
        </svg>
        <div className="text-center">
          <div className="ltr font-display text-4xl font-bold tabular-nums" aria-live="off">{clock(secs)}</div>
          <div className="text-xs text-plum-soft">{timer?.running ? 'جاري المذاكرة… 📖' : started ? 'متوقف مؤقتاً ⏸️' : `الهدف ${targetMinutes || '—'} دقيقة`}</div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {!started && <button className="btn-primary min-w-32" disabled={busy} onClick={() => act('start')}>▶ ابدئي</button>}
        {timer?.running && <button className="btn-soft min-w-28" disabled={busy} onClick={() => act('pause')}>⏸ إيقاف مؤقت</button>}
        {started && !timer?.running && <button className="btn-soft min-w-28" disabled={busy} onClick={() => act('resume')}>▶ استئناف</button>}
        {started && <button className="btn-primary min-w-28" disabled={busy} onClick={finish}>✓ إنهاء</button>}
        {started && !timer?.running && (
          <button className="btn-ghost text-sm" disabled={busy} onClick={() => confirm('تصفير المؤقت؟') && act('reset')}>تصفير</button>
        )}
      </div>
    </div>
  );
}
