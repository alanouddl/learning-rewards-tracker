import { I, type IconName } from '../../components/Icon';
import { Link } from 'react-router-dom';
import { useData } from '../../lib/store';
import { fmtDate, fmtDateTime, todayStr } from '../../lib/dates';
import { courseName, minutesOn, planFor, streak, weekStats } from '../../lib/plan';
import { mins, pct, REWARD_KIND, sar } from '../../lib/format';
import { Card, Empty, ProgressBar, Stat } from '../../components/ui';
import { WeekCalendar, Legend } from '../../components/WeekCalendar';
import { CompletionCard, RewardActions } from '../../components/ReviewCards';
import { SavingsJar } from '../../components/SavingsJar';

export default function GuardianHome() {
  const d = useData();
  const today = todayStr();
  const plan = planFor(today, d.schedule, d.planChanges);
  const w = weekStats(d);
  const pendingCheckins = d.checkins.filter((c) => c.status === 'pending');
  const pendingRewards = d.rewards.filter((r) => r.status === 'pending');
  const completions = d.courses.filter((c) => c.status === 'awaiting_approval');
  const help = d.checkins.filter((c) => c.help_needed && c.status === 'pending');
  const s = d.summary;
  const { current } = streak(d);
  const student = d.profiles.find((p) => p.role === 'student');

  return (
    <>
      <h1 className="section-title px-1 text-2xl">أهلاً هذا ملخص {student?.display_name ?? 'الطالبة'}</h1>
      {!student && (
        <Card className="!bg-peach-100"><p className="text-sm"><I n="alert" /> لم يتم إنشاء حساب الطالبة بعد. أنشئيه من Supabase (راجعي README).</p></Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon="notebook" label="إنجازات للمراجعة" value={pendingCheckins.length} tone="pink" />
        <Stat icon="wallet" label="مكافآت للموافقة" value={pendingRewards.length} sub={pendingRewards.length ? sar(s.pending) : undefined} tone="lav" />
        <Stat icon="timer" label="اليوم" value={`${minutesOn(today, d.checkins)} / ${plan.minutes} د`} sub={plan.minutes ? plan.label : 'يوم راحة'} tone="blue" />
        <Stat icon="flame" label="السلسلة" value={`${current} يوم`} tone="cream" />
      </div>

      {(pendingCheckins.length > 0 || help.length > 0) && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title"><I n="notebook" /> بانتظار مراجعتك</h2>
            <Link to="/g/review" className="btn-primary !py-2 text-sm">مراجعة الإنجازات ({pendingCheckins.length})</Link>
          </div>
          {help.length > 0 && <p className="mt-2 rounded-2xl bg-peach-100 p-2.5 text-sm"><I n="hand" /> طلبت مساعدة في {help.length} إنجاز</p>}
        </Card>
      )}

      {completions.length > 0 && <Card><h2 className="section-title mb-3"><I n="graduation" /> طلبات إكمال كورس</h2><div className="space-y-2">{completions.map((c) => <CompletionCard key={c.id} c={c} />)}</div></Card>}

      {pendingRewards.length > 0 && (
        <Card>
          <h2 className="section-title mb-3"><I n="wallet" /> مكافآت بانتظار موافقتك</h2>
          <ul className="space-y-2">
            {pendingRewards.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-cream-50 p-3">
                <div><div className="text-sm font-semibold">{r.title}</div><div className="text-xs text-plum-soft">{REWARD_KIND[r.kind]} • <b>{sar(r.amount)}</b></div></div>
                <RewardActions r={r} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h2 className="section-title mb-3"><I n="calendar" /> هذا الأسبوع</h2>
          <WeekCalendar d={d} days={w.days} />
          <Legend />
          <div className="mt-3 flex justify-between text-sm"><span>{mins(w.done)} مسجلة • {mins(w.approved)} معتمدة</span><b>{pct(w.done, w.target)}%</b></div>
          <ProgressBar value={pct(w.done, w.target)} tone="blue" />
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <SavingsJar value={s.earned / s.total_budget} pending={s.pending / s.total_budget} size={90} />
            <div className="flex-1 space-y-1 text-sm">
              <div className="flex justify-between"><span>معتمد (غير مسلّم)</span><b>{sar(s.approved)}</b></div>
              <div className="flex justify-between"><span>تم التسليم</span><b>{sar(s.paid)}</b></div>
              <div className="flex justify-between"><span>بانتظار الموافقة</span><b>{sar(s.pending)}</b></div>
              <div className="flex justify-between text-plum-soft"><span>المتبقي في الميزانية</span><b>{sar(s.available)}</b></div>
              <ProgressBar value={pct(s.earned, s.total_budget)} />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="section-title mb-3"><I n="clock" /> آخر النشاطات</h2>
        {d.checkins.length === 0 && d.progressUpdates.length === 0 ? <Empty text="لا يوجد نشاط بعد" /> : (
          <ol className="relative space-y-3 border-r-2 border-lav-100 pr-4">
            {[
              ...d.checkins.slice(0, 8).map((c) => ({ at: c.created_at, text: `سجّلت ${c.minutes} د — ${courseName(d.courses, c.course_id) || 'دراسة'} (${fmtDate(c.study_date)})`, icon: 'notebook' as IconName })),
              ...d.progressUpdates.slice(0, 6).map((p) => ({ at: p.created_at, text: `حدّثت تقدم ${courseName(d.courses, p.course_id)}: ${p.old_progress}% ← ${p.new_progress}%${p.note ? ` — ${p.note}` : ''}`, icon: 'trend' as IconName })),
            ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10).map((e, i) => (
              <li key={i} className="relative text-sm">
                <span className="absolute -right-[27px] top-0 grid h-5 w-5 place-items-center rounded-full bg-white text-blush-500"><I n={e.icon} size={13} /></span>
                <div>{e.text}</div>
                <div className="text-[11px] text-plum-faint">{fmtDateTime(e.at)}</div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}
