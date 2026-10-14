/**
 * Validates staged course content against the committed bank, and with --write merges it in:
 *   npx tsx scripts/merge-staged.ts content-staging/<slice> [more slices…] [--write]
 * Each slice folder may hold questions.json, lessons.json and glossary.json (JSON arrays). Questions and lessons are
 * appended to their domain's files; glossary terms to content/glossary.json. An id that already exists is an error.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateContent } from '../src/content/validate';
import { readContentDir } from './read-content';

const args = process.argv.slice(2);
const write = args.includes('--write');
const dirs = args.filter((a) => a !== '--write');
if (dirs.length === 0) {
  console.error('usage: npx tsx scripts/merge-staged.ts <slice-dir>… [--write]');
  process.exit(2);
}
type Item = { id: string; domainId?: string };
const read = (dir: string, name: string): Item[] => (existsSync(join(dir, name)) ? JSON.parse(readFileSync(join(dir, name), 'utf8')) : []);

const raw = readContentDir('content');
const glossary = (raw.glossary ?? []) as Item[];
const touched = new Set<string>();
const counts = { questions: 0, lessons: 0, glossary: 0 };
for (const dir of dirs) {
  for (const kind of ['questions', 'lessons'] as const) {
    for (const item of read(dir, `${kind}.json`)) {
      const key = `${item.domainId}/${kind}.json`;
      if (!(key in raw.files)) raw.files[key] = [];
      (raw.files[key] as Item[]).push(item);
      touched.add(key);
      counts[kind]++;
    }
  }
  for (const t of read(dir, 'glossary.json')) {
    glossary.push(t);
    counts.glossary++;
  }
}
raw.glossary = glossary;
const result = validateContent(raw);
if (!result.ok) {
  console.error(`✗ ${result.errors.length} problem(s):\n  - ${result.errors.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✓ valid: +${counts.questions} questions, +${counts.lessons} lessons, +${counts.glossary} glossary terms`);
if (write) {
  for (const key of touched) writeFileSync(join('content', key), `${JSON.stringify(raw.files[key], null, 2)}\n`);
  if (counts.glossary) writeFileSync('content/glossary.json', `${JSON.stringify(glossary, null, 2)}\n`);
  console.log('  merged into content/');
}
