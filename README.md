# CampusAI

All-in-one student dashboard built with Next.js, TypeScript, and Tailwind.

- **Overview**: today's classes, upcoming deadlines, campus events, and stats.
- **Study Assistant**: chat, note summarizer, and quiz generator.
- **Campus Helper**: Q&A plus a browsable list of courses, events, facilities, and FAQs (`src/lib/campus-data.ts`).
- **Planner**: weekly timetable, assignments with priorities, and deadline reminders (browser notifications).

- **Accounts**: one login page for students, teachers, and admins, each sent to their own portal. Sign-up offers "I'm a student" or "I'm a teacher". Teacher accounts stay pending until an admin approves them.
- **Teacher portal** (`/teacher`): courses, and students matched by shared course codes, with their profiles.
- **Course workspace** (`/teacher/course/<CODE>`): teachers post materials (PDFs, slides, docs, images or links), assignments with due dates and optional attachments, and multiple-choice quizzes (written by hand or drafted by AI from notes). They review submissions, grade with feedback, and see quiz scores. Students see their courses' content in the **My courses** tab, submit work, and take auto-graded quizzes; open course deadlines also show on the Overview and Planner.
- **Admin panel** (`/admin`): stats, teacher approvals, user management (create users, set roles, edit details), and a campus content editor.
- **Profiles** (`/profile`): department, bio, courses, office hours, and password change.

**Storage.** With `SUPABASE_DB_URL` set, accounts, campus content, course content and each user's planner/chats/flashcards are stored in Supabase Postgres (tables are created on first request, with row-level security on and no policies, so the public REST API can't read them). With `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, uploads (max 10 MB) go straight from the browser to a private Supabase Storage bucket through signed upload URLs, and downloads go through `/api/files/[id]`, which checks that the user teaches or is enrolled in the course. Without these variables, everything falls back to local files (`data/db.json`, `data/user-data.json`, `data/uploads/`), which is fine for development but won't persist on serverless hosts. Planner data is cached in localStorage and synced to the account, so it follows the user across devices.

Default admin login: `admin@campusai.edu` / `admin12345` (override with `ADMIN_EMAIL` / `ADMIN_PASSWORD` before first run).

## Deploying to Vercel

1. Create a Supabase project and import this repo in Vercel.
2. Set environment variables: `SUPABASE_DB_URL` (pooler connection string), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET` (long random string), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optionally `AI_API_KEY`.
3. Deploy. The first request creates the tables, the storage bucket and the admin account.

## Running locally

```bash
npm install
cp .env.local.example .env.local   # optional: add AI_API_KEY
npm run dev
```

Set `AI_API_KEY` to a free **Groq** (`gsk_...`) or **Gemini** (`AIza...`) key, or an OpenAI key; the provider is detected from the key. `AI_MODEL` and `AI_BASE_URL` let you point it at any OpenAI-compatible API. Without a key, the AI features run in **offline mode**: summaries, flashcards, quizzes, study plans, step breakdowns and campus answers are generated locally, and the chat answers questions about your planner and gives preset study tips.

### AI features
- **Study chat** that knows your timetable and deadlines ("What's due this week?")
- **Notes**: summaries, flashcards, and quizzes
- **AI study plan**: a 7-day plan built around your classes and deadlines (Planner tab)
- **Break down**: splits an assignment into a checklist of steps
- **Campus helper** answering from admin-managed campus content
- **Admin AI writer**: drafts campus entry details and tags from a title
