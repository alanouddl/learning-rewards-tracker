-- =====================================================================
--  رحلتي — Learning Progress & Rewards Tracker
--  Supabase schema: tables, row-level security, and server-side rules.
--
--  Run this whole file once in Supabase → SQL Editor → New query → Run.
--  It is safe to re-run on an empty project. (It does not drop data.)
--
--  Design notes
--  * Exactly two roles: 'guardian' and 'student'. The first account created
--    becomes the guardian, the second becomes the student. Any further
--    account gets no profile and therefore sees nothing.
--  * The student never writes to money tables. Every reward is created and
--    changed only by SECURITY DEFINER functions that check the caller's role.
--  * Every reward status change is appended to reward_events, which cannot be
--    updated or deleted by anyone (trigger-enforced).
--  * Budget rule: pending + approved + paid rewards can never exceed the
--    total budget (3,000 SAR), and category allocations can never exceed it.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.riyadh_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Riyadh')::date $$;

-- Weeks start on Sunday.
create or replace function public.week_start(d date) returns date
language sql immutable as $$ select d - extract(dow from d)::int $$;

-- ---------------------------------------------------------------------
-- Profiles & roles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('guardian','student')),
  display_name text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists one_profile_per_role on public.profiles(role);

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;
create or replace function public.is_guardian() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'guardian' from public.profiles where id = auth.uid()), false)
$$;
create or replace function public.is_student() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'student' from public.profiles where id = auth.uid()), false)
$$;
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid())
$$;

-- First signup → guardian, second → student, others → no access.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where role = 'guardian') then
    insert into public.profiles(id, role, display_name) values (new.id, 'guardian', 'ولي الأمر');
  elsif not exists (select 1 from public.profiles where role = 'student') then
    insert into public.profiles(id, role, display_name) values (new.id, 'student', 'بطلة');
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Settings (single row)
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  total_budget numeric(10,2) not null default 3000 check (total_budget > 0),
  daily_reward numeric(10,2) not null default 5 check (daily_reward >= 0),
  weekly_bonus numeric(10,2) not null default 10 check (weekly_bonus >= 0),
  weekly_target_minutes int not null default 175 check (weekly_target_minutes between 0 and 5000),
  goal_label text not null default 'جهاز أحلامي 💻',
  guardian_message text not null default 'فخورة فيك! خطوة صغيرة كل يوم تصنع فرق كبير 💜',
  updated_at timestamptz not null default now()
);
insert into public.settings(id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------
-- Categories (reward allocation per learning area)
--   budget       = total SAR reserved for this area
--   daily_pool   = part of budget reserved for daily/weekly consistency
--   budget - daily_pool = part available for milestone rewards
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '📚',
  color text not null default 'lavender',
  budget numeric(10,2) not null default 0 check (budget >= 0),
  daily_pool numeric(10,2) not null default 0 check (daily_pool >= 0),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  check (daily_pool <= budget)
);

