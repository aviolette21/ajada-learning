import { describe, expect, it } from 'vitest';
import { newState, rate } from '../study/scheduler';
import type { BackupData } from './db';
import { AppDb } from './db';
import { BackupError, backupFileName, parseBackup, serializeBackup } from './backup';

let n = 0;
const openFresh = () => AppDb.open(`storage-test-${n++}`);
const T = new Date('2026-09-26T10:00:00');

async function seed(db: AppDb) {
  await db.putCardStates([rate(newState('c-a', 'forward', T), 'good', T)]);
  await db.addAttempts([{ questionId: 'q-a', chosen: 'b', correct: false, mode: 'quiz', at: 1 }]);
  await db.putMockSession({ id: 'm1', startedAt: 0, durationMs: 10, questionIds: ['q-a'], answers: { 'q-a': 'b' }, flagged: [], currentIndex: 0 });
  await db.markLessonDone('l-a', 5);
  await db.putFlag({ itemId: 'q-a', kind: 'question', at: 6 });
  await db.setKv('settings', { newCardsPerDay: 20, cardDirection: 'mixed' });
}

describe('AppDb', () => {
  it('stores and reads every kind of record', async () => {
    const db = await openFresh();
    await seed(db);
    expect((await db.getCardStates())[0].fsrs.due).toBeInstanceOf(Date);
    const [attempt] = await db.getAttempts();
    expect(attempt).toMatchObject({ questionId: 'q-a', correct: false });
    expect(typeof attempt.id).toBe('number');
    expect(await db.getMockSessions()).toHaveLength(1);
    expect(await db.getLessonsDone()).toEqual([{ lessonId: 'l-a', at: 5 }]);
    await db.deleteFlag('q-a');
    expect(await db.getFlags()).toEqual([]);
    expect(await db.getKv('settings')).toEqual({ newCardsPerDay: 20, cardDirection: 'mixed' });
    expect(await db.getKv('missing')).toBeUndefined();
    db.close();
  });

  it('round-trips a backup into a different database', async () => {
    const source = await openFresh();
    await seed(source);
    const exported = await source.exportAll();
    const text = serializeBackup(exported, T);
    const target = await openFresh();
    await target.addAttempts([{ questionId: 'q-old', chosen: 'a', correct: true, mode: 'quiz', at: 0 }]);
    await target.replaceAll(parseBackup(text));
    const restored: BackupData = await target.exportAll();
    expect(restored).toEqual(exported);
    expect(restored.cardStates[0].fsrs.due).toBeInstanceOf(Date);
    source.close();
    target.close();
  });
});

describe('parseBackup', () => {
  it('rejects non-JSON', () => {
    expect(() => parseBackup('nope')).toThrow(BackupError);
  });
  it('rejects files from another app or version', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'other', version: 1, exportedAt: '', data: {} }))).toThrow(/not an Ajada Learning backup/);
  });
  it('names files by local date', () => {
    expect(backupFileName(T)).toBe('ajada-backup-2026-09-26.json');
  });
});

describe('stricter backups', () => {
  async function validFile() {
    const db = await openFresh();
    await seed(db);
    const text = serializeBackup(await db.exportAll(), T);
    db.close();
    return JSON.parse(text) as { exportedAt: string; data: Record<string, Record<string, unknown>[]> };
  }

  it('round-trips a flag', async () => {
    const db = await openFresh();
    await db.putFlag({ itemId: 'c-a', kind: 'card', at: 7 });
    expect(await db.getFlags()).toEqual([{ itemId: 'c-a', kind: 'card', at: 7 }]);
    db.close();
  });

  it('rejects a file from a newer version', async () => {
    const file = { ...(await validFile()), version: 2 };
    expect(() => parseBackup(JSON.stringify(file))).toThrow(/not an Ajada Learning backup/);
  });

  type File = Awaited<ReturnType<typeof validFile>>;
  const fsrs = (f: File) => f.data.cardStates[0].fsrs as Record<string, unknown>;
  const damage: [string, (f: File) => void][] = [
    ['an invalid export date', (f) => { f.exportedAt = 'yesterday'; }],
    ['an invalid due date', (f) => { fsrs(f).due = 'soon'; }],
    ['an invalid last review date', (f) => { fsrs(f).last_review = '2026-13-45T99:00:00Z'; }],
    ['a non-numeric stability', (f) => { fsrs(f).stability = 'high'; }],
    ['a missing difficulty', (f) => { delete fsrs(f).difficulty; }],
    ['a fractional rep count', (f) => { fsrs(f).reps = 1.5; }],
    ['a negative lapse count', (f) => { fsrs(f).lapses = -1; }],
    ['an unknown FSRS state', (f) => { fsrs(f).state = 7; }],
    ['an unknown attempt mode', (f) => { f.data.attempts[0].mode = 'bogus'; }],
    ['a missing attempt mode', (f) => { delete f.data.attempts[0].mode; }],
    ['an unknown answer choice', (f) => { f.data.attempts[0].chosen = 'z'; }],
    ['a mock session without startedAt', (f) => { delete f.data.mockSessions[0].startedAt; }],
    ['a mock session with zero duration', (f) => { f.data.mockSessions[0].durationMs = 0; }],
    ['a mock session with a bad answer', (f) => { f.data.mockSessions[0].answers = { 'q-a': 'z' }; }],
    ['a mock session without flagged', (f) => { delete f.data.mockSessions[0].flagged; }],
    ['a mock session index past the end', (f) => { f.data.mockSessions[0].currentIndex = 1; }],
    ['a mock session with a negative index', (f) => { f.data.mockSessions[0].currentIndex = -1; }],
  ];
  for (const [what, hurt] of damage) {
    it(`rejects a file with ${what}`, async () => {
      const file = await validFile();
      expect(() => parseBackup(JSON.stringify(file))).not.toThrow();
      hurt(file);
      expect(() => parseBackup(JSON.stringify(file))).toThrow(/damaged or incomplete/);
    });
  }

  it('keeps existing data when an import fails partway, without an unhandled rejection', async () => {
    const db = await openFresh();
    await seed(db);
    const before = await db.exportAll();
    const good = parseBackup(serializeBackup(before, T));
    // A card state without its key can't be stored, so the write fails after the stores were cleared.
    const bad: BackupData = { ...good, cardStates: [{ ...good.cardStates[0], key: undefined as unknown as string }] };
    await expect(db.replaceAll(bad)).rejects.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(await db.exportAll()).toEqual(before);
    db.close();
  });
});
