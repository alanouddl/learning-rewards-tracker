-- =====================================================================
--  رحلتي مع الإنجليزية — structured English journey (ZAmericanEnglish)
--  Run AFTER schema.sql and seed.sql. Additive only: no data is deleted.
--
--  * Four sequential stages, each tied to one existing 300 SAR English
--    milestone (English stays 1,200 SAR = 4 × 300; nothing else changes).
--  * Courses are ordinary rows in `courses` (so the timer, check-ins,
--    weekly schedule and "Open course" button keep working unchanged).
--  * Lessons, weekly plans, objectives and assessment items are editable
--    by the guardian. Assessments are reviewed only by the guardian.
-- =====================================================================

alter table public.courses add column if not exists link_verified boolean not null default true;
alter table public.courses add column if not exists kind text not null default 'course';
-- kind: 'course' (normal) | 'journey' (the umbrella that holds the stage milestones)

alter table public.checkins add column if not exists english_lesson_id uuid;
alter table public.checkins add column if not exists new_words text not null default '';
alter table public.checkins add column if not exists english_sentence text not null default '';
alter table public.checkins add column if not exists not_understood text not null default '';

create table if not exists public.english_stages (
  id int primary key check (id between 1 and 9),
  name_ar text not null,
  name_en text not null,
  icon text not null default 'sprout',
  weeks text not null default '',
  status text not null default 'locked'
    check (status in ('locked','available','in_progress','awaiting_review','completed')),
  paused boolean not null default false,
  target_date date,
  started_at timestamptz,
  completed_at timestamptz,
  milestone_id uuid references public.milestones(id) on delete set null,
  pass_threshold int not null default 80 check (pass_threshold between 0 and 100),
  notes text not null default ''
);

