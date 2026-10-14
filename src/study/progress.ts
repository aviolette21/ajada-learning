import type { Domain, Question } from '../content/schema';
import { accuracyBy } from './accuracy';
import type { Attempt } from './types';

export interface SubSkillProgress {
  domainId: string;
  subSkillId: string;
  name: string;
  /** Share of the whole exam, in percent. */
  weight: number;
  /** Recency-weighted accuracy (guesses count half), or null before any answer. */
  accuracy: number | null;
  seen: number;
  total: number;
  /** Exam percentage points likely lost here: weight × (1 − accuracy); the full weight while untested. */
  atStake: number;
}

export function subSkillProgress(domains: Domain[], questions: Question[], attempts: Attempt[], questionById: Map<string, Question>): SubSkillProgress[] {
  const stats = accuracyBy(attempts, questionById, 'subSkillId');
  const seenIds = new Set(attempts.map((a) => a.questionId));
  return domains.flatMap((d) =>
    d.subSkills.map((s) => {
      const inSkill = questions.filter((q) => q.domainId === d.id && q.subSkillId === s.id);
      const accuracy = stats.get(s.id)?.accuracy ?? null;
      const weight = s.weight ?? 0;
      return {
        domainId: d.id, subSkillId: s.id, name: s.name, weight, accuracy,
        seen: inSkill.filter((q) => seenIds.has(q.id)).length, total: inSkill.length,
        atStake: weight * (1 - (accuracy ?? 0)),
      };
    }),
  );
}

/** The sub-skills worth the most exam points right now, biggest first. */
export function focusNext(rows: SubSkillProgress[], limit = 5): SubSkillProgress[] {
  return [...rows].sort((a, b) => b.atStake - a.atStake).slice(0, limit);
}
