import { Link, useParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { DiagramView } from '../../ui/Diagram';
import { Paragraphs, renderInline } from '../../ui/inline';
import { Screen } from '../../ui/Screen';
import './learn.css';

export function LessonPage() {
  const { lessonId = '' } = useParams();
  const { lessonById } = useContent();
  const { lessonsDone } = useProgress();
  const lesson = lessonById.get(lessonId);
  if (!lesson) return <Screen title="Lesson" back="/learn"><p className="empty">Lesson not found.</p></Screen>;

  return (
    <Screen back={`/learn/${lesson.domainId}`} className="lesson">
      <h1 className="lesson-title">{lesson.title}</h1>
      {lessonsDone.has(lesson.id) && <span className="badge">Done</span>}
      <p className="lesson-summary">{renderInline(lesson.summary)}</p>
      <section className="panel">
        <h3>Key points</h3>
        <ul className="key-points">{lesson.keyPoints.map((k, i) => <li key={i}>{renderInline(k)}</li>)}</ul>
      </section>
      {lesson.sections.map((s, i) => (
        <section key={i} className="lesson-section">
          <h2>{s.heading}</h2>
          <Paragraphs text={s.body} />
          {s.diagram && <DiagramView diagram={s.diagram} />}
        </section>
      ))}
      <section className="lesson-sources">
        <h3>Sources</h3>
        {lesson.sources.map((src) => (
          <a key={src.url} className="source" href={src.url} target="_blank" rel="noreferrer">📎 {src.title}</a>
        ))}
      </section>
      <Link className="btn btn-primary btn-block" to={`/learn/lesson/${lesson.id}/check`}>Check yourself · 3 questions</Link>
    </Screen>
  );
}
