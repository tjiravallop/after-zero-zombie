import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const afterDir = 'reports/people-roster-redesign/after';
fs.mkdirSync(afterDir, { recursive: true });

// Find the latest built CSS
const assetsDir = 'dist/assets';
const cssFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.css'));
const cssFile = cssFiles[0];
const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');

// SVG pixel glyphs for roles
const PIXEL_ROLE_ICONS = {
  guard: `<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1L2 3v5c0 4 6 7 6 7s6-3 6-7V3L8 1zm0 2.2l4 1.3v3.5c0 2.7-3.4 5.1-4 5.6-.6-.5-4-2.9-4-5.6V4.5l4-1.3z"/></svg>`,
  tech: `<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M14 9V7h-2.1a4.9 4.9 0 00-.7-1.7l1.5-1.5-1.4-1.4-1.5 1.5a4.9 4.9 0 00-1.7-.7V1H7v2.1a4.9 4.9 0 00-1.7.7L3.8 2.3 2.4 3.7l1.5 1.5a4.9 4.9 0 00-.7 1.7H1v2h2.1c.2.6.4 1.2.7 1.7l-1.5 1.5 1.4 1.4 1.5-1.5c.5.3 1.1.5 1.7.7V15h2v-2.1c.6-.2 1.2-.4 1.7-.7l1.5 1.5 1.4-1.4-1.5-1.5c.3-.5.5-1.1.7-1.7H14zM8 10a2 2 0 110-4 2 2 0 010 4z"/></svg>`,
  supply: `<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v2H2V3zm1 3h10v8H3V6zm2 2v4h6V8H5z"/></svg>`,
  radio: `<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M12 2H4a2 2 0 00-2 2v9a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2zM5 4h6v2H5V4zm3 9a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg>`,
  survivor: `<svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 2c-4 0-6 2-6 4v1h12v-1c0-2-2-4-6-4z"/></svg>`,
};

function getRoleIcon(role) {
  if (/ไฟ|ช่าง|เครื่อง|ซ่อม/.test(role)) return PIXEL_ROLE_ICONS.tech;
  if (/วิทยุ|สื่อสาร|เสา|คลื่น/.test(role)) return PIXEL_ROLE_ICONS.radio;
  if (/เฝ้า|รปภ|วิน|อาวุธ|การ์ด|ทหาร|ป้องกัน/.test(role)) return PIXEL_ROLE_ICONS.guard;
  if (/เสบียง|ตลาด|ข้าว|กาแฟ|คลัง|แพ็ก|พัสดุ|อาหาร|น้ำ|ยา|พยาบาล/.test(role)) return PIXEL_ROLE_ICONS.supply;
  return PIXEL_ROLE_ICONS.survivor;
}

