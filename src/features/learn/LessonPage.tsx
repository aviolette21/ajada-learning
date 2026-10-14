import { Link, useParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { Screen } from '../../ui/Screen';
import { LessonBody } from './LessonBody';
import './learn.css';

export function LessonPage() {
  const { lessonId = '' } = useParams();
  const { lessonById } = useContent();
  const { lessonsDone } = useProgress();
  const lesson = lessonById.get(lessonId);
  if (!lesson) return <Screen title="Lesson" back="/learn"><p className="empty">Lesson not found.</p></Screen>;

  return (
    <Screen back={`/learn/${lesson.domainId}`} className="lesson">
      {lessonsDone.has(lesson.id) && <span className="badge">Done</span>}
      <LessonBody lesson={lesson} />
      <Link className="btn btn-primary btn-block" to={`/learn/lesson/${lesson.id}/check`}>Check yourself · 3 questions</Link>
    </Screen>
  );
}
