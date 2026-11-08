import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import puppeteer from 'puppeteer-core';
import { generateCharacter, createCharacterState } from '../src/data/characterPool.ts';
import { createInitialZonePopulations } from '../src/data/pastLifeEchoes.ts';
import { DYNAMIC_NARRATIVE_EVENTS } from '../src/data/eventEngine.ts';

const outDir = 'reports/journal-save-redesign/after';
fs.mkdirSync(outDir, { recursive: true });

// Load bundled engine
const engine = { window: {} };
vm.runInNewContext(fs.readFileSync('public/after-zero-bundle.js', 'utf8'), engine);
const zones = createInitialZonePopulations(2026);

// Base multi-day state fixture
function createMultiDayState() {
  const char = generateCharacter(2026, { age: 35, occupationId: 'watchman' });
  const state = createCharacterState(engine.window.AfterZeroEngine.Production, char);
  Object.assign(state, {
    day: 5,
    place: 'bkk_winstop',
    pending: null,
    npcZones: zones,
  });
  Object.assign(state.stats, { research: 45, humanity: 75, sanity: 60, trust: 50, hp: 80, mutation: 28 });
  state.items.samples = 1;
  state.story.flags['bkk_winstop.helped'] = true;
  state.story.flags['route.vaccine.0'] = true;
  state.story.flags['route.vaccine.1'] = true;
  
  // Rich log across 5 days
  state.log = [
    { id: 101, day: 1, kind: 'story', text: 'วันที่ 1: ตื่นขึ้นมาในซากตึกแถว ฝุ่นควันลอยคลุ้ง แสงแดดส่องผ่านรอยแตกบนหลังคา' },
    { id: 102, day: 1, kind: 'action', text: 'ออกค้นหาเศษอาหารตามซอกร้านค้า ได้อาหารประทังชีพ' },
    { id: 103, day: 2, kind: 'story', text: 'วันที่ 2: เดินทางมาถึงตลาดห้วยขวาง พบสัญญาณวิทยุลึกลับดังมาจากอาคารพาณิชย์', effects: ['ความไว้ใจของสมชาย +10'] },
    { id: 104, day: 2, kind: 'action', text: 'ช่วยซ่อมแซมแผงไฟทางเดิน ตลาดเริ่มมีแสงสว่าง' },
    { id: 105, day: 3, kind: 'story', text: 'วันที่ 3: ร่างกายเริ่มมีอาการชาที่ปลายนิ้ว การกลายพันธุ์ก้าวสู่ขั้นที่หนึ่ง ผิวหนังเริ่มด้านแข็ง' },
    { id: 106, day: 4, kind: 'story', text: 'วันที่ 4: ลำเลียงกล่องยาและเสบียงมาส่งที่คิววินดินแดง ผู้รอดชีวิตเริ่มจำหน้าเราได้' },
    { id: 107, day: 5, kind: 'story', text: 'วันที่ 5: ได้ยินเสียงเฮลิคอปเตอร์ลาดตระเวนบินผ่านขอบฟ้ามุ่งหน้าสู่เขตดอนเมือง' }
  ];
  return state;
}

const testUrl = process.env.UI_TEST_URL || 'http://localhost:3000/';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const report = {
  timestamp: new Date().toISOString(),
  checks: [],
  screenshots: []
};

