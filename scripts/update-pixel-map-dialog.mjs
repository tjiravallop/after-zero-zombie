import fs from 'node:fs';

const filePath = 'src/components/PixelCityMap.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetStart = '      {selected && (\r\n        <div\r\n          className="game-dialog pixel-map-dialog';
const altTargetStart = '      {selected && (\n        <div\n          className="game-dialog pixel-map-dialog';

let startIndex = content.indexOf(targetStart);
let isCrlf = true;
if (startIndex === -1) {
  startIndex = content.indexOf(altTargetStart);
  isCrlf = false;
}

if (startIndex === -1) {
  console.error('Could not find start index!');
  process.exit(1);
}

const endIndex = content.lastIndexOf('      )}\r\n    </section>');
const altEndIndex = content.lastIndexOf('      )}\n    </section>');
const actualEndIndex = endIndex !== -1 ? endIndex + (isCrlf ? 8 : 7) : altEndIndex + 7;

if (actualEndIndex <= startIndex) {
  console.error('Could not find end index!');
  process.exit(1);
}

const newDialogCode = `      {selected && (
        <div
          className="game-dialog pixel-map-dialog fixed inset-0 z-50 bg-[#070e0a]/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="map-place-title"
          onClick={e => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
        >
          <div ref={dialogRef} className="pixel-map-dialog-panel w-full max-w-lg rounded-[4px] border border-[#6b7e5a] bg-[#111c15] text-[#e6ecd9] shadow-2xl flex flex-col overflow-hidden max-h-[92dvh]">
            {/* Top Status Banner Bar */}
            <div className={\`pixel-map-dialog-banner \${
              selected.isCurrent
                ? 'is-current'
                : selected.route.length === 2
                ? 'is-neighbor'
                : 'is-distant'
            }\`}>
              <span className="flex items-center gap-1.5 font-bold font-mono text-[11px] tracking-wide">
                <span className="pixel-banner-dot" aria-hidden="true" />
                {selected.isCurrent
                  ? 'ตำแหน่งปัจจุบัน (คุณอยู่ที่นี่แล้ว)'
                  : selected.route.length === 2
                  ? 'ย่านติดกัน · เดินถึงได้ใน 1 วัน'
                  : \`ปลายทางระยะไกล · ต้องเดินทาง \${Math.max(0, selected.route.length - 1)} ช่วง\`}
              </span>
              <span className="text-[11px] font-mono opacity-85">
                {selected.isCurrent ? 'ZONE: CURRENT' : selected.route.length === 2 ? 'ZONE: DIRECT' : \`HOP: \${Math.max(0, selected.route.length - 1)} DAYS\`}
              </span>
            </div>

            {/* Header */}
            <div className="pixel-map-dialog-header p-3.5 sm:p-4 border-b border-[#2d3f31] flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0 flex-1">
                <h2 id="map-place-title" className="font-bold text-lg sm:text-xl text-[#f0e5c9] leading-snug break-words">
                  {selected.name}
                </h2>
                <div className="text-xs text-[#a4b79b] mt-1 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#bfd773] shrink-0" aria-hidden="true" />
                    <span>{MAP_LABELS[selected.id] || selected.short || selected.name}</span>
                  </span>
                  <span className="text-[#4e6451]" aria-hidden="true">•</span>
                  <span>
                    {selected.isCurrent
                      ? 'ปักหลักอยู่ในย่านนี้'
                      : selected.route.length === 2
                      ? \`เชื่อมต่อตรงจาก \${currentPlace ? names(currentPlace.id) : 'จุดปัจจุบัน'}\`
                      : \`ห่าง \${selected.route.length - 1} ช่วงจาก \${currentPlace ? names(currentPlace.id) : 'จุดปัจจุบัน'}\`}
                  </span>
                </div>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="ปิดข้อมูลสถานที่"
                className="pixel-map-dialog-close-btn w-12 h-12 shrink-0 rounded-[3px] bg-[#16241a] border border-[#3c523e] hover:bg-[#233829] hover:text-[#f0e5c9] text-[#c4d4be] flex items-center justify-center transition-colors touch-manipulation"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="pixel-map-dialog-body p-3.5 sm:p-4 space-y-3.5 overflow-y-auto overscroll-contain">
              {/* Description */}
              <p className="text-xs sm:text-sm text-[#cad5c3] leading-relaxed break-words">
                {selected.description}
              </p>

              {/* Stats Strip */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 sm:p-3 bg-[#0c1510] border border-[#2b3d30] rounded-[3px]">
                  <div className="flex items-center justify-between text-xs text-[#9bb094]">
                    <span>ความไว้ใจเฉลี่ย</span>
                    <Users className="w-3.5 h-3.5 text-[#9bb094]" aria-hidden="true" />
                  </div>
                  <p className="font-mono text-lg sm:text-xl font-bold text-[#d2f78e] mt-1">
                    {Math.round(selected.averageTrust)}
                    <span className="text-xs text-[#5e7460] font-normal">/100</span>
                  </p>
                  <p className="text-[11px] text-[#81967c] mt-0.5">
                    ผู้รอดชีวิต {selected.livingCount} คน
                  </p>
                </div>
                <div className="p-2.5 sm:p-3 bg-[#0c1510] border border-[#2b3d30] rounded-[3px]">
                  <div className="flex items-center justify-between text-xs text-[#e2a660]">
                    <span>ระดับภัยคุกคาม</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-[#e2a660]" aria-hidden="true" />
                  </div>
                  <p className="font-mono text-lg sm:text-xl font-bold text-[#fcd34d] mt-1">
                    {Math.round(selected.threat)}
                    <span className="text-xs text-[#7e694b] font-normal">/100</span>
                  </p>
                  <p className="text-[11px] text-[#a49171] mt-0.5">
                    {selected.threat >= 65 ? 'อันตรายสูงมาก' : selected.threat >= 35 ? 'ควรระวังเป็นพิเศษ' : 'ค่อนข้างสงบ'}
                  </p>
                </div>
              </div>

              {/* Route Details */}
              {!selected.isCurrent && selected.route.length === 2 && (
                <div className="p-2.5 sm:p-3 bg-[#132319] border border-[#39543e] rounded-[3px] text-xs text-[#d2dfbd] space-y-1">
                  <div className="font-bold text-[#d8f28d] flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>เส้นทางเชื่อมต่อโดยตรง (1 ช่วง · 1 วัน)</span>
                  </div>
                  <p className="text-[#a8bc99] font-mono text-[11px] pt-0.5">
                    {selected.route.map(names).join(' ➔ ')}
                  </p>
                </div>
              )}

              {!selected.isCurrent && selected.route.length > 2 && (
                <div className="p-2.5 sm:p-3 bg-[#0f242e] border border-[#215163] rounded-[3px] text-xs text-[#c6e4f2] space-y-1.5">
                  <div className="font-bold text-[#7dd3fc] flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>ต้องเดินทางตามแนวถนน รวม {selected.route.length - 1} ช่วง</span>
                  </div>
                  <p className="text-[#9fc0d1] font-mono text-[11px]">
                    {selected.route.map(names).join(' ➔ ')}
                  </p>
                  <p className="text-[#e0f2fe] text-xs pt-1 border-t border-[#1e4453]">
                    รอบนี้จะออกเดินทางช่วงแรกไปที่ <strong className="text-[#7dd3fc]">{next ? fullName(next) : ''}</strong> ก่อน (ใช้ 1 วัน)
                  </p>
                </div>
              )}

              {/* Signals / News (Strictly Safe - No Unknown NPC Leaks) */}
              {!!selected.signals.length && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#e5ecd9] flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-[#e8bc6d]" aria-hidden="true" />
                    <span>สัญญาณและเบาะแสในย่านนี้ ({selected.signals.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {selected.signals.map(s => (
                      <div
                        key={s.id}
                        className={\`text-xs p-2 sm:p-2.5 border rounded-[3px] flex items-start gap-2 \${
                          s.kind === 'crisis'
                            ? 'border-rose-500/50 bg-rose-950/30 text-rose-200'
                            : s.kind === 'ending'
                            ? 'border-sky-500/50 bg-sky-950/30 text-sky-200'
                            : 'border-[#4a5c43] bg-[#14231a] text-[#fef3c7]'
                        }\`}
                      >
                        <span className="font-mono text-[10px] font-bold px-1 py-0.5 rounded bg-black/40 shrink-0">
                          {s.kind === 'crisis' ? '🚨 วิกฤต' : s.kind === 'ending' ? '★ บทสรุป' : '📋 ข่าวสาร'}
                        </span>
                        <span className="leading-snug break-words">{s.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Travel Costs & Notices (Real Preview Data) */}
              {!selected.isCurrent && (
                <div className="p-2.5 sm:p-3 bg-[#0d1611] border border-[#2b3c2e] rounded-[3px] space-y-2">
                  <div className="text-[11px] font-bold text-[#9bb094] uppercase tracking-wider">
                    ต้นทุนการเดินทางช่วงถัดไป
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="story-action-cost-tag">
                      ⏱ 1 วัน
                    </span>
                    {selected.preview.costSummary && selected.preview.costSummary.length > 0 ? (
                      selected.preview.costSummary.map((cost, i) => (
                        <span key={i} className="story-action-cost-tag">
                          {cost}
                        </span>
                      ))
                    ) : (
                      <span className="story-action-cost-tag">
                        🍖 ความหิว +15
                      </span>
                    )}
                  </div>
                  {selected.preview.notices.map((n, i) => (
                    <p key={i} className="text-xs text-[#fde68a] leading-relaxed">
                      💡 {n.text}
                    </p>
                  ))}
                </div>
              )}

              {/* Disabled Travel Warning Box (When cannot travel) */}
              {!selected.isCurrent && !selected.preview.enabled && (
                <div className="p-2.5 sm:p-3 bg-[#241114] border border-[#f43f5e]/60 rounded-[3px] text-xs text-[#fecdd3] space-y-1">
                  <div className="font-bold text-[#fda4af] flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-[#fb7185] shrink-0" aria-hidden="true" />
                    <span>ไม่สามารถเดินทางได้ในขณะนี้</span>
                  </div>
                  <div className="space-y-0.5 pl-5 list-disc">
                    {selected.preview.reasons.length > 0 ? (
                      selected.preview.reasons.map((r, i) => (
                        <div key={i} className="leading-relaxed text-[#ffe4e6]">• {r}</div>
                      ))
                    ) : (
                      <div className="leading-relaxed text-[#ffe4e6]">• สภาพร่างกายหรือทรัพยากรไม่พร้อมสำหรับการเดินทาง</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Footer: Split Thumb Actions (48px Min Height) */}
            <div className="pixel-map-dialog-actions p-3 sm:p-4 border-t border-[#2d3f31] bg-[#0c1510] grid grid-cols-3 gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="col-span-1 min-h-[48px] rounded-[3px] px-3 py-2 font-bold text-xs sm:text-sm bg-[#16251c] hover:bg-[#223528] text-[#c8d6c3] border border-[#3b513f] flex items-center justify-center gap-1.5 transition-colors touch-manipulation"
              >
                <X className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>ปิด</span>
              </button>

              <button
                type="button"
                disabled={!selected.preview.enabled || !next || selected.isCurrent}
                onClick={() => {
                  if (next && selected.preview.enabled && !selected.isCurrent) {
                    const targetDestination = selected.id;
                    setSelectedId(null);
                    onTravel(next, targetDestination);
                  }
                }}
                className={\`col-span-2 min-h-[48px] rounded-[3px] px-3 py-2 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors touch-manipulation \${
                  selected.isCurrent
                    ? 'bg-[#152219] text-[#718573] border border-[#273a2b] cursor-default'
                    : !selected.preview.enabled
                    ? 'bg-[#1b231c] text-[#788879] border border-[#303d32] cursor-not-allowed'
                    : 'bg-[#c5d877] hover:bg-[#d4e68c] text-[#14231a] border border-[#c5d877] shadow-[0_2px_8px_rgba(197,216,119,0.25)]'
                }\`}
              >
                {selected.isCurrent ? (
                  <span>คุณอยู่ที่นี่แล้ว</span>
                ) : !selected.preview.enabled ? (
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                    <span>ยังเดินทางไม่ได้</span>
                  </span>
                ) : selected.route.length > 2 ? (
                  <span className="flex items-center gap-1.5 truncate">
                    <span>เริ่มเดินไป{next ? names(next) : ''} · 1 วัน</span>
                    <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 truncate">
                    <span>เดินทางมาที่นี่ · 1 วัน</span>
                    <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}`;

const updatedContent = content.slice(0, startIndex) + (isCrlf ? newDialogCode.replace(/\n/g, '\r\n') : newDialogCode) + content.slice(actualEndIndex);
fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log('Successfully updated PixelCityMap.tsx!');
