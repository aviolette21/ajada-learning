import { expect, test, type Page } from '@playwright/test';

/** Picks the first one or several choices, as the question asks ("Select TWO." questions need more than one). */
async function pickChoices(page: Page): Promise<number> {
  // Wait for the question to render before reading whether it asks for more than one pick.
  await page.locator('.choice').first().waitFor();
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
  await pickChoices(page);
  await page.getByRole('button', { name: 'Submit' }).click();
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

test('vocabulary lists terms and opens one with more detail', async ({ page }) => {
  await page.getByRole('link', { name: 'Vocabulary' }).click();
  await page.locator('.vocab-item').first().click();
  await expect(page.getByRole('dialog', { name: /^Definition: / })).toBeVisible();
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
