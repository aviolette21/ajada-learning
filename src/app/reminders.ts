import type { Attempt, StoredCardState } from '../study/types';

export const BACKUP_REMINDER_DAYS = 14;

export function firstActivityAt(attempts: Attempt[], states: Map<string, StoredCardState>): number | undefined {
  let min = Infinity;
  for (const a of attempts) min = Math.min(min, a.at);
  for (const s of states.values()) if (s.fsrs.last_review) min = Math.min(min, new Date(s.fsrs.last_review).getTime());
  return min === Infinity ? undefined : min;
}

export function needsBackupReminder(args: { lastBackupAt?: number; firstActivityAt?: number; now: Date }): boolean {
  const reference = args.lastBackupAt ?? args.firstActivityAt;
  if (reference === undefined) return false;
  return args.now.getTime() - reference >= BACKUP_REMINDER_DAYS * 86_400_000;
}

export function isStandalone(win: Window = window): boolean {
  const nav = win.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || win.matchMedia?.('(display-mode: standalone)').matches === true;
}
