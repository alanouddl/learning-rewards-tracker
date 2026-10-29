import { I } from '../../components/Icon';
import { useData } from '../../lib/store';
import { fmtDate, fmtDateTime } from '../../lib/dates';
import { courseName, streak } from '../../lib/plan';
import { DIFFICULTY, mins, pct } from '../../lib/format';
import { Card, Empty, ProgressBar, Stat } from '../../components/ui';
import { weekStats } from '../../lib/plan';

export default function StudentHistory() {
  const d = useData();
  const live = d.checkins.filter((c) => c.status !== 'rejected');
  const total = live.reduce((a, c) => a + c.minutes, 0);
  const { current, best } = streak(d);
  const w = weekStats(d);
  return (
    <>
      <h1 className="section-title px-1 text-2xl"><I n="notebook" /> إنجازاتي</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon="hourglass" label="إجمالي الدراسة" value={mins(total)} tone="lav" />
        <Stat icon="flame" label="السلسلة الحالية" value={`${current} يوم`} sub={`أفضل سلسلة: ${best}`} tone="pink" />
        <Stat icon="chart" label="إنجاز الأسبوع" value={`${pct(w.done, w.target)}%`} tone="blue" />
        <Stat icon="folder" label="جلسات مسجلة" value={live.length} tone="mint" />
      </div>
      <Card>
        <h2 className="section-title mb-3"><I n="trend" /> تقدم الكورسات</h2>
        <div className="space-y-3">
          {d.courses.filter((c) => !c.archived).map((c) => (
            <div key={c.id}>
              <div className="flex justify-between text-sm"><span className="ltr truncate">{c.title}</span><b>{c.progress}%</b></div>
              <ProgressBar value={c.progress} tone="lav" height="h-2" />
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="section-title mb-3"><I n="folder" /> سجل الجلسات</h2>
        {d.checkins.length === 0 ? <Empty text="أول إنجاز لك بيظهر هنا" /> : (
          <ul className="space-y-2.5">
            {d.checkins.map((c) => (
              <li key={c.id} className="rounded-2xl border border-lav-100 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b>{fmtDate(c.study_date, { weekday: 'long', day: 'numeric', month: 'short' })}</b>
                  <span className={`chip ${c.status === 'approved' ? 'bg-mint-100 text-mint-500' : c.status === 'rejected' ? 'bg-blush-50 text-blush-400' : 'bg-lav-100 text-lav-600'}`}>
                    {c.status === 'approved' ? 'معتمد' : c.status === 'rejected' ? '↩️ يحتاج مراجعة' : 'بانتظار الموافقة'}
                  </span>
                </div>
                <div className="mt-1 text-xs text-plum-soft">{c.minutes} دقيقة • <span className="ltr">{courseName(d.courses, c.course_id)}</span> • {DIFFICULTY[c.difficulty]} • {c.source === 'timer' ? 'مؤقت' : 'يدوي'}</div>
                <p className="mt-2 text-sm">{c.finished}</p>
                {c.learned && <p className="mt-1 text-sm text-plum-soft"><I n="idea" /> {c.learned}</p>}
                {c.feedback && <p className="mt-2 rounded-xl bg-blush-50 p-2 text-sm"><I n="love" /> {c.feedback}</p>}
                <p className="mt-1 text-[10px] text-plum-faint">{fmtDateTime(c.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
