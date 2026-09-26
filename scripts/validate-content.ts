import { validateContent } from '../src/content/validate';
import { readContentDir } from './read-content';

const result = validateContent(readContentDir('content'));
if (!result.ok) {
  console.error(`✗ Content invalid (${result.errors.length} problem${result.errors.length === 1 ? '' : 's'}):`);
  for (const e of result.errors) console.error(`  - ${e}`);
  process.exit(1);
}
const c = result.content;
console.log(`✓ Content valid: ${c.domains.length} domains, ${c.questions.length} questions, ${c.cards.length} cards, ${c.lessons.length} lessons`);
