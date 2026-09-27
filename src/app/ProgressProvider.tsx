import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ChoiceId, Question } from '../content/schema';
import { parseBackup, serializeBackup } from '../storage/backup';
import type { AppDb } from '../storage/db';
import { mockAttempts } from '../study/mockExam';
import { newState, resurface, stateKey } from '../study/scheduler';
import {
  DEFAULT_SETTINGS,
  type Attempt, type AttemptMode, type Flag, type MockSession, type Settings, type StoredCardState,
} from '../study/types';
import { useClock } from './clock';
import { useContent } from './ContentContext';
import { SAVE_FAILED, useNotify } from './Notifier';

export interface Progress {
  attempts: Attempt[];
  cardStates: Map<string, StoredCardState>;
  lessonsDone: Set<string>;
  flags: Map<string, Flag>;
  mockSessions: MockSession[];
  settings: Settings;
}

/** Save methods report a failure to the user (a toast) and still reject, so a caller that awaits can react. */
export interface ProgressApi extends Progress {
  recordAnswer(question: Question, chosen: ChoiceId, mode: AttemptMode): Promise<void>;
  saveCardState(state: StoredCardState): Promise<void>;
  markLessonDone(lessonId: string): Promise<void>;
  toggleFlag(itemId: string, kind: Flag['kind']): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  saveMockSession(session: MockSession): Promise<void>;
  submitMock(session: MockSession): Promise<MockSession>;
  /** Deletes an unsubmitted session without recording any of its answers. */
  discardMockSession(id: string): Promise<void>;
  /** Serializes all progress; does not count as a backup until `markBackedUp` is called. */
  exportBackup(): Promise<string>;
  /** Records that a backup file was actually saved (sets `lastBackupAt` to now). */
  markBackedUp(): Promise<void>;
  importBackup(text: string): Promise<void>;
}

const SETTINGS_KEY = 'settings';
const ProgressContext = createContext<ProgressApi | null>(null);

export function useProgress(): ProgressApi {
  const p = useContext(ProgressContext);
  if (!p) throw new Error('useProgress must be used inside <ProgressProvider>');
  return p;
}

function withStates(map: Map<string, StoredCardState>, states: StoredCardState[]) {
  if (states.length === 0) return map;
  const next = new Map(map);
  for (const s of states) next.set(s.key, s);
  return next;
}

const upsert = (list: MockSession[], s: MockSession) => [...list.filter((x) => x.id !== s.id), s];

