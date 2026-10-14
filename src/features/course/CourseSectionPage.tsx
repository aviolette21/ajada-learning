import { Link, useParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { useTermLinks } from '../../app/Terms';
import { IconChevron } from '../../ui/icons';
import { renderInline } from '../../ui/inline';
import { Screen } from '../../ui/Screen';
import { SECTION_QUIZ_SIZE } from '../../study/quiz';
import { findSection, sectionPool } from './course';
import './course.css';

export function CourseSectionPage() {
  const { sectionId = '' } = useParams();
  const content = useContent();
  const { lessonsDone } = useProgress();
  const links = useTermLinks()();
  const section = findSection(content, sectionId);
  if (!section) return <Screen title="Course" back="/course"><p className="empty">Section not found.</p></Screen>;
  const pool = sectionPool(section, content);
  const quizSize = Math.min(SECTION_QUIZ_SIZE, new Set([...pool.primary, ...pool.fallback].map((q) => q.id)).size);
  const from = encodeURIComponent(`/course/${section.id}`);

  return (
    <Screen title={`Section ${section.number}`} back="/course">
      <h2 className="section-title">{section.title}</h2>
      <p className="lesson-summary">{renderInline(section.summary, links)}</p>

      <section className="panel">
        <h3>Modules</h3>
        {section.modules.map((m, i) => {
          const lesson = content.lessonById.get(m.lessonId);
          return (
            <Link key={m.lessonId} className="sheet-row" to={`/learn/lesson/${m.lessonId}?from=${from}`}>
              <span className="module-row">
                <span className="module-num">{i + 1}</span>
                <span>
                  {m.title} {lessonsDone.has(m.lessonId) && <span className="badge">Done</span>}
                  {lesson && <span className="muted d-block">{lesson.sections.length} parts · {lesson.sections.filter((s) => s.example).length} examples</span>}
                </span>
              </span>
              <span className="chev"><IconChevron /></span>
            </Link>
          );
        })}
      </section>

      <Link className="btn btn-primary btn-block" to={`/course/${section.id}/quiz`}>Section {section.number} quiz · {quizSize} questions</Link>
      <p className="muted center-text">A fresh mix each time you take it, from {pool.primary.length} questions on this section's modules.</p>

      <section className="panel takeaways">
        <h3>Section recap</h3>
        <ol>
          {section.takeaways.map((t, i) => (
            <li key={i}>
              <strong>{renderInline(t.title, links)}</strong>
              <p>{renderInline(t.body, links)}</p>
            </li>
          ))}
        </ol>
      </section>
    </Screen>
  );
}
