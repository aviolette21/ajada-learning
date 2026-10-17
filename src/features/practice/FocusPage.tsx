import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { pickRotating } from '../../study/quiz';
import { scoreStatus, STATUS_LABEL } from '../../study/readiness';
import { Meter } from '../../ui/Meter';
import { Screen } from '../../ui/Screen';
import { FOCUS_DRILL_SIZE, focusQuestions, focusStat } from './focus';
import { QuestionRunner, type RunSummary } from './QuestionRunner';
import { SessionSummary } from './SessionSummary';
import './practice.css';

/** The areas test takers say the exam leans on, each with its score and a drill. */
export function FocusPage() {
  const { focus } = useContent();
  const { attempts } = useProgress();
  return (
    <Screen title="Focus areas" back="/practice">
      <p className="muted">Topics that people who've taken the exam say come up again and again. Each drill is {FOCUS_DRILL_SIZE} questions, with ones you haven't seen first.</p>
      <section className="panel">
        {focus.map((area) => {
          const stat = focusStat(area, attempts);
          const status = scoreStatus(stat.accuracy, stat.seen);
          const score = stat.accuracy === null ? 'not started' : `${Math.round(stat.accuracy * 100)}% · ${STATUS_LABEL[status]}`;
          return (
            <div key={area.id} className="topic-row">
              <div className="topic-main">
                <span className="topic-name">{area.title}</span>
                <span className="muted">{area.summary}</span>
                <span className="muted">{score} · seen {stat.seen}/{stat.total}</span>
                <Meter status={status} value={stat.accuracy} label={`${area.title} accuracy`} />
              </div>
              <Link className="chip" to={`/practice/focus/${area.id}`} aria-label={`Drill ${area.title}`}>Drill</Link>
            </div>
          );
        })}
        {focus.length === 0 && <p className="empty">No focus areas yet.</p>}
      </section>
    </Screen>
  );
}

export function FocusDrillPage() {
  const { areaId = '' } = useParams();
  const navigate = useNavigate();
  const { focus, questionById } = useContent();
  const { attempts } = useProgress();
  const area = focus.find((a) => a.id === areaId);
  const [picked] = useState(() =>
    area ? pickRotating({ primary: focusQuestions(area, questionById), attempts, count: FOCUS_DRILL_SIZE, rng: Math.random }) : [],
  );
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const back = () => navigate('/practice/focus');
  if (summary) return <SessionSummary summary={summary} extra="Drill it again for a new set of questions." onDone={back} doneLabel="Back to focus areas" />;
  return <QuestionRunner questions={picked} mode="quiz" title={area?.title ?? 'Focus drill'} onFinish={setSummary} onExit={back} />;
}
