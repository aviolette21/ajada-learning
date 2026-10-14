import { AnimatePresence, MotionConfig } from 'motion/react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { Content } from '../content/schema';
import { DomainPage } from '../features/learn/DomainPage';
import { LearnPage } from '../features/learn/LearnPage';
import { LessonCheckPage } from '../features/learn/LessonCheckPage';
import { LessonPage } from '../features/learn/LessonPage';
import { HistoryPage } from '../features/mock/HistoryPage';
import { MockExamPage } from '../features/mock/MockExamPage';
import { MockIntroPage } from '../features/mock/MockIntroPage';
import { MockResultsPage } from '../features/mock/MockResultsPage';
import { PracticePage } from '../features/practice/PracticePage';
import { MistakesPage } from '../features/practice/MistakesPage';
import { ProgressPage } from '../features/practice/ProgressPage';
import { QuizPage } from '../features/practice/QuizPage';
import { WeakSpotsPage } from '../features/practice/WeakSpotsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { SessionPage } from '../features/today/SessionPage';
import { TodayPage } from '../features/today/TodayPage';
import { VocabPage } from '../features/vocab/VocabPage';
import { UpdateBanner } from '../pwa/UpdateBanner';
import type { AppDb } from '../storage/db';
import { TabBar } from '../ui/TabBar';
import { ClockProvider } from './clock';
import { ContentProvider } from './ContentContext';
import { NotifierProvider } from './Notifier';
import { ProgressProvider } from './ProgressProvider';
import { TermsProvider } from './Terms';

const systemNow = () => new Date();

/** Full-screen flows hide the tab bar. */
const FULLSCREEN = /^\/(session|practice\/(quiz|weak|mistakes)|practice\/mock\/[^/]+$|learn\/lesson\/[^/]+\/check)/;

export function Shell() {
  const location = useLocation();
  return (
    <div className="app">
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<TodayPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/vocab" element={<VocabPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/practice/quiz" element={<QuizPage />} />
          <Route path="/practice/weak" element={<WeakSpotsPage />} />
          <Route path="/practice/mistakes" element={<MistakesPage />} />
          <Route path="/practice/progress" element={<ProgressPage />} />
          {/* Flashcards were replaced by Vocabulary; old links land there. */}
          <Route path="/cards/*" element={<Navigate to="/vocab" replace />} />
          <Route path="/glossary" element={<Navigate to="/vocab" replace />} />
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
          <NotifierProvider>
            <ProgressProvider db={db}>
              <TermsProvider>
                <HashRouter>
                  <Shell />
                </HashRouter>
              </TermsProvider>
            </ProgressProvider>
          </NotifierProvider>
        </ContentProvider>
      </ClockProvider>
    </MotionConfig>
  );
}
