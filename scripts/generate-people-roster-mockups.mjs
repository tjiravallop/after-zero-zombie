import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const beforeDir = 'reports/people-roster-redesign/before';
const mockupsDir = 'reports/people-roster-redesign/mockups';
fs.mkdirSync(beforeDir, { recursive: true });
fs.mkdirSync(mockupsDir, { recursive: true });

const cssPath = path.resolve('dist/assets/index-DlZVEYhA.css');
const cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

// Realistic test population covering all requirements:
// - Known NPC with active crisis (needs help at top)
// - Normal known NPCs (various postures: cooperative, guarded, distant)
// - Long name NPC
// - Seen but unnamed survivor (npc.seen && !npc.met)
// - Deceased NPC (!npc.alive)
// - Story NPC vs Regular NPC
const testDistrict = {
  placeName: 'ตลาดห้วยขวาง',
  knownCount: 4,
};

const testNpcs = [
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
    posture: { label: 'คุมเชิงรักษาระยะ', armed: false, warning: true, text: 'เขาเคาะประตูเหล็กส่งสัญญาณขอความช่วยเหลือ “อย่าเพิ่งเปิดพรวดพราด ดูข้างนอกก่อน!”' },
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
    posture: { label: 'ยอมร่วมมือ', armed: true, warning: false, text: 'เขาจำการกระทำที่ผ่านมาของเจ้าได้ จึงยอมคุยและชี้เส้นทางปลอดภัยให้' },
    lastNote: 'แบ่งเสบียงแห้งและน้ำดื่มให้เมื่อวานนี้',
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
    posture: { label: 'ยอมฟังจากระยะห่าง', armed: false, warning: false, text: 'เขายอมฟังสิ่งที่เจ้าส่งสัญญาณ แต่ยังเว้นช่องทางหนีและขอให้บอกก่อนขยับเข้าใกล้' },
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
    posture: { label: 'ระแวงคนแปลกหน้า', armed: false, warning: true, text: 'เขาสะดุ้งแล้วถอยหาที่กำบัง “อย่าเข้ามานะ” แม้ยังไม่มีอาวุธในมือ แต่เขากำลังมองหาทางหนี' },
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
    posture: { label: 'ระแวงคนแปลกหน้า', armed: false, warning: true, text: 'ยังไม่ได้พูดคุย ทำได้เพียงสังเกตจากระยะห่าง' },
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
    posture: { label: 'เสียชีวิตแล้ว', armed: false, warning: false, text: 'ถูกฝูงซอมบี้บุกประชิดในวันที่ 3 ของการแพร่ระบาด' },
    lastNote: 'ฝากนกหวีดทองเหลืองไว้ก่อนสิ้นลมหายใจ',
  },
];

// SVG pixel glyphs for roles
const PIXEL_ROLE_ICONS = {
  guard: `<svg class="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1L2 3v5c0 4 6 7 6 7s6-3 6-7V3L8 1zm0 2.2l4 1.3v3.5c0 2.7-3.4 5.1-4 5.6-.6-.5-4-2.9-4-5.6V4.5l4-1.3z"/></svg>`,
  tech: `<svg class="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M14 9V7h-2.1a4.9 4.9 0 00-.7-1.7l1.5-1.5-1.4-1.4-1.5 1.5a4.9 4.9 0 00-1.7-.7V1H7v2.1a4.9 4.9 0 00-1.7.7L3.8 2.3 2.4 3.7l1.5 1.5a4.9 4.9 0 00-.7 1.7H1v2h2.1c.2.6.4 1.2.7 1.7l-1.5 1.5 1.4 1.4 1.5-1.5c.5.3 1.1.5 1.7.7V15h2v-2.1c.6-.2 1.2-.4 1.7-.7l1.5 1.5 1.4-1.4-1.5-1.5c.3-.5.5-1.1.7-1.7H14zM8 10a2 2 0 110-4 2 2 0 010 4z"/></svg>`,
  supply: `<svg class="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v2H2V3zm1 3h10v8H3V6zm2 2v4h6V8H5z"/></svg>`,
  radio: `<svg class="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M12 2H4a2 2 0 00-2 2v9a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2zM5 4h6v2H5V4zm3 9a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg>`,
  survivor: `<svg class="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 2c-4 0-6 2-6 4v1h12v-1c0-2-2-4-6-4z"/></svg>`,
};

