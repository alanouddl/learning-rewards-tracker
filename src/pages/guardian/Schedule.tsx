import { I } from '../../components/Icon';
import { useState } from 'react';
import { supabase, friendlyError } from '../../lib/supabase';
import { useData } from '../../lib/store';
import { DAY_NAMES, dow, fmtDate, todayStr } from '../../lib/dates';
import { courseName } from '../../lib/plan';
import { mins } from '../../lib/format';
import { Card, Field, useToast } from '../../components/ui';
import type { ScheduleDay, Task } from '../../lib/types';

export default function GuardianSchedule() {
  return (
    <>
      <h1 className="section-title px-1 text-2xl"><I n="calendar" /> الجدول والأهداف والمهام</h1>
      <WeeklySchedule />
      <DateChanges />
      <Tasks />
    </>
  );
}

function WeeklySchedule() {
  const d = useData();
  const toast = useToast();
  const [rows, setRows] = useState<ScheduleDay[]>(() =>
    Array.from({ length: 7 }, (_, i) => d.schedule.find((s) => s.dow === i) ?? { dow: i, label: '', course_id: null, minutes: 0, task_text: '' }));
  const [target, setTarget] = useState(d.settings.weekly_target_minutes);
  const [dailyReward, setDailyReward] = useState(d.settings.daily_reward);
  const [weeklyBonus, setWeeklyBonus] = useState(d.settings.weekly_bonus);
  const total = rows.reduce((a, r) => a + Number(r.minutes || 0), 0);
  const up = (i: number, k: keyof ScheduleDay, v: unknown) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function save() {
    const { error } = await supabase.from('schedule_days').upsert(rows.map((r) => ({ ...r, minutes: Number(r.minutes || 0), course_id: r.course_id || null })));
    if (error) return toast(friendlyError(error), 'err');
    const e2 = (await supabase.from('settings').update({ weekly_target_minutes: Number(target), daily_reward: Number(dailyReward), weekly_bonus: Number(weeklyBonus), updated_at: new Date().toISOString() }).eq('id', 1)).error;
    if (e2) return toast(friendlyError(e2), 'err');
    toast('تم حفظ الجدول والأهداف'); d.refresh();
  }

  return (
    <Card>
      <h2 className="section-title mb-3"><I n="clipboard" /> الجدول الأسبوعي الأساسي</h2>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.dow} className="grid grid-cols-[4.5rem_1fr_5rem] gap-2 rounded-2xl bg-cream-50 p-2 sm:grid-cols-[5rem_1fr_1fr_5rem_1.5fr]">
            <div className="self-center text-sm font-bold">{DAY_NAMES[r.dow]}</div>
            <input className="input ltr !py-1.5 text-sm" placeholder="النشاط (مثال: English)" value={r.label} onChange={(e) => up(i, 'label', e.target.value)} />
            <input className="input !py-1.5 text-sm" type="number" min={0} max={600} value={r.minutes} onChange={(e) => up(i, 'minutes', e.target.value)} aria-label="الدقائق" />
            <select className="input col-span-3 !py-1.5 text-sm sm:col-span-1 sm:row-start-1 sm:col-start-3" value={r.course_id ?? ''} onChange={(e) => up(i, 'course_id', e.target.value || null)} aria-label="الكورس">
              <option value="">— بدون كورس / راحة —</option>
              {d.courses.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <input className="input col-span-3 !py-1.5 text-sm sm:col-span-1" placeholder="مهمة اليوم" value={r.task_text} onChange={(e) => up(i, 'task_text', e.target.value)} />
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-plum-soft">مجموع الجدول: {mins(total)} أسبوعياً. اكتبي 0 دقيقة ليوم الراحة.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Field label="الهدف الأسبوعي (دقائق)" hint={total !== Number(target) ? `الجدول = ${total} د` : 'يطابق الجدول'}>
          <div className="flex gap-1"><input className="input" type="number" min={0} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
            {total !== Number(target) && <button className="btn-ghost !px-2 text-xs" onClick={() => setTarget(total)}>= الجدول</button>}</div>
        </Field>
        <Field label="مكافأة إكمال هدف اليوم (ر.س)"><input className="input" type="number" min={0} step={0.5} value={dailyReward} onChange={(e) => setDailyReward(Number(e.target.value))} /></Field>
        <Field label="مكافأة إضافية لهدف الأسبوع (ر.س)"><input className="input" type="number" min={0} step={0.5} value={weeklyBonus} onChange={(e) => setWeeklyBonus(Number(e.target.value))} /></Field>
      </div>
      <p className="mt-2 text-xs text-plum-soft">المكافآت اليومية والأسبوعية تُصرف من «صندوق الالتزام» ضمن نفس ميزانية {d.settings.total_budget} ريال، ولا تُعتمد إلا بعد موافقتك.</p>
      <button className="btn-primary mt-4 w-full sm:w-auto" onClick={save}>حفظ الجدول والأهداف</button>
    </Card>
  );
}

