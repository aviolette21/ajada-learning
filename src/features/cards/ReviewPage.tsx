import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgress } from '../../app/ProgressProvider';
import type { DirectionMode } from '../../study/types';
import { CardReviewSession } from './CardReviewSession';
import { DirectionToggle } from './DirectionToggle';

export function ReviewPage() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useProgress();
  const [mode, setMode] = useState<DirectionMode>(settings.cardDirection);
  const change = (m: DirectionMode) => {
    setMode(m);
    void updateSettings({ cardDirection: m });
  };
  return (
    <CardReviewSession key={mode} mode={mode} onDone={() => navigate('/cards')} onExit={() => navigate('/cards')}
      toolbar={<div className="review-toolbar"><DirectionToggle value={mode} onChange={change} /></div>} />
  );
}
