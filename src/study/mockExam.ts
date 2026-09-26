import type { Domain, Question } from '../content/schema';
import { shuffle } from './random';
import { PASS_SCORE, toScaledScore } from './readiness';
import type { Attempt, MockSession } from './types';

export const MOCK_QUESTION_COUNT = 53;
export const MOCK_DURATION_MS = 120 * 60_000;

/** Largest-remainder allocation proportional to weight, then at least one per domain when total allows. */
export function allocate(domains: Pick<Domain, 'id' | 'weight'>[], total: number): Map<string, number> {
  const sumW = domains.reduce((s, d) => s + d.weight, 0);
  const rows = domains.map((d) => {
    const exact = (total * d.weight) / sumW;
    return { id: d.id, weight: d.weight, count: Math.floor(exact), rem: exact - Math.floor(exact) };
  });
  let left = total - rows.reduce((s, r) => s + r.count, 0);
  for (const r of [...rows].sort((a, b) => b.rem - a.rem || b.weight - a.weight)) {
    if (left <= 0) break;
    r.count++;
    left--;
  }
  if (total >= rows.length) {
    for (const r of rows) {
      if (r.count > 0) continue;
      const donor = rows.reduce((max, x) => (x.count > max.count ? x : max));
      donor.count--;
      r.count = 1;
    }
  }
  return new Map(rows.map((r) => [r.id, r.count]));
}

export function buildMockExam(args: {
  id: string;
  domains: Domain[];
  questions: Question[];
  attempts: Attempt[];
  rng: () => number;
  now: number;
}): MockSession {
  const { id, domains, questions, attempts, rng, now } = args;
  const total = Math.min(MOCK_QUESTION_COUNT, questions.length);
  const alloc = allocate(domains, total);
  const seen = new Set(attempts.map((a) => a.questionId));
  const pools = new Map(
    domains.map((d) => {
      const inDomain = questions.filter((q) => q.domainId === d.id);
      return [d.id, [...shuffle(inDomain.filter((q) => !seen.has(q.id)), rng), ...shuffle(inDomain.filter((q) => seen.has(q.id)), rng)]];
    }),
  );

  const picked: Question[] = [];
  let shortfall = 0;
  for (const d of domains) {
    const want = alloc.get(d.id) ?? 0;
    const taken = pools.get(d.id)!.splice(0, want);
    picked.push(...taken);
    shortfall += want - taken.length;
  }
  const byWeight = [...domains].sort((a, b) => b.weight - a.weight);
  while (shortfall > 0) {
    let progressed = false;
    for (const d of byWeight) {
      if (shortfall === 0) break;
      const q = pools.get(d.id)!.shift();
      if (q) {
        picked.push(q);
        shortfall--;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  return {
    id,
    startedAt: now,
    durationMs: MOCK_DURATION_MS,
    questionIds: shuffle(picked, rng).map((q) => q.id),
    answers: {},
    flagged: [],
    currentIndex: 0,
  };
}

export function remainingMs(session: MockSession, now: number): number {
  return Math.max(0, session.startedAt + session.durationMs - now);
}

export interface MockResult {
  correct: number;
  total: number;
  percent: number;
  scaledScore: number;
  passes: boolean;
  byDomain: { domainId: string; correct: number; total: number }[];
}

export function scoreMock(session: MockSession, questionById: Map<string, Question>, domains: Domain[]): MockResult {
  const tally = new Map(domains.map((d) => [d.id, { domainId: d.id, correct: 0, total: 0 }]));
  let correct = 0;
  for (const id of session.questionIds) {
    const q = questionById.get(id);
    if (!q) continue;
    const row = tally.get(q.domainId);
    const right = session.answers[id] === q.answer;
    if (row) {
      row.total++;
      if (right) row.correct++;
    }
    if (right) correct++;
  }
  const total = session.questionIds.length;
  const fraction = total === 0 ? 0 : correct / total;
  const scaledScore = toScaledScore(fraction);
  return {
    correct,
    total,
    percent: Math.round(fraction * 100),
    scaledScore,
    passes: scaledScore >= PASS_SCORE,
    byDomain: [...tally.values()].filter((r) => r.total > 0),
  };
}

export function mockAttempts(session: MockSession, questionById: Map<string, Question>, at: number): Attempt[] {
  return session.questionIds.flatMap((id) => {
    const q = questionById.get(id);
    const chosen = session.answers[id];
    return q && chosen ? [{ questionId: id, chosen, correct: chosen === q.answer, mode: 'mock' as const, at }] : [];
  });
}
