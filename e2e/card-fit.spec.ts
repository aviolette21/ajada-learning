import { expect, test, type Page } from '@playwright/test';

// Card text must fit its face: no clipped lines on the back, nothing wider than the card, and inline code in a real
// monospace stack (WebKit's bare "monospace" default is Courier). Runs on the WebKit iPhone project.

interface Measure {
  term: string;
  vertical: { name: string; scrollHeight: number; clientHeight: number; more: string | null }[];
  horizontal: string[];
  codeFonts: string[];
}

const TOP = '.deck-slot .fc[role="button"]';

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

for (const [label, mode] of [['Term → Def', /Term → Def/], ['Def → Term', /Def → Term/]] as const) {
  test(`flashcard text fits an iPhone 14 card (${label})`, async ({ page }) => {
    test.setTimeout(90_000);
    const seen = await walkSession(page, mode);
    expect(seen.length).toBeGreaterThanOrEqual(14);
    for (const m of seen) {
      for (const v of m.vertical) expect.soft(v.scrollHeight, `card "${m.term}" ${v.name}`).toBeLessThanOrEqual(v.clientHeight + 1);
    }
    expectNoHorizontalOverflow(seen);
    expectMonoCode(seen);
  });
}

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
