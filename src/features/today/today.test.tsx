import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { openTestDb, renderWithApp } from '../../../tests/renderWithApp';
import { fixtureContent } from '../../content/fixtures';
import { SessionPage } from './SessionPage';
import { TodayPage } from './TodayPage';

const NOW = new Date('2026-09-26T10:00:00');
const now = () => NOW;

describe('TodayPage', () => {
  it('shows the locked readiness estimate, cards due and domain rows', async () => {
    await renderWithApp(<TodayPage />, { now, route: '/', path: '/' });
    expect(await screen.findByText(/Answer 40 more questions to unlock/)).toBeInTheDocument();
    expect(screen.getByText(/2 cards due/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Start today's session" })).toHaveAttribute('href', '/session');
    expect(screen.getAllByText('not started')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
  });

  it('shows and dismisses the install hint', async () => {
    const { db } = await renderWithApp(<TodayPage />, { now, route: '/', path: '/' });
    expect(await screen.findByText(/Add Ajada to your Home Screen/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText(/Add Ajada to your Home Screen/)).toBeNull();
    expect(await db.getKv('settings')).toMatchObject({ installHintDismissedAt: NOW.getTime() });
  });

  it('reminds about backups after two weeks of activity', async () => {
    const db = await openTestDb();
    await db.addAttempts([{ questionId: 'q-alpha-1', chosen: 'a', correct: true, mode: 'quiz', at: NOW.getTime() - 20 * 86_400_000 }]);
    await renderWithApp(<TodayPage />, { db, now, route: '/', path: '/' });
    expect(await screen.findByText(/since your last backup/)).toBeInTheDocument();
  });
});

describe('SessionPage', () => {
  it('goes from flashcards to weak-spot questions', async () => {
    await renderWithApp(<SessionPage />, { now, route: '/session', path: '/session', content: { ...fixtureContent(), cards: [] } });
    await userEvent.click(await screen.findByRole('button', { name: 'Continue to questions' }));
    expect(await screen.findByText('Today · 1 / 4')).toBeInTheDocument();
  });
});
