import { AnimatePresence, motion } from 'motion/react';
import { RATINGS } from '../../study/scheduler';
import type { UserRating } from '../../study/types';
import { spring } from '../../ui/motion';

const LABEL: Record<UserRating, string> = { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' };

export function RatingBar({ visible, intervals, onRate }: {
  visible: boolean;
  intervals: Record<UserRating, string> | null;
  onRate: (r: UserRating) => void;
}) {
  return (
    <div className="rate-slot">
      <AnimatePresence>
        {visible && intervals && (
          <motion.div className="rate" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} transition={spring}>
            {RATINGS.map((r) => (
              <motion.button key={r} type="button" whileTap={{ scale: 0.92 }} className={`rate-btn rate-${r}`} onClick={() => onRate(r)}>
                {LABEL[r]}
                <small>{intervals[r]}</small>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
