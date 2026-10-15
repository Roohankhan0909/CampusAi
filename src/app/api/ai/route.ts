import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { CAMPUS_NAME, campusContext } from "@/lib/campus-data";
import { campusAnswer, makeFlashcards, makeQuiz, offlineBreakdown, offlineStudyPlan, offlineStudyReply, plannerAnswer, summarize } from "@/lib/fallback";
import { complete, completeJson, getProvider } from "@/lib/llm";
import { plannerContext, toLocalInput } from "@/lib/planner";
import type { AiResponse, AiTask, Assignment, CampusCategory, CampusEntry, ChatMessage, ClassSession, Flashcard, PlannerData, Priority, QuizQuestion } from "@/lib/types";

type Body = {
  task?: AiTask;
  input?: string;
  messages?: ChatMessage[];
  count?: number;
  planner?: unknown;
  category?: string;
};

type Req = { task: AiTask; input: string; messages: ChatMessage[]; count: number; planner: PlannerData; campus: CampusEntry[]; category: CampusCategory };

const TASKS: AiTask[] = ["chat", "summarize", "quiz", "campus", "flashcards", "plan", "breakdown", "campusDraft"];
const CATEGORIES: CampusCategory[] = ["course", "event", "facility", "faq"];
const MAX_INPUT = 20000;
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : "");

function parsePlanner(raw: unknown): PlannerData {
  const p = (raw ?? {}) as Partial<Record<keyof PlannerData, unknown>>;
  const classes: ClassSession[] = (Array.isArray(p.classes) ? p.classes : []).slice(0, 100).map((c) => ({
    id: str(c?.id, 40),
    course: str(c?.course),
    day: Math.min(Math.max(Number(c?.day) || 0, 0), 6),
    start: str(c?.start, 5),
    end: str(c?.end, 5),
    location: str(c?.location),
  }));
  const assignments: Assignment[] = (Array.isArray(p.assignments) ? p.assignments : []).slice(0, 200).map((a) => ({
    id: str(a?.id, 40),
    title: str(a?.title),
    course: str(a?.course),
    due: str(a?.due, 16),
    priority: (["low", "medium", "high"].includes(a?.priority) ? a.priority : "medium") as Priority,
    done: Boolean(a?.done),
    steps: (Array.isArray(a?.steps) ? a.steps : []).slice(0, 20).map((s: { id?: unknown; text?: unknown; done?: unknown }) => ({ id: str(s?.id, 40), text: str(s?.text), done: Boolean(s?.done) })),
  }));
  const now = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(str(p.now, 16)) ? str(p.now, 16) : toLocalInput(new Date());
  return { classes, assignments, now };
}

function isQuiz(value: unknown): value is QuizQuestion[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (q) =>
        typeof q?.question === "string" &&
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        Number.isInteger(q.answer) &&
        q.answer >= 0 &&
        q.answer < q.options.length,
    )
  );
}

const isCards = (v: unknown): v is Flashcard[] => Array.isArray(v) && v.length > 0 && v.every((c) => typeof c?.front === "string" && typeof c?.back === "string");
const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === "string");

const STYLE = "Keep answers concise and use plain text with • bullets, no markdown (no #, **, or tables).";
const STUDY_SYSTEM = `You are CampusAI, a friendly study assistant for university students. Explain concepts clearly with examples. ${STYLE}`;

