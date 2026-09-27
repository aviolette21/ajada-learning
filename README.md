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
