import { useState } from 'react';
import { supabase, friendlyError } from '../lib/supabase';
import { useData } from '../lib/store';
import { fmtDate, fmtDateTime } from '../lib/dates';
import { courseName, minutesOn, planFor } from '../lib/plan';
import { DIFFICULTY, sar } from '../lib/format';
import { useToast } from './ui';
import type { Checkin, Course, Reward } from '../lib/types';

export function CheckinCard({ c }: { c: Checkin }) {
  const d = useData();
  const toast = useToast();
  const [fb, setFb] = useState(c.feedback);
  const [busy, setBusy] = useState(false);
  const target = planFor(c.study_date, d.schedule, d.planChanges).minutes;
  const dayTotal = minutesOn(c.study_date, d.checkins);
  const dailyReward = d.rewards.find((r) => r.kind === 'daily' && r.ref_date === c.study_date && r.status !== 'rejected');

  async function review(approve: boolean) {
    setBusy(true);
    const { error } = await supabase.rpc('review_checkin', { p_id: c.id, p_approve: approve, p_feedback: fb, p_approve_reward: true });
    setBusy(false);
    if (error) return toast(friendlyError(error), 'err');
    toast(approve ? 'تمت الموافقة ✅' : 'تم الإرجاع مع ملاحظتك'); d.refresh();
  }
  async function openFile(path: string) {
    const { data, error } = await supabase.storage.from('evidence').createSignedUrl(path, 300);
    if (error) return toast(friendlyError(error), 'err');
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  return (
    <article className="rounded-3xl border border-lav-100 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-bold">{fmtDate(c.study_date, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <div className="text-xs text-plum-soft">أُرسل {fmtDateTime(c.created_at)} • {c.source === 'timer' ? '⏱️ بالمؤقت' : '✍️ يدوي'}</div>
        </div>
        <div className="text-left">
          <div className="text-xl font-bold">{c.minutes} د</div>
          <div className="text-[11px] text-plum-soft">مجموع اليوم {dayTotal}/{target || 0}</div>
        </div>
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div><dt className="text-xs font-semibold text-plum-soft">الكورس</dt><dd className="ltr text-right">{courseName(d.courses, c.course_id) || '—'}</dd></div>
        <div><dt className="text-xs font-semibold text-plum-soft">ماذا أنجزت</dt><dd className="whitespace-pre-wrap">{c.finished}</dd></div>
        {c.learned && <div><dt className="text-xs font-semibold text-plum-soft">ماذا تعلمت</dt><dd className="whitespace-pre-wrap">{c.learned}</dd></div>}
        <div><dt className="text-xs font-semibold text-plum-soft">الصعوبة</dt><dd>{DIFFICULTY[c.difficulty]}</dd></div>
        {c.help_needed && <div className="rounded-xl bg-peach-100 p-2"><dt className="text-xs font-semibold">🙋‍♀️ تحتاج مساعدة</dt><dd>{c.help_needed}</dd></div>}
        {(c.evidence_links.length > 0 || c.evidence_files.length > 0) && (
          <div><dt className="text-xs font-semibold text-plum-soft">الإثبات</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {c.evidence_links.map((l) => <a key={l} href={l} target="_blank" rel="noopener noreferrer" className="chip ltr max-w-full truncate bg-sky-50 text-sky-400">🔗 {l}</a>)}
              {c.evidence_files.map((f, i) => <button key={f} onClick={() => openFile(f)} className="chip bg-lav-50 text-lav-600">🖼️ صورة {i + 1}</button>)}
            </dd>
          </div>
        )}
        {dailyReward && <div className="text-xs text-plum-soft">💰 مكافأة اليوم: {sar(dailyReward.amount)} ({dailyReward.status === 'pending' ? 'ستُعتمد عند الموافقة إذا اكتمل الهدف' : 'معتمدة'})</div>}
      </dl>
      <textarea className="input mt-3 min-h-14 text-sm" placeholder="رسالة تشجيعية أو ملاحظة 💌" value={fb} onChange={(e) => setFb(e.target.value)} />
      <div className="mt-2 flex flex-wrap gap-2">
        {c.status !== 'approved' && <button className="btn-mint flex-1" disabled={busy} onClick={() => review(true)}>✅ موافقة</button>}
        {c.status !== 'rejected' && <button className="btn-danger flex-1" disabled={busy} onClick={() => review(false)}>↩️ إرجاع</button>}
        {c.status !== 'pending' && (
          <span className={`chip self-center ${c.status === 'approved' ? 'bg-mint-100 text-mint-500' : 'bg-blush-50 text-blush-400'}`}>{c.status === 'approved' ? 'معتمد' : 'مرجَع'}</span>
        )}
      </div>
    </article>
  );
}

export function RewardActions({ r }: { r: Reward }) {
  const d = useData();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function set(status: 'approved' | 'rejected' | 'paid') {
    let note = '';
    if (status === 'rejected') {
      const n = prompt('سبب الرفض (يظهر لها):');
      if (n === null) return;
      note = n;
    }
    setBusy(true);
    const { error } = await supabase.rpc('set_reward_status', { p_id: r.id, p_status: status, p_note: note });
    setBusy(false);
    if (error) return toast(friendlyError(error), 'err');
    toast(status === 'approved' ? 'تمت الموافقة 💰' : status === 'paid' ? 'تم تسجيل التسليم 🎁' : 'تم الرفض'); d.refresh();
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {r.status === 'pending' && <>
        <button className="btn-mint !px-3 !py-1.5 text-sm" disabled={busy} onClick={() => set('approved')}>موافقة</button>
        <button className="btn-danger !px-3 !py-1.5 text-sm" disabled={busy} onClick={() => set('rejected')}>رفض</button>
      </>}
      {r.status === 'approved' && <>
        <button className="btn-soft !px-3 !py-1.5 text-sm" disabled={busy} onClick={() => confirm(`تأكيد تسليم ${sar(r.amount)}؟`) && set('paid')}>🎁 تم التسليم</button>
        <button className="btn-ghost !px-2 !py-1.5 text-xs" disabled={busy} onClick={() => set('rejected')}>إلغاء</button>
      </>}
    </div>
  );
}

export function CompletionCard({ c }: { c: Course }) {
  const d = useData();
  const toast = useToast();
  async function act(approve: boolean) {
    const note = approve ? '' : prompt('ملاحظة لها:') ?? '';
    const { error } = await supabase.rpc('approve_course_completion', { p_course: c.id, p_approve: approve, p_note: note });
    if (error) return toast(friendlyError(error), 'err');
    toast(approve ? 'تم اعتماد إكمال الكورس 🎓' : 'تم الإرجاع'); d.refresh();
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-lav-100 bg-white p-3">
      <div><div className="ltr text-right font-semibold">🎓 {c.title}</div><div className="text-xs text-plum-soft">طلبت اعتماد إكمال الكورس</div></div>
      <div className="flex gap-1.5">
        <button className="btn-mint !px-3 !py-1.5 text-sm" onClick={() => act(true)}>اعتماد</button>
        <button className="btn-danger !px-3 !py-1.5 text-sm" onClick={() => act(false)}>ليس بعد</button>
      </div>
    </div>
  );
}
