import {useEffect, useRef, useState} from 'react';
import type {MapLocation} from '../data/mapLocations';

// Approximate district layout. Game routes are schematic, not surveyed road distances.
const positions:Record<string,[number,number]> = {
  radio:[15,34],bkk_depot:[12,58],bkk_cafe:[43,10],bkk_busyard:[44,30],
  hospital:[31,43],bkk_ward:[45,49],shelter:[64,21],bkk_winstop:[74,40],
  bkk_power:[87,10],bkk_office:[88,54],bkk_stockroom:[46,66],bkk_pier:[67,61],
  streets:[77,78],nest:[49,87],bkk_market:[88,93],
};
const labels:Record<string,string>={radio:'พระราม 8',bkk_depot:'พระนคร',bkk_cafe:'อารีย์',bkk_busyard:'อนุสาวรีย์ชัยฯ',hospital:'รพ.ราชวิถี',bkk_ward:'หอผู้ป่วย',shelter:'ดินแดง',bkk_winstop:'คิววิน',bkk_power:'ห้วยขวาง',bkk_office:'พระราม 9',bkk_stockroom:'ประตูน้ำ',bkk_pier:'ท่าแสนแสบ',streets:'พระราม 4',nest:'สามย่าน',bkk_market:'คลองเตย'};
const roads = [
  'M42 -5L43 10L44 30L45 49L46 66L49 87L53 104',
  'M12 32L24 38L31 43L45 49L62 46L74 40L94 36L104 39',
  'M12 58L27 63L46 66L67 61L88 54L103 53',
  'M87 -4L87 10L82 25L74 40L88 54L84 65L77 78L88 93L100 103',
  'M22 87L36 88L49 87L62 82L77 78L99 81',
  'M17 12L29 22L44 30L64 21L82 25L99 23',
];
const routePaths:Record<string,string> = {
  'radio|streets':'M15 34L12 58L27 63L46 66L67 61L77 78',
  'hospital|streets':'M31 43L45 49L46 66L62 72L77 78',
  'shelter|streets':'M64 21L74 40L82 48L84 65L77 78',
  'nest|streets':'M49 87L62 82L77 78',
  'hospital|radio':'M31 43L24 38L15 34',
  'bkk_office|radio':'M88 54L67 61L46 66L27 63L12 58L15 34',
};

