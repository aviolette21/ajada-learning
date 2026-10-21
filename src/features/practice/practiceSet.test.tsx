import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithApp } from '../../../tests/renderWithApp';
import { fixtureRaw } from '../../content/fixtures';
import { validateContent } from '../../content/validate';
import { PracticePage } from './PracticePage';
import { PracticeSetPage } from './PracticeSetPage';

describe('practice sets content', () => {
  it('rejects an unknown domain or an id already in the bank', () => {
    const raw = fixtureRaw();
    const sets = raw.practiceSets as { questions: Record<string, unknown>[] }[];
    sets[0].questions[0] = { ...sets[0].questions[0], id: 'q-alpha-1', domainId: 'nope' };
    const result = validateContent(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('practice-sets.json: sample-set duplicate id "q-alpha-1"');
      expect(result.errors).toContain('practice-sets.json: q-alpha-1 has unknown domainId "nope"');
    }
  });
});

describe('PracticeSetPage', () => {
  it('is listed on Practice with its author', async () => {
    await renderWithApp(<PracticePage />, { route: '/practice', path: '/practice' });
    const link = await screen.findByRole('link', { name: /Sample set/ });
    expect(link).toHaveAttribute('href', '/practice/set/sample-set');
    expect(link).toHaveTextContent('By A. Writer · 1 questions');
  });
  it("runs the set with the author's explanation and records nothing", async () => {
    const { db } = await renderWithApp(<PracticeSetPage />, { route: '/practice/set/sample-set', path: '/practice/set/:setId' });
    expect(await screen.findByText('Set stem?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Set wrong one/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText(/says so\./)).toBeInTheDocument();
    expect(screen.queryByText(/In one line/)).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Finish' }));
    expect(await screen.findByText('0 / 1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Retry the 1 you missed/ })).toHaveAttribute('href', '/practice/set/sample-set?ids=q-set-1');
    expect(await db.getAttempts()).toHaveLength(0);
  });
});
