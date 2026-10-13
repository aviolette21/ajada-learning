# Ajada Learning

An offline iPhone study app for the **Claude Certified Developer – Foundations (CCDV-F)** exam, built around practice: a large bank of exam-style questions (including "select TWO" multiple-response items) that explain every option after you answer, timed 53-question mock exams weighted and scored like the real one, and tap-to-define glossary terms in every question. Lessons and spaced-repetition flashcards are there as a supplement. Dark mode only.

**Use it:** open https://aviolette21.github.io/ajada-learning/ in Safari → Share → **Add to Home Screen**. After that it works offline. Progress is stored on the phone; export a backup from Settings now and then.

## Develop

    npm install
    npm run dev        # local dev server
    npm test           # unit + component tests
    npm run validate   # content gate (runs in every build)
    npm run e2e        # Playwright on an iPhone viewport

Pushing to `main` validates, tests, builds and deploys to GitHub Pages.

## Content

Study material lives in `content/<domain-id>/{questions,cards,lessons}.json` plus `content/glossary.json`, and is checked by `src/content/schema.ts`. Every question needs a reason for every choice and a source link; every card and glossary term needs a source. The domains, sub-skills and weights in `content/domains.json` match the official exam guide, summarised in `docs/exam-blueprint.md`. Authoring rules: `docs/content-guide.md`.

Design spec: `docs/superpowers/specs/2026-09-26-ajada-learning-design.md`.
