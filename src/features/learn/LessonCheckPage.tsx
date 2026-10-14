import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { ignore } from '../../app/Notifier';
import { useProgress } from '../../app/ProgressProvider';
import { LESSON_CHECK_SIZE, lessonPool, pickRotating } from '../../study/quiz';
import { courseReturn } from '../course/course';
import { QuestionRunner, type RunSummary } from '../practice/QuestionRunner';
import { SessionSummary } from '../practice/SessionSummary';

export function LessonCheckPage() {
  const { lessonId = '' } = useParams();
  const [params] = useSearchParams();
  const from = courseReturn(params.get('from'));
  const navigate = useNavigate();
  const { lessonById, questions } = useContent();
  const { attempts, markLessonDone } = useProgress();
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const lesson = lessonById.get(lessonId);
  // Picked once per visit: a retake rotates in the questions seen least recently.
  const [picked] = useState(() =>
    lesson ? pickRotating({ ...lessonPool(lesson, questions), attempts, count: LESSON_CHECK_SIZE, rng: Math.random }) : [],
  );
  const back = () => navigate(`/learn/lesson/${lessonId}${from ? `?from=${encodeURIComponent(from)}` : ''}`);

  if (summary) return <SessionSummary summary={summary} extra="Lesson marked as done. Retake it for a new set of questions." onDone={back} doneLabel="Back to lesson" />;
  return (
    <QuestionRunner questions={picked} mode="lesson" title="Check yourself" onExit={back}
      onFinish={(s) => { markLessonDone(lessonId).catch(ignore); setSummary(s); }} />
  );
}
