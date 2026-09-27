import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// jsdom has no layout or safe-area insets, so guard the iOS home-indicator padding at the source.
const css = readFileSync(join(process.cwd(), 'src/features/practice/practice.css'), 'utf8');
const rule = (selector: string) => css.match(new RegExp(`^${selector.replaceAll('.', '\.')} \{([^}]*)\}`, 'm'))?.[1] ?? '';

describe('practice.css safe-area padding', () => {
  it('keeps runner content clear of the home indicator', () => {
    expect(rule('.runner')).toContain('calc(var(--safe-bottom) + 32px)');
    expect(rule('.runner.has-sheet')).toContain('padding-bottom: 64vh');
  });
  it('keeps the session summary clear of the home indicator', () => {
    expect(rule('.summary')).toMatch(/padding:[^;]*var\(--safe-bottom\)/);
  });
});
