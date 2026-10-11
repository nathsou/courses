import { test, expect, type Page } from '@playwright/test';
import { readdirSync } from 'node:fs';

const lessons = readdirSync('content/lessons').filter((file) => file.endsWith('.md')).map((file) => `/learn/${file.slice(0, -3)}/`);
const routes = ['/', ...lessons, '/practice/', '/review/', '/words/', '/placement/', '/exam/', '/settings/'];

const fits = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

/** A silent German voice, so audio code paths run without sound. */
async function quietVoice(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'spoken', { value: [] });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { constructor(public text: string) {} } });
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        getVoices: () => [{ lang: 'de-DE', name: 'Deutsch', localService: true }],
        speak: (u: { text: string; onend?: () => void }) => {
          Reflect.get(window, 'spoken').push(u.text);
          setTimeout(() => u.onend?.(), 10);
        },
        cancel: () => {},
        addEventListener: () => {},
      },
    });
  });
}

for (const route of routes) {
  test(`${route} fits the viewport and has no nested controls or errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('data-genders', 'on');
    expect(await fits(page)).toBeLessThanOrEqual(1);
    await expect(page.locator('button [role="button"], button button')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('every practice tool opens, fits the viewport and loads without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/practice/');
  const ids = await page.locator('.grid .game').evaluateAll((cards) => cards.map((c) => c.id));
  expect(ids.length).toBeGreaterThanOrEqual(4);
  for (const id of ids) {
    await page.goto(`/practice/#${id}`);
    await expect(page.locator('section.stage')).toBeVisible();
    expect(await fits(page), id).toBeLessThanOrEqual(1);
    await expect(page.locator('button [role="button"], button button')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('a word in running text opens its card, which stays on screen and adds to review', async ({ page }) => {
  await quietVoice(page);
  await page.goto('/learn/04-familie/');
  await page.setViewportSize({ width: 375, height: 420 });
  const word = page.locator('.prose .de .word').filter({ hasText: /^Mädchen$/ }).first();
  await word.click();
  const card = page.getByRole('dialog', { name: 'Word: Mädchen' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('das Mädchen');
  await expect(card).toContainText('neuter');
  const rect = await card.boundingBox();
  expect(rect!.y).toBeGreaterThanOrEqual(8);
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(420);
  await card.getByRole('button', { name: 'Add to review' }).click();
  await expect(card).toContainText('In your review deck');
  await card.getByRole('button', { name: 'Close word card' }).click();
  await expect(card).toHaveCount(0);
  await expect(word).toBeFocused();
  await page.goto('/review/');
  await page.getByRole('button', { name: 'Start reviewing' }).click();
  await page.getByRole('button', { name: 'Show answer' }).click();
  await expect(page.locator('.back')).toContainText('das Mädchen');
  expect(await fits(page)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: /^Good/ }).click();
});

test('der/die/das: the article buttons mark the noun and show its plural', async ({ page }) => {
  await quietVoice(page);
  await page.goto('/learn/04-familie/');
  const ex = page.getByRole('region', { name: 'Der, die, das?: Der, die oder das?' });
  await ex.scrollIntoViewIfNeeded();
  await ex.getByRole('button', { name: /die$/ }).click();
  await expect(ex.locator('p.fb')).toContainText('die Tante');
});

test('typed answers accept umlaut buttons and mark capitals as almost', async ({ page }) => {
  await quietVoice(page);
  await page.goto('/learn/04-familie/');
  const ex = page.getByRole('region', { name: 'Type it: Say it in German' });
  await ex.scrollIntoViewIfNeeded();
  const input = ex.getByRole('textbox', { name: 'Your answer' });
  await input.fill('meine mutter');
  await ex.getByRole('button', { name: 'Check' }).click();
  await expect(ex.locator('p.fb')).toContainText('Fast!');
  await ex.getByRole('button', { name: 'Next' }).click();
  await input.fill('seine Schwester');
  await ex.getByRole('button', { name: 'Check' }).click();
  await expect(ex.locator('p.fb')).toContainText('Richtig!');
});

test('the sentence builder accepts the right order', async ({ page }) => {
  await quietVoice(page);
  await page.goto('/learn/04-familie/');
  const ex = page.getByRole('region', { name: 'Sentence builder: Build the sentence' });
  await ex.scrollIntoViewIfNeeded();
  for (const t of ['meine', 'Schwester', 'hat', 'zwei', 'Kinder']) await ex.locator('.bank .tile').filter({ hasText: new RegExp(`^${t}$`, 'i') }).first().click();
  await ex.getByRole('button', { name: 'Check' }).click();
  await expect(ex.locator('.answer.ok')).toBeVisible();
});

test('the placement check ends early for a beginner and suggests lesson 1', async ({ page }) => {
  await quietVoice(page);
  await page.goto('/placement/');
  for (let i = 0; i < 8; i++) await page.getByRole('button', { name: "I don't know" }).click();
  await expect(page.getByRole('heading', { name: 'Start at A1' })).toBeVisible();
  expect(await fits(page)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: /Sounds good/ }).click();
  await expect(page).toHaveURL(/\/learn\/01-hallo\/$/);
});

test('a level check starts and fits the viewport', async ({ page }) => {
  await quietVoice(page);
  await page.goto('/exam/');
  await page.getByRole('button', { name: 'Start', exact: true }).first().click();
  await expect(page.locator('button [role="button"], button button')).toHaveCount(0);
  expect(await fits(page)).toBeLessThanOrEqual(1);
});

test('lesson prompts stay quiet on load', async ({ page }) => {
  await quietVoice(page);
  await page.goto('/learn/04-familie/');
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => Reflect.get(window, 'spoken'))).toEqual([]);
});
