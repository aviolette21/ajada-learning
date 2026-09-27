# Ajada Learning — Content Bank Implementation Plan (Plan 2 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow the seed set (14 questions, 14 cards, 2 lessons) into the full, fact-checked CCDV-F bank: **155 questions, 155 flashcards and ≥1 lesson for each of the 25 published sub-skills**, mapped to the published sub-skill blueprint, then have the user spot-check it and deploy.

**Architecture:** Content-only work plus a small amount of tooling. Task 1 adopts the published 25-sub-skill blueprint, remaps existing content, and adds guardrails: length limits, lesson-check integrity, an answer-key balance rule, a coverage report, and an authoring guide. Tasks 2–9 each author one slice of the bank from official sources. Each slice is gated by the validator and then by an **independent fact-check review** that WebFetches every cited source. Task 10 is a whole-bank QA sweep. Task 11 is the user spot-check and deploy.

**Tech Stack:** JSON content validated by Zod (`src/content/schema.ts`, `src/content/validate.ts`), `tsx` scripts, Vitest, Playwright (WebKit iPhone 14), GitHub Actions → Pages.

**Spec:** `docs/superpowers/specs/2026-09-26-ajada-learning-design.md` — §7 content model, §10 content pipeline and accuracy. Plan 1 (`docs/superpowers/plans/2026-09-26-ajada-learning-app.md`) built the app.

## Global Constraints

- **Answer sources, official only:** Anthropic docs (platform.claude.com/docs or docs.claude.com), Claude Code docs (code.claude.com/docs), the MCP spec and docs (modelcontextprotocol.io), and Anthropic engineering or news posts (anthropic.com). Third-party prep sites may be used **for topic coverage only**, never as the source of an answer. If an official page supporting a topic can't be found, **skip the topic**. Never invent.
- Every claim in a question, choice reason, takeaway, mnemonic, card field or lesson must be supported by the item's cited `source` (or, for lessons, one of its `sources`), fetched in the same session. `checkedOn` is the date the page was read.
- Source URLs must be `https://` (the validator enforces this).
- **Length limits** are enforced by the validator after Task 1:
  - Question: stem ≤ 320, choice text ≤ 140, reason ≤ 220, takeaway ≤ 170, mnemonic ≤ 100.
  - Card: definition ≤ 160, whyItMatters ≤ 170, example ≤ 120.
  - Lesson: summary ≤ 400, key point ≤ 180, section heading ≤ 60, section body ≤ 1400.
- **Style:**
  - Questions are scenario-based. Each has exactly one defensible answer, 4 plausible choices built from real misconceptions, a reason for every choice, and a one-line takeaway.
  - No "all/none of the above" and no trick wording.
  - Markup is `**bold**` and `` `code` `` only, with at most 2 code spans in a card definition.
  - Difficulty mix per slice: about 30% easy, 50% medium, 20% hard.
  - About 1 diagram per 5 questions (`segmented-bar` or `flow`).
- **Answer-key balance:** in any domain with ≥ 8 questions, no answer letter may exceed 40% of that domain's questions (the validator enforces this after Task 1).
- Ids are permanent and never reused: `q-<slug>`, `c-<slug>`, `l-<slug>` (lowercase, digits, hyphens). **Never rename or delete an existing id.** Fix existing items in place.
- Every question sets `lessonId` to its sub-skill's lesson and `relatedCardIds` to ≥ 1 card, preferably in the same sub-skill.
- **Targets per sub-skill** are in Task 1's `scripts/content-targets.ts`. Card count equals question count for each sub-skill. Totals: 155 questions and 155 cards; lessons are ≥ 1 per sub-skill (25 total, or more).
- Content tasks do **not** push. Only Task 11 deploys. Commit after every task, ending the message with:
  ```
  Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu
  ```
- The user wants **all subagents on Opus** (`model: opus`).
- Work in `C:\Projects\ajada-learning` (Git Bash `/c/Projects/ajada-learning`), branch `main`.

## Review protocol for content tasks (controller)

The task review for Tasks 2–9 is an **independent fact-check**, the same format that caught the cache-pricing overstatement in Plan 1 Task 3. The reviewer loads WebFetch and, for **every** new or changed item:
1. Fetches its source.
2. Confirms the answer key and that exactly one choice is defensible.
3. Confirms every reason, takeaway, mnemonic, card field and lesson sentence is supported by the source.
4. Checks the URL loads and the title matches.
5. Checks the style rules and the limits.

The output is a per-item table (OK / FIX / DROP, with the problem and a supporting or contradicting quote). Wrong answer keys are Critical. Unsupported or false claims and second defensible answers are Important. Overstated wording is also treated as Important for study content (Plan 1 ruling R5).

## File Map

```
content/domains.json                 25 published sub-skills + weights (Task 1)
content/<domain-id>/{questions,cards,lessons}.json   authored in Tasks 2–9
docs/content-guide.md                authoring guide every content implementer reads (Task 1)
scripts/content-targets.ts           per-sub-skill question/card targets (Task 1)
scripts/coverage.ts                  pure coverage computation (Task 1)
scripts/content-stats.ts             CLI: npm run content:stats [-- --check] (Task 1)
src/content/schema.ts                length limits (Task 1)
src/content/validate.ts              lesson-check integrity + answer balance (Task 1)
```

---

