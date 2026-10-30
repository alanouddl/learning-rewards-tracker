// English journey API test. Run ONLY against a throw-away project that already has the two
// accounts (guardian first, student second) and schema.sql + seed.sql + english.sql applied.
// Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... GUARDIAN=email STUDENT=email PASSWORD=... node tests/english.test.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_ANON_KEY, PW = process.env.PASSWORD;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function login(email) {
  const c = createClient(URL, KEY, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PW });
  if (error) throw error;
  return c;
}
const g = await login(process.env.GUARDIAN), s = await login(process.env.STUDENT);
const stage = async (id) => (await g.from('english_stages').select('*').eq('id', id).single()).data;
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });

const stages = (await s.from('english_stages').select('*').order('id')).data;
ok(stages.length === 4 && stages[0].status === 'available' && stages[1].status === 'locked', 'four stages, stage 1 available');
ok(!!(await s.from('english_stages').update({ status: 'completed' }).eq('id', 1).select()).error || (await stage(1)).status === 'available', 'student cannot change stage status');
ok(!!(await s.from('english_lessons').insert({ stage_id: 1, title: 'x' })).error, 'student cannot add lessons');
ok(!!(await s.from('english_assessments').insert({ stage_id: 1 })).error, 'student cannot create assessments directly');
ok(!!(await s.from('english_skill_ratings').insert({ skill: 'reading', rating: 5 })).error, 'student cannot rate skills');

const sm = (await s.from('english_stages').select('milestone_id').eq('id', 1).single()).data.milestone_id;
ok(!!(await s.rpc('claim_milestone', { p_milestone: sm, p_note: '', p_evidence: '' })).error, 'stage reward cannot be claimed directly');
ok(!(await s.rpc('english_start_stage', { p_stage: 1 })).error && (await stage(1)).status === 'in_progress', 'student starts stage 1');
ok(!!(await s.rpc('english_request_review', { p_stage: 2 })).error, 'cannot request review of a locked stage');

const efz = (await g.from('courses').select('*').eq('title', 'English From Zero — Level 1').single()).data;
ok(efz && efz.link_verified === false, 'playlist course flagged as needing verification');
const { data: lesson, error: le } = await g.from('english_lessons').insert({ stage_id: 1, course_id: efz.id, title: 'Lesson 2', url: 'https://www.youtube.com/watch?v=77IK9T45kiU', sort: 2 }).select().single();
ok(!le, 'guardian adds a lesson ' + (le?.message || ''));
ok(!!(await g.from('english_lessons').insert({ stage_id: 1, title: 'bad', url: 'javascript:alert(1)' })).error, 'lesson URL must be http(s)');

const ck = await s.rpc('submit_checkin', { p_study_date: today, p_course: efz.id, p_minutes: 25, p_source: 'manual', p_finished: 'Lesson 2', p_learned: 'I am', p_difficulty: 'easy', p_help: '', p_links: [], p_files: [] });
ok(!ck.error, 'student submits check-in ' + (ck.error?.message || ''));
const at = await s.rpc('english_attach_checkin', { p_checkin: ck.data.id, p_lesson: lesson.id, p_words: 'apple, book, cat', p_sentence: 'I am a student.', p_not_understood: 'متى أستخدم a و an' });
ok(!at.error, 'student adds English answers ' + (at.error?.message || ''));
const row = (await g.from('checkins').select('*').eq('id', ck.data.id).single()).data;
ok(row.new_words === 'apple, book, cat' && row.english_lesson_id === lesson.id, 'English answers saved on the check-in');
ok(!!(await s.from('english_lessons').select('done_at').eq('id', lesson.id).single()).data.done_at, 'lesson marked done from check-in');
ok((await g.from('notifications').select('title').eq('recipient', 'guardian')).data.some((n) => n.title.includes('سؤال في الإنجليزي')), 'guardian notified of her question');
ok(!!(await g.rpc('english_attach_checkin', { p_checkin: ck.data.id, p_lesson: null, p_words: '', p_sentence: '', p_not_understood: '' })).error, 'guardian cannot write the student answers');

