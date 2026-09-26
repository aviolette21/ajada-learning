import type { Card } from '../../content/schema';
import { stateKey, type QueueItem } from '../../study/scheduler';
import type { Direction, StoredCardState } from '../../study/types';

export interface DeckItem {
  /** Unique per appearance so a requeued card animates in as a new card. */
  key: string;
  cardId: string;
  direction: Direction;
  card: Card;
  state: StoredCardState | null;
}

export function toDeckItem(q: QueueItem, cardById: Map<string, Card>, seq: number): DeckItem {
  return { key: `${stateKey(q.cardId, q.direction)}@${seq}`, cardId: q.cardId, direction: q.direction, card: cardById.get(q.cardId)!, state: q.state };
}