-- ---------------------------------------------------------------------
-- Courses (external links only — no content is hosted here)
-- ---------------------------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete restrict,
  title text not null,
  provider text not null default '',
  url text not null default '' check (url = '' or url ~* '^https?://'),
  thumbnail_url text not null default '' check (thumbnail_url = '' or thumbnail_url ~* '^https?://'),
  start_date date,
  target_date date,
  est_hours numeric(6,1) not null default 0 check (est_hours >= 0),
  weekly_minutes int not null default 0 check (weekly_minutes >= 0),
  progress int not null default 0 check (progress between 0 and 100),
  status text not null default 'not_started'
    check (status in ('not_started','in_progress','awaiting_approval','completed')),
  notes text not null default '',
  archived boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  reward numeric(10,2) not null default 0 check (reward >= 0),
  sort int not null default 0,
  status text not null default 'open' check (status in ('open','awaiting','approved')),
  student_note text not null default '',
  evidence_url text not null default '',
  claimed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.progress_updates (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  old_progress int not null,
  new_progress int not null,
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Weekly schedule, per-date changes, tasks
-- ---------------------------------------------------------------------
create table if not exists public.schedule_days (
  dow int primary key check (dow between 0 and 6),   -- 0 = Sunday
  label text not null default '',
  course_id uuid references public.courses(id) on delete set null,
  minutes int not null default 0 check (minutes between 0 and 600),
  task_text text not null default ''
);

-- kind 'replace' : replaces the base plan for that date (e.g. make it a rest day)
-- kind 'makeup'  : an extra make-up session (from_date = the missed day it replaces)
create table if not exists public.plan_changes (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null,
  kind text not null check (kind in ('replace','makeup')),
  from_date date,
  label text not null default '',
  course_id uuid references public.courses(id) on delete set null,
  minutes int not null default 0 check (minutes between 0 and 600),
  task_text text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists one_replace_per_date on public.plan_changes(plan_date) where kind = 'replace';
create unique index if not exists one_makeup_per_missed_day on public.plan_changes(from_date) where kind = 'makeup';

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  details text not null default '',
  kind text not null default 'once' check (kind in ('daily','weekly','once')),
  course_id uuid references public.courses(id) on delete set null,
  due_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- period_key = the date (daily / once) or the week's Sunday (weekly)
create table if not exists public.task_completions (
  task_id uuid not null references public.tasks(id) on delete cascade,
  period_key date not null,
  completed_at timestamptz not null default now(),
  primary key (task_id, period_key)
);

-- ---------------------------------------------------------------------
-- Study timer (persists across devices) & daily check-ins
-- ---------------------------------------------------------------------
create table if not exists public.timer_state (
  id int primary key default 1 check (id = 1),
  course_id uuid references public.courses(id) on delete set null,
  running boolean not null default false,
  started_at timestamptz,
  accumulated_seconds int not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.timer_state(id) values (1) on conflict do nothing;

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  study_date date not null,
  course_id uuid references public.courses(id) on delete set null,
  minutes int not null check (minutes between 1 and 600),
  source text not null default 'manual' check (source in ('timer','manual')),
  finished text not null default '',
  learned text not null default '',
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  help_needed text not null default '',
  evidence_links text[] not null default '{}',
  evidence_files text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  feedback text not null default '',
  reviewed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists checkins_date on public.checkins(study_date);

-- ---------------------------------------------------------------------
-- Rewards & the immutable ledger
-- ---------------------------------------------------------------------
create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('daily','weekly','milestone','bonus')),
  amount numeric(10,2) not null check (amount > 0),
  ref_date date,                         -- daily: study date, weekly: week Sunday
  milestone_id uuid references public.milestones(id) on delete restrict,
  category_id uuid references public.categories(id) on delete restrict,
  title text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  note text not null default '',
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz
);
-- no double counting: one live reward per day, per week, per milestone
create unique index if not exists one_daily_reward on public.rewards(ref_date) where kind = 'daily' and status <> 'rejected';
create unique index if not exists one_weekly_reward on public.rewards(ref_date) where kind = 'weekly' and status <> 'rejected';
create unique index if not exists one_milestone_reward on public.rewards(milestone_id) where kind = 'milestone' and status <> 'rejected';

create table if not exists public.reward_events (
  id bigint generated always as identity primary key,
  reward_id uuid not null references public.rewards(id) on delete restrict,
  from_status text,
  to_status text not null,
  amount numeric(10,2) not null,
  note text not null default '',
  actor uuid,
  created_at timestamptz not null default now()
);

create or replace function public.forbid_change() returns trigger language plpgsql as $$
begin raise exception 'This ledger is append-only'; end $$;
drop trigger if exists reward_events_immutable on public.reward_events;
create trigger reward_events_immutable before update or delete on public.reward_events
  for each row execute function public.forbid_change();

-- amounts / identity of a reward never change; only status moves forward
create or replace function public.guard_reward_update() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'Rewards cannot be deleted'; end if;
  if new.amount <> old.amount or new.kind <> old.kind
     or new.ref_date is distinct from old.ref_date
     or new.milestone_id is distinct from old.milestone_id then
    raise exception 'Reward amount and identity are immutable';
  end if;
  if old.status = new.status then return new; end if;
  if not ((old.status = 'pending'  and new.status in ('approved','rejected'))
       or (old.status = 'approved' and new.status in ('paid','rejected'))) then
    raise exception 'Invalid reward transition % -> %', old.status, new.status;
  end if;
  return new;
end $$;
drop trigger if exists rewards_guard on public.rewards;
create trigger rewards_guard before update or delete on public.rewards
  for each row execute function public.guard_reward_update();

-- ---------------------------------------------------------------------
-- Notifications (in-app)
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient text not null check (recipient in ('guardian','student')),
  title text not null,
  body text not null default '',
  link text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient on public.notifications(recipient, created_at desc);

create or replace function public.notify(p_recipient text, p_title text, p_body text default '', p_link text default '')
returns void language sql security definer set search_path = public as $$
  insert into public.notifications(recipient, title, body, link) values (p_recipient, p_title, p_body, p_link)
$$;

-- ---------------------------------------------------------------------
-- Budget accounting
-- ---------------------------------------------------------------------
create or replace function public.committed_total() returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0) from public.rewards where status in ('pending','approved','paid')
$$;
create or replace function public.consistency_pool() returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(daily_pool), 0) from public.categories
$$;
create or replace function public.consistency_used() returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0) from public.rewards
  where kind in ('daily','weekly','bonus') and status in ('pending','approved','paid')
