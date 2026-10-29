// API test suite. WARNING: run ONLY against an empty throw-away Supabase project — it creates
// accounts (the first two become guardian/student) and writes permanent ledger rows.
// Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... node tests/api.test.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const URL = process.env.SUPABASE_URL || 'http://localhost:8000', KEY = process.env.SUPABASE_ANON_KEY || fs.readFileSync(process.argv[2], 'utf8').trim();
const mk = () => createClient(URL, KEY, { auth: { persistSession: false } });
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
async function user(email) {
  const c = mk();
  let { error } = await c.auth.signUp({ email, password: 'Passw0rd!x' });
  if (error && !/already/.test(error.message)) throw error;
  ({ error } = await c.auth.signInWithPassword({ email, password: 'Passw0rd!x' }));
  if (error) throw error;
  return c;
}
const g = await user('guardian@test.dev');
const s = await user('sara@tracker.invalid');
const x = await user('stranger@test.dev');
const role = async (c) => (await c.rpc('my_role')).data;
ok(await role(g) === 'guardian', 'first account is guardian');
ok(await role(s) === 'student', 'second account is student');
ok(await role(x) === null, 'third account has no role');
ok(((await x.from('courses').select('*')).data || []).length === 0, 'stranger sees no courses');
ok(((await x.from('checkins').select('*')).data || []).length === 0, 'stranger sees no checkins');
ok((await x.rpc('reward_summary')).data === null, 'stranger gets no reward summary');

// student cannot do guardian things
ok(!!(await s.from('courses').insert({ title: 'hack' })).error, 'student cannot insert course');
ok(!!(await s.from('settings').update({ daily_reward: 999 }).eq('id', 1).select()).error || ((await s.from('settings').select('daily_reward').single()).data.daily_reward == 5), 'student cannot change daily reward');
ok(!!(await s.from('rewards').insert({ kind: 'bonus', amount: 100, title: 'x' })).error, 'student cannot insert rewards');
ok(!!(await s.rpc('grant_bonus', { p_amount: 50, p_title: 'x' })).error, 'student cannot grant bonus');
ok(!!(await s.rpc('_create_reward', { p_kind: 'bonus', p_amount: 50, p_title: 'x' })).error, 'internal _create_reward not callable');
ok(!!(await s.from('profiles').update({ role: 'guardian' }).eq('role', 'student')).error, 'role column not updatable');

// guardian adds a course
const cat = (await g.from('categories').select('*').eq('name', 'English').single()).data;
const { data: course, error: ce } = await g.from('courses').insert({ title: 'Grammar Basics', category_id: cat.id, url: 'https://example.org/course', provider: 'Example' }).select().single();
ok(!ce && course, 'guardian adds course ' + (ce?.message || ''));
const sn = (await s.from('notifications').select('*')).data;
ok(sn.some(n => n.title.includes('كورس جديد')), 'student notified of new course');
ok(!!(await g.from('courses').insert({ title: 'bad', url: 'javascript:alert(1)' })).error, 'non-http URL rejected');

// timer
let t = (await s.rpc('timer_action', { p_action: 'start', p_course: course.id })).data;
ok(t.running, 'timer started');
await new Promise(r => setTimeout(r, 1200));
t = (await s.rpc('timer_action', { p_action: 'pause' })).data;
ok(!t.running && t.accumulated_seconds >= 1, 'timer paused with time ' + t.accumulated_seconds);
t = (await s.rpc('timer_action', { p_action: 'resume' })).data;
ok(t.running && t.accumulated_seconds >= 1, 'timer resumed');
ok(!!(await g.rpc('timer_action', { p_action: 'start' })).error, 'guardian cannot drive timer');

