import type { Content, FocusArea, Question } from '../../content/schema';
import { estimateAccuracy, latestPerQuestion } from '../../study/accuracy';
import type { Attempt } from '../../study/types';

export const FOCUS_DRILL_SIZE = 10;

export function focusQuestions(area: FocusArea, questionById: Content['questionById']): Question[] {
  return area.questionIds.map((id) => questionById.get(id)).filter((q): q is Question => Boolean(q));
}

/** How the learner is doing on one area: distinct questions answered and the estimated accuracy (null before any). */
export function focusStat(area: FocusArea, attempts: Attempt[]) {
  const ids = new Set(area.questionIds);
  const mine = attempts.filter((a) => ids.has(a.questionId));
  return { total: ids.size, seen: latestPerQuestion(mine).length, accuracy: estimateAccuracy(mine) };
}
