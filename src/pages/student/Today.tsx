import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../lib/store';
import { fmtDate, greeting, todayStr } from '../../lib/dates';
import { minutesOn, planFor, streak, weekStats } from '../../lib/plan';
import { motivationFor, THRESHOLDS } from '../../lib/badges';
import { mins, pct, sar } from '../../lib/format';
import { celebrate, takeNewThreshold } from '../../lib/celebrate';
import { Card, Modal, ProgressBar, Ring } from '../../components/ui';
import { StudyTimer } from '../../components/Timer';
import { CheckinForm } from '../../components/CheckinForm';
import { TaskList } from '../../components/TaskList';
import { OpenCourseButton } from '../../components/OpenCourse';
import { WeekCalendar } from '../../components/WeekCalendar';
import { Flower, Sparkle } from '../../components/Decor';
import { SavingsJar } from '../../components/SavingsJar';

export function useMoneyCelebration() {
  const d = useData();
  const [hit, setHit] = useState<number | null>(null);
  useEffect(() => {
    const t = takeNewThreshold(d.summary.earned, THRESHOLDS.filter((x) => x <= d.settings.total_budget));
    if (t) { setHit(t); celebrate(true); }
  }, [d.summary.earned, d.settings.total_budget]);
  return { hit, close: () => setHit(null) };
}

export function MoneyCelebration() {
  const { hit, close } = useMoneyCelebration();
  return (
    <Modal open={!!hit} onClose={close} title="🎉 إنجاز جديد!">
      <div className="py-2 text-center">
        <div className="text-6xl animate-floaty">{hit && hit >= 3000 ? '💻' : '💗'}</div>
        <p className="mt-3 font-display text-2xl font-bold">وصلتِ {hit} ريال!</p>
        <p className="mt-1 text-plum-soft">{hit && hit >= 3000 ? 'حققتِ الهدف كامل! جهاز أحلامك صار لك 🥳' : 'فخورين فيك! كل خطوة تقربك من جهاز أحلامك ✨'}</p>
        <button className="btn-primary mt-4" onClick={close}>يااي 💜</button>
      </div>
    </Modal>
  );
}

export default function StudentToday() {
  const d = useData();
  const today = todayStr();
  const plan = planFor(today, d.schedule, d.planChanges);
  const done = minutesOn(today, d.checkins);
  const course = d.courses.find((c) => c.id === plan.course_id);
  const week = weekStats(d);
  const { current } = streak(d);
  const [form, setForm] = useState<null | { minutes?: number; course: string | null; source: 'timer' | 'manual' }>(null);
  const s = d.summary;

  return (
    <>
      <MoneyCelebration />
      {/* greeting */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-blush-100 via-lav-100 to-sky-100 p-5 shadow-soft animate-rise">
        <Flower className="absolute -left-4 -top-4 h-24 w-24 opacity-60 animate-floaty" color="#fdcade" />
        <Sparkle className="absolute left-24 top-6 h-5 w-5 animate-twinkle" color="#fff" />
        <p className="text-sm text-plum-soft">{fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{greeting()} يا بطلة! 🌷</h1>
        <p className="mt-2 text-plum-soft">{motivationFor(today)}</p>
        {d.settings.guardian_message && (
          <p className="mt-3 inline-block rounded-2xl bg-white/70 px-3 py-1.5 text-sm">💌 {d.settings.guardian_message}</p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {/* today's goal */}
        <Card className="md:col-span-3">
          <div className="flex items-start gap-4">
            <Ring value={pct(done, plan.minutes)}>
              <span className="text-2xl font-bold">{done}</span>
              <span className="text-[11px] text-plum-soft">من {plan.minutes || '—'} د</span>
            </Ring>
            <div className="min-w-0 flex-1 space-y-1.5">
              <h2 className="section-title">🎯 هدف اليوم: {plan.minutes ? `${plan.minutes} دقيقة` : 'راحة 🌸'}</h2>
              {course && <p className="text-sm"><span className="text-plum-soft">الكورس:</span> <b className="ltr">{course.title}</b></p>}
              {plan.task_text && <p className="text-sm"><span className="text-plum-soft">المهمة:</span> <bdi>{plan.task_text}</bdi></p>}
              {plan.makeups.length > 0 && <p className="chip bg-sky-50 text-sky-400">📅 فيه جلسة تعويض اليوم</p>}
              {done >= plan.minutes && plan.minutes > 0 && <p className="chip bg-mint-100 text-mint-500">✓ حققتِ هدف اليوم!</p>}
            </div>
          </div>
          {plan.minutes === 0 && <p className="mt-3 rounded-2xl bg-cream-100 p-3 text-sm">اليوم يوم راحة — استمتعي بيومك 💛 وإذا حبيتي تذاكرين، المؤقت جاهز.</p>}
          <div className="mt-4"><OpenCourseButton course={course} big /></div>
        </Card>

        {/* timer */}
        <Card className="md:col-span-2">
          <h2 className="section-title mb-3">⏱️ مؤقت المذاكرة</h2>
          <StudyTimer courseId={plan.course_id} targetMinutes={plan.minutes}
            onFinish={(m, c) => setForm({ minutes: m, course: c, source: 'timer' })} />
          <button className="btn-ghost mt-3 w-full text-sm" onClick={() => setForm({ course: plan.course_id, source: 'manual' })}>
            ✍️ نسيتي المؤقت؟ سجّلي الوقت يدوياً
          </button>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title">🗓️ أسبوعك</h2>
            <Link to="/week" className="text-sm font-semibold text-lav-500">التفاصيل ←</Link>
          </div>
          <WeekCalendar d={d} days={week.days} />
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-sm"><span>{mins(week.done)} من {mins(week.target)}</span><span className="font-bold">{pct(week.done, week.target)}%</span></div>
            <ProgressBar value={pct(week.done, week.target)} tone="blue" />
          </div>
          {current > 0 && <p className="mt-3 text-sm">🔥 سلسلتك الحالية: <b>{current}</b> {current === 1 ? 'يوم' : 'أيام'}</p>}
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <SavingsJar value={s.earned / s.total_budget} pending={s.pending / s.total_budget} size={96} />
            <div className="min-w-0 flex-1">
              <h2 className="section-title">💻 {d.settings.goal_label}</h2>
              <p className="mt-1 text-2xl font-bold">{sar(s.earned)}</p>
              <p className="text-xs text-plum-soft">باقي {sar(Math.max(0, s.total_budget - s.earned))} على الهدف</p>
              {s.pending > 0 && <p className="mt-1 chip bg-lav-50 text-lav-600">⏳ {sar(s.pending)} بانتظار الموافقة</p>}
              <div className="mt-2"><ProgressBar value={pct(s.earned, s.total_budget)} /></div>
              <Link to="/rewards" className="mt-2 inline-block text-sm font-semibold text-lav-500">حصالتي ←</Link>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="section-title mb-3">✅ مهامي</h2>
        <TaskList />
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title="📝 إنجاز اليوم">
        {form && <CheckinForm initialMinutes={form.minutes} initialCourse={form.course} source={form.source} onDone={() => setForm(null)} />}
      </Modal>
    </>
  );
}
