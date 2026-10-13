import { expect, test, type Page } from '@playwright/test';

/** Picks the first one or several choices, as the question asks ("Select TWO." questions need more than one). */
async function pickChoices(page: Page): Promise<number> {
  const select = page.locator('.qv-select');
  const need = (await select.count()) === 0 ? 1 : { 'Select TWO.': 2, 'Select THREE.': 3 }[(await select.textContent()) ?? ''] ?? 1;
  for (let i = 0; i < need; i++) await page.locator('.choice').nth(i).click();
  return need;
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
});

test('answering a question shows every reason and the verdict sheet', async ({ page }) => {
  await page.getByRole('link', { name: 'Practice' }).click();
  await page.getByRole('button', { name: /Practice quiz/ }).click();
  if ((await pickChoices(page)) > 1) await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('dialog', { name: 'Answer explanation' })).toBeVisible();
  await expect(page.locator('.choice-reason')).toHaveCount(await page.locator('.choice').count());
});

test('tapping an underlined term shows its definition', async ({ page }) => {
  await page.goto('./#/learn/lesson/l-prompt-caching');
  const term = page.locator('.term').first();
  const name = (await term.textContent()) ?? '';
  await term.click();
  await expect(page.getByRole('dialog', { name: /^Definition: / })).toBeVisible();
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page.getByRole('dialog', { name: /^Definition: / })).toBeHidden();
  expect(name.length).toBeGreaterThan(0);
});

test('flashcard shows only the face turned toward you (WebKit backface guard)', async ({ page }) => {
  await page.goto('./#/cards/review');
  const top = page.locator('.deck-slot .fc[role="button"]');
  await expect(top.locator('.fc-front')).toBeVisible();
  await expect(top.locator('.fc-back')).toBeHidden();
  await top.click();
  await expect(top.locator('.fc-back')).toBeVisible();
  await expect(top.locator('.fc-front')).toBeHidden();
});

// Runs on the Pixel 7 project (see playwright.config.ts): WebKit's iPhone emulation keeps each entering card
// 'not stable' for seconds, which pushes this 15-card run past the timeout.
test.describe('flashcards', { tag: '@chromium' }, () => {
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
    // The swiped card stays in the DOM while it flies off; wait for the new top card, then for the old one to leave.
    await expect(page.getByRole('button', { name: /Card front/ })).toBeVisible();
    await expect(page.locator('.deck-slot .fc[role="button"]')).toHaveCount(1);
    await expect(topTerm).not.toHaveText(before ?? '');

    for (let i = 0; i < 60; i++) {
      if (await page.getByText('Session complete').isVisible()) break;
      await page.getByRole('button', { name: /Card front/ }).click();
      await page.getByRole('button', { name: /^Easy/ }).click();
    }
    await expect(page.getByText('Session complete')).toBeVisible();
  });
});

test('mock exam resumes after a reload', async ({ page }) => {
  await page.goto('./#/practice/mock');
  await page.getByRole('button', { name: 'Start a new mock exam' }).click();
  await expect(page.getByText(/^Question 1 of/)).toBeVisible();
  await pickChoices(page);
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText(/^Question 2 of/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/^Question 2 of/)).toBeVisible();
  await expect(page.getByRole('button', { name: /All questions \(1\// })).toBeVisible();
});
