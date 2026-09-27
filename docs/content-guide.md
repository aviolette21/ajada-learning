# Ajada Learning content guide

This guide covers everything you need to write, or fact-check, questions, flashcards and lessons for Ajada Learning, the offline CCDV-F study app. If something here conflicts with your memory of how Claude works, the guide wins on format and the fetched official page wins on facts.

Contents:
1. Where content lives
2. The blueprint: domains, sub-skills and targets
3. Rules (verbatim from the plan's Global Constraints)
4. Linking rules
5. Checking for duplicates before you write
6. Exemplars: one question, one card, one lesson
7. Lesson template
8. Diagrams and markup
9. Workflow
10. Where Anthropic's official docs live
11. Fact-checker checklist

---

## 1. Where content lives

```
content/
  domains.json                 # the blueprint: 8 domains, 25 sub-skills (do not edit in content tasks)
  <domain-id>/questions.json   # JSON array of questions
  <domain-id>/cards.json       # JSON array of flashcards
  <domain-id>/lessons.json     # JSON array of lessons (create the file as [] if it does not exist yet)
```

- The folder name must be a domain id, and each item's `domainId` must match its folder.
- Only `questions.json`, `cards.json` and `lessons.json` are allowed in a domain folder. Any other file name fails validation.
- Every item's `subSkillId` must be one of that domain's sub-skills in `domains.json`.
- Append new items to the end of the array. Never reorder, rename or delete existing items.
- The schema (field names, types, limits) is in `src/content/schema.ts`. The cross-reference checks are in `src/content/validate.ts`.

## 2. The blueprint: domains, sub-skills and targets

The sub-skills and weights come from the published CCDV-F blueprint (claudecertificationguide.com/ccdv-f). That site is a **coverage** source only. It tells you which topics exist. It is never the source of an answer.

Targets are in `scripts/content-targets.ts`. Each sub-skill needs that many questions, the same number of cards, and at least one lesson. `npm run content:stats` shows current counts against targets.

| Domain (id) | Sub-skill id | Name | Weight | Target Q = cards |
|---|---|---|---|---|
| Applications and Integration (`apps-integration`, 33.1%) | `requirements` | Understanding Requirements | 3.4 | 5 |
| | `systems-lifecycle` | Systems Life Cycle | 2.8 | 4 |
| | `api-mechanics` | Claude API Mechanics | 6.8 | 11 |
| | `swe-foundations` | Software Engineering Foundations | 7.4 | 11 |
| | `app-design` | Claude Application Design | 8.6 | 13 |
| | `config-management` | Configuration Management | 4.1 | 6 |
| Model Selection and Optimisation (`model-selection`, 16.8%) | `llm-fundamentals` | LLM Fundamentals | 5.2 | 8 |
| | `technical-fundamentals` | Technical Fundamentals | 6.1 | 9 |
| | `model-tradeoffs` | Model Selection and Trade-offs | 2.7 | 4 |
| | `cost-tokens` | Cost and Token Management | 2.8 | 4 |
| Agents and Workflows (`agents-workflows`, 14.7%) | `agent-architecture` | Agent Architecture | 4.5 | 7 |
| | `agent-construction` | Agent Construction with Claude | 5.3 | 8 |
| | `agent-patterns` | Agent Patterns and Frameworks | 4.9 | 7 |
| Prompt and Context Engineering (`prompt-context`, 11.0%) | `context-engineering` | Context Engineering | 3.8 | 6 |
| | `prompt-engineering` | Prompt Engineering | 4.6 | 7 |
| | `output-handling` | Output Handling | 2.6 | 4 |
| Tools and MCPs (`tools-mcp`, 10.6%) | `tool-implementation` | Tool Implementation | 4.4 | 7 |
| | `mcp-server-dev` | MCP Server Development | 2.1 | 3 |
| | `agentic-customisation` | Agentic Customisation | 4.1 | 6 |
| Security and Safety (`security-safety`, 8.1%) | `app-security` | AI Application Security | 3.2 | 4 |
| | `guardrails` | Guardrails and Safe Deployment | 2.3 | 3 |
| | `claude-hooks` | Claude Hooks | 1.0 | 3 |
| | `secrets-keys` | Identity, Secrets, and Key Management | 1.6 | 3 |
| Claude Code (`claude-code`, 3.1%) | `cc-operation` | Claude Code Operation | 3.1 | 6 |
| Eval, Testing, and Debugging (`eval-testing`, 2.6%) | `debugging-errors` | Debugging and Error Handling | 2.6 | 6 |

Totals: 155 questions, 155 cards, at least 25 lessons.

Choose the sub-skill by what the item **tests**, not by which product it mentions. For example, a question about where to place a `cache_control` breakpoint to save money belongs in `cost-tokens`. A question about the request shape of the Messages API belongs in `api-mechanics`.

## 3. Rules (verbatim from the plan's Global Constraints)

These are copied word for word from the plan. They are binding.

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

### What the rules mean in practice

- **One source per question and per card.** Pick the single official page that supports every claim in the item, including every wrong-choice reason. If one page doesn't cover it all, cut the claim or split the item. Lessons may list several `sources`, and every sentence must be supported by at least one of them.
- **Record the final URL.** If a URL redirects (older docs.anthropic.com or docs.claude.com links may redirect to platform.claude.com), record the URL you end up on. Use the page's own title for `title`. Drop tracking parameters. Keep a `#fragment` only if it points to the exact section.
- **`checkedOn`** is an ISO date (`YYYY-MM-DD`): the day you fetched the page.
- **Don't overstate.** Hedge words in the source ("generally", "most models", "up to", "by default") must survive into your text. Do not turn "can" into "always", or "reduces" into "eliminates". Numbers (prices, limits, lifetimes, model names) must be exact, and should be qualified if the source qualifies them. Plan 1's fact-check caught a cache-pricing overstatement. The fix was "0.1× on most models, lower on some newer ones".
- **Wrong choices must be wrong for a reason the source supports.** Each distractor should be a real misconception, such as a neighbouring feature, a plausible-but-wrong parameter, or the right idea applied at the wrong layer. Its `reason` says why it's wrong, citing the source's facts, not only "this is incorrect".
- **Exactly one defensible answer.** Read each distractor as a sceptical expert would. If a distractor is right under some reasonable reading, reword the stem to rule that reading out, or replace the distractor.
- **Scenario-based stems** describe a situation ("Your app...", "A team is...", "An agent keeps...") and ask what to do, what happened, or which option fits. Avoid bare definition recall in questions; flashcards cover recall.
- **Difficulty:** `easy` means one fact directly applied. `medium` means choosing between two plausible neighbours, or applying a rule to a scenario. `hard` means combining two facts, spotting a subtle constraint, or ruling out a near-miss.
- **Takeaway:** one line, starting from the lesson of the question and not repeating the stem. **Mnemonic** is optional and short, and only worth adding when it actually helps recall.
- **Answer-letter balance:** spread correct answers across `a`–`d` as you write, aiming for roughly equal counts. Move the correct choice to a different letter and reorder the choices, but keep the ids `a, b, c, d` in order. The validator fails any domain with 8 or more questions if one letter is over 40%. Check the distribution with:

  ```bash
  node -e 'const fs=require("fs");for(const d of fs.readdirSync("content",{withFileTypes:true}).filter(e=>e.isDirectory())){const f=`content/${d.name}/questions.json`;if(!fs.existsSync(f))continue;const c={a:0,b:0,c:0,d:0};for(const q of JSON.parse(fs.readFileSync(f,"utf8")))c[q.answer]++;console.log(d.name,JSON.stringify(c))}'
  ```

- **Ids:** make the slug describe the item (`q-cache-breakpoint-placement`, `c-stop-reason`, `l-api-basics`). Ids are unique across all content, not just their file. Once an id is committed, it is permanent, because learners' progress is stored against it.
- **Cards:** `term` is the concept name. `definition` says what it is. `whyItMatters` says how it shows up in a scenario or exam question. `example` (optional) is one concrete use. Set `isVocab: true` for terms that belong in the Glossary (named features, parameters, concepts). Use `false` for cards that are rules of thumb rather than vocabulary. Card text must fit a phone screen, which is why the limits are tight.

## 4. Linking rules

- **`lessonId`**: every question sets `lessonId` to the lesson for **its own sub-skill** (for example, every `cost-tokens` question links `l-prompt-caching`, the lesson for that sub-skill). If a sub-skill has more than one lesson, use the one that teaches the question's topic. If the lesson doesn't exist yet, write it in the same task. The validator rejects a `lessonId` that points to a lesson that doesn't exist.
- **`relatedCardIds`**: every question lists **at least 1** card id, preferably cards from the same sub-skill that define the terms the question depends on. Each card id must exist.
- **Lesson `checkQuestionIds`**: exactly **3 distinct** question ids, all from the **same sub-skill** as the lesson. Choose questions the lesson actually teaches you to answer. The validator rejects repeats, questions from another sub-skill and unknown ids. This is why every sub-skill target is at least 3 questions.
- **Backfill the seed items.** When you write a sub-skill's lesson, also set `lessonId` on any existing (seed) questions in that sub-skill that don't have one. Check that their `relatedCardIds` still fit (cards on the question's topic, preferably from the same sub-skill), and fix them in place if not.
- Linked items can go in the same task. Write the cards first, then the questions that reference them, then the lesson that checks three of those questions.

## 5. Checking for duplicates before you write

Before drafting any item, search existing content for its term **and** its topic:

```bash
grep -rni "cache_control" content/          # the exact term / parameter
grep -rni "breakpoint" content/             # the topic, in plain words
grep -rn '"topic"' content/ | sort          # every question topic at a glance
grep -rn '"term"' content/ | sort           # every card term at a glance
```

- If a **card** for the term already exists anywhere, do not write a second card. Link the existing one in `relatedCardIds`. Write a new card for a different term instead.
- If a **question** already tests the same fact in the same way, pick a different angle (a different scenario, a neighbouring misconception, a trade-off) or a different topic.
- Two questions on the same topic are fine when they test different facts, for example cache pricing versus cache lifetime.
- If an existing item is **wrong**, fix it in place, keeping its id, and note the fix in your report. Never delete it or re-add it under a new id.

## 6. Exemplars

These are real seed items. Match their shape, tone and density.

### Question: `q-cache-repeated-system-prompt` (content/model-selection/questions.json)

What makes it good: a concrete scenario, four plausible options that are each a real misconception (streaming, `max_tokens`, batches), a reason for every choice that uses the source's facts, the hedge "0.1× on most models, lower on some newer ones" kept from the source, a one-line takeaway, an optional mnemonic, and a diagram that shows the idea.

```json
{
  "id": "q-cache-repeated-system-prompt",
  "domainId": "model-selection",
  "subSkillId": "cost-tokens",
  "topic": "Prompt caching",
  "stem": "Your app sends the same 20k-token system prompt on every request, followed by a short user message. What cuts cost **and** latency the most?",
  "choices": [
    {
      "id": "a",
      "text": "Enable prompt caching on the system prompt",
      "reason": "The repeated prefix is read from cache: cache reads cost a small fraction of the base input price (0.1× on most models, lower on some newer ones) and processing time drops."
    },
    {
      "id": "b",
      "text": "Stream the response",
      "reason": "Streaming changes how output **arrives**; it doesn't discount the 20k input tokens processed on every request."
    },
    {
      "id": "c",
      "text": "Raise `max_tokens`",
      "reason": "`max_tokens` caps output length only; it has no effect on input cost or speed."
    },
    {
      "id": "d",
      "text": "Send requests through the Message Batches API",
      "reason": "Batches are cheaper but asynchronous (most finish within an hour), so latency goes **up**, not down."
    }
  ],
  "answer": "a",
  "takeaway": "A big prefix that repeats should be **cached**; streaming doesn't make input cheaper.",
  "mnemonic": "Same start, every time? Cache it.",
  "difficulty": "easy",
  "diagram": {
    "kind": "segmented-bar",
    "caption": "Only the new part is processed at full price.",
    "segments": [
      {
        "label": "System prompt · 20k",
        "sublabel": "cached",
        "weight": 3,
        "tone": "success"
      },
      {
        "label": "New message",
        "sublabel": "full price",
        "weight": 1,
        "tone": "neutral"
      }
    ]
  },
  "source": {
    "url": "https://platform.claude.com/docs/en/build-with-claude/prompt-caching",
    "title": "Prompt caching",
    "checkedOn": "2026-09-26"
  },
  "relatedCardIds": [
    "c-prompt-caching",
    "c-cache-control"
  ],
  "lessonId": "l-prompt-caching"
}
```

Field notes:
- `topic` is a short label (2–4 words) shown in the app. Reuse an existing topic label when the question is about the same topic.
- `choices` must have exactly 4 entries with ids `a`, `b`, `c`, `d` in that order. `answer` is one of those ids.
- `relatedCardIds` and `lessonId` follow section 4.

### Card: `c-cache-control` (content/model-selection/cards.json)

What makes it good: the definition says precisely what the thing is, `whyItMatters` points at how it's tested, and the example is one concrete use. Everything fits the limits and uses no more than 2 code spans in the definition (this one uses none).

```json
{
  "id": "c-cache-control",
  "domainId": "model-selection",
  "subSkillId": "cost-tokens",
  "term": "cache_control",
  "definition": "A content-block field marking a cache breakpoint: the prompt (tools, system, then messages) up to and including that block becomes the cacheable prefix.",
  "whyItMatters": "Exam scenarios test **where** to put the breakpoint: after the large, stable content and before anything that changes per request.",
  "example": "Put `cache_control` on the last block of a long system prompt; add `\"ttl\": \"1h\"` for the 1-hour lifetime.",
  "source": {
    "url": "https://platform.claude.com/docs/en/build-with-claude/prompt-caching",
    "title": "Prompt caching",
    "checkedOn": "2026-09-26"
  },
  "isVocab": true
}
```

### Lesson: `l-prompt-caching` (content/model-selection/lessons.json)

What makes it good: the summary states the idea in two sentences, the key points are the facts a learner must remember (with exact numbers and the source's hedges), the sections are short paragraphs and `- ` bullets, one section carries a diagram, and the three check questions all come from the lesson's own sub-skill.

```json
{
  "id": "l-prompt-caching",
  "domainId": "model-selection",
  "subSkillId": "cost-tokens",
  "title": "Prompt caching",
  "summary": "Prompt caching lets a request resume from a prefix the API has already processed, so repeated content is cheaper and faster. You mark where the reusable prefix ends with `cache_control`, and the cache lives 5 minutes by default.",
  "keyPoints": [
    "Cache reads cost a small fraction of base input (**0.1×** on most models, lower on some newer ones); 5-minute writes cost 1.25×, 1-hour writes 2×.",
    "The prefix is built in order: `tools` → `system` → `messages`, up to and including the `cache_control` block.",
    "Put static content first and the breakpoint on the **last identical block**, never on content that varies.",
    "Default lifetime is **5 minutes**, refreshed at no cost on every hit; `\"ttl\": \"1h\"` extends it.",
    "Up to **4** breakpoints; each model has a minimum cacheable prompt length."
  ],
  "sections": [
    {
      "heading": "What caching buys you",
      "body": "When a request starts with the same content as a recent one, the API can resume from that cached prefix instead of processing it again. This significantly reduces processing time and cost for prompts with consistent elements, and long documents generally see better time-to-first-token.\n\nPricing is relative to the base input price:\n\n- Cache read: 0.1× on most models (lower on some newer ones, e.g. 0.05× on Claude Opus 5.5)\n- 5-minute cache write: 1.25×\n- 1-hour cache write: 2×",
      "diagram": {
        "kind": "segmented-bar",
        "caption": "A cached prefix is billed at the read rate; only the new part costs full price.",
        "segments": [
          {
            "label": "Cached prefix",
            "sublabel": "cache-read rate",
            "weight": 3,
            "tone": "success"
          },
          {
            "label": "New content",
            "sublabel": "full price",
            "weight": 1,
            "tone": "neutral"
          }
        ]
      }
    },
    {
      "heading": "Placing the breakpoint",
      "body": "Caching covers the whole prompt (`tools`, `system`, then `messages`) up to and including the block marked with `cache_control`. Place static content such as tool definitions, instructions and examples at the beginning.\n\nPut `cache_control` on the last block whose prefix is identical across the requests you want to share a cache. If the prompt ends with something that varies (a timestamp, per-request context, the incoming message), put the breakpoint at the end of the static prefix, not on the varying block.\n\nChanges at one level invalidate that level and everything after it, so editing a tool definition invalidates the cached system prompt and messages too."
    },
    {
      "heading": "Lifetime and limits",
      "body": "By default the cache has a 5-minute lifetime, refreshed at no extra cost each time the cached content is used. If traffic has longer gaps, set `\"ttl\": \"1h\"` on `cache_control` for the 1-hour duration, at a higher write price.\n\nYou can define up to 4 breakpoints, for example to cache sections that change at different rates. Prompts shorter than the model's minimum cacheable length are not cached."
    }
  ],
  "checkQuestionIds": [
    "q-cache-repeated-system-prompt",
    "q-cache-breakpoint-placement",
    "q-cache-lifetime"
  ],
  "sources": [
    {
      "url": "https://platform.claude.com/docs/en/build-with-claude/prompt-caching",
      "title": "Prompt caching",
      "checkedOn": "2026-09-26"
    }
  ]
}
```

## 7. Lesson template

Write one lesson per sub-skill (more only if the sub-skill has clearly separate topics). Aim for a 2–4 minute read.

```json
{
  "id": "l-<slug>",
  "domainId": "<domain-id>",
  "subSkillId": "<sub-skill-id>",
  "title": "<Short title, the topic in 2–5 words>",
  "summary": "<2–3 sentences: what it is, why it matters, the one rule to remember. ≤ 400 chars.>",
  "keyPoints": [
    "<3–5 points, each a single fact to memorise, ≤ 180 chars. Bold the key number or term.>"
  ],
  "sections": [
    {
      "heading": "<≤ 60 chars>",
      "body": "<Short paragraphs separated by a blank line (\\n\\n), or a block of lines starting with \"- \" for a list. ≤ 1400 chars.>",
      "diagram": { "kind": "flow", "caption": "<optional>", "steps": [{ "label": "<step>" }, { "label": "<step>" }] }
    }
  ],
  "checkQuestionIds": ["q-<same-sub-skill-1>", "q-<same-sub-skill-2>", "q-<same-sub-skill-3>"],
  "sources": [{ "url": "https://...", "title": "<page title>", "checkedOn": "YYYY-MM-DD" }]
}
```

- **Summary:** 2–3 sentences.
- **Key points:** 3–5.
- **Sections:** 2–4, each made of short paragraphs or `- ` bullets. Include one diagram where it helps (a process becomes a `flow`, a split of cost, time or tokens becomes a `segmented-bar`). Leave `diagram` out of the other sections.
- **Sources:** every official page the lesson's sentences rely on, each fetched this session.
- **Check questions:** 3 distinct questions from the same sub-skill (section 4).

## 8. Diagrams and markup

**Markup.** Text fields support only `**bold**` and `` `code` ``. Lesson section bodies also support paragraphs (separated by a blank line, `\n\n`) and bullet lists (a block whose lines all start with `- `, one item per line, separated by `\n`). Put a blank line between an intro sentence and its list. Don't use headings, links, tables or numbered lists inside text. A card definition may contain at most 2 code spans. In JSON, escape inner double quotes (`\"ttl\": \"1h\"`).

**Diagrams.** Questions and lesson sections may carry one optional `diagram`. Aim for about 1 diagram per 5 questions, where it genuinely helps. Two kinds exist:

```json
{ "kind": "segmented-bar", "caption": "optional",
  "segments": [ { "label": "Cached prefix", "sublabel": "optional", "weight": 3, "tone": "success" },
                { "label": "New content", "weight": 1, "tone": "neutral" } ] }
```
- `segments`: at least 1. `weight` is a positive number giving relative width. `tone` is one of `success`, `error`, `accent`, `neutral`.

```json
{ "kind": "flow", "caption": "optional",
  "steps": [ { "label": "Send request", "sublabel": "optional" }, { "label": "tool_use" }, { "label": "Run tool" } ] }
```
- `steps`: at least 2, shown in order.

Keep labels short (a few words) so they fit on a phone. A diagram's labels and caption are claims too, so they must be supported by the source.

## 9. Workflow

For each slice (one or more sub-skills):

1. **Plan coverage.** Run `npm run content:stats` to see current counts and gaps. List the topics you'll cover for each sub-skill, using the blueprint for topic ideas.
2. **Fetch the official page first** for each topic (section 10). If you can't find an official page that supports the topic, skip it.
3. **Check for duplicates** (section 5).
4. **Write cards, then questions, then the lesson,** citing the fetched page. Balance answer letters and the difficulty mix as you go.
5. **Validate:** `npm run validate`. Fix every error it prints. It reports the file, the item index and the field (for example `model-selection/questions.json: 4.choices.2.reason: ...`), and it checks lengths, links, lesson checks and answer balance.
6. **Check coverage:** `npm run content:stats`. Your slice's sub-skills should show `n/n` questions and cards and at least 1 lesson. `npm run content:stats -- --check` exits 1 while any sub-skill anywhere has a gap, so it only passes once the whole bank is done.
7. **Self-check every claim against the fetched page.** Go item by item: re-read the stem, every choice and reason, the takeaway, the mnemonic, every card field, every lesson sentence and every diagram label against the page. Confirm the answer key, confirm only one choice is defensible, and confirm the page's hedges and exact numbers are kept. Rewrite or drop anything the page doesn't support.
8. **Run the tests** (`npm test`) and commit as the task brief says.
9. **Report** each item id with its source URL and a short supporting quote from the page, plus the answer-letter distribution per domain.

## 10. Where Anthropic's official docs live

| Area | Where | Notes |
|---|---|---|
| Claude API and platform (Messages API, models, pricing, prompt caching, batches, tool use, structured outputs, prompt engineering, Agent SDK) | `https://platform.claude.com/docs` | Older `docs.anthropic.com` or `docs.claude.com` links may redirect here; record where you land. |
| Claude Code (CLI, settings, memory/CLAUDE.md, hooks, subagents, skills, slash commands, MCP in Claude Code, permissions) | `https://code.claude.com/docs` | |
| Model Context Protocol (spec, servers, clients, transports, primitives) | `https://modelcontextprotocol.io` | Official spec and docs. |
| Engineering and research posts (for example on building agents, context engineering, tool design) | `https://www.anthropic.com/engineering` | News posts under `https://www.anthropic.com/news` are also allowed. |

Redirects are fine. Record the **final URL** after any redirect, along with that page's title. Use the English (`/en/`) pages where the site has them (modelcontextprotocol.io has no `/en/`). Don't cite third-party blogs, prep sites, GitHub READMEs of unofficial projects, or search-result snippets.

## 11. Fact-checker checklist

For every new or changed item, the reviewer:

1. Fetches its source.
2. Confirms the answer key and that exactly one choice is defensible.
3. Confirms every reason, takeaway, mnemonic, card field and lesson sentence is supported by the source.
4. Checks the URL loads and the title matches.
5. Checks the style rules and the limits.
6. Checks the source's domain is on the official allowlist (section 10: platform.claude.com or docs.claude.com, code.claude.com, modelcontextprotocol.io, anthropic.com).
7. Checks `checkedOn` is the session date, the day the page was fetched.
8. Checks `lessonId` and `relatedCardIds` point to the right sub-skill or topic (section 4).
9. Checks for duplicates against existing content (section 5).

For the slice as a whole, the reviewer also checks the answer-letter balance, the difficulty mix (about 30% easy, 50% medium, 20% hard) and the diagram ratio (about 1 per 5 questions).

The output is a per-item table (OK / FIX / DROP, with the problem and a supporting or contradicting quote). Wrong answer keys are Critical. Unsupported or false claims and second defensible answers are Important. Overstated wording is also Important for study content.
