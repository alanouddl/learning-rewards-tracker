import { useState } from 'react';
import { supabase, friendlyError } from '../../lib/supabase';
import { useData } from '../../lib/store';
import { DAY_NAMES, fmtDate, fmtDateTime } from '../../lib/dates';
import { mins, sar } from '../../lib/format';
import {
  RATING_LABEL, ROLE_LABEL, SKILLS, STAGE_ICON, STAGE_STATUS, STAGE_TONE, currentStage, englishStats, latestRatings,
  nextLesson, stageCourses, stageProgress, stageReward, stageRewards, weakSkills,
} from '../../lib/english';
import { celebrate } from '../../lib/celebrate';
import { Card, Empty, Field, Modal, ProgressBar, Stat, useToast } from '../../components/ui';
import { I, IconBubble } from '../../components/Icon';
import type { EnglishStage } from '../../lib/types';

const RESULT_LABEL = { passed: 'ناجح', needs_improvement: 'يحتاج تحسين', not_reviewed: 'لم يُقيَّم' } as const;
const RESULT_CHIP = { passed: 'bg-mint-100 text-mint-500', needs_improvement: 'bg-cream-100 text-[#9a7400]', not_reviewed: 'bg-[#f3f1f6] text-plum-faint' } as const;

export function Roadmap({ onPick, selected }: { onPick?: (id: number) => void; selected?: number }) {
  const d = useData();
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {d.english.stages.map((s, i) => {
        const p = stageProgress(d, s.id);
        const tone = s.status === 'locked' ? 'muted' : STAGE_TONE[i % 4];
        return (
          <li key={s.id}>
            <button type="button" onClick={() => onPick?.(s.id)}
              className={`flex w-full flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition hover:-translate-y-0.5 ${selected === s.id ? 'border-lav-400 bg-white shadow-soft' : 'border-transparent bg-white/70'}`}>
              <span className="relative">
                <IconBubble n={s.status === 'locked' ? 'lock' : STAGE_ICON[s.id] ?? 'star'} tone={tone} size="h-12 w-12" icon={22} />
                {s.status === 'completed' && <span className="absolute -bottom-1 -left-1 grid h-5 w-5 place-items-center rounded-full bg-mint-500 text-white"><I n="check" size={12} /></span>}
              </span>
              <span className="text-[11px] font-bold text-plum-faint">المرحلة {s.id}</span>
              <span className="text-sm font-bold leading-snug">{s.name_ar}</span>
              <span className="text-[11px] text-plum-soft">{s.paused ? 'متوقفة مؤقتاً' : STAGE_STATUS[s.status]}</span>
              {s.status !== 'locked' && <div className="w-full"><ProgressBar value={s.status === 'completed' ? 100 : p.pct} height="h-1.5" tone="lav" /></div>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default function StudentEnglish() {
  const d = useData();
  const toast = useToast();
  const cur = currentStage(d);
  const [sel, setSel] = useState<number | undefined>(cur?.id);
  const stage = d.english.stages.find((s) => s.id === sel) ?? cur;
  const st = englishStats(d);
  const rw = stageRewards(d);
  const ratings = latestRatings(d);
  const weak = weakSkills(d);
  const [asking, setAsking] = useState(false);

  if (!stage) return <Card><Empty icon="languages" text="رحلة الإنجليزية لم تُجهّز بعد" /></Card>;

  async function start(s: EnglishStage) {
    const { error } = await supabase.rpc('english_start_stage', { p_stage: s.id });
    if (error) return toast(friendlyError(error), 'err');
    toast('يلا نبدأ!'); d.refresh();
  }

  return (
    <>
      <section className="relative isolate overflow-hidden rounded-[30px] bg-white px-5 py-6 shadow-soft">
        <div className="pointer-events-none absolute -left-12 -top-16 -z-10 h-48 w-48 rounded-full bg-sky-100" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-16 -right-10 -z-10 h-44 w-44 rounded-full bg-blush-100" aria-hidden="true" />
        <p className="eyebrow"><I n="languages" size={13} /> ZAmericanEnglish</p>
        <h1 className="mt-1 text-3xl font-extrabold">رحلتي مع <span className="text-gold-500">الإنجليزية</span> <I n="tulip" size={26} className="text-blush-400" /></h1>
        <p className="mt-1 text-plum-soft">من أول كلمة إلى أول محادثة بالإنجليزي!</p>
        <div className="mt-5"><Roadmap onPick={setSel} selected={stage.id} /></div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon="done" label="دروس مكتملة" value={st.lessonsDone} tone="mint" />
        <Stat icon="clock" label="ساعات دراسة معتمدة" value={mins(st.verifiedMinutes)} tone="lav" />
        <Stat icon="calendar" label="إنجليزي هذا الأسبوع" value={`${st.weekMinutes} / ${st.weekTarget} د`} sub={st.consistency !== null ? `الالتزام آخر 4 أسابيع: ${st.consistency}%` : undefined} tone="blue" />
        <Stat icon="trophy" label="مكافآت المراحل" value={sar(rw.earned)} sub={`باقي ${sar(rw.remaining)} • ${rw.completed}/${rw.count} مراحل`} tone="cream" />
      </div>

      <StageDetail stage={stage} onStart={start} onAsk={() => setAsking(true)} />

      <Card>
        <h2 className="section-title mb-3"><I n="chart" /> مهاراتي</h2>
        {d.english.skills.length === 0 && <p className="mb-3 text-sm text-plum-soft">ولي الأمر يقيّم مهاراتك من وقت لآخر، وهنا تشوفين تطورك.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {SKILLS.map((s) => {
            const r = ratings.get(s.id);
            return (
              <div key={s.id} className="flex items-center gap-3">
                <IconBubble n={s.icon} tone={weak.includes(s.id) ? 'butter' : 'lilac'} size="h-9 w-9" icon={16} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-sm"><span className="font-bold">{s.label}</span>
                    <span className="text-xs text-plum-soft">{r?.latest ? RATING_LABEL[r.latest] : 'لم يُقيَّم بعد'}{r?.baseline && r.latest && r.latest > r.baseline ? ` • تحسّن +${r.latest - r.baseline}` : ''}</span></div>
                  <ProgressBar value={((r?.latest ?? 0) / 5) * 100} height="h-2" tone={weak.includes(s.id) ? 'pink' : 'lav'} />
                </div>
              </div>
            );
          })}
        </div>
        {weak.length > 0 && <p className="mt-3 rounded-2xl bg-cream-100 p-3 text-sm">تحتاج تدريب أكثر: <b>{weak.map((w) => SKILLS.find((s) => s.id === w)?.label).join('، ')}</b></p>}
      </Card>

      <Modal open={asking} onClose={() => setAsking(false)} title="طلب تقييم المرحلة">
        {asking && <RequestReview stage={stage} onDone={() => setAsking(false)} />}
      </Modal>
    </>
  );
}

function StageDetail({ stage, onStart, onAsk }: { stage: EnglishStage; onStart: (s: EnglishStage) => void; onAsk: () => void }) {
  const d = useData();
  const toast = useToast();
  const p = stageProgress(d, stage.id);
  const courses = stageCourses(d, stage.id);
  const lessons = d.english.lessons.filter((l) => l.stage_id === stage.id);
  const objectives = d.english.objectives.filter((o) => o.stage_id === stage.id);
  const items = d.english.items.filter((i) => i.stage_id === stage.id);
  const plan = d.english.plans.filter((x) => x.stage_id === stage.id);
  const history = d.english.assessments.filter((a) => a.stage_id === stage.id);
  const last = history[0];
  const next = nextLesson(d, stage.id);
  const locked = stage.status === 'locked';
  const isStudent = d.me.role === 'student';

  async function toggle(id: string, done: boolean) {
    const { error } = await supabase.rpc('english_mark_lesson', { p_lesson: id, p_done: done });
    if (error) return toast(friendlyError(error), 'err');
    if (done) celebrate();
    d.refresh();
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconBubble n={locked ? 'lock' : STAGE_ICON[stage.id] ?? 'star'} tone={locked ? 'muted' : STAGE_TONE[(stage.id - 1) % 4]} size="h-12 w-12" icon={22} />
          <div>
            <p className="text-xs font-bold text-plum-faint">المرحلة {stage.id} • <span className="ltr">{stage.name_en}</span></p>
            <h2 className="text-xl font-extrabold">{stage.name_ar}</h2>
            <p className="text-xs text-plum-soft">المدة المقترحة {stage.weeks} أسابيع{stage.target_date ? ` • الهدف ${fmtDate(stage.target_date)}` : ''} • المكافأة <b>{sar(stageReward(d, stage))}</b></p>
          </div>
        </div>
        <span className="chip bg-lav-100 text-lav-600">{stage.paused ? 'متوقفة مؤقتاً' : STAGE_STATUS[stage.status]}</span>
      </div>

      {locked ? (
        <p className="mt-4 rounded-2xl bg-[#f6f4f8] p-3 text-sm text-plum-soft"><I n="lock" size={15} /> تنفتح بعد ما تنجحين في تقييم المرحلة اللي قبلها.</p>
      ) : (
        <>
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-sm"><span>تقدّم المرحلة</span><b>{stage.status === 'completed' ? 100 : p.pct}%</b></div>
            <ProgressBar value={stage.status === 'completed' ? 100 : p.pct} />
            <p className="text-xs text-plum-soft">{p.done} من {p.lessons} دروس • {p.objDone} من {p.objectives} أهداف</p>
          </div>
          {isStudent && stage.status === 'available' && <button className="btn-primary mt-4" onClick={() => onStart(stage)}>ابدئي المرحلة <I n="play" size={16} /></button>}
          {next && stage.status !== 'completed' && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-sky-50 p-3">
              <div className="min-w-0"><p className="text-xs font-bold text-sky-400">الدرس التالي المقترح</p><p className="ltr truncate text-right font-bold">{next.title}</p></div>
              {next.url && <a className="btn-primary !py-2 text-sm" href={next.url} target="_blank" rel="noopener noreferrer">شاهدي <I n="external" size={15} /></a>}
            </div>
          )}
        </>
      )}

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="section-title mb-2 text-base"><I n="target" /> أهداف المرحلة</h3>
          <ul className="space-y-1.5 text-sm">
            {objectives.map((o) => (
              <li key={o.id} className="flex items-start gap-2"><span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md ${o.done ? 'bg-mint-500 text-white' : 'border-2 border-lav-200'}`}>{o.done && <I n="check" size={12} />}</span>{o.text}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="section-title mb-2 text-base"><I n="book" /> الكورسات (يوتيوب مجاناً)</h3>
          <ul className="space-y-2">
            {courses.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-2xl border border-lav-100 p-2.5">
                <div className="min-w-0">
                  <p className="ltr truncate text-right text-sm font-bold">{c.title}</p>
                  <p className="text-[11px] text-plum-soft">{ROLE_LABEL[c.role]}{!c.link_verified && <span className="mr-1 text-[#9a7400]"> • الرابط بانتظار تأكيد ولي الأمر</span>}</p>
                </div>
                {c.url && <a className="btn-soft !px-3 !py-1.5 text-xs" href={c.url} target="_blank" rel="noopener noreferrer">افتحي <I n="external" size={13} /></a>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {!locked && (
        <div className="mt-5">
          <h3 className="section-title mb-2 text-base"><I n="clipboard" /> الدروس</h3>
          {lessons.length === 0 ? <p className="text-sm text-plum-soft">ولي الأمر يضيف الدروس هنا. لين ذاك، تابعي الكورس من قائمة التشغيل.</p> : (
            <ul className="space-y-1.5">
              {lessons.map((l) => {
                const c = d.courses.find((x) => x.id === l.course_id);
                return (
                  <li key={l.id} className={`flex items-center gap-2 rounded-2xl p-2.5 ${l.done_at ? 'bg-mint-100/60' : 'bg-[#faf8fc]'}`}>
                    <button onClick={() => toggle(l.id, !l.done_at)} aria-label={l.done_at ? 'إلغاء' : 'تم'} disabled={stage.status === 'completed'}
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 ${l.done_at ? 'border-mint-500 bg-mint-500 text-white' : 'border-lav-300 bg-white'}`}>{l.done_at && <I n="check" size={13} />}</button>
                    <div className="min-w-0 flex-1"><p className={`ltr truncate text-right text-sm font-bold ${l.done_at ? 'text-plum-faint line-through' : ''}`}>{l.title}</p>
                      {c && <p className="ltr text-right text-[11px] text-plum-faint">{c.title}</p>}</div>
                    {l.url && <a href={l.url} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-2 !py-1 text-xs" aria-label="افتحي الدرس"><I n="external" size={15} /></a>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {plan.length > 0 && (
        <div className="mt-5">
          <h3 className="section-title mb-2 text-base"><I n="calendar" /> الخطة الأسبوعية المقترحة</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {plan.map((x) => (
              <li key={x.dow} className="rounded-2xl bg-lav-50 p-2.5 text-sm"><b>{DAY_NAMES[x.dow]}</b> • {x.minutes} د • <span className="ltr">{d.courses.find((c) => c.id === x.course_id)?.title}</span>
                <p className="text-xs text-plum-soft">{x.task_text}</p></li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5">
        <h3 className="section-title mb-2 text-base"><I n="medal" /> التقييم النهائي مع ولي الأمر</h3>
        <ul className="space-y-1.5 text-sm">
          {items.map((it) => {
            const r = last && d.english.results.find((x) => x.assessment_id === last.id && x.item_id === it.id);
            return (
              <li key={it.id} className="flex items-start justify-between gap-2 rounded-xl bg-[#faf8fc] p-2">
                <span>{it.text}{it.essential && <span className="mr-1 text-[11px] font-bold text-blush-500"> (أساسي)</span>}</span>
                {r && <span className={`chip shrink-0 ${RESULT_CHIP[r.result]}`}>{RESULT_LABEL[r.result]}</span>}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-plum-soft">النجاح: {stage.pass_threshold}% تقريباً مع إتمام مهام الكلام والكتابة الأساسية. مشاهدة الفيديوهات وحدها ما تكفي، المهم إنك تطبقين.</p>
        {isStudent && (stage.status === 'in_progress' || stage.status === 'available') && !stage.paused && (
          <button className="btn-primary mt-3" onClick={onAsk}>أنا جاهزة للتقييم <I n="flag" size={16} /></button>
        )}
        {stage.status === 'awaiting_review' && <p className="mt-3 rounded-2xl bg-lav-50 p-3 text-sm"><I n="hourglass" size={15} /> طلبك بانتظار تقييم ولي الأمر.</p>}
      </div>

      {history.length > 0 && (
        <div className="mt-5">
          <h3 className="section-title mb-2 text-base"><I n="scroll" /> سجل التقييمات</h3>
          <ul className="space-y-2">
            {history.map((a) => (
              <li key={a.id} className="rounded-2xl border border-lav-100 p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2"><b>{a.status === 'passed' ? 'ناجح' : a.status === 'needs_practice' ? 'يحتاج تدريب إضافي' : 'بانتظار التقييم'}{a.score !== null ? ` • ${a.score}%` : ''}</b>
                  <span className="text-xs text-plum-faint">{fmtDateTime(a.created_at)}</span></div>
                {a.feedback && <p className="mt-1 rounded-xl bg-blush-50 p-2"><I n="love" size={14} className="text-blush-500" /> {a.feedback}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-4 text-[11px] text-plum-faint">إكمال الرحلة لا يعني شهادة رسمية (CEFR) أو طلاقة. ولي الأمر يقرر متى تكونين جاهزة للمستوى التالي.</p>
    </Card>
  );
}

function RequestReview({ stage, onDone }: { stage: EnglishStage; onDone: () => void }) {
  const d = useData();
  const toast = useToast();
  const [note, setNote] = useState('');
  const [links, setLinks] = useState('');
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    const list = links.split(/\s+/).filter((x) => /^https?:\/\//i.test(x)).slice(0, 10);
    const { error } = await supabase.rpc('english_request_review', { p_stage: stage.id, p_note: note, p_links: list });
    setBusy(false);
    if (error) return toast(friendlyError(error), 'err');
    celebrate(); toast('أرسلنا طلب التقييم لولي الأمر'); d.refresh(); onDone();
  }
  return (
    <div className="space-y-3">
      <p className="text-sm">بتجلسين مع ولي الأمر ويقيّمك على قائمة المرحلة. لو نجحتي تنفتح المرحلة التالية ومكافأة <b>{sar(stageReward(d, stage))}</b>.</p>
      <Field label="كلمة لولي الأمر (اختياري)"><textarea className="input min-h-16" value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: تدربت على التعريف بنفسي" /></Field>
      <Field label="روابط إثبات (اختياري، كل رابط في سطر)"><textarea className="input ltr min-h-14 text-left" value={links} onChange={(e) => setLinks(e.target.value)} placeholder="https://…" /></Field>
      <button className="btn-primary w-full" disabled={busy} onClick={send}>إرسال الطلب <I n="flag" size={16} /></button>
    </div>
  );
}
