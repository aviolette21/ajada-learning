import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { Screen } from '../../ui/Screen';
import { LESSON_CHECK_SIZE, lessonPool } from '../../study/quiz';
import { courseReturn } from '../course/course';
import { LessonBody } from './LessonBody';
import './learn.css';

export function LessonPage() {
  const { lessonId = '' } = useParams();
  const [params] = useSearchParams();
  const from = courseReturn(params.get('from'));
  const query = from ? `?from=${encodeURIComponent(from)}` : '';
  const { lessonById, questions } = useContent();
  const { lessonsDone } = useProgress();
  const lesson = lessonById.get(lessonId);
  if (!lesson) return <Screen title="Lesson" back="/learn"><p className="empty">Lesson not found.</p></Screen>;

  const { primary, fallback } = lessonPool(lesson, questions);
  const checkSize = Math.min(LESSON_CHECK_SIZE, new Set([...primary, ...fallback].map((q) => q.id)).size);

  return (
    <Screen back={from ?? `/learn/${lesson.domainId}`} className="lesson">
      {lessonsDone.has(lesson.id) && <span className="badge">Done</span>}
      <LessonBody lesson={lesson} />
      <Link className="btn btn-primary btn-block" to={`/learn/lesson/${lesson.id}/check${query}`}>Check yourself · {checkSize} questions</Link>
      <p className="muted center-text">A fresh mix each time you take it, from {primary.length} questions on this lesson{fallback.length > primary.length ? ' and more on the same exam skill' : ''}.</p>
    </Screen>
  );
}
