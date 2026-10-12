export type ChatMessage = { role: "user" | "assistant"; content: string };

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
};

export type ClassSession = {
  id: string;
  course: string;
  day: number;
  start: string;
  end: string;
  location: string;
};

export type Priority = "low" | "medium" | "high";

export type Assignment = {
  id: string;
  title: string;
  course: string;
  due: string;
  priority: Priority;
  done: boolean;
};

export type CampusCategory = "course" | "event" | "facility" | "faq";

export type CampusEntry = {
  category: CampusCategory;
  title: string;
  details: string;
  tags: string[];
  date?: string;
};

export type AiMode = "openai" | "offline";

export type AiTask = "chat" | "summarize" | "quiz" | "campus";

export type AiResponse = {
  mode: AiMode;
  text?: string;
  quiz?: QuizQuestion[];
  error?: string;
};
