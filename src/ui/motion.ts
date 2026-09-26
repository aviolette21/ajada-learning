import type { Transition } from 'motion/react';

export const spring: Transition = { type: 'spring', stiffness: 380, damping: 32 };
export const flipSpring: Transition = { type: 'spring', stiffness: 260, damping: 18 };
export const sheetSpring: Transition = { type: 'spring', stiffness: 320, damping: 34 };
export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] },
} as const;
