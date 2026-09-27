import { expect, test, type Page } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Card, Domain } from '../src/content/schema';
import { LONG_TERM } from '../src/features/cards/Flashcard';

// Every card in the bank must fit its face: no clipped lines, nothing wider than the card, and inline code in a real
// monospace stack (WebKit's bare "monospace" default is Courier). Runs on the WebKit iPhone project. CI's Linux WebKit
// falls back to a wider sans than iOS, so leave about a line of slack: check new cards locally with CARD_FONTS=ci.

interface Measure {
  term: string;
  vertical: { name: string; scrollHeight: number; clientHeight: number; more: string | null }[];
  horizontal: string[];
  codeFonts: string[];
}

const TOP = '.deck-slot .fc[role="button"]';

// CARD_FONTS=ci swaps in fonts about as wide as CI's Linux WebKit fallbacks (Verdana text, Courier-width code), so a
// card that fits locally but not in CI fails here too. CI itself never sets it. ui-monospace stays first because
// expectMonoCode requires it; on macOS it resolves to SF Mono (close to Courier width), elsewhere it falls through.
if (process.env.CARD_FONTS === 'ci') {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style');
        style.textContent = `:root { --font: Verdana, sans-serif !important; --font-mono: ui-monospace, 'Courier New', monospace !important; }`;
        document.head.append(style);
      });
    });
  });
}

/** Measures the top card's faces. The back is laid out even while hidden, so no flip is needed. */
function measure(page: Page): Promise<Measure> {
  return page.locator(TOP).evaluate((fc): Measure => {
    const vertical = [...fc.querySelectorAll<HTMLElement>('.fc-front, .fc-scroll')].map((el) => ({
      name: el.className,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      more: el.closest('.fc-back')?.getAttribute('data-more') ?? null,
    }));
    const horizontal: string[] = [];
    for (const face of fc.querySelectorAll<HTMLElement>('.fc-face')) {
      const box = face.getBoundingClientRect();
      if (face.scrollWidth > face.clientWidth + 1) horizontal.push(`${face.className} scrollWidth ${face.scrollWidth} > ${face.clientWidth}`);
      for (const el of face.querySelectorAll<HTMLElement>('*')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        if (r.left < box.left - 1 || r.right > box.right + 1) horizontal.push(`<${el.tagName.toLowerCase()}> "${el.textContent?.slice(0, 40)}" pokes out of ${face.className}`);
        if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) horizontal.push(`<${el.tagName.toLowerCase()}.${el.className}> scrollWidth ${el.scrollWidth} > ${el.clientWidth}`);
      }
    }
    return {
      term: fc.querySelector('.fc-back .fc-term-answer, .fc-front .fc-main')?.textContent ?? '',
      vertical,
      horizontal,
      codeFonts: [...fc.querySelectorAll('code')].map((c) => getComputedStyle(c).fontFamily),
    };
  });
}

/** Rates the top card Easy and waits until a different card is alone on top (or the session ends). */
async function rateEasy(page: Page, term: string) {
  // dispatchEvent skips actionability waits: WebKit keeps an entering card "not stable" for seconds.
  await page.locator(TOP).dispatchEvent('click');
  await page.getByRole('button', { name: /^Easy/ }).dispatchEvent('click');
  await expect.poll(async () => {
    if (await page.getByText('Session complete').isVisible()) return 'done';
    const tops = page.locator(TOP);
    if ((await tops.count()) !== 1) return 'animating';
    return (await measure(page)).term === term ? 'same' : 'next';
  }).toMatch(/done|next/);
}

/** Walks the whole session, measuring each card before rating it Easy. */
async function walkSession(page: Page, mode: RegExp): Promise<Measure[]> {
  await page.goto('./#/cards/review');
  await page.getByRole('radio', { name: mode }).click();
  await expect(page.locator(TOP)).toHaveCount(1);
  const seen: Measure[] = [];
  for (let i = 0; i < 40 && !(await page.getByText('Session complete').isVisible()); i++) {
    const m = await measure(page);
    seen.push(m);
    await rateEasy(page, m.term);
  }
  await expect(page.getByText('Session complete')).toBeVisible();
  return seen;
}

