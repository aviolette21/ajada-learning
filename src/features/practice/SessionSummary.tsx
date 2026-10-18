import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Button } from '../../ui/Button';
import type { RunSummary } from './QuestionRunner';

export function SessionSummary({ summary, extra, onDone, doneLabel = 'Done', retryTo = (ids) => `/practice/mistakes?ids=${ids.join(',')}` }: {
  summary: RunSummary;
  extra?: string;
  onDone: () => void;
  doneLabel?: string;
  /** Where "retry the ones you missed" goes; the mistakes pile by default. */
  retryTo?: (ids: string[]) => string;
}) {
  const ratio = summary.total === 0 ? 0 : summary.correct / summary.total;
  const [emoji, message] = ratio >= 0.8 ? ['🎉', 'Excellent work.'] : ratio >= 0.6 ? ['💪', 'Solid, keep going.'] : ['🌱', 'Every miss is now on your review list.'];
  return (
    <motion.div className="summary" initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
      <div className="big-emoji" aria-hidden="true">{emoji}</div>
      <div className="score">{summary.correct} / {summary.total}</div>
      <p>{message}</p>
      {extra && <p className="muted">{extra}</p>}
      {summary.missedIds.length > 0 && (
        <Link className="btn btn-secondary btn-block" to={retryTo(summary.missedIds)}>
          Retry the {summary.missedIds.length} you missed or guessed
        </Link>
      )}
      <Button block onClick={onDone}>{doneLabel}</Button>
    </motion.div>
  );
}
