import { useData } from '../../lib/store';
import { fmtDate, fmtDateTime } from '../../lib/dates';
import { pct, REWARD_KIND, REWARD_STATUS, sar } from '../../lib/format';
import { badges, THRESHOLDS } from '../../lib/badges';
import { Card, Empty, ProgressBar, Stat } from '../../components/ui';
import { SavingsJar } from '../../components/SavingsJar';
import { Sparkle, Star } from '../../components/Decor';
import { MoneyCelebration } from './Today';
import type { RewardStatus } from '../../lib/types';

export const REWARD_CHIP: Record<RewardStatus, string> = {
  pending: 'bg-lav-100 text-lav-600',
  approved: 'bg-mint-100 text-mint-500',
  paid: 'bg-sky-100 text-sky-400',
  rejected: 'bg-blush-50 text-blush-400',
};

export default function StudentRewards() {
  const d = useData();
  const s = d.summary;
  const remaining = Math.max(0, s.total_budget - s.earned);
  const upcoming = d.milestones.filter((m) => m.status === 'open' && m.reward > 0)
    .map((m) => ({ ...m, course: d.courses.find((c) => c.id === m.course_id) }))
    .filter((m) => m.course && !m.course.archived).slice(0, 6);
  const nextThreshold = THRESHOLDS.find((t) => t > s.earned);
  const feedback = d.checkins.filter((c) => c.feedback).slice(0, 5);
  const bs = badges(d);

  return (
    <>
      <MoneyCelebration />
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-lav-100 via-blush-50 to-sky-100 p-5 shadow-soft animate-rise">
        <Star className="absolute left-6 top-6 h-5 w-5 animate-twinkle" color="#fff" />
        <Sparkle className="absolute bottom-8 right-1/2 h-4 w-4 animate-twinkle [animation-delay:1s]" />
        <h1 className="text-center text-2xl font-bold sm:text-3xl">رحلتك لجهاز أحلامك 💻✨</h1>
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-10">
          <div className="animate-floaty"><SavingsJar value={s.earned / s.total_budget} pending={s.pending / s.total_budget} size={170} /></div>
          <div className="w-full max-w-xs space-y-3 text-center sm:text-right">
            <div>
              <div className="text-sm text-plum-soft">جمعتِ</div>
              <div className="font-display text-4xl font-bold">{sar(s.earned)}</div>
              <div className="text-sm text-plum-soft">من {sar(s.total_budget)}</div>
            </div>
            <ProgressBar value={pct(s.earned, s.total_budget)} height="h-4" />
            <div className="rounded-2xl bg-white/70 p-3 text-sm">
              ⏳ باقي <b>{sar(remaining)}</b> وتوصلين للهدف!
              {nextThreshold && <div className="mt-1 text-xs text-plum-soft">الإنجاز القادم: {nextThreshold} ريال (باقي {sar(nextThreshold - s.earned)})</div>}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat emoji="🎯" label="الهدف" value={sar(s.total_budget)} tone="cream" />
        <Stat emoji="✅" label="معتمد" value={sar(s.approved + s.paid)} sub={s.paid ? `منها ${sar(s.paid)} مستلمة` : undefined} tone="mint" />
        <Stat emoji="⏳" label="بانتظار الموافقة" value={sar(s.pending)} tone="lav" />
        <Stat emoji="💫" label="المتبقي" value={sar(remaining)} tone="pink" />
      </div>

      <Card>
        <h2 className="section-title mb-3">🏅 أوسمتي</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {bs.map((b) => (
            <div key={b.id} title={b.hint} className={`flex flex-col items-center rounded-2xl p-2 text-center transition ${b.earned ? 'bg-gradient-to-br from-blush-50 to-lav-100' : 'bg-cream-50 opacity-45 grayscale'}`}>
              <span className={`text-3xl ${b.earned ? 'animate-floaty' : ''}`}>{b.emoji}</span>
              <span className="mt-1 text-xs font-semibold">{b.title}</span>
              <span className="text-[10px] text-plum-faint">{b.hint}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h2 className="section-title mb-3">🎁 مكافآت قادمة</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between rounded-xl bg-cream-50 p-2.5"><span>🌷 كل يوم تحققين هدفك</span><b>{sar(d.settings.daily_reward)}</b></li>
            <li className="flex justify-between rounded-xl bg-cream-50 p-2.5"><span>🌟 هدف الأسبوع ({d.settings.weekly_target_minutes} د)</span><b>+{sar(d.settings.weekly_bonus)}</b></li>
            {upcoming.map((m) => (
              <li key={m.id} className="flex justify-between gap-2 rounded-xl bg-cream-50 p-2.5"><span className="ltr truncate text-right">🏁 {m.title}</span><b className="shrink-0">{sar(m.reward)}</b></li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="section-title mb-3">💌 رسائل ولي الأمر</h2>
          {feedback.length === 0 ? <Empty emoji="💌" text="الرسائل تظهر هنا" /> : (
            <ul className="space-y-2">
              {feedback.map((c) => (
                <li key={c.id} className="rounded-2xl bg-blush-50 p-3 text-sm">
                  <p>{c.feedback}</p>
                  <p className="mt-1 text-[11px] text-plum-faint">على إنجاز {fmtDate(c.study_date)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="section-title mb-3">📜 سجل المكافآت</h2>
        {d.rewards.length === 0 ? <Empty emoji="🪙" text="أول مكافأة قريبة! سجّلي دراستك اليوم" /> : (
          <ul className="divide-y divide-lav-100">
            {d.rewards.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <span className="text-xl">{r.kind === 'milestone' ? '🏁' : r.kind === 'weekly' ? '🌟' : r.kind === 'bonus' ? '🎁' : '🌷'}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{r.title}</div>
                  <div className="text-[11px] text-plum-faint">{REWARD_KIND[r.kind]} • {fmtDateTime(r.created_at)}</div>
                  {r.note && <div className="text-xs text-plum-soft">💬 {r.note}</div>}
                </div>
                <div className="text-left">
                  <div className={`font-bold ${r.status === 'rejected' ? 'text-plum-faint line-through' : ''}`}>{sar(r.amount)}</div>
                  <span className={`chip ${REWARD_CHIP[r.status]}`}>{REWARD_STATUS[r.status]}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
