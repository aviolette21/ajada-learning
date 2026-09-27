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
    await Promise.all([...states.map((s) => tx.store.put(s)), tx.done]);
  }

  async addAttempts(list: Attempt[]): Promise<Attempt[]> {
    const tx = this.db.transaction('attempts', 'readwrite');
    const ids = await Promise.all(list.map(({ id: _drop, ...a }) => tx.store.add(a as Attempt)));
    await tx.done;
    return list.map((a, i) => ({ ...a, id: ids[i] }));
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
    const [cardStates, attempts, mockSessions, lessonsDone, flags, kvKeys, kvValues] = await Promise.all([
      this.db.getAll('cardStates'), this.db.getAll('attempts'), this.db.getAll('mockSessions'),
      this.db.getAll('lessonsDone'), this.db.getAll('flags'), this.db.getAllKeys('kv'), this.db.getAll('kv'),
    ]);
    return { cardStates, attempts, mockSessions, lessonsDone, flags, kv: kvKeys.map((key, i) => ({ key, value: kvValues[i] })) };
  }

  async replaceAll(data: BackupData) {
    const tx = this.db.transaction([...STORES], 'readwrite');
    await Promise.all(STORES.map((s) => tx.objectStore(s).clear()));
    await Promise.all([
      ...data.cardStates.map((v) => tx.objectStore('cardStates').put(v)),
      ...data.attempts.map((v) => tx.objectStore('attempts').put(v)),
      ...data.mockSessions.map((v) => tx.objectStore('mockSessions').put(v)),
      ...data.lessonsDone.map((v) => tx.objectStore('lessonsDone').put(v)),
      ...data.flags.map((v) => tx.objectStore('flags').put(v)),
      ...data.kv.map(({ key, value }) => tx.objectStore('kv').put(value, key)),
    ]);
    await tx.done;
  }

  close() { this.db.close(); }
}
