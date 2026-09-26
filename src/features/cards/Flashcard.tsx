import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useRef } from 'react';
import { renderInline } from '../../ui/inline';
import { flipSpring } from '../../ui/motion';
import type { DeckItem } from './deck';

export const SWIPE_THRESHOLD = 100;

export function Flashcard({ item, domainName, flipped, onFlip, onSwipe }: {
  item: DeckItem;
  domainName: string;
  flipped: boolean;
  onFlip: () => void;
  onSwipe: (rating: 'again' | 'good') => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const goodOpacity = useTransform(x, [20, 110], [0, 1]);
  const againOpacity = useTransform(x, [-110, -20], [1, 0]);
  const dragged = useRef(false);
  const { card } = item;
  const reverse = item.direction === 'reverse';

  return (
    <motion.div
      className="fc"
      style={{ x, rotate }}
      drag={flipped ? 'x' : false}
      dragMomentum={false}
      dragElastic={0.85}
      onPointerDown={() => { dragged.current = false; }}
      onDragStart={() => { dragged.current = true; }}
      onDragEnd={(_, info) => {
        const flicked = Math.abs(info.velocity.x) > 800;
        if (flicked || Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
          // Leave x where it is so the tilt and stamp hold while the card flies off; a flick goes the way it was thrown.
          onSwipe((flicked ? info.velocity.x : info.offset.x) > 0 ? 'good' : 'again');
        } else {
          animate(x, 0, { type: 'spring', stiffness: 500, damping: 22, velocity: info.velocity.x });
        }
      }}
      onClick={() => { if (!dragged.current) onFlip(); }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onFlip();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={flipped ? 'Card back, tap to see the front' : 'Card front, tap to flip'}
    >
      <motion.span className="fc-stamp fc-stamp-again" style={{ opacity: againOpacity }} aria-hidden="true">AGAIN</motion.span>
      <motion.span className="fc-stamp fc-stamp-good" style={{ opacity: goodOpacity }} aria-hidden="true">GOOD</motion.span>
      <motion.div className="fc-flip" initial={false} animate={{ rotateY: flipped ? 180 : 0 }} transition={flipSpring}>
        <div className="fc-face fc-front" aria-hidden={flipped}>
          <span className="tag">{domainName}</span>
          <div className={`fc-main ${reverse ? 'fc-main-def' : ''}`}>{reverse ? renderInline(card.definition) : card.term}</div>
          <div className="fc-hint">{reverse ? 'Which term is this? Tap to flip' : 'Tap to flip'}</div>
        </div>
        <div className="fc-face fc-back" aria-hidden={!flipped}>
          <span className="tag">{domainName}</span>
          {reverse ? <div className="fc-term-answer">{card.term}</div> : <div className="fc-def">{renderInline(card.definition)}</div>}
          <div className="fc-sec">Why it matters</div>
          <div className="fc-txt">{renderInline(card.whyItMatters)}</div>
          {card.example && (
            <>
              <div className="fc-sec">Example</div>
              <div className="fc-txt">{renderInline(card.example)}</div>
            </>
          )}
          <a className="source" href={card.source.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
            📎 {card.source.title}
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}
