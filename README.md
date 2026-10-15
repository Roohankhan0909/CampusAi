# CampusAI

All-in-one student dashboard built with Next.js, TypeScript, and Tailwind.

- **Overview**: today's classes, upcoming deadlines, campus events, and stats.
- **Study Assistant**: chat, note summarizer, and quiz generator.
- **Campus Helper**: Q&A plus a browsable list of courses, events, facilities, and FAQs (`src/lib/campus-data.ts`).
- **Planner**: weekly timetable, assignments with priorities, and deadline reminders (browser notifications).

- **Accounts**: one login page for students, teachers, and admins, each sent to their own portal. Sign-up offers "I'm a student" or "I'm a teacher". Teacher accounts stay pending until an admin approves them.
- **Teacher portal** (`/teacher`): courses, and students matched by shared course codes, with their profiles.
- **Admin panel** (`/admin`): stats, teacher approvals, user management (create users, set roles, edit details), and a campus content editor.
- **Profiles** (`/profile`): department, bio, courses, office hours, and password change.

Accounts and campus content are stored in `data/db.json` (created on first run, gitignored). Planner data and chats are stored per user in the browser's localStorage.

Default admin login: `admin@campusai.edu` / `admin12345` (override with `ADMIN_EMAIL` / `ADMIN_PASSWORD` before first run). The JSON file store won't persist on serverless hosts like Vercel; switch to a real database before deploying.

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