function DateChanges() {
  const d = useData();
  const toast = useToast();
  const today = todayStr();
  const [date, setDate] = useState(today);
  const [minutes, setMinutes] = useState(0);
  const [label, setLabel] = useState('Rest');
  const [course, setCourse] = useState('');
  const [task, setTask] = useState('');
  const upcoming = d.planChanges.filter((c) => c.plan_date >= today || (c.from_date && c.from_date >= today));

  async function add() {
    // one 'replace' row per date: swap out any existing one
    const del = (await supabase.from('plan_changes').delete().eq('plan_date', date).eq('kind', 'replace')).error;
    if (del) return toast(friendlyError(del), 'err');
    const { error } = await supabase.from('plan_changes').insert({ plan_date: date, kind: 'replace', minutes, label, course_id: course || null, task_text: task });
    if (error) return toast(friendlyError(error), 'err');
    toast('تم تعديل اليوم'); d.refresh();
  }
  async function remove(id: string) {
    const { error } = await supabase.from('plan_changes').delete().eq('id', id);
    if (error) return toast(friendlyError(error), 'err');
    d.refresh();
  }

  return (
    <Card>
      <h2 className="section-title"><I n="pencil" /> تعديل يوم محدد</h2>
      <p className="mt-1 text-xs text-plum-soft">لتغيير خطة تاريخ معين فقط (مثلاً: إجازة، أو مدة مختلفة) بدون تغيير الجدول الأساسي.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} aria-label="التاريخ" />
        <input className="input ltr" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="النشاط" aria-label="النشاط" />
        <input className="input" type="number" min={0} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} aria-label="الدقائق" />
        <select className="input" value={course} onChange={(e) => setCourse(e.target.value)} aria-label="الكورس">
          <option value="">— بدون كورس —</option>{d.courses.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <button className="btn-soft col-span-2 sm:col-span-1" onClick={add}>حفظ</button>
        <input className="input col-span-2 sm:col-span-5" value={task} onChange={(e) => setTask(e.target.value)} placeholder="مهمة اليوم (اختياري)" />
      </div>
      {upcoming.length > 0 && (
        <ul className="mt-3 divide-y divide-lav-100 text-sm">
          {upcoming.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 py-2">
              <span>{c.kind === 'makeup' ? 'تعويض' : 'تعديل'} • {DAY_NAMES[dow(c.plan_date)]} {fmtDate(c.plan_date)} — <span className="ltr">{c.label || courseName(d.courses, c.course_id)}</span> ({c.minutes} د)
                {c.from_date && <span className="text-plum-faint"> بدل {fmtDate(c.from_date)}</span>}</span>
              <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => remove(c.id)}><I n="trash" /></button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Tasks() {
  const d = useData();
  const toast = useToast();
  const [f, setF] = useState<Partial<Task>>({ kind: 'once', due_date: todayStr() });
  async function add() {
    if (!f.title?.trim()) return toast('اكتبي عنوان المهمة', 'err');
    const { error } = await supabase.from('tasks').insert({ title: f.title.trim(), details: f.details ?? '', kind: f.kind, course_id: f.course_id || null, due_date: f.kind === 'once' ? f.due_date || todayStr() : null });
    if (error) return toast(friendlyError(error), 'err');
    setF({ kind: 'once', due_date: todayStr() }); toast('تمت إضافة المهمة'); d.refresh();
  }
  async function patch(t: Task, p: Partial<Task>) {
    const { error } = await supabase.from('tasks').update(p).eq('id', t.id);
    if (error) return toast(friendlyError(error), 'err');
    d.refresh();
  }
  async function remove(t: Task) {
    if (!confirm('حذف المهمة؟')) return;
    const { error } = await supabase.from('tasks').delete().eq('id', t.id);
    if (error) return toast(friendlyError(error), 'err');
    d.refresh();
  }
  const doneCount = (t: Task) => d.completions.filter((c) => c.task_id === t.id).length;

  return (
    <Card>
      <h2 className="section-title mb-3"><I n="done" /> المهام اليومية والأسبوعية</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <input className="input col-span-2" placeholder="عنوان المهمة" value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Task['kind'] })} aria-label="النوع">
          <option value="once">مرة واحدة</option><option value="daily">يومية</option><option value="weekly">أسبوعية</option>
        </select>
        {f.kind === 'once' ? <input type="date" className="input" value={f.due_date ?? ''} onChange={(e) => setF({ ...f, due_date: e.target.value })} aria-label="تاريخ الاستحقاق" /> : <div className="hidden sm:block" />}
        <button className="btn-soft" onClick={add}>+ إضافة</button>
        <input className="input col-span-2 sm:col-span-3" placeholder="تفاصيل (اختياري)" value={f.details ?? ''} onChange={(e) => setF({ ...f, details: e.target.value })} />
        <select className="input col-span-2" value={f.course_id ?? ''} onChange={(e) => setF({ ...f, course_id: e.target.value })} aria-label="الكورس">
          <option value="">— بدون كورس —</option>{d.courses.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>
      <ul className="mt-4 divide-y divide-lav-100">
        {d.tasks.map((t) => (
          <li key={t.id} className={`flex flex-wrap items-center gap-2 py-2.5 text-sm ${t.active ? '' : 'opacity-50'}`}>
            <span className="chip bg-lav-50">{t.kind === 'daily' ? 'يومية' : t.kind === 'weekly' ? 'أسبوعية' : t.due_date ? fmtDate(t.due_date) : 'مرة'}</span>
            <span className="min-w-0 flex-1">{t.title}{t.course_id && <span className="text-plum-faint"> • {courseName(d.courses, t.course_id)}</span>}</span>
            <span className="text-xs text-plum-soft">✓ {doneCount(t)}</span>
            {t.kind === 'once' && <input type="date" className="input !w-36 !py-1 text-xs" value={t.due_date ?? ''} onChange={(e) => patch(t, { due_date: e.target.value })} aria-label="إعادة جدولة" />}
            <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => patch(t, { active: !t.active })}>{t.active ? 'إيقاف' : 'تفعيل'}</button>
            <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => remove(t)}><I n="trash" /></button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