### Task 1: Adopt the published blueprint, remap content, add guardrails and the authoring guide

**Files:**
- Modify: `content/domains.json`, every `content/*/questions.json`, `content/*/cards.json` and `content/*/lessons.json` (subSkillId remap only), `src/content/schema.ts`, `src/content/validate.ts`, `src/content/validate.test.ts`, `package.json`
- Create: `scripts/content-targets.ts`, `scripts/coverage.ts`, `scripts/coverage.test.ts`, `scripts/content-stats.ts`, `docs/content-guide.md`

**Interfaces:**
- Produces:
  - `SUBSKILL_TARGETS: Record<string, { domainId: string; questions: number; cards: number }>`, keyed by sub-skill id.
  - `interface CoverageRow { domainId: string; subSkillId: string; questions: number; cards: number; lessons: number; targetQuestions: number; targetCards: number }`.
  - `coverage(content: Content, targets = SUBSKILL_TARGETS): CoverageRow[]`.
  - `coverageGaps(rows: CoverageRow[]): string[]` returns human-readable shortfalls: questions or cards below target, or 0 lessons.
  - `npm run content:stats` prints a table. `-- --check` exits 1 when there are gaps.

- [ ] **Step 1: Replace `content/domains.json`** with the published blueprint. Keep the domain ids, names, shortNames, weights and order exactly as they are now; replace only `subSkills`. All sub-skills are `"official": true`, because they come from the same published blueprint as the domain weights. Each domain's sub-skill weights sum to its domain weight.

| domain id | sub-skill id | name | weight |
|---|---|---|---|
| apps-integration | requirements | Understanding Requirements | 3.4 |
| apps-integration | systems-lifecycle | Systems Life Cycle | 2.8 |
| apps-integration | api-mechanics | Claude API Mechanics | 6.8 |
| apps-integration | swe-foundations | Software Engineering Foundations | 7.4 |
| apps-integration | app-design | Claude Application Design | 8.6 |
| apps-integration | config-management | Configuration Management | 4.1 |
| model-selection | llm-fundamentals | LLM Fundamentals | 5.2 |
| model-selection | technical-fundamentals | Technical Fundamentals | 6.1 |
| model-selection | model-tradeoffs | Model Selection and Trade-offs | 2.7 |
| model-selection | cost-tokens | Cost and Token Management | 2.8 |
| agents-workflows | agent-architecture | Agent Architecture | 4.5 |
| agents-workflows | agent-construction | Agent Construction with Claude | 5.3 |
| agents-workflows | agent-patterns | Agent Patterns and Frameworks | 4.9 |
| prompt-context | context-engineering | Context Engineering | 3.8 |
| prompt-context | prompt-engineering | Prompt Engineering | 4.6 |
| prompt-context | output-handling | Output Handling | 2.6 |
| tools-mcp | tool-implementation | Tool Implementation | 4.4 |
| tools-mcp | mcp-server-dev | MCP Server Development | 2.1 |
| tools-mcp | agentic-customisation | Agentic Customisation | 4.1 |
| security-safety | app-security | AI Application Security | 3.2 |
| security-safety | guardrails | Guardrails and Safe Deployment | 2.3 |
| security-safety | claude-hooks | Claude Hooks | 1.0 |
| security-safety | secrets-keys | Identity, Secrets, and Key Management | 1.6 |
| claude-code | cc-operation | Claude Code Operation | 3.1 |
| eval-testing | debugging-errors | Debugging and Error Handling | 2.6 |

Blueprint source (for coverage only): claudecertificationguide.com/ccdv-f.

- [ ] **Step 2: Remap existing items' `subSkillId`** (ids unchanged):

| old subSkillId | new subSkillId |
|---|---|
| apps-integration: api-mechanics, app-design | unchanged |
| model-selection: prompt-caching, batch-processing | cost-tokens |
| agents-workflows: workflow-patterns | agent-patterns |
| agents-workflows: agent-loops | agent-construction |
| prompt-context: prompt-techniques | prompt-engineering |
| tools-mcp: mcp-servers | mcp-server-dev |
| security-safety: prompt-injection | app-security |
| claude-code: cc-config | cc-operation |
| eval-testing: evals-debugging | debugging-errors |

Apply this to questions, cards and lessons (`l-prompt-caching` → cost-tokens, `l-api-basics` stays api-mechanics). Then run `npm run validate`. Expected: `✓ Content valid: 8 domains, 14 questions, 14 cards, 2 lessons`.

