import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { RawContent } from '../src/content/validate';

export function readContentDir(dir: string): RawContent {
  const domains: unknown = JSON.parse(readFileSync(join(dir, 'domains.json'), 'utf8'));
  const files: Record<string, unknown> = {};
  for (const entry of readdirSync(dir).sort()) {
    const sub = join(dir, entry);
    if (!statSync(sub).isDirectory()) continue;
    for (const name of readdirSync(sub).sort()) {
      if (name.endsWith('.json')) files[`${entry}/${name}`] = JSON.parse(readFileSync(join(sub, name), 'utf8'));
    }
  }
  const glossaryPath = join(dir, 'glossary.json');
  const glossary: unknown = existsSync(glossaryPath) ? JSON.parse(readFileSync(glossaryPath, 'utf8')) : undefined;
  const coursePath = join(dir, 'course.json');
  const course: unknown = existsSync(coursePath) ? JSON.parse(readFileSync(coursePath, 'utf8')) : undefined;
  const focusPath = join(dir, 'focus.json');
  const focus: unknown = existsSync(focusPath) ? JSON.parse(readFileSync(focusPath, 'utf8')) : undefined;
  return { domains, glossary, course, focus, files };
}
