import { createEmptyCard, fsrs, Rating, type Grade } from 'ts-fsrs';
import type { Direction, DirectionMode, StoredCardState, UserRating } from './types';

const scheduler = fsrs();
const GRADE: Record<UserRating, Grade> = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good, easy: Rating.Easy };

export const RATINGS: UserRating[] = ['again', 'hard', 'good', 'easy'];
/** Cards due again within this window come back in the same session (FSRS learning steps). */
export const REQUEUE_WINDOW_MS = 15 * 60_000;

export function stateKey(cardId: string, direction: Direction): string {
  return `${cardId}:${direction}`;
}

export function localDay(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function newState(cardId: string, direction: Direction, now: Date): StoredCardState {
  return { key: stateKey(cardId, direction), cardId, direction, fsrs: createEmptyCard(now), introducedOn: localDay(now) };
}

export function rate(state: StoredCardState, rating: UserRating, now: Date): StoredCardState {
  const { card } = scheduler.next(state.fsrs, now, GRADE[rating]);
  return { ...state, fsrs: card };
}

export function formatInterval(ms: number): string {
  const min = 60_000, hour = 60 * min, day = 24 * hour;
  if (ms < min) return '<1m';
  if (ms < hour) return `${Math.round(ms / min)}m`;
  if (ms < day) return `${Math.round(ms / hour)}h`;
  if (ms < 30 * day) return `${Math.round(ms / day)}d`;
  if (ms < 365 * day) return `${Math.round(ms / (30 * day))}mo`;
  return `${(ms / (365 * day)).toFixed(1)}y`;
}

export function previewIntervals(state: StoredCardState, now: Date): Record<UserRating, string> {
  const preview = scheduler.repeat(state.fsrs, now);
  const out = {} as Record<UserRating, string>;
  for (const r of RATINGS) out[r] = formatInterval(preview[GRADE[r]].card.due.getTime() - now.getTime());
  return out;
}

export function shouldRequeue(state: StoredCardState, now: Date): boolean {
  return state.fsrs.due.getTime() - now.getTime() < REQUEUE_WINDOW_MS;
}

export function resurface(state: StoredCardState, now: Date): StoredCardState {
  return { ...state, fsrs: { ...state.fsrs, due: now } };
}

export function nextDueIn(states: Map<string, StoredCardState>, now: Date): string | null {
  let soonest = Infinity;
  for (const s of states.values()) {
    const t = s.fsrs.due.getTime();
    if (t > now.getTime() && t < soonest) soonest = t;
  }
  return soonest === Infinity ? null : formatInterval(soonest - now.getTime());
}

export interface QueueItem {
  cardId: string;
  direction: Direction;
  /** null = never reviewed in this direction (a new card). */
  state: StoredCardState | null;
}

export function buildQueue(args: {
  cardIds: string[];
  states: Map<string, StoredCardState>;
  mode: DirectionMode;
  now: Date;
  newPerDay: number;
  rng: () => number;
}): QueueItem[] {
  const { cardIds, states, mode, now, newPerDay, rng } = args;
  const dirs: Direction[] = mode === 'mixed' ? ['forward', 'reverse'] : [mode];
  const today = localDay(now);
  let introducedToday = 0;
  for (const s of states.values()) if (s.introducedOn === today) introducedToday++;
  let budget = Math.max(0, newPerDay - introducedToday);

  const due: QueueItem[] = [];
  const fresh: QueueItem[] = [];
  for (const cardId of cardIds) {
    const unseen: Direction[] = [];
    for (const direction of dirs) {
      const state = states.get(stateKey(cardId, direction));
      if (!state) unseen.push(direction);
      else if (state.fsrs.due.getTime() <= now.getTime()) due.push({ cardId, direction, state });
    }
    const siblingIntroducedToday = (['forward', 'reverse'] as const).some(
      (d) => states.get(stateKey(cardId, d))?.introducedOn === today,
    );
    if (unseen.length > 0 && budget > 0 && !siblingIntroducedToday) {
      const direction = unseen.length === 1 ? unseen[0] : unseen[Math.floor(rng() * unseen.length)];
      fresh.push({ cardId, direction, state: null });
      budget--;
    }
  }
  due.sort((a, b) => a.state!.fsrs.due.getTime() - b.state!.fsrs.due.getTime());
  return [...due, ...fresh];
}
