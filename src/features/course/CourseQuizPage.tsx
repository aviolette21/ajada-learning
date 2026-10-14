import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { pickRotating, SECTION_QUIZ_SIZE } from '../../study/quiz';
import { QuestionRunner, type RunSummary } from '../practice/QuestionRunner';
import { SessionSummary } from '../practice/SessionSummary';
import { findSection, reviewPool, sectionPool } from './course';

/**
 * Twenty questions from the section's pool (or, at /course/review/quiz, from every section), rotating in the ones seen
 * least recently on each retake.
 */
export function CourseQuizPage() {
  const { sectionId = '' } = useParams();
  const navigate = useNavigate();
  const content = useContent();
  const { attempts } = useProgress();
  const review = sectionId === 'review';
  const section = findSection(content, sectionId);
  const [picked] = useState(() => {
    const pool = review ? reviewPool(content) : section ? sectionPool(section, content) : null;
    return pool ? pickRotating({ ...pool, attempts, count: SECTION_QUIZ_SIZE, rng: Math.random }) : [];
  });
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const back = () => navigate(review ? '/course' : `/course/${sectionId}`);
  if (summary) return <SessionSummary summary={summary} extra="Retake it for a new set of questions." onDone={back} doneLabel="Back to section" />;
  return <QuestionRunner questions={picked} mode="quiz" title={review ? 'Course review' : section ? `Section ${section.number} quiz` : 'Section quiz'} onFinish={setSummary} onExit={back} />;
}
