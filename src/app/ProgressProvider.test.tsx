import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { openTestDb } from '../../tests/renderWithApp';
import { fixtureContent } from '../content/fixtures';
import type { AppDb } from '../storage/db';
import { newState, rate } from '../study/scheduler';
import { DEFAULT_SETTINGS, type MockSession } from '../study/types';
import { ClockProvider } from './clock';
import { ContentProvider } from './ContentContext';
import { ProgressProvider, useProgress } from './ProgressProvider';

const NOW = new Date('2026-09-26T10:00:00');
const EARLIER = new Date('2026-09-01T10:00:00');

async function setup(existing?: AppDb) {
  const db = existing ?? (await openTestDb());
  const content = fixtureContent();
  const now = () => NOW;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ClockProvider now={now}>
      <ContentProvider content={content}>
        <ProgressProvider db={db}>{children}</ProgressProvider>
      </ContentProvider>
    </ClockProvider>
  );
  const hook = renderHook(() => useProgress(), { wrapper });
  await waitFor(() => expect(hook.result.current).toBeTruthy());
  return { ...hook, db, content };
}

describe('ProgressProvider', () => {
  it('loads defaults from an empty database', async () => {
    const { result } = await setup();
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.current.attempts).toEqual([]);
  });

  it('records a wrong answer and makes its related flashcards due now', async () => {
    const { result, db, content } = await setup();
    const learned = rate(newState('c-alpha-one', 'forward', EARLIER), 'easy', EARLIER);
    await act(() => result.current.saveCardState(learned));
    await act(() => result.current.recordAnswer(content.questionById.get('q-alpha-1')!, 'b', 'quiz'));
    expect(result.current.attempts).toMatchObject([{ questionId: 'q-alpha-1', correct: false, mode: 'quiz' }]);
    expect(result.current.cardStates.get('c-alpha-one:forward')!.fsrs.due.getTime()).toBe(NOW.getTime());
    expect(await db.getAttempts()).toHaveLength(1);
  });

  it('leaves flashcards alone after a right answer', async () => {
    const { result, content } = await setup();
    const learned = rate(newState('c-alpha-one', 'forward', EARLIER), 'easy', EARLIER);
    await act(() => result.current.saveCardState(learned));
    await act(() => result.current.recordAnswer(content.questionById.get('q-alpha-1')!, 'a', 'quiz'));
    expect(result.current.cardStates.get('c-alpha-one:forward')!.fsrs.due).toEqual(learned.fsrs.due);
  });

  it('persists settings, flags and lesson completion', async () => {
    const { result, db } = await setup();
    await act(() => result.current.updateSettings({ newCardsPerDay: 25 }));
    await act(() => result.current.toggleFlag('q-alpha-2', 'question'));
    await act(() => result.current.markLessonDone('l-alpha'));
    expect(result.current.settings.newCardsPerDay).toBe(25);
    expect(result.current.flags.has('q-alpha-2')).toBe(true);
    expect(result.current.lessonsDone.has('l-alpha')).toBe(true);
    expect(await db.getKv('settings')).toMatchObject({ newCardsPerDay: 25 });
    await act(() => result.current.toggleFlag('q-alpha-2', 'question'));
    expect(result.current.flags.has('q-alpha-2')).toBe(false);
  });

  it('submits a mock exam once and records its answers as attempts', async () => {
    const { result } = await setup();
    const session: MockSession = {
      id: 'm1', startedAt: 0, durationMs: 1000, questionIds: ['q-alpha-1', 'q-beta-1'],
      answers: { 'q-alpha-1': 'a' }, flagged: [], currentIndex: 1,
    };
    await act(() => result.current.saveMockSession(session));
    await act(async () => { await result.current.submitMock(session); });
    await act(async () => { await result.current.submitMock(session); });
    expect(result.current.mockSessions[0].submittedAt).toBe(NOW.getTime());
    expect(result.current.attempts).toMatchObject([{ questionId: 'q-alpha-1', correct: true, mode: 'mock' }]);
  });

  it('exports a backup and restores it on another device', async () => {
    const a = await setup();
    await act(() => a.result.current.recordAnswer(a.content.questionById.get('q-beta-1')!, 'a', 'quiz'));
    let text = '';
    await act(async () => { text = await a.result.current.exportBackup(); });
    expect(a.result.current.settings.lastBackupAt).toBe(NOW.getTime());
    const b = await setup();
    await act(() => b.result.current.importBackup(text));
    await waitFor(() => expect(b.result.current.attempts).toHaveLength(1));
  });
});
