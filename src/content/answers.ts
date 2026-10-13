import type { ChoiceId, Chosen, Question } from './schema';

/** The ids that make up a fully correct response, in choice order. */
export function correctIds(q: Question): ChoiceId[] {
  return typeof q.answer === 'string' ? [q.answer] : q.answer;
}

export function isMultiple(q: Question): boolean {
  return typeof q.answer !== 'string';
}

/** How many choices the learner must pick. */
export function selectCount(q: Question): number {
  return correctIds(q).length;
}

export function chosenIds(chosen: Chosen | null | undefined): ChoiceId[] {
  if (chosen == null) return [];
  return typeof chosen === 'string' ? [chosen] : chosen;
}

/** All-or-nothing, like the exam: every correct choice picked and nothing else. */
export function isCorrect(q: Question, chosen: Chosen | null | undefined): boolean {
  const want = correctIds(q);
  const got = chosenIds(chosen);
  return got.length === want.length && want.every((id) => got.includes(id));
}

/** A response is complete once it has as many picks as the question asks for. */
export function isAnswered(q: Question, chosen: Chosen | null | undefined): boolean {
  return chosenIds(chosen).length === selectCount(q);
}

const WORDS = ['', 'ONE', 'TWO', 'THREE'];
export function selectInstruction(q: Question): string {
  const n = selectCount(q);
  return `Select ${WORDS[n] ?? n}.`;
}

/** "B", "B and D", "A, C and E" */
export function formatIds(ids: ChoiceId[]): string {
  const up = ids.map((id) => id.toUpperCase());
  return up.length <= 1 ? up.join('') : `${up.slice(0, -1).join(', ')} and ${up[up.length - 1]}`;
}
