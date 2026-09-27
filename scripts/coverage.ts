import type { Content } from '../src/content/schema';
import { SUBSKILL_TARGETS } from './content-targets';

export interface CoverageRow {
  domainId: string; subSkillId: string; questions: number; cards: number; lessons: number; targetQuestions: number; targetCards: number;
}

export function coverage(content: Content, targets: Record<string, { domainId: string; questions: number; cards: number }> = SUBSKILL_TARGETS): CoverageRow[] {
  return content.domains.flatMap((d) =>
    d.subSkills.map((s) => {
      const count = (items: { subSkillId: string; domainId: string }[]) => items.filter((i) => i.domainId === d.id && i.subSkillId === s.id).length;
      const t = targets[s.id] ?? { questions: 0, cards: 0 };
      return {
        domainId: d.id, subSkillId: s.id,
        questions: count(content.questions), cards: count(content.cards), lessons: count(content.lessons),
        targetQuestions: t.questions, targetCards: t.cards,
      };
    }),
  );
}

export function coverageGaps(rows: CoverageRow[]): string[] {
  return rows.flatMap((r) => {
    const key = `${r.domainId}/${r.subSkillId}`;
    const out: string[] = [];
    if (r.questions < r.targetQuestions) out.push(`${key}: questions ${r.questions}/${r.targetQuestions}`);
    if (r.cards < r.targetCards) out.push(`${key}: cards ${r.cards}/${r.targetCards}`);
    if (r.lessons === 0) out.push(`${key}: no lesson`);
    return out;
  });
}
