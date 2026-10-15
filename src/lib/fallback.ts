import { DAYS, dueStatus, formatDateTime, relativeTime, sortByDue, toLocalDate } from "./planner";
import type { CampusEntry, Flashcard, PlannerData, QuizQuestion } from "./types";

// Lightweight offline "AI" used when no LLM API key is configured.

const STOP = new Set(
  "a an the and or but if then of to in on at for with by from as is are was were be been being this that these those it its into than so such can could will would should may might must do does did have has had not no yes you your we our they their he she his her i me my what which who whom whose when where why how about also more most other some any each all both few many much very just only over under again further once there here up down out get got tell please know need want like use uses used using make makes made take takes took occur occurs mainly often usually such".split(
    " ",
  ),
);

export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z][a-z0-9'-]*/g) ?? [];
}

const stem = (w: string) => (w.length > 4 ? w.replace(/(ing|es|s)$/, "") : w);

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(" ").length >= 4);
}

function wordFreq(text: string): Map<string, number> {
  const freq = new Map<string, number>();
  for (const w of tokenize(text)) {
    if (!STOP.has(w) && w.length > 2 && !w.endsWith("ly")) freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return freq;
}

function rankSentences(text: string) {
  const freq = wordFreq(text);
  const max = Math.max(1, ...freq.values());
  return splitSentences(text).map((s, i) => {
    const words = tokenize(s).filter((w) => freq.has(w));
    const score = words.reduce((sum, w) => sum + (freq.get(w) ?? 0) / max, 0) / Math.sqrt(words.length || 1);
    return { s, i, score };
  });
}

export function topTerms(text: string, n: number): string[] {
  return [...wordFreq(text).entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, n)
    .map(([w]) => w);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function summarize(text: string): string {
  const ranked = rankSentences(text);
  if (ranked.length === 0) return "Paste a few full sentences of notes and I'll summarize them.";
  const n = Math.min(ranked.length, 7, Math.max(2, Math.round(ranked.length * 0.3)));
  const top = [...ranked]
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .sort((a, b) => a.i - b.i);
  return `Summary\n${top.map((t) => `• ${t.s}`).join("\n")}\n\nKey terms: ${topTerms(text, 8).join(", ")}`;
}

export function makeQuiz(text: string, count: number): QuizQuestion[] {
  const freq = wordFreq(text);
  const terms = topTerms(text, 40).filter((t) => t.length > 3);
  const ranked = rankSentences(text).sort((a, b) => b.score - a.score);
  const used = new Set<string>();
  const quiz: QuizQuestion[] = [];

  for (const { s } of ranked) {
    if (quiz.length >= count) break;
    const answer = tokenize(s)
      .filter((w) => freq.has(w) && w.length > 3 && !used.has(w))
      .sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0) || b.length - a.length)[0];
    if (!answer) continue;
    const lower = s.toLowerCase();
    const distractors = shuffle(terms.filter((t) => t !== answer && !lower.includes(t))).slice(0, 3);
    if (distractors.length < 1) continue;
    used.add(answer);
    const blanked = s.replace(new RegExp(`\\b${answer.replace(/[-']/g, "\\$&")}\\b`, "i"), "_____");
    const options = shuffle([answer, ...distractors]);
    quiz.push({
      question: `Fill in the blank: ${blanked}`,
      options,
      answer: options.indexOf(answer),
      explanation: s,
    });
  }
  return quiz;
}

export function searchCampus(query: string, entries: CampusEntry[]): CampusEntry[] {
  const q = tokenize(query).filter((w) => !STOP.has(w)).map(stem);
  if (q.length === 0) return [];
  const scored = entries.map((e) => {
    const title = tokenize(e.title).map(stem);
    const tags = tokenize(e.tags.join(" ")).map(stem);
    const details = tokenize(e.details).map(stem);
    let score = 0;
    for (const w of q) {
      if (title.includes(w)) score += 3;
      if (tags.includes(w)) score += 2;
      if (details.includes(w)) score += 1;
    }
    return { e, score };
  });
  const best = Math.max(0, ...scored.map((s) => s.score));
  return scored
    .filter((s) => s.score > 0 && s.score >= best / 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.e);
}

const LABELS: Record<CampusEntry["category"], string> = {
  course: "Course",
  event: "Event",
  facility: "Facility",
  faq: "FAQ",
};

export function campusAnswer(question: string, entries: CampusEntry[]): string {
  const results = searchCampus(question, entries);
  if (results.length === 0) {
    return "I couldn't find that in the campus info. Try asking about courses, exams, the library, dining, health services, IT help, or upcoming events.";
  }
  return `Here's what I found:\n\n${results
    .map((e) => `${e.title} (${LABELS[e.category]}${e.date ? `, ${e.date}` : ""})\n${e.details}`)
    .join("\n\n")}`;
}

