import { Link } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { focusNext, subSkillProgress, type SubSkillProgress } from '../../study/progress';
import { scoreStatus, STATUS_LABEL, type ScoreStatus } from '../../study/readiness';
import { Meter } from '../../ui/Meter';
import { Screen } from '../../ui/Screen';
import './practice.css';

function scoreText(row: SubSkillProgress, status: ScoreStatus): string {
  return row.accuracy === null ? 'not started' : `${Math.round(row.accuracy * 100)}% · ${STATUS_LABEL[status]}`;
}

function Row({ row }: { row: SubSkillProgress }) {
  const status = scoreStatus(row.accuracy, row.seen);
  return (
    <div className="topic-row">
      <div className="topic-main">
        <span className="topic-name">{row.name}</span>
        <span className="muted">{row.weight}% of exam · {scoreText(row, status)} · seen {row.seen}/{row.total}</span>
        <Meter status={status} value={row.accuracy} label={`${row.name} accuracy`} />
      </div>
      <Link className="chip" to={`/practice/quiz?n=10&s=${row.subSkillId}`} aria-label={`Practice ${row.name}`}>Practice</Link>
    </div>
  );
}

/** Accuracy on every exam sub-skill, and the ones costing the most exam points. */
export function ProgressPage() {
  const { domains, questions, questionById } = useContent();
  const { attempts } = useProgress();
  const rows = subSkillProgress(domains, questions, attempts, questionById);
  const ordered = [...domains].sort((a, b) => b.weight - a.weight);
  return (
    <Screen title="Progress by topic" back="/practice">
      <section className="panel">
        <h2>Focus next</h2>
        <p className="muted">The topics where you're likely losing the most exam points: big exam weight × low (or untested) score. Scores start at 50% and move as you answer; they stay grey until 10 of a topic's questions are answered. Guessed answers count half.</p>
        {focusNext(rows).map((r) => <Row key={r.subSkillId} row={r} />)}
      </section>
      {ordered.map((d) => (
        <section key={d.id} className="panel">
          <h3>{d.name} <span className="muted">· {d.weight}%</span></h3>
          {rows.filter((r) => r.domainId === d.id).map((r) => <Row key={r.subSkillId} row={r} />)}
        </section>
      ))}
    </Screen>
  );
}
