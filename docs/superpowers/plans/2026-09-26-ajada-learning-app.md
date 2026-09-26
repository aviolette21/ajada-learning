# Ajada Learning — App Implementation Plan (Plan 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the complete Ajada Learning iPhone PWA (Today, Learn, Practice, Cards, Settings, mock exam, spaced-repetition flashcards) with a small, verified seed content set, live on GitHub Pages.

**Architecture:** A static React + TypeScript single-page app built with Vite and made installable/offline with `vite-plugin-pwa`. Study content is JSON in `content/`, validated by shared Zod schemas at build time and loaded at startup. Pure study logic (FSRS scheduling, weak spots, readiness, mock-exam assembly) lives in `src/study/` with no React; progress persists to IndexedDB through `src/storage/`; React context providers expose content, progress and a clock to feature screens in `src/features/`.

**Tech Stack:** React 19, TypeScript, Vite 8, vite-plugin-pwa, Motion (`motion/react`), ts-fsrs 5, idb 8, Zod 4, React Router 7 (HashRouter), Vitest + Testing Library + fake-indexeddb, Playwright, GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-26-ajada-learning-design.md` (read it before starting). Reference mockups: `docs/superpowers/mockups/` — `flashcards.html` is an interactive prototype the flashcard implementation must match in feel; `explanation-style-v2.html` is the approved answer-explanation design; `screens.html` is the tab layout.

**Plan 2 (separate, later):** full content bank (~154 questions, ~150 cards, 1 lesson per sub-skill). This plan ships only the seed set in Task 3.

## Global Constraints

- App name **Ajada Learning**; PWA `short_name` **Ajada**; repo `aviolette21/ajada-learning`; live URL `https://aviolette21.github.io/ajada-learning/`; Vite `base: '/ajada-learning/'`.
- **Dark mode only.** No light theme, no toggle, no `prefers-color-scheme` light rules. `color-scheme: dark`, `theme-color #0e0f13`.
- Palette tokens (exact): bg `#0e0f13`, surface `#16171d`, border `#2a2b35`, text `#e8e8ee`, muted `#8a8a99`, accent `#8b7cf6`, success `#2fbf71` on `#10261b`, error `#e05656` on `#2a1414`, warning `#f0c46a`.
- Fully offline v1: **no network calls** at runtime other than loading the app itself; no Claude/Anthropic API usage.
- Every question and card **must** carry a `source` (url, title, checkedOn); every choice **must** carry a `reason`. The content validator fails the build otherwise.
- Answer sources: Anthropic official docs, Claude Code docs, MCP spec/docs (modelcontextprotocol.io), Anthropic engineering posts only. Third-party prep sites may inform topic coverage only.
- Exam constants: 53 questions, 120 minutes, pass score 720 on 100–1000. Domain weights (exact): Applications and Integration 33.1, Model Selection and Optimisation 16.8, Agents and Workflows 14.7, Prompt and Context Engineering 11.0, Tools and MCPs 10.6, Security and Safety 8.1, Claude Code 3.1, Eval, Testing, and Debugging 2.6.
- Touch targets ≥ 44px; inputs use 16px font (prevents iOS zoom); respect safe-area insets; `prefers-reduced-motion` honoured (`MotionConfig reducedMotion="user"`).
- Item ids are permanent: questions `q-…`, cards `c-…`, lessons `l-…` (lowercase, digits, hyphens).
- Line endings LF (`.gitattributes`). Node 24. Commit after every task; end commit messages with:
  ```
  Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu
  ```
- Work in `C:\Projects\ajada-learning` (Git Bash path `/c/Projects/ajada-learning`). All commands below run from the repo root.

## File Map

```
.github/workflows/deploy.yml     CI: validate → unit tests → build → e2e → deploy Pages
content/domains.json             8 domains + 25 sub-skills (3 official)
content/<domain-id>/{questions,cards,lessons}.json
scripts/read-content.ts          read content/ from disk into RawContent
scripts/validate-content.ts      CLI gate used by `npm run validate`
src/main.tsx                     boot: open IndexedDB, render App
src/app/App.tsx                  providers + HashRouter + routes + tab bar
src/app/ContentContext.tsx       useContent()
src/app/ProgressProvider.tsx     useProgress(): progress state + actions
src/app/clock.tsx                ClockProvider, useClock(), useNow()
src/app/reminders.ts             backup reminder + standalone detection
src/content/schema.ts            Zod schemas + types + Content
src/content/validate.ts          validateContent(), buildContent()
src/content/loader.ts            rawFromGlob(), loadContent()
src/content/index.ts             `content` singleton (import.meta.glob)
src/content/fixtures.ts          test fixtures
src/study/types.ts               shared progress types
src/study/random.ts              mulberry32, shuffle
src/study/scheduler.ts           ts-fsrs wrapper + queue
src/study/accuracy.ts            recency-weighted accuracy
src/study/readiness.ts           readiness estimate
src/study/weakSpots.ts           missed questions, weak sub-skills, weak picks
src/study/quiz.ts                quick-quiz picker
src/study/mockExam.ts            allocation, assembly, scoring
src/storage/db.ts                AppDb (IndexedDB via idb)
src/storage/backup.ts            serialize/parse backup files
src/storage/share.ts             share-sheet or download a file
src/ui/*                         tokens.css, ui.css, motion.ts, icons, Button, Screen, Sheet,
                                 SegmentedControl, TabBar, Meter, ProgressBar, Disclosure,
                                 Diagram, inline.tsx
src/features/shared/FlagButton.tsx
src/features/practice/*          QuestionView, VerdictSheet, QuestionRunner, SessionSummary,
                                 PracticePage, QuizPage, WeakSpotsPage, practice.css
src/features/mock/*              MockIntroPage, MockExamPage, MockResultsPage, HistoryPage
src/features/cards/*             deck.ts, Flashcard, FlashcardDeck, RatingBar, DirectionToggle,
                                 CardReviewSession, ReviewPage, CardsPage, BrowsePage,
                                 GlossaryPage, cards.css
src/features/learn/*             LearnPage, DomainPage, LessonPage, LessonCheckPage, learn.css
src/features/today/*             TodayPage, SessionPage, HomeBanners, today.css
src/features/settings/SettingsPage.tsx
src/pwa/UpdateBanner.tsx
tests/setup.ts, tests/renderWithApp.tsx, tests/stubs/pwa-register.ts
e2e/*.spec.ts, playwright.config.ts
```

---

### Task 1: Project scaffold, dark theme base, PWA config, and live deploy pipeline

**Files:**
- Create: `.gitattributes`, `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `pwa-assets.config.ts`, `public/logo.svg`, `src/main.tsx`, `src/app/App.tsx`, `src/vite-env.d.ts`, `src/ui/tokens.css`, `tests/setup.ts`, `tests/stubs/pwa-register.ts`, `.github/workflows/deploy.yml`
- Modify: `.gitignore`
- Test: `src/app/App.test.tsx`

**Interfaces:**
- Produces: `npm test`, `npm run typecheck`, `npm run build`, `npm run dev`, `npm run preview` scripts; CSS custom properties in `src/ui/tokens.css` (names listed in Step 6) used by every later task; test setup (`tests/setup.ts`) that loads jest-dom matchers, fake-indexeddb, a `matchMedia` stub and disables Motion animations.

- [ ] **Step 1: Create config files**

`.gitattributes`:
```
* text=auto eol=lf
*.png binary
*.ico binary
```

Append to `.gitignore` (keep existing lines):
```
playwright-report/
test-results/
*.local
```

`package.json`:
```json
{
  "name": "ajada-learning",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "npm run typecheck && vite build",
    "preview": "vite preview",
    "icons": "pwa-assets-generator"
  }
}
```

- [ ] **Step 2: Install dependencies** (let npm resolve current versions; do not hand-edit versions)

```bash
npm install react react-dom react-router-dom motion ts-fsrs idb zod
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/node vite-plugin-pwa workbox-window @vite-pwa/assets-generator vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event fake-indexeddb tsx @playwright/test
```
Expected: installs without `ERESOLVE` peer errors (vite-plugin-pwa ≥1.3 and @vitejs/plugin-react ≥6 both accept Vite 8). If npm reports a peer conflict, stop and report it rather than using `--force`.

- [ ] **Step 3: TypeScript and Vite config**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "scripts", "tests", "e2e", "vite.config.ts", "playwright.config.ts", "pwa-assets.config.ts"]
}
```

`vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/ajada-learning/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      manifest: {
        name: 'Ajada Learning',
        short_name: 'Ajada',
        description: 'Study for the Claude Certified Developer – Foundations (CCDV-F) exam.',
        theme_color: '#0e0f13',
        background_color: '#0e0f13',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/ajada-learning/',
        scope: '/ajada-learning/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,ico,json,woff2}'] },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    alias: {
      'virtual:pwa-register/react': fileURLToPath(new URL('./tests/stubs/pwa-register.ts', import.meta.url)),
    },
  },
});
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
```

- [ ] **Step 4: HTML shell and icons**

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0e0f13" />
    <meta name="color-scheme" content="dark" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Ajada" />
    <meta name="description" content="Study for the Claude Certified Developer – Foundations exam." />
    <link rel="icon" href="%BASE_URL%favicon.ico" sizes="48x48" />
    <link rel="icon" href="%BASE_URL%logo.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="%BASE_URL%apple-touch-icon-180x180.png" />
    <title>Ajada Learning</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`public/logo.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0e0f13"/>
  <rect x="40" y="40" width="432" height="432" rx="96" fill="#1d1b2e"/>
  <path fill="#8b7cf6" fill-rule="evenodd" d="M256 112 L380 400 H322 L296 336 H216 L190 400 H132 Z M236 286 H276 L256 234 Z"/>
</svg>
```

`pwa-assets.config.ts`:
```ts
import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: {
    ...preset,
    maskable: { ...preset.maskable, resizeOptions: { background: '#0e0f13' } },
    apple: { ...preset.apple, resizeOptions: { background: '#0e0f13' } },
  },
  images: ['public/logo.svg'],
});
```

Run: `npm run icons`
Expected: creates `public/pwa-64x64.png`, `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon-180x180.png`, `public/favicon.ico`. If the generator's output names differ, update the `icons`/`includeAssets` entries and `index.html` links to the actual names.

- [ ] **Step 5: Test setup and PWA stub**

`tests/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import { afterEach } from 'vitest';

MotionGlobalConfig.skipAnimations = true;

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

afterEach(() => cleanup());
```
(If `MotionGlobalConfig` is not exported from `motion/react` in the installed version, import it from `motion` instead.)

`tests/stubs/pwa-register.ts`:
```ts
import { useState } from 'react';

export function useRegisterSW() {
  const needRefresh = useState(false);
  const offlineReady = useState(false);
  return { needRefresh, offlineReady, updateServiceWorker: async (_reload?: boolean) => {} };
}
```

- [ ] **Step 6: Theme tokens**

`src/ui/tokens.css`:
```css
:root {
  color-scheme: dark;
  --bg: #0e0f13;
  --surface: #16171d;
  --surface-2: #1a1b22;
  --border: #2a2b35;
  --border-soft: #23242c;
  --text: #e8e8ee;
  --text-2: #c9c9d6;
  --muted: #8a8a99;
  --faint: #6f6f80;
  --accent: #8b7cf6;
  --accent-soft: #1d1b2e;
  --accent-text: #b3a8ff;
  --on-accent: #0e0f13;
  --success: #2fbf71;
  --success-bg: #10261b;
  --success-text: #7fe0a8;
  --error: #e05656;
  --error-bg: #2a1414;
  --error-text: #ff8a8a;
  --warning: #f0c46a;
  --warning-bg: #2a2414;
  --radius-sm: 10px;
  --radius: 14px;
  --radius-lg: 22px;
  --tabbar-h: 64px;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --font: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
}

* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body, #root { height: 100%; margin: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font: 15px/1.45 var(--font);
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: none;
}
button { font: inherit; color: inherit; }
a { color: var(--accent-text); }
code { background: var(--border-soft); color: #d4ccff; padding: 1px 5px; border-radius: 5px; font-size: 0.9em; }
.boot { padding: 48px 20px; text-align: center; }
```

- [ ] **Step 7: Write the failing smoke test**

`src/app/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('shows the app name', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Ajada Learning' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `./App`.

- [ ] **Step 9: Minimal app** (Task 9 replaces both files)

`src/app/App.tsx`:
```tsx
export function App() {
  return (
    <main className="boot">
      <h1>Ajada Learning</h1>
      <p>Your CCDV-F study app is being built.</p>
    </main>
  );
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/tokens.css';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 10: Verify tests, typecheck and build**

Run: `npm test && npm run build`
Expected: 1 test passes; `dist/` contains `index.html`, `manifest.webmanifest`, `sw.js`, and the icon PNGs.

- [ ] **Step 11: CI/deploy workflow**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```
(If the Actions log warns an action major version is deprecated, bump to the version it names.)

- [ ] **Step 12: Commit, enable Pages, push, verify live**

```bash
git add -A
git commit -m "feat: scaffold Ajada Learning PWA with dark theme and Pages deploy" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
gh api -X POST repos/aviolette21/ajada-learning/pages -f build_type=workflow || gh api -X PUT repos/aviolette21/ajada-learning/pages -f build_type=workflow
git push
gh run watch --exit-status $(gh run list --workflow deploy.yml --limit 1 --json databaseId -q '.[0].databaseId')
curl -s -o /dev/null -w "%{http_code}\n" https://aviolette21.github.io/ajada-learning/
```
Expected: workflow succeeds; curl prints `200` (Pages can take a minute after the first deploy — retry once after 60s).

---

### Task 2: Content schemas, validator, domain map

**Files:**
- Create: `src/content/schema.ts`, `src/content/validate.ts`, `src/content/fixtures.ts`, `scripts/read-content.ts`, `scripts/validate-content.ts`, `content/domains.json`
- Modify: `package.json` (scripts), `.github/workflows/deploy.yml` (add validate step)
- Test: `src/content/validate.test.ts`, `scripts/read-content.test.ts`

**Interfaces:**
- Produces (`src/content/schema.ts`): Zod schemas `ChoiceIdSchema, SourceSchema, DiagramSchema, SubSkillSchema, DomainSchema, DomainsFileSchema, ChoiceSchema, QuestionSchema, CardSchema, LessonSectionSchema, LessonSchema`; types `ChoiceId, Source, Diagram, SubSkill, Domain, Choice, Question, Card, Lesson, LessonSection`; interface `Content { domains; questions; cards; lessons; domainById; questionById; cardById; lessonById }`.
- Produces (`src/content/validate.ts`): `interface RawContent { domains: unknown; files: Record<string, unknown> }` (file keys like `"apps-integration/questions.json"`); `type ValidationResult = { ok: true; content: Content } | { ok: false; errors: string[] }`; `validateContent(raw: RawContent): ValidationResult`; `buildContent(domains: Domain[], questions: Question[], cards: Card[], lessons: Lesson[]): Content`.
- Produces (`src/content/fixtures.ts`): `fixtureRaw(): RawContent` (domains `alpha` w60 [sub-skill `a1`], `beta` w40 [sub-skill `b1`]; questions `q-alpha-1..3`, `q-beta-1`; cards `c-alpha-one` (vocab), `c-beta-one`; lesson `l-alpha`), `fixtureContent(): Content`, `manyQuestionsContent(alphaCount: number, betaCount: number): Content`.
- Produces (`scripts/read-content.ts`): `readContentDir(dir: string): RawContent`.

- [ ] **Step 1: Schemas**

`src/content/schema.ts`:
```ts
import { z } from 'zod';

const text = z.string().trim().min(1);
const slug = z.string().regex(/^[a-z0-9-]+$/);

export const ChoiceIdSchema = z.enum(['a', 'b', 'c', 'd']);
export const SourceSchema = z.object({ url: z.url(), title: text, checkedOn: z.iso.date() });

const Tone = z.enum(['success', 'error', 'accent', 'neutral']);
export const DiagramSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('segmented-bar'),
    caption: text.optional(),
    segments: z
      .array(z.object({ label: text, sublabel: text.optional(), weight: z.number().positive(), tone: Tone }))
      .min(1),
  }),
  z.object({
    kind: z.literal('flow'),
    caption: text.optional(),
    steps: z.array(z.object({ label: text, sublabel: text.optional() })).min(2),
  }),
]);

export const SubSkillSchema = z.object({
  id: slug,
  name: text,
  weight: z.number().positive().optional(),
  official: z.boolean(),
});

export const DomainSchema = z.object({
  id: slug,
  name: text,
  shortName: text,
  weight: z.number().positive(),
  order: z.number().int().nonnegative(),
  subSkills: z.array(SubSkillSchema).min(1),
});
export const DomainsFileSchema = z.array(DomainSchema).min(1);

export const ChoiceSchema = z.object({ id: ChoiceIdSchema, text, reason: text });

export const QuestionSchema = z.object({
  id: z.string().regex(/^q-[a-z0-9-]+$/),
  domainId: text,
  subSkillId: text,
  topic: text,
  stem: text,
  choices: z
    .array(ChoiceSchema)
    .length(4)
    .refine((cs) => cs.map((c) => c.id).join('') === 'abcd', { message: 'choices must have ids a, b, c, d in order' }),
  answer: ChoiceIdSchema,
  takeaway: text,
  mnemonic: text.optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  diagram: DiagramSchema.optional(),
  source: SourceSchema,
  relatedCardIds: z.array(z.string()).default([]),
  lessonId: z.string().optional(),
});

export const CardSchema = z.object({
  id: z.string().regex(/^c-[a-z0-9-]+$/),
  domainId: text,
  subSkillId: text,
  term: text,
  definition: text,
  whyItMatters: text,
  example: text.optional(),
  source: SourceSchema,
  isVocab: z.boolean(),
});

export const LessonSectionSchema = z.object({ heading: text, body: text, diagram: DiagramSchema.optional() });

export const LessonSchema = z.object({
  id: z.string().regex(/^l-[a-z0-9-]+$/),
  domainId: text,
  subSkillId: text,
  title: text,
  summary: text,
  keyPoints: z.array(text).min(1),
  sections: z.array(LessonSectionSchema).min(1),
  checkQuestionIds: z.array(z.string()).length(3),
  sources: z.array(SourceSchema).min(1),
});

export type ChoiceId = z.infer<typeof ChoiceIdSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Diagram = z.infer<typeof DiagramSchema>;
export type SubSkill = z.infer<typeof SubSkillSchema>;
export type Domain = z.infer<typeof DomainSchema>;
export type Choice = z.infer<typeof ChoiceSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Card = z.infer<typeof CardSchema>;
export type LessonSection = z.infer<typeof LessonSectionSchema>;
export type Lesson = z.infer<typeof LessonSchema>;

export interface Content {
  domains: Domain[];
  questions: Question[];
  cards: Card[];
  lessons: Lesson[];
  domainById: Map<string, Domain>;
  questionById: Map<string, Question>;
  cardById: Map<string, Card>;
  lessonById: Map<string, Lesson>;
}
```

- [ ] **Step 2: Fixtures**

`src/content/fixtures.ts`:
```ts
import type { Content, Question } from './schema';
import { buildContent, validateContent, type RawContent } from './validate';

const source = { url: 'https://example.com/docs', title: 'Example doc', checkedOn: '2026-09-26' };

function question(id: string, domainId: string, subSkillId: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    domainId,
    subSkillId,
    topic: 'Topic',
    stem: `Stem for ${id}?`,
    choices: [
      { id: 'a', text: `Right answer ${id}`, reason: `Why a is right for ${id}` },
      { id: 'b', text: `Wrong one ${id}`, reason: `Why b is wrong for ${id}` },
      { id: 'c', text: `Wrong two ${id}`, reason: `Why c is wrong for ${id}` },
      { id: 'd', text: `Wrong three ${id}`, reason: `Why d is wrong for ${id}` },
    ],
    answer: 'a',
    takeaway: `Takeaway ${id}`,
    difficulty: 'easy',
    source,
    relatedCardIds: [],
    ...extra,
  };
}

export function fixtureRaw(): RawContent {
  return {
    domains: [
      { id: 'alpha', name: 'Alpha Domain', shortName: 'Alpha', weight: 60, order: 0, subSkills: [{ id: 'a1', name: 'Alpha One', weight: 60, official: true }] },
      { id: 'beta', name: 'Beta Domain', shortName: 'Beta', weight: 40, order: 1, subSkills: [{ id: 'b1', name: 'Beta One', official: false }] },
    ],
    files: {
      'alpha/questions.json': [
        question('q-alpha-1', 'alpha', 'a1', {
          relatedCardIds: ['c-alpha-one'],
          lessonId: 'l-alpha',
          mnemonic: 'Remember alpha',
          diagram: { kind: 'flow', caption: 'Alpha flow', steps: [{ label: 'Step one' }, { label: 'Step two' }] },
        }),
        question('q-alpha-2', 'alpha', 'a1', { relatedCardIds: ['c-alpha-one'], lessonId: 'l-alpha' }),
        question('q-alpha-3', 'alpha', 'a1', { lessonId: 'l-alpha' }),
      ],
      'alpha/cards.json': [
        { id: 'c-alpha-one', domainId: 'alpha', subSkillId: 'a1', term: 'Alpha term', definition: 'Alpha definition', whyItMatters: 'Alpha matters', example: 'Alpha example', source, isVocab: true },
      ],
      'alpha/lessons.json': [
        {
          id: 'l-alpha',
          domainId: 'alpha',
          subSkillId: 'a1',
          title: 'Alpha lesson',
          summary: 'Alpha summary',
          keyPoints: ['Point one', 'Point two'],
          sections: [{ heading: 'First section', body: 'Body with **bold** and `code`.\n\nSecond paragraph.' }],
          checkQuestionIds: ['q-alpha-1', 'q-alpha-2', 'q-alpha-3'],
          sources: [source],
        },
      ],
      'beta/questions.json': [question('q-beta-1', 'beta', 'b1', { relatedCardIds: ['c-beta-one'] })],
      'beta/cards.json': [
        { id: 'c-beta-one', domainId: 'beta', subSkillId: 'b1', term: 'Beta term', definition: 'Beta definition', whyItMatters: 'Beta matters', source, isVocab: false },
      ],
    },
  };
}

export function fixtureContent(): Content {
  const result = validateContent(fixtureRaw());
  if (!result.ok) throw new Error(`fixture invalid:\n${result.errors.join('\n')}`);
  return result.content;
}

/** Fixture domains with many generated questions (clones of q-alpha-1 / q-beta-1). */
export function manyQuestionsContent(alphaCount: number, betaCount: number): Content {
  const base = fixtureContent();
  const alpha = base.questionById.get('q-alpha-1')!;
  const beta = base.questionById.get('q-beta-1')!;
  const questions: Question[] = [
    ...Array.from({ length: alphaCount }, (_, i) => ({ ...alpha, id: `q-alpha-gen-${i}`, lessonId: undefined })),
    ...Array.from({ length: betaCount }, (_, i) => ({ ...beta, id: `q-beta-gen-${i}` })),
  ];
  return buildContent(base.domains, questions, base.cards, []);
}
```

- [ ] **Step 3: Write the failing validator tests**

`src/content/validate.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { fixtureRaw } from './fixtures';
import { validateContent, type ValidationResult } from './validate';

type Loose = { domains: any; files: Record<string, any> };

function mutate(fn: (raw: Loose) => void): ValidationResult {
  const raw = structuredClone(fixtureRaw()) as Loose;
  fn(raw);
  return validateContent(raw);
}
const errorText = (r: ValidationResult) => (r.ok ? '' : r.errors.join('\n'));

describe('validateContent', () => {
  it('accepts valid content and indexes it', () => {
    const r = validateContent(fixtureRaw());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.content.domains.map((d) => d.id)).toEqual(['alpha', 'beta']);
    expect(r.content.questions.map((q) => q.id)).toEqual(['q-alpha-1', 'q-alpha-2', 'q-alpha-3', 'q-beta-1']);
    expect(r.content.questionById.get('q-alpha-1')?.answer).toBe('a');
    expect(r.content.cardById.get('c-beta-one')?.term).toBe('Beta term');
    expect(r.content.lessonById.get('l-alpha')?.checkQuestionIds).toHaveLength(3);
  });

  it('rejects a choice with an empty reason', () => {
    const r = mutate((raw) => { raw.files['alpha/questions.json'][0].choices[2].reason = ''; });
    expect(errorText(r)).toMatch(/alpha\/questions\.json: 0\.choices\.2\.reason/);
  });

  it('rejects a card without a source', () => {
    const r = mutate((raw) => { delete raw.files['alpha/cards.json'][0].source; });
    expect(errorText(r)).toMatch(/alpha\/cards\.json: 0\.source/);
  });

  it('rejects an answer that is not a choice id', () => {
    const r = mutate((raw) => { raw.files['alpha/questions.json'][0].answer = 'e'; });
    expect(errorText(r)).toMatch(/alpha\/questions\.json: 0\.answer/);
  });

  it('rejects choices out of order', () => {
    const r = mutate((raw) => {
      const cs = raw.files['alpha/questions.json'][0].choices;
      cs[0].id = 'b';
      cs[1].id = 'a';
    });
    expect(errorText(r)).toMatch(/ids a, b, c, d in order/);
  });

  it('rejects links to unknown cards, lessons and questions', () => {
    const r = mutate((raw) => {
      raw.files['alpha/questions.json'][0].relatedCardIds = ['c-missing'];
      raw.files['alpha/questions.json'][1].lessonId = 'l-missing';
      raw.files['alpha/lessons.json'][0].checkQuestionIds = ['q-alpha-1', 'q-alpha-2', 'q-missing'];
    });
    const text = errorText(r);
    expect(text).toMatch(/q-alpha-1 links unknown card "c-missing"/);
    expect(text).toMatch(/q-alpha-2 links unknown lesson "l-missing"/);
    expect(text).toMatch(/l-alpha links unknown question "q-missing"/);
  });

  it('rejects duplicate ids across files', () => {
    const r = mutate((raw) => { raw.files['beta/questions.json'][0].id = 'q-alpha-1'; });
    expect(errorText(r)).toMatch(/duplicate id "q-alpha-1"/);
  });

  it('rejects items filed under the wrong domain folder', () => {
    const r = mutate((raw) => { raw.files['alpha/cards.json'][0].domainId = 'beta'; });
    expect(errorText(r)).toMatch(/c-alpha-one has domainId "beta" but lives in "alpha"/);
  });

  it('rejects unknown sub-skills', () => {
    const r = mutate((raw) => { raw.files['beta/cards.json'][0].subSkillId = 'zz'; });
    expect(errorText(r)).toMatch(/c-beta-one has unknown subSkillId "zz"/);
  });

  it('rejects domain weights that do not sum to 100', () => {
    const r = mutate((raw) => { raw.domains[1].weight = 30; });
    expect(errorText(r)).toMatch(/weights sum to 90\.0, expected 100/);
  });

  it('rejects files in folders that are not domains', () => {
    const r = mutate((raw) => { raw.files['gamma/questions.json'] = []; });
    expect(errorText(r)).toMatch(/gamma\/questions\.json: folder "gamma" is not a domain id/);
  });

  it('rejects unexpected file names', () => {
    const r = mutate((raw) => { raw.files['alpha/notes.json'] = []; });
    expect(errorText(r)).toMatch(/alpha\/notes\.json: unexpected content file/);
  });
});
```

- [ ] **Step 4: Run to verify failure**

Run: `npx vitest run src/content/validate.test.ts`
Expected: FAIL — cannot resolve `./validate`.

- [ ] **Step 5: Implement the validator**

`src/content/validate.ts`:
```ts
import { z } from 'zod';
import {
  CardSchema,
  DomainsFileSchema,
  LessonSchema,
  QuestionSchema,
  type Card,
  type Content,
  type Domain,
  type Lesson,
  type Question,
} from './schema';

export interface RawContent {
  domains: unknown;
  /** Keyed by "<domain-id>/<questions|cards|lessons>.json". */
  files: Record<string, unknown>;
}

export type ValidationResult = { ok: true; content: Content } | { ok: false; errors: string[] };

const KINDS = ['questions', 'cards', 'lessons'] as const;
const FILE_RE = /^([^/]+)\/([^/]+)\.json$/;

function zodErrors(file: string, error: z.ZodError): string[] {
  return error.issues.map((i) => `${file}: ${i.path.join('.') || '(root)'}: ${i.message}`);
}

export function buildContent(domains: Domain[], questions: Question[], cards: Card[], lessons: Lesson[]): Content {
  return {
    domains,
    questions,
    cards,
    lessons,
    domainById: new Map(domains.map((d) => [d.id, d])),
    questionById: new Map(questions.map((q) => [q.id, q])),
    cardById: new Map(cards.map((c) => [c.id, c])),
    lessonById: new Map(lessons.map((l) => [l.id, l])),
  };
}

