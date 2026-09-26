import { AnimatePresence, MotionConfig } from 'motion/react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { Content } from '../content/schema';
import { BrowsePage } from '../features/cards/BrowsePage';
import { CardsPage } from '../features/cards/CardsPage';
import { GlossaryPage } from '../features/cards/GlossaryPage';
import { ReviewPage } from '../features/cards/ReviewPage';
import { LearnPage } from '../features/learn/LearnPage';
import { PracticePage } from '../features/practice/PracticePage';
import { QuizPage } from '../features/practice/QuizPage';
import { WeakSpotsPage } from '../features/practice/WeakSpotsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { TodayPage } from '../features/today/TodayPage';
import type { AppDb } from '../storage/db';
import { TabBar } from '../ui/TabBar';
import { ClockProvider } from './clock';
import { ContentProvider } from './ContentContext';
import { ProgressProvider } from './ProgressProvider';

const systemNow = () => new Date();

/** Full-screen flows hide the tab bar. */
const FULLSCREEN = /^\/(session|practice\/(quiz|weak)|practice\/mock\/[^/]+$|cards\/review|learn\/lesson\/[^/]+\/check)/;

export function Shell() {
  const location = useLocation();
  return (
    <div className="app">
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<TodayPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/cards" element={<CardsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/practice/quiz" element={<QuizPage />} />
          <Route path="/practice/weak" element={<WeakSpotsPage />} />
          <Route path="/cards/review" element={<ReviewPage />} />
          <Route path="/cards/browse/:domainId" element={<BrowsePage />} />
          <Route path="/cards/glossary" element={<GlossaryPage />} />
          {/* ROUTES: later tasks add <Route> elements here */}
          <Route path="*" element={<TodayPage />} />
        </Routes>
      </AnimatePresence>
      {!FULLSCREEN.test(location.pathname) && <TabBar />}
    </div>
  );
}

export function App({ db, content }: { db: AppDb; content: Content }) {
  return (
    <MotionConfig reducedMotion="user">
      <ClockProvider now={systemNow}>
        <ContentProvider content={content}>
          <ProgressProvider db={db}>
            <HashRouter>
              <Shell />
            </HashRouter>
          </ProgressProvider>
        </ContentProvider>
      </ClockProvider>
    </MotionConfig>
  );
}
