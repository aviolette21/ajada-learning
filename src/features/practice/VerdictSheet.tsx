import { Link } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useTermLinks } from '../../app/Terms';
import { correctIds, formatIds, isCorrect } from '../../content/answers';
import type { Card, Chosen, Question } from '../../content/schema';
import { Button } from '../../ui/Button';
import { DiagramView } from '../../ui/Diagram';
import { Disclosure } from '../../ui/Disclosure';
import { IconCheck, IconChevron, IconX } from '../../ui/icons';
import { renderInline } from '../../ui/inline';
import { Sheet } from '../../ui/Sheet';

export function VerdictSheet({ question, chosen, open, onContinue, continueLabel = 'Continue', showLessonLink = true }: {
  question: Question;
  chosen: Chosen | null;
  open: boolean;
  onContinue: () => void;
  continueLabel?: string;
  /** Off during a lesson check, where leaving for the lesson would abandon the check. */
  showLessonLink?: boolean;
}) {
  const { cardById } = useContent();
  const links = useTermLinks()();
  const correct = isCorrect(question, chosen);
  const answers = correctIds(question);
  const related = question.relatedCardIds.map((id) => cardById.get(id)).filter((c): c is Card => Boolean(c));
  return (
    <Sheet open={open} label="Answer explanation">
      <div className={`verdict ${correct ? 'ok' : 'bad'}`}>
        <p className="verdict-line">
          {correct ? <><IconCheck /> Correct!</> : <><IconX /> Not quite. The answer{answers.length > 1 ? 's are' : ' is'} {formatIds(answers)}.</>}
        </p>
        <div className="takeaway"><strong>💡 In one line:</strong> {renderInline(question.takeaway, links)}</div>
        {question.diagram && <DiagramView diagram={question.diagram} />}
        {question.mnemonic && (
          <Disclosure title="🧠 Remember it"><p>{renderInline(question.mnemonic, links)}</p></Disclosure>
        )}
        {related.length > 0 && (
          <Disclosure title={`🃏 ${related.length} related flashcard${related.length === 1 ? '' : 's'}`}>
            <ul className="related">
              {related.map((c) => <li key={c.id}><strong>{c.term}</strong>: {renderInline(c.definition)}</li>)}
            </ul>
          </Disclosure>
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
