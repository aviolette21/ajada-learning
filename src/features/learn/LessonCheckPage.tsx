import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import type { Question } from '../../content/schema';
import { QuestionRunner, type RunSummary } from '../practice/QuestionRunner';
import { SessionSummary } from '../practice/SessionSummary';

export function LessonCheckPage() {
  const { lessonId = '' } = useParams();
  const navigate = useNavigate();
  const { lessonById, questionById } = useContent();
  const { markLessonDone } = useProgress();
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const lesson = lessonById.get(lessonId);
  const questions = (lesson?.checkQuestionIds ?? []).map((id) => questionById.get(id)).filter((q): q is Question => Boolean(q));
  const back = () => navigate(`/learn/lesson/${lessonId}`);

  if (summary) return <SessionSummary summary={summary} extra="Lesson marked as done." onDone={back} doneLabel="Back to lesson" />;
  return (
    <QuestionRunner questions={questions} mode="lesson" title="Check yourself" onExit={back}
      onFinish={(s) => { void markLessonDone(lessonId); setSummary(s); }} />
  );
}
