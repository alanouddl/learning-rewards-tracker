import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import type {
  Category, Checkin, Course, Milestone, Notification, PlanChange, Profile, ProgressUpdate, Reward,
  RewardEvent, ScheduleDay, Settings, Summary, Task, TaskCompletion, TimerState,
} from './types';

export type Data = {
  me: Profile;
  profiles: Profile[];
  settings: Settings;
  categories: Category[];
  courses: Course[];
  milestones: Milestone[];
  schedule: ScheduleDay[];
  planChanges: PlanChange[];
  tasks: Task[];
  completions: TaskCompletion[];
  checkins: Checkin[];
  rewards: Reward[];
  events: RewardEvent[];
  notifications: Notification[];
  progressUpdates: ProgressUpdate[];
  summary: Summary;
  timer: TimerState | null;
  clockOffsetMs: number; // server time - local time
};

type Ctx = { data: Data | null; error: string | null; refresh: () => Promise<void> };
const StoreCtx = createContext<Ctx>({ data: null, error: null, refresh: async () => {} });

const num = <T,>(rows: T[], keys: (keyof T)[]) =>
  rows.map((r) => { const o = { ...r }; for (const k of keys) (o as Record<keyof T, unknown>)[k] = Number(r[k]); return o; });

async function q<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

async function loadAll(userId: string): Promise<Data> {
  const [profiles, settings, categories, courses, milestones, schedule, planChanges, tasks, completions,
    checkins, rewards, events, notifications, progressUpdates, summary, timer] = await Promise.all([
    q<Profile[]>(supabase.from('profiles').select('id, role, display_name, created_at')),
    q<Settings>(supabase.from('settings').select('*').eq('id', 1).single()),
    q<Category[]>(supabase.from('categories').select('*').order('sort')),
    q<Course[]>(supabase.from('courses').select('*').order('sort').order('created_at')),
    q<Milestone[]>(supabase.from('milestones').select('*').order('sort').order('created_at')),
    q<ScheduleDay[]>(supabase.from('schedule_days').select('*').order('dow')),
    q<PlanChange[]>(supabase.from('plan_changes').select('*').order('plan_date')),
    q<Task[]>(supabase.from('tasks').select('*').order('created_at')),
    q<TaskCompletion[]>(supabase.from('task_completions').select('*')),
    q<Checkin[]>(supabase.from('checkins').select('*').order('created_at', { ascending: false })),
    q<Reward[]>(supabase.from('rewards').select('*').order('created_at', { ascending: false })),
    q<RewardEvent[]>(supabase.from('reward_events').select('*').order('id', { ascending: false }).limit(500)),
    q<Notification[]>(supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(60)),
    q<ProgressUpdate[]>(supabase.from('progress_updates').select('*').order('created_at', { ascending: false }).limit(300)),
    q<Summary>(supabase.rpc('reward_summary')),
    q<TimerState>(supabase.rpc('get_timer')),
  ]);
  const me = profiles.find((p) => p.id === userId);
  if (!me) throw new Error('NO_PROFILE');
  const s = summary as unknown as Record<string, number>;
  Object.keys(s).forEach((k) => (s[k] = Number(s[k])));
  return {
    me, profiles,
    settings: { ...settings, total_budget: Number(settings.total_budget), daily_reward: Number(settings.daily_reward), weekly_bonus: Number(settings.weekly_bonus) },
    categories: num(categories, ['budget', 'daily_pool']),
    courses: num(courses, ['est_hours']),
    milestones: num(milestones, ['reward']),
    schedule, planChanges, tasks, completions, checkins,
    rewards: num(rewards, ['amount']),
    events: num(events, ['amount']),
    notifications, progressUpdates,
    summary: summary as Summary,
    timer,
    clockOffsetMs: timer ? new Date(timer.server_now).getTime() - Date.now() : 0,
  };
}

export function StoreProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      setData(await loadAll(userId));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busy.current = false;
    }
  }, [userId]);

  useEffect(() => {
    refresh();
    // near-real-time updates without paid services: poll + refresh when the app comes back into view
    const t = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 15000);
    const onVis = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis); };
  }, [refresh]);

  return <StoreCtx.Provider value={{ data, error, refresh }}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  return c;
}
/** For pages rendered only after data has loaded. */
export function useData(): Data & { refresh: () => Promise<void> } {
  const c = useContext(StoreCtx);
  return { ...(c.data as Data), refresh: c.refresh };
}
