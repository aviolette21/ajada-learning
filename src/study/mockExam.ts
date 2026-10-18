import { chosenIds, isCorrect } from '../content/answers';
import type { Domain, Question } from '../content/schema';
import { shuffle } from './random';
import { PASS_SCORE, toScaledScore } from './readiness';
import type { Attempt, MockSession } from './types';

export const MOCK_QUESTION_COUNT = 53;
/** Stored on each session for backup compatibility; mock exams are no longer timed. */
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

/** Every sub-skill with its exam weight; one without a published weight shares what's left of its domain's. */
export function subSkillWeights(domains: Domain[]): { id: string; domainId: string; weight: number }[] {
  return domains.flatMap((d) => {
    const weighted = d.subSkills.filter((s) => s.weight !== undefined);
    const rest = Math.max(0, d.weight - weighted.reduce((s, x) => s + (x.weight ?? 0), 0));
    const unweighted = d.subSkills.length - weighted.length;
    return d.subSkills.map((s) => ({ id: s.id, domainId: d.id, weight: s.weight ?? rest / unweighted }));
  });
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
  // Allocate by sub-skill, not just domain: the exam weights each skill, and the bank's share of a domain's questions
  // doesn't match them (an exam puts far more on SWE foundations than on the systems life cycle, say).
  const skills = subSkillWeights(domains);
  const alloc = allocate(skills, total);
  const seen = new Set(attempts.map((a) => a.questionId));
  const byRecency = (qs: Question[]) => [...shuffle(qs.filter((q) => !seen.has(q.id)), rng), ...shuffle(qs.filter((q) => seen.has(q.id)), rng)];
  const pools = new Map(skills.map((s) => [s.id, byRecency(questions.filter((q) => q.subSkillId === s.id))]));

  const picked: Question[] = [];
  const domainShortfall = new Map<string, number>();
  for (const s of skills) {
    const want = alloc.get(s.id) ?? 0;
    const taken = pools.get(s.id)!.splice(0, want);
    picked.push(...taken);
    domainShortfall.set(s.domainId, (domainShortfall.get(s.domainId) ?? 0) + want - taken.length);
  }
  // A short sub-skill borrows from the rest of its domain first, so the per-domain mix on the score report holds.
  let shortfall = 0;
  for (const d of domains) {
    let need = domainShortfall.get(d.id) ?? 0;
    const rest = byRecency(skills.filter((s) => s.domainId === d.id).flatMap((s) => pools.get(s.id)!));
    for (const q of rest) {
      if (need === 0) break;
      picked.push(q);
      pools.get(q.subSkillId)!.splice(pools.get(q.subSkillId)!.indexOf(q), 1);
      need--;
    }
    shortfall += need;
  }
  const byWeight = [...domains].sort((a, b) => b.weight - a.weight);
  while (shortfall > 0) {
    let progressed = false;
    for (const d of byWeight) {
      if (shortfall === 0) break;
      const q = skills.filter((s) => s.domainId === d.id).map((s) => pools.get(s.id)!.shift()).find(Boolean);
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
    const right = isCorrect(q, session.answers[id]);
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

/** Questions to retry after an exam: answered wrong, left unanswered, or right only by a marked guess. */
export function mockRetryIds(session: MockSession, questionById: Map<string, Question>): string[] {
  return session.questionIds.filter((id) => {
    const q = questionById.get(id);
    return q !== undefined && (!isCorrect(q, session.answers[id]) || (session.guessed?.includes(id) ?? false));
  });
}

export function mockAttempts(session: MockSession, questionById: Map<string, Question>, at: number): Attempt[] {
  return session.questionIds.flatMap((id) => {
    const q = questionById.get(id);
    const chosen = session.answers[id];
    const guessed = session.guessed?.includes(id) ?? false;
    return q && chosenIds(chosen).length > 0
      ? [{ questionId: id, chosen, correct: isCorrect(q, chosen), ...(guessed ? { confident: false } : {}), mode: 'mock' as const, at }]
      : [];
  });
}
