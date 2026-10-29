import { I } from '../../components/Icon';
import { useMemo, useState } from 'react';
import { useData } from '../../lib/store';
import { addDays, daysBetween, fmtDate, todayStr, weekStart } from '../../lib/dates';
import { courseName, planFor } from '../../lib/plan';
import { DIFFICULTY, mins, pct, sar } from '../../lib/format';
import { Card, Empty, ProgressBar, Stat } from '../../components/ui';

export default function GuardianAnalytics() {
  const d = useData();
  const today = todayStr();
  const [from, setFrom] = useState(addDays(today, -27));
  const [to, setTo] = useState(today);
  const [course, setCourse] = useState('');

  const checkins = d.checkins.filter((c) => c.status !== 'rejected' && c.study_date >= from && c.study_date <= to && (!course || c.course_id === course));
  const days = useMemo(() => {
    const n = Math.max(0, Math.min(180, daysBetween(from, to)));
    return Array.from({ length: n + 1 }, (_, i) => addDays(from, i));
  }, [from, to]);

  const series = days.map((x) => {
    const p = planFor(x, d.schedule, d.planChanges);
    const planned = !course || p.course_id === course ? p.minutes : 0;
    const actual = checkins.filter((c) => c.study_date === x).reduce((a, c) => a + c.minutes, 0);
    const approved = checkins.filter((c) => c.study_date === x && c.status === 'approved').reduce((a, c) => a + c.minutes, 0);
    return { date: x, planned, actual, approved };
  });
  const totals = series.reduce((a, s) => ({ planned: a.planned + s.planned, actual: a.actual + s.actual, approved: a.approved + s.approved }), { planned: 0, actual: 0, approved: 0 });
  const plannedDays = series.filter((s) => s.planned > 0 && s.date <= today);
  const metDays = plannedDays.filter((s) => s.actual >= s.planned).length;
  const max = Math.max(30, ...series.map((s) => Math.max(s.planned, s.actual)));

  const weeks = [...new Set(days.map(weekStart))].map((w) => {
    const ws = series.filter((s) => weekStart(s.date) === w);
    const pd = ws.filter((s) => s.planned > 0 && s.date <= today);
    return { week: w, planned: ws.reduce((a, s) => a + s.planned, 0), actual: ws.reduce((a, s) => a + s.actual, 0), rate: pct(pd.filter((s) => s.actual >= s.planned).length, pd.length), pd: pd.length };
  });

  const diff = (['easy', 'medium', 'hard'] as const).map((k) => ({ k, n: checkins.filter((c) => c.difficulty === k).length }));
  const tasksDone = d.completions.filter((c) => c.period_key >= from && c.period_key <= to).length;
  const rewardsInRange = d.rewards.filter((r) => r.status !== 'rejected' && r.created_at.slice(0, 10) >= from && r.created_at.slice(0, 10) <= to);

  return (
    <>
      <h1 className="section-title px-1 text-2xl"><I n="chart" /> التحليلات</h1>
      <Card>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="text-xs"><span className="label">من</span><input type="date" className="input" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="text-xs"><span className="label">إلى</span><input type="date" className="input" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
          <label className="col-span-2 text-xs"><span className="label">الكورس</span>
            <select className="input" value={course} onChange={(e) => setCourse(e.target.value)}>
              <option value="">كل الكورسات</option>{d.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[[7, 'أسبوع'], [28, '٤ أسابيع'], [90, '٣ أشهر']].map(([n, l]) => (
            <button key={n} className="btn-ghost !px-3 !py-1 text-xs" onClick={() => { setFrom(addDays(today, -(Number(n) - 1))); setTo(today); }}>{l}</button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon="timer" label="الدراسة الفعلية" value={mins(totals.actual)} sub={`المعتمد ${mins(totals.approved)}`} tone="lav" />
        <Stat icon="calendar" label="المخطط" value={mins(totals.planned)} sub={`الإنجاز ${pct(totals.actual, totals.planned)}%`} tone="blue" />
        <Stat icon="done" label="أيام الهدف المكتملة" value={`${metDays} / ${plannedDays.length}`} sub={`الالتزام ${pct(metDays, plannedDays.length)}%`} tone="mint" />
        <Stat icon="notebook" label="مهام منجزة" value={tasksDone} sub={`${checkins.length} جلسة`} tone="pink" />
      </div>

      <Card>
        <h2 className="section-title mb-1"><I n="trend" /> الدقائق يومياً: المخطط مقابل الفعلي</h2>
        <div className="mb-3 flex gap-4 text-xs text-plum-soft">
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-lav-200" />المخطط</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-blush-400" />الفعلي</span>
        </div>
        {series.length === 0 ? <Empty text="اختاري فترة" /> : (
          <div className="overflow-x-auto pb-1">
            <div className="flex h-44 items-end gap-[3px]" style={{ minWidth: series.length * 14 }} dir="ltr">
              {series.map((s) => (
                <div key={s.date} className="group relative flex h-full flex-1 items-end justify-center" title={`${fmtDate(s.date)}: ${s.actual}/${s.planned} د`}>
                  <div className="absolute bottom-0 w-full rounded-t-md bg-lav-200" style={{ height: `${(s.planned / max) * 100}%` }} />
                  <div className={`relative w-3/5 rounded-t-md ${s.actual >= s.planned && s.planned > 0 ? 'bg-mint-500' : 'bg-blush-400'}`} style={{ height: `${(s.actual / max) * 100}%`, minHeight: s.actual ? 3 : 0 }} />
                  <span className="pointer-events-none absolute -top-6 hidden whitespace-nowrap rounded-lg bg-plum px-1.5 py-0.5 text-[10px] text-white group-hover:block">{s.actual}/{s.planned}</span>
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-plum-faint" dir="ltr"><span>{fmtDate(from)}</span><span>{fmtDate(to)}</span></div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h2 className="section-title mb-3"><I n="calendar-days" /> الالتزام الأسبوعي</h2>
          <ul className="space-y-2.5">
            {weeks.map((w) => (
              <li key={w.week}>
                <div className="flex justify-between text-sm"><span>أسبوع {fmtDate(w.week)}</span><span className="text-plum-soft">{mins(w.actual)} / {mins(w.planned)} • {w.pd ? `${w.rate}% أيام` : '—'}</span></div>
                <ProgressBar value={pct(w.actual, w.planned)} tone="blue" height="h-2" />
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="section-title mb-3"><I n="book" /> تقدم الكورسات</h2>
          <ul className="space-y-2.5">
            {d.courses.filter((c) => !c.archived).map((c) => {
              const ms = d.milestones.filter((m) => m.course_id === c.id);
              const time = d.checkins.filter((x) => x.course_id === c.id && x.status !== 'rejected').reduce((a, x) => a + x.minutes, 0);
              return (
                <li key={c.id}>
                  <div className="flex justify-between gap-2 text-sm"><span className="ltr truncate">{c.title}</span><span className="shrink-0 text-plum-soft">{c.progress}% • {mins(time)}{ms.length ? ` • ${ms.filter((m) => m.status === 'approved').length}/${ms.length}` : ''}</span></div>
                  <ProgressBar value={c.progress} tone="lav" height="h-2" />
                </li>
              );
            })}
          </ul>
        </Card>
        <Card>
          <h2 className="section-title mb-3"><I n="brain" /> مستوى الصعوبة</h2>
          {diff.map(({ k, n }) => (
            <div key={k} className="mb-2">
              <div className="flex justify-between text-sm"><span>{DIFFICULTY[k]}</span><span>{n}</span></div>
              <ProgressBar value={pct(n, checkins.length)} tone={k === 'easy' ? 'mint' : k === 'medium' ? 'blue' : 'pink'} height="h-2" />
            </div>
          ))}
        </Card>
        <Card>
          <h2 className="section-title mb-3"><I n="wallet" /> مكافآت الفترة</h2>
          <p className="text-sm">مجموع المكافآت (غير المرفوضة): <b>{sar(rewardsInRange.reduce((a, r) => a + r.amount, 0))}</b> في {rewardsInRange.length} مكافأة</p>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
            {rewardsInRange.map((r) => <li key={r.id} className="flex justify-between rounded-lg bg-cream-50 px-2 py-1"><span className="truncate">{r.title}</span><b>{sar(r.amount)}</b></li>)}
          </ul>
        </Card>
      </div>

      <Card>
        <h2 className="section-title mb-3"><I n="clock" /> الجدول الزمني للنشاط</h2>
        {checkins.length === 0 ? <Empty text="لا يوجد نشاط في هذه الفترة" /> : (
          <ol className="space-y-2">
            {checkins.map((c) => (
              <li key={c.id} className="rounded-2xl bg-cream-50 p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2"><b>{fmtDate(c.study_date, { weekday: 'short', day: 'numeric', month: 'short' })} — {c.minutes} د</b>
                  <span className="ltr text-xs text-plum-soft">{courseName(d.courses, c.course_id)}</span></div>
                <p className="mt-1">{c.finished}</p>
                {c.learned && <p className="text-xs text-plum-soft"><I n="idea" /> {c.learned}</p>}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}
