import type { DirectionMode } from '../../study/types';
import { SegmentedControl } from '../../ui/SegmentedControl';

const OPTIONS: { value: DirectionMode; label: string }[] = [
  { value: 'forward', label: 'Term → Def' },
  { value: 'reverse', label: 'Def → Term' },
  { value: 'mixed', label: 'Mixed' },
];

export function DirectionToggle({ value, onChange }: { value: DirectionMode; onChange: (m: DirectionMode) => void }) {
  return <SegmentedControl label="Card direction" options={OPTIONS} value={value} onChange={onChange} />;
}
