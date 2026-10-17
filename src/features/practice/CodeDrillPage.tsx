import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { pickRotating, QUIZ_SIZE } from '../../study/quiz';
import { QuestionRunner, type RunSummary } from './QuestionRunner';
import { SessionSummary } from './SessionSummary';

/** Ten questions that each show a code snippet, payload or config to read, rotating in the least recently seen. */
export function CodeDrillPage() {
  const navigate = useNavigate();
  const { questions } = useContent();
  const { attempts } = useProgress();
  const [picked] = useState(() =>
    pickRotating({ primary: questions.filter((q) => q.snippet), attempts, count: QUIZ_SIZE, rng: Math.random }),
  );
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const back = () => navigate('/practice');
  if (summary) return <SessionSummary summary={summary} extra="Run it again for a new set of snippets." onDone={back} />;
  return <QuestionRunner questions={picked} mode="quiz" title="Code & payloads" onFinish={setSummary} onExit={back} />;
}