export function validateContent(raw: RawContent): ValidationResult {
  const parsedDomains = DomainsFileSchema.safeParse(raw.domains);
  if (!parsedDomains.success) return { ok: false, errors: zodErrors('domains.json', parsedDomains.error) };

  const errors: string[] = [];
  const domains = [...parsedDomains.data].sort((a, b) => a.order - b.order);
  const domainById = new Map(domains.map((d) => [d.id, d]));
  const weightSum = domains.reduce((sum, d) => sum + d.weight, 0);
  if (Math.abs(weightSum - 100) > 0.5) errors.push(`domains.json: weights sum to ${weightSum.toFixed(1)}, expected 100`);

  for (const file of Object.keys(raw.files)) {
    const m = FILE_RE.exec(file);
    if (!m || !(KINDS as readonly string[]).includes(m[2])) errors.push(`${file}: unexpected content file`);
    else if (!domainById.has(m[1])) errors.push(`${file}: folder "${m[1]}" is not a domain id`);
  }

  const questions: { file: string; item: Question }[] = [];
  const cards: { file: string; item: Card }[] = [];
  const lessons: { file: string; item: Lesson }[] = [];
  const seen = new Set<string>();

  for (const domain of domains) {
    for (const kind of KINDS) {
      const file = `${domain.id}/${kind}.json`;
      if (!(file in raw.files)) continue;
      const schema = kind === 'questions' ? QuestionSchema : kind === 'cards' ? CardSchema : LessonSchema;
      const parsed = z.array(schema).safeParse(raw.files[file]);
      if (!parsed.success) {
        errors.push(...zodErrors(file, parsed.error));
        continue;
      }
      for (const item of parsed.data) {
        if (seen.has(item.id)) errors.push(`${file}: duplicate id "${item.id}"`);
        seen.add(item.id);
        if (item.domainId !== domain.id) errors.push(`${file}: ${item.id} has domainId "${item.domainId}" but lives in "${domain.id}"`);
        if (!domain.subSkills.some((s) => s.id === item.subSkillId)) errors.push(`${file}: ${item.id} has unknown subSkillId "${item.subSkillId}"`);
      }
      if (kind === 'questions') questions.push(...(parsed.data as Question[]).map((item) => ({ file, item })));
      if (kind === 'cards') cards.push(...(parsed.data as Card[]).map((item) => ({ file, item })));
      if (kind === 'lessons') lessons.push(...(parsed.data as Lesson[]).map((item) => ({ file, item })));
    }
  }

  const cardIds = new Set(cards.map((c) => c.item.id));
  const lessonIds = new Set(lessons.map((l) => l.item.id));
  const questionIds = new Set(questions.map((q) => q.item.id));
  for (const { file, item } of questions) {
    for (const id of item.relatedCardIds) if (!cardIds.has(id)) errors.push(`${file}: ${item.id} links unknown card "${id}"`);
    if (item.lessonId && !lessonIds.has(item.lessonId)) errors.push(`${file}: ${item.id} links unknown lesson "${item.lessonId}"`);
  }
  for (const { file, item } of lessons) {
    for (const id of item.checkQuestionIds) if (!questionIds.has(id)) errors.push(`${file}: ${item.id} links unknown question "${id}"`);
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    content: buildContent(
      domains,
      questions.map((q) => q.item),
      cards.map((c) => c.item),
      lessons.map((l) => l.item),
    ),
  };
}
```

- [ ] **Step 6: Run validator tests**

Run: `npx vitest run src/content/validate.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 7: Disk reader — failing test**

`scripts/read-content.test.ts`:
```ts
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readContentDir } from './read-content';

describe('readContentDir', () => {
  it('reads domains.json and every domain folder json file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ajada-content-'));
    writeFileSync(join(dir, 'domains.json'), JSON.stringify([{ id: 'alpha' }]));
    mkdirSync(join(dir, 'alpha'));
    writeFileSync(join(dir, 'alpha', 'questions.json'), JSON.stringify([{ id: 'q-x' }]));
    writeFileSync(join(dir, 'README.md'), 'ignored');

    const raw = readContentDir(dir);
    expect(raw.domains).toEqual([{ id: 'alpha' }]);
    expect(Object.keys(raw.files)).toEqual(['alpha/questions.json']);
    expect(raw.files['alpha/questions.json']).toEqual([{ id: 'q-x' }]);
  });
});
```

Run: `npx vitest run scripts/read-content.test.ts` — Expected: FAIL (module missing).

- [ ] **Step 8: Implement reader and CLI**

`scripts/read-content.ts`:
```ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { RawContent } from '../src/content/validate';

export function readContentDir(dir: string): RawContent {
  const domains: unknown = JSON.parse(readFileSync(join(dir, 'domains.json'), 'utf8'));
  const files: Record<string, unknown> = {};
  for (const entry of readdirSync(dir).sort()) {
    const sub = join(dir, entry);
    if (!statSync(sub).isDirectory()) continue;
    for (const name of readdirSync(sub).sort()) {
      if (name.endsWith('.json')) files[`${entry}/${name}`] = JSON.parse(readFileSync(join(sub, name), 'utf8'));
    }
  }
  return { domains, files };
}
```

`scripts/validate-content.ts`:
```ts
import { validateContent } from '../src/content/validate';
import { readContentDir } from './read-content';

const result = validateContent(readContentDir('content'));
if (!result.ok) {
  console.error(`✗ Content invalid (${result.errors.length} problem${result.errors.length === 1 ? '' : 's'}):`);
  for (const e of result.errors) console.error(`  - ${e}`);
  process.exit(1);
}
const c = result.content;
console.log(`✓ Content valid: ${c.domains.length} domains, ${c.questions.length} questions, ${c.cards.length} cards, ${c.lessons.length} lessons`);
```

- [ ] **Step 9: Domain map** — `content/domains.json` (exact; only the three Applications-and-Integration sub-skills with weights are official):

```json
[
  {
    "id": "apps-integration", "name": "Applications and Integration", "shortName": "Apps & Integration", "weight": 33.1, "order": 0,
    "subSkills": [
      { "id": "app-design", "name": "Claude Application Design", "weight": 8.6, "official": true },
      { "id": "swe-foundations", "name": "Software Engineering Foundations", "weight": 7.4, "official": true },
      { "id": "api-mechanics", "name": "Claude API Mechanics", "weight": 6.8, "official": true },
      { "id": "streaming-structured", "name": "Streaming & Structured Outputs", "official": false },
      { "id": "errors-limits", "name": "Errors, Rate Limits & Retries", "official": false }
    ]
  },
  {
    "id": "model-selection", "name": "Model Selection and Optimisation", "shortName": "Model Selection", "weight": 16.8, "order": 1,
    "subSkills": [
      { "id": "model-choice", "name": "Choosing a Model", "official": false },
      { "id": "cost-latency", "name": "Cost & Latency Optimisation", "official": false },
      { "id": "prompt-caching", "name": "Prompt Caching", "official": false },
      { "id": "batch-processing", "name": "Batch Processing", "official": false }
    ]
  },
  {
    "id": "agents-workflows", "name": "Agents and Workflows", "shortName": "Agents & Workflows", "weight": 14.7, "order": 2,
    "subSkills": [
      { "id": "workflow-patterns", "name": "Workflow Patterns", "official": false },
      { "id": "agent-loops", "name": "Agent Loops", "official": false },
      { "id": "multi-agent", "name": "Multi-Agent Orchestration", "official": false },
      { "id": "agent-sdk", "name": "Claude Agent SDK", "official": false }
    ]
  },
  {
    "id": "prompt-context", "name": "Prompt and Context Engineering", "shortName": "Prompt & Context", "weight": 11.0, "order": 3,
    "subSkills": [
      { "id": "prompt-techniques", "name": "Prompting Techniques", "official": false },
      { "id": "context-management", "name": "Context Window Management", "official": false },
      { "id": "system-prompts", "name": "System Prompts & Roles", "official": false }
    ]
  },
  {
    "id": "tools-mcp", "name": "Tools and MCPs", "shortName": "Tools & MCPs", "weight": 10.6, "order": 4,
    "subSkills": [
      { "id": "tool-use", "name": "Tool Use", "official": false },
      { "id": "mcp-servers", "name": "Building MCP Servers", "official": false },
      { "id": "mcp-clients", "name": "MCP Clients & Transports", "official": false }
    ]
  },
  {
    "id": "security-safety", "name": "Security and Safety", "shortName": "Security & Safety", "weight": 8.1, "order": 5,
    "subSkills": [
      { "id": "prompt-injection", "name": "Prompt Injection Defense", "official": false },
      { "id": "data-handling", "name": "Data Handling & Secrets", "official": false },
      { "id": "guardrails", "name": "Guardrails & Safe Output", "official": false }
    ]
  },
  {
    "id": "claude-code", "name": "Claude Code", "shortName": "Claude Code", "weight": 3.1, "order": 6,
    "subSkills": [
      { "id": "cc-usage", "name": "Using Claude Code", "official": false },
      { "id": "cc-config", "name": "Configuring Claude Code", "official": false }
    ]
  },
  {
    "id": "eval-testing", "name": "Eval, Testing, and Debugging", "shortName": "Eval & Debugging", "weight": 2.6, "order": 7,
    "subSkills": [
      { "id": "evals-debugging", "name": "Evals, Testing & Debugging", "official": false }
    ]
  }
]
```

- [ ] **Step 10: Wire scripts and CI**

In `package.json` `scripts`, add `"validate": "tsx scripts/validate-content.ts"` and change `build` to `"npm run validate && npm run typecheck && vite build"`.

In `.github/workflows/deploy.yml`, insert `- run: npm run validate` directly after `- run: npm ci`.

- [ ] **Step 11: Verify**

Run: `npm test && npm run validate && npm run build`
Expected: all tests pass; validate prints `✓ Content valid: 8 domains, 0 questions, 0 cards, 0 lessons`; build succeeds.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: content schemas, validator and CCDV-F domain map" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 3: Verified seed content (14 questions, 14 flashcards, 2 lessons)

This task is research + authoring, not code. The goal is a small, **correct** set that exercises every feature. Accuracy beats volume.

**Files:**
- Create: `content/<domain-id>/questions.json`, `content/<domain-id>/cards.json` for all 8 domains; `content/model-selection/lessons.json`, `content/apps-integration/lessons.json`

**Interfaces:**
- Consumes: schemas from Task 2 (`QuestionSchema`, `CardSchema`, `LessonSchema`) and `content/domains.json` sub-skill ids.
- Produces: the ids listed in Step 1 (later tasks' e2e tests rely only on counts: ≥14 questions, ≥14 cards, 2 lessons).

- [ ] **Step 1: Allocation (exact ids)**

| Domain / sub-skill | Question ids | Card ids |
|---|---|---|
| apps-integration / api-mechanics | `q-api-tool-use-stop-reason`, `q-api-system-prompt-param`, `q-api-max-tokens-stop` | `c-stop-reason`, `c-system-parameter`, `c-max-tokens` |
| apps-integration / app-design | `q-app-streaming-ux` | `c-streaming` |
| model-selection / prompt-caching | `q-cache-repeated-system-prompt`, `q-cache-breakpoint-placement`, `q-cache-lifetime` | `c-prompt-caching`, `c-cache-control` |
| model-selection / batch-processing | — | `c-message-batches` |
| agents-workflows / workflow-patterns | `q-workflow-vs-agent` | `c-workflow-vs-agent` |
| agents-workflows / agent-loops | `q-agent-loop-termination` | — |
| prompt-context / prompt-techniques | `q-prompt-xml-tags` | `c-xml-tags` |
| tools-mcp / mcp-servers | `q-mcp-primitives` | `c-mcp-server` |
| security-safety / prompt-injection | `q-injection-untrusted-docs` | `c-prompt-injection` |
| claude-code / cc-config | `q-cc-claude-md` | `c-claude-md` |
| eval-testing / evals-debugging | `q-eval-regression-set` | `c-eval-set` |

Lessons: `l-prompt-caching` (model-selection / prompt-caching; `checkQuestionIds` = the three `q-cache-*`) and `l-api-basics` (apps-integration / api-mechanics; `checkQuestionIds` = the three `q-api-*`). Set `lessonId` on those six questions accordingly, and `relatedCardIds` on every question to the matching card(s) from the same row.

- [ ] **Step 2: Research each topic from allowed sources only**

For each row, use WebFetch on the relevant official page (start from `https://platform.claude.com/docs/` or `https://docs.claude.com/` — whichever currently serves Anthropic's docs — plus `https://docs.claude.com/en/docs/claude-code/` for Claude Code, `https://modelcontextprotocol.io/` for MCP, `https://www.anthropic.com/engineering/building-effective-agents` for workflows vs agents). Record the exact URL and page title you used. **Never** state a fact you did not read on that page. Use today's date as `checkedOn`.

- [ ] **Step 3: Author items to the style rules**

Rules for every question: scenario stem ("Your app…", "A team…"); 4 plausible choices built from real misconceptions; exactly one correct; a one-line `reason` for **every** choice explaining why it is right/wrong; a one-line `takeaway`; `mnemonic` where a memorable hook exists; no "all/none of the above"; no trick wording; mix of difficulties. Use `**bold**` and `` `code` `` inline markup only (the app renders those two). Add a `diagram` to at least 2 questions (one `segmented-bar`, one `flow`).

Reference example — use this exact item for `content/model-selection/questions.json` after confirming each claim against the prompt-caching and batch-processing doc pages (fix wording if the docs differ):
```json
{
  "id": "q-cache-repeated-system-prompt",
  "domainId": "model-selection",
  "subSkillId": "prompt-caching",
  "topic": "Prompt caching",
  "stem": "Your app sends the same 20k-token system prompt on every request, followed by a short user message. What cuts cost **and** latency the most?",
  "choices": [
    { "id": "a", "text": "Enable prompt caching on the system prompt", "reason": "The repeated prefix is read from cache, so those input tokens are billed at a reduced rate and processed faster." },
    { "id": "b", "text": "Stream the response", "reason": "Streaming changes how output **arrives**; you still pay full price to process all 20k input tokens." },
    { "id": "c", "text": "Raise `max_tokens`", "reason": "`max_tokens` caps output length only; it has no effect on input cost or speed." },
    { "id": "d", "text": "Send requests through the Message Batches API", "reason": "Batches are cheaper but asynchronous, so latency goes **up**, not down." }
  ],
  "answer": "a",
  "takeaway": "A big prefix that repeats should be **cached**; streaming doesn't make input cheaper.",
  "mnemonic": "Same start, every time? Cache it.",
  "difficulty": "easy",
  "diagram": {
    "kind": "segmented-bar",
    "caption": "Only the new part is processed at full price.",
    "segments": [
      { "label": "System prompt · 20k", "sublabel": "cached", "weight": 3, "tone": "success" },
      { "label": "New message", "sublabel": "full price", "weight": 1, "tone": "neutral" }
    ]
  },
  "source": { "url": "https://platform.claude.com/docs/en/build-with-claude/prompt-caching", "title": "Prompt caching", "checkedOn": "2026-09-26" },
  "relatedCardIds": ["c-prompt-caching", "c-cache-control"],
  "lessonId": "l-prompt-caching"
}
```
Reference card (confirm against the docs likewise):
```json
{
  "id": "c-cache-control",
  "domainId": "model-selection",
  "subSkillId": "prompt-caching",
  "term": "cache_control",
  "definition": "A field on a content block that marks a cache breakpoint: everything up to and including that block becomes the cacheable prefix.",
  "whyItMatters": "Exam scenarios test **where** to put the breakpoint: after the large, stable content and before anything that changes per request.",
  "example": "Put `cache_control` on the last block of a long system prompt.",
  "source": { "url": "https://platform.claude.com/docs/en/build-with-claude/prompt-caching", "title": "Prompt caching", "checkedOn": "2026-09-26" },
  "isVocab": true
}
```
Cards: `isVocab: true` for terms (most cards); `whyItMatters` gives the exam angle. Lessons: `summary` (2–3 sentences), 3–5 `keyPoints`, 2–4 `sections` (paragraphs separated by blank lines; `- ` bullet lines allowed), optional section `diagram`, `sources` listing every page used.

- [ ] **Step 4: Validate**

Run: `npm run validate`
Expected: `✓ Content valid: 8 domains, 14 questions, 14 cards, 2 lessons`. Fix every reported error.

- [ ] **Step 5: Independent fact-check**

Dispatch a fresh reviewer subagent (general-purpose) with this prompt: "Fact-check every item in `C:\Projects\ajada-learning\content\`. For each question/card/lesson, WebFetch its `source.url` and confirm (1) the marked answer is correct, (2) every choice `reason` is accurate, (3) takeaway/mnemonic/definition/whyItMatters/example contain no claim the page does not support, (4) the URL loads and the title matches. Report a table: id, verdict (OK / FIX / DROP), the exact problem and the supporting quote. Do not edit files." Apply every FIX; delete DROP items and author replacements (then re-run this step for the replacements only). Re-run `npm run validate`.

- [ ] **Step 6: User spot-check**

Show the user a compact list of all 14 questions (stem, correct answer, one-line takeaway, source title) and ask them to flag anything that looks off. Apply their corrections, then re-run `npm run validate`.

- [ ] **Step 7: Commit**

```bash
git add content
git commit -m "content: verified seed set (14 questions, 14 cards, 2 lessons)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 4: Content loader

**Files:**
- Create: `src/content/loader.ts`, `src/content/index.ts`
- Test: `src/content/loader.test.ts`

**Interfaces:**
- Consumes: `validateContent`, `RawContent` (Task 2).
- Produces: `rawFromGlob(domains: unknown, modules: Record<string, unknown>): RawContent`; `loadContent(raw: RawContent): Content` (throws `Error` listing all problems); `content: Content` singleton exported from `src/content/index.ts`.

- [ ] **Step 1: Failing tests**

`src/content/loader.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { fixtureRaw } from './fixtures';
import { loadContent, rawFromGlob } from './loader';

describe('rawFromGlob', () => {
  it('maps glob paths to domain/file keys', () => {
    const raw = rawFromGlob(['d'], {
      '../../content/alpha/questions.json': [1],
      '../../content/beta/cards.json': [2],
    });
    expect(raw).toEqual({ domains: ['d'], files: { 'alpha/questions.json': [1], 'beta/cards.json': [2] } });
  });
});

describe('loadContent', () => {
  it('returns indexed content for valid input', () => {
    expect(loadContent(fixtureRaw()).questions).toHaveLength(4);
  });
  it('throws with every problem listed', () => {
    const raw = fixtureRaw();
    (raw.files['beta/cards.json'] as { source?: unknown }[])[0].source = undefined;
    expect(() => loadContent(raw)).toThrow(/Invalid study content[\s\S]*beta\/cards\.json: 0\.source/);
  });
});

describe('bundled content', () => {
  it('loads the real content folder', async () => {
    const { content } = await import('./index');
    expect(content.domains).toHaveLength(8);
    expect(content.domains.reduce((s, d) => s + d.weight, 0)).toBeCloseTo(100, 1);
    expect(content.questions.length).toBeGreaterThanOrEqual(14);
    expect(content.cards.length).toBeGreaterThanOrEqual(14);
  });
});
```

Run: `npx vitest run src/content/loader.test.ts` — Expected: FAIL (modules missing).

- [ ] **Step 2: Implement**

`src/content/loader.ts`:
```ts
import type { Content } from './schema';
import { validateContent, type RawContent } from './validate';

export function rawFromGlob(domains: unknown, modules: Record<string, unknown>): RawContent {
  const files: Record<string, unknown> = {};
  for (const [path, data] of Object.entries(modules)) {
    const m = /content\/([^/]+\/[^/]+\.json)$/.exec(path);
    if (m) files[m[1]] = data;
  }
  return { domains, files };
}

export function loadContent(raw: RawContent): Content {
  const result = validateContent(raw);
  if (!result.ok) throw new Error(`Invalid study content:\n${result.errors.join('\n')}`);
  return result.content;
}
```

`src/content/index.ts`:
```ts
import domains from '../../content/domains.json';
import { loadContent, rawFromGlob } from './loader';

const modules = import.meta.glob('../../content/*/*.json', { eager: true, import: 'default' });

export const content = loadContent(rawFromGlob(domains, modules));
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/content`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/content
git commit -m "feat: load and validate bundled content at startup" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---
### Task 5: Study types, randomness, and the FSRS scheduler

**Files:**
- Create: `src/study/types.ts`, `src/study/random.ts`, `src/study/scheduler.ts`
- Test: `src/study/random.test.ts`, `src/study/scheduler.test.ts`

**Interfaces:**
- Consumes: `ts-fsrs` (`fsrs`, `createEmptyCard`, `Rating`, `Grade`, `Card`); `ChoiceId` (Task 2).
- Produces (`types.ts`): `Direction = 'forward' | 'reverse'`; `DirectionMode = Direction | 'mixed'`; `UserRating = 'again' | 'hard' | 'good' | 'easy'`; `StoredCardState { key; cardId; direction; fsrs: FsrsCard; introducedOn: string /* YYYY-MM-DD local */ }`; `AttemptMode = 'quiz' | 'weak' | 'lesson' | 'mock' | 'today'`; `Attempt { id?: number; questionId; chosen: ChoiceId; correct: boolean; mode: AttemptMode; at: number }`; `MockSession { id; startedAt: number; durationMs: number; questionIds: string[]; answers: Record<string, ChoiceId>; flagged: string[]; currentIndex: number; submittedAt?: number }`; `LessonDone { lessonId; at }`; `Flag { itemId; kind: 'question' | 'card'; at }`; `Settings { newCardsPerDay: number; cardDirection: DirectionMode; lastBackupAt?: number; installHintDismissedAt?: number }`; `DEFAULT_SETTINGS`.
- Produces (`random.ts`): `mulberry32(seed: number): () => number`; `shuffle<T>(items: readonly T[], rng: () => number): T[]`.
- Produces (`scheduler.ts`): `RATINGS: UserRating[]`; `REQUEUE_WINDOW_MS`; `stateKey(cardId, direction): string`; `localDay(d: Date): string`; `newState(cardId, direction, now: Date): StoredCardState`; `rate(state, rating: UserRating, now: Date): StoredCardState`; `formatInterval(ms: number): string`; `previewIntervals(state, now): Record<UserRating, string>`; `shouldRequeue(state, now): boolean`; `resurface(state, now): StoredCardState`; `nextDueIn(states: Map<string, StoredCardState>, now: Date): string | null`; `interface QueueItem { cardId: string; direction: Direction; state: StoredCardState | null }`; `buildQueue(args: { cardIds: string[]; states: Map<string, StoredCardState>; mode: DirectionMode; now: Date; newPerDay: number; rng: () => number }): QueueItem[]`.

- [ ] **Step 1: Types** — `src/study/types.ts`:
```ts
import type { Card as FsrsCard } from 'ts-fsrs';
import type { ChoiceId } from '../content/schema';

export type Direction = 'forward' | 'reverse';
export type DirectionMode = Direction | 'mixed';
export type UserRating = 'again' | 'hard' | 'good' | 'easy';

export interface StoredCardState {
  key: string;
  cardId: string;
  direction: Direction;
  fsrs: FsrsCard;
  /** Local calendar day (YYYY-MM-DD) this card/direction was first reviewed. */
  introducedOn: string;
}

export type AttemptMode = 'quiz' | 'weak' | 'lesson' | 'mock' | 'today';

export interface Attempt {
  id?: number;
  questionId: string;
  chosen: ChoiceId;
  correct: boolean;
  mode: AttemptMode;
  at: number;
}

export interface MockSession {
  id: string;
  startedAt: number;
  durationMs: number;
  questionIds: string[];
  answers: Record<string, ChoiceId>;
  flagged: string[];
  currentIndex: number;
  submittedAt?: number;
}

export interface LessonDone { lessonId: string; at: number }
export interface Flag { itemId: string; kind: 'question' | 'card'; at: number }

export interface Settings {
  newCardsPerDay: number;
  cardDirection: DirectionMode;
  lastBackupAt?: number;
  installHintDismissedAt?: number;
}

export const DEFAULT_SETTINGS: Settings = { newCardsPerDay: 15, cardDirection: 'forward' };
```

- [ ] **Step 2: Failing tests**

`src/study/random.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { mulberry32, shuffle } from './random';

describe('mulberry32', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = mulberry32(42), b = mulberry32(42);
    const xs = Array.from({ length: 50 }, () => a());
    expect(xs).toEqual(Array.from({ length: 50 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(input, mulberry32(7));
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out].sort()).toEqual(input);
  });
});
```

`src/study/scheduler.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from './random';
import {
  buildQueue, formatInterval, localDay, newState, nextDueIn, previewIntervals, rate, resurface, shouldRequeue, stateKey,
} from './scheduler';
import type { Direction, StoredCardState } from './types';

const NOW = new Date('2026-09-26T10:00:00');
const DAY = 86_400_000;
const PAST = new Date('2026-09-01T10:00:00');

function reviewed(cardId: string, direction: Direction, dueOffsetMs: number, introducedOn = '2026-09-01'): StoredCardState {
  const s = rate(newState(cardId, direction, PAST), 'easy', PAST);
  return { ...s, introducedOn, fsrs: { ...s.fsrs, due: new Date(NOW.getTime() + dueOffsetMs) } };
}
const mapOf = (...states: StoredCardState[]) => new Map(states.map((s) => [s.key, s]));

describe('formatInterval', () => {
  it.each([
    [30_000, '<1m'], [60_000, '1m'], [600_000, '10m'], [3 * 3_600_000, '3h'],
    [DAY, '1d'], [4 * DAY, '4d'], [60 * DAY, '2mo'], [400 * DAY, '1.1y'],
  ])('%i ms → %s', (ms, label) => {
    expect(formatInterval(ms)).toBe(label);
  });
});

describe('card state', () => {
  it('keys states by card and direction', () => {
    expect(stateKey('c-x', 'reverse')).toBe('c-x:reverse');
  });

  it('creates a new state that is due now and introduced today', () => {
    const s = newState('c-x', 'forward', NOW);
    expect(s.key).toBe('c-x:forward');
    expect(s.fsrs.due.getTime()).toBeLessThanOrEqual(NOW.getTime());
    expect(s.introducedOn).toBe(localDay(NOW));
  });

  it('schedules again < good < easy, with easy at least a day out', () => {
    const s = newState('c-x', 'forward', NOW);
    const due = (r: 'again' | 'good' | 'easy') => rate(s, r, NOW).fsrs.due.getTime();
    expect(due('again')).toBeLessThan(due('good'));
    expect(due('good')).toBeLessThan(due('easy'));
    expect(due('easy') - NOW.getTime()).toBeGreaterThanOrEqual(DAY);
  });

  it('keeps introducedOn when rating', () => {
    const s = newState('c-x', 'forward', PAST);
    expect(rate(s, 'good', NOW).introducedOn).toBe(localDay(PAST));
  });

  it('requeues only cards that come back within the session window', () => {
    const s = newState('c-x', 'forward', NOW);
    expect(shouldRequeue(rate(s, 'again', NOW), NOW)).toBe(true);
    expect(shouldRequeue(rate(s, 'easy', NOW), NOW)).toBe(false);
  });

  it('previews an interval label for each rating', () => {
    const p = previewIntervals(newState('c-x', 'forward', NOW), NOW);
    expect(Object.keys(p).sort()).toEqual(['again', 'easy', 'good', 'hard']);
    expect(p.easy).toMatch(/d$/);
  });

  it('resurface makes a card due now without losing its history', () => {
    const s = reviewed('c-x', 'forward', 5 * DAY);
    const r = resurface(s, NOW);
    expect(r.fsrs.due.getTime()).toBe(NOW.getTime());
    expect(r.fsrs.reps).toBe(s.fsrs.reps);
  });

  it('nextDueIn reports the soonest future review', () => {
    expect(nextDueIn(mapOf(reviewed('c-a', 'forward', 2 * DAY), reviewed('c-b', 'forward', 5 * DAY)), NOW)).toBe('2d');
    expect(nextDueIn(new Map(), NOW)).toBeNull();
  });
});

describe('buildQueue', () => {
  const rng = mulberry32(1);
  const base = { now: NOW, newPerDay: 10, rng };

  it('puts due cards first (most overdue first), then new cards', () => {
    const states = mapOf(reviewed('c-a', 'forward', -DAY), reviewed('c-b', 'forward', -3 * DAY), reviewed('c-c', 'forward', DAY));
    const q = buildQueue({ ...base, cardIds: ['c-a', 'c-b', 'c-c', 'c-d'], states, mode: 'forward' });
    expect(q.map((i) => i.cardId)).toEqual(['c-b', 'c-a', 'c-d']);
    expect(q[2].state).toBeNull();
  });

  it('limits new cards by what was already introduced today', () => {
    const states = mapOf(reviewed('c-a', 'forward', DAY, localDay(NOW)));
    const q = buildQueue({ ...base, newPerDay: 2, cardIds: ['c-a', 'c-b', 'c-c', 'c-d'], states, mode: 'forward' });
    expect(q.map((i) => i.cardId)).toEqual(['c-b']);
  });

  it('ignores reverse-direction states in forward mode', () => {
    const q = buildQueue({ ...base, cardIds: ['c-a'], states: mapOf(reviewed('c-a', 'reverse', -DAY)), mode: 'forward' });
    expect(q).toEqual([{ cardId: 'c-a', direction: 'forward', state: null }]);
  });

  it('schedules the reverse direction independently of the forward one', () => {
    const q = buildQueue({ ...base, cardIds: ['c-a'], states: mapOf(reviewed('c-a', 'forward', -DAY)), mode: 'reverse' });
    expect(q).toEqual([{ cardId: 'c-a', direction: 'reverse', state: null }]);
  });

  it('mixed mode introduces one direction per new card', () => {
    const q = buildQueue({ ...base, cardIds: ['c-a', 'c-b', 'c-c'], states: new Map(), mode: 'mixed' });
    expect(q).toHaveLength(3);
    expect(new Set(q.map((i) => i.cardId)).size).toBe(3);
  });

  it('mixed mode waits a day before introducing the second direction', () => {
    const today = mapOf(reviewed('c-a', 'forward', DAY, localDay(NOW)));
    expect(buildQueue({ ...base, cardIds: ['c-a'], states: today, mode: 'mixed' })).toEqual([]);
    const earlier = mapOf(reviewed('c-a', 'forward', DAY, '2026-09-01'));
    expect(buildQueue({ ...base, cardIds: ['c-a'], states: earlier, mode: 'mixed' })).toEqual([
      { cardId: 'c-a', direction: 'reverse', state: null },
    ]);
  });
});
```

Run: `npx vitest run src/study` — Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**

`src/study/random.ts`:
```ts
/** Small deterministic PRNG so tests can pin randomness. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
```

`src/study/scheduler.ts`:
```ts
import { createEmptyCard, fsrs, Rating, type Grade } from 'ts-fsrs';
import type { Direction, DirectionMode, StoredCardState, UserRating } from './types';

const scheduler = fsrs();
const GRADE: Record<UserRating, Grade> = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good, easy: Rating.Easy };

export const RATINGS: UserRating[] = ['again', 'hard', 'good', 'easy'];
/** Cards due again within this window come back in the same session (FSRS learning steps). */
export const REQUEUE_WINDOW_MS = 15 * 60_000;

export function stateKey(cardId: string, direction: Direction): string {
  return `${cardId}:${direction}`;
}

