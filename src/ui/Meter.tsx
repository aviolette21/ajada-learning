import { motion } from 'motion/react';
import { scoreStatus } from '../study/readiness';

const SCORE_TONE = { 'on-track': 'good', close: 'mid', 'needs-work': 'low', 'not-started': 'none' } as const;

/** score: colour against the exam pass line (green at or above it). Otherwise a plain progress bar. */
export function Meter({ value, label, score = false }: { value: number | null; label: string; score?: boolean }) {
  const pct = value === null ? 0 : Math.round(value * 100);
  const tone = score ? SCORE_TONE[scoreStatus(value)] : value === null ? 'none' : value >= 0.75 ? 'good' : value >= 0.55 ? 'mid' : 'low';
  return (
    <div className="meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <motion.i className={`meter-fill tone-${tone}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }} />
    </div>
  );
}
