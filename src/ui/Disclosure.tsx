import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { IconChevron } from './icons';

export function Disclosure({ title, children }: { title: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="disclosure">
      <button type="button" className="sheet-row" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span>{title}</span>
        <motion.span className="chev" animate={{ rotate: open ? 90 : 0 }}><IconChevron /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="disclosure-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