export function localDay(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function newState(cardId: string, direction: Direction, now: Date): StoredCardState {
  return { key: stateKey(cardId, direction), cardId, direction, fsrs: createEmptyCard(now), introducedOn: localDay(now) };
}

export function rate(state: StoredCardState, rating: UserRating, now: Date): StoredCardState {
  const { card } = scheduler.next(state.fsrs, now, GRADE[rating]);
  return { ...state, fsrs: card };
}

export function formatInterval(ms: number): string {
  const min = 60_000, hour = 60 * min, day = 24 * hour;
  if (ms < min) return '<1m';
  if (ms < hour) return `${Math.round(ms / min)}m`;
  if (ms < day) return `${Math.round(ms / hour)}h`;
  if (ms < 30 * day) return `${Math.round(ms / day)}d`;
  if (ms < 365 * day) return `${Math.round(ms / (30 * day))}mo`;
  return `${(ms / (365 * day)).toFixed(1)}y`;
}

export function previewIntervals(state: StoredCardState, now: Date): Record<UserRating, string> {
  const preview = scheduler.repeat(state.fsrs, now);
  const out = {} as Record<UserRating, string>;
  for (const r of RATINGS) out[r] = formatInterval(preview[GRADE[r]].card.due.getTime() - now.getTime());
  return out;
}

export function shouldRequeue(state: StoredCardState, now: Date): boolean {
  return state.fsrs.due.getTime() - now.getTime() < REQUEUE_WINDOW_MS;
}

export function resurface(state: StoredCardState, now: Date): StoredCardState {
  return { ...state, fsrs: { ...state.fsrs, due: now } };
}

export function nextDueIn(states: Map<string, StoredCardState>, now: Date): string | null {
  let soonest = Infinity;
  for (const s of states.values()) {
    const t = s.fsrs.due.getTime();
    if (t > now.getTime() && t < soonest) soonest = t;
  }
  return soonest === Infinity ? null : formatInterval(soonest - now.getTime());
}

export interface QueueItem {
  cardId: string;
  direction: Direction;
  /** null = never reviewed in this direction (a new card). */
  state: StoredCardState | null;
}

export function buildQueue(args: {
  cardIds: string[];
  states: Map<string, StoredCardState>;
  mode: DirectionMode;
  now: Date;
  newPerDay: number;
  rng: () => number;
}): QueueItem[] {
  const { cardIds, states, mode, now, newPerDay, rng } = args;
  const dirs: Direction[] = mode === 'mixed' ? ['forward', 'reverse'] : [mode];
  const today = localDay(now);
  let introducedToday = 0;
  for (const s of states.values()) if (s.introducedOn === today) introducedToday++;
  let budget = Math.max(0, newPerDay - introducedToday);

  const due: QueueItem[] = [];
  const fresh: QueueItem[] = [];
  for (const cardId of cardIds) {
    const unseen: Direction[] = [];
    for (const direction of dirs) {
      const state = states.get(stateKey(cardId, direction));
      if (!state) unseen.push(direction);
      else if (state.fsrs.due.getTime() <= now.getTime()) due.push({ cardId, direction, state });
    }
    const siblingIntroducedToday = (['forward', 'reverse'] as const).some(
      (d) => states.get(stateKey(cardId, d))?.introducedOn === today,
    );
    if (unseen.length > 0 && budget > 0 && !siblingIntroducedToday) {
      const direction = unseen.length === 1 ? unseen[0] : unseen[Math.floor(rng() * unseen.length)];
      fresh.push({ cardId, direction, state: null });
      budget--;
    }
  }
  due.sort((a, b) => a.state!.fsrs.due.getTime() - b.state!.fsrs.due.getTime());
  return [...due, ...fresh];
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/study`
Expected: PASS. If the `previewIntervals` easy label is `mo` rather than `d` with the installed ts-fsrs defaults, relax that assertion to `/(d|mo)$/` — do not change the scheduler.

- [ ] **Step 5: Commit**

```bash
git add src/study
git commit -m "feat: FSRS scheduler with per-direction card state and daily queue" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 6: Accuracy, readiness, weak spots, quick-quiz picker

**Files:**
- Create: `src/study/accuracy.ts`, `src/study/readiness.ts`, `src/study/weakSpots.ts`, `src/study/quiz.ts`
- Test: `src/study/analytics.test.ts`

**Interfaces:**
- Consumes: `Attempt` (Task 5), `Question`, `Domain` (Task 2), `shuffle` (Task 5), `fixtureContent` (Task 2).
- Produces: `RECENCY_DECAY = 0.9`; `weightedAccuracy(attempts: Attempt[]): number | null`; `interface GroupStat { total: number; correct: number; accuracy: number | null }`; `accuracyBy(attempts, questionById: Map<string, Question>, key: 'domainId' | 'subSkillId'): Map<string, GroupStat>`; `PASS_SCORE = 720`; `MIN_ANSWERS_FOR_ESTIMATE = 40`; `toScaledScore(fraction: number): number`; `type Readiness = { available: false; answered: number; needed: number } | { available: true; answered: number; percent: number; score: number; passes: boolean }`; `readiness(domains, attempts, questionById, minAnswers?): Readiness`; `TODAY_QUESTION_COUNT = 10`; `missedQuestionIds(attempts): string[]`; `weakSubSkills(attempts, questionById, limit?): string[]`; `pickWeakQuestions(args: { attempts; questions; questionById; count; rng }): Question[]`; `QUIZ_SIZE = 10`; `pickQuizQuestions(args: { questions; attempts; domainIds: string[]; count; rng }): Question[]`.

- [ ] **Step 1: Failing tests** — `src/study/analytics.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { fixtureContent } from '../content/fixtures';
import { accuracyBy, weightedAccuracy } from './accuracy';
import { pickQuizQuestions } from './quiz';
import { mulberry32 } from './random';
import { readiness, toScaledScore } from './readiness';
import type { Attempt } from './types';
import { missedQuestionIds, pickWeakQuestions, weakSubSkills } from './weakSpots';

const { domains, questions, questionById } = fixtureContent();
const att = (questionId: string, correct: boolean, at: number): Attempt => ({
  questionId, chosen: correct ? 'a' : 'b', correct, mode: 'quiz', at,
});

describe('weightedAccuracy', () => {
  it('is null without attempts', () => expect(weightedAccuracy([])).toBeNull());
  it('is 1 when everything is right', () => expect(weightedAccuracy([att('q-alpha-1', true, 1), att('q-alpha-2', true, 2)])).toBe(1));
  it('weighs recent attempts more', () => {
    expect(weightedAccuracy([att('q-alpha-1', false, 1), att('q-alpha-1', true, 2)])).toBeCloseTo(1 / 1.9, 5);
  });
});

describe('accuracyBy', () => {
  it('groups by domain and ignores unknown questions', () => {
    const stats = accuracyBy(
      [att('q-alpha-1', true, 1), att('q-alpha-2', false, 2), att('q-beta-1', true, 3), att('q-gone', true, 4)],
      questionById,
      'domainId',
    );
    expect(stats.get('alpha')).toMatchObject({ total: 2, correct: 1 });
    expect(stats.get('beta')).toMatchObject({ total: 1, correct: 1, accuracy: 1 });
    expect(stats.size).toBe(2);
  });
});

describe('readiness', () => {
  it('is unavailable until enough distinct questions are answered', () => {
    expect(readiness(domains, [att('q-alpha-1', true, 1), att('q-alpha-1', true, 2)], questionById)).toEqual({
      available: false, answered: 1, needed: 40,
    });
  });
  it('weights domain accuracy by exam weight; unanswered domains count as zero', () => {
    const r = readiness(domains, [att('q-alpha-1', true, 1)], questionById, 1);
    expect(r).toEqual({ available: true, answered: 1, percent: 60, score: 640, passes: false });
  });
  it('passes at or above 720', () => {
    const r = readiness(domains, [att('q-alpha-1', true, 1), att('q-beta-1', true, 2)], questionById, 1);
    expect(r).toMatchObject({ score: 1000, passes: true });
  });
  it('maps fractions onto 100–1000', () => {
    expect(toScaledScore(0)).toBe(100);
    expect(toScaledScore(0.7)).toBe(730);
  });
});

describe('weak spots', () => {
  const attempts = [
    att('q-alpha-1', false, 1), att('q-alpha-1', true, 2),
    att('q-alpha-2', false, 3), att('q-alpha-3', false, 4), att('q-beta-1', true, 5),
  ];
  it('lists questions whose latest attempt was wrong, most recent first', () => {
    expect(missedQuestionIds(attempts)).toEqual(['q-alpha-3', 'q-alpha-2']);
  });
  it('ranks sub-skills from weakest', () => {
    expect(weakSubSkills(attempts, questionById)).toEqual(['a1', 'b1']);
  });
  it('picks missed questions first and never repeats', () => {
    const picked = pickWeakQuestions({ attempts, questions, questionById, count: 3, rng: mulberry32(3) });
    expect(picked.slice(0, 2).map((q) => q.id)).toEqual(['q-alpha-3', 'q-alpha-2']);
    expect(new Set(picked.map((q) => q.id)).size).toBe(3);
  });
  it('falls back to unseen questions when there is no history', () => {
    expect(pickWeakQuestions({ attempts: [], questions, questionById, count: 10, rng: mulberry32(3) })).toHaveLength(4);
  });
});

describe('pickQuizQuestions', () => {
  it('filters by domain and puts unseen questions first', () => {
    const picked = pickQuizQuestions({
      questions, attempts: [att('q-alpha-1', true, 1)], domainIds: ['alpha'], count: 10, rng: mulberry32(9),
    });
    expect(picked.map((q) => q.domainId)).toEqual(['alpha', 'alpha', 'alpha']);
    expect(picked[2].id).toBe('q-alpha-1');
  });
  it('uses every domain when none are selected', () => {
    expect(pickQuizQuestions({ questions, attempts: [], domainIds: [], count: 2, rng: mulberry32(9) })).toHaveLength(2);
  });
});
```

Run: `npx vitest run src/study/analytics.test.ts` — Expected: FAIL.

- [ ] **Step 2: Implement**

`src/study/accuracy.ts`:
```ts
import type { Question } from '../content/schema';
import type { Attempt } from './types';

export const RECENCY_DECAY = 0.9;

/** Accuracy where the newest attempt has weight 1, the next 0.9, then 0.81, … */
export function weightedAccuracy(attempts: Attempt[]): number | null {
  if (attempts.length === 0) return null;
  const newestFirst = [...attempts].sort((a, b) => b.at - a.at);
  let num = 0, den = 0;
  newestFirst.forEach((a, i) => {
    const w = RECENCY_DECAY ** i;
    den += w;
    if (a.correct) num += w;
  });
  return num / den;
}

export interface GroupStat { total: number; correct: number; accuracy: number | null }

export function accuracyBy(
  attempts: Attempt[],
  questionById: Map<string, Question>,
  key: 'domainId' | 'subSkillId',
): Map<string, GroupStat> {
  const groups = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const q = questionById.get(a.questionId);
    if (!q) continue;
    const list = groups.get(q[key]) ?? [];
    list.push(a);
    groups.set(q[key], list);
  }
  const out = new Map<string, GroupStat>();
  for (const [id, list] of groups) {
    out.set(id, { total: list.length, correct: list.filter((a) => a.correct).length, accuracy: weightedAccuracy(list) });
  }
  return out;
}
```

`src/study/readiness.ts`:
```ts
import type { Domain, Question } from '../content/schema';
import { accuracyBy } from './accuracy';
import type { Attempt } from './types';

export const PASS_SCORE = 720;
export const MIN_ANSWERS_FOR_ESTIMATE = 40;

export function toScaledScore(fraction: number): number {
  return Math.round(100 + 900 * fraction);
}

export type Readiness =
  | { available: false; answered: number; needed: number }
  | { available: true; answered: number; percent: number; score: number; passes: boolean };

export function readiness(
  domains: Domain[],
  attempts: Attempt[],
  questionById: Map<string, Question>,
  minAnswers = MIN_ANSWERS_FOR_ESTIMATE,
): Readiness {
  const answered = new Set(attempts.filter((a) => questionById.has(a.questionId)).map((a) => a.questionId)).size;
  if (answered < minAnswers) return { available: false, answered, needed: minAnswers };
  const byDomain = accuracyBy(attempts, questionById, 'domainId');
  const totalWeight = domains.reduce((s, d) => s + d.weight, 0);
  const fraction = domains.reduce((s, d) => s + (byDomain.get(d.id)?.accuracy ?? 0) * d.weight, 0) / totalWeight;
  const score = toScaledScore(fraction);
  return { available: true, answered, percent: Math.round(fraction * 100), score, passes: score >= PASS_SCORE };
}
```

`src/study/weakSpots.ts`:
```ts
import type { Question } from '../content/schema';
import { accuracyBy } from './accuracy';
import { shuffle } from './random';
import type { Attempt } from './types';

export const TODAY_QUESTION_COUNT = 10;

export function missedQuestionIds(attempts: Attempt[]): string[] {
  const latest = new Map<string, Attempt>();
  for (const a of attempts) {
    const prev = latest.get(a.questionId);
    if (!prev || a.at >= prev.at) latest.set(a.questionId, a);
  }
  return [...latest.values()].filter((a) => !a.correct).sort((a, b) => b.at - a.at).map((a) => a.questionId);
}

export function weakSubSkills(attempts: Attempt[], questionById: Map<string, Question>, limit = 3): string[] {
  return [...accuracyBy(attempts, questionById, 'subSkillId').entries()]
    .filter(([, s]) => s.accuracy !== null)
    .sort(([, a], [, b]) => a.accuracy! - b.accuracy! || a.total - b.total)
    .slice(0, limit)
    .map(([id]) => id);
}

export function pickWeakQuestions(args: {
  attempts: Attempt[];
  questions: Question[];
  questionById: Map<string, Question>;
  count: number;
  rng: () => number;
}): Question[] {
  const { attempts, questions, questionById, count, rng } = args;
  const picked: Question[] = [];
  const used = new Set<string>();
  const take = (q: Question) => {
    if (picked.length < count && !used.has(q.id)) {
      picked.push(q);
      used.add(q.id);
    }
  };
  for (const id of missedQuestionIds(attempts)) {
    const q = questionById.get(id);
    if (q) take(q);
  }
  const seen = new Set(attempts.map((a) => a.questionId));
  const weak = new Set(weakSubSkills(attempts, questionById));
  const inWeak = shuffle(questions.filter((q) => weak.has(q.subSkillId)), rng);
  [...inWeak.filter((q) => !seen.has(q.id)), ...inWeak.filter((q) => seen.has(q.id))].forEach(take);
  shuffle(questions.filter((q) => !seen.has(q.id)), rng).forEach(take);
  shuffle(questions, rng).forEach(take);
  return picked;
}
```

`src/study/quiz.ts`:
```ts
import type { Question } from '../content/schema';
import { shuffle } from './random';
import type { Attempt } from './types';

export const QUIZ_SIZE = 10;

export function pickQuizQuestions(args: {
  questions: Question[];
  attempts: Attempt[];
  domainIds: string[];
  count: number;
  rng: () => number;
}): Question[] {
  const { questions, attempts, domainIds, count, rng } = args;
  const pool = domainIds.length > 0 ? questions.filter((q) => domainIds.includes(q.domainId)) : questions;
  const seen = new Set(attempts.map((a) => a.questionId));
  return [
    ...shuffle(pool.filter((q) => !seen.has(q.id)), rng),
    ...shuffle(pool.filter((q) => seen.has(q.id)), rng),
  ].slice(0, count);
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/study`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/study
git commit -m "feat: accuracy, readiness estimate, weak spots and quiz picking" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 7: Mock exam assembly and scoring

**Files:**
- Create: `src/study/mockExam.ts`
- Test: `src/study/mockExam.test.ts`

**Interfaces:**
- Consumes: `Domain`, `Question`, `ChoiceId` (Task 2); `Attempt`, `MockSession` (Task 5); `shuffle`, `mulberry32` (Task 5); `toScaledScore`, `PASS_SCORE` (Task 6); `fixtureContent`, `manyQuestionsContent` (Task 2).
- Produces: `MOCK_QUESTION_COUNT = 53`; `MOCK_DURATION_MS = 7_200_000`; `allocate(domains: Pick<Domain, 'id' | 'weight'>[], total: number): Map<string, number>`; `buildMockExam(args: { id: string; domains: Domain[]; questions: Question[]; attempts: Attempt[]; rng: () => number; now: number }): MockSession`; `remainingMs(session: MockSession, now: number): number`; `interface MockResult { correct; total; percent; scaledScore; passes; byDomain: { domainId: string; correct: number; total: number }[] }`; `scoreMock(session, questionById, domains): MockResult`; `mockAttempts(session, questionById, at: number): Attempt[]`.

- [ ] **Step 1: Failing tests** — `src/study/mockExam.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import domainsJson from '../../content/domains.json';
import { fixtureContent, manyQuestionsContent } from '../content/fixtures';
import { allocate, buildMockExam, MOCK_DURATION_MS, mockAttempts, remainingMs, scoreMock } from './mockExam';
import { mulberry32 } from './random';
import type { Attempt, MockSession } from './types';

describe('allocate', () => {
  it('splits 53 questions across the real exam weights', () => {
    const alloc = allocate(domainsJson, 53);
    expect(Object.fromEntries(alloc)).toEqual({
      'apps-integration': 17, 'model-selection': 9, 'agents-workflows': 8, 'prompt-context': 6,
      'tools-mcp': 6, 'security-safety': 4, 'claude-code': 2, 'eval-testing': 1,
    });
  });
  it('gives every domain at least one question when possible', () => {
    const alloc = allocate([{ id: 'a', weight: 98 }, { id: 'b', weight: 1 }, { id: 'c', weight: 1 }], 10);
    expect(Object.fromEntries(alloc)).toEqual({ a: 8, b: 1, c: 1 });
  });
  it('never exceeds the total when there are more domains than questions', () => {
    const alloc = allocate([{ id: 'a', weight: 50 }, { id: 'b', weight: 30 }, { id: 'c', weight: 20 }], 2);
    expect([...alloc.values()].reduce((s, n) => s + n, 0)).toBe(2);
  });
});

describe('buildMockExam', () => {
  it('uses the whole bank when it is smaller than 53', () => {
    const c = fixtureContent();
    const s = buildMockExam({ id: 'm1', domains: c.domains, questions: c.questions, attempts: [], rng: mulberry32(1), now: 1000 });
    expect([...s.questionIds].sort()).toEqual(['q-alpha-1', 'q-alpha-2', 'q-alpha-3', 'q-beta-1']);
    expect(s).toMatchObject({ id: 'm1', startedAt: 1000, durationMs: MOCK_DURATION_MS, answers: {}, flagged: [], currentIndex: 0 });
  });

  it('builds 53 questions, refilling a short domain from the others, preferring unseen', () => {
    const c = manyQuestionsContent(60, 10);
    const attempts: Attempt[] = Array.from({ length: 20 }, (_, i) => ({
      questionId: `q-alpha-gen-${i}`, chosen: 'a', correct: true, mode: 'quiz', at: i,
    }));
    const s = buildMockExam({ id: 'm2', domains: c.domains, questions: c.questions, attempts, rng: mulberry32(2), now: 0 });
    expect(s.questionIds).toHaveLength(53);
    expect(new Set(s.questionIds).size).toBe(53);
    expect(s.questionIds.filter((id) => id.startsWith('q-beta')).length).toBe(10);
    for (let i = 20; i < 60; i++) expect(s.questionIds).toContain(`q-alpha-gen-${i}`);
  });
});

describe('timing and scoring', () => {
  const c = fixtureContent();
  const session: MockSession = {
    id: 'm3', startedAt: 0, durationMs: MOCK_DURATION_MS,
    questionIds: ['q-alpha-1', 'q-alpha-2', 'q-alpha-3', 'q-beta-1'],
    answers: { 'q-alpha-1': 'a', 'q-alpha-2': 'a', 'q-beta-1': 'a', 'q-alpha-3': 'c' },
    flagged: [], currentIndex: 3,
  };

  it('counts down and never goes negative', () => {
    expect(remainingMs(session, 60_000)).toBe(MOCK_DURATION_MS - 60_000);
    expect(remainingMs(session, MOCK_DURATION_MS * 2)).toBe(0);
  });

  it('scores overall and per domain; unanswered counts as wrong', () => {
    expect(scoreMock(session, c.questionById, c.domains)).toEqual({
      correct: 3, total: 4, percent: 75, scaledScore: 775, passes: true,
      byDomain: [{ domainId: 'alpha', correct: 2, total: 3 }, { domainId: 'beta', correct: 1, total: 1 }],
    });
    const blank = { ...session, answers: {} };
    expect(scoreMock(blank, c.questionById, c.domains)).toMatchObject({ correct: 0, scaledScore: 100, passes: false });
  });

  it('turns answered questions into mock attempts', () => {
    const partial = { ...session, answers: { 'q-alpha-1': 'a' as const, 'q-alpha-3': 'c' as const } };
    expect(mockAttempts(partial, c.questionById, 99)).toEqual([
      { questionId: 'q-alpha-1', chosen: 'a', correct: true, mode: 'mock', at: 99 },
      { questionId: 'q-alpha-3', chosen: 'c', correct: false, mode: 'mock', at: 99 },
    ]);
  });
});
```

Run: `npx vitest run src/study/mockExam.test.ts` — Expected: FAIL.

- [ ] **Step 2: Implement** — `src/study/mockExam.ts`:
```ts
import type { Domain, Question } from '../content/schema';
import { shuffle } from './random';
import { PASS_SCORE, toScaledScore } from './readiness';
import type { Attempt, MockSession } from './types';

export const MOCK_QUESTION_COUNT = 53;
export const MOCK_DURATION_MS = 120 * 60_000;

/** Largest-remainder allocation proportional to weight, then at least one per domain when total allows. */
export function allocate(domains: Pick<Domain, 'id' | 'weight'>[], total: number): Map<string, number> {
  const sumW = domains.reduce((s, d) => s + d.weight, 0);
  const rows = domains.map((d) => {
    const exact = (total * d.weight) / sumW;
    return { id: d.id, weight: d.weight, count: Math.floor(exact), rem: exact - Math.floor(exact) };
  });
  let left = total - rows.reduce((s, r) => s + r.count, 0);
  for (const r of [...rows].sort((a, b) => b.rem - a.rem || b.weight - a.weight)) {
    if (left <= 0) break;
    r.count++;
    left--;
  }
  if (total >= rows.length) {
    for (const r of rows) {
      if (r.count > 0) continue;
      const donor = rows.reduce((max, x) => (x.count > max.count ? x : max));
      donor.count--;
      r.count = 1;
    }
  }
  return new Map(rows.map((r) => [r.id, r.count]));
}

export function buildMockExam(args: {
  id: string;
  domains: Domain[];
  questions: Question[];
  attempts: Attempt[];
  rng: () => number;
  now: number;
}): MockSession {
  const { id, domains, questions, attempts, rng, now } = args;
  const total = Math.min(MOCK_QUESTION_COUNT, questions.length);
  const alloc = allocate(domains, total);
  const seen = new Set(attempts.map((a) => a.questionId));
  const pools = new Map(
    domains.map((d) => {
      const inDomain = questions.filter((q) => q.domainId === d.id);
      return [d.id, [...shuffle(inDomain.filter((q) => !seen.has(q.id)), rng), ...shuffle(inDomain.filter((q) => seen.has(q.id)), rng)]];
    }),
  );

  const picked: Question[] = [];
  let shortfall = 0;
  for (const d of domains) {
    const want = alloc.get(d.id) ?? 0;
    const taken = pools.get(d.id)!.splice(0, want);
    picked.push(...taken);
    shortfall += want - taken.length;
  }
  const byWeight = [...domains].sort((a, b) => b.weight - a.weight);
  while (shortfall > 0) {
    let progressed = false;
    for (const d of byWeight) {
      if (shortfall === 0) break;
      const q = pools.get(d.id)!.shift();
      if (q) {
        picked.push(q);
        shortfall--;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  return {
    id,
    startedAt: now,
    durationMs: MOCK_DURATION_MS,
    questionIds: shuffle(picked, rng).map((q) => q.id),
    answers: {},
    flagged: [],
    currentIndex: 0,
  };
}

export function remainingMs(session: MockSession, now: number): number {
  return Math.max(0, session.startedAt + session.durationMs - now);
}

export interface MockResult {
  correct: number;
  total: number;
  percent: number;
  scaledScore: number;
  passes: boolean;
  byDomain: { domainId: string; correct: number; total: number }[];
}

export function scoreMock(session: MockSession, questionById: Map<string, Question>, domains: Domain[]): MockResult {
  const tally = new Map(domains.map((d) => [d.id, { domainId: d.id, correct: 0, total: 0 }]));
  let correct = 0;
  for (const id of session.questionIds) {
    const q = questionById.get(id);
    if (!q) continue;
    const row = tally.get(q.domainId);
    const right = session.answers[id] === q.answer;
    if (row) {
      row.total++;
      if (right) row.correct++;
    }
    if (right) correct++;
  }
  const total = session.questionIds.length;
  const fraction = total === 0 ? 0 : correct / total;
  const scaledScore = toScaledScore(fraction);
  return {
    correct,
    total,
    percent: Math.round(fraction * 100),
    scaledScore,
    passes: scaledScore >= PASS_SCORE,
    byDomain: [...tally.values()].filter((r) => r.total > 0),
  };
}

export function mockAttempts(session: MockSession, questionById: Map<string, Question>, at: number): Attempt[] {
  return session.questionIds.flatMap((id) => {
    const q = questionById.get(id);
    const chosen = session.answers[id];
    return q && chosen ? [{ questionId: id, chosen, correct: chosen === q.answer, mode: 'mock' as const, at }] : [];
  });
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/study`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/study
git commit -m "feat: weighted 53-question mock exam assembly and scoring" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 8: IndexedDB storage and backup files

**Files:**
- Create: `src/storage/db.ts`, `src/storage/backup.ts`, `src/storage/share.ts`
- Test: `src/storage/storage.test.ts`

**Interfaces:**
- Consumes: types from Task 5; `newState`, `rate`, `localDay` (Task 5).
- Produces (`db.ts`): `interface BackupData { cardStates: StoredCardState[]; attempts: Attempt[]; mockSessions: MockSession[]; lessonsDone: LessonDone[]; flags: Flag[]; kv: { key: string; value: unknown }[] }`; `class AppDb` with `static open(name = 'ajada'): Promise<AppDb>`, `getCardStates(): Promise<StoredCardState[]>`, `putCardStates(states: StoredCardState[]): Promise<void>`, `addAttempts(list: Attempt[]): Promise<Attempt[]>` (returns attempts with ids), `getAttempts(): Promise<Attempt[]>`, `getMockSessions(): Promise<MockSession[]>`, `putMockSession(s: MockSession): Promise<void>`, `markLessonDone(lessonId: string, at: number): Promise<void>`, `getLessonsDone(): Promise<LessonDone[]>`, `putFlag(f: Flag): Promise<void>`, `deleteFlag(itemId: string): Promise<void>`, `getFlags(): Promise<Flag[]>`, `getKv<T>(key: string): Promise<T | undefined>`, `setKv(key: string, value: unknown): Promise<void>`, `exportAll(): Promise<BackupData>`, `replaceAll(data: BackupData): Promise<void>`, `close(): void`.
- Produces (`backup.ts`): `BACKUP_APP = 'ajada-learning'`, `BACKUP_VERSION = 1`, `class BackupError extends Error`, `serializeBackup(data: BackupData, exportedAt: Date): string`, `parseBackup(text: string): BackupData`, `backupFileName(d: Date): string` → `ajada-backup-YYYY-MM-DD.json`.
- Produces (`share.ts`): `shareOrDownload(text: string, fileName: string): Promise<void>`.

- [ ] **Step 1: Failing tests** — `src/storage/storage.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { newState, rate } from '../study/scheduler';
import type { BackupData } from './db';
import { AppDb } from './db';
import { BackupError, backupFileName, parseBackup, serializeBackup } from './backup';

let n = 0;
const openFresh = () => AppDb.open(`storage-test-${n++}`);
const T = new Date('2026-09-26T10:00:00');

async function seed(db: AppDb) {
  await db.putCardStates([rate(newState('c-a', 'forward', T), 'good', T)]);
  await db.addAttempts([{ questionId: 'q-a', chosen: 'b', correct: false, mode: 'quiz', at: 1 }]);
  await db.putMockSession({ id: 'm1', startedAt: 0, durationMs: 10, questionIds: ['q-a'], answers: { 'q-a': 'b' }, flagged: [], currentIndex: 0 });
  await db.markLessonDone('l-a', 5);
  await db.putFlag({ itemId: 'q-a', kind: 'question', at: 6 });
  await db.setKv('settings', { newCardsPerDay: 20, cardDirection: 'mixed' });
}

describe('AppDb', () => {
  it('stores and reads every kind of record', async () => {
    const db = await openFresh();
    await seed(db);
    expect((await db.getCardStates())[0].fsrs.due).toBeInstanceOf(Date);
    const [attempt] = await db.getAttempts();
    expect(attempt).toMatchObject({ questionId: 'q-a', correct: false });
    expect(typeof attempt.id).toBe('number');
    expect(await db.getMockSessions()).toHaveLength(1);
    expect(await db.getLessonsDone()).toEqual([{ lessonId: 'l-a', at: 5 }]);
    await db.deleteFlag('q-a');
    expect(await db.getFlags()).toEqual([]);
    expect(await db.getKv('settings')).toEqual({ newCardsPerDay: 20, cardDirection: 'mixed' });
    expect(await db.getKv('missing')).toBeUndefined();
    db.close();
  });

  it('round-trips a backup into a different database', async () => {
    const source = await openFresh();
    await seed(source);
    const exported = await source.exportAll();
    const text = serializeBackup(exported, T);
    const target = await openFresh();
    await target.addAttempts([{ questionId: 'q-old', chosen: 'a', correct: true, mode: 'quiz', at: 0 }]);
    await target.replaceAll(parseBackup(text));
    const restored: BackupData = await target.exportAll();
    expect(restored).toEqual(exported);
    expect(restored.cardStates[0].fsrs.due).toBeInstanceOf(Date);
    source.close();
    target.close();
  });
});

describe('parseBackup', () => {
  it('rejects non-JSON', () => {
    expect(() => parseBackup('nope')).toThrow(BackupError);
  });
  it('rejects files from another app or version', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'other', version: 1, exportedAt: '', data: {} }))).toThrow(/not an Ajada Learning backup/);
  });
  it('names files by local date', () => {
    expect(backupFileName(T)).toBe('ajada-backup-2026-09-26.json');
  });
});
```

Run: `npx vitest run src/storage` — Expected: FAIL.

- [ ] **Step 2: Implement the database** — `src/storage/db.ts`:
```ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Attempt, Flag, LessonDone, MockSession, StoredCardState } from '../study/types';

interface AjadaSchema extends DBSchema {
  cardStates: { key: string; value: StoredCardState };
  attempts: { key: number; value: Attempt; indexes: { byQuestion: string } };
  mockSessions: { key: string; value: MockSession };
  lessonsDone: { key: string; value: LessonDone };
  flags: { key: string; value: Flag };
  kv: { key: string; value: unknown };
}

const STORES = ['cardStates', 'attempts', 'mockSessions', 'lessonsDone', 'flags', 'kv'] as const;

export interface BackupData {
  cardStates: StoredCardState[];
  attempts: Attempt[];
  mockSessions: MockSession[];
  lessonsDone: LessonDone[];
  flags: Flag[];
  kv: { key: string; value: unknown }[];
}

export class AppDb {
  private constructor(private readonly db: IDBPDatabase<AjadaSchema>) {}

  static async open(name = 'ajada'): Promise<AppDb> {
    const db = await openDB<AjadaSchema>(name, 1, {
      upgrade(d) {
        d.createObjectStore('cardStates', { keyPath: 'key' });
        d.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true }).createIndex('byQuestion', 'questionId');
        d.createObjectStore('mockSessions', { keyPath: 'id' });
        d.createObjectStore('lessonsDone', { keyPath: 'lessonId' });
        d.createObjectStore('flags', { keyPath: 'itemId' });
        d.createObjectStore('kv');
      },
    });
    return new AppDb(db);
  }

  getCardStates() { return this.db.getAll('cardStates'); }

  async putCardStates(states: StoredCardState[]) {
    const tx = this.db.transaction('cardStates', 'readwrite');
    await Promise.all([...states.map((s) => tx.store.put(s)), tx.done]);
  }

  async addAttempts(list: Attempt[]): Promise<Attempt[]> {
    const tx = this.db.transaction('attempts', 'readwrite');
    const ids = await Promise.all(list.map(({ id: _drop, ...a }) => tx.store.add(a as Attempt)));
    await tx.done;
    return list.map((a, i) => ({ ...a, id: ids[i] }));
  }

  getAttempts() { return this.db.getAll('attempts'); }
  getMockSessions() { return this.db.getAll('mockSessions'); }
  async putMockSession(s: MockSession) { await this.db.put('mockSessions', s); }
  async markLessonDone(lessonId: string, at: number) { await this.db.put('lessonsDone', { lessonId, at }); }
  getLessonsDone() { return this.db.getAll('lessonsDone'); }
  async putFlag(f: Flag) { await this.db.put('flags', f); }
  async deleteFlag(itemId: string) { await this.db.delete('flags', itemId); }
  getFlags() { return this.db.getAll('flags'); }
  async getKv<T>(key: string): Promise<T | undefined> { return (await this.db.get('kv', key)) as T | undefined; }
  async setKv(key: string, value: unknown) { await this.db.put('kv', value, key); }

  async exportAll(): Promise<BackupData> {
    const [cardStates, attempts, mockSessions, lessonsDone, flags, kvKeys, kvValues] = await Promise.all([
      this.db.getAll('cardStates'), this.db.getAll('attempts'), this.db.getAll('mockSessions'),
      this.db.getAll('lessonsDone'), this.db.getAll('flags'), this.db.getAllKeys('kv'), this.db.getAll('kv'),
    ]);
    return { cardStates, attempts, mockSessions, lessonsDone, flags, kv: kvKeys.map((key, i) => ({ key, value: kvValues[i] })) };
  }

  async replaceAll(data: BackupData) {
    const tx = this.db.transaction([...STORES], 'readwrite');
    await Promise.all(STORES.map((s) => tx.objectStore(s).clear()));
    await Promise.all([
      ...data.cardStates.map((v) => tx.objectStore('cardStates').put(v)),
      ...data.attempts.map((v) => tx.objectStore('attempts').put(v)),
      ...data.mockSessions.map((v) => tx.objectStore('mockSessions').put(v)),
      ...data.lessonsDone.map((v) => tx.objectStore('lessonsDone').put(v)),
      ...data.flags.map((v) => tx.objectStore('flags').put(v)),
      ...data.kv.map(({ key, value }) => tx.objectStore('kv').put(value, key)),
    ]);
    await tx.done;
  }

  close() { this.db.close(); }
}
```

- [ ] **Step 3: Implement backup + share**

`src/storage/backup.ts`:
```ts
import { z } from 'zod';
import { localDay } from '../study/scheduler';
import type { BackupData } from './db';

export const BACKUP_APP = 'ajada-learning';
export const BACKUP_VERSION = 1;

export class BackupError extends Error {}

const FileSchema = z.object({
  app: z.string(),
  version: z.number(),
  exportedAt: z.string(),
  data: z.object({
    cardStates: z.array(z.looseObject({
      key: z.string(), cardId: z.string(), direction: z.enum(['forward', 'reverse']), introducedOn: z.string(),
      fsrs: z.looseObject({ due: z.string(), last_review: z.string().optional() }),
    })),
    attempts: z.array(z.looseObject({ questionId: z.string(), chosen: z.string(), correct: z.boolean(), at: z.number() })),
    mockSessions: z.array(z.looseObject({ id: z.string(), questionIds: z.array(z.string()) })),
    lessonsDone: z.array(z.looseObject({ lessonId: z.string(), at: z.number() })),
    flags: z.array(z.looseObject({ itemId: z.string(), kind: z.enum(['question', 'card']), at: z.number() })),
    kv: z.array(z.object({ key: z.string(), value: z.unknown() })),
  }),
});

export function serializeBackup(data: BackupData, exportedAt: Date): string {
  return JSON.stringify({ app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: exportedAt.toISOString(), data });
}

export function parseBackup(text: string): BackupData {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new BackupError('That file is not valid JSON.');
  }
  const head = json as { app?: unknown; version?: unknown };
  if (head?.app !== BACKUP_APP || head?.version !== BACKUP_VERSION) {
    throw new BackupError('That file is not an Ajada Learning backup (or is from a newer version).');
  }
  const parsed = FileSchema.safeParse(json);
  if (!parsed.success) throw new BackupError('That backup file is damaged or incomplete.');
  const data = parsed.data.data as unknown as BackupData;
  for (const s of data.cardStates) {
    const f = s.fsrs as unknown as { due: string | Date; last_review?: string | Date };
    f.due = new Date(f.due);
    if (f.last_review !== undefined) f.last_review = new Date(f.last_review);
  }
  return data;
}

export function backupFileName(d: Date): string {
  return `ajada-backup-${localDay(d)}.json`;
}
```

`src/storage/share.ts`:
```ts
/** Opens the iOS share sheet with the file when supported, otherwise downloads it. */
export async function shareOrDownload(text: string, fileName: string): Promise<void> {
  const file = new File([text], fileName, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: 'Ajada Learning backup' });
      return;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/storage`
Expected: PASS. (If `toEqual` on the round trip fails only on `fsrs.last_review` being absent vs `undefined`, that is acceptable data — adjust the reviver to skip setting the key when absent, which the code above already does.)

- [ ] **Step 5: Commit**

```bash
git add src/storage
git commit -m "feat: IndexedDB progress store with export/import backups" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---
### Task 9: App shell — providers, UI kit, tab bar, routing

**Files:**
- Create: `src/app/clock.tsx`, `src/app/ContentContext.tsx`, `src/app/ProgressProvider.tsx`, `src/ui/ui.css`, `src/ui/motion.ts`, `src/ui/icons.tsx`, `src/ui/Button.tsx`, `src/ui/Screen.tsx`, `src/ui/Sheet.tsx`, `src/ui/SegmentedControl.tsx`, `src/ui/TabBar.tsx`, `src/ui/Meter.tsx`, `src/ui/ProgressBar.tsx`, `src/ui/Disclosure.tsx`, `src/ui/inline.tsx`, `src/ui/Diagram.tsx`, `tests/renderWithApp.tsx`, and first versions of `src/features/today/TodayPage.tsx`, `src/features/learn/LearnPage.tsx`, `src/features/practice/PracticePage.tsx`, `src/features/cards/CardsPage.tsx`, `src/features/settings/SettingsPage.tsx` (later tasks replace each of these five files entirely)
- Modify (replace entirely): `src/app/App.tsx`, `src/main.tsx`, `src/app/App.test.tsx`
- Test: `src/app/App.test.tsx`, `src/app/ProgressProvider.test.tsx`, `src/ui/ui.test.tsx`

**Interfaces:**
- Consumes: `Content`, `Question`, `ChoiceId`, `Diagram` (Task 2); `content` (Task 4); study types, `resurface`, `stateKey` (Task 5); `mockAttempts` (Task 7); `AppDb`, `parseBackup`, `serializeBackup` (Task 8).
- Produces:
  - `ClockProvider({ now: () => Date, children })`, `useClock(): { now: () => Date }`, `useNow(intervalMs?: number): Date`.
  - `ContentProvider({ content, children })`, `useContent(): Content`.
  - `ProgressProvider({ db, children })` (renders nothing until loaded) and `useProgress(): ProgressApi` where `ProgressApi` = `{ attempts: Attempt[]; cardStates: Map<string, StoredCardState>; lessonsDone: Set<string>; flags: Map<string, Flag>; mockSessions: MockSession[]; settings: Settings; recordAnswer(q: Question, chosen: ChoiceId, mode: AttemptMode): Promise<void>; saveCardState(s: StoredCardState): Promise<void>; markLessonDone(lessonId: string): Promise<void>; toggleFlag(itemId: string, kind: Flag['kind']): Promise<void>; updateSettings(patch: Partial<Settings>): Promise<void>; saveMockSession(s: MockSession): Promise<void>; submitMock(s: MockSession): Promise<MockSession>; exportBackup(): Promise<string>; importBackup(text: string): Promise<void> }`.
  - UI kit: `spring`, `flipSpring`, `sheetSpring`, `pageTransition` (motion.ts); icons `IconHome, IconBook, IconPencil, IconCards, IconGear, IconClose, IconBack, IconFlag({ filled? }), IconClock, IconCheck, IconX, IconChevron`; `Button({ variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; block?: boolean; ...motion button props })`; `Screen({ title?, back?: string | true, action?, children, className? })`; `Sheet({ open, label, children })`; `SegmentedControl<T extends string>({ options: { value: T; label: string }[]; value: T; onChange(v: T): void; label: string })`; `TabBar()`; `Meter({ value: number | null; label: string })`; `ProgressBar({ value: number; label?: string })`; `Disclosure({ title, children })`; `renderInline(text: string): ReactNode`; `Paragraphs({ text })`; `DiagramView({ diagram })`.
  - `App({ db, content })`, `Shell()`; route table with paths `/`, `/learn`, `/practice`, `/cards`, `/settings` (later tasks add routes in the marked block).
  - Test helpers: `openTestDb(): Promise<AppDb>`, `renderWithApp(ui, { content?, db?, route?, path?, now? }): Promise<RenderResult & { db: AppDb; content: Content }>` (renders a `data-testid="location"` element whose text is `pathname + search`).

- [ ] **Step 1: Contexts**

`src/app/clock.tsx`:
```tsx
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
```

`src/app/ContentContext.tsx`:
```tsx
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
```

`src/app/ProgressProvider.tsx`:
```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ChoiceId, Question } from '../content/schema';
import { parseBackup, serializeBackup } from '../storage/backup';
import type { AppDb } from '../storage/db';
import { mockAttempts } from '../study/mockExam';
import { resurface, stateKey } from '../study/scheduler';
import {
  DEFAULT_SETTINGS,
  type Attempt, type AttemptMode, type Flag, type MockSession, type Settings, type StoredCardState,
} from '../study/types';
import { useClock } from './clock';
import { useContent } from './ContentContext';

export interface Progress {
  attempts: Attempt[];
  cardStates: Map<string, StoredCardState>;
  lessonsDone: Set<string>;
  flags: Map<string, Flag>;
  mockSessions: MockSession[];
  settings: Settings;
}

export interface ProgressApi extends Progress {
  recordAnswer(question: Question, chosen: ChoiceId, mode: AttemptMode): Promise<void>;
  saveCardState(state: StoredCardState): Promise<void>;
  markLessonDone(lessonId: string): Promise<void>;
  toggleFlag(itemId: string, kind: Flag['kind']): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  saveMockSession(session: MockSession): Promise<void>;
  submitMock(session: MockSession): Promise<MockSession>;
  exportBackup(): Promise<string>;
  importBackup(text: string): Promise<void>;
}

const SETTINGS_KEY = 'settings';
const ProgressContext = createContext<ProgressApi | null>(null);

export function useProgress(): ProgressApi {
  const p = useContext(ProgressContext);
  if (!p) throw new Error('useProgress must be used inside <ProgressProvider>');
  return p;
}

function withStates(map: Map<string, StoredCardState>, states: StoredCardState[]) {
  if (states.length === 0) return map;
  const next = new Map(map);
  for (const s of states) next.set(s.key, s);
  return next;
}

const upsert = (list: MockSession[], s: MockSession) => [...list.filter((x) => x.id !== s.id), s];

export function ProgressProvider({ db, children }: { db: AppDb; children: ReactNode }) {
  const { now } = useClock();
  const { questionById } = useContent();
  const [state, setState] = useState<Progress | null>(null);
  const ref = useRef(state);
  ref.current = state;

  const load = useCallback(async () => {
    const [attempts, cardStates, lessonsDone, flags, mockSessions, settings] = await Promise.all([
      db.getAttempts(), db.getCardStates(), db.getLessonsDone(), db.getFlags(), db.getMockSessions(), db.getKv<Settings>(SETTINGS_KEY),
    ]);
    setState({
      attempts,
      cardStates: new Map(cardStates.map((s) => [s.key, s])),
      lessonsDone: new Set(lessonsDone.map((l) => l.lessonId)),
      flags: new Map(flags.map((f) => [f.itemId, f])),
      mockSessions,
      settings: { ...DEFAULT_SETTINGS, ...settings },
    });
  }, [db]);

  useEffect(() => { void load(); }, [load]);

  const api = useMemo<ProgressApi | null>(() => {
    if (!state) return null;
    const current = () => ref.current!;
    const saveSettings = async (patch: Partial<Settings>) => {
      const settings = { ...current().settings, ...patch };
      await db.setKv(SETTINGS_KEY, settings);
      setState((p) => p && { ...p, settings });
    };
    return {
      ...state,
      async recordAnswer(question, chosen, mode) {
        const at = now();
        const [attempt] = await db.addAttempts([
          { questionId: question.id, chosen, correct: chosen === question.answer, mode, at: at.getTime() },
        ]);
        const resurfaced = attempt.correct
          ? []
          : question.relatedCardIds.flatMap((cardId) =>
              (['forward', 'reverse'] as const).flatMap((d) => {
                const s = current().cardStates.get(stateKey(cardId, d));
                return s ? [resurface(s, at)] : [];
              }),
            );
        if (resurfaced.length > 0) await db.putCardStates(resurfaced);
        setState((p) => p && { ...p, attempts: [...p.attempts, attempt], cardStates: withStates(p.cardStates, resurfaced) });
      },
      async saveCardState(s) {
        await db.putCardStates([s]);
        setState((p) => p && { ...p, cardStates: withStates(p.cardStates, [s]) });
      },
      async markLessonDone(lessonId) {
        await db.markLessonDone(lessonId, now().getTime());
        setState((p) => p && { ...p, lessonsDone: new Set(p.lessonsDone).add(lessonId) });
      },
      async toggleFlag(itemId, kind) {
        if (current().flags.has(itemId)) {
          await db.deleteFlag(itemId);
          setState((p) => {
            if (!p) return p;
            const flags = new Map(p.flags);
            flags.delete(itemId);
            return { ...p, flags };
          });
        } else {
          const flag: Flag = { itemId, kind, at: now().getTime() };
          await db.putFlag(flag);
          setState((p) => p && { ...p, flags: new Map(p.flags).set(itemId, flag) });
        }
      },
      updateSettings: saveSettings,
      async saveMockSession(session) {
        await db.putMockSession(session);
        setState((p) => p && { ...p, mockSessions: upsert(p.mockSessions, session) });
      },
      async submitMock(session) {
        const existing = current().mockSessions.find((s) => s.id === session.id);
        if (existing?.submittedAt) return existing;
        const at = now().getTime();
        const submitted: MockSession = { ...session, submittedAt: at };
        await db.putMockSession(submitted);
        const attempts = await db.addAttempts(mockAttempts(submitted, questionById, at));
        setState((p) => p && { ...p, mockSessions: upsert(p.mockSessions, submitted), attempts: [...p.attempts, ...attempts] });
        return submitted;
      },
      async exportBackup() {
        const text = serializeBackup(await db.exportAll(), now());
        await saveSettings({ lastBackupAt: now().getTime() });
        return text;
      },
      async importBackup(text) {
        await db.replaceAll(parseBackup(text));
        await load();
      },
    };
  }, [state, db, now, questionById, load]);

  if (!api) return null;
  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>;
}
```

- [ ] **Step 2: Test helper** — `tests/renderWithApp.tsx`:
```tsx
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
```

- [ ] **Step 3: Failing provider tests** — `src/app/ProgressProvider.test.tsx`:
```tsx
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { openTestDb } from '../../tests/renderWithApp';
import { fixtureContent } from '../content/fixtures';
import type { AppDb } from '../storage/db';
import { newState, rate } from '../study/scheduler';
import { DEFAULT_SETTINGS, type MockSession } from '../study/types';
import { ClockProvider } from './clock';
import { ContentProvider } from './ContentContext';
import { ProgressProvider, useProgress } from './ProgressProvider';

const NOW = new Date('2026-09-26T10:00:00');
const EARLIER = new Date('2026-09-01T10:00:00');

async function setup(existing?: AppDb) {
  const db = existing ?? (await openTestDb());
  const content = fixtureContent();
  const now = () => NOW;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ClockProvider now={now}>
      <ContentProvider content={content}>
        <ProgressProvider db={db}>{children}</ProgressProvider>
      </ContentProvider>
    </ClockProvider>
  );
  const hook = renderHook(() => useProgress(), { wrapper });
  await waitFor(() => expect(hook.result.current).toBeTruthy());
  return { ...hook, db, content };
}

