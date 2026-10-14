import type { Question } from '../content/schema';
import { accuracyBy } from './accuracy';
import { shuffle } from './random';
import type { Attempt } from './types';

export const TODAY_QUESTION_COUNT = 15;

/** A miss is a wrong answer or a right one the learner only guessed. */
export function isMiss(a: Attempt): boolean {
  return !a.correct || a.confident === false;
}

/** Sure, right answers on this many different days after the last miss take a question off the mistakes pile. */
export const MASTERY_DAYS = 2;
const dayKey = (at: number) => new Date(at).toDateString();

/**
 * The mistakes pile: every question missed (or guessed) at some point and not yet mastered since its latest miss,
 * most recently missed first.
 */
export function missedQuestionIds(attempts: Attempt[]): string[] {
  const byQuestion = new Map<string, Attempt[]>();
  for (const a of attempts) byQuestion.set(a.questionId, [...(byQuestion.get(a.questionId) ?? []), a]);
  const pile: { id: string; at: number }[] = [];
  for (const [id, list] of byQuestion) {
    const sorted = [...list].sort((a, b) => a.at - b.at);
    const lastMiss = sorted.findLast(isMiss);
    if (!lastMiss) continue;
    const goodDays = new Set(sorted.filter((a) => a.at > lastMiss.at && !isMiss(a)).map((a) => dayKey(a.at)));
    if (goodDays.size < MASTERY_DAYS) pile.push({ id, at: lastMiss.at });
  }
  return pile.sort((a, b) => b.at - a.at).map((p) => p.id);
}

export function weakSubSkills(attempts: Attempt[], questionById: Map<string, Question>, limit = 3): string[] {
  return [...accuracyBy(attempts, questionById, 'subSkillId').entries()]
    .filter(([, s]) => s.accuracy !== null)
    .sort(([, a], [, b]) => a.accuracy! - b.accuracy! || a.total - b.total)
    .slice(0, limit)
    .map(([id]) => id);
}

export function pickWeakQuestions(args: {
  attempts: Attempt[];
  questions: Question[];
  questionById: Map<string, Question>;
  count: number;
  rng: () => number;
}): Question[] {
  const { attempts, questions, questionById, count, rng } = args;
  const picked: Question[] = [];
  const used = new Set<string>();
  const take = (q: Question) => {
    if (picked.length < count && !used.has(q.id)) {
      picked.push(q);
      used.add(q.id);
    }
  };
  for (const id of missedQuestionIds(attempts)) {
    const q = questionById.get(id);
    if (q) take(q);
  }
  const seen = new Set(attempts.map((a) => a.questionId));
  const weak = new Set(weakSubSkills(attempts, questionById));
  const inWeak = shuffle(questions.filter((q) => weak.has(q.subSkillId)), rng);
  [...inWeak.filter((q) => !seen.has(q.id)), ...inWeak.filter((q) => seen.has(q.id))].forEach(take);
  shuffle(questions.filter((q) => !seen.has(q.id)), rng).forEach(take);
  shuffle(questions, rng).forEach(take);
  return picked;
}
