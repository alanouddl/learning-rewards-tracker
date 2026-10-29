import { addDays, dow, todayStr, weekDays, weekStart } from './dates';
import type { Checkin, Course, PlanChange, ScheduleDay } from './types';
import type { Data } from './store';

export type DayPlan = {
  date: string;
  label: string;
  course_id: string | null;
  minutes: number;
  task_text: string;
  makeups: PlanChange[];
  replaced: boolean;
};

export function planFor(date: string, schedule: ScheduleDay[], changes: PlanChange[]): DayPlan {
  const base = schedule.find((s) => s.dow === dow(date));
  const rep = changes.find((c) => c.kind === 'replace' && c.plan_date === date);
  const makeups = changes.filter((c) => c.kind === 'makeup' && c.plan_date === date);
  const main = rep ?? base;
  const mainMinutes = main?.minutes ?? 0;
  return {
    date,
    label: main?.label || (mainMinutes ? '' : 'راحة'),
    course_id: main?.course_id ?? makeups[0]?.course_id ?? null,
    minutes: mainMinutes + makeups.reduce((a, m) => a + m.minutes, 0),
    task_text: main?.task_text || makeups[0]?.task_text || '',
    makeups,
    replaced: !!rep,
  };
}

export type DayState = 'before' | 'rest' | 'done' | 'awaiting' | 'partial' | 'missed' | 'rescheduled' | 'today' | 'upcoming';

export function minutesOn(date: string, checkins: Checkin[], which: 'live' | 'approved' = 'live') {
  return checkins
    .filter((c) => c.study_date === date && (which === 'live' ? c.status !== 'rejected' : c.status === 'approved'))
    .reduce((a, c) => a + c.minutes, 0);
}

/** First day that counts: when the student account was created (earlier check-ins still count). */
export function trackingStart(d: Pick<Data, 'profiles' | 'checkins'>): string {
  const st = d.profiles.find((p) => p.role === 'student');
  const created = st ? todayStr(new Date(st.created_at)) : todayStr();
  return d.checkins.reduce((m, c) => (c.study_date < m ? c.study_date : m), created);
}

export function dayState(date: string, d: Pick<Data, 'schedule' | 'planChanges' | 'checkins' | 'profiles'>, today = todayStr()): DayState {
  const p = planFor(date, d.schedule, d.planChanges);
  const live = minutesOn(date, d.checkins);
  const approved = minutesOn(date, d.checkins, 'approved');
  if (p.minutes === 0) return live > 0 ? (approved >= live ? 'done' : 'awaiting') : 'rest';
  if (live >= p.minutes) return approved >= p.minutes ? 'done' : 'awaiting';
  if (date > today) return 'upcoming';
  if (date === today) return live > 0 ? 'partial' : 'today';
  if (live === 0 && date < trackingStart(d)) return 'before';
  if (d.planChanges.some((c) => c.kind === 'makeup' && c.from_date === date)) return 'rescheduled';
  return live > 0 ? 'partial' : 'missed';
}

export function weekStats(d: Data, anyDay = todayStr()) {
  const today = todayStr();
  const days = weekDays(weekStart(anyDay));
  const planned = days.reduce((a, x) => a + planFor(x, d.schedule, d.planChanges).minutes, 0);
  const done = days.reduce((a, x) => a + minutesOn(x, d.checkins), 0);
  const approved = days.reduce((a, x) => a + minutesOn(x, d.checkins, 'approved'), 0);
  const states = days.map((x) => dayState(x, d, today));
  return {
    days, states, planned, done, approved,
    target: d.settings.weekly_target_minutes,
    studyDays: days.filter((x) => minutesOn(x, d.checkins) > 0).length,
    completedDays: states.filter((s) => s === 'done' || s === 'awaiting').length,
    missed: days.filter((_, i) => states[i] === 'missed' || (states[i] === 'partial' && days[i] < today)),
    upcoming: days.filter((x, i) => x > today && states[i] === 'upcoming'),
  };
}

/** Consecutive planned study days met, skipping rest days. Today only counts once met. */
export function streak(d: Data): { current: number; best: number } {
  const today = todayStr();
  const first = trackingStart(d);
  let cur = 0, best = 0, run = 0;
  for (let x = first; x <= today; x = addDays(x, 1)) {
    const p = planFor(x, d.schedule, d.planChanges);
    const live = minutesOn(x, d.checkins);
    if (p.minutes === 0) { continue; }
    if (live >= p.minutes) { run++; best = Math.max(best, run); }
    else if (x < today) run = 0;
  }
  cur = run;
  return { current: cur, best };
}

export function courseName(courses: Course[], id: string | null | undefined) {
  return courses.find((c) => c.id === id)?.title ?? '';
}