describe('ProgressProvider', () => {
  it('loads defaults from an empty database', async () => {
    const { result } = await setup();
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.current.attempts).toEqual([]);
  });

  it('records a wrong answer and makes its related flashcards due now', async () => {
    const { result, db, content } = await setup();
    const learned = rate(newState('c-alpha-one', 'forward', EARLIER), 'easy', EARLIER);
    await act(() => result.current.saveCardState(learned));
    await act(() => result.current.recordAnswer(content.questionById.get('q-alpha-1')!, 'b', 'quiz'));
    expect(result.current.attempts).toMatchObject([{ questionId: 'q-alpha-1', correct: false, mode: 'quiz' }]);
    expect(result.current.cardStates.get('c-alpha-one:forward')!.fsrs.due.getTime()).toBe(NOW.getTime());
    expect(await db.getAttempts()).toHaveLength(1);
  });

  it('leaves flashcards alone after a right answer', async () => {
    const { result, content } = await setup();
    const learned = rate(newState('c-alpha-one', 'forward', EARLIER), 'easy', EARLIER);
    await act(() => result.current.saveCardState(learned));
    await act(() => result.current.recordAnswer(content.questionById.get('q-alpha-1')!, 'a', 'quiz'));
    expect(result.current.cardStates.get('c-alpha-one:forward')!.fsrs.due).toEqual(learned.fsrs.due);
  });

  it('persists settings, flags and lesson completion', async () => {
    const { result, db } = await setup();
    await act(() => result.current.updateSettings({ newCardsPerDay: 25 }));
    await act(() => result.current.toggleFlag('q-alpha-2', 'question'));
    await act(() => result.current.markLessonDone('l-alpha'));
    expect(result.current.settings.newCardsPerDay).toBe(25);
    expect(result.current.flags.has('q-alpha-2')).toBe(true);
    expect(result.current.lessonsDone.has('l-alpha')).toBe(true);
    expect(await db.getKv('settings')).toMatchObject({ newCardsPerDay: 25 });
    await act(() => result.current.toggleFlag('q-alpha-2', 'question'));
    expect(result.current.flags.has('q-alpha-2')).toBe(false);
  });

  it('submits a mock exam once and records its answers as attempts', async () => {
    const { result } = await setup();
    const session: MockSession = {
      id: 'm1', startedAt: 0, durationMs: 1000, questionIds: ['q-alpha-1', 'q-beta-1'],
      answers: { 'q-alpha-1': 'a' }, flagged: [], currentIndex: 1,
    };
    await act(() => result.current.saveMockSession(session));
    await act(async () => { await result.current.submitMock(session); });
    await act(async () => { await result.current.submitMock(session); });
    expect(result.current.mockSessions[0].submittedAt).toBe(NOW.getTime());
    expect(result.current.attempts).toMatchObject([{ questionId: 'q-alpha-1', correct: true, mode: 'mock' }]);
  });

  it('exports a backup and restores it on another device', async () => {
    const a = await setup();
    await act(() => a.result.current.recordAnswer(a.content.questionById.get('q-beta-1')!, 'a', 'quiz'));
    let text = '';
    await act(async () => { text = await a.result.current.exportBackup(); });
    expect(a.result.current.settings.lastBackupAt).toBe(NOW.getTime());
    const b = await setup();
    await act(() => b.result.current.importBackup(text));
    await waitFor(() => expect(b.result.current.attempts).toHaveLength(1));
  });
});
```

Run: `npx vitest run src/app/ProgressProvider.test.tsx` — Expected: FAIL until Step 1 files exist; after Step 1 they should PASS. (Write Step 1 after confirming the failure if you are following strict TDD order.)

- [ ] **Step 4: UI kit**

`src/ui/motion.ts`:
```ts
import type { Transition } from 'motion/react';

export const spring: Transition = { type: 'spring', stiffness: 380, damping: 32 };
export const flipSpring: Transition = { type: 'spring', stiffness: 260, damping: 18 };
export const sheetSpring: Transition = { type: 'spring', stiffness: 320, damping: 34 };
export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] },
} as const;
```

`src/ui/icons.tsx`:
```tsx
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
```

`src/ui/Button.tsx`:
```tsx
import { motion, type HTMLMotionProps } from 'motion/react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({ variant = 'primary', block = false, className, ...rest }: HTMLMotionProps<'button'> & { variant?: Variant; block?: boolean }) {
  const classes = ['btn', `btn-${variant}`, block ? 'btn-block' : '', className ?? ''].filter(Boolean).join(' ');
  return <motion.button type="button" whileTap={{ scale: 0.96 }} className={classes} {...rest} />;
}
```

`src/ui/Screen.tsx`:
```tsx
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBack } from './icons';
import { pageTransition } from './motion';

export function Screen({ title, back, action, children, className }: {
  title?: ReactNode;
  back?: string | true;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const navigate = useNavigate();
  return (
    <motion.main className={`screen ${className ?? ''}`} {...pageTransition}>
      {(title || back || action) && (
        <header className="screen-head">
          {back && (
            <button type="button" className="icon-btn" aria-label="Back" onClick={() => (back === true ? navigate(-1) : navigate(back))}>
              <IconBack />
            </button>
          )}
          {title && <h1>{title}</h1>}
          <div className="spacer" />
          {action}
        </header>
      )}
      {children}
    </motion.main>
  );
}
```

`src/ui/Sheet.tsx`:
```tsx
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { sheetSpring } from './motion';

export function Sheet({ open, label, children }: { open: boolean; label: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.section className="sheet" role="dialog" aria-label={label}
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={sheetSpring}>
          <div className="sheet-grip" aria-hidden="true" />
          {children}
        </motion.section>
      )}
    </AnimatePresence>
  );
}
```

`src/ui/SegmentedControl.tsx`:
```tsx
import { motion } from 'motion/react';
import { useId } from 'react';
import { spring } from './motion';

export function SegmentedControl<T extends string>({ options, value, onChange, label }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const id = useId();
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} className={`seg-opt ${on ? 'on' : ''}`} onClick={() => onChange(o.value)}>
            {on && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={spring} />}
            <span className="seg-label">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

`src/ui/TabBar.tsx`:
```tsx
import { motion } from 'motion/react';
import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { IconBook, IconCards, IconHome, IconPencil } from './icons';
import { spring } from './motion';

const TABS: { to: string; label: string; Icon: ComponentType; end?: boolean }[] = [
  { to: '/', label: 'Today', Icon: IconHome, end: true },
  { to: '/learn', label: 'Learn', Icon: IconBook },
  { to: '/practice', label: 'Practice', Icon: IconPencil },
  { to: '/cards', label: 'Cards', Icon: IconCards },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId="tab-pill" className="tab-pill" transition={spring} />}
              <Icon />
              <span className="tab-label">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
```

`src/ui/Meter.tsx`:
```tsx
import { motion } from 'motion/react';

export function Meter({ value, label }: { value: number | null; label: string }) {
  const pct = value === null ? 0 : Math.round(value * 100);
  const tone = value === null ? 'none' : value >= 0.75 ? 'good' : value >= 0.55 ? 'mid' : 'low';
  return (
    <div className="meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <motion.i className={`meter-fill tone-${tone}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }} />
    </div>
  );
}
```

`src/ui/ProgressBar.tsx`:
```tsx
import { motion } from 'motion/react';

export function ProgressBar({ value, label = 'Progress' }: { value: number; label?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <motion.i className="progress-fill" animate={{ width: `${pct}%` }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }} />
    </div>
  );
}
```

`src/ui/Disclosure.tsx`:
```tsx
import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { IconChevron } from './icons';

export function Disclosure({ title, children }: { title: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="disclosure">
      <button type="button" className="sheet-row" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span>{title}</span>
        <motion.span className="chev" animate={{ rotate: open ? 90 : 0 }}><IconChevron /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="disclosure-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

`src/ui/inline.tsx`:
```tsx
import { Fragment, type ReactNode } from 'react';

const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`)/g;

/** Renders the two inline marks content may use: **bold** and `code`. */
export function renderInline(text: string): ReactNode {
  return text.split(TOKEN).filter(Boolean).map((part, i) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

/** Paragraphs separated by blank lines; a block whose lines start with "- " becomes a list. */
export function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((block, i) =>
        block.startsWith('- ') ? (
          <ul key={i}>{block.split('\n').map((line, j) => <li key={j}>{renderInline(line.replace(/^- /, ''))}</li>)}</ul>
        ) : (
          <p key={i}>{renderInline(block)}</p>
        ),
      )}
    </>
  );
}
```

`src/ui/Diagram.tsx`:
```tsx
import type { Diagram } from '../content/schema';

