import { motion } from 'motion/react';
import type { Lesson } from '../../content/schema';
import { Button } from '../../ui/Button';
import { LessonBody } from './LessonBody';

/** The lesson shown over a quiz, so reading it never loses the quiz in progress. */
export function LessonOverlay({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  return (
    <motion.div className="lesson-overlay" role="dialog" aria-label={`Lesson: ${lesson.title}`}
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.25 }}>
      <div className="lesson-overlay-head">
        <Button variant="secondary" onClick={onClose}>← Back to quiz</Button>
      </div>
      <div className="lesson lesson-overlay-body">
        <LessonBody lesson={lesson} />
        <Button block onClick={onClose}>Back to quiz</Button>
      </div>
    </motion.div>
  );
}
