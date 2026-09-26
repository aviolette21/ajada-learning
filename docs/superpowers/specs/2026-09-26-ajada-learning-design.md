# Ajada Learning — Design Spec

**Date:** 2026-09-26
**Status:** Approved in brainstorming, pending written-spec review

## 1. Purpose

**Ajada Learning** is a personal iPhone study app for the **Claude Certified Developer – Foundations (CCDV-F)** exam. It delivers study-guide lessons, flashcards with spaced repetition, a vocabulary glossary, practice questions with rich explanations, and a timed mock exam. The core goal is *learning*, not just scoring: every answer explains why the right choice is right and why each wrong choice is wrong, in a clean mobile UI.

### Exam facts the app is built around (from public web sources, Sept 2026)

- 53 questions, 120 minutes, proctored via Pearson VUE, scaled score 100–1000, **pass = 720**.
- 8 domains, weighted:

| Domain | Weight |
|---|---|
| Applications and Integration | 33.1% |
| Model Selection and Optimisation | 16.8% |
| Agents and Workflows | 14.7% |
| Prompt and Context Engineering | 11.0% |
| Tools and MCPs | 10.6% |
| Security and Safety | 8.1% |
| Claude Code | 3.1% |
| Eval, Testing, and Debugging | 2.6% |

- The blueprint has 25 weighted sub-skills; only three are publicly named (all in Applications and Integration: Claude Application Design 8.6%, Software Engineering Foundations 7.4%, Claude API Mechanics 6.8%). The remaining sub-skills are derived from public domain descriptions and marked `official: false` until the official exam guide is obtained.

Sources: claudecertificationguide.com (blueprint), k21academy.com, devcompass.ai, pearsonvue.com/us/en/anthropic.html.

## 2. Decisions

| Topic | Decision |
|---|---|
| App name | **Ajada Learning** (home-screen label "Ajada"; PWA `short_name`) |
| Repo | `ajada-learning` on GitHub (account `aviolette21`), public |
| URL | `https://aviolette21.github.io/ajada-learning/` (Vite `base: '/ajada-learning/'`) |
| Platform | iPhone |
| Delivery | Installable offline PWA (Add to Home Screen) |
| Hosting | GitHub Pages, public repo, deployed by GitHub Actions |
| Stack | React + TypeScript + Vite, `vite-plugin-pwa` |
| Theme | **Dark mode only** (no light theme, no toggle) |
| Animation | Motion (formerly Framer Motion) |
| Spaced repetition | `ts-fsrs` (FSRS algorithm) |
| Storage | IndexedDB on device; export/import backup file |
| Live AI | None in v1 — fully offline, all explanations pre-authored |
| Content source | Web research of official Anthropic docs (official exam guide may replace sub-skill map later) |
| v1 content size | ~150 questions, ~150 flashcards, 1 lesson per sub-skill |

## 3. Screens & navigation

Bottom tab bar with four tabs, plus a Settings screen (gear icon on Today).

- **Today** — readiness estimate, "Today's session" CTA (due cards + ~10 questions from weakest sub-skills), per-domain progress meters ordered by exam weight.
- **Learn** — domains → sub-skills → lessons. Each lesson: summary, key points, example and/or diagram, 3 check-yourself questions drawn from the question bank. Progress shown as "n of m lessons done".
- **Practice** — Quick quiz (10 questions, filterable by domain), Weak spots, Mock exam, History (past mock scores and trend).
- **Cards** — due-card review session, direction toggle, browse by domain, vocabulary glossary (searchable list of all flashcard terms).
- **Settings** — new-cards-per-day limit, backup export/import, flagged-items list, content version, install instructions.

Reference mockups: `docs/superpowers/mockups/screens.html`.

## 4. Answer explanation design ("Verdict sheet")

Reference mockup: `docs/superpowers/mockups/explanation-style-v2.html`.

After the user selects an answer in Quick quiz / Weak spots / lesson checks:

1. **Choices annotate in place.** The correct choice turns green with ✅; the user's wrong pick turns red with ❌ and "your answer"; others are muted. **Every choice shows its one-line reason, always visible** (never hidden behind a tap).
2. **Verdict bottom sheet slides up** (thumb zone):
   - Verdict line ("Correct!" / "Not quite — the answer is A").
   - **"In one line" takeaway** card (violet accent).
   - Optional **concept diagram**, only when the question defines one.
   - Collapsible rows: 🧠 Remember it (mnemonic), 🃏 related flashcards (n), 📖 Read the lesson.
   - Source link (📎 Anthropic docs · <page>).
   - Primary **Continue** button.

