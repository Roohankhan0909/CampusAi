# CampusAI

All-in-one student dashboard built with Next.js, TypeScript, and Tailwind.

- **Overview**: today's classes, upcoming deadlines, campus events, and stats.
- **Study Assistant**: chat, note summarizer, and quiz generator.
- **Campus Helper**: Q&A plus a browsable list of courses, events, facilities, and FAQs (`src/lib/campus-data.ts`).
- **Planner**: weekly timetable, assignments with priorities, and deadline reminders (browser notifications).

Data is stored in the browser's localStorage.

## Running locally

```bash
npm install
cp .env.local.example .env.local   # optional: add OPENAI_API_KEY
npm run dev
```

If `OPENAI_API_KEY` isn't set, the AI features run in **offline mode**: summaries, quizzes, and campus answers are generated locally, and the chat gives preset study tips. `OPENAI_BASE_URL` and `OPENAI_MODEL` let you point it at any OpenAI-compatible API.
