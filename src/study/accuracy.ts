import type { Question } from '../content/schema';
import type { Attempt } from './types';

export const RECENCY_DECAY = 0.9;

/** Accuracy where the newest attempt has weight 1, the next 0.9, then 0.81, … */
export function weightedAccuracy(attempts: Attempt[]): number | null {
  if (attempts.length === 0) return null;
  const newestFirst = [...attempts].sort((a, b) => b.at - a.at);
  let num = 0, den = 0;
  newestFirst.forEach((a, i) => {
    const w = RECENCY_DECAY ** i;
    den += w;
    if (a.correct) num += w;
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
