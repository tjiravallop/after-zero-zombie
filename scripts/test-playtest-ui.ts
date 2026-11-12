import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import {mkdtemp, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve, sep} from 'node:path';

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const fixtureDir = await mkdtemp(join(tmpdir(), 'after-zero-ui-'));
try {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setRequestInterception(true);
  page.on('request', request => {void (request.url().endsWith('/firebase-config.json')
    ? request.respond({status: 200, contentType: 'application/json', body: '{}'}) : request.continue());});
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:4173/', {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('button');
  assert(!/ดาวน์โหลด(?:ตัว)?เกม|โหลดเกมลงเครื่อง/.test(await page.$eval('body', element => element.innerText)), 'Player screens must not offer a game download');
  const click = async (label: string) => {console.log('UI:', label); await page.locator('::-p-xpath(//button[normalize-space(.)=' + JSON.stringify(label) + '])').click();};
  await click('บทจบที่ค้นพบ');
  await page.waitForSelector('dialog[open] [data-ending-collection]');
  const locked = await page.$$eval('[data-ending-collection] article', elements => elements.map(element => element.textContent));
  const names = await page.evaluate(() => Object.values((window as any).AfterZeroEngine.Production.catalog.ENDINGS).map((ending: any) => ending.title));
  assert.equal(locked.length, names.length);
  assert(locked.every(text => text?.includes('???') && text.includes('ยังไม่ค้นพบ')));
  const galleryText = await page.$eval('dialog', element => element.textContent || '');
  assert(names.every(name => !galleryText.includes(name)));
  await click('ปิด');
  await click('ส่งความคิดเห็น');
  await page.waitForSelector('dialog textarea');
  await page.type('dialog textarea', 'ข้อความที่ยังไม่ส่งของผู้เล่น');
  await click('ปิด');
  await page.reload({waitUntil: 'domcontentloaded'});
  await click('ส่งความคิดเห็น');
  assert.equal(await page.$eval('dialog textarea', element => element.value), 'ข้อความที่ยังไม่ส่งของผู้เล่น');
  await click('ปิด');
  await click('เริ่มชีวิตใหม่');
  await page.locator('button::-p-text(ลืมตาตื่นขึ้นในร่างนี้)').wait();
  assert.equal(await page.evaluate(() => localStorage.getItem('after_zero_v10_life_events')), null, 'Character previews must not count lives');
  await page.locator('button::-p-text(ลืมตาตื่นขึ้นในร่างนี้)').click();
  await page.waitForSelector('dialog[open]');
  await click('เข้าใจแล้ว');
  await page.waitForFunction(() => !!localStorage.getItem('after_zero_v10_save_state'));
  const firstRun = await page.evaluate(() => JSON.parse(localStorage.getItem('after_zero_v10_save_state')!).runId);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('after_zero_v10_life_events')!).length), 1);
  await page.reload({waitUntil: 'domcontentloaded'});
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('after_zero_v10_save_state')!).runId), firstRun);
  assert.equal(await page.$('dialog[open]'), null, 'Guide must not reopen after acknowledgement');
  await click('วิธีเล่น');
  await page.waitForSelector('dialog[open]');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  await page.setViewport({width: 390, height: 844, deviceScaleFactor: 1});
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile page must fit viewport');
  await click('จัดการเซฟ / นำเข้าเซฟ');
  await click('นำเข้าไฟล์เซฟ');
  const saveInput = await page.waitForSelector('input[type="file"]');
  assert(saveInput);
  await writeFile(join(fixtureDir, 'bad.json'), '{broken');
  await saveInput.uploadFile(join(fixtureDir, 'bad.json'));
  await page.waitForFunction(() => document.body.innerText.includes('ไฟล์เซฟไม่ถูกต้อง'));
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('after_zero_v10_save_state')!).runId), firstRun);
  const bundle = await page.evaluate(() => {
    const gameState = JSON.parse(localStorage.getItem('after_zero_v10_save_state')!);
    const ending = (window as any).AfterZeroEngine.Production.catalog.ENDINGS.survivor;
    gameState.pending = null;
    gameState.ending = {id: 'survivor', day: gameState.day, title: ending.title, text: ending.text};
    return {version: 'after-zero-1.0-save-bundle', gameState, pastLives: [], triggeredEchoIds: [], zonePopulations: gameState.npcZones};
  });
  await writeFile(join(fixtureDir, 'ending.json'), JSON.stringify(bundle));
  await saveInput.uploadFile(join(fixtureDir, 'ending.json'));
  await page.waitForSelector('.ending-controls');
  await click('บทจบที่ค้นพบ');
  await page.waitForFunction(() => document.querySelector('dialog')?.textContent?.includes('ค้นพบแล้ว 1/'));
  await click('ปิด');
  await page.reload({waitUntil: 'domcontentloaded'});
  await click('บทจบที่ค้นพบ');
  await page.waitForFunction(() => document.querySelector('dialog')?.textContent?.includes('ค้นพบแล้ว 1/'));
  await click('ปิด');
  const blocked = await context.newPage();
  await blocked.setRequestInterception(true);
  blocked.on('request', request => {void (request.url().endsWith('/firebase-config.json')
    ? request.respond({status: 200, contentType: 'application/json', body: '{}'}) : request.continue());});
  await blocked.evaluateOnNewDocument(() => {Storage.prototype.setItem = () => {throw new DOMException('Blocked', 'QuotaExceededError');};});
  await blocked.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:4173/', {waitUntil: 'domcontentloaded'});
  await blocked.locator('button::-p-text(เริ่มชีวิตใหม่)').click();
  await blocked.locator('button::-p-text(ลืมตาตื่นขึ้นในร่างนี้)').click();
  await blocked.waitForSelector('[role="alert"]');
  assert((await blocked.$eval('[role="alert"]', element => element.textContent))?.includes('บันทึกลงเครื่องไม่สำเร็จ'));
  assert.deepEqual(errors, []);
  await assert.rejects(() => readFile('public/after-zero-bangkok-standalone.html'), {code: 'ENOENT'});
  await assert.rejects(() => readFile('dist/after-zero-bangkok-standalone.html'), {code: 'ENOENT'});
  console.log('Fresh-player UI: locked endings, guide, preview counts, persistence, mobile layout, file import/rejection, ending recovery, blocked storage, and no game distribution passed.');
} catch(error) {
  for(const open of await browser.pages()) console.error((await open.$eval('body', element => element.innerText).catch(() => '')).slice(0,5000));
  throw error;
} finally {
  await browser.close();
  if (!resolve(fixtureDir).startsWith(resolve(tmpdir()) + sep + 'after-zero-ui-')) throw new Error('Unexpected fixture directory');
  await rm(fixtureDir, {recursive: true, force: true});
}