try {
  console.log('--- STARTING VERIFICATION FOR JOURNAL / SAVE REDESIGN ---');

  // Helper function to enter playing state
  async function setupAndEnterGame(page, state, hints = false, numeric = false) {
    await page.goto(testUrl, { waitUntil: 'networkidle0' });
    await page.evaluate(({ st, zn, tr, hints, numeric }) => {
      localStorage.clear();
      localStorage.setItem('after_zero_v10_user_profile', 'Test Survivor');
      localStorage.setItem('after_zero_v10_save_state', JSON.stringify(st));
      localStorage.setItem('after_zero_v10_zone_populations', JSON.stringify(zn));
      localStorage.setItem('after_zero_v10_triggered_echoes', JSON.stringify(tr));
      localStorage.setItem('after_zero_v10_route_hints', String(hints));
      localStorage.setItem('after_zero_v10_mutation_milestones', JSON.stringify([25]));
      if (numeric) {
        localStorage.setItem('after_zero_v10_numeric_spoilers', 'true');
      }
    }, { st: state, zn: zones, tr: DYNAMIC_NARRATIVE_EVENTS.map(e => e.id), hints, numeric });

    await page.reload({ waitUntil: 'networkidle0' });

    // Login screen submit
    const submitBtn = await page.waitForSelector('.title-menu button[type="submit"]', { timeout: 5000 });
    await submitBtn.click();
    await page.evaluate(() => new Promise(r => setTimeout(r, 400)));

    // If hub stage appeared, click load save
    const hubLoadBtn = await page.$('button.bg-emerald-400');
    if (hubLoadBtn) {
      await hubLoadBtn.click();
      await page.evaluate(() => new Promise(r => setTimeout(r, 400)));
    }

    await page.waitForSelector('[data-playing="true"]', { timeout: 5000 });
  }

  async function openJournalTab(page, width) {
    if (width < 1024) {
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('.mobile-nav button')].find(b => b.innerText.includes('บันทึก'));
        btn?.click();
      });
    } else {
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('.desktop-story-feed + div button')].find(b => b.innerText.includes('บันทึก'));
        btn?.click();
      });
    }
    await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
  }

  async function clickSubTab(page, name) {
    await page.evaluate((text) => {
      const buttons = [...document.querySelectorAll('[role="tablist"] button')];
      const target = buttons.find(b => b.innerText.includes(text));
      if (!target) throw new Error(`Missing subtab containing: ${text}`);
      target.scrollIntoView({ block: 'center' });
      target.click();
    }, name);
    await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
  }

  // =========================================================================
  // SCENARIO 1: DESKTOP 1440px Verification & Full Sub-Tab Captures
  // =========================================================================
  console.log('\n[TEST 1] Desktop 1440px - Sub-tabs, Day Filtering, Milestones, Clues & Save Management');
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    const state = createMultiDayState();
    await setupAndEnterGame(page, state, true, false);

    await openJournalTab(page, 1440);

    // 1.1 Verify Story Sub-Tab
    const storyTabVisible = await page.$eval('#life-story-history', el => el.checkVisibility());
    assert.ok(storyTabVisible, 'StoryFeed (#life-story-history) must be visible in story sub-tab');
    
    // Check Mutation Milestone card
    const milestoneText = await page.evaluate(() => document.body.innerText);
    assert.ok(milestoneText.includes('ประวัติการกลายพันธุ์ระดับสำคัญ'), 'Milestone card must be present when milestones unlocked');
    assert.ok(milestoneText.includes('1/3 ขั้น'), 'Should show 1/3 milestone unlocked');

    // Capture Desktop Story Sub-Tab
    const pathStory = `${outDir}/desktop-1440-subtab-story.png`;
    await page.screenshot({ path: pathStory, fullPage: true });
    report.screenshots.push(pathStory);
    console.log(`  ✓ Story sub-tab verified & captured: ${pathStory}`);

    // 1.2 Verify Day Filter Buttons
    const dayFilterPills = await page.evaluate(() => {
      const pills = [...document.querySelectorAll('button')].filter(b => b.innerText.startsWith('วันที่ ') || b.innerText === 'ทั้งหมด');
      return pills.map(p => p.innerText.trim());
    });
    console.log(`  ✓ Available day filter pills: ${dayFilterPills.join(', ')}`);
    assert.ok(dayFilterPills.includes('ทั้งหมด') && dayFilterPills.includes('วันที่ 1'), 'Day filters must include ทั้งหมด and individual days');

    // Click 'วันที่ 1' filter and check log filtering
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.innerText === 'วันที่ 1');
      btn?.click();
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
    const filteredText = await page.$eval('#life-story-history', el => el.innerText);
    assert.ok(filteredText.includes('วันที่ 1: ตื่นขึ้นมา'), 'Filtered log must show Day 1 entry');
    assert.ok(!filteredText.includes('วันที่ 5: ได้ยินเสียง'), 'Filtered log must NOT show Day 5 entry');
    console.log('  ✓ Day 1 filter accurately isolated Day 1 entries');

    // Reset filter to 'ทั้งหมด'
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.innerText === 'ทั้งหมด');
      btn?.click();
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 200)));

    // 1.3 Verify Clues Sub-Tab
    console.log('  Switching to Clues sub-tab...');
    await clickSubTab(page, 'เบาะแสเส้นทาง');
    
    // Verify route hints checklist
    const hasRouteChecklist = await page.$('[data-route-checklist]');
    if (!hasRouteChecklist) {
      const bodySnippet = await page.evaluate(() => document.querySelector('.desktop-story-feed ~ div')?.innerText || document.body.innerText);
      console.log('DEBUG: Journal panel text in clues subtab:', bodySnippet.substring(0, 500));
    }
    assert.ok(hasRouteChecklist, 'Route checklist must be present in clues sub-tab when hints enabled');
    const cluesVisible = await page.$eval('[data-route-checklist]', el => el.checkVisibility());
    assert.ok(cluesVisible, 'Route checklist must be visible');
    const cluesText = await page.$eval('[data-route-checklist]', el => el.innerText);
    assert.ok(cluesText.includes('สมุดบันทึกเบาะแสเส้นทางสู่อนาคต'), 'Checklist header must match');
    assert.ok(cluesText.includes('ปิดตัวเลข (ใช้บทบรรยาย)'), 'Default spoiler mode should be descriptive');

    const pathClues = `${outDir}/desktop-1440-subtab-clues.png`;
    await page.screenshot({ path: pathClues, fullPage: true });
    report.screenshots.push(pathClues);
    console.log(`  ✓ Clues sub-tab verified & captured: ${pathClues}`);

    // Toggle Numeric Spoilers button in Clues view
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('ปิดตัวเลข') || b.innerText.includes('กำลังเปิดตัวเลข'));
      btn?.click();
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
    const numericCluesText = await page.$eval('[data-route-checklist]', el => el.innerText);
    assert.ok(numericCluesText.includes('กำลังเปิดตัวเลขตรงๆ'), 'Toggle should update button label');
    assert.ok(numericCluesText.includes('ตัวอย่างเชื้อ 1/'), 'Numeric spoiler should reveal sample counts directly');
    console.log('  ✓ Numeric spoiler toggle dynamically switchable in Clues sub-tab');

    // 1.4 Verify Save Management Sub-Tab
    await clickSubTab(page, 'จัดการเซฟ');
    const saveTabText = await page.evaluate(() => document.body.innerText);
    assert.ok(saveTabText.includes('จัดการและสำรองข้อมูลเซฟ'), 'Save management header present');
    assert.ok(saveTabText.includes('ส่งออกเซฟ (.json)'), 'Export button present');
    assert.ok(saveTabText.includes('นำเข้าเซฟ (.json)'), 'Import button present');
    assert.ok(saveTabText.includes('ระบบเสียงบรรยากาศเขตกักกันกรุงเทพฯ'), 'Ambient soundscape present');
    assert.ok(saveTabText.includes('ยอมแพ้ต่อสัญชาตญาณ'), 'Surrender button present in isolated card');

    const pathSave = `${outDir}/desktop-1440-subtab-save.png`;
    await page.screenshot({ path: pathSave, fullPage: true });
    report.screenshots.push(pathSave);
    console.log(`  ✓ Save management sub-tab verified & captured: ${pathSave}`);

    // 1.5 Test Export Save feedback banner
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('ส่งออกเซฟ (.json)'));
      btn?.click();
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
    const exportBanner = await page.evaluate(() => {
      const banner = document.querySelector('.bg-emerald-950\\/70');
      return banner ? banner.innerText : null;
    });
    assert.ok(exportBanner && exportBanner.includes('ส่งออกไฟล์เซฟ (.json) เรียบร้อยแล้ว'), 'Inline export success banner must show');
    console.log('  ✓ Export save triggered immediate inline success banner');

    // 1.6 Test Corrupted JSON Import rejection
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('นำเข้าเซฟ (.json)'));
      btn?.click();
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 200)));

    // Type corrupted json
    await page.type('textarea', '{ corrupted_json_broken');
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('ยืนยันการนำเข้าเซฟ'));
      btn?.click();
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
    const errorBanner = await page.evaluate(() => {
      const banner = document.querySelector('.bg-rose-950\\/70');
      return banner ? banner.innerText : null;
    });
    assert.ok(errorBanner && errorBanner.includes('ไฟล์เซฟไม่ถูกต้อง'), 'Inline error banner must reject corrupted JSON');
    console.log(`  ✓ Corrupted JSON rejected with inline error banner: "${errorBanner?.trim()}"`);

    // 1.7 Test Empty JSON Import rejection
    await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        nativeSetter?.call(textarea, '');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('ยืนยันการนำเข้าเซฟ'));
      btn?.click();
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
    const emptyBanner = await page.evaluate(() => {
      const banner = document.querySelector('.bg-rose-950\\/70');
      return banner ? banner.innerText : null;
    });
    assert.ok(emptyBanner && emptyBanner.includes('กรุณาวางโค้ด JSON จากไฟล์เซฟ'), 'Empty JSON rejected');
    console.log(`  ✓ Empty JSON rejected with inline warning: "${emptyBanner?.trim()}"`);

    // 1.8 Test Surrender Confirmation Modal
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('ยอมแพ้ต่อสัญชาตญาณ'));
      btn?.click();
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
    const modalText = await page.evaluate(() => {
      const modal = document.querySelector('.game-dialog') || document.querySelector('[role="dialog"]');
      return modal ? modal.innerText : '';
    });
    assert.ok(modalText.includes('ยอมแพ้ต่อสัญชาตญาณซอมบี้') || modalText.includes('จบชีวิตตัวละคร'), 'Surrender modal opened with confirmation');
    
    // Close modal by clicking cancel
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('กลับไปพยายามต่อ') || b.innerText.includes('ยกเลิก'));
      btn?.click();
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
    console.log('  ✓ Surrender button triggers original modal safely isolated in danger zone');

    report.checks.push({ name: 'Desktop 1440px Verification', passed: true });
    await page.close();
  }

  // =========================================================================
  // SCENARIO 2: MOBILE 390px Verification & Sub-Tab Captures
  // =========================================================================
  console.log('\n[TEST 2] Mobile 390px - Sub-tabs, Touch Targets, Clues & Save Management');
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    const state = createMultiDayState();
    await setupAndEnterGame(page, state, true, false);

    await openJournalTab(page, 390);

    // Verify touch target min-height for sub-tab buttons
    const tabHeights = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('[role="tablist"] button')];
      return btns.map(b => b.getBoundingClientRect().height);
    });
    assert.ok(tabHeights.every(h => h >= 38), `Sub-tab buttons must have accessible touch height >= 38px (actual: ${tabHeights.join(', ')})`);
    console.log(`  ✓ Accessible touch target heights: ${tabHeights.map(h => Math.round(h) + 'px').join(', ')}`);

    // Capture Mobile Story Sub-Tab
    const pathStoryMobile = `${outDir}/mobile-390-subtab-story.png`;
    await page.screenshot({ path: pathStoryMobile, fullPage: true });
    report.screenshots.push(pathStoryMobile);
    console.log(`  ✓ Mobile Story sub-tab captured: ${pathStoryMobile}`);

    // Capture Mobile Clues Sub-Tab
    await clickSubTab(page, 'เบาะแสเส้นทาง');
    const pathCluesMobile = `${outDir}/mobile-390-subtab-clues.png`;
    await page.screenshot({ path: pathCluesMobile, fullPage: true });
    report.screenshots.push(pathCluesMobile);
    console.log(`  ✓ Mobile Clues sub-tab captured: ${pathCluesMobile}`);

    // Capture Mobile Save Sub-Tab
    await clickSubTab(page, 'จัดการเซฟ');
    const pathSaveMobile = `${outDir}/mobile-390-subtab-save.png`;
    await page.screenshot({ path: pathSaveMobile, fullPage: true });
    report.screenshots.push(pathSaveMobile);
    console.log(`  ✓ Mobile Save sub-tab captured: ${pathSaveMobile}`);

    report.checks.push({ name: 'Mobile 390px Verification', passed: true });
    await page.close();
  }

  // =========================================================================
  // SCENARIO 3: MOBILE 320px Ultra-Compact Viewport
  // =========================================================================
  console.log('\n[TEST 3] Mobile 320px - Ultra Compact Viewport');
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 320, height: 600, isMobile: true, hasTouch: true });
    const state = createMultiDayState();
    await setupAndEnterGame(page, state, false, false); // hints false to verify sealed notice

    await openJournalTab(page, 320);

    // Verify sealed clues notice in 320px
    await clickSubTab(page, 'เบาะแสเส้นทาง');
    const sealedNoticeText = await page.evaluate(() => document.body.innerText);
    assert.ok(sealedNoticeText.includes('สมุดบันทึกเบาะแสถูกปิดไว้เพื่อสวมบทบาท'), 'Sealed clues notice rendered when hints disabled');
    
    // Test 1-click enable button
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('เปิดแสดงสมุดบันทึกเบาะแส'));
      btn?.click();
    });
    await page.evaluate(() => new Promise(r => setTimeout(r, 300)));

    const unsealedChecklist = await page.$eval('[data-route-checklist]', el => el.checkVisibility());
    assert.ok(unsealedChecklist, '1-click enable button must immediately unlock route checklist');
    console.log('  ✓ 1-click enable in sealed notice seamlessly reveals route checklist on 320px');

    // Switch back to Story tab for 320px capture
    await clickSubTab(page, 'เรื่องราวชีวิต');
    const path320Story = `${outDir}/mobile-320-subtab-story.png`;
    await page.screenshot({ path: path320Story, fullPage: true });
    report.screenshots.push(path320Story);
    console.log(`  ✓ Mobile 320px Story sub-tab captured: ${path320Story}`);

    report.checks.push({ name: 'Mobile 320px Compact Verification', passed: true });
    await page.close();
  }

  // =========================================================================
  // SCENARIO 4: Empty Log Edge Case
  // =========================================================================
  console.log('\n[TEST 4] Edge Case: Empty Log');
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960 });
    const emptyState = createMultiDayState();
    emptyState.log = []; // Empty log!

    await setupAndEnterGame(page, emptyState, true, false);
    await openJournalTab(page, 1440);

    const emptyHistoryText = await page.$eval('#life-story-history', el => el.innerText);
    assert.ok(emptyHistoryText.length > 0, 'Empty log must render cleanly without crash');
    
    // Day filter pills should not be present when no days
    const dayPillsCount = await page.evaluate(() => {
      return [...document.querySelectorAll('button')].filter(b => b.innerText.startsWith('วันที่ ')).length;
    });
    assert.equal(dayPillsCount, 0, 'No day filter pills when log has 0 days');
    console.log('  ✓ Empty log handled gracefully without throwing or rendering orphan filters');

    report.checks.push({ name: 'Empty Log Verification', passed: true });
    await page.close();
  }

  console.log('\n======================================================');
  console.log(' ALL VERIFICATION CHECKS COMPLETED AND PASSED (4/4)!');
  console.log(' Captured 7 screenshots into reports/journal-save-redesign/after/');
  console.log('======================================================');

} catch (err) {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exitCode = 1;
} finally {
  await browser.close();
  fs.writeFileSync('reports/journal-save-redesign/verification-report.json', JSON.stringify(report, null, 2));
}
