import type { Question } from '../content/schema';
import type { Attempt } from './types';

export const RECENCY_DECAY = 0.9;

/** Credit for one attempt: a right answer the learner marked as a guess earns half. */
export function credit(a: Attempt): number {
  return a.correct ? (a.confident === false ? 0.5 : 1) : 0;
}

/** Accuracy where the newest attempt has weight 1, the next 0.9, then 0.81, …; guessed right answers count half. */
export function weightedAccuracy(attempts: Attempt[]): number | null {
  if (attempts.length === 0) return null;
  const newestFirst = [...attempts].sort((a, b) => b.at - a.at);
  let num = 0, den = 0;
  newestFirst.forEach((a, i) => {
    const w = RECENCY_DECAY ** i;
    den += w;
    num += w * credit(a);
  });
  return num / den;
}

export interface GroupStat { total: number; correct: number; accuracy: number | null }

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
    out.set(id, { total: list.length, correct: list.filter((a) => a.correct).length, accuracy: weightedAccuracy(list) });
  }
  return out;
}
