import { Link } from 'react-router-dom';
import { useTermLinks } from '../../app/Terms';
import { correctIds, formatIds, isCorrect } from '../../content/answers';
import type { Chosen, Question } from '../../content/schema';
import { Button } from '../../ui/Button';
import { DiagramView } from '../../ui/Diagram';
import { Disclosure } from '../../ui/Disclosure';
import { IconCheck, IconChevron, IconX } from '../../ui/icons';
import { renderInline } from '../../ui/inline';
import { Sheet } from '../../ui/Sheet';
import { Explanation } from './Explanation';

export function VerdictSheet({ question, chosen, guessed = false, open, onContinue, continueLabel = 'Continue', showLessonLink = true }: {
  question: Question;
  chosen: Chosen | null;
  /** The learner marked the answer as a guess, so a right answer still comes back for review. */
  guessed?: boolean;
  open: boolean;
  onContinue: () => void;
  continueLabel?: string;
  /** Off during a lesson check, where leaving for the lesson would abandon the check. */
  showLessonLink?: boolean;
}) {
  const links = useTermLinks()();
  const correct = isCorrect(question, chosen);
  const answers = correctIds(question);
  return (
    <Sheet open={open} label="Answer explanation">
      <div className={`verdict ${correct ? 'ok' : 'bad'}`}>
        <p className="verdict-line">
          {correct ? <><IconCheck /> {guessed ? 'Correct, but a guess: it stays in your mistakes.' : 'Correct!'}</> : <><IconX /> Not quite. The answer{answers.length > 1 ? 's are' : ' is'} {formatIds(answers)}.</>}
        </p>
        <Explanation question={question} />
        {question.diagram && <DiagramView diagram={question.diagram} />}
        {question.mnemonic && (
          <Disclosure title="🧠 Remember it"><p>{renderInline(question.mnemonic, links)}</p></Disclosure>
        )}
        {showLessonLink && question.lessonId && (
          <Link className="sheet-row" to={`/learn/lesson/${question.lessonId}`}>
            <span>📖 Read the lesson</span><span className="chev"><IconChevron /></span>
          </Link>
        )}
        <a className="source" href={question.source.url} target="_blank" rel="noreferrer">📎 Source: {question.source.title}</a>
        <Button block onClick={onContinue}>{continueLabel}</Button>
      </div>
    </Sheet>
  );
}
