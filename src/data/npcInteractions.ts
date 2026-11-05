import type {LifeSimModalEvent,ZonePopulationState,ZoneNpc} from './pastLifeEchoes';
import {changeTrust,previewTrust,relationshipState,scaledTrust,crisisNeed,recordRescue} from './npcRelationships.js';

function kindOf(choice:LifeSimModalEvent['choices'][number]) {
  const e=choice.effects;
  return choice.relationshipKind || (e.killTargetNpc||e.tensionDays?'breach':e.medicine&&e.medicine<0?'medicine':e.supplies&&e.supplies<0?'supplies':e.resolveNpcCrisis?'rescue':'work');
}

export function validateZoneRelationships(zones:Record<string,ZonePopulationState>) {
  if(!zones||typeof zones!=='object'||Array.isArray(zones))throw Error('ข้อมูลผู้รอดชีวิตไม่ถูกต้อง');
  for(const zone of Object.values(zones)) {
    if(!zone||!Array.isArray(zone.npcs)||zone.npcs.length>100)throw Error('ข้อมูลผู้รอดชีวิตไม่ถูกต้อง');
    for(const npc of zone.npcs) {
      if(!npc||typeof npc.id!=='string'||npc.id.length>240||!Number.isFinite(npc.trust)||npc.trust<0||npc.trust>100||typeof npc.alive!=='boolean')throw Error('ข้อมูลความไว้ใจไม่ถูกต้อง');
      relationshipState(npc);
    }
  }
  return zones;
}

// Produces the exact capped reward shown beside a choice without consuming history.
export function prepareNpcModal(modal:LifeSimModalEvent,state:any,zone?:ZonePopulationState):LifeSimModalEvent {
  if(modal.relationshipPrepared)return modal;
  if(!zone)return modal;
  const target=zone.npcs.find(n=>n.id===modal.targetNpcId);
  const day=state.day||1;
  const placeKey=modal.placeId||state.place||'shelter';
  const rawLoc=state?.world?.locations?.[placeKey]||(placeKey==='tower'?state?.world?.locations?.radio:undefined);
  const localThreat=Math.min(100,Math.max(0,Math.round(Number(rawLoc?.threat??20))));
  return {...modal,runId:modal.runId||state.runId,relationshipPrepared:true,expectedDay:modal.expectedDay??day,choices:modal.choices.map(original=>{
    const effects={...original.effects},kind=kindOf(original);
    effects.targetNpcTrustDelta=scaledTrust(effects.targetNpcTrustDelta||0);
    effects.bystanderTrustDelta=scaledTrust(effects.bystanderTrustDelta||0);
    if((effects.bystanderTrustDelta||0)>0)effects.bystanderTrustDelta=Math.min(3,effects.bystanderTrustDelta!);
    let incompatible=false;
    if(effects.resolveNpcCrisis && target) {
      const need=crisisNeed(target);
      const matches=need==='medicine'?(effects.medicine||0)<0:need==='supplies'?(effects.supplies||0)<0:kind==='rescue';
      incompatible=!matches;
      effects.resolveNpcCrisis=matches&&!target.crisisResolved;
      effects.saveLife=Boolean(effects.resolveNpcCrisis && (effects.saveLife || (need==='rescue'&&/ฝูง|ติดอยู่|ทับ|ไล่|โจมตี|เลือดไหล/.test(target.crisisText||''))));
    }
    if(!modal.witnessIds?.length)delete effects.bystanderTrustDelta;
    let note=original.note;
    if(effects.saveLife&&!note.includes('ช่วยคน +1'))note+=' · ช่วยคน +1 (ครั้งแรกของวิกฤตนี้)';
    if(original.effects.bystanderTrustDelta && !modal.witnessIds?.length) {
      note=note.split(' · ').filter(part=>!/^ความไว้ใจ(?:คนในย่าน|ย่าน|เฉลี่ย|ในพื้นที่)/.test(part)).join(' · ');
    }
    if(target && effects.targetNpcTrustDelta) {
      const preview=previewTrust(target,{day,kind,amount:effects.targetNpcTrustDelta,key:modal.id,threat:localThreat});
      note=note.split(' · ').filter(part=>!part.startsWith('ความไว้ใจ')).join(' · ');
      note+=` · ความไว้ใจของ${target.name} ${preview.gain>=0?'+':''}${preview.gain}`;
      if(effects.targetNpcTrustDelta>0&&preview.gain===0)note+=' (ยังไม่เพิ่มจากการทำซ้ำ)';
      else if(effects.targetNpcTrustDelta>0&&localThreat>=35) {
        const pct=localThreat>=85?65:localThreat>=60?50:25;
        note+=` (ภัยพื้นที่ ${localThreat}/100 คนระแวง: ไว้ใจขึ้นยาก -${pct}%)`;
      }
    }
    if(original.pressure && (state.stats?.hunger||0)>=75) {
      effects.hp=(effects.hp||0)-3;effects.sanity=(effects.sanity||0)-6;
      note+=' · หิวจัด: สภาพร่าง -3 และสติ -6 เพิ่มเติม';
    }
    const hasEnoughSupplies = (effects.supplies || 0) >= 0 || (state.items?.supplies || 0) >= -(effects.supplies || 0);
    const hasEnoughMedicine = (effects.medicine || 0) >= 0 || (state.items?.medicine || 0) >= -(effects.medicine || 0);
    const hasEnoughSamples = (effects.samples || 0) >= 0 || (state.items?.samples || 0) >= -(effects.samples || 0);
    const hasEnoughItems = hasEnoughSupplies && hasEnoughMedicine && hasEnoughSamples;
    const itemShortageReason = !hasEnoughSupplies ? 'เสบียงมนุษย์ไม่พอ' : !hasEnoughMedicine ? 'ชุดเย็บแผลไม่พอ' : !hasEnoughSamples ? 'ตัวอย่างเชื้อไม่พอ' : '';

    if(!original.enabled&&original.disabledReason)note+=' · '+original.disabledReason;
    else if(!hasEnoughItems)note+=' · '+itemShortageReason;
    const text=original.text.replace(/\s*\([^)]*ความไว้ใจ[^)]*\)/g,'');
    const finalEnabled = original.enabled && !incompatible && hasEnoughItems;
    const finalReason = incompatible
      ? 'วิธีนี้ไม่ตรงกับวิกฤต ต้องช่วยให้ตรงกับสิ่งที่เขาต้องการ'
      : !hasEnoughItems
      ? itemShortageReason
      : original.disabledReason;

    return {...original,text,relationshipKind:kind,effects,note,
      enabled:finalEnabled,
      disabledReason:finalReason};
  })};
}

