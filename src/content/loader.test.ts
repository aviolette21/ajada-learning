import { describe, expect, it } from 'vitest';
import { fixtureRaw } from './fixtures';
import { loadContent, rawFromGlob } from './loader';

describe('rawFromGlob', () => {
  it('maps glob paths to domain/file keys', () => {
    const raw = rawFromGlob(['d'], {
      '../../content/alpha/questions.json': [1],
      '../../content/beta/cards.json': [2],
    });
    expect(raw).toEqual({ domains: ['d'], files: { 'alpha/questions.json': [1], 'beta/cards.json': [2] } });
  });
});

describe('loadContent', () => {
  it('returns indexed content for valid input', () => {
    expect(loadContent(fixtureRaw()).questions).toHaveLength(4);
  });
  it('throws with every problem listed', () => {
    const raw = fixtureRaw();
    (raw.files['beta/cards.json'] as { source?: unknown }[])[0].source = undefined;
    expect(() => loadContent(raw)).toThrow(/Invalid study content[\s\S]*beta\/cards\.json: 0\.source/);
  });
});

describe('bundled content', () => {
  it('loads the real content folder', async () => {
    const { content } = await import('./index');
    expect(content.domains).toHaveLength(8);
    expect(content.domains.reduce((s, d) => s + d.weight, 0)).toBeCloseTo(100, 1);
    expect(content.questions.length).toBeGreaterThanOrEqual(14);
    expect(content.cards.length).toBeGreaterThanOrEqual(14);
  });
});
