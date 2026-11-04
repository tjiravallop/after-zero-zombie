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
