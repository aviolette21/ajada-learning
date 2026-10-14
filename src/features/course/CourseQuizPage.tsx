import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { pickRotating, SECTION_QUIZ_SIZE } from '../../study/quiz';
import { QuestionRunner, type RunSummary } from '../practice/QuestionRunner';
import { SessionSummary } from '../practice/SessionSummary';
import { findSection, sectionPool } from './course';

/** Twenty questions from the section's pool, rotating in the ones seen least recently on each retake. */
export function CourseQuizPage() {
  const { sectionId = '' } = useParams();
  const navigate = useNavigate();
  const content = useContent();
  const { attempts } = useProgress();
  const section = findSection(content, sectionId);
  const [picked] = useState(() =>
    section ? pickRotating({ ...sectionPool(section, content), attempts, count: SECTION_QUIZ_SIZE, rng: Math.random }) : [],
  );
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const back = () => navigate(`/course/${sectionId}`);
  if (summary) return <SessionSummary summary={summary} extra="Retake it for a new set of questions." onDone={back} doneLabel="Back to section" />;
  return <QuestionRunner questions={picked} mode="quiz" title={section ? `Section ${section.number} quiz` : 'Section quiz'} onFinish={setSummary} onExit={back} />;
}
