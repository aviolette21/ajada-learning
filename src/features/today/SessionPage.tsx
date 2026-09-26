import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { pickWeakQuestions, TODAY_QUESTION_COUNT } from '../../study/weakSpots';
import { CardReviewSession } from '../cards/CardReviewSession';
import '../practice/practice.css';
import { QuestionRunner, type RunSummary } from '../practice/QuestionRunner';
import { SessionSummary } from '../practice/SessionSummary';

export function SessionPage() {
  const navigate = useNavigate();
  const { questions, questionById } = useContent();
  const { attempts, settings } = useProgress();
  const [phase, setPhase] = useState<'cards' | 'questions' | 'done'>('cards');
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [summary, setSummary] = useState<RunSummary>({ correct: 0, total: 0 });
  const [picked] = useState(() => pickWeakQuestions({ attempts, questions, questionById, count: TODAY_QUESTION_COUNT, rng: Math.random }));
  const home = () => navigate('/');

  if (phase === 'cards') {
    return (
      <CardReviewSession mode={settings.cardDirection} onExit={home} doneLabel="Continue to questions"
        onDone={(n) => { setCardsReviewed(n); setPhase('questions'); }} />
    );
  }
  if (phase === 'questions') {
    return (
      <QuestionRunner questions={picked} mode="today" title="Today" onExit={home}
        onFinish={(s) => { setSummary(s); setPhase('done'); }} />
    );
  }
  return <SessionSummary summary={summary} extra={`${cardsReviewed} flashcard review${cardsReviewed === 1 ? '' : 's'} done today.`} onDone={home} />;
}