// Scenarios representing comprehensive game states
const scenarios = [
  {
    id: 'full-roster',
    title: 'ย่านตลาดห้วยขวาง (มีผู้รอดชีวิตครบทุกสถานะ: วิกฤต, คนชื่อยาว, นิรนาม, ผู้เสียชีวิต)',
    placeName: 'ตลาดห้วยขวาง',
    knownCount: 4,
    hasUndiscovered: true,
    hasUndiscoveredCrisis: false,
    npcs: [
      {
        id: 'npc-crisis-1',
        name: 'สมคิด',
        age: 48,
        role: 'ผู้ช่วยช่างระบบไฟ',
        trait: 'จดวงจรที่ยังใช้ได้บนฝาตู้และถอดฟิวส์วงจรที่เสี่ยงลัด',
        alive: true,
        met: true,
        seen: true,
        trust: 35,
        isStoryNpc: false,
        hasCrisis: true,
        crisisDay: 4,
        crisisResolved: false,
        crisisText: 'ติดอยู่ในตู้ควบคุมไฟหลังหม้อแปลงระเบิด ซอมบี้เริ่มล้อมประตูเหล็ก',
        posture: { label: 'คุมเชิงรักษาระยะ', text: 'เขาเคาะประตูเหล็กส่งสัญญาณขอความช่วยเหลือ “อย่าเพิ่งเปิดพรวดพราด ดูข้างนอกก่อน!”', warning: true },
        lastNote: 'ยังรักษาระยะปลอดภัยแต่ต้องการความช่วยเหลือด่วน',
      },
      {
        id: 'npc-story-1',
        name: 'วิน',
        age: 34,
        role: 'คนขี่วินประจำซอย',
        trait: 'จำทางลัดระหว่างตึกได้และขีดซอยตันไว้บนเศษกล่อง',
        alive: true,
        met: true,
        seen: true,
        trust: 75,
        isStoryNpc: true,
        hasCrisis: false,
        posture: { label: 'ยอมร่วมมือ', text: 'เขาจำการกระทำที่ผ่านมาของเจ้าได้ จึงยอมคุยและชี้เส้นทางปลอดภัยให้', warning: false },
        lastNote: 'แบ่งเสบียงแห้งและน้ำดื่มให้เมื่อวานนี้',
        expanded: true, // showcase expanded state
      },
      {
        id: 'npc-long-name',
        name: 'พู่กัน กนกวรรณโสภณ',
        age: 42,
        role: 'ช่างเทคนิควิทยุสื่อสารประจำย่าน',
        trait: 'พกสมุดจดคลื่นความถี่ฉุกเฉินและไม่ยอมห่างจากวิทยุมือถือ',
        alive: true,
        met: true,
        seen: true,
        trust: 52,
        isStoryNpc: false,
        hasCrisis: false,
        posture: { label: 'ยอมฟังจากระยะห่าง', text: 'เขายอมฟังสิ่งที่เจ้าส่งสัญญาณ แต่ยังเว้นช่องทางหนีและขอให้บอกก่อนขยับเข้าใกล้', warning: false },
        lastNote: 'ช่วยปรับเสาอากาศรับสัญญาณเตือนภัยฝนกรด',
      },
      {
        id: 'npc-wary',
        name: 'ส้ม',
        age: 26,
        role: 'คนคัดเสบียงในตลาด',
        trait: 'เปิดแผงทีละช่องแล้วจดว่ากระสอบไหนยังแห้ง',
        alive: true,
        met: true,
        seen: true,
        trust: 18,
        isStoryNpc: false,
        hasCrisis: false,
        posture: { label: 'ระแวงคนแปลกหน้า', text: 'เขาสะดุ้งแล้วถอยหาที่กำบัง “อย่าเข้ามานะ” แม้ยังไม่มีอาวุธในมือ แต่เขากำลังมองหาทางหนี', warning: true },
        lastNote: 'สบตาเพียงครู่เดียวก่อนรีบหลบเข้าหลังแผงผัก',
      },
      {
        id: 'npc-seen-unnamed',
        name: '',
        age: 0,
        role: 'ผู้รอดชีวิตที่ยังไม่รู้ชื่อ',
        trait: 'พบเห็นหลบอยู่หลังกระสอบข้าวสารในแผงตลาดสด',
        alive: true,
        met: false,
        seen: true,
        trust: 0,
        isStoryNpc: false,
        hasCrisis: false,
        posture: { label: 'ระแวงคนแปลกหน้า', text: 'ยังไม่ได้พูดคุย ทำได้เพียงสังเกตจากระยะห่าง', warning: true },
        lastNote: 'เห็นเงาไหววูบในมุมตึกเมื่อช่วงสาย',
      },
      {
        id: 'npc-deceased-1',
        name: 'ลุงตุล',
        age: 59,
        role: 'คนเฝ้าทางเข้าตลาด',
        trait: 'แขวนฝาขวดไว้กับเชือกให้รู้เมื่อมีใครผ่านแผง',
        alive: false,
        met: true,
        seen: true,
        trust: 40,
        isStoryNpc: false,
        hasCrisis: false,
        posture: { label: 'เสียชีวิตแล้ว', text: 'ถูกฝูงซอมบี้บุกประชิดในวันที่ 3 ของการแพร่ระบาด', warning: false },
        lastNote: 'ฝากนกหวีดทองเหลืองไว้ก่อนสิ้นลมหายใจ',
      },
      {
        id: 'npc-deceased-unnamed',
        name: 'กฤษณะ',
        age: 33,
        role: 'ช่างเครื่องกลประจำซอย',
        trait: 'พกประแจขันน็อตเบอร์ 10 ไว้ในกระเป๋ากางเกง',
        alive: false,
        met: false,
        seen: true,
        trust: 0,
        isStoryNpc: false,
        hasCrisis: false,
        posture: { label: 'เสียชีวิตแล้ว', text: 'ถูกซอมบี้ทำร้ายก่อนที่เจ้าจะได้รู้จักชื่อ', warning: false },
        lastNote: 'ยังไม่เคยเผชิญหน้าโดยตรง',
      },
    ],
  },
  {
    id: 'empty-district',
    title: 'ย่านที่ยังไม่รู้จักใคร (0 คน)',
    placeName: 'พระราม 8',
    knownCount: 0,
    hasUndiscovered: true,
    hasUndiscoveredCrisis: false,
    npcs: [],
  },
];

