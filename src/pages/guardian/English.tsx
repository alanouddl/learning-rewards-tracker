import { useState } from 'react';
import { supabase, friendlyError } from '../../lib/supabase';
import { useData } from '../../lib/store';
import { DAY_NAMES, fmtDateTime } from '../../lib/dates';
import { RATING_LABEL, ROLE_LABEL, SKILLS, STAGE_STATUS, englishCourseIds, englishStats, latestRatings, stageProgress, stageReward } from '../../lib/english';
import { mins, sar } from '../../lib/format';
import { Card, Empty, Field, ProgressBar, Stat, useToast } from '../../components/ui';
import { I } from '../../components/Icon';
import { Roadmap } from '../student/English';
import type { AssessResult, Assessment, EnglishStage, Skill, StageStatus } from '../../lib/types';

type Tab = 'review' | 'stages' | 'lessons' | 'skills';
const TABS: { id: Tab; label: string }[] = [
  { id: 'review', label: 'التقييمات' }, { id: 'stages', label: 'المراحل' }, { id: 'lessons', label: 'الكورسات والدروس' }, { id: 'skills', label: 'المهارات' },
];

export default function GuardianEnglish() {
  const d = useData();
  const pending = d.english.assessments.filter((a) => a.status === 'pending');
  const [tab, setTab] = useState<Tab>(pending.length ? 'review' : 'stages');
  const st = englishStats(d);
  if (!d.english.stages.length) return <Card><Empty icon="languages" text="شغّلي ملف supabase/english.sql لتجهيز رحلة الإنجليزية" /></Card>;
  return (
    <>
      <div className="px-1">
        <h1 className="section-title text-2xl"><I n="languages" /> رحلة الإنجليزية</h1>
        <p className="text-sm text-plum-soft">ZAmericanEnglish على يوتيوب (مجاناً) • 4 مراحل × 300 ر.س</p>
      </div>
      <Card><Roadmap /></Card>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon="done" label="دروس مكتملة" value={st.lessonsDone} tone="mint" />
        <Stat icon="clock" label="دراسة إنجليزي معتمدة" value={mins(st.verifiedMinutes)} tone="lav" />
        <Stat icon="calendar" label="هذا الأسبوع" value={`${st.weekMinutes} / ${st.weekTarget} د`} tone="blue" />
        <Stat icon="hourglass" label="تقييمات بانتظارك" value={pending.length} tone="pink" />
      </div>
      <div className="flex flex-wrap gap-1 rounded-full bg-white/80 p-1 shadow-soft">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 rounded-full px-3 py-2 text-sm font-bold ${tab === t.id ? 'bg-gold-500 text-white' : 'text-plum'}`}>
            {t.label}{t.id === 'review' && pending.length > 0 ? ` (${pending.length})` : ''}
          </button>
        ))}
      </div>
      {tab === 'review' && <ReviewTab />}
      {tab === 'stages' && <StagesTab />}
      {tab === 'lessons' && <LessonsTab />}
      {tab === 'skills' && <SkillsTab />}
    </>
  );
}

// ---------------- review ----------------
function ReviewTab() {
  const d = useData();
  const pending = d.english.assessments.filter((a) => a.status === 'pending');
  const done = d.english.assessments.filter((a) => a.status !== 'pending');
  return (
    <>
      {pending.length === 0 && <Card><Empty icon="medal" text="لا يوجد طلب تقييم حالياً" /></Card>}
      {pending.map((a) => <ReviewForm key={a.id} a={a} />)}
      {done.length > 0 && (
        <Card>
          <h2 className="section-title mb-3"><I n="scroll" /> سجل التقييمات</h2>
          <ul className="space-y-2">
            {done.map((a) => {
              const s = d.english.stages.find((x) => x.id === a.stage_id);
              const res = d.english.results.filter((r) => r.assessment_id === a.id);
              return (
                <li key={a.id} className="rounded-2xl border border-lav-100 p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2"><b>المرحلة {a.stage_id}: {s?.name_ar}</b><span className="text-xs text-plum-faint">{fmtDateTime(a.reviewed_at ?? a.created_at)}</span></div>
                  <p className="mt-1">{a.status === 'passed' ? 'ناجح' : 'يحتاج تدريب'}{a.score !== null ? ` • ${a.score}%` : ''} • {res.filter((r) => r.result === 'passed').length}/{res.length} بنود ناجحة</p>
                  {a.feedback && <p className="mt-1 text-plum-soft">{a.feedback}</p>}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}

function ReviewForm({ a }: { a: Assessment }) {
  const d = useData();
  const toast = useToast();
  const stage = d.english.stages.find((s) => s.id === a.stage_id) as EnglishStage;
  const items = d.english.items.filter((i) => i.stage_id === a.stage_id);
  const [res, setRes] = useState<Record<string, { result: AssessResult['result']; note: string }>>(
    Object.fromEntries(items.map((i) => [i.id, { result: 'not_reviewed', note: '' }])));
  const reviewed = items.filter((i) => res[i.id]?.result !== 'not_reviewed');
  const passedCount = items.filter((i) => res[i.id]?.result === 'passed').length;
  const autoScore = reviewed.length ? Math.round((passedCount / items.length) * 100) : 0;
  const [score, setScore] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const finalScore = score === '' ? autoScore : Number(score);
  const essentialsOk = items.filter((i) => i.essential).every((i) => res[i.id]?.result === 'passed');
  const p = stageProgress(d, a.stage_id);

  async function decide(pass: boolean) {
    if (pass && !confirm(`اعتماد نجاح المرحلة ومكافأة ${sar(stageReward(d, stage))}؟`)) return;
    setBusy(true);
    const { error } = await supabase.rpc('english_review', {
      p_assessment: a.id, p_results: items.map((i) => ({ item_id: i.id, ...res[i.id] })),
      p_score: finalScore, p_feedback: feedback, p_pass: pass, p_apply_next_plan: true,
    });
    setBusy(false);
    if (error) return toast(friendlyError(error), 'err');
    toast(pass ? 'تم اعتماد المرحلة والمكافأة' : 'تم طلب تدريب إضافي'); d.refresh();
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="text-xs font-bold text-plum-faint">طلب تقييم • {fmtDateTime(a.created_at)}</p>
          <h2 className="text-xl font-extrabold">المرحلة {stage.id}: {stage.name_ar}</h2>
          <p className="text-xs text-plum-soft">الدروس {p.done}/{p.lessons} • الأهداف {p.objDone}/{p.objectives} • المكافأة {sar(stageReward(d, stage))}</p></div>
        <span className="chip bg-lav-100 text-lav-600">النجاح المقترح {stage.pass_threshold}%</span>
      </div>
      {a.student_note && <p className="mt-3 rounded-2xl bg-blush-50 p-3 text-sm"><I n="message" size={15} /> {a.student_note}</p>}
      {a.evidence_links.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{a.evidence_links.map((l) => <a key={l} className="chip ltr bg-sky-50 text-sky-400" href={l} target="_blank" rel="noopener noreferrer"><I n="link" size={13} /> {l}</a>)}</div>}
      <ul className="mt-4 space-y-2">
        {items.map((i) => (
          <li key={i.id} className="rounded-2xl border border-lav-100 p-3">
            <p className="text-sm font-bold">{i.text}{i.essential && <span className="mr-1 text-[11px] text-blush-500"> (أساسي)</span>}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(['passed', 'needs_improvement', 'not_reviewed'] as const).map((r) => (
                <button key={r} type="button" onClick={() => setRes((x) => ({ ...x, [i.id]: { ...x[i.id], result: r } }))}
                  className={`chip border-2 px-3 py-1 ${res[i.id]?.result === r ? (r === 'passed' ? 'border-mint-500 bg-mint-100 text-mint-500' : r === 'needs_improvement' ? 'border-[#c99a06] bg-cream-100 text-[#9a7400]' : 'border-lav-300 bg-lav-50 text-plum-soft') : 'border-transparent bg-[#f6f4f8] text-plum-soft'}`}>
                  {r === 'passed' ? 'ناجح' : r === 'needs_improvement' ? 'يحتاج تحسين' : 'لم يُقيَّم'}
                </button>
              ))}
            </div>
            <input className="input mt-2 !py-1.5 text-sm" placeholder="ملاحظة (اختياري)" value={res[i.id]?.note ?? ''} onChange={(e) => setRes((x) => ({ ...x, [i.id]: { ...x[i.id], note: e.target.value } }))} />
          </li>
        ))}
      </ul>
      <div className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr]">
        <Field label="الدرجة %" hint={`محسوبة من البنود: ${autoScore}%`}><input className="input" type="number" min={0} max={100} value={score} placeholder={String(autoScore)} onChange={(e) => setScore(e.target.value)} /></Field>
        <Field label="ملاحظاتك وتشجيعك"><textarea className="input min-h-16" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="مثال: نطقك تحسن كثير! تدربي أكثر على كتابة الأسئلة" /></Field>
      </div>
      {(!essentialsOk || finalScore < stage.pass_threshold) && <p className="mt-2 rounded-2xl bg-cream-100 p-2.5 text-xs">{finalScore < stage.pass_threshold ? `الدرجة أقل من ${stage.pass_threshold}%. ` : ''}{!essentialsOk ? 'لم تنجح كل البنود الأساسية بعد. ' : ''}القرار لك في النهاية.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-mint flex-1" disabled={busy} onClick={() => decide(true)}><I n="done" size={16} /> نجحت — اعتماد المرحلة و{sar(stageReward(d, stage))}</button>
        <button className="btn-danger flex-1" disabled={busy} onClick={() => decide(false)}><I n="strong" size={16} /> تحتاج تدريب إضافي</button>
      </div>
      <p className="mt-2 text-[11px] text-plum-faint">مشاهدة كل الفيديوهات لا تعني إتقان المادة؛ اعتمدي على التقييم الفعلي. لا توجد شهادة رسمية.</p>
    </Card>
  );
}

// ---------------- stages ----------------
function StagesTab() {
  const d = useData();
  const [sel, setSel] = useState(1);
  const stage = d.english.stages.find((s) => s.id === sel) ?? d.english.stages[0];
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {d.english.stages.map((s) => <button key={s.id} onClick={() => setSel(s.id)} className={`chip px-3 py-1.5 text-sm ${s.id === stage.id ? 'bg-lav-500 text-white' : 'bg-white text-plum shadow-soft'}`}>{s.id}. {s.name_ar}</button>)}
      </div>
      <StageSettings key={`s${stage.id}`} stage={stage} />
      <ListEditor key={`o${stage.id}`} title="أهداف المرحلة" icon="target" table="english_objectives" stageId={stage.id} rows={d.english.objectives.filter((o) => o.stage_id === stage.id)} toggleField="done" toggleLabel="تحقق" />
      <ListEditor key={`i${stage.id}`} title="بنود التقييم النهائي" icon="medal" table="english_assessment_items" stageId={stage.id} rows={d.english.items.filter((o) => o.stage_id === stage.id)} toggleField="essential" toggleLabel="أساسي" />
      <StageCoursesEditor key={`c${stage.id}`} stage={stage} />
      <PlanEditor key={`p${stage.id}`} stage={stage} />
    </>
  );
}

function StageSettings({ stage }: { stage: EnglishStage }) {
  const d = useData();
  const toast = useToast();
  const [f, setF] = useState({ status: stage.status, paused: stage.paused, target_date: stage.target_date ?? '', pass_threshold: stage.pass_threshold, notes: stage.notes });
  async function save() {
    const { error } = await supabase.from('english_stages').update({ ...f, target_date: f.target_date || null }).eq('id', stage.id);
    if (error) return toast(friendlyError(error), 'err');
    toast('تم الحفظ'); d.refresh();
  }
  return (
    <Card>
      <h2 className="section-title mb-3"><I n="settings" /> إعدادات المرحلة {stage.id}</h2>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="الحالة"><select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as StageStatus })}>
          {Object.entries(STAGE_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="تاريخ الهدف"><input type="date" className="input" value={f.target_date} onChange={(e) => setF({ ...f, target_date: e.target.value })} /></Field>
        <Field label="نسبة النجاح %"><input type="number" min={0} max={100} className="input" value={f.pass_threshold} onChange={(e) => setF({ ...f, pass_threshold: Number(e.target.value) })} /></Field>
        <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={f.paused} onChange={(e) => setF({ ...f, paused: e.target.checked })} /> إيقاف مؤقت</label>
      </div>
      <Field label="ملاحظات"><textarea className="input min-h-14" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      <p className="mt-2 text-xs text-plum-soft">المرحلة التالية تنفتح تلقائياً بعد اعتماد نجاح التقييم. يمكنك فتح أو قفل مرحلة يدوياً من الحالة. المكافأة: {sar(stageReward(d, stage))} (تُعتمد من التقييم فقط).</p>
      <button className="btn-primary mt-3" onClick={save}>حفظ</button>
    </Card>
  );
}

type Row = { id: string; text: string; sort: number } & Record<string, unknown>;
function ListEditor({ title, icon, table, stageId, rows, toggleField, toggleLabel }: {
  title: string; icon: 'target' | 'medal'; table: string; stageId: number; rows: Row[]; toggleField: string; toggleLabel: string;
}) {
  const d = useData();
  const toast = useToast();
  const [text, setText] = useState('');
  const run = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) toast(friendlyError(error), 'err'); else d.refresh(); };
  return (
    <Card>
      <h2 className="section-title mb-3"><I n={icon} /> {title}</h2>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-2">
            <input className="input !py-1.5 text-sm" defaultValue={r.text} onBlur={(e) => e.target.value !== r.text && run(supabase.from(table).update({ text: e.target.value }).eq('id', r.id))} />
            <label className="flex shrink-0 items-center gap-1 text-xs"><input type="checkbox" checked={!!r[toggleField]} onChange={(e) => run(supabase.from(table).update({ [toggleField]: e.target.checked }).eq('id', r.id))} />{toggleLabel}</label>
            <button className="btn-ghost !px-2 !py-1" aria-label="حذف" onClick={() => confirm('حذف؟') && run(supabase.from(table).delete().eq('id', r.id))}><I n="trash" size={16} /></button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input className="input !py-1.5 text-sm" placeholder="إضافة بند…" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn-soft !py-1.5 text-sm" onClick={() => { if (text.trim()) { run(supabase.from(table).insert({ stage_id: stageId, text: text.trim(), sort: rows.length + 1 })); setText(''); } }}>إضافة</button>
      </div>
    </Card>
  );
}

function StageCoursesEditor({ stage }: { stage: EnglishStage }) {
  const d = useData();
  const toast = useToast();
  const ids = englishCourseIds(d);
  const linked = d.english.stageCourses.filter((x) => x.stage_id === stage.id);
  const options = d.courses.filter((c) => ids.has(c.id) && c.kind === 'course' && !c.archived && !linked.some((l) => l.course_id === c.id));
  const [add, setAdd] = useState('');
  const run = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) toast(friendlyError(error), 'err'); else d.refresh(); };
  return (
    <Card>
      <h2 className="section-title mb-3"><I n="book" /> كورسات المرحلة</h2>
      <ul className="space-y-1.5">
        {linked.map((l) => (
          <li key={l.course_id} className="flex items-center gap-2 text-sm">
            <span className="ltr min-w-0 flex-1 truncate text-right font-bold">{d.courses.find((c) => c.id === l.course_id)?.title}</span>
            <select className="input !w-28 !py-1 text-xs" value={l.role} onChange={(e) => run(supabase.from('english_stage_courses').update({ role: e.target.value }).eq('stage_id', stage.id).eq('course_id', l.course_id))}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <button className="btn-ghost !px-2 !py-1" aria-label="إزالة" onClick={() => run(supabase.from('english_stage_courses').delete().eq('stage_id', stage.id).eq('course_id', l.course_id))}><I n="trash" size={16} /></button>
          </li>
        ))}
      </ul>
      {options.length > 0 && (
        <div className="mt-2 flex gap-2">
          <select className="input !py-1.5 text-sm" value={add} onChange={(e) => setAdd(e.target.value)}><option value="">— إضافة كورس —</option>{options.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
          <button className="btn-soft !py-1.5 text-sm" disabled={!add} onClick={() => { run(supabase.from('english_stage_courses').insert({ stage_id: stage.id, course_id: add, role: 'support', sort: linked.length + 1 })); setAdd(''); }}>إضافة</button>
        </div>
      )}
    </Card>
  );
}

function PlanEditor({ stage }: { stage: EnglishStage }) {
  const d = useData();
  const toast = useToast();
  const ids = englishCourseIds(d);
  const courses = d.courses.filter((c) => ids.has(c.id) && c.kind === 'course' && !c.archived);
  const plan = d.english.plans.filter((p) => p.stage_id === stage.id);
  const run = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) toast(friendlyError(error), 'err'); else d.refresh(); };
  const free = [0, 1, 2, 3, 4, 5, 6].filter((x) => !plan.some((p) => p.dow === x));
  const total = plan.reduce((a, p) => a + p.minutes, 0);
  async function apply() {
    if (!confirm('نسخ هذه الخطة إلى الجدول الأسبوعي؟ (الأيام غير المذكورة لا تتغير)')) return;
    const { error } = await supabase.rpc('english_apply_plan', { p_stage: stage.id });
    if (error) return toast(friendlyError(error), 'err');
    toast('تم تحديث الجدول الأسبوعي'); d.refresh();
  }
  return (
    <Card>
      <h2 className="section-title mb-1"><I n="calendar" /> الخطة الأسبوعية للمرحلة</h2>
      <p className="mb-3 text-xs text-plum-soft">مجموع الإنجليزي: {total} دقيقة/أسبوع. الثلاثاء والجمعة للكورسات الأخرى، والخميس راحة، إلا إذا غيّرتِ ذلك.</p>
      <ul className="space-y-2">
        {plan.map((p) => (
          <li key={p.dow} className="grid grid-cols-[4.5rem_1fr_4.5rem_auto] items-center gap-2 rounded-2xl bg-lav-50 p-2 sm:grid-cols-[5rem_1fr_4.5rem_1.5fr_auto]">
            <b className="text-sm">{DAY_NAMES[p.dow]}</b>
            <select className="input !py-1.5 text-sm" value={p.course_id ?? ''} onChange={(e) => run(supabase.from('english_week_plan').update({ course_id: e.target.value || null }).eq('stage_id', stage.id).eq('dow', p.dow))}>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
            <input className="input !py-1.5 text-sm" type="number" min={0} defaultValue={p.minutes} aria-label="الدقائق" onBlur={(e) => Number(e.target.value) !== p.minutes && run(supabase.from('english_week_plan').update({ minutes: Number(e.target.value) }).eq('stage_id', stage.id).eq('dow', p.dow))} />
            <input className="input col-span-3 !py-1.5 text-sm sm:col-span-1" defaultValue={p.task_text} aria-label="المهمة" onBlur={(e) => e.target.value !== p.task_text && run(supabase.from('english_week_plan').update({ task_text: e.target.value }).eq('stage_id', stage.id).eq('dow', p.dow))} />
            <button className="btn-ghost !px-2 !py-1" aria-label="حذف اليوم" onClick={() => run(supabase.from('english_week_plan').delete().eq('stage_id', stage.id).eq('dow', p.dow))}><I n="trash" size={16} /></button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        {free.length > 0 && <select className="input !w-auto !py-1.5 text-sm" value="" onChange={(e) => e.target.value !== '' && run(supabase.from('english_week_plan').insert({ stage_id: stage.id, dow: Number(e.target.value), course_id: courses[0]?.id ?? null, minutes: 25, task_text: 'جلسة مراجعة' }))}>
          <option value="">+ إضافة يوم / جلسة مراجعة</option>{free.map((x) => <option key={x} value={x}>{DAY_NAMES[x]}</option>)}</select>}
        <button className="btn-primary !py-2 text-sm" onClick={apply}>تطبيق على الجدول الأسبوعي <I n="calendar-check" size={15} /></button>
      </div>
    </Card>
  );
}

// ---------------- courses & lessons ----------------
function LessonsTab() {
  const d = useData();
  const toast = useToast();
  const ids = englishCourseIds(d);
  const courses = d.courses.filter((c) => ids.has(c.id) && c.kind === 'course' && !c.archived);
  const [stageId, setStageId] = useState(d.english.stages.find((s) => s.status !== 'completed' && s.status !== 'locked')?.id ?? 1);
  const [course, setCourse] = useState(courses[0]?.id ?? '');
  const [bulk, setBulk] = useState('');
  const lessons = d.english.lessons.filter((l) => l.stage_id === stageId);
  const run = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) toast(friendlyError(error), 'err'); else d.refresh(); };

  async function addBulk() {
    // each line: "title | https://…"  or just a URL, or just a title
    const rows = bulk.split('\n').map((l) => l.trim()).filter(Boolean).map((line, i) => {
      const url = line.match(/https?:\/\/\S+/)?.[0] ?? '';
      const title = line.replace(url, '').replace(/[|–-]\s*$/, '').replace(/^\s*[|–-]/, '').trim() || `درس ${lessons.length + i + 1}`;
      return { stage_id: stageId, course_id: course || null, title, url, verified: !!url, sort: lessons.length + i + 1 };
    });
    if (!rows.length) return;
    const { error } = await supabase.from('english_lessons').insert(rows);
    if (error) return toast(friendlyError(error), 'err');
    setBulk(''); toast(`تمت إضافة ${rows.length} درس`); d.refresh();
  }

  return (
    <>
      <Card>
        <h2 className="section-title mb-1"><I n="link" /> روابط قوائم التشغيل</h2>
        <p className="mb-3 text-xs text-plum-soft">لم أستطع التحقق من روابط القوائم تلقائياً. افتحي <a href="https://www.youtube.com/@ZAmericanEnglish/playlists" target="_blank" rel="noopener noreferrer">صفحة قوائم القناة الرسمية</a>، انسخي رابط كل قائمة (يحتوي list=)، الصقيه هنا وعلّمي «تم التحقق». لا تضيفي روابط مدفوعة.</p>
        <ul className="space-y-2">
          {courses.map((c) => (
            <li key={c.id} className="grid gap-2 rounded-2xl border border-lav-100 p-2.5 sm:grid-cols-[12rem_1fr_auto]">
              <b className="ltr self-center truncate text-right text-sm">{c.title}</b>
              <input className="input ltr !py-1.5 text-left text-xs" defaultValue={c.url} onBlur={(e) => e.target.value.trim() !== c.url && run(supabase.from('courses').update({ url: e.target.value.trim() }).eq('id', c.id))} />
              <label className={`flex items-center gap-1.5 self-center text-xs font-bold ${c.link_verified ? 'text-mint-500' : 'text-[#9a7400]'}`}>
                <input type="checkbox" checked={c.link_verified} onChange={(e) => run(supabase.from('courses').update({ link_verified: e.target.checked }).eq('id', c.id))} />{c.link_verified ? 'تم التحقق' : 'يحتاج تحقق'}</label>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title"><I n="clipboard" /> دروس المرحلة</h2>
          <select className="input !w-auto !py-1.5 text-sm" value={stageId} onChange={(e) => setStageId(Number(e.target.value))}>
            {d.english.stages.map((s) => <option key={s.id} value={s.id}>المرحلة {s.id}: {s.name_ar}</option>)}</select>
        </div>
        {lessons.length === 0 && <p className="text-sm text-plum-soft">لا توجد دروس بعد. أضيفي روابط فيديوهات محددة من القوائم بالأسفل.</p>}
        <ul className="space-y-2">
          {lessons.map((l) => (
            <li key={l.id} className={`grid gap-2 rounded-2xl p-2.5 sm:grid-cols-[1fr_1fr_9rem_auto] ${l.done_at ? 'bg-mint-100/50' : 'bg-[#faf8fc]'}`}>
              <input className="input ltr !py-1.5 text-sm" defaultValue={l.title} aria-label="العنوان" onBlur={(e) => e.target.value !== l.title && run(supabase.from('english_lessons').update({ title: e.target.value }).eq('id', l.id))} />
              <input className="input ltr !py-1.5 text-left text-xs" defaultValue={l.url} placeholder="https://www.youtube.com/watch?v=…" aria-label="الرابط" onBlur={(e) => e.target.value.trim() !== l.url && run(supabase.from('english_lessons').update({ url: e.target.value.trim(), verified: !!e.target.value.trim() }).eq('id', l.id))} />
              <select className="input !py-1.5 text-xs" value={l.course_id ?? ''} aria-label="الكورس" onChange={(e) => run(supabase.from('english_lessons').update({ course_id: e.target.value || null }).eq('id', l.id))}>
                <option value="">—</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
              <div className="flex items-center gap-1">
                <span className="text-xs text-plum-soft">{l.done_at ? 'تم' : ''}</span>
                <button className="btn-ghost !px-2 !py-1" aria-label="حذف" onClick={() => confirm('حذف الدرس؟') && run(supabase.from('english_lessons').delete().eq('id', l.id))}><I n="trash" size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-2xl bg-lav-50 p-3">
          <p className="mb-2 text-sm font-bold">إضافة دروس (سطر لكل درس)</p>
          <select className="input mb-2 !py-1.5 text-sm" value={course} onChange={(e) => setCourse(e.target.value)} aria-label="الكورس">{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
          <textarea className="input ltr min-h-24 text-left text-sm" value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'Lesson 1 | https://www.youtube.com/watch?v=…\nLesson 2 | https://www.youtube.com/watch?v=…'} />
          <button className="btn-primary mt-2 !py-2 text-sm" onClick={addBulk}>إضافة الدروس</button>
        </div>
      </Card>
    </>
  );
}

// ---------------- skills ----------------
function SkillsTab() {
  const d = useData();
  const toast = useToast();
  const latest = latestRatings(d);
  const [vals, setVals] = useState<Record<Skill, number>>(Object.fromEntries(SKILLS.map((s) => [s.id, latest.get(s.id)?.latest ?? 0])) as Record<Skill, number>);
  const [baseline, setBaseline] = useState(d.english.skills.length === 0);
  const [note, setNote] = useState('');
  async function save() {
    const rows = SKILLS.filter((s) => vals[s.id] > 0).map((s) => ({ skill: s.id, rating: vals[s.id], is_baseline: baseline, note }));
    if (!rows.length) return toast('اختاري تقييماً لمهارة واحدة على الأقل', 'err');
    const { error } = await supabase.from('english_skill_ratings').insert(rows);
    if (error) return toast(friendlyError(error), 'err');
    setNote(''); setBaseline(false); toast('تم حفظ التقييم'); d.refresh();
  }
  return (
    <>
      <Card>
        <h2 className="section-title mb-1"><I n="chart" /> تقييم المهارات</h2>
        <p className="mb-3 text-xs text-plum-soft">قيّمي من 1 إلى 5. أول تقييم يكون «تقييم البداية» حتى تقارنين التحسن لاحقاً (مطلوب في المرحلة 4).</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SKILLS.map((s) => {
            const r = latest.get(s.id);
            return (
              <div key={s.id} className="rounded-2xl bg-[#faf8fc] p-3">
                <div className="flex justify-between text-sm"><b><I n={s.icon} size={15} className="text-lav-500" /> {s.label}</b>
                  <span className="text-xs text-plum-soft">{r?.baseline ? `البداية ${r.baseline}` : ''}{r?.latest ? ` • الآن ${r.latest}` : ''}</span></div>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setVals((v) => ({ ...v, [s.id]: n }))} title={RATING_LABEL[n]}
                      className={`h-8 flex-1 rounded-xl text-sm font-bold ${vals[s.id] >= n ? 'bg-lav-400 text-white' : 'bg-white text-plum-faint'}`}>{n}</button>
                  ))}
                </div>
                {r?.latest !== undefined && <div className="mt-2"><ProgressBar value={(r.latest / 5) * 100} height="h-1.5" tone="lav" /></div>}
              </div>
            );
          })}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input className="input" placeholder="ملاحظة (اختياري)" value={note} onChange={(e) => setNote(e.target.value)} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={baseline} onChange={(e) => setBaseline(e.target.checked)} /> تقييم البداية</label>
        </div>
        <button className="btn-primary mt-3" onClick={save}>حفظ التقييم</button>
      </Card>
      {d.english.skills.length > 0 && (
        <Card>
          <h2 className="section-title mb-3"><I n="scroll" /> سجل التقييمات</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead><tr className="text-xs text-plum-soft"><th className="p-2 text-right">التاريخ</th>{SKILLS.map((s) => <th key={s.id} className="p-2">{s.label}</th>)}</tr></thead>
              <tbody>
                {[...new Set(d.english.skills.map((r) => r.created_at.slice(0, 16)))].reverse().map((t) => (
                  <tr key={t} className="border-t border-lav-100">
                    <td className="p-2 text-xs">{fmtDateTime(t + ':00Z')}{d.english.skills.some((r) => r.created_at.startsWith(t) && r.is_baseline) ? ' (البداية)' : ''}</td>
                    {SKILLS.map((s) => <td key={s.id} className="p-2 text-center tabular-nums">{d.english.skills.find((r) => r.created_at.startsWith(t) && r.skill === s.id)?.rating ?? '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
