import {useEffect, useMemo, useRef, useState} from 'react';
import {MAP_LABELS, MAP_POSITIONS, type MapLocation} from '../data/mapLocations';

const arterialSpurs = [
  'M43 10L42 -5',
  'M87 10L87 -4',
  'M15 34L4 29',
  'M88 54L103 53',
  'M49 87L53 104',
  'M88 93L100 103',
];

const ROAD_PATHS: Record<string, string> = {
  'hospital|shelter': 'M31 43L44 30L64 21',
  'hospital|streets': 'M31 43L45 49L46 66L62 72L77 78',
  'hospital|nest': 'M31 43L45 49L46 66L49 87',
  'radio|shelter': 'M15 34L29 22L43 10L64 21',
  'shelter|streets': 'M64 21L74 40L82 48L84 65L77 78',
  'bkk_office|shelter': 'M88 54L82 25L64 21',
};

function edgePath(a: string, b: string): string {
  const key = [a, b].sort().join('|');
  if (ROAD_PATHS[key]) return ROAD_PATHS[key];
  const [x1, y1] = MAP_POSITIONS[a] || [50, 95];
  const [x2, y2] = MAP_POSITIONS[b] || [50, 95];
  return `M${x1} ${y1}L${x2} ${y2}`;
}

export default function PixelCityMap({
  places,
  onTravel,
  pinnedPlaceId,
  travelGoalId,
  onClearTravelGoal,
}: {
  places: MapLocation[];
  onTravel: (id: string, destinationId?: string) => void;
  pinnedPlaceId?: string | null;
  travelGoalId?: string | null;
  onClearTravelGoal?: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const selected = places.find(p => p.id === selectedId);
  const currentPlace = places.find(p => p.isCurrent);
  const travelGoal = travelGoalId ? places.find(p => p.id === travelGoalId && !p.isCurrent) : undefined;
  const pinnedPlace = pinnedPlaceId ? places.find(p => p.id === pinnedPlaceId) : undefined;
  const activeRoutePlace = selected && !selected.isCurrent
    ? selected
    : travelGoal || (pinnedPlace && !pinnedPlace.isCurrent ? pinnedPlace : undefined);
  const activeRoute = activeRoutePlace?.route || [];

  const uniqueRoadEdges = useMemo(() => {
    const seen = new Set<string>();
    const edges: Array<{ key: string; from: string; to: string; d: string }> = [];
    for (const p of places) {
      for (const n of p.neighbors) {
        if (!MAP_POSITIONS[p.id] || !MAP_POSITIONS[n]) continue;
        const key = [p.id, n].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({ key, from: p.id, to: n, d: edgePath(p.id, n) });
      }
    }
    return edges;
  }, [places]);

  useEffect(() => {
    if (!selectedId) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedId(null);
      }
      if (e.key === 'Tab') {
        const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') || []);
        const first = buttons[0], last = buttons.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      if (previous?.isConnected) previous.focus();
    };
  }, [selectedId]);

  const point = (id: string): [number, number] => MAP_POSITIONS[id] || [50, 95];
  const names = (id: string) => MAP_LABELS[id] || places.find(p => p.id === id)?.short || id;
  const fullName = (id: string) => places.find(p => p.id === id)?.name || names(id);
  const next = selected?.travelTarget;

  return (
    <section className="pixel-city-map rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden" aria-label="แผนที่เดินทางกรุงเทพฯ">
      <header className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] tracking-[.2em] text-emerald-400 font-mono">BANGKOK · AFTER ZERO</p>
          {currentPlace && (
            <span className="text-[11px] font-mono text-lime-300">
              ตำแหน่งปัจจุบัน: {names(currentPlace.id)}
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-slate-100 mt-1">เลือกทางที่จะเดินต่อ</h3>
        <p className="text-xs text-slate-400 mt-1">แตะสถานที่เพื่อดูข้อมูลและเลือกเดินทาง · เดินตามแนวถนนเชื่อมย่าน ช่วงละ 1 วัน</p>
      </header>
      <div className="pixel-map-legend">
        <span><i className="map-key-current" />อยู่ที่นี่</span>
        <span><i className="map-key-neighbor" />เดินถึงใน 1 วัน</span>
        <span><i className="map-key-quest" />มีเควสต์</span>
        <span><i className="map-key-crisis" />เหตุฉุกเฉิน</span>
        <span><i className="map-key-ending" />จุดตัดสินใจ</span>
      </div>
      {pinnedPlaceId && (
        <p className="px-4 pb-2 text-xs text-sky-200">
          ⚑ เป้าหมายที่ปักหมุด: {places.find(p => p.id === pinnedPlaceId)?.name}
          {pinnedPlace && !pinnedPlace.isCurrent && pinnedPlace.route.length > 1 && (
            <span className="block text-[11px] text-sky-300/90 mt-0.5">
              เส้นทาง: {pinnedPlace.route.map(names).join(' → ')} ({pinnedPlace.route.length - 1} ช่วง)
            </span>
          )}
        </p>
      )}
      {travelGoal && travelGoal.travelTarget && (
        <div className="mx-3 mb-2.5 p-2.5 rounded-xl bg-sky-950/60 border border-sky-500/40 text-xs text-sky-100 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-sky-200">
              กำลังมุ่งหน้าไป: {travelGoal.name}
            </span>
            {onClearTravelGoal && (
              <button
                type="button"
                onClick={onClearTravelGoal}
                className="text-[11px] text-slate-300 hover:text-white underline underline-offset-2"
              >
                ยกเลิกจุดหมาย
              </button>
            )}
          </div>
          <p className="text-[11px] text-sky-200/90">
            เส้นทางที่เหลือ ({travelGoal.route.length - 1} ช่วง): {travelGoal.route.map(names).join(' → ')}
          </p>
          <button
            type="button"
            disabled={!travelGoal.preview.enabled}
            onClick={() => onTravel(travelGoal.travelTarget!, travelGoal.id)}
            className="w-full py-2 px-3 rounded-lg bg-lime-300 hover:bg-lime-200 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs transition-colors"
          >
            เดินต่อช่วงถัดไปไป{names(travelGoal.travelTarget)} · 1 วัน
          </button>
        </div>
      )}
      <div className="pixel-map-terrain">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pixel-map-ground" aria-hidden="true">
          <rect width="100" height="100" fill="#172923" />
          <path d="M-5 -5H9C3 13 16 21 9 35S1 54 10 69S26 85 20 105H-5Z" fill="#244650" />
          <path d="M9 -5C3 13 16 21 9 35S1 54 10 69S26 85 20 105" fill="none" stroke="#39606a" strokeWidth=".6" />
          <path d="M11 62L28 65L46 63L67 61L88 57L105 59" fill="none" stroke="#31525a" strokeWidth="1.3" />
          <path d="M54 70L63 68L70 73L64 81L56 80Z" fill="#264233" />
          <path d="M28 16L36 12L38 20L33 26L27 23Z" fill="#223a2e" />
          <g fill="none" stroke="#314237" strokeWidth=".3">
            <path d="M18 0L23 21L18 35L26 52L24 72L33 100M55 0L54 17L58 39L55 61L60 91M96 0L95 29L98 49L94 73L99 94" />
            <path d="M15 18L42 20L64 15L91 18M18 51L40 55L61 51L87 49M23 75L43 73L65 79L98 71" />
          </g>
          <g fill="none" strokeLinejoin="round" strokeLinecap="round">
            {arterialSpurs.map((d, i) => (
              <g key={`spur-${i}`}>
                <path d={d} stroke="#0e1d19" strokeWidth="1.6" />
                <path d={d} stroke="#425243" strokeWidth=".55" />
              </g>
            ))}
            {uniqueRoadEdges.map(edge => (
              <g key={edge.key}>
                <path d={edge.d} stroke="#0e1d19" strokeWidth="1.8" />
                <path d={edge.d} stroke="#536451" strokeWidth=".65" />
              </g>
            ))}
            {places.filter(p => p.isCurrent).flatMap(p =>
              p.neighbors.map(id => {
                const key = [p.id, id].sort().join('|');
                return <path key={key} d={edgePath(p.id, id)} stroke="#abc994" strokeWidth=".85" strokeDasharray="1.6 1.1" />;
              })
            )}
            {activeRoute.length > 1 &&
              activeRoute.slice(0, -1).map((fromId, idx) => {
                const toId = activeRoute[idx + 1]!;
                return (
                  <path
                    key={`active-route-${fromId}-${toId}`}
                    d={edgePath(fromId, toId)}
                    stroke={idx === 0 ? '#bef264' : '#7dd3fc'}
                    strokeWidth="1.15"
                    strokeDasharray={idx === 0 ? undefined : '1.8 1'}
                  />
                );
              })}
          </g>
          <text x="5" y="80" transform="rotate(-78 5 80)" fill="#668b91" fontSize="2.4">เจ้าพระยา</text>
          <text x="90" y="61" fill="#5b7d82" fontSize="2.1">แสนแสบ</text>
        </svg>
        {places.map(p => {
          const [x, y] = point(p.id);
          const urgent = p.signals.some(s => s.kind === 'crisis');
          const ending = p.signals.some(s => s.kind === 'ending');
          const status = urgent ? 'crisis' : ending ? 'ending' : p.signals.length ? 'quest' : 'quiet';
          const isDirectNeighbor = Boolean(currentPlace?.neighbors.includes(p.id));
          const routeStepIndex = activeRoute.indexOf(p.id);
          const isRouteStep = routeStepIndex > 0;
          const isGoalTarget = p.id === travelGoalId;
          return (
            <button
              type="button"
              key={p.id}
              data-location={p.id}
              data-status={status}
              data-neighbor={isDirectNeighbor || undefined}
              aria-label={`${p.name}${p.isCurrent ? ' · อยู่ที่นี่' : isDirectNeighbor ? ' · เดินถึงได้ใน 1 วัน' : ''}${p.id === pinnedPlaceId ? ' · เป้าหมายที่ปักหมุด' : ''}${p.signals.length ? ' · มีเรื่องพิเศษ ' + p.signals.length + ' รายการ' : ''}`}
              className={`pixel-map-marker ${p.isCurrent ? 'is-current' : ''} ${isDirectNeighbor ? 'is-neighbor' : ''} ${isRouteStep ? 'is-route-step' : ''} ${p.id === pinnedPlaceId ? 'is-pinned' : ''} ${isGoalTarget ? 'is-travel-goal' : ''}`}
              style={{ left: x + '%', top: y + '%' }}
              onClick={() => setSelectedId(p.id)}
            >
              <span className="pixel-map-dot" aria-hidden="true" />
              <span className="pixel-map-place-name">
                {MAP_LABELS[p.id] || p.short || p.name}
                {p.id === pinnedPlaceId && <span className="route-pin-label">⚑ หมุด</span>}
                {isGoalTarget && p.id !== pinnedPlaceId && <span className="route-pin-label">⚑ จุดหมาย</span>}
              </span>
            </button>
          );
        })}
        <span className="pixel-map-north" aria-hidden="true">N ↑</span>
      </div>
      <p className="px-4 py-3 text-[11px] text-slate-400">
        แผนที่ย่อกรุงเทพฯ · เส้นประสีเขียวคือย่านที่เดินไปถึงได้ทันทีใน 1 วันจาก{currentPlace ? names(currentPlace.id) : 'จุดปัจจุบัน'}
      </p>
      {selected && (
        <div
          className="game-dialog pixel-map-dialog fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="map-place-title"
          onClick={e => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
        >
          <div ref={dialogRef} className="w-full max-w-lg rounded-2xl border border-emerald-600/60 bg-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-700">
              <div>
                <p className="text-xs text-emerald-300">
                  {selected.isCurrent
                    ? 'ตำแหน่งปัจจุบัน'
                    : selected.route.length === 2
                    ? 'ย่านติดกัน · เดินถึงใน 1 วัน'
                    : `สำรวจปลายทาง · ห่าง ${Math.max(0, selected.route.length - 1)} ช่วง`}
                </p>
                <h2 id="map-place-title" className="font-bold text-xl mt-1">{selected.name}</h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="ปิดข้อมูลสถานที่"
                className="w-12 shrink-0 text-xl text-slate-300"
              >
                ×
              </button>
            </div>
            <div className="pixel-map-dialog-body p-4 space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">{selected.description}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 rounded-lg">
                  <p className="text-xs text-emerald-300">ความไว้ใจเฉลี่ย</p>
                  <p className="font-mono text-xl mt-1">{Math.round(selected.averageTrust)}<span className="text-xs text-slate-500">/100</span></p>
                  <p className="text-[11px] text-slate-400 mt-1">ผู้รอดชีวิต {selected.livingCount} คน</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg">
                  <p className="text-xs text-amber-300">ภัยคุกคาม</p>
                  <p className="font-mono text-xl mt-1">{Math.round(selected.threat)}<span className="text-xs text-slate-500">/100</span></p>
                  <p className="text-[11px] text-slate-400 mt-1">{selected.threat >= 65 ? 'อันตรายสูง' : selected.threat >= 35 ? 'ควรระวัง' : 'ค่อนข้างสงบ'}</p>
                </div>
              </div>
              {!!selected.signals.length && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-amber-200">เรื่องที่เกิดขึ้นในย่านนี้</h3>
                  {selected.signals.map(s => (
                    <p
                      key={s.id}
                      className={`text-xs p-2.5 border rounded-lg ${
                        s.kind === 'crisis'
                          ? 'border-rose-500/50 bg-rose-950/30 text-rose-200'
                          : 'border-amber-800/60 text-amber-100'
                      }`}
                    >
                      {s.kind === 'crisis' ? '! ' : s.kind === 'ending' ? '★ ' : '? '}
                      {s.title}
                    </p>
                  ))}
                </div>
              )}
              {!selected.isCurrent && selected.route.length === 2 && (
                <div className="text-xs text-emerald-200 p-3 bg-emerald-950/35 border border-emerald-500/30 rounded-lg">
                  <p className="font-bold mb-1">เส้นทางเชื่อมต่อโดยตรง (1 ช่วง · 1 วัน)</p>
                  <p>{selected.route.map(names).join(' → ')}</p>
                </div>
              )}
              {!selected.isCurrent && selected.route.length > 2 && (
                <div className="text-xs text-sky-200 p-3 bg-sky-950/40 border border-sky-500/30 rounded-lg">
                  <p className="font-bold mb-1">ต้องเดินทางเป็นช่วงตามแนวถนน รวม {selected.route.length - 1} ช่วง</p>
                  <p>{selected.route.map(names).join(' → ')}</p>
                  <p className="mt-2">รอบนี้เดินทางช่วงแรกไป{next ? fullName(next) : ''}ก่อน ใช้ 1 วัน</p>
                </div>
              )}
              {selected.preview.notices.map((n, i) => (
                <p key={i} className="text-xs text-amber-200">{n.text}</p>
              ))}
              {selected.preview.costSummary?.map((text, i) => (
                <p key={i} className="text-xs text-slate-300">{text}</p>
              ))}
              {!selected.preview.enabled && selected.preview.reasons.map(text => (
                <p key={text} className="text-xs text-slate-400">{text}</p>
              ))}
            </div>
            <div className="pixel-map-dialog-actions p-4 border-t border-slate-700">
              <button
                type="button"
                disabled={!selected.preview.enabled || !next}
                onClick={() => {
                  if (next && selected.preview.enabled) {
                    const targetDestination = selected.id;
                    setSelectedId(null);
                    onTravel(next, targetDestination);
                  }
                }}
                className="w-full min-h-12 rounded-xl px-4 py-3 font-bold text-sm bg-lime-300 text-slate-950 disabled:bg-slate-800 disabled:text-slate-500"
              >
                {selected.isCurrent
                  ? 'เจ้าอยู่ที่นี่แล้ว'
                  : selected.route.length > 2
                  ? `เดินทางช่วงแรกไป${next ? names(next) : ''} · 1 วัน`
                  : 'เดินทางมาที่นี่ · 1 วัน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
