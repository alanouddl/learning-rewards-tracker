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
  k_en uuid; k_en2 uuid; k_prog uuid; k_comp uuid; k_fin uuid; k_comm uuid; k_time uuid;
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

  insert into public.courses(category_id, title, provider, url, start_date, target_date, est_hours, weekly_minutes, sort, notes)
  values (c_en, 'Beginner English (Teens)', 'British Council — LearnEnglish Teens',
          'https://learnenglishteens.britishcouncil.org/', current_date, current_date + 120, 40, 105, 1,
          'Start with basic vocabulary, pronouns, the verb "to be", simple sentences and Present Simple.')
  returning id into k_en;
  insert into public.courses(category_id, title, provider, url, start_date, target_date, est_hours, weekly_minutes, sort, notes)
  values (c_en, 'English Listening & Reading', 'British Council — LearnEnglish',
          'https://learnenglish.britishcouncil.org/', current_date, current_date + 150, 20, 30, 2,
          'Extra practice: short listening and reading activities for beginners.')
  returning id into k_en2;
  insert into public.courses(category_id, title, provider, url, start_date, target_date, est_hours, weekly_minutes, sort, notes)
  values (c_prog, 'Computer Science Fundamentals', 'Code.org', 'https://code.org/', current_date, current_date + 120, 25, 70, 3,
          'Logic puzzles and block coding, ending with a simple game project.')
  returning id into k_prog;
  insert into public.courses(category_id, title, provider, url, start_date, target_date, est_hours, weekly_minutes, sort, notes)
  values (c_comp, 'Computer & AI Literacy', '', '', null, null, 15, 0, 4,
          'PowerPoint, Excel, computer skills, responsible AI use and internet safety. Guardian: add the course link.')
  returning id into k_comp;
  insert into public.courses(category_id, title, provider, url, start_date, target_date, est_hours, weekly_minutes, sort, notes)
  values (c_fin, 'Financial Literacy', 'Khan Academy',
          'https://www.khanacademy.org/college-careers-more/financial-literacy', null, null, 12, 0, 5,
          'Guardian: replace with a more age-appropriate course if you find one.')
  returning id into k_fin;
  insert into public.courses(category_id, title, provider, url, start_date, target_date, est_hours, weekly_minutes, sort, notes)
  values (c_comm, 'Communication & Confidence', '', '', null, null, 8, 0, 6,
          'Public speaking, communication and presentation skills. Guardian: add the course link.')
  returning id into k_comm;
  insert into public.courses(category_id, title, provider, url, start_date, target_date, est_hours, weekly_minutes, sort, notes)
  values (c_time, 'Time Management & Self-Learning', '', '', null, null, 6, 0, 7,
          'Study planning, goal setting, time management and building habits. Guardian: add the course link.')
  returning id into k_time;

  insert into public.milestones(course_id, title, description, reward, sort) values
    (k_en, 'Milestone 1: Basic vocabulary & pronouns', 'I, you, he, she… plus everyday words', 300, 1),
    (k_en, 'Milestone 2: The verb "to be" & simple sentences', 'I am / you are / she is…', 300, 2),
    (k_en, 'Milestone 3: Present Simple', 'Daily routines and habits', 300, 3),
    (k_en, 'Milestone 4: Basic conversations, listening & reading', 'Introduce yourself and hold a short chat', 300, 4),
    (k_prog, 'Fundamentals completed', 'Finish the fundamentals course', 200, 1),
    (k_prog, 'Simple game project completed', 'Build and share a small game', 300, 2),
    (k_comp, 'PowerPoint: build a 5-slide presentation', '', 75, 1),
    (k_comp, 'Excel: a simple budget sheet', '', 75, 2),
    (k_comp, 'Computer skills & files', '', 50, 3),
    (k_comp, 'Responsible AI use', '', 50, 4),
    (k_comp, 'Internet safety', '', 50, 5),
    (k_fin, 'Budgeting & saving', '', 100, 1),
    (k_fin, 'Spending, banking & needs vs wants', '', 100, 2),
    (k_fin, 'Course completed', '', 100, 3),
    (k_comm, 'Public speaking basics', '', 100, 1),
    (k_comm, 'Give a 3-minute presentation to the family', '', 100, 2),
    (k_time, 'Weekly study plan kept for 4 weeks', '', 100, 1);

  insert into public.schedule_days(dow, label, course_id, minutes, task_text) values
    (0, 'English', k_en, 25, 'Complete the next assigned lesson.'),
    (1, 'English', k_en, 25, 'Complete the next assigned lesson.'),
    (2, 'Development Course', k_prog, 30, 'Complete the next Code.org lesson.'),
    (3, 'English', k_en, 25, 'Complete the next assigned lesson.'),
    (4, 'Rest', null, 0, 'Rest day 🌸'),
    (5, 'Development Course', k_prog, 40, 'Continue the Code.org course.'),
    (6, 'English + Review', k_en, 30, 'Next lesson + review this week''s words.')
  on conflict (dow) do nothing;

  insert into public.tasks(title, details, kind) values
    ('Write 3 new English words in your notebook', '', 'daily'),
    ('Review this week''s English words', '', 'weekly');
end $$;

