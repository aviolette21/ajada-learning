import type { Content } from './schema';
import { validateContent, type RawContent } from './validate';

export function rawFromGlob(domains: unknown, modules: Record<string, unknown>): RawContent {
  const files: Record<string, unknown> = {};
  for (const [path, data] of Object.entries(modules)) {
    const m = /content\/([^/]+\/[^/]+\.json)$/.exec(path);
    if (m) files[m[1]] = data;
  }
  return { domains, files };
}

export function loadContent(raw: RawContent): Content {
  const result = validateContent(raw);
  if (!result.ok) throw new Error(`Invalid study content:\n${result.errors.join('\n')}`);
  return result.content;
}
