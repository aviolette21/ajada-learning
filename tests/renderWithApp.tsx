import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ClockProvider } from '../src/app/clock';
import { ContentProvider } from '../src/app/ContentContext';
import { ProgressProvider } from '../src/app/ProgressProvider';
import { fixtureContent } from '../src/content/fixtures';
import type { Content } from '../src/content/schema';
import { AppDb } from '../src/storage/db';

let counter = 0;
export function openTestDb(): Promise<AppDb> {
  return AppDb.open(`test-db-${Date.now()}-${counter++}`);
}

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname + loc.search}</div>;
}

export interface RenderOptions {
  content?: Content;
  db?: AppDb;
  /** Initial URL, e.g. "/practice/quiz?d=alpha". */
  route?: string;
  /** Route pattern the element is mounted at, e.g. "/learn/lesson/:lessonId". Defaults to "*". */
  path?: string;
  now?: () => Date;
}

export async function renderWithApp(ui: ReactNode, opts: RenderOptions = {}) {
  const db = opts.db ?? (await openTestDb());
  const content = opts.content ?? fixtureContent();
  const now = opts.now ?? (() => new Date());
  const utils = render(
    <ClockProvider now={now}>
      <ContentProvider content={content}>
        <ProgressProvider db={db}>
          <MemoryRouter initialEntries={[opts.route ?? '/']}>
            <Routes>
              <Route path={opts.path ?? '*'} element={ui} />
              {opts.path && <Route path="*" element={<div data-testid="elsewhere" />} />}
            </Routes>
            <LocationProbe />
          </MemoryRouter>
        </ProgressProvider>
      </ContentProvider>
    </ClockProvider>,
  );
  return { ...utils, db, content };
}
