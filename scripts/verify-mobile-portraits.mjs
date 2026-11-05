import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { computePortraitPixels } from '../src/components/ZombiePortrait.js';
import { generateCharacter } from '../src/data/characterPool.js';

function renderSvgString(pixels, bio, mutStage) {
  const rects = pixels
    .map(([x, y, width, height, fill]) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`)
    .join('');
  return `<svg viewBox="0 0 32 33" shape-rendering="crispEdges" class="zombie-portrait mutation-stage-${mutStage}">${rects}</svg>`;
}

const testCases = [
  // Child
  { age: 11, gender: 'ชาย', mutation: 0, desc: 'เด็ก ชาย (ไม่กลายพันธุ์)' },
  { age: 11, gender: 'หญิง', mutation: 0, desc: 'เด็ก หญิง (ไม่กลายพันธุ์)' },
  { age: 11, gender: 'ชาย', mutation: 60, desc: 'เด็ก ชาย (กลายพันธุ์ระยะ 3)' },
  { age: 11, gender: 'หญิง', mutation: 85, desc: 'เด็ก หญิง (กลายพันธุ์ระยะ 4)' },
  // Teen
  { age: 16, gender: 'ชาย', mutation: 0, desc: 'วัยรุ่น ชาย (ไม่กลายพันธุ์)' },
  { age: 16, gender: 'หญิง', mutation: 0, desc: 'วัยรุ่น หญิง (ไม่กลายพันธุ์)' },
  { age: 16, gender: 'ชาย', mutation: 60, desc: 'วัยรุ่น ชาย (กลายพันธุ์ระยะ 3)' },
  { age: 16, gender: 'หญิง', mutation: 85, desc: 'วัยรุ่น หญิง (กลายพันธุ์ระยะ 4)' },
  // Adult
  { age: 35, gender: 'ชาย', mutation: 0, desc: 'ผู้ใหญ่ ชาย (ไม่กลายพันธุ์)' },
  { age: 35, gender: 'หญิง', mutation: 0, desc: 'ผู้ใหญ่ หญิง (ไม่กลายพันธุ์)' },
  { age: 35, gender: 'ชาย', mutation: 60, desc: 'ผู้ใหญ่ ชาย (กลายพันธุ์ระยะ 3)' },
  { age: 35, gender: 'หญิง', mutation: 85, desc: 'ผู้ใหญ่ หญิง (กลายพันธุ์ระยะ 4)' },
  // Elderly
  { age: 72, gender: 'ชาย', mutation: 0, desc: 'ผู้สูงอายุ ชาย มีเครา (ไม่กลายพันธุ์)' },
  { age: 68, gender: 'หญิง', mutation: 0, desc: 'ผู้สูงอายุ หญิง (ไม่กลายพันธุ์)' },
  { age: 70, gender: 'ชาย', mutation: 60, desc: 'ผู้สูงอายุ ชาย (กลายพันธุ์ระยะ 3)' },
  { age: 68, gender: 'หญิง', mutation: 85, desc: 'ผู้สูงอายุ หญิง (กลายพันธุ์ระยะ 4)' },
];

const cardsHtml = testCases.map((tc, idx) => {
  const bio = generateCharacter(1000 + idx, { age: tc.age, gender: tc.gender });
  const mutStage = tc.mutation >= 75 ? 4 : tc.mutation >= 50 ? 3 : tc.mutation >= 25 ? 2 : 1;
  const pixels = computePortraitPixels(bio, tc.mutation);
  const svg = renderSvgString(pixels, bio, mutStage);

  return `
    <div class="test-card">
      <div class="card-label">${tc.desc} (อายุ ${tc.age} ปี)</div>
      <!-- Body tab frame style (w-24 sm:w-28 border bg-slate-950 p-1.5) -->
      <div class="portrait-frame">
        ${svg}
      </div>
      <div class="card-meta">อาชีพ: ${bio.occupation} · Stage ${mutStage}</div>
    </div>
  `;
}).join('\n');

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Zombie Portrait Mobile Verification</title>
  <style>
    body {
      background: #090d16;
      color: #e2e8f0;
      font-family: ui-sans-serif, system-ui, sans-serif;
      margin: 0;
      padding: 16px;
    }
    h1 {
      font-size: 16px;
      margin-bottom: 12px;
      color: #38bdf8;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .test-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .card-label {
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 6px;
      color: #f1f5f9;
    }
    .portrait-frame {
      width: 96px; /* 24 * 4 = w-24 container as in body tab */
      background: rgba(2, 6, 23, 0.9);
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 6px;
      box-sizing: border-box;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .zombie-portrait {
      display: block;
      width: 100%;
      height: auto;
      image-rendering: pixelated;
    }
    .zombie-portrait.mutation-stage-2 {
      filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.35));
    }
    .zombie-portrait.mutation-stage-3 {
      filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.5));
    }
    .zombie-portrait.mutation-stage-4 {
      filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.7));
    }
    .card-meta {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <h1>AFTER ZERO · Zombie Portrait Mobile Viewport (390px)</h1>
  <div class="grid">
    ${cardsHtml}
  </div>
</body>
</html>`;

const outDir = 'reports/portrait-verification';
fs.mkdirSync(outDir, { recursive: true });
const htmlPath = path.join(outDir, 'mobile-verification.html');
fs.writeFileSync(htmlPath, html, 'utf8');

console.log('HTML verification file written:', htmlPath);

// Launch Puppeteer on mobile viewport 390x844 (iPhone 14 / modern mobile)
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto('file:///' + path.resolve(htmlPath).replace(/\\/g, '/'), { waitUntil: 'load' });

  // Check that all SVGs are rendered and not clipped
  const svgMetrics = await page.evaluate(() => {
    const svgs = document.querySelectorAll('svg.zombie-portrait');
    return Array.from(svgs).map(svg => {
      const rect = svg.getBoundingClientRect();
      const parentRect = svg.parentElement.getBoundingClientRect();
      const isContained =
        rect.left >= parentRect.left - 1 &&
        rect.right <= parentRect.right + 1 &&
        rect.top >= parentRect.top - 1 &&
        rect.bottom <= parentRect.bottom + 1;
      return {
        width: rect.width,
        height: rect.height,
        isContained,
      };
    });
  });

  const allContained = svgMetrics.every(m => m.isContained);
  console.log(`Verified ${svgMetrics.length} portraits in mobile layout. All contained within frame:`, allContained);

  const screenshotPath = path.join(outDir, 'mobile-verification.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to:', screenshotPath);
} finally {
  await browser.close();
}
