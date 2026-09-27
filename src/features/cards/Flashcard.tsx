import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useLayoutEffect, useRef, useState } from 'react';
import { renderInline } from '../../ui/inline';
import { flipSpring } from '../../ui/motion';
import type { DeckItem } from './deck';

export const SWIPE_THRESHOLD = 100;
/** Terms longer than this get a smaller front size so they don't wrap awkwardly. */
export const LONG_TERM = 16;

/** True while the element has content below its visible area (drives the back's bottom-fade scroll cue). */
function useMoreBelow<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [more, setMore] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
    update();
    el.addEventListener('scroll', update, { passive: true });
    // Watch the viewport and its content: late font loads or a resize can change whether there is more below.
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    ro?.observe(el);
    if (el.firstElementChild) ro?.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, []);
  return [ref, more] as const;
}

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
  // Keep BOTH on purpose: CSS backface-visibility (cards.css) and this 90° visibility swap. Some WebKit builds ignore
  // backface-visibility and show the back face mirrored through the front; the swap guards that (see e2e flip test).
  const rotateY = useMotionValue(flipped ? 180 : 0);
  const frontVisibility = useTransform(rotateY, (r) => (r < 90 ? 'visible' : 'hidden'));
  const backVisibility = useTransform(rotateY, (r) => (r < 90 ? 'hidden' : 'visible'));
  const [scrollRef, moreBelow] = useMoreBelow<HTMLDivElement>();
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
      <motion.div className="fc-flip" style={{ rotateY }} initial={false} animate={{ rotateY: flipped ? 180 : 0 }} transition={flipSpring}>
        <motion.div className="fc-face fc-front" style={{ visibility: frontVisibility }} aria-hidden={flipped}>
          <span className="tag">{domainName}</span>
          <div className={`fc-main ${reverse ? 'fc-main-def' : card.term.length > LONG_TERM ? 'fc-main-long' : ''}`}>{reverse ? renderInline(card.definition) : card.term}</div>
          <div className="fc-hint">{reverse ? 'Which term is this? Tap to flip' : 'Tap to flip'}</div>
        </motion.div>
        <motion.div className="fc-face fc-back" style={{ visibility: backVisibility }} aria-hidden={!flipped} data-more={moreBelow}>
          {/* The scroll lives on an inner wrapper so a vertical pan scrolls (touch-action pan-y) instead of dragging. */}
          <div className="fc-scroll" ref={scrollRef}>
            <div className="fc-scroll-body">
              <span className="tag">{domainName}</span>
              {reverse ? <div className="fc-term-answer">{card.term}</div> : <div className="fc-def">{renderInline(card.definition)}</div>}
              <div className="fc-sec">Why it matters</div>
              <div className="fc-txt">{renderInline(card.whyItMatters)}</div>
              {card.example && (
                <>
                  <div className="fc-sec">Example</div>
                  <div className="fc-txt fc-example">{renderInline(card.example)}</div>
                </>
              )}
              <a className="source" href={card.source.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                📎 {card.source.title}
              </a>
            </div>
          </div>
          <div className="fc-fade" aria-hidden="true" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
