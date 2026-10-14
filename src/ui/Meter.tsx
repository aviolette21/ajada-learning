import { motion } from 'motion/react';
import type { ScoreStatus } from '../study/readiness';

const STATUS_TONE: Record<ScoreStatus, string> = { 'on-track': 'good', close: 'mid', 'needs-work': 'low', early: 'neutral', 'not-started': 'none' };

/** status: colour a score against the exam pass line (grey while it's an early estimate). Otherwise a plain progress bar. */
export function Meter({ value, label, status }: { value: number | null; label: string; status?: ScoreStatus }) {
  const pct = value === null ? 0 : Math.round(value * 100);
  const tone = status ? STATUS_TONE[status] : value === null ? 'none' : value >= 0.75 ? 'good' : value >= 0.55 ? 'mid' : 'low';
  return (
    <div className="meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <motion.i className={`meter-fill tone-${tone}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }} />
    </div>
  );
}
