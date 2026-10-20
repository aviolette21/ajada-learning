import { Link } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { IconChevron } from '../../ui/icons';
import { Meter } from '../../ui/Meter';
import { Screen } from '../../ui/Screen';
import './learn.css';

export function LearnPage() {
  const { domains, lessons, course, needsImprovement } = useContent();
  const { lessonsDone } = useProgress();
  const ordered = [...domains].sort((a, b) => b.weight - a.weight);
  return (
    <Screen title="Learn">
      {course.length > 0 && (
        <Link className="panel panel-link course-entry" to="/course">
          <span className="grow">
            <strong>📘 Course sections</strong>
            <span className="muted d-block">
              {[...course].sort((a, b) => a.number - b.number).map((s) => `Section ${s.number}`).join(' · ')}: definitions, examples and quizzes
            </span>
          </span>
          <span className="chev"><IconChevron /></span>
        </Link>
      )}
      {needsImprovement.length > 0 && (
        <Link className="panel panel-link course-entry" to="/needs-improvement">
          <span className="grow">
            <strong>🛠️ Needs improvement</strong>
            <span className="muted d-block">{needsImprovement.length} topics from your notes: definitions, examples and how the exam asks</span>
          </span>
          <span className="chev"><IconChevron /></span>
        </Link>
      )}
      <p className="muted">Eight exam domains, biggest first. Each lesson ends with three check-yourself questions.</p>
      {ordered.map((d) => {
        const inDomain = lessons.filter((l) => l.domainId === d.id);
        const done = inDomain.filter((l) => lessonsDone.has(l.id)).length;
        return (
          <Link key={d.id} className="panel panel-link" to={`/learn/${d.id}`}>
            <span className="grow">
              <strong>{d.name}</strong>
              <span className="muted d-block">{Math.round(d.weight)}% of exam · {done} of {inDomain.length} lessons done</span>
              <Meter value={inDomain.length ? done / inDomain.length : 0} label={`${d.name} lessons completed`} />
            </span>
            <span className="chev"><IconChevron /></span>
          </Link>
        );
      })}
    </Screen>
  );
}
