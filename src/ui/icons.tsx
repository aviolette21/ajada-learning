import type { ReactNode } from 'react';

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const IconHome = () => <Svg><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></Svg>;
export const IconBook = () => <Svg><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5" /></Svg>;
export const IconPencil = () => <Svg><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" /></Svg>;
export const IconCards = () => <Svg><rect x="3" y="7" width="14" height="14" rx="2" /><path d="M7 3h12a2 2 0 0 1 2 2v12" /></Svg>;
export const IconGear = () => (
  <Svg><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></Svg>
);
export const IconClose = () => <Svg><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const IconBack = () => <Svg><path d="M15 5l-7 7 7 7" /></Svg>;
export const IconFlag = ({ filled = false }: { filled?: boolean }) => (
  <Svg><path d="M5 21V4h11l-2 4 2 4H5" fill={filled ? 'currentColor' : 'none'} /></Svg>
);
export const IconClock = () => <Svg><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
export const IconCheck = () => <Svg><path d="M5 12l5 5 9-10" /></Svg>;
export const IconX = () => <Svg><path d="M7 7l10 10M17 7L7 17" /></Svg>;
export const IconChevron = () => <Svg><path d="M9 5l7 7-7 7" /></Svg>;