const STUDY_TIPS: { keys: string[]; reply: string }[] = [
  { keys: ["exam", "test", "midterm", "final"], reply: "Exam prep plan:\n• Start 1-2 weeks out and list every topic on the syllabus.\n• Do past papers under timed conditions.\n• Use active recall: close the notes and explain each topic out loud.\n• Review weak topics daily in short sessions (spaced repetition).\n• Sleep well the night before; cramming hurts recall." },
  { keys: ["focus", "procrastinat", "distract", "motivat"], reply: "Try the Pomodoro technique: 25 minutes of focused work, 5 minute break, and a longer break every 4 rounds. Put your phone in another room, and start with a 2-minute version of the task to get going." },
  { keys: ["memor", "remember", "forget", "flashcard"], reply: "To remember more: use active recall (quiz yourself instead of re-reading) and spaced repetition (review after 1 day, 3 days, 1 week). Paste your notes into the Quiz tab to generate practice questions." },
  { keys: ["time", "schedule", "plan", "busy", "deadline"], reply: "Time management tips:\n• Add every deadline to the Planner tab.\n• Break big assignments into small tasks with their own dates.\n• Time-block your week around your classes.\n• Tackle high-priority tasks when your energy is highest." },
  { keys: ["essay", "write", "writing", "paper"], reply: "Essay workflow: 1) Write a one-sentence thesis. 2) Outline 3-4 supporting points with evidence. 3) Write a rough draft fast, without editing. 4) Revise for structure, then for clarity, then proofread. The Writing Center and Learning Center offer free reviews." },
  { keys: ["stress", "anxious", "anxiety", "overwhelm", "burnout", "tired"], reply: "Feeling overwhelmed is common. Take breaks, sleep, eat properly, and talk to someone. The Student Health Center offers free counseling for enrolled students; you can book through the student portal." },
];

export function offlineStudyReply(message: string): string {
  if (message.length > 400) {
    return `That looks like notes. Here's a quick summary:\n\n${summarize(message)}`;
  }
  const lower = message.toLowerCase();
  const tip = STUDY_TIPS.find((t) => t.keys.some((k) => lower.includes(k)));
  if (tip) return tip.reply;
  return "I'm running in offline mode, so open-ended answers are limited. I can still:\n• Give study tips (try asking about exams, focus, memory, essays, or time management)\n• Summarize notes (Summarize tab)\n• Generate practice quizzes (Quiz tab)\n\nAsk me what's due this week or what classes you have today. Add a free Groq or Gemini key (AI_API_KEY) to enable full AI chat.";
}

export function makeFlashcards(text: string, count: number): Flashcard[] {
  const freq = wordFreq(text);
  const ranked = rankSentences(text).sort((a, b) => b.score - a.score);
  const cards: Flashcard[] = [];
  const used = new Set<string>();
  for (const { s } of ranked) {
    if (cards.length >= count) break;
    const def = s.match(/^(.{3,60}?)\s+(is|are|refers to|means)\s+(.+)$/i);
    if (def && !used.has(def[1].toLowerCase())) {
      used.add(def[1].toLowerCase());
      const verb = def[2].toLowerCase() === "are" ? "are" : "is";
      cards.push({ front: `What ${verb} ${def[1].replace(/^(the|a|an)\s+/i, "").replace(/^./, (c) => c.toLowerCase())}?`, back: s });
      continue;
    }
    const term = tokenize(s)
      .filter((w) => freq.has(w) && w.length > 3 && !used.has(w))
      .sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0))[0];
    if (!term || /^(it|this|that|they|these|those)\b/i.test(s)) continue;
    used.add(term);
    const re = new RegExp(`\\b${term.replace(/[-']/g, "\\$&")}\\b`, "i");
    cards.push({ front: s.replace(re, "_____"), back: `${s.match(re)?.[0] ?? term}\n\n${s}` });
  }
  return cards;
}

const dayMs = 86400000;

