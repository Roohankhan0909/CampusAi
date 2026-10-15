import type { CampusEntry } from "./types";

// Sample data used to seed the campus knowledge base. Admins can edit it in the admin panel.
export const CAMPUS_NAME = "CampusAI University";

export const campusEntries: CampusEntry[] = [
  { category: "course", title: "CS101 Intro to Programming", details: "Fundamentals of programming in Python: variables, control flow, functions, and basic data structures. 4 credits, no prerequisites. Mon & Wed 9:00-10:30, Engineering 204. Instructor: Dr. Patel.", tags: ["computer science", "python", "coding", "programming"] },
  { category: "course", title: "MATH201 Linear Algebra", details: "Vectors, matrices, linear transformations, eigenvalues. 3 credits. Prerequisite: MATH101. Mon & Fri 13:00-14:30, Science Hall 110. Instructor: Prof. Nguyen.", tags: ["math", "matrices", "algebra"] },
  { category: "course", title: "ENG150 Academic Writing", details: "Research, argumentation, and citation for university-level essays. 3 credits. Tue 11:00-12:30, Humanities 3B. Instructor: Dr. Okafor.", tags: ["english", "writing", "essay"] },
  { category: "course", title: "PHY110 Physics I", details: "Mechanics: kinematics, Newton's laws, energy, momentum. 4 credits with weekly lab. Thu 10:00-11:30, Science Hall 220.", tags: ["physics", "mechanics", "lab"] },
  { category: "facility", title: "Central Library", details: "Open Mon-Thu 7:00-24:00, Fri 7:00-20:00, Sat-Sun 10:00-22:00. Quiet floors 3-4, group study rooms bookable online for up to 3 hours. Printing on floor 1.", tags: ["library", "study", "books", "printing", "hours", "study room"] },
  { category: "facility", title: "Student Health Center", details: "Located in the Wellness Building. Walk-ins Mon-Fri 8:30-17:00. Free counseling sessions for enrolled students; book via the student portal. Emergency: call campus security at 555-0100.", tags: ["health", "doctor", "medical", "counseling", "mental health", "clinic"] },
  { category: "facility", title: "Dining Hall", details: "Main dining in the Student Union, open daily 7:00-21:00. Vegetarian, vegan, and halal options available. Meal plans accepted; card payments at all counters.", tags: ["food", "dining", "cafeteria", "eat", "lunch", "halal", "vegan"] },
  { category: "facility", title: "Recreation Center", details: "Gym, pool, and courts. Open 6:00-23:00 weekdays, 8:00-20:00 weekends. Free with student ID. Fitness classes posted weekly.", tags: ["gym", "sports", "fitness", "pool", "exercise"] },
  { category: "facility", title: "IT Help Desk", details: "Library floor 1. Help with Wi-Fi, student email, password resets, and software licenses. Mon-Fri 8:00-18:00. Wi-Fi network: Campus-Secure (log in with student ID).", tags: ["wifi", "internet", "password", "email", "computer", "it", "tech support"] },
  { category: "facility", title: "Career Services", details: "Student Union room 210. Resume reviews, mock interviews, and internship listings. Drop-in hours Tue & Thu 13:00-16:00.", tags: ["career", "jobs", "internship", "resume", "cv", "interview"] },
  { category: "event", title: "Career Fair", details: "50+ employers recruiting for internships and graduate roles. Bring printed resumes. Student Union Ballroom, 10:00-16:00.", tags: ["career", "jobs", "internship", "fair"], date: "2026-10-21" },
  { category: "event", title: "Hackathon: Build with AI", details: "24-hour hackathon open to all majors. Teams of up to 4, prizes and free food. Engineering Atrium, starts 18:00.", tags: ["hackathon", "coding", "ai", "competition"], date: "2026-10-30" },
  { category: "event", title: "Midterm Study Night", details: "Extended library hours until 2:00 with free coffee and peer tutors for math, physics, and CS.", tags: ["exam", "midterm", "study", "tutoring", "library"], date: "2026-10-16" },
  { category: "event", title: "International Food Festival", details: "Food stalls from student cultural societies. Main Quad, 12:00-17:00.", tags: ["food", "culture", "festival", "social"], date: "2026-11-07" },
  { category: "faq", title: "How do I register for courses?", details: "Log in to the student portal > Registration > Add Courses. Registration for next term opens November 10. Contact the Registrar (Admin Building, room 101) for overrides.", tags: ["registration", "enroll", "add course", "drop course", "registrar"] },
  { category: "faq", title: "Where can I get tutoring?", details: "Free peer tutoring at the Learning Center (Library floor 2), Mon-Thu 14:00-20:00. Book a slot through the student portal or walk in.", tags: ["tutor", "tutoring", "help", "learning center"] },
  { category: "faq", title: "When are exams?", details: "Midterms run October 19-23. Final exams run December 7-16. Exam timetables are published in the student portal two weeks before.", tags: ["exam", "midterm", "final", "schedule", "test"] },
  { category: "faq", title: "How do I get my student ID card?", details: "Visit Student Services in the Admin Building with a photo ID. Replacement cards cost $15.", tags: ["id card", "student card", "lost card"] },
];

export function campusContext(entries: CampusEntry[]): string {
  return entries
    .map((e) => `[${e.category}] ${e.title}${e.date ? ` (${e.date})` : ""}: ${e.details}`)
    .join("\n");
}
