import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithApp } from '../../../tests/renderWithApp';
import { fixtureContent, multiQuestion } from '../../content/fixtures';
import { QuestionSchema } from '../../content/schema';
import { buildContent } from '../../content/validate';
import { groupGlossary, VocabPage } from './VocabPage';

describe('VocabPage', () => {
  it('groups terms by letter and searches terms, aliases and definitions', () => {
    const c = fixtureContent();
    expect(groupGlossary(c.glossary, '')).toEqual([{ letter: 'G', terms: [c.termById.get('g-gizmo')] }]);
    expect(groupGlossary(c.glossary, 'gzm')).toHaveLength(1);
    expect(groupGlossary(c.glossary, 'zzz')).toEqual([]);
  });

  it('opens a term with why it matters, an example and a quiz on questions that use it', async () => {
    const base = fixtureContent();
    const content = buildContent(base.domains, [...base.questions, QuestionSchema.parse(multiQuestion())], base.cards, base.lessons, base.glossary);
    await renderWithApp(<VocabPage />, { content, route: '/vocab', path: '/vocab' });
    await userEvent.click(await screen.findByRole('button', { name: 'gizmo: more' }));
    const sheet = await screen.findByRole('dialog', { name: 'Definition: gizmo' });
    expect(sheet).toHaveTextContent('Gizmos decide test outcomes.');
    expect(sheet).toHaveTextContent('Set the gizmo to on.');
    expect(screen.getByRole('link', { name: 'Practice 1 question using this term' })).toHaveAttribute('href', '#/practice/quiz?n=1&ids=q-alpha-multi');
  });
});
