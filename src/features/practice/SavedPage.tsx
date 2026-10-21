import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import type { Question } from '../../content/schema';
import { latestPerQuestion } from '../../study/accuracy';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { QuestionRunner, type RunSummary } from './QuestionRunner';
import { ReviewList } from './ReviewList';
import { SessionSummary } from './SessionSummary';
import './practice.css';

/** Saved questions that still exist in the bank, newest save first. */
function useSavedQuestions(): Question[] {
  const { questionById } = useContent();
  const { saved } = useProgress();
  return [...saved].reverse().map((id) => questionById.get(id)).filter((q): q is Question => Boolean(q));
}

/** Everything the learner saved to look up, grouped by domain, each opening to the full explanation. */
export function SavedPage() {
  const { domains } = useContent();
  const { attempts } = useProgress();
  const saved = useSavedQuestions();
  const last = new Map(latestPerQuestion(attempts).map((a) => [a.questionId, a.chosen]));
  return (
    <Screen title="Saved for review" back="/practice">
      {saved.length === 0 ? (
        <p className="muted">Nothing saved yet. While answering any question, tap 🔖 Save for review to keep it here.</p>
      ) : (
        <>
          <p className="muted">{saved.length} saved question{saved.length === 1 ? '' : 's'}. Open one for every choice's reasoning, the why and the source. Tap 🔖 Saved inside it to remove it.</p>
          <Link className="btn btn-primary btn-block" to="/practice/saved/drill">Practice these {saved.length} again</Link>
          {domains.map((d) => {
            const mine = saved.filter((q) => q.domainId === d.id);
            if (mine.length === 0) return null;
            return (
              <section key={d.id}>
                <div className="review-head"><h3>{d.name} ({mine.length})</h3></div>
                <ReviewList entries={mine.map((q) => ({ question: q, chosen: last.get(q.id) ?? null }))} />
              </section>
            );
          })}
        </>
      )}
    </Screen>
  );
}

export function SavedDrillPage() {
  const navigate = useNavigate();
  const saved = useSavedQuestions();
  const [picked] = useState(saved);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const back = () => navigate('/practice/saved');
  if (picked.length === 0) {
    return (
      <div className="summary">
        <p>Nothing saved yet.</p>
        <Button block onClick={back}>Back</Button>
      </div>
    );
  }
  if (summary) return <SessionSummary summary={summary} extra="Questions stay saved until you remove them." onDone={back} doneLabel="Back to saved" />;
  return <QuestionRunner questions={picked} mode="quiz" title="Saved" onFinish={setSummary} onExit={back} />;
}
