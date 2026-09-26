import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { openTestDb, renderWithApp } from '../../../tests/renderWithApp';
import { MOCK_DURATION_MS } from '../../study/mockExam';
import type { MockSession } from '../../study/types';
import { HistoryPage } from './HistoryPage';
import { MockExamPage, formatClock } from './MockExamPage';
import { MockIntroPage } from './MockIntroPage';
import { MockResultsPage } from './MockResultsPage';

const NOW = new Date('2026-09-26T10:00:00');
const now = () => NOW;
const session = (over: Partial<MockSession> = {}): MockSession => ({
  id: 'm1', startedAt: NOW.getTime() - 60_000, durationMs: MOCK_DURATION_MS,
  questionIds: ['q-alpha-1', 'q-alpha-2', 'q-alpha-3', 'q-beta-1'], answers: {}, flagged: [], currentIndex: 0, ...over,
});
const examAt = (db: Awaited<ReturnType<typeof openTestDb>>) =>
  renderWithApp(<MockExamPage />, { db, now, route: '/practice/mock/m1', path: '/practice/mock/:sessionId' });

describe('formatClock', () => {
  it('formats H:MM:SS', () => {
    expect(formatClock(MOCK_DURATION_MS)).toBe('2:00:00');
    expect(formatClock(61_000)).toBe('0:01:01');
  });
});

describe('MockIntroPage', () => {
  it('explains a short bank and starts a saved session', async () => {
    const { db } = await renderWithApp(<MockIntroPage />, { now, route: '/practice/mock', path: '/practice/mock' });
    expect(await screen.findByText(/this mock uses 4/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start a new mock exam' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(`/practice/mock/mock-${NOW.getTime()}`));
    const [saved] = await db.getMockSessions();
    expect(saved.questionIds).toHaveLength(4);
  });
  it('offers to resume an unfinished exam', async () => {
    const db = await openTestDb();
    await db.putMockSession(session());
    await renderWithApp(<MockIntroPage />, { db, now, route: '/practice/mock', path: '/practice/mock' });
    await userEvent.click(await screen.findByRole('button', { name: 'Resume exam in progress' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/practice/mock/m1');
  });
});

describe('MockExamPage', () => {
  it('hides feedback, saves answers and position, and resumes', async () => {
    const db = await openTestDb();
    await db.putMockSession(session());
    const first = await examAt(db);
    expect(await screen.findByText('Question 1 of 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Time remaining')).toHaveTextContent('1:59:00');
    await userEvent.click(screen.getByRole('button', { name: /Right answer q-alpha-1/ }));
    expect(screen.getByRole('button', { name: /Right answer q-alpha-1/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Why a is right for q-alpha-1')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Question 2 of 4')).toBeInTheDocument();
    await waitFor(async () => expect((await db.getMockSessions())[0]).toMatchObject({ currentIndex: 1, answers: { 'q-alpha-1': 'a' } }));
    first.unmount();

    await examAt(db);
    expect(await screen.findByText('Question 2 of 4')).toBeInTheDocument();
  });

  it('submits from the navigator and records attempts', async () => {
    const db = await openTestDb();
    await db.putMockSession(session({ answers: { 'q-alpha-1': 'a' } }));
    await examAt(db);
    await userEvent.click(await screen.findByRole('button', { name: /All questions \(1\/4\)/ }));
    const nav = screen.getByRole('dialog', { name: 'Question navigator' });
    expect(within(nav).getByRole('button', { name: 'Question 1, answered' })).toBeInTheDocument();
    await userEvent.click(within(nav).getByRole('button', { name: 'Submit exam' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/practice/mock/m1/results'));
    expect(await db.getAttempts()).toHaveLength(1);
  });

  it('auto-submits when time runs out', async () => {
    const db = await openTestDb();
    await db.putMockSession(session({ startedAt: NOW.getTime() - MOCK_DURATION_MS - 1 }));
    await examAt(db);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/practice/mock/m1/results'));
  });
});

describe('MockResultsPage and HistoryPage', () => {
  const submitted = session({
    answers: { 'q-alpha-1': 'a', 'q-alpha-2': 'a', 'q-alpha-3': 'c', 'q-beta-1': 'a' }, submittedAt: NOW.getTime(),
  });

  it('shows score, pass line, per-domain rows and a filterable review', async () => {
    const db = await openTestDb();
    await db.putMockSession(submitted);
    await renderWithApp(<MockResultsPage />, { db, route: '/practice/mock/m1/results', path: '/practice/mock/:sessionId/results' });
    expect(await screen.findByText('775')).toBeInTheDocument();
    expect(screen.getByText(/Above the 720 pass mark/)).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(4);
    await userEvent.click(screen.getByRole('button', { name: 'Wrong only' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('lists past exams newest first', async () => {
    const db = await openTestDb();
    await db.putMockSession(submitted);
    await db.putMockSession({ ...submitted, id: 'm0', answers: {}, submittedAt: NOW.getTime() - 86_400_000 });
    await renderWithApp(<HistoryPage />, { db, route: '/practice/history', path: '/practice/history' });
    const links = await screen.findAllByRole('link', { name: /Mock exam/ });
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/practice/mock/m1/results', '/practice/mock/m0/results']);
  });
});
