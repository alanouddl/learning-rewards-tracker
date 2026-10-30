# 🌷 رحلتي — Learning Progress & Rewards Tracker

A private, mobile-first web app where a student tracks her daily study on **external** course
websites. A guardian reviews her progress and approves rewards toward a **3,000 SAR** device goal.

> This is **not** a learning platform. It hosts no lessons or quizzes. Courses open on their own
> websites in a new tab. Progress is reported by the student and checked by the guardian.

- **Stack:** React + TypeScript + Tailwind (Vite) · Supabase (Auth + Postgres + Storage) · GitHub Pages / Netlify / Vercel
- **Language:** Arabic UI with full RTL support. Course titles can be in English.
- **Cost:** free tiers only. No paid APIs, no ads, no trackers. Fonts are bundled with the app.

---

## 1. One-time setup (≈15 minutes)

### A. Create the database (Supabase, free)
1. Create a free account at <https://supabase.com> → **New project**. Pick a strong DB password and a region close to you (e.g. Frankfurt / Mumbai).
2. Open **SQL Editor → New query**, paste the full contents of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. New query again: paste [`supabase/seed.sql`](supabase/seed.sql) → **Run**. This loads the suggested courses, milestones, budget split and weekly schedule.
4. New query again: paste [`supabase/english.sql`](supabase/english.sql) → **Run**. This adds the four-stage ZAmericanEnglish journey (see below).
5. **Authentication → Sign In / Providers → Email**: turn **off** "Allow new users to sign up". Turn off "Confirm email" too if you plan to use username-style logins (see step B).

### B. Create the two accounts (order matters)
In **Authentication → Users → Add user → Create new user** (tick **Auto Confirm User**):

| Order | Account | Example email | Becomes |
|---|---|---|---|
| 1st | You | `you@gmail.com` | **Guardian** 🛡️ |
| 2nd | Your sister | `sara@family.invalid` | **Student** 🌷 |

- The **first** account created becomes the guardian. The **second** becomes the student. Any later account gets no access and sees nothing.
- If the student's email ends in `@family.invalid`, she can log in with just **`sara`** plus her password. No real email address is needed.
- Use strong passwords. You can reset hers later from the same Users screen.

> Created them in the wrong order? Run this in the SQL Editor:
> `update profiles set role = case role when 'guardian' then 'student' else 'guardian' end;`
> (Run it once only. It swaps the two roles.)

### C. Publish the website (GitHub Pages, free)
1. Push this repository to GitHub.
2. Put your Supabase **Project URL** and **anon / public** key in [`.env.production`](.env.production). The anon key is safe to publish; the database rules protect the data.
3. Repo **Settings → Pages → Source: GitHub Actions**.
4. **Actions** tab → "Deploy to GitHub Pages" → **Run workflow** (it also runs on every push to `main`).
5. Your link: `https://<your-github-username>.github.io/<repo-name>/`
6. Back in Supabase: **Authentication → URL Configuration → Site URL** = that link.

**Alternatives:** Netlify or Vercel. Import the repo, build command `npm run build`, output folder `dist`, and `.env.production` is picked up automatically.

### Local development
```bash
cp .env.example .env.local   # fill in the two values
npm install
npm run dev
```

---

## 2. Guardian guide 🛡️

| I want to… | Where |
|---|---|
| **Add / edit / remove a course, paste its link** | **الكورسات** → "+ إضافة كورس", or ✏️ تعديل on a course. Paste the full `https://…` link in "رابط الكورس الخارجي". Use "أرشفة" to hide a course without deleting its history. |
| **Set milestone rewards** | Open a course (✏️) → "مراحل الكورس ومكافآتها" at the bottom. |
| **Split each area's budget between daily consistency and milestones** | **الكورسات** → "توزيع ميزانية 3,000 ر.س". Per area: total, and "للالتزام اليومي" (the part reserved for daily/weekly rewards). |
| **Change the weekly schedule and daily minutes** | **الجدول** → "الجدول الأسبوعي الأساسي". Set 0 minutes for a rest day. |
| **Change the weekly target / daily reward / weekly bonus** | **الجدول** → the three fields under the schedule → "حفظ الجدول والأهداف". |
| **Change one specific date** (holiday, longer session) | **الجدول** → "تعديل يوم محدد". |
| **Create daily / weekly / one-off tasks** | **الجدول** → "المهام اليومية والأسبوعية". |
| **Review what she did today** | **المراجعة**. Each entry shows minutes, what she finished and learned, difficulty, help requests and evidence. Write feedback, then ✅ موافقة or ↩️ إرجاع. |
| **Approve rewards** | Approving a check-in also approves that day's 5 SAR reward, once that day's minutes reach the target. Weekly bonuses and milestones appear under **المكافآت** and on the home page → "موافقة". |
| **Record that you handed her the money** | **المكافآت** → "🎁 تم التسليم" on a reward, or "تسليم كل المعتمد". The app **never moves real money**. |
| **See progress analytics** | **التحليلات**: filter by date range and course. Planned vs actual minutes, weekly consistency, course progress, difficulty, rewards and a timeline. |
| **Change the encouragement message / her display name** | ⚙️ in the header. |

Notifications (🔔) appear when she submits a check-in, asks for help, claims a milestone, requests course completion, or a reward needs approval. The app refreshes every 15 seconds and whenever it is reopened.

