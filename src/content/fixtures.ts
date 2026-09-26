import type { Content, Question } from './schema';
import { buildContent, validateContent, type RawContent } from './validate';

const source = { url: 'https://example.com/docs', title: 'Example doc', checkedOn: '2026-09-26' };

function question(id: string, domainId: string, subSkillId: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    domainId,
    subSkillId,
    topic: 'Topic',
    stem: `Stem for ${id}?`,
    choices: [
      { id: 'a', text: `Right answer ${id}`, reason: `Why a is right for ${id}` },
      { id: 'b', text: `Wrong one ${id}`, reason: `Why b is wrong for ${id}` },
      { id: 'c', text: `Wrong two ${id}`, reason: `Why c is wrong for ${id}` },
      { id: 'd', text: `Wrong three ${id}`, reason: `Why d is wrong for ${id}` },
    ],
    answer: 'a',
    takeaway: `Takeaway ${id}`,
    difficulty: 'easy',
    source,
    relatedCardIds: [],
    ...extra,
  };
}

export function fixtureRaw(): RawContent {
  return {
    domains: [
      { id: 'alpha', name: 'Alpha Domain', shortName: 'Alpha', weight: 60, order: 0, subSkills: [{ id: 'a1', name: 'Alpha One', weight: 60, official: true }] },
      { id: 'beta', name: 'Beta Domain', shortName: 'Beta', weight: 40, order: 1, subSkills: [{ id: 'b1', name: 'Beta One', official: false }] },
    ],
    files: {
      'alpha/questions.json': [
        question('q-alpha-1', 'alpha', 'a1', {
          relatedCardIds: ['c-alpha-one'],
          lessonId: 'l-alpha',
          mnemonic: 'Remember alpha',
          diagram: { kind: 'flow', caption: 'Alpha flow', steps: [{ label: 'Step one' }, { label: 'Step two' }] },
        }),
        question('q-alpha-2', 'alpha', 'a1', { relatedCardIds: ['c-alpha-one'], lessonId: 'l-alpha' }),
        question('q-alpha-3', 'alpha', 'a1', { lessonId: 'l-alpha' }),
      ],
      'alpha/cards.json': [
        { id: 'c-alpha-one', domainId: 'alpha', subSkillId: 'a1', term: 'Alpha term', definition: 'Alpha definition', whyItMatters: 'Alpha matters', example: 'Alpha example', source, isVocab: true },
      ],
      'alpha/lessons.json': [
        {
          id: 'l-alpha',
          domainId: 'alpha',
          subSkillId: 'a1',
          title: 'Alpha lesson',
          summary: 'Alpha summary',
          keyPoints: ['Point one', 'Point two'],
          sections: [{ heading: 'First section', body: 'Body with **bold** and `code`.\n\nSecond paragraph.' }],
          checkQuestionIds: ['q-alpha-1', 'q-alpha-2', 'q-alpha-3'],
          sources: [source],
        },
      ],
      'beta/questions.json': [question('q-beta-1', 'beta', 'b1', { relatedCardIds: ['c-beta-one'] })],
      'beta/cards.json': [
        { id: 'c-beta-one', domainId: 'beta', subSkillId: 'b1', term: 'Beta term', definition: 'Beta definition', whyItMatters: 'Beta matters', source, isVocab: false },
      ],
    },
  };
}

export function fixtureContent(): Content {
  const result = validateContent(fixtureRaw());
  if (!result.ok) throw new Error(`fixture invalid:\n${result.errors.join('\n')}`);
  return result.content;
}

/** Fixture domains with many generated questions (clones of q-alpha-1 / q-beta-1). */
export function manyQuestionsContent(alphaCount: number, betaCount: number): Content {
  const base = fixtureContent();
  const alpha = base.questionById.get('q-alpha-1')!;
  const beta = base.questionById.get('q-beta-1')!;
  const questions: Question[] = [
    ...Array.from({ length: alphaCount }, (_, i) => ({ ...alpha, id: `q-alpha-gen-${i}`, lessonId: undefined })),
    ...Array.from({ length: betaCount }, (_, i) => ({ ...beta, id: `q-beta-gen-${i}` })),
  ];
  return buildContent(base.domains, questions, base.cards, []);
}
