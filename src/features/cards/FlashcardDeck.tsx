import { AnimatePresence, motion, type Variants } from 'motion/react';
import { useState } from 'react';
import { useContent } from '../../app/ContentContext';
import type { UserRating } from '../../study/types';
import { spring } from '../../ui/motion';
import type { DeckItem } from './deck';
import { Flashcard } from './Flashcard';
import { RatingBar } from './RatingBar';

// The leaving card precedes the new top card in the DOM, so lift it above the stack and make it inert while it flies off.
const exitVariants: Variants = {
  exit: (dir: number) => ({
    x: dir * 480, rotate: dir * 24, opacity: 0, zIndex: 20, pointerEvents: 'none',
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1], zIndex: { duration: 0 } },
  }),
};

export function FlashcardDeck({ items, onRate, intervalsFor }: {
  items: DeckItem[];
  onRate: (item: DeckItem, rating: UserRating) => void;
  intervalsFor: (item: DeckItem) => Record<UserRating, string>;
}) {
  const { domainById } = useContent();
  const [flipped, setFlipped] = useState(false);
  const [exitDir, setExitDir] = useState(1);
  const top = items[0];

  const rateTop = (rating: UserRating) => {
    if (!top) return;
    setExitDir(rating === 'again' || rating === 'hard' ? -1 : 1);
    setFlipped(false);
    onRate(top, rating);
  };

  return (
    <div className="deck">
      <div className="deck-stage">
        <AnimatePresence custom={exitDir}>
          {items.slice(0, 3).map((item, depth) => (
            <motion.div
              key={item.key}
              className="deck-slot"
              custom={exitDir}
              variants={exitVariants}
              exit="exit"
              initial={{ scale: 0.88, y: 26, opacity: 0 }}
              animate={{ scale: 1 - depth * 0.06, y: depth * 13, opacity: depth === 0 ? 1 : depth === 1 ? 0.55 : 0.25 }}
              transition={spring}
              style={{ zIndex: 10 - depth, pointerEvents: depth === 0 ? 'auto' : 'none' }}
            >
              {depth === 0 ? (
                <Flashcard item={item} domainName={domainById.get(item.card.domainId)?.shortName ?? ''} flipped={flipped}
                  onFlip={() => setFlipped((f) => !f)} onSwipe={rateTop} />
              ) : (
                <div className="fc" aria-hidden="true"><div className="fc-face fc-front" /></div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <RatingBar visible={flipped && Boolean(top)} intervals={top ? intervalsFor(top) : null} onRate={rateTop} />
    </div>
  );
}