- [ ] **Step 3: Failing validator tests.** Append these to `src/content/validate.test.ts`, inside the existing `describe`:
```ts
  it('rejects questions that exceed length limits', () => {
    const r = mutate((raw) => { raw.files['alpha/questions.json'][0].stem = 'x'.repeat(321); });
    expect(errorText(r)).toMatch(/alpha\/questions\.json: 0\.stem/);
  });

  it('rejects lesson section bodies over 1400 characters', () => {
    const r = mutate((raw) => { raw.files['alpha/lessons.json'][0].sections[0].body = 'x'.repeat(1401); });
    expect(errorText(r)).toMatch(/alpha\/lessons\.json: 0\.sections\.0\.body/);
  });

  it('rejects lesson check questions from another sub-skill or repeated', () => {
    const r = mutate((raw) => {
      raw.domains[0].subSkills.push({ id: 'a2', name: 'Alpha Two', official: false });
      raw.files['alpha/questions.json'][2].subSkillId = 'a2';
      raw.files['alpha/lessons.json'][0].checkQuestionIds = ['q-alpha-1', 'q-alpha-1', 'q-alpha-3'];
    });
    const text = errorText(r);
    expect(text).toMatch(/l-alpha check question "q-alpha-3" is in sub-skill "a2", not "a1"/);
    expect(text).toMatch(/l-alpha repeats check question "q-alpha-1"/);
  });

  it('rejects answer keys skewed to one letter in domains with 8+ questions', () => {
    const r = mutate((raw) => {
      const base = raw.files['alpha/questions.json'][1];
      raw.files['alpha/questions.json'].push(
        ...Array.from({ length: 6 }, (_, i) => ({ ...structuredClone(base), id: `q-alpha-extra-${i}`, lessonId: undefined })),
      );
    });
    expect(errorText(r)).toMatch(/alpha: 9 of 9 questions have answer "a" \(max 40%\)/);
  });
```
Run: `npx vitest run src/content/validate.test.ts`. Expected: FAIL, 4 new failures.

- [ ] **Step 4: Implement the limits and checks.**

In `src/content/schema.ts`, add a helper `const upTo = (n: number) => text.max(n);` and apply it as follows:
- `ChoiceSchema`: `text: upTo(140)`, `reason: upTo(220)`.
- `QuestionSchema`: `stem: upTo(320)`, `takeaway: upTo(170)`, `mnemonic: upTo(100).optional()`.
- `LessonSectionSchema`: `heading: upTo(60)`, `body: upTo(1400)`.
- `LessonSchema`: `summary: upTo(400)`, `keyPoints: z.array(upTo(180)).min(1)`.

Keep the card limits already in place.

In `src/content/validate.ts`:
- Inside the existing `for (const { file, item } of lessons)` loop, add:
```ts
    const seenChecks = new Set<string>();
    for (const id of item.checkQuestionIds) {
      if (seenChecks.has(id)) errors.push(`${file}: ${item.id} repeats check question "${id}"`);
      seenChecks.add(id);
      const q = questions.find((x) => x.item.id === id)?.item;
      if (q && q.subSkillId !== item.subSkillId) {
        errors.push(`${file}: ${item.id} check question "${id}" is in sub-skill "${q.subSkillId}", not "${item.subSkillId}"`);
      }
    }
```
- After the reference checks, add the answer-balance rule:
```ts
  for (const domain of domains) {
    const inDomain = questions.filter((q) => q.item.domainId === domain.id).map((q) => q.item);
    if (inDomain.length < 8) continue;
    for (const letter of ['a', 'b', 'c', 'd'] as const) {
      const n = inDomain.filter((q) => q.answer === letter).length;
      if (n / inDomain.length > 0.4) {
        errors.push(`${domain.id}: ${n} of ${inDomain.length} questions have answer "${letter}" (max 40%)`);
      }
    }
  }
```
Run: `npx vitest run src/content`. Expected: PASS. Then run `npm run validate`, which is still green because the seed domains have fewer than 8 questions.