function expectNoHorizontalOverflow(seen: Measure[]) {
  for (const m of seen) expect.soft(m.horizontal, `card "${m.term}"`).toEqual([]);
}

function expectMonoCode(seen: Measure[]) {
  const fonts = seen.flatMap((m) => m.codeFonts);
  expect(fonts.length).toBeGreaterThan(0);
  for (const f of fonts) expect(f).toMatch(/^ui-monospace,/);
}

type CardText = Pick<Card, 'id' | 'term' | 'definition' | 'whyItMatters' | 'example' | 'source'> & { tag: string };

/** Every card in the bank, read from content/ so the check can't miss one that a review session never deals. */
function allCards(): CardText[] {
  const root = fileURLToPath(new URL('../content/', import.meta.url));
  const domains: Domain[] = JSON.parse(readFileSync(join(root, 'domains.json'), 'utf8'));
  const shortName = new Map(domains.map((d) => [d.id, d.shortName]));
  return readdirSync(root)
    .filter((d) => existsSync(join(root, d, 'cards.json')))
    .flatMap((d) => JSON.parse(readFileSync(join(root, d, 'cards.json'), 'utf8')) as Card[])
    .map((c) => ({ ...c, tag: shortName.get(c.domainId) ?? '' }));
}

/**
 * Writes a card's text into the live top card, mirroring Flashcard.tsx's markup (inline marks as renderInline does).
 * Walking a deck through every card takes minutes; stamping all of them into one rendered card takes seconds.
 */
function stamp(page: Page, card: CardText) {
  return page.locator(TOP).evaluate((fc, c) => {
    const inline = (el: Element, s: string) => {
      el.replaceChildren();
      for (const part of s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean)) {
        if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
          const b = document.createElement('strong');
          inline(b, part.slice(2, -2));
          el.append(b);
        } else if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
          const code = document.createElement('code');
          code.textContent = part.slice(1, -1);
          el.append(code);
        } else el.append(part);
      }
    };
    const div = (cls: string, text: string) => Object.assign(document.createElement('div'), { className: cls, textContent: text });
    const need = <T extends Element>(el: T | null | undefined, what: string): T => {
      if (!el) throw new Error(`stamp: no ${what} in the rendered card (did Flashcard.tsx markup change?)`);
      return el;
    };
    const front = need(fc.querySelector('.fc-front'), '.fc-front');
    const body = need(fc.querySelector('.fc-scroll-body'), '.fc-scroll-body');
    const main = need(front.querySelector('.fc-main'), '.fc-main');
    const reverse = main.classList.contains('fc-main-def');
    for (const tag of fc.querySelectorAll('.fc-face .tag')) tag.textContent = c.tag;
    if (reverse) {
      inline(main, c.definition);
      need(body.querySelector('.fc-term-answer'), '.fc-term-answer').textContent = c.term;
    } else {
      main.className = `fc-main ${c.term.length > c.longTerm ? 'fc-main-long' : ''}`;
      main.textContent = c.term;
      inline(need(body.querySelector('.fc-def'), '.fc-def'), c.definition);
    }
    const [why, ex] = body.querySelectorAll('.fc-txt');
    inline(need(why, '.fc-txt'), c.whyItMatters);
    const source = need(body.querySelector('.source'), '.source');
    if (c.example) {
      const txt = ex ?? div('fc-txt fc-example', '');
      if (!ex) source.before(div('fc-sec', 'Example'), txt);
      inline(txt, c.example);
    } else if (ex) {
      ex.previousElementSibling?.remove();
      ex.remove();
    }
    source.textContent = `📎 ${c.source.title}`;
  }, { ...card, longTerm: LONG_TERM });
}

const faceHtml = (page: Page) => page.locator(TOP).evaluate((fc) => [...fc.querySelectorAll('.fc-face')].map((f) => f.innerHTML));

