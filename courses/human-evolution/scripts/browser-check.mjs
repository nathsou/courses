import { chromium, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const prefix = process.env.BASE_PATH ?? '';
const screenshots = process.argv.includes('--screenshots');
const captureOnly = process.argv.includes('--capture-only');
const mime = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.json':'application/json', '.svg':'image/svg+xml', '.woff2':'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (prefix && !pathname.startsWith(`${prefix}/`)) {
      // Serve the actual collection index at the parent path when testing a project build.
      const parent = prefix.slice(0,prefix.lastIndexOf('/')) + '/';
      if (pathname === parent) { res.setHeader('Content-Type','text/html'); res.end(await readFile(join(root,'../../site/index.html'))); return; }
      if (pathname === `${parent}styles.css`) { res.setHeader('Content-Type','text/css'); res.end(await readFile(join(root,'../../site/styles.css'))); return; }
      res.writeHead(404).end('Not found'); return;
    }
    let path = resolve(dist, '.' + pathname.slice(prefix.length));
    if (!path.startsWith(dist + '/') && path !== dist) { res.writeHead(403).end(); return; }
    if ((await stat(path)).isDirectory()) path = join(path,'index.html');
    res.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream'); res.end(await readFile(path));
  } catch { res.writeHead(404).end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const url = `${origin}${prefix}`;
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox','--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width:1440, height:1000 }, deviceScaleFactor:1, reducedMotion:'reduce' });
  const page = await context.newPage();
  async function settled() {
    await expect(page.locator('.topbar')).toHaveAttribute('data-ready','true');
    await page.evaluate(() => document.fonts.ready);
    if (new URL(page.url()).pathname.includes('/ch/')) await expect(page.locator('.course-reading-guide')).toHaveCount(1);
  }
  async function go(target) { await page.goto(target); await settled(); }
  async function reload() { await page.reload(); await settled(); }
  const errors = [], failed = [], remote = [];
  let monitorCourse = true;
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(origin)) failed.push(r.url()); });
  page.on('request', r => { if (monitorCourse && !r.url().startsWith(origin) && !r.url().startsWith('data:')) remote.push(r.url()); });
  await go(`${url}/`); await expect(page.getByRole('heading',{level:1})).toContainText('being');
  await page.evaluate(() => document.fonts.ready);
  if (screenshots) {
    await mkdir(join(root,'docs/screenshots'), { recursive:true });
    await page.screenshot({path:join(root,'docs/screenshots/overview.png')});
  }
  const slugs = ['life-history','growing-a-brain','food','bipedalism','temperature','niche-construction'];
  for (const slug of slugs) {
    await go(`${url}/ch/${slug}/`);
    await expect(page.locator('.chapter-header h1')).toBeVisible();
    await expect(page.locator('.prose h2')).toHaveCount(3);
    await expect(page.locator('.video-reference')).toHaveCount(0);
    for (const figure of await page.locator('.widget').all()) {
      await figure.getByRole('button',{name:'Reset',exact:true}).click();
      await expect(figure.locator('figcaption')).toBeVisible();
    }
    console.log(`PASS ${slug}: static text and interactive mounting`);
  }
  await go(`${url}/ch/growing-a-brain/`);
  const brain = page.locator('#figure-brain');
  await expect(brain.locator('.anchor-number')).toContainText('66%');
  await brain.getByLabel('Childhood peak, expressed against').selectOption('daily');
  await expect(brain.locator('.anchor-number')).toContainText('43%');
  await brain.getByLabel('Brain curve').selectOption('volume');
  await brain.getByRole('slider').focus(); await page.keyboard.press('ArrowRight');
  await expect(brain.locator('.control-value')).toHaveText('6 years');
  await page.getByRole('button',{name:'Reading settings'}).click();
  await page.getByLabel('Show lecture video links and timestamps').check();
  await expect(page.locator('.video-reference')).toHaveCount(3);
  await expect(page.locator('.video-reference a').first()).toHaveAttribute('href','https://www.youtube.com/watch?v=b5vIozqS40k&t=120s');
  await page.getByRole('button',{name:'Close settings',exact:true}).click();
  await expect(page.getByRole('button',{name:'Reading settings'})).toBeFocused();
  await reload(); await expect(page.locator('.video-reference')).toHaveCount(3);
  if (screenshots) {
    await page.locator('#figure-brain').scrollIntoViewIfNeeded();
    await brain.screenshot({path:join(root,'docs/screenshots/childhood.png')});
  }
  if (!captureOnly) {
    await go(`${url}/ch/life-history/`);
    const sharing = page.locator('#figure-sharing');
    await expect(sharing.locator('.results')).toContainText('0');
    await sharing.getByRole('checkbox').uncheck();
    await expect(sharing.locator('.results')).toContainText('1,800');
    await sharing.getByRole('checkbox').check();
    await sharing.getByRole('slider').focus(); await page.keyboard.press('ArrowLeft');
    await expect(sharing.locator('.observation')).toContainText('cannot fill');
    const note = page.locator('.notebook');
    await note.locator('textarea').fill('Transfers redistribute energy; they cannot create it.');
    await note.getByRole('checkbox').check();
    await reload();
    await expect(note.locator('textarea')).toHaveValue('Transfers redistribute energy; they cannot create it.');
    await expect(note.getByRole('checkbox')).toBeChecked();
    await note.locator('textarea').fill('Revised: the community may also have a total shortfall.');
    await expect(note.getByRole('checkbox')).not.toBeChecked();
    const exported = page.waitForEvent('download');
    await note.getByRole('button',{name:'Download note'}).click();
    const download = await exported;
    if (download.suggestedFilename() !== 'human-evolution-life-history.txt') throw new Error('Unexpected note filename');
    const exportedText = await readFile(await download.path(),'utf8');
    if (!exportedText.includes('Revised: the community may also have a total shortfall.')) throw new Error('Export missed the current draft');
    const q = page.locator('.exercise').first();
    await q.getByRole('radio').first().check(); await q.getByRole('button').click();
    await expect(q.locator('.feedback')).toContainText('Answer checked.');
    await q.getByRole('radio').nth(1).check(); await expect(q.locator('.feedback')).not.toContainText('Answer checked.');
    await reload(); await expect(q.getByRole('radio').nth(1)).toBeChecked();
    await expect(q.locator('.feedback')).not.toContainText('Answer checked.');
    await go(`${url}/ch/bipedalism/`);
    const gait = page.locator('#figure-gait');
    await gait.getByLabel('Gait',{exact:true}).selectOption('run');
    await expect(gait.locator('.control-value').first()).toHaveText('3.0 m/s');
    await gait.getByLabel('Graph quantity').selectOption('power');
    await expect(gait.locator('svg')).toHaveAttribute('aria-label',/Gait costs/);
    await page.locator('#figure-fossils select').selectOption('5');
    await expect(page.locator('#figure-fossils .specimen-card h4')).toHaveText('Homo sapiens');
    await go(`${url}/ch/temperature/`);
    const heat = page.locator('#figure-heat');
    const before = await heat.locator('.results dd').nth(2).textContent();
    await heat.getByLabel('Relative humidity').focus(); await page.keyboard.press('End');
    await expect(heat.locator('.results dd').nth(2)).toContainText('0 W');
    if (before?.trim().startsWith('0')) throw new Error('Heat example should initially evaporate water');
    await go(`${url}/ch/niche-construction/`);
    await page.locator('#figure-niche').getByRole('button',{name:/Test the feedback/}).click();
    await expect(page.locator('#figure-niche .specimen-card')).toContainText('ancient DNA');
    await go(`${url}/resources/`);
    await page.getByRole('searchbox').fill('sevrage'); await expect(page.locator('.glossary dt')).toHaveCount(1);
    await expect(page.locator('.glossary dt')).toContainText('Weaning');
    await page.getByRole('button',{name:'Reading settings'}).click(); await page.getByLabel('Show lecture video links and timestamps').uncheck();
    await page.getByLabel('Colour theme').selectOption('dark'); await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await page.getByRole('button',{name:'Close settings',exact:true}).click();
    await go(`${url}/ch/food/`); await expect(page.locator('.video-reference')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await page.getByRole('button',{name:'Reading settings'}).click(); await page.getByLabel('Colour theme').selectOption('light'); await page.getByRole('button',{name:'Close settings',exact:true}).click();
    const sidebar = page.locator('#course-contents');
    const closer = sidebar.locator('[data-sidebar-toggle]');
    const opener = page.locator('.topbar [data-sidebar-toggle]');
    await closer.click(); await expect(sidebar).toBeHidden(); await expect(opener).toBeFocused();
    await reload(); await expect(sidebar).toBeHidden(); await opener.click(); await expect(closer).toBeFocused();
    for (const width of [390,844]) {
      await page.setViewportSize({width,height:900});
      await expect(sidebar).toHaveJSProperty('inert',true);
      await opener.click(); await expect(closer).toBeFocused();
      await expect(page.locator('main')).toHaveJSProperty('inert',true);
      await page.evaluate(() => [...document.querySelectorAll('#course-contents a, #course-contents button')].filter(x=>x.checkVisibility()).at(-1).focus());
      await page.keyboard.press('Tab'); await expect(sidebar.locator('.course-index-link')).toBeFocused();
      await page.keyboard.press('Escape'); await expect(opener).toBeFocused();
      await opener.click(); await sidebar.getByRole('link',{name:/The price of a kilometre/}).click();
      await expect(page.locator('main')).toHaveJSProperty('inert',false); await expect(sidebar).toHaveJSProperty('inert',true);
      for (const slug of slugs) {
        await go(`${url}/ch/${slug}/`);
        if (!(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth))) throw new Error(`Horizontal overflow: ${slug} at ${width}`);
      }
    }
    if (prefix) { monitorCourse = false; await opener.click(); await sidebar.locator('.course-index-link').click(); await expect(page).toHaveURL(`${origin}${prefix.slice(0,prefix.lastIndexOf('/'))}/`); }
    console.log('PASS source preferences, notebook revision, checked-answer invalidation, models, themes, glossary, mobile and keyboard navigation');
  }
  if (screenshots) {
    monitorCourse = true; await page.setViewportSize({width:1440,height:1000}); await go(`${url}/ch/food/`);
    await page.locator('#figure-diet').screenshot({path:join(root,'docs/screenshots/diet.png')});
    await go(`${url}/ch/temperature/`); await page.locator('#figure-heat').screenshot({path:join(root,'docs/screenshots/heat.png')});
    await page.setViewportSize({width:390,height:844}); await go(`${url}/`);
    await page.screenshot({path:join(root,'docs/screenshots/mobile.png')});
    await page.setViewportSize({width:1440,height:1000}); await go(`${url}/`);
    await page.getByRole('button',{name:'Reading settings'}).click(); await page.getByLabel('Colour theme').selectOption('dark'); await page.getByRole('button',{name:'Close settings',exact:true}).click();
    await page.screenshot({path:join(root,'docs/screenshots/dark.png')});
    console.log('Captured six current course screenshots.');
  }
  if (errors.length || failed.length || remote.length) throw new Error(JSON.stringify({errors,failed,remote},null,2));
  console.log('PASS no browser errors, missing local assets or external requests');
} finally { await browser?.close(); await new Promise(resolve=>server.close(resolve)); }
