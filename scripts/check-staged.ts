/**
 * Validates a staged question file against the committed bank without touching content/:
 *   npx tsx scripts/check-staged.ts content-staging/<slice>.json
 * The staged file is a JSON array of questions. A question whose id already exists replaces that question (a revision of
 * an existing item; the id never changes); any other is appended to its domain's questions.json, all in memory.
 */
import { readFileSync } from 'node:fs';
import { validateContent } from '../src/content/validate';
import { readContentDir } from './read-content';

const file = process.argv[2];
if (!file) {
  console.error('usage: npx tsx scripts/check-staged.ts <staged.json>');
  process.exit(2);
}
const staged = JSON.parse(readFileSync(file, 'utf8')) as { id?: string; domainId?: string; subSkillId?: string; answer?: unknown; difficulty?: string }[];
const raw = readContentDir('content');
for (const q of staged) {
  const key = `${q.domainId}/questions.json`;
  if (!(key in raw.files)) {
    console.error(`✗ ${q.id}: unknown domainId "${q.domainId}"`);
    process.exit(1);
  }
  const list = raw.files[key] as { id: string }[];
  const at = list.findIndex((x) => x.id === q.id);
  if (at >= 0) list[at] = q as { id: string };
  else list.push(q as { id: string });
}
const result = validateContent(raw);
if (!result.ok) {
  console.error(`✗ ${result.errors.length} problem(s):\n  - ${result.errors.join('\n  - ')}`);
  process.exit(1);
}
const tally = (f: (q: (typeof staged)[number]) => string) =>
  JSON.stringify(staged.reduce<Record<string, number>>((m, q) => ({ ...m, [f(q)]: (m[f(q)] ?? 0) + 1 }), {}));
const all = (result.content.questions);
const longest = (q: (typeof all)[number]) => {
  const max = Math.max(...q.choices.map((c) => c.text.length));
  const ids = Array.isArray(q.answer) ? q.answer : [q.answer];
  return q.choices.some((c) => ids.includes(c.id) && c.text.length === max);
};
const stagedIds = new Set(staged.map((q) => q.id));
const mine = all.filter((q) => stagedIds.has(q.id));
console.log(`✓ ${staged.length} staged questions valid alongside the bank`);
console.log(`  correct choice is the longest: ${mine.filter(longest).length}/${mine.length} (aim ≤ 1/3)`);
console.log(`  by sub-skill: ${tally((q) => q.subSkillId ?? '?')}`);
console.log(`  answer keys:  ${tally((q) => (Array.isArray(q.answer) ? 'multi' : String(q.answer)))}`);
console.log(`  difficulty:   ${tally((q) => q.difficulty ?? '?')}`);