Mock exam mode suppresses explanations until submission; the post-exam review uses the same annotated-choice layout.

## 5. Flashcards

Reference prototype (interactive): `docs/superpowers/mockups/flashcards.html`. The implementation must match its feel.

- **Card stack**: current card on top; next two visible behind, scaled/offset/faded.
- **Tap to flip**: true 3D Y-axis flip with `backface-visibility: hidden` and a slight spring overshoot.
- **Drag/swipe**: card tilts with drag; "AGAIN" (left, red) / "GOOD" (right, green) stamps fade in proportionally; release past threshold flies the card off with rotation; below threshold springs back. Swipe right = Good, swipe left = Again.
- **Rating bar** (Again / Hard / Good / Easy) slides up **only after the card is flipped**; each button shows its next interval from ts-fsrs.
- **Back of card**: definition, "Why it matters" (exam angle), example, source link.
- **Direction toggle** (segmented control, remembered): **Term → Definition**, **Definition → Term**, **Mixed** (random per card). Each direction has **independent FSRS scheduling state** (like Anki reverse cards).
- Progress bar + "n / total" header; celebratory completion state with next-due summary.
- `prefers-reduced-motion`: flips and flights become near-instant.

## 6. Visual & motion system

- Dark-only palette as design tokens (CSS variables) in `src/ui/tokens.css`. Baseline from mockups: background `#0e0f13`, surface `#16171d`, border `#2a2b35`, text `#e8e8ee`, muted `#8a8a99`, accent violet `#8b7cf6`, success `#2fbf71` on `#10261b`, error `#e05656` on `#2a1414`, warning `#f0c46a`.
- `<meta name="theme-color">` and `color-scheme: dark`; iOS status bar style `black-translucent`; safe-area insets respected.
- Shared motion presets in `src/ui/motion.ts` (spring for sheet/flip, ease for page transitions, tap-scale for buttons) so every screen moves consistently.
- Touch targets ≥ 44px; system font stack (`-apple-system`).

## 7. Content model

All study content lives in `content/` as JSON, validated by Zod schemas in `src/content/schema.ts`. Every item has a **permanent `id`** (never reused) so progress survives content updates.

```
content/
  domains.json                 # domains + sub-skills + weights
  <domain-id>/
    questions.json
    cards.json
    lessons.json
```

**Domain**: `id`, `name`, `weight` (percent), `subSkills[]` (`id`, `name`, `weight?`, `official: boolean`).

**Question**:
- `id`, `domainId`, `subSkillId`, `topic`
- `stem` (scenario text), `choices[4]` (`id` "a"–"d", `text`, `reason` — **required for every choice**)
- `answer` (choice id), `takeaway` (one line), `mnemonic?`, `difficulty` (`easy|medium|hard`)
- `diagram?` (structured, rendered by a small set of diagram components — e.g. segmented-bar, flow, comparison)
- `source` (`url`, `title`, `checkedOn` date) — **required**
- `relatedCardIds[]`, `lessonId?`

**Flashcard**: `id`, `domainId`, `subSkillId`, `term`, `definition`, `whyItMatters`, `example?`, `source` (required), `isVocab: boolean` (vocab cards populate the glossary).

**Lesson**: `id`, `domainId`, `subSkillId`, `title`, `summary`, `keyPoints[]`, `sections[]` (markdown text, optional diagram), `checkQuestionIds[3]`, `sources[]`.

**Validator** (`scripts/validate-content.ts`, run before build and in CI) fails on: schema violations, missing source or any missing choice reason, `answer` not among choices, duplicate ids, dangling references (`relatedCardIds`, `lessonId`, `checkQuestionIds`, `subSkillId`), lessons with fewer than 3 valid check questions.

## 8. Progress, scheduling & scoring

Pure logic lives in `src/study/` (no React), fully unit-tested.

