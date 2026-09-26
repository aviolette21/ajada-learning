import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { sheetSpring } from './motion';

export function Sheet({ open, label, children }: { open: boolean; label: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.section className="sheet" role="dialog" aria-label={label}
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={sheetSpring}>
          <div className="sheet-grip" aria-hidden="true" />
          {children}
        </motion.section>
      )}
    </AnimatePresence>
  );
}