// first request → guardian asks for more practice
let req = await s.rpc('english_request_review', { p_stage: 1, p_note: 'جاهزة!', p_links: [] });
ok(!req.error, 'student requests stage 1 review ' + (req.error?.message || ''));
ok((await stage(1)).status === 'awaiting_review', 'stage awaiting review');
let sum = (await s.rpc('reward_summary')).data;
ok(Number(sum.pending) >= 300, 'stage reward 300 pending');
ok(!!(await s.rpc('english_request_review', { p_stage: 1 })).error, 'cannot request twice');
const items = (await g.from('english_assessment_items').select('*').eq('stage_id', 1).order('sort')).data;
ok(items.length === 5, 'stage 1 has 5 assessment items');
ok(!!(await s.rpc('english_review', { p_assessment: req.data, p_results: [], p_score: 100, p_feedback: '', p_pass: true })).error, 'student cannot approve her own assessment');
let rv = await g.rpc('english_review', { p_assessment: req.data, p_results: items.map((i, k) => ({ item_id: i.id, result: k < 3 ? 'passed' : 'needs_improvement', note: '' })), p_score: 60, p_feedback: 'تدربي على التعريف بنفسك', p_pass: false });
ok(!rv.error, 'guardian marks needs practice ' + (rv.error?.message || ''));
ok((await stage(1)).status === 'in_progress', 'stage back in progress');
sum = (await s.rpc('reward_summary')).data;
ok(Number(sum.pending) === 0 && Number(sum.earned) === 0, 'reward rejected, nothing earned');
ok((await g.from('english_assessment_results').select('*').eq('assessment_id', req.data)).data.length === 5, 'item results stored');

// second request → pass
req = await s.rpc('english_request_review', { p_stage: 1, p_note: 'تدربت أكثر', p_links: ['https://example.org/video'] });
ok(!req.error, 'student requests again ' + (req.error?.message || ''));
rv = await g.rpc('english_review', { p_assessment: req.data, p_results: items.map((i) => ({ item_id: i.id, result: 'passed', note: '' })), p_score: 88, p_feedback: 'ممتاز!', p_pass: true });
ok(!rv.error, 'guardian passes stage 1 ' + (rv.error?.message || ''));
ok((await stage(1)).status === 'completed' && (await stage(2)).status === 'available', 'stage 1 completed, stage 2 unlocked');
sum = (await s.rpc('reward_summary')).data;
ok(Number(sum.earned) === 300 && Number(sum.pending) === 0, 'earned 300 SAR');
const sunday = (await g.from('schedule_days').select('*, courses(title)').eq('dow', 0).single()).data;
ok(sunday.courses?.title === 'Grammar — Level 1', 'schedule switched to stage 2 plan');
const tue = (await g.from('schedule_days').select('label').eq('dow', 2).single()).data;
ok(tue.label === 'Development Course', 'Tuesday development course untouched');
const hist = (await g.from('english_assessments').select('status').eq('stage_id', 1).order('created_at')).data.map((a) => a.status).join(',');
ok(hist === 'needs_practice,passed', 'assessment history kept: ' + hist);
ok(!(await g.from('english_skill_ratings').insert({ skill: 'reading', rating: 3, is_baseline: true })).error, 'guardian records a baseline skill rating');
ok(!(await g.from('english_stages').update({ paused: true }).eq('id', 2)).error, 'guardian pauses a stage');
await s.rpc('english_start_stage', { p_stage: 2 });
ok(!!(await s.rpc('english_request_review', { p_stage: 2 })).error, 'paused stage cannot be submitted');
const total = (await g.from('milestones').select('reward').in('id', (await g.from('english_stages').select('milestone_id')).data.map((x) => x.milestone_id))).data.reduce((a, m) => a + Number(m.reward), 0);
ok(total === 1200, 'English stage rewards still total 1,200 SAR');

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
process.exit(fails ? 1 : 0);