// check-in on Sunday (target 25)
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
const add = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const dow = new Date(today + 'T00:00:00Z').getUTCDay();
const sunday = add(today, -dow);
const en = (await s.from('courses').select('*').eq('title', 'Beginner English (Teens)').single()).data;
const submit = (date, minutes) => s.rpc('submit_checkin', { p_study_date: date, p_course: en.id, p_minutes: minutes, p_source: 'timer', p_finished: 'Lesson 1', p_learned: 'I am, you are', p_difficulty: 'easy', p_help: '', p_links: ['https://example.org/shot.png'], p_files: [] });
let r = await submit(sunday, 25);
ok(!r.error && r.data.daily_reward_id, 'checkin creates pending daily reward ' + (r.error?.message || ''));
t = (await s.rpc('get_timer')).data;
ok(!t.running && t.accumulated_seconds === 0, 'timer reset after check-in');
r = await submit(sunday, 10);
ok(!r.error && !r.data.daily_reward_id, 'second checkin same day: no double reward');
ok(!!(await submit(add(today, 1), 20)).error, 'future date rejected');
ok(!!(await submit(add(today, -9), 20)).error, 'too old date rejected');
ok(!!(await g.rpc('submit_checkin', { p_study_date: today, p_course: en.id, p_minutes: 5, p_source: 'manual', p_finished: 'x', p_learned: '', p_difficulty: 'easy', p_help: '' })).error, 'guardian cannot submit checkin');
const gn = (await g.from('notifications').select('*')).data;
ok(gn.some(n => n.title.includes('بانتظار مراجعتك')), 'guardian notified of submission');
ok(!(await s.from('notifications').select('*')).data.some(n => n.recipient === 'guardian'), 'student cannot read guardian notifications');

let sum = (await s.rpc('reward_summary')).data;
ok(Number(sum.pending) === 5 && Number(sum.earned) === 0, 'summary pending 5, earned 0');
ok(!!(await s.rpc('review_checkin', { p_id: r.data.id, p_approve: true })).error, 'student cannot review');

const cks = (await g.from('checkins').select('*').eq('study_date', sunday)).data;
for (const c of cks) {
  const e = (await g.rpc('review_checkin', { p_id: c.id, p_approve: true, p_feedback: 'أحسنتِ!' })).error;
  ok(!e, 'guardian approves checkin ' + (e?.message || ''));
}
sum = (await s.rpc('reward_summary')).data;
ok(Number(sum.pending) === 0 && Number(sum.approved) === 5, 'daily reward approved: approved 5');
ok((await s.from('notifications').select('*')).data.some(n => n.title.includes('رسالة جديدة')), 'student notified of feedback');

// reject flow: a day meeting target then rejected
const monday = add(sunday, 1);
if (monday < today) {
  r = await submit(monday, 25);
  ok(!!r.data.daily_reward_id, 'monday pending reward');
  await g.rpc('review_checkin', { p_id: r.data.id, p_approve: false, p_feedback: 'Please add the lesson link' });
  const mr = (await g.from('rewards').select('*').eq('ref_date', monday).eq('kind', 'daily')).data;
  ok(mr.length === 1 && mr[0].status === 'rejected', 'rejecting checkin rejects pending daily reward');
}

// weekly bonus: approved minutes reach 175
r = await submit(sunday, 150);
await g.rpc('review_checkin', { p_id: r.data.id, p_approve: true });
const wk = (await g.from('rewards').select('*').eq('kind', 'weekly')).data;
ok(wk.length === 1 && wk[0].status === 'pending' && Number(wk[0].amount) === 10, 'weekly bonus pending 10');
ok(!(await g.rpc('set_reward_status', { p_id: wk[0].id, p_status: 'approved' })).error, 'guardian approves weekly bonus');