function renderScenarioHtml(scenario) {
  const dedupedDiscovered = scenario.npcs.filter((npc, index, self) =>
    index === self.findIndex(n => n.id === npc.id)
  );

  const livingCrisisNpcs = dedupedDiscovered.filter(npc =>
    npc.met && npc.alive && !npc.crisisResolved && npc.hasCrisis
  );
  const crisisIdSet = new Set(livingCrisisNpcs.map(npc => npc.id));

  const livingRosterNpcs = dedupedDiscovered.filter(npc =>
    npc.alive && !crisisIdSet.has(npc.id)
  );

  const deceasedNpcs = dedupedDiscovered.filter(npc => !npc.alive);

  return `
  <!DOCTYPE html>
  <html lang="th" class="dark">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${scenario.title}</title>
    <style>
      ${cssContent}
    </style>
  </head>
  <body class="bg-slate-950 text-slate-100 p-4 font-sans antialiased min-h-screen">
    <div class="max-w-xl mx-auto space-y-4">
      <div class="p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-slate-800 space-y-4">
        <!-- HEADER -->
        <div class="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
            <svg class="w-4 h-4 text-lime-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>ผู้คนใน${scenario.placeName}</span>
          </h3>
          <span class="text-xs font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-md font-bold">
            รู้จัก ${scenario.knownCount} คน
          </span>
        </div>

        <!-- Empty state -->
        ${scenario.npcs.length === 0 ? `
          <div class="p-4 rounded-xl border border-slate-800/80 bg-slate-950/60 text-center space-y-1">
            <p class="text-sm font-bold text-slate-200">เจ้ายังไม่รู้จักใครในย่านนี้</p>
            <p class="text-xs text-slate-400">บริเวณรอบตัวเงียบสงบ ยังไม่มีใครสบตาหรือทักทายเจ้าโดยตรง</p>
          </div>
        ` : ''}

        <!-- Clue button -->
        ${scenario.hasUndiscovered ? `
          <button type="button" class="story-action disabled:opacity-50 border-lime-800/40 hover:border-lime-500/50 bg-slate-950">
            <div class="flex items-center justify-between w-full">
              <span class="story-action-title flex items-center gap-2 text-lime-300 text-xs sm:text-sm font-bold">
                <span>🔍</span>
                <span>${scenario.hasUndiscoveredCrisis ? 'ตามเบาะแสคนที่ต้องการความช่วยเหลือ' : 'ออกไปพบผู้คนในย่าน'}</span>
              </span>
              <span class="text-[11px] text-lime-400 font-mono shrink-0">1 วัน</span>
            </div>
          </button>
        ` : ''}

        <!-- 1. TOP PRIORITY: PEOPLE IN CRISIS -->
        ${livingCrisisNpcs.length > 0 ? `
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs px-0.5">
              <span class="font-bold text-amber-300 flex items-center gap-1.5 font-mono">
                <span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>ต้องการความช่วยเหลือด่วน (${livingCrisisNpcs.length} คน)</span>
              </span>
              <span class="text-[11px] text-amber-400/80 font-mono">ลำดับความสำคัญสูงสุด</span>
            </div>

            ${livingCrisisNpcs.map(npc => `
              <div class="rounded-xl border border-amber-500/70 bg-gradient-to-r from-amber-950/40 to-slate-900/90 p-3.5 space-y-2.5 shadow-lg shadow-amber-950/20">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-start gap-2.5 min-w-0">
                    <div class="w-8 h-8 rounded-lg bg-amber-900/60 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0 people-pixel-badge">
                      ${getRoleIcon(npc.role)}
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-sm font-bold text-slate-100">${npc.name}</span>
                        <span class="text-xs text-slate-400">(วัย ${npc.age} ปี)</span>
                        ${npc.isStoryNpc ? '<span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-lime-950 text-lime-300 border border-lime-500/40">ตัวละครหลัก</span>' : ''}
                      </div>
                      <div class="text-xs text-amber-200/90 font-medium truncate">${npc.role}</div>
                    </div>
                  </div>
                  <span class="inline-flex items-center text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950 shrink-0">
                    วิกฤตด่วน
                  </span>
                </div>

                <div class="p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200 leading-relaxed">
                  <strong class="text-amber-300">สถานการณ์:</strong> ${npc.crisisText}
                </div>

                <div class="flex items-center justify-between gap-2 pt-1 flex-wrap">
                  <div class="text-[11px] font-mono text-emerald-300">
                    ไว้ใจ ${npc.trust}/100 · ${npc.posture.label}
                  </div>
                  <button type="button" class="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shrink-0 shadow transition-colors flex items-center gap-1">
                    <span>⚡</span>
                    <span>เข้าช่วย ${npc.name} (1 วัน)</span>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- 2. MAIN ROSTER: 2 COLUMNS PER ROW ON MOBILE -->
        ${livingRosterNpcs.length > 0 ? `
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs px-0.5 pt-1">
              <span class="font-bold text-slate-300">
                ผู้รอดชีวิตที่เคยพบ (${livingRosterNpcs.length} คน)
              </span>
              <span class="text-[11px] text-slate-400">แตะการ์ดเพื่อดูรายละเอียด</span>
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              ${livingRosterNpcs.map(npc => {
                const isUnnamed = !npc.met && npc.seen;
                const isExpanded = Boolean(npc.expanded);

                if (isUnnamed) {
                  return `
                    <div class="people-card-tactical col-span-1 p-2.5 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 flex flex-col justify-between gap-2">
                      <div class="space-y-1.5">
                        <div class="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 people-pixel-badge">
                          ${PIXEL_ROLE_ICONS.survivor}
                        </div>
                        <div>
                          <p class="text-xs font-bold text-slate-300 line-clamp-1">ผู้รอดชีวิตที่ยังไม่รู้ชื่อ</p>
                          <p class="text-[10px] text-slate-400 line-clamp-1">เคยเห็นในระยะสายตา</p>
                        </div>
                      </div>
                      <button type="button" class="w-full py-1 text-center text-[10px] font-semibold text-lime-300 bg-lime-950/40 hover:bg-lime-950/80 border border-lime-700/40 rounded transition-colors">
                        กลับไปทัก
                      </button>
                    </div>
                  `;
                }

                const postureColorClass = npc.posture.warning
                  ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                  : npc.trust >= 70
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800/70 text-slate-300 border-slate-700';

                return `
                  <div class="people-card-tactical col-span-1 p-2.5 rounded-xl border bg-slate-950/80 hover:border-slate-700 flex flex-col justify-between gap-2 cursor-pointer ${
                    isExpanded
                      ? 'border-lime-500/60 bg-slate-900/95 ring-1 ring-lime-500/40'
                      : 'border-slate-800'
                  }">
                    <div class="space-y-1.5">
                      <div class="flex items-center justify-between gap-1">
                        <div class="w-6 h-6 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-lime-400 shrink-0 people-pixel-badge">
                          ${getRoleIcon(npc.role)}
                        </div>
                        <span class="text-[10px] font-mono px-1.5 py-0.5 rounded border truncate max-w-[85px] ${postureColorClass}" title="${npc.posture.label}">
                          ${npc.posture.label}
                        </span>
                      </div>

                      <div>
                        <div class="text-xs font-bold text-slate-100 truncate" title="${npc.name} (วัย ${npc.age} ปี)">
                          ${npc.name} <span class="text-[10px] font-normal text-slate-400">(${npc.age}ป)</span>
                        </div>
                        <div class="text-[10px] text-slate-400 truncate" title="${npc.role}">
                          ${npc.role}
                        </div>
                      </div>

                      <div class="space-y-0.5 pt-0.5">
                        <div class="flex justify-between text-[9px] font-mono text-slate-400">
                          <span>ไว้ใจ</span>
                          <span class="text-emerald-400 font-bold">${npc.trust}/100</span>
                        </div>
                        <div class="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                          <div class="h-full bg-emerald-400" style="width: ${npc.trust}%"></div>
                        </div>
                      </div>

                      ${isExpanded ? `
                        <div class="pt-2 border-t border-slate-800/90 space-y-1.5 text-[10px]">
                          <p class="text-slate-300 leading-relaxed italic line-clamp-3">
                            “${npc.posture.text}”
                          </p>
                          <p class="text-slate-400 line-clamp-2">
                            <span class="text-slate-300 font-semibold">อุปนิสัย:</span> ${npc.trait}
                          </p>
                          <p class="text-slate-400 line-clamp-2">
                            <span class="text-slate-300 font-semibold">บันทึก:</span> ${npc.lastNote}
                          </p>
                        </div>
                      ` : ''}
                    </div>

                    <div class="pt-1">
                      ${isExpanded ? `
                        <button type="button" class="w-full py-1 px-1.5 text-center text-[10px] font-bold rounded bg-lime-400 hover:bg-lime-300 text-slate-950 transition-colors shadow-sm">
                          เข้าหา ${npc.name} (1 วัน)
                        </button>
                      ` : `
                        <button type="button" class="w-full py-1 px-1.5 text-center text-[10px] font-medium rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-colors">
                          แตะดูรายละเอียด ▾
                        </button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 3. DECEASED SECTION -->
        ${deceasedNpcs.length > 0 ? `
          <div class="pt-2 border-t border-slate-800/80">
            <details class="group rounded-xl bg-slate-950 border border-rose-950/60 overflow-hidden" open>
              <summary class="px-3 py-2 flex items-center justify-between text-xs text-rose-300 font-medium cursor-pointer hover:bg-slate-900/60 transition-colors list-none">
                <span class="flex items-center gap-1.5 font-mono">
                  <span>🕊️</span>
                  <span>บันทึกผู้จากไปในย่านนี้ (${deceasedNpcs.length} คน)</span>
                </span>
                <span class="text-[10px] text-slate-400 font-mono group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <div class="px-3 py-2 space-y-2 border-t border-slate-900 text-xs text-slate-400 bg-slate-950/90 divide-y divide-slate-900">
                ${deceasedNpcs.map(npc => {
                  const isKnown = Boolean(npc.met);
                  return `
                    <div key="deceased-${npc.id}" class="flex items-center justify-between gap-2 pt-1.5 first:pt-0">
                      <div class="min-w-0">
                        <span class="line-through font-bold ${isKnown ? 'text-slate-300' : 'text-slate-400'}">
                          ${isKnown ? `${npc.name} (วัย ${npc.age} ปี)` : 'ผู้รอดชีวิตที่ยังไม่รู้ชื่อ'}
                        </span>
                        <span class="text-[11px] text-slate-400 block truncate">
                          ${isKnown
                            ? `${npc.role}${npc.lastNote ? ` · ${npc.lastNote}` : ''}`
                            : npc.seen
                            ? 'เคยเห็นในระยะสายตาก่อนเสียชีวิต'
                            : 'ร่างผู้เสียชีวิตที่ยังไม่รู้ชื่อ'}
                        </span>
                      </div>
                      <span class="text-[10px] font-mono text-rose-400 shrink-0">เสียชีวิต</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </details>
          </div>
        ` : ''}

      </div>
    </div>
  </body>
  </html>
  `;
}

async function verify() {
  console.log('--- Starting People Tab Responsive & Edge Case Verification ---');
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const viewports = [
    { width: 320, name: '320px-narrow-mobile' },
    { width: 390, name: '390px-standard-mobile' },
    { width: 1440, name: '1440px-desktop' },
  ];

  const results = [];

  try {
    const page = await browser.newPage();

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.width < 1024 ? 900 : 1000 });

      for (const sc of scenarios) {
        await page.setContent(renderScenarioHtml(sc), { waitUntil: 'load' });

        // Automated assertion checks in the browser:
        const check = await page.evaluate(() => {
          // Check for horizontal overflow
          const docWidth = document.documentElement.scrollWidth;
          const winWidth = window.innerWidth;
          const hasHorizontalOverflow = docWidth > winWidth;

          // Check that header contains 'ผู้คนใน'
          const h3 = document.querySelector('h3');
          const hasPeopleTitle = Boolean(h3 && h3.innerText.includes('ผู้คนใน'));

          // Check deduplication (each NPC card id appears at most once)
          const allNpcNames = [...document.querySelectorAll('.font-bold.text-slate-100')].map(el => el.innerText.trim());
          const nameCounts = {};
          for (const n of allNpcNames) {
            nameCounts[n] = (nameCounts[n] || 0) + 1;
          }
          const duplicates = Object.entries(nameCounts).filter(([_, count]) => count > 1).map(([name]) => name);

          const pageText = document.body.innerText;
          const leakedSecretName = pageText.includes('กฤษณะ');
          const leakedSecretRole = pageText.includes('ช่างเครื่องกล');

          return {
            hasHorizontalOverflow,
            docWidth,
            winWidth,
            hasPeopleTitle,
            duplicates,
            allNpcNames,
            leakedSecretName,
            leakedSecretRole,
          };
        });

        assert.ok(!check.hasHorizontalOverflow, `Horizontal overflow detected at ${vp.width}px for ${sc.id}: ${check.docWidth}px > ${check.winWidth}px`);
        assert.ok(check.hasPeopleTitle, `Missing 'ผู้คนใน' in h3 header at ${vp.width}px for ${sc.id}`);
        assert.deepEqual(check.duplicates, [], `Duplicate NPC names found at ${vp.width}px: ${check.duplicates.join(', ')}`);
        assert.ok(!check.leakedSecretName, `Secret name of unmet deceased NPC was leaked into page text at ${vp.width}px!`);
        assert.ok(!check.leakedSecretRole, `Secret role of unmet deceased NPC was leaked into page text at ${vp.width}px!`);

        const filename = `${afterDir}/after-${sc.id}-${vp.name}.png`;
        await page.screenshot({ path: filename, fullPage: true });

        results.push({
          scenario: sc.id,
          viewport: vp.width,
          status: 'PASS',
          file: filename,
        });

        console.log(`✓ PASS: ${sc.id} at ${vp.width}px (No overflow, deduplicated, verified title)`);
      }
    }

    console.log('\n--- All Automated Responsive & Edge Case Assertions Passed! ---');
    console.log(JSON.stringify(results, null, 2));

  } finally {
    await browser.close();
  }
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
