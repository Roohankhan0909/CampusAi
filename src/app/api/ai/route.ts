import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { CAMPUS_NAME, campusContext } from "@/lib/campus-data";
import { campusAnswer, makeQuiz, offlineStudyReply, summarize } from "@/lib/fallback";
import type { AiResponse, AiTask, CampusEntry, ChatMessage, QuizQuestion } from "@/lib/types";

type Body = {
  task?: AiTask;
  input?: string;
  messages?: ChatMessage[];
  count?: number;
};

const MAX_INPUT = 20000;
const hasKey = () => Boolean(process.env.OPENAI_API_KEY);

async function openai(messages: { role: string; content: string }[], json = false): Promise<string> {
  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      temperature: 0.4,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`LLM request failed (${res.status})`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
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

const STUDY_SYSTEM =
  "You are CampusAI, a friendly study assistant for university students. Explain concepts clearly with examples, keep answers concise, and use plain-text bullet points (•) instead of markdown.";

async function runWithLlm(task: AiTask, input: string, messages: ChatMessage[], count: number, campus: CampusEntry[]): Promise<AiResponse> {
  switch (task) {
    case "chat":
      return { mode: "openai", text: await openai([{ role: "system", content: STUDY_SYSTEM }, ...messages]) };
    case "campus":
      return {
        mode: "openai",
        text: await openai([
          {
            role: "system",
            content: `You are the campus helper for ${CAMPUS_NAME}. Today is ${new Date().toDateString()}. Answer only using the campus information below; if the answer isn't there, say so and suggest who to contact. Use plain text, no markdown.\n\n${campusContext(campus)}`,
          },
          ...messages,
        ]),
      };
    case "summarize":
      return {
        mode: "openai",
        text: await openai([
          { role: "system", content: STUDY_SYSTEM },
          { role: "user", content: `Summarize these notes into a short overview, key points as bullets (•), and a list of key terms with one-line definitions.\n\n${input}` },
        ]),
      };
    case "quiz": {
      const raw = await openai(
        [
          { role: "system", content: STUDY_SYSTEM },
          {
            role: "user",
            content: `Create ${count} multiple-choice questions testing understanding of these notes. Respond with JSON: {"questions":[{"question":string,"options":[4 strings],"answer":index of correct option,"explanation":string}]}\n\n${input}`,
          },
        ],
        true,
      );
      const quiz = JSON.parse(raw)?.questions;
      if (!isQuiz(quiz)) throw new Error("Invalid quiz format from LLM");
      return { mode: "openai", quiz: quiz.slice(0, count) };
    }
  }
}

function runOffline(task: AiTask, input: string, messages: ChatMessage[], count: number, campus: CampusEntry[]): AiResponse {
  const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  switch (task) {
    case "chat":
      return { mode: "offline", text: offlineStudyReply(last) };
    case "campus":
      return { mode: "offline", text: campusAnswer(last, campus) };
    case "summarize":
      return { mode: "offline", text: summarize(input) };
    case "quiz":
      return { mode: "offline", quiz: makeQuiz(input, count) };
  }
}

export async function GET() {
  return NextResponse.json({ mode: hasKey() ? "openai" : "offline" });
}

export async function POST(req: Request) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ mode: "offline", error: "Please log in." } satisfies AiResponse, { status: 401 });
  }
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ mode: "offline", error: "Invalid JSON" } satisfies AiResponse, { status: 400 });
  }

  const task = body.task;
  if (!task || !["chat", "summarize", "quiz", "campus"].includes(task)) {
    return NextResponse.json({ mode: "offline", error: "Unknown task" } satisfies AiResponse, { status: 400 });
  }

  const input = (body.input ?? "").slice(0, MAX_INPUT);
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_INPUT) }));
  const count = Math.min(Math.max(Number(body.count) || 5, 1), 10);

  if ((task === "summarize" || task === "quiz") && input.trim().length < 20) {
    return NextResponse.json({ mode: "offline", error: "Please paste more notes (at least a couple of sentences)." } satisfies AiResponse, { status: 400 });
  }
  if ((task === "chat" || task === "campus") && messages.length === 0) {
    return NextResponse.json({ mode: "offline", error: "No message provided" } satisfies AiResponse, { status: 400 });
  }

  const campus = task === "campus" ? (await readDb()).campus : [];
  if (hasKey()) {
    try {
      return NextResponse.json(await runWithLlm(task, input, messages, count, campus));
    } catch (err) {
      console.error("LLM call failed, using offline mode:", err);
    }
  }
  return NextResponse.json(runOffline(task, input, messages, count, campus));
}
