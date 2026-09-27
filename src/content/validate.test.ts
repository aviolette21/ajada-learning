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

  // Card text has to fit a phone-sized card face (see e2e "flashcard text fits").
  it.each([
    ['definition', 160],
    ['whyItMatters', 170],
    ['example', 120],
  ])('rejects a card %s longer than %i characters and accepts one at the limit', (field, max) => {
    const atLimit = mutate((raw) => { raw.files['alpha/cards.json'][0][field] = 'x'.repeat(max); });
    expect(atLimit.ok).toBe(true);
    const over = mutate((raw) => { raw.files['alpha/cards.json'][0][field] = 'x'.repeat(max + 1); });
    expect(errorText(over)).toMatch(new RegExp(`alpha/cards\\.json: 0\\.${field}`));
  });

  it('rejects a card definition with more than two code spans', () => {
    const two = mutate((raw) => { raw.files['alpha/cards.json'][0].definition = 'Use `a` or `b`.'; });
    expect(two.ok).toBe(true);
    const three = mutate((raw) => { raw.files['alpha/cards.json'][0].definition = 'Use `a`, `b` or `c`.'; });
    expect(errorText(three)).toMatch(/alpha\/cards\.json: 0\.definition: .*at most 2 code spans/);
  });

  it('rejects an answer that is not a choice id', () => {
    const r = mutate((raw) => { raw.files['alpha/questions.json'][0].answer = 'e'; });
    expect(errorText(r)).toMatch(/alpha\/questions\.json: 0\.answer/);
  });

  it.each(['javascript:alert(1)', 'http://example.com/docs'])('rejects a non-https source url %s', (url) => {
    const r = mutate((raw) => {
      const card = raw.files['alpha/cards.json'][0];
      card.source = { ...card.source, url };
    });
    expect(errorText(r)).toMatch(/alpha\/cards\.json: 0\.source\.url/);
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

  it('rejects questions that exceed length limits', () => {
    const r = mutate((raw) => { raw.files['alpha/questions.json'][0].stem = 'x'.repeat(321); });
    expect(errorText(r)).toMatch(/alpha\/questions\.json: 0\.stem/);
  });

  it('rejects lesson section bodies over 1400 characters', () => {
    const r = mutate((raw) => { raw.files['alpha/lessons.json'][0].sections[0].body = 'x'.repeat(1401); });
    expect(errorText(r)).toMatch(/alpha\/lessons\.json: 0\.sections\.0\.body/);
  });

  it('rejects lesson check questions from another sub-skill or repeated', () => {
    const r = mutate((raw) => {
      raw.domains[0].subSkills.push({ id: 'a2', name: 'Alpha Two', official: false });
      raw.files['alpha/questions.json'][2].subSkillId = 'a2';
      raw.files['alpha/lessons.json'][0].checkQuestionIds = ['q-alpha-1', 'q-alpha-1', 'q-alpha-3'];
    });
    const text = errorText(r);
    expect(text).toMatch(/l-alpha check question "q-alpha-3" is in sub-skill "a2", not "a1"/);
    expect(text).toMatch(/l-alpha repeats check question "q-alpha-1"/);
  });

  it('rejects answer keys skewed to one letter in domains with 8+ questions', () => {
    const r = mutate((raw) => {
      const base = raw.files['alpha/questions.json'][1];
      raw.files['alpha/questions.json'].push(
        ...Array.from({ length: 6 }, (_, i) => ({ ...structuredClone(base), id: `q-alpha-extra-${i}`, lessonId: undefined })),
      );
    });
    expect(errorText(r)).toMatch(/alpha: 9 of 9 questions have answer "a" \(max 40%\)/);
  });
});
