import { useState } from 'react';
import { supabase, friendlyError } from '../../lib/supabase';
import { useData } from '../../lib/store';
import { addDays, DAY_NAMES, dow, fmtDate, todayStr, weekStart } from '../../lib/dates';
import { courseName, dayState, minutesOn, planFor, weekStats } from '../../lib/plan';
import { mins, pct, REWARD_STATUS } from '../../lib/format';
import { Card, ProgressBar, Stat, useToast } from '../../components/ui';
import { Legend, STATE_STYLE, WeekCalendar } from '../../components/WeekCalendar';

export function DayDetail({ date }: { date: string }) {
  const d = useData();
  const toast = useToast();
  const today = todayStr();
  const p = planFor(date, d.schedule, d.planChanges);
  const st = dayState(date, d, today);
  const list = d.checkins.filter((c) => c.study_date === date);
  const [to, setTo] = useState(today);
  const canReschedule = (st === 'missed' || st === 'partial') && date < today && d.me.role === 'student';

  async function reschedule() {
    const { error } = await supabase.rpc('reschedule_day', { p_from: date, p_to: to });
    if (error) return toast(friendlyError(error), 'err');
    toast('تم! أضفنا جلسة تعويض 💜'); d.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold">{DAY_NAMES[dow(date)]} {fmtDate(date)}</h3>
        <span className={`chip border ${STATE_STYLE[st].bg}`}>{STATE_STYLE[st].icon} {STATE_STYLE[st].label}</span>
      </div>
      <div className="rounded-2xl bg-lav-50 p-3 text-sm">
        {p.minutes ? (
          <>
            <div><b>{p.label || courseName(d.courses, p.course_id)}</b> — {p.minutes} دقيقة</div>
            {p.task_text && <div className="text-plum-soft"><bdi>{p.task_text}</bdi></div>}
            {p.makeups.map((m) => <div key={m.id} className="mt-1 text-sky-400">📅 {m.label} (+{m.minutes} د)</div>)}
          </>
        ) : 'يوم راحة 🌸'}
        <div className="mt-1 text-plum-soft">المسجّل: {minutesOn(date, d.checkins)} دقيقة</div>
      </div>
      {st === 'missed' && <p className="text-sm text-plum-soft">عادي يصير! 💛 تقدرين تعوضينه في يوم ثاني.</p>}
      {canReschedule && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex-1"><span className="label">تعويض في يوم:</span>
            <input type="date" className="input" min={today} max={addDays(today, 30)} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button className="btn-soft" onClick={reschedule}>📅 تعويض</button>
        </div>
      )}
      {list.map((c) => (
        <div key={c.id} className="rounded-2xl border border-lav-100 bg-white p-3 text-sm">
          <div className="flex justify-between"><b>{c.minutes} دقيقة</b><span className="text-xs text-plum-soft">{c.status === 'approved' ? '✅ معتمد' : c.status === 'rejected' ? '↩️ يحتاج تعديل' : '⏳ ' + REWARD_STATUS.pending}</span></div>
          <p className="mt-1">{c.finished}</p>
          {c.feedback && <p className="mt-1 rounded-xl bg-blush-50 p-2 text-xs">💌 {c.feedback}</p>}
        </div>
      ))}
    </div>
  );
}

export default function StudentWeek() {
  const d = useData();
  const today = todayStr();
  const [anchor, setAnchor] = useState(today);
  const [sel, setSel] = useState(today);
  const w = weekStats(d, anchor);
  const tp = planFor(today, d.schedule, d.planChanges);
  const thisWeek = weekStart(anchor) === weekStart(today);

  return (
    <>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <button className="btn-ghost !px-3" onClick={() => setAnchor(addDays(anchor, -7))} aria-label="الأسبوع السابق">→</button>
          <h1 className="section-title">🗓️ {thisWeek ? 'هذا الأسبوع' : `أسبوع ${fmtDate(w.days[0])}`}</h1>
          <button className="btn-ghost !px-3" onClick={() => setAnchor(addDays(anchor, 7))} aria-label="الأسبوع التالي">←</button>
        </div>
        <WeekCalendar d={d} days={w.days} onPick={setSel} selected={sel} />
        <Legend />
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-sm"><span>الهدف الأسبوعي</span><b>{mins(w.done)} / {mins(w.target)}</b></div>
          <ProgressBar value={pct(w.done, w.target)} tone="blue" />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat emoji="🎯" label="هدف اليوم" value={tp.minutes ? `${tp.minutes} د` : 'راحة'} tone="pink" />
        <Stat emoji="⏱️" label="أنجزتِ اليوم" value={`${minutesOn(today, d.checkins)} د`} tone="lav" />
        <Stat emoji="📆" label="أيام الدراسة" value={`${w.studyDays} / 7`} sub={`أهداف مكتملة: ${w.completedDays}`} tone="blue" />
        <Stat emoji="🌙" label="أيام فاتتك" value={w.missed.length} sub={w.missed.length ? 'ممكن تعوضينها 💛' : 'ممتاز!'} tone="cream" />
      </div>

      <Card><DayDetail date={sel} /></Card>

      <Card>
        <h2 className="section-title mb-3">📋 الجدول الأسبوعي</h2>
        <div className="divide-y divide-lav-100">
          {w.days.map((x) => {
            const p = planFor(x, d.schedule, d.planChanges);
            return (
              <div key={x} className={`flex items-center justify-between gap-2 py-2.5 text-sm ${x === today ? 'font-bold' : ''}`}>
                <span className="w-20 shrink-0">{DAY_NAMES[dow(x)]}</span>
                <span className="ltr flex-1 truncate text-right">{p.minutes ? p.label || courseName(d.courses, p.course_id) : 'Rest 🌸'}</span>
                <span className="shrink-0 text-plum-soft">{p.minutes ? `${p.minutes} د` : '—'}</span>
              </div>
            );
          })}
        </div>
        {w.upcoming.length > 0 && <p className="mt-3 text-xs text-plum-soft">القادم: {w.upcoming.map((x) => DAY_NAMES[dow(x)]).join('، ')}</p>}
      </Card>
    </>
  );
}
