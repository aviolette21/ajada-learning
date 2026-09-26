import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { pickQuizQuestions, QUIZ_SIZE } from '../../study/quiz';
import { QuestionRunner, type RunSummary } from './QuestionRunner';
import { SessionSummary } from './SessionSummary';

export function QuizPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { questions } = useContent();
  const { attempts } = useProgress();
  const [picked] = useState(() =>
    pickQuizQuestions({
      questions, attempts, count: QUIZ_SIZE, rng: Math.random,
      domainIds: (params.get('d') ?? '').split(',').filter(Boolean),
    }),
  );
  const [summary, setSummary] = useState<RunSummary | null>(null);
  if (summary) return <SessionSummary summary={summary} onDone={() => navigate('/practice')} />;
  return <QuestionRunner questions={picked} mode="quiz" title="Quick quiz" onFinish={setSummary} onExit={() => navigate('/practice')} />;
}