export function ProgressProvider({ db, children }: { db: AppDb; children: ReactNode }) {
  const { now } = useClock();
  const { questionById } = useContent();
  const notify = useNotify();
  const [state, setState] = useState<Progress | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const ref = useRef(state);
  ref.current = state;
  /** Submissions in flight or done, by session id, so a timer auto-submit racing a tap records once. */
  const submits = useRef(new Map<string, Promise<MockSession>>());

  const load = useCallback(async () => {
    const [attempts, cardStates, lessonsDone, flags, mockSessions, settings] = await Promise.all([
      db.getAttempts(), db.getCardStates(), db.getLessonsDone(), db.getFlags(), db.getMockSessions(), db.getKv<Settings>(SETTINGS_KEY),
    ]);
    setState({
      attempts,
      cardStates: new Map(cardStates.map((s) => [s.key, s])),
      lessonsDone: new Set(lessonsDone.map((l) => l.lessonId)),
      flags: new Map(flags.map((f) => [f.itemId, f])),
      mockSessions,
      settings: { ...DEFAULT_SETTINGS, ...settings },
    });
  }, [db]);

  useEffect(() => {
    load().catch((err: unknown) => setLoadError(err ?? new Error('unknown error')));
  }, [load]);

  const api = useMemo<ProgressApi | null>(() => {
    if (!state) return null;
    const current = () => ref.current!;
    /** Wraps a save so its failure is reported once, here, rather than at every call site. */
    const reported = <A extends unknown[], R>(save: (...args: A) => Promise<R>) => (...args: A): Promise<R> =>
      save(...args).catch((err: unknown) => {
        notify(SAVE_FAILED);
        throw err;
      });
    const saveSettings = async (patch: Partial<Settings>) => {
      const settings = { ...current().settings, ...patch };
      await db.setKv(SETTINGS_KEY, settings);
      setState((p) => p && { ...p, settings });
    };
    return {
      ...state,
      recordAnswer: reported(async (question: Question, chosen: ChoiceId, mode: AttemptMode) => {
        const at = now();
        const [attempt] = await db.addAttempts([
          { questionId: question.id, chosen, correct: chosen === question.answer, mode, at: at.getTime() },
        ]);
        const resurfaced = attempt.correct
          ? []
          : question.relatedCardIds.flatMap((cardId) =>
              (['forward', 'reverse'] as const).flatMap((d) => {
                const s = current().cardStates.get(stateKey(cardId, d));
                // A never-studied direction starts as a new state, which is already due now.
                return [s ? resurface(s, at) : newState(cardId, d, at)];
              }),
            );
        if (resurfaced.length > 0) await db.putCardStates(resurfaced);
        setState((p) => p && { ...p, attempts: [...p.attempts, attempt], cardStates: withStates(p.cardStates, resurfaced) });
      }),
      saveCardState: reported(async (s: StoredCardState) => {
        await db.putCardStates([s]);
        setState((p) => p && { ...p, cardStates: withStates(p.cardStates, [s]) });
      }),
      markLessonDone: reported(async (lessonId: string) => {
        await db.markLessonDone(lessonId, now().getTime());
        setState((p) => p && { ...p, lessonsDone: new Set(p.lessonsDone).add(lessonId) });
      }),
      toggleFlag: reported(async (itemId: string, kind: Flag['kind']) => {
        if (current().flags.has(itemId)) {
          await db.deleteFlag(itemId);
          setState((p) => {
            if (!p) return p;
            const flags = new Map(p.flags);
            flags.delete(itemId);
            return { ...p, flags };
          });
        } else {
          const flag: Flag = { itemId, kind, at: now().getTime() };
          await db.putFlag(flag);
          setState((p) => p && { ...p, flags: new Map(p.flags).set(itemId, flag) });
        }
      }),
      updateSettings: reported(saveSettings),
      saveMockSession: reported(async (session: MockSession) => {
        await db.putMockSession(session);
        setState((p) => p && { ...p, mockSessions: upsert(p.mockSessions, session) });
      }),
      submitMock: reported((session: MockSession) => {
        const pending = submits.current.get(session.id);
        if (pending) return pending;
        const existing = current().mockSessions.find((s) => s.id === session.id);
        if (existing?.submittedAt) return Promise.resolve(existing);
        const run = (async () => {
          const at = now().getTime();
          const submitted: MockSession = { ...session, submittedAt: at };
          await db.putMockSession(submitted);
          const attempts = await db.addAttempts(mockAttempts(submitted, questionById, at));
          setState((p) => p && { ...p, mockSessions: upsert(p.mockSessions, submitted), attempts: [...p.attempts, ...attempts] });
          return submitted;
        })();
        submits.current.set(session.id, run);
        // Keep a successful submission cached; forget a failed one so it can be retried.
        run.catch(() => submits.current.delete(session.id));
        return run;
      }),
      discardMockSession: reported(async (id: string) => {
        await db.deleteMockSession(id);
        setState((p) => p && { ...p, mockSessions: p.mockSessions.filter((s) => s.id !== id) });
      }),
      async exportBackup() {
        return serializeBackup(await db.exportAll(), now());
      },
      async markBackedUp() {
        await saveSettings({ lastBackupAt: now().getTime() });
      },
      async importBackup(text) {
        await db.replaceAll(parseBackup(text));
        submits.current.clear();
        await load();
      },
    };
  }, [state, db, now, questionById, load, notify]);

  if (loadError) {
    return <pre className="fatal">Ajada could not load your progress on this device.{'\n'}{String(loadError)}</pre>;
  }
  if (!api) return null;
  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>;
}
