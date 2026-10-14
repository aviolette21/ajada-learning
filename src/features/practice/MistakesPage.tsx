import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import type { Question } from '../../content/schema';
import { missedQuestionIds } from '../../study/weakSpots';
import { Button } from '../../ui/Button';
import { QuestionRunner, type RunSummary } from './QuestionRunner';
import { SessionSummary } from './SessionSummary';

export const MISTAKES_ROUND = 20;

/** Re-asks questions from the mistakes pile, or the specific ones in ?ids= (a "retry the ones I missed" link). */
export function MistakesPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { questionById } = useContent();
  const { attempts } = useProgress();
  const [picked] = useState(() => {
    const ids = params.get('ids')?.split(',').filter(Boolean) ?? missedQuestionIds(attempts);
    return ids.map((id) => questionById.get(id)).filter((q): q is Question => Boolean(q)).slice(0, MISTAKES_ROUND);
  });
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const back = () => navigate('/practice');

  if (picked.length === 0) {
    return (
      <div className="summary">
        <div className="big-emoji" aria-hidden="true">🎉</div>
        <p>No mistakes to review. Questions you miss or guess land here until you get them right on two different days.</p>
        <Button block onClick={back}>Back to practice</Button>
      </div>
    );
  }
  if (summary) return <SessionSummary summary={summary} onDone={back} />;
  return <QuestionRunner questions={picked} mode="weak" title="Mistakes" onFinish={setSummary} onExit={back} />;
}
