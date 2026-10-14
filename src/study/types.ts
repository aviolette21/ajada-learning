import type { Card as FsrsCard } from 'ts-fsrs';
import type { Chosen } from '../content/schema';

export type Direction = 'forward' | 'reverse';
export type DirectionMode = Direction | 'mixed';
export type UserRating = 'again' | 'hard' | 'good' | 'easy';

export interface StoredCardState {
  key: string;
  cardId: string;
  direction: Direction;
  fsrs: FsrsCard;
  /** Local calendar day (YYYY-MM-DD) this card/direction was first reviewed. */
  introducedOn: string;
}

export type AttemptMode = 'quiz' | 'weak' | 'lesson' | 'mock' | 'today';

export interface Attempt {
  id?: number;
  questionId: string;
  chosen: Chosen;
  correct: boolean;
  /** false when the learner marked the answer as a guess; absent means sure (and for attempts saved before this existed). */
  confident?: boolean;
  mode: AttemptMode;
  at: number;
}

export interface MockSession {
  id: string;
  startedAt: number;
  durationMs: number;
  questionIds: string[];
  answers: Record<string, Chosen>;
  flagged: string[];
  /** Questions the learner marked as a guess during the exam. */
  guessed?: string[];
  currentIndex: number;
  submittedAt?: number;
}

export interface LessonDone { lessonId: string; at: number }
export interface Flag { itemId: string; kind: 'question' | 'card'; at: number }

export interface Settings {
  newCardsPerDay: number;
  cardDirection: DirectionMode;
  lastBackupAt?: number;
  installHintDismissedAt?: number;
}

export const DEFAULT_SETTINGS: Settings = { newCardsPerDay: 15, cardDirection: 'forward' };
