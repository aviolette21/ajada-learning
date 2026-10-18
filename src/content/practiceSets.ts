import type { PracticeSet, Question } from './schema';

/** A set's items as runner questions: the author's explanation stands in for per-choice reasons and the takeaway. */
export function setQuestions(set: PracticeSet): Question[] {
  return set.questions.map((q) => ({
    id: q.id,
    domainId: q.domainId,
    subSkillId: 'external',
    topic: set.title,
    stem: q.stem,
    choices: q.choices.map((c) => ({ ...c, reason: '' })),
    answer: q.answer,
    takeaway: '',
    explanation: q.explanation,
    difficulty: 'medium',
    source: { url: set.sourceUrl, title: set.sourceTitle, checkedOn: set.checkedOn },
    relatedCardIds: [],
  }));
}
