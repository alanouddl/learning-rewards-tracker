import { useState } from 'react';
import { supabase, friendlyError } from '../../lib/supabase';
import { useData } from '../../lib/store';
import { fmtDateTime } from '../../lib/dates';
import { pct, REWARD_KIND, REWARD_STATUS, sar } from '../../lib/format';
import { Card, Empty, Field, ProgressBar, Stat, useToast } from '../../components/ui';
import { RewardActions } from '../../components/ReviewCards';
import { REWARD_CHIP } from '../student/Rewards';
import type { Reward } from '../../lib/types';

export default function GuardianRewards() {
  const d = useData();
  const toast = useToast();
  const s = d.summary;
  const [status, setStatus] = useState<'' | Reward['status']>('');
  const [kind, setKind] = useState<'' | Reward['kind']>('');
  const [bonus, setBonus] = useState({ amount: '', title: '' });
  const [showLog, setShowLog] = useState(false);
  const list = d.rewards.filter((r) => (!status || r.status === status) && (!kind || r.kind === kind));
  const approved = d.rewards.filter((r) => r.status === 'approved');
  const poolLeft = s.consistency_pool - s.consistency_used;

  async function payAll() {
    if (!confirm(`تسجيل تسليم ${approved.length} مكافأة بمجموع ${sar(s.approved)}؟`)) return;
    for (const r of approved) {
      const { error } = await supabase.rpc('set_reward_status', { p_id: r.id, p_status: 'paid', p_note: '' });
      if (error) { toast(friendlyError(error), 'err'); break; }
    }
    toast('تم تسجيل التسليم 🎁'); d.refresh();
  }
  async function grant() {
    const a = Number(bonus.amount);
    if (!a || a <= 0) return toast('اكتبي مبلغاً صحيحاً', 'err');
    const { error } = await supabase.rpc('grant_bonus', { p_amount: a, p_title: bonus.title || 'مكافأة خاصة', p_note: '' });
    if (error) return toast(friendlyError(error), 'err');
    setBonus({ amount: '', title: '' }); toast('تمت إضافة المكافأة 🎁'); d.refresh();
  }

  return (
    <>
      <h1 className="section-title px-1 text-2xl">💰 المكافآت والميزانية</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat emoji="🎯" label="الميزانية الكلية" value={sar(s.total_budget)} tone="cream" />
        <Stat emoji="✅" label="معتمد (لم يُسلّم)" value={sar(s.approved)} tone="mint" />
        <Stat emoji="🎁" label="تم التسليم" value={sar(s.paid)} tone="blue" />
        <Stat emoji="⏳" label="بانتظار الموافقة" value={sar(s.pending)} tone="lav" />
        <Stat emoji="💫" label="المتبقي المتاح" value={sar(s.available)} sub="الكلي − (المعتمد + المسلّم + المعلّق)" tone="pink" />
      </div>
      <Card>
        <div className="mb-1 flex justify-between text-sm"><span>التقدم نحو {d.settings.goal_label}</span><b>{pct(s.earned, s.total_budget)}%</b></div>
        <ProgressBar value={pct(s.earned, s.total_budget)} height="h-4" />
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-2xl bg-cream-50 p-3">🌷 صندوق الالتزام اليومي/الأسبوعي: <b>{sar(s.consistency_pool)}</b> — المستخدم {sar(s.consistency_used)} • المتبقي <b>{sar(poolLeft)}</b></div>
          <div className="rounded-2xl bg-cream-50 p-3">🏁 مخصص للمراحل: <b>{sar(s.allocated - s.consistency_pool)}</b> • غير موزع: {sar(s.total_budget - s.allocated)}</div>
        </div>
        <p className="mt-2 text-xs text-plum-soft">🔒 لا يتم تحويل أي أموال حقيقية تلقائياً. «تم التسليم» مجرد تسجيل منك بعد أن تعطيها المبلغ بنفسك.</p>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h2 className="section-title mb-2">⚙️ قيم المكافآت</h2>
          <p className="text-sm">🌷 إكمال هدف اليوم: <b>{sar(d.settings.daily_reward)}</b></p>
          <p className="text-sm">🌟 إكمال هدف الأسبوع: <b>+{sar(d.settings.weekly_bonus)}</b> (عند {d.settings.weekly_target_minutes} دقيقة معتمدة)</p>
          <p className="mt-2 text-xs text-plum-soft">التعديل من صفحة <a className="text-lav-500 underline" href="#/g/schedule">الجدول</a>. مكافآت المراحل وتوزيع الميزانية من صفحة <a className="text-lav-500 underline" href="#/g/courses">الكورسات</a>.</p>
        </Card>
        <Card>
          <h2 className="section-title mb-2">🎁 مكافأة خاصة</h2>
          <div className="grid grid-cols-[1fr_6rem] gap-2">
            <Field label="السبب"><input className="input" value={bonus.title} onChange={(e) => setBonus({ ...bonus, title: e.target.value })} placeholder="مثال: التزام رائع هذا الشهر" /></Field>
            <Field label="المبلغ"><input className="input" type="number" min={1} value={bonus.amount} onChange={(e) => setBonus({ ...bonus, amount: e.target.value })} /></Field>
          </div>
          <button className="btn-soft mt-2 w-full" onClick={grant}>إضافة (من صندوق الالتزام — متاح {sar(poolLeft)})</button>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">📜 سجل المكافآت</h2>
          {approved.length > 0 && <button className="btn-soft !py-1.5 text-sm" onClick={payAll}>🎁 تسليم كل المعتمد ({sar(s.approved)})</button>}
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="الحالة">
            <option value="">كل الحالات</option>{Object.entries(REWARD_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="النوع">
            <option value="">كل الأنواع</option>{Object.entries(REWARD_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {list.length === 0 ? <Empty emoji="🪙" text="لا توجد مكافآت" /> : (
          <ul className="divide-y divide-lav-100">
            {list.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{r.title}</div>
                  <div className="text-[11px] text-plum-faint">{REWARD_KIND[r.kind]} • {fmtDateTime(r.created_at)}{r.paid_at && ` • سُلّمت ${fmtDateTime(r.paid_at)}`}</div>
                  {r.note && <div className="text-xs text-plum-soft">💬 {r.note}</div>}
                </div>
                <b>{sar(r.amount)}</b>
                <span className={`chip ${REWARD_CHIP[r.status]}`}>{REWARD_STATUS[r.status]}</span>
                <RewardActions r={r} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <button className="section-title w-full justify-between" onClick={() => setShowLog(!showLog)}>
          <span>🧾 سجل العمليات الثابت (لا يمكن تعديله)</span><span>{showLog ? '▲' : '▼'}</span>
        </button>
        {showLog && (
          <ul className="mt-3 space-y-1 text-xs">
            {d.events.map((e) => {
              const r = d.rewards.find((x) => x.id === e.reward_id);
              return (
                <li key={e.id} className="flex flex-wrap gap-x-2 rounded-xl bg-cream-50 px-2.5 py-1.5">
                  <span className="text-plum-faint">#{e.id} • {fmtDateTime(e.created_at)}</span>
                  <span>{r?.title ?? e.reward_id.slice(0, 8)}</span>
                  <span>{e.from_status ? REWARD_STATUS[e.from_status as Reward['status']] : 'إنشاء'} ← <b>{REWARD_STATUS[e.to_status as Reward['status']]}</b></span>
                  <span>{sar(e.amount)}</span>
                  {e.note && <span className="text-plum-soft">({e.note})</span>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
