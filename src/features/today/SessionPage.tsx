import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClock } from '../../app/clock';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { buildQueue } from '../../study/scheduler';
import { pickWeakQuestions, TODAY_QUESTION_COUNT } from '../../study/weakSpots';
import '../practice/practice.css';
import { QuestionRunner, type RunSummary } from '../practice/QuestionRunner';
import { SessionSummary } from '../practice/SessionSummary';

/** Today's session is practice questions aimed at weak areas; flashcards are offered afterwards, never required. */
export function SessionPage() {
  const navigate = useNavigate();
  const { questions, questionById, cards } = useContent();
  const { attempts, cardStates, settings } = useProgress();
  const { now } = useClock();
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [picked] = useState(() => pickWeakQuestions({ attempts, questions, questionById, count: TODAY_QUESTION_COUNT, rng: Math.random }));
  const home = () => navigate('/');

  if (!summary) {
    return <QuestionRunner questions={picked} mode="today" title="Today" onExit={home} onFinish={setSummary} />;
  }
  const due = buildQueue({
    cardIds: cards.map((c) => c.id), states: cardStates, mode: settings.cardDirection, now: now(),
    newPerDay: settings.newCardsPerDay, rng: () => 0,
  }).length;
  return (
    <SessionSummary summary={summary} onDone={home}
      extra={due > 0 ? `Optional: ${due} flashcard${due === 1 ? '' : 's'} due in the Cards tab.` : undefined} />
  );
}
