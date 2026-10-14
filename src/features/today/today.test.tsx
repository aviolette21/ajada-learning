import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { openTestDb, renderWithApp } from '../../../tests/renderWithApp';
import { SessionPage } from './SessionPage';
import { TodayPage } from './TodayPage';

const NOW = new Date('2026-09-26T10:00:00');
const now = () => NOW;

describe('TodayPage', () => {
  it('shows the locked readiness estimate, session links and domain rows', async () => {
    await renderWithApp(<TodayPage />, { now, route: '/', path: '/' });
    expect(await screen.findByText(/Answer 40 more questions to unlock/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Start today's session" })).toHaveAttribute('href', '/session');
    expect(screen.getByRole('link', { name: 'Take a mock exam' })).toHaveAttribute('href', '/practice/mock');
    expect(screen.getAllByText('not started')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
  });


  it('reminds about backups after two weeks of activity', async () => {
    const db = await openTestDb();
    await db.addAttempts([{ questionId: 'q-alpha-1', chosen: 'a', correct: true, mode: 'quiz', at: NOW.getTime() - 20 * 86_400_000 }]);
    await renderWithApp(<TodayPage />, { db, now, route: '/', path: '/' });
    expect(await screen.findByText(/since your last backup/)).toBeInTheDocument();
  });
});

describe('SessionPage', () => {
  it('runs practice questions and ends with a summary', async () => {
    await renderWithApp(<SessionPage />, { now, route: '/session', path: '/session' });
    expect(await screen.findByText('Today · 1 / 4')).toBeInTheDocument();
    for (let i = 0; i < 4; i++) {
      await userEvent.click(await screen.findByRole('button', { name: /Right answer/ }));
      await userEvent.click(await screen.findByRole('button', { name: i === 3 ? 'Finish' : 'Continue' }));
    }
    expect(await screen.findByText('4 / 4')).toBeInTheDocument();
  });
});
