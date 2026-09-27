import { validateContent } from '../src/content/validate';
import { coverage, coverageGaps } from './coverage';
import { readContentDir } from './read-content';

const result = validateContent(readContentDir('content'));
if (!result.ok) {
  console.error(result.errors.join('\n'));
  process.exit(1);
}
const rows = coverage(result.content);
console.table(rows.map((r) => ({ subSkill: `${r.domainId}/${r.subSkillId}`, q: `${r.questions}/${r.targetQuestions}`, cards: `${r.cards}/${r.targetCards}`, lessons: r.lessons })));
const t = (k: 'questions' | 'cards') => rows.reduce((s, r) => s + r[k], 0);
console.log(`Totals: ${t('questions')} questions, ${t('cards')} cards, ${result.content.lessons.length} lessons`);
const gaps = coverageGaps(rows);
if (process.argv.includes('--check') && gaps.length > 0) {
  console.error(`✗ ${gaps.length} coverage gap(s):\n  - ${gaps.join('\n  - ')}`);
  process.exit(1);
}
