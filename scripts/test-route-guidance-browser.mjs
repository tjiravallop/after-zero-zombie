import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import puppeteer from 'puppeteer-core';
import {generateCharacter, createCharacterState} from '../src/data/characterPool.ts';
import {createInitialZonePopulations} from '../src/data/pastLifeEchoes.ts';
import {DYNAMIC_NARRATIVE_EVENTS} from '../src/data/eventEngine.ts';

const engine = {window: {}};
vm.runInNewContext(fs.readFileSync('public/after-zero-bundle.js', 'utf8'), engine);
const zones = createInitialZonePopulations(2026);
const state = createCharacterState(engine.window.AfterZeroEngine.Production, generateCharacter(2026, {age: 35, occupationId: 'watchman'}));
Object.assign(state, {day: 10, place: 'bkk_office', pending: null, npcZones: zones});
Object.assign(state.stats, {research: 90, humanity: 70, sanity: 70, trust: 40});
state.items.samples = 2;
state.story.flags['route.vaccine.0'] = true;
state.story.flags['route.vaccine.1'] = true;
const keys = {hints: 'after_zero_v10_route_hints', assistance: 'after_zero_v10_route_assistance', session: 'after_zero_v10_route_guidance_session'};
const browser = await puppeteer.launch({executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
fs.mkdirSync('reports/route-guidance', {recursive: true});
try {
  for (const width of [390, 1440]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    await page.setViewport({width, height: 1000});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    async function click(text, scope = 'body') {
      const handle = await page.evaluateHandle(({text, scope}) => [...document.querySelectorAll(`${scope} button`)].find(b => b.checkVisibility() && b.innerText.includes(text)), {text, scope});
      const button = handle.asElement();
      assert.ok(button, `missing button ${text}`);
      await button.evaluate(b => b.scrollIntoView({block: 'center'}));
      assert.ok(await button.evaluate(b => { const r = b.getBoundingClientRect(); return b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }), `button ${text} is covered`);
      await button.click();
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      await handle.dispose();
    }
    async function enter() { await click('เข้าสู่เกม'); await click('โหลดเซฟเล่นต่อ'); }
    async function tab(name) {
      await click(name, width < 1024 ? '.mobile-nav' : '.desktop-story-feed + div');
      assert.equal(await page.$eval('.game-shell', e => e.dataset.mobileTab), name === 'บันทึก' ? 'journal' : 'map');
    }
    async function openAdvanced() {
      const summary = await page.$('[data-advanced-settings] > summary');
      assert.ok(summary, 'advanced settings must be available in journal');
      await summary.evaluate(e => e.scrollIntoView({block: 'center', behavior: 'instant'}));
      await summary.click();
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      assert.ok(await page.$('[data-setting="route-hints"]'), 'advanced setting must remain in journal');
    }
    async function toggle(id) {
      const input = await page.$(`[data-setting="${id}"]`);
      assert.ok(input, `missing setting ${id}`);
      await input.evaluate(e => e.scrollIntoView({block: 'center', behavior: 'instant'}));
      await input.click();
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    }
    async function count(selector) { return page.$$eval(selector, elements => elements.filter(e => e.checkVisibility()).length); }
    async function resolveMorningEvents() {
      // A preparation turn may also open an ordinary morning event in the real engine.
      for (let i = 0; i < 5 && await count('.game-dialog'); i++) {
        const buttons = await page.$$eval('.game-dialog button:not([disabled])', nodes => nodes.filter(n => n.checkVisibility()).map(n => n.innerText));
        assert.ok(buttons.length, 'morning event must provide a choice');
        await click(buttons.find(text => /ถอย|เดินต่อ|ตั้งสติ|รับรู้/.test(text)) || buttons[0], '.game-dialog');
      }
      assert.equal(await count('.game-dialog'), 0, 'morning events must resolve before navigation');
    }
    await page.goto(process.env.UI_TEST_URL || 'http://127.0.0.1:3000/', {waitUntil: 'networkidle0'});
    await page.evaluate(({state, zones, triggered}) => {
      localStorage.clear();
      localStorage.setItem('after_zero_v10_save_state', JSON.stringify(state));
      localStorage.setItem('after_zero_v10_zone_populations', JSON.stringify(zones));
      localStorage.setItem('after_zero_v10_triggered_echoes', JSON.stringify(triggered));
    }, {state, zones, triggered: DYNAMIC_NARRATIVE_EVENTS.map(e => e.id)});
    await page.reload({waitUntil: 'networkidle0'}); await enter();
    assert.equal(await count('[data-route-guidance]'), 0, 'guidance must default off');
    await tab('บันทึก');
    assert.equal(await count('[data-route-checklist]'), 0, 'route guide must default off');
    const journalText = await page.$eval('#life-story-history', e => e.parentElement.innerText);
    assert.equal(journalText.includes('Route Checklist'), false, 'existing saves must not see an ending guide');
    await openAdvanced();
    assert.equal(await page.$eval('[data-setting="route-hints"]', e => e.getAttribute('aria-checked')), 'false');
    await click('ปิดตัวเลข (ปกติ)');
    assert.equal(await count('[data-route-checklist]'), 0, 'numeric outcomes must not enable hints');
    await toggle('route-hints'); assert.equal(await count('[data-route-checklist]'), 1);
    await toggle('route-assistance');
    assert.equal(await count('[data-route-checklist]'), 1, 'both settings may be enabled together');
    await toggle('route-hints');
    await page.screenshot({path: `reports/route-guidance/settings-${width}.png`, fullPage: true});
    if (width < 1024) await click('กิจกรรมวันนี้', '.mobile-nav');
    assert.equal(await count('[data-route-guidance="vaccine"]'), 1);
    assert.equal(await count('.is-pinned'), 0, 'suggestions must not pin automatically');
    await click('ปักหมุด', '[data-route-guidance="vaccine"]');
    assert.equal(await count('[data-action-id="route.vaccine.2"].is-pinned'), 1, 'pinned action must be visible outside collapsed alternatives');
    await page.screenshot({path: `reports/route-guidance/pinned-${width}.png`, fullPage: true});
    await tab('แผนที่');
    assert.equal(await count('[data-location="bkk_office"].is-pinned'), 1);
    await page.screenshot({path: `reports/route-guidance/map-${width}.png`, fullPage: true});
    await page.reload({waitUntil: 'networkidle0'}); await enter();
    assert.equal(await count('[data-action-id="route.vaccine.2"].is-pinned'), 1, 'same-life pin must survive reload');
    await page.locator('[data-action-id="route.vaccine.2"]').click();
    await click('ลงมือเตรียมงานนี้ให้เสร็จ', '.game-dialog');
    await resolveMorningEvents();
    assert.equal(await count('[data-action-id="route.vaccine.2"].is-pinned'), 0, 'completed task must stop highlighting');
    await tab('แผนที่');
    assert.equal(await count('[data-location="bkk_ward"].is-pinned'), 1, 'completed preparation must advance pin to destination: ' + await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('after_zero_v10_save_state'));
      return JSON.stringify({stats: s.stats, items: s.items, flags: s.story.flags, ending: s.ending,
        session: localStorage.getItem('after_zero_v10_route_guidance_session'), tab: document.querySelector('.game-shell').dataset.mobileTab,
        guidance: document.querySelector('[data-route-guidance]')?.innerText,
        markers: [...document.querySelectorAll('.pixel-map-marker.is-pinned')].map(e => e.dataset.location)});
    }));
    await tab('บันทึก'); await openAdvanced();
    await toggle('route-assistance');
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).pinnedRouteId, keys.session), null);
    await toggle('route-assistance');
    if (width < 1024) await click('กิจกรรมวันนี้', '.mobile-nav');
    await click('ไม่แนะนำเส้นทางนี้อีกในชีวิตนี้', '[data-route-guidance="vaccine"]');
    assert.equal(await count('[data-route-guidance="vaccine"]'), 0);
    await page.reload({waitUntil: 'networkidle0'}); await enter();
    assert.equal(await count('[data-route-guidance="vaccine"]'), 0, 'dismissal must survive same-life reload');
    await page.evaluate(({state, keys}) => {
      const changed = structuredClone(state); changed.runId += '-other';
      localStorage.setItem('after_zero_v10_save_state', JSON.stringify(changed));
      localStorage.setItem(keys.session, JSON.stringify({runId: state.runId, pinnedRouteId: 'vaccine', dismissedRouteIds: []}));
    }, {state, keys});
    await page.reload({waitUntil: 'networkidle0'}); await enter();
    assert.equal(await count('[data-action-id="route.vaccine.2"].is-pinned'), 0, 'different life must clear stale pin');
    assert.equal(await count('[data-route-guidance="vaccine"]'), 1, 'different life must clear old dismissal');

    // Importing even the same run must explicitly clear the old objective.
    await click('ปักหมุด', '[data-route-guidance="vaccine"]');
    await tab('บันทึก'); await click('นำเข้าเซฟ (.json)');
    const imported = await page.evaluate(() => localStorage.getItem('after_zero_v10_save_state'));
    await page.focus('textarea[placeholder="วางโค้ด JSON จากไฟล์เซฟที่นี่..."]');
    await page.keyboard.sendCharacter(imported);
    assert.equal(await page.$eval('textarea[placeholder="วางโค้ด JSON จากไฟล์เซฟที่นี่..."]', e => e.value), imported);
    await click('ยืนยันการนำเข้าเซฟ');
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).pinnedRouteId, keys.session), null, 'same-run import must clear pin: ' + await page.evaluate(() => document.body.innerText.match(/ไฟล์เซฟไม่ถูกต้อง[^\n]*/)?.[0] || 'no import error'));
    if (width < 1024) await click('กิจกรรมวันนี้', '.mobile-nav');
    await click('ปักหมุด', '[data-route-guidance="vaccine"]');
    await click('ปลดหมุด', '[data-route-guidance="vaccine"]');
    assert.equal(await count('[data-action-id="route.vaccine.2"].is-pinned'), 0, 'unpin must remove action highlight');

    // Below-threshold, malformed preference, and ended-life fixtures use real save validation.
    await page.evaluate(({state, keys}) => {
      const early = structuredClone(state); delete early.story.flags['route.vaccine.1'];
      localStorage.setItem('after_zero_v10_save_state', JSON.stringify(early));
      localStorage.removeItem(keys.session);
    }, {state, keys});
    await page.reload({waitUntil: 'networkidle0'}); await enter();
    assert.equal(await count('[data-route-guidance]'), 0, 'one-step route must not offer assistance');
    await page.evaluate(({state, keys}) => {
      localStorage.setItem('after_zero_v10_save_state', JSON.stringify(state));
      localStorage.setItem(keys.session, '{broken-json');
      localStorage.setItem(keys.hints, 'invalid');
      localStorage.setItem(keys.assistance, 'invalid');
    }, {state, keys});
    await page.reload({waitUntil: 'networkidle0'}); await enter();
    assert.equal(await count('[data-route-guidance]'), 0, 'malformed preferences must fall back to off');
    await tab('บันทึก'); assert.equal(await count('[data-route-checklist]'), 0);
    await page.evaluate(({state, keys}) => {
      const ended = structuredClone(state);
      ended.ending = {id: 'death', day: ended.day, title: 'สิ้นสุดชีวิต', text: 'การทดสอบชีวิตที่จบแล้ว', causeCode: 'fatal_trauma'};
      ended.stats.hp = 0;
      localStorage.setItem('after_zero_v10_save_state', JSON.stringify(ended));
      localStorage.setItem(keys.assistance, 'true');
      localStorage.setItem(keys.session, JSON.stringify({runId: state.runId, pinnedRouteId: 'vaccine', dismissedRouteIds: []}));
    }, {state, keys});
    await page.reload({waitUntil: 'networkidle0'});
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).pinnedRouteId, keys.session), null, 'ending must clear pin');
    console.log(`PASS preference combinations, import, new life, and ending at ${width}px`);

    await page.evaluate(state => localStorage.setItem('after_zero_v10_save_state', JSON.stringify(state)), state);
    await page.evaluateOnNewDocument(() => {
      const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
      const unavailable = key => key.startsWith('after_zero_v10_route_');
      Storage.prototype.getItem = function(key) { if (unavailable(key)) throw new DOMException('Storage unavailable', 'SecurityError'); return get.call(this, key); };
      Storage.prototype.setItem = function(key, value) { if (unavailable(key)) throw new DOMException('Storage unavailable', 'SecurityError'); return set.call(this, key, value); };
    });
    await page.reload({waitUntil: 'networkidle0'}); await enter(); await resolveMorningEvents();
    await tab('บันทึก'); await openAdvanced();
    assert.equal(await count('[data-route-checklist]'), 0, 'unavailable storage defaults hints off');
    await toggle('route-hints'); assert.equal(await count('[data-route-checklist]'), 1, 'preferences must still work in memory');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'page must not overflow');
    assert.deepEqual(errors, []);
    console.log(`PASS guidance settings, pin lifecycle and map at ${width}px`);
    await context.close();
  }
} catch (error) {
  for (const [i, page] of (await browser.pages()).entries()) {
    await page.screenshot({path: `reports/route-guidance/failure-${i}.png`, fullPage: true});
  }
  throw error;
} finally { await browser.close(); }