export function npcChoiceReason(state:any,zone:ZonePopulationState|undefined,modal:LifeSimModalEvent,choice:LifeSimModalEvent['choices'][number]) {
  if(state.ending||state.pending)return 'ต้องตัดสินใจเหตุการณ์ที่ค้างอยู่ก่อน';
  const normModalPlace = modal.placeId === 'tower' ? 'radio' : modal.placeId;
  const normStatePlace = state.place === 'tower' ? 'radio' : state.place;
  if(modal.placeId && normModalPlace && normStatePlace && normModalPlace !== normStatePlace && normModalPlace !== 'any' && (modal.runId && modal.runId !== state.runId))return 'สถานการณ์นี้ไม่ตรงกับชีวิตหรือสถานที่ปัจจุบัน';
  if(modal.targetNpcId&&zone?.npcs&&!zone.npcs.some(n=>n.id===modal.targetNpcId&&n.alive))return 'ผู้รอดชีวิตคนนี้ไม่อยู่แล้ว';
  for(const item of ['supplies','medicine','samples'] as const)if((choice.effects[item]||0)<0&&(state.items?.[item]||0)<-choice.effects[item]!)return 'ของในกระเป๋าไม่พอ';
  return '';
}

export function migrateSavedRelationships(state:any,zones:Record<string,ZonePopulationState>) {
  validateZoneRelationships(zones);
  for(const zone of Object.values(zones))for(const npc of zone.npcs) {
    const canonical=npc.storyNpcKey?state.world?.npcs?.[npc.storyNpcKey]:undefined;
    if(canonical&&!canonical.relationship&&!npc.relationship) {
      canonical.trust=Math.max(canonical.trust,npc.trust);
      canonical.relationship=relationshipState(canonical);
    }
  }
  return state;
}

export function applyNpcRelationships(state:any,zone:ZonePopulationState,modal:LifeSimModalEvent,choice:LifeSimModalEvent['choices'][number],day:number) {
  const e=choice.effects,target=zone.npcs.find(n=>n.id===modal.targetNpcId),kind=kindOf(choice);
  const placeKey=modal.placeId||state.place||'shelter';
  const rawLoc=state?.world?.locations?.[placeKey]||(placeKey==='tower'?state?.world?.locations?.radio:undefined);
  const localThreat=Math.min(100,Math.max(0,Math.round(Number(rawLoc?.threat??20))));
  if(target) {
    target.met=true;
    const canonical=target.storyNpcKey?state.world?.npcs?.[target.storyNpcKey]:undefined;
    const person:ZoneNpc=canonical||target;
    if(e.killTargetNpc) {
      target.alive=false;target.trust=0;
      if(canonical){canonical.alive=false;canonical.trust=0;}
      state.memory.killed=Math.min(120,(state.memory.killed||0)+1);
      if(!state.memory.killedOn)state.memory.killedOn=day;
      target.lastNote='ถูกเจ้าสังหาร';
    } else {
      changeTrust(person,{day,kind,amount:e.targetNpcTrustDelta||0,key:modal.id,tension:e.tensionDays||0,threat:localThreat});
      target.trust=person.trust;target.relationship=structuredClone(person.relationship);
      const active=!target.crisisResolved&&target.crisisDay&&day>=target.crisisDay;
      if(e.resolveNpcCrisis&&active) {
        target.crisisResolved=true;
        const crisisKey=`${target.id}:${target.crisisDay}`;
        if(e.saveLife&&recordRescue(person,crisisKey)) {
          state.memory.saved=Math.min(120,(state.memory.saved||0)+1);
          if(!state.memory.savedOn)state.memory.savedOn=day;
        }
        target.relationship=structuredClone(person.relationship);
      }
      target.lastNote=e.tensionDays?'ยังไม่พร้อมให้เข้าใกล้จนถึงวันที่ '+person.relationship.tensionUntil:e.resolveNpcCrisis?'คลี่คลายวิกฤตแล้ว แต่ยังขอให้รักษาระยะ':'จำการกระทำของเจ้าได้ · ความไว้ใจ '+target.trust+'/100';
    }
  }
  // Only explicitly staged witnesses hear/see this encounter. Met NPCs elsewhere do not.
  for(const id of modal.witnessIds||[]) {
    const witness=zone.npcs.find(n=>n.id===id&&n.alive&&n.id!==target?.id);
    if(!witness||!e.bystanderTrustDelta)continue;
    const canonical=witness.storyNpcKey?state.world?.npcs?.[witness.storyNpcKey]:undefined;
    const person=canonical||witness;
    changeTrust(person,{day,kind:'witness',amount:e.bystanderTrustDelta,key:modal.id,threat:localThreat});
    witness.trust=person.trust;witness.relationship=structuredClone(person.relationship);
  }
}
