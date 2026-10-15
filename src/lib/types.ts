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
  steps?: Step[];
};

export type Step = { id: string; text: string; done: boolean };

export type Flashcard = { front: string; back: string };

export type CampusCategory = "course" | "event" | "facility" | "faq";

export type CampusEntry = {
  category: CampusCategory;
  title: string;
  details: string;
  tags: string[];
  date?: string;
};

export type AiMode = "ai" | "offline";

export type AiTask = "chat" | "summarize" | "quiz" | "campus" | "flashcards" | "plan" | "breakdown" | "campusDraft";

export type PlannerData = { classes: ClassSession[]; assignments: Assignment[]; now: string };

export type AiResponse = {
  mode: AiMode;
  text?: string;
  quiz?: QuizQuestion[];
  flashcards?: Flashcard[];
  steps?: string[];
  draft?: { details: string; tags: string[] };
  error?: string;
};

export type StoredCampusEntry = CampusEntry & { id: string };

export type Role = "student" | "teacher" | "admin";

export type UserStatus = "active" | "pending";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
} & Profile;

export type Profile = {
  department: string;
  bio: string;
  courses: string[];
  officeHours: string;
  avatarColor: string;
};

export type FormState = { error?: string; success?: string } | undefined;

export type FileRef = { id: string; name: string; size: number; type: string };

type CourseItemBase = { id: string; course: string; title: string; authorId: string; authorName: string; createdAt: string };

export type CourseMaterial = CourseItemBase & { description: string; file?: FileRef; url?: string };

export type CourseAssignment = CourseItemBase & { instructions: string; due: string; points: number; file?: FileRef };

export type Submission = {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  note: string;
  file?: FileRef;
  submittedAt: string;
  grade?: string;
  feedback?: string;
};

export type CourseQuiz = CourseItemBase & { description: string; due?: string; questions: QuizQuestion[] };

export type QuizAttempt = {
  id: string;
  quizId: string;
  studentId: string;
  studentName: string;
  answers: number[];
  score: number;
  total: number;
  submittedAt: string;
};

export type StudentAssignment = CourseAssignment & { submission?: Submission };

export type StudentQuiz = Omit<CourseQuiz, "questions"> & {
  questions: { question: string; options: string[] }[];
  attempt?: QuizAttempt;
  review?: QuizQuestion[];
};

export type StudentCourseWork = { materials: CourseMaterial[]; assignments: StudentAssignment[]; quizzes: StudentQuiz[] };

export type TeacherCourseWork = {
  materials: CourseMaterial[];
  assignments: (CourseAssignment & { submissions: Submission[] })[];
  quizzes: (CourseQuiz & { attempts: QuizAttempt[] })[];
};
