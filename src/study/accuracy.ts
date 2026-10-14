import type { Question } from '../content/schema';
import type { Attempt } from './types';

/**
 * Scores start from a neutral prior so a few lucky answers can't read as mastery: every area begins as if
 * PRIOR_ANSWERS questions had been answered at PRIOR_ACCURACY, and real answers gradually outweigh that.
 * 3/3 right reads 62%, 10/10 reads 75%, 30 answered at 80% reads 72%.
 */
export const PRIOR_ACCURACY = 0.5;
export const PRIOR_ANSWERS = 10;

/** Credit for one attempt: a right answer the learner marked as a guess earns half. */
export function credit(a: Attempt): number {
  return a.correct ? (a.confident === false ? 0.5 : 1) : 0;
}

/** The most recent attempt at each question, so re-answering a question replaces the old result. */
export function latestPerQuestion(attempts: Attempt[]): Attempt[] {
  const latest = new Map<string, Attempt>();
  for (const a of attempts) {
    const prev = latest.get(a.questionId);
    if (!prev || a.at >= prev.at) latest.set(a.questionId, a);
  }
  return [...latest.values()];
}

/** Estimated accuracy from the latest answer to each question, pulled toward the prior; null before any answer. */
export function estimateAccuracy(attempts: Attempt[]): number | null {
  const latest = latestPerQuestion(attempts);
  if (latest.length === 0) return null;
  const earned = latest.reduce((s, a) => s + credit(a), 0);
  return (earned + PRIOR_ACCURACY * PRIOR_ANSWERS) / (latest.length + PRIOR_ANSWERS);
}

/** answered: distinct questions answered; accuracy: the estimate above. */
export interface GroupStat { total: number; correct: number; answered: number; accuracy: number | null }

export function accuracyBy(
  attempts: Attempt[],
  questionById: Map<string, Question>,
  key: 'domainId' | 'subSkillId',
): Map<string, GroupStat> {
  const groups = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const q = questionById.get(a.questionId);
    if (!q) continue;
    const list = groups.get(q[key]) ?? [];
    list.push(a);
    groups.set(q[key], list);
  }
  const out = new Map<string, GroupStat>();
  for (const [id, list] of groups) {
    out.set(id, {
      total: list.length, correct: list.filter((a) => a.correct).length,
      answered: latestPerQuestion(list).length, accuracy: estimateAccuracy(list),
    });
  }
  return out;
}
