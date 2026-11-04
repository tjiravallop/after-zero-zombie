import type {ZonePopulationState} from './pastLifeEchoes';

export function endingMetrics(state:any,zones:Record<string,ZonePopulationState>) {
  const allies=new Set(Object.values(zones).flatMap(zone=>zone.npcs)
    .filter(npc=>npc.alive&&npc.trust>=85).map(npc=>npc.storyNpcKey||npc.id));
  return {days:state.day||1,saved:state.memory?.saved||0,killed:state.memory?.killed||0,allies:allies.size};
}

// Each line describes an observed action, rather than promising an unseen future.
export const ENDING_REFLECTIONS=[
  {flag:'c42.shelter_fortified',text:'เจ้าช่วยเสริมแนวป้องกันที่หลบภัย ร่องรอยของการตัดสินใจนั้นยังอยู่'},
  {flag:'c41.radio_jammed',text:'เจ้ารบกวนสัญญาณวิทยุ การตัดสินใจของเจ้าเปลี่ยนการสื่อสารในเมือง'},
  {flag:'c40.clinic_stabilized',text:'เจ้าช่วยประคองคลินิกผ่านวิกฤต คนเป็นกับคนตายเคยร่วมมือกันที่นั่น'},
];
export function endingReflections(state:any) {
  const lines=ENDING_REFLECTIONS.filter(rule=>state.story?.flags?.[rule.flag]).map(rule=>rule.text);
  if(state.memory?.saved>0)lines.push(`บันทึกนี้มีการช่วยชีวิตผู้รอดชีวิต ${state.memory.saved} ครั้ง`);
  if(state.memory?.killed>0)lines.push(`มีมนุษย์ ${state.memory.killed} คนเสียชีวิตจากการกระทำของเจ้า`);
  if(state.memory?.corpseMeals>0)lines.push(`เจ้าเคยประทังชีวิตด้วยการกินซากศพ ${state.memory.corpseMeals} ครั้ง`);
  if(state.memory?.endured>0)lines.push(`เจ้าเคยเลือกทนหิว ${state.memory.endured} ครั้ง`);
  return lines.length?lines:['ทุกการเลือกพาเจ้ามาถึงที่นี่ บันทึกชีวิตนี้สิ้นสุดลงแล้ว'];
}
