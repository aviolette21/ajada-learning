import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useContent } from '../../app/ContentContext';
import { LessonOverlay } from '../learn/LessonOverlay';
import { useTermLinks } from '../../app/Terms';
import { correctIds, formatIds, isCorrect } from '../../content/answers';
import type { Chosen, Question } from '../../content/schema';
import { Button } from '../../ui/Button';
import { DiagramView } from '../../ui/Diagram';
import { Disclosure } from '../../ui/Disclosure';
import { IconCheck, IconChevron, IconX } from '../../ui/icons';
import { renderInline } from '../../ui/inline';
import { Sheet } from '../../ui/Sheet';
import { SaveButton } from '../shared/SaveButton';
import { Explanation } from './Explanation';

export function VerdictSheet({ question, chosen, guessed = false, open, onClose, onContinue, continueLabel = 'Continue', showLessonLink = true }: {
  question: Question;
  chosen: Chosen | null;
  /** The learner marked the answer as a guess, so a right answer still comes back for review. */
  guessed?: boolean;
  open: boolean;
  /** Pulling the sheet down only hides it, so the learner can look back at the question; it never moves on. */
  onClose: () => void;
  onContinue: () => void;
  continueLabel?: string;
  /** Off during a lesson check, where leaving for the lesson would abandon the check. */
  showLessonLink?: boolean;
}) {
  const links = useTermLinks()();
  const { lessonById } = useContent();
  const lesson = question.lessonId ? lessonById.get(question.lessonId) : undefined;
  const [lessonOpen, setLessonOpen] = useState(false);
  const correct = isCorrect(question, chosen);
  const answers = correctIds(question);
  return (
    <>
    <Sheet open={open} label="Answer explanation" onClose={onClose}>
      <div className={`verdict ${correct ? 'ok' : 'bad'}`}>
        <p className="verdict-line">
          {correct ? <><IconCheck /> {guessed ? 'Correct, but a guess: it stays in your mistakes.' : 'Correct!'}</> : <><IconX /> Not quite. The answer{answers.length > 1 ? 's are' : ' is'} {formatIds(answers)}.</>}
        </p>
        <Explanation question={question} />
        {question.diagram && <DiagramView diagram={question.diagram} />}
        {question.mnemonic && (
          <Disclosure title="🧠 Remember it"><p>{renderInline(question.mnemonic, links)}</p></Disclosure>
        )}
        {showLessonLink && lesson && (
          <button type="button" className="sheet-row" onClick={() => setLessonOpen(true)}>
            <span>📖 Read the lesson</span><span className="chev"><IconChevron /></span>
          </button>
        )}
        <a className="source" href={question.source.url} target="_blank" rel="noreferrer">📎 Source: {question.source.title}</a>
        <div className="verdict-save"><SaveButton questionId={question.id} /></div>
        <Button block onClick={onContinue}>{continueLabel}</Button>
      </div>
    </Sheet>
    <AnimatePresence>{lessonOpen && lesson && <LessonOverlay lesson={lesson} onClose={() => setLessonOpen(false)} />}</AnimatePresence>
    </>
  );
}