- **Scheduler** (`ts-fsrs` wrapper): state keyed by `(cardId, direction)`. Daily queue = due cards + up to N new cards/day (default 15, configurable). A wrong practice answer marks its `relatedCardIds` as due now (both directions).
- **Attempt log**: every answer stored (`questionId`, `chosen`, `correct`, `mode`, `timestamp`).
- **Accuracy**: per domain and sub-skill, recency-weighted (recent attempts count more).
- **Weak spots**: missed questions not since answered correctly + questions from the lowest-accuracy sub-skills.
- **Mock exam builder**: 53 questions allocated proportionally to domain weight (largest-remainder rounding, ≥1 per domain), random within domain, preferring unseen questions. 120-minute timer, flag-for-review, question navigator, no feedback until submit. **State persisted continuously** so it resumes after the app is closed. Results: overall %, estimated scaled score, per-domain breakdown, full review.
- **Readiness estimate**: Σ(domain accuracy × domain weight) mapped to 100–1000, shown vs. the 720 pass line; labelled "estimate"; hidden until ≥ 40 questions answered.

## 9. Storage & backup

- IndexedDB (via `idb`) stores: FSRS card states, attempt log, mock-exam sessions/results, lesson completion, flags, settings.
- **Export** writes a versioned JSON backup file; **Import** validates and replaces local data (with confirmation).
- iOS caveat: data persists reliably only when installed to the Home Screen. The app shows an install prompt when running in a Safari tab, and a backup reminder every 14 days.

## 10. Content pipeline & accuracy

1. **Research** — per topic, gather facts with URLs from allowed sources only.
2. **Draft** — write items strictly from those facts.
3. **Independent verification** — a separate reviewer pass re-checks each item against its cited source; fix or drop anything unsupported.
4. **Validator** — schema/reference gate.
5. **User spot-check** — a sample of 20 items presented for review before release.

**Allowed answer sources:** Anthropic official documentation (API, models, prompt engineering, tool use, prompt caching, batches, etc.), Claude Code docs, MCP specification/docs (modelcontextprotocol.io), Anthropic engineering posts. Third-party prep sites may inform **topic coverage only**, never answers.

**Question style:** scenario-based; distractors drawn from real misconceptions; no "all of the above"; no trick wording; mixed difficulty.

**v1 allocation (~154 questions):** Applications & Integration 50 · Model Selection 25 · Agents & Workflows 22 · Prompt & Context 17 · Tools & MCPs 16 · Security & Safety 12 · Claude Code 6 · Eval/Testing/Debugging 6 (last two raised to a floor of 6). Flashcards follow the same split (~150). One lesson per sub-skill.

**Ongoing accuracy:** each item stores `checkedOn`; a 🚩 flag button on every question and card records "seems wrong/outdated" locally; flagged items are listed in Settings for the user to report back.

## 11. Code structure

```
content/                 study material (JSON)
scripts/validate-content.ts
src/
  content/   schema.ts, loader.ts
  study/     scheduler.ts, mockExam.ts, readiness.ts, weakSpots.ts, accuracy.ts
  storage/   db.ts, backup.ts
  ui/        tokens.css, motion.ts, Sheet, Card, Button, SegmentedControl, TabBar, diagrams/
  features/  today/, learn/, practice/, cards/, settings/
  app/       App.tsx, routes (HashRouter — works on GitHub Pages without rewrites)
```

## 12. Testing

- **Vitest (unit):** scheduler queue & per-direction state, wrong-answer → card resurfacing, mock-exam allocation (sums to 53, proportional, ≥1/domain), readiness math, weak-spot selection, backup export→import round-trip.
- **Validator tests:** fixtures that must fail (missing reason, bad answer key, dangling ref) and pass.
- **Component tests (React Testing Library):** verdict sheet states, flashcard flip → rating bar reveal, direction toggle.
- **Playwright (iPhone viewport):** answer a question → annotated choices + sheet; complete a flashcard session incl. swipe; start mock exam, reload, resume; offline reload after first visit.

## 13. Deployment

GitHub Actions on push to `main`: validate content → unit/component tests → build → deploy to GitHub Pages. Service worker precaches app + content; on new version the app shows "Update ready — tap to reload". Install: open URL in Safari → Share → Add to Home Screen.

## 14. Out of scope for v1

Live Claude tutor / API calls, accounts or cloud sync, Android-specific work, light theme, content authoring UI, push notifications, native App Store build.
