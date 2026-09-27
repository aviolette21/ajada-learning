import { AnimatePresence, MotionConfig } from 'motion/react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { Content } from '../content/schema';
import { BrowsePage } from '../features/cards/BrowsePage';
import { CardsPage } from '../features/cards/CardsPage';
import { GlossaryPage } from '../features/cards/GlossaryPage';
import { ReviewPage } from '../features/cards/ReviewPage';
import { DomainPage } from '../features/learn/DomainPage';
import { LearnPage } from '../features/learn/LearnPage';
import { LessonCheckPage } from '../features/learn/LessonCheckPage';
import { LessonPage } from '../features/learn/LessonPage';
import { HistoryPage } from '../features/mock/HistoryPage';
import { MockExamPage } from '../features/mock/MockExamPage';
import { MockIntroPage } from '../features/mock/MockIntroPage';
import { MockResultsPage } from '../features/mock/MockResultsPage';
import { PracticePage } from '../features/practice/PracticePage';
import { QuizPage } from '../features/practice/QuizPage';
import { WeakSpotsPage } from '../features/practice/WeakSpotsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { SessionPage } from '../features/today/SessionPage';
import { TodayPage } from '../features/today/TodayPage';
import { UpdateBanner } from '../pwa/UpdateBanner';
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
          <Route path="/practice/mock" element={<MockIntroPage />} />
          <Route path="/practice/mock/:sessionId" element={<MockExamPage />} />
          <Route path="/practice/mock/:sessionId/results" element={<MockResultsPage />} />
          <Route path="/practice/history" element={<HistoryPage />} />
          <Route path="/learn/:domainId" element={<DomainPage />} />
          <Route path="/learn/lesson/:lessonId" element={<LessonPage />} />
          <Route path="/learn/lesson/:lessonId/check" element={<LessonCheckPage />} />
          <Route path="/session" element={<SessionPage />} />
          {/* ROUTES: later tasks add <Route> elements here */}
          <Route path="*" element={<TodayPage />} />
        </Routes>
      </AnimatePresence>
      {!FULLSCREEN.test(location.pathname) && <TabBar />}
      <UpdateBanner />
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
