import { describe, expect, it } from 'vitest';
import { fixtureRaw } from './fixtures';
import { validateContent, type ValidationResult } from './validate';

type Loose = { domains: any; files: Record<string, any> };

function mutate(fn: (raw: Loose) => void): ValidationResult {
  const raw = structuredClone(fixtureRaw()) as Loose;
  fn(raw);
  return validateContent(raw);
}
const errorText = (r: ValidationResult) => (r.ok ? '' : r.errors.join('\n'));

describe('validateContent', () => {
  it('accepts valid content and indexes it', () => {
    const r = validateContent(fixtureRaw());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.content.domains.map((d) => d.id)).toEqual(['alpha', 'beta']);
    expect(r.content.questions.map((q) => q.id)).toEqual(['q-alpha-1', 'q-alpha-2', 'q-alpha-3', 'q-beta-1']);
    expect(r.content.questionById.get('q-alpha-1')?.answer).toBe('a');
    expect(r.content.cardById.get('c-beta-one')?.term).toBe('Beta term');
    expect(r.content.lessonById.get('l-alpha')?.checkQuestionIds).toHaveLength(3);
  });

  it('rejects a choice with an empty reason', () => {
    const r = mutate((raw) => { raw.files['alpha/questions.json'][0].choices[2].reason = ''; });
    expect(errorText(r)).toMatch(/alpha\/questions\.json: 0\.choices\.2\.reason/);
  });

  it('rejects a card without a source', () => {
    const r = mutate((raw) => { delete raw.files['alpha/cards.json'][0].source; });
    expect(errorText(r)).toMatch(/alpha\/cards\.json: 0\.source/);
  });

  it('rejects an answer that is not a choice id', () => {
    const r = mutate((raw) => { raw.files['alpha/questions.json'][0].answer = 'e'; });
    expect(errorText(r)).toMatch(/alpha\/questions\.json: 0\.answer/);
  });

  it('rejects choices out of order', () => {
    const r = mutate((raw) => {
      const cs = raw.files['alpha/questions.json'][0].choices;
      cs[0].id = 'b';
      cs[1].id = 'a';
    });
    expect(errorText(r)).toMatch(/ids a, b, c, d in order/);
  });

  it('rejects links to unknown cards, lessons and questions', () => {
    const r = mutate((raw) => {
      raw.files['alpha/questions.json'][0].relatedCardIds = ['c-missing'];
      raw.files['alpha/questions.json'][1].lessonId = 'l-missing';
      raw.files['alpha/lessons.json'][0].checkQuestionIds = ['q-alpha-1', 'q-alpha-2', 'q-missing'];
    });
    const text = errorText(r);
    expect(text).toMatch(/q-alpha-1 links unknown card "c-missing"/);
    expect(text).toMatch(/q-alpha-2 links unknown lesson "l-missing"/);
    expect(text).toMatch(/l-alpha links unknown question "q-missing"/);
  });

  it('rejects duplicate ids across files', () => {
    const r = mutate((raw) => { raw.files['beta/questions.json'][0].id = 'q-alpha-1'; });
    expect(errorText(r)).toMatch(/duplicate id "q-alpha-1"/);
  });

  it('rejects items filed under the wrong domain folder', () => {
    const r = mutate((raw) => { raw.files['alpha/cards.json'][0].domainId = 'beta'; });
    expect(errorText(r)).toMatch(/c-alpha-one has domainId "beta" but lives in "alpha"/);
  });

  it('rejects unknown sub-skills', () => {
    const r = mutate((raw) => { raw.files['beta/cards.json'][0].subSkillId = 'zz'; });
    expect(errorText(r)).toMatch(/c-beta-one has unknown subSkillId "zz"/);
  });

  it('rejects domain weights that do not sum to 100', () => {
    const r = mutate((raw) => { raw.domains[1].weight = 30; });
    expect(errorText(r)).toMatch(/weights sum to 90\.0, expected 100/);
  });

  it('rejects files in folders that are not domains', () => {
    const r = mutate((raw) => { raw.files['gamma/questions.json'] = []; });
    expect(errorText(r)).toMatch(/gamma\/questions\.json: folder "gamma" is not a domain id/);
  });

  it('rejects unexpected file names', () => {
    const r = mutate((raw) => { raw.files['alpha/notes.json'] = []; });
    expect(errorText(r)).toMatch(/alpha\/notes\.json: unexpected content file/);
  });
});