export default function PixelCityMap({places,onTravel,pinnedPlaceId}:{places:MapLocation[];onTravel:(id:string)=>void;pinnedPlaceId?:string|null}) {
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const closeRef=useRef<HTMLButtonElement>(null);
  const dialogRef=useRef<HTMLDivElement>(null);
  const selected=places.find(p=>p.id===selectedId);
  useEffect(()=>{
    if(!selectedId)return;
    const previous=document.activeElement as HTMLElement|null;
    closeRef.current?.focus();
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();setSelectedId(null);}
      if(e.key==='Tab'){
        const buttons=Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])')||[]);
        const first=buttons[0],last=buttons.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown',key);
    return ()=>{document.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus();};
  },[selectedId]);
  const point=(id:string):[number,number]=>positions[id] || [50,95];
  const names=(id:string)=>places.find(p=>p.id===id)?.short||id;
  const next=selected?.travelTarget;
  return <section className="pixel-city-map rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden" aria-label="แผนที่เดินทางกรุงเทพฯ">
    <header className="px-4 pt-4 pb-3"><p className="text-[10px] tracking-[.2em] text-emerald-400 font-mono">BANGKOK · AFTER ZERO</p><h3 className="text-lg font-bold text-slate-100 mt-1">เลือกทางที่จะเดินต่อ</h3><p className="text-xs text-slate-400 mt-1">แตะสถานที่เพื่อดูข้อมูลและเลือกเดินทาง · ช่วงละ 1 วัน</p></header>
    <div className="pixel-map-legend"><span><i className="map-key-current"/>อยู่ที่นี่</span><span><i className="map-key-quest"/>มีเควสต์</span><span><i className="map-key-crisis"/>เหตุฉุกเฉิน</span><span><i className="map-key-ending"/>จุดตัดสินใจ</span></div>
    {pinnedPlaceId && <p className="px-4 pb-3 text-xs text-sky-200">⚑ เป้าหมายที่ปักหมุด: {places.find(p => p.id === pinnedPlaceId)?.name}</p>}
    <div className="pixel-map-terrain">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pixel-map-ground" aria-hidden="true">
        <rect width="100" height="100" fill="#172923"/>
        <path d="M-5 -5H9C3 13 16 21 9 35S1 54 10 69S26 85 20 105H-5Z" fill="#244650"/>
        <path d="M9 -5C3 13 16 21 9 35S1 54 10 69S26 85 20 105" fill="none" stroke="#39606a" strokeWidth=".6"/>
        <path d="M11 62L28 65L46 63L67 61L88 57L105 59" fill="none" stroke="#31525a" strokeWidth="1.3"/>
        <path d="M54 70L63 68L70 73L64 81L56 80Z" fill="#264233"/>
        <path d="M28 16L36 12L38 20L33 26L27 23Z" fill="#223a2e"/>
        <g fill="none" stroke="#314237" strokeWidth=".3">
          <path d="M18 0L23 21L18 35L26 52L24 72L33 100M55 0L54 17L58 39L55 61L60 91M96 0L95 29L98 49L94 73L99 94"/>
          <path d="M15 18L42 20L64 15L91 18M18 51L40 55L61 51L87 49M23 75L43 73L65 79L98 71"/>
        </g>
        <g fill="none" strokeLinejoin="round" strokeLinecap="round">
          {roads.map((d,i)=><g key={i}><path d={d} stroke="#0e1d19" strokeWidth="1.8"/><path d={d} stroke="#536451" strokeWidth=".65"/></g>)}
          {places.filter(p=>p.isCurrent).flatMap(p=>p.neighbors.map(id=>{
            const [x,y]=point(p.id),[xx,yy]=point(id),key=[p.id,id].sort().join('|');
            const path=routePaths[key]||`M${x} ${y}Q${(x+xx)/2+3} ${(y+yy)/2-2} ${xx} ${yy}`;
            return <path key={key} d={path} stroke="#abc994" strokeWidth=".7" strokeDasharray="1.5 1.2"/>;
          }))}
        </g>
        <text x="5" y="80" transform="rotate(-78 5 80)" fill="#668b91" fontSize="2.4">เจ้าพระยา</text>
        <text x="90" y="61" fill="#5b7d82" fontSize="2.1">แสนแสบ</text>
      </svg>
      {places.map(p=>{const [x,y]=point(p.id),urgent=p.signals.some(s=>s.kind==='crisis'),ending=p.signals.some(s=>s.kind==='ending'),status=urgent?'crisis':ending?'ending':p.signals.length?'quest':'quiet';return <button type="button" key={p.id} data-location={p.id} data-status={status} aria-label={`${p.name}${p.isCurrent?' · อยู่ที่นี่':''}${p.id===pinnedPlaceId?' · เป้าหมายที่ปักหมุด':''}${p.signals.length?' · มีเรื่องพิเศษ '+p.signals.length+' รายการ':''}`} className={`pixel-map-marker ${p.isCurrent?'is-current':''} ${p.id===pinnedPlaceId?'is-pinned':''}`} style={{left:x+'%',top:y+'%'}} onClick={()=>setSelectedId(p.id)}>
        <span className="pixel-map-dot" aria-hidden="true"/>
        <span className="pixel-map-place-name">{labels[p.id]||p.short||p.name}{p.id === pinnedPlaceId && <span className="route-pin-label">⚑ หมุด</span>}</span>
        
      </button>;})}
      <span className="pixel-map-north" aria-hidden="true">N ↑</span>
    </div>
    <p className="px-4 py-3 text-[11px] text-slate-400">แผนที่ย่อกรุงเทพฯ · เส้นประคือทางที่เดินต่อได้จากจุดปัจจุบัน</p>
    {selected&&<div className="game-dialog pixel-map-dialog fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="map-place-title" onClick={e=>{if(e.target===e.currentTarget)setSelectedId(null);}}>
      <div ref={dialogRef} className="w-full max-w-lg rounded-2xl border border-emerald-600/60 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-700"><div><p className="text-xs text-emerald-300">{selected.isCurrent?'ตำแหน่งปัจจุบัน':'สำรวจปลายทาง'}</p><h2 id="map-place-title" className="font-bold text-xl mt-1">{selected.name}</h2></div><button ref={closeRef} type="button" onClick={()=>setSelectedId(null)} aria-label="ปิดข้อมูลสถานที่" className="w-12 shrink-0 text-xl text-slate-300">×</button></div>
        <div className="pixel-map-dialog-body p-4 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">{selected.description}</p>
          <div className="grid grid-cols-2 gap-3"><div className="p-3 bg-slate-950 rounded-lg"><p className="text-xs text-emerald-300">ความไว้ใจเฉลี่ย</p><p className="font-mono text-xl mt-1">{Math.round(selected.averageTrust)}<span className="text-xs text-slate-500">/100</span></p><p className="text-[11px] text-slate-400 mt-1">ผู้รอดชีวิต {selected.livingCount} คน</p></div><div className="p-3 bg-slate-950 rounded-lg"><p className="text-xs text-amber-300">ภัยคุกคาม</p><p className="font-mono text-xl mt-1">{Math.round(selected.threat)}<span className="text-xs text-slate-500">/100</span></p><p className="text-[11px] text-slate-400 mt-1">{selected.threat>=65?'อันตรายสูง':selected.threat>=35?'ควรระวัง':'ค่อนข้างสงบ'}</p></div></div>
          {!!selected.signals.length&&<div className="space-y-2"><h3 className="text-sm font-bold text-amber-200">เรื่องที่เกิดขึ้นในย่านนี้</h3>{selected.signals.map(s=><p key={s.id} className={`text-xs p-2.5 border rounded-lg ${s.kind==='crisis'?'border-rose-500/50 bg-rose-950/30 text-rose-200':'border-amber-800/60 text-amber-100'}`}>{s.kind==='crisis'?'! ':s.kind==='ending'?'★ ':'? '}{s.title}</p>)}</div>}
          {!selected.isCurrent&&selected.route.length>2&&<div className="text-xs text-sky-200 p-3 bg-sky-950/40 rounded-lg"><p className="font-bold mb-1">ต้องเดินทางเป็นช่วง รวม {selected.route.length-1} ช่วง</p><p>{selected.route.map(names).join(' → ')}</p><p className="mt-2">รอบนี้เดินทางไป{next?names(next):''}ก่อน ใช้ 1 วัน</p></div>}
          {selected.preview.notices.map((n,i)=><p key={i} className="text-xs text-amber-200">{n.text}</p>)}
          {selected.preview.costSummary?.map((text,i)=><p key={i} className="text-xs text-slate-300">{text}</p>)}
          {!selected.preview.enabled&&selected.preview.reasons.map(text=><p key={text} className="text-xs text-slate-400">{text}</p>)}
        </div>
        <div className="pixel-map-dialog-actions p-4 border-t border-slate-700">
          <button type="button" disabled={!selected.preview.enabled||!next}
            onClick={()=>{if(next&&selected.preview.enabled){setSelectedId(null);onTravel(next);}}}
            className="w-full min-h-12 rounded-xl px-4 py-3 font-bold text-sm bg-lime-300 text-slate-950 disabled:bg-slate-800 disabled:text-slate-500">
            {selected.isCurrent?'เจ้าอยู่ที่นี่แล้ว':selected.route.length>2?`เดินทางช่วงแรกไป${next?names(next):''} · 1 วัน`:'เดินทางมาที่นี่ · 1 วัน'}
          </button>
        </div>
      </div>
    </div>}
  </section>;
}
