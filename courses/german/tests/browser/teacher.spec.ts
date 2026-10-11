import { test, expect, type Page } from '@playwright/test';

/** Open a page and wait until it has hydrated, so clicks reach their handlers. */
async function open(page: Page, url: string) {
  await page.goto(url);
  await page.locator('html[data-ready]').waitFor({ state: 'attached' });
}

async function configure(page: Page) {
  await page.addInitScript(() => localStorage.setItem('german:settings', JSON.stringify({ provider: 'openai', tutors: { openai: { apiKey: 'browser-test-key', model: 'test-model' } } })));
}

test('teacher is available without a key and sends users to provider settings', async ({ page }) => {
  await open(page, '/practice/');
  await page.getByRole('button', { name: 'Teacher', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'German teacher' });
  await expect(chat.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings/#tutor');
  await page.keyboard.press('Escape');
  await expect(chat).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Teacher', exact: true })).toBeFocused();
});

test('teacher gets lesson context, renders advice and keeps the chat across navigation', async ({ page }) => {
  await configure(page);
  let request: any;
  await page.route('https://api.openai.com/**', async route => {
    request = route.request().postDataJSON();
    await route.fulfill({ json: { choices: [{ message: { content: '<reply>Use einen with masculine nouns after haben.</reply><translation></translation><advice>Try: Ich habe einen Bruder.</advice>' } }] } });
  });
  await open(page, '/learn/04-familie/');
  await page.getByRole('button', { name: 'Teacher', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'German teacher' });
  await chat.getByRole('textbox', { name: 'Message to your German teacher' }).fill('Why einen Bruder?');
  await chat.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(chat.getByRole('log')).toContainText('Use einen');
  await expect(chat.locator('.advice')).toContainText('Try this');
  expect(request.model).toBe('test-model');
  expect(request.messages[0].content).toContain('Family: der, die, das');
  expect(request.messages[0].content).toContain('Three genders');
  await chat.getByRole('button', { name: 'Close teacher chat' }).click();
  await page.locator('.pager a.next').click();
  await page.getByRole('button', { name: 'Teacher', exact: true }).click();
  await expect(chat.getByRole('log')).toContainText('Use einen');
  await expect(chat.locator('.context')).toContainText('Eating and drinking');
});

test('umlaut keys insert at the cursor; IME Enter does not submit', async ({ page }) => {
  await configure(page);
  await open(page, '/');
  await page.getByRole('button', { name: 'Teacher', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'German teacher' });
  const input = chat.getByRole('textbox', { name: 'Message to your German teacher' });
  await input.fill('Gre');
  await input.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(2, 2));
  await chat.getByRole('button', { name: 'ü', exact: true }).click();
  await chat.getByRole('button', { name: 'ß', exact: true }).click();
  await expect(input).toHaveValue('Grüße');
  await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
  await expect(chat.getByRole('log').locator('article')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('cancellation restores the draft and a retry can succeed', async ({ page }) => {
  await configure(page);
  let requests = 0;
  await page.route('https://api.openai.com/**', async route => {
    requests++;
    if (requests === 1) return;
    await route.fulfill({ json: { choices: [{ message: { content: '<reply>Hallo! Wie geht es dir?</reply><translation>Hello! How are you?</translation><advice></advice>' } }] } });
  });
  await open(page, '/');
  await page.getByRole('button', { name: 'Teacher', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'German teacher' });
  await chat.getByRole('button', { name: 'Converse in German' }).click();
  const input = chat.getByRole('textbox', { name: 'Message to your German teacher' });
  await input.fill('Hallo');
  await chat.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(chat.getByRole('status')).toBeVisible();
  await chat.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(input).toHaveValue('Hallo');
  await expect(chat.getByRole('alert')).toHaveText('Stopped.');
  await chat.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(chat.locator('.translation')).toHaveText('Hello! How are you?');
  await expect(chat.getByRole('button', { name: 'Listen to the teacher' })).toHaveCount(1);
});

test('typing in the chat does not answer a running der/die/das game', async ({ page }) => {
  await configure(page);
  await open(page, '/practice/#gender');
  await page.locator('section.stage').getByRole('button', { name: 'Start', exact: true }).click();
  const before = await page.locator('section.stage .score').textContent();
  await page.getByRole('button', { name: 'Teacher', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'German teacher' });
  await chat.getByRole('textbox', { name: 'Message to your German teacher' }).pressSequentially('123');
  await expect(page.locator('section.stage .score')).toHaveText(before!);
  await expect(page.locator('section.stage .flash span')).toHaveCount(0);
});

test('provider changes keep keys separate and backups contain no credentials', async ({ page }) => {
  await configure(page);
  await open(page, '/settings/');
  await page.getByLabel('Provider', { exact: true }).selectOption('openrouter');
  await expect(page.getByLabel('OpenRouter API key')).toHaveValue('');
  await page.getByLabel('OpenRouter API key').fill('router-browser-test-key');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByLabel('Provider', { exact: true }).selectOption('openai');
  await expect(page.getByLabel('OpenAI API key')).toHaveValue('browser-test-key');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download a backup' }).click();
  const stream = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = Buffer.concat(chunks).toString('utf8');
  expect(backup).not.toContain('browser-test-key');
  expect(Object.values(JSON.parse(backup).settings.tutors).every((profile: any) => profile.apiKey === '')).toBe(true);
});

test('editing a sentence clears feedback and restarting a roleplay cancels pending review', async ({ page }) => {
  await configure(page);
  await page.route('https://api.openai.com/**', async route => {
    const system = route.request().postDataJSON().messages[0].content;
    if (system.includes('reviewing a short practice conversation')) return;
    const content = system.includes('You check sentences')
      ? '<verdict>correct</verdict><better>Ich habe eine Schwester.</better><explain>Good use of eine.</explain>'
      : '<reply>Sehr gut!</reply><en>Very good!</en><fix></fix><done>yes</done>';
    await route.fulfill({ json: { choices: [{ message: { content } }] } });
  });
  await open(page, '/learn/04-familie/');
  const sentence = page.getByRole('textbox', { name: 'Your sentence' });
  await sentence.fill('Ich habe eine Schwester.');
  await page.getByRole('button', { name: 'Check my sentence' }).click();
  await expect(page.locator('.result.correct')).toBeVisible();
  await sentence.fill('Ich habe Schwester');
  await expect(page.locator('.result.correct')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Your reply' }).fill('Hallo Paul');
  await page.locator('.rp').getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.locator('.rp .review')).toContainText('Reading your conversation');
  await page.getByRole('button', { name: 'Start over' }).click();
  await expect(page.getByRole('textbox', { name: 'Your reply' })).toBeEnabled();
  await expect(page.locator('.rp .review')).toHaveCount(0);
  await expect(page.locator('.rp .log .msg')).toHaveCount(1);
});
