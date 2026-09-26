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
