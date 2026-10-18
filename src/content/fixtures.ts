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

/** A "select TWO" question: 5 choices, b and d correct. */
export function multiQuestion(id = 'q-alpha-multi') {
  return question(id, 'alpha', 'a1', {
    stem: `Which two gizmo settings for ${id}?`,
    choices: [
      { id: 'a', text: 'Multi wrong a', reason: 'Why a is wrong' },
      { id: 'b', text: 'Multi right b', reason: 'Correct: why b is right' },
      { id: 'c', text: 'Multi wrong c', reason: 'Why c is wrong' },
      { id: 'd', text: 'Multi right d', reason: 'Correct: why d is right' },
      { id: 'e', text: 'Multi wrong e', reason: 'Why e is wrong' },
    ],
    answer: ['b', 'd'],
  });
}

export function fixtureRaw(): RawContent {
  return {
    glossary: [
      { id: 'g-gizmo', term: 'gizmo', aliases: ['GZM'], definition: 'A gizmo is a test term.', whyItMatters: 'Gizmos decide test outcomes.', example: 'Set the gizmo to on.', source },
    ],
    course: [
      {
        id: 'section-1', number: 1, title: 'Foundations', summary: 'Section one summary',
        modules: [{ title: 'Alpha module', lessonId: 'l-alpha' }],
        takeaways: [{ title: 'Takeaway title', body: 'Takeaway body' }],
      },
    ],
    focus: [{ id: 'gizmos', title: 'Gizmo handling', summary: 'Gizmo summary', questionIds: ['q-alpha-1', 'q-beta-1'] }],
    practiceSets: [{
      id: 'sample-set', title: 'Sample set', author: 'A. Writer', sourceUrl: 'https://example.com/set', sourceTitle: 'Sample set', note: 'A test set.', checkedOn: '2026-10-18',
      questions: [{
        id: 'q-set-1', domainId: 'alpha', stem: 'Set stem?', answer: 'a', explanation: 'Because the gizmo says so.',
        choices: [{ id: 'a', text: 'Set right' }, { id: 'b', text: 'Set wrong one' }, { id: 'c', text: 'Set wrong two' }, { id: 'd', text: 'Set wrong three' }],
      }],
    }],
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
          explanation: 'Why alpha: the gizmo detail in the stem decides it.',
          diagram: { kind: 'flow', caption: 'Alpha flow', steps: [{ label: 'Step one' }, { label: 'Step two' }] },
        }),
        question('q-alpha-2', 'alpha', 'a1', {
          relatedCardIds: ['c-alpha-one'], lessonId: 'l-alpha',
          snippet: { language: 'python', code: 'gizmo = make_gizmo()\nif gizmo.on:\n    run(gizmo)' },
        }),
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
          sections: [{ heading: 'First section', body: 'Body with **bold** and `code`.\n\nSecond paragraph.', example: 'Turn the gizmo on.' }],
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
