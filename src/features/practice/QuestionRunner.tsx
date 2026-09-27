import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useProgress } from '../../app/ProgressProvider';
import type { ChoiceId, Question } from '../../content/schema';
import type { AttemptMode } from '../../study/types';
import { Button } from '../../ui/Button';
import { IconClose } from '../../ui/icons';
import { ProgressBar } from '../../ui/ProgressBar';
import { QuestionView } from './QuestionView';
import { VerdictSheet } from './VerdictSheet';

export interface RunSummary { correct: number; total: number }

export function QuestionRunner({ questions, mode, title, onFinish, onExit }: {
  questions: Question[];
  mode: AttemptMode;
  title: string;
  onFinish: (summary: RunSummary) => void;
  onExit: () => void;
}) {
  const { recordAnswer } = useProgress();
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<ChoiceId | null>(null);
  const [correct, setCorrect] = useState(0);
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
  const choose = (id: ChoiceId) => {
    if (chosen) return;
    setChosen(id);
    if (id === question.answer) setCorrect((c) => c + 1);
    void recordAnswer(question, id, mode);
  };
  const next = () => {
    if (isLast) {
      onFinish({ correct, total: questions.length });
      return;
    }
    setIndex((i) => i + 1);
    setChosen(null);
  };

  return (
    <div className={`runner ${chosen ? 'has-sheet' : ''}`}>
      <header className="runner-head">
        <button type="button" className="icon-btn" aria-label="Close" onClick={onExit}><IconClose /></button>
        <span className="runner-count">{title} · {index + 1} / {questions.length}</span>
        <span className="icon-btn-spacer" />
      </header>
      <ProgressBar value={(index + (chosen ? 1 : 0)) / questions.length} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={question.id} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}>
          <QuestionView question={question} chosen={chosen} onChoose={choose} mode="answer" />
        </motion.div>
      </AnimatePresence>
      <VerdictSheet question={question} chosen={chosen} open={chosen !== null} onContinue={next} continueLabel={isLast ? 'Finish' : 'Continue'} showLessonLink={mode !== 'lesson'} />
    </div>
  );
}