## 3. Student guide 🌷
1. Log in → **اليوم** shows today's goal, course and task.
2. Tap **افتحي الكورس** to open the course website in a new tab.
3. Use the timer: **ابدئي → إيقاف مؤقت → استئناف → إنهاء**. It is saved online, so it survives closing the page or switching devices.
4. After **إنهاء**, fill in the short check-in (minutes, what she finished, what she learned, difficulty, help needed, optional screenshots/links). Forgot the timer? Tap **"نسيتي المؤقت؟ سجّلي الوقت يدوياً"**. She can log today or the past 7 days.
5. **كورساتي**: update progress %, mark a milestone **خلصتها!**, or request course completion.
6. **حصالتي**: the savings jar, approved / pending / remaining money, badges, upcoming rewards, history and guardian messages.
7. Missed a day? **أسبوعي** → tap the day → **تعويض** to add a make-up session. There is no penalty for missing a day.

---

## 4. English journey (رحلتي مع الإنجليزية)
Four sequential stages built on the free **ZAmericanEnglish** YouTube courses by Ibrahim Adel. The app hosts no lessons; it organises them, tracks progress, collects evidence and pays the four existing 300 SAR English milestones, so English stays at 1,200 SAR.

| Stage | Courses (Level 1) | Suggested length |
|---|---|---|
| 1. الأساسيات والقراءة والنطق | English From Zero, Reading, Phonetics | 6–8 weeks |
| 2. القواعد وتكوين الجمل | Grammar, plus English From Zero and Reading review | 6–8 weeks |
| 3. الاستماع والمحادثة | Listening, Conversation, plus Grammar review | 8–10 weeks |
| 4. تحدي الإنجليزية النهائي | Review of everything above; no Level 2 | 6–10 weeks |

- **Student** (الإنجليزي tab): sees the roadmap and the current stage, with its objectives, courses, lessons, weekly plan, assessment checklist and skills. Her check-in on an English course adds four questions: the lesson, 3 new words, one sentence, and what she didn't understand. Arabic is fine. When she is ready, she taps **أنا جاهزة للتقييم**.
- **Guardian** (الإنجليزي tab): scores each assessment item as passed, needs improvement or not reviewed, adds a score and feedback, and then either passes the stage (which approves its 300 SAR and unlocks the next stage) or asks for more practice. The guardian also edits stages, objectives, assessment items, stage courses and weekly plans (**تطبيق على الجدول** copies a plan into the weekly schedule), manages playlist links and lessons (including adding many at once), and rates the 8 skills over time, starting from a baseline.
- **Links:** the playlist URLs could not be verified automatically. The confirmed intro video is stored, and each course points to the channel's Playlists page with a **needs verification** badge until the guardian pastes the real playlist link.
- Finishing the journey is not an official CEFR certificate. The guardian decides when she is ready for the next level.

## 5. How rewards are kept honest
- **One budget.** Daily, weekly, milestone and bonus rewards all draw from the same 3,000 SAR. The database refuses any change where *pending + approved + paid* would go over it, or where area allocations would add up to more than it.
- **Shared consistency pool.** Each area reserves a part of its budget for daily consistency. Those parts form one shared pool that pays the 5 SAR/day and 10 SAR/week rewards. The rest of each area pays its milestones. Default split:

  | Area | Total | Daily pool | Milestones |
  |---|---|---|---|
  | English | 1,200 | 0 | 4 × 300 |
  | Programming & Logical Thinking | 500 | 0 | 200 + 300 |
  | Computer & AI Literacy | 400 | 100 | 300 |
  | Financial Literacy | 400 | 100 | 300 |
  | Communication & Confidence | 300 | 100 | 200 |
  | Time Management & Self-Learning | 200 | 100 | 100 |
  | **Total** | **3,000** | **400** | **2,600** |

  400 SAR at 5 SAR/day plus 10 SAR/week (~40 SAR/week) lasts about 10 weeks. Move money between columns in "توزيع ميزانية" to fit your plan.
- **No double counting.** At most one daily reward per date, one weekly bonus per week, and one reward per milestone. Database unique indexes enforce this.
- **Immutable ledger.** Reward amounts cannot be edited or deleted. Every status change (created → approved → paid, or rejected) is added to `reward_events`, which nobody can modify. You can see it in **المكافآت → سجل العمليات الثابت**.
- **Role-based security.** Every table uses row-level security. Money changes happen only through server functions that check you are the guardian. The student cannot approve, pay, edit amounts or change settings, even by calling the API directly.

## 6. Privacy
Two accounts only. No public profiles, chat, social feed or leaderboard. No ads, analytics or trackers. Pages carry `noindex`. Evidence screenshots go to a **private** storage bucket and open only through short-lived signed links. The app stores only a display name, emails and study entries.

## 7. Free-tier limitations
- **Supabase free:** a project is **paused after 7 days without any activity**. Normal daily use keeps it awake. If it pauses, click "Restore" in the dashboard; no data is lost. Limits: 500 MB database and 1 GB file storage, far more than this app needs. Free projects have no automatic backups, so download a backup occasionally (Database → Backups, or `pg_dump`).
- **GitHub Pages:** the site is public on the internet, but it shows nothing without logging in. Free Pages needs a **public** repository (no secrets are stored in it). Use Netlify or Vercel if you want the repo private.
- **Notifications are in-app only** (no SMS, push or email). They appear within about 15 seconds while the app is open.
- **Course progress is self-reported.** The app cannot see activity on the external course websites.

## 8. Tests
- `tests/english.test.mjs`: 38 checks for the English journey (stages, lessons, check-in answers, assessments, rewards, schedule, permissions).
- `tests/api.test.mjs`: 67 checks covering roles, row-level security, the budget cap, no double counting, the ledger, the timer and notifications. **Run it only on an empty test project.** It creates accounts.
- The full workflow was also run in a real browser at phone and desktop sizes: guardian adds course → student opens course → studies with timer → submits check-in → guardian reviews and approves → both dashboards update.