function getRoleIcon(role) {
  if (/ไฟ|ช่าง|เครื่อง|ซ่อม/.test(role)) return PIXEL_ROLE_ICONS.tech;
  if (/วิทยุ|สื่อสาร|เสา/.test(role)) return PIXEL_ROLE_ICONS.radio;
  if (/เฝ้า|รปภ|วิน|อาวุธ|การ์ด/.test(role)) return PIXEL_ROLE_ICONS.guard;
  if (/เสบียง|ตลาด|ข้าว|กาแฟ|คลัง/.test(role)) return PIXEL_ROLE_ICONS.supply;
  return PIXEL_ROLE_ICONS.survivor;
}

// 1. BEFORE HTML (The incumbent implementation)
function renderBeforeHtml() {
  const activeCrises = testNpcs.filter(n => n.hasCrisis && n.met && n.alive);
  const discoveredNpcs = testNpcs; // currently all rendered in a single scrollable list
  return `
  <!DOCTYPE html>
  <html lang="th" class="dark">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>People Tab Before</title>
    <style>${cssContent}</style>
  </head>
  <body class="bg-slate-950 text-slate-100 p-4 font-sans antialiased min-h-screen">
    <div class="max-w-xl mx-auto space-y-4">
      <div class="text-xs font-mono text-slate-500 uppercase tracking-widest pb-1 border-b border-slate-800">
        [ สถานะปัจจุบัน: ก่อนปรับปรุงดีไซน์ (Incumbent People Tab) ]
      </div>

      <!-- PANEL 3: PER-NPC TRUST, LIVING NPC CRISES & ZONE POPULATION BREAKDOWN -->
      <div class="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
              <svg class="w-4 h-4 text-lime-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <span>ผู้คนใน${testDistrict.placeName}</span>
            </h3>
            <span class="text-xs font-mono text-emerald-300 font-bold">
              รู้จัก ${testDistrict.knownCount} คน
            </span>
          </div>
        </div>

        <!-- Clue search button -->
        <button type="button" class="story-action">
          <span class="story-action-title">ตามเบาะแสคนที่ต้องการความช่วยเหลือ</span>
        </button>

        <!-- Collapsible Compact Scrollable Vertical List for Active Crises in Current Zone -->
        <div class="rounded-xl bg-slate-950 border border-amber-500/40 overflow-hidden">
          <div class="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left bg-slate-900/50">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-amber-400">⚠️</span>
              <span class="text-xs font-bold text-amber-200 truncate">
                ผู้รอดชีวิตที่กำลังเผชิญวิกฤตในเขตนี้ (${activeCrises.length} คน)
              </span>
            </div>
            <span class="text-[11px] font-semibold text-amber-300 flex items-center gap-1 shrink-0">
              ย่อเก็บ ▴
            </span>
          </div>

          <div class="divide-y divide-slate-800/80 border-t border-slate-800 px-3 py-1">
            ${activeCrises.map(npc => `
              <div class="py-2 flex items-start justify-between gap-2.5 text-xs">
                <div class="min-w-0 flex-1 space-y-0.5">
                  <div class="flex items-center gap-1.5">
                    <span class="font-bold text-slate-100">${npc.name} (วัย ${npc.age} ปี)</span>
                    <span class="text-slate-500">·</span>
                    <span class="font-mono text-[11px] text-emerald-300">ระแวงคนแปลกหน้า · ${npc.trust}/100</span>
                  </div>
                  <p class="text-[11px] text-amber-200/90 leading-snug line-clamp-2">${npc.crisisText}</p>
                </div>
                <button type="button" class="px-2.5 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0">
                  เข้าช่วย
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- List of Individual NPCs in Current Zone (Single vertical list) -->
        <div class="space-y-2.5">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-slate-300">คนที่เคยพบ</span>
          </div>

          <div class="space-y-2.5">
            ${discoveredNpcs.map(npc => {
              if (!npc.met) {
                return `
                  <div class="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p class="text-sm font-bold text-slate-200">ผู้รอดชีวิตที่ยังไม่รู้ชื่อ</p>
                    <button type="button" class="mt-2 text-xs font-semibold text-lime-300">กลับไปทัก</button>
                  </div>
                `;
              }
              const isCrisis = npc.hasCrisis;
              return `
                <div class="p-3 rounded-xl border space-y-2 ${
                  !npc.alive
                    ? 'bg-rose-950/20 border-rose-900/50 opacity-60'
                    : isCrisis
                    ? 'bg-amber-950/25 border-amber-400/60'
                    : npc.trust >= 50
                    ? 'bg-emerald-950/25 border-emerald-500/40'
                    : 'bg-slate-950 border-slate-800'
                }">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <div class="flex items-center flex-wrap gap-1.5">
                        <span class="text-sm font-bold text-slate-100">${npc.name} (วัย ${npc.age} ปี)</span>
                        ${npc.isStoryNpc ? '<span class="text-[11px] font-mono text-lime-300">· ตัวละครหลัก</span>' : ''}
                        ${isCrisis ? '<span class="text-[11px] font-mono text-amber-300">· วิกฤตด่วน (ดูอาการ)</span>' : ''}
                      </div>
                      <div class="text-xs text-slate-400 truncate">${npc.role} · ${npc.trait}</div>
                    </div>
                    <div class="text-right shrink-0">
                      ${!npc.alive
                        ? '<span class="text-xs font-mono text-rose-400 font-bold">เสียชีวิตแล้ว</span>'
                        : `<span class="text-xs font-mono tabular-nums font-bold text-emerald-300">ไว้ใจ ${npc.trust}/100</span>`
                      }
                    </div>
                  </div>

                  ${npc.alive ? `
                    <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div class="h-full bg-emerald-400" style="width: ${npc.trust}%"></div>
                    </div>
                    <div class="flex items-center justify-between gap-2 pt-0.5">
                      <span class="text-[11px] text-slate-400 truncate">${isCrisis ? `วิกฤต: ${npc.crisisText}` : npc.lastNote}</span>
                      <button type="button" class="px-2.5 py-1 rounded-lg border text-[11px] font-semibold shrink-0 ${
                        isCrisis ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold' : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                      }">
                        ${isCrisis ? `เข้าช่วย ${npc.name} (1 วัน)` : `เข้าหา ${npc.name} (1 วัน)`}
                      </button>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
}

// 2. OPTION 1: Tactical Survivor Dossier (แฟ้มข้อมูลผู้รอดชีวิตภาคสนาม)
// Focus: Crisp 2-column cards, pixel archetype badge, status chip, top crisis card, deduplicated, expandable
function renderOption1Html() {
  const crisisNpcs = testNpcs.filter(n => n.hasCrisis && n.alive && n.met);
  // Deduplicated living roster (excluding crisis NPCs already pinned at top)
  const regularLivingNpcs = testNpcs.filter(n => n.alive && !n.hasCrisis);
  const deceasedNpcs = testNpcs.filter(n => !n.alive);

  return `
  <!DOCTYPE html>
  <html lang="th" class="dark">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Option 1: Tactical Survivor Dossier</title>
    <style>
      ${cssContent}
      .pixel-box-badge {
        image-rendering: pixelated;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
      }
      .people-card-tactical {
        transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.1s ease;
      }
      .people-card-tactical:active {
        transform: scale(0.99);
      }
    </style>
  </head>
  <body class="bg-slate-950 text-slate-100 p-4 font-sans antialiased min-h-screen">
    <div class="max-w-xl mx-auto space-y-4">
      <div class="flex items-center justify-between pb-1 border-b border-amber-500/30">
        <span class="text-xs font-mono text-amber-400 font-bold tracking-wider">
          ตัวเลือกที่ 1: แฟ้มข้อมูลผู้รอดชีวิตภาคสนาม (Tactical Survivor Dossier)
        </span>
        <span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">OPTION A</span>
      </div>

      <!-- PANEL 3 CONTAINER -->
      <div class="p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-slate-800 space-y-4">
        
        <!-- HEADER (h3 retains 'ผู้คนใน' for test compatibility) -->
        <div class="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
            <svg class="w-4 h-4 text-lime-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>ผู้คนใน${testDistrict.placeName}</span>
          </h3>
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold">
              รู้จัก ${testDistrict.knownCount} คน
            </span>
          </div>
        </div>

        <!-- CLUE BUTTON (if undiscovered NPC exists) -->
        <button type="button" class="story-action border-lime-800/40 hover:border-lime-500/50 bg-slate-950">
          <div class="flex items-center justify-between w-full">
            <span class="story-action-title flex items-center gap-2 text-lime-300 text-xs sm:text-sm font-bold">
              <span>🔍</span>
              <span>ตามเบาะแสคนที่ต้องการความช่วยเหลือในย่าน</span>
            </span>
            <span class="text-[11px] text-lime-400 font-mono">1 วัน</span>
          </div>
        </button>

        <!-- TOP PRIORITY: PEOPLE IN CRISIS (Full width cards, pinned at top) -->
        ${crisisNpcs.length > 0 ? `
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs px-0.5">
              <span class="font-bold text-amber-300 flex items-center gap-1.5 font-mono">
                <span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span>ต้องการความช่วยเหลือด่วน (${crisisNpcs.length})</span>
              </span>
              <span class="text-[11px] text-amber-400/80 font-mono">ลำดับความสำคัญสูงสุด</span>
            </div>

            ${crisisNpcs.map(npc => `
              <div class="rounded-xl border border-amber-500/70 bg-gradient-to-r from-amber-950/40 to-slate-900/90 p-3.5 space-y-2.5 shadow-lg shadow-amber-950/20">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-start gap-2.5 min-w-0">
                    <div class="w-8 h-8 rounded-lg bg-amber-900/60 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0 pixel-box-badge">
                      ${getRoleIcon(npc.role)}
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-sm font-bold text-slate-100">${npc.name}</span>
                        <span class="text-xs text-slate-400">(วัย ${npc.age} ปี)</span>
                        ${npc.isStoryNpc ? '<span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-lime-950 text-lime-300 border border-lime-500/40">ตัวละครหลัก</span>' : ''}
                      </div>
                      <div class="text-xs text-amber-200/90 font-medium">${npc.role}</div>
                    </div>
                  </div>
                  <div class="shrink-0 text-right">
                    <span class="inline-flex items-center text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                      วิกฤตด่วน
                    </span>
                  </div>
                </div>

                <div class="p-2.5 rounded-lg bg-amber-950/50 border border-amber-500/40 text-xs text-amber-200 leading-relaxed">
                  <span class="font-bold text-amber-300">สถานการณ์:</span> ${npc.crisisText}
                </div>

                <div class="flex items-center justify-between gap-3 pt-1">
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

        <!-- MAIN DIRECTORY (2 COLUMNS PER ROW ON MOBILE: grid grid-cols-2) -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs px-0.5 pt-1">
            <span class="font-bold text-slate-300">
              ผู้รอดชีวิตที่เคยพบ (${regularLivingNpcs.length})
            </span>
            <span class="text-[11px] text-slate-400">แตะการ์ดเพื่อดูรายละเอียด</span>
          </div>

          <!-- 2-COLUMN GRID -->
          <div class="grid grid-cols-2 gap-2.5">
            ${regularLivingNpcs.map((npc, idx) => {
              const isUnnamed = !npc.met && npc.seen;
              // Showcase first card as expanded, others as compact
              const isExpanded = idx === 0;

              if (isUnnamed) {
                return `
                  <div class="people-card-tactical col-span-1 p-2.5 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 flex flex-col justify-between gap-2">
                    <div class="space-y-1.5">
                      <div class="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 pixel-box-badge">
                        ${PIXEL_ROLE_ICONS.survivor}
                      </div>
                      <div>
                        <p class="text-xs font-bold text-slate-300 line-clamp-1">ยังไม่รู้ชื่อ</p>
                        <p class="text-[10px] text-slate-400 line-clamp-1">เคยเห็นในระยะสายตา</p>
                      </div>
                    </div>
                    <button type="button" class="w-full py-1 text-center text-[10px] font-semibold text-lime-300 bg-lime-950/40 hover:bg-lime-950/80 border border-lime-700/40 rounded transition-colors">
                      กลับไปทัก
                    </button>
                  </div>
                `;
              }

              const postureBg = npc.posture.warning
                ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                : npc.trust >= 70
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800/70 text-slate-300 border-slate-700';

              return `
                <div class="people-card-tactical col-span-1 p-2.5 rounded-xl border border-slate-800 bg-slate-950/80 hover:border-slate-700 flex flex-col justify-between gap-2 cursor-pointer ${
                  isExpanded ? 'ring-1 ring-lime-400/50 bg-slate-900/90' : ''
                }">
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between gap-1">
                      <div class="w-6 h-6 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-lime-400 pixel-box-badge">
                        ${getRoleIcon(npc.role)}
                      </div>
                      <span class="text-[10px] font-mono px-1.5 py-0.5 rounded border ${postureBg} truncate max-w-[90px]">
                        ${npc.posture.label}
                      </span>
                    </div>

                    <div>
                      <div class="text-xs font-bold text-slate-100 truncate" title="${npc.name}">
                        ${npc.name}
                      </div>
                      <div class="text-[10px] text-slate-400 truncate">
                        ${npc.role}
                      </div>
                    </div>

                    <!-- Mini trust bar -->
                    <div class="space-y-0.5 pt-0.5">
                      <div class="flex justify-between text-[9px] font-mono text-slate-400">
                        <span>ไว้ใจ</span>
                        <span class="text-emerald-400 font-bold">${npc.trust}/100</span>
                      </div>
                      <div class="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                        <div class="h-full bg-emerald-400" style="width: ${npc.trust}%"></div>
                      </div>
                    </div>

                    <!-- Expanded Details View (Shown on tap) -->
                    ${isExpanded ? `
                      <div class="pt-2 border-t border-slate-800 space-y-1.5 text-[10px] animate-fadeIn">
                        <p class="text-slate-300 leading-relaxed italic line-clamp-2">
                          “${npc.posture.text}”
                        </p>
                        <p class="text-slate-400 line-clamp-1">
                          โน้ต: ${npc.lastNote}
                        </p>
                      </div>
                    ` : ''}
                  </div>

                  <!-- Tap action button -->
                  <div class="pt-1">
                    <button type="button" class="w-full py-1 px-1.5 text-center text-[10px] font-bold rounded transition-colors ${
                      isExpanded
                        ? 'bg-lime-400 hover:bg-lime-300 text-slate-950 shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80'
                    }">
                      ${isExpanded ? `เข้าหา (1 วัน)` : `แตะดูรายละเอียด ▾`}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- RETROSPECTIVE MEMORIAL DRAWER FOR DECEASED (Collapsible at bottom) -->
        ${deceasedNpcs.length > 0 ? `
          <div class="pt-2 border-t border-slate-800/80">
            <details class="group rounded-xl bg-slate-950 border border-rose-950/60 overflow-hidden">
              <summary class="px-3 py-2 flex items-center justify-between text-xs text-rose-300 font-medium cursor-pointer hover:bg-slate-900/60 transition-colors list-none">
                <span class="flex items-center gap-1.5 font-mono">
                  <span>🕊️</span>
                  <span>บันทึกผู้จากไปในย่านนี้ (${deceasedNpcs.length} คน)</span>
                </span>
                <span class="text-[10px] text-slate-400 font-mono group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <div class="px-3 py-2 space-y-2 border-t border-slate-900 text-xs text-slate-400 bg-slate-950/90">
                ${deceasedNpcs.map(npc => `
                  <div class="flex items-center justify-between gap-2 py-1 border-b border-slate-900/80 last:border-0">
                    <div class="min-w-0">
                      <span class="line-through text-slate-300 font-bold">${npc.name} (วัย ${npc.age} ปี)</span>
                      <span class="text-[11px] text-slate-400 block">${npc.role} · ${npc.lastNote}</span>
                    </div>
                    <span class="text-[10px] font-mono text-rose-400 shrink-0">เสียชีวิต</span>
                  </div>
                `).join('')}
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

// 3. OPTION 2: Human Connection Registry (บันทึกสายสัมพันธ์ชุมชน)
// Focus: Warm narrative cards, relationship tier chips, subtle emotional cues, expandable dialogue preview
function renderOption2Html() {
  const crisisNpcs = testNpcs.filter(n => n.hasCrisis && n.alive && n.met);
  const regularLivingNpcs = testNpcs.filter(n => n.alive && !n.hasCrisis);
  const deceasedNpcs = testNpcs.filter(n => !n.alive);

  return `
  <!DOCTYPE html>
  <html lang="th" class="dark">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Option 2: Human Connection Registry</title>
    <style>
      ${cssContent}
      .badge-soft {
        border-radius: 9999px;
      }
      .people-card-registry {
        transition: all 0.15s ease-out;
      }
    </style>
  </head>
  <body class="bg-slate-950 text-slate-100 p-4 font-sans antialiased min-h-screen">
    <div class="max-w-xl mx-auto space-y-4">
      <div class="flex items-center justify-between pb-1 border-b border-sky-500/30">
        <span class="text-xs font-mono text-sky-400 font-bold tracking-wider">
          ตัวเลือกที่ 2: บันทึกสายสัมพันธ์ชุมชน (Human Connection Registry)
        </span>
        <span class="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">OPTION B</span>
      </div>

      <!-- PANEL 3 CONTAINER -->
      <div class="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        
        <!-- HEADER -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 class="text-base font-bold text-slate-100 flex items-center gap-2">
              <svg class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <span>ผู้คนใน${testDistrict.placeName}</span>
            </h3>
            <p class="text-[11px] text-slate-400 mt-0.5">สมุดบันทึกคนที่เจ้าเคยสบตาและร่วมชะตากรรม</p>
          </div>
          <span class="text-xs font-mono text-emerald-300 font-bold px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30">
            พบแล้ว ${testDistrict.knownCount} คน
          </span>
        </div>

        <!-- CLUE BUTTON -->
        <button type="button" class="w-full py-2.5 px-3 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-950/40 text-left transition-colors flex items-center justify-between">
          <span class="text-xs text-emerald-200 font-semibold flex items-center gap-2">
            <span>🧭</span>
            <span>สำรวจและตามหาผู้รอดชีวิตคนใหม่ในย่าน</span>
          </span>
          <span class="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded">1 วัน</span>
        </button>

        <!-- TOP CRISIS CARD (Full row banner) -->
        ${crisisNpcs.length > 0 ? `
          <div class="space-y-2">
            ${crisisNpcs.map(npc => `
              <div class="rounded-2xl border-2 border-amber-500/80 bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 p-4 space-y-3 shadow-md">
                <div class="flex items-center justify-between">
                  <span class="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                    วิกฤตด่วนเฉพาะหน้า
                  </span>
                  <span class="text-[11px] font-mono text-amber-400/90">ต้องการความช่วยเหลือทันที</span>
                </div>

                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-amber-900/50 border border-amber-400/60 flex items-center justify-center text-amber-300 shrink-0 text-base font-bold font-mono">
                    ${npc.name.charAt(0)}
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-bold text-slate-100">${npc.name}</span>
                      <span class="text-xs text-slate-400">วัย ${npc.age} ปี</span>
                    </div>
                    <div class="text-xs text-amber-200/90">${npc.role}</div>
                  </div>
                </div>

                <p class="text-xs text-amber-100/90 bg-amber-950/60 p-2.5 rounded-xl border border-amber-500/30 leading-relaxed">
                  “${npc.crisisText}”
                </p>

                <div class="flex items-center justify-between pt-1">
                  <span class="text-[11px] text-slate-400">ท่าที: <strong class="text-amber-300">${npc.posture.label}</strong></span>
                  <button type="button" class="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-transform active:scale-95">
                    ยื่นมือช่วยเหลือ (1 วัน)
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- 2-COLUMN PEOPLE ROSTER -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs px-0.5">
            <span class="font-bold text-slate-300">รายชื่อผู้คนในละแวกนี้</span>
            <span class="text-[11px] text-slate-400">แตะเพื่อขยายมุมมอง</span>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            ${regularLivingNpcs.map((npc, idx) => {
              const isUnnamed = !npc.met && npc.seen;
              const isExpanded = idx === 1; // showcase second card as expanded

              if (isUnnamed) {
                return `
                  <div class="col-span-1 p-3 rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 flex flex-col justify-between gap-2">
                    <div class="space-y-1">
                      <div class="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-xs">
                        ?
                      </div>
                      <p class="text-xs font-bold text-slate-300">คนแปลกหน้า</p>
                      <p class="text-[10px] text-slate-400">ยังไม่รู้ชื่อและบทบาท</p>
                    </div>
                    <button type="button" class="w-full py-1.5 rounded-lg text-[10px] font-bold text-emerald-300 bg-slate-900 hover:bg-slate-800 border border-slate-700">
                      ทำความรู้จัก
                    </button>
                  </div>
                `;
              }

              return `
                <div class="people-card-registry col-span-1 p-3 rounded-2xl border ${
                  isExpanded
                    ? 'border-emerald-500/60 bg-slate-900 ring-1 ring-emerald-500/30'
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                } flex flex-col justify-between gap-2 cursor-pointer">
                  <div class="space-y-2">
                    <div class="flex items-start justify-between gap-1">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <div class="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-300 shrink-0">
                          ${npc.name.charAt(0)}
                        </div>
                        <div class="min-w-0">
                          <p class="text-xs font-bold text-slate-100 truncate">${npc.name}</p>
                          <p class="text-[10px] text-slate-400 truncate">${npc.role}</p>
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center justify-between text-[10px]">
                      <span class="px-2 py-0.5 rounded-full text-[9px] font-medium ${
                        npc.posture.warning
                          ? 'bg-amber-950 text-amber-300 border border-amber-600/30'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-600/30'
                      }">
                        ● ${npc.posture.label}
                      </span>
                      <span class="font-mono text-slate-400 text-[10px]">${npc.trust}%</span>
                    </div>

                    ${isExpanded ? `
                      <div class="pt-2 border-t border-slate-800 text-[10px] space-y-1.5">
                        <p class="text-slate-300 italic">“${npc.posture.text}”</p>
                        <p class="text-slate-400">${npc.trait}</p>
                      </div>
                    ` : ''}
                  </div>

                  <div class="pt-1">
                    <button type="button" class="w-full py-1.5 rounded-xl text-[10px] font-bold ${
                      isExpanded
                        ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                    }">
                      ${isExpanded ? `เข้าหา (1 วัน)` : `ดูข้อมูล ▾`}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- COLLAPSIBLE MEMORIAL SECTION -->
        ${deceasedNpcs.length > 0 ? `
          <div class="pt-2">
            <details class="group rounded-2xl bg-slate-950/80 border border-slate-800 p-3">
              <summary class="flex items-center justify-between text-xs text-slate-400 cursor-pointer list-none">
                <span class="flex items-center gap-1.5 font-medium">
                  <span>🕊️</span>
                  <span>บันทึกความทรงจำถึงผู้ล่วงลับ (${deceasedNpcs.length} คน)</span>
                </span>
                <span class="text-[10px] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div class="mt-3 pt-3 border-t border-slate-900 space-y-2 text-xs">
                ${deceasedNpcs.map(npc => `
                  <div class="flex items-center justify-between text-slate-400">
                    <div>
                      <span class="line-through text-slate-400 font-semibold">${npc.name}</span>
                      <span class="text-[10px] text-slate-400 block">${npc.role} · ${npc.lastNote}</span>
                    </div>
                    <span class="text-[10px] text-rose-400 font-mono">จากไปแล้ว</span>
                  </div>
                `).join('')}
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

// 4. Comparison Overview HTML (Side-by-side or stacked view for easy decision-making)
function renderComparisonHtml() {
  return `
  <!DOCTYPE html>
  <html lang="th" class="dark">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Design Comparison: People Tab Roster</title>
    <style>${cssContent}</style>
  </head>
  <body class="bg-slate-950 text-slate-100 p-6 font-sans antialiased min-h-screen">
    <div class="max-w-6xl mx-auto space-y-6">
      <div class="border-b border-slate-800 pb-4">
        <h1 class="text-2xl font-bold text-slate-100 flex items-center gap-3">
          <span>👥</span>
          <span>AFTER ZERO · People Tab Redesign Mockup Proposal</span>
        </h1>
        <p class="text-sm text-slate-400 mt-1">
          เปรียบเทียบแนวทางดีไซน์แท็บผู้คนใหม่: รายชื่อ 2 คอลัมน์บนมือถือ, ปักหมุดวิกฤตด่วนบนสุด, ไม่ซ้ำซ้อน, บันทึกผู้เสียชีวิตย้อนหลัง
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Option 1 Summary Card -->
        <div class="p-5 rounded-2xl bg-slate-900/90 border-2 border-amber-500/60 space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-950 border border-amber-500/40">OPTION 1</span>
            <span class="text-xs text-slate-400 font-mono">สไตล์สมุดแฟ้มสายลับ/ผู้รอดชีวิต</span>
          </div>
          <h2 class="text-lg font-bold text-slate-100">Tactical Survivor Dossier (แฟ้มผู้รอดชีวิตภาคสนาม)</h2>
          <ul class="text-xs text-slate-300 space-y-2 list-disc list-inside">
            <li><strong>การ์ด 2 คอลัมน์:</strong> ไอคอนพิกเซลแบ่งหมวดบทบาท (ช่าง/วิทยุ/การ์ด/เสบียง/คนทั่วไป) ชัดเจน</li>
            <li><strong>สถานะท่าที:</strong> ชิปแท็กแบบ Tactical Pill (ยอมร่วมมือ / คุมเชิงรักษาระยะ / ระแวง)</li>
            <li><strong>การแตะดูรายละเอียด:</strong> แตะการ์ดแล้วคลี่ขยายคำพูดท่าทีล่าสุด + บันทึก พร้อมปุ่ม “เข้าหา (1 วัน)” ชัดเจน</li>
            <li><strong>วิกฤตด่วน:</strong> การ์ดเต็มแถวด้านบนสุด กรอบเตือนสีเหลืองอำพัน สะดุดตา ไม่ซ้ำในรายชื่อปกติ</li>
            <li><strong>ผู้เสียชีวิต:</strong> แถบย่นเก็บประวัติผู้จากไปด้านล่างอย่างสงบ</li>
          </ul>
        </div>

        <!-- Option 2 Summary Card -->
        <div class="p-5 rounded-2xl bg-slate-900/90 border-2 border-sky-500/60 space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono font-bold text-sky-400 px-2 py-0.5 rounded bg-sky-950 border border-sky-500/40">OPTION 2</span>
            <span class="text-xs text-slate-400 font-mono">สไตล์สมุดบันทึกมนุษยธรรม</span>
          </div>
          <h2 class="text-lg font-bold text-slate-100">Human Connection Registry (บันทึกสายสัมพันธ์ชุมชน)</h2>
          <ul class="text-xs text-slate-300 space-y-2 list-disc list-inside">
            <li><strong>การ์ด 2 คอลัมน์:</strong> สัญลักษณ์อักษรย่อชื่อ + โทนสีนุ่มนวล มุ่งเน้นความสัมพันธ์และความรู้สึก</li>
            <li><strong>สถานะท่าที:</strong> จุดสถานะอารมณ์พร้อมระดับความไว้ใจเป็นเปอร์เซ็นต์</li>
            <li><strong>การแตะดูรายละเอียด:</strong> คลี่ขยายดูความประทับใจและอุปนิสัย พร้อมปุ่มกดเข้าหา</li>
            <li><strong>วิกฤตด่วน:</strong> การ์ดแบนเนอร์แจ้งเตือนฉุกเฉินสไตล์สายสัมพันธ์ฉุกเฉิน</li>
            <li><strong>ผู้เสียชีวิต:</strong> กล่องบันทึกความทรงจำถึงผู้ล่วงลับ</li>
          </ul>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
}

async function run() {
  console.log('Launching Puppeteer to capture People Tab Baseline and Mockups...');
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // 1. Capture BEFORE views (Baseline at 320, 390, 1440)
    console.log('Capturing BEFORE views...');
    await page.setContent(renderBeforeHtml(), { waitUntil: 'load' });

    await page.setViewport({ width: 390, height: 900 });
    await page.screenshot({ path: `${beforeDir}/before-people-390px.png`, fullPage: true });

    await page.setViewport({ width: 320, height: 900 });
    await page.screenshot({ path: `${beforeDir}/before-people-320px.png`, fullPage: true });

    await page.setViewport({ width: 1440, height: 900 });
    await page.screenshot({ path: `${beforeDir}/before-people-1440px.png`, fullPage: true });

    // 2. Capture OPTION 1 views (Tactical Survivor Dossier)
    console.log('Capturing OPTION 1 views...');
    await page.setContent(renderOption1Html(), { waitUntil: 'load' });

    await page.setViewport({ width: 390, height: 950 });
    await page.screenshot({ path: `${mockupsDir}/option1-tactical-390px.png`, fullPage: true });

    await page.setViewport({ width: 320, height: 950 });
    await page.screenshot({ path: `${mockupsDir}/option1-tactical-320px.png`, fullPage: true });

    await page.setViewport({ width: 1440, height: 950 });
    await page.screenshot({ path: `${mockupsDir}/option1-tactical-1440px.png`, fullPage: true });

    // 3. Capture OPTION 2 views (Human Connection Registry)
    console.log('Capturing OPTION 2 views...');
    await page.setContent(renderOption2Html(), { waitUntil: 'load' });

    await page.setViewport({ width: 390, height: 950 });
    await page.screenshot({ path: `${mockupsDir}/option2-registry-390px.png`, fullPage: true });

    await page.setViewport({ width: 320, height: 950 });
    await page.screenshot({ path: `${mockupsDir}/option2-registry-320px.png`, fullPage: true });

    await page.setViewport({ width: 1440, height: 950 });
    await page.screenshot({ path: `${mockupsDir}/option2-registry-1440px.png`, fullPage: true });

    // 4. Capture Side-by-side Overview
    console.log('Capturing Overview...');
    await page.setContent(renderComparisonHtml(), { waitUntil: 'load' });
    await page.setViewport({ width: 1200, height: 600 });
    await page.screenshot({ path: `${mockupsDir}/mockups-overview.png`, fullPage: true });

    console.log('All baseline and mockup screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Error generating mockups:', err);
  process.exit(1);
});