create table if not exists public.english_stage_courses (
  stage_id int not null references public.english_stages(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  role text not null default 'main' check (role in ('main','support','review')),
  sort int not null default 0,
  primary key (stage_id, course_id)
);

create table if not exists public.english_objectives (
  id uuid primary key default gen_random_uuid(),
  stage_id int not null references public.english_stages(id) on delete cascade,
  text text not null,
  sort int not null default 0,
  done boolean not null default false
);

create table if not exists public.english_lessons (
  id uuid primary key default gen_random_uuid(),
  stage_id int not null references public.english_stages(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  url text not null default '' check (url = '' or url ~* '^https?://'),
  verified boolean not null default false,
  sort int not null default 0,
  done_at timestamptz,
  done_checkin uuid references public.checkins(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.english_week_plan (
  stage_id int not null references public.english_stages(id) on delete cascade,
  dow int not null check (dow between 0 and 6),
  course_id uuid references public.courses(id) on delete set null,
  minutes int not null default 0 check (minutes between 0 and 600),
  task_text text not null default '',
  primary key (stage_id, dow)
);

create table if not exists public.english_assessment_items (
  id uuid primary key default gen_random_uuid(),
  stage_id int not null references public.english_stages(id) on delete cascade,
  text text not null,
  essential boolean not null default false,
  sort int not null default 0
);

create table if not exists public.english_assessments (
  id uuid primary key default gen_random_uuid(),
  stage_id int not null references public.english_stages(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','passed','needs_practice')),
  student_note text not null default '',
  evidence_links text[] not null default '{}',
  score int check (score between 0 and 100),
  feedback text not null default '',
  reward_id uuid references public.rewards(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.english_assessment_results (
  assessment_id uuid not null references public.english_assessments(id) on delete cascade,
  item_id uuid not null references public.english_assessment_items(id) on delete cascade,
  result text not null default 'not_reviewed' check (result in ('passed','needs_improvement','not_reviewed')),
  note text not null default '',
  primary key (assessment_id, item_id)
);

create table if not exists public.english_skill_ratings (
  id uuid primary key default gen_random_uuid(),
  skill text not null check (skill in ('vocabulary','reading','pronunciation','grammar','sentences','listening','speaking','writing')),
  rating int not null check (rating between 1 and 5),
  is_baseline boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Security: both family members read; guardian edits plan data directly
-- ---------------------------------------------------------------------
alter table public.english_stages enable row level security;
alter table public.english_stage_courses enable row level security;
alter table public.english_objectives enable row level security;
alter table public.english_lessons enable row level security;
alter table public.english_week_plan enable row level security;
alter table public.english_assessment_items enable row level security;
alter table public.english_assessments enable row level security;
alter table public.english_assessment_results enable row level security;
alter table public.english_skill_ratings enable row level security;

revoke all on public.english_stages, public.english_stage_courses, public.english_objectives, public.english_lessons,
  public.english_week_plan, public.english_assessment_items, public.english_assessments,
  public.english_assessment_results, public.english_skill_ratings from anon;
revoke insert, update, delete, truncate on public.english_stages, public.english_stage_courses, public.english_objectives,
  public.english_lessons, public.english_week_plan, public.english_assessment_items, public.english_assessments,
  public.english_assessment_results, public.english_skill_ratings from authenticated;
grant select on public.english_stages, public.english_stage_courses, public.english_objectives, public.english_lessons,
  public.english_week_plan, public.english_assessment_items, public.english_assessments,
  public.english_assessment_results, public.english_skill_ratings to authenticated;
-- assessments and their results are written only through the review functions below
grant insert, update, delete on public.english_stages, public.english_stage_courses, public.english_objectives,
  public.english_lessons, public.english_week_plan, public.english_assessment_items, public.english_skill_ratings to authenticated;

do $$
declare t text;
begin
  foreach t in array array['english_stages','english_stage_courses','english_objectives','english_lessons','english_week_plan',
    'english_assessment_items','english_assessments','english_assessment_results','english_skill_ratings'] loop
    execute format('drop policy if exists member_read on public.%I', t);
    execute format('create policy member_read on public.%I for select to authenticated using (public.is_member())', t);
  end loop;
  foreach t in array array['english_stages','english_stage_courses','english_objectives','english_lessons','english_week_plan',
    'english_assessment_items','english_skill_ratings'] loop
    execute format('drop policy if exists guardian_write on public.%I', t);
    execute format('create policy guardian_write on public.%I for all to authenticated using (public.is_guardian()) with check (public.is_guardian())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------

-- Student starts an available stage.
create or replace function public.english_start_stage(p_stage int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member() then raise exception 'Not allowed'; end if;
  update public.english_stages set status = 'in_progress', started_at = coalesce(started_at, now())
    where id = p_stage and status = 'available';
end $$;

-- Student marks a lesson done / not done (the guardian can too).
create or replace function public.english_mark_lesson(p_lesson uuid, p_done boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_stage int;
begin
  if not public.is_member() then raise exception 'Not allowed'; end if;
  update public.english_lessons set done_at = case when p_done then coalesce(done_at, now()) end,
    done_checkin = case when p_done then done_checkin end
  where id = p_lesson returning stage_id into v_stage;
  if p_done then
    update public.english_stages set status = 'in_progress', started_at = coalesce(started_at, now())
      where id = v_stage and status = 'available';
  end if;
end $$;

-- Adds the English answers to a check-in the student has just submitted.
create or replace function public.english_attach_checkin(p_checkin uuid, p_lesson uuid, p_words text, p_sentence text, p_not_understood text)
returns void language plpgsql security definer set search_path = public as $$
declare c public.checkins;
begin
  if not public.is_student() then raise exception 'Only the student adds check-in answers'; end if;
  select * into c from public.checkins where id = p_checkin;
  if c.id is null or c.created_by <> auth.uid() or c.status <> 'pending' or c.created_at < now() - interval '1 hour' then
    raise exception 'Check-in cannot be changed';
  end if;
  update public.checkins set english_lesson_id = p_lesson, new_words = left(coalesce(p_words, ''), 500),
    english_sentence = left(coalesce(p_sentence, ''), 1000), not_understood = left(coalesce(p_not_understood, ''), 1000)
  where id = p_checkin;
  if p_lesson is not null then
    perform public.english_mark_lesson(p_lesson, true);
    update public.english_lessons set done_checkin = p_checkin where id = p_lesson;
  end if;
  if coalesce(trim(p_not_understood), '') <> '' then
    perform public.notify('guardian', 'سؤال في الإنجليزي', left(p_not_understood, 200), '/g/english');
  end if;
end $$;

-- Stage milestones can only be claimed through english_request_review (never directly).
create or replace function public.claim_milestone(p_milestone uuid, p_note text default '', p_evidence text default '')
returns void language plpgsql security definer set search_path = public as $$
declare m public.milestones; v_cat uuid; v_course text; v_reward uuid;
begin
  if not public.is_student() then raise exception 'Only the student claims milestones'; end if;
  if exists (select 1 from public.english_stages where milestone_id = p_milestone)
     and coalesce(current_setting('app.english_review', true), '') <> 'on' then
    raise exception 'English stage rewards are requested from the English journey page';
  end if;
  select * into m from public.milestones where id = p_milestone for update;
  if m.id is null or m.status <> 'open' then raise exception 'Milestone is not open'; end if;
  select category_id, title into v_cat, v_course from public.courses where id = m.course_id;
  update public.milestones set status = 'awaiting', student_note = left(coalesce(p_note, ''), 1000),
    evidence_url = left(coalesce(p_evidence, ''), 1000), claimed_at = now() where id = m.id;
  if m.reward > 0 then
    v_reward := public._create_reward('milestone', m.reward, v_course || ' — ' || m.title, null, m.id, v_cat);
  end if;
  perform public.notify('guardian', 'مرحلة بانتظار الموافقة', v_course || ' — ' || m.title, '/g/rewards');
end $$;

-- Student asks for the final assessment of a stage (claims its 300 SAR milestone as pending).
create or replace function public.english_request_review(p_stage int, p_note text default '', p_links text[] default '{}')
returns uuid language plpgsql security definer set search_path = public as $$
declare s public.english_stages; v_id uuid; v_reward uuid;
begin
  if not public.is_student() then raise exception 'Only the student requests a review'; end if;
  select * into s from public.english_stages where id = p_stage for update;
  if s.id is null or s.status not in ('available','in_progress') then raise exception 'Stage is not open for review'; end if;
  if s.paused then raise exception 'Stage is paused'; end if;
  if exists (select 1 from public.english_assessments where stage_id = p_stage and status = 'pending') then
    raise exception 'A review is already waiting';
  end if;
  if s.milestone_id is not null and exists (select 1 from public.milestones where id = s.milestone_id and status = 'open') then
    perform set_config('app.english_review', 'on', true);
    perform public.claim_milestone(s.milestone_id, left(coalesce(p_note, ''), 1000), '');
    select id into v_reward from public.rewards where milestone_id = s.milestone_id and status = 'pending';
  end if;
  insert into public.english_assessments(stage_id, student_note, evidence_links, reward_id)
    values (p_stage, left(coalesce(p_note, ''), 2000), coalesce(p_links, '{}'), v_reward) returning id into v_id;
  update public.english_stages set status = 'awaiting_review' where id = p_stage;
  perform public.notify('guardian', 'طلب تقييم مرحلة إنجليزي', s.name_ar, '/g/english');
  return v_id;
end $$;

-- Guardian scores the assessment. Pass → stage completed, next stage unlocked, reward approved.
-- Not yet → stage back to in progress, pending reward rejected (she can ask again later).
create or replace function public.english_review(p_assessment uuid, p_results jsonb, p_score int, p_feedback text, p_pass boolean, p_apply_next_plan boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare a public.english_assessments; s public.english_stages; r jsonb; v_next int;
begin
  if not public.is_guardian() then raise exception 'Only the guardian reviews assessments'; end if;
  select * into a from public.english_assessments where id = p_assessment for update;
  if a.id is null or a.status <> 'pending' then raise exception 'Assessment is not waiting for review'; end if;
  select * into s from public.english_stages where id = a.stage_id for update;

  for r in select * from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) loop
    insert into public.english_assessment_results(assessment_id, item_id, result, note)
    values (a.id, (r->>'item_id')::uuid, coalesce(r->>'result', 'not_reviewed'), left(coalesce(r->>'note', ''), 1000))
    on conflict (assessment_id, item_id) do update set result = excluded.result, note = excluded.note;
  end loop;

  update public.english_assessments set status = case when p_pass then 'passed' else 'needs_practice' end,
    score = p_score, feedback = left(coalesce(p_feedback, ''), 2000), reviewed_at = now()
  where id = a.id;

  if p_pass then
    update public.english_stages set status = 'completed', completed_at = now() where id = s.id;
    update public.english_objectives set done = true where stage_id = s.id;
    if a.reward_id is not null and exists (select 1 from public.rewards where id = a.reward_id and status = 'pending') then
      perform public.set_reward_status(a.reward_id, 'approved', 'تقييم المرحلة: ناجح');
    end if;
    select id into v_next from public.english_stages where id > s.id and status = 'locked' order by id limit 1;
    if v_next is not null then
      update public.english_stages set status = 'available' where id = v_next;
      if p_apply_next_plan then perform public.english_apply_plan(v_next); end if;
      perform public.notify('student', 'فتحت مرحلة جديدة في الإنجليزي', (select name_ar from public.english_stages where id = v_next), '/english');
    end if;
    perform public.notify('student', 'نجحتِ في تقييم المرحلة!', s.name_ar || coalesce(' — ' || nullif(p_feedback, ''), ''), '/english');
  else
    update public.english_stages set status = 'in_progress' where id = s.id;
    if a.reward_id is not null and exists (select 1 from public.rewards where id = a.reward_id and status = 'pending') then
      perform public.set_reward_status(a.reward_id, 'rejected', coalesce(nullif(p_feedback, ''), 'تحتاج تدريب إضافي'));
    end if;
    perform public.notify('student', 'المرحلة تحتاج تدريب إضافي', coalesce(nullif(p_feedback, ''), s.name_ar), '/english');
  end if;
end $$;

-- Copy a stage's recommended weekly plan into the real weekly schedule (only the days it defines).
create or replace function public.english_apply_plan(p_stage int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_guardian() then raise exception 'Only the guardian changes the schedule'; end if;
  insert into public.schedule_days(dow, label, course_id, minutes, task_text)
  select p.dow, coalesce(c.title, 'English'), p.course_id, p.minutes, p.task_text
  from public.english_week_plan p left join public.courses c on c.id = p.course_id
  where p.stage_id = p_stage
  on conflict (dow) do update set label = excluded.label, course_id = excluded.course_id,
    minutes = excluded.minutes, task_text = excluded.task_text;
end $$;

revoke execute on function public.english_start_stage(int), public.english_mark_lesson(uuid, boolean),
  public.english_attach_checkin(uuid, uuid, text, text, text), public.english_request_review(int, text, text[]),
  public.english_review(uuid, jsonb, int, text, boolean, boolean), public.english_apply_plan(int) from public, anon;
grant execute on function public.english_start_stage(int), public.english_mark_lesson(uuid, boolean),
  public.english_attach_checkin(uuid, uuid, text, text, text), public.english_request_review(int, text, text[]),
  public.english_review(uuid, jsonb, int, text, boolean, boolean), public.english_apply_plan(int) to authenticated;

-- =====================================================================
--  Starter content (runs once)
-- =====================================================================
do $$
declare
  c_en uuid; k_journey uuid; k_efz uuid; k_read uuid; k_phon uuid; k_gram uuid; k_list uuid; k_conv uuid;
  m uuid[]; ch text := 'https://www.youtube.com/@ZAmericanEnglish/playlists';
begin
  if exists (select 1 from public.english_stages) then
    raise notice 'English journey already set up';
    return;
  end if;
  select id into c_en from public.categories where name = 'English';

  -- the umbrella course that carries the four 300 SAR stage milestones
  insert into public.courses(category_id, title, provider, url, kind, link_verified, est_hours, weekly_minutes, sort, notes)
  values (c_en, 'رحلتي مع الإنجليزية', 'ZAmericanEnglish — Ibrahim Adel (free on YouTube)', 'https://www.youtube.com/@ZAmericanEnglish',
          'journey', true, 0, 105, 0, 'من أول كلمة إلى أول محادثة بالإنجليزي!')
  returning id into k_journey;

  -- playlist links could not be verified automatically: point to the official Playlists page until the guardian pastes the real link
  insert into public.courses(category_id, title, provider, url, link_verified, est_hours, weekly_minutes, sort, notes) values
    (c_en, 'English From Zero — Level 1', 'ZAmericanEnglish (YouTube, free)', 'https://www.youtube.com/watch?v=77IK9T45kiU', false, 20, 50, 1,
     'Start with the confirmed introduction video. Guardian: paste the official "English From Zero — Level 1" playlist link and tick verified.')
    returning id into k_efz;
  insert into public.courses(category_id, title, provider, url, link_verified, est_hours, weekly_minutes, sort, notes) values
    (c_en, 'Reading — Level 1', 'ZAmericanEnglish (YouTube, free)', ch, false, 10, 25, 2,
     'On the channel''s Playlists page, open "Reading — Level 1". Guardian: paste the playlist link and tick verified.') returning id into k_read;
  insert into public.courses(category_id, title, provider, url, link_verified, est_hours, weekly_minutes, sort, notes) values
    (c_en, 'Phonetics — Level 1', 'ZAmericanEnglish (YouTube, free)', ch, false, 8, 30, 3,
     'On the channel''s Playlists page, open "Phonetics — Level 1". Guardian: paste the playlist link and tick verified.') returning id into k_phon;
  insert into public.courses(category_id, title, provider, url, link_verified, est_hours, weekly_minutes, sort, notes) values
    (c_en, 'Grammar — Level 1', 'ZAmericanEnglish (YouTube, free)', ch, false, 15, 50, 4,
     'On the channel''s Playlists page, open "Grammar — Level 1". Follow the course''s own order. Guardian: paste the playlist link and tick verified.') returning id into k_gram;
  insert into public.courses(category_id, title, provider, url, link_verified, est_hours, weekly_minutes, sort, notes) values
    (c_en, 'Listening — Level 1', 'ZAmericanEnglish (YouTube, free)', ch, false, 10, 50, 5,
     'On the channel''s Playlists page, open "Listening — Level 1". Guardian: paste the playlist link and tick verified.') returning id into k_list;
  insert into public.courses(category_id, title, provider, url, link_verified, est_hours, weekly_minutes, sort, notes) values
    (c_en, 'Conversation — Level 1', 'ZAmericanEnglish (YouTube, free)', ch, false, 10, 55, 6,
     'On the channel''s Playlists page, open "Conversation — Level 1". Guardian: paste the playlist link and tick verified.') returning id into k_conv;

  -- reuse the four existing 300 SAR English milestones (still unclaimed) for the four stages
  select array_agg(mi.id order by mi.sort) into m
  from public.milestones mi join public.courses co on co.id = mi.course_id
  where co.category_id = c_en and mi.reward = 300 and mi.status = 'open'
    and not exists (select 1 from public.rewards r where r.milestone_id = mi.id);
  if coalesce(array_length(m, 1), 0) >= 4 then
    update public.milestones set course_id = k_journey, title = 'Stage 1: English Foundations', description = 'الأساسيات والقراءة والنطق', sort = 1 where id = m[1];
    update public.milestones set course_id = k_journey, title = 'Stage 2: Grammar & Sentence Building', description = 'القواعد وتكوين الجمل', sort = 2 where id = m[2];
    update public.milestones set course_id = k_journey, title = 'Stage 3: Listening & Conversation', description = 'الاستماع والمحادثة', sort = 3 where id = m[3];
    update public.milestones set course_id = k_journey, title = 'Stage 4: Practical English Challenge', description = 'تحدي الإنجليزية النهائي', sort = 4 where id = m[4];
  else
    raise exception 'Expected four unclaimed 300 SAR English milestones; found %', coalesce(array_length(m, 1), 0);
  end if;

  -- the previous general English course is replaced by the journey (kept, only hidden)
  update public.courses set archived = true, notes = notes || ' (Replaced by the ZAmericanEnglish journey.)'
  where category_id = c_en and kind = 'course' and id not in (k_efz, k_read, k_phon, k_gram, k_list, k_conv) and not archived;

  insert into public.english_stages(id, name_ar, name_en, icon, weeks, status, milestone_id, target_date) values
    (1, 'الأساسيات والقراءة والنطق', 'English Foundations', 'sprout', '6–8', 'available', m[1], current_date + 56),
    (2, 'القواعد وتكوين الجمل', 'Grammar & Sentence Building', 'pencil', '6–8', 'locked', m[2], null),
    (3, 'الاستماع والمحادثة', 'Listening & Conversation', 'headphones', '8–10', 'locked', m[3], null),
    (4, 'تحدي الإنجليزية النهائي', 'Practical English Challenge', 'trophy', '6–10', 'locked', m[4], null);

  insert into public.english_stage_courses(stage_id, course_id, role, sort) values
    (1, k_efz, 'main', 1), (1, k_read, 'main', 2), (1, k_phon, 'main', 3),
    (2, k_gram, 'main', 1), (2, k_efz, 'review', 2), (2, k_read, 'support', 3),
    (3, k_list, 'main', 1), (3, k_conv, 'main', 2), (3, k_gram, 'review', 3),
    (4, k_read, 'review', 1), (4, k_list, 'review', 2), (4, k_conv, 'review', 3), (4, k_gram, 'review', 4), (4, k_efz, 'review', 5), (4, k_phon, 'review', 6);

  insert into public.english_objectives(stage_id, text, sort) values
    (1, 'أتعرّف على الكلمات الإنجليزية الشائعة وأفهمها', 1), (1, 'أقرأ كلمات وجمل قصيرة بسيطة', 2), (1, 'أنطق الأصوات الإنجليزية الشائعة', 3),
    (1, 'أفهم الضمائر الأساسية (I, you, he, she…)', 4), (1, 'أعرّف بنفسي', 5), (1, 'أكوّن جمل بسيطة جداً', 6), (1, 'أفهم مفردات يومية بسيطة', 7),
    (2, 'ترتيب الجملة: فاعل + فعل + مفعول', 1), (2, 'الضمائر', 2), (2, 'am / is / are', 3), (2, 'الجمل المثبتة', 4), (2, 'الجمل المنفية', 5),
    (2, 'الأسئلة البسيطة', 6), (2, 'المضارع البسيط Present Simple', 7), (2, 'do و does', 8), (2, 'أفعال وصفات شائعة', 9), (2, 'وصف الروتين اليومي', 10),
    (3, 'أفهم محادثات يومية بطيئة', 1), (3, 'أجاوب على أسئلة شائعة', 2), (3, 'أعرّف بأفراد عائلتي', 3), (3, 'أتكلم عن المدرسة والهوايات', 4),
    (3, 'أسأل عن معلومات بسيطة', 5), (3, 'أتصرف في مواقف يومية بسيطة', 6), (3, 'أحسّن النطق والاستماع', 7),
    (4, 'أراجع المفردات والقواعد الضعيفة', 1), (4, 'أحسّن فهم المقروء', 2), (4, 'أتدرب على الاستماع', 3), (4, 'أبني الثقة في الكلام', 4),
    (4, 'أكتب فقرات بسيطة مترابطة', 5), (4, 'أطبّق اللي تعلمته بدون حفظ فقط', 6);

  insert into public.english_assessment_items(stage_id, text, essential, sort) values
    (1, 'تقرأ 15 كلمة إنجليزية شائعة بصوت عالٍ', false, 1), (1, 'تُظهر فهمها لـ 30 كلمة مفيدة', false, 2),
    (1, 'تكتب 10 جمل إنجليزية بسيطة بنفسها', true, 3), (1, 'تعرّف بنفسها في 5–6 جمل', true, 4), (1, 'تقرأ فقرة قصيرة للمبتدئين', false, 5),
    (2, 'تكوّن 15 جملة بشكل صحيح', false, 1), (2, 'تحوّل 5 جمل مثبتة إلى منفية', false, 2), (2, 'تكتب 5 أسئلة بسيطة', false, 3),
    (2, 'تصف روتينها اليومي في 8–10 جمل', true, 4), (2, 'تكتب فقرة مستقلة من حوالي 50 كلمة', true, 5),
    (3, 'تستمع لتسجيل للمبتدئين وتجاوب 8 من 10 أسئلة', false, 1), (3, 'تعرّف بنفسها وبعائلتها', true, 2),
    (3, 'تجاوب على 10 أسئلة شفهية بسيطة', false, 3), (3, 'محادثة موجّهة لمدة 3 دقائق', true, 4), (3, 'تصف موضوعاً مألوفاً بإنجليزية بسيطة', false, 5),
    (4, 'تكتب فقرة مستقلة من 80–100 كلمة عن موضوع مألوف', true, 1), (4, 'تقرأ نصاً قصيراً وتجاوب على أسئلة الفهم', false, 2),
    (4, 'تفهم محادثة إنجليزية بطيئة مناسبة', false, 3), (4, 'محادثة موجّهة لمدة 5 دقائق مع مساعدة معقولة', true, 4),
    (4, 'تقدّم تعريفاً أو عرضاً قصيراً بالإنجليزي', true, 5), (4, 'تحسّن واضح مقارنة بتقييم البداية', true, 6);

  -- 105 English minutes a week; Tuesday/Friday stay for development courses, Thursday stays rest
  insert into public.english_week_plan(stage_id, dow, course_id, minutes, task_text) values
    (1, 0, k_efz, 25, 'شاهدي الفيديو التالي من English From Zero وتدربي على الكلمات الجديدة'),
    (1, 1, k_read, 25, 'درس قراءة: اقرئي الكلمات والجمل بصوت عالٍ'),
    (1, 3, k_efz, 25, 'كمّلي English From Zero وراجعي كلمات الدرس'),
    (1, 6, k_phon, 30, 'درس نطق + مراجعة كلمات الأسبوع'),
    (2, 0, k_gram, 25, 'الدرس التالي من Grammar حسب ترتيب الكورس'),
    (2, 1, k_read, 25, 'قراءة أو مراجعة English From Zero'),
    (2, 3, k_gram, 25, 'كمّلي Grammar واكتبي 3 جمل بالقاعدة الجديدة'),
    (2, 6, k_efz, 30, 'مراجعة الأسبوع: جمل وأسئلة بسيطة'),
    (3, 0, k_list, 25, 'درس استماع: شاهدي مرتين وجاوبي على الأسئلة'),
    (3, 1, k_gram, 25, 'مراجعة قاعدة احتجتيها في المحادثة'),
    (3, 3, k_conv, 25, 'درس محادثة: كرري الجمل بصوت عالٍ'),
    (3, 6, k_conv, 30, 'مراجعة استماع ومحادثة + تدريب مع ولي الأمر'),
    (4, 0, k_read, 25, 'مراجعة قراءة ونص قصير مع أسئلة'),
    (4, 1, k_gram, 25, 'راجعي القاعدة اللي تحتاج تدريب'),
    (4, 3, k_list, 25, 'استماع لمحادثة بطيئة'),
    (4, 6, k_conv, 30, 'تدريب على العرض القصير والمحادثة');

  -- put Stage 1's English days into the weekly schedule (other days untouched)
  insert into public.schedule_days(dow, label, course_id, minutes, task_text)
  select p.dow, c.title, p.course_id, p.minutes, p.task_text
  from public.english_week_plan p join public.courses c on c.id = p.course_id where p.stage_id = 1
  on conflict (dow) do update set label = excluded.label, course_id = excluded.course_id,
    minutes = excluded.minutes, task_text = excluded.task_text;

  -- first lesson task: the confirmed introduction video
  insert into public.english_lessons(stage_id, course_id, title, url, verified, sort)
  values (1, k_efz, 'English From Zero — Introduction', 'https://www.youtube.com/watch?v=77IK9T45kiU', true, 1);
end $$;
