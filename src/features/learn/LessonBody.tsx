import { useContent } from '../../app/ContentContext';
import { useTermLinks, useTermMatcher } from '../../app/Terms';
import type { GlossaryTerm, Lesson } from '../../content/schema';
import { termsIn } from '../../content/terms';
import { DiagramView } from '../../ui/Diagram';
import { Disclosure } from '../../ui/Disclosure';
import { Paragraphs, renderInline } from '../../ui/inline';
import './learn.css';

/** A lesson's readable content, shared by the lesson page and the in-quiz lesson overlay. */
export function LessonBody({ lesson }: { lesson: Lesson }) {
  const { termById } = useContent();
  const matcher = useTermMatcher();
  const links = useTermLinks()();
  const terms = matcher
    ? termsIn([lesson.summary, ...lesson.keyPoints, ...lesson.sections.flatMap((s) => [s.body, s.example ?? ''])], matcher)
        .map((id) => termById.get(id))
        .filter((t): t is GlossaryTerm => Boolean(t))
    : [];
  return (
    <>
      <h1 className="lesson-title">{lesson.title}</h1>
      <p className="lesson-summary">{renderInline(lesson.summary, links)}</p>
      <section className="panel">
        <h3>Key points</h3>
        <ul className="key-points">{lesson.keyPoints.map((k, i) => <li key={i}>{renderInline(k, links)}</li>)}</ul>
      </section>
      {terms.length > 0 && (
        <Disclosure title={<>📚 Definitions <span className="muted">· {terms.length} terms in this lesson</span></>}>
          <dl className="terms-list">
            {terms.map((t) => (
              <div key={t.id}>
                <dt>{t.term}</dt>
                <dd>{renderInline(t.definition)}</dd>
              </div>
            ))}
          </dl>
        </Disclosure>
      )}
      {lesson.sections.map((s, i) => (
        <section key={i} className="lesson-section">
          <h2>{s.heading}</h2>
          <Paragraphs text={s.body} links={links} />
          {s.example && (
            <div className="lesson-example">
              <strong>Example</strong>
              <Paragraphs text={s.example} links={links} />
            </div>
          )}
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