- [ ] **Step 5: Coverage targets.** Write `scripts/content-targets.ts` exactly as:
```ts
/** Questions per sub-skill ∝ published weight within each domain (largest remainder, min 3 for lesson checks). Cards = questions. */
const Q: Record<string, [domainId: string, questions: number]> = {
  requirements: ['apps-integration', 5],
  'systems-lifecycle': ['apps-integration', 4],
  'api-mechanics': ['apps-integration', 11],
  'swe-foundations': ['apps-integration', 11],
  'app-design': ['apps-integration', 13],
  'config-management': ['apps-integration', 6],
  'llm-fundamentals': ['model-selection', 8],
  'technical-fundamentals': ['model-selection', 9],
  'model-tradeoffs': ['model-selection', 4],
  'cost-tokens': ['model-selection', 4],
  'agent-architecture': ['agents-workflows', 7],
  'agent-construction': ['agents-workflows', 8],
  'agent-patterns': ['agents-workflows', 7],
  'context-engineering': ['prompt-context', 6],
  'prompt-engineering': ['prompt-context', 7],
  'output-handling': ['prompt-context', 4],
  'tool-implementation': ['tools-mcp', 7],
  'mcp-server-dev': ['tools-mcp', 3],
  'agentic-customisation': ['tools-mcp', 6],
  'app-security': ['security-safety', 4],
  guardrails: ['security-safety', 3],
  'claude-hooks': ['security-safety', 3],
  'secrets-keys': ['security-safety', 3],
  'cc-operation': ['claude-code', 6],
  'debugging-errors': ['eval-testing', 6],
};

export const SUBSKILL_TARGETS: Record<string, { domainId: string; questions: number; cards: number }> =
  Object.fromEntries(Object.entries(Q).map(([id, [domainId, n]]) => [id, { domainId, questions: n, cards: n }]));
```
(Totals: 155 questions, 155 cards. Security & Safety is 13 instead of the spec's approximate 12 because each of its 4 sub-skills needs ≥ 3 questions for its lesson check.)

- [ ] **Step 6: Coverage function, failing test first.** `scripts/coverage.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { fixtureContent } from '../src/content/fixtures';
import { coverage, coverageGaps } from './coverage';

const targets = {
  a1: { domainId: 'alpha', questions: 3, cards: 2 },
  b1: { domainId: 'beta', questions: 2, cards: 1 },
};

describe('coverage', () => {
  it('counts items per sub-skill against targets', () => {
    expect(coverage(fixtureContent(), targets)).toEqual([
      { domainId: 'alpha', subSkillId: 'a1', questions: 3, cards: 1, lessons: 1, targetQuestions: 3, targetCards: 2 },
      { domainId: 'beta', subSkillId: 'b1', questions: 1, cards: 1, lessons: 0, targetQuestions: 2, targetCards: 1 },
    ]);
  });
  it('lists every shortfall', () => {
    expect(coverageGaps(coverage(fixtureContent(), targets))).toEqual([
      'alpha/a1: cards 1/2',
      'beta/b1: questions 1/2',
      'beta/b1: no lesson',
    ]);
  });
});
```
Run: `npx vitest run scripts/coverage.test.ts`. Expected: FAIL (module missing).

`scripts/coverage.ts`:
```ts
import type { Content } from '../src/content/schema';
import { SUBSKILL_TARGETS } from './content-targets';

export interface CoverageRow {
  domainId: string; subSkillId: string; questions: number; cards: number; lessons: number; targetQuestions: number; targetCards: number;
}

export function coverage(content: Content, targets: Record<string, { domainId: string; questions: number; cards: number }> = SUBSKILL_TARGETS): CoverageRow[] {
  return content.domains.flatMap((d) =>
    d.subSkills.map((s) => {
      const count = (items: { subSkillId: string; domainId: string }[]) => items.filter((i) => i.domainId === d.id && i.subSkillId === s.id).length;
      const t = targets[s.id] ?? { questions: 0, cards: 0 };
      return {
        domainId: d.id, subSkillId: s.id,
        questions: count(content.questions), cards: count(content.cards), lessons: count(content.lessons),
        targetQuestions: t.questions, targetCards: t.cards,
      };
    }),
  );
}

export function coverageGaps(rows: CoverageRow[]): string[] {
  return rows.flatMap((r) => {
    const key = `${r.domainId}/${r.subSkillId}`;
    const out: string[] = [];
    if (r.questions < r.targetQuestions) out.push(`${key}: questions ${r.questions}/${r.targetQuestions}`);
    if (r.cards < r.targetCards) out.push(`${key}: cards ${r.cards}/${r.targetCards}`);
    if (r.lessons === 0) out.push(`${key}: no lesson`);
    return out;
  });
}
```

`scripts/content-stats.ts`:
```ts
import { validateContent } from '../src/content/validate';
import { coverage, coverageGaps } from './coverage';
import { readContentDir } from './read-content';

const result = validateContent(readContentDir('content'));
if (!result.ok) {
  console.error(result.errors.join('\n'));
  process.exit(1);
}
const rows = coverage(result.content);
console.table(rows.map((r) => ({ subSkill: `${r.domainId}/${r.subSkillId}`, q: `${r.questions}/${r.targetQuestions}`, cards: `${r.cards}/${r.targetCards}`, lessons: r.lessons })));
const t = (k: 'questions' | 'cards') => rows.reduce((s, r) => s + r[k], 0);
console.log(`Totals: ${t('questions')} questions, ${t('cards')} cards, ${result.content.lessons.length} lessons`);
const gaps = coverageGaps(rows);
if (process.argv.includes('--check') && gaps.length > 0) {
  console.error(`✗ ${gaps.length} coverage gap(s):\n  - ${gaps.join('\n  - ')}`);
  process.exit(1);
}
```
Add `"content:stats": "tsx scripts/content-stats.ts"` to `package.json` scripts. Run `npx vitest run scripts` (expected: PASS) and `npm run content:stats` (expected: a table showing 14 questions and 14 cards spread across the new sub-skills).

- [ ] **Step 7: Write `docs/content-guide.md`.** This is the one document every content implementer and fact-checker reads. It must contain:
  - the source rules, limits, style, balance and id rules from Global Constraints, copied verbatim;
  - the linking rules: `lessonId` is the sub-skill's lesson; `relatedCardIds` has ≥ 1 card; lesson `checkQuestionIds` are 3 distinct questions from the same sub-skill;
  - how to check for duplicates before writing (search `content/` for the term and topic);
  - one complete exemplar of each type, taken from the existing seed items: `q-cache-repeated-system-prompt`, `c-cache-control` and `l-prompt-caching`;
  - a lesson template: 2–3 sentence summary; 3–5 key points; 2–4 sections of short paragraphs or `- ` bullets, one with a diagram where it helps; sources;
  - the workflow: `npm run validate`, then `npm run content:stats`, then self-check every claim against the fetched page;
  - where Anthropic docs currently live: platform.claude.com/docs (API/platform), code.claude.com/docs (Claude Code), modelcontextprotocol.io (MCP), and anthropic.com/engineering (engineering posts), plus the note that redirects are fine and the final URL is what gets recorded.

- [ ] **Step 8: Update the unofficial-map copy.** `DomainPage` and `SettingsPage` already show the "unofficial" note only when some sub-skill has `official: false`. Now that every sub-skill is official, the note disappears. Run `npm test`. If a test depended on the real content's unofficial flags, update its expectation. The fixture-based tests are unaffected.

- [ ] **Step 9: Verify and commit.**

Run `npm test && npm run typecheck && npm run validate && npm run content:stats`. Expected: all green, and the stats table shows the gaps. (`--check` would fail at this point, which is expected.)
```bash
git add -A
git commit -m "content: adopt published 25-sub-skill blueprint, guardrails, coverage report and authoring guide" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Tasks 2–9: Author the bank, one slice per task

Every content task follows the **same steps**. Only the slice (the table and topics) differs. Each step list is repeated in full so that each task can be read on its own.

**Common interfaces for Tasks 2–9:**
- Consumes: `docs/content-guide.md`, `content/domains.json` (Task 1), the validator and limits (Task 1), `npm run content:stats`.
- Produces: items in `content/<domain>/{questions,cards,lessons}.json` that bring each listed sub-skill to its target.

---

### Task 2: Applications & Integration I: requirements, systems life cycle, configuration management

**Files:** Modify `content/apps-integration/questions.json`, `cards.json` and `lessons.json`.

| sub-skill | questions (have→target) | cards (have→target) | lesson |
|---|---|---|---|
| requirements | 0→5 | 0→5 | new `l-requirements` |
| systems-lifecycle | 0→4 | 0→4 | new `l-systems-lifecycle` |
| config-management | 0→6 | 0→6 | new `l-config-management` |

Topics to cover (coverage only; each must be backed by an official page, and any topic that can't be is skipped):
- **requirements:** translating business requirements into an LLM solution; deciding whether Claude fits a use case; defining specific, measurable success criteria; choosing between approaches by constraints (latency, cost, accuracy).
- **systems-lifecycle:** the develop → evaluate → deploy → monitor loop for LLM apps; model version pinning versus aliases; model deprecations and migration; prompt versioning and regression testing.
- **config-management:** API keys and configuration through environment variables; model ids (snapshot ids versus aliases) as configuration; Claude Code `settings.json` scopes (user, project, local, managed) and precedence; the CLAUDE.md hierarchy versus settings; plugin and MCP configuration files.

- [ ] **Step 1:** Read `docs/content-guide.md` and run `npm run content:stats` to confirm the starting counts in the table above.
- [ ] **Step 2:** Research each topic with WebFetch on official pages only, and record the final URL and title for each.
- [ ] **Step 3:** Author the questions, cards and lessons to the guide. Keep answer letters balanced (≤ 40% any letter across the domain). Include about 1 diagram per 5 questions. Check `content/` first so nothing duplicates an existing item.
- [ ] **Step 4:** Run `npm run validate` and `npm run content:stats`. Expected: valid, and each sub-skill in this task's table at its target with ≥ 1 lesson.
- [ ] **Step 5:** Self-check: re-read every new sentence against its fetched page, then fix or drop anything unsupported. In the report, list each item id with its source URL and a short supporting quote for the correct answer.
- [ ] **Step 6:** Run `npm test` (the bundled-content test must still pass) and commit:
```bash
git add content
git commit -m "content: apps & integration — requirements, life cycle, configuration" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 3: Applications & Integration II: API mechanics, software engineering foundations, application design

**Files:** Modify `content/apps-integration/questions.json`, `cards.json` and `lessons.json`.

| sub-skill | questions | cards | lesson |
|---|---|---|---|
| api-mechanics | 3→11 | 3→11 | has `l-api-basics` |
| swe-foundations | 0→11 | 0→11 | new `l-swe-foundations` |
| app-design | 1→13 | 1→13 | new `l-app-design` |

Topics:
- **api-mechanics:** Messages API request and response shape; alternating user and assistant turns and content blocks; image (vision) inputs; the token counting endpoint; `anthropic-version` and SDK basics; `temperature`, `stop_sequences` and `max_tokens`; stop reasons (already covered, so don't duplicate).
- **swe-foundations:** HTTP error codes and error types (400/401/403/404/413/429/500/529); retries with exponential backoff on 429 and 529; rate limits and response headers; request ids for support; async and concurrent requests through the SDK; streaming event handling and errors mid-stream; idempotent design.
- **app-design:** long context versus retrieval; real-time versus batch; streaming UX; citations; structured outputs; the Files API; choosing workflow patterns for a product; latency reduction techniques.

- [ ] **Step 1:** Read `docs/content-guide.md` and run `npm run content:stats` to confirm the starting counts in the table above.
- [ ] **Step 2:** Research each topic with WebFetch on official pages only, and record the final URL and title for each.
- [ ] **Step 3:** Author the questions, cards and lessons to the guide. Keep answer letters balanced (≤ 40% any letter across the domain). Include about 1 diagram per 5 questions. Check `content/` first so nothing duplicates an existing item; the existing api-mechanics items are the three `q-api-*` questions and the `c-stop-reason`, `c-system-parameter` and `c-max-tokens` cards.
- [ ] **Step 4:** Run `npm run validate` and `npm run content:stats`. Expected: valid, and each sub-skill in this task's table at its target with ≥ 1 lesson.
- [ ] **Step 5:** Self-check: re-read every new sentence against its fetched page, then fix or drop anything unsupported. In the report, list each item id with its source URL and a short supporting quote for the correct answer.
- [ ] **Step 6:** Run `npm test` and commit:
```bash
git add content
git commit -m "content: apps & integration — API mechanics, engineering foundations, app design" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 4: Model Selection & Optimisation

**Files:** Modify `content/model-selection/questions.json`, `cards.json` and `lessons.json`.

| sub-skill | questions | cards | lesson |
|---|---|---|---|
| llm-fundamentals | 0→8 | 0→8 | new `l-llm-fundamentals` |
| technical-fundamentals | 0→9 | 0→9 | new `l-technical-fundamentals` |
| model-tradeoffs | 0→4 | 0→4 | new `l-model-tradeoffs` |
| cost-tokens | 3→4 | 3→4 | has `l-prompt-caching` |

Topics:
- **llm-fundamentals:** tokens; context windows; next-token prediction; sampling and temperature; non-determinism; zero-, one- and few-shot prompting (use the Anthropic glossary and the prompt-engineering pages).
- **technical-fundamentals:** SDK integrations (official SDK languages); REST requests and required headers; streaming over server-sent events; request handling basics.
- **model-tradeoffs:** the current model families and what each is for, taken from the models overview and choosing-a-model pages; extended thinking trade-offs; balancing latency, cost and capability.
- **cost-tokens:** token budgeting, cost estimation, token counting and usage monitoring. Prompt caching and batches are already covered, so add one new angle.

- [ ] **Step 1:** Read `docs/content-guide.md` and run `npm run content:stats` to confirm the starting counts in the table above.
- [ ] **Step 2:** Research each topic with WebFetch on official pages only, and record the final URL and title for each. For model facts (names, capabilities, pricing), cite the current models overview or pricing page and state only what it says.
- [ ] **Step 3:** Author the questions, cards and lessons to the guide. Keep answer letters balanced (≤ 40% any letter across the domain). Include about 1 diagram per 5 questions. Check `content/` first so nothing duplicates an existing item.
- [ ] **Step 4:** Run `npm run validate` and `npm run content:stats`. Expected: valid, and each sub-skill in this task's table at its target with ≥ 1 lesson.
- [ ] **Step 5:** Self-check: re-read every new sentence against its fetched page, then fix or drop anything unsupported. In the report, list each item id with its source URL and a short supporting quote for the correct answer.
- [ ] **Step 6:** Run `npm test` and commit:
```bash
git add content
git commit -m "content: model selection & optimisation" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 5: Agents & Workflows

**Files:** Modify `content/agents-workflows/questions.json`, `cards.json` and `lessons.json`.

| sub-skill | questions | cards | lesson |
|---|---|---|---|
| agent-architecture | 0→7 | 0→7 | new `l-agent-architecture` |
| agent-construction | 1→8 | 1→8 | new `l-agent-construction` |
| agent-patterns | 1→7 | 1→7 | new `l-agent-patterns` |

Topics:
- **agent-architecture:** workflows versus agents (already covered, so don't duplicate); orchestrator and sub-agent hierarchies; multi-agent research systems; memory and context handling for long-running agents; when not to use an agent.
- **agent-construction:** the Claude Agent SDK (what it provides; custom tools; permissions); custom agent loops; stopping conditions (already covered); hooks for deterministic actions; managed agents and hosted deployment (only if official docs describe them).
- **agent-patterns:** prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer (Building effective agents); tool and environment feedback; guidance on frameworks, including Anthropic's advice to start with direct API calls. Name third-party frameworks only if an Anthropic page does.

- [ ] **Step 1:** Read `docs/content-guide.md` and run `npm run content:stats` to confirm the starting counts in the table above.
- [ ] **Step 2:** Research each topic with WebFetch on official pages only, and record the final URL and title for each.
- [ ] **Step 3:** Author the questions, cards and lessons to the guide. Keep answer letters balanced (≤ 40% any letter across the domain). Include about 1 diagram per 5 questions; a flow diagram suits each workflow pattern. Check `content/` first so nothing duplicates an existing item.
- [ ] **Step 4:** Run `npm run validate` and `npm run content:stats`. Expected: valid, and each sub-skill in this task's table at its target with ≥ 1 lesson.
- [ ] **Step 5:** Self-check: re-read every new sentence against its fetched page, then fix or drop anything unsupported. In the report, list each item id with its source URL and a short supporting quote for the correct answer.
- [ ] **Step 6:** Run `npm test` and commit:
```bash
git add content
git commit -m "content: agents & workflows" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 6: Prompt & Context Engineering

**Files:** Modify `content/prompt-context/questions.json`, `cards.json` and `lessons.json`.

| sub-skill | questions | cards | lesson |
|---|---|---|---|
| context-engineering | 0→6 | 0→6 | new `l-context-engineering` |
| prompt-engineering | 1→7 | 1→7 | new `l-prompt-engineering` |
| output-handling | 0→4 | 0→4 | new `l-output-handling` |

Topics:
- **context-engineering:** context window management; context rot and drift; compaction; tool-result clearing and pruning; memory tools; sub-agent context isolation; just-in-time retrieval ("Effective context engineering for AI agents", and the context windows docs).
- **prompt-engineering:** clear and direct instructions; system prompt roles; examples (multishot); chain of thought and thinking; XML tags (already covered, so don't duplicate); prefilling where still supported; iterating on prompts; long-context tips.
- **output-handling:** structured outputs and JSON schema; validating model output; handling refusals and unexpected formats; stop sequences for format control; reducing hallucinations with citations.

- [ ] **Step 1:** Read `docs/content-guide.md` and run `npm run content:stats` to confirm the starting counts in the table above.
- [ ] **Step 2:** Research each topic with WebFetch on official pages only, and record the final URL and title for each.
- [ ] **Step 3:** Author the questions, cards and lessons to the guide. Keep answer letters balanced (≤ 40% any letter across the domain). Include about 1 diagram per 5 questions. Check `content/` first so nothing duplicates an existing item.
- [ ] **Step 4:** Run `npm run validate` and `npm run content:stats`. Expected: valid, and each sub-skill in this task's table at its target with ≥ 1 lesson.
- [ ] **Step 5:** Self-check: re-read every new sentence against its fetched page, then fix or drop anything unsupported. In the report, list each item id with its source URL and a short supporting quote for the correct answer.
- [ ] **Step 6:** Run `npm test` and commit:
```bash
git add content
git commit -m "content: prompt & context engineering" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 7: Tools & MCPs

**Files:** Modify `content/tools-mcp/questions.json`, `cards.json` and `lessons.json`.

| sub-skill | questions | cards | lesson |
|---|---|---|---|
| tool-implementation | 0→7 | 0→7 | new `l-tool-implementation` |
| mcp-server-dev | 1→3 | 1→3 | new `l-mcp-server-dev` |
| agentic-customisation | 0→6 | 0→6 | new `l-agentic-customisation` |

Topics:
- **tool-implementation:** tool definitions (name, description, `input_schema`); writing good tool descriptions; `tool_choice`; parallel tool use; client tools versus server tools; `tool_result` with `is_error`; the tool-use loop (don't duplicate the stop_reason question); approval patterns for risky tools.
- **mcp-server-dev:** building a server with the SDK; transports (stdio versus Streamable HTTP); primitives (already covered, so pick another angle); connecting servers to Claude (Claude Code config, the MCP connector).
- **agentic-customisation:** built-in tools versus custom tools versus MCP; Agent Skills (what they are and progressive disclosure); sub-agents; plugins; choosing an MCP server; the security implications of third-party servers.

- [ ] **Step 1:** Read `docs/content-guide.md` and run `npm run content:stats` to confirm the starting counts in the table above.
- [ ] **Step 2:** Research each topic with WebFetch on official pages only, and record the final URL and title for each.
- [ ] **Step 3:** Author the questions, cards and lessons to the guide. Keep answer letters balanced (≤ 40% any letter across the domain). Include about 1 diagram per 5 questions. Check `content/` first so nothing duplicates an existing item.
- [ ] **Step 4:** Run `npm run validate` and `npm run content:stats`. Expected: valid, and each sub-skill in this task's table at its target with ≥ 1 lesson.
- [ ] **Step 5:** Self-check: re-read every new sentence against its fetched page, then fix or drop anything unsupported. In the report, list each item id with its source URL and a short supporting quote for the correct answer.
- [ ] **Step 6:** Run `npm test` and commit:
```bash
git add content
git commit -m "content: tools & MCPs" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 8: Security & Safety

**Files:** Modify `content/security-safety/questions.json`, `cards.json` and `lessons.json`.

| sub-skill | questions | cards | lesson |
|---|---|---|---|
| app-security | 1→4 | 1→4 | new `l-app-security` |
| guardrails | 0→3 | 0→3 | new `l-guardrails` |
| claude-hooks | 0→3 | 0→3 | new `l-claude-hooks` |
| secrets-keys | 0→3 | 0→3 | new `l-secrets-keys` |

Topics:
- **app-security:** direct versus indirect prompt injection (indirect is already covered); jailbreak mitigation; untrusted input handling; preventing data and prompt leakage; PII handling.
- **guardrails:** layered guardrails (input screening with a lightweight model, output checks); reducing hallucinations; least privilege for tools; keeping Claude in character; responsible deployment.
- **claude-hooks:** Claude Code hook events (PreToolUse, PostToolUse and others); blocking a command through exit codes and JSON output; hooks versus CLAUDE.md for enforcement; the security considerations of hooks.
- **secrets-keys:** API key handling (environment variables, never in client code or repos); workspaces and key scoping; rotation and revocation; admin versus standard keys; Claude Code permission settings for sensitive files.

- [ ] **Step 1:** Read `docs/content-guide.md` and run `npm run content:stats` to confirm the starting counts in the table above.
- [ ] **Step 2:** Research each topic with WebFetch on official pages only, and record the final URL and title for each.
- [ ] **Step 3:** Author the questions, cards and lessons to the guide. Keep answer letters balanced (≤ 40% any letter across the domain, which now has 13 questions). Include about 1 diagram per 5 questions. Check `content/` first so nothing duplicates an existing item.
- [ ] **Step 4:** Run `npm run validate` and `npm run content:stats`. Expected: valid, and each sub-skill in this task's table at its target with ≥ 1 lesson.
- [ ] **Step 5:** Self-check: re-read every new sentence against its fetched page, then fix or drop anything unsupported. In the report, list each item id with its source URL and a short supporting quote for the correct answer.
- [ ] **Step 6:** Run `npm test` and commit:
```bash
git add content
git commit -m "content: security & safety" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 9: Claude Code, and Eval, Testing & Debugging

**Files:** Modify `content/claude-code/*.json` and `content/eval-testing/*.json` (questions, cards, lessons).

| sub-skill | questions | cards | lesson |
|---|---|---|---|
| cc-operation | 1→6 | 1→6 | new `l-cc-operation` |
| debugging-errors | 1→6 | 1→6 | new `l-debugging-errors` |

Topics:
- **cc-operation:** built-in and custom slash commands; skills; sub-agents; memory and the CLAUDE.md hierarchy (one question already exists, so pick new angles); `settings.json` and permission modes; sessions (`--continue` / `--resume`); non-interactive mode (`-p`); `/init`.
- **debugging-errors:** telling integration errors (HTTP 4xx/5xx, overloaded, timeouts) from model-output errors (wrong format, hallucination, refusal); reading request ids and logs; validating structured output; recovery strategies (retry, fallback, re-prompt); building eval sets (already covered, so use a different angle).

- [ ] **Step 1:** Read `docs/content-guide.md` and run `npm run content:stats` to confirm the starting counts in the table above.
- [ ] **Step 2:** Research each topic with WebFetch on official pages only, and record the final URL and title for each.
- [ ] **Step 3:** Author the questions, cards and lessons to the guide. Include about 1 diagram per 5 questions. Check `content/` first so nothing duplicates an existing item.
- [ ] **Step 4:** Run `npm run validate` and `npm run content:stats`. Expected: valid, and each sub-skill in this task's table at its target with ≥ 1 lesson.
- [ ] **Step 5:** Self-check: re-read every new sentence against its fetched page, then fix or drop anything unsupported. In the report, list each item id with its source URL and a short supporting quote for the correct answer.
- [ ] **Step 6:** Run `npm test` and commit:
```bash
git add content
git commit -m "content: Claude Code, and eval/testing/debugging" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K21eTKC8TLFPfT23RxJHCu"
```

---

### Task 10: Whole-bank QA sweep

**Files:** Modify only `content/**`, for fixes. Create a throwaway screenshot script in the scratchpad (not committed).

**Interfaces:**
- Consumes: the full bank from Tasks 2–9, and `npm run content:stats -- --check`.
- Produces: a bank that passes `--check`, has no duplicate or near-duplicate items, and renders cleanly.

- [ ] **Step 1: Coverage gate.** Run `npm run content:stats -- --check`. Expected: exit 0, totals of 155 questions and 155 cards, and ≥ 25 lessons.
- [ ] **Step 2: Duplicate and overlap scan.** For each pair of questions whose stems test the same fact, keep the better one and rewrite the other to test a different fact from its source. Do the same for cards with the same term or definition. List every change in the report.
- [ ] **Step 3: Cross-links.** Every question's `lessonId` must point to its own sub-skill's lesson. Every `relatedCardIds` entry must be topically related; fix any link that was chosen arbitrarily.
- [ ] **Step 4: Rendering sweep.** Run `npm run build && npx vite preview --port 4173` and screenshot in WebKit at iPhone 14 size. Cover 20 random questions after answering (the verdict sheet open), 20 random card backs, and every lesson page. Look at every image and fix any content that renders badly: literal markup, awkward wrapping, or overlong lines.
- [ ] **Step 5: Full verification.** Run `npm test && npm run typecheck && npm run validate && npm run e2e`. Expected: all green. The mock exam now builds a full 53 questions (spot-check `#/practice/mock`).
- [ ] **Step 6:** Commit with the message `content: whole-bank QA fixes`, plus the trailers (skip the commit if nothing changed).

---

### Task 11: User spot-check and deploy

**Files:** Modify `content/**` only for the user's corrections.

- [ ] **Step 1:** Pick 20 random questions, stratified so every domain is represented. Show them to the user as a compact table (id, stem, correct answer, takeaway, source) and ask them to flag anything that looks wrong or unclear. Use the AskUserQuestion tool for the approve / "I have corrections" choice, per the user's preference.
- [ ] **Step 2:** Apply the corrections. Re-run `npm run validate` and `npm test`.
- [ ] **Step 3:** Push and watch the deploy:
```bash
git push
gh run watch --exit-status $(gh run list --workflow deploy.yml --limit 1 --json databaseId -q '.[0].databaseId')
curl -s -o /dev/null -w "%{http_code}\n" https://aviolette21.github.io/ajada-learning/
```
Expected: green run, then `200`.
- [ ] **Step 4:** Tell the user the new totals and that they may need to tap "Update ready → Reload" on their phone.

---

## Self-Review Notes (plan author)

- **Spec coverage:** §10 steps 1–5 map as follows: research, draft and self-check are Tasks 2–9 Steps 2–5; the independent verification is the review protocol; the validator is Task 1 plus each Step 4; the user spot-check is Task 11. The spec's "replace the sub-skill map when the official guide arrives" is advanced by Task 1, using the published blueprint. The v1 allocation of about 154 questions becomes 155; Security & Safety is 13 because each of its sub-skills needs ≥ 3 questions for a lesson check. Cards are ~150, which becomes 155 (equal to questions per sub-skill). Lessons are 1 per sub-skill. The 🚩 flag and `checkedOn` are already in the app.
- **Deliberate deviation:** all sub-skills are marked `official: true` because they come from the same published blueprint as the domain weights. If Anthropic's own exam guide differs later, re-run Task 1 Steps 1–2 against it.
