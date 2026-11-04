import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import puppeteer from 'puppeteer-core';
import {generateCharacter, createCharacterState} from '../src/data/characterPool.ts';
import {createInitialZonePopulations} from '../src/data/pastLifeEchoes.ts';
import {DYNAMIC_NARRATIVE_EVENTS} from '../src/data/eventEngine.ts';

// Use the UI refresh fixture in an isolated context; never open the user's profile.
const engine = {window: {}};
vm.runInNewContext(fs.readFileSync('public/after-zero-bundle.js', 'utf8'), engine);
const state = createCharacterState(engine.window.AfterZeroEngine.Production,
  generateCharacter(2026, {age: 35, occupationId: 'watchman'}));
state.pending = null;
state.day = 5;
state.log = [{id: 10000, day: 4, kind: 'story', text: 'เจ้ากลับมาที่ห้องแถว แสงไฟหลังประตูยังไม่ดับ'}];
const zones = createInitialZonePopulations(2026);
state.npcZones = zones;
const reportDir = 'reports/ui-tabs';
fs.mkdirSync(reportDir, {recursive: true});
const results = [];
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});

try {
  async function scenario(name, width, run) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const errors = [];
    const resourceErrors = [];
    const steps = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) errors.push(message.text());
    });
    page.on('response', response => { if (response.status() >= 400) resourceErrors.push(`${response.status()} ${response.url()}`); });
    async function resize(width) {
      await page.setViewport({width, height: width < 1024 ? 844 : 1080});
    }
    async function click(text, scope = 'body') {
      const handle = await page.evaluateHandle(({text, scope}) =>
        [...document.querySelectorAll(`${scope} button`)].find(button =>
          button.checkVisibility() && button.innerText.includes(text)), {text, scope});
      const button = handle.asElement();
      assert.ok(button, `Missing visible button: ${text}`);
      await button.evaluate(button => button.scrollIntoView({block: 'center', behavior: 'instant'}));
      assert.ok(await button.evaluate(button => {
        const rect = button.getBoundingClientRect();
        return button.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      }), `Button blocked by overlay: ${text}`);
      await button.click();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await handle.dispose();
      steps.push(text);
    }
    async function snapshot() {
      return page.evaluate(() => {
        const visible = element => element?.checkVisibility() && element.getBoundingClientRect().width > 0;
        const side = document.querySelector('.desktop-story-feed').parentElement;
        const bar = innerWidth >= 1024 ? side.children[1] : document.querySelector('.mobile-nav');
        const panels = [...side.children].slice(2).filter(visible);
        return {
          mobileTab: document.querySelector('.game-shell').dataset.mobileTab,
          selected: [...bar.querySelectorAll('button')].filter(button => button.classList.contains('text-lime-300')).map(button => button.innerText),
          panels: panels.map(panel => panel.matches('.pixel-city-map') ? 'map'
            : panel.querySelector('#life-story-history') ? 'journal'
            : panel.querySelector('h3')?.innerText.includes('กระเป๋า (เฉพาะ') ? 'bag'
            : panel.querySelector('h3')?.innerText.includes('ผู้คนใน') ? 'people' : 'unknown'),
          primaryVisible: visible(document.querySelector('.primary-stage')),
          panelHasContent: panels.every(panel => panel.innerText.trim().length > 0),
        };
      });
    }
    const labels = {play: 'กิจกรรมวันนี้', map: 'แผนที่', bag: 'กระเป๋า', people: 'ผู้คน', journal: 'บันทึก'};
    async function check(tab) {
      const actual = await snapshot();
      steps.push({expected: tab, ...actual});
      assert.equal(actual.selected.length, 1, JSON.stringify(actual));
      assert.ok(actual.selected[0].includes(labels[tab]), JSON.stringify(actual));
      assert.deepEqual(actual.panels, tab === 'play' ? [] : [tab], JSON.stringify(actual));
      assert.equal(actual.primaryVisible, page.viewport().width >= 1024 || tab === 'play');
      assert.equal(actual.panelHasContent, true);
      assert.deepEqual(errors, [], 'Browser errors');
    }
    async function tab(id) {
      await click(labels[id], page.viewport().width >= 1024
        ? '.desktop-story-feed + div' : '.mobile-nav');
      await check(id);
    }
    const cycle = async () => { for (const id of ['map', 'bag', 'people', 'journal', 'map']) await tab(id); };
    try {
      await resize(width);
      await page.goto(process.env.UI_TEST_URL || 'http://127.0.0.1:3000/', {waitUntil: 'networkidle0'});
      await page.evaluate(({state, zones, triggered}) => {
        localStorage.setItem('after_zero_v10_user_profile', 'Tab Regression');
        localStorage.setItem('after_zero_v10_save_state', JSON.stringify(state));
        localStorage.setItem('after_zero_v10_zone_populations', JSON.stringify(zones));
        localStorage.setItem('after_zero_v10_triggered_echoes', JSON.stringify(triggered));
      }, {state, zones, triggered: [...DYNAMIC_NARRATIVE_EVENTS.map(event => event.id), 'world-timeline-day6-airdrop']});
      await page.reload({waitUntil: 'networkidle0'});
      await click('เข้าสู่เกม');
      await click('โหลดเซฟเล่นต่อ');
      await page.waitForSelector('[data-playing="true"]');
      await run({page, click, tab, cycle, resize, check});
      assert.deepEqual(errors, [], 'Browser errors');
      results.push({name, passed: true, steps, errors, resourceErrors});
      console.log(`PASS ${name}`);
    } catch (error) {
      results.push({name, passed: false, message: error.message, steps, actual: await snapshot(), errors, resourceErrors});
      await page.screenshot({path: `${reportDir}/${name}-failure.png`, fullPage: true});
      console.error(`FAIL ${name}: ${error.message}`);
    } finally {
      await context.close();
    }
  }

  await scenario('desktop-tabs', 1440, async ({cycle}) => cycle());
  await scenario('desktop-travel-shortcut', 1440, async ({click, check, cycle}) => {
    await click('เปิดแผนที่เดินทาง', '.primary-stage'); await check('map'); await cycle();
  });
  await scenario('desktop-history-shortcut', 1440, async ({click, check, cycle}) => {
    await click('ดูทั้งหมด', '.desktop-story-feed'); await check('journal'); await cycle();
  });
  await scenario('desktop-journal-map-shortcut', 1440, async ({tab, click, check, cycle}) => {
    await tab('journal'); await click('เปิดแผนที่เดินทาง', '.desktop-story-feed ~ div:last-child');
    await check('map'); await cycle();
  });
  await scenario('mobile-tabs-and-shortcuts', 390, async ({tab, click, check, cycle}) => {
    await check('play'); await cycle(); await tab('play');
    await click('เปิดแผนที่เดินทาง', '.primary-stage'); await check('map'); await cycle(); await tab('play');
    await click('ดูทั้งหมด', '.mobile-story-feed'); await check('journal'); await cycle(); await tab('play');
  });
  await scenario('breakpoint-both-directions', 390, async ({tab, resize, check, cycle, click}) => {
    for (const id of ['map', 'bag', 'people', 'journal']) {
      await resize(390); await tab(id); await resize(1440); await check(id); await cycle();
      await tab(id); await resize(390); await check(id); await cycle(); await tab('play');
    }
    await click('ดูทั้งหมด', '.mobile-story-feed'); await check('journal');
    await resize(1023); await check('journal'); await resize(1024); await check('journal'); await cycle();
    await resize(1023); await check('map'); await cycle(); await tab('play');
    await resize(1024); await check('map'); await cycle();
  });
} finally {
  await browser.close();
  fs.writeFileSync(`${reportDir}/results.json`, JSON.stringify(results, null, 2));
}
assert.ok(results.every(result => result.passed), 'Tab regression failed; see reports/ui-tabs/results.json');
