import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { pickWeakQuestions, TODAY_QUESTION_COUNT } from '../../study/weakSpots';
import { QuestionRunner, type RunSummary } from './QuestionRunner';
import { SessionSummary } from './SessionSummary';

export function WeakSpotsPage() {
  const navigate = useNavigate();
  const { questions, questionById } = useContent();
  const { attempts } = useProgress();
  const [picked] = useState(() => pickWeakQuestions({ attempts, questions, questionById, count: TODAY_QUESTION_COUNT, rng: Math.random }));
  const [summary, setSummary] = useState<RunSummary | null>(null);
  if (summary) return <SessionSummary summary={summary} onDone={() => navigate('/practice')} />;
  return <QuestionRunner questions={picked} mode="weak" title="Weak spots" onFinish={setSummary} onExit={() => navigate('/practice')} />;
}
