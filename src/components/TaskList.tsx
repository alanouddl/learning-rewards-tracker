import { I } from './Icon';
import { useState } from 'react';
import { supabase, friendlyError } from '../lib/supabase';
import { useData } from '../lib/store';
import { addDays, fmtDate, todayStr, weekStart } from '../lib/dates';
import { courseName } from '../lib/plan';
import { Empty, useToast } from './ui';
import type { Task } from '../lib/types';

export function periodKey(t: Task, today = todayStr()) {
  if (t.kind === 'weekly') return weekStart(today);
  if (t.kind === 'once') return t.due_date ?? today;
  return today;
}

/** Today's daily tasks, this week's weekly tasks, and due / overdue one-off tasks. */
export function TaskList() {
  const d = useData();
  const toast = useToast();
  const today = todayStr();
  const [moving, setMoving] = useState<string | null>(null);
  const [newDate, setNewDate] = useState(addDays(today, 1));

  const tasks = d.tasks.filter((t) => t.active && (t.kind !== 'once' || (t.due_date ?? today) <= addDays(today, 7)));
  const isDone = (t: Task) => d.completions.some((c) => c.task_id === t.id && c.period_key === periodKey(t, today));
  const visible = tasks.filter((t) => !(t.kind === 'once' && isDone(t) && (t.due_date ?? today) < today));

  async function toggle(t: Task) {
    const { error } = await supabase.rpc('toggle_task', { p_task: t.id, p_period: periodKey(t, today), p_done: !isDone(t) });
    if (error) toast(friendlyError(error), 'err'); else d.refresh();
  }
  async function move(t: Task) {
    const { error } = await supabase.rpc('reschedule_task', { p_task: t.id, p_new_date: newDate });
    if (error) return toast(friendlyError(error), 'err');
    toast('تم نقل المهمة'); setMoving(null); d.refresh();
  }

  if (!visible.length) return <Empty text="لا توجد مهام حالياً" />;
  return (
    <ul className="space-y-2">
      {visible.map((t) => {
        const done = isDone(t);
        const overdue = t.kind === 'once' && !done && (t.due_date ?? today) < today;
        return (
          <li key={t.id} className={`rounded-2xl border p-3 ${done ? 'border-mint-300 bg-mint-100/50' : overdue ? 'border-peach-300 bg-peach-100/50' : 'border-lav-100 bg-white'}`}>
            <div className="flex items-start gap-3">
              <button onClick={() => toggle(t)} aria-label={done ? 'إلغاء الإنجاز' : 'تم'}
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 text-sm transition ${done ? 'border-mint-500 bg-mint-500 text-white' : 'border-lav-300 bg-white'}`}>
                {done ? '✓' : ''}
              </button>
              <div className="min-w-0 flex-1">
                <div dir="auto" className={`text-right font-semibold ${done ? 'text-plum-faint line-through' : ''}`}>{t.title}</div>
                <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] text-plum-soft">
                  <span className="chip bg-lav-50">{t.kind === 'daily' ? 'يومية' : t.kind === 'weekly' ? 'أسبوعية' : t.due_date ? fmtDate(t.due_date) : 'مرة واحدة'}</span>
                  {t.course_id && <span className="chip bg-sky-50">{courseName(d.courses, t.course_id)}</span>}
                  {overdue && <span className="chip bg-peach-100">ممكن تنقلينها ليوم ثاني <I n="heart" /></span>}
                </div>
                {t.details && <p className="mt-1 text-xs text-plum-soft">{t.details}</p>}
              </div>
              {t.kind === 'once' && !done && (
                <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setMoving(moving === t.id ? null : t.id)}><I n="calendar-days" /> نقل</button>
              )}
            </div>
            {moving === t.id && (
              <div className="mt-2 flex gap-2">
                <input type="date" className="input !py-1.5" min={today} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                <button className="btn-soft !py-1.5" onClick={() => move(t)}>نقل</button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
