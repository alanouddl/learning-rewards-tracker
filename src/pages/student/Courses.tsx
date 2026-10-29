import { I, IconBubble, categoryIcon, categoryTone } from '../../components/Icon';
import { useState } from 'react';
import { supabase, friendlyError } from '../../lib/supabase';
import { useData } from '../../lib/store';
import { fmtDate } from '../../lib/dates';
import { pct, sar, STATUS_LABEL } from '../../lib/format';
import { celebrate } from '../../lib/celebrate';
import { Card, Empty, Modal, ProgressBar, useToast } from '../../components/ui';
import { OpenCourseButton } from '../../components/OpenCourse';
import type { Course, Milestone } from '../../lib/types';

const STATUS_CHIP: Record<Course['status'], string> = {
  not_started: 'bg-cream-100 text-plum-soft',
  in_progress: 'bg-sky-100 text-sky-400',
  awaiting_approval: 'bg-lav-100 text-lav-600',
  completed: 'bg-mint-100 text-mint-500',
};

export default function StudentCourses() {
  const d = useData();
  const courses = d.courses.filter((c) => !c.archived);
  const [edit, setEdit] = useState<Course | null>(null);
  const [claim, setClaim] = useState<Milestone | null>(null);

  return (
    <>
      <h1 className="section-title px-1 text-2xl"><I n="book" /> كورساتي</h1>
      <p className="px-1 text-sm text-plum-soft">الكورسات تفتح في موقعها الأصلي. بعد ما تدرسين، حدّثي تقدمك هنا <I n="sparkles" /></p>
      {courses.length === 0 && <Card><Empty text="ما فيه كورسات بعد" /></Card>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {courses.map((c) => {
          const cat = d.categories.find((x) => x.id === c.category_id);
          const ms = d.milestones.filter((m) => m.course_id === c.id);
          const msDone = ms.filter((m) => m.status === 'approved').length;
          const reward = ms.reduce((a, m) => a + m.reward, 0);
          return (
            <Card key={c.id} className="flex flex-col">
              <div className="flex gap-3">
                {c.thumbnail_url
                  ? <img src={c.thumbnail_url} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                  : <IconBubble n={categoryIcon(cat?.name ?? '')} tone={categoryTone(cat?.name ?? '')} size="h-16 w-16" icon={28} />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`chip ${STATUS_CHIP[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                    {cat && <span className="chip ltr bg-lav-50 text-plum-soft">{cat.name}</span>}
                  </div>
                  <h2 className="ltr mt-1 text-right font-sans text-lg font-bold leading-snug">{c.title}</h2>
                  {c.provider && <p className="ltr text-right text-xs text-plum-soft">{c.provider}</p>}
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-sm"><span>التقدم</span><b>{c.progress}%</b></div>
                <ProgressBar value={c.progress} tone={c.status === 'completed' ? 'mint' : 'pink'} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-plum-soft">
                {reward > 0 && <span><I n="wallet" /> {sar(reward)}</span>}
                {ms.length > 0 && <span><I n="flag" /> {msDone}/{ms.length} مراحل</span>}
                {c.target_date && <span><I n="target" /> {fmtDate(c.target_date)}</span>}
                {c.weekly_minutes > 0 && <span><I n="timer" /> {c.weekly_minutes} د/أسبوع</span>}
              </div>
              {ms.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {ms.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 rounded-xl bg-cream-50 px-2.5 py-2 text-sm">
                      <span>{m.status === 'approved' ? '' : m.status === 'awaiting' ? '' : '⭕'}</span>
                      <span className="ltr min-w-0 flex-1 truncate text-right">{m.title}</span>
                      {m.reward > 0 && <span className="shrink-0 text-xs text-plum-soft">{sar(m.reward)}</span>}
                      {m.status === 'open' && c.status !== 'completed' && (
                        <button className="btn-soft shrink-0 !px-2 !py-1 text-xs" onClick={() => setClaim(m)}>خلصتها!</button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <OpenCourseButton course={c} />
                {c.status !== 'completed' && <button className="btn-soft" onClick={() => setEdit(c)}><I n="trend" /> تحديث التقدم</button>}
              </div>
            </Card>
          );
        })}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="تحديث التقدم">
        {edit && <ProgressForm course={edit} onDone={() => setEdit(null)} />}
      </Modal>
      <Modal open={!!claim} onClose={() => setClaim(null)} title="خلصتي مرحلة!">
        {claim && <ClaimForm m={claim} onDone={() => setClaim(null)} />}
      </Modal>
    </>
  );
}

function ProgressForm({ course, onDone }: { course: Course; onDone: () => void }) {
  const d = useData();
  const toast = useToast();
  const [v, setV] = useState(course.progress);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(complete: boolean) {
    setBusy(true);
    const { error } = complete
      ? await supabase.rpc('request_course_completion', { p_course: course.id, p_note: note })
      : await supabase.rpc('update_course_progress', { p_course: course.id, p_progress: v, p_note: note });
    setBusy(false);
    if (error) return toast(friendlyError(error), 'err');
    if (complete) { celebrate(true); toast('وااو! أرسلنا طلب إكمال الكورس للموافقة'); }
    else toast('تم حفظ تقدمك');
    d.refresh(); onDone();
  }
  return (
    <div className="space-y-4">
      <p className="ltr text-right font-semibold">{course.title}</p>
      <div>
        <div className="mb-1 flex justify-between text-sm"><span>نسبة التقدم</span><b className="text-xl">{v}%</b></div>
        <input type="range" min={0} max={100} step={5} value={v} onChange={(e) => setV(Number(e.target.value))} className="w-full accent-[#e45d90]" />
        <div className="mt-2"><ProgressBar value={v} /></div>
      </div>
      <label className="block"><span className="label">ملاحظة (اختياري)</span>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: خلصت الوحدة الثانية" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary flex-1" disabled={busy} onClick={() => save(false)}>حفظ</button>
        <button className="btn-mint flex-1" disabled={busy} onClick={() => confirm('أكيد خلصتي الكورس كامل؟') && save(true)}><I n="graduation" /> خلصت الكورس</button>
      </div>
      <p className="text-xs text-plum-faint">التقدم يسجّل يدوياً منك، وولي الأمر يتأكد منه <I n="heart" /></p>
    </div>
  );
}

function ClaimForm({ m, onDone }: { m: Milestone; onDone: () => void }) {
  const d = useData();
  const toast = useToast();
  const [note, setNote] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    const { error } = await supabase.rpc('claim_milestone', { p_milestone: m.id, p_note: note, p_evidence: link });
    setBusy(false);
    if (error) return toast(friendlyError(error), 'err');
    celebrate(); toast('أرسلنا المرحلة للموافقة'); d.refresh(); onDone();
  }
  return (
    <div className="space-y-3">
      <p className="ltr text-right font-semibold">{m.title}</p>
      {m.reward > 0 && <p className="text-sm">المكافأة: <b>{sar(m.reward)}</b> (بعد موافقة ولي الأمر)</p>}
      <label className="block"><span className="label">وش سويتي؟</span>
        <textarea className="input min-h-16" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <label className="block"><span className="label">رابط إثبات (اختياري)</span>
        <input className="input ltr text-left" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
      </label>
      <button className="btn-primary w-full" disabled={busy} onClick={send}>إرسال للموافقة <I n="love" /></button>
      <p className="text-center text-xs text-plum-faint">نسبة الإنجاز الإجمالية: {pct(d.milestones.filter((x) => x.status === 'approved').length, d.milestones.length)}% من كل المراحل</p>
    </div>
  );
}
