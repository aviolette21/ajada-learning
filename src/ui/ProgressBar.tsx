import { motion } from 'motion/react';

export function ProgressBar({ value, label = 'Progress' }: { value: number; label?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <motion.i className="progress-fill" animate={{ width: `${pct}%` }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }} />
    </div>
  );
}
