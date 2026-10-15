export function parseCourses(input: string | string[]): string[] {
  const list = Array.isArray(input) ? input : input.split(/[,\n]/);
  return [...new Set(list.map((c) => c.trim().toUpperCase().replace(/\s+/g, "")).filter((c) => c.length > 0 && c.length <= 20))].slice(0, 20);
}

export function sharedCourses(a: string[], b: string[]): string[] {
  return a.filter((c) => b.includes(c));
}