$$;

-- Allocation invariants, checked whenever categories / milestones / budget change.
create or replace function public.check_allocations() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_total numeric; v_alloc numeric; r record;
begin
  select total_budget into v_total from public.settings where id = 1;
  select coalesce(sum(budget), 0) into v_alloc from public.categories;
  if v_alloc > v_total then
    raise exception 'BUDGET: category allocations (% SAR) exceed the total budget (% SAR)', v_alloc, v_total;
  end if;
  if public.committed_total() > v_total then
    raise exception 'BUDGET: rewards already committed exceed the total budget';
  end if;
  if public.consistency_used() > public.consistency_pool() then
    raise exception 'BUDGET: daily pool (% SAR) is smaller than daily rewards already given (% SAR)',
      public.consistency_pool(), public.consistency_used();
  end if;
  for r in
    select c.name, c.budget - c.daily_pool as room, coalesce(sum(m.reward), 0) as used
    from public.categories c
    left join public.courses co on co.category_id = c.id
    left join public.milestones m on m.course_id = co.id
    group by c.id
  loop
    if r.used > r.room then
      raise exception 'BUDGET: milestones in "%" total % SAR but only % SAR is reserved for milestones', r.name, r.used, r.room;
    end if;
  end loop;
  return null;
end $$;

drop trigger if exists categories_alloc on public.categories;
create constraint trigger categories_alloc after insert or update on public.categories
  deferrable initially deferred for each row execute function public.check_allocations();
drop trigger if exists milestones_alloc on public.milestones;
create constraint trigger milestones_alloc after insert or update on public.milestones
  deferrable initially deferred for each row execute function public.check_allocations();
drop trigger if exists courses_alloc on public.courses;
create constraint trigger courses_alloc after update of category_id on public.courses
  deferrable initially deferred for each row execute function public.check_allocations();
drop trigger if exists settings_alloc on public.settings;
create constraint trigger settings_alloc after update on public.settings
  deferrable initially deferred for each row execute function public.check_allocations();

-- A milestone whose reward is live cannot have its amount edited or be deleted.
create or replace function public.guard_milestone() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.rewards where milestone_id = old.id and status <> 'rejected') then
    if tg_op = 'DELETE' then
      raise exception 'This milestone already has a reward in the ledger; it cannot be deleted';
    elsif new.reward <> old.reward then
      raise exception 'This milestone already has a reward in the ledger; its amount cannot change';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists milestones_guard on public.milestones;
create trigger milestones_guard before update or delete on public.milestones
  for each row execute function public.guard_milestone();

-- Create a reward, capped so that nothing can exceed the budget.
create or replace function public._create_reward(
  p_kind text, p_amount numeric, p_title text, p_ref_date date default null,
  p_milestone uuid default null, p_category uuid default null, p_note text default '',
  p_status text default 'pending')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_total numeric; v_room numeric; v_amount numeric := p_amount; v_id uuid;
begin
  perform pg_advisory_xact_lock(3000);
  select total_budget into v_total from public.settings where id = 1;
  v_room := v_total - public.committed_total();
  if p_kind in ('daily','weekly','bonus') then
    v_room := least(v_room, public.consistency_pool() - public.consistency_used());
  end if;
  v_amount := least(v_amount, greatest(v_room, 0));
  if v_amount <= 0 then
    return null;
  end if;
  insert into public.rewards(kind, amount, title, ref_date, milestone_id, category_id, note, status,
                             approved_at)
  values (p_kind, v_amount, p_title, p_ref_date, p_milestone, p_category, p_note, p_status,
          case when p_status = 'approved' then now() end)
  returning id into v_id;
  insert into public.reward_events(reward_id, from_status, to_status, amount, note, actor)
  values (v_id, null, p_status, v_amount, p_note, auth.uid());
  return v_id;
