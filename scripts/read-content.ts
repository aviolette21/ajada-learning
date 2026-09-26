import { readdirSync, readFileSync, statSync } from 'node:fs';
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
  return { domains, files };
}
