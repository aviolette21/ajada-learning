import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { setQuestions } from '../../content/practiceSets';
import { QuestionRunner, type RunSummary } from './QuestionRunner';
import { SessionSummary } from './SessionSummary';

/** Runs a third-party practice set in its author's order, or the ones in ?ids= (a retry); answers aren't recorded. */
export function PracticeSetPage() {
  const [params] = useSearchParams();
  // A retry lands on the same path with a new ?ids=, so key the run on it to start afresh.
  return <PracticeSetRun key={params.get('ids') ?? 'all'} />;
}

function PracticeSetRun() {
  const { setId = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { practiceSets } = useContent();
  const set = practiceSets.find((s) => s.id === setId);
  const [questions] = useState(() => {
    if (!set) return [];
    const all = setQuestions(set);
    const ids = (params.get('ids') ?? '').split(',').filter(Boolean);
    return ids.length > 0 ? all.filter((q) => ids.includes(q.id)) : all;
  });
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const back = () => navigate('/practice');
  if (summary) {
    return (
      <SessionSummary summary={summary} extra={set ? `Questions and explanations by ${set.author}. This set doesn't count toward your scores.` : undefined}
        retryTo={(ids) => `/practice/set/${setId}?ids=${ids.join(',')}`} onDone={back} doneLabel="Back to practice" />
    );
  }
  return <QuestionRunner questions={questions} mode="quiz" title={set?.title ?? 'Practice set'} record={false} onFinish={setSummary} onExit={back} />;
}
