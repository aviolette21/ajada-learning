import { z } from 'zod';
import { localDay } from '../study/scheduler';
import type { BackupData } from './db';

export const BACKUP_APP = 'ajada-learning';
export const BACKUP_VERSION = 1;

export class BackupError extends Error {}

const FileSchema = z.object({
  app: z.string(),
  version: z.number(),
  exportedAt: z.string(),
  data: z.object({
    cardStates: z.array(z.looseObject({
      key: z.string(), cardId: z.string(), direction: z.enum(['forward', 'reverse']), introducedOn: z.string(),
      fsrs: z.looseObject({ due: z.string(), last_review: z.string().optional() }),
    })),
    attempts: z.array(z.looseObject({ questionId: z.string(), chosen: z.string(), correct: z.boolean(), at: z.number() })),
    mockSessions: z.array(z.looseObject({ id: z.string(), questionIds: z.array(z.string()) })),
    lessonsDone: z.array(z.looseObject({ lessonId: z.string(), at: z.number() })),
    flags: z.array(z.looseObject({ itemId: z.string(), kind: z.enum(['question', 'card']), at: z.number() })),
    kv: z.array(z.object({ key: z.string(), value: z.unknown() })),
  }),
});

export function serializeBackup(data: BackupData, exportedAt: Date): string {
  return JSON.stringify({ app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: exportedAt.toISOString(), data });
}

export function parseBackup(text: string): BackupData {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new BackupError('That file is not valid JSON.');
  }
  const head = json as { app?: unknown; version?: unknown };
  if (head?.app !== BACKUP_APP || head?.version !== BACKUP_VERSION) {
    throw new BackupError('That file is not an Ajada Learning backup (or is from a newer version).');
  }
  const parsed = FileSchema.safeParse(json);
  if (!parsed.success) throw new BackupError('That backup file is damaged or incomplete.');
  const data = parsed.data.data as unknown as BackupData;
  for (const s of data.cardStates) {
    const f = s.fsrs as unknown as { due: string | Date; last_review?: string | Date };
    f.due = new Date(f.due);
    if (f.last_review !== undefined) f.last_review = new Date(f.last_review);
  }
  return data;
}

export function backupFileName(d: Date): string {
  return `ajada-backup-${localDay(d)}.json`;
}
