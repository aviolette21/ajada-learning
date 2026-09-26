import { Link } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import type { Card, ChoiceId, Question } from '../../content/schema';
import { Button } from '../../ui/Button';
import { DiagramView } from '../../ui/Diagram';
import { Disclosure } from '../../ui/Disclosure';
import { IconCheck, IconChevron, IconX } from '../../ui/icons';
import { renderInline } from '../../ui/inline';
import { Sheet } from '../../ui/Sheet';

export function VerdictSheet({ question, chosen, open, onContinue, continueLabel = 'Continue' }: {
  question: Question;
  chosen: ChoiceId | null;
  open: boolean;
  onContinue: () => void;
  continueLabel?: string;
}) {
  const { cardById } = useContent();
  const correct = chosen === question.answer;
  const related = question.relatedCardIds.map((id) => cardById.get(id)).filter((c): c is Card => Boolean(c));
  return (
    <Sheet open={open} label="Answer explanation">
      <div className={`verdict ${correct ? 'ok' : 'bad'}`}>
        <p className="verdict-line">
          {correct ? <><IconCheck /> Correct!</> : <><IconX /> Not quite. The answer is {question.answer.toUpperCase()}.</>}
        </p>
        <div className="takeaway"><strong>💡 In one line:</strong> {renderInline(question.takeaway)}</div>
        {question.diagram && <DiagramView diagram={question.diagram} />}
        {question.mnemonic && (
          <Disclosure title="🧠 Remember it"><p>{renderInline(question.mnemonic)}</p></Disclosure>
        )}
        {related.length > 0 && (
          <Disclosure title={`🃏 ${related.length} related flashcard${related.length === 1 ? '' : 's'}`}>
            <ul className="related">
              {related.map((c) => <li key={c.id}><strong>{c.term}</strong>: {renderInline(c.definition)}</li>)}
            </ul>
          </Disclosure>
        )}
        {question.lessonId && (
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