for (const [label, mode] of [['Term → Def', /Term → Def/], ['Def → Term', /Def → Term/]] as const) {
  test(`every flashcard's text fits an iPhone 14 card (${label})`, async ({ page }) => {
    const cards = allCards();
    expect(cards.length).toBeGreaterThan(100);
    await page.goto('./#/cards/review');
    await page.getByRole('radio', { name: mode }).click();
    await expect(page.locator(TOP)).toHaveCount(1);
    // Let the dealt card settle to full size: the horizontal checks read bounding boxes, which a scale-in shrinks.
    await expect(page.locator('.deck-slot').first()).toHaveCSS('transform', 'none');

    // The stamp must reproduce React's own render, or the check below would measure something the app never shows.
    const dealt = (await measure(page)).term;
    const rendered = await faceHtml(page);
    const self = cards.find((c) => c.term === dealt || c.definition.replaceAll('`', '').replaceAll('**', '') === dealt);
    expect(self, `dealt card "${dealt}" is in content/`).toBeDefined();
    await stamp(page, self!);
    expect(await faceHtml(page)).toEqual(rendered);

    const seen: Measure[] = [];
    for (const card of cards) {
      await stamp(page, card);
      const m = await measure(page);
      seen.push({ ...m, term: card.id });
      for (const v of m.vertical) expect.soft(v.scrollHeight, `card ${card.id} ${v.name}`).toBeLessThanOrEqual(v.clientHeight + 1);
    }
    expectNoHorizontalOverflow(seen);
    expectMonoCode(seen);
  });
}

test('a real review session deals cards that fit (Term → Def)', async ({ page }) => {
  test.setTimeout(90_000);
  const seen = await walkSession(page, /Term → Def/);
  expect(seen.length).toBeGreaterThanOrEqual(14);
  for (const m of seen) {
    for (const v of m.vertical) expect.soft(v.scrollHeight, `card "${m.term}" ${v.name}`).toBeLessThanOrEqual(v.clientHeight + 1);
  }
  expectNoHorizontalOverflow(seen);
  expectMonoCode(seen);
});

test.describe('iPhone SE', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('flashcard text never overflows sideways and a tall back shows a scroll cue', async ({ page }) => {
    test.setTimeout(90_000);
    const seen = await walkSession(page, /Term → Def/);
    expectNoHorizontalOverflow(seen);
    expectMonoCode(seen);
    for (const m of seen) {
      const back = m.vertical.find((v) => v.name.includes('fc-scroll'))!;
      expect(back.more, `card "${m.term}" scroll cue`).toBe(String(back.scrollHeight > back.clientHeight + 1));
    }
  });
});

// A back taller than its face scrolls inside the card, with a fade cue, and the scroll gesture neither flips nor
// drags the card. Chromium only: it needs CDP to synthesize a real touch scroll.
test.describe('tall card back', { tag: '@chromium' }, () => {
  test('scrolls with a fade cue and a touch scroll does not flip the card', async ({ page }) => {
    await page.goto('./#/cards/review');
    await page.locator(TOP).dispatchEvent('click');
    const back = page.getByRole('button', { name: /Card back/ });
    await expect(back).toBeVisible();
    const face = back.locator('.fc-back');
    await expect(face).toHaveAttribute('data-more', 'false');

    // No shipped card overflows, so stretch this one past the face to exercise the scroll path.
    await face.locator('.fc-scroll-body').evaluate((body) => {
      const filler = document.createElement('div');
      filler.style.height = '600px';
      body.insertBefore(filler, body.querySelector('.source'));
    });
    await expect(face).toHaveAttribute('data-more', 'true');
    await expect(face.locator('.fc-fade')).toHaveCSS('opacity', '1');

    // A finger drag up the card, sent as raw touch events so the browser runs its own scroll and click logic.
    const box = (await face.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const x = Math.round(box.x + box.width / 2);
    let y = Math.round(box.y + box.height * 0.9);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 0; i < 25; i++) {
      y -= 20;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => face.locator('.fc-scroll').evaluate((el) => el.scrollTop)).toBeGreaterThan(300);
    await expect(face).toHaveAttribute('data-more', 'false');
    await expect(back).toBeVisible();
    await expect(page.getByRole('button', { name: /^Good/ })).toBeVisible();
    await expect(page.locator('.deck-slot .fc[role="button"]')).toHaveCSS('transform', 'none');
  });
});
