import { Link } from 'react-router-dom';
import { useData } from '../lib/store';
import { sar } from '../lib/format';
import { STAGE_ICON, STAGE_STATUS, currentStage, englishStats, hasEnglish, isEnglishCourse, nextLesson, stageProgress, stageReward } from '../lib/english';
import { Card, ProgressBar } from './ui';
import { I, IconBubble } from './Icon';

/** Shown on the student's Today page when today's plan is an English course. */
export function EnglishTodayCard({ courseId, minutes, task }: { courseId: string | null; minutes: number; task: string }) {
  const d = useData();
  if (!hasEnglish(d) || !isEnglishCourse(d, courseId)) return null;
  const stage = currentStage(d);
  if (!stage) return null;
  const course = d.courses.find((c) => c.id === courseId);
  const p = stageProgress(d, stage.id);
  const next = nextLesson(d, stage.id, courseId);
  const st = englishStats(d);
  return (
    <Card className="!bg-gradient-to-l !from-sky-50 !to-lav-50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title"><I n="tulip" /> رحلتك مع الإنجليزية</h2>
        <Link to="/english" className="text-sm font-bold text-lav-600">الرحلة كاملة <I n="external" size={14} /></Link>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <IconBubble n={STAGE_ICON[stage.id] ?? 'star'} tone="lilac" size="h-11 w-11" icon={20} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-plum-soft">المرحلة الحالية • {STAGE_STATUS[stage.status]}</p>
          <p className="font-extrabold">{stage.name_ar}</p>
          <div className="mt-1"><ProgressBar value={p.pct} height="h-2" tone="lav" /></div>
          <p className="mt-0.5 text-[11px] text-plum-soft">{p.done} دروس مكتملة • {p.remaining} متبقية</p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-2.5"><dt className="text-[11px] text-plum-soft">كورس اليوم</dt><dd className="ltr truncate text-right font-bold">{course?.title}</dd></div>
        <div className="rounded-2xl bg-white p-2.5"><dt className="text-[11px] text-plum-soft">هدف اليوم</dt><dd className="font-bold">{minutes} دقيقة</dd></div>
        <div className="rounded-2xl bg-white p-2.5"><dt className="text-[11px] text-plum-soft">إنجليزي هذا الأسبوع</dt><dd className="font-bold">{st.weekMinutes} / {st.weekTarget} د</dd></div>
        <div className="rounded-2xl bg-white p-2.5"><dt className="text-[11px] text-plum-soft">مكافأة المرحلة</dt><dd className="font-bold">{sar(stageReward(d, stage))}</dd></div>
      </dl>
      {task && <p className="mt-3 text-sm"><span className="text-plum-soft">المهمة:</span> {task}</p>}
      {next && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3">
          <div className="min-w-0"><p className="text-[11px] font-bold text-sky-400">الدرس التالي المقترح</p><p className="ltr truncate text-right font-bold">{next.title}</p></div>
          {next.url && <a className="btn-primary !py-2 text-sm" href={next.url} target="_blank" rel="noopener noreferrer">شاهدي على يوتيوب <I n="external" size={15} /></a>}
        </div>
      )}
      {course && !course.link_verified && <p className="mt-2 text-[11px] text-[#9a7400]">رابط القائمة بانتظار تأكيد ولي الأمر — ابحثي في صفحة القوائم عن «{course.title}».</p>}
    </Card>
  );
}
