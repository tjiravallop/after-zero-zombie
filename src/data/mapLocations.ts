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

export function findMapRoute(places: Record<string, { neighbors?: string[] }>, from: string, to: string): string[] {
  const queue = [[from]], visited = new Set([from]);
  while (queue.length) {
    const path = queue.shift()!;
    if (path.at(-1) === to) return path;
    for (const next of places[path.at(-1)!]?.neighbors || []) if (!visited.has(next)) {
      visited.add(next); queue.push([...path, next]);
    }
  }
  return [];
}

export function buildMapLocations(production: any, state: any, zones: Record<string, ZonePopulationState>, triggeredIds: string[] = [], context?: {currentBio:CharacterBioDossier;pastLives:PastLifeRecord[]}): MapLocation[] {
  if (!production || !state) return [];
  const { engine, catalog } = production;
  return Object.entries(catalog.PLACES).map(([id, value]) => {
    const place = value as {name:string;short?:string;description:string;neighbors:string[]};
    const population = calculateZoneTrustStats(zones[id]);
    const hypothetical = { ...state, place: id, pending: null, stats: { ...state.stats } };
    const signals: MapSignal[] = [];
    if (!state.ending) {
      for (const npc of zones[id]?.npcs || []) if (npc.alive && !npc.crisisResolved && npc.crisisDay && state.day >= npc.crisisDay) {
        signals.push({id:npc.id,kind:'crisis',title:`${npc.name}: ${npc.crisisText || 'ต้องการความช่วยเหลือ'}`});
      }
      for (const action of catalog.ACTIONS) {
        if (!action.places?.includes(id)) continue;
        const story = action.id.startsWith('bkk_') || action.id.startsWith('route.') || action.id.startsWith('story.') || production.storyActionIds.includes(action.id);
        if (!(story || action.ending) || !engine.previewAction(hypothetical, action.id).enabled) continue;
        signals.push({id:action.id,kind:action.ending?'ending':'quest',title:action.name});
      }
      const climax = getTriggeredEndingClimaxModal(hypothetical, zones[id], zones, triggeredIds);
      if (climax) signals.push({id:climax.id,kind:'ending',title:climax.title});
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
