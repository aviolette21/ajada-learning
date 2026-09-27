import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { openTestDb } from '../../tests/renderWithApp';
import { fixtureContent } from '../content/fixtures';
import type { AppDb } from '../storage/db';
import { buildQueue, newState, rate } from '../study/scheduler';
import { DEFAULT_SETTINGS, type MockSession } from '../study/types';
import { ClockProvider } from './clock';
import { ContentProvider } from './ContentContext';
import { NotifierProvider, SAVE_FAILED } from './Notifier';
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
        <NotifierProvider>
          <ProgressProvider db={db}>{children}</ProgressProvider>
        </NotifierProvider>
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
    expect(result.current.cardStates.get('c-alpha-one:reverse')!.fsrs.due.getTime()).toBe(NOW.getTime());
    expect(await db.getAttempts()).toHaveLength(1);
  });

  it('resurfaces a never-studied related flashcard in both directions after a wrong answer', async () => {
    const { result, db, content } = await setup();
    await act(() => result.current.recordAnswer(content.questionById.get('q-beta-1')!, 'b', 'quiz'));
    for (const d of ['forward', 'reverse'] as const) {
      expect(result.current.cardStates.get(`c-beta-one:${d}`)!.fsrs.due.getTime()).toBe(NOW.getTime());
    }
    expect((await db.getCardStates()).map((s) => s.key).sort()).toEqual(['c-beta-one:forward', 'c-beta-one:reverse']);
    const queue = buildQueue({
      cardIds: ['c-beta-one'], states: result.current.cardStates, mode: 'mixed', now: NOW, newPerDay: 0, rng: () => 0,
    });
    expect(queue.map((q) => [q.direction, q.state?.key])).toEqual([
      ['forward', 'c-beta-one:forward'], ['reverse', 'c-beta-one:reverse'],
    ]);
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
  it('discards a mock session without recording its answers', async () => {
    const { result, db } = await setup();
    const session: MockSession = {
      id: 'm3', startedAt: 0, durationMs: 1000, questionIds: ['q-alpha-1'],
      answers: { 'q-alpha-1': 'a' }, flagged: [], currentIndex: 0,
    };
    await act(() => result.current.saveMockSession(session));
    await act(() => result.current.discardMockSession('m3'));
    expect(result.current.mockSessions).toEqual([]);
    expect(await db.getMockSessions()).toEqual([]);
    expect(result.current.attempts).toEqual([]);
    expect(await db.getAttempts()).toEqual([]);
  });
  it('records a mock exam once when two submits race', async () => {
    const { result, db } = await setup();
    const session: MockSession = {
      id: 'm2', startedAt: 0, durationMs: 1000, questionIds: ['q-alpha-1', 'q-beta-1'],
      answers: { 'q-alpha-1': 'a', 'q-beta-1': 'a' }, flagged: [], currentIndex: 1,
    };
    await act(() => result.current.saveMockSession(session));
    let pair: MockSession[] = [];
    await act(async () => {
      pair = await Promise.all([result.current.submitMock(session), result.current.submitMock(session)]);
    });
    expect(pair[0]).toBe(pair[1]);
    expect(result.current.attempts).toHaveLength(2);
    expect(await db.getAttempts()).toHaveLength(2);
  });

  it('exports a backup and restores it on another device', async () => {
    const a = await setup();
    await act(() => a.result.current.recordAnswer(a.content.questionById.get('q-beta-1')!, 'a', 'quiz'));
    let text = '';
    await act(async () => { text = await a.result.current.exportBackup(); });
    expect(a.result.current.settings.lastBackupAt).toBeUndefined();
    await act(() => a.result.current.markBackedUp());
    expect(a.result.current.settings.lastBackupAt).toBe(NOW.getTime());
    const b = await setup();
    await act(() => b.result.current.importBackup(text));
    await waitFor(() => expect(b.result.current.attempts).toHaveLength(1));
  });

  it('reports a failed save in a toast, rejects, and leaves progress unchanged', async () => {
    const { result, db, content } = await setup();
    const question = content.questionById.get('q-alpha-1')!;
    const fail = () => Promise.reject(new Error('quota exceeded'));
    vi.spyOn(db, 'addAttempts').mockImplementation(fail);
    vi.spyOn(db, 'putFlag').mockImplementation(fail);
    vi.spyOn(db, 'markLessonDone').mockImplementation(fail);
    vi.spyOn(db, 'putMockSession').mockImplementation(fail);
    vi.spyOn(db, 'setKv').mockImplementation(fail);
    const session: MockSession = {
      id: 'm1', startedAt: NOW.getTime(), durationMs: 1000, questionIds: ['q-alpha-1'], answers: {}, flagged: [], currentIndex: 0,
    };
    const saves = [
      () => result.current.recordAnswer(question, 'a', 'quiz'),
      () => result.current.toggleFlag('q-alpha-1', 'question'),
      () => result.current.markLessonDone('l-alpha'),
      () => result.current.saveMockSession(session),
      () => result.current.submitMock(session),
      () => result.current.updateSettings({ newCardsPerDay: 3 }),
    ];
    for (const save of saves) {
      await act(async () => { await expect(save()).rejects.toThrow('quota exceeded'); });
      expect(await screen.findByRole('alert')).toHaveTextContent(SAVE_FAILED);
      await act(async () => screen.getByRole('button', { name: 'Dismiss message' }).click());
    }
    expect(result.current.attempts).toEqual([]);
    expect(result.current.flags.size).toBe(0);
    expect(result.current.lessonsDone.size).toBe(0);
    expect(result.current.mockSessions).toEqual([]);
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('shows an error instead of a blank screen when progress cannot load', async () => {
    const broken = {
      getAttempts: () => Promise.reject(new Error('disk on fire')),
      getCardStates: () => Promise.resolve([]),
      getLessonsDone: () => Promise.resolve([]),
      getFlags: () => Promise.resolve([]),
      getMockSessions: () => Promise.resolve([]),
      getKv: () => Promise.resolve(undefined),
    } as unknown as AppDb;
    render(
      <ClockProvider now={() => NOW}>
        <ContentProvider content={fixtureContent()}>
          <NotifierProvider>
            <ProgressProvider db={broken}><p>child</p></ProgressProvider>
          </NotifierProvider>
        </ContentProvider>
      </ClockProvider>,
    );
    expect(await screen.findByText(/could not load your progress/)).toHaveTextContent('disk on fire');
    expect(screen.queryByText('child')).toBeNull();
  });
});
