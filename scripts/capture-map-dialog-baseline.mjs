import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const outDir = 'reports/map-dialog-verification/before';
fs.mkdirSync(outDir, { recursive: true });

const cssPath = path.resolve('dist/assets/index-DlZVEYhA.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

const scenarios = [
  {
    id: '1-current',
    title: 'สถานที่ปัจจุบัน (พระราม 8)',
    location: {
      id: 'radio',
      name: 'พระราม 8',
      isCurrent: true,
      description: 'สะพานพระราม 8 และชุมชนริมน้ำ ลมแม่น้ำพัดพาฝุ่นเขม่าตลอดเวลา มีร่องรอยการตั้งเครื่องกีดขวางเก่าที่ถูกทิ้งร้าง',
      averageTrust: 42,
      livingCount: 5,
      threat: 30,
      signals: [{ id: 's1', kind: 'quest', title: 'เบาะแสเกี่ยวกับสถานีส่งสัญญาณฉุกเฉิน' }],
      route: ['radio'],
      preview: { enabled: false, reasons: ['เจ้าอยู่ที่นี่แล้ว'], notices: [], costSummary: [] },
    },
  },
  {
    id: '2-adjacent',
    title: 'ย่านติดกัน (อารีย์ · เดินถึงใน 1 วัน)',
    location: {
      id: 'bkk_cafe',
      name: 'อารีย์',
      isCurrent: false,
      description: 'ย่านคาเฟ่และตรอกซอกซอยเงียบสงบ มีเสบียงแห้งหลงเหลือตามซอกตึก และมีสัญญาณการเคลื่อนไหวของผู้รอดชีวิต',
      averageTrust: 55,
      livingCount: 3,
      threat: 20,
      signals: [{ id: 's2', kind: 'event', title: 'พบร่องรอยการตั้งถิ่นฐานชั่วคราว' }],
      route: ['radio', 'bkk_cafe'],
      travelTarget: 'bkk_cafe',
      preview: { enabled: true, reasons: [], notices: [], costSummary: ['ใช้เวลา 1 วัน', 'ความหิว +15'] },
    },
  },
  {
    id: '3-distant',
    title: 'จุดไกล (พระราม 4 · เดินหลายช่วง 3 วัน)',
    location: {
      id: 'streets',
      name: 'พระราม 4',
      isCurrent: false,
      description: 'ย่านธุรกิจเก่า ถนนกว้าง มีซากรถยนต์และสิ่งกีดขวางกีดขวางทางสัญจร ฝูงซอมบี้เคลื่อนไหวหนาแน่น',
      averageTrust: 25,
      livingCount: 2,
      threat: 75,
      signals: [{ id: 's3', kind: 'crisis', title: 'สัญญาณวิทยุขอความช่วยเหลือด่วนจากซากตึก' }],
      route: ['radio', 'hospital', 'bkk_stockroom', 'streets'],
      travelTarget: 'hospital',
      preview: { enabled: true, reasons: [], notices: [{ text: 'เส้นทางระยะไกล: ต้องผ่านจุดพักหลายช่วง' }], costSummary: ['ช่วงแรก: ใช้เวลา 1 วัน', 'ความหิว +15'] },
    },
  },
  {
    id: '4-long-name',
    title: 'ชื่อยาว (อนุสาวรีย์ชัยสมรภูมิ)',
    location: {
      id: 'bkk_busyard',
      name: 'อนุสาวรีย์ชัยสมรภูมิ (ศูนย์กลางเชื่อมต่อคมนาคมกรุงเทพฯ)',
      isCurrent: false,
      description: 'จุดรวมเส้นทางเดินรถและทางยกระดับ ซากรถเมล์จอดเรียงรายปิดกั้นทัศนวิสัย แต่มีอะไหล่และชิ้นส่วนสำคัญจำนวนมาก',
      averageTrust: 30,
      livingCount: 6,
      threat: 60,
      signals: [{ id: 's4', kind: 'ending', title: '★ จุดรวมพลอพยพภาคสนาม (ทางเลือกบทสรุป)' }],
      route: ['radio', 'bkk_cafe', 'bkk_busyard'],
      travelTarget: 'bkk_cafe',
      preview: { enabled: true, reasons: [], notices: [], costSummary: ['ช่วงแรก: ใช้เวลา 1 วัน', 'ความหิว +15'] },
    },
  },
  {
    id: '5-disabled',
    title: 'เดินทางไม่ได้ (ดินแดง · บาดแผลฉกรรจ์/พลังงานไม่พอ)',
    location: {
      id: 'shelter',
      name: 'ดินแดง',
      isCurrent: false,
      description: 'ชุมชนแฟลตดินแดง มีการกั้นรั้วลวดหนามและค่ายพักของผู้รอดชีวิตกลุ่มใหญ่ การป้องกันแน่นหนา',
      averageTrust: 18,
      livingCount: 8,
      threat: 85,
      signals: [{ id: 's5', kind: 'crisis', title: '! มีเบาะแสว่าคนในย่านนี้ต้องการความช่วยเหลือ' }],
      route: ['radio', 'bkk_cafe', 'shelter'],
      travelTarget: 'bkk_cafe',
      preview: {
        enabled: false,
        reasons: [
          'สภาพร่างกายทรุดหนักเกินกว่าจะเดินเท้า (ความทนทานร่างต่ำกว่า 15)',
          'ความหิวอยู่ในขั้นวิกฤต (ต้องการเสบียงประทังชีวิตก่อนเดินทาง)',
        ],
        notices: [{ text: 'การเดินทางในสภาพนี้เสี่ยงต่อการเสียชีวิตระหว่างทาง' }],
        costSummary: ['ใช้เวลา 1 วัน', 'ความหิว +15'],
      },
    },
  },
];

function renderCurrentDialogHtml(selected) {
  const next = selected.travelTarget;
  return `
    <div class="game-dialog pixel-map-dialog fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3" role="dialog" aria-modal="true">
      <div class="w-full max-w-lg rounded-2xl border border-emerald-600/60 bg-slate-900 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        <div class="flex items-start justify-between gap-3 p-4 border-b border-slate-700 shrink-0">
          <div>
            <p class="text-xs text-emerald-300">
              ${selected.isCurrent
                ? 'ตำแหน่งปัจจุบัน'
                : selected.route.length === 2
                ? 'ย่านติดกัน · เดินถึงใน 1 วัน'
                : `สำรวจปลายทาง · ห่าง ${Math.max(0, selected.route.length - 1)} ช่วง`}
            </p>
            <h2 id="map-place-title" class="font-bold text-xl mt-1 text-slate-100">${selected.name}</h2>
          </div>
          <button type="button" aria-label="ปิดข้อมูลสถานที่" class="w-12 shrink-0 text-xl text-slate-300 h-10 flex items-center justify-center">
            ×
          </button>
        </div>
        <div class="pixel-map-dialog-body p-4 space-y-4 overflow-y-auto">
          <p class="text-sm text-slate-300 leading-relaxed">${selected.description}</p>
          <div class="grid grid-cols-2 gap-3">
            <div class="p-3 bg-slate-950 rounded-lg">
              <p class="text-xs text-emerald-300">ความไว้ใจเฉลี่ย</p>
              <p class="font-mono text-xl mt-1 text-slate-100">${Math.round(selected.averageTrust)}<span class="text-xs text-slate-500">/100</span></p>
              <p class="text-[11px] text-slate-400 mt-1">ผู้รอดชีวิต ${selected.livingCount} คน</p>
            </div>
            <div class="p-3 bg-slate-950 rounded-lg">
              <p class="text-xs text-amber-300">ภัยคุกคาม</p>
              <p class="font-mono text-xl mt-1 text-slate-100">${Math.round(selected.threat)}<span class="text-xs text-slate-500">/100</span></p>
              <p class="text-[11px] text-slate-400 mt-1">${selected.threat >= 65 ? 'อันตรายสูง' : selected.threat >= 35 ? 'ควรระวัง' : 'ค่อนข้างสงบ'}</p>
            </div>
          </div>
          ${selected.signals.length ? `
            <div class="space-y-2">
              <h3 class="text-sm font-bold text-amber-200">เรื่องที่เกิดขึ้นในย่านนี้</h3>
              ${selected.signals.map(s => `
                <p class="text-xs p-2.5 border rounded-lg ${
                  s.kind === 'crisis'
                    ? 'border-rose-500/50 bg-rose-950/30 text-rose-200'
                    : 'border-amber-800/60 text-amber-100'
                }">
                  ${s.kind === 'crisis' ? '! ' : s.kind === 'ending' ? '★ ' : '? '}
                  ${s.title}
                </p>
              `).join('')}
            </div>
          ` : ''}
          ${!selected.isCurrent && selected.route.length === 2 ? `
            <div class="text-xs text-emerald-200 p-3 bg-emerald-950/35 border border-emerald-500/30 rounded-lg">
              <p class="font-bold mb-1">เส้นทางเชื่อมต่อโดยตรง (1 ช่วง · 1 วัน)</p>
              <p>${selected.route.join(' → ')}</p>
            </div>
          ` : ''}
          ${!selected.isCurrent && selected.route.length > 2 ? `
            <div class="text-xs text-sky-200 p-3 bg-sky-950/40 border border-sky-500/30 rounded-lg">
              <p class="font-bold mb-1">ต้องเดินทางเป็นช่วงตามแนวถนน รวม ${selected.route.length - 1} ช่วง</p>
              <p>${selected.route.join(' → ')}</p>
              <p class="mt-2">รอบนี้เดินทางช่วงแรกไป${next || ''}ก่อน ใช้ 1 วัน</p>
            </div>
          ` : ''}
          ${selected.preview.notices.map(n => `<p class="text-xs text-amber-200">${n.text}</p>`).join('')}
          ${selected.preview.costSummary?.map(text => `<p class="text-xs text-slate-300">${text}</p>`).join('') || ''}
          ${!selected.preview.enabled && selected.preview.reasons.map(text => `<p class="text-xs text-slate-400">${text}</p>`).join('')}
        </div>
        <div class="pixel-map-dialog-actions p-4 border-t border-slate-700 shrink-0">
          <button
            type="button"
            ${!selected.preview.enabled || !next ? 'disabled' : ''}
            class="w-full min-h-12 rounded-xl px-4 py-3 font-bold text-sm bg-lime-300 text-slate-950 disabled:bg-slate-800 disabled:text-slate-500"
          >
            ${selected.isCurrent
              ? 'เจ้าอยู่ที่นี่แล้ว'
              : selected.route.length > 2
              ? `เดินทางช่วงแรกไป${next || ''} · 1 วัน`
              : 'เดินทางมาที่นี่ · 1 วัน'}
          </button>
        </div>
      </div>
    </div>
  `;
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });

  const viewports = [
    { width: 320, height: 640, name: '320px' },
    { width: 390, height: 844, name: '390px' },
    { width: 1440, height: 900, name: '1440px' },
  ];

  for (const sc of scenarios) {
    for (const vp of viewports) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });
      
      const fullHtml = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>${sc.title} - ${vp.name}</title>
  <style>
    ${cssContent}
    body { background: #0c1410; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  ${renderCurrentDialogHtml(sc.location)}
</body>
</html>`;

      await page.setContent(fullHtml, { waitUntil: 'load' });
      const imgName = `before-${sc.id}-${vp.name}.png`;
      const imgPath = path.join(outDir, imgName);
      await page.screenshot({ path: imgPath });
      console.log(`Saved: ${imgPath}`);
      await page.close();
    }
  }

  await browser.close();
  console.log('All baseline BEFORE screenshots captured successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
