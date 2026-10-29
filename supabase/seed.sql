-- =====================================================================
--  Starter content: categories, suggested courses, milestones, schedule.
--  Run once AFTER schema.sql. Everything here is editable in the app.
--
--  Budget split (total 3,000 SAR):
--   Category                         Budget  Daily pool  Milestones
--   English                           1200        0     4 × 300
--   Programming & Logical Thinking     500        0     200 + 300
--   Computer & AI Literacy             400      100     300
--   Financial Literacy                 400      100     300
--   Communication & Confidence         300      100     200
--   Time Management & Self-Learning    200      100     100
--   -----------------------------------------------------------
--   Daily/weekly consistency pool = 400 SAR (5 SAR/day + 10 SAR/week)
-- =====================================================================

do $$
declare
  c_en uuid; c_prog uuid; c_comp uuid; c_fin uuid; c_comm uuid; c_time uuid;
  k_en uuid; k_prog uuid; k_scratch uuid; k_comp uuid; k_office uuid; k_ai uuid; k_fin uuid; k_comm uuid; k_time uuid;
begin
  if exists (select 1 from public.categories) then
    raise notice 'Seed skipped: categories already exist';
    return;
  end if;

  insert into public.categories(name, emoji, color, budget, daily_pool, sort) values
    ('English', '🇬🇧', 'pink', 1200, 0, 1) returning id into c_en;
  insert into public.categories(name, emoji, color, budget, daily_pool, sort) values
    ('Programming & Logical Thinking', '🧩', 'blue', 500, 0, 2) returning id into c_prog;
  insert into public.categories(name, emoji, color, budget, daily_pool, sort) values
    ('Computer & AI Literacy', '💻', 'lavender', 400, 100, 3) returning id into c_comp;
  insert into public.categories(name, emoji, color, budget, daily_pool, sort) values
    ('Financial Literacy', '💰', 'mint', 400, 100, 4) returning id into c_fin;
  insert into public.categories(name, emoji, color, budget, daily_pool, sort) values
    ('Communication & Confidence', '🎤', 'peach', 300, 100, 5) returning id into c_comm;
  insert into public.categories(name, emoji, color, budget, daily_pool, sort) values
    ('Time Management & Self-Learning', '⏰', 'cream', 200, 100, 6) returning id into c_time;

  -- Every link below is a completely free site (public service / non-profit, no paid tier).
  insert into public.courses(category_id, title, provider, url, start_date, target_date, est_hours, weekly_minutes, sort, notes)
  values (c_en, 'BBC Learning English', 'BBC — completely free', 'https://www.bbc.co.uk/learningenglish/',
          current_date, current_date + 120, 40, 105, 1,
          '100% free, no account needed. Start at the beginner level: basic words, pronouns, "to be", Present Simple.')
  returning id into k_en;
  insert into public.courses(category_id, title, provider, url, start_date, target_date, est_hours, weekly_minutes, sort, notes)
  values (c_prog, 'Code.org — Express Course', 'Code.org — completely free', 'https://code.org/students',
          current_date, current_date + 120, 25, 70, 3, '100% free non-profit, no ads. Choose the Express Course (ages 9–18).')
  returning id into k_prog;
  insert into public.courses(category_id, title, provider, url, est_hours, weekly_minutes, sort, notes)
  values (c_prog, 'Scratch — Make Your First Game', 'MIT Scratch — completely free', 'https://scratch.mit.edu/ideas', 8, 0, 4,
          '100% free, no ads. Follow a game tutorial. Under 16: the account needs a parent email to confirm.')
  returning id into k_scratch;
  insert into public.courses(category_id, title, provider, url, est_hours, weekly_minutes, sort, notes)
  values (c_comp, 'Computer Basics & Internet Safety', 'GCFGlobal — completely free', 'https://edu.gcfglobal.org/en/computerbasics/', 6, 0, 5,
          '100% free, no account needed. Then Internet Safety: https://edu.gcfglobal.org/en/internetsafety/')
  returning id into k_comp;
  insert into public.courses(category_id, title, provider, url, est_hours, weekly_minutes, sort, notes)
  values (c_comp, 'PowerPoint & Excel Basics', 'GCFGlobal — completely free', 'https://edu.gcfglobal.org/en/powerpoint/', 8, 0, 6,
          '100% free lessons. Excel: https://edu.gcfglobal.org/en/excel/')
  returning id into k_office;
  insert into public.courses(category_id, title, provider, url, est_hours, weekly_minutes, sort, notes)
  values (c_comp, 'AI for Oceans — How AI Works', 'Code.org — completely free', 'https://studio.code.org/s/oceans', 1, 0, 7,
          '100% free, no ads, about 1 hour.')
  returning id into k_ai;
  insert into public.courses(category_id, title, provider, url, est_hours, weekly_minutes, sort, notes)
  values (c_fin, 'Financial Literacy', 'Khan Academy — completely free',
          'https://www.khanacademy.org/college-careers-more/financial-literacy', 12, 0, 8,
          '100% free non-profit, no ads. Start with the Budgeting and Saving units.')
  returning id into k_fin;
  insert into public.courses(category_id, title, provider, url, est_hours, weekly_minutes, sort, notes)
  values (c_comm, 'Communication & Confidence', '', '', 8, 0, 9,
          'Guardian: add a completely free course link here (public speaking, communication, presentations).')
  returning id into k_comm;
  insert into public.courses(category_id, title, provider, url, est_hours, weekly_minutes, sort, notes)
  values (c_time, 'Time Management & Self-Learning', '', '', 6, 0, 10,
          'Guardian: add a completely free course link here (study planning, goals, time management, habits).')
  returning id into k_time;

  insert into public.milestones(course_id, title, description, reward, sort) values
    (k_en, 'Milestone 1: Basic vocabulary & pronouns', 'I, you, he, she… plus everyday words', 300, 1),
    (k_en, 'Milestone 2: The verb "to be" & simple sentences', 'I am / you are / she is…', 300, 2),
    (k_en, 'Milestone 3: Present Simple', 'Daily routines and habits', 300, 3),
    (k_en, 'Milestone 4: Basic conversations, listening & reading', 'Introduce yourself and hold a short chat', 300, 4),
    (k_prog, 'Fundamentals completed', 'Finish the Express Course', 200, 1),
    (k_scratch, 'Simple game project completed', 'Build and share a small game', 300, 2),
    (k_office, 'PowerPoint: build a 5-slide presentation', '', 75, 1),
    (k_office, 'Excel: a simple budget sheet', '', 75, 2),
    (k_comp, 'Computer skills & files', '', 50, 3),
    (k_ai, 'Responsible AI use', '', 50, 4),
    (k_comp, 'Internet safety', '', 50, 5),
    (k_fin, 'Budgeting & saving', '', 100, 1),
    (k_fin, 'Spending, banking & needs vs wants', '', 100, 2),
    (k_fin, 'Course completed', '', 100, 3),
    (k_comm, 'Public speaking basics', '', 100, 1),
    (k_comm, 'Give a 3-minute presentation to the family', '', 100, 2),
    (k_time, 'Weekly study plan kept for 4 weeks', '', 100, 1);

  insert into public.schedule_days(dow, label, course_id, minutes, task_text) values
    (0, 'English', k_en, 25, 'One BBC Learning English beginner lesson.'),
    (1, 'English', k_en, 25, 'One BBC Learning English beginner lesson.'),
    (2, 'Development Course', k_prog, 30, 'Next Code.org Express lesson.'),
    (3, 'English', k_en, 25, 'One BBC Learning English beginner lesson.'),
    (4, 'Rest', null, 0, 'Rest day 🌸'),
    (5, 'Development Course', k_prog, 40, 'Next Code.org Express lesson.'),
    (6, 'English + Review', k_en, 30, 'One lesson + review this week''s words.')
  on conflict (dow) do nothing;

  insert into public.tasks(title, details, kind) values
    ('Write 3 new English words in your notebook', '', 'daily'),
    ('Review this week''s English words', '', 'weekly');
end $$;

