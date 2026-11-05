// Shared by React and the embedded engine (scripts/sync-bangkok-content.mjs).
export const RELATIONSHIP_KINDS = ['supplies','medicine','work','information','respect','rescue','story','witness','breach'];
const clamp = n => Math.max(0, Math.min(100, Math.round(n)));
const integer = n => Number.isSafeInteger(n) && n >= 0 && n <= 10000;

export function relationshipState(npc) {
  const old = npc.relationship;
  if (!old) return {version:1,history:[],evidence:0,tensionUntil:0,boundaryAcknowledged:false,rescues:[]};
  if (old.version !== 1 || !Array.isArray(old.history) || old.history.length > 64 ||
      !integer(old.evidence) || !integer(old.tensionUntil) || typeof old.boundaryAcknowledged !== 'boolean' ||
      !Array.isArray(old.rescues) || old.rescues.length > 120 || old.rescues.some(x=>typeof x!=='string'||x.length>240) ||
      old.history.some(x=>!x || !integer(x.day) || !RELATIONSHIP_KINDS.includes(x.kind) ||
        typeof x.key!=='string' || x.key.length>240 || !Number.isSafeInteger(x.gain) || Math.abs(x.gain)>100)) {
    throw Error('ข้อมูลประวัติความสัมพันธ์ NPC ไม่ถูกต้อง');
  }
  return JSON.parse(JSON.stringify(old));
}

export function relationshipTier(trust) {
  const names = ['ยังไม่รู้เจตนา','รักษาระยะ','ยอมเจรจา','ร่วมมือมีเงื่อนไข','พันธมิตร'];
  const index = trust >= 85 ? 4 : trust >= 70 ? 3 : trust >= 45 ? 2 : trust >= 20 ? 1 : 0;
  return {index,label:names[index]};
}

export function dangerTrustMultiplier(threat = 0) {
  const t = Number(threat) || 0;
  if (t >= 85) return 0.35;
  if (t >= 60) return 0.5;
  if (t >= 35) return 0.75;
  return 1;
}

export function changeTrust(npc, {day,kind='story',amount=0,mode='delta',key='',tension=0,threat=0}) {
  if (!integer(day) || !RELATIONSHIP_KINDS.includes(kind) || !Number.isFinite(amount)) throw Error('Invalid relationship action');
  const r = relationshipState(npc), before = clamp(npc.trust || 0);
  let requested = mode === 'delta' ? amount : mode === 'floor' ? Math.max(0,amount-before) : amount-before;
  if (mode === 'delta') {
    const t = Number(threat) || 0;
    if (requested > 0 && t >= 35) {
      requested = Math.max(1, Math.round(requested * dangerTrustMultiplier(t)));
    } else if (requested < 0 && t >= 60) {
      requested = Math.round(requested * (t >= 85 ? 1.5 : 1.25));
    }
  }
  let gain = Math.round(requested);
  if (gain > 0) {
    const same = r.history.filter(x=>x.kind===kind && day-x.day>=0 && day-x.day<3 && x.gain>0);
    const already = r.history.some(x=>x.day===day && x.kind===kind && x.key===key);
    const daily = r.history.filter(x=>x.day===day && x.gain>0).reduce((n,x)=>n+x.gain,0);
    const factor = same.length===0 ? 1 : same.length===1 ? .5 : same.length===2 ? .125 : 0;
    gain = already || (kind==='respect' && r.boundaryAcknowledged) || factor===0 ? 0 : Math.max(1,Math.floor(Math.min(gain,kind==='rescue'?16:12)*factor));
    gain = Math.max(0,Math.min(gain,(kind==='rescue'?16:12)-daily));
    if (gain>0 && !r.history.some(x=>x.day===day && x.kind===kind)) r.evidence += kind==='rescue'?2:1;
    // Evidence comes from repeated meaningful encounters, not a minimum world day or a mandatory rescue.
    const cap = r.evidence<3 ? 44 : r.evidence<6 ? 69 : r.evidence<10 ? 84 : 100;
    gain = Math.min(gain,Math.max(0,Math.max(before,cap)-before));
    if(kind==='respect' && gain>0) r.boundaryAcknowledged=true;
  }
  npc.trust = clamp(before+gain);
  if (tension>0) r.tensionUntil=Math.max(r.tensionUntil,day+tension);
  r.history.push({day,kind,key:String(key).slice(0,240),gain:npc.trust-before});
  r.history=r.history.slice(-64);
  npc.relationship=r;
  return npc.trust-before;
}

export function previewTrust(npc, action) {
  const copy=JSON.parse(JSON.stringify(npc));
  const gain=changeTrust(copy,action);
  return {gain,trust:copy.trust};
}

