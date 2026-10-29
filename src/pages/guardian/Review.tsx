import { I } from '../../components/Icon';
import { useState } from 'react';
import { useData } from '../../lib/store';
import { Card, Empty } from '../../components/ui';
import { CheckinCard, CompletionCard, RewardActions } from '../../components/ReviewCards';
import { sar } from '../../lib/format';

export default function GuardianReview() {
  const d = useData();
  const [status, setStatus] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending');
  const [course, setCourse] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const list = d.checkins.filter((c) => (status === 'all' || c.status === status) && (!course || c.course_id === course)
    && (!from || c.study_date >= from) && (!to || c.study_date <= to));
  const milestoneRewards = d.rewards.filter((r) => r.kind === 'milestone' && r.status === 'pending');
  const completions = d.courses.filter((c) => c.status === 'awaiting_approval');

  return (
    <>
      <h1 className="section-title px-1 text-2xl"><I n="done" /> مراجعة الإنجازات</h1>
      {(milestoneRewards.length > 0 || completions.length > 0) && (
        <Card>
          <h2 className="section-title mb-3"><I n="flag" /> مراحل وكورسات بانتظار الاعتماد</h2>
          <div className="space-y-2">
            {completions.map((c) => <CompletionCard key={c.id} c={c} />)}
            {milestoneRewards.map((r) => {
              const m = d.milestones.find((x) => x.id === r.milestone_id);
              return (
                <div key={r.id} className="rounded-2xl border border-lav-100 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0"><div className="ltr text-right font-semibold">{r.title}</div><div className="text-xs text-plum-soft">{sar(r.amount)}</div></div>
                    <RewardActions r={r} />
                  </div>
                  {m?.student_note && <p className="mt-2 text-sm"><I n="message" /> {m.student_note}</p>}
                  {m?.evidence_url && /^https?:\/\//.test(m.evidence_url) && <a className="chip ltr mt-1 bg-sky-50 text-sky-400" href={m.evidence_url} target="_blank" rel="noopener noreferrer"><I n="link" /> {m.evidence_url}</a>}
                </div>
              );
            })}
          </div>
        </Card>
      )}
      <Card>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="الحالة">
            <option value="pending">بانتظار المراجعة</option><option value="approved">معتمدة</option><option value="rejected">مرجعة</option><option value="all">الكل</option>
          </select>
          <select className="input" value={course} onChange={(e) => setCourse(e.target.value)} aria-label="الكورس">
            <option value="">كل الكورسات</option>{d.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="من تاريخ" />
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} aria-label="إلى تاريخ" />
        </div>
      </Card>
      {list.length === 0 ? <Card><Empty icon="party" text={status === 'pending' ? 'لا يوجد شيء بانتظار المراجعة' : 'لا توجد نتائج'} /></Card> : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{list.map((c) => <CheckinCard key={c.id} c={c} />)}</div>
      )}
    </>
  );
}
