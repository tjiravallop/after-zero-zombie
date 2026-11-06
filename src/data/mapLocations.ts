import { calculateZoneTrustStats, getTriggeredEndingClimaxModal, type ZonePopulationState, type CharacterBioDossier, type PastLifeRecord } from './pastLifeEchoes';
import { DYNAMIC_NARRATIVE_EVENTS, getNextTriggeredDynamicEvent } from './eventEngine';

export type MapSignal = { id: string; kind: 'quest' | 'crisis' | 'ending' | 'event'; title: string };
export type MapLocation = {
  id: string; name: string; short?: string; description: string; neighbors: string[];
  threat: number; averageTrust: number; livingCount: number; isCurrent: boolean;
  signals: MapSignal[]; route: string[];
  travelTarget?: string;
  preview: { enabled: boolean; reasons: string[]; notices: { text: string }[]; costSummary?: string[] };
};

export const MAP_POSITIONS: Record<string, [number, number]> = {
  radio: [15, 34], bkk_depot: [12, 58], bkk_cafe: [43, 10], bkk_busyard: [44, 30],
  hospital: [31, 43], bkk_ward: [45, 49], shelter: [64, 21], bkk_winstop: [74, 40],
  bkk_power: [87, 10], bkk_office: [88, 54], bkk_stockroom: [46, 66], bkk_pier: [67, 61],
  streets: [77, 78], nest: [49, 87], bkk_market: [88, 93],
};

export const MAP_LABELS: Record<string, string> = {
  radio: 'พระราม 8', bkk_depot: 'พระนคร', bkk_cafe: 'อารีย์', bkk_busyard: 'อนุสาวรีย์ชัยฯ',
  hospital: 'รพ.ราชวิถี', bkk_ward: 'หอผู้ป่วย', shelter: 'ดินแดง', bkk_winstop: 'คิววิน',
  bkk_power: 'ห้วยขวาง', bkk_office: 'พระราม 9', bkk_stockroom: 'ประตูน้ำ', bkk_pier: 'ท่าแสนแสบ',
  streets: 'พระราม 4', nest: 'สามย่าน', bkk_market: 'คลองเตย',
};

function routeGeometricLength(path: string[]): number {
  let sum = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const [x1, y1] = MAP_POSITIONS[path[i]] || [50, 50];
    const [x2, y2] = MAP_POSITIONS[path[i + 1]] || [50, 50];
    const dx = x2 - x1;
    const dy = y2 - y1;
    // Slight cross-track straightness penalty relative to the overall start->end line
    const [sx, sy] = MAP_POSITIONS[path[0]] || [50, 50];
    const [ex, ey] = MAP_POSITIONS[path[path.length - 1]] || [50, 50];
    const totalLen = Math.hypot(ex - sx, ey - sy) || 1;
    const cross = Math.abs((x2 - sx) * (ey - sy) - (y2 - sy) * (ex - sx)) / totalLen;
    sum += Math.hypot(dx, dy) + cross * 0.15;
  }
  return Math.round(sum * 1000) / 1000;
}

function canonicalRouteKey(path: string[]): string {
  const fwd = path.join('>');
  const rev = [...path].reverse().join('>');
  return fwd < rev ? fwd : rev;
}

export function findMapRoute(places: Record<string, { neighbors?: string[] }>, from: string, to: string): string[] {
  if (!places?.[from] || !places?.[to]) return [];
  if (from === to) return [from];
  const queue: string[][] = [[from]];
  const minDepth = new Map<string, number>([[from, 0]]);
  const candidates: string[][] = [];
  let targetDepth = Infinity;

  while (queue.length) {
    const path = queue.shift()!;
    const depth = path.length - 1;
    if (depth > targetDepth) break;
    const current = path[path.length - 1]!;
    if (current === to) {
      targetDepth = depth;
      candidates.push(path);
      continue;
    }
    if (depth >= targetDepth) continue;
    for (const next of places[current]?.neighbors || []) {
      if (path.includes(next)) continue;
      const nextDepth = depth + 1;
      const seenDepth = minDepth.get(next);
      if (seenDepth !== undefined && nextDepth > seenDepth) continue;
      minDepth.set(next, nextDepth);
      queue.push([...path, next]);
    }
  }

  if (!candidates.length) return [];
  candidates.sort((a, b) => {
    const diff = routeGeometricLength(a) - routeGeometricLength(b);
    if (Math.abs(diff) > 0.01) return diff;
    return canonicalRouteKey(a).localeCompare(canonicalRouteKey(b));
  });
  return candidates[0]!;
}

export function buildMapLocations(production: any, state: any, zones: Record<string, ZonePopulationState>, triggeredIds: string[] = [], context?: {currentBio:CharacterBioDossier;pastLives:PastLifeRecord[]}, options: {showRouteHints?: boolean} = {}): MapLocation[] {
  if (!production || !state) return [];
  const { engine, catalog } = production;
  return Object.entries(catalog.PLACES).map(([id, value]) => {
    const place = value as {name:string;short?:string;description:string;neighbors:string[]};
    const population = calculateZoneTrustStats(zones[id]);
    const hypothetical = { ...state, place: id, pending: null, stats: { ...state.stats } };
    const signals: MapSignal[] = [];
    if (!state.ending) {
      for (const npc of zones[id]?.npcs || []) if (npc.alive && !npc.crisisResolved && npc.crisisDay && state.day >= npc.crisisDay) {
        signals.push({id:npc.id,kind:'crisis',title:npc.met ? `${npc.name}: ${npc.crisisText || 'ต้องการความช่วยเหลือ'}` : 'มีเบาะแสว่าคนในย่านนี้ต้องการความช่วยเหลือ'});
      }
      for (const action of catalog.ACTIONS) {
        if (!action.places?.includes(id)) continue;
        if (!options.showRouteHints && (action.ending || action.id.startsWith('route.'))) continue;
        const story = action.id.startsWith('bkk_') || action.id.startsWith('route.') || action.id.startsWith('story.') || production.storyActionIds.includes(action.id);
        if (!(story || action.ending) || !engine.previewAction(hypothetical, action.id).enabled) continue;
        signals.push({id:action.id,kind:action.ending?'ending':'quest',title:action.name});
      }
      const climax = getTriggeredEndingClimaxModal(hypothetical, zones[id], zones, triggeredIds);
      if (climax && options.showRouteHints) signals.push({id:climax.id,kind:'ending',title:climax.title});
      if (context) {
        const event = getNextTriggeredDynamicEvent({gameState:hypothetical,currentBio:context.currentBio,currentZonePop:zones[id],
          allZonePopulations:zones,currentZoneAverageTrust:population.averageTrust,currentZoneLivingCount:population.livingCount,
          pastLives:context.pastLives,triggeredEventIds:triggeredIds}, DYNAMIC_NARRATIVE_EVENTS.filter(e=>e.conditions.places?.length));
        if (event) signals.push({id:event.id,kind:'event',title:event.title});
      }
    }
    const route = findMapRoute(catalog.PLACES, state.place, id);
    const travelTarget = route[1];
    const preview = travelTarget ? engine.previewAction(state, 'move:' + travelTarget) : {
      enabled:false,reasons:[id === state.place ? 'เจ้าอยู่ที่นี่แล้ว' : 'ยังไม่มีเส้นทางเชื่อมถึงที่นี่'],notices:[],costSummary:[],
    };
    return {id,...place,threat:state.world?.locations?.[id]?.threat || 0,averageTrust:population.averageTrust,
      livingCount:population.livingCount,isCurrent:id===state.place,signals,route,travelTarget,preview};
  });
}
