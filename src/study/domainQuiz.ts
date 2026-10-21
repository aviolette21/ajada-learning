import type { Question } from '../content/schema';
import { latestPerQuestion } from './accuracy';
import { pickRotating } from './quiz';
import type { Attempt } from './types';

export const DOMAIN_QUIZ_SIZE = 25;
/** Questions written for the per-domain quizzes (scenario items in the exam's style) carry this id prefix. */
export const DOMAIN_QUIZ_PREFIX = 'q-dq-';

export const isDomainQuizQuestion = (q: Pick<Question, 'id'>) => q.id.startsWith(DOMAIN_QUIZ_PREFIX);

/** A domain's own quiz questions. */
export function domainQuizPool(questions: Question[], domainId: string): Question[] {
  return questions.filter((q) => q.domainId === domainId && isDomainQuizQuestion(q));
}

/**
 * One run of a domain quiz: its own scenario questions in a fresh order, topped up from the rest of the domain
 * (unseen first) if there are fewer than DOMAIN_QUIZ_SIZE.
 */
export function pickDomainQuiz(args: { questions: Question[]; attempts: Attempt[]; domainId: string; rng: () => number }): Question[] {
  const { questions, attempts, domainId, rng } = args;
  return pickRotating({
    primary: domainQuizPool(questions, domainId),
    fallback: questions.filter((q) => q.domainId === domainId),
    attempts,
    count: DOMAIN_QUIZ_SIZE,
    rng,
  });
}

/** How the learner's latest answer to each of a domain's quiz questions went. */
export function domainQuizStat(questions: Question[], attempts: Attempt[], domainId: string) {
  const ids = new Set(domainQuizPool(questions, domainId).map((q) => q.id));
  const latest = latestPerQuestion(attempts.filter((a) => ids.has(a.questionId)));
  return { total: ids.size, seen: latest.length, right: latest.filter((a) => a.correct).length };
}
