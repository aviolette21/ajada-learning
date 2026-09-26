import { motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useClock } from '../../app/clock';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { buildQueue, newState, nextDueIn, previewIntervals, rate, shouldRequeue } from '../../study/scheduler';
import type { DirectionMode, UserRating } from '../../study/types';
import { Button } from '../../ui/Button';
import { IconClose } from '../../ui/icons';
import { ProgressBar } from '../../ui/ProgressBar';
import '../practice/practice.css';
import './cards.css';
import { toDeckItem, type DeckItem } from './deck';
import { FlashcardDeck } from './FlashcardDeck';

export function CardReviewSession({ mode, onDone, onExit, toolbar, doneLabel = 'Done' }: {
  mode: DirectionMode;
  onDone: (reviewed: number) => void;
  onExit: () => void;
  toolbar?: ReactNode;
  doneLabel?: string;
}) {
  const { cards, cardById } = useContent();
  const { cardStates, settings, saveCardState } = useProgress();
  const { now } = useClock();
  const seq = useRef(0);
  const [items, setItems] = useState<DeckItem[]>(() =>
    buildQueue({ cardIds: cards.map((c) => c.id), states: cardStates, mode, now: now(), newPerDay: settings.newCardsPerDay, rng: Math.random })
      .map((q) => toDeckItem(q, cardById, seq.current++)),
  );
  const [reviewed, setReviewed] = useState(0);
  /** Key of the card on top; ratings for any other card (e.g. a second tap on a leaving card's buttons) are ignored. */
  const headKey = useRef<string | null>(items[0]?.key ?? null);
  useEffect(() => {
    headKey.current = items[0]?.key ?? null;
  }, [items]);

  const onRate = (item: DeckItem, rating: UserRating) => {
    if (item.key !== headKey.current) return;
    headKey.current = null;
    const t = now();
    const next = rate(item.state ?? newState(item.cardId, item.direction, t), rating, t);
    void saveCardState(next);
    setReviewed((n) => n + 1);
    setItems((list) => {
      const rest = list.slice(1);
      return shouldRequeue(next, t) ? [...rest, { ...item, state: next, key: `${next.key}@${seq.current++}` }] : rest;
    });
  };
  const intervalsFor = (item: DeckItem) => {
    const t = now();
    return previewIntervals(item.state ?? newState(item.cardId, item.direction, t), t);
  };

  const header = (
    <header className="runner-head">
      <button type="button" className="icon-btn" aria-label="Close" onClick={onExit}><IconClose /></button>
      <span className="runner-count">{items.length > 0 ? `${items.length} left` : 'Flashcards'}</span>
      <span className="icon-btn-spacer" />
    </header>
  );

  if (items.length === 0) {
    const next = nextDueIn(cardStates, now());
    return (
      <div className="review">
        {header}
        {toolbar}
        <motion.div className="done-card" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
          <div className="big-emoji" aria-hidden="true">🎉</div>
          <h2>{reviewed > 0 ? 'Session complete' : 'Nothing due right now'}</h2>
          <p className="muted">
            {reviewed > 0 ? `${reviewed} review${reviewed === 1 ? '' : 's'} done. ` : ''}
            {next ? `Next card due in ${next}.` : ''}
          </p>
          <Button block onClick={() => onDone(reviewed)}>{doneLabel}</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="review">
      {header}
      <ProgressBar value={reviewed / (reviewed + items.length)} label="Session progress" />
      {toolbar}
      <FlashcardDeck items={items} onRate={onRate} intervalsFor={intervalsFor} />
    </div>
  );
}