end $$;

-- Planned minutes for a date (base schedule, replaced and/or plus make-ups).
create or replace function public.planned_minutes(d date) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select minutes from public.plan_changes where plan_date = d and kind = 'replace'),
                  (select minutes from public.schedule_days where dow = extract(dow from d)::int), 0)
       + coalesce((select sum(minutes) from public.plan_changes where plan_date = d and kind = 'makeup'), 0)::int
$$;

create or replace function public._celebrate_thresholds(p_before numeric, p_after numeric)
returns void language plpgsql security definer set search_path = public as $$
declare t numeric;
begin
  foreach t in array array[100, 500, 1000, 2000, 3000]::numeric[] loop
    if p_before < t and p_after >= t then
      perform public.notify('student', 'إنجاز جديد! وصلتِ ' || t::int || ' ريال 🎉', 'استمري يا بطلة، أنتِ أقرب لهدفك كل يوم ✨', '/rewards');
      perform public.notify('guardian', 'وصلت ' || t::int || ' ريال من الهدف 🎉', '', '/g/rewards');
    end if;
  end loop;
end $$;

create or replace function public.earned_total() returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0) from public.rewards where status in ('approved','paid')
$$;

-- =====================================================================
--  RPCs — STUDENT
-- =====================================================================

-- Timer: start / pause / resume / reset. Uses server time.
create or replace function public.timer_action(p_action text, p_course uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t public.timer_state;
begin
  if not public.is_student() then raise exception 'Only the student uses the timer'; end if;
  select * into t from public.timer_state where id = 1 for update;
  if p_action = 'start' then
    update public.timer_state set running = true, started_at = now(), accumulated_seconds = 0,
      course_id = coalesce(p_course, course_id), updated_at = now() where id = 1;
  elsif p_action = 'pause' and t.running then
    update public.timer_state set running = false,
      accumulated_seconds = accumulated_seconds + extract(epoch from now() - started_at)::int,
      started_at = null, updated_at = now() where id = 1;
  elsif p_action = 'resume' and not t.running then
    update public.timer_state set running = true, started_at = now(), updated_at = now() where id = 1;
  elsif p_action = 'reset' then
    update public.timer_state set running = false, started_at = null, accumulated_seconds = 0, updated_at = now() where id = 1;
  end if;
  select * into t from public.timer_state where id = 1;
  return jsonb_build_object('running', t.running, 'started_at', t.started_at,
    'accumulated_seconds', t.accumulated_seconds, 'course_id', t.course_id, 'server_now', now());
end $$;

create or replace function public.get_timer() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.is_member() then
    jsonb_build_object('running', running, 'started_at', started_at, 'accumulated_seconds', accumulated_seconds,
      'course_id', course_id, 'server_now', now()) end
  from public.timer_state where id = 1
$$;

-- Daily check-in. Creates a pending daily reward when the day's target is met.
create or replace function public.submit_checkin(
  p_study_date date, p_course uuid, p_minutes int, p_source text,
  p_finished text, p_learned text, p_difficulty text, p_help text,
  p_links text[] default '{}', p_files text[] default '{}')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_target int; v_total int; v_reward uuid; v_daily numeric; v_name text;
begin
  if not public.is_student() then raise exception 'Only the student submits check-ins'; end if;
  if p_study_date > public.riyadh_today() or p_study_date < public.riyadh_today() - 7 then
    raise exception 'You can log study time for today or the last 7 days';
  end if;
  if coalesce(trim(p_finished), '') = '' then raise exception 'Please write what you finished'; end if;

  insert into public.checkins(study_date, course_id, minutes, source, finished, learned, difficulty,
                              help_needed, evidence_links, evidence_files, created_by)
  values (p_study_date, p_course, p_minutes, coalesce(p_source, 'manual'), left(p_finished, 2000),
          left(coalesce(p_learned, ''), 2000), coalesce(p_difficulty, 'medium'), left(coalesce(p_help, ''), 2000),
          coalesce(p_links, '{}'), coalesce(p_files, '{}'), auth.uid())
  returning id into v_id;

  -- reset the timer once the session is logged
  update public.timer_state set running = false, started_at = null, accumulated_seconds = 0, updated_at = now() where id = 1;

  select title into v_name from public.courses where id = p_course;
  perform public.notify('guardian', 'إنجاز جديد بانتظار مراجعتك 📝',
    p_minutes || ' دقيقة' || coalesce(' — ' || v_name, '') , '/g/review');
  if coalesce(trim(p_help), '') <> '' then
    perform public.notify('guardian', 'تحتاج مساعدة 🙋‍♀️', left(p_help, 200), '/g/review');
  end if;

  v_target := public.planned_minutes(p_study_date);
  select coalesce(sum(minutes), 0) into v_total from public.checkins
    where study_date = p_study_date and status <> 'rejected';
  select daily_reward into v_daily from public.settings where id = 1;

  if v_target > 0 and v_total >= v_target and v_daily > 0
     and not exists (select 1 from public.rewards where kind = 'daily' and ref_date = p_study_date and status <> 'rejected') then
    v_reward := public._create_reward('daily', v_daily, 'هدف يوم ' || to_char(p_study_date, 'YYYY-MM-DD'), p_study_date);
    if v_reward is not null then
      perform public.notify('guardian', 'مكافأة يومية بانتظار الموافقة 💰', v_daily || ' ريال', '/g/rewards');
    end if;
  end if;

  return jsonb_build_object('id', v_id, 'target', v_target, 'total', v_total, 'daily_reward_id', v_reward);
end $$;

create or replace function public.update_course_progress(p_course uuid, p_progress int, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare c public.courses;
begin
  if not public.is_member() then raise exception 'Not allowed'; end if;
  select * into c from public.courses where id = p_course for update;
  if c.id is null then raise exception 'Course not found'; end if;
  if p_progress < 0 or p_progress > 100 then raise exception 'Progress must be 0–100'; end if;
  if public.is_student() and c.status = 'completed' then raise exception 'Course already completed'; end if;
  update public.courses set progress = p_progress, updated_at = now(),
    status = case when status = 'not_started' and p_progress > 0 then 'in_progress' else status end
  where id = p_course;
  insert into public.progress_updates(course_id, old_progress, new_progress, note, created_by)
  values (p_course, c.progress, p_progress, left(coalesce(p_note, ''), 500), auth.uid());
end $$;

create or replace function public.request_course_completion(p_course uuid, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare v_title text;
begin
  if not public.is_student() then raise exception 'Only the student requests completion'; end if;
  update public.courses set status = 'awaiting_approval', progress = 100, updated_at = now()
    where id = p_course and status <> 'completed' returning title into v_title;
  if v_title is null then raise exception 'Course not found or already completed'; end if;
  perform public.notify('guardian', 'كورس مكتمل بانتظار التأكيد 🎓', v_title || coalesce(' — ' || nullif(p_note, ''), ''), '/g/courses');
end $$;

create or replace function public.claim_milestone(p_milestone uuid, p_note text default '', p_evidence text default '')
returns void language plpgsql security definer set search_path = public as $$
declare m public.milestones; v_cat uuid; v_course text; v_reward uuid;
begin
  if not public.is_student() then raise exception 'Only the student claims milestones'; end if;
  select * into m from public.milestones where id = p_milestone for update;
  if m.id is null or m.status <> 'open' then raise exception 'Milestone is not open'; end if;
  select category_id, title into v_cat, v_course from public.courses where id = m.course_id;
  update public.milestones set status = 'awaiting', student_note = left(coalesce(p_note, ''), 1000),
    evidence_url = left(coalesce(p_evidence, ''), 1000), claimed_at = now() where id = m.id;
  if m.reward > 0 then
    v_reward := public._create_reward('milestone', m.reward, v_course || ' — ' || m.title, null, m.id, v_cat);
  end if;
  perform public.notify('guardian', 'مرحلة بانتظار الموافقة 🏁', v_course || ' — ' || m.title, '/g/rewards');
end $$;

create or replace function public.toggle_task(p_task uuid, p_period date, p_done boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member() then raise exception 'Not allowed'; end if;
  if p_done then
    insert into public.task_completions(task_id, period_key) values (p_task, p_period) on conflict do nothing;
  else
    delete from public.task_completions where task_id = p_task and period_key = p_period;
  end if;
end $$;

-- Move a one-off task to a new date (either role).
create or replace function public.reschedule_task(p_task uuid, p_new_date date)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member() then raise exception 'Not allowed'; end if;
  if p_new_date < public.riyadh_today() then raise exception 'Pick today or a future date'; end if;
  update public.tasks set due_date = p_new_date where id = p_task and kind = 'once';
end $$;

-- Reschedule a missed study day to a future date as a make-up session.
create or replace function public.reschedule_day(p_from date, p_to date)
returns void language plpgsql security definer set search_path = public as $$
declare v_min int; v_course uuid; v_label text; v_task text;
begin
  if not public.is_member() then raise exception 'Not allowed'; end if;
  if p_to < public.riyadh_today() then raise exception 'Pick today or a future date'; end if;
  if p_from >= public.riyadh_today() then raise exception 'Only past days can be rescheduled'; end if;
  select coalesce(r.minutes, s.minutes), coalesce(r.course_id, s.course_id), coalesce(r.label, s.label), coalesce(r.task_text, s.task_text)
    into v_min, v_course, v_label, v_task
  from public.schedule_days s
  left join public.plan_changes r on r.plan_date = p_from and r.kind = 'replace'
  where s.dow = extract(dow from p_from)::int;
  if coalesce(v_min, 0) = 0 then raise exception 'Nothing was planned that day'; end if;
  insert into public.plan_changes(plan_date, kind, from_date, label, course_id, minutes, task_text, created_by)
  values (p_to, 'makeup', p_from, 'تعويض: ' || v_label, v_course, v_min, v_task, auth.uid());
  if public.is_student() then
    perform public.notify('guardian', 'تم تعويض يوم 📅', to_char(p_from, 'YYYY-MM-DD') || ' ← ' || to_char(p_to, 'YYYY-MM-DD'), '/g/schedule');
  end if;
end $$;

create or replace function public.mark_notifications_read() returns void
language sql security definer set search_path = public as $$
  update public.notifications set read_at = now() where recipient = public.my_role() and read_at is null
$$;

-- =====================================================================
--  RPCs — GUARDIAN
-- =====================================================================

create or replace function public.review_checkin(p_id uuid, p_approve boolean, p_feedback text default '', p_approve_reward boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c public.checkins; v_target int; v_live int; v_approved int; v_week date; v_week_min int;
  v_settings public.settings; v_reward public.rewards; v_weekly uuid; v_before numeric;
begin
  if not public.is_guardian() then raise exception 'Only the guardian reviews'; end if;
  select * into c from public.checkins where id = p_id for update;
  if c.id is null then raise exception 'Check-in not found'; end if;
  select * into v_settings from public.settings where id = 1;

  update public.checkins set status = case when p_approve then 'approved' else 'rejected' end,
    feedback = left(coalesce(p_feedback, ''), 2000), reviewed_at = now() where id = p_id;

  if coalesce(trim(p_feedback), '') <> '' then
    perform public.notify('student', 'رسالة جديدة على إنجازك 💌', left(p_feedback, 200), '/history');
  elsif p_approve then
    perform public.notify('student', 'تمت الموافقة على إنجازك ✅', to_char(c.study_date, 'YYYY-MM-DD'), '/history');
  end if;

  v_target := public.planned_minutes(c.study_date);
  select coalesce(sum(minutes) filter (where status <> 'rejected'), 0),
         coalesce(sum(minutes) filter (where status = 'approved'), 0)
    into v_live, v_approved from public.checkins where study_date = c.study_date;
  select * into v_reward from public.rewards where kind = 'daily' and ref_date = c.study_date and status <> 'rejected';

  if not p_approve and v_reward.id is not null and v_reward.status = 'pending' and v_live < v_target then
    update public.rewards set status = 'rejected', note = 'الدقائق المعتمدة أقل من هدف اليوم' where id = v_reward.id;
    insert into public.reward_events(reward_id, from_status, to_status, amount, note, actor)
      values (v_reward.id, 'pending', 'rejected', v_reward.amount, 'check-in rejected', auth.uid());
  end if;

  if p_approve and p_approve_reward and v_reward.id is not null and v_reward.status = 'pending' and v_approved >= v_target then
    v_before := public.earned_total();
    update public.rewards set status = 'approved', approved_at = now() where id = v_reward.id;
    insert into public.reward_events(reward_id, from_status, to_status, amount, note, actor)
      values (v_reward.id, 'pending', 'approved', v_reward.amount, 'daily goal verified', auth.uid());
    perform public.notify('student', 'تمت الموافقة على مكافأة اليوم 💰', '+' || v_reward.amount || ' ريال', '/rewards');
    perform public._celebrate_thresholds(v_before, public.earned_total());
  end if;

  -- weekly consistency bonus (verified minutes only)
  if p_approve and v_settings.weekly_bonus > 0 and v_settings.weekly_target_minutes > 0 then
    v_week := public.week_start(c.study_date);
    select coalesce(sum(minutes), 0) into v_week_min from public.checkins
      where status = 'approved' and study_date between v_week and v_week + 6;
    if v_week_min >= v_settings.weekly_target_minutes
       and not exists (select 1 from public.rewards where kind = 'weekly' and ref_date = v_week and status <> 'rejected') then
      v_weekly := public._create_reward('weekly', v_settings.weekly_bonus, 'هدف أسبوع ' || to_char(v_week, 'YYYY-MM-DD'), v_week);
      if v_weekly is not null then
        perform public.notify('guardian', 'مكافأة الأسبوع جاهزة للموافقة 🌟', v_settings.weekly_bonus || ' ريال', '/g/rewards');
        perform public.notify('student', 'حققتِ هدف الأسبوع! 🌟', 'مكافأة الأسبوع بانتظار الموافقة', '/rewards');
      end if;
    end if;
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.set_reward_status(p_id uuid, p_status text, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare r public.rewards; v_before numeric;
begin
  if not public.is_guardian() then raise exception 'Only the guardian changes rewards'; end if;
  perform pg_advisory_xact_lock(3000);
  select * into r from public.rewards where id = p_id for update;
  if r.id is null then raise exception 'Reward not found'; end if;
  v_before := public.earned_total();
  update public.rewards set status = p_status,
    note = case when coalesce(p_note, '') <> '' then left(p_note, 1000) else note end,
    approved_at = case when p_status = 'approved' then now() else approved_at end,
    paid_at = case when p_status = 'paid' then now() else paid_at end
  where id = p_id;
  insert into public.reward_events(reward_id, from_status, to_status, amount, note, actor)
    values (p_id, r.status, p_status, r.amount, coalesce(p_note, ''), auth.uid());

  if r.kind = 'milestone' then
    if p_status = 'approved' then
      update public.milestones set status = 'approved', approved_at = now() where id = r.milestone_id;
      perform public.notify('student', 'مبروك! تم اعتماد المرحلة 🏆', r.title || ' (+' || r.amount || ' ريال)', '/courses');
    elsif p_status = 'rejected' then
      update public.milestones set status = 'open', claimed_at = null where id = r.milestone_id;
      perform public.notify('student', 'المرحلة تحتاج شوية شغل 💪', coalesce(nullif(p_note, ''), r.title), '/courses');
    end if;
  elsif p_status = 'approved' then
    perform public.notify('student', 'تمت الموافقة على مكافأة 💰', r.title || ' (+' || r.amount || ' ريال)', '/rewards');
  elsif p_status = 'paid' then
    perform public.notify('student', 'تم تسليم مكافأتك 🎁', r.title || ' — ' || r.amount || ' ريال', '/rewards');
  end if;
  if p_status = 'approved' then
    perform public._celebrate_thresholds(v_before, public.earned_total());
  end if;
end $$;

-- Optional extra reward from the consistency pool.
create or replace function public.grant_bonus(p_amount numeric, p_title text, p_note text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_before numeric;
begin
  if not public.is_guardian() then raise exception 'Only the guardian grants rewards'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  v_before := public.earned_total();
  v_id := public._create_reward('bonus', p_amount, coalesce(nullif(p_title, ''), 'مكافأة خاصة'), public.riyadh_today(), null, null, coalesce(p_note, ''), 'approved');
  if v_id is null then raise exception 'BUDGET: no room left in the daily/consistency pool'; end if;
  perform public.notify('student', 'مكافأة خاصة لك 🎁', coalesce(nullif(p_title, ''), 'مكافأة خاصة'), '/rewards');
  perform public._celebrate_thresholds(v_before, public.earned_total());
  return v_id;
end $$;

create or replace function public.approve_course_completion(p_course uuid, p_approve boolean, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare v_title text;
begin
  if not public.is_guardian() then raise exception 'Only the guardian approves'; end if;
  update public.courses set status = case when p_approve then 'completed' else 'in_progress' end, updated_at = now()
    where id = p_course returning title into v_title;
  if p_approve then
    perform public.notify('student', 'مبروك! أكملتِ كورس 🎓', v_title, '/courses');
  else
    perform public.notify('student', 'الكورس يحتاج إكمال بسيط 💪', v_title || coalesce(' — ' || nullif(p_note, ''), ''), '/courses');
  end if;
end $$;

-- Notify the student when a new course is assigned.
create or replace function public.on_course_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_guardian() then
    perform public.notify('student', 'كورس جديد لك 📚', new.title, '/courses');
  end if;
  return new;
end $$;
drop trigger if exists courses_notify on public.courses;
create trigger courses_notify after insert on public.courses for each row execute function public.on_course_insert();

-- Reward summary used by both dashboards.
create or replace function public.reward_summary() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.is_member() then jsonb_build_object(
    'total_budget', s.total_budget,
    'approved', coalesce(sum(r.amount) filter (where r.status = 'approved'), 0),
    'paid', coalesce(sum(r.amount) filter (where r.status = 'paid'), 0),
    'pending', coalesce(sum(r.amount) filter (where r.status = 'pending'), 0),
    'earned', coalesce(sum(r.amount) filter (where r.status in ('approved','paid')), 0),
    'available', s.total_budget - coalesce(sum(r.amount) filter (where r.status in ('pending','approved','paid')), 0),
    'allocated', (select coalesce(sum(budget), 0) from public.categories),
    'consistency_pool', public.consistency_pool(),
    'consistency_used', public.consistency_used()
  ) end
  from public.settings s left join public.rewards r on true
  where s.id = 1 group by s.id
$$;

-- =====================================================================
--  Row-level security
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.settings         enable row level security;
alter table public.categories       enable row level security;
alter table public.courses          enable row level security;
alter table public.milestones       enable row level security;
alter table public.progress_updates enable row level security;
alter table public.schedule_days    enable row level security;
alter table public.plan_changes     enable row level security;
alter table public.tasks            enable row level security;
alter table public.task_completions enable row level security;
alter table public.timer_state      enable row level security;
alter table public.checkins         enable row level security;
alter table public.rewards          enable row level security;
alter table public.reward_events    enable row level security;
alter table public.notifications    enable row level security;

-- Nothing for anonymous visitors.
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon, public;
revoke insert, update, delete, truncate on all tables in schema public from authenticated;
grant select on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
-- internal helpers are not callable directly
revoke execute on function public._create_reward(text, numeric, text, date, uuid, uuid, text, text) from authenticated;
revoke execute on function public.notify(text, text, text, text) from authenticated;
revoke execute on function public._celebrate_thresholds(numeric, numeric) from authenticated;

-- Guardian edits plan tables directly; everything else goes through RPCs.
grant insert, update, delete on public.categories, public.courses, public.milestones,
  public.schedule_days, public.plan_changes, public.tasks to authenticated;
grant update on public.settings, public.profiles to authenticated;

do $$
declare t text;
begin
  -- read access for both family members
  foreach t in array array['profiles','settings','categories','courses','milestones','progress_updates',
    'schedule_days','plan_changes','tasks','task_completions','timer_state','checkins','rewards','reward_events'] loop
    execute format('drop policy if exists member_read on public.%I', t);
    execute format('create policy member_read on public.%I for select to authenticated using (public.is_member())', t);
  end loop;
  -- write access for the guardian only
  foreach t in array array['categories','courses','milestones','schedule_days','plan_changes','tasks'] loop
    execute format('drop policy if exists guardian_write on public.%I', t);
    execute format('create policy guardian_write on public.%I for all to authenticated using (public.is_guardian()) with check (public.is_guardian())', t);
  end loop;
end $$;

drop policy if exists guardian_update on public.settings;
create policy guardian_update on public.settings for update to authenticated
  using (public.is_guardian()) with check (public.is_guardian());

drop policy if exists guardian_update on public.profiles;
create policy guardian_update on public.profiles for update to authenticated
  using (public.is_guardian()) with check (public.is_guardian());
-- role column can never be changed through the API
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

drop policy if exists own_notifications on public.notifications;
create policy own_notifications on public.notifications for select to authenticated
  using (recipient = public.my_role());

-- =====================================================================
--  Evidence screenshots (private Storage bucket)
-- =====================================================================
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('evidence', 'evidence', false, 5242880, array['image/png','image/jpeg','image/webp','image/gif','image/heic'])
    on conflict (id) do nothing;
    execute 'drop policy if exists "evidence read" on storage.objects';
    execute 'create policy "evidence read" on storage.objects for select to authenticated using (bucket_id = ''evidence'' and public.is_member())';
    execute 'drop policy if exists "evidence upload" on storage.objects';
    execute 'create policy "evidence upload" on storage.objects for insert to authenticated with check (bucket_id = ''evidence'' and public.is_student())';
  end if;
end $$;
