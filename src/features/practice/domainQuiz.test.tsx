import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithApp } from '../../../tests/renderWithApp';
import { fixtureContent } from '../../content/fixtures';
import { DomainQuizPage, DomainQuizzesPage } from './DomainQuizPage';
import { QuestionRunner } from './QuestionRunner';
import { SavedPage } from './SavedPage';

const content = fixtureContent();
const q1 = content.questionById.get('q-alpha-1')!;

describe('answering needs Submit', () => {
  it('a tap only selects, can be changed, and nothing is checked until Submit', async () => {
    const { db } = await renderWithApp(<QuestionRunner questions={[q1]} mode="quiz" title="Quiz" onFinish={() => {}} onExit={() => {}} />);
    expect(await screen.findByRole('button', { name: 'Pick an answer' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /Wrong one q-alpha-1/ }));
    expect(screen.getByRole('button', { name: /Wrong one q-alpha-1/ })).toHaveClass('choice-selected');
    expect(screen.queryByText(/Not quite/)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Right answer q-alpha-1/ }));
    expect(screen.getByRole('button', { name: /Wrong one q-alpha-1/ })).not.toHaveClass('choice-selected');
    expect(await db.getAttempts()).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Correct!')).toBeInTheDocument();
    await waitFor(async () => expect(await db.getAttempts()).toMatchObject([{ chosen: 'a', correct: true }]));
  });
});

describe('Save for review', () => {
  it('saves from a question, keeps it, and lists it on the saved page', async () => {
    const { db, unmount } = await renderWithApp(<QuestionRunner questions={[q1]} mode="quiz" title="Quiz" onFinish={() => {}} onExit={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Save for review' }));
    expect(screen.getByRole('button', { name: /Saved for review \(tap to remove\)/ })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(async () => expect(await db.getKv('saved')).toEqual(['q-alpha-1']));
    unmount();
    await renderWithApp(<SavedPage />, { db });
    expect(await screen.findByText(/1 saved question/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Practice these 1 again/ })).toHaveAttribute('href', '/practice/saved/drill');
    expect(screen.getByText('Alpha Domain (1)')).toBeInTheDocument();
  });
});

describe('Domain quizzes', () => {
  it('lists every domain heaviest first with its weight', async () => {
    await renderWithApp(<DomainQuizzesPage />);
    const links = await screen.findAllByRole('link', { name: /of the exam/ });
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/practice/domains/alpha', '/practice/domains/beta']);
    expect(links[0]).toHaveTextContent('60% of the exam');
  });

  it('runs a domain quiz and ends with saved, missed and right questions to review', async () => {
    await renderWithApp(<DomainQuizPage />, { route: '/practice/domains/alpha', path: '/practice/domains/:domainId' });
    const count = Number((await screen.findByText(/Alpha · 1 \/ \d+/)).textContent!.split('/ ')[1]);
    for (let i = 0; i < count; i++) {
      if (i === 0) await userEvent.click(screen.getByRole('button', { name: 'Save for review' }));
      // Always pick choice B (plus D on a multiple-response item).
      await screen.findByRole('button', { name: /Pick/ });
      const choices = [...document.querySelectorAll<HTMLButtonElement>('.choice')];
      await userEvent.click(choices[1]);
      const submit = screen.queryByRole('button', { name: 'Submit' });
      if (!submit) {
        // A multiple-response item: pick one more.
        await userEvent.click(choices[3]);
      }
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      await userEvent.click(await screen.findByRole('button', { name: i + 1 === count ? 'Finish' : 'Continue' }));
    }
    expect(await screen.findByText(/Saved for review \(1\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retake this quiz' })).toBeInTheDocument();
    const saved = screen.getByText(/Saved for review \(1\)/).closest('.review-head')!.nextElementSibling!;
    expect(within(saved as HTMLElement).getByLabelText('Saved')).toBeInTheDocument();
  });
});

describe('collapsing the answer sheet', () => {
  it('hides the explanation but stays on the question until Continue', async () => {
    const q2 = content.questionById.get('q-beta-1')!;
    await renderWithApp(<QuestionRunner questions={[q1, q2]} mode="quiz" title="Quiz" onFinish={() => {}} onExit={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: /Right answer q-alpha-1/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Collapse' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Answer explanation' })).toBeNull());
    expect(screen.getByText('Quiz · 1 / 2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'See explanation' }));
    expect(await screen.findByRole('dialog', { name: 'Answer explanation' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Collapse' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Answer explanation' })).toBeNull());
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Quiz · 2 / 2')).toBeInTheDocument();
  });
});
