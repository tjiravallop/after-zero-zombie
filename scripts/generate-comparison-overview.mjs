import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const reportsDir = 'reports/people-roster-redesign';
const artifactsDir = 'C:/Users/onura/.gemini/antigravity/brain/9f1f78a7-3b26-4dc5-b0be-f200fbe638d4';

const beforeImageBase64 = fs.readFileSync(path.join(reportsDir, 'before/before-people-390px.png')).toString('base64');
const afterImageBase64 = fs.readFileSync(path.join(reportsDir, 'after/after-full-roster-390px-standard-mobile.png')).toString('base64');

const html = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>Before vs After Comparison</title>
  <style>
    body {
      background: #020617;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 24px;
      box-sizing: border-box;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .header h1 {
      font-size: 20px;
      font-weight: 800;
      color: #f1f5f9;
      margin: 0 0 6px;
    }
    .header p {
      font-size: 13px;
      color: #94a3b8;
      margin: 0;
    }
    .comparison-grid {
      display: flex;
      justify-content: center;
      gap: 32px;
      align-items: flex-start;
    }
    .column {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .pill {
      font-size: 11px;
      font-weight: 700;
      font-family: monospace;
      padding: 4px 12px;
      border-radius: 9999px;
      letter-spacing: 0.05em;
    }
    .pill-before {
      background: #3f1519;
      color: #fca5a5;
      border: 1px solid #7f1d1d;
    }
    .pill-after {
      background: #143521;
      color: #86efac;
      border: 1px solid #166534;
    }
    .img-wrap {
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #334155;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      background: #090d16;
      width: 390px;
    }
    .img-wrap img {
      width: 100%;
      display: block;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>AFTER ZERO · เปรียบเทียบหน้าจอแท็บผู้คน (People Tab Redesign)</h1>
    <p>ก่อนปรับปรุง (ซ้าย: รายชื่อแถวเดี่ยวยาว ซ้ำซ้อน) vs หลังปรับปรุง (ขวา: 2 คอลัมน์, ปักหมุดวิกฤตด่วนบนสุด, เก็บผู้เสียชีวิตย้อนหลัง)</p>
  </div>
  <div class="comparison-grid">
    <div class="column">
      <span class="pill pill-before">BEFORE (แบบเดิม)</span>
      <div class="img-wrap">
        <img src="data:image/png;base64,${beforeImageBase64}" alt="Before" />
      </div>
    </div>
    <div class="column">
      <span class="pill pill-after">AFTER (Tactical Survivor Dossier)</span>
      <div class="img-wrap">
        <img src="data:image/png;base64,${afterImageBase64}" alt="After" />
      </div>
    </div>
  </div>
</body>
</html>
`;

async function run() {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 920, height: 1100 });
    await page.setContent(html, { waitUntil: 'load' });
    const outPath = path.join(reportsDir, 'before-after-comparison-390px.png');
    await page.screenshot({ path: outPath, fullPage: true });
    fs.copyFileSync(outPath, path.join(artifactsDir, 'before-after-comparison-390px.png'));
    console.log('Saved before-after comparison image successfully!');
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
