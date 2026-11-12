import assert from 'node:assert/strict';
import puppeteer, {type Page} from 'puppeteer-core';
import {mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve, sep} from 'node:path';

const browser = await puppeteer.launch({executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
const errors: string[] = [];
const fixtureDir = await mkdtemp(join(tmpdir(), 'after-zero-cloud-'));
const click = (page: Page, text: string) => page.locator('::-p-xpath(//button[normalize-space(.)=' + JSON.stringify(text) + '])').click();
async function freshPage() {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => {if (message.text().includes('Google sign-in failed:')) console.log(message.text());});
  await page.setRequestInterception(true);
  page.on('request', request => {void (request.url().endsWith('/firebase-config.json') ? request.respond({status: 200, contentType: 'application/json', body: JSON.stringify({
    apiKey: 'demo-key', projectId: 'demo-after-zero', authDomain: 'demo-after-zero.firebaseapp.com', appId: 'demo-app', useEmulators: true,
  })}) : request.continue());});
  await page.goto('http://127.0.0.1:4173/', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.querySelector('.player-services')?.textContent?.includes('เชื่อมต่อแล้ว'));
  console.log('Cloud UI: anonymous backend ready');
  return page;
}
async function startLife(page: Page) {
  await click(page, 'เริ่มชีวิตใหม่');
  await page.locator('button::-p-text(ลืมตาตื่นขึ้นในร่างนี้)').click();
  await page.waitForSelector('dialog[open]');
  await click(page, 'เข้าใจแล้ว');
  await page.locator('button::-p-text(ตั้งสติแล้วตรวจของติดตัว)').click();
  console.log('Cloud UI: life confirmed');
  await page.waitForFunction(() => !!localStorage.getItem('after_zero_v10_save_state'));
  await page.waitForFunction(() => document.querySelector('.player-services')?.textContent?.includes('บันทึกบนคลาวด์แล้ว'));
  console.log('Cloud UI: initial cloud save uploaded');
  return page.evaluate(() => JSON.parse(localStorage.getItem('after_zero_v10_save_state')!).runId);
}
async function google(page: Page, email: string) {
  await click(page, 'บัญชีและเซฟ');
  await page.waitForSelector('dialog[open]');
  console.log('Cloud UI: account panel', await page.$eval('dialog', element => element.innerText));
  const popupTarget = browser.waitForTarget(target => target.opener() === page.target()).then(target => ({target}), error => ({error}));
  await click(page, 'เชื่อมบัญชี Google');
  console.log('Cloud UI: Google button clicked');
  const result = await popupTarget;
  if ('error' in result) throw result.error;
  const popup = await result.target.page();
  assert(popup);
  await popup.waitForFunction(() => document.body.innerText.includes('Add new account'));
  const chooseExisting = () => popup.evaluate(email => {
    const control = [...document.querySelectorAll('button,a')].find(element => element.textContent?.includes(email));
    if (!control) return false;
    (control as HTMLElement).click();
    return true;
  }, email);
  const add = () => popup.evaluate(() => {
    const control = [...document.querySelectorAll('button,a')].find(element => element.textContent?.includes('Add new account'));
    if (!control) throw new Error('Emulator add-account control missing');
    (control as HTMLElement).click();
  });
  if (!await chooseExisting()) {
    await add();
    await popup.waitForFunction(() => document.body.innerText.includes('Sign-in with Google.com'));
    if (!await chooseExisting()) {
      await add();
      await popup.waitForSelector('#email-input');
      await popup.type('#email-input', email);
      await popup.type('#display-name-input', 'Cloud Test');
      await popup.click('#sign-in');
    }
  }
  await page.waitForSelector('button::-p-text(ออกจากบัญชี แล้วเล่นเป็น Guest)');
  await page.waitForSelector('[data-auth-state="google"]');
  await page.waitForSelector('[data-auth-notice]');
  assert((await page.$eval('[data-auth-state="google"]', element => element.textContent))?.includes('เข้าสู่ระบบ Google แล้ว'));
  assert((await page.$eval('[data-account-identity]', element => element.textContent))?.includes(email));
  assert((await page.$eval('[data-auth-notice]', element => element.textContent))?.includes('เข้าสู่ระบบ Google สำเร็จ'));
}
try {
  const email = 'cloud-test-' + Date.now() + '@example.invalid';
  const first = await freshPage();
  await first.locator('summary::-p-text(ตั้งค่าและชื่อผู้เล่น)').click();
  await first.locator('#title-player-name').fill('Cloud Player');
  const runId = await startLife(first);
  await google(first, email);
  await click(first, 'ปิด');
  console.log('Cloud UI: guest life linked to Google');
  await click(first, 'ส่งความคิดเห็น');
  await first.waitForSelector('dialog textarea');
  assert((await first.$$eval('dialog input[type="checkbox"]', inputs => inputs.map(input => input.checked))).every(value => !value));
  await first.type('dialog textarea', 'UI TEST: feedback without optional diagnostics or save');
  await first.locator('dialog button[type="submit"]').click();
  await first.waitForFunction(() => document.querySelector('dialog')?.textContent?.includes('ส่งความคิดเห็นแล้ว หมายเลขอ้างอิง'));
  const feedbackId = await first.$eval('dialog', element => element.textContent!.match(/หมายเลขอ้างอิง ([A-Za-z0-9]+)/)![1]);
  const sent = await fetch('http://127.0.0.1:8080/v1/projects/demo-after-zero/databases/(default)/documents/feedback/' + feedbackId, {headers: {Authorization: 'Bearer owner'}}).then(response => response.json());
  assert.deepEqual(Object.keys(sent.fields.diagnostics.mapValue.fields), ['version']);
  assert.equal(sent.fields.attachment.stringValue, '');
  await click(first, 'ปิด');
  console.log('Cloud UI: feedback delivered with optional attachments excluded');
  const second = await freshPage();
  await google(second, email);
  await second.waitForFunction(runId => JSON.parse(localStorage.getItem('after_zero_v10_save_state') || '{}').runId === runId, {}, runId);
  assert.equal(await second.evaluate(() => localStorage.getItem('after_zero_v10_user_profile')), 'Cloud Player');
  console.log('Cloud UI: fresh device restored the same life');
  const third = await freshPage();
  const otherRun = await startLife(third);
  const otherState = await third.evaluate(() => JSON.parse(localStorage.getItem('after_zero_v10_save_state')!));
  const formerUid = await third.evaluate(runId => JSON.parse(localStorage.getItem('after_zero_v10_life_events')!).find((event: any) => event.runId === runId).uid, otherRun);
  assert.notEqual(otherRun, runId);
  await google(third, email);
  await third.waitForSelector('button::-p-text(ใช้เซฟบนคลาวด์)');
  assert.equal(await third.evaluate(() => JSON.parse(localStorage.getItem('after_zero_v10_save_state')!).runId), otherRun, 'Cloud must not overwrite a different local life without a choice');
  await click(third, 'ใช้เซฟบนคลาวด์');
  await third.waitForFunction(runId => JSON.parse(localStorage.getItem('after_zero_v10_save_state')!).runId === runId, {}, runId);
  await click(third, 'ปิด');
  // Reload verifies that Firebase's separate former-Guest identity survives a cold start.
  await third.reload({waitUntil: 'domcontentloaded'});
  await third.waitForFunction(() => document.querySelector('.player-services')?.textContent?.includes('คลาวด์'));
  const totalsUrl = 'http://127.0.0.1:8080/v1/projects/demo-after-zero/databases/(default)/documents/statistics/global';
  const readEmulator = (url: string) => fetch(url, {headers: {Authorization: 'Bearer owner'}}).then(response => response.json());
  const before = await readEmulator(totalsUrl);
  await third.setOfflineMode(true);
  // Import a known counted life with a valid ending while offline, then replace the current life.
  otherState.pending = null;
  otherState.ending = {id: 'death', day: otherState.day};
  await writeFile(join(fixtureDir, 'known-ending.json'), JSON.stringify({version: 'after-zero-1.0-save-bundle', gameState: otherState, pastLives: [], triggeredEchoIds: []}));
  await click(third, 'จัดการเซฟ / นำเข้าเซฟ');
  await click(third, 'นำเข้าไฟล์เซฟ');
  const input = await third.waitForSelector('input[type="file"]');
  assert(input);
  await input.uploadFile(join(fixtureDir, 'known-ending.json'));
  await third.waitForSelector('.ending-controls');
  await third.waitForFunction(runId => JSON.parse(localStorage.getItem('after_zero_v10_life_events')!).some((event: any) => event.runId === runId && event.endingId === 'death'), {}, otherRun);
  await click(third, 'ตื่นขึ้นในชีวิตใหม่');
  await third.locator('button::-p-text(ลืมตาตื่นขึ้นในร่างนี้)').click();
  await third.setOfflineMode(false);
  await third.evaluate(() => window.dispatchEvent(new Event('online')));
  const endUrl = 'http://127.0.0.1:8080/v1/projects/demo-after-zero/databases/(default)/documents/players/' + encodeURIComponent(formerUid) + '/runs/' + encodeURIComponent(otherRun);
  const deadline = Date.now() + 30000;
  let recorded: any;
  do {
    recorded = await readEmulator(endUrl);
    if (recorded.fields?.endingId?.stringValue === 'death') break;
    await new Promise(resolve => setTimeout(resolve, 200));
  } while (Date.now() < deadline);
  assert.equal(recorded.fields?.endingId?.stringValue, 'death', 'Former Guest ending must reach its original counted run after switching accounts and reconnecting');
  const after = await readEmulator(totalsUrl);
  assert.equal(Number(after.fields.completed.integerValue), Number(before.fields.completed.integerValue) + 1);
  assert.deepEqual(errors, []);
  console.log('Cloud UI: Google linking, cross-device restore, explicit conflicts, former-Guest identity after reload, and offline ending recovery passed.');
} catch (error) {
  for (const page of await browser.pages()) console.error((await page.$eval('body', element => element.innerText).catch(() => '')).slice(0, 3000));
  throw error;
} finally {
  await browser.close();
  if (!resolve(fixtureDir).startsWith(resolve(tmpdir()) + sep + 'after-zero-cloud-')) throw new Error('Unexpected fixture directory');
  await rm(fixtureDir, {recursive: true, force: true});
}
