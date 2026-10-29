import { useState } from 'react';
import { supabase, friendlyError } from '../../lib/supabase';
import { useData } from '../../lib/store';
import { sar, STATUS_LABEL } from '../../lib/format';
import { Card, Field, Modal, ProgressBar, useToast } from '../../components/ui';
import { CompletionCard } from '../../components/ReviewCards';
import type { Category, Course, Milestone } from '../../lib/types';

export default function GuardianCourses() {
  const d = useData();
  const [edit, setEdit] = useState<Partial<Course> | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const completions = d.courses.filter((c) => c.status === 'awaiting_approval');
  const courses = d.courses.filter((c) => showArchived || !c.archived);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h1 className="section-title text-2xl">📚 الكورسات والمكافآت</h1>
        <button className="btn-primary" onClick={() => setEdit({ category_id: d.categories[0]?.id ?? null, status: 'not_started', progress: 0 })}>+ إضافة كورس</button>
      </div>
      {completions.length > 0 && <Card><div className="space-y-2">{completions.map((c) => <CompletionCard key={c.id} c={c} />)}</div></Card>}

      <Allocation />

      {d.categories.map((cat) => {
        const list = courses.filter((c) => c.category_id === cat.id);
        return (
          <Card key={cat.id}>
            <h2 className="section-title mb-3"><span>{cat.emoji}</span><span className="ltr">{cat.name}</span><span className="chip bg-lav-50 text-plum-soft">{sar(cat.budget)}</span></h2>
            {list.length === 0 && <p className="text-sm text-plum-faint">لا يوجد كورس في هذا المجال.</p>}
            <div className="space-y-2">
              {list.map((c) => {
                const ms = d.milestones.filter((m) => m.course_id === c.id);
                return (
                  <div key={c.id} className={`rounded-2xl border border-lav-100 bg-white p-3 ${c.archived ? 'opacity-60' : ''}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="ltr text-right font-semibold">{c.title} {c.archived && <span className="chip bg-cream-100">مؤرشف</span>}</div>
                        <div className="text-xs text-plum-soft">{STATUS_LABEL[c.status]} • {ms.length} مراحل • {sar(ms.reduce((a, m) => a + m.reward, 0))}</div>
                        {c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer" className="ltr block truncate text-left text-xs text-sky-400">{c.url}</a>
                          : <span className="text-xs text-blush-400">⚠️ لم يُضف رابط بعد</span>}
                      </div>
                      <button className="btn-soft !py-1.5 text-sm" onClick={() => setEdit(c)}>✏️ تعديل</button>
                    </div>
                    <div className="mt-2"><ProgressBar value={c.progress} height="h-2" tone="lav" /></div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
      {d.courses.some((c) => !c.category_id) && (
        <Card><h2 className="section-title mb-2">بدون مجال</h2>
          {courses.filter((c) => !c.category_id).map((c) => <button key={c.id} className="btn-ghost block" onClick={() => setEdit(c)}>{c.title}</button>)}
        </Card>
      )}
      <label className="flex items-center gap-2 px-1 text-sm text-plum-soft"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> إظهار الكورسات المؤرشفة</label>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'تعديل الكورس' : 'كورس جديد'} wide>
        {edit && <CourseForm course={edit} onDone={() => setEdit(null)} />}
      </Modal>
    </>
  );
}

function Allocation() {
  const d = useData();
  const toast = useToast();
  const [rows, setRows] = useState<Record<string, Partial<Category>>>({});
  const [adding, setAdding] = useState(false);
  const val = (c: Category, k: keyof Category) => (rows[c.id]?.[k] ?? c[k]) as string | number;
  const set = (id: string, k: keyof Category, v: string | number) => setRows((r) => ({ ...r, [id]: { ...r[id], [k]: v } }));
  const draftTotal = d.categories.reduce((a, c) => a + Number(val(c, 'budget')), 0);
  const msTotal = (catId: string) => d.milestones.filter((m) => d.courses.find((c) => c.id === m.course_id)?.category_id === catId).reduce((a, m) => a + m.reward, 0);

  async function save(c: Category) {
    const patch = rows[c.id];
    if (!patch) return;
    const { error } = await supabase.from('categories').update({
      ...patch, budget: Number(val(c, 'budget')), daily_pool: Number(val(c, 'daily_pool')),
    }).eq('id', c.id);
    if (error) return toast(friendlyError(error), 'err');
    setRows((r) => { const n = { ...r }; delete n[c.id]; return n; });
    toast('تم حفظ التوزيع ✅'); d.refresh();
  }
  async function remove(c: Category) {
    if (!confirm(`حذف مجال ${c.name}؟`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', c.id);
    if (error) return toast(friendlyError(error), 'err');
    d.refresh();
  }
  async function add() {
    const { error } = await supabase.from('categories').insert({ name: 'مجال جديد', emoji: '✨', budget: 0, daily_pool: 0, sort: d.categories.length + 1 });
    setAdding(false);
    if (error) return toast(friendlyError(error), 'err');
    d.refresh();
  }

  return (
    <Card>
      <h2 className="section-title">🧮 توزيع ميزانية {sar(d.settings.total_budget)}</h2>
      <p className="mt-1 text-xs text-plum-soft">
        لكل مجال: جزء لمكافآت الالتزام اليومي/الأسبوعي، والباقي لمكافآت المراحل. المجموع لا يمكن أن يتجاوز {sar(d.settings.total_budget)} — يمنعه النظام تلقائياً.
      </p>
      <div className="mt-3 space-y-2">
        {d.categories.map((c) => {
          const room = Number(val(c, 'budget')) - Number(val(c, 'daily_pool'));
          const used = msTotal(c.id);
          return (
            <div key={c.id} className="rounded-2xl bg-cream-50 p-3">
              <div className="grid grid-cols-[3rem_1fr] gap-2 sm:grid-cols-[3rem_1fr_7rem_7rem_auto]">
                <input className="input !px-2 text-center" value={val(c, 'emoji')} onChange={(e) => set(c.id, 'emoji', e.target.value)} aria-label="رمز" />
                <input className="input ltr" value={val(c, 'name')} onChange={(e) => set(c.id, 'name', e.target.value)} aria-label="اسم المجال" />
                <label className="text-xs"><span className="text-plum-soft">الإجمالي (ر.س)</span>
                  <input className="input !py-1.5" type="number" min={0} value={val(c, 'budget')} onChange={(e) => set(c.id, 'budget', e.target.value)} /></label>
                <label className="text-xs"><span className="text-plum-soft">للالتزام اليومي</span>
                  <input className="input !py-1.5" type="number" min={0} value={val(c, 'daily_pool')} onChange={(e) => set(c.id, 'daily_pool', e.target.value)} /></label>
                <div className="col-span-2 flex items-end gap-1 sm:col-span-1">
                  <button className="btn-soft !py-1.5 text-sm" disabled={!rows[c.id]} onClick={() => save(c)}>حفظ</button>
                  <button className="btn-ghost !px-2 !py-1.5 text-sm" onClick={() => remove(c)} aria-label="حذف">🗑️</button>
                </div>
              </div>
              <div className={`mt-1.5 text-xs ${used > room ? 'text-blush-500' : 'text-plum-soft'}`}>
                للمراحل: {sar(room)} • مستخدم في المراحل: {sar(used)} • غير موزع: {sar(Math.max(0, room - used))}
              </div>
            </div>
          );
        })}
      </div>
      <div className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl p-3 text-sm ${draftTotal > d.settings.total_budget ? 'bg-blush-100 text-blush-500' : 'bg-lav-50'}`}>
        <span>الموزع: <b>{sar(draftTotal)}</b> من {sar(d.settings.total_budget)} • صندوق الالتزام اليومي: <b>{sar(d.summary.consistency_pool)}</b> (مستخدم {sar(d.summary.consistency_used)})</span>
        <button className="btn-ghost !py-1 text-sm" disabled={adding} onClick={() => { setAdding(true); add(); }}>+ مجال</button>
      </div>
    </Card>
  );
}

function CourseForm({ course, onDone }: { course: Partial<Course>; onDone: () => void }) {
  const d = useData();
  const toast = useToast();
  const [f, setF] = useState<Partial<Course>>(course);
  const [busy, setBusy] = useState(false);
  const up = (k: keyof Course, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  async function save() {
    if (!f.title?.trim()) return toast('اكتبي اسم الكورس', 'err');
    setBusy(true);
    const row = {
      title: f.title.trim(), category_id: f.category_id || null, provider: f.provider ?? '', url: (f.url ?? '').trim(),
      thumbnail_url: (f.thumbnail_url ?? '').trim(), start_date: f.start_date || null, target_date: f.target_date || null,
      est_hours: Number(f.est_hours || 0), weekly_minutes: Number(f.weekly_minutes || 0), progress: Math.max(0, Math.min(100, Number(f.progress || 0))),
      status: f.status ?? 'not_started', notes: f.notes ?? '', archived: !!f.archived,
    };
    const { error } = f.id ? await supabase.from('courses').update({ ...row, updated_at: new Date().toISOString() }).eq('id', f.id)
      : await supabase.from('courses').insert({ ...row, sort: d.courses.length + 1 });
    setBusy(false);
    if (error) return toast(friendlyError(error), 'err');
    toast('تم الحفظ ✅'); d.refresh(); if (!f.id) onDone();
  }
  async function remove() {
    if (!f.id || !confirm('حذف الكورس نهائياً؟ (إذا عليه مكافآت، استخدمي الأرشفة)')) return;
    const { error } = await supabase.from('courses').delete().eq('id', f.id);
    if (error) return toast(friendlyError(error), 'err');
    d.refresh(); onDone();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="اسم الكورس *"><input className="input ltr" value={f.title ?? ''} onChange={(e) => up('title', e.target.value)} /></Field>
        <Field label="المجال">
          <select className="input" value={f.category_id ?? ''} onChange={(e) => up('category_id', e.target.value)}>
            <option value="">—</option>{d.categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>
        </Field>
        <Field label="رابط الكورس الخارجي" hint="يفتح في تبويب جديد. الصقي الرابط الكامل https://…">
          <input className="input ltr text-left" value={f.url ?? ''} onChange={(e) => up('url', e.target.value)} placeholder="https://" />
        </Field>
        <Field label="المنصة / الجهة"><input className="input ltr" value={f.provider ?? ''} onChange={(e) => up('provider', e.target.value)} /></Field>
        <Field label="رابط صورة مصغرة (اختياري)"><input className="input ltr text-left" value={f.thumbnail_url ?? ''} onChange={(e) => up('thumbnail_url', e.target.value)} placeholder="https://" /></Field>
        <Field label="الحالة">
          <select className="input" value={f.status} onChange={(e) => up('status', e.target.value)}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="تاريخ البداية"><input type="date" className="input" value={f.start_date ?? ''} onChange={(e) => up('start_date', e.target.value)} /></Field>
        <Field label="تاريخ الإكمال المستهدف"><input type="date" className="input" value={f.target_date ?? ''} onChange={(e) => up('target_date', e.target.value)} /></Field>
        <Field label="إجمالي الساعات المتوقعة"><input type="number" min={0} step={0.5} className="input" value={f.est_hours ?? 0} onChange={(e) => up('est_hours', e.target.value)} /></Field>
        <Field label="دقائق الدراسة المتوقعة أسبوعياً"><input type="number" min={0} className="input" value={f.weekly_minutes ?? 0} onChange={(e) => up('weekly_minutes', e.target.value)} /></Field>
        <Field label={`نسبة التقدم: ${f.progress ?? 0}%`}><input type="range" min={0} max={100} step={5} className="w-full accent-[#8b6fe0]" value={f.progress ?? 0} onChange={(e) => up('progress', Number(e.target.value))} /></Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={!!f.archived} onChange={(e) => up('archived', e.target.checked)} /> أرشفة (إخفاء عن الطالبة)</label>
      </div>
      <Field label="ملاحظات"><textarea className="input min-h-16" value={f.notes ?? ''} onChange={(e) => up('notes', e.target.value)} /></Field>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary flex-1" disabled={busy} onClick={save}>{f.id ? 'حفظ التعديلات' : 'إضافة الكورس'}</button>
        {f.id && <button className="btn-danger" onClick={remove}>🗑️ حذف</button>}
      </div>
      {f.id && <MilestoneEditor courseId={f.id} />}
      {!f.id && <p className="text-xs text-plum-faint">بعد الإضافة، افتحي الكورس مرة ثانية لإضافة المراحل ومكافآتها.</p>}
    </div>
  );
}

function MilestoneEditor({ courseId }: { courseId: string }) {
  const d = useData();
  const toast = useToast();
  const ms = d.milestones.filter((m) => m.course_id === courseId);
  const [draft, setDraft] = useState<Record<string, Partial<Milestone>>>({});
  const [title, setTitle] = useState('');
  const [reward, setReward] = useState('');
  const course = d.courses.find((c) => c.id === courseId);
  const cat = d.categories.find((c) => c.id === course?.category_id);
  const catUsed = d.milestones.filter((m) => d.courses.find((c) => c.id === m.course_id)?.category_id === cat?.id).reduce((a, m) => a + m.reward, 0);
  const room = cat ? cat.budget - cat.daily_pool - catUsed : 0;

  async function add() {
    if (!title.trim()) return;
    const { error } = await supabase.from('milestones').insert({ course_id: courseId, title: title.trim(), reward: Number(reward || 0), sort: ms.length + 1 });
    if (error) return toast(friendlyError(error), 'err');
    setTitle(''); setReward(''); d.refresh();
  }
  async function save(m: Milestone) {
    const { error } = await supabase.from('milestones').update({ ...draft[m.id], reward: Number(draft[m.id]?.reward ?? m.reward) }).eq('id', m.id);
    if (error) return toast(friendlyError(error), 'err');
    setDraft((x) => { const n = { ...x }; delete n[m.id]; return n; }); toast('تم ✅'); d.refresh();
  }
  async function remove(m: Milestone) {
    if (!confirm('حذف المرحلة؟')) return;
    const { error } = await supabase.from('milestones').delete().eq('id', m.id);
    if (error) return toast(friendlyError(error), 'err');
    d.refresh();
  }

  return (
    <div className="rounded-3xl bg-lav-50 p-4">
      <h3 className="section-title text-base">🏁 مراحل الكورس ومكافآتها</h3>
      {cat && <p className="mt-1 text-xs text-plum-soft">المتاح لمراحل مجال {cat.name}: {sar(Math.max(0, room))} إضافية</p>}
      <ul className="mt-3 space-y-2">
        {ms.map((m) => {
          const locked = m.status !== 'open';
          return (
            <li key={m.id} className="grid grid-cols-[1fr_5.5rem_auto] items-center gap-2 rounded-2xl bg-white p-2">
              <input className="input ltr !py-1.5 text-sm" value={draft[m.id]?.title ?? m.title} onChange={(e) => setDraft((x) => ({ ...x, [m.id]: { ...x[m.id], title: e.target.value } }))} />
              <input className="input !py-1.5 text-sm" type="number" min={0} disabled={locked} title={locked ? 'لا يمكن تغيير مبلغ مرحلة مطالَب بها' : ''}
                value={draft[m.id]?.reward ?? m.reward} onChange={(e) => setDraft((x) => ({ ...x, [m.id]: { ...x[m.id], reward: Number(e.target.value) } }))} />
              <div className="flex gap-1">
                {draft[m.id] && <button className="btn-soft !px-2 !py-1 text-xs" onClick={() => save(m)}>حفظ</button>}
                {!locked && <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => remove(m)} aria-label="حذف">🗑️</button>}
                {locked && <span className="text-xs">{m.status === 'approved' ? '🏆' : '⏳'}</span>}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 grid grid-cols-[1fr_5.5rem_auto] gap-2">
        <input className="input ltr !py-1.5 text-sm" placeholder="مرحلة جديدة…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input !py-1.5 text-sm" type="number" min={0} placeholder="ر.س" value={reward} onChange={(e) => setReward(e.target.value)} />
        <button className="btn-soft !py-1.5 text-sm" onClick={add}>+ إضافة</button>
      </div>
    </div>
  );
}
