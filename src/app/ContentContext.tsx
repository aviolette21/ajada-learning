import { createContext, useContext, type ReactNode } from 'react';
import type { Content } from '../content/schema';

const ContentContext = createContext<Content | null>(null);

export function ContentProvider({ content, children }: { content: Content; children: ReactNode }) {
  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export function useContent(): Content {
  const c = useContext(ContentContext);
  if (!c) throw new Error('useContent must be used inside <ContentProvider>');
  return c;
}
