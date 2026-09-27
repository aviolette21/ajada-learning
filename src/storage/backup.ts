import { z } from 'zod';
import { ChoiceIdSchema } from '../content/schema';
import { localDay } from '../study/scheduler';
import type { AttemptMode } from '../study/types';
import type { BackupData } from './db';

export const BACKUP_APP = 'ajada-learning';
export const BACKUP_VERSION = 1;

export class BackupError extends Error {}

/** A date as JSON writes it; rejects strings that would become an Invalid Date. */
const dateString = z.string().refine((s) => !Number.isNaN(Date.parse(s)));
const count = z.int().nonnegative();
/** Every attempt mode; typed as a Record so adding a mode to AttemptMode without listing it here fails to compile. */
const ATTEMPT_MODES: Record<AttemptMode, true> = { quiz: true, weak: true, lesson: true, mock: true, today: true };

const FileSchema = z.object({
  app: z.string(),
  version: z.number(),
  exportedAt: dateString,
  data: z.object({
    cardStates: z.array(z.looseObject({
      key: z.string(), cardId: z.string(), direction: z.enum(['forward', 'reverse']), introducedOn: z.string(),
      fsrs: z.looseObject({
        due: dateString.transform((s) => new Date(s)),
        last_review: dateString.transform((s) => new Date(s)).optional(),
        stability: z.number(), difficulty: z.number(), elapsed_days: z.number(), scheduled_days: z.number(),
        learning_steps: z.number(), reps: count, lapses: count, state: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
      }),
    })),
    attempts: z.array(z.looseObject({
      id: z.int().optional(), questionId: z.string(), chosen: ChoiceIdSchema, correct: z.boolean(),
      mode: z.string().refine((m) => Object.hasOwn(ATTEMPT_MODES, m)), at: z.number(),
    })),
    mockSessions: z.array(z.looseObject({
      id: z.string(), startedAt: z.number(), durationMs: z.number().positive(), questionIds: z.array(z.string()),
      answers: z.record(z.string(), ChoiceIdSchema), flagged: z.array(z.string()), currentIndex: count,
      submittedAt: z.number().optional(),
    }).refine((m) => m.currentIndex < m.questionIds.length)),
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
  return parsed.data.data as unknown as BackupData;
}

export function backupFileName(d: Date): string {
  return `ajada-backup-${localDay(d)}.json`;
}
