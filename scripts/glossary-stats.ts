/**
 * How often each glossary term would be underlined across the question bank:
 *   npx tsx scripts/glossary-stats.ts
 * Terms that match a large share of questions are too generic to be useful; terms that match none may be dead weight.
 */
import { buildTermMatcher } from '../src/content/terms';
import { validateContent } from '../src/content/validate';
import { readContentDir } from './read-content';

const result = validateContent(readContentDir('content'));
if (!result.ok) {
  console.error(result.errors.join('\n'));
  process.exit(1);
}
const { questions, glossary } = result.content;
const matcher = buildTermMatcher(glossary);
const hits = new Map(glossary.map((t) => [t.id, 0]));
let questionsWithTerms = 0;
for (const q of questions) {
  const seen = new Set<string>();
  for (const text of [q.stem, ...q.choices.flatMap((c) => [c.text, c.reason]), q.takeaway]) {
    for (const part of text.split(/(`[^`]+`)/)) {
      if (part.startsWith('`')) {
        const id = matcher.codeTerm(part.slice(1, -1));
        if (id) seen.add(id);
      } else matcher.split(part, seen);
    }
  }
  for (const id of seen) hits.set(id, (hits.get(id) ?? 0) + 1);
  if (seen.size > 0) questionsWithTerms++;
}
const rows = [...hits.entries()].sort((a, b) => b[1] - a[1]);
const share = (n: number) => `${Math.round((100 * n) / questions.length)}%`;
console.log(`${glossary.length} terms; ${questionsWithTerms}/${questions.length} questions have at least one underlined term.`);
console.log('Most frequent:');
for (const [id, n] of rows.slice(0, 20)) console.log(`  ${share(n).padStart(4)}  ${n}  ${id}`);
const unused = rows.filter(([, n]) => n === 0).map(([id]) => id);
console.log(`Unused (${unused.length}): ${unused.join(', ')}`);
