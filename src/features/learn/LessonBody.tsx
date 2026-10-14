import { useTermLinks } from '../../app/Terms';
import type { Lesson } from '../../content/schema';
import { DiagramView } from '../../ui/Diagram';
import { Paragraphs, renderInline } from '../../ui/inline';
import './learn.css';

/** A lesson's readable content, shared by the lesson page and the in-quiz lesson overlay. */
export function LessonBody({ lesson }: { lesson: Lesson }) {
  const links = useTermLinks()();
  return (
    <>
      <h1 className="lesson-title">{lesson.title}</h1>
      <p className="lesson-summary">{renderInline(lesson.summary, links)}</p>
      <section className="panel">
        <h3>Key points</h3>
        <ul className="key-points">{lesson.keyPoints.map((k, i) => <li key={i}>{renderInline(k, links)}</li>)}</ul>
      </section>
      {lesson.sections.map((s, i) => (
        <section key={i} className="lesson-section">
          <h2>{s.heading}</h2>
          <Paragraphs text={s.body} links={links} />
          {s.diagram && <DiagramView diagram={s.diagram} />}
        </section>
      ))}
      <section className="lesson-sources">
        <h3>Sources</h3>
        {lesson.sources.map((src) => (
          <a key={src.url} className="source" href={src.url} target="_blank" rel="noreferrer">📎 {src.title}</a>
        ))}
      </section>
    </>
  );
}
