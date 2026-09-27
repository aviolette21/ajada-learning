import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Attempt, Flag, LessonDone, MockSession, StoredCardState } from '../study/types';

interface AjadaSchema extends DBSchema {
  cardStates: { key: string; value: StoredCardState };
  attempts: { key: number; value: Attempt; indexes: { byQuestion: string } };
  mockSessions: { key: string; value: MockSession };
  lessonsDone: { key: string; value: LessonDone };
  flags: { key: string; value: Flag };
  kv: { key: string; value: unknown };
}

const STORES = ['cardStates', 'attempts', 'mockSessions', 'lessonsDone', 'flags', 'kv'] as const;

export interface BackupData {
  cardStates: StoredCardState[];
  attempts: Attempt[];
  mockSessions: MockSession[];
  lessonsDone: LessonDone[];
  flags: Flag[];
  kv: { key: string; value: unknown }[];
}

/**
 * Awaits a transaction's requests and its completion together. `queue` issues the requests through `add`, so each one
 * is tracked as it is made. Any failure, even a request that throws before it is queued, aborts the transaction so
 * nothing partial commits, and no request is left with an unhandled rejection.
 */
async function run<T>(tx: { done: Promise<void>; abort(): void }, queue: (add: (request: Promise<T>) => void) => void): Promise<T[]> {
  const requests: Promise<T>[] = [];
  try {
    queue((request) => void requests.push(request));
    const [results] = await Promise.all([Promise.all(requests), tx.done]);
    return results;
  } catch (err) {
    for (const r of [...requests, tx.done]) r.catch(() => {});
    try {
      tx.abort();
    } catch {
      // Already finished or aborted.
    }
    throw err;
  }
}

export class AppDb {
  private constructor(private readonly db: IDBPDatabase<AjadaSchema>) {}

  static async open(name = 'ajada'): Promise<AppDb> {
    const db = await openDB<AjadaSchema>(name, 1, {
      upgrade(d) {
        d.createObjectStore('cardStates', { keyPath: 'key' });
        d.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true }).createIndex('byQuestion', 'questionId');
        d.createObjectStore('mockSessions', { keyPath: 'id' });
        d.createObjectStore('lessonsDone', { keyPath: 'lessonId' });
        d.createObjectStore('flags', { keyPath: 'itemId' });
        d.createObjectStore('kv');
      },
    });
    return new AppDb(db);
  }

  getCardStates() { return this.db.getAll('cardStates'); }

  async putCardStates(states: StoredCardState[]) {
    const tx = this.db.transaction('cardStates', 'readwrite');
    await run(tx, (add) => { for (const s of states) add(tx.store.put(s)); });
  }

  async addAttempts(list: Attempt[]): Promise<Attempt[]> {
    const tx = this.db.transaction('attempts', 'readwrite');
    const ids = await run<number>(tx, (add) => { for (const { id: _drop, ...a } of list) add(tx.store.add(a as Attempt)); });
    return list.map((a, i) => ({ ...a, id: ids[i] }));
  }

  /** Stores an attempt and the card states it resurfaced in one transaction. */
  async recordAttempt(attempt: Attempt, states: StoredCardState[]): Promise<Attempt> {
    const tx = this.db.transaction(['attempts', 'cardStates'], 'readwrite');
    const { id: _drop, ...a } = attempt;
    const [id] = await run<unknown>(tx, (add) => {
      add(tx.objectStore('attempts').add(a as Attempt));
      for (const s of states) add(tx.objectStore('cardStates').put(s));
    });
    return { ...attempt, id: id as number };
  }

  /** Saves a submitted session and its attempts in one transaction, so a session is never submitted without them. */
  async submitMockSession(session: MockSession, attempts: Attempt[]): Promise<Attempt[]> {
    const tx = this.db.transaction(['mockSessions', 'attempts'], 'readwrite');
    const [, ...ids] = await run<unknown>(tx, (add) => {
      add(tx.objectStore('mockSessions').put(session));
      for (const { id: _drop, ...a } of attempts) add(tx.objectStore('attempts').add(a as Attempt));
    });
    return attempts.map((a, i) => ({ ...a, id: ids[i] as number }));
  }

  getAttempts() { return this.db.getAll('attempts'); }
  getMockSessions() { return this.db.getAll('mockSessions'); }
  async putMockSession(s: MockSession) { await this.db.put('mockSessions', s); }
  async deleteMockSession(id: string) { await this.db.delete('mockSessions', id); }
  async markLessonDone(lessonId: string, at: number) { await this.db.put('lessonsDone', { lessonId, at }); }
  getLessonsDone() { return this.db.getAll('lessonsDone'); }
  async putFlag(f: Flag) { await this.db.put('flags', f); }
  async deleteFlag(itemId: string) { await this.db.delete('flags', itemId); }
  getFlags() { return this.db.getAll('flags'); }
  async getKv<T>(key: string): Promise<T | undefined> { return (await this.db.get('kv', key)) as T | undefined; }
  async setKv(key: string, value: unknown) { await this.db.put('kv', value, key); }

  async exportAll(): Promise<BackupData> {
    // One transaction, so the stores (and kv's keys and values) are read from the same snapshot.
    const tx = this.db.transaction([...STORES], 'readonly');
    const [cardStates, attempts, mockSessions, lessonsDone, flags, kvValues, kvKeys] = await run<unknown>(tx, (add) => {
      for (const s of STORES) add(tx.objectStore(s).getAll());
      add(tx.objectStore('kv').getAllKeys());
    }) as [StoredCardState[], Attempt[], MockSession[], LessonDone[], Flag[], unknown[], string[]];
    return { cardStates, attempts, mockSessions, lessonsDone, flags, kv: kvKeys.map((key, i) => ({ key, value: kvValues[i] })) };
  }

  async replaceAll(data: BackupData) {
    const tx = this.db.transaction([...STORES], 'readwrite');
    // Clears and puts share one transaction: if any put fails, the clears roll back too.
    await run<unknown>(tx, (add) => {
      for (const s of STORES) add(tx.objectStore(s).clear());
      for (const v of data.cardStates) add(tx.objectStore('cardStates').put(v));
      for (const v of data.attempts) add(tx.objectStore('attempts').put(v));
      for (const v of data.mockSessions) add(tx.objectStore('mockSessions').put(v));
      for (const v of data.lessonsDone) add(tx.objectStore('lessonsDone').put(v));
      for (const v of data.flags) add(tx.objectStore('flags').put(v));
      for (const { key, value } of data.kv) add(tx.objectStore('kv').put(value, key));
    });
  }

  close() { this.db.close(); }
}
