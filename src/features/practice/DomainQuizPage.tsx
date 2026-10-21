import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { isCorrect } from '../../content/answers';
import type { Question } from '../../content/schema';
import { DOMAIN_QUIZ_SIZE, domainQuizStat, pickDomainQuiz } from '../../study/domainQuiz';
import { scoreStatus } from '../../study/readiness';
import { Button } from '../../ui/Button';
import { IconChevron } from '../../ui/icons';
import { Meter } from '../../ui/Meter';
import { Screen } from '../../ui/Screen';
import { QuestionRunner, type RunSummary } from './QuestionRunner';
import { ReviewList } from './ReviewList';
import './practice.css';

/** Every exam domain, heaviest first, each with a scenario quiz. */
export function DomainQuizzesPage() {
  const { domains, questions } = useContent();
  const { attempts, saved } = useProgress();
  const byWeight = [...domains].sort((a, b) => b.weight - a.weight);
  return (
    <Screen title="Domain quizzes" back="/practice">
      <p className="muted">
        {DOMAIN_QUIZ_SIZE} scenario questions per exam domain, written in the exam's style and spread across each domain's skills by
        their weight. Pick an answer, then Submit to see why. Tap 🔖 Save for review on anything you want to look at again; you'll
        see your saved and missed questions together at the end.
      </p>
      {saved.length > 0 && (
        <Link className="panel panel-link" to="/practice/saved">
          <span className="grow"><h2>🔖 Saved for review</h2><span className="muted">{saved.length} question{saved.length === 1 ? '' : 's'} saved</span></span>
          <span className="chev"><IconChevron /></span>
        </Link>
      )}
      {byWeight.map((d) => {
        const stat = domainQuizStat(questions, attempts, d.id);
        const accuracy = stat.seen === 0 ? null : stat.right / stat.seen;
        return (
          <Link key={d.id} className="panel panel-link" to={`/practice/domains/${d.id}`}>
            <span className="grow">
              <span className="dq-weight">{d.weight}% of the exam</span>
              <h2>{d.name}</h2>
              <span className="muted">
                {stat.seen === 0 ? `${DOMAIN_QUIZ_SIZE} questions · not started` : `Latest answers: ${stat.right} / ${stat.seen} right`}
              </span>
              {stat.seen > 0 && <Meter status={scoreStatus(accuracy, stat.seen)} value={accuracy} label={`${d.name} score`} />}
            </span>
            <span className="chev"><IconChevron /></span>
          </Link>
        );
      })}
    </Screen>
  );
}

export function DomainQuizPage() {
  const { domainId = '' } = useParams();
  // Retaking remounts the run with a fresh order.
  const [run, setRun] = useState(0);
  return <DomainQuizRun key={`${domainId}-${run}`} domainId={domainId} onRetake={() => setRun((r) => r + 1)} />;
}

function DomainQuizRun({ domainId, onRetake }: { domainId: string; onRetake: () => void }) {
  const navigate = useNavigate();
  const { questions, domainById } = useContent();
  const { attempts } = useProgress();
  const domain = domainById.get(domainId);
  const [picked] = useState(() => pickDomainQuiz({ questions, attempts, domainId, rng: Math.random }));
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const back = () => navigate('/practice/domains');
  if (summary) return <DomainQuizSummary questions={picked} summary={summary} onRetake={onRetake} onDone={back} />;
  return <QuestionRunner questions={picked} mode="quiz" title={domain?.shortName ?? 'Domain quiz'} onFinish={setSummary} onExit={back} />;
}

/** The end of a domain quiz: score, score by skill, then the saved and missed questions to look up. */
function DomainQuizSummary({ questions, summary, onRetake, onDone }: {
  questions: Question[];
  summary: RunSummary;
  onRetake: () => void;
  onDone: () => void;
}) {
  const { domainById } = useContent();
  const { saved } = useProgress();
  const domain = domainById.get(questions[0]?.domainId ?? '');
  const answered = questions.filter((q) => q.id in summary.answers);
  const right = (q: Question) => isCorrect(q, summary.answers[q.id]);
  const ratio = summary.total === 0 ? 0 : summary.correct / summary.total;
  const status = scoreStatus(ratio);
  const [emoji, message] = status === 'on-track' ? ['🎉', 'Above the pass line on this domain.'] : status === 'close' ? ['💪', 'Close to the pass line. Review the misses below.'] : ['🌱', 'This domain needs work. Start with the misses below.'];
  const savedHere = answered.filter((q) => saved.includes(q.id));
  const missed = answered.filter((q) => !right(q) && !saved.includes(q.id));
  const gotRight = answered.filter((q) => right(q) && !saved.includes(q.id));
  const bySkill = (domain?.subSkills ?? [])
    .map((s) => {
      const qs = answered.filter((q) => q.subSkillId === s.id);
      return { id: s.id, name: s.name, total: qs.length, right: qs.filter(right).length };
    })
    .filter((s) => s.total > 0);
  const entry = (q: Question) => ({ question: q, chosen: summary.answers[q.id], saved: saved.includes(q.id) });

  return (
    <Screen title={domain?.shortName ?? 'Results'} back="/practice/domains">
      <motion.section className="panel center" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div className="big-emoji" aria-hidden="true">{emoji}</div>
        <div className="score">{summary.correct} / {summary.total}</div>
        <p>{Math.round(ratio * 100)}% · {message}</p>
      </motion.section>
      {bySkill.length > 1 && (
        <section className="panel">
          <h3>By skill</h3>
          {bySkill.map((s) => (
            <div key={s.id} className="domain-row">
              <span>{s.name}</span>
              <span className="muted">{s.right}/{s.total}</span>
              <Meter status={scoreStatus(s.right / s.total)} value={s.right / s.total} label={`${s.name} score`} />
            </div>
          ))}
        </section>
      )}
      <div className="dq-actions">
        {summary.missedIds.length > 0 && (
          <Link className="btn btn-secondary btn-block" to={`/practice/mistakes?ids=${summary.missedIds.join(',')}`}>
            Retry the {summary.missedIds.length} you missed or guessed
          </Link>
        )}
        <Button block variant="secondary" onClick={onRetake}>Retake this quiz</Button>
        <Button block onClick={onDone}>Back to domain quizzes</Button>
      </div>
      <div className="review-head"><h3>🔖 Saved for review ({savedHere.length})</h3></div>
      {savedHere.length === 0 ? <p className="muted">Nothing saved in this quiz. Tap 🔖 on a question below to keep it in your saved list.</p> : <ReviewList entries={savedHere.map(entry)} />}
      {missed.length > 0 && <div className="review-head"><h3>✗ Missed ({missed.length})</h3></div>}
      <ReviewList entries={missed.map(entry)} />
      {gotRight.length > 0 && <div className="review-head"><h3>✓ Got right ({gotRight.length})</h3></div>}
      <ReviewList entries={gotRight.map(entry)} />
    </Screen>
  );
}
