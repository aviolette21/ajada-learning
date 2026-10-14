import type { Lesson, Question } from '../content/schema';
import { shuffle } from './random';
import type { Attempt } from './types';

export const QUIZ_SIZE = 10;
export const QUIZ_SIZES = [10, 20, 30] as const;

/** The quiz length from the ?n= search param: one of QUIZ_SIZES, else the default. */
export function quizSize(param: string | null): number {
  const n = Number(param);
  return (QUIZ_SIZES as readonly number[]).includes(n) ? n : QUIZ_SIZE;
}

export function pickQuizQuestions(args: {
  questions: Question[];
  attempts: Attempt[];
  domainIds: string[];
  /** Optional: limit to these sub-skills (overrides domainIds). */
  subSkillIds?: string[];
  /** Optional: limit to these questions (overrides everything else). */
  questionIds?: string[];
  count: number;
  rng: () => number;
}): Question[] {
  const { questions, attempts, domainIds, subSkillIds = [], questionIds = [], count, rng } = args;
  const pool = questionIds.length > 0
    ? questions.filter((q) => questionIds.includes(q.id))
    : subSkillIds.length > 0
    ? questions.filter((q) => subSkillIds.includes(q.subSkillId))
    : domainIds.length > 0 ? questions.filter((q) => domainIds.includes(q.domainId)) : questions;
  const seen = new Set(attempts.map((a) => a.questionId));
  return [
    ...shuffle(pool.filter((q) => !seen.has(q.id)), rng),
    ...shuffle(pool.filter((q) => seen.has(q.id)), rng),
  ].slice(0, count);
}

export const LESSON_CHECK_SIZE = 10;
export const SECTION_QUIZ_SIZE = 20;

/**
 * A retakeable quiz: questions never answered come first, then the ones answered longest ago, so each run brings
 * different questions until the pool is used up. Draws from `primary` (the topic's own questions) before `fallback`
 * (the wider sub-skill), and shuffles the result so the order differs each time too.
 */
export function pickRotating(args: {
  primary: Question[];
  fallback?: Question[];
  attempts: Attempt[];
  count: number;
  rng: () => number;
}): Question[] {
  const { primary, fallback = [], attempts, count, rng } = args;
  const lastSeen = new Map<string, number>();
  for (const a of attempts) lastSeen.set(a.questionId, Math.max(a.at, lastSeen.get(a.questionId) ?? -Infinity));
  const byRecency = (qs: Question[]) =>
    shuffle(qs, rng).sort((a, b) => (lastSeen.get(a.id) ?? -Infinity) - (lastSeen.get(b.id) ?? -Infinity));
  const own = byRecency(primary).slice(0, count);
  const ownIds = new Set(primary.map((q) => q.id));
  const fill = byRecency(fallback.filter((q) => !ownIds.has(q.id))).slice(0, count - own.length);
  return shuffle([...own, ...fill], rng);
}

/** A lesson's own questions (linked by lessonId or as a check question) and the rest of its sub-skill as fallback. */
export function lessonPool(lesson: Pick<Lesson, 'id' | 'subSkillId' | 'checkQuestionIds'>, questions: Question[]) {
  const checks = new Set(lesson.checkQuestionIds);
  const primary = questions.filter((q) => q.lessonId === lesson.id || checks.has(q.id));
  const fallback = questions.filter((q) => q.subSkillId === lesson.subSkillId);
  return { primary, fallback };
}
