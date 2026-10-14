import type { Content, CourseSection } from '../../content/schema';

/**
 * The section quiz's pool: every question taught by the section's lessons, then the rest of those lessons' sub-skills
 * as fallback while a section's own pool is small.
 */
export function sectionPool(section: CourseSection, content: Pick<Content, 'questions' | 'lessonById'>) {
  const lessonIds = new Set(section.modules.map((m) => m.lessonId));
  const subSkills = new Set(section.modules.map((m) => content.lessonById.get(m.lessonId)?.subSkillId));
  const primary = content.questions.filter((q) => q.lessonId !== undefined && lessonIds.has(q.lessonId));
  const fallback = content.questions.filter((q) => subSkills.has(q.subSkillId));
  return { primary, fallback };
}

export function findSection(content: Pick<Content, 'course'>, sectionId: string): CourseSection | undefined {
  return content.course.find((s) => s.id === sectionId);
}

/** Lesson links opened from the course carry ?from= so Back returns to the course; only course paths are honoured. */
export function courseReturn(from: string | null): string | null {
  return from && /^\/course(\/[a-z0-9-]+)?$/.test(from) ? from : null;
}

