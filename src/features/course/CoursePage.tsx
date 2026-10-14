import { Link } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { IconChevron } from '../../ui/icons';
import { Meter } from '../../ui/Meter';
import { Screen } from '../../ui/Screen';
import './course.css';

export function CoursePage() {
  const { course } = useContent();
  const { lessonsDone } = useProgress();
  const sections = [...course].sort((a, b) => a.number - b.number);
  return (
    <Screen title="Course" back="/learn">
      <p className="muted">The official certification course, section by section: each module explains the ideas with definitions and examples, then checks you with three questions.</p>
      {sections.map((s) => {
        const done = s.modules.filter((m) => lessonsDone.has(m.lessonId)).length;
        return (
          <Link key={s.id} className="panel panel-link" to={`/course/${s.id}`}>
            <span className="section-num" aria-hidden="true">{s.number}</span>
            <span className="grow">
              <strong>Section {s.number} · {s.title}</strong>
              <span className="muted d-block">{done} of {s.modules.length} modules done</span>
              <Meter value={s.modules.length ? done / s.modules.length : 0} label={`Section ${s.number} modules completed`} />
            </span>
            <span className="chev"><IconChevron /></span>
          </Link>
        );
      })}
      {sections.length === 0 && <p className="empty">No course sections yet.</p>}
      {sections.length > 1 && (
        <>
          <Link className="btn btn-primary btn-block" to="/course/review/quiz">Review all sections · 20 questions</Link>
          <p className="muted center-text">A mix from every section so far, a fresh set each time.</p>
        </>
      )}
    </Screen>
  );
}
