import type { Question } from '../content/schema';
import { accuracyBy } from './accuracy';
import { shuffle } from './random';
import type { Attempt } from './types';

export const TODAY_QUESTION_COUNT = 10;

export function missedQuestionIds(attempts: Attempt[]): string[] {
  const latest = new Map<string, Attempt>();
  for (const a of attempts) {
    const prev = latest.get(a.questionId);
    if (!prev || a.at >= prev.at) latest.set(a.questionId, a);
  }
  return [...latest.values()].filter((a) => !a.correct).sort((a, b) => b.at - a.at).map((a) => a.questionId);
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
