import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const outDir = 'reports/map-dialog-verification/after';
fs.mkdirSync(outDir, { recursive: true });

// Find latest compiled css in dist/assets
const assetFiles = fs.readdirSync('dist/assets');
const cssFile = assetFiles.find(f => f.endsWith('.css'));
if (!cssFile) {
  console.error('No CSS file found in dist/assets!');
  process.exit(1);
}
const cssPath = path.resolve('dist/assets', cssFile);
const cssContent = fs.readFileSync(cssPath, 'utf8');

const scenarios = [
  {
    id: '1-current',
    title: 'สถานที่ปัจจุบัน (พระราม 8)',
    location: {
      id: 'radio',
      name: 'พระราม 8',
      short: 'พระราม 8',
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
      short: 'อารีย์',
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
      short: 'พระราม 4',
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
      short: 'อนุสาวรีย์ชัยฯ',
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
      short: 'ดินแดง',
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

const MAP_LABELS = {
  radio: 'พระราม 8',
  bkk_cafe: 'อารีย์',
  hospital: 'รพ.ราชวิถี',
  bkk_stockroom: 'ประตูน้ำ',
  streets: 'พระราม 4',
  bkk_busyard: 'อนุสาวรีย์ชัยฯ',
  shelter: 'ดินแดง',
};

function renderAfterDialogHtml(selected) {
  const next = selected.travelTarget;
  const currentPlaceName = 'พระราม 8';
  return `
    <div
      class="game-dialog pixel-map-dialog fixed inset-0 z-50 bg-[#070e0a]/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-place-title"
    >
      <div class="pixel-map-dialog-panel w-full max-w-lg rounded-[4px] border border-[#6b7e5a] bg-[#111c15] text-[#e6ecd9] shadow-2xl flex flex-col overflow-hidden max-h-[92dvh]">
        
        <!-- Top Status Banner Bar -->
        <div class="pixel-map-dialog-banner ${
          selected.isCurrent
            ? 'is-current'
            : selected.route.length === 2
            ? 'is-neighbor'
            : 'is-distant'
        }">
          <span class="flex items-center gap-1.5 font-bold font-mono text-[11px] tracking-wide">
            <span class="pixel-banner-dot" aria-hidden="true"></span>
            ${selected.isCurrent
              ? 'ตำแหน่งปัจจุบัน (คุณอยู่ที่นี่แล้ว)'
              : selected.route.length === 2
              ? 'ย่านติดกัน · เดินถึงได้ใน 1 วัน'
              : `ปลายทางระยะไกล · ต้องเดินทาง ${Math.max(0, selected.route.length - 1)} ช่วง`}
          </span>
          <span class="text-[11px] font-mono opacity-85">
            ${selected.isCurrent ? 'ZONE: CURRENT' : selected.route.length === 2 ? 'ZONE: DIRECT' : `HOP: ${Math.max(0, selected.route.length - 1)} DAYS`}
          </span>
        </div>

        <!-- Header -->
        <div class="pixel-map-dialog-header p-3.5 sm:p-4 border-b border-[#2d3f31] flex items-start justify-between gap-3 shrink-0">
          <div class="min-w-0 flex-1">
            <h2 id="map-place-title" class="font-bold text-lg sm:text-xl text-[#f0e5c9] leading-snug break-words">
              ${selected.name}
            </h2>
            <div class="text-xs text-[#a4b79b] mt-1 flex items-center gap-2 flex-wrap">
              <span class="inline-flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-[#bfd773] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>${MAP_LABELS[selected.id] || selected.short || selected.name}</span>
              </span>
              <span class="text-[#4e6451]" aria-hidden="true">•</span>
              <span>
                ${selected.isCurrent
                  ? 'ปักหลักอยู่ในย่านนี้'
                  : selected.route.length === 2
                  ? `เชื่อมต่อตรงจาก ${currentPlaceName}`
                  : `ห่าง ${selected.route.length - 1} ช่วงจาก ${currentPlaceName}`}
              </span>
            </div>
          </div>
          <button
            type="button"
            aria-label="ปิดข้อมูลสถานที่"
            class="pixel-map-dialog-close-btn w-12 h-12 shrink-0 rounded-[3px] bg-[#16241a] border border-[#3c523e] hover:bg-[#233829] hover:text-[#f0e5c9] text-[#c4d4be] flex items-center justify-center transition-colors touch-manipulation"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <!-- Scrollable Body -->
        <div class="pixel-map-dialog-body p-3.5 sm:p-4 space-y-3.5 overflow-y-auto overscroll-contain">
          <!-- Description -->
          <p class="text-xs sm:text-sm text-[#cad5c3] leading-relaxed break-words">
            ${selected.description}
          </p>

          <!-- Stats Strip -->
          <div class="grid grid-cols-2 gap-2.5">
            <div class="p-2.5 sm:p-3 bg-[#0c1510] border border-[#2b3d30] rounded-[3px]">
              <div class="flex items-center justify-between text-xs text-[#9bb094]">
                <span>ความไว้ใจเฉลี่ย</span>
                <svg class="w-3.5 h-3.5 text-[#9bb094]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <p class="font-mono text-lg sm:text-xl font-bold text-[#d2f78e] mt-1">
                ${Math.round(selected.averageTrust)}
                <span class="text-xs text-[#5e7460] font-normal">/100</span>
              </p>
              <p class="text-[11px] text-[#81967c] mt-0.5">
                ผู้รอดชีวิต ${selected.livingCount} คน
              </p>
            </div>
            <div class="p-2.5 sm:p-3 bg-[#0c1510] border border-[#2b3d30] rounded-[3px]">
              <div class="flex items-center justify-between text-xs text-[#e2a660]">
                <span>ระดับภัยคุกคาม</span>
                <svg class="w-3.5 h-3.5 text-[#e2a660]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <p class="font-mono text-lg sm:text-xl font-bold text-[#fcd34d] mt-1">
                ${Math.round(selected.threat)}
                <span class="text-xs text-[#7e694b] font-normal">/100</span>
              </p>
              <p class="text-[11px] text-[#a49171] mt-0.5">
                ${selected.threat >= 65 ? 'อันตรายสูงมาก' : selected.threat >= 35 ? 'ควรระวังเป็นพิเศษ' : 'ค่อนข้างสงบ'}
              </p>
            </div>
          </div>

          <!-- Route Details -->
          ${!selected.isCurrent && selected.route.length === 2 ? `
            <div class="p-2.5 sm:p-3 bg-[#132319] border border-[#39543e] rounded-[3px] text-xs text-[#d2dfbd] space-y-1">
              <div class="font-bold text-[#d8f28d] flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                <span>เส้นทางเชื่อมต่อโดยตรง (1 ช่วง · 1 วัน)</span>
              </div>
              <p class="text-[#a8bc99] font-mono text-[11px] pt-0.5">
                ${selected.route.map(r => MAP_LABELS[r] || r).join(' ➔ ')}
              </p>
            </div>
          ` : ''}

          ${!selected.isCurrent && selected.route.length > 2 ? `
            <div class="p-2.5 sm:p-3 bg-[#0f242e] border border-[#215163] rounded-[3px] text-xs text-[#c6e4f2] space-y-1.5">
              <div class="font-bold text-[#7dd3fc] flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                <span>ต้องเดินทางตามแนวถนน รวม ${selected.route.length - 1} ช่วง</span>
              </div>
              <p class="text-[#9fc0d1] font-mono text-[11px]">
                ${selected.route.map(r => MAP_LABELS[r] || r).join(' ➔ ')}
              </p>
              <p class="text-[#e0f2fe] text-xs pt-1 border-t border-[#1e4453]">
                รอบนี้จะออกเดินทางช่วงแรกไปที่ <strong class="text-[#7dd3fc]">${next ? (MAP_LABELS[next] || next) : ''}</strong> ก่อน (ใช้ 1 วัน)
              </p>
            </div>
          ` : ''}

          <!-- Signals / News (Strictly Safe - No Unknown NPC Leaks) -->
          ${selected.signals.length ? `
            <div class="space-y-2">
              <div class="text-xs font-bold text-[#e5ecd9] flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-[#e8bc6d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>
                <span>สัญญาณและเบาะแสในย่านนี้ (${selected.signals.length})</span>
              </div>
              <div class="space-y-1.5">
                ${selected.signals.map(s => `
                  <div
                    class="text-xs p-2 sm:p-2.5 border rounded-[3px] flex items-start gap-2 ${
                      s.kind === 'crisis'
                        ? 'border-rose-500/50 bg-rose-950/30 text-rose-200'
                        : s.kind === 'ending'
                        ? 'border-sky-500/50 bg-sky-950/30 text-sky-200'
                        : 'border-[#4a5c43] bg-[#14231a] text-[#fef3c7]'
                    }"
                  >
                    <span class="font-mono text-[10px] font-bold px-1 py-0.5 rounded bg-black/40 shrink-0">
                      ${s.kind === 'crisis' ? '🚨 วิกฤต' : s.kind === 'ending' ? '★ บทสรุป' : '📋 ข่าวสาร'}
                    </span>
                    <span class="leading-snug break-words">${s.title}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Travel Costs & Notices (Real Preview Data) -->
          ${!selected.isCurrent ? `
            <div class="p-2.5 sm:p-3 bg-[#0d1611] border border-[#2b3c2e] rounded-[3px] space-y-2">
              <div class="text-[11px] font-bold text-[#9bb094] uppercase tracking-wider">
                ต้นทุนการเดินทางช่วงถัดไป
              </div>
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="story-action-cost-tag">
                  ⏱ 1 วัน
                </span>
                ${selected.preview.costSummary && selected.preview.costSummary.length > 0 ? (
                  selected.preview.costSummary.map(cost => `
                    <span class="story-action-cost-tag">
                      ${cost}
                    </span>
                  `).join('')
                ) : `
                  <span class="story-action-cost-tag">
                    🍖 ความหิว +15
                  </span>
                `}
              </div>
              ${selected.preview.notices.map(n => `
                <p class="text-xs text-[#fde68a] leading-relaxed">
                  💡 ${n.text}
                </p>
              `).join('')}
            </div>
          ` : ''}

          <!-- Disabled Travel Warning Box (When cannot travel) -->
          ${!selected.isCurrent && !selected.preview.enabled ? `
            <div class="p-2.5 sm:p-3 bg-[#241114] border border-[#f43f5e]/60 rounded-[3px] text-xs text-[#fecdd3] space-y-1">
              <div class="font-bold text-[#fda4af] flex items-center gap-1.5">
                <svg class="w-4 h-4 text-[#fb7185] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span>ไม่สามารถเดินทางได้ในขณะนี้</span>
              </div>
              <div class="space-y-0.5 pl-5 list-disc">
                ${selected.preview.reasons.length > 0 ? (
                  selected.preview.reasons.map(r => `
                    <div class="leading-relaxed text-[#ffe4e6]">• ${r}</div>
                  `).join('')
                ) : `
                  <div class="leading-relaxed text-[#ffe4e6]">• สภาพร่างกายหรือทรัพยากรไม่พร้อมสำหรับการเดินทาง</div>
                `}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Sticky Footer: Split Thumb Actions (48px Min Height) -->
        <div class="pixel-map-dialog-actions p-3 sm:p-4 border-t border-[#2d3f31] bg-[#0c1510] grid grid-cols-3 gap-2.5 shrink-0">
          <button
            type="button"
            class="col-span-1 min-h-[48px] rounded-[3px] px-3 py-2 font-bold text-xs sm:text-sm bg-[#16251c] hover:bg-[#223528] text-[#c8d6c3] border border-[#3b513f] flex items-center justify-center gap-1.5 transition-colors touch-manipulation"
          >
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            <span>ปิด</span>
          </button>

          <button
            type="button"
            ${!selected.preview.enabled || !next || selected.isCurrent ? 'disabled' : ''}
            class="col-span-2 min-h-[48px] rounded-[3px] px-3 py-2 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors touch-manipulation ${
              selected.isCurrent
                ? 'bg-[#152219] text-[#718573] border border-[#273a2b] cursor-default'
                : !selected.preview.enabled
                ? 'bg-[#1b231c] text-[#788879] border border-[#303d32] cursor-not-allowed'
                : 'bg-[#c5d877] hover:bg-[#d4e68c] text-[#14231a] border border-[#c5d877] shadow-[0_2px_8px_rgba(197,216,119,0.25)]'
            }"
          >
            ${selected.isCurrent ? `
              <span>คุณอยู่ที่นี่แล้ว</span>
            ` : !selected.preview.enabled ? `
              <span class="flex items-center gap-1.5">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span>ยังเดินทางไม่ได้</span>
              </span>
            ` : selected.route.length > 2 ? `
              <span class="flex items-center gap-1.5 truncate">
                <span>เริ่มเดินไป${next ? (MAP_LABELS[next] || next) : ''} · 1 วัน</span>
                <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </span>
            ` : `
              <span class="flex items-center gap-1.5 truncate">
                <span>เดินทางมาที่นี่ · 1 วัน</span>
                <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </span>
            `}
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

  const results = [];

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
  ${renderAfterDialogHtml(sc.location)}
</body>
</html>`;

      await page.setContent(fullHtml, { waitUntil: 'load' });
      
      // Perform automated layout verification
      const metrics = await page.evaluate(() => {
        const panel = document.querySelector('.pixel-map-dialog-panel');
        const banner = document.querySelector('.pixel-map-dialog-banner');
        const title = document.querySelector('#map-place-title');
        const closeBtnTop = document.querySelector('.pixel-map-dialog-close-btn');
        const closeBtnBottom = document.querySelector('.pixel-map-dialog-actions button:first-child');
        const travelBtn = document.querySelector('.pixel-map-dialog-actions button:last-child');
        const body = document.querySelector('.pixel-map-dialog-body');

        const panelRect = panel.getBoundingClientRect();
        const topCloseRect = closeBtnTop.getBoundingClientRect();
        const bottomCloseRect = closeBtnBottom.getBoundingClientRect();
        const travelRect = travelBtn.getBoundingClientRect();

        return {
          panelWidth: panelRect.width,
          topCloseTouchTarget: { width: topCloseRect.width, height: topCloseRect.height },
          bottomCloseTouchTarget: { width: bottomCloseRect.width, height: bottomCloseRect.height },
          travelTouchTarget: { width: travelRect.width, height: travelRect.height },
          isTouchTargetSufficient: topCloseRect.height >= 44 && bottomCloseRect.height >= 44 && travelRect.height >= 44,
          isScrollable: body.scrollHeight >= body.clientHeight,
          titleText: title.textContent.trim(),
          bannerText: banner.textContent.trim(),
          travelBtnText: travelBtn.textContent.trim(),
          travelBtnDisabled: travelBtn.hasAttribute('disabled'),
        };
      });

      results.push({ scenario: sc.id, viewport: vp.name, metrics });

      const imgName = `after-${sc.id}-${vp.name}.png`;
      const imgPath = path.join(outDir, imgName);
      await page.screenshot({ path: imgPath });
      console.log(`Saved AFTER screenshot: ${imgPath} | Touch Targets >= 44px: ${metrics.isTouchTargetSufficient}`);
      await page.close();
    }
  }

  await browser.close();

  fs.writeFileSync(
    path.join('reports/map-dialog-verification', 'verification-results.json'),
    JSON.stringify(results, null, 2),
    'utf8'
  );
  console.log('All AFTER screenshots captured and verified successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
