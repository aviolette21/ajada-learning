import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { ignore } from '../../app/Notifier';
import { useProgress } from '../../app/ProgressProvider';
import { chosenIds, isCorrect, isMultiple, selectCount } from '../../content/answers';
import type { ChoiceId, Chosen, Question } from '../../content/schema';
import type { AttemptMode } from '../../study/types';
import { Button } from '../../ui/Button';
import { IconClose } from '../../ui/icons';
import { ProgressBar } from '../../ui/ProgressBar';
import { QuestionView } from './QuestionView';
import { VerdictSheet } from './VerdictSheet';

/** missedIds: questions answered wrong or guessed, for a one-tap retry. answers: what was picked, by question id. */
export interface RunSummary { correct: number; total: number; missedIds: string[]; answers: Record<string, Chosen> }

export function QuestionRunner({ questions, mode, title, onFinish, onExit, record = true }: {
  questions: Question[];
  mode: AttemptMode;
  title: string;
  onFinish: (summary: RunSummary) => void;
  onExit: () => void;
  /** Off for third-party practice sets, whose questions aren't in the bank and shouldn't touch progress. */
  record?: boolean;
}) {
  const { recordAnswer } = useProgress();
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [revealed, setRevealed] = useState(false);
  /** The explanation sheet; collapsing it leaves the answered question on screen rather than moving on. */
  const [sheetOpen, setSheetOpen] = useState(false);
  const [guessing, setGuessing] = useState(false);
  const [missedIds, setMissedIds] = useState<string[]>([]);
  const [correct, setCorrect] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Chosen>>({});
  const question = questions[index];

  if (!question) {
    return (
      <div className="runner">
        <div className="empty">
          <div className="big-emoji">📭</div>
          <p>No questions available here yet.</p>
          <Button onClick={onExit}>Back</Button>
        </div>
      </div>
    );
  }

  const isLast = index + 1 >= questions.length;
  const reveal = (answer: Chosen) => {
    setChosen(answer);
    setRevealed(true);
    setSheetOpen(true);
    setAnswers((m) => ({ ...m, [question.id]: answer }));
    const right = isCorrect(question, answer);
    if (right) setCorrect((c) => c + 1);
    if (!right || guessing) setMissedIds((m) => [...m, question.id]);
    if (record) recordAnswer(question, answer, mode, guessing).catch(ignore);
  };
  const multiple = isMultiple(question);
  const need = selectCount(question);
  const picked = chosenIds(chosen);
  // A tap only selects; nothing is checked until Submit, so a stray tap can be changed.
  const choose = (id: ChoiceId) => {
    if (revealed) return;
    if (!multiple) {
      setChosen(id);
      return;
    }
    // Toggle; once the required number is picked, further picks wait until one is unpicked.
    if (picked.includes(id)) setChosen(picked.filter((x) => x !== id));
    else if (picked.length < need) setChosen([...picked, id].sort());
  };
  const next = () => {
    if (isLast) {
      onFinish({ correct, total: questions.length, missedIds, answers });
      return;
    }
    setIndex((i) => i + 1);
    setChosen(null);
    setRevealed(false);
    setSheetOpen(false);
    setGuessing(false);
  };
  const continueLabel = isLast ? 'Finish' : 'Continue';

  return (
    <div className={`runner ${sheetOpen ? 'has-sheet' : ''}`}>
      <header className="runner-head">
        <button type="button" className="icon-btn" aria-label="Close" onClick={onExit}><IconClose /></button>
        <span className="runner-count">{title} · {index + 1} / {questions.length}</span>
        <span className="icon-btn-spacer" />
      </header>
      <ProgressBar value={(index + (revealed ? 1 : 0)) / questions.length} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={question.id} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}>
          {!revealed && (
            <div className="guess-row">
              <button type="button" className={`chip ${guessing ? 'on' : ''}`} aria-pressed={guessing} onClick={() => setGuessing((g) => !g)}>
                {guessing ? '🤔 Guessing' : '🤔 Mark as a guess'}
              </button>
            </div>
          )}
          <QuestionView question={question} chosen={chosen} onChoose={choose} mode="answer" revealed={revealed} />
        </motion.div>
      </AnimatePresence>
      {!revealed && (
        <div className="check-bar">
          <Button block disabled={picked.length !== need} onClick={() => reveal(multiple ? picked : picked[0])}>
            {picked.length === need ? 'Submit' : multiple ? `Pick ${need - picked.length} more` : 'Pick an answer'}
          </Button>
        </div>
      )}
      {revealed && !sheetOpen && (
        <div className="check-bar after-bar">
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>See explanation</Button>
          <Button onClick={next}>{continueLabel}</Button>
        </div>
      )}
      <VerdictSheet question={question} chosen={chosen} guessed={guessing} open={sheetOpen} onClose={() => setSheetOpen(false)}
        onContinue={next} continueLabel={continueLabel} showLessonLink={mode !== 'lesson'} />
    </div>
  );
}