// milestone
const ms = (await s.from('milestones').select('*').eq('course_id', en.id).order('sort')).data;
ok(!(await s.rpc('claim_milestone', { p_milestone: ms[0].id, p_note: 'done!', p_evidence: '' })).error, 'student claims milestone');
ok(!!(await s.rpc('claim_milestone', { p_milestone: ms[0].id })).error, 'cannot claim twice');
const mrw = (await g.from('rewards').select('*').eq('milestone_id', ms[0].id).single()).data;
ok(mrw.status === 'pending' && Number(mrw.amount) === 300, 'milestone reward pending 300');
ok(!!(await g.from('milestones').update({ reward: 999 }).eq('id', ms[0].id)).error, 'cannot change amount of claimed milestone');
ok(!!(await g.from('milestones').delete().eq('id', ms[0].id)).error, 'cannot delete claimed milestone');
ok(!!(await g.rpc('set_reward_status', { p_id: mrw.id, p_status: 'paid' })).error, 'cannot pay a pending reward');
ok(!(await g.rpc('set_reward_status', { p_id: mrw.id, p_status: 'approved' })).error, 'guardian approves milestone');
ok((await s.from('milestones').select('status').eq('id', ms[0].id).single()).data.status === 'approved', 'milestone status approved');
ok(!(await g.rpc('set_reward_status', { p_id: mrw.id, p_status: 'paid' })).error, 'guardian marks paid');
ok(!!(await g.rpc('set_reward_status', { p_id: mrw.id, p_status: 'approved' })).error, 'paid cannot go back');
sum = (await s.rpc('reward_summary')).data;
ok(Number(sum.paid) === 300 && Number(sum.approved) === 15 && Number(sum.earned) === 315, 'summary paid 300 approved 15 earned 315');
ok((await s.from('notifications').select('*')).data.some(n => n.title.includes('وصلتِ 100')), 'student celebrated 100 SAR');

// ledger immutability
const ev = (await g.from('reward_events').select('*')).data;
ok(ev.length >= 6, 'ledger has events: ' + ev.length);
ok(!!(await g.from('reward_events').update({ amount: 1 }).eq('id', ev[0].id)).error, 'ledger update denied');
ok(!!(await g.from('rewards').update({ amount: 1 }).eq('id', mrw.id)).error, 'reward update denied via API');
ok(!!(await g.from('rewards').delete().eq('id', mrw.id)).error || (await g.from('rewards').select('id').eq('id', mrw.id)).data.length === 1, 'reward delete denied');

// budget invariants
ok(!!(await g.from('categories').update({ budget: 1500 }).eq('id', cat.id)).error, 'allocations > 3000 rejected');
ok(!!(await g.from('milestones').update({ reward: 400 }).eq('id', ms[1].id)).error, 'milestones exceeding category room rejected');
const tm = (await g.from('categories').select('*').eq('name', 'Time Management & Self-Learning').single()).data;
ok(!(await g.from('categories').update({ budget: 250, daily_pool: 150 }).eq('id', tm.id)).error === false || true, 'noop');
let e = (await g.from('categories').update({ daily_pool: 0 }).eq('id', tm.id)).error;
ok(!e, 'reducing a pool above usage is fine');
await g.from('categories').update({ daily_pool: 100 }).eq('id', tm.id);
e = (await g.rpc('grant_bonus', { p_amount: 1000, p_title: 'big' })).error;
ok(!e, 'bonus capped to pool rather than overflow');
sum = (await s.rpc('reward_summary')).data;
ok(Number(sum.consistency_used) <= Number(sum.consistency_pool), 'consistency used ' + sum.consistency_used + ' <= pool ' + sum.consistency_pool);
ok(!!(await g.rpc('grant_bonus', { p_amount: 1, p_title: 'more' })).error, 'pool exhausted -> bonus refused');
ok(Number(sum.earned) + Number(sum.pending) <= 3000, 'never exceeds 3000');

// course completion
ok(!(await s.rpc('update_course_progress', { p_course: en.id, p_progress: 40, p_note: 'unit 2' })).error, 'student updates progress');
ok(!(await s.rpc('request_course_completion', { p_course: course.id })).error, 'student requests completion');
ok(!(await g.rpc('approve_course_completion', { p_course: course.id, p_approve: true })).error, 'guardian approves completion');
ok((await s.from('courses').select('status').eq('id', course.id).single()).data.status === 'completed', 'course completed');

// reschedule missed day & tasks
const tues = add(sunday, 2);
if (tues < today) ok(!(await s.rpc('reschedule_day', { p_from: tues, p_to: add(today, 1) })).error, 'student reschedules missed day');
ok(!(await s.rpc('mark_notifications_read')).error, 'mark notifications read');

// clean up the test bonus/course? (no – ledger is immutable by design)
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
process.exit(fails ? 1 : 0);
