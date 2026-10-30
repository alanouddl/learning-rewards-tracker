export type Role = 'guardian' | 'student';
export type Profile = { id: string; role: Role; display_name: string; created_at: string };
export type Settings = {
  id: number; total_budget: number; daily_reward: number; weekly_bonus: number;
  weekly_target_minutes: number; goal_label: string; guardian_message: string;
};
export type Category = { id: string; name: string; emoji: string; color: string; budget: number; daily_pool: number; sort: number };
export type CourseStatus = 'not_started' | 'in_progress' | 'awaiting_approval' | 'completed';
export type Course = {
  id: string; category_id: string | null; title: string; provider: string; url: string; thumbnail_url: string;
  start_date: string | null; target_date: string | null; est_hours: number; weekly_minutes: number;
  progress: number; status: CourseStatus; notes: string; archived: boolean; sort: number;
  link_verified: boolean; kind: 'course' | 'journey';
};
export type Milestone = {
  id: string; course_id: string; title: string; description: string; reward: number; sort: number;
  status: 'open' | 'awaiting' | 'approved'; student_note: string; evidence_url: string;
  claimed_at: string | null; approved_at: string | null;
};
export type ScheduleDay = { dow: number; label: string; course_id: string | null; minutes: number; task_text: string };
export type PlanChange = {
  id: string; plan_date: string; kind: 'replace' | 'makeup'; from_date: string | null; label: string;
  course_id: string | null; minutes: number; task_text: string;
};
export type Task = { id: string; title: string; details: string; kind: 'daily' | 'weekly' | 'once'; course_id: string | null; due_date: string | null; active: boolean };
export type TaskCompletion = { task_id: string; period_key: string; completed_at: string };
export type Checkin = {
  id: string; study_date: string; course_id: string | null; minutes: number; source: 'timer' | 'manual';
  finished: string; learned: string; difficulty: 'easy' | 'medium' | 'hard'; help_needed: string;
  evidence_links: string[]; evidence_files: string[]; status: 'pending' | 'approved' | 'rejected';
  feedback: string; reviewed_at: string | null; created_at: string;
  english_lesson_id: string | null; new_words: string; english_sentence: string; not_understood: string;
};
export type RewardStatus = 'pending' | 'approved' | 'rejected' | 'paid';
export type Reward = {
  id: string; kind: 'daily' | 'weekly' | 'milestone' | 'bonus'; amount: number; ref_date: string | null;
  milestone_id: string | null; category_id: string | null; title: string; status: RewardStatus; note: string;
  created_at: string; approved_at: string | null; paid_at: string | null;
};
export type RewardEvent = { id: number; reward_id: string; from_status: string | null; to_status: string; amount: number; note: string; created_at: string };
export type Notification = { id: string; recipient: Role; title: string; body: string; link: string; read_at: string | null; created_at: string };
export type ProgressUpdate = { id: string; course_id: string; old_progress: number; new_progress: number; note: string; created_at: string };
export type Summary = {
  total_budget: number; approved: number; paid: number; pending: number; earned: number; available: number;
  allocated: number; consistency_pool: number; consistency_used: number;
};
export type TimerState = { running: boolean; started_at: string | null; accumulated_seconds: number; course_id: string | null; server_now: string };

// ---- English journey ----
export type StageStatus = 'locked' | 'available' | 'in_progress' | 'awaiting_review' | 'completed';
export type EnglishStage = {
  id: number; name_ar: string; name_en: string; icon: string; weeks: string; status: StageStatus; paused: boolean;
  target_date: string | null; started_at: string | null; completed_at: string | null; milestone_id: string | null;
  pass_threshold: number; notes: string;
};
export type StageCourse = { stage_id: number; course_id: string; role: 'main' | 'support' | 'review'; sort: number };
export type Objective = { id: string; stage_id: number; text: string; sort: number; done: boolean };
export type Lesson = {
  id: string; stage_id: number; course_id: string | null; title: string; url: string; verified: boolean; sort: number;
  done_at: string | null; done_checkin: string | null; created_at: string;
};
export type WeekPlan = { stage_id: number; dow: number; course_id: string | null; minutes: number; task_text: string };
export type AssessItem = { id: string; stage_id: number; text: string; essential: boolean; sort: number };
export type Assessment = {
  id: string; stage_id: number; status: 'pending' | 'passed' | 'needs_practice'; student_note: string; evidence_links: string[];
  score: number | null; feedback: string; reward_id: string | null; created_at: string; reviewed_at: string | null;
};
export type AssessResult = { assessment_id: string; item_id: string; result: 'passed' | 'needs_improvement' | 'not_reviewed'; note: string };
export type Skill = 'vocabulary' | 'reading' | 'pronunciation' | 'grammar' | 'sentences' | 'listening' | 'speaking' | 'writing';
export type SkillRating = { id: string; skill: Skill; rating: number; is_baseline: boolean; note: string; created_at: string };
export type English = {
  stages: EnglishStage[]; stageCourses: StageCourse[]; objectives: Objective[]; lessons: Lesson[]; plans: WeekPlan[];
  items: AssessItem[]; assessments: Assessment[]; results: AssessResult[]; skills: SkillRating[];
};
