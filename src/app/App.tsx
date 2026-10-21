import { AnimatePresence, MotionConfig } from 'motion/react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { Content } from '../content/schema';
import { CoursePage } from '../features/course/CoursePage';
import { CourseQuizPage } from '../features/course/CourseQuizPage';
import { CourseSectionPage } from '../features/course/CourseSectionPage';
import { DomainPage } from '../features/learn/DomainPage';
import { LearnPage } from '../features/learn/LearnPage';
import { LessonCheckPage } from '../features/learn/LessonCheckPage';
import { LessonPage } from '../features/learn/LessonPage';
import { HistoryPage } from '../features/mock/HistoryPage';
import { MockExamPage } from '../features/mock/MockExamPage';
import { MockIntroPage } from '../features/mock/MockIntroPage';
import { MockResultsPage } from '../features/mock/MockResultsPage';
import { NeedsDrillPage, NeedsImprovementPage } from '../features/needs/NeedsImprovementPage';
import { CodeDrillPage } from '../features/practice/CodeDrillPage';
import { DomainQuizPage, DomainQuizzesPage } from '../features/practice/DomainQuizPage';
import { SavedDrillPage, SavedPage } from '../features/practice/SavedPage';
import { FocusDrillPage, FocusPage } from '../features/practice/FocusPage';
import { PracticePage } from '../features/practice/PracticePage';
import { PracticeSetPage } from '../features/practice/PracticeSetPage';
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
const FULLSCREEN = /^\/(session|needs-improvement\/drill|practice\/(quiz|weak|mistakes|code|saved\/drill|focus\/[^/]+$|set\/[^/]+$|domains\/[^/]+$)|practice\/mock\/[^/]+$|learn\/lesson\/[^/]+\/check)/;

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
          <Route path="/practice/code" element={<CodeDrillPage />} />
          <Route path="/practice/set/:setId" element={<PracticeSetPage />} />
          <Route path="/practice/domains" element={<DomainQuizzesPage />} />
          <Route path="/practice/domains/:domainId" element={<DomainQuizPage />} />
          <Route path="/practice/saved" element={<SavedPage />} />
          <Route path="/practice/saved/drill" element={<SavedDrillPage />} />
          <Route path="/practice/focus" element={<FocusPage />} />
          <Route path="/practice/focus/:areaId" element={<FocusDrillPage />} />
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
          <Route path="/course" element={<CoursePage />} />
          <Route path="/course/:sectionId" element={<CourseSectionPage />} />
          <Route path="/course/:sectionId/quiz" element={<CourseQuizPage />} />
          <Route path="/needs-improvement" element={<NeedsImprovementPage />} />
          <Route path="/needs-improvement/drill" element={<NeedsDrillPage />} />
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
