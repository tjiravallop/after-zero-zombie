import routes from './progressionRoutes.json';
import districts from './bangkokLocations.json';
export function getEndingReadiness(state: any, endingId?: string): { enabled: boolean; reasons: string[] } {
  const route = routes.find(r => r.endings.includes(endingId || ''));
  if (!route) return { enabled: true, reasons: [] };
  const reasons: string[] = [];
  route.steps.forEach((step, i) => { if (!state.story?.flags?.[`route.${route.id}.${i}`]) reasons.push(step.name); });
  const destination = endingId === 'extinction' ? 'radio' : route.destination;
  if (state.place !== destination) reasons.push(`เดินทางไป${districts.find(d => d.id === destination)?.name || 'หอวิทยุสะพานพระราม 8'}`);
  const requirements = endingId === 'extinction' ? {...route.requirements, horde:110,mutation:80,campaign:2} : route.requirements;
  const labels:Record<string,string> = {research:'งานวิจัย',humanity:'ความเห็นใจ',sanity:'สติ',trust:'ความไว้ใจ',horde:'อำนาจฝูง',mutation:'กลายพันธุ์',campaign:'การยึดพื้นที่'};
  for (const [key, min] of Object.entries(requirements)) if ((state.stats?.[key] || 0) < min) reasons.push(`${labels[key] || key} ${Math.floor(state.stats?.[key] || 0)}/${min}`);
  if ((state.items?.samples || 0) < route.samples) reasons.push(`ตัวอย่างเชื้อ ${state.items?.samples || 0}/${route.samples}`);
  return { enabled: !reasons.length, reasons };
}
export const PROGRESSION_ROUTES = routes.map(route => ({...route, steps:route.steps.map(step=>({...step,placeName:districts.find(d=>d.id===step.place)?.name || step.place}))}));

export type RouteGuidance = {
  routeId: string; label: string; readiness: number; completedSteps: number; eligible: boolean;
  nextStep: {actionId: string; placeId: string; title: string} | null;
  destination: string; requirementsMet: boolean; missingStatKeys: string[]; missingSamples: boolean;
};

export function getRouteGuidance(state: any): RouteGuidance[] {
  if (!state?.stats || state.ending) return [];
  const ratio = (current: number, target: number) => Math.max(0, Math.min(1, (Number(current) || 0) / target));
  return PROGRESSION_ROUTES.map(route => {
    const completed = route.steps.map((_, i) => Boolean(state.story?.flags?.[`route.${route.id}.${i}`]));
    const completedSteps = completed.filter(Boolean).length;
    const missingStatKeys = Object.entries(route.requirements).filter(([key, target]) => (Number(state.stats[key]) || 0) < target).map(([key]) => key);
    const missingSamples = (Number(state.items?.samples) || 0) < route.samples;
    const scores = [completedSteps / route.steps.length,
      ...Object.entries(route.requirements).map(([key, target]) => ratio(state.stats[key], target)),
      ...(route.samples ? [ratio(state.items?.samples, route.samples)] : [])];
    const readiness = scores.reduce((sum, value) => sum + value, 0) / scores.length;
    const nextIndex = completed.findIndex(done => !done);
    const step = route.steps[nextIndex];
    return {routeId: route.id, label: route.label, readiness, completedSteps,
      eligible: completedSteps >= 2 && readiness >= .75,
      nextStep: step ? {actionId: `route.${route.id}.${nextIndex}`, placeId: step.place, title: step.name} : null,
      destination: route.destination, requirementsMet: missingStatKeys.length === 0 && !missingSamples,
      missingStatKeys, missingSamples};
  }).sort((a, b) => b.readiness - a.readiness);
}