export function npcPosture(npc,day) {
  const r=relationshipState(npc);
  const armed=/ทหาร|รปภ|รักษาความปลอดภัย|ติดอาวุธ|ปืน|อาวุธ|การ์ด/.test(npc.role+' '+npc.trait);
  if(r.tensionUntil>day) return {label:'ยังไม่พร้อมเจรจา',armed,warning:true,text:'เขาหลบอยู่หลังแนวกั้นและย้ำว่าอย่าตามเข้ามา ยังรับของที่วางห่าง ๆ ได้ แต่ไม่ยอมให้เข้าใกล้'};
  if(npc.trust<20) return {label:'ระแวงคนแปลกหน้า',armed,warning:true,text:armed?'เขายกอาวุธคุมเชิง “หยุดตรงนั้น อย่าเข้ามา!” สายตาจับอยู่ที่มือของเจ้า':'เขาสะดุ้งแล้วถอยหาที่กำบัง “อย่าเข้ามานะ” แม้ยังไม่มีอาวุธในมือ แต่เขากำลังมองหาทางหนี'};
  if(npc.trust<45) return {label:'คุมเชิงรักษาระยะ',armed,warning:true,text:'เขาจำเจ้าได้ แต่ยังชี้ให้หยุดห่างจากตัว “วางของตรงนั้นแล้วถอยก่อน”'};
  if(npc.trust<70) return {label:'ยอมฟังจากระยะห่าง',armed,warning:false,text:'เขายอมฟังสิ่งที่เจ้าส่งสัญญาณ แต่ยังเว้นช่องทางหนีและขอให้บอกก่อนขยับเข้าใกล้'};
  return {label:'ยอมร่วมมือ',armed,warning:false,text:'เขาจำการกระทำที่ผ่านมาของเจ้าได้ จึงยอมคุยและช่วยงานกัน โดยยังตกลงระยะปลอดภัยก่อนเข้าใกล้'};
}

export function npcHuntEffects(armed) {
  return {hp:armed?-12:-5,hunger:-45,humanity:-18,mutation:6,killTargetNpc:true,bystanderTrustDelta:-20,threatDelta:12};
}

export function crisisNeed(npc) {
  const text=npc.crisisText||'';
  if(/ติดอยู่|ขวาง|ทับ|ล้อม|ไล่|โจมตี|ดัก|ลงจาก.*ไม่ได้|ห้อย|ขัง|หนีซอมบี้/.test(text))return 'rescue';
  if(/แผล|ไข้|ติดเชื้อ|บาดเจ็บ|ป่วย|เจ็บ|เลือดไหล/.test(text)) return 'medicine';
  if(/อาหาร|เสบียง|ข้าว|อดอยาก|อดอาหาร/.test(text)) return 'supplies';
  return 'rescue';
}

export function recordRescue(npc,key) {
  const r=relationshipState(npc);
  if(r.rescues.includes(key))return false;
  r.rescues.push(key);npc.relationship=r;return true;
}

export function scaledTrust(value) { return value>16 ? Math.min(12,Math.max(4,Math.round(value/8))) : value; }

export function rebalanceRelationshipCatalog(catalog) {
  const copy=JSON.parse(JSON.stringify(catalog));
  for(const event of copy.EVENTS)for(const choice of event.choices||[]) {
    for(const op of choice.effects||[])if((op.type==='stat.add'&&op.key==='trust')||(op.type==='stat'&&op.path==='stats.trust')) {
      if(op.value>16){const previous=op.value;op.value=scaledTrust(previous);if(choice.note)choice.note=choice.note.replace('ความไว้ใจ +'+previous,'ความไว้ใจ +'+op.value);}
    }
    for(const op of choice.effects||[])if(op.type==='npc.set' && op.field==='trust' && op.value>0) {
      const previous=op.value;op.value=Math.max(3,Math.round(previous*.35));
      const adverse=choice.effects.some(other=>other.type==='npc.set'&&other.id===op.id&&other.field==='state'&&['hostile','gone','departed','dead','exiled'].includes(other.value));
      if(adverse)op.value=0;
      else op.minimum=true;
      if(choice.note)choice.note=choice.note.replace(new RegExp('(ความไว้ใจ(?:ของ[^·]*?)?(?:เป็น|อย่างน้อย)\\s*)'+previous+'(?=\\D|$)'),(_,label)=>label+op.value);
    }
  }
  return copy;
}

export function validateSavedEncounter(value) {
  if(value===undefined)return;
  if(!value||typeof value!=='object'||typeof value.id!=='string'||value.id.length>240||
    typeof value.placeId!=='string'||!Array.isArray(value.choices)||value.choices.length<1||value.choices.length>20||
    (value.expectedDay!==undefined&&!integer(value.expectedDay))||
    (value.witnessIds!==undefined&&(!Array.isArray(value.witnessIds)||value.witnessIds.length>10||value.witnessIds.some(x=>typeof x!=='string'))))throw Error('เหตุการณ์ NPC ในเซฟไม่ถูกต้อง');
  for(const choice of value.choices) {
    if(!choice||typeof choice.text!=='string'||typeof choice.note!=='string'||typeof choice.outcomeText!=='string'||typeof choice.enabled!=='boolean'||!choice.effects||
      (choice.relationshipKind!==undefined&&!RELATIONSHIP_KINDS.includes(choice.relationshipKind)))throw Error('ตัวเลือก NPC ในเซฟไม่ถูกต้อง');
    for(const [key,v]of Object.entries(choice.effects)) {
      if(['killTargetNpc','resolveNpcCrisis','saveLife'].includes(key)){if(typeof v!=='boolean')throw Error('Invalid NPC effect');}
      else if(['triggerEndingId','setFlag'].includes(key)){if(typeof v!=='string')throw Error('Invalid ending or flag');}
      else if(key==='setFlags'){if(!Array.isArray(v)||v.some(x=>typeof x!=='string'))throw Error('Invalid setFlags effect');}
      else if(v!==undefined&&(!Number.isFinite(v)||Math.abs(v)>200))throw Error('Invalid NPC effect value');
    }
  }
}