export function DiagramView({ diagram }: { diagram: Diagram }) {
  return (
    <figure className="diagram">
      {diagram.kind === 'segmented-bar' ? (
        <div className="dg-bar">
          {diagram.segments.map((s, i) => (
            <div key={i} className={`dg-seg dg-${s.tone}`} style={{ flexGrow: s.weight }}>
              <strong>{s.label}</strong>
              {s.sublabel && <span>{s.sublabel}</span>}
            </div>
          ))}
        </div>
      ) : (
        <ol className="dg-flow">
          {diagram.steps.map((s, i) => (
            <li key={i} className="dg-step">
              <strong>{s.label}</strong>
              {s.sublabel && <span>{s.sublabel}</span>}
            </li>
          ))}
        </ol>
      )}
      {diagram.caption && <figcaption>{diagram.caption}</figcaption>}
    </figure>
  );
}
```

`src/ui/ui.css`:
```css
.app { min-height: 100%; display: flex; flex-direction: column; }
.screen {
  flex: 1; width: 100%; max-width: 640px; margin: 0 auto;
  padding: calc(var(--safe-top) + 12px) 16px calc(var(--tabbar-h) + var(--safe-bottom) + 24px);
}
.screen-head { display: flex; align-items: center; gap: 6px; min-height: 44px; margin: 4px 0 14px; }
.screen-head h1 { margin: 0; font-size: 26px; letter-spacing: -0.4px; }
.spacer { flex: 1; }
.icon-btn {
  width: 44px; height: 44px; display: inline-grid; place-items: center; flex: none;
  border: 0; border-radius: 12px; background: transparent; color: var(--muted); cursor: pointer; text-decoration: none;
}
.icon-btn:active { background: var(--surface); }
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 48px; padding: 12px 18px; border: 0; border-radius: var(--radius);
  font-weight: 700; font-size: 15px; cursor: pointer; text-decoration: none;
}
.btn + .btn { margin-top: 8px; }
.btn-primary { background: var(--accent); color: var(--on-accent); }
.btn-secondary { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
.btn-ghost { background: transparent; color: var(--accent-text); }
.btn-danger { background: var(--error-bg); color: var(--error-text); }
.btn-block { display: flex; width: 100%; }
.btn:disabled { opacity: 0.45; cursor: default; }
.panel { background: var(--surface); border: 1px solid var(--border-soft); border-radius: var(--radius); padding: 14px; margin: 10px 0; }
.panel h2, .panel h3 { margin: 0 0 6px; font-size: 16px; }
.panel.center { text-align: center; }
.panel-link { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; color: var(--text); text-decoration: none; cursor: pointer; }
.panel-link .grow { flex: 1; min-width: 0; }
.panel-link .chev { color: var(--faint); }
.muted { color: var(--muted); font-size: 13px; }
.big-num { font-size: 34px; font-weight: 800; color: var(--accent-text); letter-spacing: -0.5px; }
.tag { display: inline-block; font-size: 11px; padding: 3px 9px; border-radius: 10px; background: var(--accent-soft); color: var(--accent-text); }
.badge { display: inline-block; font-size: 10.5px; font-weight: 800; padding: 2px 7px; border-radius: 6px; background: var(--success-bg); color: var(--success-text); }
.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: flex; justify-content: space-around;
  padding: 6px 8px calc(var(--safe-bottom) + 6px); border-top: 1px solid var(--border-soft);
  background: rgba(18, 19, 24, 0.92); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
}
.tab {
  position: relative; isolation: isolate; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 6px 0; min-height: 48px; color: var(--faint); text-decoration: none; font-size: 10.5px; font-weight: 650;
}
.tab.active { color: var(--accent-text); }
.tab-pill { position: absolute; inset: 2px 14px; z-index: -1; border-radius: 12px; background: var(--accent-soft); }
.sheet {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; max-width: 640px; max-height: 62vh; margin: 0 auto; overflow-y: auto;
  padding: 8px 16px calc(var(--safe-bottom) + 16px); border-top: 1px solid var(--border); border-radius: 22px 22px 0 0;
  background: var(--surface-2); box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.5);
}
.sheet-grip { width: 38px; height: 5px; margin: 0 auto 10px; border-radius: 3px; background: var(--border); }
.sheet-row {
  display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 44px; padding: 10px 0;
  border: 0; border-top: 1px solid var(--border-soft); background: none; color: var(--text);
  font-weight: 600; font-size: 14px; text-align: left; text-decoration: none; cursor: pointer;
}
.chev { display: inline-grid; color: var(--faint); }
.disclosure-body { overflow: hidden; font-size: 14px; color: var(--text-2); }
.disclosure-body p { margin: 0 0 10px; }
.source { display: block; margin: 10px 0 12px; font-size: 12px; color: var(--accent-text); text-decoration: none; }
.seg { display: flex; padding: 3px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg); }
.seg-opt {
  position: relative; flex: 1; min-height: 36px; padding: 8px 4px; border: 0; border-radius: 9px;
  background: none; color: var(--muted); font-size: 12.5px; font-weight: 650; cursor: pointer;
}
.seg-opt.on { color: var(--on-accent); }
.seg-pill { position: absolute; inset: 0; border-radius: 9px; background: var(--accent); }
.seg-label { position: relative; }
.meter { height: 6px; overflow: hidden; border-radius: 4px; background: var(--border-soft); }
.progress { height: 4px; margin: 0 0 14px; overflow: hidden; border-radius: 3px; background: var(--border-soft); }
.meter-fill, .progress-fill { display: block; height: 100%; border-radius: 4px; background: var(--accent); }
.tone-good { background: var(--success); }
.tone-mid { background: var(--warning); }
.tone-low { background: var(--error); }
.tone-none { background: transparent; }
.domain-row { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; align-items: center; margin: 10px 0; font-size: 13px; }
.domain-row .meter { grid-column: 1 / -1; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  min-height: 34px; padding: 6px 12px; border: 1px solid var(--border); border-radius: 999px;
  background: var(--surface); color: var(--muted); font-size: 12.5px; font-weight: 650; cursor: pointer;
}
.chip.on { border-color: #3a3366; background: var(--accent-soft); color: var(--accent-text); }
.diagram { margin: 10px 0; }
.diagram figcaption { margin-top: 6px; font-size: 12px; color: var(--muted); }
.dg-bar { display: flex; gap: 4px; }
.dg-seg { flex-basis: 0; display: flex; flex-direction: column; padding: 9px 6px; border-radius: 8px; text-align: center; font-size: 11px; }
.dg-success { background: var(--success-bg); color: var(--success-text); }
.dg-error { background: var(--error-bg); color: var(--error-text); }
.dg-accent { background: var(--accent-soft); color: var(--accent-text); }
.dg-neutral { background: var(--border-soft); color: var(--text-2); }
.dg-flow { display: flex; flex-direction: column; gap: 14px; margin: 0; padding: 0; list-style: none; }
.dg-step { position: relative; display: flex; flex-direction: column; padding: 8px 10px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); font-size: 13px; }
.dg-step + .dg-step::before { content: '↓'; position: absolute; top: -15px; left: 50%; color: var(--faint); font-size: 11px; }
.dg-step span, .dg-seg span { font-size: 11px; color: var(--muted); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.empty { padding: 48px 16px; text-align: center; color: var(--muted); }
.big-emoji { font-size: 44px; }
.banner {
  display: flex; align-items: center; gap: 10px; margin: 8px 0; padding: 10px 12px; font-size: 13px;
  border: 1px solid #5c4a1f; border-radius: var(--radius); background: var(--warning-bg); color: #f3e3bf;
}
.banner .grow { flex: 1; }
.input, input[type='search'] {
  width: 100%; padding: 11px 12px; border: 1px solid var(--border); border-radius: 12px;
  background: var(--surface); color: var(--text); font-size: 16px;
}
.fatal { padding: 24px; white-space: pre-wrap; color: var(--error-text); }
```

- [ ] **Step 5: UI kit tests** — `src/ui/ui.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { DiagramView } from './Diagram';
import { Disclosure } from './Disclosure';
import { Paragraphs, renderInline } from './inline';
import { SegmentedControl } from './SegmentedControl';
import { Sheet } from './Sheet';

describe('renderInline', () => {
  it('renders **bold** and `code`', () => {
    render(<p>{renderInline('Use **cache** with `cache_control` now')}</p>);
    expect(screen.getByText('cache').tagName).toBe('STRONG');
    expect(screen.getByText('cache_control').tagName).toBe('CODE');
  });
  it('turns "- " blocks into lists', () => {
    render(<Paragraphs text={'Intro\n\n- one\n- two'} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('SegmentedControl', () => {
  function Harness() {
    const [v, setV] = useState<'x' | 'y'>('x');
    return <SegmentedControl label="Pick" value={v} onChange={setV} options={[{ value: 'x', label: 'Ex' }, { value: 'y', label: 'Why' }]} />;
  }
  it('checks the chosen option', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('radio', { name: 'Why' }));
    expect(screen.getByRole('radio', { name: 'Why' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Ex' })).toHaveAttribute('aria-checked', 'false');
  });
});

describe('Sheet and Disclosure', () => {
  it('shows sheet content only while open', () => {
    const { rerender } = render(<Sheet open={false} label="Info">Hello</Sheet>);
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(<Sheet open label="Info">Hello</Sheet>);
    expect(screen.getByRole('dialog', { name: 'Info' })).toHaveTextContent('Hello');
  });
  it('expands on tap', async () => {
    render(<Disclosure title="More">Hidden body</Disclosure>);
    expect(screen.queryByText('Hidden body')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /More/ }));
    expect(screen.getByText('Hidden body')).toBeInTheDocument();
  });
});

describe('DiagramView', () => {
  it('renders flow steps and captions', () => {
    render(<DiagramView diagram={{ kind: 'flow', caption: 'Cap', steps: [{ label: 'A' }, { label: 'B', sublabel: 'b' }] }} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Cap')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: First-version tab screens** (each file is replaced in a later task)

`src/features/today/TodayPage.tsx`:
```tsx
import { Screen } from '../../ui/Screen';

export function TodayPage() {
  return <Screen title="Today"><p className="muted">Your daily plan appears here.</p></Screen>;
}
```
`src/features/learn/LearnPage.tsx`:
```tsx
import { Screen } from '../../ui/Screen';

export function LearnPage() {
  return <Screen title="Learn"><p className="muted">Lessons for each exam domain.</p></Screen>;
}
```
`src/features/practice/PracticePage.tsx`:
```tsx
import { Screen } from '../../ui/Screen';

export function PracticePage() {
  return <Screen title="Practice"><p className="muted">Quizzes and mock exams.</p></Screen>;
}
```
`src/features/cards/CardsPage.tsx`:
```tsx
import { Screen } from '../../ui/Screen';

export function CardsPage() {
  return <Screen title="Flashcards"><p className="muted">Spaced-repetition review.</p></Screen>;
}
```
`src/features/settings/SettingsPage.tsx`:
```tsx
import { Screen } from '../../ui/Screen';

export function SettingsPage() {
  return <Screen title="Settings" back="/"><p className="muted">Settings.</p></Screen>;
}
```

- [ ] **Step 7: App, routes, boot**

`src/app/App.tsx` (replace):
```tsx
import { AnimatePresence, MotionConfig } from 'motion/react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { Content } from '../content/schema';
import { CardsPage } from '../features/cards/CardsPage';
import { LearnPage } from '../features/learn/LearnPage';
import { PracticePage } from '../features/practice/PracticePage';
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
```

`src/main.tsx` (replace):
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/tokens.css';
import './ui/ui.css';
import { App } from './app/App';
import { content } from './content';
import { AppDb } from './storage/db';

const root = createRoot(document.getElementById('root')!);

void navigator.storage?.persist?.();

AppDb.open()
  .then((db) =>
    root.render(
      <StrictMode>
        <App db={db} content={content} />
      </StrictMode>,
    ),
  )
  .catch((err: unknown) => {
    root.render(<pre className="fatal">Ajada could not open its storage on this device.{'\n'}{String(err)}</pre>);
  });
```

`src/app/App.test.tsx` (replace):
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { openTestDb } from '../../tests/renderWithApp';
import { fixtureContent } from '../content/fixtures';
import { App } from './App';

describe('App shell', () => {
  it('opens on Today and switches tabs', async () => {
    window.location.hash = '#/';
    render(<App db={await openTestDb()} content={fixtureContent()} />);
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Cards' }));
    expect(await screen.findByRole('heading', { name: 'Flashcards' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Learn' }));
    expect(await screen.findByRole('heading', { name: 'Learn' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run everything**

Run: `npm test && npm run typecheck`
Expected: all tests pass, no type errors.

- [ ] **Step 9: Visual check**

Run: `npm run dev`, open the printed URL (append `#/`) in a browser with a phone-sized viewport (Chrome DevTools → iPhone 14). Confirm: near-black background, bottom tab bar with 4 icons, violet pill slides between tabs, pages fade/slide in. Stop the dev server.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: app shell with providers, dark UI kit and tab navigation" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 10: Question view, verdict sheet, question runner

Implements the approved "Verdict sheet" design (`docs/superpowers/mockups/explanation-style-v2.html`): choices annotate in place with a reason on **every** choice, always visible after answering; a bottom sheet shows the verdict, one-line takeaway, optional diagram, collapsible memory tip and related flashcards, lesson link, source and Continue.

**Files:**
- Create: `src/features/shared/FlagButton.tsx`, `src/features/practice/QuestionView.tsx`, `src/features/practice/VerdictSheet.tsx`, `src/features/practice/QuestionRunner.tsx`, `src/features/practice/SessionSummary.tsx`, `src/features/practice/practice.css`
- Test: `src/features/practice/question.test.tsx`

**Interfaces:**
- Consumes: `useContent`, `useProgress` (Task 9); UI kit (Task 9); `Question`, `ChoiceId`, `Card` (Task 2); `AttemptMode` (Task 5).
- Produces: `FlagButton({ itemId: string; kind: 'question' | 'card' })`; `type QuestionMode = 'answer' | 'exam' | 'review'`; `QuestionView({ question, chosen: ChoiceId | null, onChoose?: (id: ChoiceId) => void, mode: QuestionMode, showReportFlag?: boolean })`; `VerdictSheet({ question, chosen: ChoiceId | null, open: boolean, onContinue(): void, continueLabel?: string })`; `interface RunSummary { correct: number; total: number }`; `QuestionRunner({ questions: Question[]; mode: AttemptMode; title: string; onFinish(s: RunSummary): void; onExit(): void })`; `SessionSummary({ summary: RunSummary; extra?: string; onDone(): void; doneLabel?: string })`.

- [ ] **Step 1: Failing tests** — `src/features/practice/question.test.tsx`:
```tsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithApp } from '../../../tests/renderWithApp';
import { fixtureContent } from '../../content/fixtures';
import { QuestionRunner } from './QuestionRunner';
import { QuestionView } from './QuestionView';
import { VerdictSheet } from './VerdictSheet';

const content = fixtureContent();
const q1 = content.questionById.get('q-alpha-1')!;
const choice = (text: RegExp) => screen.getByRole('button', { name: text });

describe('QuestionView', () => {
  it('shows plain choices until one is chosen', async () => {
    const onChoose = vi.fn();
    await renderWithApp(<QuestionView question={q1} chosen={null} onChoose={onChoose} mode="answer" />);
    await userEvent.click(await screen.findByRole('button', { name: /Wrong one q-alpha-1/ }));
    expect(onChoose).toHaveBeenCalledWith('b');
    expect(screen.queryByText('Why a is right for q-alpha-1')).toBeNull();
  });

  it('after answering, marks right and wrong and shows every reason', async () => {
    await renderWithApp(<QuestionView question={q1} chosen="b" mode="answer" />);
    await screen.findByText('Why a is right for q-alpha-1');
    for (const r of ['Why b is wrong', 'Why c is wrong', 'Why d is wrong']) expect(screen.getByText(`${r} for q-alpha-1`)).toBeInTheDocument();
    expect(choice(/Right answer q-alpha-1/)).toHaveClass('choice-correct');
    expect(choice(/Wrong one q-alpha-1/)).toHaveClass('choice-wrong');
    expect(choice(/Wrong one q-alpha-1/)).toHaveTextContent('your answer');
    expect(choice(/Wrong two q-alpha-1/)).toHaveClass('choice-muted');
    expect(choice(/Right answer q-alpha-1/)).toBeDisabled();
  });

  it('in exam mode highlights the selection and hides reasons', async () => {
    await renderWithApp(<QuestionView question={q1} chosen="c" onChoose={() => {}} mode="exam" />);
    expect(await screen.findByRole('button', { name: /Wrong two q-alpha-1/ })).toHaveClass('choice-selected');
    expect(choice(/Right answer q-alpha-1/)).not.toBeDisabled();
    expect(screen.queryByText('Why a is right for q-alpha-1')).toBeNull();
  });

  it('in review mode reveals the answer even when unanswered', async () => {
    await renderWithApp(<QuestionView question={q1} chosen={null} mode="review" />);
    expect(await screen.findByText('Why a is right for q-alpha-1')).toBeInTheDocument();
    expect(choice(/Right answer q-alpha-1/)).toHaveClass('choice-correct');
  });
});

describe('VerdictSheet', () => {
  it('explains a wrong answer with takeaway, diagram, memory tip, related cards, lesson and source', async () => {
    const onContinue = vi.fn();
    await renderWithApp(<VerdictSheet question={q1} chosen="b" open onContinue={onContinue} />);
    expect(await screen.findByText(/Not quite\. The answer is A\./)).toBeInTheDocument();
    expect(screen.getByText('Takeaway q-alpha-1')).toBeInTheDocument();
    expect(screen.getByText('Step one')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Remember it/ }));
    expect(screen.getByText('Remember alpha')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /1 related flashcard/ }));
    expect(screen.getByText('Alpha term')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Read the lesson/ })).toHaveAttribute('href', '/learn/lesson/l-alpha');
    expect(screen.getByRole('link', { name: /Source: Example doc/ })).toHaveAttribute('href', 'https://example.com/docs');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onContinue).toHaveBeenCalled();
  });

  it('celebrates a right answer', async () => {
    await renderWithApp(<VerdictSheet question={q1} chosen="a" open onContinue={() => {}} />);
    expect(await screen.findByText('Correct!')).toBeInTheDocument();
  });
});

describe('QuestionRunner', () => {
  it('runs through questions, records attempts and reports a summary', async () => {
    const onFinish = vi.fn();
    const { db } = await renderWithApp(
      <QuestionRunner questions={[q1, content.questionById.get('q-beta-1')!]} mode="quiz" title="Quiz" onFinish={onFinish} onExit={() => {}} />,
    );
    expect(await screen.findByText('Quiz · 1 / 2')).toBeInTheDocument();
    await userEvent.click(choice(/Right answer q-alpha-1/));
    await userEvent.click(await screen.findByRole('button', { name: 'Continue' }));
    await userEvent.click(await screen.findByRole('button', { name: /Wrong one q-beta-1/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Finish' }));
    expect(onFinish).toHaveBeenCalledWith({ correct: 1, total: 2 });
    await waitFor(async () => expect(await db.getAttempts()).toHaveLength(2));
  });
});
```

Run: `npx vitest run src/features/practice` — Expected: FAIL (modules missing).

- [ ] **Step 2: Implement**

`src/features/shared/FlagButton.tsx`:
```tsx
import { useProgress } from '../../app/ProgressProvider';
import { IconFlag } from '../../ui/icons';

export function FlagButton({ itemId, kind }: { itemId: string; kind: 'question' | 'card' }) {
  const { flags, toggleFlag } = useProgress();
  const on = flags.has(itemId);
  return (
    <button type="button" className={`icon-btn flag ${on ? 'on' : ''}`} aria-pressed={on}
      aria-label={on ? 'Flagged as wrong or outdated (tap to unflag)' : 'Flag as wrong or outdated'}
      onClick={(e) => { e.stopPropagation(); void toggleFlag(itemId, kind); }}>
      <IconFlag filled={on} />
    </button>
  );
}
```

`src/features/practice/QuestionView.tsx`:
```tsx
import { AnimatePresence, motion } from 'motion/react';
import { useContent } from '../../app/ContentContext';
import type { ChoiceId, Question } from '../../content/schema';
import { IconCheck, IconX } from '../../ui/icons';
import { renderInline } from '../../ui/inline';
import { FlagButton } from '../shared/FlagButton';
import './practice.css';

/** answer: pick once, then annotated · exam: pick/change freely, no feedback · review: read-only, annotated */
export type QuestionMode = 'answer' | 'exam' | 'review';

export function QuestionView({ question, chosen, onChoose, mode, showReportFlag = true }: {
  question: Question;
  chosen: ChoiceId | null;
  onChoose?: (id: ChoiceId) => void;
  mode: QuestionMode;
  showReportFlag?: boolean;
}) {
  const { domainById } = useContent();
  const annotated = mode === 'review' || (mode === 'answer' && chosen !== null);
  const locked = annotated || !onChoose;
  return (
    <article className="qv">
      <div className="qv-top">
        <span className="tag">{domainById.get(question.domainId)?.name}</span>
        {showReportFlag && <FlagButton itemId={question.id} kind="question" />}
      </div>
      <h2 className="qv-stem">{renderInline(question.stem)}</h2>
      <ol className="qv-choices">
        {question.choices.map((c, i) => {
          const isAnswer = c.id === question.answer;
          const isChosen = c.id === chosen;
          const state = !annotated ? (isChosen ? 'selected' : 'idle') : isAnswer ? 'correct' : isChosen ? 'wrong' : 'muted';
          return (
            <li key={c.id}>
              <button type="button" className={`choice choice-${state}`} disabled={locked} aria-pressed={isChosen}
                onClick={() => onChoose?.(c.id)}>
                <span className="choice-letter" aria-hidden="true">
                  {state === 'correct' ? <IconCheck /> : state === 'wrong' ? <IconX /> : c.id.toUpperCase()}
                </span>
                <span className="choice-body">
                  <span className="sr-only">{state === 'correct' ? 'Correct answer: ' : state === 'wrong' ? 'Incorrect: ' : ''}</span>
                  <span className="choice-text">
                    {renderInline(c.text)}
                    {annotated && isChosen && <em className="choice-yours"> · your answer</em>}
                  </span>
                  <AnimatePresence>
                    {annotated && (
                      <motion.span className="choice-reason" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        transition={{ delay: 0.05 * i, duration: 0.25 }}>
                        {renderInline(c.reason)}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </article>
  );
}
```

`src/features/practice/VerdictSheet.tsx`:
```tsx
import { Link } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import type { Card, ChoiceId, Question } from '../../content/schema';
import { Button } from '../../ui/Button';
import { DiagramView } from '../../ui/Diagram';
import { Disclosure } from '../../ui/Disclosure';
import { IconCheck, IconChevron, IconX } from '../../ui/icons';
import { renderInline } from '../../ui/inline';
import { Sheet } from '../../ui/Sheet';

export function VerdictSheet({ question, chosen, open, onContinue, continueLabel = 'Continue' }: {
  question: Question;
  chosen: ChoiceId | null;
  open: boolean;
  onContinue: () => void;
  continueLabel?: string;
}) {
  const { cardById } = useContent();
  const correct = chosen === question.answer;
  const related = question.relatedCardIds.map((id) => cardById.get(id)).filter((c): c is Card => Boolean(c));
  return (
    <Sheet open={open} label="Answer explanation">
      <div className={`verdict ${correct ? 'ok' : 'bad'}`}>
        <p className="verdict-line">
          {correct ? <><IconCheck /> Correct!</> : <><IconX /> Not quite. The answer is {question.answer.toUpperCase()}.</>}
        </p>
        <div className="takeaway"><strong>💡 In one line:</strong> {renderInline(question.takeaway)}</div>
        {question.diagram && <DiagramView diagram={question.diagram} />}
        {question.mnemonic && (
          <Disclosure title="🧠 Remember it"><p>{renderInline(question.mnemonic)}</p></Disclosure>
        )}
        {related.length > 0 && (
          <Disclosure title={`🃏 ${related.length} related flashcard${related.length === 1 ? '' : 's'}`}>
            <ul className="related">
              {related.map((c) => <li key={c.id}><strong>{c.term}</strong>: {renderInline(c.definition)}</li>)}
            </ul>
          </Disclosure>
        )}
        {question.lessonId && (
          <Link className="sheet-row" to={`/learn/lesson/${question.lessonId}`}>
            <span>📖 Read the lesson</span><span className="chev"><IconChevron /></span>
          </Link>
        )}
        <a className="source" href={question.source.url} target="_blank" rel="noreferrer">📎 Source: {question.source.title}</a>
        <Button block onClick={onContinue}>{continueLabel}</Button>
      </div>
    </Sheet>
  );
}
```

`src/features/practice/QuestionRunner.tsx`:
```tsx
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useProgress } from '../../app/ProgressProvider';
import type { ChoiceId, Question } from '../../content/schema';
import type { AttemptMode } from '../../study/types';
import { Button } from '../../ui/Button';
import { IconClose } from '../../ui/icons';
import { ProgressBar } from '../../ui/ProgressBar';
import { QuestionView } from './QuestionView';
import { VerdictSheet } from './VerdictSheet';

export interface RunSummary { correct: number; total: number }

export function QuestionRunner({ questions, mode, title, onFinish, onExit }: {
  questions: Question[];
  mode: AttemptMode;
  title: string;
  onFinish: (summary: RunSummary) => void;
  onExit: () => void;
}) {
  const { recordAnswer } = useProgress();
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<ChoiceId | null>(null);
  const [correct, setCorrect] = useState(0);
  const question = questions[index];

  if (!question) {
    return (
      <div className="runner">
        <div className="empty">
          <div className="big-emoji">📭</div>
          <p>No questions available here yet.</p>
          <Button onClick={onExit}>Back</Button>
        </div>
      </div>
    );
  }

  const isLast = index + 1 >= questions.length;
  const choose = (id: ChoiceId) => {
    if (chosen) return;
    setChosen(id);
    if (id === question.answer) setCorrect((c) => c + 1);
    void recordAnswer(question, id, mode);
  };
  const next = () => {
    if (isLast) {
      onFinish({ correct, total: questions.length });
      return;
    }
    setIndex((i) => i + 1);
    setChosen(null);
  };

  return (
    <div className={`runner ${chosen ? 'has-sheet' : ''}`}>
      <header className="runner-head">
        <button type="button" className="icon-btn" aria-label="Close" onClick={onExit}><IconClose /></button>
        <span className="runner-count">{title} · {index + 1} / {questions.length}</span>
        <span className="icon-btn-spacer" />
      </header>
      <ProgressBar value={(index + (chosen ? 1 : 0)) / questions.length} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={question.id} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}>
          <QuestionView question={question} chosen={chosen} onChoose={choose} mode="answer" />
        </motion.div>
      </AnimatePresence>
      <VerdictSheet question={question} chosen={chosen} open={chosen !== null} onContinue={next} continueLabel={isLast ? 'Finish' : 'Continue'} />
    </div>
  );
}
```

`src/features/practice/SessionSummary.tsx`:
```tsx
import { motion } from 'motion/react';
import { Button } from '../../ui/Button';
import type { RunSummary } from './QuestionRunner';

export function SessionSummary({ summary, extra, onDone, doneLabel = 'Done' }: {
  summary: RunSummary;
  extra?: string;
  onDone: () => void;
  doneLabel?: string;
}) {
  const ratio = summary.total === 0 ? 0 : summary.correct / summary.total;
  const [emoji, message] = ratio >= 0.8 ? ['🎉', 'Excellent work.'] : ratio >= 0.6 ? ['💪', 'Solid, keep going.'] : ['🌱', 'Every miss is now on your review list.'];
  return (
    <motion.div className="summary" initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
      <div className="big-emoji" aria-hidden="true">{emoji}</div>
      <div className="score">{summary.correct} / {summary.total}</div>
      <p>{message}</p>
      {extra && <p className="muted">{extra}</p>}
      <Button block onClick={onDone}>{doneLabel}</Button>
    </motion.div>
  );
}
```

`src/features/practice/practice.css`:
```css
.runner { flex: 1; width: 100%; max-width: 640px; margin: 0 auto; padding: calc(var(--safe-top) + 6px) 16px 32px; }
.runner.has-sheet { padding-bottom: 64vh; }
.runner-head { display: flex; align-items: center; justify-content: space-between; min-height: 44px; }
.runner-count { font-size: 13px; font-weight: 650; color: var(--muted); }
.icon-btn-spacer { width: 44px; }
.qv-top { display: flex; align-items: center; justify-content: space-between; min-height: 44px; }
.qv-stem { margin: 6px 0 14px; font-size: 17px; line-height: 1.45; font-weight: 650; letter-spacing: -0.1px; }
.qv-choices { display: flex; flex-direction: column; gap: 9px; margin: 0; padding: 0; list-style: none; }
.choice {
  display: flex; gap: 11px; width: 100%; min-height: 52px; padding: 12px; text-align: left; cursor: pointer;
  border: 1.5px solid var(--border); border-radius: var(--radius); background: var(--surface); color: var(--text); font-size: 14.5px;
  transition: border-color 0.2s, background 0.2s, opacity 0.2s, transform 0.1s;
}
.choice:not(:disabled):active { transform: scale(0.985); }
.choice:disabled { cursor: default; color: var(--text); }
.choice-letter {
  flex: none; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px;
  background: var(--border-soft); color: var(--muted); font-size: 12px; font-weight: 800;
}
.choice-letter svg { width: 16px; height: 16px; }
.choice-body { display: flex; flex: 1; flex-direction: column; gap: 5px; }
.choice-reason { display: block; overflow: hidden; font-size: 13px; color: var(--text-2); }
.choice-yours { font-size: 12.5px; color: var(--muted); }
.choice-selected { border-color: var(--accent); background: var(--accent-soft); }
.choice-selected .choice-letter { background: var(--accent); color: var(--on-accent); }
.choice-correct { border-color: var(--success); background: var(--success-bg); }
.choice-correct .choice-letter { background: var(--success); color: var(--bg); }
.choice-wrong { border-color: var(--error); background: var(--error-bg); }
.choice-wrong .choice-letter { background: var(--error); color: var(--bg); }
.choice-muted { opacity: 0.8; }
.verdict-line { display: flex; align-items: center; gap: 8px; margin: 2px 0 10px; font-size: 17px; font-weight: 800; }
.verdict.ok .verdict-line { color: var(--success-text); }
.verdict.bad .verdict-line { color: var(--error-text); }
.takeaway { margin-bottom: 8px; padding: 11px 12px; border-left: 3px solid var(--accent); border-radius: 10px; background: #211d3a; font-size: 14px; }
.related { margin: 0 0 8px; padding-left: 18px; }
.related li { margin: 6px 0; }
.summary { display: flex; flex-direction: column; gap: 12px; max-width: 480px; margin: 0 auto; padding: calc(var(--safe-top) + 64px) 24px 24px; text-align: center; }
.summary .score { font-size: 44px; font-weight: 800; color: var(--accent-text); }
.flag.on { color: var(--warning); }
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/features/practice`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: annotated question view and verdict sheet explanations" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 11: Practice tab — quick quiz and weak spots

**Files:**
- Modify (replace entirely): `src/features/practice/PracticePage.tsx`
- Create: `src/features/practice/QuizPage.tsx`, `src/features/practice/WeakSpotsPage.tsx`
- Modify: `src/app/App.tsx` (routes)
- Test: `src/features/practice/practicePages.test.tsx`

**Interfaces:**
- Consumes: `pickQuizQuestions`, `QUIZ_SIZE` (Task 6); `pickWeakQuestions`, `missedQuestionIds`, `TODAY_QUESTION_COUNT` (Task 6); `QuestionRunner`, `SessionSummary`, `RunSummary` (Task 10).
- Produces: routes `/practice/quiz?d=<domainId,…>` → `QuizPage`, `/practice/weak` → `WeakSpotsPage`; Practice tab links to `/practice/mock` and `/practice/history` (built in Task 14).

- [ ] **Step 1: Failing tests** — `src/features/practice/practicePages.test.tsx`:
```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithApp } from '../../../tests/renderWithApp';
import { PracticePage } from './PracticePage';
import { QuizPage } from './QuizPage';
import { WeakSpotsPage } from './WeakSpotsPage';

describe('PracticePage', () => {
  it('starts a quick quiz limited to the selected domains', async () => {
    await renderWithApp(<PracticePage />, { route: '/practice', path: '/practice' });
    await userEvent.click(await screen.findByRole('button', { name: 'Beta' }));
    await userEvent.click(screen.getByRole('button', { name: /Quick quiz/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/practice/quiz?d=alpha');
  });
  it('links to weak spots, mock exam and history', async () => {
    await renderWithApp(<PracticePage />, { route: '/practice', path: '/practice' });
    expect(await screen.findByRole('link', { name: /Weak spots/ })).toHaveAttribute('href', '/practice/weak');
    expect(screen.getByRole('link', { name: /Mock exam/ })).toHaveAttribute('href', '/practice/mock');
    expect(screen.getByRole('link', { name: /History/ })).toHaveAttribute('href', '/practice/history');
  });
});

describe('QuizPage', () => {
  it('runs a quiz for the chosen domain and shows a summary', async () => {
    await renderWithApp(<QuizPage />, { route: '/practice/quiz?d=beta', path: '/practice/quiz' });
    expect(await screen.findByText('Stem for q-beta-1?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Right answer q-beta-1/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Finish' }));
    expect(await screen.findByText('1 / 1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/practice');
  });
});

describe('WeakSpotsPage', () => {
  it('serves questions even with no history', async () => {
    await renderWithApp(<WeakSpotsPage />, { route: '/practice/weak', path: '/practice/weak' });
    expect(await screen.findByText(/Weak spots · 1 \/ 4/)).toBeInTheDocument();
  });
});
```

Run: `npx vitest run src/features/practice/practicePages.test.tsx` — Expected: FAIL.

- [ ] **Step 2: Implement**

`src/features/practice/PracticePage.tsx` (replace):
```tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { missedQuestionIds } from '../../study/weakSpots';
import { IconChevron, IconClock } from '../../ui/icons';
import { Screen } from '../../ui/Screen';
import './practice.css';

export function PracticePage() {
  const navigate = useNavigate();
  const { domains } = useContent();
  const { attempts, mockSessions } = useProgress();
  const [selected, setSelected] = useState<string[]>(() => domains.map((d) => d.id));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const missed = missedQuestionIds(attempts).length;
  const mocksDone = mockSessions.filter((s) => s.submittedAt).length;

  return (
    <Screen title="Practice">
      <section className="panel">
        <button type="button" className="panel-link" onClick={() => navigate(`/practice/quiz?d=${selected.join(',')}`)}>
          <span className="grow"><h2>Quick quiz</h2><span className="muted">10 questions · instant explanation after each</span></span>
          <span className="chev"><IconChevron /></span>
        </button>
        <div className="chips" style={{ marginTop: 12 }} aria-label="Domains to include">
          {domains.map((d) => (
            <button key={d.id} type="button" className={`chip ${selected.includes(d.id) ? 'on' : ''}`} aria-pressed={selected.includes(d.id)} onClick={() => toggle(d.id)}>
              {d.shortName}
            </button>
          ))}
        </div>
      </section>
      <Link className="panel panel-link" to="/practice/weak">
        <span className="grow"><h2>Weak spots</h2><span className="muted">{missed > 0 ? `${missed} missed question${missed === 1 ? '' : 's'} + your lowest sub-skills` : 'Your lowest-scoring areas'}</span></span>
        <span className="chev"><IconChevron /></span>
      </Link>
      <Link className="panel panel-link" to="/practice/mock">
        <span className="grow"><h2><IconClock /> Mock exam</h2><span className="muted">53 questions · 120 min · weighted like the real exam</span></span>
        <span className="chev"><IconChevron /></span>
      </Link>
      <Link className="panel panel-link" to="/practice/history">
        <span className="grow"><h2>History</h2><span className="muted">{mocksDone === 0 ? 'No mock exams yet' : `${mocksDone} mock exam${mocksDone === 1 ? '' : 's'} taken`}</span></span>
        <span className="chev"><IconChevron /></span>
      </Link>
    </Screen>
  );
}
```
(Note: `h2` inside the Mock exam link contains an icon; the link's accessible name still contains "Mock exam".)

`src/features/practice/QuizPage.tsx`:
```tsx
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { pickQuizQuestions, QUIZ_SIZE } from '../../study/quiz';
import { QuestionRunner, type RunSummary } from './QuestionRunner';
import { SessionSummary } from './SessionSummary';

export function QuizPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { questions } = useContent();
  const { attempts } = useProgress();
  const [picked] = useState(() =>
    pickQuizQuestions({
      questions, attempts, count: QUIZ_SIZE, rng: Math.random,
      domainIds: (params.get('d') ?? '').split(',').filter(Boolean),
    }),
  );
  const [summary, setSummary] = useState<RunSummary | null>(null);
  if (summary) return <SessionSummary summary={summary} onDone={() => navigate('/practice')} />;
  return <QuestionRunner questions={picked} mode="quiz" title="Quick quiz" onFinish={setSummary} onExit={() => navigate('/practice')} />;
}
```

`src/features/practice/WeakSpotsPage.tsx`:
```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { pickWeakQuestions, TODAY_QUESTION_COUNT } from '../../study/weakSpots';
import { QuestionRunner, type RunSummary } from './QuestionRunner';
import { SessionSummary } from './SessionSummary';

export function WeakSpotsPage() {
  const navigate = useNavigate();
  const { questions, questionById } = useContent();
  const { attempts } = useProgress();
  const [picked] = useState(() => pickWeakQuestions({ attempts, questions, questionById, count: TODAY_QUESTION_COUNT, rng: Math.random }));
  const [summary, setSummary] = useState<RunSummary | null>(null);
  if (summary) return <SessionSummary summary={summary} onDone={() => navigate('/practice')} />;
  return <QuestionRunner questions={picked} mode="weak" title="Weak spots" onFinish={setSummary} onExit={() => navigate('/practice')} />;
}
```

In `src/app/App.tsx`, add imports and, at the `{/* ROUTES … */}` marker, add:
```tsx
          <Route path="/practice/quiz" element={<QuizPage />} />
          <Route path="/practice/weak" element={<WeakSpotsPage />} />
```
with
```tsx
import { QuizPage } from '../features/practice/QuizPage';
import { WeakSpotsPage } from '../features/practice/WeakSpotsPage';
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS (the App shell test still passes).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: practice tab with quick quiz and weak-spot sessions" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 12: Flashcards — 3D flip, swipe, stack, ratings, direction toggle

Must match the feel of `docs/superpowers/mockups/flashcards.html` (open it in a browser before starting): springy 3D flip on tap; next two cards visible behind; drag tilts the card with AGAIN/GOOD stamps fading in; release past the threshold flies it off; rating buttons slide up only after the flip and show next intervals. Swiping is enabled only after the card is flipped (you can't rate what you haven't seen).

**Files:**
- Create: `src/features/cards/deck.ts`, `src/features/cards/Flashcard.tsx`, `src/features/cards/FlashcardDeck.tsx`, `src/features/cards/RatingBar.tsx`, `src/features/cards/DirectionToggle.tsx`, `src/features/cards/CardReviewSession.tsx`, `src/features/cards/ReviewPage.tsx`, `src/features/cards/cards.css`
- Modify: `src/app/App.tsx` (route)
- Test: `src/features/cards/cards.test.tsx`

**Interfaces:**
- Consumes: `buildQueue`, `newState`, `rate`, `previewIntervals`, `shouldRequeue`, `stateKey`, `nextDueIn`, `RATINGS`, `QueueItem` (Task 5); `useProgress().saveCardState/updateSettings/settings/cardStates` (Task 9); `useClock` (Task 9); UI kit.
- Produces: `interface DeckItem { key: string; cardId: string; direction: Direction; card: Card; state: StoredCardState | null }`; `toDeckItem(q: QueueItem, cardById: Map<string, Card>, seq: number): DeckItem`; `SWIPE_THRESHOLD = 100`; `Flashcard({ item, domainName, flipped, onFlip, onSwipe })`; `FlashcardDeck({ items: DeckItem[]; onRate(item: DeckItem, r: UserRating): void; intervalsFor(item: DeckItem): Record<UserRating, string> })`; `RatingBar({ visible, intervals, onRate })`; `DirectionToggle({ value: DirectionMode; onChange(m: DirectionMode): void })`; `CardReviewSession({ mode: DirectionMode; onDone(reviewed: number): void; onExit(): void; toolbar?: ReactNode; doneLabel?: string })`; route `/cards/review` → `ReviewPage`.

- [ ] **Step 1: Failing tests** — `src/features/cards/cards.test.tsx`:
```tsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithApp } from '../../../tests/renderWithApp';
import { fixtureContent } from '../../content/fixtures';
import { CardReviewSession } from './CardReviewSession';
import { ReviewPage } from './ReviewPage';

const front = () => screen.getByRole('button', { name: /Card front/ });
const frontFace = () => document.querySelector('.deck-slot .fc[role="button"] .fc-front') as HTMLElement;
const flip = async () => userEvent.click(await screen.findByRole('button', { name: /Card front/ }));

describe('CardReviewSession', () => {
  it('flips, shows ratings only after the flip, and completes the session', async () => {
    const onDone = vi.fn();
    const { db } = await renderWithApp(<CardReviewSession mode="forward" onDone={onDone} onExit={() => {}} />);
    expect(await screen.findByRole('button', { name: /Card front/ })).toHaveTextContent('Alpha term');
    expect(screen.queryByRole('button', { name: /^Good/ })).toBeNull();
    await flip();
    for (const r of [/^Again/, /^Hard/, /^Good/, /^Easy/]) expect(await screen.findByRole('button', { name: r })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Easy/ }));
    await waitFor(() => expect(front()).toHaveTextContent('Beta term'));
    await flip();
    await userEvent.click(await screen.findByRole('button', { name: /^Easy/ }));
    expect(await screen.findByText('Session complete')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalledWith(2);
    expect(await db.getCardStates()).toHaveLength(2);
  });

  it('brings an "Again" card back later in the same session', async () => {
    await renderWithApp(<CardReviewSession mode="forward" onDone={() => {}} onExit={() => {}} />);
    await flip();
    await userEvent.click(await screen.findByRole('button', { name: /^Again/ }));
    await waitFor(() => expect(front()).toHaveTextContent('Beta term'));
    await flip();
    await userEvent.click(await screen.findByRole('button', { name: /^Easy/ }));
    await waitFor(() => expect(front()).toHaveTextContent('Alpha term'));
  });

  it('shows the definition on the front in reverse mode', async () => {
    await renderWithApp(<CardReviewSession mode="reverse" onDone={() => {}} onExit={() => {}} />);
    await screen.findByRole('button', { name: /Card front/ });
    expect(frontFace()).toHaveTextContent('Alpha definition');
    expect(frontFace()).not.toHaveTextContent('Alpha term');
  });

  it('says so when nothing is due', async () => {
    await renderWithApp(<CardReviewSession mode="forward" onDone={() => {}} onExit={() => {}} />, {
      content: { ...fixtureContent(), cards: [] },
    });
    expect(await screen.findByText('Nothing due right now')).toBeInTheDocument();
  });
});

describe('ReviewPage', () => {
  it('switches direction and remembers the choice', async () => {
    const { db } = await renderWithApp(<ReviewPage />, { route: '/cards/review', path: '/cards/review' });
    await userEvent.click(await screen.findByRole('radio', { name: 'Def → Term' }));
    await waitFor(() => expect(frontFace()).toHaveTextContent('Alpha definition'));
    await waitFor(async () => expect(await db.getKv('settings')).toMatchObject({ cardDirection: 'reverse' }));
  });
});
```

Run: `npx vitest run src/features/cards` — Expected: FAIL.

- [ ] **Step 2: Implement**

`src/features/cards/deck.ts`:
```ts
import type { Card } from '../../content/schema';
import { stateKey, type QueueItem } from '../../study/scheduler';
import type { Direction, StoredCardState } from '../../study/types';

export interface DeckItem {
  /** Unique per appearance so a requeued card animates in as a new card. */
  key: string;
  cardId: string;
  direction: Direction;
  card: Card;
  state: StoredCardState | null;
}

export function toDeckItem(q: QueueItem, cardById: Map<string, Card>, seq: number): DeckItem {
  return { key: `${stateKey(q.cardId, q.direction)}@${seq}`, cardId: q.cardId, direction: q.direction, card: cardById.get(q.cardId)!, state: q.state };
}
```

`src/features/cards/Flashcard.tsx`:
```tsx
import { motion, useMotionValue, useTransform } from 'motion/react';
import { useRef } from 'react';
import { renderInline } from '../../ui/inline';
import { flipSpring } from '../../ui/motion';
import type { DeckItem } from './deck';

export const SWIPE_THRESHOLD = 100;

export function Flashcard({ item, domainName, flipped, onFlip, onSwipe }: {
  item: DeckItem;
  domainName: string;
  flipped: boolean;
  onFlip: () => void;
  onSwipe: (rating: 'again' | 'good') => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const goodOpacity = useTransform(x, [20, 110], [0, 1]);
  const againOpacity = useTransform(x, [-110, -20], [1, 0]);
  const dragged = useRef(false);
  const { card } = item;
  const reverse = item.direction === 'reverse';

  return (
    <motion.div
      className="fc"
      style={{ x, rotate }}
      drag={flipped ? 'x' : false}
      dragSnapToOrigin
      dragElastic={0.85}
      onPointerDown={() => { dragged.current = false; }}
      onDragStart={() => { dragged.current = true; }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > SWIPE_THRESHOLD || Math.abs(info.velocity.x) > 800) onSwipe(info.offset.x > 0 ? 'good' : 'again');
      }}
      onClick={() => { if (!dragged.current) onFlip(); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onFlip();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={flipped ? 'Card back, tap to see the front' : 'Card front, tap to flip'}
    >
      <motion.span className="fc-stamp fc-stamp-again" style={{ opacity: againOpacity }} aria-hidden="true">AGAIN</motion.span>
      <motion.span className="fc-stamp fc-stamp-good" style={{ opacity: goodOpacity }} aria-hidden="true">GOOD</motion.span>
      <motion.div className="fc-flip" initial={false} animate={{ rotateY: flipped ? 180 : 0 }} transition={flipSpring}>
        <div className="fc-face fc-front" aria-hidden={flipped}>
          <span className="tag">{domainName}</span>
          <div className={`fc-main ${reverse ? 'fc-main-def' : ''}`}>{reverse ? renderInline(card.definition) : card.term}</div>
          <div className="fc-hint">{reverse ? 'Which term is this? Tap to flip' : 'Tap to flip'}</div>
        </div>
        <div className="fc-face fc-back" aria-hidden={!flipped}>
          <span className="tag">{domainName}</span>
          {reverse ? <div className="fc-term-answer">{card.term}</div> : <div className="fc-def">{renderInline(card.definition)}</div>}
          <div className="fc-sec">Why it matters</div>
          <div className="fc-txt">{renderInline(card.whyItMatters)}</div>
          {card.example && (
            <>
              <div className="fc-sec">Example</div>
              <div className="fc-txt">{renderInline(card.example)}</div>
            </>
          )}
          <a className="source" href={card.source.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
            📎 {card.source.title}
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}
```
The card's accessible name comes from `aria-label`; tests read face text through `.fc-front`, or through the button's full text content (which includes both faces).

`src/features/cards/RatingBar.tsx`:
```tsx
import { AnimatePresence, motion } from 'motion/react';
import { RATINGS } from '../../study/scheduler';
import type { UserRating } from '../../study/types';
import { spring } from '../../ui/motion';

const LABEL: Record<UserRating, string> = { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' };

export function RatingBar({ visible, intervals, onRate }: {
  visible: boolean;
  intervals: Record<UserRating, string> | null;
  onRate: (r: UserRating) => void;
}) {
  return (
    <div className="rate-slot">
      <AnimatePresence>
        {visible && intervals && (
          <motion.div className="rate" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} transition={spring}>
            {RATINGS.map((r) => (
              <motion.button key={r} type="button" whileTap={{ scale: 0.92 }} className={`rate-btn rate-${r}`} onClick={() => onRate(r)}>
                {LABEL[r]}
                <small>{intervals[r]}</small>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

`src/features/cards/FlashcardDeck.tsx`:
```tsx
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { useState } from 'react';
import { useContent } from '../../app/ContentContext';
import type { UserRating } from '../../study/types';
import { spring } from '../../ui/motion';
import type { DeckItem } from './deck';
import { Flashcard } from './Flashcard';
import { RatingBar } from './RatingBar';

const exitVariants: Variants = {
  exit: (dir: number) => ({ x: dir * 480, rotate: dir * 24, opacity: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }),
};

export function FlashcardDeck({ items, onRate, intervalsFor }: {
  items: DeckItem[];
  onRate: (item: DeckItem, rating: UserRating) => void;
  intervalsFor: (item: DeckItem) => Record<UserRating, string>;
}) {
  const { domainById } = useContent();
  const [flipped, setFlipped] = useState(false);
  const [exitDir, setExitDir] = useState(1);
  const top = items[0];

  const rateTop = (rating: UserRating) => {
    if (!top) return;
    setExitDir(rating === 'again' || rating === 'hard' ? -1 : 1);
    setFlipped(false);
    onRate(top, rating);
  };

  return (
    <div className="deck">
      <div className="deck-stage">
        <AnimatePresence custom={exitDir}>
          {items.slice(0, 3).map((item, depth) => (
            <motion.div
              key={item.key}
              className="deck-slot"
              custom={exitDir}
              variants={exitVariants}
              exit="exit"
              initial={{ scale: 0.88, y: 26, opacity: 0 }}
              animate={{ scale: 1 - depth * 0.06, y: depth * 13, opacity: depth === 0 ? 1 : depth === 1 ? 0.55 : 0.25 }}
              transition={spring}
              style={{ zIndex: 10 - depth, pointerEvents: depth === 0 ? 'auto' : 'none' }}
            >
              {depth === 0 ? (
                <Flashcard item={item} domainName={domainById.get(item.card.domainId)?.shortName ?? ''} flipped={flipped}
                  onFlip={() => setFlipped((f) => !f)} onSwipe={rateTop} />
              ) : (
                <div className="fc" aria-hidden="true"><div className="fc-face fc-front" /></div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <RatingBar visible={flipped && Boolean(top)} intervals={top ? intervalsFor(top) : null} onRate={rateTop} />
    </div>
  );
}
```

`src/features/cards/DirectionToggle.tsx`:
```tsx
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
```

`src/features/cards/CardReviewSession.tsx`:
```tsx
import { motion } from 'motion/react';
import { useRef, useState, type ReactNode } from 'react';
import { useClock } from '../../app/clock';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { buildQueue, newState, nextDueIn, previewIntervals, rate, shouldRequeue } from '../../study/scheduler';
import type { DirectionMode, UserRating } from '../../study/types';
import { Button } from '../../ui/Button';
import { IconClose } from '../../ui/icons';
import { ProgressBar } from '../../ui/ProgressBar';
import './cards.css';
import { toDeckItem, type DeckItem } from './deck';
import { FlashcardDeck } from './FlashcardDeck';

export function CardReviewSession({ mode, onDone, onExit, toolbar, doneLabel = 'Done' }: {
  mode: DirectionMode;
  onDone: (reviewed: number) => void;
  onExit: () => void;
  toolbar?: ReactNode;
  doneLabel?: string;
}) {
  const { cards, cardById } = useContent();
  const { cardStates, settings, saveCardState } = useProgress();
  const { now } = useClock();
  const seq = useRef(0);
  const [items, setItems] = useState<DeckItem[]>(() =>
    buildQueue({ cardIds: cards.map((c) => c.id), states: cardStates, mode, now: now(), newPerDay: settings.newCardsPerDay, rng: Math.random })
      .map((q) => toDeckItem(q, cardById, seq.current++)),
  );
  const [reviewed, setReviewed] = useState(0);

  const onRate = (item: DeckItem, rating: UserRating) => {
    const t = now();
    const next = rate(item.state ?? newState(item.cardId, item.direction, t), rating, t);
    void saveCardState(next);
    setReviewed((n) => n + 1);
    setItems((list) => {
      const rest = list.slice(1);
      return shouldRequeue(next, t) ? [...rest, { ...item, state: next, key: `${next.key}@${seq.current++}` }] : rest;
    });
  };
  const intervalsFor = (item: DeckItem) => {
    const t = now();
    return previewIntervals(item.state ?? newState(item.cardId, item.direction, t), t);
  };

  const header = (
    <header className="runner-head">
      <button type="button" className="icon-btn" aria-label="Close" onClick={onExit}><IconClose /></button>
      <span className="runner-count">{items.length > 0 ? `${items.length} left` : 'Flashcards'}</span>
      <span className="icon-btn-spacer" />
    </header>
  );

  if (items.length === 0) {
    const next = nextDueIn(cardStates, now());
    return (
      <div className="review">
        {header}
        {toolbar}
        <motion.div className="done-card" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
          <div className="big-emoji" aria-hidden="true">🎉</div>
          <h2>{reviewed > 0 ? 'Session complete' : 'Nothing due right now'}</h2>
          <p className="muted">
            {reviewed > 0 ? `${reviewed} review${reviewed === 1 ? '' : 's'} done. ` : ''}
            {next ? `Next card due in ${next}.` : ''}
          </p>
          <Button block onClick={() => onDone(reviewed)}>{doneLabel}</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="review">
      {header}
      <ProgressBar value={reviewed / (reviewed + items.length)} label="Session progress" />
      {toolbar}
      <FlashcardDeck items={items} onRate={onRate} intervalsFor={intervalsFor} />
    </div>
  );
}
```

`src/features/cards/ReviewPage.tsx`:
```tsx
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
```

`src/features/cards/cards.css`:
```css
.review {
  display: flex; flex-direction: column; flex: 1; width: 100%; max-width: 520px; min-height: 100dvh; margin: 0 auto;
  padding: calc(var(--safe-top) + 6px) 16px calc(var(--safe-bottom) + 12px);
}
.review-toolbar { margin: 0 0 10px; }
.deck { display: flex; flex: 1; flex-direction: column; }
.deck-stage { position: relative; flex: 1; min-height: 420px; margin: 6px 2px 12px; }
.deck-slot { position: absolute; inset: 0; }
.fc { position: absolute; inset: 0; perspective: 1200px; cursor: grab; user-select: none; -webkit-user-select: none; outline: none; }
.fc:active { cursor: grabbing; }
.fc:focus-visible .fc-face { outline: 2px solid var(--accent); outline-offset: 2px; }
.fc-flip { position: absolute; inset: 0; transform-style: preserve-3d; }
.fc-face {
  position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; padding: 20px;
  border-radius: var(--radius-lg); backface-visibility: hidden; -webkit-backface-visibility: hidden;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.fc-front { border: 1px solid #332d5c; background: linear-gradient(165deg, #241f42 0%, #17161f 70%); }
.fc-back { overflow-y: auto; border: 1px solid var(--border); background: linear-gradient(165deg, #1a1b24 0%, #121318 80%); transform: rotateY(180deg); }
.fc-front .tag, .fc-back .tag { align-self: flex-start; }
.fc-main { display: flex; flex: 1; align-items: center; justify-content: center; text-align: center; font-size: 23px; font-weight: 750; letter-spacing: -0.2px; }
.fc-main-def { font-size: 17px; font-weight: 600; line-height: 1.5; }
.fc-hint { text-align: center; font-size: 11.5px; color: var(--faint); animation: fc-pulse 2.4s ease-in-out infinite; }
@keyframes fc-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
.fc-def { margin: 12px 0 4px; font-size: 16px; font-weight: 650; }
.fc-term-answer { margin: 12px 0 4px; font-size: 22px; font-weight: 800; color: var(--accent-text); }
.fc-sec { margin-top: 14px; font-size: 11px; letter-spacing: 0.6px; text-transform: uppercase; color: var(--muted); }
.fc-txt { margin-top: 3px; font-size: 14px; color: var(--text-2); }
.fc-back .source { margin-top: auto; padding-top: 12px; }
.fc-stamp {
  position: absolute; top: 22px; z-index: 3; padding: 4px 10px; border: 2px solid; border-radius: 8px;
  font-weight: 800; font-size: 13px; pointer-events: none;
}
.fc-stamp-again { left: 18px; color: var(--error-text); transform: rotate(-12deg); }
.fc-stamp-good { right: 18px; color: var(--success-text); transform: rotate(12deg); }
.rate-slot { min-height: 60px; }
.rate { display: flex; gap: 8px; }
.rate-btn { flex: 1; min-height: 56px; padding: 10px 0 8px; border: 0; border-radius: var(--radius); font-weight: 750; font-size: 13px; cursor: pointer; }
.rate-btn small { display: block; margin-top: 2px; font-weight: 500; font-size: 10.5px; opacity: 0.75; }
.rate-again { background: var(--error-bg); color: var(--error-text); }
.rate-hard { background: var(--warning-bg); color: var(--warning); }
.rate-good { background: var(--success-bg); color: var(--success-text); }
.rate-easy { background: var(--accent-soft); color: var(--accent-text); }
.done-card { display: flex; flex-direction: column; gap: 8px; margin: auto 0; padding: 32px 8px; text-align: center; }
.done-card h2 { margin: 0; }
.glossary-letter { margin: 18px 0 4px; font-size: 12px; font-weight: 800; color: var(--muted); }
.term-list { margin: 0; padding: 0; list-style: none; }
.term-list li { padding: 10px 0; border-bottom: 1px solid var(--border-soft); }
.term-list .term { font-weight: 700; }
.term-list .def { font-size: 13.5px; color: var(--text-2); }
.term-row { display: flex; align-items: flex-start; gap: 8px; }
.term-row .grow { flex: 1; }
@media (prefers-reduced-motion: reduce) { .fc-hint { animation: none; } }
```

In `src/app/App.tsx` add `import { ReviewPage } from '../features/cards/ReviewPage';` and at the routes marker:
```tsx
          <Route path="/cards/review" element={<ReviewPage />} />
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/features/cards`
Expected: PASS. If an exiting card lingers in jsdom so `front()` finds two matches, change `front()` to `screen.getAllByRole('button', { name: /Card front/ }).at(-1)!` — do not remove the exit animation.

- [ ] **Step 4: Feel check against the prototype**

Run `npm run dev`; open `#/cards/review` at iPhone viewport next to `docs/superpowers/mockups/flashcards.html`. Confirm: tap flips with a slight overshoot; stack visible behind; after flipping, dragging tilts the card and fades the stamps; release past ~100px flies it off and the next card rises; rating buttons slide in only after flipping and show intervals; direction toggle pill slides. Tweak only `src/ui/motion.ts` spring values or `cards.css` if the feel differs.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: animated flashcard deck with swipe, FSRS ratings and direction toggle" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---
### Task 13: Cards tab — due count, browse by domain, vocabulary glossary

**Files:**
- Modify (replace entirely): `src/features/cards/CardsPage.tsx`
- Create: `src/features/cards/BrowsePage.tsx`, `src/features/cards/GlossaryPage.tsx`
- Modify: `src/ui/ui.css` (append `.section-title`), `src/app/App.tsx` (routes)
- Test: `src/features/cards/cardsTab.test.tsx`

**Interfaces:**
- Consumes: `buildQueue` (Task 5); `DirectionToggle` (Task 12); `FlagButton` (Task 10); `Disclosure`, `renderInline`, `Screen`, icons (Task 9).
- Produces: routes `/cards/browse/:domainId` → `BrowsePage`, `/cards/glossary` → `GlossaryPage`; `groupGlossary(cards: Card[], query: string): { letter: string; cards: Card[] }[]` exported from `GlossaryPage.tsx`.

- [ ] **Step 1: Failing tests** — `src/features/cards/cardsTab.test.tsx`:
```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithApp } from '../../../tests/renderWithApp';
import { fixtureContent } from '../../content/fixtures';
import { BrowsePage } from './BrowsePage';
import { CardsPage } from './CardsPage';
import { GlossaryPage, groupGlossary } from './GlossaryPage';

describe('CardsPage', () => {
  it('shows how many cards are ready and links to review, glossary and domains', async () => {
    await renderWithApp(<CardsPage />, { route: '/cards', path: '/cards' });
    expect(await screen.findByText('cards ready to review')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start review/ })).toHaveAttribute('href', '/cards/review');
    expect(screen.getByRole('link', { name: /Vocabulary glossary/ })).toHaveAttribute('href', '/cards/glossary');
    expect(screen.getByRole('link', { name: /Alpha Domain/ })).toHaveAttribute('href', '/cards/browse/alpha');
  });
  it('saves the direction choice', async () => {
    const { db } = await renderWithApp(<CardsPage />, { route: '/cards', path: '/cards' });
    await userEvent.click(await screen.findByRole('radio', { name: 'Mixed' }));
    expect(await db.getKv('settings')).toMatchObject({ cardDirection: 'mixed' });
  });
});

describe('BrowsePage', () => {
  it('lists the domain cards with flag buttons and details', async () => {
    await renderWithApp(<BrowsePage />, { route: '/cards/browse/alpha', path: '/cards/browse/:domainId' });
    expect(await screen.findByText('Alpha term')).toBeInTheDocument();
    expect(screen.getByText('Alpha definition')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Flag as wrong or outdated' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Details/ }));
    expect(screen.getByText('Alpha matters')).toBeInTheDocument();
  });
});

describe('GlossaryPage', () => {
  it('groups vocab terms by letter and filters by search', async () => {
    const c = fixtureContent();
    expect(groupGlossary(c.cards, '')).toEqual([{ letter: 'A', cards: [c.cardById.get('c-alpha-one')] }]);
    expect(groupGlossary(c.cards, 'definition')).toHaveLength(1);
    expect(groupGlossary(c.cards, 'zzz')).toEqual([]);

    await renderWithApp(<GlossaryPage />, { route: '/cards/glossary', path: '/cards/glossary' });
    expect(await screen.findByText('Alpha term')).toBeInTheDocument();
    expect(screen.queryByText('Beta term')).toBeNull();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search terms' }), 'zzz');
    expect(screen.getByText('No terms match “zzz”.')).toBeInTheDocument();
  });
});
```

Run: `npx vitest run src/features/cards/cardsTab.test.tsx` — Expected: FAIL.

- [ ] **Step 2: Implement**

`src/features/cards/CardsPage.tsx` (replace):
```tsx
import { Link } from 'react-router-dom';
import { useClock } from '../../app/clock';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { buildQueue } from '../../study/scheduler';
import { IconChevron } from '../../ui/icons';
import { Screen } from '../../ui/Screen';
import './cards.css';
import { DirectionToggle } from './DirectionToggle';

export function CardsPage() {
  const { cards, domains } = useContent();
  const { cardStates, settings, updateSettings } = useProgress();
  const { now } = useClock();
  const due = buildQueue({
    cardIds: cards.map((c) => c.id), states: cardStates, mode: settings.cardDirection, now: now(),
    newPerDay: settings.newCardsPerDay, rng: () => 0,
  }).length;
  const vocab = cards.filter((c) => c.isVocab).length;

  return (
    <Screen title="Flashcards">
      <section className="panel">
        <div className="big-num">{due}</div>
        <p className="muted">{due === 1 ? 'card ready to review' : 'cards ready to review'}</p>
        <div style={{ margin: '12px 0' }}>
          <DirectionToggle value={settings.cardDirection} onChange={(m) => void updateSettings({ cardDirection: m })} />
        </div>
        <Link className="btn btn-primary btn-block" to="/cards/review">{due > 0 ? 'Start review' : 'Open review'}</Link>
      </section>
      <Link className="panel panel-link" to="/cards/glossary">
        <span className="grow"><h2>Vocabulary glossary</h2><span className="muted">{vocab} term{vocab === 1 ? '' : 's'}, searchable</span></span>
        <span className="chev"><IconChevron /></span>
      </Link>
      <h3 className="section-title">Browse by domain</h3>
      {domains.map((d) => {
        const n = cards.filter((c) => c.domainId === d.id).length;
        return (
          <Link key={d.id} className="panel panel-link" to={`/cards/browse/${d.id}`}>
            <span className="grow"><strong>{d.name}</strong> <span className="muted">· {n} card{n === 1 ? '' : 's'}</span></span>
            <span className="chev"><IconChevron /></span>
          </Link>
        );
      })}
    </Screen>
  );
}
```

`src/features/cards/BrowsePage.tsx`:
```tsx
import { useParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { Disclosure } from '../../ui/Disclosure';
import { renderInline } from '../../ui/inline';
import { Screen } from '../../ui/Screen';
import { FlagButton } from '../shared/FlagButton';
import './cards.css';

export function BrowsePage() {
  const { domainId = '' } = useParams();
  const { cards, domainById } = useContent();
  const domain = domainById.get(domainId);
  const list = cards.filter((c) => c.domainId === domainId);
  return (
    <Screen title={domain?.shortName ?? 'Cards'} back="/cards">
      {list.length === 0 ? (
        <p className="empty">No cards in this domain yet. More arrive with the content update.</p>
      ) : (
        <ul className="term-list">
          {list.map((c) => (
            <li key={c.id}>
              <div className="term-row">
                <div className="grow">
                  <div className="term">{c.term}</div>
                  <div className="def">{renderInline(c.definition)}</div>
                </div>
                <FlagButton itemId={c.id} kind="card" />
              </div>
              <Disclosure title="Details">
                <p><strong>Why it matters:</strong> {renderInline(c.whyItMatters)}</p>
                {c.example && <p><strong>Example:</strong> {renderInline(c.example)}</p>}
                <a className="source" href={c.source.url} target="_blank" rel="noreferrer">📎 {c.source.title}</a>
              </Disclosure>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
```

`src/features/cards/GlossaryPage.tsx`:
```tsx
import { useState } from 'react';
import { useContent } from '../../app/ContentContext';
import type { Card } from '../../content/schema';
import { renderInline } from '../../ui/inline';
import { Screen } from '../../ui/Screen';
import './cards.css';

export function groupGlossary(cards: Card[], query: string): { letter: string; cards: Card[] }[] {
  const q = query.trim().toLowerCase();
  const matches = cards
    .filter((c) => c.isVocab)
    .filter((c) => !q || c.term.toLowerCase().includes(q) || c.definition.toLowerCase().includes(q))
    .sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: 'base' }));
  const groups = new Map<string, Card[]>();
  for (const c of matches) {
    const first = c.term.charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : '#';
    groups.set(letter, [...(groups.get(letter) ?? []), c]);
  }
  return [...groups.entries()].map(([letter, list]) => ({ letter, cards: list }));
}

export function GlossaryPage() {
  const { cards } = useContent();
  const [query, setQuery] = useState('');
  const groups = groupGlossary(cards, query);
  return (
    <Screen title="Glossary" back="/cards">
      <input type="search" className="input" placeholder="Search terms" aria-label="Search terms" value={query} onChange={(e) => setQuery(e.target.value)} />
      {groups.length === 0 && <p className="empty">No terms match “{query}”.</p>}
      {groups.map((g) => (
        <section key={g.letter}>
          <div className="glossary-letter">{g.letter}</div>
          <ul className="term-list">
            {g.cards.map((c) => (
              <li key={c.id}>
                <div className="term">{c.term}</div>
                <div className="def">{renderInline(c.definition)}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Screen>
  );
}
```

Append to `src/ui/ui.css`:
```css
.section-title { margin: 22px 0 4px; font-size: 12px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; color: var(--muted); }
```

In `src/app/App.tsx` import `BrowsePage` and `GlossaryPage` from `../features/cards/…` and add at the routes marker:
```tsx
          <Route path="/cards/browse/:domainId" element={<BrowsePage />} />
          <Route path="/cards/glossary" element={<GlossaryPage />} />
```

- [ ] **Step 3: Run tests** — `npm test` → PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: cards tab with due count, domain browsing and glossary" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 14: Mock exam — intro, timed exam with resume, results, history

**Files:**
- Create: `src/features/mock/MockIntroPage.tsx`, `src/features/mock/MockExamPage.tsx`, `src/features/mock/MockResultsPage.tsx`, `src/features/mock/HistoryPage.tsx`, `src/features/mock/mock.css`
- Modify: `src/app/App.tsx` (routes)
- Test: `src/features/mock/mock.test.tsx`

**Interfaces:**
- Consumes: `buildMockExam`, `remainingMs`, `scoreMock`, `MOCK_QUESTION_COUNT` (Task 7); `PASS_SCORE` (Task 6); `useProgress().mockSessions/saveMockSession/submitMock/attempts` (Task 9); `useNow`, `useClock` (Task 9); `QuestionView` (Task 10); `Sheet`, `Button`, `Meter`, `ProgressBar`, icons.
- Produces: routes `/practice/mock` (intro), `/practice/mock/:sessionId` (exam; full-screen), `/practice/mock/:sessionId/results`, `/practice/history`; `formatClock(ms: number): string` → `H:MM:SS` exported from `MockExamPage.tsx`.

- [ ] **Step 1: Failing tests** — `src/features/mock/mock.test.tsx`:
```tsx
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { openTestDb, renderWithApp } from '../../../tests/renderWithApp';
import { MOCK_DURATION_MS } from '../../study/mockExam';
import type { MockSession } from '../../study/types';
import { HistoryPage } from './HistoryPage';
import { MockExamPage, formatClock } from './MockExamPage';
import { MockIntroPage } from './MockIntroPage';
import { MockResultsPage } from './MockResultsPage';

const NOW = new Date('2026-09-26T10:00:00');
const now = () => NOW;
const session = (over: Partial<MockSession> = {}): MockSession => ({
  id: 'm1', startedAt: NOW.getTime() - 60_000, durationMs: MOCK_DURATION_MS,
  questionIds: ['q-alpha-1', 'q-alpha-2', 'q-alpha-3', 'q-beta-1'], answers: {}, flagged: [], currentIndex: 0, ...over,
});
const examAt = (db: Awaited<ReturnType<typeof openTestDb>>) =>
  renderWithApp(<MockExamPage />, { db, now, route: '/practice/mock/m1', path: '/practice/mock/:sessionId' });

describe('formatClock', () => {
  it('formats H:MM:SS', () => {
    expect(formatClock(MOCK_DURATION_MS)).toBe('2:00:00');
    expect(formatClock(61_000)).toBe('0:01:01');
  });
});

describe('MockIntroPage', () => {
  it('explains a short bank and starts a saved session', async () => {
    const { db } = await renderWithApp(<MockIntroPage />, { now, route: '/practice/mock', path: '/practice/mock' });
    expect(await screen.findByText(/this mock uses 4/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start a new mock exam' }));
    expect(screen.getByTestId('location')).toHaveTextContent(`/practice/mock/mock-${NOW.getTime()}`);
    const [saved] = await db.getMockSessions();
    expect(saved.questionIds).toHaveLength(4);
  });
  it('offers to resume an unfinished exam', async () => {
    const db = await openTestDb();
    await db.putMockSession(session());
    await renderWithApp(<MockIntroPage />, { db, now, route: '/practice/mock', path: '/practice/mock' });
    await userEvent.click(await screen.findByRole('button', { name: 'Resume exam in progress' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/practice/mock/m1');
  });
});

describe('MockExamPage', () => {
  it('hides feedback, saves answers and position, and resumes', async () => {
    const db = await openTestDb();
    await db.putMockSession(session());
    const first = await examAt(db);
    expect(await screen.findByText('Question 1 of 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Time remaining')).toHaveTextContent('1:59:00');
    await userEvent.click(screen.getByRole('button', { name: /Right answer q-alpha-1/ }));
    expect(screen.getByRole('button', { name: /Right answer q-alpha-1/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Why a is right for q-alpha-1')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Question 2 of 4')).toBeInTheDocument();
    await waitFor(async () => expect((await db.getMockSessions())[0]).toMatchObject({ currentIndex: 1, answers: { 'q-alpha-1': 'a' } }));
    first.unmount();

    await examAt(db);
    expect(await screen.findByText('Question 2 of 4')).toBeInTheDocument();
  });

  it('submits from the navigator and records attempts', async () => {
    const db = await openTestDb();
    await db.putMockSession(session({ answers: { 'q-alpha-1': 'a' } }));
    await examAt(db);
    await userEvent.click(await screen.findByRole('button', { name: /All questions \(1\/4\)/ }));
    const nav = screen.getByRole('dialog', { name: 'Question navigator' });
    expect(within(nav).getByRole('button', { name: 'Question 1, answered' })).toBeInTheDocument();
    await userEvent.click(within(nav).getByRole('button', { name: 'Submit exam' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/practice/mock/m1/results'));
    expect(await db.getAttempts()).toHaveLength(1);
  });

  it('auto-submits when time runs out', async () => {
    const db = await openTestDb();
    await db.putMockSession(session({ startedAt: NOW.getTime() - MOCK_DURATION_MS - 1 }));
    await examAt(db);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/practice/mock/m1/results'));
  });
});

describe('MockResultsPage and HistoryPage', () => {
  const submitted = session({
    answers: { 'q-alpha-1': 'a', 'q-alpha-2': 'a', 'q-alpha-3': 'c', 'q-beta-1': 'a' }, submittedAt: NOW.getTime(),
  });

  it('shows score, pass line, per-domain rows and a filterable review', async () => {
    const db = await openTestDb();
    await db.putMockSession(submitted);
    await renderWithApp(<MockResultsPage />, { db, route: '/practice/mock/m1/results', path: '/practice/mock/:sessionId/results' });
    expect(await screen.findByText('775')).toBeInTheDocument();
    expect(screen.getByText(/Above the 720 pass mark/)).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(4);
    await userEvent.click(screen.getByRole('button', { name: 'Wrong only' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('lists past exams newest first', async () => {
    const db = await openTestDb();
    await db.putMockSession(submitted);
    await db.putMockSession({ ...submitted, id: 'm0', answers: {}, submittedAt: NOW.getTime() - 86_400_000 });
    await renderWithApp(<HistoryPage />, { db, route: '/practice/history', path: '/practice/history' });
    const links = await screen.findAllByRole('link', { name: /Mock exam/ });
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/practice/mock/m1/results', '/practice/mock/m0/results']);
  });
});
```
(`QuestionView` renders an `<article>`; that is what `getAllByRole('article')` counts.)

Run: `npx vitest run src/features/mock` — Expected: FAIL.

- [ ] **Step 2: Implement**

`src/features/mock/MockIntroPage.tsx`:
```tsx
import { useNavigate } from 'react-router-dom';
import { useClock } from '../../app/clock';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { buildMockExam, MOCK_QUESTION_COUNT, remainingMs } from '../../study/mockExam';
import { PASS_SCORE } from '../../study/readiness';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import './mock.css';

export function MockIntroPage() {
  const navigate = useNavigate();
  const { questions, domains } = useContent();
  const { attempts, mockSessions, saveMockSession } = useProgress();
  const { now } = useClock();
  const active = mockSessions.find((s) => !s.submittedAt && remainingMs(s, now().getTime()) > 0);
  const count = Math.min(MOCK_QUESTION_COUNT, questions.length);

  const start = async () => {
    const t = now().getTime();
    const s = buildMockExam({ id: `mock-${t}`, domains, questions, attempts, rng: Math.random, now: t });
    await saveMockSession(s);
    navigate(`/practice/mock/${s.id}`);
  };

  return (
    <Screen title="Mock exam" back="/practice">
      <section className="panel">
        <h2>Exam conditions</h2>
        <ul className="rules">
          <li>{MOCK_QUESTION_COUNT} questions, weighted by domain like the real exam</li>
          <li>120-minute timer; it keeps running if you leave</li>
          <li>No explanations until you submit</li>
          <li>Flag questions to revisit; unanswered questions count as wrong</li>
          <li>Pass mark: {PASS_SCORE} / 1000</li>
        </ul>
      </section>
      {count < MOCK_QUESTION_COUNT && (
        <p className="banner">The question bank has {questions.length} questions so far, so this mock uses {count}. Full 53-question mocks arrive with the content update.</p>
      )}
      {active && <Button block variant="secondary" onClick={() => navigate(`/practice/mock/${active.id}`)}>Resume exam in progress</Button>}
      <Button block onClick={() => void start()}>Start a new mock exam</Button>
    </Screen>
  );
}
```

`src/features/mock/MockExamPage.tsx`:
```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useNow } from '../../app/clock';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import type { ChoiceId } from '../../content/schema';
import { remainingMs } from '../../study/mockExam';
import type { MockSession } from '../../study/types';
import { Button } from '../../ui/Button';
import { IconClock, IconClose } from '../../ui/icons';
import { ProgressBar } from '../../ui/ProgressBar';
import { Screen } from '../../ui/Screen';
import { Sheet } from '../../ui/Sheet';
import '../practice/practice.css';
import { QuestionView } from '../practice/QuestionView';
import './mock.css';

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function MockExamPage() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const { questionById } = useContent();
  const { mockSessions, saveMockSession, submitMock } = useProgress();
  const [session, setSession] = useState<MockSession | undefined>(() => mockSessions.find((s) => s.id === sessionId));
  const [navOpen, setNavOpen] = useState(false);
  const submitting = useRef(false);
  const time = useNow(1000);
  const remaining = session ? remainingMs(session, time.getTime()) : 0;

  const update = (patch: Partial<MockSession>) => {
    if (!session) return;
    const next = { ...session, ...patch };
    setSession(next);
    void saveMockSession(next);
  };

  const submit = useCallback(async () => {
    if (!session || submitting.current) return;
    submitting.current = true;
    await submitMock(session);
    navigate(`/practice/mock/${session.id}/results`, { replace: true });
  }, [session, submitMock, navigate]);

  useEffect(() => {
    if (session && !session.submittedAt && remaining <= 0) void submit();
  }, [remaining, session, submit]);

  if (!session) {
    return <Screen title="Mock exam" back="/practice/mock"><p className="empty">This exam session wasn't found.</p></Screen>;
  }
  if (session.submittedAt) return <Navigate to={`/practice/mock/${session.id}/results`} replace />;

  const qid = session.questionIds[session.currentIndex];
  const question = questionById.get(qid);
  const answered = Object.keys(session.answers).length;
  const total = session.questionIds.length;
  const flagged = session.flagged.includes(qid);
  const isLast = session.currentIndex === total - 1;

  return (
    <div className="runner">
      <header className="runner-head">
        <button type="button" className="icon-btn" aria-label="Leave exam (progress is saved)" onClick={() => navigate('/practice/mock')}>
          <IconClose />
        </button>
        <span className="runner-count">Question {session.currentIndex + 1} of {total}</span>
        <span className={`timer ${remaining < 5 * 60_000 ? 'low' : ''}`} aria-label="Time remaining">
          <IconClock />{formatClock(remaining)}
        </span>
      </header>
      <ProgressBar value={answered / total} label="Questions answered" />
      {question && (
        <QuestionView question={question} chosen={session.answers[qid] ?? null} mode="exam" showReportFlag={false}
          onChoose={(id: ChoiceId) => update({ answers: { ...session.answers, [qid]: id } })} />
      )}
      <div className="mock-tools">
        <button type="button" className={`chip ${flagged ? 'on' : ''}`} aria-pressed={flagged}
          onClick={() => update({ flagged: flagged ? session.flagged.filter((x) => x !== qid) : [...session.flagged, qid] })}>
          {flagged ? '★ Flagged for review' : '☆ Flag for review'}
        </button>
        <button type="button" className="chip" onClick={() => setNavOpen(true)}>All questions ({answered}/{total})</button>
      </div>
      <div className="mock-nav">
        <Button variant="secondary" disabled={session.currentIndex === 0} onClick={() => update({ currentIndex: session.currentIndex - 1 })}>Back</Button>
        {isLast
          ? <Button onClick={() => setNavOpen(true)}>Review &amp; submit</Button>
          : <Button onClick={() => update({ currentIndex: session.currentIndex + 1 })}>Next</Button>}
      </div>
      <Sheet open={navOpen} label="Question navigator">
        <div className="navgrid">
          {session.questionIds.map((id, i) => {
            const isAnswered = Boolean(session.answers[id]);
            const isFlagged = session.flagged.includes(id);
            return (
              <button key={id} type="button"
                className={['navcell', isAnswered ? 'answered' : '', isFlagged ? 'flagged' : '', i === session.currentIndex ? 'current' : ''].join(' ')}
                aria-label={`Question ${i + 1}${isAnswered ? ', answered' : ''}${isFlagged ? ', flagged' : ''}`}
                onClick={() => { update({ currentIndex: i }); setNavOpen(false); }}>
                {i + 1}
              </button>
            );
          })}
        </div>
        <p className="muted">{total - answered} unanswered · {session.flagged.length} flagged. Unanswered questions count as wrong.</p>
        <Button block onClick={() => void submit()}>Submit exam</Button>
        <Button block variant="ghost" onClick={() => setNavOpen(false)}>Keep going</Button>
      </Sheet>
    </div>
  );
}
```

`src/features/mock/MockResultsPage.tsx`:
```tsx
import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import type { Question } from '../../content/schema';
import { scoreMock } from '../../study/mockExam';
import { PASS_SCORE } from '../../study/readiness';
import { Meter } from '../../ui/Meter';
import { renderInline } from '../../ui/inline';
import { Screen } from '../../ui/Screen';
import '../practice/practice.css';
import { QuestionView } from '../practice/QuestionView';
import './mock.css';

export function MockResultsPage() {
  const { sessionId = '' } = useParams();
  const { questionById, domains, domainById } = useContent();
  const { mockSessions } = useProgress();
  const [wrongOnly, setWrongOnly] = useState(false);
  const session = mockSessions.find((s) => s.id === sessionId);
  if (!session?.submittedAt) return <Navigate to="/practice/mock" replace />;

  const result = scoreMock(session, questionById, domains);
  const review = session.questionIds
    .map((id) => questionById.get(id))
    .filter((q): q is Question => Boolean(q))
    .filter((q) => !wrongOnly || session.answers[q.id] !== q.answer);

  return (
    <Screen title="Results" back="/practice">
      <section className="panel center">
        <div className={`result-score ${result.passes ? 'result-pass' : 'result-fail'}`}>{result.scaledScore}</div>
        <div>{result.passes ? 'Above' : 'Below'} the {PASS_SCORE} pass mark</div>
        <div className="muted">{result.correct} / {result.total} correct ({result.percent}%) · estimated scaled score</div>
      </section>
      <section className="panel">
        <h3>By domain</h3>
        {result.byDomain.map((d) => (
          <div key={d.domainId} className="domain-row">
            <span>{domainById.get(d.domainId)?.shortName}</span>
            <span className="muted">{d.correct}/{d.total}</span>
            <Meter value={d.correct / d.total} label={`${domainById.get(d.domainId)?.name} score`} />
          </div>
        ))}
      </section>
      <div className="review-head">
        <h3>Review</h3>
        <button type="button" className={`chip ${wrongOnly ? 'on' : ''}`} aria-pressed={wrongOnly} onClick={() => setWrongOnly((w) => !w)}>Wrong only</button>
      </div>
      {review.map((q) => (
        <div key={q.id} className="panel">
          <QuestionView question={q} chosen={session.answers[q.id] ?? null} mode="review" />
          <div className="takeaway" style={{ marginTop: 10 }}><strong>💡 In one line:</strong> {renderInline(q.takeaway)}</div>
          <a className="source" href={q.source.url} target="_blank" rel="noreferrer">📎 Source: {q.source.title}</a>
        </div>
      ))}
    </Screen>
  );
}
```

`src/features/mock/HistoryPage.tsx`:
```tsx
import { Link } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { scoreMock } from '../../study/mockExam';
import { IconChevron } from '../../ui/icons';
import { Screen } from '../../ui/Screen';
import './mock.css';

export function HistoryPage() {
  const { questionById, domains } = useContent();
  const { mockSessions } = useProgress();
  const done = mockSessions.filter((s) => s.submittedAt).sort((a, b) => b.submittedAt! - a.submittedAt!);
  const scores = done.map((s) => scoreMock(s, questionById, domains).scaledScore);

  return (
    <Screen title="History" back="/practice">
      {done.length === 0 && <p className="empty">No mock exams yet. Your scores will appear here.</p>}
      {done.map((s, i) => {
        const delta = i + 1 < scores.length ? scores[i] - scores[i + 1] : null;
        return (
          <Link key={s.id} className="panel panel-link" to={`/practice/mock/${s.id}/results`}>
            <span className="grow">
              <strong>Mock exam · {new Date(s.submittedAt!).toLocaleDateString()}</strong>
              <span className="muted"> {scores[i]} / 1000{delta !== null ? ` · ${delta >= 0 ? '+' : ''}${delta}` : ''}</span>
            </span>
            <span className="chev"><IconChevron /></span>
          </Link>
        );
      })}
    </Screen>
  );
}
```

`src/features/mock/mock.css`:
```css
.rules { margin: 0; padding-left: 18px; color: var(--text-2); font-size: 14px; }
.rules li { margin: 4px 0; }
.timer { display: inline-flex; align-items: center; gap: 5px; font-weight: 750; font-variant-numeric: tabular-nums; color: var(--text-2); }
.timer svg { width: 16px; height: 16px; }
.timer.low { color: var(--error-text); }
.mock-tools { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.mock-nav { display: flex; gap: 8px; margin-top: 16px; }
.mock-nav .btn { flex: 1; margin-top: 0; }
.navgrid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin: 8px 0 14px; }
.navcell {
  position: relative; aspect-ratio: 1; min-height: 40px; border: 1px solid var(--border); border-radius: 9px;
  background: var(--surface); color: var(--muted); font-size: 12px; font-weight: 750; cursor: pointer;
}
.navcell.answered { border-color: #3a3366; background: var(--accent-soft); color: var(--accent-text); }
.navcell.current { outline: 2px solid var(--accent); }
.navcell.flagged::after { content: ''; position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; border-radius: 50%; background: var(--warning); }
.result-score { font-size: 52px; font-weight: 800; letter-spacing: -1px; }
.result-pass { color: var(--success-text); }
.result-fail { color: var(--error-text); }
.review-head { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; }
.review-head h3 { margin: 0; }
```

In `src/app/App.tsx` import the four pages from `../features/mock/…` and add at the routes marker:
```tsx
          <Route path="/practice/mock" element={<MockIntroPage />} />
          <Route path="/practice/mock/:sessionId" element={<MockExamPage />} />
          <Route path="/practice/mock/:sessionId/results" element={<MockResultsPage />} />
          <Route path="/practice/history" element={<HistoryPage />} />
```

- [ ] **Step 3: Run tests** — `npm test` → PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: timed, resumable mock exam with results and history" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 15: Learn tab — domains, sub-skills, lessons, check-yourself

**Files:**
- Modify (replace entirely): `src/features/learn/LearnPage.tsx`
- Create: `src/features/learn/DomainPage.tsx`, `src/features/learn/LessonPage.tsx`, `src/features/learn/LessonCheckPage.tsx`, `src/features/learn/learn.css`
- Modify: `src/app/App.tsx` (routes)
- Test: `src/features/learn/learn.test.tsx`

**Interfaces:**
- Consumes: `useContent`, `useProgress().lessonsDone/markLessonDone` (Task 9); `Paragraphs`, `renderInline`, `DiagramView`, `Meter`, `Screen` (Task 9); `QuestionRunner`, `SessionSummary` (Task 10).
- Produces: routes `/learn/:domainId`, `/learn/lesson/:lessonId`, `/learn/lesson/:lessonId/check` (full-screen).

- [ ] **Step 1: Failing tests** — `src/features/learn/learn.test.tsx`:
```tsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithApp } from '../../../tests/renderWithApp';
import { DomainPage } from './DomainPage';
import { LearnPage } from './LearnPage';
import { LessonCheckPage } from './LessonCheckPage';
import { LessonPage } from './LessonPage';

describe('LearnPage', () => {
  it('lists domains by weight with lesson progress', async () => {
    await renderWithApp(<LearnPage />, { route: '/learn', path: '/learn' });
    const link = await screen.findByRole('link', { name: /Alpha Domain/ });
    expect(link).toHaveAttribute('href', '/learn/alpha');
    expect(link).toHaveTextContent('60% of exam · 0 of 1 lessons done');
  });
});

describe('DomainPage', () => {
  it('shows sub-skills with their lessons', async () => {
    await renderWithApp(<DomainPage />, { route: '/learn/alpha', path: '/learn/:domainId' });
    expect(await screen.findByText(/Alpha One/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Alpha lesson/ })).toHaveAttribute('href', '/learn/lesson/l-alpha');
  });
  it('marks unofficial sub-skill maps and missing lessons', async () => {
    await renderWithApp(<DomainPage />, { route: '/learn/beta', path: '/learn/:domainId' });
    expect(await screen.findByText(/unofficial until the official exam guide/)).toBeInTheDocument();
    expect(screen.getByText('Lesson coming in the content update.')).toBeInTheDocument();
  });
});

describe('LessonPage', () => {
  it('renders summary, key points, sections with inline marks, sources and the check link', async () => {
    await renderWithApp(<LessonPage />, { route: '/learn/lesson/l-alpha', path: '/learn/lesson/:lessonId' });
    expect(await screen.findByRole('heading', { name: 'Alpha lesson' })).toBeInTheDocument();
    expect(screen.getByText('Alpha summary')).toBeInTheDocument();
    expect(screen.getByText('Point two')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'First section' })).toBeInTheDocument();
    expect(screen.getByText('bold').tagName).toBe('STRONG');
    expect(screen.getByRole('link', { name: /Example doc/ })).toHaveAttribute('href', 'https://example.com/docs');
    expect(screen.getByRole('link', { name: /Check yourself/ })).toHaveAttribute('href', '/learn/lesson/l-alpha/check');
  });
});

describe('LessonCheckPage', () => {
  it('runs the three check questions and marks the lesson done', async () => {
    const { db } = await renderWithApp(<LessonCheckPage />, { route: '/learn/lesson/l-alpha/check', path: '/learn/lesson/:lessonId/check' });
    for (const id of ['q-alpha-1', 'q-alpha-2', 'q-alpha-3']) {
      await userEvent.click(await screen.findByRole('button', { name: new RegExp(`Right answer ${id}`) }));
      await userEvent.click(await screen.findByRole('button', { name: id === 'q-alpha-3' ? 'Finish' : 'Continue' }));
    }
    expect(await screen.findByText('3 / 3')).toBeInTheDocument();
    await waitFor(async () => expect(await db.getLessonsDone()).toMatchObject([{ lessonId: 'l-alpha' }]));
  });
});
```

Run: `npx vitest run src/features/learn` — Expected: FAIL.

- [ ] **Step 2: Implement**

`src/features/learn/LearnPage.tsx` (replace):
```tsx
import { Link } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { IconChevron } from '../../ui/icons';
import { Meter } from '../../ui/Meter';
import { Screen } from '../../ui/Screen';
import './learn.css';

export function LearnPage() {
  const { domains, lessons } = useContent();
  const { lessonsDone } = useProgress();
  const ordered = [...domains].sort((a, b) => b.weight - a.weight);
  return (
    <Screen title="Learn">
      <p className="muted">Eight exam domains, biggest first. Each lesson ends with three check-yourself questions.</p>
      {ordered.map((d) => {
        const inDomain = lessons.filter((l) => l.domainId === d.id);
        const done = inDomain.filter((l) => lessonsDone.has(l.id)).length;
        return (
          <Link key={d.id} className="panel panel-link" to={`/learn/${d.id}`}>
            <span className="grow">
              <strong>{d.name}</strong>
              <span className="muted d-block">{Math.round(d.weight)}% of exam · {done} of {inDomain.length} lessons done</span>
              <Meter value={inDomain.length ? done / inDomain.length : 0} label={`${d.name} lessons completed`} />
            </span>
            <span className="chev"><IconChevron /></span>
          </Link>
        );
      })}
    </Screen>
  );
}
```

`src/features/learn/DomainPage.tsx`:
```tsx
import { Link, useParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { IconChevron } from '../../ui/icons';
import { Screen } from '../../ui/Screen';
import './learn.css';

export function DomainPage() {
  const { domainId = '' } = useParams();
  const { domainById, lessons } = useContent();
  const { lessonsDone } = useProgress();
  const domain = domainById.get(domainId);
  if (!domain) return <Screen title="Learn" back="/learn"><p className="empty">Domain not found.</p></Screen>;
  const unofficial = domain.subSkills.some((s) => !s.official);

  return (
    <Screen title={domain.shortName} back="/learn">
      <p className="muted">{domain.name} · {domain.weight}% of the exam</p>
      {unofficial && <p className="banner">This sub-skill breakdown is unofficial until the official exam guide is added.</p>}
      {domain.subSkills.map((s) => {
        const list = lessons.filter((l) => l.subSkillId === s.id && l.domainId === domain.id);
        return (
          <section key={s.id} className="panel">
            <h3>{s.name}{s.weight ? <span className="muted"> · {s.weight}%</span> : null}</h3>
            {list.length === 0 && <p className="muted">Lesson coming in the content update.</p>}
            {list.map((l) => (
              <Link key={l.id} className="sheet-row" to={`/learn/lesson/${l.id}`}>
                <span>{l.title} {lessonsDone.has(l.id) && <span className="badge">Done</span>}</span>
                <span className="chev"><IconChevron /></span>
              </Link>
            ))}
          </section>
        );
      })}
    </Screen>
  );
}
```

`src/features/learn/LessonPage.tsx`:
```tsx
import { Link, useParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { DiagramView } from '../../ui/Diagram';
import { Paragraphs, renderInline } from '../../ui/inline';
import { Screen } from '../../ui/Screen';
import './learn.css';

export function LessonPage() {
  const { lessonId = '' } = useParams();
  const { lessonById } = useContent();
  const { lessonsDone } = useProgress();
  const lesson = lessonById.get(lessonId);
  if (!lesson) return <Screen title="Lesson" back="/learn"><p className="empty">Lesson not found.</p></Screen>;

  return (
    <Screen back={`/learn/${lesson.domainId}`} className="lesson">
      <h1 className="lesson-title">{lesson.title}</h1>
      {lessonsDone.has(lesson.id) && <span className="badge">Done</span>}
      <p className="lesson-summary">{renderInline(lesson.summary)}</p>
      <section className="panel">
        <h3>Key points</h3>
        <ul className="key-points">{lesson.keyPoints.map((k, i) => <li key={i}>{renderInline(k)}</li>)}</ul>
      </section>
      {lesson.sections.map((s, i) => (
        <section key={i} className="lesson-section">
          <h2>{s.heading}</h2>
          <Paragraphs text={s.body} />
          {s.diagram && <DiagramView diagram={s.diagram} />}
        </section>
      ))}
      <section className="lesson-sources">
        <h3>Sources</h3>
        {lesson.sources.map((src) => (
          <a key={src.url} className="source" href={src.url} target="_blank" rel="noreferrer">📎 {src.title}</a>
        ))}
      </section>
      <Link className="btn btn-primary btn-block" to={`/learn/lesson/${lesson.id}/check`}>Check yourself · 3 questions</Link>
    </Screen>
  );
}
```

`src/features/learn/LessonCheckPage.tsx`:
```tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import type { Question } from '../../content/schema';
import { QuestionRunner, type RunSummary } from '../practice/QuestionRunner';
import { SessionSummary } from '../practice/SessionSummary';

export function LessonCheckPage() {
  const { lessonId = '' } = useParams();
  const navigate = useNavigate();
  const { lessonById, questionById } = useContent();
  const { markLessonDone } = useProgress();
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const lesson = lessonById.get(lessonId);
  const questions = (lesson?.checkQuestionIds ?? []).map((id) => questionById.get(id)).filter((q): q is Question => Boolean(q));
  const back = () => navigate(`/learn/lesson/${lessonId}`);

  if (summary) return <SessionSummary summary={summary} extra="Lesson marked as done." onDone={back} doneLabel="Back to lesson" />;
  return (
    <QuestionRunner questions={questions} mode="lesson" title="Check yourself" onExit={back}
      onFinish={(s) => { void markLessonDone(lessonId); setSummary(s); }} />
  );
}
```

`src/features/learn/learn.css`:
```css
.d-block { display: block; margin: 2px 0 8px; }
.lesson-title { margin: 0 0 6px; font-size: 26px; letter-spacing: -0.4px; }
.lesson-summary { margin: 10px 0; padding: 12px; border-left: 3px solid var(--accent); border-radius: 10px; background: #211d3a; font-size: 15px; }
.key-points { margin: 0; padding-left: 18px; }
.key-points li { margin: 6px 0; }
.lesson-section { margin: 22px 0; }
.lesson-section h2 { margin: 0 0 8px; font-size: 18px; }
.lesson-section p, .lesson-section li { color: var(--text-2); font-size: 15px; line-height: 1.6; }
.lesson-sources h3 { margin: 20px 0 0; font-size: 14px; }
.lesson-sources .source { margin: 6px 0; }
```

In `src/app/App.tsx` import the three new pages and add at the routes marker:
```tsx
          <Route path="/learn/:domainId" element={<DomainPage />} />
          <Route path="/learn/lesson/:lessonId" element={<LessonPage />} />
          <Route path="/learn/lesson/:lessonId/check" element={<LessonCheckPage />} />
```

- [ ] **Step 3: Run tests** — `npm test` → PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: learn tab with domain lessons and check-yourself questions" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 16: Today dashboard, daily session, settings, reminders

**Files:**
- Create: `src/app/reminders.ts`, `src/features/today/HomeBanners.tsx`, `src/features/today/SessionPage.tsx`
- Modify (replace entirely): `src/features/today/TodayPage.tsx`, `src/features/settings/SettingsPage.tsx`
- Modify: `src/ui/ui.css` (append settings styles), `src/app/App.tsx` (route)
- Test: `src/app/reminders.test.ts`, `src/features/today/today.test.tsx`, `src/features/settings/settings.test.tsx`

**Interfaces:**
- Consumes: `readiness`, `PASS_SCORE` (Task 6); `accuracyBy` (Task 6); `buildQueue` (Task 5); `pickWeakQuestions`, `TODAY_QUESTION_COUNT` (Task 6); `CardReviewSession` (Task 12); `QuestionRunner`, `SessionSummary` (Task 10); `backupFileName`, `BackupError`, `serializeBackup` (Task 8); `shareOrDownload` (Task 8); `useProgress().exportBackup/importBackup/updateSettings/toggleFlag` (Task 9).
- Produces: `BACKUP_REMINDER_DAYS = 14`; `firstActivityAt(attempts: Attempt[], states: Map<string, StoredCardState>): number | undefined`; `needsBackupReminder(args: { lastBackupAt?: number; firstActivityAt?: number; now: Date }): boolean`; `isStandalone(win?: Window): boolean`; route `/session` (full-screen).

- [ ] **Step 1: Failing tests**

`src/app/reminders.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { newState, rate } from '../study/scheduler';
import { firstActivityAt, isStandalone, needsBackupReminder } from './reminders';

const DAY = 86_400_000;
const NOW = new Date('2026-09-26T10:00:00');

describe('needsBackupReminder', () => {
  it('stays quiet with no activity', () => expect(needsBackupReminder({ now: NOW })).toBe(false));
  it('reminds 14 days after first activity when never backed up', () => {
    expect(needsBackupReminder({ firstActivityAt: NOW.getTime() - 13 * DAY, now: NOW })).toBe(false);
    expect(needsBackupReminder({ firstActivityAt: NOW.getTime() - 14 * DAY, now: NOW })).toBe(true);
  });
  it('counts from the last backup when there is one', () => {
    expect(needsBackupReminder({ lastBackupAt: NOW.getTime() - 2 * DAY, firstActivityAt: 0, now: NOW })).toBe(false);
  });
});

describe('firstActivityAt', () => {
  it('uses the earliest attempt or card review', () => {
    const reviewedAt = new Date(NOW.getTime() - 5 * DAY);
    const s = rate(newState('c-a', 'forward', reviewedAt), 'good', reviewedAt);
    expect(firstActivityAt([{ questionId: 'q', chosen: 'a', correct: true, mode: 'quiz', at: NOW.getTime() }], new Map([[s.key, s]])))
      .toBe(reviewedAt.getTime());
    expect(firstActivityAt([], new Map())).toBeUndefined();
  });
});

describe('isStandalone', () => {
  const win = (standalone: boolean | undefined, displayMode: boolean) =>
    ({ navigator: { standalone }, matchMedia: () => ({ matches: displayMode }) }) as unknown as Window;
  it('detects iOS home-screen mode and display-mode standalone', () => {
    expect(isStandalone(win(true, false))).toBe(true);
    expect(isStandalone(win(undefined, true))).toBe(true);
    expect(isStandalone(win(undefined, false))).toBe(false);
  });
});
```

`src/features/today/today.test.tsx`:
```tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { openTestDb, renderWithApp } from '../../../tests/renderWithApp';
import { fixtureContent } from '../../content/fixtures';
import { SessionPage } from './SessionPage';
import { TodayPage } from './TodayPage';

const NOW = new Date('2026-09-26T10:00:00');
const now = () => NOW;

describe('TodayPage', () => {
  it('shows the locked readiness estimate, cards due and domain rows', async () => {
    await renderWithApp(<TodayPage />, { now, route: '/', path: '/' });
    expect(await screen.findByText(/Answer 40 more questions to unlock/)).toBeInTheDocument();
    expect(screen.getByText(/2 cards due/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Start today's session" })).toHaveAttribute('href', '/session');
    expect(screen.getAllByText('not started')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
  });

  it('shows and dismisses the install hint', async () => {
    const { db } = await renderWithApp(<TodayPage />, { now, route: '/', path: '/' });
    expect(await screen.findByText(/Add Ajada to your Home Screen/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText(/Add Ajada to your Home Screen/)).toBeNull();
    expect(await db.getKv('settings')).toMatchObject({ installHintDismissedAt: NOW.getTime() });
  });

  it('reminds about backups after two weeks of activity', async () => {
    const db = await openTestDb();
    await db.addAttempts([{ questionId: 'q-alpha-1', chosen: 'a', correct: true, mode: 'quiz', at: NOW.getTime() - 20 * 86_400_000 }]);
    await renderWithApp(<TodayPage />, { db, now, route: '/', path: '/' });
    expect(await screen.findByText(/since your last backup/)).toBeInTheDocument();
  });
});

describe('SessionPage', () => {
  it('goes from flashcards to weak-spot questions', async () => {
    await renderWithApp(<SessionPage />, { now, route: '/session', path: '/session', content: { ...fixtureContent(), cards: [] } });
    await userEvent.click(await screen.findByRole('button', { name: 'Continue to questions' }));
    expect(await screen.findByText('Today · 1 / 4')).toBeInTheDocument();
  });
});
```

`src/features/settings/settings.test.tsx`:
```tsx
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { openTestDb, renderWithApp } from '../../../tests/renderWithApp';
import { serializeBackup } from '../../storage/backup';
import { SettingsPage } from './SettingsPage';

vi.mock('../../storage/share', () => ({ shareOrDownload: vi.fn(async () => {}) }));

const NOW = new Date('2026-09-26T10:00:00');
const now = () => NOW;
const open = (db?: Awaited<ReturnType<typeof openTestDb>>) =>
  renderWithApp(<SettingsPage />, { db, now, route: '/settings', path: '/settings' });

describe('SettingsPage', () => {
  it('adjusts new cards per day in steps of 5', async () => {
    const { db } = await open();
    await userEvent.click(await screen.findByRole('button', { name: 'More new cards' }));
    expect(screen.getByLabelText('New cards per day')).toHaveTextContent('20');
    expect(await db.getKv('settings')).toMatchObject({ newCardsPerDay: 20 });
  });

  it('exports a backup and records when', async () => {
    const { shareOrDownload } = await import('../../storage/share');
    await open();
    await userEvent.click(await screen.findByRole('button', { name: 'Export backup' }));
    expect(await screen.findByText('Backup created.')).toBeInTheDocument();
    expect(shareOrDownload).toHaveBeenCalledWith(expect.stringContaining('"app":"ajada-learning"'), 'ajada-backup-2026-09-26.json');
    expect(screen.getByText(/Last backup:/)).toBeInTheDocument();
  });

  it('imports a backup after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { db } = await open();
    const text = serializeBackup({
      cardStates: [], mockSessions: [], lessonsDone: [], flags: [], kv: [],
      attempts: [{ id: 1, questionId: 'q-alpha-1', chosen: 'a', correct: true, mode: 'quiz', at: 1 }],
    }, NOW);
    fireEvent.change(await screen.findByTestId('import-input'), { target: { files: [new File([text], 'b.json', { type: 'application/json' })] } });
    expect(await screen.findByText('Backup restored.')).toBeInTheDocument();
    await waitFor(async () => expect(await db.getAttempts()).toHaveLength(1));
  });

  it('lists flagged items and can unflag them', async () => {
    const db = await openTestDb();
    await db.putFlag({ itemId: 'q-alpha-2', kind: 'question', at: 1 });
    await open(db);
    expect(await screen.findByText('Stem for q-alpha-2?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Unflag' }));
    expect(await screen.findByText(/Tap 🚩 on any question or card/)).toBeInTheDocument();
  });
});
```

Run: `npx vitest run src/app/reminders.test.ts src/features/today src/features/settings` — Expected: FAIL.

- [ ] **Step 2: Implement**

`src/app/reminders.ts`:
```ts
import type { Attempt, StoredCardState } from '../study/types';

export const BACKUP_REMINDER_DAYS = 14;

export function firstActivityAt(attempts: Attempt[], states: Map<string, StoredCardState>): number | undefined {
  let min = Infinity;
  for (const a of attempts) min = Math.min(min, a.at);
  for (const s of states.values()) if (s.fsrs.last_review) min = Math.min(min, new Date(s.fsrs.last_review).getTime());
  return min === Infinity ? undefined : min;
}

export function needsBackupReminder(args: { lastBackupAt?: number; firstActivityAt?: number; now: Date }): boolean {
  const reference = args.lastBackupAt ?? args.firstActivityAt;
  if (reference === undefined) return false;
  return args.now.getTime() - reference >= BACKUP_REMINDER_DAYS * 86_400_000;
}

export function isStandalone(win: Window = window): boolean {
  const nav = win.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || win.matchMedia?.('(display-mode: standalone)').matches === true;
}
```

`src/features/today/HomeBanners.tsx`:
```tsx
import { Link } from 'react-router-dom';
import { useClock } from '../../app/clock';
import { useProgress } from '../../app/ProgressProvider';
import { firstActivityAt, isStandalone, needsBackupReminder } from '../../app/reminders';

export function HomeBanners() {
  const { settings, attempts, cardStates, updateSettings } = useProgress();
  const { now } = useClock();
  const showInstall = !isStandalone() && settings.installHintDismissedAt === undefined;
  const showBackup = needsBackupReminder({ lastBackupAt: settings.lastBackupAt, firstActivityAt: firstActivityAt(attempts, cardStates), now: now() });
  return (
    <>
      {showInstall && (
        <div className="banner" role="note">
          <span className="grow">📲 Add Ajada to your Home Screen so it works offline and iOS keeps your progress: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.</span>
          <button type="button" className="btn btn-ghost" onClick={() => void updateSettings({ installHintDismissedAt: now().getTime() })}>Dismiss</button>
        </div>
      )}
      {showBackup && (
        <div className="banner" role="note">
          <span className="grow">💾 It's been a while since your last backup. Your progress lives only on this phone.</span>
          <Link className="btn btn-ghost" to="/settings">Back up</Link>
        </div>
      )}
    </>
  );
}
```

`src/features/today/TodayPage.tsx` (replace):
```tsx
import { Link } from 'react-router-dom';
import { useClock } from '../../app/clock';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { accuracyBy } from '../../study/accuracy';
import { PASS_SCORE, readiness } from '../../study/readiness';
import { buildQueue } from '../../study/scheduler';
import { TODAY_QUESTION_COUNT } from '../../study/weakSpots';
import { IconGear } from '../../ui/icons';
import { Meter } from '../../ui/Meter';
import { ProgressBar } from '../../ui/ProgressBar';
import { Screen } from '../../ui/Screen';
import { HomeBanners } from './HomeBanners';

export function TodayPage() {
  const { domains, cards, questionById } = useContent();
  const p = useProgress();
  const { now } = useClock();
  const r = readiness(domains, p.attempts, questionById);
  const due = buildQueue({
    cardIds: cards.map((c) => c.id), states: p.cardStates, mode: p.settings.cardDirection, now: now(),
    newPerDay: p.settings.newCardsPerDay, rng: () => 0,
  }).length;
  const byDomain = accuracyBy(p.attempts, questionById, 'domainId');
  const ordered = [...domains].sort((a, b) => b.weight - a.weight);
  const remaining = r.available ? 0 : r.needed - r.answered;

  return (
    <Screen title="Today" action={<Link to="/settings" className="icon-btn" aria-label="Settings"><IconGear /></Link>}>
      <HomeBanners />
      <section className="panel" aria-label="Exam readiness">
        {r.available ? (
          <>
            <div className="muted">Exam readiness · estimate</div>
            <div className="big-num">{r.percent}%</div>
            <div className="muted">Predicted score ≈ {r.score} / 1000 · pass is {PASS_SCORE}</div>
          </>
        ) : (
          <>
            <div className="muted">Exam readiness</div>
            <p>Answer {remaining} more question{remaining === 1 ? '' : 's'} to unlock your readiness estimate.</p>
            <ProgressBar value={r.answered / r.needed} label="Progress toward a readiness estimate" />
          </>
        )}
      </section>
      <section className="panel">
        <h2>Today's session</h2>
        <p className="muted">{due} card{due === 1 ? '' : 's'} due · {TODAY_QUESTION_COUNT} questions from your weakest areas · about 15 min</p>
        <Link className="btn btn-primary btn-block" to="/session">Start today's session</Link>
      </section>
      <section className="panel">
        <div className="muted">By domain (exam weight)</div>
        {ordered.map((d) => {
          const s = byDomain.get(d.id);
          return (
            <div key={d.id} className="domain-row">
              <span>{d.shortName} <span className="muted">{Math.round(d.weight)}%</span></span>
              <span className="muted">{s?.accuracy == null ? 'not started' : `${Math.round(s.accuracy * 100)}%`}</span>
              <Meter value={s?.accuracy ?? null} label={`${d.name} accuracy`} />
            </div>
          );
        })}
      </section>
    </Screen>
  );
}
```

`src/features/today/SessionPage.tsx`:
```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { pickWeakQuestions, TODAY_QUESTION_COUNT } from '../../study/weakSpots';
import { CardReviewSession } from '../cards/CardReviewSession';
import '../practice/practice.css';
import { QuestionRunner, type RunSummary } from '../practice/QuestionRunner';
import { SessionSummary } from '../practice/SessionSummary';

export function SessionPage() {
  const navigate = useNavigate();
  const { questions, questionById } = useContent();
  const { attempts, settings } = useProgress();
  const [phase, setPhase] = useState<'cards' | 'questions' | 'done'>('cards');
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [summary, setSummary] = useState<RunSummary>({ correct: 0, total: 0 });
  const [picked] = useState(() => pickWeakQuestions({ attempts, questions, questionById, count: TODAY_QUESTION_COUNT, rng: Math.random }));
  const home = () => navigate('/');

  if (phase === 'cards') {
    return (
      <CardReviewSession mode={settings.cardDirection} onExit={home} doneLabel="Continue to questions"
        onDone={(n) => { setCardsReviewed(n); setPhase('questions'); }} />
    );
  }
  if (phase === 'questions') {
    return (
      <QuestionRunner questions={picked} mode="today" title="Today" onExit={home}
        onFinish={(s) => { setSummary(s); setPhase('done'); }} />
    );
  }
  return <SessionSummary summary={summary} extra={`${cardsReviewed} flashcard review${cardsReviewed === 1 ? '' : 's'} done today.`} onDone={home} />;
}
```

`src/features/settings/SettingsPage.tsx` (replace):
```tsx
import { useRef, useState, type ChangeEvent } from 'react';
import { useClock } from '../../app/clock';
import { useContent } from '../../app/ContentContext';
import { useProgress } from '../../app/ProgressProvider';
import { BackupError, backupFileName } from '../../storage/backup';
import { shareOrDownload } from '../../storage/share';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';

export function SettingsPage() {
  const p = useProgress();
  const { questions, cards, lessons, domains, questionById, cardById } = useContent();
  const { now } = useClock();
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const flagged = [...p.flags.values()].sort((a, b) => b.at - a.at);
  const unofficial = domains.some((d) => d.subSkills.some((s) => !s.official));

  const exportNow = async () => {
    const text = await p.exportBackup();
    await shareOrDownload(text, backupFileName(now()));
    setMessage('Backup created.');
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!window.confirm('Replace all progress on this device with this backup?')) return;
    try {
      await p.importBackup(await file.text());
      setMessage('Backup restored.');
    } catch (err) {
      setMessage(err instanceof BackupError ? err.message : 'Could not read that file.');
    }
  };

  const setNewCards = (n: number) => void p.updateSettings({ newCardsPerDay: Math.min(50, Math.max(5, n)) });

  return (
    <Screen title="Settings" back="/">
      <section className="panel">
        <h3>Flashcards</h3>
        <div className="stepper-row">
          <span>New cards per day</span>
          <div className="stepper">
            <button type="button" className="icon-btn" aria-label="Fewer new cards" onClick={() => setNewCards(p.settings.newCardsPerDay - 5)}>−</button>
            <output aria-label="New cards per day">{p.settings.newCardsPerDay}</output>
            <button type="button" className="icon-btn" aria-label="More new cards" onClick={() => setNewCards(p.settings.newCardsPerDay + 5)}>+</button>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>Backup</h3>
        <p className="muted">
          {p.settings.lastBackupAt ? `Last backup: ${new Date(p.settings.lastBackupAt).toLocaleDateString()}. ` : 'No backup yet. '}
          Your progress lives only on this phone.
        </p>
        <Button block onClick={() => void exportNow()}>Export backup</Button>
        <Button block variant="secondary" onClick={() => fileRef.current?.click()}>Import backup</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden data-testid="import-input" onChange={(e) => void onFile(e)} />
        {message && <p role="status" className="muted">{message}</p>}
      </section>

      <section className="panel">
        <h3>Flagged items ({flagged.length})</h3>
        {flagged.length === 0 ? (
          <p className="muted">Tap 🚩 on any question or card that looks wrong or outdated. It will be listed here so you can report it.</p>
        ) : (
          <ul className="flag-list">
            {flagged.map((f) => (
              <li key={f.itemId}>
                <div className="grow">
                  <code>{f.itemId}</code>
                  <div className="muted">{f.kind === 'question' ? questionById.get(f.itemId)?.stem : cardById.get(f.itemId)?.term}</div>
                </div>
                <button type="button" className="btn btn-ghost" onClick={() => void p.toggleFlag(f.itemId, f.kind)}>Unflag</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h3>Content</h3>
        <p className="muted">
          {questions.length} questions · {cards.length} flashcards · {lessons.length} lessons. Every item links to its official source.
          {unofficial && ' The sub-skill breakdown is unofficial until the official exam guide is added.'}
        </p>
      </section>

      <section className="panel">
        <h3>Install on iPhone</h3>
        <p className="muted">Open this site in Safari, tap Share, then Add to Home Screen. Once installed, Ajada works offline and iOS keeps your progress.</p>
      </section>
    </Screen>
  );
}
```

Append to `src/ui/ui.css`:
```css
.stepper-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.stepper { display: flex; align-items: center; gap: 4px; }
.stepper output { min-width: 32px; text-align: center; font-weight: 800; font-variant-numeric: tabular-nums; }
.stepper .icon-btn { border: 1px solid var(--border); color: var(--text); font-size: 20px; }
.flag-list { margin: 0; padding: 0; list-style: none; }
.flag-list li { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border-soft); }
.flag-list .grow { flex: 1; min-width: 0; }
```

In `src/app/App.tsx` import `SessionPage` and add at the routes marker:
```tsx
          <Route path="/session" element={<SessionPage />} />
```

- [ ] **Step 3: Run tests** — `npm test` → PASS (including the App shell test, whose `link { name: 'Cards' }` lookup is exact and unaffected by the new Today content).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: today dashboard, daily session, settings with backup and flags" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 17: Update banner, end-to-end tests on iPhone viewport, README, final deploy

**Files:**
- Create: `src/pwa/UpdateBanner.tsx`, `playwright.config.ts`, `e2e/flows.spec.ts`, `e2e/offline.spec.ts`, `README.md`
- Modify: `src/app/App.tsx` (render `UpdateBanner`), `src/ui/ui.css` (toast styles), `package.json` (`e2e` script), `.github/workflows/deploy.yml` (e2e step)

**Interfaces:**
- Consumes: `virtual:pwa-register/react` (`useRegisterSW`), the whole app.
- Produces: `UpdateBanner()`; `npm run e2e`.

- [ ] **Step 1: Update banner**

`src/pwa/UpdateBanner.tsx`:
```tsx
import { AnimatePresence, motion } from 'motion/react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { IconClose } from '../ui/icons';
import { spring } from '../ui/motion';

const HOUR = 60 * 60 * 1000;

export function UpdateBanner() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url: string, registration: ServiceWorkerRegistration | undefined) {
      if (registration) setInterval(() => void registration.update(), HOUR);
    },
  });
  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div className="update-toast" role="status" initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }} transition={spring}>
          <span className="grow">Update ready</span>
          <button type="button" className="btn btn-primary" onClick={() => void updateServiceWorker(true)}>Reload</button>
          <button type="button" className="icon-btn" aria-label="Dismiss update" onClick={() => setNeedRefresh(false)}><IconClose /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```
Update the test stub signature to accept options: in `tests/stubs/pwa-register.ts` change `export function useRegisterSW()` to `export function useRegisterSW(_options?: unknown)`.

In `src/app/App.tsx` add `import { UpdateBanner } from '../pwa/UpdateBanner';` and render `<UpdateBanner />` as the last child of `<div className="app">` in `Shell`.

Append to `src/ui/ui.css`:
```css
.update-toast {
  position: fixed; top: calc(var(--safe-top) + 8px); left: 12px; right: 12px; z-index: 40; max-width: 616px; margin: 0 auto;
  display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 14px; border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface-2); box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5); font-weight: 650;
}
.update-toast .grow { flex: 1; }
.update-toast .btn { min-height: 40px; padding: 8px 14px; }
```

Run: `npm test && npm run build` — Expected: PASS; build succeeds.

- [ ] **Step 2: Playwright config and specs**

Install browsers: `npx playwright install webkit chromium`

`package.json` scripts: add `"e2e": "npm run build && playwright test"`.

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:4173/ajada-learning/', trace: 'retain-on-failure' },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/ajada-learning/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 14'] }, testIgnore: /offline/ },
    { name: 'offline-chromium', use: { ...devices['Pixel 7'] }, testMatch: /offline/ },
  ],
});
```

`e2e/flows.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
});

test('answering a question shows every reason and the verdict sheet', async ({ page }) => {
  await page.getByRole('link', { name: 'Practice' }).click();
  await page.getByRole('button', { name: /Quick quiz/ }).click();
  await page.locator('.choice').first().click();
  await expect(page.getByRole('dialog', { name: 'Answer explanation' })).toBeVisible();
  await expect(page.locator('.choice-reason')).toHaveCount(4);
});

test('flashcards flip, swipe and finish', async ({ page }) => {
  await page.goto('./#/cards/review');
  const topTerm = page.locator('.deck-slot .fc[role="button"] .fc-front .fc-main');
  await page.getByRole('button', { name: /Card front/ }).click();
  await expect(page.getByRole('button', { name: /^Good/ })).toBeVisible();
  const before = await topTerm.textContent();
  const box = (await page.getByRole('button', { name: /Card back/ }).boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, y, { steps: 4 });
  await page.mouse.move(box.x + box.width / 2 + 240, y, { steps: 6 });
  await page.mouse.up();
  await expect(topTerm).not.toHaveText(before ?? '');

  for (let i = 0; i < 60; i++) {
    if (await page.getByText('Session complete').isVisible()) break;
    await page.getByRole('button', { name: /Card front/ }).click();
    await page.getByRole('button', { name: /^Easy/ }).click();
  }
  await expect(page.getByText('Session complete')).toBeVisible();
});

test('mock exam resumes after a reload', async ({ page }) => {
  await page.goto('./#/practice/mock');
  await page.getByRole('button', { name: 'Start a new mock exam' }).click();
  await expect(page.getByText(/^Question 1 of/)).toBeVisible();
  await page.locator('.choice').first().click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText(/^Question 2 of/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/^Question 2 of/)).toBeVisible();
  await expect(page.getByRole('button', { name: /All questions \(1\// })).toBeVisible();
});
```

`e2e/offline.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
});
```

Run: `npm run e2e`
Expected: 4 tests pass (3 on `iphone`, 1 on `offline-chromium`). If the swipe gesture is flaky only on WebKit mobile emulation, move that one test into a `test.describe` that uses `test.use({ ...devices['Pixel 7'] })` — keep the assertion.

- [ ] **Step 3: CI runs e2e**

In `.github/workflows/deploy.yml`, after `- run: npm run build` add:
```yaml
      - run: npx playwright install --with-deps webkit chromium
      - run: npx playwright test
```

- [ ] **Step 4: README**

`README.md`:
```markdown
# Ajada Learning

An offline iPhone study app for the **Claude Certified Developer – Foundations (CCDV-F)** exam: lessons, spaced-repetition flashcards, practice questions that explain every answer, and a timed 53-question mock exam. Dark mode only.

**Use it:** open https://aviolette21.github.io/ajada-learning/ in Safari → Share → **Add to Home Screen**. After that it works offline. Progress is stored on the phone; export a backup from Settings now and then.

## Develop

    npm install
    npm run dev        # local dev server
    npm test           # unit + component tests
    npm run validate   # content gate (runs in every build)
    npm run e2e        # Playwright on an iPhone viewport

Pushing to `main` validates, tests, builds and deploys to GitHub Pages.

## Content

Study material lives in `content/<domain-id>/{questions,cards,lessons}.json` and is checked by `src/content/schema.ts`. Every question needs a reason for every choice and a source link; every card needs a source. The sub-skill map in `content/domains.json` is unofficial (except the three sub-skills marked `"official": true`) until the official exam guide is added.

Design spec: `docs/superpowers/specs/2026-09-26-ajada-learning-design.md`.
```

- [ ] **Step 5: Full verification**

Run: `npm test && npm run e2e`
Expected: every unit/component test and all 4 e2e tests pass. Paste the summary lines into the task report.

- [ ] **Step 6: Commit, deploy, verify live**

```bash
git add -A
git commit -m "feat: update banner, iPhone e2e coverage and README" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
git push
gh run watch --exit-status $(gh run list --workflow deploy.yml --limit 1 --json databaseId -q '.[0].databaseId')
curl -s -o /dev/null -w "%{http_code}\n" https://aviolette21.github.io/ajada-learning/
curl -s https://aviolette21.github.io/ajada-learning/manifest.webmanifest | grep -o '"short_name":"Ajada"'
```
Expected: workflow green; `200`; `"short_name":"Ajada"`.

- [ ] **Step 7: Hand-off to the user for on-device check** (manual; the user does this)

Ask the user to open the live URL in Safari on their iPhone, Add to Home Screen, launch from the icon, and confirm: dark full-screen app with no Safari bars; flashcards flip and swipe smoothly; a quiz answer shows the verdict sheet; turning on Airplane Mode and relaunching still works.

---

## Self-Review Notes (plan author)

- **Spec coverage:** §3 screens → Tasks 9, 11, 13–16; §4 verdict sheet → Task 10; §5 flashcards incl. direction toggle and independent per-direction FSRS state → Tasks 5, 12, 13; §6 dark tokens, motion presets, reduced motion, safe areas → Tasks 1, 9; §7 content model + validator → Task 2; §8 scheduler, attempt log, accuracy, weak spots, mock builder/timer/resume, readiness → Tasks 5–7, 14, 16; §9 IndexedDB, export/import, install prompt, 14-day backup reminder → Tasks 8, 16; §10 pipeline (research → draft → independent verification → validator → user spot-check) → Task 3 for the seed set (Plan 2 does the full bank and its 20-item user spot-check; Task 3 Step 6 has the user spot-check all 14 seed questions); §11 structure → File Map; §12 testing → every task + Task 17; §13 deployment + update banner → Tasks 1, 17; §14 out-of-scope items are absent.
- Deviation from spec, deliberate: diagram kinds are `segmented-bar` and `flow` only (spec listed "e.g. … comparison"); `comparison` is deferred until content needs it. Domain objects gain a `shortName` for compact UI labels.
