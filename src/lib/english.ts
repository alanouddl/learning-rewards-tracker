import type { Data } from './store';
import type { Course, EnglishStage, Skill, StageStatus } from './types';
import type { IconName } from '../components/Icon';
import { addDays, todayStr, weekStart } from './dates';

export const STAGE_ICON: Record<number, IconName> = { 1: 'sprout', 2: 'pencil', 3: 'headphones', 4: 'trophy' };
export const STAGE_TONE = ['pink', 'lilac', 'blue', 'butter'] as const;
export const STAGE_STATUS: Record<StageStatus, string> = {
  locked: 'مقفلة', available: 'متاحة', in_progress: 'قيد التقدم', awaiting_review: 'بانتظار تقييم ولي الأمر', completed: 'مكتملة',
};
export const ROLE_LABEL = { main: 'أساسي', support: 'مساند', review: 'مراجعة' } as const;

export const SKILLS: { id: Skill; label: string; icon: IconName }[] = [
  { id: 'vocabulary', label: 'المفردات', icon: 'book' },
  { id: 'reading', label: 'القراءة', icon: 'notebook' },
  { id: 'pronunciation', label: 'النطق', icon: 'mic' },
  { id: 'grammar', label: 'القواعد', icon: 'puzzle' },
  { id: 'sentences', label: 'تكوين الجمل', icon: 'pen' },
  { id: 'listening', label: 'الاستماع', icon: 'headphones' },
  { id: 'speaking', label: 'المحادثة', icon: 'message' },
  { id: 'writing', label: 'الكتابة', icon: 'pencil' },
];
export const RATING_LABEL = ['', 'بداية', 'تتحسن', 'جيد', 'جيد جداً', 'ممتاز'];

export const hasEnglish = (d: Data) => d.english.stages.length > 0;

/** The stage she is working on: the first one that is not completed or locked. */
export function currentStage(d: Data): EnglishStage | undefined {
  const s = d.english.stages;
  return s.find((x) => x.status === 'in_progress' || x.status === 'awaiting_review' || x.status === 'available')
    ?? [...s].reverse().find((x) => x.status === 'completed');
}

export function englishCourseIds(d: Data): Set<string> {
  const en = d.categories.find((c) => c.name.toLowerCase() === 'english')?.id;
  return new Set(d.courses.filter((c) => c.category_id === en).map((c) => c.id));
}
export const isEnglishCourse = (d: Data, id: string | null | undefined) => !!id && englishCourseIds(d).has(id);

export function stageCourses(d: Data, stageId: number): (Course & { role: 'main' | 'support' | 'review' })[] {
  return d.english.stageCourses.filter((x) => x.stage_id === stageId)
    .map((x) => ({ ...(d.courses.find((c) => c.id === x.course_id) as Course), role: x.role }))
    .filter((c) => c.id);
}

export function stageProgress(d: Data, stageId: number) {
  const lessons = d.english.lessons.filter((l) => l.stage_id === stageId);
  const done = lessons.filter((l) => l.done_at).length;
  const obj = d.english.objectives.filter((o) => o.stage_id === stageId);
  const objDone = obj.filter((o) => o.done).length;
  // lessons and objectives count equally; a stage without lessons yet shows objective progress only
  const parts = [lessons.length ? done / lessons.length : null, obj.length ? objDone / obj.length : null].filter((x): x is number => x !== null);
  const pct = parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) : 0;
  return { lessons: lessons.length, done, remaining: lessons.length - done, objectives: obj.length, objDone, pct };
}

export function nextLesson(d: Data, stageId: number, courseId?: string | null) {
  const open = d.english.lessons.filter((l) => l.stage_id === stageId && !l.done_at);
  return (courseId ? open.find((l) => l.course_id === courseId) : undefined) ?? open[0];
}

export function englishStats(d: Data) {
  const ids = englishCourseIds(d);
  const en = d.checkins.filter((c) => c.course_id && ids.has(c.course_id));
  const verified = en.filter((c) => c.status === 'approved').reduce((a, c) => a + c.minutes, 0);
  const wk = weekStart(todayStr());
  const weekMinutes = en.filter((c) => c.status !== 'rejected' && c.study_date >= wk && c.study_date <= addDays(wk, 6)).reduce((a, c) => a + c.minutes, 0);
  const weekTarget = d.schedule.filter((s) => isEnglishCourse(d, s.course_id)).reduce((a, s) => a + s.minutes, 0);
  // consistency: share of the last 4 full weeks that reached the English weekly target
  let met = 0, counted = 0;
  for (let i = 1; i <= 4; i++) {
    const s = addDays(wk, -7 * i), e = addDays(s, 6);
    const first = en.length ? en.reduce((m, c) => (c.study_date < m ? c.study_date : m), todayStr()) : todayStr();
    if (e < first) continue;
    counted++;
    const m = en.filter((c) => c.status !== 'rejected' && c.study_date >= s && c.study_date <= e).reduce((a, c) => a + c.minutes, 0);
    if (weekTarget && m >= weekTarget) met++;
  }
  const lessonsDone = d.english.lessons.filter((l) => l.done_at).length;
  return { verifiedMinutes: verified, weekMinutes, weekTarget, consistency: counted ? Math.round((met / counted) * 100) : null, lessonsDone };
}

export function latestRatings(d: Data) {
  const out = new Map<Skill, { latest?: number; baseline?: number }>();
  for (const r of d.english.skills) {
    const cur = out.get(r.skill) ?? {};
    cur.latest = r.rating;
    if (r.is_baseline && cur.baseline === undefined) cur.baseline = r.rating;
    out.set(r.skill, cur);
  }
  return out;
}

/** Skills that need practice: latest rating 1–2, or items marked "needs improvement" in the last review. */
export function weakSkills(d: Data): Skill[] {
  const r = latestRatings(d);
  return SKILLS.filter((s) => (r.get(s.id)?.latest ?? 5) <= 2).map((s) => s.id);
}

export function stageRewards(d: Data) {
  const ids = d.english.stages.map((s) => s.milestone_id).filter(Boolean) as string[];
  const ms = d.milestones.filter((m) => ids.includes(m.id));
  const doneIds = new Set(d.rewards.filter((r) => r.milestone_id && ids.includes(r.milestone_id) && (r.status === 'approved' || r.status === 'paid')).map((r) => r.milestone_id));
  const earned = ms.filter((m) => doneIds.has(m.id)).reduce((a, m) => a + m.reward, 0);
  const total = ms.reduce((a, m) => a + m.reward, 0);
  return { earned, total, remaining: total - earned, completed: doneIds.size, count: ms.length };
}

export const stageReward = (d: Data, s: EnglishStage) => d.milestones.find((m) => m.id === s.milestone_id)?.reward ?? 0;