export function plannerAnswer(question: string, data: PlannerData): string | null {
  const q = question.toLowerCase();
  const now = new Date(data.now);
  const nowMs = now.getTime();
  const pending = sortByDue(data.assignments.filter((a) => !a.done));
  const fmt = (list: typeof pending) => list.map((a) => `• ${a.title}${a.course ? ` (${a.course})` : ""}: ${formatDateTime(a.due)}, ${relativeTime(a.due, nowMs)}`).join("\n");

  if (/overdue|late|missed/.test(q)) {
    const list = pending.filter((a) => dueStatus(a, nowMs) === "overdue");
    return list.length ? `Overdue:\n${fmt(list)}` : "Nothing is overdue. Nice work!";
  }
  if (/due|deadline|assignment|homework|task|week|tomorrow|next/.test(q) && !/class|lecture/.test(q)) {
    const horizon = /tomorrow/.test(q) ? 2 : /today/.test(q) ? 1 : 7;
    const list = pending.filter((a) => new Date(a.due).getTime() - nowMs <= horizon * dayMs);
    const label = horizon === 1 ? "today" : horizon === 2 ? "by tomorrow" : "in the next 7 days";
    return list.length ? `Due ${label}:\n${fmt(list)}` : `Nothing due ${label}.${pending[0] ? ` Next up: ${pending[0].title}, ${relativeTime(pending[0].due, nowMs)}.` : ""}`;
  }
  if (/class|lecture|schedule|timetable|today|tomorrow/.test(q)) {
    const day = /tomorrow/.test(q) ? (now.getDay() + 1) % 7 : now.getDay();
    const list = data.classes.filter((c) => c.day === day).sort((a, b) => a.start.localeCompare(b.start));
    return list.length
      ? `Classes on ${DAYS[day]}:\n${list.map((c) => `• ${c.start}-${c.end} ${c.course}${c.location ? `, ${c.location}` : ""}`).join("\n")}`
      : `No classes on ${DAYS[day]}.`;
  }
  return null;
}

const SESSIONS = { high: 3, medium: 2, low: 1 } as const;

export function offlineStudyPlan(data: PlannerData): string {
  const now = new Date(data.now);
  const pending = sortByDue(data.assignments.filter((a) => !a.done)).filter((a) => new Date(a.due).getTime() > now.getTime());
  if (pending.length === 0) return "You have no upcoming assignments. Use this week to review notes from each class and make flashcards.";
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    return { date: toLocalDate(d), day: d.getDay(), tasks: [] as string[] };
  });
  for (const a of pending) {
    const dueDate = a.due.slice(0, 10);
    const avail = days.filter((d) => d.date < dueDate || (d.date === dueDate && Number(a.due.slice(11, 13)) >= 18));
    const slots = avail.length ? avail : [days[0]];
    const n = Math.min(SESSIONS[a.priority], slots.length);
    for (let i = 0; i < n; i++) {
      const target = [...slots].sort((x, y) => x.tasks.length - y.tasks.length)[0];
      const step = a.steps?.filter((s) => !s.done)[i]?.text;
      target.tasks.push(`${a.title}${a.course ? ` (${a.course})` : ""}${step ? `: ${step}` : ""}`);
    }
  }
  return `Your 7-day study plan\n\n${days
    .map((d, i) => {
      const classes = data.classes.filter((c) => c.day === d.day).sort((a, b) => a.end.localeCompare(b.end));
      const after = classes.length ? `after ${classes[classes.length - 1].end}` : "any time";
      const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : DAYS[d.day];
      return `${label} (${d.date}), ${classes.length} class${classes.length === 1 ? "" : "es"}, study ${after}\n${d.tasks.length ? d.tasks.map((t) => `• 45 min: ${t}`).join("\n") : "• Free: light review or rest"}`;
    })
    .join("\n\n")}\n\nTip: high-priority tasks get 3 sessions, medium 2, low 1. Finish each task a day early.`;
}

const STEP_TEMPLATES: { keys: string[]; steps: string[] }[] = [
  { keys: ["essay", "paper", "report", "draft", "write"], steps: ["Re-read the prompt and rubric", "Research and collect 3-5 sources", "Write a one-sentence thesis", "Outline main points with evidence", "Write the rough draft", "Revise structure and argument", "Proofread and format citations"] },
  { keys: ["lab", "code", "program", "project"], steps: ["Read the requirements carefully", "Set up files and environment", "Build the simplest working version", "Add remaining features", "Test edge cases", "Clean up and comment code", "Write up results and submit"] },
  { keys: ["problem", "set", "homework", "exercise", "worksheet"], steps: ["Skim all problems and mark the hard ones", "Review relevant lecture notes and examples", "Solve the easier problems first", "Work through the hard problems", "Check answers and units", "Write up neatly and submit"] },
  { keys: ["exam", "test", "midterm", "final", "quiz"], steps: ["List all topics covered", "Rate your confidence on each topic", "Review weak topics with notes", "Make flashcards for key terms", "Do practice questions or past papers", "Final light review the day before"] },
  { keys: ["read", "chapter", "article"], steps: ["Skim headings and summary", "Read actively and take notes", "Write a short summary", "List questions to ask in class"] },
  { keys: ["presentation", "slides", "talk"], steps: ["Define the main message", "Research and outline", "Build slides", "Write speaker notes", "Rehearse twice with a timer"] },
];

export function offlineBreakdown(title: string): string[] {
  const lower = title.toLowerCase();
  return (STEP_TEMPLATES.find((t) => t.keys.some((k) => lower.includes(k))) ?? { steps: ["Clarify what's required", "Gather materials and notes", "Do the first half", "Do the second half", "Review and submit"] }).steps;
}