async function runWithLlm({ task, input, messages, count, planner, campus, category }: Req): Promise<AiResponse> {
  const ctx = plannerContext(planner);
  switch (task) {
    case "chat":
      return {
        mode: "ai",
        text: await complete([
          { role: "system", content: `${STUDY_SYSTEM}\nYou can see the student's planner below. Use it when they ask about their schedule, deadlines, or what to work on; otherwise just answer the question.\n\n${ctx}` },
          ...messages,
        ]),
      };
    case "campus":
      return {
        mode: "ai",
        text: await complete([
          {
            role: "system",
            content: `You are the campus helper for ${CAMPUS_NAME}. Today is ${new Date().toDateString()}. Answer only using the campus information below; if the answer isn't there, say so and suggest who to contact. ${STYLE}\n\n${campusContext(campus)}`,
          },
          ...messages,
        ]),
      };
    case "summarize":
      return {
        mode: "ai",
        text: await complete([
          { role: "system", content: STUDY_SYSTEM },
          { role: "user", content: `Summarize these notes into a short overview, key points as bullets (•), and a list of key terms with one-line definitions.\n\n${input}` },
        ]),
      };
    case "quiz": {
      const data = (await completeJson([
        { role: "system", content: STUDY_SYSTEM },
        {
          role: "user",
          content: `Create ${count} multiple-choice questions testing understanding of these notes. Respond with JSON only: {"questions":[{"question":string,"options":[4 strings],"answer":index of correct option,"explanation":string}]}\n\n${input}`,
        },
      ])) as { questions?: unknown };
      if (!isQuiz(data?.questions)) throw new Error("Invalid quiz format from LLM");
      return { mode: "ai", quiz: data.questions.slice(0, count) };
    }
    case "flashcards": {
      const data = (await completeJson([
        { role: "system", content: STUDY_SYSTEM },
        {
          role: "user",
          content: `Create ${count} flashcards covering the most important facts and concepts in these notes. Fronts are short questions or terms; backs are clear answers in 1-2 sentences. Respond with JSON only: {"cards":[{"front":string,"back":string}]}\n\n${input}`,
        },
      ])) as { cards?: unknown };
      if (!isCards(data?.cards)) throw new Error("Invalid flashcards from LLM");
      return { mode: "ai", flashcards: data.cards.slice(0, count) };
    }
    case "plan":
      return {
        mode: "ai",
        text: await complete([
          {
            role: "system",
            content: `You are CampusAI, a study coach. Build a realistic 7-day study plan starting today. Schedule study blocks around the student's classes, prioritise by due date and priority, split big tasks into sessions, finish work before deadlines, and include short breaks. Format: one section per day like "Today (Mon 12 Oct)" followed by • time range: task lines. End with 2-3 short tips. ${STYLE}`,
          },
          { role: "user", content: `${ctx}${input.trim() ? `\n\nMy preferences: ${input}` : ""}` },
        ]),
      };
    case "breakdown": {
      const data = (await completeJson([
        { role: "system", content: "You help university students break assignments into small, concrete, actionable steps." },
        { role: "user", content: `Break this assignment into 4-7 steps, each under 12 words, in the order to do them. Respond with JSON only: {"steps":[string]}\n\nAssignment: ${input}` },
      ])) as { steps?: unknown };
      if (!isStrings(data?.steps)) throw new Error("Invalid steps from LLM");
      return { mode: "ai", steps: data.steps.slice(0, 8) };
    }
    case "campusDraft": {
      const data = (await completeJson([
        { role: "system", content: `You write clear, friendly entries for the ${CAMPUS_NAME} campus information directory used by students.` },
        {
          role: "user",
          content: `Write a campus ${category} entry titled "${input}". Details should be 2-4 sentences with practical info students need (e.g. location, hours, how to sign up, who to contact). Use realistic placeholders in [brackets] for facts you don't know. Also give 3-6 lowercase search tags. Respond with JSON only: {"details":string,"tags":[string]}`,
        },
      ])) as { details?: unknown; tags?: unknown };
      if (typeof data?.details !== "string") throw new Error("Invalid draft from LLM");
      return { mode: "ai", draft: { details: data.details, tags: isStrings(data.tags) ? data.tags.slice(0, 8) : [] } };
    }
  }
}

function runOffline({ task, input, messages, count, planner, campus }: Req): AiResponse {
  const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  switch (task) {
    case "chat":
      return { mode: "offline", text: plannerAnswer(last, planner) ?? offlineStudyReply(last) };
    case "campus":
      return { mode: "offline", text: campusAnswer(last, campus) };
    case "summarize":
      return { mode: "offline", text: summarize(input) };
    case "quiz":
      return { mode: "offline", quiz: makeQuiz(input, count) };
    case "flashcards":
      return { mode: "offline", flashcards: makeFlashcards(input, count) };
    case "plan":
      return { mode: "offline", text: offlineStudyPlan(planner) };
    case "breakdown":
      return { mode: "offline", steps: offlineBreakdown(input) };
    case "campusDraft":
      return { mode: "offline", error: "The AI writer needs an AI key. Ask the site owner to set AI_API_KEY." };
  }
}

const fail = (error: string, status: number) => NextResponse.json({ mode: "offline", error } satisfies AiResponse, { status });

export async function GET() {
  const provider = getProvider();
  return NextResponse.json({ mode: provider ? "ai" : "offline", provider: provider?.name ?? null });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Please log in.", 401);
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON", 400);
  }

  const task = body.task;
  if (!task || !TASKS.includes(task)) return fail("Unknown task", 400);
  if (task === "campusDraft" && user.role !== "admin") return fail("Admins only.", 403);

  const input = (body.input ?? "").slice(0, MAX_INPUT);
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_INPUT) }));
  const count = Math.min(Math.max(Number(body.count) || 5, 1), task === "flashcards" ? 20 : 10);

  if (["summarize", "quiz", "flashcards"].includes(task) && input.trim().length < 20) return fail("Please paste more notes (at least a couple of sentences).", 400);
  if ((task === "breakdown" || task === "campusDraft") && input.trim().length < 3) return fail("Please enter a title first.", 400);
  if ((task === "chat" || task === "campus") && messages.length === 0) return fail("No message provided", 400);

  const request: Req = {
    task,
    input,
    messages,
    count,
    planner: parsePlanner(body.planner),
    campus: task === "campus" ? (await readDb()).campus : [],
    category: CATEGORIES.includes(body.category as CampusCategory) ? (body.category as CampusCategory) : "faq",
  };

  if (getProvider()) {
    try {
      return NextResponse.json(await runWithLlm(request));
    } catch (err) {
      console.error("AI call failed, using offline mode:", err);
    }
  }
  const result = runOffline(request);
  return result.error ? fail(result.error, 503) : NextResponse.json(result);
}
