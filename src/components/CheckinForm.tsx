import { I } from './Icon';
import { useState } from 'react';
import { supabase, friendlyError } from '../lib/supabase';
import { useData } from '../lib/store';
import { addDays, fmtDate, todayStr } from '../lib/dates';
import { minutesOn, planFor } from '../lib/plan';
import { celebrate } from '../lib/celebrate';
import { Field, useToast } from './ui';

export function CheckinForm({ initialMinutes, initialCourse, source, onDone }: {
  initialMinutes?: number; initialCourse: string | null; source: 'timer' | 'manual'; onDone: () => void;
}) {
  const d = useData();
  const toast = useToast();
  const today = todayStr();
  const [date, setDate] = useState(today);
  const [course, setCourse] = useState(initialCourse ?? '');
  const [minutes, setMinutes] = useState(initialMinutes ? String(initialMinutes) : '');
  const [finished, setFinished] = useState('');
  const [learned, setLearned] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [help, setHelp] = useState('');
  const [links, setLinks] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | { metGoal: boolean }>(null);

  const active = d.courses.filter((c) => !c.archived);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const m = Number(minutes);
    if (!m || m < 1 || m > 600) return toast('اكتبي عدد الدقائق (١ – ٦٠٠)', 'err');
    if (!finished.trim()) return toast('اكتبي ماذا أنجزتِ اليوم', 'err');
    setBusy(true);
    const paths: string[] = [];
    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) { toast(`الصورة ${f.name} أكبر من ٥ ميجا`, 'err'); continue; }
      const path = `${date}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, '_')}`;
      const { error } = await supabase.storage.from('evidence').upload(path, f, { contentType: f.type });
      if (error) toast('تعذّر رفع الصورة، تم حفظ الإنجاز بدونها', 'err');
      else paths.push(path);
    }
    const linkList = links.split(/\s+/).map((x) => x.trim()).filter((x) => /^https?:\/\//i.test(x)).slice(0, 10);
    const { data, error } = await supabase.rpc('submit_checkin', {
      p_study_date: date, p_course: course || null, p_minutes: m, p_source: source,
      p_finished: finished, p_learned: learned, p_difficulty: difficulty, p_help: help,
      p_links: linkList, p_files: paths,
    });
    setBusy(false);
    if (error) return toast(friendlyError(error), 'err');
    const metGoal = data.target > 0 && data.total >= data.target;
    setResult({ metGoal });
    celebrate(metGoal);
    d.refresh();
  }

  if (result) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="text-5xl animate-floaty">{result.metGoal ? '' : ''}</div>
        <p className="font-display text-xl font-bold">
          {result.metGoal ? 'أحسنتِ! خلصتي هدف اليوم، وإنجازك بانتظار الموافقة' : 'أحسنتِ! سجّلتِ دراستك، وإنجازك بانتظار الموافقة'}
        </p>
        {!result.metGoal && <p className="text-sm text-plum-soft">كل دقيقة تفرق — كمّلي لما تقدرين <I n="sparkles" /></p>}
        <button className="btn-primary mt-2" onClick={onDone}>تمام <I n="heart" /></button>
      </div>
    );
  }

  const target = planFor(date, d.schedule, d.planChanges).minutes;
  const already = minutesOn(date, d.checkins);
  const dates = Array.from({ length: 8 }, (_, i) => addDays(today, -i));

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="اليوم">
          <select className="input" value={date} onChange={(e) => setDate(e.target.value)}>
            {dates.map((x, i) => <option key={x} value={x}>{i === 0 ? 'اليوم' : i === 1 ? 'أمس' : fmtDate(x, { weekday: 'long', day: 'numeric', month: 'short' })}</option>)}
          </select>
        </Field>
        <Field label="١. كم دقيقة درستي؟" hint={target ? `هدف اليوم ${target} د${already ? ` • سجّلتِ ${already} د` : ''}` : 'يوم راحة — رائع إنك درستي!'}>
          <input className="input" inputMode="numeric" type="number" min={1} max={600} value={minutes} onChange={(e) => setMinutes(e.target.value)} required />
        </Field>
      </div>
      <Field label="الكورس">
        <select className="input" value={course} onChange={(e) => setCourse(e.target.value)}>
          <option value="">— بدون كورس محدد —</option>
          {active.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </Field>
      <Field label="٢. وش خلّصتي اليوم؟">
        <textarea className="input min-h-20" value={finished} onChange={(e) => setFinished(e.target.value)} placeholder="مثال: خلصت درس Present Simple وحليت التمارين" required />
      </Field>
      <Field label="٣. وش تعلمتي؟">
        <textarea className="input min-h-16" value={learned} onChange={(e) => setLearned(e.target.value)} placeholder="مثال: I am, You are, She is…" />
      </Field>
      <div>
        <span className="label">٤. كيف كان؟</span>
        <div className="grid grid-cols-3 gap-2">
          {([['easy', 'سهل', ''], ['medium', 'متوسط', ''], ['hard', 'صعب', '']] as const).map(([k, l, e]) => (
            <button type="button" key={k} onClick={() => setDifficulty(k)}
              className={`rounded-2xl border-2 py-2 text-sm font-semibold transition ${difficulty === k ? 'border-lav-400 bg-lav-100' : 'border-lav-100 bg-white'}`}>
              <div className="text-xl">{e}</div>{l}
            </button>
          ))}
        </div>
      </div>
      <Field label="٥. تحتاجين مساعدة في شي؟ (اختياري)">
        <input className="input" value={help} onChange={(e) => setHelp(e.target.value)} placeholder="اكتبي سؤالك هنا" />
      </Field>
      <details className="rounded-2xl bg-lav-50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-plum-soft"><I n="clip" /> إثبات (اختياري): صور أو روابط</summary>
        <div className="mt-3 space-y-3">
          <Field label="روابط (كل رابط في سطر)">
            <textarea className="input ltr min-h-14 text-left" value={links} onChange={(e) => setLinks(e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="صور الشاشة (حتى ٥ ميجا لكل صورة)">
            <input className="input" type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 4))} />
          </Field>
        </div>
      </details>
      <button className="btn-primary w-full py-3 text-base" disabled={busy}>{busy ? 'جاري الحفظ…' : 'إرسال إنجاز اليوم'}</button>
    </form>
  );
}
