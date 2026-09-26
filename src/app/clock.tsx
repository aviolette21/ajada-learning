import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface Clock { now: () => Date }
const ClockContext = createContext<Clock>({ now: () => new Date() });

export function ClockProvider({ now, children }: { now: () => Date; children: ReactNode }) {
  const value = useMemo(() => ({ now }), [now]);
  return <ClockContext.Provider value={value}>{children}</ClockContext.Provider>;
}

export const useClock = () => useContext(ClockContext);

/** Re-renders every `intervalMs` with the current time (used by the mock-exam timer). */
export function useNow(intervalMs = 1000): Date {
  const { now } = useClock();
  const [time, setTime] = useState(() => now());
  useEffect(() => {
    const id = setInterval(() => setTime(now()), intervalMs);
    return () => clearInterval(id);
  }, [now, intervalMs]);
  return time;
}
