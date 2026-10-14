import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { pickWeakQuestions, TODAY_QUESTION_COUNT } from '../../study/weakSpots';
import '../practice/practice.css';
import { QuestionRunner, type RunSummary } from '../practice/QuestionRunner';
import { SessionSummary } from '../practice/SessionSummary';

/** Today's session: practice questions aimed at mistakes and weak areas. */
export function SessionPage() {
  const navigate = useNavigate();
  const { questions, questionById } = useContent();
  const { attempts } = useProgress();
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [picked] = useState(() => pickWeakQuestions({ attempts, questions, questionById, count: TODAY_QUESTION_COUNT, rng: Math.random }));
  const home = () => navigate('/');
  if (summary) return <SessionSummary summary={summary} onDone={home} />;
  return <QuestionRunner questions={picked} mode="today" title="Today" onExit={home} onFinish={setSummary} />;
}
