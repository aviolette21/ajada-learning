import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { openTestDb, renderWithApp } from '../../../tests/renderWithApp';
import { fixtureContent } from '../../content/fixtures';
import { focusNext, subSkillProgress } from '../../study/progress';
import { MistakesPage } from './MistakesPage';
import { ProgressPage } from './ProgressPage';
import { QuizPage } from './QuizPage';

describe('guess or know', () => {
  it('records a right answer marked as a guess as not confident and offers to retry it', async () => {
    const { db } = await renderWithApp(<QuizPage />, { route: '/practice/quiz?d=beta', path: '/practice/quiz' });
    await userEvent.click(await screen.findByRole('button', { name: /Mark as a guess/ }));
    await userEvent.click(screen.getByRole('button', { name: /Right answer q-beta-1/ }));
    expect(await screen.findByText(/Correct, but a guess/)).toBeInTheDocument();
    await waitFor(async () => expect(await db.getAttempts()).toMatchObject([{ questionId: 'q-beta-1', correct: true, confident: false }]));
    await userEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(await screen.findByRole('link', { name: 'Retry the 1 you missed or guessed' })).toHaveAttribute('href', '/practice/mistakes?ids=q-beta-1');
  });
});

describe('MistakesPage', () => {
  it('says so when there is nothing to review', async () => {
    await renderWithApp(<MistakesPage />, { route: '/practice/mistakes', path: '/practice/mistakes' });
    expect(await screen.findByText(/No mistakes to review/)).toBeInTheDocument();
  });

  it('re-asks the questions in the pile', async () => {
    const db = await openTestDb();
    await db.addAttempts([{ questionId: 'q-alpha-2', chosen: 'b', correct: false, mode: 'quiz', at: Date.now() }]);
    await renderWithApp(<MistakesPage />, { db, route: '/practice/mistakes', path: '/practice/mistakes' });
    expect(await screen.findByText('Mistakes · 1 / 1')).toBeInTheDocument();
    expect(screen.getByText('Stem for q-alpha-2?')).toBeInTheDocument();
  });
});

describe('progress by sub-skill', () => {
  it('measures each sub-skill and ranks by exam points at stake', () => {
    const c = fixtureContent();
    const right = subSkillProgress(c.domains, c.questions, [{ questionId: 'q-alpha-1', chosen: 'a', correct: true, mode: 'quiz', at: 1 }], c.questionById);
    expect(right.find((r) => r.subSkillId === 'a1')).toMatchObject({ weight: 60, accuracy: 1, seen: 1, total: 3, atStake: 0 });
    const wrong = subSkillProgress(c.domains, c.questions, [{ questionId: 'q-alpha-1', chosen: 'b', correct: false, mode: 'quiz', at: 1 }], c.questionById);
    expect(focusNext(wrong, 1)[0]).toMatchObject({ subSkillId: 'a1', atStake: 60 });
  });

  it('links each sub-skill to a focused quiz', async () => {
    await renderWithApp(<ProgressPage />, { route: '/practice/progress', path: '/practice/progress' });
    expect((await screen.findAllByRole('link', { name: 'Practice Alpha One' }))[0]).toHaveAttribute('href', '/practice/quiz?n=10&s=a1');
  });
});
