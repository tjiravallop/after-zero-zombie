(() => {
  // BEGIN NPC RELATIONSHIP RULES
  const NpcRelationships = (() => {
// Shared by React and the embedded engine (scripts/sync-bangkok-content.mjs).
const RELATIONSHIP_KINDS = ['supplies','medicine','work','information','respect','rescue','story','witness','breach'];
const clamp = n => Math.max(0, Math.min(100, Math.round(n)));
const integer = n => Number.isSafeInteger(n) && n >= 0 && n <= 10000;

function relationshipState(npc) {
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

function relationshipTier(trust) {
  const names = ['ยังไม่รู้เจตนา','รักษาระยะ','ยอมเจรจา','ร่วมมือมีเงื่อนไข','พันธมิตร'];
  const index = trust >= 85 ? 4 : trust >= 70 ? 3 : trust >= 45 ? 2 : trust >= 20 ? 1 : 0;
  return {index,label:names[index]};
}

function dangerTrustMultiplier(threat = 0) {
  const t = Number(threat) || 0;
  if (t >= 85) return 0.35;
  if (t >= 60) return 0.5;
  if (t >= 35) return 0.75;
  return 1;
}

function changeTrust(npc, {day,kind='story',amount=0,mode='delta',key='',tension=0,threat=0}) {
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

function previewTrust(npc, action) {
  const copy=JSON.parse(JSON.stringify(npc));
  const gain=changeTrust(copy,action);
  return {gain,trust:copy.trust};
}

function npcPosture(npc,day) {
  const r=relationshipState(npc);
  const armed=/ทหาร|รปภ|รักษาความปลอดภัย|ติดอาวุธ|ปืน|อาวุธ|การ์ด/.test(npc.role+' '+npc.trait);
  if(r.tensionUntil>day) return {label:'ยังไม่พร้อมเจรจา',armed,warning:true,text:'เขาหลบอยู่หลังแนวกั้นและย้ำว่าอย่าตามเข้ามา ยังรับของที่วางห่าง ๆ ได้ แต่ไม่ยอมให้เข้าใกล้'};
  if(npc.trust<20) return {label:'ระแวงคนแปลกหน้า',armed,warning:true,text:armed?'เขายกอาวุธคุมเชิง “หยุดตรงนั้น อย่าเข้ามา!” สายตาจับอยู่ที่มือของเจ้า':'เขาสะดุ้งแล้วถอยหาที่กำบัง “อย่าเข้ามานะ” แม้ยังไม่มีอาวุธในมือ แต่เขากำลังมองหาทางหนี'};
  if(npc.trust<45) return {label:'คุมเชิงรักษาระยะ',armed,warning:true,text:'เขาจำเจ้าได้ แต่ยังชี้ให้หยุดห่างจากตัว “วางของตรงนั้นแล้วถอยก่อน”'};
  if(npc.trust<70) return {label:'ยอมฟังจากระยะห่าง',armed,warning:false,text:'เขายอมฟังสิ่งที่เจ้าส่งสัญญาณ แต่ยังเว้นช่องทางหนีและขอให้บอกก่อนขยับเข้าใกล้'};
  return {label:'ยอมร่วมมือ',armed,warning:false,text:'เขาจำการกระทำที่ผ่านมาของเจ้าได้ จึงยอมคุยและช่วยงานกัน โดยยังตกลงระยะปลอดภัยก่อนเข้าใกล้'};
}

function crisisNeed(npc) {
  const text=npc.crisisText||'';
  if(/ติดอยู่|ขวาง|ทับ|ล้อม|ไล่|โจมตี|ดัก|ลงจาก.*ไม่ได้|ห้อย|ขัง|หนีซอมบี้/.test(text))return 'rescue';
  if(/แผล|ไข้|ติดเชื้อ|บาดเจ็บ|ป่วย|เจ็บ|เลือดไหล/.test(text)) return 'medicine';
  if(/อาหาร|เสบียง|ข้าว|อดอยาก|อดอาหาร/.test(text)) return 'supplies';
  return 'rescue';
}

function recordRescue(npc,key) {
  const r=relationshipState(npc);
  if(r.rescues.includes(key))return false;
  r.rescues.push(key);npc.relationship=r;return true;
}

function scaledTrust(value) { return value>16 ? Math.min(12,Math.max(4,Math.round(value/8))) : value; }

function rebalanceRelationshipCatalog(catalog) {
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

function validateSavedEncounter(value) {
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

return {relationshipState,changeTrust,previewTrust,npcPosture,relationshipTier,recordRescue,scaledTrust,rebalanceRelationshipCatalog,validateSavedEncounter};
})();
  // END NPC RELATIONSHIP RULES
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // ../../tmp/after-zero-zombie/data/base/helpers.js
  var require_helpers = __commonJS({
    "../../tmp/after-zero-zombie/data/base/helpers.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory();
        else {
          root.ZombieData = root.ZombieData || {};
          root.ZombieData.Helpers = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        const fx = (path, value) => ({ type: "stat", path, value });
        const stat = (key, value) => fx(`stats.${key}`, value);
        const item = (key, value) => fx(`items.${key}`, value);
        const memory = (key, value) => fx(`memory.${key}`, value);
        return { fx, stat, item, memory };
      });
    }
  });

  // ../../tmp/after-zero-zombie/data/base/places.js
  var require_places = __commonJS({
    "../../tmp/after-zero-zombie/data/base/places.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_helpers());
        else {
          root.ZombieData = root.ZombieData || {};
          root.ZombieData.PLACES = factory(root.ZombieData.Helpers);
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(H) {
        "use strict";
        const { stat, item, memory } = H;
        const PLACES = {
          shelter: { name: "ห้องแถวเก่า ดินแดง–อนุสาวรีย์ฯ", short: "ห้องแถวดินแดง", tag: "SAFEHOUSE · BKK", description: "ห้องเช่าตึกแถวเก่าในเขตกักกันกรุงเทพฯ รูปถ่ายที่จำหน้าไม่ได้วางอยู่ข้างประตูเหล็กดัดที่ล็อกจากด้านใน", neighbors: ["streets"], color: "#adc977" },
          streets: { name: "ถนนพระราม 4 – แยกอโศก ใต้ราง BTS", short: "ถนนพระราม 4–อโศก", tag: "DEAD BANGKOK", description: "ใต้รางรถไฟฟ้า BTS ที่ไร้ขบวนรถ ไฟจราจรแยกอโศกยังกะพริบเตือนท่ามกลางซากรถเมล์และป้ายประกาศเตือนทิ้งระเบิดกรุงเทพฯ ใน 120 วัน", neighbors: ["shelter", "hospital", "nest", "radio"], color: "#b9dc7e" },
          hospital: { name: "โรงพยาบาลเขตกักกันพญาไท–ราชวิถี", short: "โรงพยาบาลเขตกักกัน", tag: "QUARANTINE LAB", description: "ศูนย์วิจัยและตึกฉุกเฉินเขตกักกันกรุงเทพฯ ที่เครื่องปั่นไฟสำรองยังทำงาน บางคนยังเชื่อว่าเซรุ่มคือทางรอดเดียวก่อนวันปูพรมทิ้งระเบิด", neighbors: ["streets", "radio"], color: "#7dcfc8" },
          nest: { name: "อุโมงค์รถไฟใต้ดิน MRT สามย่าน–คลองเตย", short: "อุโมงค์ MRT สามย่าน", tag: "MRT HIVE", description: "ชานชาลาใต้ดินลึกของกรุงเทพฯ ที่ไร้เสียงหัวใจ ฝูงผู้ติดเชื้อนับร้อยในอุโมงค์หันมามองเจ้าราวกับกำลังรอคำสั่ง", neighbors: ["streets"], color: "#c5a5da" },
          radio: { name: "หอส่งสัญญาณวิทยุ สะพานพระราม 8", short: "หอวิทยุสะพานพระราม 8", tag: "RAMA VIII SIGNAL", description: "หอส่งสัญญาณและด่านปิดตายริมแม่น้ำเจ้าพระยา เสียงประกาศนับถอยหลัง 120 วันของกองทัพและเสียงของผู้รอดชีวิตเดินทางผ่านสายไฟเส้นเดียวกัน", neighbors: ["streets", "hospital"], color: "#e9bd76" }
        };
        return PLACES;
      });
    }
  });

  // ../../tmp/after-zero-zombie/data/base/actions.js
  var require_actions = __commonJS({
    "../../tmp/after-zero-zombie/data/base/actions.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_helpers());
        else {
          root.ZombieData = root.ZombieData || {};
          root.ZombieData.ACTIONS = factory(root.ZombieData.Helpers);
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(H) {
        "use strict";
        const { stat, item, memory } = H;
        const ACTIONS = [
          { id: "scavenge", name: "\u0E04\u0E49\u0E19\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E01\u0E23\u0E30\u0E1B\u0E4B\u0E2D\u0E07\u0E43\u0E2B\u0E49\u0E04\u0E19\u0E40\u0E1B\u0E47\u0E19", glyph: "\u25A6", places: ["streets"], note: "อาหารกระป๋อง +3 (สำหรับคนเป็น) · รื้อซากเสี่ยงบาดเจ็บ · ร่างกายไม่รับอาหารมนุษย์ ความหิวจึงไม่ลดลง", effects: [item("supplies", 3), stat("hp", -4)], eventTag: "scavenge" },
          { id: "endure", name: "\u0E17\u0E19\u0E2B\u0E34\u0E27\u0E2D\u0E22\u0E39\u0E48\u0E15\u0E23\u0E07\u0E19\u0E35\u0E49\u0E2D\u0E35\u0E01\u0E27\u0E31\u0E19", glyph: "\u25C7", note: "\u0E44\u0E21\u0E48\u0E01\u0E34\u0E19\u0E2D\u0E30\u0E44\u0E23 \xB7 \u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E22\u0E31\u0E07\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E15\u0E32\u0E21\u0E1B\u0E01\u0E15\u0E34 \xB7 \u0E44\u0E21\u0E48\u0E21\u0E35\u0E43\u0E04\u0E23\u0E1A\u0E31\u0E07\u0E04\u0E31\u0E1A\u0E43\u0E2B\u0E49\u0E25\u0E48\u0E32", effects: [memory("endured", 1)], eventTag: "endure" },
          { id: "corpse", name: "\u0E15\u0E32\u0E21\u0E2B\u0E32\u0E28\u0E1E\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E19\u0E48\u0E32", glyph: "\u25A6", places: ["streets"], note: "\u0E1E\u0E1A\u0E23\u0E48\u0E32\u0E07\u0E43\u0E19\u0E23\u0E16\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25 \xB7 \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E40\u0E2D\u0E07\u0E27\u0E48\u0E32\u0E08\u0E30\u0E01\u0E34\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E14\u0E34\u0E19\u0E08\u0E32\u0E01\u0E21\u0E32", encounter: "ambulance" },
          { id: "blood", name: "\u0E40\u0E02\u0E49\u0E32\u0E44\u0E1B\u0E17\u0E35\u0E48\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E40\u0E25\u0E37\u0E2D\u0E14", glyph: "\u25B0", places: ["hospital"], note: "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E1B\u0E31\u0E48\u0E19\u0E44\u0E1F\u0E22\u0E31\u0E07\u0E17\u0E33\u0E07\u0E32\u0E19 \xB7 \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E27\u0E48\u0E32\u0E08\u0E30\u0E14\u0E37\u0E48\u0E21 \u0E41\u0E1A\u0E48\u0E07 \u0E2B\u0E23\u0E37\u0E2D\u0E17\u0E34\u0E49\u0E07\u0E44\u0E27\u0E49", encounter: "bloodbank" },
          { id: "rest", name: "\u0E1B\u0E30\u0E15\u0E34\u0E14\u0E1B\u0E30\u0E15\u0E48\u0E2D\u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22", glyph: "\u271A", places: ["shelter"], note: "\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E +26 \xB7 \u0E2A\u0E15\u0E34 +5", effects: [stat("hp", 26), stat("sanity", 5)], eventTag: "quiet" },
          { id: "remember", name: "\u0E21\u0E2D\u0E07\u0E23\u0E39\u0E1B\u0E16\u0E48\u0E32\u0E22\u0E43\u0E19\u0E01\u0E23\u0E30\u0E40\u0E1B\u0E4B\u0E32", glyph: "\u25A3", note: "\u0E2A\u0E15\u0E34 +24 \xB7 \u0E04\u0E27\u0E32\u0E21\u0E40\u0E1B\u0E47\u0E19\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C +3 \xB7 \u0E2B\u0E34\u0E27\u0E40\u0E1E\u0E34\u0E48\u0E21 4", effects: [stat("sanity", 24), stat("humanity", 3), stat("hunger", 4)], eventTag: "memory" },
          { id: "medicate", name: "\u0E43\u0E0A\u0E49\u0E0A\u0E38\u0E14\u0E40\u0E22\u0E47\u0E1A\u0E41\u0E1C\u0E25", glyph: "+", cost: { medicine: 1 }, note: "\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E +40", effects: [stat("hp", 40)], eventTag: "quiet" },
          { id: "labsearch", name: "\u0E04\u0E49\u0E19\u0E2B\u0E49\u0E2D\u0E07\u0E41\u0E25\u0E47\u0E1A\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E17\u0E34\u0E49\u0E07", glyph: "\u2311", places: ["hospital"], note: "\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07 +3 \xB7 \u0E0A\u0E38\u0E14\u0E40\u0E22\u0E47\u0E1A\u0E41\u0E1C\u0E25 +1 \xB7 \u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E -7", effects: [item("samples", 3), item("medicine", 1), stat("hp", -7), stat("research", 3)], eventTag: "lab" },
          { id: "research", name: "\u0E16\u0E2D\u0E14\u0E23\u0E2B\u0E31\u0E2A\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E40\u0E0B\u0E23\u0E38\u0E48\u0E21", glyph: "\u2261", places: ["hospital"], cost: { samples: 1 }, min: { sanity: 25 }, note: "\u0E07\u0E32\u0E19\u0E27\u0E34\u0E08\u0E31\u0E22 +20 \xB7 \u0E2A\u0E15\u0E34 -4", effects: [stat("research", 20), stat("sanity", -4)], eventTag: "lab" },
          { id: "share", name: "\u0E27\u0E32\u0E07\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E01\u0E23\u0E30\u0E1B\u0E4B\u0E2D\u0E07\u0E43\u0E2B\u0E49\u0E1C\u0E39\u0E49\u0E23\u0E2D\u0E14\u0E0A\u0E35\u0E27\u0E34\u0E15", glyph: "\u25C7", places: ["radio"], cost: { supplies: 1 }, min: { sanity: 25 }, note: "\u0E04\u0E27\u0E32\u0E21\u0E44\u0E27\u0E49\u0E43\u0E08 +18 \xB7 \u0E04\u0E27\u0E32\u0E21\u0E40\u0E1B\u0E47\u0E19\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C +10 \xB7 \u0E2A\u0E15\u0E34 +8", effects: [stat("trust", 18), stat("humanity", 10), stat("sanity", 8)], eventTag: "human" },
          { id: "hunt", name: "\u0E15\u0E32\u0E21\u0E01\u0E25\u0E34\u0E48\u0E19\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E02\u0E2D\u0E07\u0E04\u0E19\u0E40\u0E1B\u0E47\u0E19", glyph: "\u2573", places: ["streets"], note: "\u0E40\u0E02\u0E49\u0E32\u0E43\u0E01\u0E25\u0E49\u0E1C\u0E39\u0E49\u0E1A\u0E32\u0E14\u0E40\u0E08\u0E47\u0E1A \xB7 \u0E40\u0E08\u0E49\u0E32\u0E22\u0E31\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E01\u0E34\u0E19 \u0E0A\u0E48\u0E27\u0E22 \u0E2B\u0E23\u0E37\u0E2D\u0E16\u0E2D\u0E22\u0E44\u0E14\u0E49", encounter: "prey" },
          { id: "recruit", name: "\u0E2A\u0E2D\u0E19\u0E1D\u0E39\u0E07\u0E43\u0E2B\u0E49\u0E1F\u0E31\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E40\u0E08\u0E49\u0E32", glyph: "\u265C", places: ["nest"], min: { mutation: 15 }, note: "\u0E2D\u0E33\u0E19\u0E32\u0E08\u0E1D\u0E39\u0E07 +22 \xB7 \u0E01\u0E25\u0E32\u0E22\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C +5 \xB7 \u0E2A\u0E15\u0E34 -7", effects: [stat("horde", 22), stat("mutation", 5), stat("sanity", -7), stat("humanity", -3)], eventTag: "hive" },
          { id: "adapt", name: "\u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22\u0E40\u0E02\u0E35\u0E22\u0E19\u0E01\u0E0E\u0E43\u0E2B\u0E21\u0E48", glyph: "\u2318", places: ["nest"], cost: { samples: 1 }, note: "\u0E01\u0E25\u0E32\u0E22\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C +22 \xB7 \u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E -8 \xB7 \u0E2A\u0E15\u0E34 -6", effects: [stat("mutation", 22), stat("hp", -8), stat("sanity", -6)], eventTag: "hive" },
          { id: "raid", name: "\u0E1D\u0E48\u0E32\u0E14\u0E48\u0E32\u0E19\u0E17\u0E2B\u0E32\u0E23\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D", glyph: "!", places: ["streets"], note: "\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E01\u0E23\u0E30\u0E1B\u0E4B\u0E2D\u0E07 +2 \xB7 \u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07 +1 \xB7 \u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E -25 \xB7 \u0E2B\u0E34\u0E27\u0E40\u0E1E\u0E34\u0E48\u0E21 8", effects: [item("supplies", 2), item("samples", 1), stat("hp", -25), stat("hunger", 8), stat("mutation", 8)], eventTag: "hunt" },
          { id: "campaign", name: "\u0E2A\u0E48\u0E07\u0E1D\u0E39\u0E07\u0E2D\u0E2D\u0E01\u0E22\u0E36\u0E14\u0E40\u0E02\u0E15\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C", glyph: "\u2691", places: ["nest"], min: { horde: 45, mutation: 35 }, note: "\u0E02\u0E22\u0E32\u0E22\u0E01\u0E32\u0E23\u0E23\u0E30\u0E1A\u0E32\u0E14 1 \u0E23\u0E30\u0E22\u0E30 \xB7 \u0E2D\u0E33\u0E19\u0E32\u0E08\u0E1D\u0E39\u0E07 -8 \xB7 \u0E2A\u0E15\u0E34 -9", effects: [stat("campaign", 1), stat("horde", -8), stat("sanity", -9), stat("humanity", -15)], eventTag: "hive", maxCampaign: 2 },
          { id: "cure", name: "\u0E09\u0E35\u0E14\u0E40\u0E0B\u0E23\u0E38\u0E48\u0E21\u0E40\u0E02\u0E47\u0E21\u0E2A\u0E38\u0E14\u0E17\u0E49\u0E32\u0E22", glyph: "\u271A", places: ["hospital"], cost: { samples: 2 }, min: { research: 90, humanity: 55, sanity: 45, trust: 30 }, note: "\u0E1A\u0E17\u0E08\u0E1A: \u0E01\u0E25\u0E31\u0E1A\u0E40\u0E1B\u0E47\u0E19\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C \xB7 \u0E08\u0E1A\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E19\u0E35\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35", ending: "human" },
          { id: "crown", name: "\u0E02\u0E36\u0E49\u0E19\u0E04\u0E23\u0E2D\u0E07\u0E1A\u0E31\u0E25\u0E25\u0E31\u0E07\u0E01\u0E4C\u0E02\u0E2D\u0E07\u0E1D\u0E39\u0E07", glyph: "\u265C", places: ["nest"], min: { horde: 90, mutation: 45, sanity: 25 }, note: "\u0E1A\u0E17\u0E08\u0E1A: \u0E23\u0E32\u0E0A\u0E32\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49 \xB7 \u0E08\u0E1A\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E19\u0E35\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35", ending: "king" },
          { id: "evolve", name: "\u0E01\u0E49\u0E32\u0E27\u0E1E\u0E49\u0E19\u0E04\u0E33\u0E27\u0E48\u0E32\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E41\u0E25\u0E30\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49", glyph: "\u2318", places: ["nest"], cost: { samples: 2 }, min: { mutation: 85, research: 35, sanity: 30 }, note: "\u0E1A\u0E17\u0E08\u0E1A: \u0E2A\u0E32\u0E22\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C\u0E43\u0E2B\u0E21\u0E48 \xB7 \u0E08\u0E1A\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E19\u0E35\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35", ending: "evolved" },
          { id: "extinguish", name: "\u0E2A\u0E48\u0E07\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E2A\u0E38\u0E14\u0E17\u0E49\u0E32\u0E22\u0E44\u0E1B\u0E17\u0E31\u0E48\u0E27\u0E42\u0E25\u0E01", glyph: "\u2573", places: ["radio"], min: { horde: 110, mutation: 80, campaign: 2, sanity: 25 }, note: "\u0E1A\u0E17\u0E08\u0E1A: \u0E42\u0E25\u0E01\u0E44\u0E23\u0E49\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C \xB7 \u0E08\u0E1A\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E19\u0E35\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35", ending: "extinction" }
        ];
        return ACTIONS;
      });
    }
  });

  // ../../tmp/after-zero-zombie/data/base/events.js
  var require_events = __commonJS({
    "../../tmp/after-zero-zombie/data/base/events.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_helpers());
        else {
          root.ZombieData = root.ZombieData || {};
          root.ZombieData.EVENTS = factory(root.ZombieData.Helpers);
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(H) {
        "use strict";
        const { stat, item, memory } = H;
        const EVENTS = [
          { id: "ambulance", title: "\u0E04\u0E19\u0E02\u0E31\u0E1A\u0E23\u0E16\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E44\u0E21\u0E48\u0E2B\u0E32\u0E22\u0E43\u0E08\u0E41\u0E25\u0E49\u0E27", text: "ร่างยังไม่เน่า ไม่มีชีพจรเต้นอีกต่อไป แต่เขายังสวมป้ายชื่ออยู่ เจ้าจะกินหรือเดินจากไปก็ได้", choices: [
            { text: "\u0E01\u0E34\u0E19\u0E08\u0E32\u0E01\u0E28\u0E1E\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49\u0E23\u0E48\u0E32\u0E07\u0E40\u0E14\u0E34\u0E19\u0E15\u0E48\u0E2D\u0E44\u0E14\u0E49", note: "\u0E2B\u0E34\u0E27\u0E25\u0E14\u0E21\u0E32\u0E01 \xB7 \u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E06\u0E48\u0E32\u0E43\u0E04\u0E23 \xB7 \u0E40\u0E2A\u0E35\u0E48\u0E22\u0E07\u0E08\u0E32\u0E01\u0E1A\u0E32\u0E14\u0E41\u0E1C\u0E25\u0E41\u0E25\u0E30\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E2A\u0E30\u0E2D\u0E32\u0E14", effects: [stat("hunger", -40), stat("hp", -3), stat("mutation", 3), memory("corpseMeals", 1)] },
            { text: "\u0E1B\u0E34\u0E14\u0E15\u0E32\u0E43\u0E2B\u0E49\u0E40\u0E02\u0E32 \u0E41\u0E25\u0E49\u0E27\u0E40\u0E14\u0E34\u0E19\u0E08\u0E32\u0E01\u0E21\u0E32", note: "ยังหิว · ความเป็นมนุษย์ +3 · รักษาความตั้งใจของตนไว้", effects: [stat("humanity", 3), memory("endured", 1)] }
          ] },
          { id: "bloodbank", title: "\u0E44\u0E1F\u0E2A\u0E33\u0E23\u0E2D\u0E07\u0E22\u0E31\u0E07\u0E40\u0E25\u0E35\u0E49\u0E22\u0E07\u0E15\u0E39\u0E49\u0E40\u0E01\u0E47\u0E1A\u0E40\u0E25\u0E37\u0E2D\u0E14", text: "เลือดที่ยังใช้ได้เหลือจำกัด ในห้องข้าง ๆมีผู้รอดชีวิตที่ต้องใช้เลือดเช่นกัน เจ้าจะดื่ม แบ่งให้คนเจ็บ หรือเก็บหนึ่งถุงไว้ประทังชีวิตระหว่างทางก็ได้ แต่พกจากตู้นี้ได้ครั้งละหนึ่งถุง", choices: [
            { text: "\u0E14\u0E37\u0E48\u0E21\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E16\u0E38\u0E07", bloodCost: 1, note: "\u0E25\u0E14\u0E2B\u0E34\u0E27\u0E1E\u0E2D\u0E1B\u0E23\u0E30\u0E17\u0E31\u0E07 \xB7 \u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E06\u0E48\u0E32\u0E43\u0E04\u0E23 \xB7 \u0E40\u0E25\u0E37\u0E2D\u0E14\u0E43\u0E19\u0E15\u0E39\u0E49\u0E08\u0E30\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E19\u0E49\u0E2D\u0E22\u0E25\u0E07", effects: [stat("hunger", -30)] },
            { text: "\u0E2A\u0E48\u0E07\u0E16\u0E38\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E43\u0E2B\u0E49\u0E04\u0E19\u0E43\u0E19\u0E2B\u0E49\u0E2D\u0E07\u0E02\u0E49\u0E32\u0E07 \u0E46", bloodCost: 1, pressure: true, note: "\u0E22\u0E31\u0E07\u0E2B\u0E34\u0E27 \xB7 \u0E04\u0E19\u0E17\u0E35\u0E48\u0E0A\u0E48\u0E27\u0E22\u0E08\u0E33\u0E40\u0E08\u0E49\u0E32\u0E44\u0E14\u0E49 \xB7 \u0E2B\u0E34\u0E27\u0E08\u0E31\u0E14\u0E17\u0E33\u0E43\u0E2B\u0E49\u0E1D\u0E37\u0E19\u0E40\u0E02\u0E49\u0E32\u0E43\u0E01\u0E25\u0E49\u0E04\u0E19\u0E22\u0E32\u0E01\u0E02\u0E36\u0E49\u0E19", effects: [stat("trust", 12), stat("humanity", 6), memory("saved", 1)] },
            { text: "\u0E1B\u0E34\u0E14\u0E15\u0E39\u0E49\u0E44\u0E27\u0E49\u0E41\u0E25\u0E49\u0E27\u0E16\u0E2D\u0E22\u0E2D\u0E2D\u0E01\u0E21\u0E32", note: "\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E49\u0E40\u0E25\u0E37\u0E2D\u0E14 \xB7 \u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E01\u0E34\u0E19 \xB7 \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E17\u0E33\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E2D\u0E37\u0E48\u0E19\u0E15\u0E48\u0E2D\u0E44\u0E14\u0E49", effects: [memory("endured", 1)] },
            { text: "เก็บเลือดหนึ่งถุงไว้ใช้ระหว่างทาง", bloodCost: 1, carryBlood: true, note: "เลือดพกพา +1 · เลือดในตู้ -1 · ยังไม่ลดความหิว · พกจากตู้นี้ได้ครั้งละ 1 ถุง", effects: [] }
          ] },
          { id: "prey", title: "\u0E40\u0E02\u0E32\u0E22\u0E31\u0E07\u0E21\u0E35\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E2D\u0E22\u0E39\u0E48", text: "\u0E0A\u0E32\u0E22\u0E1A\u0E32\u0E14\u0E40\u0E08\u0E47\u0E1A\u0E15\u0E34\u0E14\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E23\u0E49\u0E32\u0E19\u0E02\u0E32\u0E22\u0E22\u0E32 \u0E40\u0E02\u0E32\u0E40\u0E2B\u0E47\u0E19\u0E40\u0E08\u0E49\u0E32\u0E41\u0E25\u0E49\u0E27\u0E1E\u0E22\u0E32\u0E22\u0E32\u0E21\u0E25\u0E32\u0E01\u0E15\u0E31\u0E27\u0E16\u0E2D\u0E22 \u0E01\u0E25\u0E34\u0E48\u0E19\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E1A\u0E2D\u0E01\u0E27\u0E48\u0E32\u0E40\u0E02\u0E32\u0E40\u0E1B\u0E47\u0E19\u0E2D\u0E32\u0E2B\u0E32\u0E23 \u0E41\u0E15\u0E48\u0E40\u0E02\u0E32\u0E01\u0E33\u0E25\u0E31\u0E07\u0E02\u0E2D\u0E43\u0E2B\u0E49\u0E0A\u0E48\u0E27\u0E22", choices: [
            { text: "\u0E06\u0E48\u0E32\u0E40\u0E02\u0E32\u0E41\u0E25\u0E49\u0E27\u0E01\u0E34\u0E19", note: "\u0E2D\u0E34\u0E48\u0E21\u0E21\u0E32\u0E01 \xB7 \u0E40\u0E2A\u0E35\u0E48\u0E22\u0E07\u0E15\u0E48\u0E2D\u0E2A\u0E39\u0E49\u0E1A\u0E32\u0E14\u0E40\u0E08\u0E47\u0E1A \xB7 \u0E04\u0E19\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01\u0E40\u0E02\u0E32\u0E2D\u0E32\u0E08\u0E08\u0E33\u0E40\u0E08\u0E49\u0E32\u0E44\u0E14\u0E49 \xB7 \u0E2A\u0E15\u0E34\u0E44\u0E21\u0E48\u0E25\u0E14\u0E40\u0E1E\u0E35\u0E22\u0E07\u0E40\u0E1E\u0E23\u0E32\u0E30\u0E01\u0E34\u0E19\u0E04\u0E19", effects: [stat("hunger", -52), stat("hp", -5), stat("mutation", 15), stat("humanity", -14), stat("trust", -8), memory("killed", 1)] },
            { text: "\u0E1E\u0E22\u0E38\u0E07\u0E40\u0E02\u0E32\u0E44\u0E1B\u0E22\u0E31\u0E07\u0E17\u0E35\u0E48\u0E17\u0E35\u0E48\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E08\u0E30\u0E1E\u0E1A", pressure: true, note: "\u0E22\u0E31\u0E07\u0E2B\u0E34\u0E27 \xB7 \u0E40\u0E2A\u0E35\u0E22\u0E41\u0E23\u0E07\u0E0A\u0E48\u0E27\u0E22 \xB7 \u0E16\u0E49\u0E32\u0E2B\u0E34\u0E27\u0E08\u0E31\u0E14\u0E15\u0E49\u0E2D\u0E07\u0E1D\u0E37\u0E19\u0E15\u0E31\u0E27\u0E40\u0E2D\u0E07\u0E21\u0E32\u0E01\u0E02\u0E36\u0E49\u0E19", effects: [stat("hp", -5), stat("trust", 12), stat("humanity", 8), memory("saved", 1)] },
            { text: "\u0E16\u0E2D\u0E22\u0E2D\u0E2D\u0E01\u0E21\u0E32\u0E01\u0E48\u0E2D\u0E19\u0E08\u0E30\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E43\u0E08", note: "\u0E22\u0E31\u0E07\u0E2B\u0E34\u0E27 \xB7 \u0E44\u0E21\u0E48\u0E17\u0E33\u0E23\u0E49\u0E32\u0E22\u0E40\u0E02\u0E32 \xB7 \u0E44\u0E21\u0E48\u0E21\u0E35\u0E01\u0E32\u0E23\u0E1A\u0E31\u0E07\u0E04\u0E31\u0E1A\u0E43\u0E2B\u0E49\u0E01\u0E34\u0E19", effects: [memory("endured", 1)] }
          ] },
          { id: "returned", title: "\u0E04\u0E19\u0E17\u0E35\u0E48\u0E40\u0E08\u0E49\u0E32\u0E40\u0E04\u0E22\u0E0A\u0E48\u0E27\u0E22\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32", followup: "saved", text: "คนที่เจ้าเคยช่วยปรากฏตัวในระยะที่มองเห็นกัน เขาวางชุดเย็บแผลไว้ให้แล้วถอยห่าง “ฉันจำได้ว่าเธอช่วยพวกเราไว้” เขาพูด ก่อนส่งสัญญาณให้เจ้ารับของได้อย่างปลอดภัย", choices: [
            { text: "\u0E23\u0E31\u0E1A\u0E02\u0E2D\u0E07\u0E41\u0E25\u0E30\u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E43\u0E2B\u0E49\u0E40\u0E02\u0E32\u0E01\u0E25\u0E31\u0E1A\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22", note: "\u0E0A\u0E38\u0E14\u0E40\u0E22\u0E47\u0E1A\u0E41\u0E1C\u0E25 +1 \xB7 \u0E04\u0E27\u0E32\u0E21\u0E44\u0E27\u0E49\u0E43\u0E08\u0E40\u0E1E\u0E34\u0E48\u0E21", effects: [item("medicine", 1), stat("trust", 8)] },
            { text: "รักษาระยะห่าง รอจนเขากลับไปแล้วค่อยไปเก็บของ", note: "\u0E22\u0E31\u0E07\u0E2B\u0E34\u0E27 \xB7 \u0E40\u0E02\u0E32\u0E27\u0E32\u0E07\u0E02\u0E2D\u0E07\u0E44\u0E27\u0E49\u0E41\u0E25\u0E49\u0E27\u0E01\u0E25\u0E31\u0E1A\u0E44\u0E1B", effects: [item("medicine", 1)] }
          ] },
          { id: "wanted", title: "\u0E0A\u0E37\u0E48\u0E2D\u0E02\u0E2D\u0E07\u0E04\u0E19\u0E17\u0E35\u0E48\u0E2B\u0E32\u0E22\u0E44\u0E1B", followup: "killed", text: "\u0E1B\u0E23\u0E30\u0E01\u0E32\u0E28\u0E15\u0E32\u0E21\u0E2B\u0E32\u0E04\u0E19\u0E17\u0E35\u0E48\u0E40\u0E08\u0E49\u0E32\u0E06\u0E48\u0E32\u0E16\u0E39\u0E01\u0E2A\u0E48\u0E07\u0E44\u0E1B\u0E17\u0E31\u0E48\u0E27\u0E04\u0E25\u0E37\u0E48\u0E19\u0E27\u0E34\u0E17\u0E22\u0E38 \u0E1E\u0E22\u0E32\u0E19\u0E1A\u0E2D\u0E01\u0E25\u0E31\u0E01\u0E29\u0E13\u0E30\u0E02\u0E2D\u0E07\u0E40\u0E08\u0E49\u0E32 \u0E15\u0E2D\u0E19\u0E19\u0E35\u0E49\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E23\u0E39\u0E49\u0E41\u0E25\u0E49\u0E27\u0E27\u0E48\u0E32\u0E04\u0E27\u0E23\u0E23\u0E30\u0E27\u0E31\u0E07\u0E43\u0E04\u0E23", choices: [
            { text: "\u0E08\u0E33\u0E0A\u0E37\u0E48\u0E2D\u0E40\u0E02\u0E32\u0E44\u0E27\u0E49 \u0E41\u0E25\u0E49\u0E27\u0E40\u0E14\u0E34\u0E19\u0E15\u0E48\u0E2D", note: "\u0E04\u0E27\u0E32\u0E21\u0E44\u0E27\u0E49\u0E43\u0E08\u0E25\u0E14 \xB7 \u0E2A\u0E34\u0E48\u0E07\u0E17\u0E35\u0E48\u0E17\u0E33\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27\u0E21\u0E35\u0E04\u0E19\u0E08\u0E33\u0E44\u0E14\u0E49", effects: [stat("trust", -12)] },
            { text: "\u0E40\u0E25\u0E35\u0E48\u0E22\u0E07\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E02\u0E2D\u0E07\u0E1C\u0E39\u0E49\u0E23\u0E2D\u0E14\u0E0A\u0E35\u0E27\u0E34\u0E15", note: "\u0E40\u0E2A\u0E35\u0E22\u0E41\u0E23\u0E07\u0E2D\u0E49\u0E2D\u0E21\u0E17\u0E32\u0E07 \xB7 \u0E04\u0E27\u0E32\u0E21\u0E44\u0E27\u0E49\u0E43\u0E08\u0E25\u0E14\u0E25\u0E07\u0E40\u0E25\u0E47\u0E01\u0E19\u0E49\u0E2D\u0E22", effects: [stat("hp", -5), stat("trust", -5)] }
          ] },
          { id: "awakening", title: "\u0E40\u0E08\u0E49\u0E32\u0E08\u0E33\u0E44\u0E14\u0E49\u0E27\u0E48\u0E32\u0E15\u0E19\u0E40\u0E2D\u0E07\u0E15\u0E32\u0E22\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27", kicker: "\u0E1B\u0E10\u0E21\u0E1A\u0E17", text: "\u0E15\u0E37\u0E48\u0E19\u0E02\u0E36\u0E49\u0E19\u0E43\u0E19\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E14\u0E34\u0E21 \u0E44\u0E21\u0E48\u0E21\u0E35\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E2B\u0E31\u0E27\u0E43\u0E08 \u0E21\u0E35\u0E40\u0E1E\u0E35\u0E22\u0E07\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27 \u0E41\u0E25\u0E30\u0E23\u0E39\u0E1B\u0E16\u0E48\u0E32\u0E22\u0E43\u0E19\u0E01\u0E23\u0E30\u0E40\u0E1B\u0E4B\u0E32 \u0E43\u0E1A\u0E2B\u0E19\u0E49\u0E32\u0E1A\u0E19\u0E20\u0E32\u0E1E\u0E14\u0E39\u0E04\u0E38\u0E49\u0E19\u0E40\u0E04\u0E22\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E48\u0E32\u0E01\u0E25\u0E31\u0E27", choices: [
            { text: "\u0E1E\u0E39\u0E14\u0E0A\u0E37\u0E48\u0E2D\u0E1A\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E23\u0E39\u0E1B \u0E41\u0E21\u0E49\u0E22\u0E31\u0E07\u0E08\u0E33\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E27\u0E48\u0E32\u0E40\u0E1B\u0E47\u0E19\u0E43\u0E04\u0E23", note: "\u0E2A\u0E15\u0E34 +8 \xB7 \u0E04\u0E27\u0E32\u0E21\u0E40\u0E1B\u0E47\u0E19\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C +5", effects: [stat("sanity", 8), stat("humanity", 5)] },
            { text: "\u0E1F\u0E31\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27 \u0E21\u0E31\u0E19\u0E2D\u0E32\u0E08\u0E23\u0E39\u0E49\u0E27\u0E34\u0E18\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E2D\u0E14", note: "กลายพันธุ์ +8 · ความเป็นมนุษย์ -5 · แค่ฟังความหิวไม่ได้ทำให้อิ่ม", effects: [stat("mutation", 8), stat("humanity", -5)] }
          ] },
          { id: "day7", day: 7, title: "\u0E21\u0E35\u0E04\u0E19\u0E15\u0E2D\u0E1A\u0E27\u0E34\u0E17\u0E22\u0E38\u0E02\u0E2D\u0E07\u0E40\u0E08\u0E49\u0E32", kicker: "\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E08\u0E32\u0E01\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C", text: "\u201C\u0E16\u0E49\u0E32\u0E22\u0E31\u0E07\u0E40\u0E02\u0E49\u0E32\u0E43\u0E08\u0E04\u0E33\u0E1E\u0E39\u0E14 \u0E0A\u0E48\u0E27\u0E22\u0E40\u0E04\u0E32\u0E30\u0E2A\u0E32\u0E21\u0E04\u0E23\u0E31\u0E49\u0E07\u201D \u0E40\u0E2A\u0E35\u0E22\u0E07\u0E08\u0E32\u0E01\u0E2B\u0E2D\u0E27\u0E34\u0E17\u0E22\u0E38\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E16\u0E32\u0E21\u0E27\u0E48\u0E32\u0E40\u0E08\u0E49\u0E32\u0E22\u0E31\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48 \u0E41\u0E15\u0E48\u0E16\u0E32\u0E21\u0E27\u0E48\u0E32\u0E40\u0E08\u0E49\u0E32\u0E22\u0E31\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E14\u0E49\u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E1B\u0E25\u0E48\u0E32", choices: [
            { text: "เคาะสามครั้ง เพื่อยืนยันว่าจะไม่ทำร้ายใคร", note: "\u0E04\u0E27\u0E32\u0E21\u0E44\u0E27\u0E49\u0E43\u0E08 +12 \xB7 \u0E2A\u0E15\u0E34 +8", effects: [stat("trust", 12), stat("sanity", 8)] },
            { text: "\u0E08\u0E14\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E40\u0E2D\u0E32\u0E44\u0E27\u0E49 \u0E1D\u0E39\u0E07\u0E2D\u0E32\u0E08\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E21\u0E31\u0E19", note: "\u0E2D\u0E33\u0E19\u0E32\u0E08\u0E1D\u0E39\u0E07 +12 \xB7 \u0E01\u0E25\u0E32\u0E22\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C +6", effects: [stat("horde", 12), stat("mutation", 6)] }
          ] },
          { id: "day14", day: 14, title: "\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E01\u0E27\u0E32\u0E14\u0E25\u0E49\u0E32\u0E07", kicker: "\u0E42\u0E25\u0E01\u0E40\u0E23\u0E34\u0E48\u0E22\u0E15\u0E2D\u0E1A\u0E42\u0E15\u0E49", text: "\u0E25\u0E33\u0E42\u0E1E\u0E07\u0E17\u0E2B\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E01\u0E32\u0E28\u0E43\u0E2B\u0E49\u0E1C\u0E39\u0E49\u0E23\u0E2D\u0E14\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E40\u0E21\u0E37\u0E2D\u0E07 \u0E01\u0E48\u0E2D\u0E19\u0E1B\u0E34\u0E14\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E16\u0E32\u0E27\u0E23 \u0E22\u0E31\u0E07\u0E21\u0E35\u0E2B\u0E49\u0E2D\u0E07\u0E41\u0E25\u0E47\u0E1A\u0E43\u0E15\u0E49\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25 \u0E41\u0E25\u0E30\u0E23\u0E31\u0E07\u0E43\u0E15\u0E49\u0E14\u0E34\u0E19\u0E17\u0E35\u0E48\u0E1E\u0E27\u0E01\u0E17\u0E2B\u0E32\u0E23\u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01", choices: [
            { text: "\u0E08\u0E33\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E2D\u0E1E\u0E22\u0E1E\u0E41\u0E25\u0E30\u0E0A\u0E48\u0E27\u0E22\u0E04\u0E19\u0E17\u0E35\u0E48\u0E2B\u0E25\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D", note: "ความเป็นมนุษย์ +8 · ความไว้ใจ +8 · สภาพร่าง -5", effects: [stat("humanity", 8), stat("trust", 8), stat("hp", -5)] },
            { text: "\u0E1E\u0E32\u0E1D\u0E39\u0E07\u0E2B\u0E25\u0E1A\u0E25\u0E07\u0E43\u0E15\u0E49\u0E14\u0E34\u0E19", note: "\u0E2D\u0E33\u0E19\u0E32\u0E08\u0E1D\u0E39\u0E07 +15 \xB7 \u0E2A\u0E15\u0E34 -5", effects: [stat("horde", 15), stat("sanity", -5)] }
          ] },
          { id: "day28", day: 28, title: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E17\u0E35\u0E48\u0E2A\u0E48\u0E07\u0E44\u0E27\u0E49\u0E01\u0E48\u0E2D\u0E19\u0E15\u0E32\u0E22", kicker: "\u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33\u0E04\u0E37\u0E19\u0E01\u0E25\u0E31\u0E1A", text: "\u0E43\u0E19\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E17\u0E35\u0E48\u0E41\u0E1A\u0E15\u0E40\u0E15\u0E2D\u0E23\u0E35\u0E48\u0E43\u0E01\u0E25\u0E49\u0E2B\u0E21\u0E14 \u0E40\u0E08\u0E49\u0E32\u0E1E\u0E1A\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E02\u0E2D\u0E07\u0E15\u0E31\u0E27\u0E40\u0E2D\u0E07 \u201C\u0E16\u0E49\u0E32\u0E09\u0E31\u0E19\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32 \u0E2D\u0E22\u0E48\u0E32\u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E43\u0E2B\u0E49\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E40\u0E1B\u0E47\u0E19\u0E04\u0E19\u0E15\u0E31\u0E14\u0E2A\u0E34\u0E19\u0E17\u0E38\u0E01\u0E2D\u0E22\u0E48\u0E32\u0E07\u201D \u0E43\u0E15\u0E49\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E21\u0E35\u0E23\u0E2B\u0E31\u0E2A\u0E15\u0E39\u0E49\u0E40\u0E01\u0E47\u0E1A\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07", choices: [
            { text: "\u0E43\u0E0A\u0E49\u0E23\u0E2B\u0E31\u0E2A\u0E19\u0E31\u0E49\u0E19\u0E15\u0E32\u0E21\u0E2B\u0E32\u0E04\u0E33\u0E15\u0E2D\u0E1A", note: "ตัวอย่างเชื้อ +2 · งานวิจัย +10 · สติ +10", effects: [item("samples", 2), stat("research", 10), stat("sanity", 10)] },
            { text: "\u0E25\u0E1A\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21 \u0E0A\u0E35\u0E27\u0E34\u0E15\u0E40\u0E01\u0E48\u0E32\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E01\u0E0E\u0E02\u0E2D\u0E07\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E19\u0E35\u0E49", note: "กลายพันธุ์ +18 · สติ +6 · ความเป็นมนุษย์ -8", effects: [stat("mutation", 18), stat("sanity", 6), stat("humanity", -8)] }
          ] },
          { id: "day45", day: 45, title: "\u0E01\u0E48\u0E2D\u0E19\u0E42\u0E25\u0E01\u0E08\u0E30\u0E40\u0E07\u0E35\u0E22\u0E1A", kicker: "เสียงจากเมืองเบาลง", text: "\u0E2A\u0E16\u0E32\u0E19\u0E35\u0E15\u0E48\u0E32\u0E07 \u0E46 \u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E07\u0E35\u0E22\u0E1A\u0E25\u0E07 \u0E40\u0E08\u0E49\u0E32\u0E23\u0E39\u0E49\u0E41\u0E25\u0E49\u0E27\u0E27\u0E48\u0E32\u0E21\u0E35\u0E17\u0E32\u0E07\u0E01\u0E25\u0E31\u0E1A \u0E21\u0E35\u0E1A\u0E31\u0E25\u0E25\u0E31\u0E07\u0E01\u0E4C \u0E41\u0E25\u0E30\u0E21\u0E35\u0E17\u0E32\u0E07\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E21\u0E35\u0E0A\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49\u0E40\u0E14\u0E34\u0E19 \u0E41\u0E15\u0E48\u0E40\u0E27\u0E25\u0E32\u0E17\u0E35\u0E48\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E01\u0E33\u0E25\u0E31\u0E07\u0E2A\u0E31\u0E49\u0E19\u0E25\u0E07", choices: [
            { text: "เลือกเส้นทางด้วยตนเองจนถึงที่สุด", note: "\u0E2A\u0E15\u0E34 +15 \xB7 \u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E01\u0E23\u0E30\u0E1B\u0E4B\u0E2D\u0E07 +1", effects: [stat("sanity", 15), item("supplies", 1)] },
            { text: "\u0E23\u0E27\u0E21\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E02\u0E2D\u0E07\u0E1D\u0E39\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E40\u0E14\u0E35\u0E22\u0E27", note: "\u0E2D\u0E33\u0E19\u0E32\u0E08\u0E1D\u0E39\u0E07 +20 \xB7 \u0E01\u0E25\u0E32\u0E22\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C +10", effects: [stat("horde", 20), stat("mutation", 10)] }
          ] },
          { id: "shop", tags: ["scavenge"], title: "\u0E01\u0E23\u0E30\u0E1B\u0E4B\u0E2D\u0E07\u0E2A\u0E38\u0E14\u0E17\u0E49\u0E32\u0E22\u0E1A\u0E19\u0E0A\u0E31\u0E49\u0E19", text: "มีมือเล็ก ๆ เอื้อมมาจากอีกฝั่งของชั้นวาง เด็กคนหนึ่งเห็นเจ้าแล้วตัวแข็งและกลั้นหายใจ", choices: [
            { text: "\u0E16\u0E2D\u0E22\u0E2D\u0E2D\u0E01\u0E21\u0E32\u0E41\u0E25\u0E30\u0E27\u0E32\u0E07\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E44\u0E27\u0E49\u0E43\u0E2B\u0E49", cost: { supplies: 1 }, note: "ใช้เสบียงมนุษย์ 1 · ความไว้ใจ +10 · ความเป็นมนุษย์ +8 · สติ +5", effects: [stat("trust", 10), stat("humanity", 8), stat("sanity", 5)] },
            { text: "หยิบกระป๋องนั้นมา แล้วเดินจากไปเงียบ ๆ", note: "อาหารกระป๋อง +1 · เอาไว้ให้คนเป็น (ไม่ลดความหิวของซอมบี้)", effects: [item("supplies", 1)] }
          ] },
          { id: "dog", tags: ["scavenge", "memory"], title: "\u0E21\u0E31\u0E19\u0E22\u0E31\u0E07\u0E08\u0E33\u0E01\u0E25\u0E34\u0E48\u0E19\u0E40\u0E08\u0E49\u0E32\u0E44\u0E14\u0E49", text: "\u0E2A\u0E38\u0E19\u0E31\u0E02\u0E15\u0E31\u0E27\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E40\u0E14\u0E34\u0E19\u0E15\u0E32\u0E21\u0E21\u0E32 \u0E21\u0E31\u0E19\u0E04\u0E27\u0E23\u0E2B\u0E19\u0E35 \u0E41\u0E15\u0E48\u0E01\u0E25\u0E31\u0E1A\u0E27\u0E32\u0E07\u0E2B\u0E31\u0E27\u0E25\u0E07\u0E1A\u0E19\u0E23\u0E2D\u0E07\u0E40\u0E17\u0E49\u0E32\u0E17\u0E35\u0E48\u0E02\u0E32\u0E14\u0E02\u0E2D\u0E07\u0E40\u0E08\u0E49\u0E32", choices: [
            { text: "\u0E19\u0E31\u0E48\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E14\u0E49\u0E27\u0E22\u0E01\u0E31\u0E19\u0E2A\u0E31\u0E01\u0E1E\u0E31\u0E01", note: "สติ +10 · ความเป็นมนุษย์ +4", effects: [stat("sanity", 10), stat("humanity", 4)] },
            { text: "ก้าวถอยออกมาก่อนที่มันจะผูกพันไปมากกว่านี้", note: "\u0E40\u0E08\u0E49\u0E32\u0E08\u0E32\u0E01\u0E21\u0E32\u0E42\u0E14\u0E22\u0E44\u0E21\u0E48\u0E17\u0E33\u0E23\u0E49\u0E32\u0E22\u0E21\u0E31\u0E19 \xB7 \u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E44\u0E21\u0E48\u0E25\u0E14", effects: [] }
          ] },
          { id: "cache", tags: ["scavenge", "quiet"], title: "กล่องพยาบาลในซากปรักหักพัง", text: "ระหว่างค้นซากปรักหักพัง เจ้าพบกล่องพยาบาลอีกใบติดอยู่ใต้แผ่นคอนกรีต เครื่องหมายกาชาดบนฝามีฝุ่นจับ ของข้างในอาจยังใช้ได้ แต่ต้องยกแผ่นคอนกรีตขึ้นจึงจะดึงกล่องออกมาได้", choices: [
            { text: "\u0E43\u0E0A\u0E49\u0E41\u0E02\u0E19\u0E23\u0E31\u0E1A\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E41\u0E25\u0E49\u0E27\u0E22\u0E01\u0E01\u0E25\u0E48\u0E2D\u0E07\u0E2D\u0E2D\u0E01", note: "ชุดเย็บแผล +1 · สภาพร่าง -5", effects: [item("medicine", 1), stat("hp", -5)] },
            { text: "\u0E08\u0E14\u0E08\u0E33\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E44\u0E27\u0E49 \u0E41\u0E25\u0E49\u0E27\u0E44\u0E21\u0E48\u0E1D\u0E37\u0E19\u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22", note: "\u0E2A\u0E15\u0E34 +3", effects: [stat("sanity", 3)] }
          ] },
          { id: "mirror", tags: ["quiet", "memory"], title: "\u0E04\u0E19\u0E43\u0E19\u0E01\u0E23\u0E30\u0E08\u0E01\u0E02\u0E22\u0E31\u0E1A\u0E0A\u0E49\u0E32\u0E01\u0E27\u0E48\u0E32\u0E40\u0E08\u0E49\u0E32", text: "\u0E40\u0E08\u0E49\u0E32\u0E25\u0E2D\u0E07\u0E22\u0E34\u0E49\u0E21 \u0E20\u0E32\u0E1E\u0E2A\u0E30\u0E17\u0E49\u0E2D\u0E19\u0E40\u0E2B\u0E21\u0E37\u0E2D\u0E19\u0E01\u0E33\u0E25\u0E31\u0E07\u0E23\u0E2D\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07 \u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33\u0E40\u0E25\u0E47\u0E01\u0E19\u0E49\u0E2D\u0E22\u0E1C\u0E38\u0E14\u0E02\u0E36\u0E49\u0E19\u0E21\u0E32 \u0E40\u0E1B\u0E47\u0E19\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E22\u0E34\u0E49\u0E21\u0E42\u0E14\u0E22\u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E04\u0E34\u0E14", choices: [
            { text: "\u0E08\u0E33\u0E27\u0E31\u0E19\u0E19\u0E31\u0E49\u0E19\u0E43\u0E2B\u0E49\u0E19\u0E32\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E38\u0E14", note: "สติ +8 · ความเป็นมนุษย์ +3", effects: [stat("sanity", 8), stat("humanity", 3)] },
            { text: "\u0E1D\u0E36\u0E01\u0E43\u0E2B\u0E49\u0E23\u0E48\u0E32\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E19\u0E35\u0E49\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E1F\u0E31\u0E07", note: "\u0E01\u0E25\u0E32\u0E22\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C +5", effects: [stat("mutation", 5)] }
          ] },
          { id: "doctor", tags: ["lab"], title: "\u0E41\u0E1E\u0E17\u0E22\u0E4C\u0E2B\u0E25\u0E31\u0E07\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E01\u0E23\u0E30\u0E08\u0E01", text: "\u0E40\u0E18\u0E2D\u0E22\u0E31\u0E07\u0E21\u0E35\u0E0A\u0E35\u0E27\u0E34\u0E15 \u0E41\u0E25\u0E30\u0E44\u0E21\u0E48\u0E40\u0E25\u0E47\u0E07\u0E2D\u0E32\u0E27\u0E38\u0E18 \u201C\u0E16\u0E49\u0E32\u0E40\u0E02\u0E49\u0E32\u0E43\u0E08\u0E09\u0E31\u0E19 \u0E27\u0E32\u0E07\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E44\u0E27\u0E49\u0E15\u0E23\u0E07\u0E0A\u0E48\u0E2D\u0E07\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07\u201D", choices: [
            { text: "\u0E2A\u0E48\u0E07\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E43\u0E2B\u0E49\u0E41\u0E25\u0E30\u0E1F\u0E31\u0E07\u0E04\u0E33\u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22", cost: { samples: 1 }, min: { sanity: 25 }, note: "ใช้ตัวอย่างเชื้อ 1 · งานวิจัย +12 · ความไว้ใจ +6", effects: [stat("research", 12), stat("trust", 6)] },
            { text: "พยักหน้ารับฟัง โดยยังไม่ส่งมอบสิ่งใด", note: "\u0E2A\u0E15\u0E34 +5 \xB7 \u0E07\u0E32\u0E19\u0E27\u0E34\u0E08\u0E31\u0E22 +3", effects: [stat("sanity", 5), stat("research", 3)] }
          ] },
          { id: "culture", tags: ["lab"], title: "\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E40\u0E23\u0E37\u0E2D\u0E07\u0E41\u0E2A\u0E07", text: "\u0E41\u0E2A\u0E07\u0E2A\u0E35\u0E40\u0E02\u0E35\u0E22\u0E27\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E2B\u0E27\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E20\u0E32\u0E0A\u0E19\u0E30 \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E32\u0E07 \u0E46 \u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E02\u0E35\u0E22\u0E19\u0E27\u0E48\u0E32\u0E22\u0E32\u0E23\u0E31\u0E01\u0E29\u0E32 \u0E41\u0E15\u0E48\u0E40\u0E02\u0E35\u0E22\u0E19\u0E27\u0E48\u0E32 \u201C\u0E17\u0E32\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u201D", choices: [
            { text: "\u0E40\u0E01\u0E47\u0E1A\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E28\u0E36\u0E01\u0E29\u0E32\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E23\u0E30\u0E21\u0E31\u0E14\u0E23\u0E30\u0E27\u0E31\u0E07", note: "ตัวอย่างเชื้อ +1 · งานวิจัย +5", effects: [item("samples", 1), stat("research", 5)] },
            { text: "\u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E43\u0E2B\u0E49\u0E21\u0E31\u0E19\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22", note: "กลายพันธุ์ +12 · สภาพร่าง -7", effects: [stat("mutation", 12), stat("hp", -7)] }
          ] },
          { id: "name", tags: ["human"], title: "\u0E40\u0E18\u0E2D\u0E40\u0E23\u0E35\u0E22\u0E01\u0E40\u0E08\u0E49\u0E32\u0E27\u0E48\u0E32\u0E04\u0E19", text: "\u0E04\u0E23\u0E31\u0E49\u0E07\u0E41\u0E23\u0E01\u0E43\u0E19\u0E2B\u0E25\u0E32\u0E22\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E21\u0E35\u0E43\u0E04\u0E23\u0E43\u0E0A\u0E49\u0E04\u0E33\u0E27\u0E48\u0E32 \u201C\u0E21\u0E31\u0E19\u201D \u0E40\u0E14\u0E47\u0E01\u0E2A\u0E32\u0E27\u0E16\u0E32\u0E21\u0E27\u0E48\u0E32\u0E2D\u0E22\u0E32\u0E01\u0E43\u0E2B\u0E49\u0E40\u0E23\u0E35\u0E22\u0E01\u0E0A\u0E37\u0E48\u0E2D\u0E2D\u0E30\u0E44\u0E23", choices: [
            { text: "\u0E1A\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E08\u0E33\u0E44\u0E14\u0E49", min: { sanity: 25 }, note: "ต้องมีสติอย่างน้อย 25 · ความไว้ใจ +10 · สติ +8", effects: [stat("trust", 10), stat("sanity", 8)] },
            { text: "\u0E0A\u0E35\u0E49\u0E44\u0E1B\u0E17\u0E35\u0E48\u0E23\u0E39\u0E1B\u0E16\u0E48\u0E32\u0E22\u0E42\u0E14\u0E22\u0E44\u0E21\u0E48\u0E1E\u0E39\u0E14", note: "\u0E04\u0E27\u0E32\u0E21\u0E40\u0E1B\u0E47\u0E19\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C +5 \xB7 \u0E2A\u0E15\u0E34 +4", effects: [stat("humanity", 5), stat("sanity", 4)] }
          ] },
          { id: "kneel", tags: ["hive"], title: "\u0E1D\u0E39\u0E07\u0E15\u0E31\u0E27\u0E41\u0E23\u0E01\u0E04\u0E38\u0E01\u0E40\u0E02\u0E48\u0E32\u0E25\u0E07", text: "เสียงคำรามของเจ้าทำให้ฝูงคนตายเงียบสงัดทั้งสถานี มีบางอย่างในร่างกายตอบรับการเชื่อมต่อนี้", choices: [
            { text: "\u0E43\u0E2B\u0E49\u0E1E\u0E27\u0E01\u0E21\u0E31\u0E19\u0E08\u0E33\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E02\u0E2D\u0E07\u0E40\u0E08\u0E49\u0E32", note: "\u0E2D\u0E33\u0E19\u0E32\u0E08\u0E1D\u0E39\u0E07 +10 \xB7 \u0E01\u0E25\u0E32\u0E22\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C +5 \xB7 \u0E2A\u0E15\u0E34 -3", effects: [stat("horde", 10), stat("mutation", 5), stat("sanity", -3)] },
            { text: "ผละจากมา ปล่อยให้พวกมันอยู่ตามลำพัง", note: "\u0E2A\u0E15\u0E34 +7", effects: [stat("sanity", 7)] }
          ] },
          { id: "pulse", tags: ["hunt", "hive"], title: "\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E2B\u0E31\u0E27\u0E43\u0E08\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D", text: "\u0E2A\u0E31\u0E0D\u0E0A\u0E32\u0E15\u0E0D\u0E32\u0E13\u0E1A\u0E2D\u0E01\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E40\u0E2B\u0E22\u0E37\u0E48\u0E2D\u0E01\u0E48\u0E2D\u0E19\u0E17\u0E35\u0E48\u0E15\u0E32\u0E08\u0E30\u0E21\u0E2D\u0E07\u0E40\u0E2B\u0E47\u0E19 \u0E40\u0E08\u0E49\u0E32\u0E2D\u0E32\u0E08\u0E1D\u0E36\u0E01\u0E1B\u0E23\u0E30\u0E2A\u0E32\u0E17\u0E2A\u0E31\u0E21\u0E1C\u0E31\u0E2A\u0E19\u0E35\u0E49 \u0E2B\u0E23\u0E37\u0E2D\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E21\u0E31\u0E19", choices: [
            { text: "\u0E08\u0E33\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E30\u0E02\u0E2D\u0E07\u0E17\u0E38\u0E01\u0E2B\u0E31\u0E27\u0E43\u0E08", note: "กลายพันธุ์ +8 · อำนาจฝูง +5 · ความเป็นมนุษย์ -5", effects: [stat("mutation", 8), stat("horde", 5), stat("humanity", -5)] },
            { text: "\u0E16\u0E2D\u0E22\u0E2D\u0E2D\u0E01\u0E21\u0E32\u0E08\u0E19\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E40\u0E07\u0E35\u0E22\u0E1A", note: "สติ +6 · ความหิว +5", effects: [stat("sanity", 6), stat("hunger", 5)] }
          ] }
        ];
        return EVENTS;
      });
    }
  });

  // ../../tmp/after-zero-zombie/data/base/endings.js
  var require_endings = __commonJS({
    "../../tmp/after-zero-zombie/data/base/endings.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_helpers());
        else {
          root.ZombieData = root.ZombieData || {};
          root.ZombieData.ENDINGS = factory(root.ZombieData.Helpers);
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(H) {
        "use strict";
        const { stat, item, memory } = H;
        const ENDINGS = {
          death: { title: "\u0E15\u0E32\u0E22\u0E40\u0E1B\u0E47\u0E19\u0E04\u0E23\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48\u0E2A\u0E2D\u0E07", tag: "SECOND DEATH", color: "#ef8e7a", text: "\u0E04\u0E23\u0E31\u0E49\u0E07\u0E41\u0E23\u0E01\u0E40\u0E08\u0E49\u0E32\u0E40\u0E2A\u0E35\u0E22\u0E2B\u0E31\u0E27\u0E43\u0E08 \u0E04\u0E23\u0E31\u0E49\u0E07\u0E19\u0E35\u0E49\u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22\u0E22\u0E2D\u0E21\u0E41\u0E1E\u0E49\u0E40\u0E2A\u0E35\u0E22\u0E01\u0E48\u0E2D\u0E19 \u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E23\u0E32\u0E27\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E08\u0E33\u0E44\u0E14\u0E49\u0E14\u0E31\u0E1A\u0E25\u0E07\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E14\u0E27\u0E07\u0E15\u0E32\u0E04\u0E39\u0E48\u0E19\u0E31\u0E49\u0E19" },
          feral: { title: "\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E40\u0E1E\u0E35\u0E22\u0E07\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27", tag: "THE HOLLOW", color: "#db9b68", text: "เมื่อสติสัมปชัญญะสุดท้ายหลุดลอย รูปถ่ายกลายเป็นเพียงกระดาษ เสียงเรียกชื่อกลายเป็นเพียงเสียงรบกวน ร่างนี้ยังก้าวเดินต่อ แต่ตัวตนของเจ้าไม่ได้อยู่ในนั้นแล้ว" },
          madness: { title: "\u0E2A\u0E15\u0E34\u0E16\u0E39\u0E01\u0E01\u0E25\u0E37\u0E19\u0E01\u0E34\u0E19 \xB7 \u0E01\u0E25\u0E32\u0E22\u0E40\u0E1B\u0E47\u0E19\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E44\u0E23\u0E49\u0E2A\u0E15\u0E34", tag: "THE HOLLOW", color: "#db9b68", text: "\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E2A\u0E15\u0E34\u0E2A\u0E31\u0E21\u0E1B\u0E0A\u0E31\u0E0D\u0E0D\u0E30\u0E2A\u0E38\u0E14\u0E17\u0E49\u0E32\u0E22\u0E14\u0E31\u0E1A\u0E27\u0E39\u0E1A\u0E25\u0E07 \u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33\u0E41\u0E25\u0E30\u0E0A\u0E37\u0E48\u0E2D\u0E17\u0E35\u0E48\u0E40\u0E04\u0E22\u0E1E\u0E22\u0E32\u0E22\u0E32\u0E21\u0E22\u0E36\u0E14\u0E40\u0E2B\u0E19\u0E35\u0E48\u0E22\u0E27\u0E01\u0E47\u0E40\u0E25\u0E37\u0E2D\u0E19\u0E2B\u0E32\u0E22\u0E44\u0E1B \u0E23\u0E48\u0E32\u0E07\u0E19\u0E35\u0E49\u0E22\u0E31\u0E07\u0E04\u0E07\u0E40\u0E14\u0E34\u0E19\u0E15\u0E48\u0E2D\u0E44\u0E1B\u0E43\u0E19\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E43\u0E19\u0E10\u0E32\u0E19\u0E30\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E44\u0E23\u0E49\u0E2A\u0E15\u0E34\u0E17\u0E35\u0E48\u0E02\u0E31\u0E1A\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E14\u0E49\u0E27\u0E22\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19" },
          king: { title: "\u0E23\u0E32\u0E0A\u0E32\u0E41\u0E2B\u0E48\u0E07\u0E1C\u0E39\u0E49\u0E44\u0E23\u0E49\u0E0A\u0E35\u0E1E\u0E08\u0E23", tag: "DEAD SOVEREIGN", color: "#c6abef", text: "\u0E1D\u0E39\u0E07\u0E19\u0E31\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E49\u0E27\u0E19\u0E2A\u0E07\u0E1A\u0E25\u0E07\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E40\u0E08\u0E49\u0E32\u0E22\u0E01\u0E21\u0E37\u0E2D \u0E1A\u0E31\u0E25\u0E25\u0E31\u0E07\u0E01\u0E4C\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E08\u0E32\u0E01\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E40\u0E01\u0E48\u0E32 \u0E41\u0E25\u0E30\u0E01\u0E0E\u0E02\u0E49\u0E2D\u0E41\u0E23\u0E01\u0E02\u0E2D\u0E07\u0E2D\u0E32\u0E13\u0E32\u0E08\u0E31\u0E01\u0E23\u0E43\u0E2B\u0E21\u0E48\u0E08\u0E30\u0E40\u0E02\u0E35\u0E22\u0E19\u0E14\u0E49\u0E27\u0E22\u0E2A\u0E15\u0E34\u0E17\u0E35\u0E48\u0E40\u0E08\u0E49\u0E32\u0E22\u0E31\u0E07\u0E23\u0E31\u0E01\u0E29\u0E32\u0E44\u0E27\u0E49" },
          evolved: { title: "\u0E2A\u0E34\u0E48\u0E07\u0E21\u0E35\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E25\u0E33\u0E14\u0E31\u0E1A\u0E16\u0E31\u0E14\u0E44\u0E1B", tag: "SPECIES ZERO", color: "#aee27f", text: "\u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22\u0E40\u0E25\u0E34\u0E01\u0E40\u0E25\u0E35\u0E22\u0E19\u0E41\u0E1A\u0E1A\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C \u0E41\u0E25\u0E30\u0E40\u0E25\u0E34\u0E01\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E1F\u0E31\u0E07\u0E04\u0E27\u0E32\u0E21\u0E15\u0E32\u0E22 \u0E40\u0E08\u0E49\u0E32\u0E25\u0E37\u0E21\u0E15\u0E32\u0E02\u0E36\u0E49\u0E19\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2A\u0E31\u0E21\u0E1C\u0E31\u0E2A\u0E43\u0E2B\u0E21\u0E48 \u0E44\u0E21\u0E48\u0E21\u0E35\u0E0A\u0E37\u0E48\u0E2D\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E2A\u0E32\u0E22\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C\u0E19\u0E35\u0E49 \u0E08\u0E19\u0E01\u0E27\u0E48\u0E32\u0E40\u0E08\u0E49\u0E32\u0E08\u0E30\u0E15\u0E31\u0E49\u0E07\u0E43\u0E2B\u0E49\u0E21\u0E31\u0E19" },
          human: { title: "\u0E2B\u0E31\u0E27\u0E43\u0E08\u0E40\u0E15\u0E49\u0E19\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07", tag: "HUMAN, AGAIN", color: "#7bd7cf", text: "\u0E04\u0E27\u0E32\u0E21\u0E40\u0E08\u0E47\u0E1A\u0E1B\u0E27\u0E14\u0E04\u0E23\u0E31\u0E49\u0E07\u0E41\u0E23\u0E01\u0E2B\u0E25\u0E31\u0E07\u0E40\u0E0B\u0E23\u0E38\u0E48\u0E21\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E41\u0E1C\u0E25 \u0E41\u0E15\u0E48\u0E40\u0E1B\u0E47\u0E19\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E30\u0E40\u0E15\u0E49\u0E19\u0E43\u0E19\u0E2D\u0E01 \u0E04\u0E19\u0E17\u0E35\u0E48\u0E40\u0E08\u0E49\u0E32\u0E40\u0E04\u0E22\u0E0A\u0E48\u0E27\u0E22\u0E04\u0E2D\u0E22\u0E08\u0E31\u0E1A\u0E21\u0E37\u0E2D\u0E44\u0E27\u0E49 \u0E02\u0E13\u0E30\u0E17\u0E35\u0E48\u0E40\u0E08\u0E49\u0E32\u0E08\u0E33\u0E0A\u0E37\u0E48\u0E2D\u0E15\u0E19\u0E40\u0E2D\u0E07\u0E44\u0E14\u0E49\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07" },
          extinction: { title: "\u0E42\u0E25\u0E01\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E21\u0E35\u0E43\u0E04\u0E23\u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A", tag: "THE LAST SIGNAL", color: "#f18e73", text: "\u0E40\u0E21\u0E37\u0E2D\u0E07 \u0E15\u0E32\u0E21\u0E14\u0E49\u0E27\u0E22\u0E20\u0E39\u0E21\u0E34\u0E20\u0E32\u0E04 \u0E41\u0E25\u0E30\u0E40\u0E04\u0E23\u0E37\u0E2D\u0E02\u0E48\u0E32\u0E22\u0E17\u0E31\u0E48\u0E27\u0E42\u0E25\u0E01\u0E14\u0E31\u0E1A\u0E25\u0E07\u0E17\u0E35\u0E25\u0E30\u0E41\u0E2B\u0E48\u0E07 \u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E02\u0E2D\u0E07\u0E40\u0E08\u0E49\u0E32\u0E21\u0E35\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E17\u0E38\u0E01\u0E17\u0E35\u0E48 \u0E41\u0E15\u0E48\u0E44\u0E21\u0E48\u0E21\u0E35\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E2D\u0E35\u0E01\u0E40\u0E25\u0E22 \u0E40\u0E08\u0E49\u0E32\u0E0A\u0E19\u0E30 \u0E41\u0E25\u0E30\u0E44\u0E21\u0E48\u0E21\u0E35\u0E43\u0E04\u0E23\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E43\u0E2B\u0E49\u0E1A\u0E2D\u0E01\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E19\u0E35\u0E49" },
          survivor: { title: "เปลวเพลิงลบล้างเขตกักกันกรุงเทพฯ · ครบกำหนด 120 วัน", tag: "BANGKOK FIREBOMBED", color: "#f87171", text: "ครบ 120 วันหลังปิดตายกรุงเทพมหานคร เสียงไซเรนเตือนภัยทางอากาศดังกึกก้องก่อนฝูงบินทิ้งระเบิดปูพรมจะโปรยเพลิงสังหารลงมาทั่วเขตกักกัน การเลือกประคองตัวอยู่ในเมืองไปวันๆ โดยไม่หาทางออกหรือตัดสินใจเปลี่ยนชะตา ทำให้ร่างของเจ้ามอดไหม้เป็นเถ้าถ่านไปพร้อมกับกรุงเทพฯ" },
          bombed: { title: "เปลวเพลิงลบล้างเขตกักกันกรุงเทพฯ · ครบกำหนด 120 วัน", tag: "BANGKOK FIREBOMBED", color: "#f87171", text: "ครบ 120 วันหลังปิดตายกรุงเทพมหานคร ฝูงบินทิ้งระเบิดปูพรมโปรยเพลิงสังหารลงมาทั่วเขตกักกันเพื่อกวาดล้างเชื้อให้สิ้นซาก การติดอยู่ในเมืองจนหมดเวลาทำให้ร่างของเจ้ามอดไหม้ไปพร้อมกับซากตึกของกรุงเทพฯ" },
          silent_guardian: { title: "ผู้เฝ้าประตูเงียบงันแห่งเขตกักกันกรุงเทพฯ", tag: "SILENT GUARDIAN", color: "#34d399", text: "เมื่อฝูงผู้ติดเชื้อคลั่งทะลักเข้าประชิดแนวป้องกัน เจ้าพาผู้รอดชีวิตในพื้นที่ลงสู่ห้องนิรภัยใต้ดินลึก แล้วดึงสลักประตูเหล็กปิดตายจากด้านนอก ใช้ร่างของตนยืนขวางหน้าประตูไว้จนวาระสุดท้าย ผู้คนที่อยู่หลังบานประตูนั้นรอดพ้นวิกฤตและจดจำเจ้าในฐานะผู้พิทักษ์เงียบงัน" },
          escape_companion: { title: "ออกเดินทางพ้นเขตกักกันกรุงเทพฯ", tag: "BEYOND BANGKOK", color: "#38bdf8", text: "ก่อนเส้นตาย 120 วัน เจ้าและผู้รอดชีวิตที่ไว้ใจเจ้าอย่างที่สุดลัดเลาะผ่านช่องทางระบายน้ำออกสู่แม่น้ำเจ้าพระยา ล่องเรือพ้นแนวปิดล้อมของเขตกักกันกรุงเทพฯ แม้หัวใจของเจ้าจะไม่เต้นอีกแล้ว แต่บนเส้นทางสายใหม่นอกเมืองยังมีคนเป็นคนหนึ่งที่คอยเรียกชื่อเจ้าอยู่ข้างกาย" },
          horde_breakout: { title: "นำฝูงตีฝ่าวงล้อมด่านกรุงเทพฯ", tag: "HORDE BREAKOUT", color: "#c084fc", text: "เจ้าส่งสัญญาณนำฝูงผู้ติดเชื้อที่ฝึกไว้เคลื่อนผ่านตรอกและจุดคอขวดเลียบคลองแสนแสบ เสียงสะท้อนริมน้ำไม่ทำให้แถวแตกกระจายอีกต่อไป พวกเจ้าพุ่งฝ่าแนวปิดล้อมปลายทางออกไปพ้นเขตกักกันกรุงเทพฯ ก่อนการกวาดล้างจะมาถึง" },
          conscious_exile: { title: "ล่องเรือพ้นแม่น้ำเจ้าพระยาก่อนฟ้าสาง", tag: "CHAO PHRAYA EXILE", color: "#2dd4bf", text: "ตลอดเวลาในเขตกักกัน เจ้าประคองสติและความเห็นใจไว้ได้โดยไม่เคยคร่าชีวิตคนเป็น เมื่อพบเรือไม้ซ่อนอยู่ริมประตูระบายน้ำเก่า เจ้าจึงปลดเชือกปล่อยให้กระแสน้ำพัดเรือลอดแนวสะพานออกสู่แม่น้ำเจ้าพระยาก่อนฟ้าสาง มุ่งหน้าไปพ้นเขตกักกันพร้อมสติที่ยังเป็นของตัวเอง" }
        };
        return ENDINGS;
      });
    }
  });

  // ../../tmp/after-zero-zombie/data/base/meta.js
  var require_meta = __commonJS({
    "../../tmp/after-zero-zombie/data/base/meta.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory();
        else {
          root.ZombieData = root.ZombieData || {};
          root.ZombieData.Meta = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        const ROUTES = {
          human: { name: "\u0E01\u0E25\u0E31\u0E1A\u0E40\u0E1B\u0E47\u0E19\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C", subtitle: "\u0E22\u0E31\u0E07\u0E21\u0E35\u0E43\u0E04\u0E23\u0E1A\u0E32\u0E07\u0E04\u0E19\u0E23\u0E2D\u0E2D\u0E22\u0E39\u0E48", action: "cure" },
          king: { name: "\u0E04\u0E23\u0E2D\u0E07\u0E1D\u0E39\u0E07", subtitle: "\u0E43\u0E2B\u0E49\u0E04\u0E19\u0E15\u0E32\u0E22\u0E21\u0E35\u0E23\u0E32\u0E0A\u0E32", action: "crown" },
          evolved: { name: "\u0E2A\u0E32\u0E22\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C\u0E43\u0E2B\u0E21\u0E48", subtitle: "\u0E40\u0E02\u0E35\u0E22\u0E19\u0E01\u0E0E\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E02\u0E36\u0E49\u0E19\u0E43\u0E2B\u0E21\u0E48", action: "evolve" },
          extinction: { name: "\u0E42\u0E25\u0E01\u0E44\u0E23\u0E49\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C", subtitle: "\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E40\u0E08\u0E49\u0E32\u0E40\u0E1E\u0E35\u0E22\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E40\u0E14\u0E35\u0E22\u0E27", action: "extinguish" }
        };
        const LABELS = { hp: "\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E", hunger: "\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27", sanity: "\u0E2A\u0E15\u0E34", humanity: "\u0E04\u0E27\u0E32\u0E21\u0E40\u0E1B\u0E47\u0E19\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C", trust: "\u0E04\u0E27\u0E32\u0E21\u0E44\u0E27\u0E49\u0E43\u0E08", mutation: "\u0E01\u0E25\u0E32\u0E22\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C", horde: "\u0E2D\u0E33\u0E19\u0E32\u0E08\u0E1D\u0E39\u0E07", research: "\u0E07\u0E32\u0E19\u0E27\u0E34\u0E08\u0E31\u0E22", campaign: "\u0E01\u0E32\u0E23\u0E23\u0E30\u0E1A\u0E32\u0E14", supplies: "\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E01\u0E23\u0E30\u0E1B\u0E4B\u0E2D\u0E07", medicine: "\u0E0A\u0E38\u0E14\u0E40\u0E22\u0E47\u0E1A\u0E41\u0E1C\u0E25", samples: "\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07" };
        return { ROUTES, LABELS };
      });
    }
  });

  // ../../tmp/after-zero-zombie/core/contract.js
  var require_contract = __commonJS({
    "../../tmp/after-zero-zombie/core/contract.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory();
        else {
          root.ZombieCore = root.ZombieCore || {};
          root.ZombieCore.Contract = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        const VERSION = "contract-v1";
        const BEHAVIOR = ["huntAttempts", "hunts", "feeds", "corpseMeals", "helped", "endured", "hordeLed", "remembered"];
        const INJURIES = ["leg_wound", "arm_wound", "torn_tissue"];
        const PHASES = ["create", "adjustAction", "afterDecision", "endDay", "evolution", "actionEvent", "morning", "preview", "choicePressure", "choiceReasons"];
        const MODIFIERS = ["healingMultiplier", "hungerDailyDelta", "travelHpCost", "scavengeHpCost", "threatDelta"];
        const empty = () => ({ ops: [], notices: [] });
        function deepFreeze(value) {
          if (value && typeof value === "object" && !Object.isFrozen(value)) {
            Object.freeze(value);
            Object.values(value).forEach(deepFreeze);
          }
          return value;
        }
        function snapshot(s) {
          return deepFreeze(JSON.parse(JSON.stringify(s)));
        }
        function assertProposal(p) {
          if (!p || !Array.isArray(p.ops) || !Array.isArray(p.notices)) throw Error("Invalid module proposal");
          for (const n of p.notices) if (!n || typeof n.text !== "string" || n.text.length > 600 || !["routine", "story", "danger"].includes(n.kind)) throw Error("Invalid notice");
          return p;
        }
        return { VERSION, REVISION: 4, BEHAVIOR, INJURIES, PHASES, MODIFIERS, empty, deepFreeze, snapshot, assertProposal };
      });
    }
  });

  // ../../tmp/after-zero-zombie/core/state-utils.js
  var require_state_utils = __commonJS({
    "../../tmp/after-zero-zombie/core/state-utils.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory();
        else {
          root.ZombieCore = root.ZombieCore || {};
          root.ZombieCore.Utils = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
        function readStatePath(s, path) {
          return String(path || "").split(".").reduce((value, key) => value == null ? void 0 : value[key], s);
        }
        function normalize(s) {
          for (const key of Object.keys(s.stats)) s.stats[key] = clamp(s.stats[key], 0, key === "horde" ? 200 : key === "campaign" ? 2 : 100);
          for (const key of Object.keys(s.items)) s.items[key] = clamp(s.items[key], 0, 99);
        }
        function log(s, text, kind = "routine") {
          s.serial++;
          s.log.unshift({ id: s.serial, day: s.day, text, kind });
          s.log = s.log.slice(0, 70);
        }
        return { clamp, readStatePath, normalize, log };
      });
    }
  });

  // ../../tmp/after-zero-zombie/core/world-state.js
  var require_world_state = __commonJS({
    "../../tmp/after-zero-zombie/core/world-state.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory();
        else {
          root.ZombieCore = root.ZombieCore || {};
          root.ZombieCore.WorldState = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        const own = (o, k) => Object.hasOwn(o || {}, k), plain = (x) => x && typeof x === "object" && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype;
        function initializeContent(s, C, { fresh = false, preWorld = false } = {}) {
          const extensions = C.WORLD_CONTENT_EXTENSIONS;
          if (!extensions?.length) return;
          const current = extensions[extensions.length - 1].version;
          let previous = s.world.contentRevision;
          if (fresh) previous = 0;
          else if (previous === void 0) {
            if (!preWorld && s.contentVersion !== "world-20261030") throw Error("Missing content initialization revision");
            previous = 0;
          } else {
            if (!Number.isInteger(previous) || previous < 1 || previous > current) throw Error("Invalid content initialization revision");
            const declared = extensions.find((extension) => extension.version === previous);
            if (!declared || s.contentVersion !== declared.contentVersion) throw Error("Content revision and version disagree");
          }
          for (const extension of extensions) {
            for (const [id, def] of Object.entries(extension.npcs || {})) {
              if (!own(C.NPCS, id) || !C.NPCS[id].states.includes(def.state) || typeof def.alive !== "boolean" || !Number.isFinite(def.trust) || def.trust < 0 || def.trust > 100) throw Error("Invalid content NPC definition");
              if (extension.version <= previous) {
                if (!own(s.world.npcs, id)) throw Error("Initialized content NPC is missing");
              } else if (!own(s.world.npcs, id)) s.world.npcs[id] = { ...def };
            }
          }
          s.world.contentRevision = current;
          s.contentVersion = C.CONTENT_VERSION;
        }
        function initialize(s, C, { fresh = false } = {}) {
          const initial = C.WORLD_INITIAL_STATE;
          if (!initial) return;
          if (!plain(s.world) || !plain(s.world.resources) || !plain(s.world.npcs) || !plain(s.story?.flags)) throw Error("Invalid world initialization state");
          const resources = Object.entries(initial.resources || {}), npcs = Object.entries(initial.npcs || {});
          const count = resources.filter(([id]) => own(s.world.resources, id)).length + npcs.filter(([id]) => own(s.world.npcs, id)).length, total = resources.length + npcs.length;
          if (s.world.initializedVersion !== void 0) {
            if (s.world.initializedVersion !== 1 || count !== total) throw Error("Initialized world is incomplete");
            initializeContent(s, C, { fresh });
            return;
          }
          if (!fresh && s.contentVersion === C.CONTENT_VERSION) throw Error("Missing initialized world version");
          if (count && count !== total) throw Error("Partially initialized world; refusing to refill sources");
          if (!count) {
            for (const [id, def] of resources) {
              if (!own(C.RESOURCES, id) || !Number.isInteger(def.remaining) || def.remaining < 0 || def.remaining > 999 || typeof def.instanceId !== "string") throw Error("Invalid initial resource definition");
              s.world.resources[id] = { remaining: def.remaining, instanceId: s.runId.slice(0, 160) + ":" + def.instanceId };
            }
            for (const [id, def] of npcs) {
              if (!own(C.NPCS, id) || typeof def.alive !== "boolean" || !C.NPCS[id].states.includes(def.state) || !Number.isFinite(def.trust) || def.trust < 0 || def.trust > 100) throw Error("Invalid initial NPC definition");
              s.world.npcs[id] = { alive: def.alive, state: def.state, trust: def.trust };
            }
            if (!fresh) {
              const encountered = (id) => own(s.eventHistory, id) && Number.isInteger(s.eventHistory[id]) && s.eventHistory[id] >= 1 && s.eventHistory[id] <= s.day && s.pending?.eventId !== id;
              const counts = { ambulance: 0, prey: 0 };
              for (const [id, def] of resources) {
                const kind = def.eventId;
                if (!own(counts, kind)) continue;
                const index = counts[kind]++, used = index < (kind === "ambulance" ? s.memory.corpseMeals : s.memory.killed), resolved = used || index === 0 && encountered(kind) || s.story.flags[def.resolvedFlag] === true;
                if (!resolved) continue;
                s.story.flags[def.resolvedFlag] = true;
                s.world.resources[id].remaining = 0;
                if (def.npcId) s.world.npcs[def.npcId] = { alive: !used, state: used ? "dead" : "unknown", trust: 0 };
              }
            }
          }
          s.world.initializedVersion = 1;
          initializeContent(s, C, { fresh, preWorld: true });
        }
        return Object.freeze({ initialize });
      });
    }
  });

  // ../../tmp/after-zero-zombie/core/schema.js
  var require_schema = __commonJS({
    "../../tmp/after-zero-zombie/core/schema.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_contract(), require_state_utils(), require_world_state());
        else {
          root.ZombieCore = root.ZombieCore || {};
          root.ZombieCore.Schema = factory(root.ZombieCore.Contract, root.ZombieCore.Utils, root.ZombieCore.WorldState);
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(K, U, WorldState) {
        "use strict";
        const VERSION = 3, MAX_DAY = 120, CONTENT_VERSION = "g0-legacy-1";
        const STATS = { hp: 100, hunger: 100, sanity: 100, humanity: 100, trust: 100, mutation: 100, horde: 200, research: 100, campaign: 2, instinct: 100 };
        const STAT_DEFAULTS = { hp: 85, hunger: 30, sanity: 72, humanity: 65, trust: 0, mutation: 0, horde: 0, research: 0, campaign: 0, instinct: 20 };
        const copy = (x) => JSON.parse(JSON.stringify(x));
        const integer = (n, min, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(n) && n >= min && n <= max;
        const plain = (x) => x && typeof x === "object" && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype;
        const id = (x) => typeof x === "string" && x.length > 0 && x.length <= 240 && !/[\u0000-\u001f]/.test(x);
        let identitySerial = 0;
        function newRunId() {
          if (globalThis.crypto?.randomUUID) return "run-" + globalThis.crypto.randomUUID();
          if (globalThis.crypto?.getRandomValues) return "run-" + Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)), (n) => n.toString(16).padStart(8, "0")).join("");
          return "run-" + Date.now().toString(36) + "-" + (++identitySerial).toString(36);
        }
        function hash(text) {
          let n = 2166136261;
          for (let i = 0; i < text.length; i++) n = Math.imul(n ^ text.charCodeAt(i), 16777619);
          return (n >>> 0).toString(16);
        }
        function extensions(seed, runId, places) {
          return { contentVersion: CONTENT_VERSION, runId: runId || newRunId(), originId: "legacy", strainId: "common", bodyTraits: [], body: { starvationDays: 0, injuries: [] }, behavior: Object.fromEntries(K.BEHAVIOR.map((k) => [k, { count: 0, lastDay: 0, days: [] }])), evolution: { acquired: [], stages: [], evidence: [] }, world: { locations: Object.fromEntries(Object.keys(places).map((k) => [k, { threat: 0 }])), resources: {}, npcs: {} }, story: { flags: {}, scheduled: [] }, chronicle: { milestones: [], counters: {} }, lifecycle: { nextEvent: 0, activeTurn: null, lastCommittedTurn: null, resolved: [] } };
        }
        function pending(s, eventId, turn, context = {}) {
          s.lifecycle.nextEvent++;
          return { eventId, turn, instanceId: s.runId + ":event:" + s.lifecycle.nextEvent, turnId: turn ? s.lifecycle.activeTurn : null, actionApplied: turn, context: { place: s.place, ...context } };
        }
        function create(seed, C, options = {}) {
          const n = Number(seed) >>> 0;
          const s = { version: VERSION, seed: n, initialSeed: n, day: 1, completedDays: 0, serial: 1, place: "shelter", route: "human", stats: { ...STAT_DEFAULTS }, items: { supplies: 3, medicine: 1, samples: 0 }, bloodLeft: 8, memory: { saved: 0, killed: 0, corpseMeals: 0, endured: 0, savedOn: 0, killedOn: 0 }, pending: null, ending: null, feralDays: 0, seen: ["awakening"], eventHistory: {}, log: [{ id: 1, day: 1, text: "\u0E40\u0E08\u0E49\u0E32\u0E15\u0E37\u0E48\u0E19\u0E02\u0E36\u0E49\u0E19\u0E21\u0E32 \u0E42\u0E14\u0E22\u0E44\u0E21\u0E48\u0E21\u0E35\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E2B\u0E31\u0E27\u0E43\u0E08", kind: "story" }], ...extensions(n, options.runId, C.PLACES) };
          s.pending = pending(s, "awakening", false);
          WorldState.initialize(s, C, { fresh: true });
          return s;
        }
        function unsafe(value) {
          if (!value || typeof value !== "object") return false;
          return Object.entries(value).some(([k, v]) => ["__proto__", "constructor", "prototype"].includes(k) || unsafe(v));
        }
        function validate(input, C) {
          if (!input || unsafe(input) || ![1, 2, 3].includes(input.version)) throw Error("\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E0A\u0E31\u0E19\u0E40\u0E0B\u0E1F\u0E2B\u0E23\u0E37\u0E2D\u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E44\u0E21\u0E48\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A");
          const s = copy(input), legacy = s.version < 3, from = s.version;
          NpcRelationships.validateSavedEncounter(s.npcEncounter);
          for (const npc of Object.values(s.world?.npcs || {})) if (npc?.relationship) NpcRelationships.relationshipState(npc);
          // Extend existing saves with newly mapped districts without changing old locations.
          if (plain(s.world?.locations)) for (const place of Object.keys(C.PLACES)) {
            if (place.startsWith("bkk_") && !Object.hasOwn(s.world.locations, place)) s.world.locations[place] = { threat: 15 };
          }
          if (s.carriedBloodBags !== void 0 && (!Number.isSafeInteger(s.carriedBloodBags) || s.carriedBloodBags < 0)) throw Error("จำนวนถุงเลือดพกพาไม่ถูกต้อง");
          if (from === 1) {
            const food = s.items?.food;
            if (!Number.isFinite(food) || food < 0 || food > 99) throw Error("\u0E40\u0E2A\u0E1A\u0E35\u0E22\u0E07\u0E40\u0E14\u0E34\u0E21\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
            delete s.items.food;
            s.items.supplies = food;
            s.memory = { saved: 0, killed: 0, corpseMeals: 0, endured: 0, savedOn: 0, killedOn: 0 };
            s.bloodLeft = 8;
            s.log = Array.isArray(s.log) ? s.log : [];
            s.log.unshift({ id: ++s.serial, day: s.day, text: "\u0E01\u0E15\u0E34\u0E01\u0E32\u0E43\u0E2B\u0E21\u0E48: \u0E02\u0E2D\u0E07\u0E01\u0E34\u0E19\u0E40\u0E14\u0E34\u0E21\u0E04\u0E37\u0E2D\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E01\u0E23\u0E30\u0E1B\u0E4B\u0E2D\u0E07\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C \u0E23\u0E48\u0E32\u0E07\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E15\u0E49\u0E2D\u0E07\u0E2B\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E40\u0E2D\u0E07", kind: "story" });
          }
          if (legacy) {
            if (!plain(s.stats) || Object.keys(s.stats).length !== 9) throw Error("\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E40\u0E14\u0E34\u0E21\u0E44\u0E21\u0E48\u0E04\u0E23\u0E1A");
            const runId = "legacy-" + hash(JSON.stringify(input));
            Object.assign(s, extensions(s.initialSeed, runId, C.PLACES));
            s.stats.instinct = 20;
            s.version = VERSION;
            if (s.pending) {
              s.lifecycle.activeTurn = s.pending.turn ? s.runId + ":turn:" + (s.completedDays + 1) : null;
              s.pending = pending(s, s.pending.eventId, s.pending.turn, { legacy: true });
            }
          }
          WorldState.initialize(s, C);
          const base = create(0, C, { runId: "validation" }), known = (group, k) => Object.hasOwn(group || {}, k);
          const assert = (ok, msg) => {
            if (!ok) throw Error(msg);
          };
          assert(known(C.PLACES, s.place) && known(C.ROUTES, s.route) && integer(s.day, 1, MAX_DAY), "\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E27\u0E31\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          for (const key of ["seed", "initialSeed"]) assert(integer(s[key], 0, 4294967295), "seed \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          for (const key of ["completedDays", "serial", "feralDays"]) assert(integer(s[key], 0, key === "serial" ? 1e5 : MAX_DAY), "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E40\u0E27\u0E25\u0E32\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          for (const [group, defaults] of [["stats", base.stats], ["items", base.items], ["memory", base.memory]]) {
            assert(plain(s[group]) && Object.keys(s[group]).length === Object.keys(defaults).length, "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 " + group + " \u0E44\u0E21\u0E48\u0E04\u0E23\u0E1A");
            for (const k of Object.keys(defaults)) {
              const max = group === "stats" ? STATS[k] : group === "items" ? 99 : 120;
              assert(Number.isFinite(s[group][k]) && s[group][k] >= 0 && s[group][k] <= max && (group !== "memory" || Number.isInteger(s[group][k])), "\u0E04\u0E48\u0E32 " + group + "." + k + " \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
            }
          }
          assert(integer(s.bloodLeft, 0, 8), "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          assert(id(s.runId) && typeof s.contentVersion === "string" && s.contentVersion.length <= 80 && id(s.originId) && id(s.strainId), "identity \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          assert(["legacy", ...Object.keys(C.ORIGINS || {})].includes(s.originId) && ["common", ...Object.keys(C.STRAINS || {})].includes(s.strainId), "\u0E15\u0E49\u0E19\u0E01\u0E33\u0E40\u0E19\u0E34\u0E14\u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E0A\u0E37\u0E49\u0E2D\u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01");
          assert(Array.isArray(s.bodyTraits) && s.bodyTraits.length <= 12 && new Set(s.bodyTraits).size === s.bodyTraits.length && s.bodyTraits.every((x) => known(C.BODY_TRAITS, x)), "bodyTraits \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          assert(plain(s.body) && integer(s.body.starvationDays, 0, MAX_DAY) && Array.isArray(s.body.injuries) && s.body.injuries.length <= 12, "\u0E2A\u0E20\u0E32\u0E1E\u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          assert(new Set(s.body.injuries.map((x) => x.id)).size === s.body.injuries.length && s.body.injuries.every((x) => plain(x) && K.INJURIES.includes(x.id) && integer(x.severity, 1, 3)), "\u0E1A\u0E32\u0E14\u0E41\u0E1C\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          assert(plain(s.behavior) && Object.keys(s.behavior).length === K.BEHAVIOR.length, "\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E1E\u0E24\u0E15\u0E34\u0E01\u0E23\u0E23\u0E21\u0E44\u0E21\u0E48\u0E04\u0E23\u0E1A");
          for (const k of K.BEHAVIOR) {
            const b = s.behavior[k];
            assert(plain(b) && integer(b.count, 0, 2e3) && integer(b.lastDay, 0, MAX_DAY) && Array.isArray(b.days) && b.days.length <= MAX_DAY && new Set(b.days).size === b.days.length && b.days.every((d) => integer(d, 1, s.day)), "\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E1E\u0E24\u0E15\u0E34\u0E01\u0E23\u0E23\u0E21\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          }
          assert(plain(s.evolution) && Array.isArray(s.evolution.acquired) && s.evolution.acquired.length <= 30 && new Set(s.evolution.acquired).size === s.evolution.acquired.length && s.evolution.acquired.every((x) => known(C.TRAITS, x)), "trait \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          assert(Array.isArray(s.evolution.stages) && s.evolution.stages.length <= 30 && s.evolution.stages.every((x) => plain(x) && id(x.id) && integer(x.day, 1, s.day)) && Array.isArray(s.evolution.evidence) && s.evolution.evidence.length <= 100 && s.evolution.evidence.every((x) => plain(x) && id(x.id) && integer(x.day, 1, s.day) && typeof x.text === "string" && x.text.length <= 600), "\u0E2B\u0E25\u0E31\u0E01\u0E10\u0E32\u0E19\u0E27\u0E34\u0E27\u0E31\u0E12\u0E19\u0E32\u0E01\u0E32\u0E23\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          assert(plain(s.world) && plain(s.world.locations) && Object.keys(s.world.locations).length === Object.keys(C.PLACES).length, "\u0E42\u0E25\u0E01\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          for (const key of Object.keys(C.PLACES)) assert(plain(s.world.locations[key]) && Number.isFinite(s.world.locations[key].threat) && s.world.locations[key].threat >= 0 && s.world.locations[key].threat <= 100, "threat \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          assert(plain(s.world.resources) && Object.keys(s.world.resources).length <= 100 && Object.entries(s.world.resources).every(([k, v]) => known(C.RESOURCES, k) && plain(v) && integer(v.remaining, 0, 999) && id(v.instanceId)), "resource \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          assert(plain(s.world.npcs) && Object.keys(s.world.npcs).length <= 100 && Object.entries(s.world.npcs).every(([k, v]) => known(C.NPCS, k) && plain(v) && typeof v.alive === "boolean" && typeof v.state === "string" && (C.NPCS[k].states || []).includes(v.state) && Number.isFinite(v.trust) && v.trust >= 0 && v.trust <= 100), "NPC \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          assert(plain(s.story) && plain(s.story.flags) && Object.entries(s.story.flags).every(([k, v]) => known(C.FLAGS, k) && typeof v === C.FLAGS[k].type) && Array.isArray(s.story.scheduled) && s.story.scheduled.length <= 100 && s.story.scheduled.every((x) => plain(x) && C.EVENTS.some((e) => e.id === x.eventId) && integer(x.earliestDay, 1, MAX_DAY) && plain(x.context)), "\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E23\u0E32\u0E27\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          const life = s.lifecycle;
          assert(plain(life) && integer(life.nextEvent, 0, 1e3) && [life.activeTurn, life.lastCommittedTurn].every((x) => x === null || id(x)) && Array.isArray(life.resolved) && life.resolved.length <= 200 && new Set(life.resolved).size === life.resolved.length && life.resolved.every(id), "lifecycle \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          if (s.pending) {
            const p = s.pending;
            assert(plain(p) && C.EVENTS.some((e) => e.id === p.eventId) && typeof p.turn === "boolean" && id(p.instanceId) && p.instanceId.startsWith(s.runId + ":event:") && typeof p.actionApplied === "boolean" && plain(p.context) && known(C.PLACES, p.context.place) && !life.resolved.includes(p.instanceId), "\u0E40\u0E2B\u0E15\u0E38\u0E01\u0E32\u0E23\u0E13\u0E4C\u0E04\u0E49\u0E32\u0E07\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
            assert(p.turn ? p.actionApplied && id(p.turnId) && p.turnId === life.activeTurn && p.turnId !== life.lastCommittedTurn : !p.actionApplied && p.turnId === null && life.activeTurn === null, "\u0E18\u0E38\u0E23\u0E01\u0E23\u0E23\u0E21\u0E40\u0E2B\u0E15\u0E38\u0E01\u0E32\u0E23\u0E13\u0E4C\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          } else assert(life.activeTurn === null, "\u0E1E\u0E1A\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E04\u0E49\u0E32\u0E07\u0E42\u0E14\u0E22\u0E44\u0E21\u0E48\u0E21\u0E35\u0E40\u0E2B\u0E15\u0E38\u0E01\u0E32\u0E23\u0E13\u0E4C");
          if (s.ending) assert(plain(s.ending) && known(C.ENDINGS, s.ending.id) && integer(s.ending.day, 1, s.day) && !s.pending, "\u0E1A\u0E17\u0E08\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          assert(Array.isArray(s.seen) && s.seen.every((x) => C.EVENTS.some((e) => e.id === x)), "\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          assert(plain(s.chronicle) && Array.isArray(s.chronicle.milestones) && s.chronicle.milestones.length <= 100 && s.chronicle.milestones.every((x) => plain(x) && id(x.id) && integer(x.day, 1, s.day) && typeof x.text === "string" && x.text.length <= 600) && plain(s.chronicle.counters) && Object.values(s.chronicle.counters).every((x) => integer(x, 0, 2e3)), "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
          s.log = Array.isArray(s.log) ? s.log.slice(0, 70).map((e) => ({ id: Number(e.id) || 0, day: U.clamp(Number(e.day) || 1, 1, MAX_DAY), text: String(e.text).slice(0, 600), kind: ["routine", "danger", "story", "ending"].includes(e.kind) ? e.kind : "routine" })) : [];
          s.eventHistory = s.eventHistory && typeof s.eventHistory === "object" && !Array.isArray(s.eventHistory) ? Object.fromEntries(Object.entries(s.eventHistory).filter(([k, d]) => C.EVENTS.some((e) => e.id === k) && integer(d, 1, s.day))) : {};
          return s;
        }
        return { VERSION, MAX_DAY, CONTENT_VERSION, STATS, STAT_DEFAULTS, create, validate, pending, newRunId, copy };
      });
    }
  });

  // ../../tmp/after-zero-zombie/data/catalog.js
  var require_catalog = __commonJS({
    "../../tmp/after-zero-zombie/data/catalog.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_places(), require_actions(), require_events(), require_endings(), require_meta(), require_schema());
        else root.ZombieCatalog = factory(root.ZombieData.PLACES, root.ZombieData.ACTIONS, root.ZombieData.EVENTS, root.ZombieData.ENDINGS, root.ZombieData.Meta, root.ZombieCore.Schema);
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(PLACES, actions, events, ENDINGS, meta, S) {
        "use strict";
        const tags = { remember: ["remembered"], endure: ["endured"], recruit: ["hordeLed"], hunt: ["huntAttempts"] };
        const ACTIONS = actions.map((a) => ({ ...a, behaviorTags: tags[a.id] || [] }));
        const EVENTS = events.map((e) => ({ ...e, choices: e.choices.map((c, i) => ({ ...c, id: e.id + ".choice." + i, behaviorTags: e.id === "prey" && i === 0 ? ["hunts", "feeds"] : e.id === "ambulance" && i === 0 ? ["corpseMeals", "feeds"] : e.id === "bloodbank" && i === 0 ? ["feeds"] : (c.effects || []).some((f) => f.path === "memory.saved" && f.value > 0) ? ["helped"] : [] })) }));
// BEGIN BANGKOK OCCUPATION CONTENT
        const districts = [{"id":"bkk_winstop","parent":"shelter","name":"คิววินปากซอยดินแดง","role":"mototaxi","color":"#edaa65","task":"จัดเส้นทางตรอกปลอดภัย","text":"หมวกสำรองยังแขวนอยู่ที่คิววิน คนขับที่รอดชีวิตกำลังทำแผนที่ตรอกเพื่อพาคนเจ็บหลบถนนใหญ่","work":"ช่วยทำเครื่องหมายทางเลี่ยงและย้ายรถที่ขวางซอย","outcome":"ลูกศรบนผนังเชื่อมที่พักเข้าด้วยกัน ผู้รอดชีวิตไม่ต้องเสี่ยงข้ามถนนใหญ่ตามลำพังอีก","reward":"sanity","ending":"ผู้นำทางแห่งตรอกดินแดง","epilogue":"เจ้าคอยเดินนำผู้คนผ่านตรอกที่เคยรับส่งผู้โดยสาร แม้ไม่มีใครกล้านั่งซ้อนท้ายอีกแล้ว ป้ายคิววินยังเป็นสัญญาว่าจะไม่ทิ้งใครไว้ข้างทาง"},{"id":"bkk_market","parent":"streets","name":"ครัวชุมชนตลาดคลองเตย","role":"vendor","color":"#d88f86","task":"ตั้งครัวแบ่งเสบียง","text":"ใต้หลังคาตลาดมีคนกำลังนับกระป๋องอาหารสำหรับผู้รอดชีวิต กลิ่นข้าวเก่าปลุกความทรงจำ แต่ไม่อาจทำให้ร่างของเจ้าอิ่ม","work":"ช่วยแบ่งอาหารเป็นมื้อและขนเสบียงเข้าครัว","outcome":"รายการอาหารบนกระดานทำให้ทุกคนเห็นว่าต้องแบ่งอะไรบ้าง เด็กกับคนเจ็บได้รับส่วนของตัวเองก่อน","reward":"humanity","ending":"ครัวที่ยังมีที่ให้เจ้า","epilogue":"เจ้ารักษาทางเข้าครัวและช่วยส่งอาหารที่ตัวเองกินไม่ได้ ผู้คนวางที่นั่งว่างไว้ข้างเตาเสมอ เพื่อให้เจ้ารู้ว่ายังเป็นส่วนหนึ่งของชุมชน"},{"id":"bkk_ward","parent":"hospital","name":"หอผู้ป่วยพักฟื้นราชวิถี","role":"nurse","color":"#97cbd9","task":"ฟื้นระบบดูแลผู้ป่วย","text":"พยาบาลที่เหลือกำลังเรียงชื่อผู้ป่วยตามอาการ ผ้าพันแผลกับน้ำสะอาดมีจำกัด ทุกการเคลื่อนย้ายต้องทำอย่างระวัง","work":"ช่วยจัดจุดพักและขนเวชภัณฑ์ให้ทีมพยาบาล","outcome":"เตียงถูกจัดใหม่จนทีมรักษาเข้าถึงคนเจ็บได้ง่ายขึ้น เจ้าหยุดอยู่หลังเส้นกั้นโดยไม่ฝืนเข้าใกล้ผู้ป่วย","reward":"research","ending":"เวรที่ไม่สิ้นสุด","epilogue":"คนเป็นรับหน้าที่รักษา ส่วนเจ้ารับหน้าที่เฝ้าทางเดิน หอผู้ป่วยเริ่มมีคืนที่ทุกคนได้นอนหลับ ความหวังไม่ใช่การกลับเป็นมนุษย์เสมอไป แต่คือการมีคนรอให้กลับเข้าเวร"},{"id":"bkk_power","parent":"shelter","name":"ห้องระบบไฟอาคารห้วยขวาง","role":"electrician","color":"#dfc56f","task":"กู้ระบบไฟฉุกเฉิน","text":"ตู้ไฟมีรอยไหม้และพื้นยังชื้น ช่างที่หลบอยู่ในอาคารต้องการคนช่วยย้ายอุปกรณ์ ก่อนจะตัดวงจรที่เสียหายออก","work":"ช่วยขนแบตเตอรี่และทำเครื่องหมายวงจรที่ช่างตรวจแล้ว","outcome":"ไฟฉุกเฉินดวงเล็กติดขึ้นทีละชั้น ช่างปิดตู้ที่ชำรุดและส่งสัญญาณว่าทางขึ้นบันไดใช้ได้แล้ว","reward":"research","ending":"แสงเล็กในห้วยขวาง","epilogue":"เจ้ากับทีมช่างดูแลแสงไฟให้คนเป็นเดินกลับถึงห้อง การไฟดับไม่ใช่สัญญาณให้ทุกคนถูกทิ้งอีกต่อไป และไม่มีใครปิดไฟหน้าประตูเมื่อเห็นเงาของเจ้า"},{"id":"bkk_depot","parent":"streets","name":"จุดพักงานกวาดถนนพระนคร","role":"cleaner","color":"#b6cf83","task":"เปิดทางผ่านซากถนน","text":"คีมคีบกับรถเข็นถูกจอดไว้ข้างกองเศษกระจก คนกวาดถนนกลุ่มเล็กกำลังพยายามเปิดทางให้รถเข็นคนเจ็บผ่าน","work":"ช่วยย้ายเศษเหล็กและทำแนวเดินที่ปลอดภัย","outcome":"ทางเท้าแคบ ๆ กลับมาใช้ได้ คนเจ็บถูกเข็นผ่านโดยไม่ต้องลงไปกลางถนน","reward":"humanity","ending":"ถนนที่ยังดูแลกัน","epilogue":"ผู้คนจำเจ้าได้จากทางเดินที่สะอาดและปลอดภัย ไม่มีพิธีมอบรางวัล มีเพียงใครบางคนแขวนถุงมือคู่ใหม่ไว้ที่รถเข็นให้ทุกเช้า"},{"id":"bkk_cafe","parent":"shelter","name":"ร้านกาแฟปิดไฟย่านอารีย์","role":"barista","color":"#c6a58b","task":"ตั้งจุดพักและฝากข้อความ","text":"กระดานเมนูถูกพลิกเป็นบอร์ดตามหาญาติ บาริสต้าที่รอดอยู่หลังเคาน์เตอร์กำลังแบ่งน้ำสะอาดให้คนเดินทาง","work":"ช่วยจัดน้ำสำหรับคนเป็นและคัดข้อความตามหาญาติ","outcome":"ข้อความซ้ำถูกจัดไว้ด้วยกัน มีคนพบชื่อญาติบนกระดาน ส่วนแก้วสำหรับเจ้ายังว่างอยู่ตามเดิม","reward":"sanity","ending":"โต๊ะประจำของผู้ไร้ชีพจร","epilogue":"ร้านกาแฟกลายเป็นจุดพักที่ผู้คนกล้าพูดคุยกับเจ้า ชื่อบนแก้วไม่ใช่คำสั่งซื้ออีกแล้ว แต่เป็นหลักฐานว่าคนคนหนึ่งยังมีใครจำได้"},{"id":"bkk_office","parent":"radio","name":"สำนักงานออฟไลน์พระราม 9","role":"developer","color":"#b6a2d3","task":"กู้บันทึกจุดปลอดภัย","text":"หน้าจอบางเครื่องยังมีไฟจากแบตเตอรี่สำรอง ทีมเล็ก ๆ กำลังเรียงบันทึกออฟไลน์ โดยไม่รู้ว่าข่าวฉบับไหนเก่าเกินใช้","work":"ช่วยตรวจเวลาและจัดหมวดบันทึกกับทีมดูแลระบบ","outcome":"ข่าวเก่าถูกแยกจากข้อความล่าสุด แผนที่จุดรับคนจึงไม่พาผู้รอดชีวิตไปยังด่านที่ปิดแล้ว","reward":"research","ending":"เครือข่ายที่ยังจำชื่อกัน","epilogue":"เจ้าช่วยส่งสำเนาบันทึกระหว่างที่พัก ระบบเรียบง่ายยังทำงานแม้ไม่มีอินเทอร์เน็ต ผู้คนไม่ถูกลดเหลือเพียงตัวเลขผู้สูญหาย เพราะทุกชื่อมีคนตามข่าวต่อ"},{"id":"bkk_pier","parent":"streets","name":"ท่าเรือพักคลองแสนแสบ","role":"boatcrew","color":"#d7a772","task":"ซ่อมทางขึ้นท่าเรือ","text":"เชือกผูกเรือขาดไปเส้นหนึ่งและบันไดท่าลื่น ลูกเรือกำลังเตรียมจุดพักคนเจ็บก่อนตัดสินใจว่าจะออกเดินทางได้เมื่อใด","work":"ช่วยยึดทางขึ้นท่าและขนของตามสัญญาณลูกเรือ","outcome":"ลูกเรือทดสอบทางขึ้นจนมั่นใจ คนเจ็บกล้าลงมารอที่ท่าโดยไม่ต้องเสี่ยงปีนข้ามราว","reward":"sanity","ending":"ผู้เฝ้าท่าริมคลอง","epilogue":"เจ้าเลือกเฝ้าท่าและช่วยรับคนที่เดินทางมาถึง เสียงนกหวีดไม่ใช่เสียงไล่อีกแล้ว แต่เป็นคำบอกว่ามีใครกำลังกลับบ้าน"},{"id":"bkk_stockroom","parent":"streets","name":"ห้องแพ็กพัสดุประตูน้ำ","role":"liveseller","color":"#d4a0b6","task":"จัดของจำเป็นให้ส่งต่อ","text":"กล่องเสื้อผ้ากองอยู่ใต้ขาตั้งโทรศัพท์ที่ไม่มีสัญญาณ แม่ค้าหลายคนกำลังคัดของสำหรับคนที่หนีออกมาโดยไม่มีสัมภาระ","work":"ช่วยแพ็กของตามขนาดและเขียนชื่อจุดรับให้ชัด","outcome":"เสื้อผ้าและของจำเป็นถูกแบ่งเป็นห่อที่ถือได้ด้วยมือเดียว คนรับไม่ต้องคุ้ยหาของกลางกองอีก","reward":"humanity","ending":"พัสดุถึงมือคนที่รอ","epilogue":"ไม่มีเสียงแจ้งยอดสั่งซื้อ แต่ยังมีชื่อผู้รับบนกล่อง เจ้าช่วยส่งของระหว่างที่พักจนคนในย่านรู้ว่าเสียงเคาะเบา ๆ อาจหมายถึงความช่วยเหลือ"},{"id":"bkk_busyard","parent":"shelter","name":"ลานพักรถเมล์อนุสาวรีย์ชัยฯ","role":"busdriver","color":"#91b2d3","task":"จัดจุดรวมพลข้างรถเมล์","text":"รถเมล์หลายคันสตาร์ตไม่ติด คนขับใช้กระดาษเส้นทางทำป้ายบอกจุดรวมพล คนแก่กับเด็กกำลังรอข่าวว่าจะไปพักที่ไหน","work":"ช่วยทำป้ายและจัดทางผ่านระหว่างรถที่จอดขวาง","outcome":"คนขับตรวจจำนวนผู้รอดชีวิตตามป้ายที่จัดไว้ ไม่มีใครต้องเดินหากลุ่มตัวเองท่ามกลางรถร้างอีก","reward":"sanity","ending":"ป้ายสุดท้ายยังมีคนรอ","epilogue":"เจ้าเฝ้าจุดรวมพลแทนที่นั่งหลังพวงมาลัย ทุกครั้งที่มีคนมาถึง เจ้าจะยกมือชี้ทางไปพัก เส้นทางของชีวิตนี้ยังมีผู้โดยสารร่วมทาง แม้รถจะไม่เคยออกจากลาน"}];
        const FLAGS = {};
        EVENTS.push({id:'career.awakening',trigger:'opening',once:true,title:'วันแรกที่ได้สติ',text:'เจ้าตื่นขึ้นพร้อมของติดตัวจากชีวิตก่อนติดเชื้อ',choices:[
          {id:'career.awakening.check',text:'ตั้งสติแล้วตรวจของติดตัว',note:'สติ +3 · ไม่ใช้วัน',effects:[{type:'stat.add',key:'sanity',value:3}]},
          {id:'career.awakening.listen',text:'อยู่นิ่ง ๆ แล้วฟังเสียงรอบตัว',note:'สติ +2 · ไม่ใช้วัน',effects:[{type:'stat.add',key:'sanity',value:2}]},
          {id:'career.awakening.look',text:'มองหาทางออกก่อน',note:'ไม่เปลี่ยนสถานะ · ไม่ใช้วัน',effects:[]}
        ]});
        for (const d of districts) {
          PLACES[d.id] = { name: d.name, short: d.name, description: d.text, tag: 'BANGKOK 2026', color: d.color, neighbors: [d.parent] };
          PLACES[d.parent].neighbors.push(d.id);
          const flag = d.id + '.helped', eventId = d.id + '.work';
          FLAGS[flag] = { type: 'boolean', default: false };
          ACTIONS.push({ id: eventId, name: d.task, places: [d.id], encounter: eventId, note: '1 วัน · ช่วยงานหรือเก็บของ แล้วเลือกได้ว่าจะทำอย่างไร', requirements: { kind: 'flag', id: flag, value: false } });
          EVENTS.push({ id: eventId, title: d.task, text: d.text, location: d.id, once: false, choices: [
            { id: eventId + '.help', text: d.work, pressure: true, note: 'สภาพร่าง -4 · ความหิว -14 (ได้รับเสบียงแบ่งปัน) · ความไว้ใจ +8 · ' + ({sanity:'สติ',research:'งานวิจัย',humanity:'ความเป็นมนุษย์'}[d.reward]) + ' +6 · เปิดทางตั้งหลักในย่านนี้', effects: [{type:'stat.add',key:'hp',value:-4},{type:'stat.add',key:'hunger',value:-14},{type:'stat.add',key:'trust',value:8},{type:'stat.add',key:d.reward,value:6},{type:'flag.set',id:flag,value:true}], behaviorTags:['helped'] },
            { id: eventId + '.salvage', text: 'ค้นของจำเป็นและเศษเสบียงแล้วถอย โดยยังไม่รับงาน', note: 'เสบียงมนุษย์ +1 · ความหิว -8 · สภาพร่าง -3 · ยังไม่เปิดทางตั้งหลัก', effects:[{type:'item.add',key:'supplies',value:1},{type:'stat.add',key:'hunger',value:-8},{type:'stat.add',key:'hp',value:-3}] },
            { id: eventId + '.leave', text:'ถอยไปตั้งหลักก่อน', note:'ยังไม่เปิดทางตั้งหลัก · กิจกรรมนี้ใช้ 1 วัน', effects:[] }
          ] });
          ENDINGS[d.id + '.ending'] = { title: d.ending, text: d.epilogue };
          ACTIONS.push({id:d.id+'.settle',name:'ตัดสินใจตั้งหลักดูแลย่านนี้ — '+d.ending,places:[d.id],ending:d.id+'.ending',min:{humanity:60,sanity:50,trust:55},requirements:{kind:'flag',id:flag,value:true},note:'จุดตัดสินใจวิถีชีวิต · ต้องเคยช่วยงานย่านนี้ มีสติ 50 ความเป็นมนุษย์ 60 และความไว้ใจ 55'});
        }
        const routes = [{"id":"vaccine","label":"งานวิจัยเซรุ่ม","endings":["human"],"destination":"bkk_ward","requirements":{"research":90,"humanity":55,"sanity":45,"trust":30},"samples":2,"steps":[{"place":"bkk_ward","name":"เก็บบันทึกการตอบสนองต่อเชื้อ","text":"ทีมพยาบาลต้องการข้อมูลที่ตรวจซ้ำได้ เจ้าช่วยเทียบอาการกับบันทึกโดยไม่เข้าใกล้เตียงผู้ป่วย"},{"place":"bkk_power","name":"ตรวจระบบสำรองของตู้เก็บเซรุ่ม","text":"ช่างตรวจแบตเตอรี่และให้เจ้าช่วยขนชุดสำรอง ตู้เก็บเซรุ่มจึงไม่ดับระหว่างขนย้าย"},{"place":"bkk_office","name":"เทียบผลทดลองจากสำเนาออฟไลน์","text":"ตัวเลขที่ขาดหายถูกเทียบกับสำเนาอีกชุด ทีมงานแยกข้อมูลปนเปื้อนออกก่อนส่งกลับหอผู้ป่วย"}]},{"id":"horde","label":"เส้นทางควบคุมฝูง","endings":["king","horde_breakout","extinction"],"destination":"bkk_pier","requirements":{"horde":90,"mutation":45,"sanity":25},"samples":0,"steps":[{"place":"bkk_winstop","name":"สำรวจตรอกสำหรับเคลื่อนฝูง","text":"เจ้าจำมุมอับและจุดคอขวดจากป้ายคิววิน เส้นทางนี้ต้องพาฝูงผ่านโดยไม่ติดอยู่กลางถนน"},{"place":"bkk_busyard","name":"ฝึกหยุดฝูงหน้าสิ่งกีดขวาง","text":"ระหว่างรถเมล์ร้าง เจ้าทดลองให้ฝูงหยุดตามสัญญาณแทนการพุ่งชน เสียงคำรามเริ่มกลายเป็นคำสั่งที่พวกมันเข้าใจ"},{"place":"bkk_pier","name":"ทดสอบสัญญาณเรียกฝูงริมคลอง","text":"เสียงสะท้อนจากผิวน้ำทำให้สัญญาณผิดเพี้ยน เจ้าค่อย ๆ ปรับจังหวะจนฝูงเคลื่อนตามโดยไม่แตกแถว"}]},{"id":"evolution","label":"การปรับตัวของร่าง","endings":["evolved"],"destination":"bkk_power","requirements":{"mutation":85,"research":35,"sanity":30},"samples":2,"steps":[{"place":"bkk_depot","name":"บันทึกการตอบสนองของร่างต่อสภาพแวดล้อม","text":"เจ้าสังเกตการเคลื่อนไหวของตัวเองระหว่างเก็บกวาด แล้วทำเครื่องหมายอาการที่เปลี่ยนไปโดยไม่จงใจรับสารอันตรายเพิ่ม"},{"place":"bkk_ward","name":"เทียบตัวอย่างเชื้อที่ยังไม่ปนเปื้อน","text":"เจ้าวางหลอดไว้ในช่องส่งของ ทีมรักษาช่วยแยกความเปลี่ยนแปลงของเชื้อออกจากผลของการบาดเจ็บ"},{"place":"bkk_power","name":"ทดสอบประสาทรับสัญญาณในพื้นที่ควบคุม","text":"หลังช่างแยกวงจรที่เสียหายออก เจ้าทดลองรับสัญญาณจากอุปกรณ์ที่ปลอดภัย ความรู้สึกแปลกใหม่เริ่มมีรูปแบบที่อธิบายได้"}]}];
        const lateFlags = [
          'crisis_late_seen_d45','crisis_late_seen_d60','crisis_late_seen_d75','crisis_late_seen_d90',
          'crisis_late_seen_d105','crisis_late_seen_d112','crisis_late_seen_d116','crisis_late_seen_d119',
          'crisis_d45_read_map','crisis_d60_helped_generator','crisis_d75_cleared_chain','crisis_d90_escorted_convoy',
          'roam_late_depleted_d45','roam_late_depleted_d60','roam_late_depleted_d75','roam_late_depleted_d90',
          'travel_rain_awning_waited','travel_rain_awning_signaled','travel_rain_awning_left',
          'travel_awning_glance_done','travel_awning_hasty_done',
          'hive_synapse_connected','hive_synapse_sampled',
          'nest_resonance_directive_done','nest_enzyme_discovery_done',
          'hunter_reputation_reformed','hunter_reputation_intimidated',
          'hunter_reformed_shadow_done','hunter_intimidated_corridor_done',
          'tower_decrypted_depot','tower_warned_survivors','tower_stimulated_horde',
          'tower_depot_approach_done','tower_broadcast_echo_done',
          'somjit_wound_treated','somjit_food_given_unhealed',
          'somjit_wound_healed_done','somjit_fever_festering_done',
          'bus_salvaged_firstaid','bus_read_driver_log',
          'bus_log_legacy_done','bus_salvaged_remnant_done'
        ];
        for (const lf of lateFlags) FLAGS[lf] = {type:'boolean',default:false};
        for (const route of routes) {
          const bonusStat = route.id === 'vaccine' ? 'research' : route.id === 'horde' ? 'horde' : 'mutation';
          const bonusLabel = route.id === 'vaccine' ? 'งานวิจัย +4' : route.id === 'horde' ? 'อำนาจฝูง +4' : 'กลายพันธุ์ +4';
          route.steps.forEach((step,i) => {
            const id = 'route.' + route.id + '.' + i;
            FLAGS[id] = {type:'boolean',default:false};
            ACTIONS.push({id,name:step.name,places:[step.place],encounter:id,requirements:{kind:'flag',id,value:false},note:'เตรียม'+route.label+' · 1 วัน · ทำสำเร็จครั้งเดียว'});
            EVENTS.push({id,title:step.name,text:step.text,location:step.place,once:false,choices:[
              {id:id+'.prepare',text:'ลงมือเตรียมงานนี้ให้เสร็จ',note:'สภาพร่าง -3 · ความหิว +2 · '+bonusLabel+' · บันทึกความคืบหน้าของเส้นทาง',effects:[{type:'stat.add',key:'hp',value:-3},{type:'stat.add',key:'hunger',value:2},{type:'stat.add',key:bonusStat,value:4},{type:'flag.set',id,value:true}]},
              {id:id+'.leave',text:'ยังไม่พร้อม ถอยไปเตรียมตัวก่อน',note:'ยังไม่บันทึกความคืบหน้า · ใช้กิจกรรมเดินสำรวจวันนี้',effects:[]}
            ]});
          });
          for(const action of ACTIONS.filter(a=>route.endings.includes(a.ending))) {
            action.requirements={all:[...(action.requirements?[action.requirements]:[]),...route.steps.map((_,i)=>({kind:'flag',id:'route.'+route.id+'.'+i,value:true}))]};
            action.places=[action.ending==='extinction'?'radio':route.destination];
            action.min=action.ending==='extinction'?{...route.requirements,...action.min,sanity:route.requirements.sanity}:{...action.min,...route.requirements};
            action.note+=' · เตรียมงาน 3 จุดแล้วเดินทางสู่จุดตัดสินใจ';
          }
        }
        const recruit = ACTIONS.find(a=>a.id==='recruit');
        for(const fx of recruit.effects) { if(fx.path==='stats.horde')fx.value=12; if(fx.path==='stats.mutation')fx.value=3; if(fx.path==='stats.sanity')fx.value=-5; }
        recruit.note='อำนาจฝูง +12 · กลายพันธุ์ +3 · สติ -5 · ความเป็นมนุษย์ -3';
        const research = ACTIONS.find(a=>a.id==='research');
        for(const fx of research.effects) {if(fx.path==='stats.research')fx.value=10;if(fx.path==='stats.sanity')fx.value=-3;}
        research.note='งานวิจัย +10 · สติ -3 · ใช้ตัวอย่างเชื้อ 1';
        const adapt = ACTIONS.find(a=>a.id==='adapt');
        for(const fx of adapt.effects) {if(fx.path==='stats.mutation')fx.value=8;if(fx.path==='stats.hp')fx.value=-6;if(fx.path==='stats.sanity')fx.value=-3;}
        adapt.note='กลายพันธุ์ +8 · สุขภาพ -6 · สติ -3 · ใช้ตัวอย่างเชื้อ 1';
        const meal = EVENTS.find(e=>e.id==='prey').choices[0];
        meal.effects.find(fx=>fx.path==='stats.mutation').value=6;
        EVENTS.push(...[{"id":"community.clinic.blood_sample","title":"ข้อต่อรองหลังกระจกห้องแล็บ","text":"หมอวิชัยวางหลอดเก็บตัวอย่างไว้หลังช่องรับส่งของ “อยากเทียบเชื้อในเลือดกับอาการของนาย ถ้ายอมให้เก็บตัวอย่าง ฉันมีเวชภัณฑ์ให้แลก” เขาวางเข็มลง รอให้เจ้าตัดสินใจโดยไม่เร่ง","location":"hospital","tags":["lab"],"once":false,"cooldownDays":5,"requirements":{"all":[{"kind":"day","min":4},{"kind":"npc","id":"clinic.dr_wichai","field":"alive","value":true},{"any":[{"kind":"npc","id":"clinic.dr_wichai","field":"state","value":"wary"},{"kind":"npc","id":"clinic.dr_wichai","field":"state","value":"friendly"}]}]},"choices":[{"id":"community.clinic.blood_sample.donate","text":"ยอมให้เก็บตัวอย่างเลือด","note":"ร่างกาย -5 · งานวิจัย +3 · ความไว้ใจ +3 · เวชภัณฑ์ +1 · ไม่ลดความหิว","outcomeText":"เข็มทำให้ผิวที่เย็นซีดฉีกเป็นรอย หมอปิดแผลให้ก่อนส่งกล่องเวชภัณฑ์ผ่านช่องรับของ เลือดในหลอดถูกเก็บไว้ศึกษา ไม่ใช่เสบียงสำหรับเจ้า","effects":[{"type":"stat.add","key":"hp","value":-5},{"type":"stat.add","key":"research","value":3},{"type":"stat.add","key":"trust","value":3},{"type":"item.add","key":"medicine","value":1}]},{"id":"community.clinic.blood_sample.decline","text":"ปฏิเสธ แล้วขอฟังข่าวจากวิทยุแทน","note":"สติ +3 · ไม่เสียเลือด · ไม่เพิ่มงานวิจัย","outcomeText":"หมอเก็บเข็มแล้วเลื่อนบันทึกข่าวเข้ามาแทน “ยังมีคนส่งสัญญาณจากนอกเขตกักกันอยู่” ข่าวสั้น ๆ ไม่ได้บอกทางรอดแน่นอน แต่ช่วยให้เจ้ารู้ว่าโลกยังไม่ได้เงียบไปทั้งหมด","effects":[{"type":"stat.add","key":"sanity","value":3}]}]}]);
        for(const d of [{"id":"route_sign","places":["streets","shelter","bkk_winstop"],"title":"ลูกศรชอล์กบนกำแพง","text":"ชายหลังรั้วถามว่า “ลูกศรเส้นนี้ยังพาไปถึงที่พักได้ไหม?” อีกเสียงตอบ “ไม่มีใครกลับมาบอกตั้งแต่เมื่อคืน”","reply":"ชี้เส้นทางที่เพิ่งผ่านมาและบอกจุดที่ควรระวัง","outcome":"เขาจดคำเตือนเพิ่มใต้ลูกศร แล้วถอยเปิดทางให้เจ้าเดินต่อ","stat":"trust","value":2},{"id":"market_cart","places":["bkk_market","streets"],"title":"รถเข็นติดรอยแตก","text":"แม่ค้าจับรถเข็นที่ล้อติดร่องถนน “ของพวกนี้มีไว้ให้คนเจ็บ อย่าคว่ำมันนะ” เธอพูดโดยยังไม่ยอมเข้าใกล้เจ้า","reply":"ส่งสัญญาณก่อนช่วยดันรถเข็นจากอีกด้าน","outcome":"ล้อพ้นร่อง แม่ค้าดึงรถไปเองและยกมือขอบคุณจากระยะห่าง","stat":"humanity","value":2,"pressure":true},{"id":"ward_message","places":["hospital","bkk_ward"],"title":"ข้อความหน้าหอผู้ป่วย","text":"เสียงจากหน้าต่างถาม “ถ้าผ่านจุดพัก บอกเขาทีว่าเรายังมีคนเฝ้าเวร” คนพูดชูป้ายชื่อขึ้นให้เจ้าอ่าน","reply":"หยิบเศษกระดาษแถวนั้นมาจดข้อความ","outcome":"เจ้าจดชื่อกับตำแหน่งไว้ ผู้ฝากข้อความพยักหน้าก่อนปิดหน้าต่างเบา ๆ","stat":"sanity","value":2},{"id":"power_click","places":["bkk_power","shelter"],"title":"ไฟที่กะพริบสามครั้ง","text":"ช่างที่ระเบียงกะพริบไฟ “สามครั้งแปลว่าทางโล่ง จำได้ไหม?” คนด้านล่างตอบ “คราวนี้ขอให้เห็นกันจริง ๆ”","reply":"รอดูสัญญาณครบก่อนเคลื่อนผ่าน","outcome":"ช่างเห็นเจ้าหยุดรอ จึงยกไฟให้เห็นชัดแล้วชี้ช่องทางเดิน","stat":"sanity","value":1},{"id":"glass_path","places":["bkk_depot","streets"],"title":"เสียงแก้วใต้รองเท้า","text":"คนกวาดถนนกระซิบ “เดินขอบซ้าย ตรงกลางมีเศษแก้ว” เขาเอาไม้กวาดชี้แทนการเรียกเสียงดัง","reply":"ใช้เท้าดันเศษชิ้นใหญ่พ้นแนวเดินอย่างระวัง","outcome":"เขาทำเครื่องหมายเพิ่มตรงจุดคม แล้วปล่อยให้เจ้าเดินผ่านก่อน","stat":"trust","value":2},{"id":"cafe_board","places":["bkk_cafe","shelter"],"title":"ชื่อบนกระดานฝากข่าว","text":"คนเฝ้าร้านถามผ่านกระจก “เห็นคนถือกระเป๋าสีฟ้าบ้างไหม?” เมื่อเจ้าเงียบ เขาก็พูดต่อ “ไม่รู้ก็ไม่เป็นไร อย่าเดาเลย”","reply":"ส่ายหน้าอย่างตรงไปตรงมาแล้วอ่านป้ายให้จำได้","outcome":"เขาขอบคุณที่เจ้าไม่ให้ความหวังลอย ๆ ชื่อนั้นยังติดอยู่บนกระดาน","stat":"humanity","value":1},{"id":"offline_clock","places":["bkk_office","radio"],"title":"ข่าวที่เวลาไม่ตรงกัน","text":"คนเฝ้าประตูยกกระดาษสองใบ “ข่าวอพยพใบไหนใหม่กว่า?” เพื่อนข้างหลังเตือน “ดูเวลาที่จด อย่าดูแค่ตัวหนังสือใหญ่”","reply":"ชี้เวลาบนบันทึกและแยกฉบับเก่าออก","outcome":"พวกเขาติดข่าวเก่าไว้ในกองรอตรวจ ไม่มีใครรีบวิ่งตามข่าวที่ยังไม่แน่ชัด","stat":"research","value":1},{"id":"pier_rope","places":["bkk_pier","streets"],"title":"เชือกขึงที่ทางลงท่า","text":"ลูกเรือยกมือห้าม “อย่าเหยียบขั้นที่มีผ้าผูก มันโยก” เด็กข้างเขาถามเบา ๆ ว่า “เขาฟังเราออกจริงหรือ?”","reply":"ชี้ขั้นที่ต้องหลบและค่อย ๆ เดินอ้อมให้เห็น","outcome":"เด็กหยุดถาม ลูกเรือลดมือลงเมื่อแน่ใจว่าเจ้าระวังทางเดียวกับพวกเขา","stat":"trust","value":2},{"id":"parcel_label","places":["bkk_stockroom","bkk_market"],"title":"ชื่อผู้รับที่เลอะฝน","text":"หญิงคนหนึ่งประคองกล่องพัสดุอย่างทุลักทุเล “ตรงนี้เขียนว่าครัวหรือคลินิก?” เธอวางกล่องลงบนแท่นปูนแล้วถอยออกมาครึ่งก้าว เทปใสบนฉลากสะท้อนแสงจนอ่านแทบไม่ออก","reply":"จับมุมกล่องด้านที่ว่าง แล้วเอียงฉลากเข้าหาแสง","outcome":"เธออ่านออกจึงเข้ามาจับกล่องอีกด้าน เจ้าปล่อยมือเมื่อเธอประคองไว้มั่น แล้วถอยเปิดทางให้","stat":"humanity","value":2,"pressure":true},{"id":"bus_queue","places":["bkk_busyard","shelter"],"title":"ป้ายรถที่ไม่มีรถออก","text":"คนขับพูดกับกลุ่มที่รอว่า “รถคันนี้ไปไม่ได้แล้ว แต่ใช้เป็นจุดนัดพบได้” ใครบางคนถาม “แล้วคนที่มาช้าจะรู้ไหม?”","reply":"ช่วยหันป้ายให้คนจากถนนมองเห็น","outcome":"ป้ายใหม่หันรับทางเข้า คนขับเริ่มเช็กจำนวนคนอีกครั้ง","stat":"trust","value":2},{"id":"tunnel_echo","places":["nest","bkk_pier"],"title":"เสียงสะท้อนในทางมืด","text":"ผู้ติดเชื้ออีกตัวเลียนเสียงเคาะของเจ้า ก่อนหยุดเหมือนกำลังรอคำตอบ เสียงหายใจของคนเป็นอยู่ไกลออกไปอีกทาง","reply":"เคาะจังหวะสั้นให้มันตามออกจากทางของคนเป็น","outcome":"มันขยับตามเสียงช้า ๆ ทางแยกกลับมาเงียบโดยไม่มีใครถูกไล่ล่า","stat":"horde","value":1},{"id":"radio_static","places":["radio","bkk_office"],"title":"ประโยคที่ขาดหายบนคลื่น","text":"วิทยุบนขอบหน้าต่างดังว่า “ถ้าได้ยิน...อย่ามาตามเสียง...รอสัญญาณ...” คนถือวิทยุบ่น “ได้ยินไม่ครบก็อย่าเพิ่งสรุป”","reply":"หยุดฟังซ้ำและทำเครื่องหมายว่าข่าวยังไม่ยืนยัน","outcome":"เจ้าจำส่วนที่ได้ยินไว้โดยไม่เติมคำที่ขาด คลื่นเงียบลงก่อนเจ้าจะออกเดินต่อ","stat":"research","value":1},{"id":"rain_awning","places":["shelter","streets","bkk_cafe","bkk_market","bkk_stockroom"],"title":"ชายคาที่แบ่งกันใช้","text":"คนหลบฝนถอยจนชิดผนัง “อยู่ตรงนั้นก็ได้ แต่อย่าเข้ามาอีก” เขาพูดพร้อมชี้พื้นแห้งอีกมุมให้เจ้า","reply":"หยุดในระยะที่เขาขอและรอฝนซา","outcome":"ต่างฝ่ายต่างรักษาระยะ ฝนเบาลงโดยไม่มีใครต้องวิ่งหนีจากที่กำบัง","stat":"sanity","value":2,"choices":[{"text":"หยุดในระยะที่เขาขอและรอฝนซา","note":"สติ +2 · ต่างฝ่ายต่างรักษาระยะ","outcomeText":"ต่างฝ่ายต่างรักษาระยะ ฝนเบาลงโดยไม่มีใครต้องวิ่งหนีจากที่กำบัง","effects":[{"type":"stat.add","key":"sanity","value":2},{"type":"flag.set","id":"travel_rain_awning_waited","value":true}]},{"text":"ส่งสัญญาณว่ารับรู้ แล้วเดินต่อโดยรักษาระยะ","note":"ไม่เข้าใกล้ · เดินทางต่อกลางสายฝน","outcomeText":"อีกฝ่ายรับรู้ว่าเจ้าเข้าใจ เจ้าจึงก้าวเดินต่อฝ่าสายฝนโดยรักษาระยะห่าง","effects":[{"type":"flag.set","id":"travel_rain_awning_signaled","value":true}]},{"text":"หลบออกมาเงียบ ๆ โดยไม่ตอบ","note":"ไม่เปลี่ยนสถานะเพิ่มเติม · เดินทางต่อได้","outcomeText":"เจ้ารักษาระยะแล้วเดินต่อ เสียงสนทนาค่อย ๆ หายไปด้านหลัง","effects":[{"type":"flag.set","id":"travel_rain_awning_left","value":true}]}]},{"id":"water_bottle","places":["streets","bkk_depot","bkk_busyard","bkk_pier"],"title":"ขวดน้ำที่กลิ้งข้ามถนน","text":"เด็กคนหนึ่งชี้ขวดที่กลิ้งมาใกล้เจ้า “อันนั้นของแม่” ผู้ใหญ่รีบดึงเขากลับ “ยืนรอตรงนี้ อย่าเข้าไป”","reply":"กลิ้งขวดกลับไปช้า ๆ แล้วถอยให้พวกเขาเก็บ","outcome":"แม่หยิบขวดขึ้นเมื่อเจ้าถอยห่าง น้ำยังมีค่าสำหรับคนเป็น แม้จะไม่ช่วยความหิวของเจ้า","stat":"humanity","value":2},{"id":"night_window","places":["hospital","bkk_ward","bkk_power","bkk_office","bkk_winstop"],"title":"แสงจากหน้าต่างชั้นสอง","text":"เสียงเบาดังจากหน้าต่าง “ถ้าเข้าใจ ชูมือขึ้นก็พอ” เมื่อเจ้ายกมือ คนพูดเงียบไปพักหนึ่งก่อนบอกว่า “ยังมีใครอยู่ข้างในจริง ๆ ด้วย”","reply":"วางมือลงและรอให้เขาเป็นฝ่ายจบการสนทนา","outcome":"หน้าต่างค่อย ๆ ปิด แสงดวงนั้นยังไม่ดับหลังเจ้าเดินพ้นไป","stat":"sanity","value":2},{"id":"broken_footbridge","places":["shelter","bkk_winstop"],"routes":[["shelter","bkk_winstop"]],"once":true,"cooldownDays":3,"title":"บันไดสะพานลอยที่ขาดหาย","text":"ชายชราถือถุงผ้าค้างอยู่บนชานพักสะพานลอย ขั้นบันไดช่วงล่างหลุดหายไป เขาชะงักเมื่อเห็นเจ้า “อย่าเข้ามานะ... ฉันลงไปไม่ไหว” ข้างฐานสะพานมีแผ่นไม้หนาที่คนก่อนหน้าเคยวางพาดช่องขาดไว้","choices":[{"text":"ชี้แผ่นไม้กับราวจับให้เขาเห็น แล้วถอยออกมา","note":"ความไว้ใจ +2 · ช่วยบอกทางโดยไม่เข้าใกล้ · รวมอยู่ในวันเดินทาง","outcomeText":"เขาใช้ไม้พาดช่วงที่ขาดแล้วค่อย ๆ เกาะราวลงมา เมื่อถึงพื้นจึงพยักหน้าให้เจ้าจากอีกฟากทางเท้า","effects":[{"type":"stat.add","key":"trust","value":2}]},{"text":"เปิดทางให้เขา แล้วเดินเลี่ยงไปเงียบ ๆ","note":"สติ +1 · ไม่ได้ช่วยให้เขาลงมา · รวมอยู่ในวันเดินทาง","outcomeText":"เจ้าถอยจนเขาไม่ต้องระวังเงาของเจ้าอีก เขายังอยู่บนชานพัก มองหาวิธีลงต่อด้วยตัวเอง","effects":[{"type":"stat.add","key":"sanity","value":1}]}]},{"id":"bus_detour_paint","places":["shelter","bkk_busyard"],"routes":[["shelter","bkk_busyard"]],"once":true,"cooldownDays":3,"title":"รอยสีบนกระจกรถเมล์","text":"รถเมล์ร้างจอดขวางปากซอย กระจกมีคำเตือนสีแดงว่า “ซอย 4 มีฝูง อย่าผ่าน” คนขับที่หลบข้างล้อกำเหล็กแป๊บแน่น ด้านข้างมีรอยลูกศรจาง ๆ ชี้ไปทางซอย 2 ซึ่งยังเห็นทางเปิดอยู่","choices":[{"text":"ชี้คำเตือนกับลูกศร แล้วเปิดมือให้เห็นว่าไม่มีอาวุธ","note":"ความไว้ใจ +2 · ความเป็นมนุษย์ +1 · รวมอยู่ในวันเดินทาง","outcomeText":"คนขับมองตามมือของเจ้าแล้วค่อย ๆ ลดเหล็กแป๊บลง เขาขยับไปดูปากซอยด้วยตัวเอง ก่อนส่งสัญญาณให้เจ้าเดินผ่าน","effects":[{"type":"stat.add","key":"trust","value":2},{"type":"stat.add","key":"humanity","value":1}]},{"text":"รักษาระยะแล้วเดินอ้อมท้ายรถ","note":"สติ +1 · ไม่ปะทะกับคนขับ · รวมอยู่ในวันเดินทาง","outcomeText":"เจ้าเดินพ้นมุมอับโดยไม่เข้าใกล้ที่ซ่อน คนขับยังคงอยู่ข้างรถ แต่ไม่ได้ร้องเตือนใคร","effects":[{"type":"stat.add","key":"sanity","value":1}]}]},{"id":"canal_trapped_supplies","places":["streets","bkk_pier"],"routes":[["streets","bkk_pier"]],"once":true,"cooldownDays":4,"title":"ถุงเสบียงข้างตะแกรงคลอง","text":"ใกล้ทางลงท่าเรือ ชายหนุ่มบนแพเล็กกำลังดึงถุงเสบียงที่ติดตะแกรงดักขยะ รอยถลอกที่แขนมีเลือดซึม แพถูกกระแสน้ำดันชิดตะแกรงจนเขาขยับพายไม่ถนัด กลิ่นเลือดทำให้เจ้าต้องหยุดตั้งสติ","choices":[{"text":"ใช้ไม้ริมทางเขี่ยถุงให้หลุด แล้วดันแพออกห่างตะแกรง","note":"ความเป็นมนุษย์ +2 · ความหิว +4 · ช่วยคน +1 · เสบียงเป็นของเขา · รวมอยู่ในวันเดินทาง","pressure":true,"outcomeText":"เขาคว้าถุงไว้ได้และเริ่มพายพ้นกระแสน้ำวน เจ้าวางไม้ลงก่อนที่กลิ่นเลือดจะรบกวนมากกว่านี้","effects":[{"type":"stat.add","key":"humanity","value":2},{"type":"stat.add","key":"hunger","value":4},{"type":"memory.record","key":"saved"}]},{"text":"หันจากกลิ่นเลือด แล้วเดินต่อโดยไม่เข้าใกล้","note":"สติ +1 · ยังไม่ได้ช่วยเขา · ไม่เพิ่มอำนาจฝูง · รวมอยู่ในวันเดินทาง","outcomeText":"เจ้าเดินเลียบขอบทางโดยไม่หันไปมองรอยแผลอีก เสียงพายกระทบตะแกรงยังดังอยู่ด้านหลัง","effects":[{"type":"stat.add","key":"sanity","value":1}]}]}]) EVENTS.push({id:'travel.'+d.id,title:d.title,text:d.text,locations:d.places,routes:d.routes,travelDialogue:true,once:d.once??false,cooldownDays:d.cooldownDays??5,choices:d.choices ? d.choices.map((c,i)=>({id:'travel.'+d.id+'.choice.'+i,...c})) : [
          {id:'travel.'+d.id+'.reply',text:d.reply,note:({trust:'ความไว้ใจ',humanity:'ความเป็นมนุษย์',sanity:'สติ',research:'งานวิจัย',horde:'อำนาจฝูง'}[d.stat])+' +'+d.value,pressure:d.pressure||false,outcomeText:d.outcome,effects:[{type:'stat.add',key:d.stat,value:d.value}]},
          {id:'travel.'+d.id+'.signal',text:'ส่งสัญญาณว่ารับรู้ แล้วเดินต่อโดยรักษาระยะ',note:'ไม่เข้าใกล้ · ไม่เปลี่ยนสถานะเพิ่มเติม',outcomeText:'อีกฝ่ายรับรู้ว่าเจ้าเข้าใจ เจ้าจึงเดินต่อโดยรักษาระยะห่าง',effects:[]},
          {id:'travel.'+d.id+'.leave',text:'หลบออกมาเงียบ ๆ โดยไม่ตอบ',note:'ไม่เปลี่ยนสถานะเพิ่มเติม · เดินทางต่อได้',outcomeText:'เจ้ารักษาระยะแล้วเดินต่อ เสียงสนทนาค่อย ๆ หายไปด้านหลัง',effects:[]}
        ]});
        // END BANGKOK OCCUPATION CONTENT
        return { PLACES, ACTIONS, EVENTS, ENDINGS, ROUTES: meta.ROUTES, LABELS: { ...meta.LABELS, instinct: "\u0E2A\u0E31\u0E0D\u0E0A\u0E32\u0E15\u0E0D\u0E32\u0E13" }, STATS: S.STATS, TRAITS: {}, BODY_TRAITS: {}, ORIGINS: {}, STRAINS: {}, FLAGS, NPCS: {}, RESOURCES: {} };
      });
    }
  });

  // ../../tmp/after-zero-zombie/core/random.js
  var require_random = __commonJS({
    "../../tmp/after-zero-zombie/core/random.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory();
        else {
          root.ZombieCore = root.ZombieCore || {};
          root.ZombieCore.Random = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        function next(s) {
          s.seed = Math.imul(s.seed, 1664525) + 1013904223 >>> 0;
          return s.seed / 4294967296;
        }
        return { next };
      });
    }
  });

  // ../../tmp/after-zero-zombie/core/conditions.js
  var require_conditions = __commonJS({
    "../../tmp/after-zero-zombie/core/conditions.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory();
        else {
          root.ZombieCore = root.ZombieCore || {};
          root.ZombieCore.Conditions = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        const own = (o, k) => o != null && Object.hasOwn(o, k), safe = (k) => typeof k === "string" && /^[a-zA-Z][a-zA-Z0-9_.-]{0,119}$/.test(k) && !k.split(".").some((x) => ["__proto__", "constructor", "prototype"].includes(x));
        function validate(c, registry) {
          if (!c || typeof c !== "object" || Array.isArray(c)) throw Error("Invalid condition");
          const keys = Object.keys(c);
          if (keys.length === 1 && ["all", "any"].includes(keys[0])) {
            if (!Array.isArray(c[keys[0]])) throw Error("Invalid condition group");
            c[keys[0]].forEach((x) => validate(x, registry));
            return true;
          }
          if (keys.length === 1 && keys[0] === "not") {
            validate(c.not, registry);
            return true;
          }
          const shapes = { stat: ["kind", "key", "min", "max"], memory: ["kind", "key", "min", "max"], item: ["kind", "key", "min"], trait: ["kind", "id"], flag: ["kind", "id", "value"], npc: ["kind", "id", "field", "value"], resource: ["kind", "id", "min"], location: ["kind", "id"], day: ["kind", "min", "max"] };
          if (!shapes[c.kind] || keys.some((k) => !shapes[c.kind].includes(k))) throw Error("Unknown condition");
          for (const k of ["key", "id"]) if (c[k] !== void 0 && !safe(c[k])) throw Error("Unsafe condition key");
          for (const k of ["min", "max"]) if (c[k] !== void 0 && (!Number.isFinite(c[k]) || c[k] < 0)) throw Error("Invalid condition bound");
          if (c.min !== void 0 && c.max !== void 0 && c.min > c.max) throw Error("Inverted condition bounds");
          const defs = registry || {};
          if (c.kind === "stat" && !own(defs.STATS || {}, c.key)) throw Error("Unknown stat condition");
          if (c.kind === "memory" && (!["saved", "killed", "corpseMeals", "endured"].includes(c.key) || ["min", "max"].some((k) => c[k] !== void 0 && !Number.isInteger(c[k])))) throw Error("Unknown/invalid memory condition");
          if (c.kind === "item" && !["supplies", "medicine", "samples"].includes(c.key)) throw Error("Unknown item condition");
          for (const [kind, group] of [["trait", "TRAITS"], ["flag", "FLAGS"], ["npc", "NPCS"], ["resource", "RESOURCES"], ["location", "PLACES"]]) if (c.kind === kind && !own(defs[group] || {}, c.id)) throw Error("Unknown " + kind + " condition");
          if (c.kind === "flag" && typeof c.value !== (defs.FLAGS[c.id].type || "boolean")) throw Error("Invalid flag condition value");
          if (c.kind === "npc" && !["alive", "state", "trust"].includes(c.field)) throw Error("Unknown NPC condition field");
          return true;
        }
        function meets(s, c, registry) {
          if (!c) return true;
          validate(c, registry);
          if (c.all) return c.all.every((x) => meets(s, x, registry));
          if (c.any) return c.any.some((x) => meets(s, x, registry));
          if (c.not) return !meets(s, c.not, registry);
          switch (c.kind) {
            case "stat":
              return s.stats[c.key] >= (c.min ?? 0) && s.stats[c.key] <= (c.max ?? Infinity);
            case "memory":
              return s.memory[c.key] >= (c.min ?? 0) && s.memory[c.key] <= (c.max ?? Infinity);
            case "item":
              return s.items[c.key] >= (c.min ?? 1);
            case "trait":
              return s.evolution.acquired.includes(c.id);
            case "flag":
              return (s.story.flags[c.id] ?? registry.FLAGS[c.id].default) === c.value;
            case "npc":
              return s.world.npcs[c.id]?.[c.field] === c.value;
            case "resource":
              return (s.world.resources[c.id]?.remaining ?? 0) >= (c.min ?? 1);
            case "location":
              return s.place === c.id;
            case "day":
              return s.day >= (c.min ?? 1) && s.day <= (c.max ?? Infinity);
            default:
              return false;
          }
        }
        return { safe, validate, meets };
      });
    }
  });

  // ../../tmp/after-zero-zombie/core/effects.js
  var require_effects = __commonJS({
    "../../tmp/after-zero-zombie/core/effects.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_schema(), require_conditions(), require_contract(), require_state_utils());
        else {
          root.ZombieCore = root.ZombieCore || {};
          root.ZombieCore.Effects = factory(root.ZombieCore.Schema, root.ZombieCore.Conditions, root.ZombieCore.Contract, root.ZombieCore.Utils);
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(S, Q, K, U) {
        "use strict";
        const own = (o, k) => Object.hasOwn(o || {}, k);
        const scopes = { survival: ["stat.add", "condition.set", "injury.add", "injury.remove"], evolution: ["stat.add", "trait.acquire"], world: ["stat.add", "flag.set", "resource.consume", "npc.set", "location.threat.add", "followup.schedule"], content: ["stat.add", "item.add", "flag.set", "injury.add", "injury.remove", "resource.consume", "npc.set", "location.threat.add", "followup.schedule", "memory.record"], engine: ["stat.add", "item.add", "counter.add"] };
        function validate(op, C, owner = "content") {
          if (!op || !scopes[owner]?.includes(op.type)) throw Error("Unsupported/forbidden effect: " + op?.type);
          const shapes = { "stat.add": ["type", "key", "value"], "item.add": ["type", "key", "value"], "flag.set": ["type", "id", "value"], "counter.add": ["type", "key", "value"], "condition.set": ["type", "key", "value"], "injury.add": ["type", "id", "severity"], "injury.remove": ["type", "id"], "trait.acquire": ["type", "id", "evidence"], "resource.consume": ["type", "id", "instanceId", "amount"], "npc.set": ["type", "id", "field", "value", "minimum"], "location.threat.add": ["type", "id", "value"], "followup.schedule": ["type", "eventId", "earliestDay", "context"], "memory.record": ["type", "key"] };
          if (Object.keys(op).some((k) => !shapes[op.type].includes(k))) throw Error("Unknown effect field");
          for (const k of ["key", "id", "eventId"]) if (op[k] !== void 0 && !Q.safe(op[k])) throw Error("Unsafe effect key");
          if (["stat.add", "item.add", "counter.add", "location.threat.add"].includes(op.type) && (!Number.isFinite(op.value) || Math.abs(op.value) > 2e3)) throw Error("Invalid numeric effect");
          if (op.type === "stat.add") {
            if (!own(S.STATS, op.key)) throw Error("Unknown stat");
            const allowed = owner === "survival" ? ["hp", "hunger", "sanity"] : owner === "evolution" ? ["mutation", "instinct"] : owner === "world" ? ["hp", "sanity", "trust", "horde"] : Object.keys(S.STATS);
            if (!allowed.includes(op.key)) throw Error("Stat owner mismatch");
          }
          if (op.type === "item.add" && !["supplies", "medicine", "samples"].includes(op.key)) throw Error("Unknown item");
          if (op.type === "counter.add" && (!K.BEHAVIOR.includes(op.key) || !Number.isInteger(op.value) || op.value < 0)) throw Error("Invalid behavior counter");
          if (op.type === "memory.record" && !["saved", "killed"].includes(op.key)) throw Error("Invalid canonical memory fact");
          if (op.type === "condition.set" && (op.key !== "starvationDays" || !Number.isInteger(op.value) || op.value < 0 || op.value > S.MAX_DAY)) throw Error("Unknown/invalid body condition");
          if (op.type.startsWith("injury.") && (!K.INJURIES.includes(op.id) || op.type === "injury.add" && (!Number.isInteger(op.severity) || op.severity < 1 || op.severity > 3))) throw Error("Unknown/invalid injury");
          if (op.type === "flag.set" && (!own(C.FLAGS, op.id) || typeof op.value !== C.FLAGS[op.id].type)) throw Error("Unknown/invalid flag");
          if (op.type === "trait.acquire" && (!own(C.TRAITS, op.id) || !op.evidence || !Q.safe(op.evidence.id) || typeof op.evidence.text !== "string" || op.evidence.text.length > 600)) throw Error("Unknown trait/evidence");
          if (op.type === "resource.consume" && (!own(C.RESOURCES, op.id) || typeof op.instanceId !== "string" || !Number.isInteger(op.amount) || op.amount < 1 || op.amount > 999)) throw Error("Unknown/invalid resource");
          if (op.type === "npc.set") {
            if (!own(C.NPCS, op.id) || !["alive", "state", "trust"].includes(op.field)) throw Error("Unknown NPC field");
            if (op.minimum !== void 0 && (op.minimum !== true || op.field !== "trust")) throw Error("Invalid NPC minimum");
            if (op.field === "alive" && typeof op.value !== "boolean" || op.field === "state" && !(C.NPCS[op.id].states || []).includes(op.value) || op.field === "trust" && (!Number.isFinite(op.value) || op.value < 0 || op.value > 100)) throw Error("Invalid NPC value");
          }
          if (op.type === "location.threat.add" && !own(C.PLACES, op.id)) throw Error("Unknown location");
          if (op.type === "followup.schedule" && (!C.EVENTS.some((e) => e.id === op.eventId) || !Number.isInteger(op.earliestDay) || op.earliestDay < 1 || op.earliestDay > S.MAX_DAY || !op.context || Array.isArray(op.context) || typeof op.context !== "object")) throw Error("Invalid followup");
          return true;
        }
        function record(s, tags) {
          for (const tag of tags || []) {
            if (!K.BEHAVIOR.includes(tag)) throw Error("Unknown behavior tag");
            const b = s.behavior[tag];
            b.count++;
            b.lastDay = s.day;
            if (!b.days.includes(s.day)) b.days.push(s.day);
          }
        }
        function apply(s, ops, { registry: C, owner = "content" } = {}) {
          if (!Array.isArray(ops)) throw Error("Invalid effects");
          ops.forEach((op) => validate(op, C, owner));
          const next = S.copy(s);
          for (const op of ops) {
            switch (op.type) {
              case "stat.add":
                next.stats[op.key] += op.value;
                break;
              case "item.add":
                if (next.items[op.key] + op.value < 0) throw Error("Not enough items");
                next.items[op.key] += op.value;
                break;
              case "flag.set":
                next.story.flags[op.id] = op.value;
                break;
              case "counter.add":
                for (let i = 0; i < op.value; i++) record(next, [op.key]);
                break;
              case "memory.record":
                if (!Number.isSafeInteger(next.memory[op.key]) || next.memory[op.key] >= 120) throw Error("Canonical memory limit");
                next.memory[op.key]++;
                if (!next.memory[op.key + "On"]) next.memory[op.key + "On"] = next.day;
                break;
              case "condition.set":
                next.body[op.key] = op.value;
                break;
              case "injury.add": {
                const old = next.body.injuries.find((x) => x.id === op.id);
                if (old) old.severity = op.severity;
                else next.body.injuries.push({ id: op.id, severity: op.severity });
                break;
              }
              case "injury.remove":
                next.body.injuries = next.body.injuries.filter((x) => x.id !== op.id);
                break;
              case "trait.acquire":
                if (!next.evolution.acquired.includes(op.id)) {
                  next.evolution.acquired.push(op.id);
                  next.evolution.stages.push({ id: op.id, day: next.day });
                  next.evolution.evidence.push({ ...op.evidence, day: next.day });
                }
                break;
              case "resource.consume": {
                const r = next.world.resources[op.id];
                if (!r || r.instanceId !== op.instanceId || r.remaining < op.amount) throw Error("Resource exhausted or stale");
                r.remaining -= op.amount;
                break;
              }
              case "npc.set":
                if (!next.world.npcs[op.id]) throw Error("Missing NPC instance");
                if (op.field === 'trust') NpcRelationships.changeTrust(next.world.npcs[op.id], {day:next.day,kind:'story',amount:op.value,mode:op.minimum?'floor':'set',key:next.pending?.eventId || 'world'});
                else next.world.npcs[op.id][op.field] = op.value;
                break;
              case "location.threat.add":
                next.world.locations[op.id].threat = U.clamp(next.world.locations[op.id].threat + op.value, 0, 100);
                break;
              case "followup.schedule":
                if (next.story.scheduled.length >= 100) throw Error("Followup capacity");
                next.story.scheduled.push({ eventId: op.eventId, earliestDay: op.earliestDay, context: S.copy(op.context) });
                break;
            }
          }
          U.normalize(next);
          Object.assign(s, next);
        }
        function legacy(s, effects = []) {
          if (!Array.isArray(effects)) throw Error("Invalid legacy effects");
          const next = S.copy(s);
          for (const fx of effects) {
            if (fx.type !== "stat" || !/^(stats|items|memory)[.][a-z]+$/i.test(fx.path) || !Number.isFinite(fx.value)) throw Error("Invalid authored effect");
            const [g, k] = fx.path.split(".");
            if (!own(next[g], k)) throw Error("Unknown effect key");
            next[g][k] += fx.value;
            if (g === "memory" && ["saved", "killed"].includes(k) && !next.memory[k + "On"]) next.memory[k + "On"] = next.day;
          }
          U.normalize(next);
          Object.assign(s, next);
        }
        return { validate, apply, legacy, record, scopes };
      });
    }
  });

  // ../../tmp/after-zero-zombie/core/modules.js
  var require_modules = __commonJS({
    "../../tmp/after-zero-zombie/core/modules.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_contract());
        else {
          root.ZombieCore = root.ZombieCore || {};
          root.ZombieCore.Modules = factory(root.ZombieCore.Contract);
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(K) {
        "use strict";
        const defaults = {
          Survival: { choicePressure(view, choice) {
            return choice.pressure && view.stats.hunger >= 75 ? { ops: [{ type: "stat.add", key: "hp", value: -3 }, { type: "stat.add", key: "sanity", value: -6 }], notices: [{ text: "\u0E40\u0E08\u0E49\u0E32\u0E1D\u0E37\u0E19\u0E40\u0E02\u0E49\u0E32\u0E43\u0E01\u0E25\u0E49\u0E04\u0E19\u0E17\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48\u0E2B\u0E34\u0E27\u0E08\u0E31\u0E14 \u0E2A\u0E15\u0E34 -6 \xB7 \u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E -3 \u0E41\u0E15\u0E48\u0E22\u0E31\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E21\u0E48\u0E01\u0E34\u0E19", kind: "danger" }] } : K.empty();
          }, adjustAction: (view, action) => ({ effects: action.effects || [], notices: [] }), endDay(view) {
            const hunger = view.stats.hunger + 8;
            const damage = hunger >= 100 ? 20 : hunger >= 85 ? 10 : 0;
            return { ops: [{ type: "stat.add", key: "hunger", value: 8 }, { type: "stat.add", key: "sanity", value: -1 }, ...damage ? [{ type: "stat.add", key: "hp", value: -damage }] : []], notices: damage ? [{ text: damage === 20 ? "\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E01\u0E31\u0E14\u0E01\u0E34\u0E19\u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22 \u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E -20" : "\u0E2D\u0E14\u0E2D\u0E22\u0E32\u0E01\u0E08\u0E19\u0E23\u0E48\u0E32\u0E07\u0E40\u0E23\u0E34\u0E48\u0E21\u0E1E\u0E31\u0E07 \u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E -10", kind: "danger" }] : [] };
          } },
          Origins: { create: () => ({ originId: "legacy", strainId: "common", bodyTraits: [], startPlace: "shelter", statDeltas: {}, openingEventId: "awakening" }) },
          Evolution: { evaluate: K.empty },
          World: { afterDecision: K.empty, endDay: K.empty },
          Director: { select(view, trigger, ctx) {
            const C = ctx.registry;
            if (trigger.kind === "action") {
              const a = trigger.action;
              if (a.encounter) return { eventId: a.encounter, context: { place: view.place } };
              if (a.ending) return null;
              const candidates = C.EVENTS.filter((e) => e.tags?.includes(a.eventTag || "quiet") && view.day - (view.eventHistory[e.id] ?? -20) >= 4);
              if (!candidates.length || ctx.random() > 0.62) return null;
              return { eventId: candidates[Math.floor(ctx.random() * candidates.length)].id, context: { place: view.place } };
            }
            const story = C.EVENTS.find((e) => e.day === view.day && !view.seen.includes(e.id));
            const consequence = C.EVENTS.find((e) => e.followup && view.memory[e.followup] > 0 && view.day >= view.memory[e.followup + "On"] + 2 && !view.seen.includes(e.id));
            const next = story || consequence;
            return next ? { eventId: next.id, context: { place: view.place } } : null;
          } }
        };
        function resolve(overrides = {}) {
          const all = { ...defaults, ...overrides };
          for (const [name, methods] of Object.entries({ Survival: ["adjustAction", "endDay"], Origins: ["create"], Evolution: ["evaluate"], World: ["afterDecision", "endDay"], Director: ["select"] })) {
            if (methods.some((k) => typeof all[name]?.[k] !== "function")) throw Error("Incomplete module contract: " + name);
          }
          return all;
        }
        return { defaults, resolve };
      });
    }
  });

  // ../../tmp/after-zero-zombie/core/modifiers.js
  var require_modifiers = __commonJS({
    "../../tmp/after-zero-zombie/core/modifiers.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_contract());
        else {
          root.ZombieCore = root.ZombieCore || {};
          root.ZombieCore.Modifiers = factory(root.ZombieCore.Contract);
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(K) {
        "use strict";
        function collect(s, C) {
          const out = { healingMultiplier: 1, hungerDailyDelta: 0, travelHpCost: 0, scavengeHpCost: 0, threatDelta: 0 };
          for (const [id, defs] of [...s.bodyTraits.map((id2) => [id2, C.BODY_TRAITS]), ...s.evolution.acquired.map((id2) => [id2, C.TRAITS])]) {
            const def = defs[id];
            if (!def) throw Error("Unknown modifier definition " + id);
            for (const [k, v] of Object.entries(def.modifiers || {})) {
              if (!K.MODIFIERS.includes(k) || !Number.isFinite(v) || Math.abs(v) > 100 || k === "healingMultiplier" && v < 0) throw Error("Invalid trait modifier");
              if (k === "healingMultiplier") out[k] *= v;
              else out[k] += v;
            }
          }
          return K.deepFreeze(out);
        }
        return { collect };
      });
    }
  });

  // ../../tmp/after-zero-zombie/core/view-model.js
  var require_view_model = __commonJS({
    "../../tmp/after-zero-zombie/core/view-model.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_contract());
        else {
          root.ZombieCore = root.ZombieCore || {};
          root.ZombieCore.ViewModel = factory(root.ZombieCore.Contract);
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(K) {
        "use strict";
        function build(s, extras = {}) {
          const C = extras.registry || {}, known = extras.discoveredEndings || [];
          const named = (id, defs, fallback) => ({ id, name: defs?.[id]?.name || fallback || id });
          const traitDetails = s.evolution.acquired.map((id) => ({ ...named(id, C.TRAITS), benefit: C.TRAITS?.[id]?.benefit || "", tradeoff: C.TRAITS?.[id]?.tradeoff || "", evidence: s.evolution.evidence.filter((e) => e.traitId === id || !e.traitId && e.id === id + ".evidence") }));
          const storyFollowups = s.story.scheduled.filter((item) => /^(clinic|pack|remnant)\./.test(item.eventId)).map((item) => {
            const event = C.EVENTS?.find((event2) => event2.id === item.eventId), place = event?.location || s.place;
            return { id: item.eventId, title: event?.title || item.eventId, place, placeName: C.PLACES?.[place]?.short || place, earliestDay: item.earliestDay };
          });
          return K.snapshot({ version: s.version, runId: s.runId, day: s.day, place: s.place, placeName: C.PLACES?.[s.place]?.short || s.place, origin: { id: s.originId, strain: s.strainId, bodyTraits: s.bodyTraits, name: named(s.originId, C.ORIGINS, s.originId === "legacy" ? "\u0E15\u0E49\u0E19\u0E01\u0E33\u0E40\u0E19\u0E34\u0E14\u0E40\u0E14\u0E34\u0E21" : null).name, strainName: named(s.strainId, C.STRAINS, s.strainId === "common" ? "\u0E2A\u0E32\u0E22\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C\u0E17\u0E31\u0E48\u0E27\u0E44\u0E1B" : null).name, bodies: s.bodyTraits.map((id) => ({ ...named(id, C.BODY_TRAITS), benefit: C.BODY_TRAITS?.[id]?.benefit || "", tradeoff: C.BODY_TRAITS?.[id]?.tradeoff || "" })) }, primaryStats: Object.fromEntries(["hp", "hunger", "sanity"].map((k) => [k, { value: s.stats[k], max: 100 }])), secondaryStats: s.stats, symptoms: s.body.injuries, starvationDays: s.body.starvationDays, localThreat: s.world.locations[s.place].threat, traits: s.evolution.acquired, traitDetails, evidence: s.evolution.evidence, journal: s.log, ending: s.ending, pending: s.pending, storyFollowups, actions: (extras.actions || []).map((a) => ({ ...a, visible: !a.ending || known.includes(a.ending) })), choices: extras.choices || [], discoveredEndings: known.filter((id) => Object.hasOwn(C.ENDINGS || {}, id)), archive: extras.archive || [] });
        }
        return { build };
      });
    }
  });

  // ../../tmp/after-zero-zombie/core/trait-threat.js
  var require_trait_threat = __commonJS({
    "../../tmp/after-zero-zombie/core/trait-threat.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory();
        else {
          root.ZombieCore = root.ZombieCore || {};
          root.ZombieCore.TraitThreat = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        function proposal(view, facts, ctx) {
          const value = ctx.modifiers.threatDelta;
          if (facts.kind !== "action" || !value) return { ops: [], notices: [] };
          return { ops: [{ type: "location.threat.add", id: view.place, value }], notices: [{ kind: "danger", text: "\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E08\u0E32\u0E01\u0E23\u0E48\u0E32\u0E07\u0E17\u0E35\u0E48\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E44\u0E1B \xB7 \u0E20\u0E31\u0E22\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E43\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48 " + (value >= 0 ? "+" : "") + value }] };
        }
        return Object.freeze({ proposal });
      });
    }
  });

  // ../../tmp/after-zero-zombie/engine.js
  var require_engine = __commonJS({
    "../../tmp/after-zero-zombie/engine.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_catalog(), require_state_utils(), require_random(), require_schema(), require_contract(), require_effects(), require_conditions(), require_modules(), require_modifiers(), require_view_model(), require_trait_threat());
        else root.ZombieEngine = factory(root.ZombieCatalog, root.ZombieCore.Utils, root.ZombieCore.Random, root.ZombieCore.Schema, root.ZombieCore.Contract, root.ZombieCore.Effects, root.ZombieCore.Conditions, root.ZombieCore.Modules, root.ZombieCore.Modifiers, root.ZombieCore.ViewModel, root.ZombieCore.TraitThreat);
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(Base, U, R, S, K, F, Q, Modules, Modifiers, VM, TraitThreat) {
        "use strict";
        function build(overrides = {}, additions = {}) {
          const C = K.snapshot({ ...Base, ...additions }), systems = Modules.resolve(overrides);
          const own = (o, k) => Object.hasOwn(o, k), empty = () => ({ ops: [], notices: [] });
          function context(s, phase, random = false) {
            return Object.freeze({ day: s.day, phase, turnId: s.lifecycle.activeTurn, registry: C, modifiers: Modifiers.collect(s, C), ...random ? { random: () => R.next(s) } : {} });
          }
          function proposal(s, p, owner) {
            K.assertProposal(p);
            F.apply(s, p.ops, { registry: C, owner });
            for (const n of p.notices) U.log(s, n.text, n.kind);
          }
          function effects(s, list, owner = "content") {
            if (!list.length) return;
            if (list.every((x) => x.type === "stat")) F.legacy(s, list);
            else if (list.every((x) => x.type !== "stat")) F.apply(s, list, { registry: C, owner });
            else throw Error("Do not mix legacy and typed effects");
          }
          function transition(s, fn) {
            try {
              const next = S.copy(s), result = fn(next);
              if (!result.ok) return result;
              const checked = S.validate(next, C);
              for (const k of Object.keys(s)) delete s[k];
              Object.assign(s, checked);
              return result;
            } catch (error) {
              return { ok: false, reason: error.message };
            }
          }
          function create(seed = Date.now(), options = {}) {
            const s = S.create(seed, C, options), origin = options.careerStart
              ? {originId:'legacy',strainId:'common',bodyTraits:[],startPlace:options.careerStart.place,openingEventId:'career.awakening',statDeltas:{}}
              : systems.Origins.create(K.snapshot(s), context(s, "create", true));
            if (options.careerStart) s.characterProfile = S.copy(options.careerStart.profile);
            if (!origin || !own(C.PLACES, origin.startPlace) || !C.EVENTS.some((e) => e.id === origin.openingEventId)) throw Error("Invalid origin result");
            s.originId = origin.originId;
            s.strainId = origin.strainId;
            s.bodyTraits = S.copy(origin.bodyTraits);
            s.place = origin.startPlace;
            s.contentVersion = C.CONTENT_VERSION || s.contentVersion;
            F.apply(s, Object.entries(origin.statDeltas).map(([key, value]) => ({ type: "stat.add", key, value })), { registry: C, owner: "engine" });
            s.pending.eventId = origin.openingEventId;
            s.pending.context.place = s.place;
            s.seen = [origin.openingEventId];
            return S.validate(s, C);
          }
          function actions(s) {
            const travel = C.PLACES[s.place].neighbors.map((id) => ({ id: "move:" + id, name: "\u0E44\u0E1B" + C.PLACES[id].short, glyph: "\u2192", note: "\u0E22\u0E49\u0E32\u0E22\u0E2A\u0E16\u0E32\u0E19\u0E17\u0E35\u0E48 \xB7 \u0E43\u0E0A\u0E49 1 \u0E27\u0E31\u0E19", move: id, effects: [], behaviorTags: [] }));
            return [...C.ACTIONS, ...travel];
          }
          function requirements(s, action) {
            if (s.npcEncounter) return ['ต้องตัดสินใจเหตุการณ์ผู้รอดชีวิตที่ค้างอยู่ก่อน'];
            const reasons = [];
            if (!action) return ["\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E19\u0E35\u0E49"];
            if (s.ending) reasons.push("\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E19\u0E35\u0E49\u0E08\u0E1A\u0E25\u0E07\u0E41\u0E25\u0E49\u0E27");
            if (s.pending) reasons.push("\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E04\u0E33\u0E15\u0E2D\u0E1A\u0E02\u0E2D\u0E07\u0E40\u0E2B\u0E15\u0E38\u0E01\u0E32\u0E23\u0E13\u0E4C\u0E01\u0E48\u0E2D\u0E19");
            if (action.places && !action.places.includes(s.place)) reasons.push("\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E1B" + action.places.map((id) => C.PLACES[id].short).join(" / ") + " \xB7 \u0E15\u0E2D\u0E19\u0E19\u0E35\u0E49\u0E2D\u0E22\u0E39\u0E48" + C.PLACES[s.place].short);
            if (action.move && !C.PLACES[s.place].neighbors.includes(action.move)) reasons.push("\u0E44\u0E21\u0E48\u0E21\u0E35\u0E17\u0E32\u0E07\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E08\u0E32\u0E01\u0E17\u0E35\u0E48\u0E19\u0E35\u0E48");
            for (const [key, value] of Object.entries(action.cost || {})) if (s.items[key] < value) reasons.push(C.LABELS[key] + " " + s.items[key] + "/" + value);
            for (const [key, value] of Object.entries(action.min || {})) if (s.stats[key] < value) reasons.push(C.LABELS[key] + " " + Math.floor(s.stats[key]) + "/" + value);
            if (action.requirements && !Q.meets(s, action.requirements, C)) reasons.push("\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E07\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E02\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21");
            if (action.maxCampaign && s.stats.campaign >= action.maxCampaign) reasons.push("\u0E22\u0E36\u0E14\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E41\u0E25\u0E30\u0E20\u0E39\u0E21\u0E34\u0E20\u0E32\u0E04\u0E41\u0E25\u0E49\u0E27 \u0E02\u0E31\u0E49\u0E19\u0E2A\u0E38\u0E14\u0E17\u0E49\u0E32\u0E22\u0E2D\u0E22\u0E39\u0E48\u0E17\u0E35\u0E48\u0E2B\u0E2D\u0E27\u0E34\u0E17\u0E22\u0E38");
            if (action.id === "campaign" && s.stats.campaign === 1) {
              if (s.stats.horde < 75) reasons.push("\u0E2D\u0E33\u0E19\u0E32\u0E08\u0E1D\u0E39\u0E07 " + s.stats.horde + "/75");
              if (s.stats.mutation < 55) reasons.push("\u0E01\u0E25\u0E32\u0E22\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C " + s.stats.mutation + "/55");
            }
            return reasons;
          }
          function choiceReasons(s, choice) {
            if (!choice) return ["\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01"];
            const reasons = [];
            if (choice.carryBlood && (s.carriedBloodBags || 0) >= 1) reasons.push("พกเลือดได้ครั้งละ 1 ถุง ใช้ถุงที่มีอยู่ก่อน");
            if (choice.bloodCost && s.bloodLeft < choice.bloodCost) reasons.push("\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E43\u0E0A\u0E49\u0E44\u0E14\u0E49\u0E2B\u0E21\u0E14\u0E41\u0E25\u0E49\u0E27");
            for (const [key, value] of Object.entries(choice.cost || {})) if (s.items[key] < value) reasons.push(C.LABELS[key] + " " + s.items[key] + "/" + value);
            for (const [key, value] of Object.entries(choice.min || {})) if (s.stats[key] < value) reasons.push(C.LABELS[key] + " " + s.stats[key] + "/" + value);
            if (choice.requirements && !Q.meets(s, choice.requirements, C)) reasons.push("\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E07\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E02\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01");
            if (choice.costs?.length) try {
              F.apply(S.copy(s), choice.costs, { registry: C, owner: "content" });
            } catch (e) {
              reasons.push(e.message);
            }
            if (systems.World.choiceReasons) {
              const extra = systems.World.choiceReasons(K.snapshot(s), K.snapshot(choice), context(s, "choiceReasons"));
              if (!Array.isArray(extra) || extra.some((x) => typeof x !== "string" || x.length > 600)) throw Error("Invalid World choice reasons");
              reasons.push(...extra);
            }
            return reasons;
          }
          function pay(s, cost) {
            for (const [key, value] of Object.entries(cost || {})) s.items[key] -= value;
          }
          function deriveEngineCauseOfDeath(s, id, explicitCauseCode) {
            const day = s.day || 1;
            const hunger = s.stats?.hunger ?? 0;
            const sanity = s.stats?.sanity ?? 0;
            const starvationDays = s.body?.starvationDays ?? 0;
            const weather = s.story?.flags?.["next.weather"];
            const place = s.place || "shelter";
            const recentLog = (s.log || []).slice(0, 4).map((l) => l?.text || "").join(" ");
            const causeHint = String(explicitCauseCode || s.ending?.causeCode || "").toLowerCase();
            const isHumanAttack = causeHint === "human_attack" || causeHint === "attack" || /\[ภัยพื้นที่.*ปะทะ|ถูกยิง|โดนยิง|ซุ่มยิง|กระสุน|ลูกซอง|ปืนกล|แทง|หอกประดิษฐ์|ทหาร|ด่านทหาร|กลุ่มพลเรือนติดอาวุธ|ระดมยิง|ฝ่าด่านทหาร/.test(recentLog);
            const isColdOrRain = causeHint === "hypothermia" || /ฝนเขม่า|ฝนกรด|พายุฝน|หนาวสั่น|เย็นเฉียบ|อุณหภูมิร่างกายลด|ตู้แช่/.test(recentLog) || (weather === "rain" && ["streets", "radio", "tower", "nest"].includes(place) && !isHumanAttack && hunger < 85 && starvationDays < 2);
            if (causeHint === "bombardment" || id === "bombed" || ((id === "survivor" || id === "death") && day >= S.MAX_DAY)) {
              return {
                code: "BOMBARDMENT",
                categoryLabel: "Bombardment · ปฏิบัติการทิ้งระเบิดเพลิงปูพรม",
                title: "ถูกเผาผลาญจากปฏิบัติการทิ้งระเบิดเพลิงกวาดล้างกรุงเทพฯ (Operation Firestorm)",
                description: "เมื่อครบกำหนดเส้นตาย 120 วัน ฝูงบินทิ้งระเบิดได้ปูพรมระเบิดเพลิงความร้อนสูงเหนือเขตกักกันกรุงเทพฯ คลื่นความร้อนและแรงอัดอากาศกวาดล้างทุกชีวิตที่ยังติดอยู่ในพื้นที่ปิดล้อม"
              };
            }
            if (causeHint === "surrender" || id === "madness") {
              return {
                code: "SURRENDER",
                categoryLabel: "Mind Collapse · ยอมจำนนต่อสัญชาตญาณดิบ",
                title: "ปล่อยวางสติสัมปชัญญะและยอมให้เชื้อกลืนกินตัวตนโดยสมบูรณ์",
                description: "เจ้าเลือกหยุดฝืนต้านทานเสียงเพรียกของไวรัสในสมอง ปล่อยให้ความทรงจำสุดท้ายดับวูบลง ร่างนี้จึงไม่เหลือตัวตนเดิมอีกต่อไปและเดินลากขาไปตามสัญชาตญาณดิบ"
              };
            }
            if (id === "death" && isHumanAttack) {
              return {
                code: "HUMAN_ATTACK",
                categoryLabel: "Human Attack · ถูกมนุษย์ทำร้ายจนตาย",
                title: "บาดแผลฉกรรจ์จากการถูกมนุษย์ใช้อาวุธโจมตี",
                description: "ความเสียหายจากอาวุธปืนและของมีคมของกลุ่มคนเป็นทำให้โครงสร้างร่างกายแหลกสลายจนสภาพร่างดิ่งลงสู่ 0/100"
              };
            }
            if (causeHint === "starvation" || ((id === "death" || id === "feral") && (hunger >= 85 || starvationDays >= 2))) {
              return {
                code: "STARVATION",
                categoryLabel: "Starvation · ภาวะอดอยากรุนแรง",
                title: "ภาวะอดอยากรุนแรงจนเซลล์กลายพันธุ์กัดกินเนื้อเยื่อตัวเอง (Cellular Autophagy)",
                description: "ความหิวโหยพุ่งสูงถึงขีดสุด (" + Math.floor(hunger) + "/100) โดยไร้สารอาหารหรือเลือดหล่อเลี้ยง เชื้อไวรัสจึงหันมาย่อยสลายอวัยวะภายในและแกนประสาทของร่างนี้จนล้มพับลง"
              };
            }
            if (id === "death" && isColdOrRain) {
              return {
                code: "HYPOTHERMIA",
                categoryLabel: "Hypothermia · ภาวะตัวเย็นเกินและพิษฝนเขม่า",
                title: "ภาวะตัวเย็นเกินเฉียบพลันท่ามกลางพายุฝนเขม่าดำ (Black Rain Hypothermia)",
                description: "การตากพายุฝนเขม่าพิษและลมหนาวกลางแจ้งติดต่อกันทำให้อุณหภูมิแกนกลางของร่างกายดิ่งลงต่ำกว่าจุดวิกฤต ระบบไหลเวียนเลือดที่ติดเชื้อแข็งตัวและหยุดทำงานในที่สุด"
              };
            }
            if (causeHint === "feral_madness" || id === "feral") {
              return {
                code: "FERAL_MADNESS",
                categoryLabel: "Feral Madness · สติสัมปชัญญะแตกสลาย",
                title: "สติสัมปชัญญะพังทลายจากความตื่นตระหนกและเสียงกระซิบของเชื้อ (Feral Mind Death)",
                description: "ความตึงเครียดและบาดแผลทางใจกัดกร่อนสติจนเหลือ " + Math.floor(sanity) + "/100 สมองส่วนเหตุผลถูกเชื้อยึดครองโดยสมบูรณ์จนกลายเป็นซอมบี้คลุ้มคลั่งไร้สติ"
              };
            }
            if (id === "silent_guardian") {
              return {
                code: "HEROIC_SACRIFICE",
                categoryLabel: "Heroic Sacrifice · ยืนหยัดปกป้องจนลมหายใจสุดท้าย",
                title: "สละร่างยืนขวางฝูงผีดิบหน้าประตูหลุมหลบภัยจนผู้รอดชีวิตปลอดภัย",
                description: "แม้อวัยวะและกล้ามเนื้อจะฉีกขาดจากการรับคมเขี้ยวแทนผู้รอดชีวิตในห้องแถว แต่ร่างนี้ยังคงยืนขวางทางเข้าไว้จนวินาทีสุดท้ายที่หัวใจหยุดเต้น"
              };
            }
            if (id === "death") {
              return {
                code: "FATAL_TRAUMA",
                categoryLabel: "Fatal Trauma · บาดแผลฉกรรจ์เกินขีดจำกัด",
                title: "เนื้อเยื่อและอวัยวะเสียหายหนักเกินกว่าเซลล์กลายพันธุ์จะสมานไหว",
                description: "บาดแผลจากการปะทะ การเสียเลือดสะสม และความเสียหายต่อโครงสร้างร่างกายทำให้สภาพร่างดิ่งลงถึง 0/100 ร่างนี้จึงทรุดลงและหยุดเคลื่อนไหวไปตลอดกาล"
              };
            }
            const endingMeta = C.ENDINGS[id] || { title: "สิ้นสุดบันทึกการเดินทาง", text: "" };
            return {
              code: "SURVIVAL_RESOLUTION",
              categoryLabel: "Chronicle Resolution · บทสรุปชะตากรรม",
              title: endingMeta.title,
              description: endingMeta.text
            };
          }
          function finish(s, id, explicitCauseCode) {
            const causeOfDeath = deriveEngineCauseOfDeath(s, id, explicitCauseCode);
            s.ending = { id, day: s.day, causeCode: causeOfDeath.code.toLowerCase(), causeOfDeath };
            s.pending = null;
            s.lifecycle.activeTurn = null;
            U.log(s, C.ENDINGS[id].title + " — " + causeOfDeath.title, "ending");
            s.chronicle.milestones.push({ id: "cause." + causeOfDeath.code.toLowerCase(), day: s.day, text: "สาเหตุ: " + causeOfDeath.title });
            s.chronicle.milestones.push({ id: "ending." + id, day: s.day, text: C.ENDINGS[id].title });
            s.chronicle.milestones = s.chronicle.milestones.slice(-100);
          }
          function select(s, trigger) {
            let result;
            if (trigger.kind === 'action' && trigger.action.move) {
              const candidates = C.EVENTS.filter(e => e.travelDialogue && e.locations.includes(s.place) && (!e.routes || e.routes.some(route => route.includes(trigger.fromPlace) && route.includes(s.place))) && (!e.once || !s.seen.includes(e.id)) && (s.eventHistory[e.id] === void 0 || s.day - s.eventHistory[e.id] >= e.cooldownDays));
              candidates.sort((a,b) => (s.eventHistory[a.id] ?? -1) - (s.eventHistory[b.id] ?? -1));
              const oldest = candidates.filter(e => (s.eventHistory[e.id] ?? -1) === (s.eventHistory[candidates[0]?.id] ?? -1));
              const pick = oldest.length && R.next(s) < 0.8 ? oldest[Math.floor(R.next(s) * oldest.length)] : null;
              result = pick ? {eventId:pick.id,context:{place:s.place,fromPlace:trigger.fromPlace},recordHistory:true} : null;
            } else result = systems.Director.select(K.snapshot(s), K.snapshot(trigger), context(s, trigger.kind === "action" ? "actionEvent" : "morning", true));
            if (!result) return null;
            const event = C.EVENTS.find((e) => e.id === result.eventId);
            if (!event || !result.context || typeof result.context !== "object" || Array.isArray(result.context)) throw Error("Invalid director result");
            if (result.recordHistory !== void 0 && typeof result.recordHistory !== "boolean") throw Error("Invalid director history marker");
            if (result.scheduledIndex !== void 0) {
              const i = result.scheduledIndex, item = s.story.scheduled[i];
              if (!Number.isInteger(i) || i < 0 || !item || item.eventId !== event.id || item.earliestDay > s.day || JSON.stringify({ place: s.place, ...item.context }) !== JSON.stringify(result.context)) throw Error("Invalid scheduled selection");
            }
            return { event, context: result.context, recordHistory: result.recordHistory, scheduledIndex: result.scheduledIndex };
          }
          function openEvent(s, selected, turn) {
            s.pending = S.pending(s, selected.event.id, turn, selected.context);
            if (selected.scheduledIndex !== void 0) s.story.scheduled.splice(selected.scheduledIndex, 1);
            if ((!turn || selected.recordHistory) && !s.seen.includes(selected.event.id)) s.seen.push(selected.event.id);
            if (turn || selected.recordHistory) s.eventHistory[selected.event.id] = s.day;
          }
          function finishDay(s, endingCandidate) {
            const turn = s.lifecycle.activeTurn;
            if (!turn || turn === s.lifecycle.lastCommittedTurn) throw Error("Day already committed");
            proposal(s, systems.Survival.endDay(K.snapshot(s), context(s, "endDay")), "survival");
            proposal(s, systems.World.endDay(K.snapshot(s), context(s, "endDay")), "world");
            U.normalize(s);
            s.completedDays++;
            s.lifecycle.lastCommittedTurn = turn;
            s.lifecycle.activeTurn = null;
            s.feralDays = s.stats.sanity === 0 ? s.feralDays + 1 : 0;
            if (s.stats.hp <= 0) {
              const deathCause = (s.stats.hunger >= 85 || (s.body?.starvationDays || 0) >= 2) ? "starvation" : (s.story?.flags?.["next.weather"] === "rain" && ["streets", "radio", "tower", "nest"].includes(s.place)) ? "hypothermia" : "fatal_trauma";
              return finish(s, "death", deathCause);
            }
            if (s.feralDays >= 3) {
              const feralCause = (s.stats.hunger >= 85 || (s.body?.starvationDays || 0) >= 2) ? "starvation" : "feral_madness";
              return finish(s, "feral", feralCause);
            }
            if (endingCandidate) return finish(s, endingCandidate);
            if (s.day >= S.MAX_DAY) return finish(s, "survivor", "bombardment");
            proposal(s, systems.Evolution.evaluate(K.snapshot(s), context(s, "evolution")), "evolution");
            s.day++;
            const next = select(s, { kind: "morning" });
            if (next) openEvent(s, next, false);
          }
          function adjusted(s, action) {
            const p = systems.Survival.adjustAction(K.snapshot(s), K.snapshot(action), context(s, "adjustAction"));
            if (!p || !Array.isArray(p.effects) || !Array.isArray(p.notices)) throw Error("Invalid adjustAction result");
            K.assertProposal({ ops: [], notices: p.notices });
            return p;
          }
          function previewAction(s, id) {
            const action = actions(s).find((a) => a.id === id), reasons = requirements(s, action);
            if (!action) return { id, enabled: false, reasons, effects: [], notices: [], dayCost: 1 };
            const p = adjusted(S.copy(s), action), threat = TraitThreat.proposal({ ...s, place: action.move || s.place }, { kind: "action" }, context(s, "preview"));
            const costs = costInfo(action);
            return K.snapshot({ id: action.id, name: action.name, enabled: reasons.length === 0, reasons, effects: p.effects, notices: [...p.notices, ...threat.notices], worldEffects: threat.ops, costs, effectSummary: effectSummary(p.effects), costSummary: costSummary(costs), ending: action.ending || null, dayCost: 1 });
          }
          function choicePressure(s, choice) {
            const hook = systems.Survival.choicePressure || Modules.defaults.Survival.choicePressure;
            return K.assertProposal(hook(K.snapshot(s), K.snapshot(choice), context(s, "choicePressure")));
          }
          function costInfo(choice) {
            return { items: { ...choice.cost || {} }, blood: choice.bloodCost || 0, operations: S.copy(choice.costs || []) };
          }
          function effectSummary(list) {
            return list.filter((f) => f.type === "stat" && /^(stats|items)\./.test(f.path) || f.type === "stat.add" || f.type === "item.add").map((f) => {
              const key = f.key || f.path.split(".")[1];
              return (C.LABELS[key] || key) + " " + (f.value >= 0 ? "+" : "") + f.value;
            });
          }
          function costSummary(info) {
            return [...Object.entries(info.items).map(([k, v]) => "\u0E43\u0E0A\u0E49 " + C.LABELS[k] + " " + v), ...info.blood ? ["\u0E43\u0E0A\u0E49\u0E40\u0E25\u0E37\u0E2D\u0E14 " + info.blood + " \u0E16\u0E38\u0E07"] : [], ...info.operations.map((op) => ["item.add", "stat.add"].includes(op.type) ? "\u0E43\u0E0A\u0E49 " + C.LABELS[op.key] + " " + Math.abs(op.value) : op.type === "resource.consume" ? "\u0E43\u0E0A\u0E49 " + (C.RESOURCES[op.id]?.name || "\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E32\u0E01\u0E23") + " " + op.amount : "\u0E15\u0E49\u0E19\u0E17\u0E38\u0E19\u0E15\u0E32\u0E21\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01")];
          }
          function previewChoice(s, index) {
            const event = s.pending ? C.EVENTS.find((e) => e.id === s.pending.eventId) : null, choice = event?.choices[index];
            if (!choice) return K.snapshot({ index, enabled: false, reasons: ["\u0E44\u0E21\u0E48\u0E21\u0E35\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E19\u0E35\u0E49"], effects: [], notices: [], pressureOps: [], costs: { items: {}, blood: 0, operations: [] }, effectSummary: [], costSummary: [] });
            const p = choicePressure(S.copy(s), choice), reasons = choiceReasons(s, choice), costs = costInfo(choice);
            const projected = S.copy(s), trustNotes=[];
            for(const op of choice.effects||[]) if(op.type==='npc.set'&&op.field==='trust') {
              const before=projected.world.npcs[op.id].trust;
              F.apply(projected,[op],{registry:C,owner:'content'});
              const after=projected.world.npcs[op.id].trust;
              const name={'next.ing':'อิง','next.nuan':'นวล','remnant.mali':'มาลี','clinic.dr_wichai':'หมอวิชัย'}[op.id]||'อีกฝ่าย';
              trustNotes.push('ความไว้ใจของ'+name+' '+(after-before>=0?'+':'')+(after-before)+' (เป็น '+after+'/100)');
            }
            const previewNote=trustNotes.length?[...(choice.note||'').split(' · ').filter(part=>!/^ความไว้ใจของ/.test(part)),...trustNotes].join(' · '):(choice.note||'');
            return K.snapshot({ id: choice.id, index, text: choice.text, note: previewNote, enabled: !s.ending && reasons.length === 0, reasons, effects: S.copy(choice.effects || []), pressureOps: p.ops, notices: p.notices, costs, effectSummary: effectSummary(choice.effects || []), costSummary: costSummary(costs), dayCost: s.pending.turn ? 1 : 0 });
          }
          function previewDay(s) {
            const projected = S.copy(s), p = K.assertProposal(systems.Survival.endDay(K.snapshot(projected), context(projected, "preview")));
            F.apply(projected, p.ops, { registry: C, owner: "survival" });
            const w = K.assertProposal(systems.World.endDay(K.snapshot(projected), context(projected, "preview")));
            F.apply(projected, w.ops, { registry: C, owner: "world" });
            return K.snapshot({ ops: [...p.ops, ...w.ops], notices: [...p.notices, ...w.notices] });
          }
          function afterDecision(s, facts) {
            proposal(s, TraitThreat.proposal(K.snapshot(s), K.snapshot(facts), context(s, "afterDecision")), "world");
            proposal(s, systems.World.afterDecision(K.snapshot(s), K.snapshot(facts), context(s, "afterDecision")), "world");
          }
          function act(s, id) {
            return transition(s, (next) => {
              const action = actions(next).find((a) => a.id === id), reasons = requirements(next, action);
              if (reasons.length) return { ok: false, reason: reasons.join(" \xB7 ") };
              next.lifecycle.activeTurn = next.runId + ":turn:" + (next.completedDays + 1);
              const p = adjusted(next, action);
              pay(next, action.cost);
              effects(next, p.effects);
              for (const n of p.notices) U.log(next, n.text, n.kind);
              const fromPlace = next.place;
              if (action.move) next.place = action.move;
              F.record(next, action.behaviorTags);
              U.log(next, action.name + (action.cost ? " \xB7 \u0E43\u0E0A\u0E49 " + Object.entries(action.cost).map(([k, v]) => C.LABELS[k] + " " + v).join(", ") : ""), action.ending ? "story" : "routine");
              if (action.id === "scavenge") {
                U.log(next, "อาหารกระป๋องเหล่านี้มีค่าสำหรับคนเป็น แต่กระเพาะที่ตายด้านไม่รับรู้รส มีเพียงกลิ่นเลือดเท่านั้นที่ระงับความหิวได้", "routine");
              }
              afterDecision(next, { kind: "action", actionId: action.id, behaviorTags: action.behaviorTags || [] });
              if (next.stats.hp <= 0) {
                finishDay(next);
                return { ok: true };
              }
              const event = select(next, { kind: "action", action, fromPlace });
              if (event) openEvent(next, event, true);
              else finishDay(next, action.ending);
              return { ok: true };
            });
          }
          function choose(s, index, expectedInstanceId) {
            return transition(s, (next) => {
              if (next.ending || !next.pending) return { ok: false, reason: "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E40\u0E2B\u0E15\u0E38\u0E01\u0E32\u0E23\u0E13\u0E4C\u0E23\u0E2D\u0E40\u0E25\u0E37\u0E2D\u0E01" };
              if (expectedInstanceId !== void 0 && expectedInstanceId !== next.pending.instanceId) return { ok: false, reason: "\u0E40\u0E2B\u0E15\u0E38\u0E01\u0E32\u0E23\u0E13\u0E4C\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27" };
              const pending = next.pending, event = C.EVENTS.find((e) => e.id === pending.eventId), choice = Number.isInteger(index) ? event?.choices[index] : null;
              if (!choice) return { ok: false, reason: "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E19\u0E35\u0E49" };
              const reasons = choiceReasons(next, choice);
              if (reasons.length) return { ok: false, reason: reasons.join(" \xB7 ") };
              if (next.lifecycle.resolved.includes(pending.instanceId)) return { ok: false, reason: "\u0E40\u0E2B\u0E15\u0E38\u0E01\u0E32\u0E23\u0E13\u0E4C\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27" };
              if (choice.bloodCost) next.bloodLeft -= choice.bloodCost;
              if (choice.carryBlood) next.carriedBloodBags = (next.carriedBloodBags || 0) + 1;
              proposal(next, choicePressure(next, choice), "survival");
              pay(next, choice.cost);
              if (choice.costs?.length) F.apply(next, choice.costs, { registry: C, owner: "content" });
              effects(next, choice.effects || []);
              F.record(next, choice.behaviorTags);
              for (const f of choice.followups || []) F.apply(next, [{ type: "followup.schedule", eventId: f.eventId, earliestDay: Math.min(S.MAX_DAY, next.day + f.afterDays), context: f.context || { place: next.place } }], { registry: C, owner: "content" });
              afterDecision(next, { kind: "choice", eventId: event.id, choiceId: choice.id, instanceId: pending.instanceId, context: pending.context, behaviorTags: choice.behaviorTags || [] });
              next.lifecycle.resolved.push(pending.instanceId);
              next.lifecycle.resolved = next.lifecycle.resolved.slice(-200);
              next.pending = null;
              U.log(next, event.title + " \u2014 " + choice.text, "story");
              if (choice.outcomeText) U.log(next, choice.outcomeText, "story");
              if (pending.turn) finishDay(next);
              else if (next.stats.hp <= 0) finish(next, "death");
              return { ok: true };
            });
          }
          function setRoute(s, route) {
            if (!own(C.ROUTES, route)) return false;
            return transition(s, (next) => {
              next.route = route;
              return { ok: true };
            }).ok;
          }
          function pendingEvent(s) {
            const event = s.pending ? C.EVENTS.find((e) => e.id === s.pending.eventId) : null;
            if (event?.id === 'career.awakening' && s.characterProfile) {
              const bio=s.characterProfile, place=C.PLACES[s.place];
              return {...event,title:'ลืมตาขึ้นที่'+place.short,text:'เจ้าตื่นขึ้นที่'+place.name+' โดยไม่มีเสียงหัวใจเต้น '+bio.clothingClue+'ยังอยู่บนตัว และ'+bio.signatureItemName+'ยังอยู่ใกล้มือ ความทรงจำบอกว่าก่อนติดเชื้อ เจ้าเป็น'+bio.occupation+' แม้ร่างจะเปลี่ยนไป แต่ความคุ้นเคยจากชีวิตเดิมยังอยู่'};
            }
            if (event?.travelDialogue) {
              const from = C.PLACES[s.pending.context?.fromPlace]?.short;
              const to = C.PLACES[s.place].short;
              return {...event,text:(from ? 'ระหว่างทางจาก'+from+' มุ่งหน้าสู่'+to+' — ' : 'ระหว่างทางเข้าสู่'+to+' — ')+event.text};
            }
            if (!event || event.id !== "prey") return event;
            const scenes = {
              "world.prey": "ชายบาดเจ็บติดอยู่ในร้านขายยา",
              "world.prey.2": "ชายอีกคนกุมแผลอยู่หลังซากรถเมล์",
              "world.prey.3": "ชายสวมเสื้อช่างนั่งพิงกำแพงในซอยแคบ เลือดซึมจากขาของเขา",
              "world.prey.4": "ชายส่งของบาดเจ็บหลบอยู่ข้างรถเข็นที่พลิกคว่ำ",
              "world.prey.5": "ชายวัยกลางคนลากขาที่บาดเจ็บอยู่ใต้ทางเดินยกระดับ",
              "world.prey.6": "ชายหนุ่มกดผ้าห้ามเลือดอยู่หลังแผงขายของร้าง"
            };
            const scene = scenes[s.pending.context?.resourceId] || "ผู้บาดเจ็บคนหนึ่งหลบอยู่ริมถนน";
            return { ...event, text: scene + " เขาเห็นเจ้าแล้วพยายามลากตัวถอย กลิ่นเลือดบอกว่าเขาเป็นอาหาร แต่เขากำลังขอให้ช่วย" };
          }
          function viewModel(s, extras = {}) {
            const previews = actions(s).map((a) => previewAction(s, a.id));
            const event = s.pending ? C.EVENTS.find((e) => e.id === s.pending.eventId) : null;
            const choices = event ? event.choices.map((c, i) => previewChoice(s, i)) : [];
            return VM.build(s, { ...extras, registry: C, actions: previews, choices });
          }
          return { VERSION: S.VERSION, MAX_DAY: S.MAX_DAY, CONTRACT_VERSION: K.VERSION, create, actions, requirements, choiceReasons, act, choose, setRoute, validate: (input) => S.validate(input, C), readStatePath: U.readStatePath, previewAction, previewChoice, previewDay, CONTRACT_REVISION: K.REVISION, pendingEvent, viewModel, withSystems: build };
        }
        return build();
      });
    }
  });

  // ../../tmp/after-zero-zombie/data/survival.js
  var require_survival = __commonJS({
    "../../tmp/after-zero-zombie/data/survival.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory();
        else {
          root.ZombieData = root.ZombieData || {};
          root.ZombieData.Survival = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        function freeze(value) {
          if (value && typeof value === "object") {
            Object.values(value).forEach(freeze);
            Object.freeze(value);
          }
          return value;
        }
        return freeze({
          LIMITS: { hp: 100, hunger: 100, starvationDays: 120 },
          HUNGER: {
            daily: 8,
            minimumDaily: 1,
            sanityDaily: -1,
            starvationAt: 85,
            recoveryBelow: 75,
            recoveryDays: 2,
            // Sustained starvation must eventually outpace free rest, even with healing traits.
            damageTiers: [{ min: 100, damage: 20 }, { min: 85, damage: 10 }, { min: 0, damage: 0 }],
            chronicDamagePerDay: 2,
            chronicDamageMax: 12
          },
          HEALING: {
            // These limit restoration, never remove existing health merely for crossing a tier.
            ceilings: [{ min: 100, hp: 40 }, { min: 85, hp: 60 }, { min: 75, hp: 80 }, { min: 0, hp: 100 }],
            chronicCeilingLoss: 15
          },
          PRESSURE: { threshold: 75, hpCost: 3, sanityCost: 6, actionIds: ["share"] },
          INJURIES: {
            leg_wound: { name: "\u0E41\u0E1C\u0E25\u0E17\u0E35\u0E48\u0E02\u0E32", travelHpCost: 3 },
            arm_wound: { name: "\u0E41\u0E1C\u0E25\u0E17\u0E35\u0E48\u0E41\u0E02\u0E19", scavengeHpCost: 2 },
            torn_tissue: { name: "\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E40\u0E22\u0E37\u0E48\u0E2D\u0E09\u0E35\u0E01\u0E02\u0E32\u0E14", healingMultiplier: 0.8, dailyHpCost: 1 }
          },
          // Known legacy searches use the same effort modifier; world food pools are untouched.
          SEARCH_ACTIONS: ["scavenge", "labsearch"],
          RECOVERY: { hungerBelow: 75, hpAtLeast: 60, severityPerDay: 1 }
        });
      });
    }
  });

  // ../../tmp/after-zero-zombie/systems/survival.js
  var require_survival2 = __commonJS({
    "../../tmp/after-zero-zombie/systems/survival.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_survival());
        else {
          root.ZombieSystems = root.ZombieSystems || {};
          root.ZombieSystems.Survival = factory(root.ZombieData.Survival);
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(D) {
        "use strict";
        const clamp = (n, max) => Math.max(0, Math.min(max, n));
        const notice = (text, kind = "danger") => ({ text, kind });
        const stat = (key, value) => ({ type: "stat", path: "stats." + key, value });
        const modifiers = (ctx) => ({ healingMultiplier: 1, hungerDailyDelta: 0, travelHpCost: 0, scavengeHpCost: 0, ...ctx?.modifiers });
        const injuries = (view) => (view.body?.injuries || []).map((injury) => ({ ...injury, rule: D.INJURIES[injury.id] })).filter((injury) => injury.rule);
        function dayPolicy(view, m, hunger = view.stats.hunger) {
          const nextHunger = clamp(hunger + Math.max(D.HUNGER.minimumDaily, D.HUNGER.daily + m.hungerDailyDelta), D.LIMITS.hunger);
          const previous = view.body.starvationDays;
          const starving = nextHunger >= D.HUNGER.starvationAt;
          const starvationDays = clamp(starving ? previous + 1 : nextHunger < D.HUNGER.recoveryBelow ? previous - D.HUNGER.recoveryDays : previous, D.LIMITS.starvationDays);
          const baseDamage = D.HUNGER.damageTiers.find((tier) => nextHunger >= tier.min).damage;
          const chronicDamage = starving ? Math.min(D.HUNGER.chronicDamageMax, Math.max(0, starvationDays - 1) * D.HUNGER.chronicDamagePerDay) : 0;
          const ceiling = Math.max(0, Math.min(
            D.HEALING.ceilings.find((tier) => nextHunger >= tier.min).hp,
            D.LIMITS.hp - starvationDays * D.HEALING.chronicCeilingLoss
          ));
          const woundDamage = injuries(view).reduce((total, i) => total + (i.rule.dailyHpCost || 0) * i.severity, 0);
          return { hunger: nextHunger, starvationDays, ceiling, hungerDamage: baseDamage + chronicDamage, woundDamage };
        }
        function adjustAction(view, action, ctx) {
          const m = modifiers(ctx), notices = [];
          const effects = (action.effects || []).map((effect) => ({ ...effect }));
          const hunger = clamp(view.stats.hunger + effects.reduce((total, fx) => total + (fx.type === "stat" && fx.path === "stats.hunger" ? fx.value : 0), 0), D.LIMITS.hunger);
          const policy = dayPolicy(view, m, hunger), wounds = injuries(view);
          const healingMultiplier = wounds.reduce((value, i) => value * Math.pow(i.rule.healingMultiplier ?? 1, i.severity), m.healingMultiplier);
          let hp = view.stats.hp;
          for (const fx of effects) {
            if (fx.type !== "stat" || fx.path !== "stats.hp") continue;
            if (fx.value > 0) {
              const authored = fx.value;
              fx.value = Math.min(Math.max(0, policy.ceiling - hp), Math.floor(authored * healingMultiplier));
              if (fx.value !== authored) notices.push(notice("\u0E1F\u0E37\u0E49\u0E19\u0E23\u0E48\u0E32\u0E07\u0E44\u0E14\u0E49 " + fx.value + " \u0E08\u0E32\u0E01 " + authored + " \xB7 \u0E40\u0E1E\u0E14\u0E32\u0E19\u0E1F\u0E37\u0E49\u0E19\u0E23\u0E48\u0E32\u0E07 " + policy.ceiling + " \u0E08\u0E32\u0E01\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E2A\u0E30\u0E2A\u0E21\u0E41\u0E25\u0E30\u0E2A\u0E20\u0E32\u0E1E\u0E23\u0E48\u0E32\u0E07"));
            }
            hp += fx.value;
          }
          const travel = Boolean(action.move), search = D.SEARCH_ACTIONS.includes(action.id);
          let effort = travel ? m.travelHpCost : search ? m.scavengeHpCost : 0;
          for (const injury of wounds) {
            const extra = (travel ? injury.rule.travelHpCost : search ? injury.rule.scavengeHpCost : 0) || 0;
            if (extra) {
              effort += extra * injury.severity;
              notices.push(notice(injury.rule.name + " \u0E23\u0E30\u0E14\u0E31\u0E1A " + injury.severity + " \xB7 \u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E19\u0E35\u0E49\u0E40\u0E2A\u0E35\u0E22\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E\u0E40\u0E1E\u0E34\u0E48\u0E21 " + extra * injury.severity));
            }
            if (injury.rule.healingMultiplier && effects.some((fx) => fx.type === "stat" && fx.path === "stats.hp" && fx.value >= 0)) notices.push(notice(injury.rule.name + " \u0E23\u0E30\u0E14\u0E31\u0E1A " + injury.severity + " \xB7 \u0E1F\u0E37\u0E49\u0E19\u0E23\u0E48\u0E32\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D " + Math.round(Math.pow(injury.rule.healingMultiplier, injury.severity) * 100) + "% \u0E01\u0E48\u0E2D\u0E19\u0E04\u0E34\u0E14 trait \u0E41\u0E25\u0E30\u0E40\u0E1E\u0E14\u0E32\u0E19\u0E1F\u0E37\u0E49\u0E19\u0E23\u0E48\u0E32\u0E07"));
          }
          const authoredDamage = effects.reduce((total, fx) => total + (fx.type === "stat" && fx.path === "stats.hp" && fx.value < 0 ? -fx.value : 0), 0);
          effort = Math.max(-authoredDamage, effort);
          if (effort) {
            effects.push(stat("hp", -effort));
            notices.push(notice("\u0E41\u0E23\u0E07\u0E17\u0E35\u0E48\u0E43\u0E0A\u0E49\u0E08\u0E32\u0E01\u0E2A\u0E20\u0E32\u0E1E\u0E23\u0E48\u0E32\u0E07\u0E41\u0E25\u0E30 trait \xB7 \u0E1B\u0E23\u0E31\u0E1A\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E " + -effort));
          }
          if (D.PRESSURE.actionIds.includes(action.id) && hunger >= D.PRESSURE.threshold) {
            effects.push(stat("hp", -D.PRESSURE.hpCost), stat("sanity", -D.PRESSURE.sanityCost));
            notices.push(notice("\u0E0A\u0E48\u0E27\u0E22\u0E04\u0E19\u0E02\u0E13\u0E30\u0E2B\u0E34\u0E27\u0E08\u0E31\u0E14 \xB7 \u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E -" + D.PRESSURE.hpCost + " \xB7 \u0E2A\u0E15\u0E34 -" + D.PRESSURE.sanityCost + " \xB7 \u0E22\u0E31\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E17\u0E19\u0E2B\u0E34\u0E27\u0E44\u0E14\u0E49"));
          }
          const encounter = ctx?.registry?.EVENTS?.find((event) => event.id === action.encounter);
          if (hunger >= D.PRESSURE.threshold && encounter?.choices.some((choice) => choice.pressure)) notices.push(notice("\u0E2B\u0E32\u0E01\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E0A\u0E48\u0E27\u0E22\u0E04\u0E19\u0E43\u0E19\u0E40\u0E2B\u0E15\u0E38\u0E01\u0E32\u0E23\u0E13\u0E4C\u0E02\u0E13\u0E30\u0E2B\u0E34\u0E27\u0E08\u0E31\u0E14 \xB7 \u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E -" + D.PRESSURE.hpCost + " \xB7 \u0E2A\u0E15\u0E34 -" + D.PRESSURE.sanityCost + " \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E08\u0E32\u0E01\u0E1C\u0E25\u0E02\u0E2D\u0E07\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01 \xB7 \u0E16\u0E2D\u0E22\u0E2B\u0E23\u0E37\u0E2D\u0E17\u0E19\u0E2B\u0E34\u0E27\u0E44\u0E14\u0E49"));
          if (policy.hungerDamage) notices.push(notice("\u0E2B\u0E32\u0E01\u0E44\u0E21\u0E48\u0E21\u0E35\u0E1C\u0E25\u0E08\u0E32\u0E01\u0E40\u0E2B\u0E15\u0E38\u0E01\u0E32\u0E23\u0E13\u0E4C: \u0E2A\u0E34\u0E49\u0E19\u0E27\u0E31\u0E19\u0E2B\u0E34\u0E27 " + policy.hunger + " \xB7 \u0E2D\u0E14\u0E2A\u0E30\u0E2A\u0E21 " + policy.starvationDays + " \u0E27\u0E31\u0E19 \xB7 \u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E -" + policy.hungerDamage));
          if (policy.woundDamage) notices.push(notice("\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E40\u0E22\u0E37\u0E48\u0E2D\u0E09\u0E35\u0E01\u0E02\u0E32\u0E14 \xB7 \u0E2A\u0E34\u0E49\u0E19\u0E27\u0E31\u0E19\u0E40\u0E2A\u0E35\u0E22\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E " + policy.woundDamage));
          return { effects, notices };
        }
        function endDay(view, ctx) {
          const policy = dayPolicy(view, modifiers(ctx)), notices = [];
          const damage = policy.hungerDamage + policy.woundDamage;
          const ops = [
            { type: "stat.add", key: "hunger", value: policy.hunger - view.stats.hunger },
            { type: "stat.add", key: "sanity", value: D.HUNGER.sanityDaily },
            { type: "condition.set", key: "starvationDays", value: policy.starvationDays }
          ];
          if (damage) ops.push({ type: "stat.add", key: "hp", value: -Math.min(view.stats.hp, damage) });
          if (policy.hungerDamage) notices.push(notice("\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E01\u0E31\u0E14\u0E01\u0E34\u0E19\u0E23\u0E48\u0E32\u0E07 \xB7 \u0E2D\u0E14\u0E2A\u0E30\u0E2A\u0E21 " + policy.starvationDays + " \u0E27\u0E31\u0E19 \xB7 \u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E -" + policy.hungerDamage + " \xB7 \u0E40\u0E1E\u0E14\u0E32\u0E19\u0E1F\u0E37\u0E49\u0E19\u0E23\u0E48\u0E32\u0E07 " + policy.ceiling));
          if (policy.woundDamage) notices.push(notice("\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E40\u0E22\u0E37\u0E48\u0E2D\u0E09\u0E35\u0E01\u0E02\u0E32\u0E14 \xB7 \u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E -" + policy.woundDamage));
          if (policy.starvationDays < view.body.starvationDays) notices.push(notice("\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E2A\u0E32\u0E23\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E1E\u0E2D\u0E1B\u0E23\u0E30\u0E17\u0E31\u0E07 \xB7 \u0E2D\u0E14\u0E2A\u0E30\u0E2A\u0E21\u0E40\u0E2B\u0E25\u0E37\u0E2D " + policy.starvationDays + " \u0E27\u0E31\u0E19 \xB7 \u0E40\u0E1E\u0E14\u0E32\u0E19\u0E1F\u0E37\u0E49\u0E19\u0E23\u0E48\u0E32\u0E07 " + policy.ceiling, "routine"));
          if (policy.hunger < D.RECOVERY.hungerBelow && view.stats.hp - damage >= D.RECOVERY.hpAtLeast) {
            for (const injury of injuries(view)) {
              const severity = injury.severity - D.RECOVERY.severityPerDay;
              ops.push(severity > 0 ? { type: "injury.add", id: injury.id, severity } : { type: "injury.remove", id: injury.id });
              notices.push(notice(injury.rule.name + " \u0E1F\u0E37\u0E49\u0E19\u0E15\u0E31\u0E27 \xB7 " + (severity > 0 ? "\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E23\u0E30\u0E14\u0E31\u0E1A " + severity : "\u0E41\u0E1C\u0E25\u0E1B\u0E34\u0E14\u0E41\u0E25\u0E49\u0E27"), "routine"));
            }
          }
          return { ops, notices };
        }
        function choicePressure(view, choice) {
          if (!choice.pressure || view.stats.hunger < D.PRESSURE.threshold) return { ops: [], notices: [] };
          return { ops: [{ type: "stat.add", key: "hp", value: -D.PRESSURE.hpCost }, { type: "stat.add", key: "sanity", value: -D.PRESSURE.sanityCost }], notices: [notice("\u0E40\u0E08\u0E49\u0E32\u0E1D\u0E37\u0E19\u0E40\u0E02\u0E49\u0E32\u0E43\u0E01\u0E25\u0E49\u0E04\u0E19\u0E17\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48\u0E2B\u0E34\u0E27\u0E08\u0E31\u0E14 \u0E2A\u0E15\u0E34 -" + D.PRESSURE.sanityCost + " \xB7 \u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E -" + D.PRESSURE.hpCost + " \u0E41\u0E15\u0E48\u0E22\u0E31\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E21\u0E48\u0E01\u0E34\u0E19")] };
        }
        return Object.freeze({ adjustAction, endDay, choicePressure });
      });
    }
  });

  // ../../tmp/after-zero-zombie/data/origins.js
  var require_origins = __commonJS({
    "../../tmp/after-zero-zombie/data/origins.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory();
        else {
          root.ZombieData = root.ZombieData || {};
          root.ZombieData.Origins = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        const ORIGINS = {
          "origins.patient": { name: "\u0E1C\u0E39\u0E49\u0E1B\u0E48\u0E27\u0E22\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25", startPlace: "hospital", openingEventId: "origins.patient_opening", statDeltas: { hp: -8, research: 10 }, description: "\u0E23\u0E48\u0E32\u0E07\u0E22\u0E31\u0E07\u0E2D\u0E48\u0E2D\u0E19\u0E41\u0E23\u0E07 \u0E41\u0E15\u0E48\u0E08\u0E33\u0E27\u0E34\u0E18\u0E35\u0E2D\u0E48\u0E32\u0E19\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E41\u0E25\u0E47\u0E1A\u0E44\u0E14\u0E49; \u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E2D\u0E32\u0E04\u0E32\u0E23\u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E31\u0E19" },
          "origins.home": { name: "\u0E1C\u0E39\u0E49\u0E15\u0E32\u0E22\u0E43\u0E19\u0E1A\u0E49\u0E32\u0E19", startPlace: "shelter", openingEventId: "origins.home_opening", statDeltas: { sanity: 8, hunger: 5 }, description: "\u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33\u0E22\u0E31\u0E07\u0E0A\u0E31\u0E14 \u0E41\u0E15\u0E48\u0E16\u0E39\u0E01\u0E02\u0E31\u0E07\u0E08\u0E19\u0E2B\u0E34\u0E27; \u0E1E\u0E31\u0E01\u0E0B\u0E48\u0E2D\u0E21\u0E23\u0E48\u0E32\u0E07\u0E44\u0E14\u0E49\u0E41\u0E25\u0E30\u0E2D\u0E2D\u0E01\u0E16\u0E19\u0E19\u0E44\u0E1B\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E44\u0E14\u0E49" },
          "origins.soldier": { name: "\u0E2D\u0E14\u0E35\u0E15\u0E17\u0E2B\u0E32\u0E23\u0E1A\u0E19\u0E16\u0E19\u0E19", startPlace: "streets", openingEventId: "origins.soldier_opening", statDeltas: { hp: 5, sanity: -8, instinct: 8 }, description: "\u0E23\u0E48\u0E32\u0E07\u0E41\u0E02\u0E47\u0E07\u0E41\u0E23\u0E07\u0E41\u0E25\u0E30\u0E2A\u0E31\u0E0D\u0E0A\u0E32\u0E15\u0E0D\u0E32\u0E13\u0E44\u0E27 \u0E41\u0E15\u0E48\u0E2A\u0E15\u0E34\u0E2A\u0E31\u0E48\u0E19\u0E04\u0E25\u0E2D\u0E19; \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2B\u0E32\u0E28\u0E1E\u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E14\u0E34\u0E19\u0E44\u0E1B\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E44\u0E14\u0E49" }
        };
        const BODY_TRAITS = {
          "origins.sinewy": { name: "\u0E40\u0E2D\u0E47\u0E19\u0E22\u0E37\u0E14\u0E2B\u0E22\u0E38\u0E48\u0E19", statDeltas: { hp: 6, hunger: 4 }, modifiers: { travelHpCost: -1, healingMultiplier: 0.85 }, description: "\u0E23\u0E48\u0E32\u0E07\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C\u0E02\u0E36\u0E49\u0E19 6 \u0E41\u0E15\u0E48\u0E40\u0E23\u0E34\u0E48\u0E21\u0E2B\u0E34\u0E27\u0E02\u0E36\u0E49\u0E19 4; \u0E40\u0E14\u0E34\u0E19\u0E40\u0E2A\u0E35\u0E22\u0E23\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22\u0E25\u0E07 1 \u0E41\u0E15\u0E48\u0E1F\u0E37\u0E49\u0E19\u0E23\u0E48\u0E32\u0E07\u0E40\u0E1E\u0E35\u0E22\u0E07 85%" },
          "origins.watchful": { name: "\u0E1B\u0E23\u0E30\u0E2A\u0E32\u0E17\u0E15\u0E37\u0E48\u0E19\u0E15\u0E31\u0E27", statDeltas: { sanity: 6, hp: -6 }, modifiers: { hungerDailyDelta: -1, scavengeHpCost: 1 }, description: "\u0E2A\u0E15\u0E34\u0E40\u0E1E\u0E34\u0E48\u0E21 6 \u0E41\u0E15\u0E48\u0E23\u0E48\u0E32\u0E07\u0E25\u0E14 6; \u0E2B\u0E34\u0E27\u0E23\u0E32\u0E22\u0E27\u0E31\u0E19\u0E19\u0E49\u0E2D\u0E22\u0E25\u0E07 1 \u0E41\u0E15\u0E48\u0E04\u0E49\u0E19\u0E0B\u0E32\u0E01\u0E40\u0E2A\u0E35\u0E22\u0E23\u0E48\u0E32\u0E07\u0E40\u0E1E\u0E34\u0E48\u0E21 1" },
          "origins.knitting": { name: "\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E40\u0E22\u0E37\u0E48\u0E2D\u0E1B\u0E23\u0E30\u0E2A\u0E32\u0E19\u0E44\u0E27", statDeltas: { hp: 4, sanity: -4, hunger: 4 }, modifiers: { healingMultiplier: 1.2, hungerDailyDelta: 1 }, description: "\u0E40\u0E23\u0E34\u0E48\u0E21\u0E23\u0E48\u0E32\u0E07\u0E40\u0E1E\u0E34\u0E48\u0E21 4 \u0E41\u0E15\u0E48\u0E2A\u0E15\u0E34\u0E25\u0E14 4 \u0E41\u0E25\u0E30\u0E2B\u0E34\u0E27\u0E02\u0E36\u0E49\u0E19 4; \u0E1F\u0E37\u0E49\u0E19\u0E23\u0E48\u0E32\u0E07 120% \u0E41\u0E15\u0E48\u0E2B\u0E34\u0E27\u0E23\u0E32\u0E22\u0E27\u0E31\u0E19\u0E40\u0E1E\u0E34\u0E48\u0E21 1" },
          "origins.dense": { name: "\u0E42\u0E04\u0E23\u0E07\u0E23\u0E48\u0E32\u0E07\u0E2B\u0E19\u0E32\u0E41\u0E19\u0E48\u0E19", statDeltas: { hp: 8, sanity: -6 }, modifiers: { scavengeHpCost: -2, travelHpCost: 1 }, description: "\u0E23\u0E48\u0E32\u0E07\u0E40\u0E1E\u0E34\u0E48\u0E21 8 \u0E41\u0E15\u0E48\u0E2A\u0E15\u0E34\u0E25\u0E14 6; \u0E04\u0E49\u0E19\u0E0B\u0E32\u0E01\u0E40\u0E2A\u0E35\u0E22\u0E23\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22\u0E25\u0E07 2 \u0E41\u0E15\u0E48\u0E40\u0E14\u0E34\u0E19\u0E40\u0E2A\u0E35\u0E22\u0E23\u0E48\u0E32\u0E07\u0E40\u0E1E\u0E34\u0E48\u0E21 1" }
        };
        const STRAINS = {
          "origins.dormant": { name: "\u0E40\u0E0A\u0E37\u0E49\u0E2D\u0E2A\u0E07\u0E1A", statDeltas: { hunger: -6, sanity: -4 }, description: "\u0E40\u0E23\u0E34\u0E48\u0E21\u0E2B\u0E34\u0E27\u0E19\u0E49\u0E2D\u0E22\u0E25\u0E07 6 \u0E41\u0E15\u0E48\u0E2A\u0E15\u0E34\u0E25\u0E14 4; \u0E44\u0E21\u0E48\u0E21\u0E35\u0E42\u0E1A\u0E19\u0E31\u0E2A\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E23\u0E32\u0E22\u0E27\u0E31\u0E19" },
          "origins.febrile": { name: "\u0E40\u0E0A\u0E37\u0E49\u0E2D\u0E40\u0E23\u0E48\u0E07\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19", statDeltas: { mutation: 10, hunger: 6 }, description: "\u0E01\u0E25\u0E32\u0E22\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19\u0E40\u0E1E\u0E34\u0E48\u0E21 10 \u0E41\u0E15\u0E48\u0E2B\u0E34\u0E27\u0E02\u0E36\u0E49\u0E19 6; \u0E22\u0E31\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E21\u0E48\u0E01\u0E34\u0E19\u0E44\u0E14\u0E49" }
        };
        const ORIGIN_OPENINGS = [
          { id: "origins.patient_opening", trigger: "opening", once: true, requirements: { kind: "location", id: "hospital" }, title: "\u0E1B\u0E49\u0E32\u0E22\u0E02\u0E49\u0E2D\u0E21\u0E37\u0E2D\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E2D\u0E48\u0E32\u0E19\u0E2D\u0E2D\u0E01", kicker: "\u0E1C\u0E39\u0E49\u0E1B\u0E48\u0E27\u0E22\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25", text: "เจ้าลืมตาบนเตียงในโรงพยาบาลเขตกักกันพญาไท–ราชวิถี ป้ายข้อมือมีเลขห้องแล็บที่ลายมือเจ้าวงไว้ ตู้เก็บเลือดยังส่งเสียงทำงานแผ่วเบา เจ้าเลือกได้ว่าจะเข้าไปดื่ม แบ่งให้คนอื่น หรือถอยออกมา โดยไม่จำเป็นต้องทำร้ายใคร", choices: [
            { id: "read_band", text: "\u0E08\u0E33\u0E40\u0E25\u0E02\u0E1A\u0E19\u0E1B\u0E49\u0E32\u0E22\u0E44\u0E27\u0E49\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E15\u0E32\u0E21\u0E2D\u0E48\u0E32\u0E19\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E41\u0E25\u0E47\u0E1A", note: "งานวิจัย +3 · สติ +2 · ความหิว +3 · บทสนทนานี้ไม่ใช้วัน", effects: [{ type: "stat.add", key: "research", value: 3 }, { type: "stat.add", key: "sanity", value: 2 }, { type: "stat.add", key: "hunger", value: 3 }], behaviorTags: ["remembered"] },
            { id: "endure", text: "\u0E27\u0E32\u0E07\u0E41\u0E02\u0E19\u0E25\u0E07 \u0E15\u0E31\u0E49\u0E07\u0E2A\u0E15\u0E34\u0E41\u0E25\u0E49\u0E27\u0E17\u0E19\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E44\u0E27\u0E49\u0E01\u0E48\u0E2D\u0E19", note: "\u0E2A\u0E15\u0E34 +1 \xB7 \u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E01\u0E34\u0E19 \xB7 \u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E2D\u0E22\u0E39\u0E48\u0E17\u0E35\u0E48\u0E19\u0E35\u0E48 \xB7 \u0E44\u0E21\u0E48\u0E43\u0E0A\u0E49\u0E27\u0E31\u0E19", effects: [{ type: "stat.add", key: "sanity", value: 1 }], behaviorTags: ["endured"] }
          ] },
          { id: "origins.home_opening", trigger: "opening", once: true, requirements: { kind: "location", id: "shelter" }, title: "\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E22\u0E31\u0E07\u0E25\u0E47\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E14\u0E49\u0E32\u0E19\u0E43\u0E19", kicker: "\u0E1C\u0E39\u0E49\u0E15\u0E32\u0E22\u0E43\u0E19\u0E1A\u0E49\u0E32\u0E19", text: "เจ้าตื่นบนพื้นห้องที่เคยเรียกว่าบ้าน รูปถ่ายข้างประตูมีชื่อเขียนไว้ด้วยลายมือของเจ้า อาหารกระป๋องในห้องนี้มีไว้เลี้ยงคนเป็นเท่านั้น หากต้องการเลือดประทังชีวิต เจ้าต้องมุ่งหน้าสู่ถนนใหญ่เพื่อไปยังโรงพยาบาล", choices: [
            { id: "read_photo", text: "\u0E2D\u0E48\u0E32\u0E19\u0E0A\u0E37\u0E48\u0E2D\u0E1A\u0E19\u0E23\u0E39\u0E1B\u0E41\u0E25\u0E30\u0E08\u0E33\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E02\u0E2D\u0E07\u0E15\u0E19\u0E40\u0E2D\u0E07", note: "สติ +4 · ความหิว +3 · ยังไม่ได้กิน · ไม่ใช้วัน", effects: [{ type: "stat.add", key: "sanity", value: 4 }, { type: "stat.add", key: "hunger", value: 3 }], behaviorTags: ["remembered"] },
            { id: "endure", text: "\u0E1B\u0E25\u0E14\u0E01\u0E25\u0E2D\u0E19\u0E41\u0E25\u0E30\u0E17\u0E19\u0E2B\u0E34\u0E27\u0E44\u0E27\u0E49\u0E01\u0E48\u0E2D\u0E19\u0E2D\u0E2D\u0E01\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07", note: "\u0E2A\u0E15\u0E34 +1 \xB7 \u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E22\u0E49\u0E32\u0E22\u0E17\u0E35\u0E48 \xB7 \u0E44\u0E1B\u0E16\u0E19\u0E19\u0E41\u0E25\u0E49\u0E27\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E44\u0E14\u0E49\u0E43\u0E19\u0E2A\u0E2D\u0E07\u0E27\u0E31\u0E19 \xB7 \u0E44\u0E21\u0E48\u0E43\u0E0A\u0E49\u0E27\u0E31\u0E19", effects: [{ type: "stat.add", key: "sanity", value: 1 }], behaviorTags: ["endured"] }
          ] },
          { id: "origins.soldier_opening", trigger: "opening", once: true, requirements: { kind: "location", id: "streets" }, title: "\u0E1B\u0E49\u0E32\u0E22\u0E0A\u0E37\u0E48\u0E2D\u0E43\u0E15\u0E49\u0E40\u0E2A\u0E37\u0E49\u0E2D\u0E40\u0E01\u0E23\u0E32\u0E30\u0E17\u0E35\u0E48\u0E41\u0E15\u0E01", kicker: "\u0E2D\u0E14\u0E35\u0E15\u0E17\u0E2B\u0E32\u0E23\u0E1A\u0E19\u0E16\u0E19\u0E19", text: "เจ้าฟื้นข้างด่านร้างบนถนนพระราม 4–แยกอโศก ป้ายชื่อสองอันคล้องอยู่ด้วยกัน อันหนึ่งไม่ใช่ของเจ้า ด้านหลังป้ายมีความถี่วิทยุสลักไว้ บนถนนมีซากรถพยาบาลให้ค้นหา และมีเส้นทางมุ่งตรงไปยังโรงพยาบาล", choices: [
            { id: "read_tags", text: "\u0E2D\u0E48\u0E32\u0E19\u0E1B\u0E49\u0E32\u0E22\u0E2D\u0E35\u0E01\u0E2D\u0E31\u0E19\u0E41\u0E25\u0E49\u0E27\u0E17\u0E48\u0E2D\u0E07\u0E04\u0E27\u0E32\u0E21\u0E16\u0E35\u0E48\u0E44\u0E27\u0E49", note: "สติ +3 · สัญชาตญาณ -2 · ความหิว +3 · ไม่ใช้วัน", effects: [{ type: "stat.add", key: "sanity", value: 3 }, { type: "stat.add", key: "instinct", value: -2 }, { type: "stat.add", key: "hunger", value: 3 }], behaviorTags: ["remembered"] },
            { id: "endure", text: "\u0E25\u0E14\u0E21\u0E37\u0E2D\u0E25\u0E07\u0E08\u0E32\u0E01\u0E0B\u0E2D\u0E07\u0E1B\u0E37\u0E19\u0E41\u0E25\u0E30\u0E17\u0E19\u0E2B\u0E34\u0E27\u0E44\u0E27\u0E49\u0E01\u0E48\u0E2D\u0E19", note: "\u0E2A\u0E15\u0E34 +1 \xB7 \u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E25\u0E48\u0E32\u0E2B\u0E23\u0E37\u0E2D\u0E01\u0E34\u0E19 \xB7 \u0E40\u0E14\u0E34\u0E19\u0E44\u0E1B\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E44\u0E14\u0E49\u0E43\u0E19\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E27\u0E31\u0E19 \xB7 \u0E44\u0E21\u0E48\u0E43\u0E0A\u0E49\u0E27\u0E31\u0E19", effects: [{ type: "stat.add", key: "sanity", value: 1 }], behaviorTags: ["endured"] }
          ] }
        ];
        function freeze(value) {
          if (value && typeof value === "object") {
            Object.values(value).forEach(freeze);
            Object.freeze(value);
          }
          return value;
        }
        return freeze({ ORIGINS, STRAINS, BODY_TRAITS, ORIGIN_OPENINGS });
      });
    }
  });

  // ../../tmp/after-zero-zombie/systems/origins.js
  var require_origins2 = __commonJS({
    "../../tmp/after-zero-zombie/systems/origins.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_origins());
        else {
          root.ZombieSystems = root.ZombieSystems || {};
          root.ZombieSystems.Origins = factory(root.ZombieData.Origins);
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(data) {
        "use strict";
        const originIds = ["origins.patient", "origins.home", "origins.soldier"];
        const bodyIds = ["origins.sinewy", "origins.watchful", "origins.knitting", "origins.dense"];
        const strainIds = ["origins.dormant", "origins.febrile"];
        function create(view, ctx) {
          if (!ctx || ctx.phase !== "create" || typeof ctx.random !== "function") throw Error("Origins.create requires engine create context");
          const pick = (ids) => {
            const n = ctx.random();
            if (!Number.isFinite(n) || n < 0 || n >= 1) throw Error("Invalid engine RNG draw");
            return ids[Math.floor(n * ids.length)];
          };
          const originId = pick(originIds), bodyId = pick(bodyIds), strainId = pick(strainIds);
          const origin = data.ORIGINS[originId], statDeltas = {};
          for (const def of [origin, data.BODY_TRAITS[bodyId], data.STRAINS[strainId]])
            for (const [key, value] of Object.entries(def.statDeltas)) statDeltas[key] = (statDeltas[key] || 0) + value;
          return { originId, strainId, bodyTraits: [bodyId], startPlace: origin.startPlace, statDeltas, openingEventId: origin.openingEventId };
        }
        return { create };
      });
    }
  });

  // ../../tmp/after-zero-zombie/data/evolution.js
  var require_evolution = __commonJS({
    "../../tmp/after-zero-zombie/data/evolution.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory();
        else root.ZombieEvolutionData = factory();
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        const TRAITS = {
          "evolution.predator.1": {
            name: "Predator I \u2014 \u0E23\u0E48\u0E32\u0E07\u0E15\u0E32\u0E21\u0E23\u0E2D\u0E22",
            modifiers: { scavengeHpCost: -1, hungerDailyDelta: 1 },
            benefit: "\u0E40\u0E2A\u0E35\u0E22\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C\u0E23\u0E48\u0E32\u0E07\u0E08\u0E32\u0E01\u0E01\u0E32\u0E23\u0E04\u0E49\u0E19\u0E0B\u0E32\u0E01\u0E19\u0E49\u0E2D\u0E22\u0E25\u0E07 1",
            tradeoff: "\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E23\u0E32\u0E22\u0E27\u0E31\u0E19\u0E40\u0E1E\u0E34\u0E48\u0E21 1",
            reason: "\u0E01\u0E32\u0E23\u0E25\u0E48\u0E32\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E0B\u0E49\u0E33\u0E1D\u0E36\u0E01\u0E1B\u0E23\u0E30\u0E2A\u0E32\u0E17\u0E43\u0E2B\u0E49\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E1C\u0E48\u0E32\u0E19\u0E0B\u0E32\u0E01\u0E44\u0E14\u0E49\u0E41\u0E21\u0E48\u0E19\u0E02\u0E36\u0E49\u0E19 \u0E41\u0E15\u0E48\u0E23\u0E48\u0E32\u0E07\u0E17\u0E35\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E25\u0E48\u0E32\u0E15\u0E25\u0E2D\u0E14\u0E43\u0E0A\u0E49\u0E1E\u0E25\u0E31\u0E07\u0E07\u0E32\u0E19\u0E40\u0E1E\u0E34\u0E48\u0E21"
          },
          "evolution.predator.2": {
            name: "Predator II \u2014 \u0E40\u0E2A\u0E49\u0E19\u0E40\u0E2D\u0E47\u0E19\u0E1C\u0E39\u0E49\u0E25\u0E48\u0E32",
            modifiers: { scavengeHpCost: -1, travelHpCost: 1 },
            benefit: "\u0E40\u0E2A\u0E35\u0E22\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C\u0E23\u0E48\u0E32\u0E07\u0E08\u0E32\u0E01\u0E01\u0E32\u0E23\u0E04\u0E49\u0E19\u0E0B\u0E32\u0E01\u0E19\u0E49\u0E2D\u0E22\u0E25\u0E07\u0E2D\u0E35\u0E01 1",
            tradeoff: "\u0E40\u0E2A\u0E35\u0E22\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C\u0E23\u0E48\u0E32\u0E07\u0E08\u0E32\u0E01\u0E01\u0E32\u0E23\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07\u0E40\u0E1E\u0E34\u0E48\u0E21 1",
            reason: "\u0E01\u0E32\u0E23\u0E25\u0E48\u0E32\u0E15\u0E48\u0E2D\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E2B\u0E25\u0E31\u0E07\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E23\u0E48\u0E32\u0E07\u0E17\u0E33\u0E43\u0E2B\u0E49\u0E40\u0E2A\u0E49\u0E19\u0E40\u0E2D\u0E47\u0E19\u0E22\u0E36\u0E14\u0E40\u0E01\u0E32\u0E30\u0E0B\u0E32\u0E01\u0E44\u0E14\u0E49\u0E14\u0E35\u0E02\u0E36\u0E49\u0E19 \u0E41\u0E15\u0E48\u0E02\u0E49\u0E2D\u0E15\u0E48\u0E2D\u0E17\u0E35\u0E48\u0E40\u0E01\u0E23\u0E47\u0E07\u0E19\u0E35\u0E49\u0E1D\u0E37\u0E19\u0E01\u0E32\u0E23\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07\u0E44\u0E01\u0E25"
          },
          "evolution.horde_speaker.1": {
            name: "Horde Speaker I \u2014 \u0E08\u0E31\u0E07\u0E2B\u0E27\u0E30\u0E40\u0E23\u0E35\u0E22\u0E01\u0E1D\u0E39\u0E07",
            modifiers: { hungerDailyDelta: -1, threatDelta: 2 },
            benefit: "\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E23\u0E32\u0E22\u0E27\u0E31\u0E19\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E19\u0E49\u0E2D\u0E22\u0E25\u0E07 1",
            tradeoff: "\u0E20\u0E31\u0E22\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E43\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E40\u0E1E\u0E34\u0E48\u0E21 2",
            reason: "\u0E01\u0E32\u0E23\u0E19\u0E33\u0E1D\u0E39\u0E07\u0E0B\u0E49\u0E33\u0E17\u0E33\u0E43\u0E2B\u0E49\u0E23\u0E48\u0E32\u0E07\u0E1B\u0E23\u0E30\u0E2A\u0E32\u0E19\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E30\u0E41\u0E25\u0E30\u0E2A\u0E07\u0E27\u0E19\u0E41\u0E23\u0E07\u0E44\u0E14\u0E49 \u0E41\u0E15\u0E48\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E40\u0E23\u0E35\u0E22\u0E01\u0E14\u0E36\u0E07\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E19\u0E43\u0E08"
          },
          "evolution.horde_speaker.2": {
            name: "Horde Speaker II \u2014 \u0E40\u0E2A\u0E35\u0E22\u0E07\u0E01\u0E49\u0E2D\u0E07\u0E23\u0E48\u0E27\u0E21\u0E1D\u0E39\u0E07",
            modifiers: { hungerDailyDelta: -1, threatDelta: 3 },
            benefit: "\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E23\u0E32\u0E22\u0E27\u0E31\u0E19\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E19\u0E49\u0E2D\u0E22\u0E25\u0E07\u0E2D\u0E35\u0E01 1",
            tradeoff: "\u0E20\u0E31\u0E22\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E43\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E2D\u0E35\u0E01 3",
            reason: "\u0E01\u0E32\u0E23\u0E19\u0E33\u0E1D\u0E39\u0E07\u0E15\u0E48\u0E2D\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E2B\u0E25\u0E31\u0E07\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E23\u0E48\u0E32\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E30\u0E1E\u0E31\u0E01\u0E23\u0E48\u0E27\u0E21\u0E01\u0E31\u0E19\u0E17\u0E35\u0E48\u0E1B\u0E23\u0E30\u0E2B\u0E22\u0E31\u0E14\u0E41\u0E23\u0E07\u0E02\u0E36\u0E49\u0E19 \u0E41\u0E15\u0E48\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E01\u0E49\u0E2D\u0E07\u0E44\u0E1B\u0E44\u0E01\u0E25\u0E01\u0E27\u0E48\u0E32\u0E40\u0E14\u0E34\u0E21"
          },
          "evolution.remnant.1": {
            name: "Remnant I \u2014 \u0E41\u0E1A\u0E1A\u0E41\u0E1C\u0E19\u0E23\u0E48\u0E32\u0E07\u0E40\u0E14\u0E34\u0E21",
            modifiers: { healingMultiplier: 1.1, hungerDailyDelta: 1 },
            benefit: "\u0E1C\u0E25\u0E1F\u0E37\u0E49\u0E19\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C\u0E23\u0E48\u0E32\u0E07\u0E04\u0E39\u0E13 1.10",
            tradeoff: "\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E23\u0E32\u0E22\u0E27\u0E31\u0E19\u0E40\u0E1E\u0E34\u0E48\u0E21 1",
            reason: "\u0E01\u0E32\u0E23\u0E17\u0E1A\u0E17\u0E27\u0E19\u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33\u0E0B\u0E49\u0E33\u0E02\u0E13\u0E30\u0E22\u0E31\u0E07\u0E21\u0E35\u0E2A\u0E15\u0E34\u0E17\u0E33\u0E43\u0E2B\u0E49\u0E23\u0E48\u0E32\u0E07\u0E22\u0E36\u0E14\u0E41\u0E1A\u0E1A\u0E41\u0E1C\u0E19\u0E01\u0E32\u0E23\u0E0B\u0E48\u0E2D\u0E21\u0E15\u0E31\u0E27\u0E40\u0E14\u0E34\u0E21 \u0E41\u0E15\u0E48\u0E01\u0E32\u0E23\u0E04\u0E07\u0E41\u0E1A\u0E1A\u0E41\u0E1C\u0E19\u0E43\u0E0A\u0E49\u0E1E\u0E25\u0E31\u0E07\u0E07\u0E32\u0E19"
          },
          "evolution.remnant.2": {
            name: "Remnant II \u2014 \u0E23\u0E48\u0E32\u0E07\u0E17\u0E35\u0E48\u0E08\u0E33\u0E15\u0E19\u0E40\u0E2D\u0E07",
            modifiers: { healingMultiplier: 1.15, scavengeHpCost: 1 },
            benefit: "\u0E1C\u0E25\u0E1F\u0E37\u0E49\u0E19\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C\u0E23\u0E48\u0E32\u0E07\u0E04\u0E39\u0E13\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E2D\u0E35\u0E01 1.15",
            tradeoff: "\u0E40\u0E2A\u0E35\u0E22\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C\u0E23\u0E48\u0E32\u0E07\u0E08\u0E32\u0E01\u0E01\u0E32\u0E23\u0E04\u0E49\u0E19\u0E0B\u0E32\u0E01\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E2D\u0E35\u0E01 1",
            reason: "\u0E01\u0E32\u0E23\u0E17\u0E1A\u0E17\u0E27\u0E19\u0E15\u0E48\u0E2D\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E2B\u0E25\u0E31\u0E07\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E23\u0E48\u0E32\u0E07\u0E04\u0E07\u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E17\u0E35\u0E48\u0E0B\u0E48\u0E2D\u0E21\u0E15\u0E31\u0E27\u0E44\u0E14\u0E49\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E02\u0E36\u0E49\u0E19 \u0E41\u0E15\u0E48\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E40\u0E22\u0E37\u0E48\u0E2D\u0E44\u0E27\u0E15\u0E48\u0E2D\u0E01\u0E32\u0E23\u0E23\u0E37\u0E49\u0E2D\u0E0B\u0E32\u0E01"
          }
        };
        const RULES = [
          {
            id: "evolution.predator.1",
            behavior: "hunts",
            label: "\u0E25\u0E48\u0E32\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08",
            distinctDays: 3,
            mutation: { common: 20, other: 15 },
            stats: { hp: 25 },
            cooldownDays: 3
          },
          {
            id: "evolution.horde_speaker.1",
            behavior: "hordeLed",
            label: "\u0E19\u0E33\u0E1D\u0E39\u0E07",
            distinctDays: 3,
            mutation: { common: 20, other: 15 },
            stats: { horde: 25 },
            cooldownDays: 3
          },
          {
            id: "evolution.remnant.1",
            behavior: "remembered",
            label: "\u0E17\u0E1A\u0E17\u0E27\u0E19\u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33",
            distinctDays: 3,
            mutation: { common: 15, other: 10 },
            stats: { sanity: 55 },
            cooldownDays: 3
          },
          {
            id: "evolution.predator.2",
            behavior: "hunts",
            label: "\u0E25\u0E48\u0E32\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08",
            distinctDays: 6,
            previous: "evolution.predator.1",
            daysAfterPrevious: 3,
            mutation: { common: 45, other: 40 },
            stats: { hp: 35 },
            cooldownDays: 3
          },
          {
            id: "evolution.horde_speaker.2",
            behavior: "hordeLed",
            label: "\u0E19\u0E33\u0E1D\u0E39\u0E07",
            distinctDays: 6,
            previous: "evolution.horde_speaker.1",
            daysAfterPrevious: 3,
            mutation: { common: 45, other: 40 },
            stats: { horde: 50 },
            cooldownDays: 3
          },
          {
            id: "evolution.remnant.2",
            behavior: "remembered",
            label: "\u0E17\u0E1A\u0E17\u0E27\u0E19\u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33",
            distinctDays: 6,
            previous: "evolution.remnant.1",
            daysAfterPrevious: 3,
            mutation: { common: 35, other: 30 },
            stats: { sanity: 70 },
            cooldownDays: 3
          }
        ];
        function freeze(value) {
          Object.values(value).forEach((v) => {
            if (v && typeof v === "object") freeze(v);
          });
          return Object.freeze(value);
        }
        return freeze({ TRAITS, RULES });
      });
    }
  });

  // ../../tmp/after-zero-zombie/systems/evolution.js
  var require_evolution2 = __commonJS({
    "../../tmp/after-zero-zombie/systems/evolution.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_evolution());
        else {
          root.ZombieSystems = root.ZombieSystems || {};
          root.ZombieSystems.Evolution = factory(root.ZombieEvolutionData);
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(Data) {
        "use strict";
        const { TRAITS, RULES } = Data;
        const own = (o, id) => Object.hasOwn(o || {}, id);
        const empty = () => ({ ops: [], notices: [] });
        function behaviorDays(view, key) {
          const fact = view.behavior[key];
          if (!fact || !Number.isInteger(fact.count) || !Array.isArray(fact.days)) return [];
          const days = [...new Set(fact.days.filter((d) => Number.isInteger(d) && d >= 1 && d <= view.day))].sort((a, b) => a - b);
          if (fact.count < days.length || fact.lastDay !== days[days.length - 1]) return [];
          return days;
        }
        function evaluate(view, ctx) {
          if (!view || ctx?.phase !== "evolution" || ctx.day !== view.day || view.ending || view.pending || !(view.stats?.hp > 0) || !view.behavior || !view.evolution || !Number.isInteger(view.day) || view.day < 1 || view.day >= 60) return empty();
          if (view.strainId !== "common" && !own(ctx.registry?.STRAINS, view.strainId)) return empty();
          const { acquired, stages } = view.evolution;
          const e10Stages = stages.filter((s) => acquired.includes(s.id) && own(TRAITS, s.id));
          const lastDay = Math.max(0, ...e10Stages.map((s) => s.day));
          for (const rule of RULES) {
            if (acquired.includes(rule.id) || !own(ctx.registry?.TRAITS, rule.id)) continue;
            if (lastDay && view.day - lastDay < rule.cooldownDays) continue;
            const days = behaviorDays(view, rule.behavior);
            if (days.length < rule.distinctDays || !days.includes(view.day)) continue;
            const mutationMin = rule.mutation[view.strainId === "common" ? "common" : "other"];
            if (!(view.stats.mutation >= mutationMin) || Object.entries(rule.stats).some(([key, min]) => !(view.stats[key] >= min))) continue;
            let previous;
            if (rule.previous) {
              previous = stages.find((s) => s.id === rule.previous && acquired.includes(s.id));
              if (!previous || days.filter((d) => d > previous.day).length < rule.daysAfterPrevious) continue;
            }
            const def = TRAITS[rule.id];
            const facts = rule.label + "\u0E15\u0E48\u0E32\u0E07\u0E27\u0E31\u0E19 " + days.length + " \u0E27\u0E31\u0E19 (\u0E2B\u0E25\u0E31\u0E01\u0E10\u0E32\u0E19\u0E27\u0E31\u0E19 " + days.slice(-rule.distinctDays).join(", ") + ")";
            const progress = previous ? " \u0E2B\u0E25\u0E31\u0E07\u0E02\u0E31\u0E49\u0E19\u0E01\u0E48\u0E2D\u0E19\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 " + previous.day + " \u0E40\u0E1E\u0E34\u0E48\u0E21 " + days.filter((d) => d > previous.day).length + " \u0E27\u0E31\u0E19;" : ";";
            const status = Object.entries(rule.stats).map(([key]) => key + "=" + view.stats[key]).join(", ");
            const text = def.name + ": " + facts + progress + " \u0E40\u0E0A\u0E37\u0E49\u0E2D " + view.strainId + ", mutation=" + view.stats.mutation + ", " + status + ". " + def.reason + " | \u0E44\u0E14\u0E49: " + def.benefit + " | \u0E41\u0E25\u0E01: " + def.tradeoff;
            return {
              ops: [{ type: "trait.acquire", id: rule.id, evidence: { id: rule.id + ".evidence", text } }],
              notices: [{ kind: "story", text }]
            };
          }
          return empty();
        }
        return Object.freeze({ evaluate });
      });
    }
  });

  // ../../tmp/after-zero-zombie/data/world.js
  var require_world = __commonJS({
    "../../tmp/after-zero-zombie/data/world.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory();
        else {
          root.ZombieData = root.ZombieData || {};
          root.ZombieData.World = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        const ENCOUNTERS_PER_FAMILY = 6, RESOURCES = {}, NPCS = {}, FLAGS = {}, INITIAL_NPCS = {};
        for (let n = 1; n <= ENCOUNTERS_PER_FAMILY; n++) for (const kind of ["ambulance", "prey"]) {
          const id = "world." + kind + (n === 1 ? "" : "." + n), resolvedFlag = n === 1 ? "world." + kind + "Resolved" : id + ".resolved";
          const name = kind === "ambulance" ? "\u0E23\u0E48\u0E32\u0E07\u0E43\u0E19\u0E23\u0E16\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E04\u0E31\u0E19\u0E17\u0E35\u0E48 " + n : "\u0E1C\u0E39\u0E49\u0E1A\u0E32\u0E14\u0E40\u0E08\u0E47\u0E1A\u0E04\u0E19\u0E17\u0E35\u0E48 " + n;
          RESOURCES[id] = { name, remaining: 1, instanceId: id, eventId: kind, resolvedFlag, ...kind === "prey" ? { npcId: id } : {} };
          FLAGS[resolvedFlag] = { type: "boolean", default: false };
          if (kind === "prey") {
            NPCS[id] = { name, states: ["wounded", "rescued", "escaped", "dead", "unknown"] };
            INITIAL_NPCS[id] = { alive: true, state: "wounded", trust: 0 };
          }
        }
        return { RESOURCES, NPCS, FLAGS, INITIAL_NPCS, ENCOUNTERS_PER_FAMILY };
      });
    }
  });

  // ../../tmp/after-zero-zombie/systems/world.js
  var require_world2 = __commonJS({
    "../../tmp/after-zero-zombie/systems/world.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_world());
        else {
          root.ZombieSystems = root.ZombieSystems || {};
          root.ZombieSystems.World = factory(root.ZombieData.World);
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(D) {
        "use strict";
        const empty = () => ({ ops: [], notices: [] });
        function encounter(view, eventId, context = {}, registry = D) {
          if (context.resourceId !== void 0 && typeof context.resourceId !== "string") return null;
          const id = context.resourceId === void 0 ? "world." + eventId : context.resourceId, def = registry.RESOURCES?.[id], source = view.world.resources[id];
          if (!def || def.eventId !== eventId || !source || context.resourceInstanceId !== void 0 && context.resourceInstanceId !== source.instanceId || context.npcId !== void 0 && context.npcId !== def.npcId) return null;
          return { id, def, source, npc: def.npcId ? view.world.npcs[def.npcId] : null, resolved: view.story.flags[def.resolvedFlag] === true };
        }
        function choiceReasons(view, choice, ctx) {
          const id = view.pending?.eventId;
          if (!["ambulance", "prey"].includes(id)) return [];
          if (choice.id === "ambulance.choice.1" || choice.id === "prey.choice.2") return [];
          const unit = encounter(view, id, view.pending.context, ctx.registry);
          if (!unit || unit.resolved || unit.source.remaining < 1) return ["\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E19\u0E35\u0E49\u0E2B\u0E21\u0E14\u0E2B\u0E23\u0E37\u0E2D\u0E16\u0E39\u0E01\u0E43\u0E0A\u0E49\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27"];
          if (id === "prey" && (!unit.npc?.alive || unit.npc.state !== "wounded")) return ["\u0E04\u0E19\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E2B\u0E49\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E01\u0E34\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E0A\u0E48\u0E27\u0E22\u0E41\u0E25\u0E49\u0E27"];
          return [];
        }
        const threat = (view, id, value, ops) => {
          if (view.world.locations[id] && value) ops.push({ type: "location.threat.add", id, value });
        };
        function afterDecision(view, facts, ctx) {
          const ops = [], notices = [], place = view.place;
          if (facts.kind === "action") {
            if (facts.actionId === "raid") threat(view, "streets", 16, ops);
            if (facts.actionId === "recruit") threat(view, "nest", 5, ops);
            if (facts.actionId === "campaign") {
              threat(view, "nest", 10, ops);
              threat(view, "streets", 8, ops);
              threat(view, "radio", 6, ops);
            }
            if (facts.actionId === "endure") threat(view, place, -6, ops);
            if (["rest", "remember"].includes(facts.actionId) && place === "shelter")
              threat(view, "shelter", -8, ops);
          }
          if (facts.kind === "choice") {
            const choice = facts.choiceId;
            if (facts.eventId === "ambulance") {
              const unit = encounter(view, "ambulance", facts.context, ctx?.registry || D);
              if (unit && !unit.resolved) ops.push({ type: "flag.set", id: unit.def.resolvedFlag, value: true });
              if (choice === "ambulance.choice.0") {
                if (!unit || unit.resolved || unit.source.remaining < 1) throw Error("Ambulance corpse exhausted");
                ops.push({ type: "resource.consume", id: unit.id, instanceId: unit.source.instanceId, amount: 1 });
                threat(view, "streets", 4, ops);
              }
            }
            if (facts.eventId === "prey") {
              const unit = encounter(view, "prey", facts.context, ctx?.registry || D), npc = unit?.npc;
              if (unit && !unit.resolved) ops.push({ type: "flag.set", id: unit.def.resolvedFlag, value: true });
              if (choice === "prey.choice.0") {
                if (!unit || unit.resolved || !npc?.alive || unit.source.remaining < 1) throw Error("Prey exhausted or dead");
                ops.push({ type: "resource.consume", id: unit.id, instanceId: unit.source.instanceId, amount: 1 });
                ops.push({ type: "npc.set", id: unit.def.npcId, field: "alive", value: false });
                ops.push({ type: "npc.set", id: unit.def.npcId, field: "state", value: "dead" });
                ops.push({ type: "npc.set", id: unit.def.npcId, field: "trust", value: 0 });
                threat(view, "streets", 22, ops);
                threat(view, "radio", 9, ops);
                notices.push({ text: "\u0E1E\u0E22\u0E32\u0E19\u0E40\u0E2B\u0E47\u0E19\u0E1C\u0E39\u0E49\u0E1A\u0E32\u0E14\u0E40\u0E08\u0E47\u0E1A\u0E2B\u0E32\u0E22\u0E44\u0E1B \u0E04\u0E19\u0E1A\u0E19\u0E16\u0E19\u0E19\u0E41\u0E25\u0E30\u0E2B\u0E2D\u0E27\u0E34\u0E17\u0E22\u0E38\u0E23\u0E30\u0E27\u0E31\u0E07\u0E40\u0E08\u0E49\u0E32\u0E21\u0E32\u0E01\u0E02\u0E36\u0E49\u0E19", kind: "danger" });
              } else if (choice === "prey.choice.1") {
                if (!unit || unit.resolved || !npc?.alive || npc.state !== "wounded") throw Error("Prey is no longer available for rescue");
                ops.push({ type: "npc.set", id: unit.def.npcId, field: "state", value: "rescued" });
                ops.push({ type: "npc.set", id: unit.def.npcId, field: "trust", value: 65 });
                threat(view, "streets", -5, ops);
              } else if (choice === "prey.choice.2" && npc?.alive && npc.state === "wounded" && !unit.resolved) {
                ops.push({ type: "npc.set", id: unit.def.npcId, field: "state", value: "escaped" });
              }
            }
            if (facts.eventId === "wanted") threat(view, "radio", 8, ops);
          }
          return { ops, notices };
        }
        function endDay(view) {
          const ops = [], notices = [], local = view.world.locations[view.place]?.threat || 0;
          if (local >= 60) {
            notices.push({ text: "\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E25\u0E32\u0E14\u0E15\u0E23\u0E30\u0E40\u0E27\u0E19\u0E41\u0E25\u0E30\u0E15\u0E31\u0E49\u0E07\u0E14\u0E48\u0E32\u0E19\u0E43\u0E19\u0E22\u0E48\u0E32\u0E19\u0E19\u0E35\u0E49\u0E2B\u0E19\u0E32\u0E41\u0E19\u0E48\u0E19 \u0E01\u0E32\u0E23\u0E2D\u0E2D\u0E01\u0E2A\u0E33\u0E23\u0E27\u0E08\u0E21\u0E35\u0E17\u0E31\u0E49\u0E07\u0E04\u0E27\u0E32\u0E21\u0E40\u0E2A\u0E35\u0E48\u0E22\u0E07\u0E41\u0E25\u0E30\u0E40\u0E2A\u0E1A\u0E35\u0E22\u0E07\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E17\u0E34\u0E49\u0E07\u0E44\u0E27\u0E49\u0E21\u0E32\u0E01\u0E02\u0E36\u0E49\u0E19", kind: "danger" });
          }
          return { ops, notices };
        }
        return { afterDecision, endDay, choiceReasons };
      });
    }
  });

  // ../../tmp/after-zero-zombie/systems/director.js
  var require_director = __commonJS({
    "../../tmp/after-zero-zombie/systems/director.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_conditions(), require_effects());
        else {
          root.ZombieSystems = root.ZombieSystems || {};
          root.ZombieSystems.Director = factory(root.ZombieCore.Conditions, root.ZombieCore.Effects);
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(Conditions, Effects) {
        "use strict";
        const has = (o, k) => Object.hasOwn(o || {}, k);
        function viable(view, event, C) {
          return event.choices?.some((choice) => {
            if (choice.requirements && !Conditions.meets(view, choice.requirements, C)) return false;
            if (choice.bloodCost && view.bloodLeft < choice.bloodCost) return false;
            if (Object.entries(choice.cost || {}).some(([k, n]) => (view.items[k] || 0) < n)) return false;
            if (Object.entries(choice.min || {}).some(([k, n]) => (view.stats[k] || 0) < n)) return false;
            try {
              if (choice.costs?.length) Effects.apply(JSON.parse(JSON.stringify(view)), choice.costs, { registry: C, owner: "content" });
            } catch {
              return false;
            }
            return true;
          });
        }
        function eligible(view, event, C) {
          if (event.requirements && !Conditions.meets(view, event.requirements, C)) return false;
          if (event.location && event.location !== view.place) return false;
          if (event.locations && !event.locations.includes(view.place)) return false;
          if (event.once !== false && view.seen.includes(event.id)) return false;
          if (view.eventHistory[event.id] !== void 0 && view.day - view.eventHistory[event.id] < (event.cooldownDays ?? 4)) return false;
          return viable(view, event, C);
        }
        function select(view, trigger, ctx) {
          if (view.pending || view.ending) return null;
          const C = ctx.registry, events = C.EVENTS;
          if (trigger.kind === "action") {
            const action = trigger.action;
            if (action.ending) return null;
            if (action.encounter) {
              const id = action.encounter, event = events.find((e) => e.id === id);
              if (!event) return null;
              if (["ambulance", "prey"].includes(id)) {
                const source = Object.entries(C.RESOURCES || {}).find(([key, def2]) => def2.eventId === id && (view.world.resources[key]?.remaining ?? 0) > 0 && !view.story.flags[def2.resolvedFlag] && (!def2.npcId || view.world.npcs[def2.npcId]?.alive === true && view.world.npcs[def2.npcId]?.state === "wounded"));
                if (!source) return null;
                const [resourceId, def] = source, instance = view.world.resources[resourceId];
                return eligible(view, { ...event, once: false, cooldownDays: 0 }, C) ? { eventId: id, context: { place: view.place, resourceId, resourceInstanceId: instance.instanceId, sourceName: def.name, ...def.npcId ? { npcId: def.npcId } : {} }, recordHistory: true } : null;
              }
              if (id === "bloodbank" && view.bloodLeft < 1) return null;
              return eligible(view, id === "bloodbank" ? { ...event, once: false, cooldownDays: 0 } : event, C) ? { eventId: id, context: { place: view.place }, recordHistory: true } : null;
            }
            const candidates = events.filter((e) => e.trigger !== "morning" && !e.day && !e.followup && e.tags?.includes(action.eventTag || "quiet") && eligible(view, e, C));
            candidates.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.id.localeCompare(b.id));
            if (!candidates.length) return null;
            if (ctx.random && ctx.random() > 0.62) return null;
            const top = candidates.filter((e) => (e.priority ?? 0) === (candidates[0].priority ?? 0));
            const pick = top.length > 1 && ctx.random ? Math.floor(ctx.random() * top.length) : 0;
            return { eventId: top[pick].id, context: { place: view.place }, recordHistory: true };
          }
          if (trigger.kind !== "morning") return null;
          const due = [];
          for (let i = 0; i < view.story.scheduled.length; i++) {
            const item = view.story.scheduled[i], event = events.find((e) => e.id === item.eventId);
            if (item.earliestDay <= view.day && event && eligible(view, event, C)) due.push({ event, day: item.earliestDay, index: i, context: item.context });
          }
          for (const event of events) {
            if (event.followup && view.memory[event.followup] > 0 && view.day >= view.memory[event.followup + "On"] + 2 && eligible(view, event, C))
              due.push({ event, day: view.memory[event.followup + "On"] + 2, index: 1e3 + events.indexOf(event), context: { place: view.place } });
          }
          const overdue = due.filter((x) => x.day < view.day);
          const milestones = events.filter((e) => e.day !== void 0 && e.day <= view.day && eligible(view, e, C)).sort((a, b) => a.day - b.day || (b.priority ?? 0) - (a.priority ?? 0) || a.id.localeCompare(b.id));
          const byDue = (a, b) => a.day - b.day || (b.event.priority ?? 0) - (a.event.priority ?? 0) || a.index - b.index;
          overdue.sort(byDue);
          due.sort(byDue);
          const urgent = milestones.find((e) => view.day - e.day >= 2);
          const selected = urgent || overdue[0] || milestones[0] || due[0];
          return selected ? { eventId: (selected.event || selected).id, context: { place: view.place, ...selected.context || {} }, recordHistory: true, ...selected.event && selected.index < 1e3 ? { scheduledIndex: selected.index } : {} } : null;
        }
        return { select, eligible, viable };
      });
    }
  });

  // ../../tmp/after-zero-zombie/data/events/clinic.js
  var require_clinic = __commonJS({
    "../../tmp/after-zero-zombie/data/events/clinic.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory();
        else {
          root.ZombieData = root.ZombieData || {};
          root.ZombieData.Clinic = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        const FLAGS = {
          "clinic.generator_running": { type: "boolean", default: false },
          "clinic.blood_stolen": { type: "boolean", default: false },
          "clinic.boy_saved": { type: "boolean", default: false },
          "clinic.korn_allied": { type: "boolean", default: false },
          "clinic.korn_subdued": { type: "boolean", default: false },
          "clinic.outcome": { type: "string", default: "none" }
        };
        const NPCS = {
          "clinic.dr_wichai": { states: ["wary", "friendly", "hostile", "dead"] },
          "clinic.mercenary_korn": { states: ["guarding", "mutinous", "subdued", "allied", "dead"] }
        };
        const RESOURCES = {};
        const EVENTS = [
          // -------------------------------------------------------------------------
          // Node 1: clinic.generator_failing
          // -------------------------------------------------------------------------
          {
            id: "clinic.generator_failing",
            location: "hospital",
            title: "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E1B\u0E31\u0E48\u0E19\u0E44\u0E1F\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E43\u0E01\u0E25\u0E49\u0E14\u0E31\u0E1A",
            text: "หน้าโรงพยาบาลเขตกักกันพญาไท–ราชวิถี ซากรถเมล์สายแปดสีครีมแดงพลิกคว่ำขวางถนนสี่เลน สายสื่อสารพันกันยุ่งเหยิงห้อยระโยงระยางจากสะพานลอย ในห้องใต้ดิน เครื่องกำเนิดไฟฟ้าดีเซลเก่าสำลักไอเสียสีดำควันคลุ้ง เสียงลูกสูบดังกระตุกถี่รัวก่อนกำลังจะดับ ตู้แช่เก็บถุงเลือดพลาสมาเริ่มมีหยดน้ำเกาะ อุณหภูมิพุ่งสูง หากไฟดับ เลือดบริสุทธิ์นับสิบถุงจะเน่าเสียภายในไม่กี่ชั่วโมง",
            choices: [
              {
                id: "clinic.generator_failing.choice.repair",
                text: "สละเสบียงให้ทีมซ่อมประคองเครื่องกำเนิดไฟฟ้า",
                note: "ใช้เสบียง 1 ชิ้น · ความไว้ใจ +10 · ความเป็นมนุษย์ +5 · ตู้แช่เลือดทำงานต่อ",
                costs: [{ type: "item.add", key: "supplies", value: -1 }],
                effects: [
                  { type: "flag.set", id: "clinic.generator_running", value: true },
                  { type: "stat.add", key: "trust", value: 10 },
                  { type: "stat.add", key: "humanity", value: 5 }
                ],
                behaviorTags: ["helped"],
                followups: [{ eventId: "clinic.doctor_encounter", afterDays: 1, context: { generatorFixed: true } }]
              },
              {
                id: "clinic.generator_failing.choice.raid",
                text: "\u0E17\u0E38\u0E1A\u0E01\u0E23\u0E30\u0E08\u0E01\u0E15\u0E39\u0E49\u0E41\u0E0A\u0E48 \u0E0A\u0E34\u0E07\u0E16\u0E38\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E2A\u0E14\u0E21\u0E32\u0E01\u0E25\u0E37\u0E19\u0E01\u0E34\u0E19\u0E01\u0E48\u0E2D\u0E19\u0E44\u0E1F\u0E14\u0E31\u0E1A",
                bloodCost: 1,
                note: "\u0E43\u0E0A\u0E49\u0E40\u0E25\u0E37\u0E2D\u0E14 1 \u0E16\u0E38\u0E07 \xB7 \u0E25\u0E14\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E17\u0E31\u0E19\u0E17\u0E35 \xB7 \u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E01\u0E23\u0E30\u0E1B\u0E4B\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E17\u0E33\u0E43\u0E2B\u0E49\u0E2D\u0E34\u0E48\u0E21 \u0E40\u0E25\u0E37\u0E2D\u0E14\u0E2A\u0E14\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19\u0E17\u0E35\u0E48\u0E14\u0E31\u0E1A\u0E2B\u0E34\u0E27\u0E44\u0E14\u0E49 \xB7 \u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E20\u0E31\u0E22\u0E14\u0E31\u0E07\u0E25\u0E31\u0E48\u0E19",
                effects: [
                  { type: "stat.add", key: "hunger", value: -35 },
                  { type: "flag.set", id: "clinic.blood_stolen", value: true },
                  { type: "stat.add", key: "instinct", value: 10 }
                ],
                behaviorTags: ["feeds"],
                followups: [{ eventId: "clinic.doctor_encounter", afterDays: 1, context: { stoleBlood: true } }]
              },
              {
                id: "clinic.generator_failing.choice.fallback",
                text: "\u0E16\u0E2D\u0E22\u0E01\u0E32\u0E22\u0E40\u0E02\u0E49\u0E32\u0E21\u0E38\u0E21\u0E21\u0E37\u0E14 \u0E2A\u0E31\u0E07\u0E40\u0E01\u0E15\u0E01\u0E32\u0E23\u0E13\u0E4C\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E2A\u0E07\u0E1A\u0E40\u0E07\u0E35\u0E22\u0E1A",
                note: "\u0E17\u0E32\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 \xB7 \u0E44\u0E21\u0E48\u0E40\u0E2A\u0E35\u0E22\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E32\u0E01\u0E23 \xB7 \u0E40\u0E25\u0E37\u0E2D\u0E14\u0E43\u0E19\u0E15\u0E39\u0E49\u0E40\u0E23\u0E34\u0E48\u0E21\u0E40\u0E2A\u0E37\u0E48\u0E2D\u0E21\u0E2A\u0E20\u0E32\u0E1E",
                effects: [
                  { type: "stat.add", key: "sanity", value: 2 }
                ],
                behaviorTags: ["endured"],
                followups: [{ eventId: "clinic.doctor_encounter", afterDays: 1, context: { watched: true } }]
              }
            ]
          },
          // -------------------------------------------------------------------------
          // Node 2: clinic.doctor_encounter
          // -------------------------------------------------------------------------
          {
            id: "clinic.doctor_encounter",
            location: "hospital",
            title: "\u0E01\u0E32\u0E23\u0E40\u0E1C\u0E0A\u0E34\u0E0D\u0E2B\u0E19\u0E49\u0E32\u0E19\u0E32\u0E22\u0E41\u0E1E\u0E17\u0E22\u0E4C\u0E27\u0E34\u0E0A\u0E31\u0E22",
            text: "ลำกล้องปืนลูกซองแฝดยื่นออกมาจากหลังเคาน์เตอร์จ่ายยา ชายสูงวัยในเสื้อกาวน์เปื้อนคราบเลือดแห้งกรังจ้องมองเจ้าด้วยดวงตาแดงก่ำ บนโต๊ะมียาพาราเซตามอลและศาลพระภูมิพลาสติกห้อยสายสิญจน์เปื้อนเลือด เขามองร่างของเจ้าอย่างระแวง แม้ร่องรอยเน่าเปื่อยจะชี้ชัดว่าเป็นผู้ติดเชื้อ แต่ความสงบนิ่งและแววตาที่ยังมีสติทำให้เขายังไม่เหนี่ยวไก",
            choices: [
              {
                id: "clinic.doctor_encounter.choice.communicate",
                text: "\u0E02\u0E48\u0E21\u0E2A\u0E31\u0E0D\u0E0A\u0E32\u0E15\u0E0D\u0E32\u0E13\u0E2A\u0E31\u0E15\u0E27\u0E4C\u0E23\u0E49\u0E32\u0E22 \u0E2A\u0E30\u0E01\u0E14\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E41\u0E25\u0E30\u0E41\u0E2A\u0E14\u0E07\u0E04\u0E27\u0E32\u0E21\u0E08\u0E33\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C",
                note: "\u0E43\u0E0A\u0E49\u0E2A\u0E15\u0E34\u0E2A\u0E31\u0E21\u0E1B\u0E0A\u0E31\u0E0D\u0E0D\u0E30 \xB7 \u0E2B\u0E21\u0E2D\u0E25\u0E14\u0E1B\u0E37\u0E19\u0E25\u0E07\u0E41\u0E25\u0E30\u0E40\u0E23\u0E34\u0E48\u0E21\u0E22\u0E2D\u0E21\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E08\u0E23\u0E08\u0E32",
                requirements: {
                  all: [
                    { kind: "stat", key: "sanity", min: 25 },
                    { kind: "npc", id: "clinic.dr_wichai", field: "alive", value: true }
                  ]
                },
                effects: [
                  { type: "npc.set", id: "clinic.dr_wichai", field: "trust", value: 35 },
                  { type: "npc.set", id: "clinic.dr_wichai", field: "state", value: "wary" },
                  { type: "stat.add", key: "sanity", value: 6 }
                ],
                behaviorTags: ["remembered"],
                followups: [{ eventId: "clinic.triage_dilemma", afterDays: 1, context: { communicated: true } }]
              },
              {
                id: "clinic.doctor_encounter.choice.threaten",
                text: "\u0E41\u0E22\u0E01\u0E40\u0E02\u0E35\u0E49\u0E22\u0E27\u0E04\u0E33\u0E23\u0E32\u0E21\u0E43\u0E19\u0E25\u0E33\u0E04\u0E2D \u0E2A\u0E48\u0E07\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E44\u0E21\u0E48\u0E43\u0E2B\u0E49\u0E40\u0E02\u0E49\u0E32\u0E43\u0E01\u0E25\u0E49",
                note: "\u0E1A\u0E35\u0E1A\u0E43\u0E2B\u0E49\u0E2B\u0E21\u0E2D\u0E01\u0E25\u0E31\u0E27\u0E08\u0E19\u0E22\u0E2D\u0E21\u0E16\u0E2D\u0E22 \xB7 \u0E04\u0E27\u0E32\u0E21\u0E44\u0E27\u0E49\u0E43\u0E08\u0E25\u0E14\u0E25\u0E07\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E2B\u0E19\u0E31\u0E01",
                requirements: { kind: "npc", id: "clinic.dr_wichai", field: "alive", value: true },
                effects: [
                  { type: "npc.set", id: "clinic.dr_wichai", field: "trust", value: 5 },
                  { type: "npc.set", id: "clinic.dr_wichai", field: "state", value: "hostile" },
                  { type: "stat.add", key: "instinct", value: 12 }
                ],
                followups: [{ eventId: "clinic.triage_dilemma", afterDays: 1, context: { coerced: true } }]
              },
              {
                id: "clinic.doctor_encounter.choice.fallback",
                text: "\u0E0A\u0E39\u0E2A\u0E2D\u0E07\u0E21\u0E37\u0E2D\u0E02\u0E36\u0E49\u0E19\u0E0A\u0E49\u0E32\u0E46 \u0E41\u0E25\u0E49\u0E27\u0E01\u0E49\u0E32\u0E27\u0E16\u0E2D\u0E22\u0E2B\u0E25\u0E31\u0E07\u0E23\u0E31\u0E01\u0E29\u0E32\u0E23\u0E30\u0E22\u0E30\u0E2B\u0E48\u0E32\u0E07",
                note: "\u0E17\u0E32\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 \xB7 \u0E44\u0E21\u0E48\u0E40\u0E2A\u0E35\u0E48\u0E22\u0E07\u0E1B\u0E30\u0E17\u0E30 \xB7 \u0E23\u0E2D\u0E14\u0E39\u0E2A\u0E16\u0E32\u0E19\u0E01\u0E32\u0E23\u0E13\u0E4C\u0E15\u0E48\u0E2D\u0E44\u0E1B",
                effects: [
                  { type: "stat.add", key: "sanity", value: 2 }
                ],
                behaviorTags: ["endured"],
                followups: [{ eventId: "clinic.triage_dilemma", afterDays: 1, context: { steppedBack: true } }]
              }
            ]
          },
          // -------------------------------------------------------------------------
          // Node 3: clinic.triage_dilemma
          // -------------------------------------------------------------------------
          {
            id: "clinic.triage_dilemma",
            location: "hospital",
            title: "\u0E27\u0E34\u0E01\u0E24\u0E15\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E08\u0E48\u0E32\u0E22\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E43\u0E2B\u0E49\u0E04\u0E19\u0E40\u0E08\u0E47\u0E1A",
            text: "\u0E40\u0E1B\u0E25\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E40\u0E01\u0E48\u0E32\u0E16\u0E39\u0E01\u0E40\u0E02\u0E47\u0E19\u0E40\u0E02\u0E49\u0E32\u0E21\u0E32 \u0E40\u0E14\u0E47\u0E01\u0E2B\u0E19\u0E38\u0E48\u0E21\u0E1C\u0E39\u0E49\u0E23\u0E2D\u0E14\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E21\u0E35\u0E1A\u0E32\u0E14\u0E41\u0E1C\u0E25\u0E09\u0E01\u0E23\u0E23\u0E08\u0E4C\u0E17\u0E35\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E40\u0E28\u0E29\u0E01\u0E23\u0E30\u0E08\u0E01\u0E23\u0E16\u0E40\u0E21\u0E25\u0E4C \u0E40\u0E25\u0E37\u0E2D\u0E14\u0E2A\u0E14\u0E44\u0E2B\u0E25\u0E0B\u0E36\u0E21\u0E17\u0E30\u0E25\u0E38\u0E1C\u0E49\u0E32\u0E1E\u0E31\u0E19\u0E41\u0E1C\u0E25 \u0E2B\u0E21\u0E2D\u0E27\u0E34\u0E0A\u0E31\u0E22\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E15\u0E48\u0E2D\u0E2A\u0E32\u0E22\u0E22\u0E32\u0E07\u0E2A\u0E48\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E16\u0E38\u0E07\u0E17\u0E35\u0E48\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E2D\u0E22\u0E39\u0E48 \u0E01\u0E25\u0E34\u0E48\u0E19\u0E04\u0E32\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E2A\u0E14\u0E2D\u0E38\u0E48\u0E19\u0E46 \u0E42\u0E0A\u0E22\u0E40\u0E02\u0E49\u0E32\u0E08\u0E21\u0E39\u0E01\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E02\u0E2D\u0E07\u0E40\u0E08\u0E49\u0E32\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E23\u0E38\u0E19\u0E41\u0E23\u0E07 \u0E25\u0E33\u0E04\u0E2D\u0E02\u0E2D\u0E07\u0E40\u0E08\u0E49\u0E32\u0E41\u0E2B\u0E49\u0E07\u0E1C\u0E32\u0E01\u0E41\u0E2A\u0E1A\u0E23\u0E49\u0E2D\u0E19\u0E23\u0E32\u0E27\u0E01\u0E31\u0E1A\u0E16\u0E39\u0E01\u0E44\u0E1F\u0E25\u0E19 \u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E01\u0E23\u0E30\u0E2B\u0E32\u0E22\u0E01\u0E23\u0E30\u0E15\u0E38\u0E49\u0E19\u0E43\u0E2B\u0E49\u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22\u0E01\u0E23\u0E30\u0E15\u0E38\u0E01\u0E40\u0E01\u0E23\u0E47\u0E07 \u0E40\u0E08\u0E49\u0E32\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E15\u0E23\u0E07\u0E2B\u0E19\u0E49\u0E32\u0E01\u0E31\u0E1A\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E02\u0E2D\u0E07\u0E40\u0E14\u0E47\u0E01\u0E2B\u0E19\u0E38\u0E48\u0E21",
            choices: [
              {
                id: "clinic.triage_dilemma.choice.donate",
                text: "\u0E02\u0E48\u0E21\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27 \u0E0A\u0E48\u0E27\u0E22\u0E1B\u0E23\u0E30\u0E04\u0E2D\u0E07\u0E2A\u0E32\u0E22\u0E22\u0E32\u0E07\u0E22\u0E01\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E43\u0E2B\u0E49\u0E40\u0E14\u0E47\u0E01\u0E2B\u0E19\u0E38\u0E48\u0E21",
                bloodCost: 1,
                pressure: true,
                note: "ใช้เลือด 1 ถุง · ฝืนเข้าใกล้คนทั้งที่หิวจัด (หากหิว ≥75 เสียสภาพร่าง -3 สติ -6) · ช่วยชีวิตเด็กหนุ่ม · ผู้รอดชีวิตจะจดจำเจ้า",
                requirements: { kind: "npc", id: "clinic.dr_wichai", field: "alive", value: true },
                effects: [
                  { type: "flag.set", id: "clinic.boy_saved", value: true },
                  { type: "stat.add", key: "humanity", value: 12 },
                  { type: "stat.add", key: "trust", value: 20 },
                  { type: "npc.set", id: "clinic.dr_wichai", field: "trust", value: 60 }
                ],
                behaviorTags: ["helped", "endured"],
                followups: [{ eventId: "clinic.mercenary_mutiny", afterDays: 1, context: { savedBoy: true } }]
              },
              {
                id: "clinic.triage_dilemma.choice.consume",
                text: "\u0E01\u0E23\u0E30\u0E0A\u0E32\u0E01\u0E16\u0E38\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E21\u0E32\u0E09\u0E35\u0E01\u0E14\u0E37\u0E48\u0E21\u0E25\u0E07\u0E04\u0E2D\u0E15\u0E48\u0E2D\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E38\u0E01\u0E04\u0E19",
                bloodCost: 1,
                note: "\u0E43\u0E0A\u0E49\u0E40\u0E25\u0E37\u0E2D\u0E14 1 \u0E16\u0E38\u0E07 \xB7 \u0E14\u0E31\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E21\u0E2B\u0E32\u0E28\u0E32\u0E25 \xB7 \u0E2A\u0E15\u0E34\u0E44\u0E21\u0E48\u0E25\u0E14\u0E40\u0E1E\u0E23\u0E32\u0E30\u0E01\u0E34\u0E19\u0E04\u0E19 \xB7 \u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E08\u0E30\u0E2B\u0E27\u0E32\u0E14\u0E01\u0E25\u0E31\u0E27\u0E40\u0E08\u0E49\u0E32\u0E16\u0E36\u0E07\u0E02\u0E35\u0E14\u0E2A\u0E38\u0E14",
                requirements: { kind: "npc", id: "clinic.dr_wichai", field: "alive", value: true },
                effects: [
                  { type: "stat.add", key: "hunger", value: -40 },
                  { type: "stat.add", key: "humanity", value: -15 },
                  { type: "stat.add", key: "trust", value: -20 },
                  { type: "npc.set", id: "clinic.dr_wichai", field: "trust", value: 0 },
                  { type: "npc.set", id: "clinic.dr_wichai", field: "state", value: "hostile" }
                ],
                behaviorTags: ["feeds"],
                followups: [{ eventId: "clinic.mercenary_mutiny", afterDays: 1, context: { ateBlood: true } }]
              },
              {
                id: "clinic.triage_dilemma.choice.fallback",
                text: "\u0E01\u0E49\u0E21\u0E2B\u0E19\u0E49\u0E32\u0E02\u0E48\u0E21\u0E2A\u0E31\u0E0D\u0E0A\u0E32\u0E15\u0E0D\u0E32\u0E13 \u0E22\u0E37\u0E19\u0E1E\u0E34\u0E07\u0E40\u0E2A\u0E32\u0E21\u0E2D\u0E07\u0E2B\u0E21\u0E2D\u0E1C\u0E48\u0E32\u0E15\u0E31\u0E14\u0E40\u0E07\u0E35\u0E22\u0E1A\u0E46",
                note: "ทางเลือกปลอดภัย · ถอยออกมาโดยไม่ฝืนเข้าใกล้คนเจ็บ · ไม่ได้กินและไม่ขัดขวาง · ความหิวเพิ่มขึ้นเล็กน้อย",
                effects: [
                  { type: "stat.add", key: "hunger", value: 5 }
                ],
                behaviorTags: ["endured"],
                followups: [{ eventId: "clinic.mercenary_mutiny", afterDays: 1, context: { enduredTriage: true } }]
              }
            ]
          },
          // -------------------------------------------------------------------------
          // Node 4: clinic.mercenary_mutiny
          // -------------------------------------------------------------------------
          {
            id: "clinic.mercenary_mutiny",
            location: "hospital",
            title: "\u0E01\u0E23\u0E13\u0E4C\u0E01\u0E32\u0E23\u0E4C\u0E14\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E01\u0E48\u0E2D\u0E01\u0E1A\u0E0F",
            text: '\u0E01\u0E23\u0E13\u0E4C \u0E2D\u0E14\u0E35\u0E15\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E23\u0E1B\u0E20. \u0E23\u0E48\u0E32\u0E07\u0E43\u0E2B\u0E0D\u0E48 \u0E0A\u0E31\u0E01\u0E1B\u0E37\u0E19\u0E1E\u0E01\u0E25\u0E39\u0E01\u0E42\u0E21\u0E48\u0E40\u0E25\u0E47\u0E07\u0E43\u0E2A\u0E48\u0E2B\u0E21\u0E2D\u0E27\u0E34\u0E0A\u0E31\u0E22\u0E41\u0E25\u0E30\u0E01\u0E31\u0E01\u0E01\u0E25\u0E48\u0E2D\u0E07\u0E22\u0E32\u0E1B\u0E0F\u0E34\u0E0A\u0E35\u0E27\u0E19\u0E30\u0E44\u0E27\u0E49 "\u0E1E\u0E2D\u0E41\u0E25\u0E49\u0E27\u0E2B\u0E21\u0E2D! \u0E40\u0E2A\u0E1A\u0E35\u0E22\u0E07\u0E2A\u0E48\u0E27\u0E19\u0E01\u0E25\u0E32\u0E07\u0E2B\u0E21\u0E14\u0E41\u0E25\u0E49\u0E27 \u0E02\u0E49\u0E32\u0E07\u0E19\u0E2D\u0E01\u0E16\u0E19\u0E19\u0E21\u0E35\u0E41\u0E15\u0E48\u0E23\u0E16\u0E04\u0E27\u0E48\u0E33\u0E01\u0E31\u0E1A\u0E0B\u0E32\u0E01\u0E28\u0E1E \u0E01\u0E39\u0E08\u0E30\u0E40\u0E2D\u0E32\u0E25\u0E31\u0E07\u0E22\u0E32\u0E01\u0E31\u0E1A\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E17\u0E35\u0E48\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E44\u0E1B\u0E41\u0E25\u0E01\u0E15\u0E31\u0E4B\u0E27\u0E40\u0E02\u0E49\u0E32\u0E04\u0E48\u0E32\u0E22\u0E17\u0E2B\u0E32\u0E23 \u0E43\u0E04\u0E23\u0E02\u0E27\u0E32\u0E07\u0E01\u0E39\u0E22\u0E34\u0E07\u0E44\u0E2A\u0E49\u0E41\u0E15\u0E01\u0E41\u0E19\u0E48!" \u0E40\u0E02\u0E32\u0E01\u0E27\u0E32\u0E14\u0E1B\u0E37\u0E19\u0E21\u0E32\u0E17\u0E32\u0E07\u0E40\u0E08\u0E49\u0E32\u0E14\u0E49\u0E27\u0E22\u0E2A\u0E32\u0E22\u0E15\u0E32\u0E15\u0E37\u0E48\u0E19\u0E15\u0E23\u0E30\u0E2B\u0E19\u0E01 "\u0E23\u0E27\u0E21\u0E16\u0E36\u0E07\u0E21\u0E36\u0E07\u0E14\u0E49\u0E27\u0E22 \u0E44\u0E2D\u0E49\u0E0B\u0E32\u0E01\u0E1C\u0E35\u0E14\u0E34\u0E1A!"',
            choices: [
              {
                id: "clinic.mercenary_mutiny.choice.subdue",
                text: "\u0E1E\u0E38\u0E48\u0E07\u0E40\u0E02\u0E49\u0E32\u0E0A\u0E32\u0E23\u0E4C\u0E08\u0E1B\u0E25\u0E14\u0E2D\u0E32\u0E27\u0E38\u0E18\u0E01\u0E23\u0E13\u0E4C\u0E23\u0E48\u0E27\u0E21\u0E01\u0E31\u0E1A\u0E2B\u0E21\u0E2D\u0E27\u0E34\u0E0A\u0E31\u0E22",
                pressure: true,
                note: "ต้องมีสภาพร่าง ≥20 · เสียสภาพร่าง 15 · ฝืนเข้าใกล้คนทั้งที่หิวจัด (หากหิว ≥75 เสียสภาพร่าง -3 สติ -6) · ยับยั้งการปล้นคลังยา · ได้รับความเชื่อมั่นสูงสุด",
                requirements: {
                  all: [
                    { kind: "stat", key: "hp", min: 20 },
                    { kind: "npc", id: "clinic.dr_wichai", field: "alive", value: true },
                    { kind: "npc", id: "clinic.mercenary_korn", field: "alive", value: true }
                  ]
                },
                costs: [{ type: "stat.add", key: "hp", value: -15 }],
                effects: [
                  { type: "flag.set", id: "clinic.korn_subdued", value: true },
                  { type: "npc.set", id: "clinic.mercenary_korn", field: "state", value: "subdued" },
                  { type: "stat.add", key: "trust", value: 25 },
                  { type: "npc.set", id: "clinic.dr_wichai", field: "trust", value: 80 },
                  { type: "npc.set", id: "clinic.dr_wichai", field: "state", value: "friendly" }
                ],
                behaviorTags: ["helped"],
                followups: [{ eventId: "clinic.sanctuary_established", afterDays: 1, context: { kornSubdued: true } }]
              },
              {
                id: "clinic.mercenary_mutiny.choice.ally",
                text: "\u0E2A\u0E48\u0E07\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E23\u0E48\u0E27\u0E21\u0E21\u0E37\u0E2D\u0E01\u0E31\u0E1A\u0E01\u0E23\u0E13\u0E4C \u0E0A\u0E48\u0E27\u0E22\u0E02\u0E19\u0E40\u0E2A\u0E1A\u0E35\u0E22\u0E07\u0E41\u0E25\u0E30\u0E22\u0E32\u0E44\u0E1B\u0E41\u0E1A\u0E48\u0E07\u0E01\u0E31\u0E19",
                note: "ทรยศหมอวิชัย · ชุดเย็บแผล +2 · เสบียงมนุษย์ +2 · ความเป็นมนุษย์ -20",
                requirements: {
                  all: [
                    { kind: "npc", id: "clinic.mercenary_korn", field: "alive", value: true },
                    { kind: "npc", id: "clinic.dr_wichai", field: "alive", value: true }
                  ]
                },
                effects: [
                  { type: "flag.set", id: "clinic.korn_allied", value: true },
                  { type: "npc.set", id: "clinic.mercenary_korn", field: "state", value: "allied" },
                  { type: "item.add", key: "medicine", value: 2 },
                  { type: "item.add", key: "supplies", value: 2 },
                  { type: "stat.add", key: "humanity", value: -20 },
                  { type: "npc.set", id: "clinic.dr_wichai", field: "trust", value: 0 }
                ],
                followups: [{ eventId: "clinic.ruins_plundered", afterDays: 1, context: { alliedKorn: true } }]
              },
              {
                id: "clinic.mercenary_mutiny.choice.fallback",
                text: "\u0E21\u0E38\u0E14\u0E2B\u0E25\u0E1A\u0E43\u0E15\u0E49\u0E40\u0E04\u0E32\u0E19\u0E4C\u0E40\u0E15\u0E2D\u0E23\u0E4C \u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E43\u0E2B\u0E49\u0E04\u0E19\u0E40\u0E1B\u0E47\u0E19\u0E0A\u0E34\u0E07\u0E2D\u0E32\u0E27\u0E38\u0E18\u0E01\u0E31\u0E19\u0E40\u0E2D\u0E07",
                note: "\u0E17\u0E32\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 \xB7 \u0E44\u0E21\u0E48\u0E40\u0E2A\u0E35\u0E48\u0E22\u0E07\u0E40\u0E08\u0E47\u0E1A\u0E15\u0E31\u0E27 \xB7 \u0E40\u0E2A\u0E35\u0E22\u0E07\u0E1B\u0E37\u0E19\u0E14\u0E31\u0E07\u0E02\u0E36\u0E49\u0E19\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E19\u0E31\u0E14\u0E01\u0E48\u0E2D\u0E19\u0E04\u0E27\u0E32\u0E21\u0E40\u0E07\u0E35\u0E22\u0E1A\u0E08\u0E30\u0E40\u0E02\u0E49\u0E32\u0E1B\u0E01\u0E04\u0E25\u0E38\u0E21",
                effects: [
                  { type: "stat.add", key: "sanity", value: -3 }
                ],
                followups: [{ eventId: "clinic.ruins_plundered", afterDays: 1, context: { fledMutiny: true } }]
              }
            ]
          },
          // -------------------------------------------------------------------------
          // Outcome 1: clinic.sanctuary_established
          // -------------------------------------------------------------------------
          {
            id: "clinic.sanctuary_established",
            location: "hospital",
            title: "\u0E2A\u0E27\u0E23\u0E23\u0E04\u0E4C\u0E41\u0E2B\u0E48\u0E07\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E27\u0E31\u0E07\u0E40\u0E0B\u0E19\u0E15\u0E4C\u0E25\u0E32\u0E0B\u0E32\u0E23\u0E31\u0E2A",
            text: "\u0E2B\u0E21\u0E2D\u0E27\u0E34\u0E0A\u0E31\u0E22\u0E41\u0E25\u0E30\u0E1C\u0E39\u0E49\u0E23\u0E2D\u0E14\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E0A\u0E48\u0E27\u0E22\u0E01\u0E31\u0E19\u0E1A\u0E39\u0E23\u0E13\u0E30\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01 \u0E1B\u0E23\u0E30\u0E15\u0E39\u0E40\u0E2B\u0E25\u0E47\u0E01\u0E16\u0E39\u0E01\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E04\u0E27\u0E32\u0E21\u0E41\u0E02\u0E47\u0E07\u0E41\u0E23\u0E07 \u0E1B\u0E49\u0E32\u0E22\u0E44\u0E27\u0E19\u0E34\u0E25\u0E2B\u0E32\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E40\u0E01\u0E48\u0E32\u0E16\u0E39\u0E01\u0E19\u0E33\u0E21\u0E32\u0E1A\u0E31\u0E07\u0E17\u0E31\u0E28\u0E19\u0E27\u0E34\u0E2A\u0E31\u0E22\u0E08\u0E32\u0E01\u0E1D\u0E39\u0E07\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E1A\u0E19\u0E16\u0E19\u0E19\u0E43\u0E2B\u0E0D\u0E48 \u0E2B\u0E21\u0E2D\u0E27\u0E34\u0E0A\u0E31\u0E22\u0E21\u0E2D\u0E07\u0E14\u0E39\u0E40\u0E08\u0E49\u0E32\u0E14\u0E49\u0E27\u0E22\u0E2A\u0E32\u0E22\u0E15\u0E32\u0E02\u0E2D\u0E07\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E19\u0E23\u0E48\u0E27\u0E21\u0E0A\u0E30\u0E15\u0E32\u0E01\u0E23\u0E23\u0E21 \u0E41\u0E21\u0E49\u0E44\u0E21\u0E48\u0E21\u0E35\u0E40\u0E2A\u0E1A\u0E35\u0E22\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E41\u0E08\u0E01\u0E08\u0E48\u0E32\u0E22 \u0E41\u0E15\u0E48\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E41\u0E2B\u0E48\u0E07\u0E19\u0E35\u0E49\u0E22\u0E2D\u0E21\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E02\u0E2D\u0E07\u0E40\u0E08\u0E49\u0E32 \u0E40\u0E08\u0E49\u0E32\u0E01\u0E25\u0E32\u0E22\u0E40\u0E1B\u0E47\u0E19\u0E1C\u0E39\u0E49\u0E1E\u0E34\u0E17\u0E31\u0E01\u0E29\u0E4C\u0E43\u0E19\u0E40\u0E07\u0E32\u0E21\u0E37\u0E14 \u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E41\u0E2B\u0E48\u0E07\u0E19\u0E35\u0E49\u0E01\u0E25\u0E32\u0E22\u0E40\u0E1B\u0E47\u0E19\u0E42\u0E2D\u0E40\u0E2D\u0E0B\u0E34\u0E2A\u0E40\u0E14\u0E35\u0E22\u0E27\u0E17\u0E35\u0E48\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E41\u0E25\u0E30\u0E1C\u0E39\u0E49\u0E15\u0E34\u0E14\u0E40\u0E0A\u0E37\u0E49\u0E2D\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E48\u0E27\u0E21\u0E01\u0E31\u0E19\u0E44\u0E14\u0E49\u0E14\u0E49\u0E27\u0E22\u0E04\u0E27\u0E32\u0E21\u0E44\u0E27\u0E49\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E43\u0E08",
            choices: [
              {
                id: "clinic.sanctuary_established.choice.accept",
                text: "\u0E22\u0E37\u0E19\u0E2B\u0E22\u0E31\u0E14\u0E1B\u0E01\u0E1B\u0E49\u0E2D\u0E07\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E43\u0E19\u0E10\u0E32\u0E19\u0E30\u0E1E\u0E31\u0E19\u0E18\u0E21\u0E34\u0E15\u0E23",
                note: "คลินิกพญาไท–ราชวิถีกลายเป็นที่หลบภัย · ความไว้ใจ +30 · ความเป็นมนุษย์ +20",
                effects: [
                  { type: "flag.set", id: "clinic.outcome", value: "sanctuary" },
                  { type: "stat.add", key: "humanity", value: 20 },
                  { type: "stat.add", key: "trust", value: 30 }
                ]
              }
            ]
          },
          // -------------------------------------------------------------------------
          // Outcome 2: clinic.ruins_plundered
          // -------------------------------------------------------------------------
          {
            id: "clinic.ruins_plundered",
            location: "hospital",
            title: "\u0E0B\u0E32\u0E01\u0E1B\u0E23\u0E31\u0E01\u0E2B\u0E31\u0E01\u0E1E\u0E31\u0E07\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E17\u0E34\u0E49\u0E07\u0E23\u0E49\u0E32\u0E07",
            text: "\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E1B\u0E37\u0E19\u0E41\u0E25\u0E30\u0E01\u0E25\u0E34\u0E48\u0E19\u0E04\u0E32\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E14\u0E36\u0E07\u0E14\u0E39\u0E14\u0E1D\u0E39\u0E07\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E08\u0E32\u0E01\u0E2A\u0E35\u0E48\u0E41\u0E22\u0E01\u0E40\u0E02\u0E49\u0E32\u0E21\u0E32 \u0E1B\u0E23\u0E30\u0E15\u0E39\u0E01\u0E23\u0E30\u0E08\u0E01\u0E41\u0E15\u0E01\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14 \u0E04\u0E25\u0E31\u0E07\u0E22\u0E32\u0E16\u0E39\u0E01\u0E23\u0E37\u0E49\u0E2D\u0E04\u0E49\u0E19\u0E08\u0E19\u0E27\u0E48\u0E32\u0E07\u0E40\u0E1B\u0E25\u0E48\u0E32 \u0E2B\u0E21\u0E2D\u0E27\u0E34\u0E0A\u0E31\u0E22\u0E41\u0E25\u0E30\u0E1C\u0E39\u0E49\u0E23\u0E2D\u0E14\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E01\u0E23\u0E30\u0E08\u0E31\u0E14\u0E01\u0E23\u0E30\u0E08\u0E32\u0E22\u0E2B\u0E32\u0E22\u0E44\u0E1B\u0E43\u0E19\u0E04\u0E27\u0E32\u0E21\u0E21\u0E37\u0E14 \u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E40\u0E1E\u0E35\u0E22\u0E07\u0E02\u0E27\u0E14\u0E22\u0E32\u0E41\u0E15\u0E01\u0E41\u0E25\u0E30\u0E0B\u0E32\u0E01\u0E15\u0E39\u0E49\u0E41\u0E0A\u0E48\u0E17\u0E35\u0E48\u0E2A\u0E48\u0E07\u0E01\u0E25\u0E34\u0E48\u0E19\u0E40\u0E19\u0E48\u0E32\u0E40\u0E2B\u0E21\u0E47\u0E19 \u0E40\u0E08\u0E49\u0E32\u0E44\u0E14\u0E49\u0E40\u0E2A\u0E1A\u0E35\u0E22\u0E07\u0E41\u0E25\u0E30\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E1B\u0E23\u0E30\u0E17\u0E31\u0E07\u0E0A\u0E35\u0E1E\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27 \u0E17\u0E27\u0E48\u0E32\u0E40\u0E0B\u0E19\u0E15\u0E4C\u0E25\u0E32\u0E0B\u0E32\u0E23\u0E31\u0E2A\u0E44\u0E14\u0E49\u0E14\u0E31\u0E1A\u0E2A\u0E39\u0E0D\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27 \u0E44\u0E21\u0E48\u0E21\u0E35\u0E17\u0E31\u0E49\u0E07\u0E41\u0E1E\u0E17\u0E22\u0E4C\u0E41\u0E25\u0E30\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E17\u0E35\u0E48\u0E22\u0E31\u0E48\u0E07\u0E22\u0E37\u0E19\u0E43\u0E2B\u0E49\u0E40\u0E08\u0E49\u0E32\u0E1E\u0E36\u0E48\u0E07\u0E1E\u0E32\u0E2D\u0E35\u0E01\u0E15\u0E48\u0E2D\u0E44\u0E1B",
            choices: [
              {
                id: "clinic.ruins_plundered.choice.leave",
                note: "สติ -10 · ภัยคุกคามในโรงพยาบาล +25 · คลินิกถูกทิ้งร้าง",
                text: "\u0E40\u0E01\u0E47\u0E1A\u0E40\u0E28\u0E29\u0E0B\u0E32\u0E01\u0E22\u0E32\u0E17\u0E35\u0E48\u0E15\u0E01\u0E2D\u0E22\u0E39\u0E48\u0E1A\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E41\u0E25\u0E49\u0E27\u0E40\u0E14\u0E34\u0E19\u0E01\u0E25\u0E31\u0E1A\u0E2A\u0E39\u0E48\u0E16\u0E19\u0E19\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E25\u0E02\u0E28\u0E39\u0E19\u0E22\u0E4C",
                effects: [
                  { type: "flag.set", id: "clinic.outcome", value: "plundered" },
                  { type: "location.threat.add", id: "hospital", value: 25 },
                  { type: "stat.add", key: "sanity", value: -10 }
                ]
              }
            ]
          }
        ];
        return { EVENTS, FLAGS, NPCS, RESOURCES };
      });
    }
  });

  // ../../tmp/after-zero-zombie/data/events/pack.js
  var require_pack = __commonJS({
    "../../tmp/after-zero-zombie/data/events/pack.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) {
          module.exports = factory();
        } else {
          root.ZombieData = root.ZombieData || {};
          root.ZombieData.PACK = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        const FLAGS = {
          "pack.alpha_saved": {
            type: "boolean",
            default: false
          },
          "pack.alpha_challenged": {
            type: "boolean",
            default: false
          },
          "pack.guard_drilled": {
            type: "boolean",
            default: false
          },
          "pack.outcome": {
            type: "string",
            default: "none"
          }
        };
        const NPCS = {
          "pack.alpha": {
            states: [
              "wounded",
              "recovered",
              "exiled",
              "dead"
            ]
          },
          "pack.guard": {
            states: [
              "wandering",
              "drilling",
              "fallen"
            ]
          }
        };
        const RESOURCES = {};
        const EVENTS = [
          {
            id: "pack.wounded_alpha",
            title: "\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E1D\u0E39\u0E07\u0E17\u0E35\u0E48\u0E1A\u0E32\u0E14\u0E40\u0E08\u0E47\u0E1A",
            text: "ในซอยแคบใต้สะพานข้ามแยกที่ระเกะระกะไปด้วยป้ายหาเสียงผุพังและสายไฟห้อยระโยงระยาง ฝูงซอมบี้กลุ่มเล็กกำลังยืนล้อมร่างจ่าฝูงที่ถูกเหล็กเส้นเสียบตรึงติดกับตอม่อสะพาน มันส่งเสียงขู่ฟ่ออย่างทรมานแต่ไร้ทางหนี สัญชาตญาณคนตายของพวกมันรับรู้ได้ถึงอำนาจบางอย่างที่แผ่ออกมาจากตัวเจ้า ขณะที่ปลายซอยเริ่มมีเสียงมนุษย์ตะโกนก้อง: \"กลิ่นเน่าแถวนี้แรงมาก มึงเตรียมอาวุธไว้!\" เจ้าจะยื่นมือเข้าช่วย หรือใช้กำลังกำราบพวกมัน",
            requirements: {
              all: [
                { kind: "location", id: "streets" },
                { kind: "npc", id: "pack.alpha", field: "alive", value: true },
                { kind: "npc", id: "pack.alpha", field: "state", value: "wounded" }
              ]
            },
            choices: [
              {
                id: "pack.wounded_alpha.help",
                text: "\u0E07\u0E31\u0E14\u0E40\u0E2B\u0E25\u0E47\u0E01\u0E40\u0E2A\u0E49\u0E19\u0E2D\u0E2D\u0E01\u0E41\u0E25\u0E30\u0E1E\u0E22\u0E38\u0E07\u0E08\u0E48\u0E32\u0E1D\u0E39\u0E07\u0E02\u0E36\u0E49\u0E19",
                note: "สภาพร่าง -5 · อำนาจฝูง +20 · สติ +5 · จ่าฝูงฟื้นตัว",
                requirements: {
                  all: [
                    { kind: "npc", id: "pack.alpha", field: "alive", value: true },
                    { kind: "npc", id: "pack.alpha", field: "state", value: "wounded" },
                    { kind: "stat", key: "hp", min: 20 },
                    { kind: "stat", key: "sanity", min: 15 }
                  ]
                },
                costs: [
                  { type: "stat.add", key: "hp", value: -5 }
                ],
                effects: [
                  { type: "stat.add", key: "horde", value: 20 },
                  { type: "stat.add", key: "sanity", value: 5 },
                  { type: "flag.set", id: "pack.alpha_saved", value: true },
                  { type: "npc.set", id: "pack.alpha", field: "state", value: "recovered" }
                ],
                behaviorTags: ["helped", "hordeLed"],
                followups: [
                  {
                    eventId: "pack.guard_drill",
                    afterDays: 1
                  }
                ]
              },
              {
                id: "pack.wounded_alpha.challenge",
                text: "\u0E04\u0E33\u0E23\u0E32\u0E21\u0E02\u0E48\u0E21\u0E02\u0E39\u0E48\u0E41\u0E25\u0E30\u0E02\u0E31\u0E1A\u0E44\u0E25\u0E48\u0E08\u0E48\u0E32\u0E1D\u0E39\u0E07\u0E17\u0E35\u0E48\u0E2D\u0E48\u0E2D\u0E19\u0E41\u0E2D\u0E2D\u0E2D\u0E01\u0E44\u0E1B",
                note: "สภาพร่าง -5 · อำนาจฝูง +15 · สติ -5 · จ่าฝูงเดิมถูกขับไล่",
                requirements: {
                  all: [
                    { kind: "npc", id: "pack.alpha", field: "alive", value: true },
                    { kind: "npc", id: "pack.alpha", field: "state", value: "wounded" },
                    { kind: "stat", key: "hp", min: 25 }
                  ]
                },
                costs: [
                  { type: "stat.add", key: "hp", value: -5 }
                ],
                effects: [
                  { type: "stat.add", key: "horde", value: 15 },
                  { type: "stat.add", key: "sanity", value: -5 },
                  { type: "flag.set", id: "pack.alpha_challenged", value: true },
                  { type: "npc.set", id: "pack.alpha", field: "state", value: "exiled" }
                ],
                behaviorTags: ["hordeLed"],
                followups: [
                  {
                    eventId: "pack.guard_drill",
                    afterDays: 1
                  }
                ]
              },
              {
                id: "pack.wounded_alpha.stealth",
                text: "\u0E2A\u0E48\u0E07\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E1E\u0E32\u0E1D\u0E39\u0E07\u0E2B\u0E25\u0E1A\u0E40\u0E02\u0E49\u0E32\u0E40\u0E07\u0E32\u0E21\u0E37\u0E14\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E07\u0E35\u0E22\u0E1A\u0E40\u0E0A\u0E35\u0E22\u0E1A",
                note: "ใช้สติปัญญาเลี่ยงการปะทะ · อำนาจฝูง +10 · สติ +5",
                requirements: {
                  all: [
                    { kind: "npc", id: "pack.alpha", field: "alive", value: true },
                    { kind: "npc", id: "pack.alpha", field: "state", value: "wounded" },
                    { kind: "stat", key: "sanity", min: 20 }
                  ]
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "horde", value: 10 },
                  { type: "stat.add", key: "sanity", value: 5 },
                  { type: "npc.set", id: "pack.alpha", field: "state", value: "recovered" }
                ],
                behaviorTags: ["hordeLed"],
                followups: [
                  {
                    eventId: "pack.guard_drill",
                    afterDays: 1
                  }
                ]
              },
              {
                id: "pack.wounded_alpha.fallback",
                text: "\u0E16\u0E2D\u0E22\u0E2B\u0E48\u0E32\u0E07\u0E2D\u0E2D\u0E01\u0E21\u0E32\u0E14\u0E39\u0E2A\u0E16\u0E32\u0E19\u0E01\u0E32\u0E23\u0E13\u0E4C \u0E44\u0E21\u0E48\u0E40\u0E02\u0E49\u0E32\u0E44\u0E1B\u0E41\u0E17\u0E23\u0E01\u0E41\u0E0B\u0E07\u0E42\u0E14\u0E22\u0E15\u0E23\u0E07",
                note: "\u0E17\u0E32\u0E07\u0E23\u0E2D\u0E14\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 \xB7 \u0E44\u0E21\u0E48\u0E40\u0E2A\u0E35\u0E22\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E32\u0E01\u0E23 \xB7 \u0E40\u0E1D\u0E49\u0E32\u0E14\u0E39\u0E01\u0E32\u0E23\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E2B\u0E27\u0E02\u0E2D\u0E07\u0E1D\u0E39\u0E07",
                requirements: {
                  all: []
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "horde", value: 5 }
                ],
                behaviorTags: [],
                followups: [
                  {
                    eventId: "pack.guard_drill",
                    afterDays: 1
                  }
                ]
              }
            ]
          },
          {
            id: "pack.guard_drill",
            title: "\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E41\u0E16\u0E27\u0E02\u0E2D\u0E07\u0E2D\u0E14\u0E35\u0E15 \u0E23\u0E1B\u0E20.",
            text: '\u0E1D\u0E39\u0E07\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E21\u0E32\u0E23\u0E27\u0E21\u0E15\u0E31\u0E27\u0E01\u0E31\u0E19\u0E17\u0E35\u0E48\u0E25\u0E32\u0E19\u0E08\u0E2D\u0E14\u0E23\u0E16\u0E15\u0E36\u0E01\u0E23\u0E49\u0E32\u0E07 \u0E17\u0E31\u0E19\u0E43\u0E14\u0E19\u0E31\u0E49\u0E19 \u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E23\u0E48\u0E32\u0E07\u0E17\u0E49\u0E27\u0E21\u0E43\u0E19\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E41\u0E1A\u0E1A \u0E23\u0E1B\u0E20. \u0E04\u0E2D\u0E19\u0E42\u0E14\u0E2F \u0E40\u0E01\u0E48\u0E32\u0E02\u0E32\u0E14\u0E27\u0E34\u0E48\u0E19 \u0E40\u0E14\u0E34\u0E19\u0E01\u0E30\u0E40\u0E1C\u0E25\u0E01\u0E2D\u0E2D\u0E01\u0E21\u0E32\u0E22\u0E37\u0E19\u0E15\u0E23\u0E07\u0E40\u0E1B\u0E48\u0E32\u0E19\u0E01\u0E2B\u0E27\u0E35\u0E14\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E41\u0E2B\u0E25\u0E21\u0E14\u0E31\u0E07\u0E25\u0E31\u0E48\u0E19 "\u0E1B\u0E23\u0E35\u0E4A\u0E14! \u0E15\u0E36\u0E07\u0E46!" \u0E21\u0E31\u0E19\u0E1E\u0E22\u0E32\u0E22\u0E32\u0E21\u0E01\u0E27\u0E31\u0E01\u0E21\u0E37\u0E2D\u0E08\u0E31\u0E14\u0E41\u0E16\u0E27\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E43\u0E2B\u0E49\u0E40\u0E14\u0E34\u0E19\u0E40\u0E23\u0E35\u0E22\u0E07\u0E40\u0E14\u0E35\u0E48\u0E22\u0E27\u0E15\u0E32\u0E21\u0E23\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E1A\u0E17\u0E35\u0E48\u0E21\u0E31\u0E19\u0E40\u0E04\u0E22\u0E0A\u0E34\u0E19\u0E2A\u0E21\u0E31\u0E22\u0E21\u0E35\u0E0A\u0E35\u0E27\u0E34\u0E15 \u0E40\u0E2A\u0E35\u0E22\u0E07\u0E19\u0E01\u0E2B\u0E27\u0E35\u0E14\u0E2A\u0E30\u0E17\u0E49\u0E2D\u0E19\u0E01\u0E49\u0E2D\u0E07\u0E15\u0E36\u0E01\u0E23\u0E49\u0E32\u0E07\u0E41\u0E25\u0E30\u0E25\u0E2D\u0E22\u0E02\u0E49\u0E32\u0E21\u0E01\u0E33\u0E41\u0E1E\u0E07\u0E44\u0E1B \u0E40\u0E2A\u0E35\u0E22\u0E07\u0E14\u0E31\u0E07\u0E02\u0E19\u0E32\u0E14\u0E19\u0E35\u0E49\u0E22\u0E48\u0E2D\u0E21\u0E14\u0E36\u0E07\u0E14\u0E39\u0E14\u0E2B\u0E39\u0E02\u0E2D\u0E07\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E41\u0E16\u0E27\u0E19\u0E35\u0E49\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E41\u0E19\u0E48\u0E19\u0E2D\u0E19',
            requirements: {
              all: []
            },
            choices: [
              {
                id: "pack.guard_drill.allow",
                text: "\u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E43\u0E2B\u0E49\u0E2D\u0E14\u0E35\u0E15 \u0E23\u0E1B\u0E20. \u0E40\u0E14\u0E34\u0E19\u0E41\u0E16\u0E27\u0E40\u0E1B\u0E48\u0E32\u0E19\u0E01\u0E2B\u0E27\u0E35\u0E14\u0E04\u0E38\u0E21\u0E23\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E1A\u0E15\u0E48\u0E2D\u0E44\u0E1B",
                note: "ฝูงคึกคักแต่เสียงดังล่อศัตรู · อำนาจฝูง +10 · ภัยคุกคามบนถนน +15",
                requirements: {
                  all: [
                    { kind: "npc", id: "pack.guard", field: "alive", value: true },
                    { kind: "npc", id: "pack.guard", field: "state", value: "wandering" }
                  ]
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "horde", value: 10 },
                  { type: "location.threat.add", id: "streets", value: 15 },
                  { type: "flag.set", id: "pack.guard_drilled", value: true },
                  { type: "npc.set", id: "pack.guard", field: "state", value: "drilling" }
                ],
                behaviorTags: ["hordeLed"],
                followups: [
                  {
                    eventId: "pack.human_alert",
                    afterDays: 1
                  }
                ]
              },
              {
                id: "pack.guard_drill.silence",
                text: "\u0E15\u0E1A\u0E1B\u0E32\u0E01\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E2A\u0E15\u0E34\u0E41\u0E25\u0E30\u0E01\u0E23\u0E30\u0E0A\u0E32\u0E01\u0E19\u0E01\u0E2B\u0E27\u0E35\u0E14\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E04\u0E2D\u0E02\u0E2D\u0E07\u0E21\u0E31\u0E19",
                note: "สภาพร่าง -2 · อำนาจฝูง +5 · สติ +5 · ไม่เพิ่มภัยคุกคาม",
                requirements: {
                  all: [
                    { kind: "npc", id: "pack.guard", field: "alive", value: true },
                    { kind: "npc", id: "pack.guard", field: "state", value: "wandering" },
                    { kind: "stat", key: "hp", min: 3 },
                    { kind: "stat", key: "sanity", min: 15 }
                  ]
                },
                costs: [
                  { type: "stat.add", key: "hp", value: -2 }
                ],
                effects: [
                  { type: "stat.add", key: "horde", value: 5 },
                  { type: "stat.add", key: "sanity", value: 5 },
                  { type: "flag.set", id: "pack.guard_drilled", value: false },
                  { type: "npc.set", id: "pack.guard", field: "state", value: "wandering" }
                ],
                behaviorTags: ["hordeLed"],
                followups: [
                  {
                    eventId: "pack.human_alert",
                    afterDays: 1
                  }
                ]
              },
              {
                id: "pack.guard_drill.fallback",
                text: "\u0E22\u0E37\u0E19\u0E14\u0E39\u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E48\u0E32\u0E07\u0E46 \u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E43\u0E2B\u0E49\u0E2D\u0E14\u0E35\u0E15 \u0E23\u0E1B\u0E20. \u0E2B\u0E21\u0E14\u0E41\u0E23\u0E07\u0E40\u0E1B\u0E48\u0E32\u0E44\u0E1B\u0E40\u0E2D\u0E07",
                note: "เสียงยังดังแว่วไปบ้าง · ภัยคุกคามบนถนน +10",
                requirements: {
                  all: []
                },
                costs: [],
                effects: [
                  { type: "location.threat.add", id: "streets", value: 10 }
                ],
                behaviorTags: [],
                followups: [
                  {
                    eventId: "pack.human_alert",
                    afterDays: 1
                  }
                ]
              }
            ]
          },
          {
            id: "pack.human_alert",
            title: "\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E23\u0E27\u0E21\u0E1E\u0E25\u0E1B\u0E34\u0E14\u0E25\u0E49\u0E2D\u0E21",
            text: '\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E04\u0E27\u0E32\u0E21\u0E27\u0E38\u0E48\u0E19\u0E27\u0E32\u0E22\u0E44\u0E21\u0E48\u0E23\u0E2D\u0E14\u0E1E\u0E49\u0E19\u0E2B\u0E39\u0E15\u0E32\u0E02\u0E2D\u0E07\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C \u0E41\u0E2A\u0E07\u0E44\u0E1F\u0E09\u0E32\u0E22\u0E41\u0E23\u0E07\u0E2A\u0E39\u0E07\u0E2A\u0E32\u0E14\u0E01\u0E23\u0E32\u0E14\u0E40\u0E02\u0E49\u0E32\u0E21\u0E32\u0E43\u0E19\u0E0B\u0E32\u0E01\u0E15\u0E36\u0E01 \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E01\u0E23\u0E30\u0E0A\u0E32\u0E01\u0E25\u0E39\u0E01\u0E40\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E1B\u0E37\u0E19\u0E41\u0E25\u0E30\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E27\u0E34\u0E17\u0E22\u0E38\u0E2A\u0E37\u0E48\u0E2D\u0E2A\u0E32\u0E23\u0E14\u0E31\u0E07\u0E0B\u0E48\u0E32: "\u0E1E\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E2B\u0E27\u0E02\u0E2D\u0E07\u0E1D\u0E39\u0E07\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E43\u0E19\u0E1A\u0E25\u0E47\u0E2D\u0E01\u0E19\u0E35\u0E49 \u0E1B\u0E34\u0E14\u0E25\u0E49\u0E2D\u0E21\u0E17\u0E32\u0E07\u0E2D\u0E2D\u0E01\u0E17\u0E38\u0E01\u0E14\u0E49\u0E32\u0E19!" \u0E01\u0E25\u0E38\u0E48\u0E21\u0E15\u0E34\u0E14\u0E2D\u0E32\u0E27\u0E38\u0E18\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E40\u0E23\u0E34\u0E48\u0E21\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E02\u0E49\u0E32\u0E42\u0E2D\u0E1A\u0E25\u0E49\u0E2D\u0E21\u0E1B\u0E32\u0E01\u0E17\u0E32\u0E07 \u0E1D\u0E39\u0E07\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E23\u0E2D\u0E1A\u0E15\u0E31\u0E27\u0E40\u0E23\u0E34\u0E48\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E02\u0E39\u0E48\u0E1F\u0E48\u0E2D\u0E01\u0E23\u0E30\u0E27\u0E19\u0E01\u0E23\u0E30\u0E27\u0E32\u0E22 \u0E2B\u0E31\u0E19\u0E21\u0E32\u0E21\u0E2D\u0E07\u0E14\u0E39\u0E01\u0E32\u0E23\u0E15\u0E31\u0E14\u0E2A\u0E34\u0E19\u0E43\u0E08\u0E02\u0E2D\u0E07\u0E40\u0E08\u0E49\u0E32',
            requirements: {
              all: []
            },
            choices: [
              {
                id: "pack.human_alert.tactics",
                text: "\u0E40\u0E1E\u0E48\u0E07\u0E21\u0E2D\u0E07\u0E41\u0E19\u0E27\u0E42\u0E2D\u0E1A\u0E25\u0E49\u0E2D\u0E21\u0E02\u0E2D\u0E07\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C \u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E23\u0E30\u0E22\u0E30\u0E41\u0E25\u0E30\u0E08\u0E38\u0E14\u0E2D\u0E48\u0E2D\u0E19",
                note: "ใช้สติปัญญาวางแผน · สติ +5 · เตรียมออกคำสั่งเด็ดขาด",
                requirements: {
                  all: [
                    { kind: "stat", key: "sanity", min: 10 }
                  ]
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "sanity", value: 5 }
                ],
                behaviorTags: [],
                followups: [
                  {
                    eventId: "pack.decision",
                    afterDays: 1
                  }
                ]
              },
              {
                id: "pack.human_alert.rally",
                text: "\u0E04\u0E33\u0E23\u0E32\u0E21\u0E01\u0E49\u0E2D\u0E07\u0E2A\u0E48\u0E07\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E40\u0E23\u0E35\u0E22\u0E01\u0E1D\u0E39\u0E07\u0E43\u0E2B\u0E49\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E23\u0E31\u0E1A\u0E21\u0E37\u0E2D",
                note: "รวบรวมขวัญกำลังใจ · อำนาจฝูง +10 · เตรียมเข้าสู่การตัดสินใจ",
                requirements: {
                  all: [
                    { kind: "stat", key: "horde", min: 15 }
                  ]
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "horde", value: 10 }
                ],
                behaviorTags: ["hordeLed"],
                followups: [
                  {
                    eventId: "pack.decision",
                    afterDays: 1
                  }
                ]
              },
              {
                id: "pack.human_alert.fallback",
                text: "\u0E2B\u0E21\u0E2D\u0E1A\u0E15\u0E48\u0E33\u0E23\u0E2D\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E30\u0E43\u0E19\u0E21\u0E38\u0E21\u0E2D\u0E31\u0E1A \u0E44\u0E21\u0E48\u0E40\u0E1C\u0E22\u0E15\u0E31\u0E27\u0E08\u0E19\u0E01\u0E27\u0E48\u0E32\u0E08\u0E30\u0E16\u0E36\u0E07\u0E40\u0E27\u0E25\u0E32",
                note: "\u0E17\u0E32\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 \xB7 \u0E40\u0E1D\u0E49\u0E32\u0E23\u0E30\u0E27\u0E31\u0E07\u0E20\u0E31\u0E22\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E23\u0E30\u0E21\u0E31\u0E14\u0E23\u0E30\u0E27\u0E31\u0E07",
                requirements: {
                  all: []
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "sanity", value: -2 }
                ],
                behaviorTags: [],
                followups: [
                  {
                    eventId: "pack.decision",
                    afterDays: 1
                  }
                ]
              }
            ]
          },
          {
            id: "pack.decision",
            title: "\u0E17\u0E32\u0E07\u0E41\u0E22\u0E01\u0E41\u0E2B\u0E48\u0E07\u0E01\u0E32\u0E23\u0E19\u0E33\u0E1E\u0E32",
            text: "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E25\u0E32\u0E14\u0E15\u0E23\u0E30\u0E40\u0E27\u0E19\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E1B\u0E23\u0E30\u0E0A\u0E34\u0E14\u0E40\u0E02\u0E49\u0E32\u0E21\u0E32\u0E16\u0E36\u0E07\u0E41\u0E19\u0E27\u0E01\u0E33\u0E41\u0E1E\u0E07\u0E2D\u0E34\u0E10\u0E1A\u0E25\u0E47\u0E2D\u0E01 \u0E0B\u0E32\u0E01\u0E23\u0E16\u0E40\u0E21\u0E25\u0E4C\u0E41\u0E25\u0E30\u0E01\u0E23\u0E30\u0E2A\u0E2D\u0E1A\u0E17\u0E23\u0E32\u0E22\u0E01\u0E31\u0E49\u0E19\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E2A\u0E2D\u0E07\u0E1D\u0E48\u0E32\u0E22 \u0E2D\u0E35\u0E01\u0E40\u0E1E\u0E35\u0E22\u0E07\u0E44\u0E21\u0E48\u0E01\u0E35\u0E48\u0E01\u0E49\u0E32\u0E27 \u0E01\u0E23\u0E30\u0E2A\u0E38\u0E19\u0E1B\u0E37\u0E19\u0E41\u0E25\u0E30\u0E25\u0E39\u0E01\u0E44\u0E1F\u0E08\u0E30\u0E16\u0E39\u0E01\u0E2A\u0E32\u0E14\u0E40\u0E02\u0E49\u0E32\u0E21\u0E32 \u0E43\u0E19\u0E10\u0E32\u0E19\u0E30\u0E1C\u0E39\u0E49\u0E19\u0E33\u0E1D\u0E39\u0E07 \u0E40\u0E08\u0E49\u0E32\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E0A\u0E35\u0E49\u0E02\u0E32\u0E14: \u0E08\u0E30\u0E43\u0E0A\u0E49\u0E2D\u0E33\u0E19\u0E32\u0E08\u0E41\u0E25\u0E30\u0E2A\u0E15\u0E34\u0E1B\u0E31\u0E0D\u0E0D\u0E32\u0E04\u0E38\u0E49\u0E21\u0E04\u0E23\u0E2D\u0E07\u0E1D\u0E39\u0E07\u0E43\u0E2B\u0E49\u0E23\u0E2D\u0E14\u0E44\u0E1B\u0E14\u0E49\u0E27\u0E22\u0E01\u0E31\u0E19 \u0E2B\u0E23\u0E37\u0E2D\u0E08\u0E30\u0E2A\u0E48\u0E07\u0E1D\u0E39\u0E07\u0E40\u0E02\u0E49\u0E32\u0E1A\u0E38\u0E01\u0E15\u0E30\u0E25\u0E38\u0E21\u0E1A\u0E2D\u0E19\u0E09\u0E35\u0E01\u0E41\u0E19\u0E27\u0E23\u0E1A\u0E02\u0E2D\u0E07\u0E28\u0E31\u0E15\u0E23\u0E39",
            requirements: {
              all: []
            },
            choices: [
              {
                id: "pack.decision.shield",
                text: "\u0E43\u0E0A\u0E49\u0E2D\u0E33\u0E19\u0E32\u0E08\u0E2A\u0E31\u0E48\u0E07\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E41\u0E16\u0E27\u0E04\u0E38\u0E49\u0E21\u0E04\u0E23\u0E2D\u0E07\u0E1D\u0E39\u0E07\u0E41\u0E25\u0E30\u0E23\u0E31\u0E1A\u0E41\u0E23\u0E07\u0E1B\u0E30\u0E17\u0E30",
                note: "ยอมรับภาระเพื่อรักษาชีวิตฝูง · อำนาจฝูง +15 · ความไว้ใจ +10 · สภาพร่าง -10",
                requirements: {
                  all: [
                    { kind: "stat", key: "horde", min: 20 },
                    { kind: "stat", key: "hp", min: 11 }
                  ]
                },
                costs: [
                  { type: "stat.add", key: "hp", value: -10 }
                ],
                effects: [
                  { type: "stat.add", key: "horde", value: 15 },
                  { type: "stat.add", key: "trust", value: 10 },
                  { type: "flag.set", id: "pack.outcome", value: "shield" }
                ],
                behaviorTags: ["helped", "hordeLed"],
                followups: [
                  {
                    eventId: "pack.outcome_shield",
                    afterDays: 1
                  }
                ]
              },
              {
                id: "pack.decision.assault",
                text: "\u0E2A\u0E48\u0E07\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E04\u0E33\u0E23\u0E32\u0E21\u0E2A\u0E31\u0E48\u0E07\u0E43\u0E2B\u0E49\u0E1D\u0E39\u0E07\u0E1A\u0E38\u0E01\u0E1E\u0E38\u0E48\u0E07\u0E0A\u0E19\u0E41\u0E19\u0E27\u0E23\u0E1A\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C",
                note: "ใช้กำลังบดขยี้แต่เสียลูกฝูง · อำนาจฝูง -5 · ความไว้ใจ -5 · สภาพร่าง -10",
                requirements: {
                  all: [
                    { kind: "stat", key: "horde", min: 15 },
                    { kind: "stat", key: "hp", min: 11 }
                  ]
                },
                costs: [
                  { type: "stat.add", key: "hp", value: -10 }
                ],
                effects: [
                  { type: "stat.add", key: "horde", value: -5 },
                  { type: "stat.add", key: "trust", value: -5 },
                  { type: "flag.set", id: "pack.outcome", value: "assault" }
                ],
                behaviorTags: ["hordeLed"],
                followups: [
                  {
                    eventId: "pack.outcome_assault",
                    afterDays: 1
                  }
                ]
              },
              {
                id: "pack.decision.fallback",
                text: "\u0E19\u0E33\u0E1D\u0E39\u0E07\u0E1E\u0E38\u0E48\u0E07\u0E0A\u0E19\u0E2A\u0E34\u0E48\u0E07\u0E01\u0E35\u0E14\u0E02\u0E27\u0E32\u0E07\u0E14\u0E49\u0E32\u0E19\u0E02\u0E49\u0E32\u0E07\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1E\u0E32\u0E1D\u0E39\u0E07\u0E23\u0E2D\u0E14\u0E44\u0E1B\u0E14\u0E49\u0E27\u0E22\u0E15\u0E19\u0E40\u0E2D\u0E07",
                note: "\u0E17\u0E32\u0E07\u0E23\u0E2D\u0E14\u0E09\u0E38\u0E01\u0E40\u0E09\u0E34\u0E19\u0E22\u0E32\u0E21\u0E44\u0E23\u0E49\u0E2D\u0E33\u0E19\u0E32\u0E08\u0E1D\u0E39\u0E07 \xB7 \u0E19\u0E33\u0E1D\u0E39\u0E07\u0E23\u0E2D\u0E14\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E17\u0E38\u0E25\u0E31\u0E01\u0E17\u0E38\u0E40\u0E25",
                requirements: {
                  all: []
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "horde", value: 5 },
                  { type: "flag.set", id: "pack.outcome", value: "shield" }
                ],
                behaviorTags: ["hordeLed"],
                followups: [
                  {
                    eventId: "pack.outcome_shield",
                    afterDays: 1
                  }
                ]
              }
            ]
          },
          {
            id: "pack.outcome_shield",
            title: "\u0E1C\u0E25\u0E25\u0E31\u0E1E\u0E18\u0E4C: \u0E40\u0E01\u0E23\u0E32\u0E30\u0E01\u0E33\u0E1A\u0E31\u0E07\u0E41\u0E2B\u0E48\u0E07\u0E04\u0E27\u0E32\u0E21\u0E20\u0E31\u0E01\u0E14\u0E35",
            text: "\u0E14\u0E49\u0E27\u0E22\u0E01\u0E32\u0E23\u0E19\u0E33\u0E1E\u0E32\u0E2D\u0E31\u0E19\u0E23\u0E2D\u0E1A\u0E04\u0E2D\u0E1A\u0E41\u0E25\u0E30\u0E22\u0E2D\u0E21\u0E40\u0E2A\u0E35\u0E22\u0E2A\u0E25\u0E30\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E48\u0E27\u0E19\u0E23\u0E27\u0E21 \u0E1D\u0E39\u0E07\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E23\u0E27\u0E21\u0E1E\u0E25\u0E31\u0E07\u0E0A\u0E48\u0E27\u0E22\u0E01\u0E31\u0E19\u0E14\u0E31\u0E19\u0E0B\u0E32\u0E01\u0E23\u0E16\u0E41\u0E25\u0E30\u0E41\u0E1C\u0E07\u0E40\u0E2B\u0E25\u0E47\u0E01\u0E23\u0E31\u0E1A\u0E41\u0E23\u0E07\u0E1B\u0E30\u0E17\u0E30 \u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E17\u0E35\u0E48\u0E40\u0E2B\u0E47\u0E19\u0E04\u0E27\u0E32\u0E21\u0E40\u0E2B\u0E19\u0E35\u0E22\u0E27\u0E41\u0E19\u0E48\u0E19\u0E1C\u0E34\u0E14\u0E27\u0E34\u0E2A\u0E31\u0E22\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E17\u0E31\u0E48\u0E27\u0E44\u0E1B\u0E40\u0E23\u0E34\u0E48\u0E21\u0E16\u0E2D\u0E22\u0E23\u0E48\u0E19\u0E40\u0E1E\u0E23\u0E32\u0E30\u0E01\u0E25\u0E31\u0E27\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E39\u0E0D\u0E40\u0E2A\u0E35\u0E22 \u0E1D\u0E39\u0E07\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E23\u0E32\u0E22\u0E25\u0E49\u0E2D\u0E21\u0E15\u0E31\u0E27\u0E40\u0E08\u0E49\u0E32\u0E14\u0E49\u0E27\u0E22\u0E04\u0E27\u0E32\u0E21\u0E22\u0E2D\u0E21\u0E23\u0E31\u0E1A\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E41\u0E17\u0E49\u0E08\u0E23\u0E34\u0E07 \u0E2A\u0E32\u0E22\u0E2A\u0E31\u0E21\u0E1E\u0E31\u0E19\u0E18\u0E4C\u0E02\u0E2D\u0E07\u0E1D\u0E39\u0E07\u0E01\u0E48\u0E2D\u0E15\u0E31\u0E27\u0E02\u0E36\u0E49\u0E19\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E21\u0E31\u0E48\u0E19\u0E04\u0E07",
            requirements: {
              all: []
            },
            choices: [
              {
                id: "pack.outcome_shield.rally",
                text: "\u0E15\u0E23\u0E27\u0E08\u0E14\u0E39\u0E04\u0E27\u0E32\u0E21\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E02\u0E2D\u0E07\u0E1D\u0E39\u0E07\u0E41\u0E25\u0E30\u0E08\u0E31\u0E14\u0E15\u0E31\u0E49\u0E07\u0E2D\u0E32\u0E13\u0E32\u0E40\u0E02\u0E15\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22",
                note: "อำนาจฝูง +10 · สติ +5 · เสริมความมั่นคงของฝูง",
                requirements: {
                  all: [
                    { kind: "stat", key: "sanity", min: 15 }
                  ]
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "horde", value: 10 },
                  { type: "stat.add", key: "sanity", value: 5 }
                ],
                behaviorTags: ["hordeLed"]
              },
              {
                id: "pack.outcome_shield.peace",
                text: "\u0E22\u0E37\u0E19\u0E21\u0E2D\u0E07\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E17\u0E35\u0E48\u0E25\u0E48\u0E32\u0E16\u0E2D\u0E22\u0E44\u0E1B\u0E14\u0E49\u0E27\u0E22\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E07\u0E1A\u0E43\u0E19\u0E08\u0E34\u0E15\u0E43\u0E08",
                note: "สติ +10 · ความไว้ใจ +5 · จิตใจสงบนิ่ง",
                requirements: {
                  all: [
                    { kind: "stat", key: "trust", min: 10 }
                  ]
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "sanity", value: 10 },
                  { type: "stat.add", key: "trust", value: 5 }
                ],
                behaviorTags: []
              },
              {
                id: "pack.outcome_shield.fallback",
                text: "\u0E1E\u0E31\u0E01\u0E1C\u0E48\u0E2D\u0E19\u0E17\u0E48\u0E32\u0E21\u0E01\u0E25\u0E32\u0E07\u0E1D\u0E39\u0E07\u0E17\u0E35\u0E48\u0E04\u0E2D\u0E22\u0E22\u0E37\u0E19\u0E04\u0E38\u0E49\u0E21\u0E01\u0E31\u0E19",
                note: "อำนาจฝูง +5 · ได้รับการคุ้มครองจากฝูง",
                requirements: {
                  all: []
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "horde", value: 5 }
                ],
                behaviorTags: []
              }
            ]
          },
          {
            id: "pack.outcome_assault",
            title: "\u0E1C\u0E25\u0E25\u0E31\u0E1E\u0E18\u0E4C: \u0E01\u0E32\u0E23\u0E1A\u0E38\u0E01\u0E17\u0E30\u0E25\u0E27\u0E07\u0E2D\u0E31\u0E19\u0E14\u0E38\u0E23\u0E49\u0E32\u0E22",
            text: "\u0E04\u0E25\u0E37\u0E48\u0E19\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E1A\u0E49\u0E32\u0E04\u0E25\u0E31\u0E48\u0E07\u0E1E\u0E38\u0E48\u0E07\u0E40\u0E02\u0E49\u0E32\u0E09\u0E35\u0E01\u0E17\u0E36\u0E49\u0E07\u0E41\u0E19\u0E27\u0E15\u0E31\u0E49\u0E07\u0E23\u0E31\u0E1A\u0E02\u0E2D\u0E07\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E08\u0E19\u0E41\u0E15\u0E01\u0E1E\u0E48\u0E32\u0E22 \u0E40\u0E2A\u0E35\u0E22\u0E07\u0E01\u0E23\u0E35\u0E14\u0E23\u0E49\u0E2D\u0E07\u0E41\u0E25\u0E30\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E1B\u0E37\u0E19\u0E40\u0E07\u0E35\u0E22\u0E1A\u0E2B\u0E32\u0E22\u0E44\u0E1B \u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E40\u0E1E\u0E35\u0E22\u0E07\u0E0B\u0E32\u0E01\u0E1B\u0E23\u0E31\u0E01\u0E2B\u0E31\u0E01\u0E1E\u0E31\u0E07\u0E41\u0E25\u0E30\u0E1B\u0E25\u0E2D\u0E01\u0E01\u0E23\u0E30\u0E2A\u0E38\u0E19\u0E40\u0E01\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E16\u0E19\u0E19 \u0E41\u0E21\u0E49\u0E1D\u0E39\u0E07\u0E08\u0E30\u0E2A\u0E39\u0E0D\u0E40\u0E2A\u0E35\u0E22\u0E1E\u0E23\u0E23\u0E04\u0E1E\u0E27\u0E01\u0E44\u0E1B\u0E1A\u0E49\u0E32\u0E07 \u0E41\u0E15\u0E48\u0E0A\u0E31\u0E22\u0E0A\u0E19\u0E30\u0E14\u0E49\u0E27\u0E22\u0E1E\u0E25\u0E30\u0E01\u0E33\u0E25\u0E31\u0E07\u0E2D\u0E31\u0E19\u0E1B\u0E48\u0E32\u0E40\u0E16\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E14\u0E49\u0E15\u0E2D\u0E01\u0E22\u0E49\u0E33\u0E2D\u0E33\u0E19\u0E32\u0E08\u0E40\u0E14\u0E47\u0E14\u0E02\u0E32\u0E14\u0E02\u0E2D\u0E07\u0E40\u0E08\u0E49\u0E32\u0E40\u0E2B\u0E19\u0E37\u0E2D\u0E1D\u0E39\u0E07\u0E17\u0E35\u0E48\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E23\u0E2D\u0E14",
            requirements: {
              all: []
            },
            choices: [
              {
                id: "pack.outcome_assault.roar",
                text: "\u0E22\u0E37\u0E19\u0E15\u0E23\u0E30\u0E2B\u0E07\u0E48\u0E32\u0E19\u0E04\u0E33\u0E23\u0E32\u0E21\u0E01\u0E49\u0E2D\u0E07\u0E1B\u0E23\u0E30\u0E01\u0E32\u0E28\u0E0A\u0E31\u0E22\u0E0A\u0E19\u0E30\u0E40\u0E2B\u0E19\u0E37\u0E2D\u0E0B\u0E32\u0E01\u0E1B\u0E23\u0E31\u0E01\u0E2B\u0E31\u0E01\u0E1E\u0E31\u0E07",
                note: "อำนาจฝูง +10 · สติ -5 · เพิ่มความยำเกรง",
                requirements: {
                  all: [
                    { kind: "stat", key: "horde", min: 10 }
                  ]
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "horde", value: 10 },
                  { type: "stat.add", key: "sanity", value: -5 }
                ],
                behaviorTags: ["hordeLed"]
              },
              {
                id: "pack.outcome_assault.scavenge_supplies",
                text: "\u0E23\u0E27\u0E1A\u0E23\u0E27\u0E21\u0E40\u0E2A\u0E1A\u0E35\u0E22\u0E07\u0E41\u0E25\u0E30\u0E2A\u0E34\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E08\u0E33\u0E40\u0E1B\u0E47\u0E19\u0E17\u0E35\u0E48\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E17\u0E34\u0E49\u0E07\u0E44\u0E27\u0E49",
                note: "เสบียงมนุษย์ +1 · สติ +5",
                requirements: {
                  all: [
                    { kind: "stat", key: "sanity", min: 10 }
                  ]
                },
                costs: [],
                effects: [
                  { type: "item.add", key: "supplies", value: 1 },
                  { type: "stat.add", key: "sanity", value: 5 }
                ],
                behaviorTags: []
              },
              {
                id: "pack.outcome_assault.fallback",
                text: "\u0E23\u0E27\u0E1A\u0E23\u0E27\u0E21\u0E0B\u0E32\u0E01\u0E25\u0E39\u0E01\u0E1D\u0E39\u0E07\u0E17\u0E35\u0E48\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E23\u0E2D\u0E14\u0E41\u0E25\u0E30\u0E16\u0E2D\u0E19\u0E01\u0E33\u0E25\u0E31\u0E07\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48",
                note: "อำนาจฝูง +5 · รวบรวมกำลังพลที่เหลือ",
                requirements: {
                  all: []
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "horde", value: 5 }
                ],
                behaviorTags: []
              }
            ]
          }
        ];
        return {
          FLAGS,
          NPCS,
          RESOURCES,
          EVENTS
        };
      });
    }
  });

  // ../../tmp/after-zero-zombie/data/events/remnant.js
  var require_remnant = __commonJS({
    "../../tmp/after-zero-zombie/data/events/remnant.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) {
          module.exports = factory();
        } else {
          root.ZombieData = root.ZombieData || {};
          root.ZombieData.REMNANT = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        const FLAGS = {
          "remnant.dog_followed": {
            type: "boolean",
            default: false
          },
          "remnant.identity_recalled": {
            type: "boolean",
            default: false
          },
          "remnant.relationship_choice": {
            type: "string",
            default: "none"
          },
          "remnant.outcome": {
            type: "string",
            default: "none"
          }
        };
        const NPCS = {
          "remnant.mali": {
            states: [
              "unknown",
              "met",
              "allied",
              "departed"
            ]
          }
        };
        const RESOURCES = {};
        const EVENTS = [
          {
            id: "remnant.dog_scent",
            title: "\u0E2A\u0E38\u0E19\u0E31\u0E02\u0E08\u0E23\u0E08\u0E31\u0E14\u0E08\u0E33\u0E01\u0E25\u0E34\u0E48\u0E19\u0E44\u0E14\u0E49",
            text: "\u0E0B\u0E32\u0E01\u0E23\u0E48\u0E32\u0E07\u0E17\u0E35\u0E48\u0E40\u0E23\u0E34\u0E48\u0E21\u0E40\u0E19\u0E48\u0E32\u0E40\u0E1B\u0E37\u0E48\u0E2D\u0E22\u0E22\u0E31\u0E07\u0E04\u0E07\u0E2B\u0E25\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E01\u0E25\u0E34\u0E48\u0E19\u0E2D\u0E32\u0E22\u0E1A\u0E32\u0E07\u0E2D\u0E22\u0E48\u0E32\u0E07... \u0E2A\u0E38\u0E19\u0E31\u0E02\u0E1C\u0E2D\u0E21\u0E42\u0E0B\u0E15\u0E31\u0E27\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E2B\u0E22\u0E38\u0E14\u0E0A\u0E30\u0E07\u0E31\u0E01 \u0E21\u0E31\u0E19\u0E14\u0E21\u0E1F\u0E38\u0E14\u0E1F\u0E34\u0E14 \u0E44\u0E21\u0E48\u0E40\u0E2B\u0E48\u0E32\u0E01\u0E23\u0E23\u0E42\u0E0A\u0E01\u0E40\u0E2B\u0E21\u0E37\u0E2D\u0E19\u0E2A\u0E31\u0E15\u0E27\u0E4C\u0E2D\u0E37\u0E48\u0E19 \u0E41\u0E15\u0E48\u0E21\u0E31\u0E19\u0E04\u0E23\u0E32\u0E07\u0E2B\u0E07\u0E34\u0E07\u0E46 \u0E41\u0E25\u0E49\u0E27\u0E41\u0E01\u0E27\u0E48\u0E07\u0E2B\u0E32\u0E07\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E25\u0E31\u0E07\u0E40\u0E25 \u0E2A\u0E32\u0E22\u0E15\u0E32\u0E21\u0E31\u0E19\u0E40\u0E2B\u0E21\u0E37\u0E2D\u0E19\u0E08\u0E33\u0E01\u0E25\u0E34\u0E48\u0E19\u0E02\u0E2D\u0E07\u0E43\u0E04\u0E23\u0E1A\u0E32\u0E07\u0E04\u0E19\u0E43\u0E19\u0E2D\u0E14\u0E35\u0E15\u0E44\u0E14\u0E49 \u0E01\u0E48\u0E2D\u0E19\u0E08\u0E30\u0E2B\u0E31\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E27\u0E34\u0E48\u0E07\u0E40\u0E2B\u0E22\u0E32\u0E30\u0E46 \u0E19\u0E33\u0E17\u0E32\u0E07\u0E44\u0E1B\u0E43\u0E19\u0E15\u0E23\u0E2D\u0E01\u0E41\u0E04\u0E1A",
            requirements: {
              all: []
            },
            choices: [
              {
                id: "remnant.dog_scent.follow",
                text: "\u0E01\u0E49\u0E32\u0E27\u0E40\u0E17\u0E49\u0E32\u0E15\u0E32\u0E21\u0E40\u0E07\u0E32\u0E02\u0E2D\u0E07\u0E2A\u0E38\u0E19\u0E31\u0E02\u0E44\u0E1B\u0E2A\u0E39\u0E48\u0E15\u0E23\u0E2D\u0E01\u0E0B\u0E2D\u0E22\u0E40\u0E01\u0E48\u0E32",
                note: "\u0E2A\u0E30\u0E01\u0E14\u0E2A\u0E31\u0E0D\u0E0A\u0E32\u0E15\u0E0D\u0E32\u0E13\u0E01\u0E23\u0E30\u0E2B\u0E32\u0E22 \xB7 \u0E2A\u0E15\u0E34 +5 \xB7 \u0E15\u0E32\u0E21\u0E23\u0E2D\u0E22\u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33",
                requirements: {
                  all: [
                    { kind: "stat", key: "sanity", min: 15 }
                  ]
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "sanity", value: 5 },
                  { type: "flag.set", id: "remnant.dog_followed", value: true }
                ],
                behaviorTags: ["remembered"],
                followups: [
                  {
                    eventId: "remnant.familiar_place",
                    afterDays: 1
                  }
                ]
              },
              {
                id: "remnant.dog_scent.fallback",
                text: "\u0E22\u0E37\u0E19\u0E40\u0E2B\u0E21\u0E48\u0E2D\u0E21\u0E2D\u0E07 \u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E43\u0E2B\u0E49\u0E21\u0E31\u0E19\u0E27\u0E34\u0E48\u0E07\u0E08\u0E32\u0E01\u0E44\u0E1B\u0E43\u0E19\u0E04\u0E27\u0E32\u0E21\u0E21\u0E37\u0E14",
                note: "\u0E17\u0E32\u0E07\u0E23\u0E2D\u0E14\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 \xB7 \u0E08\u0E34\u0E15\u0E43\u0E08\u0E21\u0E36\u0E19\u0E0A\u0E32\u0E41\u0E15\u0E48\u0E40\u0E2D\u0E32\u0E15\u0E31\u0E27\u0E23\u0E2D\u0E14\u0E44\u0E14\u0E49",
                requirements: {
                  all: []
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "instinct", value: 5 }
                ],
                behaviorTags: [],
                followups: [
                  {
                    eventId: "remnant.familiar_place",
                    afterDays: 1
                  }
                ]
              }
            ]
          },
          {
            id: "remnant.familiar_place",
            title: "\u0E23\u0E48\u0E2D\u0E07\u0E23\u0E2D\u0E22\u0E43\u0E19\u0E2A\u0E16\u0E32\u0E19\u0E17\u0E35\u0E48\u0E04\u0E38\u0E49\u0E19\u0E40\u0E04\u0E22",
            text: "\u0E1D\u0E35\u0E40\u0E17\u0E49\u0E32\u0E17\u0E35\u0E48\u0E2B\u0E19\u0E31\u0E01\u0E2D\u0E36\u0E49\u0E07\u0E19\u0E33\u0E1E\u0E32\u0E21\u0E32\u0E2B\u0E22\u0E38\u0E14\u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E2B\u0E49\u0E2D\u0E07\u0E41\u0E16\u0E27\u0E44\u0E21\u0E49\u0E40\u0E01\u0E48\u0E32 \u0E1B\u0E23\u0E30\u0E15\u0E39\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E07\u0E49\u0E21\u0E40\u0E1B\u0E34\u0E14\u0E2D\u0E2D\u0E01 \u0E1A\u0E19\u0E42\u0E15\u0E4A\u0E30\u0E17\u0E33\u0E07\u0E32\u0E19\u0E21\u0E35\u0E2A\u0E21\u0E38\u0E14\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E1B\u0E01\u0E2B\u0E19\u0E31\u0E07\u0E41\u0E25\u0E30\u0E01\u0E23\u0E2D\u0E1A\u0E23\u0E39\u0E1B\u0E17\u0E35\u0E48\u0E04\u0E38\u0E49\u0E19\u0E15\u0E32 \u0E01\u0E25\u0E34\u0E48\u0E19\u0E01\u0E23\u0E30\u0E14\u0E32\u0E29\u0E40\u0E01\u0E48\u0E32\u0E41\u0E25\u0E30\u0E01\u0E25\u0E34\u0E48\u0E19\u0E2B\u0E21\u0E36\u0E01\u0E08\u0E32\u0E07\u0E46 \u0E1B\u0E25\u0E38\u0E01\u0E40\u0E28\u0E29\u0E40\u0E2A\u0E35\u0E49\u0E22\u0E27\u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33\u0E40\u0E14\u0E34\u0E21\u0E43\u0E2B\u0E49\u0E40\u0E23\u0E34\u0E48\u0E21\u0E1C\u0E38\u0E14\u0E02\u0E36\u0E49\u0E19\u0E21\u0E32\u0E43\u0E19\u0E04\u0E27\u0E32\u0E21\u0E40\u0E07\u0E35\u0E22\u0E1A",
            requirements: {
              all: []
            },
            choices: [
              {
                id: "remnant.familiar_place.investigate",
                text: "\u0E43\u0E0A\u0E49\u0E19\u0E34\u0E49\u0E27\u0E21\u0E37\u0E2D\u0E17\u0E35\u0E48\u0E41\u0E02\u0E47\u0E07\u0E40\u0E01\u0E23\u0E47\u0E07\u0E04\u0E48\u0E2D\u0E22\u0E46 \u0E1E\u0E25\u0E34\u0E01\u0E40\u0E1B\u0E34\u0E14\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E40\u0E01\u0E48\u0E32",
                note: "ฟื้นคืนความทรงจำชื่อและอดีต · สติ +10 · เสบียงมนุษย์ +1",
                requirements: {
                  all: [
                    { kind: "stat", key: "sanity", min: 20 },
                    { kind: "npc", id: "remnant.mali", field: "alive", value: true },
                    { not: { kind: "npc", id: "remnant.mali", field: "state", value: "departed" } }
                  ]
                },
                costs: [],
                effects: [
                  { type: "flag.set", id: "remnant.identity_recalled", value: true },
                  { type: "item.add", key: "supplies", value: 1 },
                  { type: "stat.add", key: "sanity", value: 10 }
                ],
                behaviorTags: ["remembered"],
                followups: [
                  {
                    eventId: "remnant.reunion",
                    afterDays: 1
                  }
                ]
              },
              {
                id: "remnant.familiar_place.scavenge",
                text: "\u0E1B\u0E31\u0E14\u0E1D\u0E38\u0E48\u0E19\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E22\u0E32\u0E41\u0E25\u0E30\u0E2A\u0E34\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E08\u0E33\u0E40\u0E1B\u0E47\u0E19\u0E23\u0E2D\u0E1A\u0E2B\u0E49\u0E2D\u0E07",
                note: "เน้นการยังชีพ · ชุดเย็บแผล +1 · สัญชาตญาณ +5",
                requirements: {
                  all: [
                    { kind: "npc", id: "remnant.mali", field: "alive", value: true },
                    { not: { kind: "npc", id: "remnant.mali", field: "state", value: "departed" } }
                  ]
                },
                costs: [],
                effects: [
                  { type: "item.add", key: "medicine", value: 1 },
                  { type: "stat.add", key: "instinct", value: 5 }
                ],
                behaviorTags: ["endured"],
                followups: [
                  {
                    eventId: "remnant.reunion",
                    afterDays: 1
                  }
                ]
              },
              {
                id: "remnant.familiar_place.fallback",
                text: "\u0E22\u0E37\u0E19\u0E1E\u0E34\u0E07\u0E01\u0E23\u0E2D\u0E1A\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E1E\u0E31\u0E01\u0E1C\u0E48\u0E2D\u0E19 \u0E44\u0E21\u0E48\u0E41\u0E15\u0E30\u0E15\u0E49\u0E2D\u0E07\u0E2A\u0E34\u0E48\u0E07\u0E43\u0E14",
                note: "\u0E17\u0E32\u0E07\u0E23\u0E2D\u0E14\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 \xB7 \u0E23\u0E31\u0E01\u0E29\u0E32\u0E2A\u0E20\u0E32\u0E1E\u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22\u0E41\u0E25\u0E30\u0E01\u0E49\u0E32\u0E27\u0E2A\u0E39\u0E48\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E43\u0E2B\u0E21\u0E48",
                requirements: {
                  all: []
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "instinct", value: 5 }
                ],
                behaviorTags: [],
                followups: [
                  {
                    eventId: "remnant.outcome_new_identity",
                    afterDays: 1
                  }
                ]
              }
            ]
          },
          {
            id: "remnant.reunion",
            title: "\u0E40\u0E07\u0E32\u0E02\u0E2D\u0E07\u0E1C\u0E39\u0E49\u0E17\u0E35\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01\u0E0A\u0E37\u0E48\u0E2D",
            text: "ในมุมมืดของสถานที่คุ้นเคย มาลียืนประจันหน้ากับเจ้าด้วยสายตาหวาดระแวงระคนสับสน เธอพยายามมองผ่านร่องรอยติดเชื้อ เพื่อค้นหาเศษเสี้ยวของคนเดิมที่เคยรู้จัก",
            requirements: {
              all: [
                { kind: "npc", id: "remnant.mali", field: "alive", value: true },
                { not: { kind: "npc", id: "remnant.mali", field: "state", value: "departed" } }
              ]
            },
            choices: [
              {
                id: "remnant.reunion.pure",
                text: "\u0E22\u0E37\u0E19\u0E19\u0E34\u0E48\u0E07\u0E17\u0E34\u0E49\u0E07\u0E21\u0E37\u0E2D\u0E25\u0E07\u0E02\u0E49\u0E32\u0E07\u0E25\u0E33\u0E15\u0E31\u0E27 \u0E41\u0E2A\u0E14\u0E07\u0E15\u0E31\u0E27\u0E15\u0E19\u0E17\u0E35\u0E48\u0E44\u0E23\u0E49\u0E21\u0E25\u0E17\u0E34\u0E19\u0E17\u0E31\u0E49\u0E07\u0E01\u0E32\u0E23\u0E0A\u0E48\u0E27\u0E22\u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E40\u0E02\u0E48\u0E19\u0E06\u0E48\u0E32",
                note: "ประวัติ: ไม่เคยช่วยและไม่เคยฆ่า · มาลีประหลาดใจแต่ระวังตัว · ความไว้ใจของมาลีเป็น 15 · สติ +5",
                requirements: {
                  all: [
                    { kind: "npc", id: "remnant.mali", field: "alive", value: true },
                    { not: { kind: "npc", id: "remnant.mali", field: "state", value: "departed" } },
                    { kind: "memory", key: "saved", max: 0 },
                    { kind: "memory", key: "killed", max: 0 }
                  ]
                },
                costs: [],
                effects: [
                  { type: "npc.set", id: "remnant.mali", field: "state", value: "met" },
                  { type: "npc.set", id: "remnant.mali", field: "trust", value: 15 },
                  { type: "stat.add", key: "sanity", value: 5 }
                ],
                behaviorTags: ["remembered"],
                followups: [
                  {
                    eventId: "remnant.relationship_decision",
                    afterDays: 1
                  }
                ]
              },
              {
                id: "remnant.reunion.savior",
                text: "\u0E1B\u0E23\u0E30\u0E2A\u0E32\u0E19\u0E2A\u0E32\u0E22\u0E15\u0E32\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E2D\u0E48\u0E2D\u0E19\u0E42\u0E22\u0E19 \u0E40\u0E18\u0E2D\u0E08\u0E33\u0E44\u0E14\u0E49\u0E27\u0E48\u0E32\u0E40\u0E08\u0E49\u0E32\u0E40\u0E04\u0E22\u0E22\u0E37\u0E48\u0E19\u0E21\u0E37\u0E2D\u0E0A\u0E48\u0E27\u0E22\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E1C\u0E39\u0E49\u0E23\u0E2D\u0E14\u0E0A\u0E35\u0E27\u0E34\u0E15",
                note: "ประวัติ: เคยช่วยแต่ไม่เคยฆ่า · มาลีคลายความกลัวลงอย่างเห็นได้ชัด · ความไว้ใจของมาลีเป็น 30 · สติ +10",
                requirements: {
                  all: [
                    { kind: "npc", id: "remnant.mali", field: "alive", value: true },
                    { not: { kind: "npc", id: "remnant.mali", field: "state", value: "departed" } },
                    { kind: "memory", key: "saved", min: 1 },
                    { kind: "memory", key: "killed", max: 0 }
                  ]
                },
                costs: [],
                effects: [
                  { type: "npc.set", id: "remnant.mali", field: "state", value: "met" },
                  { type: "npc.set", id: "remnant.mali", field: "trust", value: 30 },
                  { type: "stat.add", key: "sanity", value: 10 }
                ],
                behaviorTags: ["remembered"],
                followups: [
                  {
                    eventId: "remnant.relationship_decision",
                    afterDays: 1
                  }
                ]
              },
              {
                id: "remnant.reunion.killer",
                text: "\u0E04\u0E49\u0E2D\u0E21\u0E28\u0E35\u0E23\u0E29\u0E30\u0E25\u0E07\u0E15\u0E48\u0E33 \u0E40\u0E18\u0E2D\u0E2A\u0E31\u0E07\u0E40\u0E01\u0E15\u0E23\u0E48\u0E2D\u0E07\u0E23\u0E2D\u0E22\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E08\u0E32\u0E01\u0E01\u0E32\u0E23\u0E40\u0E02\u0E48\u0E19\u0E06\u0E48\u0E32\u0E41\u0E15\u0E48\u0E40\u0E2B\u0E47\u0E19\u0E2A\u0E15\u0E34\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E01\u0E14\u0E02\u0E48\u0E21\u0E44\u0E27\u0E49",
                note: "ประวัติ: เคยฆ่าแต่ไม่เคยช่วย · มาลีหวาดระแวงแต่ยอมเจรจา · ความไว้ใจของมาลีเป็น 5 · สติ -5",
                requirements: {
                  all: [
                    { kind: "npc", id: "remnant.mali", field: "alive", value: true },
                    { not: { kind: "npc", id: "remnant.mali", field: "state", value: "departed" } },
                    { kind: "memory", key: "saved", max: 0 },
                    { kind: "memory", key: "killed", min: 1 }
                  ]
                },
                costs: [],
                effects: [
                  { type: "npc.set", id: "remnant.mali", field: "state", value: "met" },
                  { type: "npc.set", id: "remnant.mali", field: "trust", value: 5 },
                  { type: "stat.add", key: "sanity", value: -5 }
                ],
                behaviorTags: ["remembered"],
                followups: [
                  {
                    eventId: "remnant.relationship_decision",
                    afterDays: 1
                  }
                ]
              },
              {
                id: "remnant.reunion.both",
                text: "\u0E0A\u0E35\u0E49\u0E23\u0E2D\u0E22\u0E41\u0E1C\u0E25\u0E17\u0E35\u0E48\u0E15\u0E31\u0E27 \u0E40\u0E08\u0E49\u0E32\u0E21\u0E35\u0E17\u0E31\u0E49\u0E07\u0E21\u0E25\u0E17\u0E34\u0E19\u0E08\u0E32\u0E01\u0E01\u0E32\u0E23\u0E2A\u0E31\u0E07\u0E2B\u0E32\u0E23\u0E41\u0E25\u0E30\u0E04\u0E27\u0E32\u0E21\u0E14\u0E35\u0E08\u0E32\u0E01\u0E01\u0E32\u0E23\u0E0A\u0E48\u0E27\u0E22\u0E04\u0E19\u0E2D\u0E37\u0E48\u0E19",
                note: "ประวัติ: เคยทั้งช่วยและฆ่า · มาลีเข้าใจความซับซ้อนของการเอาชีวิตรอด · ความไว้ใจของมาลีเป็น 20",
                requirements: {
                  all: [
                    { kind: "npc", id: "remnant.mali", field: "alive", value: true },
                    { not: { kind: "npc", id: "remnant.mali", field: "state", value: "departed" } },
                    { kind: "memory", key: "saved", min: 1 },
                    { kind: "memory", key: "killed", min: 1 }
                  ]
                },
                costs: [],
                effects: [
                  { type: "npc.set", id: "remnant.mali", field: "state", value: "met" },
                  { type: "npc.set", id: "remnant.mali", field: "trust", value: 20 }
                ],
                behaviorTags: ["remembered"],
                followups: [
                  {
                    eventId: "remnant.relationship_decision",
                    afterDays: 1
                  }
                ]
              },
              {
                id: "remnant.reunion.fallback",
                text: "\u0E22\u0E37\u0E19\u0E19\u0E34\u0E48\u0E07\u0E04\u0E38\u0E21\u0E40\u0E0A\u0E34\u0E07\u0E43\u0E19\u0E40\u0E07\u0E32\u0E21\u0E37\u0E14 \u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E43\u0E2B\u0E49\u0E04\u0E27\u0E32\u0E21\u0E40\u0E07\u0E35\u0E22\u0E1A\u0E41\u0E25\u0E30\u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E25\u0E22\u0E44\u0E1B",
                note: "\u0E17\u0E32\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22\u0E22\u0E32\u0E21\u0E2A\u0E31\u0E1A\u0E2A\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E23\u0E49\u0E1C\u0E39\u0E49\u0E04\u0E19 \xB7 \u0E21\u0E38\u0E48\u0E07\u0E2A\u0E39\u0E48\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E15\u0E31\u0E27\u0E15\u0E19\u0E43\u0E2B\u0E21\u0E48",
                requirements: {
                  all: []
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "instinct", value: 5 }
                ],
                behaviorTags: [],
                followups: [
                  {
                    eventId: "remnant.outcome_new_identity",
                    afterDays: 1
                  }
                ]
              }
            ]
          },
          {
            id: "remnant.relationship_decision",
            title: "\u0E17\u0E32\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E41\u0E2B\u0E48\u0E07\u0E2A\u0E32\u0E22\u0E2A\u0E31\u0E21\u0E1E\u0E31\u0E19\u0E18\u0E4C",
            text: '\u0E21\u0E32\u0E25\u0E35\u0E25\u0E14\u0E17\u0E48\u0E2D\u0E19\u0E44\u0E21\u0E49\u0E25\u0E07 \u0E41\u0E27\u0E27\u0E15\u0E32\u0E02\u0E2D\u0E07\u0E40\u0E18\u0E2D\u0E40\u0E15\u0E47\u0E21\u0E44\u0E1B\u0E14\u0E49\u0E27\u0E22\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E31\u0E1A\u0E2A\u0E19\u0E23\u0E30\u0E04\u0E19\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E27\u0E31\u0E07 "\u0E16\u0E49\u0E32\u0E40\u0E18\u0E2D\u0E22\u0E31\u0E07\u0E08\u0E33\u0E09\u0E31\u0E19\u0E44\u0E14\u0E49... \u0E40\u0E23\u0E32\u0E08\u0E30\u0E22\u0E31\u0E07\u0E23\u0E48\u0E27\u0E21\u0E21\u0E37\u0E2D\u0E01\u0E31\u0E19\u0E44\u0E14\u0E49\u0E44\u0E2B\u0E21 \u0E2B\u0E23\u0E37\u0E2D\u0E27\u0E48\u0E32\u0E40\u0E18\u0E2D... \u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E04\u0E19\u0E40\u0E14\u0E34\u0E21\u0E2D\u0E35\u0E01\u0E15\u0E48\u0E2D\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27?" \u0E27\u0E34\u0E19\u0E32\u0E17\u0E35\u0E19\u0E35\u0E49\u0E40\u0E08\u0E49\u0E32\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E27\u0E48\u0E32\u0E08\u0E30\u0E1C\u0E39\u0E01\u0E42\u0E22\u0E07\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E31\u0E21\u0E1E\u0E31\u0E19\u0E18\u0E4C\u0E40\u0E14\u0E34\u0E21\u0E44\u0E27\u0E49 \u0E2B\u0E23\u0E37\u0E2D\u0E01\u0E49\u0E32\u0E27\u0E40\u0E14\u0E34\u0E19\u0E2A\u0E39\u0E48\u0E15\u0E31\u0E27\u0E15\u0E19\u0E43\u0E2B\u0E21\u0E48',
            requirements: {
              all: [
                { kind: "npc", id: "remnant.mali", field: "alive", value: true },
                { not: { kind: "npc", id: "remnant.mali", field: "state", value: "departed" } }
              ]
            },
            choices: [
              {
                id: "remnant.relationship_decision.preserve",
                text: "\u0E1E\u0E22\u0E31\u0E01\u0E2B\u0E19\u0E49\u0E32\u0E23\u0E31\u0E1A\u0E04\u0E33 \u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E17\u0E35\u0E48\u0E08\u0E30\u0E23\u0E31\u0E01\u0E29\u0E32\u0E2A\u0E32\u0E22\u0E2A\u0E31\u0E21\u0E1E\u0E31\u0E19\u0E18\u0E4C\u0E41\u0E25\u0E30\u0E04\u0E27\u0E32\u0E21\u0E44\u0E27\u0E49\u0E27\u0E32\u0E07\u0E43\u0E08\u0E01\u0E31\u0E1A\u0E40\u0E18\u0E2D\u0E44\u0E27\u0E49",
                note: "ต้องมีสติ ≥20 และมาลีพร้อมเจรจา · ความไว้ใจของมาลีเป็น 40 · สู่พันธนาการแห่งความทรงจำ",
                requirements: {
                  all: [
                    { kind: "npc", id: "remnant.mali", field: "alive", value: true },
                    { kind: "npc", id: "remnant.mali", field: "state", value: "met" },
                    { kind: "stat", key: "sanity", min: 20 }
                  ]
                },
                costs: [],
                effects: [
                  { type: "npc.set", id: "remnant.mali", field: "state", value: "allied" },
                  { type: "npc.set", id: "remnant.mali", field: "trust", value: 40 },
                  { type: "flag.set", id: "remnant.relationship_choice", value: "preserve" }
                ],
                behaviorTags: ["helped", "remembered"],
                followups: [
                  {
                    eventId: "remnant.outcome_preserve_bond",
                    afterDays: 1
                  }
                ]
              },
              {
                id: "remnant.relationship_decision.new_identity",
                text: "\u0E2A\u0E48\u0E32\u0E22\u0E2B\u0E19\u0E49\u0E32\u0E0A\u0E49\u0E32\u0E46 \u0E2A\u0E48\u0E07\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E27\u0E48\u0E32\u0E42\u0E25\u0E01\u0E40\u0E14\u0E34\u0E21\u0E08\u0E1A\u0E25\u0E07\u0E41\u0E25\u0E49\u0E27 \u0E41\u0E25\u0E30\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E40\u0E14\u0E34\u0E19\u0E1A\u0E19\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E43\u0E2B\u0E21\u0E48",
                note: "สัญชาตญาณ +10 · มาลีจากไป · สู่การตื่นรู้ของตัวตนใหม่",
                requirements: {
                  all: []
                },
                costs: [],
                effects: [
                  { type: "npc.set", id: "remnant.mali", field: "state", value: "departed" },
                  { type: "stat.add", key: "instinct", value: 10 },
                  { type: "flag.set", id: "remnant.relationship_choice", value: "new_identity" }
                ],
                behaviorTags: ["remembered"],
                followups: [
                  {
                    eventId: "remnant.outcome_new_identity",
                    afterDays: 1
                  }
                ]
              },
              {
                id: "remnant.relationship_decision.fallback",
                text: "\u0E01\u0E49\u0E32\u0E27\u0E16\u0E2D\u0E22\u0E2B\u0E25\u0E31\u0E07\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E07\u0E35\u0E22\u0E1A\u0E40\u0E0A\u0E35\u0E22\u0E1A \u0E40\u0E1B\u0E34\u0E14\u0E17\u0E32\u0E07\u0E43\u0E2B\u0E49\u0E15\u0E48\u0E32\u0E07\u0E1D\u0E48\u0E32\u0E22\u0E15\u0E48\u0E32\u0E07\u0E41\u0E22\u0E01\u0E22\u0E49\u0E32\u0E22",
                note: "\u0E17\u0E32\u0E07\u0E23\u0E2D\u0E14\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22\u0E22\u0E32\u0E21\u0E2A\u0E15\u0E34\u0E15\u0E48\u0E33 \xB7 \u0E2A\u0E39\u0E48\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E15\u0E31\u0E27\u0E15\u0E19\u0E43\u0E2B\u0E21\u0E48",
                requirements: {
                  all: []
                },
                costs: [],
                effects: [
                  { type: "npc.set", id: "remnant.mali", field: "state", value: "departed" },
                  { type: "stat.add", key: "instinct", value: 5 },
                  { type: "flag.set", id: "remnant.relationship_choice", value: "new_identity" }
                ],
                behaviorTags: [],
                followups: [
                  {
                    eventId: "remnant.outcome_new_identity",
                    afterDays: 1
                  }
                ]
              }
            ]
          },
          {
            id: "remnant.outcome_preserve_bond",
            title: "\u0E1C\u0E25\u0E25\u0E31\u0E1E\u0E18\u0E4C: \u0E1E\u0E31\u0E19\u0E18\u0E19\u0E32\u0E01\u0E32\u0E23\u0E41\u0E2B\u0E48\u0E07\u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33",
            text: "\u0E21\u0E32\u0E25\u0E35\u0E27\u0E32\u0E07\u0E2B\u0E48\u0E2D\u0E1C\u0E49\u0E32\u0E17\u0E35\u0E48\u0E43\u0E2A\u0E48\u0E22\u0E32\u0E41\u0E25\u0E30\u0E40\u0E2A\u0E1A\u0E35\u0E22\u0E07\u0E25\u0E07\u0E1A\u0E19\u0E42\u0E15\u0E4A\u0E30 \u0E40\u0E18\u0E2D\u0E44\u0E21\u0E48\u0E1E\u0E22\u0E32\u0E22\u0E32\u0E21\u0E41\u0E15\u0E30\u0E15\u0E49\u0E2D\u0E07\u0E23\u0E48\u0E32\u0E07\u0E02\u0E2D\u0E07\u0E40\u0E08\u0E49\u0E32 \u0E41\u0E15\u0E48\u0E1D\u0E32\u0E01\u0E04\u0E33\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E27\u0E48\u0E32\u0E08\u0E30\u0E04\u0E2D\u0E22\u0E2A\u0E48\u0E07\u0E02\u0E48\u0E32\u0E27\u0E40\u0E2A\u0E1A\u0E35\u0E22\u0E07\u0E43\u0E2B\u0E49\u0E01\u0E31\u0E19\u0E41\u0E25\u0E30\u0E01\u0E31\u0E19 \u0E2A\u0E32\u0E22\u0E2A\u0E31\u0E21\u0E1E\u0E31\u0E19\u0E18\u0E4C\u0E43\u0E19\u0E2D\u0E14\u0E35\u0E15\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E16\u0E39\u0E01\u0E17\u0E33\u0E25\u0E32\u0E22\u0E14\u0E49\u0E27\u0E22\u0E04\u0E27\u0E32\u0E21\u0E15\u0E32\u0E22 \u0E41\u0E15\u0E48\u0E41\u0E1B\u0E23\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E40\u0E1B\u0E47\u0E19\u0E04\u0E27\u0E32\u0E21\u0E44\u0E27\u0E49\u0E27\u0E32\u0E07\u0E43\u0E08\u0E02\u0E49\u0E32\u0E21\u0E2A\u0E32\u0E22\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E41\u0E25\u0E30\u0E2A\u0E34\u0E48\u0E07\u0E21\u0E35\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E43\u0E2B\u0E21\u0E48",
            requirements: {
              all: []
            },
            choices: [
              {
                id: "remnant.outcome_preserve_bond.guardian",
                text: "\u0E23\u0E31\u0E1A\u0E2B\u0E48\u0E2D\u0E1C\u0E49\u0E32\u0E40\u0E2A\u0E1A\u0E35\u0E22\u0E07\u0E41\u0E25\u0E30\u0E15\u0E01\u0E25\u0E07\u0E17\u0E33\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E40\u0E1B\u0E47\u0E19\u0E40\u0E01\u0E23\u0E32\u0E30\u0E1E\u0E34\u0E17\u0E31\u0E01\u0E29\u0E4C\u0E43\u0E19\u0E40\u0E07\u0E32\u0E21\u0E37\u0E14",
                note: "เสบียงมนุษย์ +1 · ชุดเย็บแผล +1 · สติ +15 · ความไว้ใจของมาลีเป็น 60",
                requirements: {
                  all: [
                    { kind: "stat", key: "sanity", min: 20 },
                    { kind: "npc", id: "remnant.mali", field: "alive", value: true },
                    { kind: "npc", id: "remnant.mali", field: "state", value: "allied" }
                  ]
                },
                costs: [],
                effects: [
                  { type: "item.add", key: "supplies", value: 1 },
                  { type: "item.add", key: "medicine", value: 1 },
                  { type: "stat.add", key: "sanity", value: 15 },
                  { type: "npc.set", id: "remnant.mali", field: "state", value: "allied" },
                  { type: "npc.set", id: "remnant.mali", field: "trust", value: 60 },
                  { type: "flag.set", id: "remnant.outcome", value: "preserve_bond" }
                ],
                behaviorTags: ["helped", "remembered"]
              },
              {
                id: "remnant.outcome_preserve_bond.fallback",
                text: "\u0E1E\u0E22\u0E31\u0E01\u0E2B\u0E19\u0E49\u0E32\u0E23\u0E31\u0E1A\u0E23\u0E39\u0E49\u0E41\u0E25\u0E49\u0E27\u0E25\u0E48\u0E32\u0E16\u0E2D\u0E22\u0E01\u0E25\u0E31\u0E1A\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E40\u0E07\u0E32\u0E21\u0E37\u0E14\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E2A\u0E07\u0E1A",
                note: "\u0E2A\u0E15\u0E34 +5 \xB7 \u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14\u0E2A\u0E32\u0E22\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E14\u0E49\u0E27\u0E22\u0E2A\u0E31\u0E19\u0E15\u0E34",
                requirements: {
                  all: []
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "sanity", value: 5 },
                  { type: "flag.set", id: "remnant.outcome", value: "preserve_bond" }
                ],
                behaviorTags: []
              }
            ]
          },
          {
            id: "remnant.outcome_new_identity",
            title: "\u0E1C\u0E25\u0E25\u0E31\u0E1E\u0E18\u0E4C: \u0E01\u0E32\u0E23\u0E15\u0E37\u0E48\u0E19\u0E23\u0E39\u0E49\u0E02\u0E2D\u0E07\u0E15\u0E31\u0E27\u0E15\u0E19\u0E43\u0E2B\u0E21\u0E48",
            text: "\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E21\u0E38\u0E19\u0E15\u0E31\u0E27\u0E40\u0E14\u0E34\u0E19\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E2B\u0E49\u0E2D\u0E07\u0E41\u0E16\u0E27\u0E40\u0E01\u0E48\u0E32 \u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33\u0E43\u0E19\u0E2D\u0E14\u0E35\u0E15\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E16\u0E39\u0E01\u0E25\u0E37\u0E21\u0E40\u0E25\u0E37\u0E2D\u0E19 \u0E41\u0E15\u0E48\u0E21\u0E31\u0E19\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E1B\u0E47\u0E19\u0E42\u0E0B\u0E48\u0E15\u0E23\u0E27\u0E19\u0E17\u0E35\u0E48\u0E14\u0E36\u0E07\u0E23\u0E31\u0E49\u0E07\u0E43\u0E2B\u0E49\u0E40\u0E08\u0E49\u0E32\u0E15\u0E49\u0E2D\u0E07\u0E42\u0E2B\u0E22\u0E2B\u0E32\u0E01\u0E32\u0E23\u0E40\u0E1B\u0E47\u0E19\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E2D\u0E35\u0E01\u0E15\u0E48\u0E2D\u0E44\u0E1B \u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22\u0E17\u0E35\u0E48\u0E41\u0E02\u0E47\u0E07\u0E41\u0E01\u0E23\u0E48\u0E07\u0E41\u0E25\u0E30\u0E2A\u0E15\u0E34\u0E17\u0E35\u0E48\u0E04\u0E07\u0E2D\u0E22\u0E39\u0E48 \u0E40\u0E08\u0E49\u0E32\u0E01\u0E49\u0E32\u0E27\u0E02\u0E49\u0E32\u0E21\u0E08\u0E32\u0E01\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E2A\u0E39\u0E48\u0E2A\u0E34\u0E48\u0E07\u0E21\u0E35\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E2A\u0E32\u0E22\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C\u0E43\u0E2B\u0E21\u0E48\u0E17\u0E35\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E0A\u0E30\u0E15\u0E32\u0E01\u0E23\u0E23\u0E21\u0E02\u0E2D\u0E07\u0E15\u0E19\u0E40\u0E2D\u0E07",
            requirements: {
              all: []
            },
            choices: [
              {
                id: "remnant.outcome_new_identity.embrace",
                text: "\u0E2A\u0E39\u0E14\u0E2D\u0E32\u0E01\u0E32\u0E28\u0E23\u0E32\u0E15\u0E23\u0E35 \u0E01\u0E49\u0E32\u0E27\u0E40\u0E14\u0E34\u0E19\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E20\u0E32\u0E04\u0E20\u0E39\u0E21\u0E34\u0E1A\u0E19\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E2A\u0E32\u0E22\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C\u0E43\u0E2B\u0E21\u0E48",
                note: "\u0E2A\u0E31\u0E0D\u0E0A\u0E32\u0E15\u0E0D\u0E32\u0E13 +15, \u0E01\u0E25\u0E32\u0E22\u0E1E\u0E31\u0E19\u0E18\u0E38\u0E4C +10, \u0E2A\u0E15\u0E34 +5 \xB7 \u0E2A\u0E39\u0E48\u0E15\u0E31\u0E27\u0E15\u0E19\u0E43\u0E2B\u0E21\u0E48",
                requirements: {
                  all: [
                    { kind: "stat", key: "instinct", min: 15 }
                  ]
                },
                costs: [],
                effects: [
                  { type: "npc.set", id: "remnant.mali", field: "state", value: "departed" },
                  { type: "stat.add", key: "instinct", value: 15 },
                  { type: "stat.add", key: "mutation", value: 10 },
                  { type: "stat.add", key: "sanity", value: 5 },
                  { type: "flag.set", id: "remnant.outcome", value: "new_identity" }
                ],
                behaviorTags: ["remembered"]
              },
              {
                id: "remnant.outcome_new_identity.fallback",
                text: "\u0E40\u0E14\u0E34\u0E19\u0E2B\u0E32\u0E22\u0E25\u0E31\u0E1A\u0E44\u0E1B\u0E43\u0E19\u0E21\u0E48\u0E32\u0E19\u0E2B\u0E21\u0E2D\u0E01\u0E23\u0E32\u0E15\u0E23\u0E35\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E2D\u0E34\u0E2A\u0E23\u0E30",
                note: "\u0E2A\u0E31\u0E0D\u0E0A\u0E32\u0E15\u0E0D\u0E32\u0E13 +5 \xB7 \u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14\u0E2A\u0E32\u0E22\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E14\u0E49\u0E27\u0E22\u0E2D\u0E34\u0E2A\u0E23\u0E20\u0E32\u0E1E",
                requirements: {
                  all: []
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "instinct", value: 5 },
                  { type: "flag.set", id: "remnant.outcome", value: "new_identity" }
                ],
                behaviorTags: []
              }
            ]
          }
        ];
        return {
          FLAGS,
          NPCS,
          RESOURCES,
          EVENTS
        };
      });
    }
  });

  // ../../tmp/after-zero-zombie/data/story-content.js
  var require_story_content = __commonJS({
    "../../tmp/after-zero-zombie/data/story-content.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_clinic(), require_pack(), require_remnant());
        else {
          root.ZombieData = root.ZombieData || {};
          root.ZombieData.Stories = factory(root.ZombieData.Clinic, root.ZombieData.PACK, root.ZombieData.REMNANT);
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(Clinic, Pack, Remnant) {
        "use strict";
        const packs = [
          {
            id: "clinic",
            version: 1,
            contentVersion: "stories-clinic-20261030",
            data: Clinic,
            place: "hospital",
            entry: "clinic.generator_failing",
            name: "\u0E2A\u0E33\u0E23\u0E27\u0E08\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E41\u0E25\u0E30\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E1B\u0E31\u0E48\u0E19\u0E44\u0E1F",
            glyph: "\u271A",
            npcs: { "clinic.dr_wichai": { alive: true, state: "wary", trust: 10 }, "clinic.mercenary_korn": { alive: true, state: "guarding", trust: 0 } }
          },
          {
            id: "pack",
            version: 2,
            contentVersion: "stories-pack-20261030",
            data: Pack,
            place: "streets",
            entry: "pack.wounded_alpha",
            name: "\u0E15\u0E32\u0E21\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E1D\u0E39\u0E07\u0E17\u0E35\u0E48\u0E25\u0E49\u0E2D\u0E21\u0E08\u0E48\u0E32\u0E1D\u0E39\u0E07\u0E1A\u0E32\u0E14\u0E40\u0E08\u0E47\u0E1A",
            glyph: "\u265C",
            npcs: { "pack.alpha": { alive: true, state: "wounded", trust: 0 }, "pack.guard": { alive: true, state: "wandering", trust: 0 } }
          },
          {
            id: "remnant",
            version: 3,
            contentVersion: "stories-remnant-20261030",
            data: Remnant,
            place: "streets",
            entry: "remnant.dog_scent",
            name: "\u0E15\u0E32\u0E21\u0E2A\u0E38\u0E19\u0E31\u0E02\u0E17\u0E35\u0E48\u0E08\u0E33\u0E01\u0E25\u0E34\u0E48\u0E19\u0E02\u0E2D\u0E07\u0E40\u0E08\u0E49\u0E32\u0E44\u0E14\u0E49",
            glyph: "\u25C7",
            npcs: { "remnant.mali": { alive: true, state: "unknown", trust: 0 } }
          }
        ];
        const EVENTS = [], ACTIONS = [], FLAGS = {}, NPCS = {}, WORLD_CONTENT_EXTENSIONS = [];
        for (const pack of packs) {
          const started = "story." + pack.id + ".started";
          Object.assign(FLAGS, pack.data.FLAGS, { [started]: { type: "boolean", default: false } });
          Object.assign(NPCS, pack.data.NPCS);
          EVENTS.push(...pack.data.EVENTS.map((event) => {
            const assembled = { ...event, location: event.location || pack.place, once: true };
            if (event.id === "clinic.generator_failing") assembled.text = event.text.replace("\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E1A\u0E23\u0E34\u0E2A\u0E38\u0E17\u0E18\u0E34\u0E4C\u0E19\u0E31\u0E1A\u0E2A\u0E34\u0E1A\u0E16\u0E38\u0E07", "\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E15\u0E39\u0E49");
            if (event.id === "clinic.triage_dilemma") assembled.choices = event.choices.map((choice) => choice.id === "clinic.triage_dilemma.choice.donate" ? { ...choice, effects: [...choice.effects, { type: "memory.record", key: "saved" }] } : choice);
            if (event.id === "clinic.ruins_plundered") {
              assembled.text = "\u0E2B\u0E25\u0E31\u0E07\u0E04\u0E27\u0E32\u0E21\u0E02\u0E31\u0E14\u0E41\u0E22\u0E49\u0E07 \u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E41\u0E15\u0E48\u0E01\u0E23\u0E30\u0E08\u0E01\u0E41\u0E15\u0E01\u0E41\u0E25\u0E30\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E27\u0E32\u0E14\u0E23\u0E30\u0E41\u0E27\u0E07 \u0E1C\u0E39\u0E49\u0E23\u0E2D\u0E14\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E44\u0E21\u0E48\u0E2D\u0E32\u0E08\u0E1E\u0E36\u0E48\u0E07\u0E1E\u0E32\u0E17\u0E35\u0E48\u0E19\u0E35\u0E48\u0E44\u0E14\u0E49\u0E40\u0E2B\u0E21\u0E37\u0E2D\u0E19\u0E40\u0E14\u0E34\u0E21 \u0E44\u0E21\u0E48\u0E21\u0E35\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E2B\u0E23\u0E37\u0E2D\u0E22\u0E32\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E15\u0E34\u0E21\u0E19\u0E33\u0E21\u0E32\u0E41\u0E1A\u0E48\u0E07 \u0E40\u0E08\u0E49\u0E32\u0E15\u0E49\u0E2D\u0E07\u0E15\u0E31\u0E49\u0E07\u0E2B\u0E25\u0E31\u0E01\u0E17\u0E48\u0E32\u0E21\u0E01\u0E25\u0E32\u0E07\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E17\u0E35\u0E48\u0E2D\u0E31\u0E19\u0E15\u0E23\u0E32\u0E22\u0E01\u0E27\u0E48\u0E32\u0E40\u0E14\u0E34\u0E21";
              assembled.choices = event.choices.map((choice) => ({ ...choice, text: "\u0E16\u0E2D\u0E22\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E01\u0E47\u0E1A\u0E22\u0E32 \u0E15\u0E31\u0E49\u0E07\u0E2B\u0E25\u0E31\u0E01\u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25" }));
            }
            return assembled;
          }));
          const entry = pack.data.EVENTS.find((event) => event.id === pack.entry);
          ACTIONS.push({
            id: "story." + pack.id,
            name: pack.name,
            glyph: pack.glyph,
            places: [pack.place],
            note: "\u0E40\u0E23\u0E34\u0E48\u0E21\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E19\u0E35\u0E49\u0E04\u0E23\u0E31\u0E49\u0E07\u0E40\u0E14\u0E35\u0E22\u0E27 \xB7 \u0E43\u0E0A\u0E49 1 \u0E27\u0E31\u0E19 \xB7 \u0E40\u0E2B\u0E15\u0E38\u0E01\u0E32\u0E23\u0E13\u0E4C\u0E15\u0E48\u0E2D\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E15\u0E2D\u0E19\u0E40\u0E0A\u0E49\u0E32\u0E44\u0E21\u0E48\u0E40\u0E2A\u0E35\u0E22\u0E27\u0E31\u0E19\u0E40\u0E1E\u0E34\u0E48\u0E21",
            encounter: pack.entry,
            requirements: { all: [{ kind: "flag", id: started, value: false }, ...entry.requirements ? [entry.requirements] : []] },
            effects: [{ type: "flag.set", id: started, value: true }],
            behaviorTags: []
          });
          WORLD_CONTENT_EXTENSIONS.push({ version: pack.version, contentVersion: pack.contentVersion, npcs: pack.npcs });
        }
        return {
          EVENTS,
          ACTIONS,
          FLAGS,
          NPCS,
          WORLD_CONTENT_EXTENSIONS,
          CONTENT_VERSION: packs[packs.length - 1].contentVersion,
          PACKS: packs.map((pack) => ({ id: pack.id, entry: pack.entry, place: pack.place, events: pack.data.EVENTS.map((event) => event.id) }))
        };
      });
    }
  });

  // ../../tmp/after-zero-zombie/core/runtime.js
  var require_runtime = __commonJS({
    "../../tmp/after-zero-zombie/core/runtime.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_engine(), require_catalog(), require_survival2(), require_origins2(), require_origins(), require_contract(), require_evolution2(), require_evolution(), require_world2(), require_director(), require_world(), require_story_content());
        else root.ZombieRuntime = factory(root.ZombieEngine, root.ZombieCatalog, root.ZombieSystems.Survival, root.ZombieSystems.Origins, root.ZombieData.Origins, root.ZombieCore.Contract, root.ZombieSystems.Evolution, root.ZombieEvolutionData, root.ZombieSystems.World, root.ZombieSystems.Director, root.ZombieData.World, root.ZombieData.Stories);
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(E, C, Survival, Origins, O, K, Evolution, D, World, Director, W, Stories) {
        "use strict";
        const EVENTS = C.EVENTS.map((e) => ({ ...e, ...e.tags || ["bloodbank", "ambulance", "prey"].includes(e.id) ? { once: false } : {}, ...["ambulance", "prey"].includes(e.id) ? { cooldownDays: 0 } : {} }));
        const ACTIONS = C.ACTIONS.map((a) => ["corpse", "hunt"].includes(a.id) ? { ...a, note: a.note + " \xB7 \u0E41\u0E15\u0E48\u0E25\u0E30\u0E04\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E48\u0E32\u0E07\u0E1E\u0E1A\u0E44\u0E14\u0E49\u0E04\u0E23\u0E31\u0E49\u0E07\u0E40\u0E14\u0E35\u0E22\u0E27 \u0E01\u0E32\u0E23\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E22\u0E31\u0E07\u0E43\u0E0A\u0E49 1 \u0E27\u0E31\u0E19\u0E41\u0E21\u0E49\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E2B\u0E21\u0E14" } : a);
        const catalog = K.snapshot({ ...C, CONTENT_VERSION: Stories.CONTENT_VERSION, ORIGINS: O.ORIGINS, STRAINS: O.STRAINS, BODY_TRAITS: O.BODY_TRAITS, TRAITS: D.TRAITS, FLAGS: { ...C.FLAGS, ...W.FLAGS, ...Stories.FLAGS }, NPCS: { ...C.NPCS, ...W.NPCS, ...Stories.NPCS }, RESOURCES: { ...C.RESOURCES, ...W.RESOURCES }, WORLD_INITIAL_STATE: { resources: W.RESOURCES, npcs: W.INITIAL_NPCS }, WORLD_CONTENT_EXTENSIONS: Stories.WORLD_CONTENT_EXTENSIONS, ACTIONS: [...ACTIONS, ...Stories.ACTIONS], EVENTS: [...EVENTS, ...O.ORIGIN_OPENINGS, ...Stories.EVENTS] });
        const build = (overrides = {}, additions = {}) => E.withSystems({ Survival, Origins, Evolution, World, Director, ...overrides }, { ...catalog, ...additions });
        return Object.freeze({ catalog, engine: build(), build });
      });
    }
  });

  // ../../tmp/after-zero-zombie/next/data/reference-content.js
  var require_reference_content = __commonJS({
    "../../tmp/after-zero-zombie/next/data/reference-content.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory();
        else {
          root.AfterZeroNextData = root.AfterZeroNextData || {};
          root.AfterZeroNextData.Reference = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        const flag = (id, value = true) => ({ type: "flag.set", id: "next." + id, value });
        const stat = (key, value) => ({ type: "stat.add", key, value });
        const is = (id, value = true) => ({ kind: "flag", id: "next." + id, value });
        const alive = (id) => ({ kind: "npc", id: "next." + id, field: "alive", value: true });
        const npc = (id, field, value) => ({ type: "npc.set", id: "next." + id, field, value });
        const FLAGS = {};
        for (const id of ["initialized", "home", "street", "clinic", "hive", "signal", "bond", "helped", "raided", "protected", "threatened", "returned", "quietSignal", "loudSignal"]) FLAGS["next." + id] = { type: "boolean", default: false };
        FLAGS["next.weather"] = { type: "string", default: "rain" };
        FLAGS["next.clue"] = { type: "string", default: "voice" };
        const NPCS = { "next.ing": { states: ["wary", "waiting", "ally", "gone"] }, "next.nuan": { states: ["wary", "ally", "hostile"] } };
        const costItem = (key, value) => ({ type: "item.add", key, value });
        const leave = (id, extra = []) => ({ id, text: "\u0E16\u0E2D\u0E22\u0E2D\u0E2D\u0E01\u0E21\u0E32 \u2014 \u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E44\u0E27\u0E49\u0E43\u0E08\u0E43\u0E04\u0E23", effects: extra });
        const choiceNotes = {"home":["ความไว้ใจของอิงเป็น 30 · เตือนให้รักษาระยะ · อิงตั้งใจกลับมาในอีก 2 วัน","ส่งเสียงเตือนให้อิงหนีไป · เธอจะไม่กลับมานั่งรอ","ยังไม่เปิดเผยตัวตน · ไม่รับผลต่อสถานะเพิ่มเติม"],"street":["ความไว้ใจ +8 · เปิดทางให้คนจากคลินิก","อำนาจฝูง +15 · ภัยคุกคามบนถนน +25 · ล่อฝูงเข้าหาด่าน","ไม่แทรกแซงเส้นทาง · ไม่รับผลต่อสถานะเพิ่มเติม"],"hive":["อำนาจฝูง +8 · สติ -3 · ถ่วงเวลาให้มนุษย์หนี","อำนาจฝูง +20 · ภัยคุกคามที่หอวิทยุ +25 · พาฝูงรุกคืบ","ไม่แทรกแซงฝูง · ไม่รับผลต่อสถานะเพิ่มเติม"],"signal":["ความไว้ใจ +15 · ส่งพิกัดเฉพาะคลินิกที่รู้รหัส","สติ +5 · ภัยคุกคามที่หอวิทยุ +20 · ทุกฝ่ายรู้ตำแหน่ง","ปิดไมค์รักษาความเงียบ · ไม่รับผลต่อสถานะเพิ่มเติม"],"return":["สติ +12 · ความไว้ใจของอิงเป็น 70 · อิงยอมเป็นพันธมิตร","อิงจากไป · ยังไม่สร้างสายสัมพันธ์ต่อ"]};
        const event = (id, location, title, text, choices, requirements) => ({ id: "next." + id, location, title, text, once: true, requirements, choices: choices.map((choice,index) => ({...choice,...(choiceNotes[id]?.[index] ? {note:choiceNotes[id][index]} : {})})) });
        const EVENTS = [
          event("home", "shelter", "\u0E04\u0E19\u0E17\u0E35\u0E48\u0E40\u0E04\u0E32\u0E30\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E2A\u0E32\u0E21\u0E04\u0E23\u0E31\u0E49\u0E07", "\u0E04\u0E19\u0E40\u0E1B\u0E47\u0E19\u0E04\u0E19\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E19\u0E31\u0E48\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E2D\u0E35\u0E01\u0E1D\u0E31\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E1B\u0E23\u0E30\u0E15\u0E39 \u0E40\u0E18\u0E2D\u0E40\u0E23\u0E35\u0E22\u0E01\u0E15\u0E19\u0E40\u0E2D\u0E07\u0E27\u0E48\u0E32\u0E2D\u0E34\u0E07 \u201C\u0E16\u0E49\u0E32\u0E43\u0E19\u0E19\u0E31\u0E49\u0E19\u0E22\u0E31\u0E07\u0E1F\u0E31\u0E07\u0E23\u0E39\u0E49\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07 \u0E40\u0E04\u0E32\u0E30\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32 \u0E09\u0E31\u0E19\u0E08\u0E30\u0E44\u0E21\u0E48\u0E40\u0E1B\u0E34\u0E14\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E40\u0E2D\u0E07\u201D \u0E40\u0E18\u0E2D\u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01\u0E40\u0E08\u0E49\u0E32 \u0E41\u0E15\u0E48\u0E23\u0E39\u0E49\u0E27\u0E48\u0E32\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E43\u0E19\u0E2B\u0E49\u0E2D\u0E07\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E40\u0E2B\u0E21\u0E37\u0E2D\u0E19\u0E1D\u0E39\u0E07\u0E02\u0E49\u0E32\u0E07\u0E19\u0E2D\u0E01", [
            { id: "answer", text: "\u0E40\u0E04\u0E32\u0E30\u0E01\u0E25\u0E31\u0E1A \u0E41\u0E25\u0E49\u0E27\u0E40\u0E02\u0E35\u0E22\u0E19\u0E1A\u0E2D\u0E01\u0E27\u0E48\u0E32\u0E2D\u0E22\u0E48\u0E32\u0E40\u0E02\u0E49\u0E32\u0E21\u0E32\u0E43\u0E01\u0E25\u0E49", effects: [flag("home"), flag("bond"), npc("ing", "state", "waiting"), npc("ing", "trust", 30)], requirements: alive("ing"), followups: [{ eventId: "next.return", afterDays: 2, context: { place: "shelter" } }] },
            { id: "warn", text: "\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E44\u0E25\u0E48 \u0E43\u0E2B\u0E49\u0E40\u0E18\u0E2D\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E2D\u0E32\u0E04\u0E32\u0E23\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E08\u0E2D\u0E1D\u0E39\u0E07", effects: [flag("home"), npc("ing", "state", "gone")], requirements: alive("ing") },
            leave("leave", [flag("home")])
          ]),
          event("street", "streets", "\u0E17\u0E32\u0E07\u0E2D\u0E2D\u0E01\u0E43\u0E15\u0E49\u0E2A\u0E30\u0E1E\u0E32\u0E19\u0E25\u0E2D\u0E22", "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E25\u0E32\u0E14\u0E15\u0E23\u0E30\u0E40\u0E27\u0E19\u0E02\u0E36\u0E07\u0E25\u0E27\u0E14\u0E15\u0E23\u0E07\u0E17\u0E32\u0E07\u0E44\u0E1B\u0E2B\u0E2D\u0E27\u0E34\u0E17\u0E22\u0E38 \u0E43\u0E15\u0E49\u0E1A\u0E31\u0E19\u0E44\u0E14\u0E21\u0E35\u0E17\u0E32\u0E07\u0E41\u0E04\u0E1A\u0E17\u0E35\u0E48\u0E23\u0E48\u0E32\u0E07\u0E04\u0E19\u0E15\u0E32\u0E22\u0E25\u0E2D\u0E14\u0E44\u0E14\u0E49 \u0E1A\u0E19\u0E01\u0E33\u0E41\u0E1E\u0E07\u0E21\u0E35\u0E04\u0E33\u0E02\u0E2D\u0E43\u0E2B\u0E49\u0E40\u0E27\u0E49\u0E19\u0E17\u0E32\u0E07\u0E44\u0E27\u0E49\u0E43\u0E2B\u0E49\u0E04\u0E19\u0E08\u0E32\u0E01\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E1C\u0E48\u0E32\u0E19\u0E04\u0E37\u0E19\u0E1E\u0E23\u0E38\u0E48\u0E07\u0E19\u0E35\u0E49", [
            { id: "open", text: "\u0E40\u0E1B\u0E34\u0E14\u0E0A\u0E48\u0E2D\u0E07\u0E44\u0E27\u0E49 \u0E41\u0E25\u0E49\u0E27\u0E17\u0E33\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E2B\u0E21\u0E32\u0E22\u0E43\u0E2B\u0E49\u0E04\u0E19\u0E15\u0E32\u0E21\u0E21\u0E32\u0E44\u0E14\u0E49", effects: [flag("street"), flag("protected"), stat("trust", 8)], behaviorTags: ["helped"] },
            { id: "lure", text: "\u0E40\u0E04\u0E32\u0E30\u0E23\u0E32\u0E27\u0E40\u0E2B\u0E25\u0E47\u0E01\u0E25\u0E48\u0E2D\u0E1D\u0E39\u0E07\u0E44\u0E1B\u0E17\u0E35\u0E48\u0E14\u0E48\u0E32\u0E19 \u2014 \u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E08\u0E30\u0E15\u0E32\u0E21\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E21\u0E32\u0E14\u0E49\u0E27\u0E22", effects: [flag("street"), flag("threatened"), stat("horde", 15), { type: "location.threat.add", id: "streets", value: 25 }], behaviorTags: ["hordeLed"] },
            leave("leave", [flag("street")])
          ]),
          event("clinic", "hospital", "\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E16\u0E38\u0E07\u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E31\u0E1A\u0E04\u0E19\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E2B\u0E32\u0E22\u0E43\u0E08", "\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E19\u0E27\u0E25\u0E22\u0E01\u0E21\u0E37\u0E2D\u0E2B\u0E49\u0E32\u0E21\u0E40\u0E08\u0E49\u0E32\u0E17\u0E35\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E39\u0E49\u0E41\u0E0A\u0E48 \u201C\u0E2D\u0E22\u0E48\u0E32\u0E40\u0E02\u0E49\u0E32\u0E21\u0E32\u0E2D\u0E35\u0E01 \u0E09\u0E31\u0E19\u0E40\u0E2B\u0E47\u0E19\u0E27\u0E48\u0E32\u0E40\u0E18\u0E2D\u0E21\u0E2D\u0E07\u0E2D\u0E30\u0E44\u0E23\u201D \u0E21\u0E35\u0E04\u0E19\u0E40\u0E08\u0E47\u0E1A\u0E0B\u0E48\u0E2D\u0E19\u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E25\u0E31\u0E07\u0E21\u0E48\u0E32\u0E19 \u0E40\u0E25\u0E37\u0E2D\u0E14\u0E43\u0E19\u0E15\u0E39\u0E49\u0E19\u0E35\u0E49\u0E04\u0E37\u0E2D\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E31\u0E1A\u0E17\u0E35\u0E48\u0E40\u0E08\u0E49\u0E32\u0E1E\u0E1A\u0E43\u0E19\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E40\u0E25\u0E37\u0E2D\u0E14 \u0E17\u0E38\u0E01\u0E16\u0E38\u0E07\u0E17\u0E35\u0E48\u0E43\u0E0A\u0E49\u0E08\u0E30\u0E2B\u0E21\u0E14\u0E44\u0E1B\u0E08\u0E23\u0E34\u0E07", [
            { id: "donate", text: "\u0E2A\u0E48\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E16\u0E38\u0E07\u0E43\u0E2B\u0E49\u0E19\u0E27\u0E25\u0E0A\u0E48\u0E27\u0E22\u0E04\u0E19\u0E40\u0E08\u0E47\u0E1A \u0E41\u0E21\u0E49\u0E15\u0E31\u0E27\u0E40\u0E2D\u0E07\u0E22\u0E31\u0E07\u0E2B\u0E34\u0E27", bloodCost: 1, pressure: true, effects: [flag("clinic"), flag("helped"), npc("nuan", "state", "ally"), npc("nuan", "trust", 65), { type: "memory.record", key: "saved" }, stat("trust", 12)], requirements: alive("nuan"), behaviorTags: ["helped"], followups: [{ eventId: "next.recognition", afterDays: 2, context: { place: "hospital" } }] },
            { id: "drink", text: "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E14\u0E37\u0E48\u0E21\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E16\u0E38\u0E07\u0E15\u0E48\u0E2D\u0E2B\u0E19\u0E49\u0E32\u0E40\u0E18\u0E2D", bloodCost: 1, effects: [flag("clinic"), flag("raided"), stat("hunger", -45), npc("nuan", "state", "hostile")], requirements: alive("nuan"), behaviorTags: ["feeds"] },
            leave("leave", [flag("clinic")])
          ]),
          event("hive", "nest", "\u0E1D\u0E39\u0E07\u0E22\u0E37\u0E19\u0E23\u0E2D\u0E04\u0E33\u0E17\u0E35\u0E48\u0E40\u0E08\u0E49\u0E32\u0E22\u0E31\u0E07\u0E1E\u0E39\u0E14\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49", "\u0E1D\u0E39\u0E07\u0E04\u0E49\u0E32\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E1A\u0E31\u0E19\u0E44\u0E14 \u0E23\u0E32\u0E27\u0E01\u0E31\u0E1A\u0E44\u0E14\u0E49\u0E22\u0E34\u0E19\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E08\u0E32\u0E01\u0E23\u0E48\u0E32\u0E07\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E21\u0E35\u0E0A\u0E35\u0E1E\u0E08\u0E23\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E08\u0E49\u0E32 \u0E14\u0E49\u0E32\u0E19\u0E1A\u0E19\u0E21\u0E35\u0E23\u0E2D\u0E22\u0E40\u0E17\u0E49\u0E32\u0E04\u0E19\u0E40\u0E14\u0E34\u0E19\u0E44\u0E1B\u0E17\u0E32\u0E07\u0E2B\u0E2D\u0E27\u0E34\u0E17\u0E22\u0E38 \u0E40\u0E08\u0E49\u0E32\u0E08\u0E30\u0E40\u0E1B\u0E34\u0E14\u0E17\u0E32\u0E07\u0E43\u0E2B\u0E49\u0E43\u0E04\u0E23 \u0E42\u0E14\u0E22\u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E40\u0E1B\u0E47\u0E19\u0E23\u0E32\u0E0A\u0E32\u0E02\u0E2D\u0E07\u0E43\u0E04\u0E23\u0E40\u0E25\u0E22\u0E01\u0E47\u0E44\u0E14\u0E49", [
            { id: "hold", text: "\u0E22\u0E37\u0E19\u0E02\u0E27\u0E32\u0E07\u0E1D\u0E39\u0E07 \u0E43\u0E2B\u0E49\u0E23\u0E2D\u0E22\u0E40\u0E17\u0E49\u0E32\u0E04\u0E19\u0E21\u0E35\u0E40\u0E27\u0E25\u0E32\u0E2B\u0E32\u0E22\u0E44\u0E1B", effects: [flag("hive"), flag("protected"), stat("horde", 8), stat("sanity", -3)], behaviorTags: ["hordeLed", "helped"] },
            { id: "lead", text: "\u0E1E\u0E32\u0E1D\u0E39\u0E07\u0E15\u0E32\u0E21\u0E02\u0E36\u0E49\u0E19\u0E44\u0E1B \u2014 \u0E08\u0E38\u0E14\u0E15\u0E23\u0E27\u0E08\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E08\u0E30\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E01\u0E33\u0E25\u0E31\u0E07", effects: [flag("hive"), flag("threatened"), stat("horde", 20), { type: "location.threat.add", id: "radio", value: 25 }], behaviorTags: ["hordeLed"] },
            leave("leave", [flag("hive")])
          ]),
          event("signal", "radio", "\u0E1B\u0E25\u0E32\u0E22\u0E2A\u0E32\u0E22\u0E16\u0E32\u0E21\u0E27\u0E48\u0E32\u0E43\u0E04\u0E23\u0E22\u0E31\u0E07\u0E2D\u0E22\u0E39\u0E48", "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E2A\u0E48\u0E07\u0E22\u0E31\u0E07\u0E21\u0E35\u0E44\u0E1F \u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E2D\u0E32\u0E08\u0E40\u0E23\u0E35\u0E22\u0E01\u0E04\u0E19 \u0E2B\u0E23\u0E37\u0E2D\u0E1E\u0E32\u0E1D\u0E39\u0E07\u0E44\u0E1B\u0E16\u0E36\u0E07\u0E04\u0E19\u0E40\u0E2B\u0E25\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19 \u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E43\u0E15\u0E49\u0E2A\u0E30\u0E1E\u0E32\u0E19\u0E41\u0E25\u0E30\u0E2A\u0E34\u0E48\u0E07\u0E17\u0E35\u0E48\u0E40\u0E08\u0E49\u0E32\u0E17\u0E33\u0E01\u0E31\u0E1A\u0E1D\u0E39\u0E07\u0E08\u0E30\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E27\u0E48\u0E32\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E44\u0E2B\u0E19\u0E22\u0E31\u0E07\u0E2A\u0E48\u0E07\u0E44\u0E14\u0E49", [
            { id: "quiet", text: "\u0E2A\u0E48\u0E07\u0E1E\u0E34\u0E01\u0E31\u0E14\u0E0A\u0E48\u0E2D\u0E07\u0E17\u0E32\u0E07\u0E17\u0E35\u0E48\u0E40\u0E1B\u0E34\u0E14\u0E44\u0E27\u0E49 \u0E40\u0E09\u0E1E\u0E32\u0E30\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E17\u0E35\u0E48\u0E23\u0E39\u0E49\u0E23\u0E2B\u0E31\u0E2A", requirements: { all: [is("protected"), is("helped"), alive("nuan")] }, effects: [flag("signal"), flag("quietSignal"), stat("trust", 15)] },
            { id: "broadcast", text: "\u0E1B\u0E23\u0E30\u0E01\u0E32\u0E28\u0E27\u0E48\u0E32\u0E21\u0E35\u0E1C\u0E39\u0E49\u0E15\u0E32\u0E22\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E1F\u0E31\u0E07\u0E23\u0E39\u0E49\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07 \u2014 \u0E22\u0E2D\u0E21\u0E43\u0E2B\u0E49\u0E17\u0E38\u0E01\u0E1D\u0E48\u0E32\u0E22\u0E23\u0E39\u0E49\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07", effects: [flag("signal"), flag("loudSignal"), { type: "location.threat.add", id: "radio", value: 20 }, stat("sanity", 5)] },
            { id: "silent", text: "\u0E1B\u0E34\u0E14\u0E44\u0E21\u0E04\u0E4C \u0E40\u0E01\u0E47\u0E1A\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E19\u0E35\u0E49\u0E44\u0E27\u0E49\u0E01\u0E31\u0E1A\u0E15\u0E31\u0E27\u0E40\u0E2D\u0E07 \u0E41\u0E25\u0E49\u0E27\u0E40\u0E14\u0E34\u0E19\u0E15\u0E48\u0E2D", effects: [flag("signal")] }
          ]),
          event("return", "shelter", "\u0E40\u0E18\u0E2D\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E40\u0E1E\u0E23\u0E32\u0E30\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E40\u0E04\u0E32\u0E30\u0E19\u0E31\u0E49\u0E19", "มีชอล์กกับกระดาษสอดไว้ใต้ประตู “ฉันจำได้ว่าเธอขอให้ถอย วันนี้ฉันจะนั่งไกลกว่าเดิม” อิงยังมีชีวิตของเธอ ไม่ใช่เพียงเหยื่อประทังความหิวของเจ้า ความระแวงเริ่มมีชื่อของคนอยู่ข้างใน", [
            { id: "write", text: "\u0E40\u0E02\u0E35\u0E22\u0E19\u0E0A\u0E37\u0E48\u0E2D\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E08\u0E33\u0E44\u0E14\u0E49\u0E43\u0E2B\u0E49\u0E40\u0E18\u0E2D\u0E2D\u0E48\u0E32\u0E19", requirements: { all: [alive("ing"), { kind: "npc", id: "next.ing", field: "state", value: "waiting" }] }, effects: [flag("returned"), npc("ing", "state", "ally"), npc("ing", "trust", 70), stat("sanity", 12)], behaviorTags: ["remembered"] },
            leave("leave", [npc("ing", "state", "gone")])
          ], { all: [is("bond"), alive("ing"), { kind: "npc", id: "next.ing", field: "state", value: "waiting" }] }),
          event("recognition", "hospital", "\u0E04\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E21\u0E48\u0E32\u0E19\u0E08\u0E33\u0E21\u0E37\u0E2D\u0E02\u0E2D\u0E07\u0E40\u0E08\u0E49\u0E32\u0E44\u0E14\u0E49", "\u0E19\u0E27\u0E25\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E22\u0E01\u0E2D\u0E32\u0E27\u0E38\u0E18\u0E17\u0E31\u0E19\u0E17\u0E35\u0E2D\u0E35\u0E01\u0E41\u0E25\u0E49\u0E27 \u0E04\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E21\u0E48\u0E32\u0E19\u0E40\u0E02\u0E35\u0E22\u0E19\u0E1B\u0E49\u0E32\u0E22\u0E43\u0E2B\u0E49\u0E17\u0E35\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E1B\u0E23\u0E30\u0E15\u0E39 \u201C\u0E2D\u0E22\u0E48\u0E32\u0E22\u0E34\u0E07\u0E04\u0E19\u0E17\u0E35\u0E48\u0E21\u0E35\u0E1C\u0E49\u0E32\u0E2A\u0E35\u0E02\u0E32\u0E27\u0E1C\u0E39\u0E01\u0E41\u0E02\u0E19\u201D \u0E2A\u0E34\u0E48\u0E07\u0E17\u0E35\u0E48\u0E40\u0E08\u0E49\u0E32\u0E0A\u0E48\u0E27\u0E22\u0E44\u0E27\u0E49\u0E22\u0E31\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E42\u0E25\u0E01 \u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E08\u0E1A\u0E41\u0E04\u0E48\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02\u0E04\u0E27\u0E32\u0E21\u0E44\u0E27\u0E49\u0E43\u0E08", [
            { id: "stay", text: "\u0E23\u0E31\u0E1A\u0E1C\u0E49\u0E32\u0E02\u0E32\u0E27 \u0E42\u0E14\u0E22\u0E22\u0E31\u0E07\u0E40\u0E27\u0E49\u0E19\u0E23\u0E30\u0E22\u0E30\u0E08\u0E32\u0E01\u0E40\u0E15\u0E35\u0E22\u0E07\u0E04\u0E19\u0E40\u0E08\u0E47\u0E1A", effects: [stat("sanity", 8)], behaviorTags: ["remembered"] },
            leave("leave")
          ], { all: [is("helped"), alive("nuan"), { kind: "npc", id: "next.nuan", field: "state", value: "ally" }] })
        ];
        const actions = EVENTS.slice(0, 5).map((e) => ({ id: e.id, name: { "next.home": "\u0E1F\u0E31\u0E07\u0E04\u0E19\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E1B\u0E23\u0E30\u0E15\u0E39", "next.street": "\u0E2A\u0E33\u0E23\u0E27\u0E08\u0E17\u0E32\u0E07\u0E43\u0E15\u0E49\u0E2A\u0E30\u0E1E\u0E32\u0E19\u0E25\u0E2D\u0E22", "next.clinic": "\u0E40\u0E02\u0E49\u0E32\u0E43\u0E01\u0E25\u0E49\u0E41\u0E2A\u0E07\u0E44\u0E1F\u0E02\u0E2D\u0E07\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01", "next.hive": "\u0E1F\u0E31\u0E07\u0E2A\u0E34\u0E48\u0E07\u0E17\u0E35\u0E48\u0E1D\u0E39\u0E07\u0E01\u0E33\u0E25\u0E31\u0E07\u0E23\u0E2D", "next.signal": "\u0E25\u0E2D\u0E07\u0E15\u0E2D\u0E1A\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E08\u0E32\u0E01\u0E2B\u0E2D\u0E27\u0E34\u0E17\u0E22\u0E38" }[e.id], glyph: "\u25C7", places: [e.location], encounter: e.id, note: "\u0E2A\u0E33\u0E23\u0E27\u0E08\u0E2A\u0E16\u0E32\u0E19\u0E01\u0E32\u0E23\u0E13\u0E4C \xB7 1 \u0E27\u0E31\u0E19 \xB7 \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E15\u0E2D\u0E1A\u0E2A\u0E19\u0E2D\u0E07\u0E01\u0E48\u0E2D\u0E19\u0E2A\u0E23\u0E38\u0E1B\u0E27\u0E31\u0E19", requirements: is(e.id.slice(5), false), effects: [] }));
        return { CONTENT_VERSION: "after-zero-next-03", FLAGS, NPCS, EVENTS, ACTIONS: [...actions, { id: "next.rest", name: "\u0E1E\u0E31\u0E01\u0E43\u0E19\u0E2B\u0E49\u0E2D\u0E07\u0E17\u0E35\u0E48\u0E19\u0E27\u0E25\u0E40\u0E1B\u0E34\u0E14\u0E44\u0E27\u0E49\u0E43\u0E2B\u0E49", glyph: "\u271A", places: ["hospital"], note: "\u0E04\u0E27\u0E32\u0E21\u0E44\u0E27\u0E49\u0E43\u0E08\u0E40\u0E1B\u0E34\u0E14\u0E17\u0E35\u0E48\u0E1E\u0E31\u0E01\u0E43\u0E01\u0E25\u0E49\u0E15\u0E31\u0E27 \xB7 \u0E1F\u0E37\u0E49\u0E19\u0E23\u0E48\u0E32\u0E07\u0E44\u0E14\u0E49\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14 18 \u0E15\u0E32\u0E21\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E41\u0E25\u0E30\u0E1A\u0E32\u0E14\u0E41\u0E1C\u0E25 \xB7 1 \u0E27\u0E31\u0E19", requirements: { all: [is("helped"), alive("nuan"), { kind: "npc", id: "next.nuan", field: "state", value: "ally" }] }, effects: [{ type: "stat", path: "stats.hp", value: 18 }, { type: "stat", path: "stats.sanity", value: 3 }] }], WORLD_CONTENT_EXTENSIONS: [{ version: 4, contentVersion: "after-zero-next-03", npcs: { "next.ing": { alive: true, state: "wary", trust: 0 }, "next.nuan": { alive: true, state: "wary", trust: 0 } } }], storyActionIds: actions.map((a) => a.id) };
      });
    }
  });

  // ../../tmp/after-zero-zombie/next/start-profiles.js
  var require_start_profiles = __commonJS({
    "../../tmp/after-zero-zombie/next/start-profiles.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_contract(), require_conditions());
        else {
          root.AfterZeroNextSupport = root.AfterZeroNextSupport || {};
          root.AfterZeroNextSupport.StartProfiles = factory(root.ZombieCore.Contract, root.ZombieCore.Conditions);
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(K, Q) {
        "use strict";
        const FLAG = "next.startProfile", VERSION = "after-zero-next-03-profile-r1";
        const object = (x) => x && typeof x === "object" && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype;
        const assert = (yes, message) => {
          if (!yes) throw Error("Start profile: " + message);
        };
        function compile(profiles, C) {
          assert(Array.isArray(profiles) && profiles.length > 0 && profiles.length <= 12, "expected 1\u201312 profiles");
          const seen = /* @__PURE__ */ new Set(), fields = ["id", "name", "text", "origins", "bloodLeft", "threat", "npcs", "actionRequirements"];
          for (const p of profiles) {
            assert(object(p) && Object.keys(p).every((k) => fields.includes(k)), "unknown profile field");
            assert(Q.safe(p.id) && p.id.startsWith("start.") && !seen.has(p.id), "invalid or duplicate ID");
            seen.add(p.id);
            assert(typeof p.name === "string" && p.name.length > 0 && p.name.length <= 160 && typeof p.text === "string" && p.text.length > 0 && p.text.length <= 600, "missing name/text");
            assert(Array.isArray(p.origins) && p.origins.length > 0 && new Set(p.origins).size === p.origins.length && p.origins.every((id) => Object.hasOwn(C.ORIGINS, id)), "unknown origins");
            assert(p.bloodLeft === void 0 || Number.isInteger(p.bloodLeft) && p.bloodLeft >= 0 && p.bloodLeft <= 8, "blood must be finite 0\u20138");
            for (const field of ["threat", "npcs", "actionRequirements"]) assert(p[field] === void 0 || object(p[field]), "invalid " + field);
            for (const [id, value] of Object.entries(p.threat || {})) assert(Object.hasOwn(C.PLACES, id) && Number.isFinite(value) && value >= 0 && value <= 100, "invalid threat");
            for (const [id, value] of Object.entries(p.npcs || {})) {
              assert(id.startsWith("next.") && Object.hasOwn(C.NPCS, id) && object(value) && Object.keys(value).every((k) => ["state", "trust"].includes(k)), "invalid NPC");
              assert(C.NPCS[id].states.includes(value.state) && Number.isFinite(value.trust) && value.trust >= 0 && value.trust <= 100, "invalid NPC state/trust");
            }
            for (const [id, condition] of Object.entries(p.actionRequirements || {})) {
              assert(C.ACTIONS.some((a) => a.id === id && id.startsWith("next.")), "only next authored actions may be gated");
              Q.validate(condition, C);
            }
          }
          for (const id of Object.keys(C.ORIGINS)) assert(profiles.some((p) => p.origins.includes(id)), "no compatible profile for " + id);
          return K.snapshot(profiles);
        }
        function catalog(profiles, C) {
          const ACTIONS = C.ACTIONS.map((a) => {
            const extra = profiles.filter((p) => p.actionRequirements?.[a.id]).map((p) => ({ any: [{ not: { kind: "flag", id: FLAG, value: p.id } }, p.actionRequirements[a.id]] }));
            return extra.length ? { ...a, requirements: { all: [...a.requirements ? [a.requirements] : [], ...extra] } } : a;
          });
          return { ...C, CONTENT_VERSION: VERSION, FLAGS: { ...C.FLAGS, [FLAG]: { type: "string", default: "legacy" } }, ACTIONS, WORLD_CONTENT_EXTENSIONS: [...C.WORLD_CONTENT_EXTENSIONS, { version: 5, contentVersion: VERSION, npcs: {} }] };
        }
        function select(profiles, originId, random) {
          const options = profiles.filter((p) => p.origins.includes(originId));
          assert(options.length > 0, "no compatible profile");
          return options[Math.floor(random() * options.length)];
        }
        function initialize(s, p) {
          s.story.flags[FLAG] = p.id;
          if (p.bloodLeft !== void 0) s.bloodLeft = p.bloodLeft;
          for (const [id, threat] of Object.entries(p.threat || {})) s.world.locations[id].threat = threat;
          for (const [id, value] of Object.entries(p.npcs || {})) Object.assign(s.world.npcs[id], value);
        }
        return { FLAG, VERSION, compile, catalog, select, initialize };
      });
    }
  });

  // ../../tmp/after-zero-zombie/next/presentation.js
  var require_presentation = __commonJS({
    "../../tmp/after-zero-zombie/next/presentation.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_contract());
        else {
          root.AfterZeroNextSupport = root.AfterZeroNextSupport || {};
          root.AfterZeroNextSupport.Presentation = factory(root.ZombieCore.Contract);
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(K) {
        "use strict";
        const conditionalCare = /* @__PURE__ */ new Set(["next.rest", "c40.clinic_scavenge", "c40.clinic_perimeter_rest", "c42.hospital_supply_cache", "c42.shelter_backdoor"]);
        function build(N, s, { archive = [], status = null } = {}) {
          const E = N.engine, C = N.catalog, view = E.viewModel(s), place = C.PLACES[s.place], situation = N.situation(s);
          const pressure = E.previewDay(s), labels = { wary: "\u0E22\u0E31\u0E07\u0E23\u0E30\u0E41\u0E27\u0E07", waiting: "\u0E23\u0E2D\u0E1F\u0E31\u0E07\u0E04\u0E33\u0E15\u0E2D\u0E1A", ally: "\u0E22\u0E2D\u0E21\u0E44\u0E27\u0E49\u0E43\u0E08", allied: "\u0E22\u0E2D\u0E21\u0E44\u0E27\u0E49\u0E43\u0E08", gone: "\u0E08\u0E32\u0E01\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27", departed: "\u0E08\u0E32\u0E01\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27", hostile: "\u0E44\u0E21\u0E48\u0E22\u0E2D\u0E21\u0E43\u0E2B\u0E49\u0E40\u0E02\u0E49\u0E32\u0E43\u0E01\u0E25\u0E49", met: "\u0E1E\u0E1A\u0E15\u0E31\u0E27\u0E41\u0E25\u0E49\u0E27" };
          const people = [["next.ing", "\u0E2D\u0E34\u0E07", "\u0E04\u0E19\u0E17\u0E35\u0E48\u0E40\u0E04\u0E32\u0E30\u0E1B\u0E23\u0E30\u0E15\u0E39"], ["next.nuan", "\u0E19\u0E27\u0E25", "\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E17\u0E35\u0E48\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01"], ["remnant.mali", "\u0E21\u0E32\u0E25\u0E35", "\u0E04\u0E19\u0E17\u0E35\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01\u0E0A\u0E37\u0E48\u0E2D"]].filter(([id]) => id === "next.ing" ? s.story.flags["next.home"] : id === "next.nuan" ? s.story.flags["next.clinic"] : Boolean(s.world?.npcs?.[id] && (s.world.npcs[id].state !== "unknown" || !s.world.npcs[id].alive))).map(([id, name, role]) => {
            const n = s.world.npcs[id];
            return { id, name, role, status: !n.alive ? "\u0E40\u0E2A\u0E35\u0E22\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E41\u0E25\u0E49\u0E27" : labels[n.state] || n.state };
          });
          const action = (a) => {
            const preview = E.previewAction(s, a.id), story = N.storyActionIds.includes(a.id) || a.id.startsWith("story.");
            const description = a.move ? "\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07 1 \u0E27\u0E31\u0E19 \xB7 \u0E20\u0E31\u0E22\u0E43\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48 " + s.world.locations[a.move].threat + "/100 \xB7 " + preview.notices.map((n) => n.text).join(" \xB7 ") : [story ? "1 \u0E27\u0E31\u0E19 \xB7 \u0E15\u0E31\u0E14\u0E2A\u0E34\u0E19\u0E43\u0E08\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E1E\u0E1A\u0E40\u0E2B\u0E15\u0E38\u0E01\u0E32\u0E23\u0E13\u0E4C" : a.note, ...preview.costSummary, ...preview.notices.map((n) => n.text), ...preview.reasons].filter(Boolean).join(" \xB7 ");
            const availableWithoutPending = s.pending ? E.previewAction({ ...s, pending: null }, a.id).enabled : preview.enabled;
            return { id: a.id, name: a.move ? "\u0E44\u0E1B" + C.PLACES[a.move].short : a.name, group: a.move ? "travel" : story || a.ending ? "story" : "care", visible: !((story || conditionalCare.has(a.id)) && !availableWithoutPending && !s.ending || (a.id === "story.clinic" && s.day < 3 && !s.story.flags["next.clinic"] || a.id === "story.pack" && s.day < 3 && !s.story.flags["c41.streets_scouted"] || a.id === "story.remnant" && s.day < 3 && !s.story.flags["c42.crossroad_resolved"]) || a.ending && !availableWithoutPending && !(a.id === "cure" && (s.stats.research >= 30 || s.items.samples >= 1 || s.story.flags["c40.clinic_stabilized"] || s.story.flags["c42.medical_recalled"]) || a.id === "crown" && (s.stats.horde >= 25 || s.story.flags["c41.nest_route_open"]) || a.id === "evolve" && (s.stats.mutation >= 25 || s.items.samples >= 1) || a.id === "extinguish" && (s.stats.campaign >= 1 || s.stats.horde >= 35 || s.story.flags["c41.radio_jammed"]))), note: a.move ? "\u0E20\u0E31\u0E22\u0E43\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48 " + s.world.locations[a.move].threat + "/100" : a.note || "", description, preview };
          };
          let pending = null;
          if (s.pending && !s.ending) {
            const p = s.pending, event = E.pendingEvent(s);
            if (event) {
              pending = { instanceId: p.instanceId, eventId: p.eventId, title: event.title, text: event.text, turn: p.turn, dayNote: p.turn ? "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E41\u0E25\u0E49\u0E27\u0E2A\u0E23\u0E38\u0E1B\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49 \u0E23\u0E27\u0E21 1 \u0E27\u0E31\u0E19 \u0E44\u0E21\u0E48\u0E21\u0E35\u0E01\u0E32\u0E23\u0E40\u0E01\u0E47\u0E1A\u0E27\u0E31\u0E19\u0E0B\u0E49\u0E33" : "\u0E1A\u0E17\u0E2A\u0E19\u0E17\u0E19\u0E32\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E49\u0E27\u0E31\u0E19", choices: event.choices.map((c, index) => {
                const preview = E.previewChoice(s, index);
                return { index, text: c.text, note: c.note || "", description: [c.note, ...preview.costSummary, ...preview.notices.map((n) => n.text), ...preview.reasons].filter(Boolean).join(" \xB7 "), preview };
              }) };
            }
          }
          const endingDef = s.ending ? (C.ENDINGS[s.ending.id] || C.ENDINGS.feral || { title: s.ending.title || "\u0E08\u0E1A\u0E0A\u0E35\u0E27\u0E34\u0E15", text: s.ending.text || "" }) : null;
          return K.snapshot({
            version: "i40-view-v1",
            day: s.day,
            place: { id: s.place, name: place.name, short: place.short, description: place.description },
            origin: view.origin,
            vitals: [["hp", "\u0E2A\u0E20\u0E32\u0E1E\u0E23\u0E48\u0E32\u0E07"], ["hunger", "\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27"], ["sanity", "\u0E2A\u0E15\u0E34"]].map(([id, label]) => ({ id, label, value: Math.floor(s.stats[id]), max: 100 })),
            pressure: pressure.notices.map((n) => n.text).join(" \xB7 ") || "\u0E22\u0E31\u0E07\u0E21\u0E35\u0E40\u0E27\u0E25\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E17\u0E32\u0E07\u0E02\u0E2D\u0E07\u0E15\u0E31\u0E27\u0E40\u0E2D\u0E07",
            pressureNotices: pressure.notices,
            body: "\u0E40\u0E2A\u0E1A\u0E35\u0E22\u0E07\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C " + s.items.supplies + " \xB7 \u0E0A\u0E38\u0E14\u0E40\u0E22\u0E47\u0E1A\u0E41\u0E1C\u0E25 " + s.items.medicine + " \xB7 \u0E40\u0E25\u0E37\u0E2D\u0E14\u0E43\u0E19\u0E15\u0E39\u0E49 " + s.bloodLeft + " \u0E16\u0E38\u0E07" + (s.items.samples > 0 ? " \xB7 \u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E0A\u0E37\u0E49\u0E2D " + s.items.samples : ""),
            situation,
            people,
            pending,
            actions: E.actions(s).filter((a) => a.move || !a.places || a.places.includes(s.place)).map(action),
            waiting: view.storyFollowups,
            journal: s.log.slice(0, 12),
            ending: s.ending ? { ...s.ending, title: endingDef.title, text: endingDef.text, causeOfDeath: s.ending.causeOfDeath || null } : null,
            archive,
            status
          });
        }
        function summaryInput(s) {
          return K.snapshot({ runId: s.runId, originId: s.originId, strainId: s.strainId, day: s.day, stats: s.stats, body: s.body, place: s.place, ending: s.ending, memory: s.memory, behavior: s.behavior, flags: s.story.flags, npcs: s.world.npcs, locations: s.world.locations, milestones: s.chronicle.milestones });
        }
        return { build, summaryInput };
      });
    }
  });

  // ../../tmp/after-zero-zombie/next/runtime.js
  var require_runtime2 = __commonJS({
    "../../tmp/after-zero-zombie/next/runtime.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_runtime(), require_random(), require_contract(), require_reference_content(), require_start_profiles(), require_presentation());
        else root.AfterZeroNext = factory(root.ZombieRuntime, root.ZombieCore.Random, root.ZombieCore.Contract, root.AfterZeroNextData.Reference, root.AfterZeroNextSupport.StartProfiles, root.AfterZeroNextSupport.Presentation);
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(R, Random, K, Content, Start, Presentation) {
        "use strict";
        function situation(s) {
          const f = s.story.flags;
          return {
            weather: f["next.weather"] === "rain" ? "\u0E1D\u0E19\u0E01\u0E25\u0E1A\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E1A\u0E19\u0E16\u0E19\u0E19 \u0E41\u0E15\u0E48\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E40\u0E1B\u0E35\u0E22\u0E01\u0E25\u0E37\u0E48\u0E19\u0E21\u0E35\u0E20\u0E31\u0E22\u0E40\u0E1E\u0E34\u0E48\u0E21" : "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E25\u0E32\u0E14\u0E15\u0E23\u0E30\u0E40\u0E27\u0E19\u0E22\u0E31\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25",
            clue: f["next.clue"] === "voice" ? "\u0E40\u0E08\u0E49\u0E32\u0E08\u0E33\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E30\u0E40\u0E04\u0E32\u0E30\u0E2A\u0E32\u0E21\u0E04\u0E23\u0E31\u0E49\u0E07\u0E44\u0E14\u0E49 \u0E41\u0E15\u0E48\u0E22\u0E31\u0E07\u0E08\u0E33\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E27\u0E48\u0E32\u0E40\u0E1B\u0E47\u0E19\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E43\u0E04\u0E23" : "\u0E21\u0E35\u0E01\u0E23\u0E30\u0E14\u0E32\u0E29\u0E1E\u0E31\u0E1A\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E01\u0E23\u0E30\u0E40\u0E1B\u0E4B\u0E32 \u0E40\u0E02\u0E35\u0E22\u0E19\u0E27\u0E48\u0E32 \u201C\u0E16\u0E49\u0E32\u0E22\u0E31\u0E07\u0E1F\u0E31\u0E07\u0E23\u0E39\u0E49\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07 \u0E40\u0E04\u0E32\u0E30\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u201D",
            consequences: [f["next.helped"] ? "\u0E19\u0E27\u0E25\u0E08\u0E33\u0E44\u0E14\u0E49\u0E27\u0E48\u0E32\u0E40\u0E08\u0E49\u0E32\u0E41\u0E1A\u0E48\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E43\u0E2B\u0E49\u0E04\u0E19\u0E40\u0E08\u0E47\u0E1A" : null, f["next.raided"] ? "\u0E19\u0E27\u0E25\u0E23\u0E30\u0E41\u0E27\u0E07\u0E40\u0E08\u0E49\u0E32 \u0E2B\u0E25\u0E31\u0E07\u0E40\u0E2B\u0E47\u0E19\u0E40\u0E08\u0E49\u0E32\u0E14\u0E37\u0E48\u0E21\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E15\u0E48\u0E2D\u0E2B\u0E19\u0E49\u0E32" : null, f["next.protected"] ? "\u0E17\u0E32\u0E07\u0E17\u0E35\u0E48\u0E40\u0E08\u0E49\u0E32\u0E40\u0E27\u0E49\u0E19\u0E44\u0E27\u0E49\u0E22\u0E31\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E17\u0E32\u0E07\u0E1C\u0E48\u0E32\u0E19\u0E02\u0E2D\u0E07\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C" : null, f["next.threatened"] ? "\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E04\u0E27\u0E32\u0E21\u0E23\u0E30\u0E27\u0E31\u0E07 \u0E2B\u0E25\u0E31\u0E07\u0E1D\u0E39\u0E07\u0E02\u0E22\u0E31\u0E1A\u0E15\u0E32\u0E21\u0E40\u0E08\u0E49\u0E32" : null, f["next.quietSignal"] ? "\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E1E\u0E34\u0E01\u0E31\u0E14\u0E17\u0E35\u0E48\u0E2A\u0E48\u0E07\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E07\u0E35\u0E22\u0E1A \u0E46" : null, f["next.loudSignal"] ? "\u0E17\u0E38\u0E01\u0E1D\u0E48\u0E32\u0E22\u0E44\u0E14\u0E49\u0E22\u0E34\u0E19\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E02\u0E2D\u0E07\u0E40\u0E08\u0E49\u0E32\u0E41\u0E25\u0E49\u0E27" : null].filter(Boolean)
          };
        }
        function build({ systems = {}, profiles = null } = {}) {
          let catalog = { ...R.catalog, CONTENT_VERSION: Content.CONTENT_VERSION, FLAGS: { ...R.catalog.FLAGS, ...Content.FLAGS }, NPCS: { ...R.catalog.NPCS, ...Content.NPCS }, EVENTS: [...R.catalog.EVENTS, ...Content.EVENTS], ACTIONS: [...R.catalog.ACTIONS, ...Content.ACTIONS], WORLD_CONTENT_EXTENSIONS: [...R.catalog.WORLD_CONTENT_EXTENSIONS, ...Content.WORLD_CONTENT_EXTENSIONS] };
          const compiled = profiles === null ? null : Start.compile(profiles, catalog);
          if (compiled) catalog = Start.catalog(compiled, catalog);
          catalog = K.snapshot(catalog);
          const base = R.build(systems, catalog);
          function create(seed, options) {
            const s = base.create(seed, options);
            s.story.flags["next.initialized"] = true;
            s.story.flags["next.weather"] = Random.next(s) < 0.5 ? "rain" : "patrol";
            s.story.flags["next.clue"] = Random.next(s) < 0.5 ? "voice" : "writing";
            s.bloodLeft = 6 + Math.floor(Random.next(s) * 3);
            s.world.locations[s.story.flags["next.weather"] === "rain" ? "streets" : "hospital"].threat = 20;
            if (compiled && !options?.careerStart) Start.initialize(s, Start.select(compiled, s.originId, () => Random.next(s)));
            if (options?.careerStart) s.story.flags[Start.FLAG] = 'legacy';
            return base.validate(s);
          }
          function validate(value) {
            const legacy = value?.contentVersion === Content.CONTENT_VERSION && value?.world?.contentRevision === 4;
            if (value?.story?.flags?.["next.initialized"] !== true || !legacy && value?.contentVersion !== catalog.CONTENT_VERSION) throw Error("\u0E19\u0E35\u0E48\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E40\u0E0B\u0E1F\u0E23\u0E38\u0E48\u0E19\u0E17\u0E14\u0E25\u0E2D\u0E07 0.3 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E1B\u0E34\u0E14\u0E40\u0E0B\u0E1F\u0E40\u0E14\u0E34\u0E21\u0E43\u0E19\u0E23\u0E38\u0E48\u0E19 0.2");
            if (compiled) {
              const marker = value.story.flags[Start.FLAG];
              if (legacy && marker !== void 0) throw Error("Legacy save cannot contain a start profile");
              if (!legacy && marker !== "legacy" && !compiled.some((p) => p.id === marker && p.origins.includes(value.originId))) throw Error("\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1A\u0E23\u0E34\u0E1A\u0E17\u0E01\u0E32\u0E23\u0E40\u0E01\u0E34\u0E14\u0E44\u0E21\u0E48\u0E04\u0E23\u0E1A");
            }
            const s = base.validate(value);
            if (!["rain", "patrol"].includes(s.story.flags["next.weather"]) || !["voice", "writing"].includes(s.story.flags["next.clue"])) throw Error("\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E42\u0E25\u0E01\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19\u0E44\u0E21\u0E48\u0E04\u0E23\u0E1A");
            if (compiled && legacy) s.story.flags[Start.FLAG] = "legacy";
            return s;
          }
          const engine = { ...base, create, validate };
          function describe(s) {
            const result = situation(s), profile = compiled?.find((p) => p.id === s.story.flags[Start.FLAG]);
            return K.snapshot({ ...result, profile: profile ? { id: profile.id, name: profile.name, text: profile.text } : null });
          }
          const bundle = { catalog, engine, situation: compiled ? describe : situation, storyActionIds: Content.storyActionIds, summaryInput: Presentation.summaryInput };
          bundle.viewModel = (s, extras) => Presentation.build(bundle, s, extras);
          return bundle;
        }
        return { ...build(), build };
      });
    }
  });

  // ../../tmp/after-zero-zombie/next/data/start-candidates.js
  var require_start_candidates = __commonJS({
    "../../tmp/after-zero-zombie/next/data/start-candidates.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory();
        else {
          root.AfterZeroNextData = root.AfterZeroNextData || {};
          root.AfterZeroNextData.StartCandidates = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        function freeze(value) {
          if (value && typeof value === "object") {
            Object.values(value).forEach(freeze);
            Object.freeze(value);
          }
          return value;
        }
        const PROFILES = [
          {
            id: "start.cordon",
            name: "\u0E41\u0E19\u0E27\u0E25\u0E32\u0E14\u0E15\u0E23\u0E30\u0E40\u0E27\u0E19\u0E1B\u0E34\u0E14\u0E25\u0E49\u0E2D\u0E21",
            text: "\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E44\u0E0B\u0E40\u0E23\u0E19\u0E41\u0E25\u0E30\u0E41\u0E2A\u0E07\u0E2A\u0E1B\u0E2D\u0E15\u0E44\u0E25\u0E15\u0E4C\u0E01\u0E49\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E41\u0E19\u0E27\u0E14\u0E48\u0E32\u0E19\u0E15\u0E23\u0E27\u0E08 \u0E17\u0E2B\u0E32\u0E23\u0E15\u0E34\u0E14\u0E2D\u0E32\u0E27\u0E38\u0E18\u0E15\u0E23\u0E36\u0E07\u0E01\u0E33\u0E25\u0E31\u0E07\u0E43\u0E15\u0E49\u0E2A\u0E30\u0E1E\u0E32\u0E19\u0E25\u0E2D\u0E22\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E02\u0E49\u0E21\u0E07\u0E27\u0E14 \u0E01\u0E32\u0E23\u0E40\u0E02\u0E49\u0E32\u0E43\u0E01\u0E25\u0E49\u0E17\u0E32\u0E07\u0E25\u0E2D\u0E14\u0E15\u0E49\u0E2D\u0E07\u0E23\u0E2D\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E30\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E40\u0E27\u0E23\u0E43\u0E19\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E2D\u0E07 \u0E41\u0E15\u0E48\u0E01\u0E32\u0E23\u0E15\u0E23\u0E36\u0E07\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E17\u0E33\u0E43\u0E2B\u0E49\u0E23\u0E31\u0E07\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E04\u0E38\u0E01\u0E04\u0E32\u0E21\u0E40\u0E02\u0E49\u0E32\u0E21\u0E32 \u0E41\u0E25\u0E30\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E22\u0E31\u0E07\u0E21\u0E35\u0E2A\u0E33\u0E23\u0E2D\u0E07",
            origins: ["origins.patient", "origins.home", "origins.soldier"],
            bloodLeft: 6,
            threat: { streets: 40, hospital: 20, nest: 10, radio: 25 },
            npcs: { "next.nuan": { state: "wary", trust: 10 }, "next.ing": { state: "wary", trust: 0 } },
            actionRequirements: { "next.street": { kind: "day", min: 2 } }
          },
          {
            id: "start.outbreak",
            name: "\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E25\u0E49\u0E19\u0E17\u0E30\u0E25\u0E31\u0E01\u0E41\u0E25\u0E30\u0E1D\u0E39\u0E07\u0E25\u0E49\u0E2D\u0E21",
            text: "\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E20\u0E31\u0E22\u0E14\u0E31\u0E07\u0E23\u0E30\u0E07\u0E21\u0E08\u0E32\u0E01\u0E1B\u0E35\u0E01\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25 \u0E1C\u0E39\u0E49\u0E25\u0E35\u0E49\u0E20\u0E31\u0E22\u0E41\u0E25\u0E30\u0E04\u0E19\u0E40\u0E08\u0E47\u0E1A\u0E2B\u0E25\u0E31\u0E48\u0E07\u0E44\u0E2B\u0E25\u0E08\u0E19\u0E25\u0E49\u0E19\u0E17\u0E32\u0E07\u0E40\u0E02\u0E49\u0E32 \u0E1D\u0E39\u0E07\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E40\u0E23\u0E34\u0E48\u0E21\u0E40\u0E02\u0E49\u0E32\u0E25\u0E49\u0E2D\u0E21\u0E15\u0E36\u0E01 \u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E19\u0E27\u0E25\u0E16\u0E37\u0E2D\u0E2D\u0E32\u0E27\u0E38\u0E18\u0E23\u0E30\u0E41\u0E27\u0E07\u0E1C\u0E39\u0E49\u0E04\u0E19\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E16\u0E36\u0E07\u0E17\u0E35\u0E48\u0E2A\u0E38\u0E14 \u0E01\u0E32\u0E23\u0E40\u0E02\u0E49\u0E32\u0E2B\u0E32\u0E41\u0E2A\u0E07\u0E44\u0E1F\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E23\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E42\u0E01\u0E25\u0E32\u0E2B\u0E25\u0E0B\u0E32\u0E25\u0E07\u0E43\u0E19\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E2D\u0E07 \u0E41\u0E15\u0E48\u0E16\u0E19\u0E19\u0E23\u0E2D\u0E1A\u0E19\u0E2D\u0E01\u0E01\u0E25\u0E31\u0E1A\u0E1B\u0E25\u0E2D\u0E14\u0E42\u0E1B\u0E23\u0E48\u0E07\u0E41\u0E25\u0E30\u0E04\u0E25\u0E31\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E22\u0E31\u0E07\u0E40\u0E15\u0E47\u0E21\u0E41\u0E1B\u0E14\u0E16\u0E38\u0E07",
            origins: ["origins.patient", "origins.home", "origins.soldier"],
            bloodLeft: 8,
            threat: { hospital: 45, nest: 35, streets: 15, shelter: 10 },
            npcs: { "next.nuan": { state: "hostile", trust: 0 }, "next.ing": { state: "wary", trust: 0 } },
            actionRequirements: { "next.clinic": { kind: "day", min: 2 } }
          },
          {
            id: "start.blackout",
            name: "\u0E2B\u0E2D\u0E27\u0E34\u0E17\u0E22\u0E38\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E14\u0E31\u0E1A\u0E41\u0E25\u0E30\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E23\u0E49\u0E32\u0E07",
            text: "\u0E04\u0E25\u0E37\u0E48\u0E19\u0E27\u0E34\u0E17\u0E22\u0E38\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E2B\u0E27\u0E35\u0E14\u0E41\u0E2B\u0E25\u0E21\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E07\u0E35\u0E22\u0E1A\u0E2A\u0E19\u0E34\u0E17\u0E25\u0E07 \u0E40\u0E21\u0E37\u0E2D\u0E07\u0E16\u0E39\u0E01\u0E17\u0E34\u0E49\u0E07\u0E23\u0E49\u0E32\u0E07\u0E41\u0E25\u0E30\u0E04\u0E25\u0E31\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E16\u0E39\u0E01\u0E23\u0E37\u0E49\u0E2D\u0E04\u0E49\u0E19\u0E08\u0E19\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E40\u0E1E\u0E35\u0E22\u0E07\u0E2A\u0E35\u0E48\u0E16\u0E38\u0E07 \u0E40\u0E2A\u0E32\u0E2A\u0E48\u0E07\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E1A\u0E19\u0E22\u0E2D\u0E14\u0E40\u0E02\u0E32\u0E22\u0E31\u0E07\u0E02\u0E31\u0E14\u0E02\u0E49\u0E2D\u0E07\u0E08\u0E19\u0E01\u0E27\u0E48\u0E32\u0E08\u0E30\u0E15\u0E31\u0E49\u0E07\u0E2A\u0E32\u0E22\u0E2D\u0E32\u0E01\u0E32\u0E28\u0E43\u0E2B\u0E21\u0E48\u0E44\u0E14\u0E49\u0E43\u0E19\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E2D\u0E07 \u0E41\u0E15\u0E48\u0E2B\u0E0D\u0E34\u0E07\u0E2A\u0E32\u0E27\u0E2B\u0E25\u0E31\u0E07\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E17\u0E35\u0E48\u0E1E\u0E31\u0E01\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E08\u0E23\u0E31\u0E1A\u0E1F\u0E31\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E15\u0E2D\u0E1A \u0E41\u0E25\u0E30\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E22\u0E31\u0E07\u0E2A\u0E07\u0E1A\u0E40\u0E07\u0E35\u0E22\u0E1A",
            origins: ["origins.patient", "origins.home", "origins.soldier"],
            bloodLeft: 4,
            threat: { radio: 45, nest: 40, streets: 25, hospital: 15, shelter: 20 },
            npcs: { "next.nuan": { state: "wary", trust: 0 }, "next.ing": { state: "waiting", trust: 20 } },
            actionRequirements: { "next.signal": { kind: "day", min: 2 } }
          }
        ];
        return freeze({ PROFILES });
      });
    }
  });

  // ../../tmp/after-zero-zombie/next/systems/director.js
  var require_director2 = __commonJS({
    "../../tmp/after-zero-zombie/next/systems/director.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_director());
        else {
          root.AfterZeroNextSystems = root.AfterZeroNextSystems || {};
          root.AfterZeroNextSystems.Director = factory(root.ZombieSystems.Director);
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(BaseDirector) {
        "use strict";
        function select(view, trigger, ctx) {
          if (view.pending || view.ending || !trigger) return null;
          if (trigger.kind === "morning") return BaseDirector.select(view, trigger, ctx);
          if (trigger.kind !== "action" || !trigger.action) return null;
          const action = trigger.action;
          if (action.ending || action.encounter) return BaseDirector.select(view, trigger, ctx);
          const C = ctx.registry;
          const reserved = /* @__PURE__ */ new Set([...C.ACTIONS.map((a) => a.encounter), ...view.story.scheduled.map((item) => item.eventId)]);
          const candidates = C.EVENTS.filter((event) => !reserved.has(event.id) && event.trigger !== "morning" && event.trigger !== "opening" && event.day === void 0 && !event.followup && event.tags?.includes(action.eventTag || "quiet") && BaseDirector.eligible(view, event, C));
          if (!candidates.length) return null;
          const last = (event) => view.eventHistory[event.id] ?? -Infinity;
          candidates.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || last(a) - last(b) || a.id.localeCompare(b.id));
          if (ctx.random && ctx.random() > 0.62) return null;
          const first = candidates[0], top = candidates.filter((event) => (event.priority ?? 0) === (first.priority ?? 0) && last(event) === last(first));
          const pick = top.length > 1 && ctx.random ? Math.floor(ctx.random() * top.length) : 0;
          return { eventId: top[pick].id, context: { place: view.place }, recordHistory: true };
        }
        return { select };
      });
    }
  });

  // ../../tmp/after-zero-zombie/next/data/clinic-candidate.js
  var require_clinic_candidate = __commonJS({
    "../../tmp/after-zero-zombie/next/data/clinic-candidate.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory();
        else {
          root.AfterZeroNextData = root.AfterZeroNextData || {};
          root.AfterZeroNextData.ClinicCandidate = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        const FLAGS = {
          "c40.withdrawn": { type: "boolean", default: false },
          "c40.scavenged": { type: "boolean", default: false },
          "c40.marked_boundary": { type: "boolean", default: false },
          "c40.reapproached": { type: "boolean", default: false }
        };
        const NPCS = {};
        const INITIAL_NPCS = {};
        const ACTIONS = [
          {
            id: "next.clinic",
            name: "\u0E40\u0E02\u0E49\u0E32\u0E43\u0E01\u0E25\u0E49\u0E41\u0E2A\u0E07\u0E44\u0E1F\u0E02\u0E2D\u0E07\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01",
            glyph: "\u25C7",
            places: ["hospital"],
            encounter: "next.clinic",
            note: "\u0E2A\u0E33\u0E23\u0E27\u0E08\u0E2A\u0E16\u0E32\u0E19\u0E01\u0E32\u0E23\u0E13\u0E4C\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E40\u0E0B\u0E19\u0E15\u0E4C\u0E25\u0E32\u0E0B\u0E32\u0E23\u0E31\u0E2A \xB7 1 \u0E27\u0E31\u0E19 \xB7 \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E15\u0E2D\u0E1A\u0E2A\u0E19\u0E2D\u0E07\u0E01\u0E48\u0E2D\u0E19\u0E2A\u0E23\u0E38\u0E1B\u0E27\u0E31\u0E19"
          },
          {
            id: "next.rest",
            name: "\u0E1E\u0E31\u0E01\u0E43\u0E19\u0E2B\u0E49\u0E2D\u0E07\u0E17\u0E35\u0E48\u0E19\u0E27\u0E25\u0E40\u0E1B\u0E34\u0E14\u0E44\u0E27\u0E49\u0E43\u0E2B\u0E49",
            glyph: "\u271A",
            places: ["hospital"],
            note: "\u0E04\u0E27\u0E32\u0E21\u0E44\u0E27\u0E49\u0E43\u0E08\u0E40\u0E1B\u0E34\u0E14\u0E17\u0E35\u0E48\u0E1E\u0E31\u0E01\u0E43\u0E01\u0E25\u0E49\u0E15\u0E31\u0E27 \xB7 \u0E1F\u0E37\u0E49\u0E19\u0E23\u0E48\u0E32\u0E07\u0E44\u0E14\u0E49\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14 18 \u0E15\u0E32\u0E21\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E41\u0E25\u0E30\u0E1A\u0E32\u0E14\u0E41\u0E1C\u0E25 \xB7 1 \u0E27\u0E31\u0E19",
            effects: [
              { type: "stat", path: "stats.hp", value: 18 },
              { type: "stat", path: "stats.sanity", value: 3 }
            ]
          },
          {
            id: "c40.clinic_scavenge",
            name: "\u0E04\u0E38\u0E49\u0E22\u0E2B\u0E32\u0E40\u0E28\u0E29\u0E22\u0E32\u0E02\u0E49\u0E32\u0E07\u0E15\u0E39\u0E49\u0E02\u0E22\u0E30\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01",
            glyph: "\u2315",
            places: ["hospital"],
            note: "\u0E19\u0E27\u0E25\u0E1B\u0E34\u0E14\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E02\u0E31\u0E07\u0E15\u0E31\u0E27\u0E40\u0E2D\u0E07\u0E44\u0E27\u0E49\u0E14\u0E49\u0E32\u0E19\u0E43\u0E19 \xB7 \u0E04\u0E49\u0E19\u0E2B\u0E32\u0E40\u0E28\u0E29\u0E40\u0E27\u0E0A\u0E20\u0E31\u0E13\u0E11\u0E4C\u0E23\u0E2D\u0E1A\u0E19\u0E2D\u0E01 1 \u0E0A\u0E34\u0E49\u0E19 \xB7 \u0E40\u0E2A\u0E35\u0E48\u0E22\u0E07\u0E20\u0E31\u0E22 15 \xB7 1 \u0E27\u0E31\u0E19",
            requirements: {
              all: [
                { kind: "flag", id: "next.raided", value: true },
                { kind: "flag", id: "c40.scavenged", value: false }
              ]
            },
            effects: [
              { type: "item.add", key: "medicine", value: 1 },
              { type: "flag.set", id: "c40.scavenged", value: true },
              { type: "location.threat.add", id: "hospital", value: 15 }
            ]
          },
          {
            id: "c40.clinic_perimeter_rest",
            name: "\u0E1E\u0E31\u0E01\u0E43\u0E15\u0E49\u0E01\u0E31\u0E19\u0E2A\u0E32\u0E14\u0E19\u0E2D\u0E01\u0E41\u0E19\u0E27\u0E01\u0E31\u0E49\u0E19\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01",
            glyph: "\u271A",
            places: ["hospital"],
            note: "\u0E2D\u0E32\u0E28\u0E31\u0E22\u0E21\u0E38\u0E21\u0E2D\u0E31\u0E1A\u0E2A\u0E32\u0E22\u0E15\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E1E\u0E31\u0E01\u0E1C\u0E48\u0E2D\u0E19 \xB7 \u0E44\u0E21\u0E48\u0E23\u0E1A\u0E01\u0E27\u0E19\u0E04\u0E19\u0E40\u0E1B\u0E47\u0E19 \xB7 \u0E1F\u0E37\u0E49\u0E19\u0E23\u0E48\u0E32\u0E07\u0E44\u0E14\u0E49\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14 8 \u0E15\u0E32\u0E21\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E41\u0E25\u0E30\u0E1A\u0E32\u0E14\u0E41\u0E1C\u0E25 \xB7 1 \u0E27\u0E31\u0E19",
            requirements: {
              all: [
                { kind: "flag", id: "c40.withdrawn", value: true },
                { kind: "flag", id: "next.helped", value: false },
                { kind: "flag", id: "next.raided", value: false }
              ]
            },
            effects: [
              { type: "stat", path: "stats.hp", value: 8 },
              { type: "stat", path: "stats.sanity", value: 2 }
            ]
          }
        ];
        const EVENTS = [
          {
            id: "next.clinic",
            location: "hospital",
            title: "\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E16\u0E38\u0E07\u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E31\u0E1A\u0E04\u0E19\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E2B\u0E32\u0E22\u0E43\u0E08",
            text: "\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E19\u0E27\u0E25\u0E22\u0E01\u0E1B\u0E37\u0E19\u0E02\u0E36\u0E49\u0E19\u0E40\u0E25\u0E47\u0E07\u0E17\u0E35\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E39\u0E49\u0E41\u0E0A\u0E48 \u201C\u0E2D\u0E22\u0E48\u0E32\u0E40\u0E02\u0E49\u0E32\u0E21\u0E32\u0E2D\u0E35\u0E01 \u0E09\u0E31\u0E19\u0E40\u0E2B\u0E47\u0E19\u0E27\u0E48\u0E32\u0E40\u0E18\u0E2D\u0E21\u0E2D\u0E07\u0E2D\u0E30\u0E44\u0E23\u201D \u0E21\u0E35\u0E04\u0E19\u0E40\u0E08\u0E47\u0E1A\u0E19\u0E2D\u0E19\u0E2B\u0E32\u0E22\u0E43\u0E08\u0E23\u0E27\u0E22\u0E23\u0E34\u0E19\u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E25\u0E31\u0E07\u0E21\u0E48\u0E32\u0E19 \u0E40\u0E25\u0E37\u0E2D\u0E14\u0E43\u0E19\u0E15\u0E39\u0E49\u0E19\u0E35\u0E49\u0E04\u0E37\u0E2D\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E41\u0E2B\u0E25\u0E48\u0E07\u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E31\u0E1A\u0E17\u0E35\u0E48\u0E40\u0E08\u0E49\u0E32\u0E1E\u0E1A\u0E43\u0E19\u0E18\u0E19\u0E32\u0E04\u0E32\u0E23\u0E40\u0E25\u0E37\u0E2D\u0E14 \u0E17\u0E38\u0E01\u0E16\u0E38\u0E07\u0E17\u0E35\u0E48\u0E43\u0E0A\u0E49\u0E08\u0E30\u0E2B\u0E21\u0E14\u0E44\u0E1B\u0E08\u0E23\u0E34\u0E07 \u0E40\u0E08\u0E49\u0E32\u0E1E\u0E22\u0E32\u0E22\u0E32\u0E21\u0E2A\u0E30\u0E01\u0E14\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E43\u0E19\u0E25\u0E33\u0E04\u0E2D\u0E1E\u0E39\u0E14\u0E14\u0E49\u0E27\u0E22\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25 \u0E19\u0E27\u0E25\u0E0A\u0E30\u0E07\u0E31\u0E01\u0E44\u0E1B\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E23\u0E39\u0E49\u0E27\u0E48\u0E32\u0E40\u0E08\u0E49\u0E32\u0E22\u0E31\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E19\u0E36\u0E01\u0E04\u0E34\u0E14 \u0E41\u0E15\u0E48\u0E22\u0E31\u0E07\u0E04\u0E07\u0E01\u0E38\u0E21\u0E2D\u0E32\u0E27\u0E38\u0E18\u0E44\u0E27\u0E49\u0E41\u0E19\u0E48\u0E19\u0E14\u0E49\u0E27\u0E22\u0E04\u0E27\u0E32\u0E21\u0E23\u0E30\u0E41\u0E27\u0E07",
            once: true,
            choices: [
              {
                id: "donate",
                text: "\u0E2A\u0E48\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E16\u0E38\u0E07\u0E43\u0E2B\u0E49\u0E19\u0E27\u0E25\u0E0A\u0E48\u0E27\u0E22\u0E04\u0E19\u0E40\u0E08\u0E47\u0E1A \u0E41\u0E21\u0E49\u0E15\u0E31\u0E27\u0E40\u0E2D\u0E07\u0E22\u0E31\u0E07\u0E2B\u0E34\u0E27",
                bloodCost: 1,
                pressure: true,
                note: "ใช้เลือด 1 ถุง · ฝืนเข้าใกล้คนทั้งที่หิวจัด (หากหิว ≥75 จะเสียสติและสภาพร่างจากแรงกดดัน) · ช่วยชีวิตมนุษย์หนึ่งคน · นวลยอมรับเป็นพันธมิตร",
                requirements: { kind: "npc", id: "next.nuan", field: "alive", value: true },
                effects: [
                  { type: "flag.set", id: "next.clinic", value: true },
                  { type: "flag.set", id: "next.helped", value: true },
                  { type: "npc.set", id: "next.nuan", field: "state", value: "ally" },
                  { type: "npc.set", id: "next.nuan", field: "trust", value: 65 },
                  { type: "memory.record", key: "saved" },
                  { type: "stat.add", key: "trust", value: 12 }
                ],
                behaviorTags: ["helped"],
                followups: [{ eventId: "next.recognition", afterDays: 2, context: { place: "hospital" } }]
              },
              {
                id: "drink",
                text: "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E14\u0E37\u0E48\u0E21\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E16\u0E38\u0E07\u0E15\u0E48\u0E2D\u0E2B\u0E19\u0E49\u0E32\u0E40\u0E18\u0E2D",
                bloodCost: 1,
                note: "\u0E43\u0E0A\u0E49\u0E40\u0E25\u0E37\u0E2D\u0E14 1 \u0E16\u0E38\u0E07 \xB7 \u0E14\u0E31\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E21\u0E2B\u0E32\u0E28\u0E32\u0E25 \xB7 \u0E2A\u0E15\u0E34\u0E44\u0E21\u0E48\u0E25\u0E14\u0E40\u0E1E\u0E23\u0E32\u0E30\u0E01\u0E34\u0E19\u0E04\u0E19 \xB7 \u0E44\u0E21\u0E48\u0E16\u0E37\u0E2D\u0E27\u0E48\u0E32\u0E40\u0E1B\u0E47\u0E19\u0E01\u0E32\u0E23\u0E06\u0E48\u0E32\u0E04\u0E19\u0E40\u0E08\u0E47\u0E1A\u0E42\u0E14\u0E22\u0E15\u0E23\u0E07 \xB7 \u0E19\u0E27\u0E25\u0E2B\u0E27\u0E32\u0E14\u0E01\u0E25\u0E31\u0E27\u0E41\u0E25\u0E30\u0E02\u0E31\u0E1A\u0E44\u0E25\u0E48",
                requirements: { kind: "npc", id: "next.nuan", field: "alive", value: true },
                effects: [
                  { type: "flag.set", id: "next.clinic", value: true },
                  { type: "flag.set", id: "next.raided", value: true },
                  { type: "stat.add", key: "hunger", value: -45 },
                  { type: "npc.set", id: "next.nuan", field: "state", value: "hostile" },
                  { type: "npc.set", id: "next.nuan", field: "trust", value: 0 }
                ],
                behaviorTags: ["feeds"],
                followups: [{ eventId: "c40.clinic_barricade", afterDays: 1, context: { place: "hospital" } }]
              },
              {
                id: "leave",
                text: "\u0E16\u0E2D\u0E22\u0E2D\u0E2D\u0E01\u0E21\u0E32 \u2014 \u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E44\u0E27\u0E49\u0E43\u0E08\u0E43\u0E04\u0E23",
                note: "\u0E17\u0E32\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 \xB7 \u0E44\u0E21\u0E48\u0E40\u0E2A\u0E35\u0E22\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E41\u0E25\u0E30\u0E44\u0E21\u0E48\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E04\u0E27\u0E32\u0E21\u0E02\u0E31\u0E14\u0E41\u0E22\u0E49\u0E07 \xB7 \u0E16\u0E2D\u0E22\u0E2D\u0E2D\u0E01\u0E21\u0E32\u0E14\u0E39\u0E2A\u0E16\u0E32\u0E19\u0E01\u0E32\u0E23\u0E13\u0E4C\u0E08\u0E32\u0E01\u0E23\u0E30\u0E22\u0E30\u0E2B\u0E48\u0E32\u0E07",
                requirements: { all: [] },
                effects: [
                  { type: "flag.set", id: "next.clinic", value: true },
                  { type: "flag.set", id: "c40.withdrawn", value: true }
                ],
                behaviorTags: ["endured"],
                followups: [{ eventId: "c40.clinic_withdrawal", afterDays: 1, context: { place: "hospital" } }]
              }
            ]
          },
          {
            id: "next.recognition",
            location: "hospital",
            title: "\u0E04\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E21\u0E48\u0E32\u0E19\u0E08\u0E33\u0E21\u0E37\u0E2D\u0E02\u0E2D\u0E07\u0E40\u0E08\u0E49\u0E32\u0E44\u0E14\u0E49",
            text: "นวลไม่ได้ยกอาวุธขึ้นเล็งอีกแล้ว คนหลังม่านเขียนป้ายให้ที่หน้าประตู “อย่ายิงคนที่มีผ้าสีขาวผูกแขน” คนที่เจ้าช่วยยังมีชีวิตอยู่หลังม่าน และจดจำความช่วยเหลือนั้นได้ นวลยอมรับให้เจ้าพักฟื้นในห้องฉุกเฉินได้",
            once: true,
            requirements: {
              all: [
                { kind: "flag", id: "next.helped", value: true },
                { kind: "npc", id: "next.nuan", field: "alive", value: true },
                { kind: "npc", id: "next.nuan", field: "state", value: "ally" }
              ]
            },
            choices: [
              {
                id: "stay",
                text: "\u0E23\u0E31\u0E1A\u0E1C\u0E49\u0E32\u0E02\u0E32\u0E27 \u0E42\u0E14\u0E22\u0E22\u0E31\u0E07\u0E40\u0E27\u0E49\u0E19\u0E23\u0E30\u0E22\u0E30\u0E08\u0E32\u0E01\u0E40\u0E15\u0E35\u0E22\u0E07\u0E04\u0E19\u0E40\u0E08\u0E47\u0E1A",
                note: "สติ +8 · งานวิจัย +10 · ความเป็นมนุษย์ +5 · นวลยอมให้พักในคลินิก",
                requirements: { kind: "npc", id: "next.nuan", field: "alive", value: true },
                effects: [
                  { type: "stat.add", key: "sanity", value: 8 }
                ],
                behaviorTags: ["remembered"]
              },
              {
                id: "leave",
                text: "\u0E16\u0E2D\u0E22\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E2B\u0E49\u0E2D\u0E07 \u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E43\u0E2B\u0E49\u0E04\u0E19\u0E40\u0E08\u0E47\u0E1A\u0E44\u0E14\u0E49\u0E1E\u0E31\u0E01\u0E1F\u0E37\u0E49\u0E19",
                note: "\u0E17\u0E32\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 \xB7 \u0E16\u0E2D\u0E22\u0E2D\u0E2D\u0E01\u0E21\u0E32\u0E40\u0E07\u0E35\u0E22\u0E1A\u0E46 \u0E42\u0E14\u0E22\u0E44\u0E21\u0E48\u0E23\u0E1A\u0E01\u0E27\u0E19",
                requirements: { all: [] },
                effects: [],
                behaviorTags: ["endured"]
              }
            ]
          },
          {
            id: "c40.clinic_barricade",
            location: "hospital",
            title: "\u0E41\u0E19\u0E27\u0E01\u0E31\u0E49\u0E19\u0E41\u0E25\u0E30\u0E2A\u0E32\u0E22\u0E15\u0E32\u0E40\u0E04\u0E35\u0E22\u0E14\u0E41\u0E04\u0E49\u0E19\u0E2B\u0E19\u0E49\u0E32\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01",
            text: "\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E01\u0E23\u0E30\u0E08\u0E01\u0E2B\u0E19\u0E49\u0E32\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E16\u0E39\u0E01\u0E41\u0E1C\u0E48\u0E19\u0E44\u0E21\u0E49\u0E41\u0E25\u0E30\u0E15\u0E39\u0E49\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E15\u0E2D\u0E01\u0E1B\u0E34\u0E14\u0E15\u0E32\u0E22\u0E2A\u0E19\u0E34\u0E17 \u0E19\u0E27\u0E25\u0E40\u0E25\u0E47\u0E07\u0E25\u0E33\u0E01\u0E25\u0E49\u0E2D\u0E07\u0E1B\u0E37\u0E19\u0E1C\u0E48\u0E32\u0E19\u0E0A\u0E48\u0E2D\u0E07\u0E41\u0E04\u0E1A \u0E40\u0E2A\u0E35\u0E22\u0E07\u0E02\u0E36\u0E49\u0E19\u0E19\u0E01\u0E14\u0E31\u0E07\u0E04\u0E25\u0E34\u0E01\u0E0A\u0E31\u0E14\u0E40\u0E08\u0E19\u0E43\u0E19\u0E04\u0E27\u0E32\u0E21\u0E40\u0E07\u0E35\u0E22\u0E1A \u201C\u0E2D\u0E22\u0E48\u0E32\u0E40\u0E02\u0E49\u0E32\u0E21\u0E32\u0E43\u0E01\u0E25\u0E49\u0E17\u0E35\u0E48\u0E19\u0E35\u0E48\u0E2D\u0E35\u0E01! \u0E40\u0E08\u0E49\u0E32\u0E40\u0E1B\u0E47\u0E19\u0E41\u0E04\u0E48\u0E2A\u0E31\u0E15\u0E27\u0E4C\u0E23\u0E49\u0E32\u0E22\u0E17\u0E35\u0E48\u0E01\u0E23\u0E30\u0E2B\u0E32\u0E22\u0E40\u0E25\u0E37\u0E2D\u0E14!\u201D \u0E04\u0E27\u0E32\u0E21\u0E2B\u0E27\u0E32\u0E14\u0E01\u0E25\u0E31\u0E27\u0E17\u0E33\u0E43\u0E2B\u0E49\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E15\u0E31\u0E14\u0E02\u0E32\u0E14\u0E08\u0E32\u0E01\u0E40\u0E08\u0E49\u0E32\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E16\u0E32\u0E27\u0E23",
            once: true,
            requirements: {
              all: [
                { kind: "flag", id: "next.raided", value: true },
                { kind: "npc", id: "next.nuan", field: "alive", value: true }
              ]
            },
            choices: [
              {
                id: "scavenge_look",
                text: "\u0E17\u0E19\u0E15\u0E48\u0E2D\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E2A\u0E32\u0E1B\u0E41\u0E0A\u0E48\u0E07 \u0E40\u0E01\u0E47\u0E1A\u0E40\u0E28\u0E29\u0E40\u0E27\u0E0A\u0E20\u0E31\u0E13\u0E11\u0E4C\u0E17\u0E35\u0E48\u0E01\u0E23\u0E30\u0E40\u0E14\u0E47\u0E19\u0E15\u0E01\u0E2D\u0E22\u0E39\u0E48\u0E19\u0E2D\u0E01\u0E41\u0E19\u0E27\u0E01\u0E31\u0E49\u0E19",
                note: "ชุดเย็บแผล +1 · ภัยคุกคามในโรงพยาบาล +15 · นวลยิงปืนขู่ไล่",
                requirements: {
                  all: [
                    { kind: "flag", id: "c40.scavenged", value: false }
                  ]
                },
                effects: [
                  { type: "item.add", key: "medicine", value: 1 },
                  { type: "flag.set", id: "c40.scavenged", value: true },
                  { type: "location.threat.add", id: "hospital", value: 15 }
                ],
                behaviorTags: ["endured"]
              },
              {
                id: "endure_gaze",
                text: "\u0E22\u0E37\u0E19\u0E19\u0E34\u0E48\u0E07\u0E43\u0E2B\u0E49\u0E40\u0E18\u0E2D\u0E40\u0E2B\u0E47\u0E19\u0E27\u0E48\u0E32\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E08\u0E30\u0E1E\u0E38\u0E48\u0E07\u0E17\u0E33\u0E23\u0E49\u0E32\u0E22 \u0E01\u0E48\u0E2D\u0E19\u0E01\u0E49\u0E32\u0E27\u0E16\u0E2D\u0E22\u0E2B\u0E25\u0E31\u0E07",
                note: "\u0E22\u0E2D\u0E21\u0E23\u0E31\u0E1A\u0E1C\u0E25\u0E02\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E01\u0E23\u0E30\u0E17\u0E33 \xB7 \u0E16\u0E2D\u0E22\u0E2D\u0E2D\u0E01\u0E21\u0E32\u0E42\u0E14\u0E22\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E14\u0E01\u0E32\u0E23\u0E1B\u0E30\u0E17\u0E30",
                requirements: { kind: "npc", id: "next.nuan", field: "alive", value: true },
                effects: [
                  { type: "stat.add", key: "sanity", value: -2 }
                ],
                behaviorTags: ["endured"]
              },
              {
                id: "leave",
                text: "\u0E2B\u0E31\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E40\u0E14\u0E34\u0E19\u0E2B\u0E19\u0E35\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E27\u0E34\u0E16\u0E35\u0E01\u0E23\u0E30\u0E2A\u0E38\u0E19\u0E17\u0E31\u0E19\u0E17\u0E35",
                note: "\u0E17\u0E32\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 \xB7 \u0E44\u0E21\u0E48\u0E40\u0E2A\u0E35\u0E48\u0E22\u0E07\u0E40\u0E08\u0E47\u0E1A\u0E15\u0E31\u0E27\u0E41\u0E25\u0E30\u0E44\u0E21\u0E48\u0E42\u0E15\u0E49\u0E15\u0E2D\u0E1A",
                requirements: { all: [] },
                effects: [],
                behaviorTags: ["endured"]
              }
            ]
          },
          {
            id: "c40.clinic_withdrawal",
            location: "hospital",
            title: "\u0E40\u0E07\u0E32\u0E21\u0E37\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E0A\u0E32\u0E22\u0E04\u0E32\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01",
            text: "\u0E40\u0E08\u0E49\u0E32\u0E16\u0E2D\u0E22\u0E01\u0E32\u0E22\u0E2D\u0E2D\u0E01\u0E21\u0E32\u0E2B\u0E25\u0E1A\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E15\u0E49\u0E40\u0E07\u0E32\u0E0A\u0E32\u0E22\u0E04\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E32\u0E07\u0E40\u0E02\u0E49\u0E32\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25 \u0E41\u0E2A\u0E07\u0E44\u0E1F\u0E19\u0E35\u0E2D\u0E2D\u0E19\u0E02\u0E2D\u0E07\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E22\u0E31\u0E07\u0E2A\u0E48\u0E2D\u0E07\u0E01\u0E23\u0E30\u0E17\u0E1A\u0E1C\u0E34\u0E27\u0E01\u0E32\u0E22\u0E17\u0E35\u0E48\u0E44\u0E23\u0E49\u0E44\u0E2D\u0E2D\u0E38\u0E48\u0E19 \u0E19\u0E27\u0E25\u0E22\u0E31\u0E07\u0E04\u0E07\u0E22\u0E37\u0E19\u0E40\u0E1D\u0E49\u0E32\u0E2B\u0E25\u0E31\u0E07\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E01\u0E23\u0E30\u0E08\u0E01\u0E17\u0E35\u0E48\u0E1B\u0E34\u0E14\u0E2A\u0E19\u0E34\u0E17 \u0E21\u0E2D\u0E07\u0E15\u0E32\u0E21\u0E40\u0E07\u0E32\u0E23\u0E48\u0E32\u0E07\u0E02\u0E2D\u0E07\u0E40\u0E08\u0E49\u0E32\u0E14\u0E49\u0E27\u0E22\u0E41\u0E27\u0E27\u0E15\u0E32\u0E2A\u0E31\u0E1A\u0E2A\u0E19\u0E23\u0E30\u0E04\u0E19\u0E2B\u0E27\u0E32\u0E14\u0E2B\u0E27\u0E31\u0E48\u0E19 \u0E01\u0E32\u0E23\u0E16\u0E2D\u0E22\u0E2D\u0E2D\u0E01\u0E21\u0E32\u0E17\u0E33\u0E43\u0E2B\u0E49\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E43\u0E19\u0E15\u0E39\u0E49\u0E22\u0E31\u0E07\u0E04\u0E07\u0E2D\u0E22\u0E39\u0E48 \u0E41\u0E25\u0E30\u0E04\u0E19\u0E40\u0E08\u0E47\u0E1A\u0E22\u0E31\u0E07\u0E21\u0E35\u0E42\u0E2D\u0E01\u0E32\u0E2A\u0E23\u0E2D\u0E14\u0E0A\u0E35\u0E27\u0E34\u0E15",
            once: true,
            requirements: {
              all: [
                { kind: "flag", id: "c40.withdrawn", value: true }
              ]
            },
            choices: [
              {
                id: "mark_boundary",
                text: "\u0E17\u0E33\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E2B\u0E21\u0E32\u0E22\u0E1A\u0E19\u0E40\u0E2A\u0E32\u0E15\u0E49\u0E19\u0E19\u0E2D\u0E01 \u0E40\u0E15\u0E37\u0E2D\u0E19\u0E44\u0E21\u0E48\u0E43\u0E2B\u0E49\u0E1D\u0E39\u0E07\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E02\u0E22\u0E31\u0E1A\u0E40\u0E02\u0E49\u0E32\u0E43\u0E01\u0E25\u0E49\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01",
                note: "\u0E0A\u0E48\u0E27\u0E22\u0E1B\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E19\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E22\u0E30\u0E2B\u0E48\u0E32\u0E07 \xB7 \u0E2A\u0E23\u0E49\u0E32\u0E07\u0E04\u0E27\u0E32\u0E21\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E31\u0E48\u0E19\u0E42\u0E14\u0E22\u0E44\u0E21\u0E48\u0E40\u0E1C\u0E0A\u0E34\u0E0D\u0E2B\u0E19\u0E49\u0E32",
                requirements: {
                  all: [
                    { kind: "flag", id: "c40.marked_boundary", value: false }
                  ]
                },
                effects: [
                  { type: "flag.set", id: "c40.marked_boundary", value: true },
                  { type: "stat.add", key: "trust", value: 6 }
                ],
                behaviorTags: ["helped", "endured"],
                followups: [{ eventId: "c40.clinic_reapproach", afterDays: 2, context: { place: "hospital" } }]
              },
              {
                id: "watch_night",
                text: "\u0E40\u0E1D\u0E49\u0E32\u0E23\u0E30\u0E27\u0E31\u0E07\u0E20\u0E31\u0E22\u0E40\u0E07\u0E35\u0E22\u0E1A\u0E46 \u0E43\u0E19\u0E40\u0E07\u0E32\u0E21\u0E37\u0E14\u0E08\u0E19\u0E16\u0E36\u0E07\u0E23\u0E38\u0E48\u0E07\u0E2A\u0E32\u0E07",
                note: "\u0E23\u0E31\u0E01\u0E29\u0E32\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E07\u0E1A\u0E02\u0E2D\u0E07\u0E08\u0E34\u0E15\u0E43\u0E08 \xB7 \u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22\u0E44\u0E14\u0E49\u0E1E\u0E31\u0E01\u0E43\u0E19\u0E21\u0E38\u0E21\u0E2A\u0E07\u0E1A",
                requirements: { all: [] },
                effects: [
                  { type: "stat.add", key: "sanity", value: 4 }
                ],
                behaviorTags: ["endured"]
              },
              {
                id: "leave",
                text: "\u0E01\u0E49\u0E32\u0E27\u0E16\u0E2D\u0E22\u0E2B\u0E25\u0E31\u0E07\u0E2A\u0E39\u0E48\u0E16\u0E19\u0E19\u0E43\u0E2B\u0E0D\u0E48 \u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E43\u0E2B\u0E49\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E0A\u0E30\u0E15\u0E32\u0E01\u0E23\u0E23\u0E21\u0E02\u0E2D\u0E07\u0E15\u0E19\u0E40\u0E2D\u0E07",
                note: "\u0E17\u0E32\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 \xB7 \u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E1A\u0E23\u0E34\u0E40\u0E27\u0E13\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E42\u0E14\u0E22\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C",
                requirements: { all: [] },
                effects: [],
                behaviorTags: ["endured"]
              }
            ]
          },
          {
            id: "c40.clinic_reapproach",
            location: "hospital",
            title: "\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E14\u0E39\u0E41\u0E2A\u0E07\u0E44\u0E1F\u0E2B\u0E19\u0E49\u0E32\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07",
            text: "\u0E41\u0E2A\u0E07\u0E44\u0E1F\u0E19\u0E35\u0E2D\u0E2D\u0E19\u0E02\u0E2D\u0E07\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E22\u0E31\u0E07\u0E01\u0E30\u0E1E\u0E23\u0E34\u0E1A\u0E16\u0E35\u0E48 \u0E19\u0E27\u0E25\u0E21\u0E2D\u0E07\u0E1C\u0E48\u0E32\u0E19\u0E0A\u0E48\u0E2D\u0E07\u0E01\u0E23\u0E30\u0E08\u0E01\u0E40\u0E2B\u0E47\u0E19\u0E23\u0E48\u0E32\u0E07\u0E40\u0E14\u0E34\u0E21\u0E17\u0E35\u0E48\u0E40\u0E04\u0E22\u0E16\u0E2D\u0E22\u0E44\u0E1B\u0E04\u0E23\u0E32\u0E27\u0E01\u0E48\u0E2D\u0E19 \u0E40\u0E18\u0E2D\u0E22\u0E31\u0E07\u0E08\u0E31\u0E1A\u0E1B\u0E37\u0E19\u0E44\u0E27\u0E49\u0E21\u0E31\u0E48\u0E19\u0E41\u0E15\u0E48\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E22\u0E01\u0E02\u0E36\u0E49\u0E19\u0E40\u0E25\u0E47\u0E07 \u201C\u0E40\u0E08\u0E49\u0E32... \u0E15\u0E31\u0E27\u0E17\u0E35\u0E48\u0E22\u0E2D\u0E21\u0E16\u0E2D\u0E22\u0E44\u0E1B\u0E27\u0E31\u0E19\u0E19\u0E31\u0E49\u0E19 \u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E1B\u0E17\u0E35\u0E48\u0E2D\u0E37\u0E48\u0E19\u0E2D\u0E35\u0E01\u0E2B\u0E23\u0E37\u0E2D\u201D \u0E41\u0E21\u0E49\u0E08\u0E30\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E1B\u0E34\u0E14\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E23\u0E31\u0E1A \u0E41\u0E15\u0E48\u0E17\u0E48\u0E32\u0E17\u0E35\u0E23\u0E30\u0E41\u0E27\u0E14\u0E23\u0E30\u0E27\u0E31\u0E07\u0E40\u0E23\u0E34\u0E48\u0E21\u0E1C\u0E48\u0E2D\u0E19\u0E04\u0E25\u0E32\u0E22\u0E25\u0E07",
            once: true,
            requirements: {
              all: [
                { kind: "flag", id: "c40.withdrawn", value: true },
                { kind: "npc", id: "next.nuan", field: "alive", value: true }
              ]
            },
            choices: [
              {
                id: "leave_supplies",
                text: "\u0E27\u0E32\u0E07\u0E40\u0E28\u0E29\u0E40\u0E2A\u0E1A\u0E35\u0E22\u0E07\u0E44\u0E27\u0E49\u0E17\u0E35\u0E48\u0E0A\u0E48\u0E2D\u0E07\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E2B\u0E19\u0E49\u0E32\u0E1B\u0E23\u0E30\u0E15\u0E39",
                note: "ใช้เสบียงมนุษย์ 1 ชิ้น · ความไว้ใจ +8 · วางของแสดงไมตรีแล้วรักษาระยะ",
                requirements: {
                  all: [
                    { kind: "item", key: "supplies", min: 1 },
                    { kind: "flag", id: "c40.reapproached", value: false }
                  ]
                },
                costs: [{ type: "item.add", key: "supplies", value: -1 }],
                effects: [
                  { type: "flag.set", id: "c40.reapproached", value: true },
                  { type: "stat.add", key: "trust", value: 8 }
                ],
                behaviorTags: ["helped"]
              },
              {
                id: "stand_guard",
                text: "\u0E1E\u0E34\u0E07\u0E40\u0E2A\u0E32\u0E21\u0E2D\u0E07\u0E14\u0E39\u0E04\u0E27\u0E32\u0E21\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22\u0E23\u0E2D\u0E1A\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E40\u0E07\u0E35\u0E22\u0E1A\u0E46",
                note: "\u0E2A\u0E31\u0E07\u0E40\u0E01\u0E15\u0E01\u0E32\u0E23\u0E13\u0E4C\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E2A\u0E07\u0E1A \xB7 \u0E2A\u0E15\u0E34\u0E2A\u0E31\u0E21\u0E1B\u0E0A\u0E31\u0E0D\u0E0D\u0E30\u0E21\u0E31\u0E48\u0E19\u0E04\u0E07",
                requirements: { all: [] },
                effects: [
                  { type: "stat.add", key: "sanity", value: 3 }
                ],
                behaviorTags: ["endured"]
              },
              {
                id: "leave",
                text: "\u0E16\u0E2D\u0E22\u0E01\u0E25\u0E31\u0E1A\u0E2A\u0E39\u0E48\u0E04\u0E27\u0E32\u0E21\u0E21\u0E37\u0E14\u0E40\u0E07\u0E35\u0E22\u0E1A\u0E46 \u0E44\u0E21\u0E48\u0E23\u0E1A\u0E01\u0E27\u0E19\u0E40\u0E27\u0E25\u0E32\u0E1E\u0E31\u0E01\u0E1C\u0E48\u0E2D\u0E19",
                note: "\u0E17\u0E32\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 \xB7 \u0E16\u0E2D\u0E22\u0E2D\u0E2D\u0E01\u0E21\u0E32\u0E42\u0E14\u0E22\u0E44\u0E21\u0E48\u0E17\u0E34\u0E49\u0E07\u0E23\u0E48\u0E2D\u0E07\u0E23\u0E2D\u0E22",
                requirements: { all: [] },
                effects: [],
                behaviorTags: ["endured"]
              }
            ]
          }
        ];
        return {
          id: "c40.v1",
          EVENTS,
          ACTIONS,
          FLAGS,
          NPCS,
          INITIAL_NPCS
        };
      });
    }
  });

  // ../../tmp/after-zero-zombie/next/ui/consequence-summary.js
  var require_consequence_summary = __commonJS({
    "../../tmp/after-zero-zombie/next/ui/consequence-summary.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) {
          module.exports = factory();
        } else {
          root.AfterZeroNextUI = root.AfterZeroNextUI || {};
          root.AfterZeroNextUI.ConsequenceSummary = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        const ENDING_NAMES = {
          death: "\u0E15\u0E32\u0E22\u0E40\u0E1B\u0E47\u0E19\u0E04\u0E23\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48\u0E2A\u0E2D\u0E07",
          feral: "\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E40\u0E1E\u0E35\u0E22\u0E07\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27",
          madness: "\u0E2A\u0E15\u0E34\u0E16\u0E39\u0E01\u0E01\u0E25\u0E37\u0E19\u0E01\u0E34\u0E19 \xB7 \u0E01\u0E25\u0E32\u0E22\u0E40\u0E1B\u0E47\u0E19\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E44\u0E23\u0E49\u0E2A\u0E15\u0E34",
          king: "\u0E23\u0E32\u0E0A\u0E32\u0E41\u0E2B\u0E48\u0E07\u0E1C\u0E39\u0E49\u0E44\u0E23\u0E49\u0E0A\u0E35\u0E1E\u0E08\u0E23",
          evolved: "\u0E2A\u0E34\u0E48\u0E07\u0E21\u0E35\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E25\u0E33\u0E14\u0E31\u0E1A\u0E16\u0E31\u0E14\u0E44\u0E1B",
          human: "\u0E2B\u0E31\u0E27\u0E43\u0E08\u0E40\u0E15\u0E49\u0E19\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07",
          extinction: "\u0E42\u0E25\u0E01\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E21\u0E35\u0E43\u0E04\u0E23\u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A",
          survivor: "เปลวเพลิงลบล้างเขตกักกันกรุงเทพฯ · ครบกำหนด 120 วัน",
          bombed: "เปลวเพลิงลบล้างเขตกักกันกรุงเทพฯ · ครบกำหนด 120 วัน",
          silent_guardian: "ผู้เฝ้าประตูเงียบงันแห่งเขตกักกันกรุงเทพฯ",
          escape_companion: "ออกเดินทางพ้นเขตกักกันกรุงเทพฯ",
          horde_breakout: "นำฝูงตีฝ่าวงล้อมด่านกรุงเทพฯ",
          conscious_exile: "ล่องเรือพ้นแม่น้ำเจ้าพระยาก่อนฟ้าสาง"
        };
        const ENDING_TEXTS = {
          death: "\u0E1A\u0E17\u0E08\u0E1A: \u0E15\u0E32\u0E22\u0E40\u0E1B\u0E47\u0E19\u0E04\u0E23\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48\u0E2A\u0E2D\u0E07 \u2014 \u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22\u0E22\u0E2D\u0E21\u0E41\u0E1E\u0E49\u0E40\u0E2A\u0E35\u0E22\u0E01\u0E48\u0E2D\u0E19",
          feral: "\u0E1A\u0E17\u0E08\u0E1A: \u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E40\u0E1E\u0E35\u0E22\u0E07\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27 \u2014 \u0E44\u0E21\u0E48\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E2A\u0E15\u0E34\u0E2A\u0E31\u0E21\u0E1B\u0E0A\u0E31\u0E0D\u0E0D\u0E30",
          madness: "\u0E1A\u0E17\u0E08\u0E1A: \u0E2A\u0E15\u0E34\u0E16\u0E39\u0E01\u0E01\u0E25\u0E37\u0E19\u0E01\u0E34\u0E19 \u2014 \u0E01\u0E25\u0E32\u0E22\u0E40\u0E1B\u0E47\u0E19\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E44\u0E23\u0E49\u0E2A\u0E15\u0E34\u0E43\u0E19\u0E1D\u0E39\u0E07",
          king: "\u0E1A\u0E17\u0E08\u0E1A: \u0E23\u0E32\u0E0A\u0E32\u0E41\u0E2B\u0E48\u0E07\u0E1C\u0E39\u0E49\u0E44\u0E23\u0E49\u0E0A\u0E35\u0E1E\u0E08\u0E23 \u2014 \u0E1D\u0E39\u0E07\u0E2A\u0E07\u0E1A\u0E25\u0E07\u0E43\u0E15\u0E49\u0E01\u0E32\u0E23\u0E19\u0E33",
          evolved: "\u0E1A\u0E17\u0E08\u0E1A: \u0E2A\u0E34\u0E48\u0E07\u0E21\u0E35\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E25\u0E33\u0E14\u0E31\u0E1A\u0E16\u0E31\u0E14\u0E44\u0E1B \u2014 \u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22\u0E01\u0E49\u0E32\u0E27\u0E02\u0E49\u0E32\u0E21\u0E02\u0E35\u0E14\u0E08\u0E33\u0E01\u0E31\u0E14\u0E40\u0E14\u0E34\u0E21",
          human: "\u0E1A\u0E17\u0E08\u0E1A: \u0E2B\u0E31\u0E27\u0E43\u0E08\u0E40\u0E15\u0E49\u0E19\u0E2D\u0E35\u0E07\u0E04\u0E23\u0E31\u0E49\u0E07 \u2014 \u0E2B\u0E31\u0E27\u0E43\u0E08\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E40\u0E15\u0E49\u0E19\u0E41\u0E25\u0E30\u0E08\u0E33\u0E0A\u0E37\u0E48\u0E2D\u0E15\u0E19\u0E40\u0E2D\u0E07\u0E44\u0E14\u0E49",
          extinction: "\u0E1A\u0E17\u0E08\u0E1A: \u0E42\u0E25\u0E01\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E21\u0E35\u0E43\u0E04\u0E23\u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A \u2014 \u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E04\u0E23\u0E2D\u0E1A\u0E04\u0E25\u0E38\u0E21\u0E41\u0E15\u0E48\u0E44\u0E23\u0E49\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E15\u0E2D\u0E1A\u0E23\u0E31\u0E1A",
          survivor: "บทจบ: เปลวเพลิงลบล้างเขตกักกันกรุงเทพฯ — ครบ 120 วัน ฝูงบินทิ้งระเบิดปูพรมเผาทำลายเขตกักกันทั้งหมด",
          bombed: "บทจบ: เปลวเพลิงลบล้างเขตกักกันกรุงเทพฯ — ครบ 120 วัน ฝูงบินทิ้งระเบิดปูพรมเผาทำลายเขตกักกันทั้งหมด",
          silent_guardian: "บทจบระดับบุคคล: ผู้เฝ้าประตูเงียบงันแห่งเขตกักกันกรุงเทพฯ — ปกป้องผู้รอดชีวิตในเขตจนรอดพ้นการกวาดล้าง",
          escape_companion: "บทจบระดับบุคคล: ออกเดินทางพ้นเขตกักกันกรุงเทพฯ — พาผู้รอดชีวิตที่ไว้ใจเต็ม 100 ฝ่าวงล้อมออกไปนอกเมืองก่อนระเบิดลง",
          horde_breakout: "บทจบสายกลายพันธุ์: นำฝูงตีฝ่าวงล้อมด่านกรุงเทพฯ — พาฝูงผู้ติดเชื้อทะลวงด่านคอนกรีตออกจากกรุงเทพฯ ก่อนวันทิ้งระเบิด",
          conscious_exile: "บทจบระดับบุคคล: ล่องเรือพ้นแม่น้ำเจ้าพระยาก่อนฟ้าสาง — รักษาสติและความเป็นมนุษย์ ล่องเรือพ้นรัศมีระเบิดเพลิง"
        };
        function deriveTitle(input) {
          const flags = input?.flags || {};
          const memory = input?.memory || {};
          const behavior = input?.behavior || {};
          const npcs = input?.npcs || {};
          const ending = input?.ending || {};
          if (memory.killed > 0 && memory.saved > 0) {
            return "\u0E1C\u0E39\u0E49\u0E40\u0E04\u0E22\u0E17\u0E31\u0E49\u0E07\u0E0A\u0E48\u0E27\u0E22\u0E41\u0E25\u0E30\u0E1E\u0E23\u0E32\u0E01\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C";
          }
          if (memory.killed > 0) {
            return "\u0E1C\u0E39\u0E49\u0E40\u0E04\u0E22\u0E1E\u0E23\u0E32\u0E01\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C";
          }
          if (flags["next.bond"] && (flags["next.returned"] || npcs["next.ing"]?.state === "ally")) {
            return "\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E01\u0E29\u0E32\u0E40\u0E22\u0E37\u0E48\u0E2D\u0E43\u0E22\u0E41\u0E25\u0E30\u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33\u0E44\u0E27\u0E49\u0E44\u0E14\u0E49";
          }
          if (flags["next.helped"] || Number.isInteger(memory.saved) && memory.saved > 0) {
            return "\u0E1C\u0E39\u0E49\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E0A\u0E48\u0E27\u0E22\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E04\u0E19\u0E40\u0E1B\u0E47\u0E19";
          }
          if (flags["next.raided"]) {
            return "\u0E1C\u0E39\u0E49\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E14\u0E37\u0E48\u0E21\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E15\u0E48\u0E2D\u0E2B\u0E19\u0E49\u0E32\u0E04\u0E19\u0E40\u0E1B\u0E47\u0E19";
          }
          if (flags["remnant.dog_followed"]) {
            return "\u0E1C\u0E39\u0E49\u0E40\u0E14\u0E34\u0E19\u0E15\u0E32\u0E21\u0E2A\u0E38\u0E19\u0E31\u0E02";
          }
          if (behavior.endured && behavior.endured.count > 0) {
            return "\u0E1C\u0E39\u0E49\u0E2D\u0E14\u0E17\u0E19\u0E15\u0E48\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E42\u0E2B\u0E22";
          }
          if (ending.id && ENDING_NAMES[ending.id]) {
            return ENDING_NAMES[ending.id];
          }
          return "\u0E1C\u0E39\u0E49\u0E1C\u0E48\u0E32\u0E19\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E2B\u0E19\u0E36\u0E48\u0E07";
        }
        function deriveMilestones(input) {
          const flags = input?.flags || {};
          const memory = input?.memory || {};
          const behavior = input?.behavior || {};
          const npcs = input?.npcs || {};
          const ending = input?.ending || {};
          const milestones = [];
          if (flags["next.clinic"] || npcs["next.nuan"]) {
            const n = npcs["next.nuan"];
            const isDead = n && n.alive === false;
            const isAlly = n && n.state === "ally";
            const isHostile = n && n.state === "hostile";
            let text = "";
            if (isDead) {
              if (flags["next.helped"]) {
                text = "\u0E40\u0E04\u0E22\u0E41\u0E1A\u0E48\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E0A\u0E48\u0E27\u0E22\u0E04\u0E19\u0E40\u0E08\u0E47\u0E1A\u0E17\u0E35\u0E48\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01 \u0E41\u0E15\u0E48\u0E15\u0E48\u0E2D\u0E21\u0E32\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E19\u0E27\u0E25\u0E40\u0E2A\u0E35\u0E22\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E25\u0E07";
              } else {
                text = "\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E19\u0E27\u0E25\u0E17\u0E35\u0E48\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E40\u0E2A\u0E35\u0E22\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E41\u0E25\u0E49\u0E27";
              }
            } else if (isAlly) {
              text = "\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E19\u0E27\u0E25\u0E22\u0E2D\u0E21\u0E23\u0E31\u0E1A\u0E41\u0E25\u0E30\u0E40\u0E1B\u0E34\u0E14\u0E2B\u0E49\u0E2D\u0E07\u0E1E\u0E31\u0E01\u0E43\u0E19\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E43\u0E2B\u0E49\u0E40\u0E1B\u0E47\u0E19\u0E17\u0E35\u0E48\u0E1E\u0E36\u0E48\u0E07\u0E1E\u0E34\u0E07";
            } else if (isHostile) {
              text = "\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E19\u0E27\u0E25\u0E2B\u0E27\u0E32\u0E14\u0E23\u0E30\u0E41\u0E27\u0E07\u0E41\u0E25\u0E30\u0E15\u0E31\u0E49\u0E07\u0E15\u0E19\u0E40\u0E1B\u0E47\u0E19\u0E1B\u0E0F\u0E34\u0E1B\u0E31\u0E01\u0E29\u0E4C \u0E44\u0E21\u0E48\u0E22\u0E2D\u0E21\u0E43\u0E2B\u0E49\u0E40\u0E02\u0E49\u0E32\u0E43\u0E01\u0E25\u0E49\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01";
            } else if (flags["next.clinic"]) {
              text = "\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E19\u0E27\u0E25\u0E22\u0E31\u0E07\u0E04\u0E07\u0E23\u0E30\u0E41\u0E27\u0E07\u0E41\u0E25\u0E30\u0E23\u0E31\u0E01\u0E29\u0E32\u0E23\u0E30\u0E22\u0E30\u0E2B\u0E48\u0E32\u0E07\u0E17\u0E35\u0E48\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01";
            }
            if (text) milestones.push({ id: "npc.nuan", text });
          }
          if (flags["next.home"] || npcs["next.ing"]) {
            const n = npcs["next.ing"];
            const isDead = n && n.alive === false;
            const isGone = n && n.state === "gone";
            const isAlly = n && n.state === "ally";
            const isWaiting = n && n.state === "waiting";
            let text = "";
            if (isDead) {
              text = "\u0E2D\u0E34\u0E07 \u0E2B\u0E0D\u0E34\u0E07\u0E2A\u0E32\u0E27\u0E17\u0E35\u0E48\u0E40\u0E04\u0E22\u0E40\u0E04\u0E32\u0E30\u0E1B\u0E23\u0E30\u0E15\u0E39 \u0E40\u0E2A\u0E35\u0E22\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E25\u0E07\u0E41\u0E25\u0E49\u0E27";
            } else if (isGone) {
              text = "\u0E2D\u0E34\u0E07 \u0E2B\u0E0D\u0E34\u0E07\u0E2A\u0E32\u0E27\u0E17\u0E35\u0E48\u0E40\u0E04\u0E22\u0E40\u0E04\u0E32\u0E30\u0E1B\u0E23\u0E30\u0E15\u0E39 \u0E25\u0E30\u0E17\u0E34\u0E49\u0E07\u0E17\u0E35\u0E48\u0E1E\u0E31\u0E01\u0E41\u0E25\u0E30\u0E08\u0E32\u0E01\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27";
            } else if (isAlly) {
              text = "\u0E2D\u0E34\u0E07\u0E22\u0E2D\u0E21\u0E23\u0E31\u0E1A\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A\u0E41\u0E25\u0E30\u0E01\u0E25\u0E32\u0E22\u0E40\u0E1B\u0E47\u0E19\u0E21\u0E34\u0E15\u0E23\u0E17\u0E35\u0E48\u0E04\u0E2D\u0E22\u0E2A\u0E48\u0E07\u0E02\u0E48\u0E32\u0E27\u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E1B\u0E23\u0E30\u0E15\u0E39";
            } else if (isWaiting) {
              text = "\u0E2D\u0E34\u0E07\u0E22\u0E31\u0E07\u0E04\u0E07\u0E23\u0E2D\u0E04\u0E2D\u0E22\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E15\u0E2D\u0E1A\u0E23\u0E31\u0E1A\u0E2D\u0E22\u0E39\u0E48\u0E17\u0E35\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E2B\u0E49\u0E2D\u0E07\u0E1E\u0E31\u0E01";
            } else if (flags["next.home"]) {
              text = "\u0E2D\u0E34\u0E07\u0E22\u0E31\u0E07\u0E04\u0E07\u0E23\u0E30\u0E41\u0E27\u0E07\u0E41\u0E25\u0E30\u0E04\u0E2D\u0E22\u0E2A\u0E31\u0E07\u0E40\u0E01\u0E15\u0E17\u0E48\u0E32\u0E17\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E1B\u0E23\u0E30\u0E15\u0E39";
            }
            if (text) milestones.push({ id: "npc.ing", text });
          }
          if (flags["story.clinic.started"] || npcs["clinic.dr_wichai"]) {
            const n = npcs["clinic.dr_wichai"];
            if (n && n.alive === false) {
              milestones.push({ id: "npc.wichai", text: "\u0E14\u0E23.\u0E27\u0E34\u0E0A\u0E31\u0E22\u0E17\u0E35\u0E48\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E40\u0E2A\u0E35\u0E22\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E41\u0E25\u0E49\u0E27" });
            } else if (n && n.state === "gone") {
              milestones.push({ id: "npc.wichai", text: "\u0E14\u0E23.\u0E27\u0E34\u0E0A\u0E31\u0E22\u0E25\u0E30\u0E17\u0E34\u0E49\u0E07\u0E2B\u0E49\u0E2D\u0E07\u0E17\u0E14\u0E25\u0E2D\u0E07\u0E43\u0E19\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E41\u0E25\u0E30\u0E08\u0E32\u0E01\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27" });
            } else if (n && n.state === "ally") {
              milestones.push({ id: "npc.wichai", text: "\u0E14\u0E23.\u0E27\u0E34\u0E0A\u0E31\u0E22\u0E22\u0E2D\u0E21\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E41\u0E25\u0E30\u0E43\u0E2B\u0E49\u0E04\u0E27\u0E32\u0E21\u0E23\u0E48\u0E27\u0E21\u0E21\u0E37\u0E2D\u0E43\u0E19\u0E01\u0E32\u0E23\u0E27\u0E34\u0E08\u0E31\u0E22" });
            }
          }
          if (npcs["remnant.mali"]) {
            const n = npcs["remnant.mali"];
            const isDead = n && n.alive === false;
            const isDeparted = n && n.state === "departed";
            const isAllied = n && n.state === "allied";
            let text = "";
            if (isDead) {
              text = "\u0E21\u0E32\u0E25\u0E35\u0E40\u0E2A\u0E35\u0E22\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E41\u0E25\u0E49\u0E27";
            } else if (isDeparted) {
              text = "\u0E21\u0E32\u0E25\u0E35\u0E15\u0E31\u0E14\u0E2A\u0E34\u0E19\u0E43\u0E08\u0E41\u0E22\u0E01\u0E17\u0E32\u0E07\u0E41\u0E25\u0E30\u0E08\u0E32\u0E01\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27";
            } else if (isAllied) {
              text = "\u0E21\u0E32\u0E25\u0E35\u0E22\u0E2D\u0E21\u0E23\u0E31\u0E1A\u0E41\u0E25\u0E30\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E04\u0E27\u0E32\u0E21\u0E44\u0E27\u0E49\u0E27\u0E32\u0E07\u0E43\u0E08\u0E15\u0E48\u0E2D\u0E01\u0E31\u0E19";
            } else if (n && n.state === "met") {
              text = "\u0E44\u0E14\u0E49\u0E1E\u0E1A\u0E41\u0E25\u0E30\u0E40\u0E08\u0E23\u0E08\u0E32\u0E01\u0E31\u0E1A\u0E21\u0E32\u0E25\u0E35";
            }
            if (text) milestones.push({ id: "npc.mali", text });
          }
          if (flags["remnant.dog_followed"] === true) {
            milestones.push({ id: "remnant.dog_followed", text: "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E40\u0E14\u0E34\u0E19\u0E15\u0E32\u0E21\u0E2A\u0E38\u0E19\u0E31\u0E02\u0E17\u0E35\u0E48\u0E08\u0E33\u0E01\u0E25\u0E34\u0E48\u0E19\u0E02\u0E2D\u0E07\u0E15\u0E19\u0E44\u0E14\u0E49" });
          }
          if (flags["next.quietSignal"]) {
            milestones.push({ id: "area.radio", text: "\u0E2A\u0E48\u0E07\u0E23\u0E2B\u0E31\u0E2A\u0E1E\u0E34\u0E01\u0E31\u0E14\u0E25\u0E31\u0E1A\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E1C\u0E48\u0E32\u0E19\u0E2B\u0E2D\u0E27\u0E34\u0E17\u0E22\u0E38\u0E42\u0E14\u0E22\u0E44\u0E21\u0E48\u0E40\u0E1B\u0E34\u0E14\u0E40\u0E1C\u0E22\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E15\u0E48\u0E2D\u0E1D\u0E39\u0E07" });
          } else if (flags["next.loudSignal"]) {
            milestones.push({ id: "area.radio", text: "\u0E01\u0E23\u0E30\u0E08\u0E32\u0E22\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E40\u0E1B\u0E34\u0E14\u0E40\u0E1C\u0E22\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E1C\u0E48\u0E32\u0E19\u0E2B\u0E2D\u0E27\u0E34\u0E17\u0E22\u0E38 \u0E17\u0E33\u0E43\u0E2B\u0E49\u0E2B\u0E2D\u0E2A\u0E48\u0E07\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E01\u0E25\u0E32\u0E22\u0E40\u0E1B\u0E47\u0E19\u0E08\u0E38\u0E14\u0E14\u0E36\u0E07\u0E14\u0E39\u0E14\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E19\u0E43\u0E08" });
          }
          if (flags["clinic.ruins_plundered"]) {
            milestones.push({ id: "area.hospital", text: "\u0E04\u0E25\u0E34\u0E19\u0E34\u0E01\u0E43\u0E19\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E16\u0E39\u0E01\u0E23\u0E37\u0E49\u0E2D\u0E04\u0E49\u0E19\u0E40\u0E2A\u0E35\u0E22\u0E2B\u0E32\u0E22 \u0E01\u0E25\u0E32\u0E22\u0E40\u0E1B\u0E47\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E2D\u0E31\u0E19\u0E15\u0E23\u0E32\u0E22\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E2D\u0E32\u0E08\u0E1E\u0E36\u0E48\u0E07\u0E1E\u0E32\u0E44\u0E14\u0E49\u0E2D\u0E35\u0E01" });
          }
          if (flags["next.protected"]) {
            milestones.push({ id: "action.protected", text: "\u0E40\u0E04\u0E22\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E0A\u0E48\u0E27\u0E22\u0E40\u0E1B\u0E34\u0E14\u0E17\u0E32\u0E07\u0E41\u0E25\u0E30\u0E16\u0E48\u0E27\u0E07\u0E40\u0E27\u0E25\u0E32\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1B\u0E01\u0E1B\u0E49\u0E2D\u0E07\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E02\u0E2D\u0E07\u0E1C\u0E39\u0E49\u0E23\u0E2D\u0E14\u0E0A\u0E35\u0E27\u0E34\u0E15" });
          } else if (flags["next.threatened"]) {
            milestones.push({ id: "action.threatened", text: "\u0E40\u0E04\u0E22\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E19\u0E33\u0E1D\u0E39\u0E07\u0E08\u0E19\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E20\u0E31\u0E22\u0E04\u0E38\u0E01\u0E04\u0E32\u0E21\u0E43\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48" });
          }
          if (Number.isInteger(memory.saved) && memory.saved > 0) {
            const m = { id: "memory.saved", text: "\u0E0A\u0E48\u0E27\u0E22\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E44\u0E27\u0E49 " + memory.saved + " \u0E04\u0E19" };
            if (Number.isInteger(memory.savedOn) && memory.savedOn > 0) m.day = memory.savedOn;
            milestones.push(m);
          }
          if (Number.isInteger(memory.killed) && memory.killed > 0) {
            const m = { id: "memory.killed", text: "\u0E1E\u0E23\u0E32\u0E01\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E44\u0E1B " + memory.killed + " \u0E04\u0E19" };
            if (Number.isInteger(memory.killedOn) && memory.killedOn > 0) m.day = memory.killedOn;
            milestones.push(m);
          }
          if (flags["next.raided"]) {
            milestones.push({ id: "action.raided", text: "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E14\u0E37\u0E48\u0E21\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E16\u0E38\u0E07\u0E15\u0E48\u0E2D\u0E2B\u0E19\u0E49\u0E32\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E19\u0E27\u0E25" });
          }
          if (flags["next.returned"]) {
            milestones.push({ id: "action.returned", text: "\u0E40\u0E02\u0E35\u0E22\u0E19\u0E0A\u0E37\u0E48\u0E2D\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E08\u0E33\u0E44\u0E14\u0E49\u0E2A\u0E48\u0E07\u0E43\u0E2B\u0E49\u0E2D\u0E34\u0E07\u0E43\u0E15\u0E49\u0E1B\u0E23\u0E30\u0E15\u0E39" });
          }
          if (behavior.endured && Number.isInteger(behavior.endured.count) && behavior.endured.count > 0 && milestones.length < 4) {
            const m = { id: "action.endured", text: "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2D\u0E14\u0E17\u0E19\u0E15\u0E48\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E34\u0E27\u0E42\u0E2B\u0E22 " + behavior.endured.count + " \u0E04\u0E23\u0E31\u0E49\u0E07" };
            if (Number.isInteger(behavior.endured.lastDay) && behavior.endured.lastDay > 0) m.day = behavior.endured.lastDay;
            milestones.push(m);
          }
          if (ending && ending.id) {
            const causeObj = ending.causeOfDeath;
            const endingBaseText = ENDING_TEXTS[ending.id] || "\u0E1A\u0E17\u0E08\u0E1A: " + (ending.title || ENDING_NAMES[ending.id] || ending.id);
            const endingText = causeObj && causeObj.title ? endingBaseText + " (\u0E2A\u0E32\u0E40\u0E2B\u0E15\u0E38: " + causeObj.title + ")" : endingBaseText;
            const endM = { id: "ending." + ending.id, text: endingText };
            const endDay = Number.isInteger(ending.day) && ending.day > 0 ? ending.day : Number.isInteger(input?.day) && input.day > 0 ? input.day : void 0;
            if (endDay !== void 0) endM.day = endDay;
            if (milestones.length >= 5) {
              milestones.length = 4;
            }
            milestones.push(endM);
          }
          return milestones.slice(0, 5);
        }
        function summarize(input) {
          if (!input || typeof input !== "object") {
            return { title: "\u0E1C\u0E39\u0E49\u0E1C\u0E48\u0E32\u0E19\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E2B\u0E19\u0E36\u0E48\u0E07", milestones: [], causeOfDeath: null };
          }
          const title = deriveTitle(input).slice(0, 160);
          const rawMilestones = deriveMilestones(input);
          const milestones = rawMilestones.slice(0, 5).map((m) => {
            const out = {
              id: String(m.id).slice(0, 64),
              text: String(m.text).slice(0, 600)
            };
            if (Number.isInteger(m.day) && m.day > 0) {
              out.day = m.day;
            }
            return out;
          });
          return { title, milestones, causeOfDeath: input?.ending?.causeOfDeath || null };
        }
        return { summarize };
      });
    }
  });

  // ../../tmp/after-zero-zombie/systems/chronicle.js
  var require_chronicle = __commonJS({
    "../../tmp/after-zero-zombie/systems/chronicle.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory();
        else {
          root.ZombieSystems = root.ZombieSystems || {};
          root.ZombieSystems.Chronicle = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        function summarize(s) {
          if (!s || !s.ending || typeof s.runId !== "string") throw new Error("An ended life with runId is required");
          const memory = s.memory || {}, flags = (s.story || {}).flags || {}, milestones = [];
          function add(id, day, text) {
            if (milestones.some((x) => x.id === id)) return;
            const m = { id, text };
            if (Number.isInteger(day) && day > 0) m.day = day;
            milestones.push(m);
          }
          if (flags["remnant.dog_followed"] === true) add("remnant.dog_followed", null, "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E15\u0E32\u0E21\u0E2A\u0E38\u0E19\u0E31\u0E02");
          if (memory.saved > 0) add("memory.saved", memory.savedOn, "\u0E0A\u0E48\u0E27\u0E22\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E44\u0E27\u0E49 " + memory.saved + " \u0E04\u0E19");
          if (memory.killed > 0) add("memory.killed", memory.killedOn, "\u0E06\u0E48\u0E32\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C " + memory.killed + " \u0E04\u0E19");
          for (const m of s.chronicle?.milestones || []) {
            if (milestones.length >= 4) break;
            if (m && typeof m.id === "string" && typeof m.text === "string" && !m.id.startsWith("ending.")) add(m.id, m.day, m.text);
          }
          const causeText = s.ending.causeOfDeath?.title ? " (" + s.ending.causeOfDeath.title + ")" : "";
          add("ending." + s.ending.id, s.ending.day, "\u0E1A\u0E17\u0E08\u0E1A: " + s.ending.id + causeText);
          const title = flags["remnant.dog_followed"] === true ? "\u0E1C\u0E39\u0E49\u0E40\u0E14\u0E34\u0E19\u0E15\u0E32\u0E21\u0E2A\u0E38\u0E19\u0E31\u0E02" : memory.saved > 0 ? "\u0E1C\u0E39\u0E49\u0E40\u0E04\u0E22\u0E0A\u0E48\u0E27\u0E22\u0E0A\u0E35\u0E27\u0E34\u0E15" : memory.killed > 0 ? "\u0E1C\u0E39\u0E49\u0E40\u0E04\u0E22\u0E06\u0E48\u0E32\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C" : "\u0E1C\u0E39\u0E49\u0E1C\u0E48\u0E32\u0E19\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E2B\u0E19\u0E36\u0E48\u0E07";
          return { runId: s.runId, originId: s.originId || "legacy", strainId: s.strainId || "common", days: s.ending.day, completedDays: s.completedDays, endingId: s.ending.id, causeOfDeath: s.ending.causeOfDeath || null, title, traits: [...s.evolution?.acquired || []], milestones: milestones.slice(0, 5) };
        }
        return { summarize };
      });
    }
  });

  // ../../tmp/after-zero-zombie/next/clinic-integration.js
  var require_clinic_integration = __commonJS({
    "../../tmp/after-zero-zombie/next/clinic-integration.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_runtime(), require_contract(), require_director2(), require_presentation(), require_clinic_candidate(), require_consequence_summary(), require_chronicle());
        else {
          root.AfterZeroNextSupport = root.AfterZeroNextSupport || {};
          root.AfterZeroNextSupport.ClinicIntegration = factory(root.ZombieRuntime, root.ZombieCore.Contract, root.AfterZeroNextSystems.Director, root.AfterZeroNextSupport.Presentation, root.AfterZeroNextData.ClinicCandidate, root.AfterZeroNextUI.ConsequenceSummary, root.ZombieSystems.Chronicle);
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(R, K, Director, Presentation, Clinic, Summary, Chronicle) {
        "use strict";
        function build(previous) {
          const merge = (old, extra, actions) => {
            const m = new Map(old.map((x) => [x.id, x]));
            for (const x of extra) {
              const before = m.get(x.id);
              m.set(x.id, actions && before ? { ...before, ...x, requirements: { all: [...before.requirements ? [before.requirements] : [], ...x.requirements ? [x.requirements] : []] } } : x);
            }
            return [...m.values()];
          };
          const version = "after-zero-next-03-clinic-r1";
          const catalog = K.snapshot({ ...previous.catalog, CONTENT_VERSION: version, FLAGS: { ...previous.catalog.FLAGS, ...Clinic.FLAGS }, EVENTS: merge(previous.catalog.EVENTS, Clinic.EVENTS, false), ACTIONS: merge(previous.catalog.ACTIONS, Clinic.ACTIONS, true), WORLD_CONTENT_EXTENSIONS: [...previous.catalog.WORLD_CONTENT_EXTENSIONS, { version: 6, contentVersion: version, npcs: {} }] });
          const raw = R.build({ Director }, catalog);
          function validate(value) {
            const current = value?.contentVersion === version;
            if (current) {
              if (value.world?.contentRevision !== 6 || value.story?.flags?.["next.initialized"] !== true) throw Error("Invalid clinic save");
              const marker = value.story.flags["next.startProfile"];
              if (marker !== "legacy" && !previous.situation(value).profile) throw Error("Unknown start profile");
              if (!["rain", "patrol"].includes(value.story.flags["next.weather"]) || !["voice", "writing"].includes(value.story.flags["next.clue"])) throw Error("Invalid starting context");
            }
            return raw.validate(current ? value : previous.engine.validate(value));
          }
          const bundle = { ...previous, catalog, engine: { ...raw, create: (seed, options) => validate(previous.engine.create(seed, options)), validate } };
          bundle.viewModel = (s, extras) => Presentation.build(bundle, s, extras);
          bundle.summarize = (s) => ({ ...Chronicle.summarize(s), ...Summary.summarize(Presentation.summaryInput(s)) });
          return bundle;
        }
        return { build };
      });
    }
  });

  // ../../tmp/after-zero-zombie/next/data/horde-candidate.js
  var require_horde_candidate = __commonJS({
    "../../tmp/after-zero-zombie/next/data/horde-candidate.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory();
        else {
          root.AfterZeroNextData = root.AfterZeroNextData || {};
          root.AfterZeroNextData.HordeCandidate = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        const FLAGS = {
          "c41.nest_visited": { type: "boolean", default: false },
          "c41.nest_route_open": { type: "boolean", default: false },
          "c41.horde_restrained": { type: "boolean", default: false },
          "c41.horde_intimidated": { type: "boolean", default: false },
          "c41.patrol_met": { type: "boolean", default: false },
          "c41.streets_breached": { type: "boolean", default: false },
          "c41.patrol_scattered": { type: "boolean", default: false },
          "c41.horde_held": { type: "boolean", default: false },
          "c41.convoy_resolved": { type: "boolean", default: false },
          "c41.human_spared": { type: "boolean", default: false },
          "c41.radio_intercepted": { type: "boolean", default: false },
          "c41.radio_jammed": { type: "boolean", default: false },
          "c41.outpost_saved": { type: "boolean", default: false },
          "c41.tunnel_resolved": { type: "boolean", default: false }
        };
        const NPCS = {};
        const INITIAL_NPCS = {};
        const ACTIONS = [
          {
            id: "c41.approach_nest",
            name: "\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E31\u0E07\u0E40\u0E01\u0E15\u0E01\u0E32\u0E23\u0E13\u0E4C\u0E23\u0E31\u0E07\u0E1D\u0E39\u0E07\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49",
            glyph: "\u265C",
            places: ["nest"],
            encounter: "c41.nest_gathering",
            requirements: {
              all: [
                { kind: "flag", id: "c41.nest_visited", value: false }
              ]
            },
            note: "\u0E2A\u0E31\u0E07\u0E40\u0E01\u0E15\u0E01\u0E32\u0E23\u0E13\u0E4C\u0E1E\u0E24\u0E15\u0E34\u0E01\u0E23\u0E23\u0E21\u0E1D\u0E39\u0E07\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E43\u0E19\u0E23\u0E31\u0E07\u0E23\u0E49\u0E32\u0E07 \xB7 1 \u0E27\u0E31\u0E19 \xB7 \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E27\u0E48\u0E32\u0E08\u0E30\u0E19\u0E33\u0E17\u0E32\u0E07 \u0E22\u0E31\u0E1A\u0E22\u0E31\u0E49\u0E07 \u0E2B\u0E23\u0E37\u0E2D\u0E16\u0E2D\u0E22"
          },
          {
            id: "c41.streets_scout",
            name: "\u0E25\u0E32\u0E14\u0E15\u0E23\u0E30\u0E40\u0E27\u0E19\u0E41\u0E19\u0E27\u0E15\u0E36\u0E01\u0E23\u0E2D\u0E1A\u0E16\u0E19\u0E19",
            glyph: "\u2315",
            places: ["streets"],
            encounter: "c41.streets_patrol_encounter",
            requirements: {
              all: [
                { kind: "flag", id: "c41.patrol_met", value: false }
              ]
            },
            note: "\u0E25\u0E32\u0E14\u0E15\u0E23\u0E30\u0E40\u0E27\u0E19\u0E41\u0E19\u0E27\u0E15\u0E36\u0E01\u0E41\u0E25\u0E30\u0E2A\u0E31\u0E07\u0E40\u0E01\u0E15\u0E01\u0E32\u0E23\u0E13\u0E4C\u0E25\u0E32\u0E14\u0E15\u0E23\u0E30\u0E40\u0E27\u0E19\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C \xB7 1 \u0E27\u0E31\u0E19 \xB7 \u0E43\u0E0A\u0E49\u0E1D\u0E39\u0E07\u0E40\u0E1B\u0E34\u0E14\u0E17\u0E32\u0E07 \u0E02\u0E48\u0E21\u0E02\u0E27\u0E31\u0E0D \u0E2B\u0E23\u0E37\u0E2D\u0E04\u0E38\u0E21\u0E1D\u0E39\u0E07"
          },
          {
            id: "c41.scavenge_convoy",
            name: "\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E33\u0E23\u0E27\u0E08\u0E0B\u0E32\u0E01\u0E02\u0E1A\u0E27\u0E19\u0E23\u0E16\u0E40\u0E2A\u0E1A\u0E35\u0E22\u0E07",
            glyph: "\u25C7",
            places: ["streets"],
            encounter: "c41.streets_convoy_standoff",
            requirements: {
              all: [
                { kind: "flag", id: "c41.streets_breached", value: true },
                { kind: "flag", id: "c41.convoy_resolved", value: false }
              ]
            },
            note: "\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E33\u0E23\u0E27\u0E08\u0E0B\u0E32\u0E01\u0E02\u0E1A\u0E27\u0E19\u0E23\u0E16\u0E40\u0E2A\u0E1A\u0E35\u0E22\u0E07\u0E2B\u0E25\u0E31\u0E07\u0E1D\u0E39\u0E07\u0E40\u0E1B\u0E34\u0E14\u0E17\u0E32\u0E07 \xB7 1 \u0E27\u0E31\u0E19 \xB7 \u0E40\u0E2A\u0E35\u0E48\u0E22\u0E07\u0E20\u0E31\u0E22\u0E1B\u0E30\u0E17\u0E30"
          },
          {
            id: "c41.monitor_radio",
            name: "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E04\u0E25\u0E37\u0E48\u0E19\u0E27\u0E34\u0E17\u0E22\u0E38\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E20\u0E31\u0E22",
            glyph: "\u{1F4E1}",
            places: ["radio"],
            encounter: "c41.radio_broadcast_intercept",
            requirements: {
              all: [
                { kind: "flag", id: "c41.radio_intercepted", value: false }
              ]
            },
            note: "\u0E14\u0E31\u0E01\u0E1F\u0E31\u0E07\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E27\u0E34\u0E17\u0E22\u0E38\u0E41\u0E25\u0E30\u0E01\u0E25\u0E38\u0E48\u0E21\u0E1C\u0E39\u0E49\u0E23\u0E2D\u0E14\u0E0A\u0E35\u0E27\u0E34\u0E15 \xB7 1 \u0E27\u0E31\u0E19 \xB7 \u0E15\u0E31\u0E14\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13 \u0E25\u0E48\u0E2D\u0E1D\u0E39\u0E07 \u0E2B\u0E23\u0E37\u0E2D\u0E02\u0E48\u0E21\u0E02\u0E27\u0E31\u0E0D"
          },
          {
            id: "c41.tunnel_passage",
            name: "\u0E40\u0E14\u0E34\u0E19\u0E25\u0E31\u0E14\u0E2D\u0E38\u0E42\u0E21\u0E07\u0E04\u0E4C\u0E43\u0E15\u0E49\u0E14\u0E34\u0E19",
            glyph: "\u2192",
            places: ["streets"],
            encounter: "c41.tunnel_ambush_resolve",
            requirements: {
              all: [
                { kind: "flag", id: "c41.nest_route_open", value: true },
                { kind: "flag", id: "c41.tunnel_resolved", value: false }
              ]
            },
            note: "\u0E43\u0E0A\u0E49\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E25\u0E31\u0E14\u0E2D\u0E38\u0E42\u0E21\u0E07\u0E04\u0E4C\u0E43\u0E15\u0E49\u0E14\u0E34\u0E19\u0E17\u0E35\u0E48\u0E40\u0E1B\u0E34\u0E14\u0E44\u0E27\u0E49 \xB7 1 \u0E27\u0E31\u0E19 \xB7 \u0E42\u0E2D\u0E1A\u0E25\u0E49\u0E2D\u0E21 \u0E2B\u0E25\u0E1A\u0E01\u0E31\u0E1A\u0E14\u0E31\u0E01 \u0E2B\u0E23\u0E37\u0E2D\u0E16\u0E2D\u0E22"
          }
        ];
        const EVENTS = [
          // 1. Nest Gathering (Adapted from pack.nest_gathering)
          {
            id: "c41.nest_gathering",
            location: "nest",
            title: "\u0E01\u0E32\u0E23\u0E23\u0E27\u0E21\u0E15\u0E31\u0E27\u0E02\u0E2D\u0E07\u0E1D\u0E39\u0E07\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E43\u0E19\u0E23\u0E31\u0E07\u0E23\u0E49\u0E32\u0E07",
            text: "\u0E43\u0E19\u0E2B\u0E25\u0E37\u0E1A\u0E21\u0E37\u0E14\u0E43\u0E15\u0E49\u0E0B\u0E32\u0E01\u0E2D\u0E32\u0E04\u0E32\u0E23 \u0E40\u0E2A\u0E35\u0E22\u0E07\u0E02\u0E39\u0E48\u0E04\u0E33\u0E23\u0E32\u0E21\u0E15\u0E48\u0E33\u0E02\u0E2D\u0E07\u0E0B\u0E32\u0E01\u0E28\u0E1E\u0E21\u0E35\u0E2A\u0E15\u0E34\u0E19\u0E31\u0E1A\u0E2A\u0E34\u0E1A\u0E25\u0E2D\u0E22\u0E01\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E30 \u0E1D\u0E39\u0E07\u0E01\u0E33\u0E25\u0E31\u0E07\u0E01\u0E23\u0E30\u0E27\u0E19\u0E01\u0E23\u0E30\u0E27\u0E32\u0E22\u0E14\u0E49\u0E27\u0E22\u0E01\u0E25\u0E34\u0E48\u0E19\u0E04\u0E27\u0E31\u0E19\u0E41\u0E25\u0E30\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E1B\u0E37\u0E19\u0E08\u0E32\u0E01\u0E20\u0E32\u0E22\u0E19\u0E2D\u0E01 \u0E1E\u0E27\u0E01\u0E21\u0E31\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E17\u0E34\u0E28\u0E17\u0E32\u0E07\u0E27\u0E48\u0E32\u0E08\u0E30\u0E1A\u0E38\u0E01\u0E40\u0E1B\u0E34\u0E14\u0E17\u0E32\u0E07\u0E1C\u0E48\u0E32\u0E19\u0E2D\u0E38\u0E42\u0E21\u0E07\u0E04\u0E4C\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E1B\u0E34\u0E14\u0E15\u0E32\u0E22 \u0E1A\u0E38\u0E01\u0E2D\u0E2D\u0E01\u0E44\u0E1B\u0E2D\u0E32\u0E25\u0E30\u0E27\u0E32\u0E14\u0E1A\u0E19\u0E16\u0E19\u0E19 \u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E2D\u0E1F\u0E31\u0E07\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E08\u0E32\u0E01\u0E40\u0E08\u0E49\u0E32",
            requirements: { all: [] },
            choices: [
              {
                id: "c41.nest_rally_path",
                text: "นำฝูงโถมพังสิ่งกีดขวางเปิดทางเข้าอุโมงค์ลัด",
                note: "[ใช้ฝูงเปิดทาง] เปิดเส้นทางอุโมงค์ใต้ดิน · ภัยคุกคามในรัง +10 · อำนาจฝูง +5",
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.nest_route_open", value: true },
                  { type: "flag.set", id: "c41.nest_visited", value: true },
                  { type: "stat.add", key: "horde", value: 5 },
                  { type: "location.threat.add", id: "nest", value: 10 }
                ],
                behaviorTags: ["hordeLed"]
              },
              {
                id: "c41.nest_restrain_horde",
                text: "เปล่งเสียงสะกดรั้งฝูงไม่ให้ออกไปคลั่งบนถนน",
                note: "[หยุดฝูง] ภัยคุกคามบนถนน -10 · สติ -5 · ความไว้ใจ +5",
                requirements: { all: [{ kind: "stat", key: "sanity", min: 10 }] },
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.horde_restrained", value: true },
                  { type: "flag.set", id: "c41.nest_visited", value: true },
                  { type: "stat.add", key: "sanity", value: -5 },
                  { type: "stat.add", key: "trust", value: 5 },
                  { type: "location.threat.add", id: "streets", value: -10 }
                ],
                behaviorTags: ["endured"]
              },
              {
                id: "c41.nest_intimidate_rival",
                text: "คำรามก้องสะท้อนข่มขวัญซากศพที่เริ่มกระด้างกระเดื่อง",
                note: "[คุกคาม] อำนาจฝูง +10 · กลายพันธุ์ +8 · สติ -3",
                requirements: { all: [{ kind: "stat", key: "sanity", min: 5 }] },
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.horde_intimidated", value: true },
                  { type: "flag.set", id: "c41.nest_visited", value: true },
                  { type: "stat.add", key: "horde", value: 10 },
                  { type: "stat.add", key: "sanity", value: -3 }
                ],
                behaviorTags: ["hordeLed"]
              },
              {
                id: "c41.nest_safe_retreat",
                text: "ถอยออกจากมุมอับเงียบ ๆ ปล่อยให้ฝูงคุมเชิงกันเอง",
                note: "[ถอย] ทางเลือกปลอดภัย · ไม่เสี่ยงสูญเสียทรัพยากรหรือสถานะ",
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.nest_visited", value: true }
                ],
                behaviorTags: ["endured"]
              }
            ]
          },
          // 2. Streets Patrol Encounter (Adapted from pack.human_alert / pack.guard_drill)
          {
            id: "c41.streets_patrol_encounter",
            location: "streets",
            title: "\u0E01\u0E32\u0E23\u0E40\u0E1C\u0E0A\u0E34\u0E0D\u0E2B\u0E19\u0E49\u0E32\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E25\u0E32\u0E14\u0E15\u0E23\u0E30\u0E40\u0E27\u0E19\u0E15\u0E34\u0E14\u0E2D\u0E32\u0E27\u0E38\u0E18",
            text: "\u0E41\u0E2A\u0E07\u0E44\u0E1F\u0E09\u0E32\u0E22\u0E01\u0E23\u0E32\u0E14\u0E2A\u0E48\u0E2D\u0E07\u0E1C\u0E48\u0E32\u0E19\u0E41\u0E19\u0E27\u0E15\u0E36\u0E01\u0E23\u0E49\u0E32\u0E07 \u0E17\u0E2B\u0E32\u0E23\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E2A\u0E2D\u0E07\u0E19\u0E32\u0E22\u0E16\u0E37\u0E2D\u0E1B\u0E37\u0E19\u0E04\u0E38\u0E21\u0E40\u0E0A\u0E34\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E31\u0E27\u0E21\u0E38\u0E21\u0E16\u0E19\u0E19 \u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E23\u0E2D\u0E1A\u0E15\u0E31\u0E27\u0E40\u0E08\u0E49\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21\u0E41\u0E22\u0E01\u0E40\u0E02\u0E35\u0E49\u0E22\u0E27\u0E02\u0E39\u0E48\u0E1F\u0E48\u0E2D\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E08\u0E30\u0E01\u0E23\u0E30\u0E42\u0E08\u0E19\u0E40\u0E02\u0E49\u0E32\u0E43\u0E2A\u0E48 \u0E40\u0E08\u0E49\u0E32\u0E15\u0E49\u0E2D\u0E07\u0E15\u0E31\u0E14\u0E2A\u0E34\u0E19\u0E43\u0E08\u0E27\u0E48\u0E32\u0E08\u0E30\u0E2A\u0E31\u0E48\u0E07\u0E1D\u0E39\u0E07\u0E40\u0E02\u0E49\u0E32\u0E0A\u0E19\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1B\u0E34\u0E14\u0E17\u0E32\u0E07 \u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E02\u0E48\u0E21\u0E02\u0E27\u0E31\u0E0D\u0E43\u0E2B\u0E49\u0E1E\u0E27\u0E01\u0E21\u0E31\u0E19\u0E25\u0E48\u0E32\u0E16\u0E2D\u0E22 \u0E23\u0E31\u0E49\u0E07\u0E1D\u0E39\u0E07\u0E44\u0E27\u0E49\u0E44\u0E21\u0E48\u0E43\u0E2B\u0E49\u0E40\u0E01\u0E34\u0E14\u0E01\u0E32\u0E23\u0E19\u0E2D\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E14 \u0E2B\u0E23\u0E37\u0E2D\u0E16\u0E2D\u0E22\u0E2B\u0E25\u0E1A\u0E40\u0E02\u0E49\u0E32\u0E40\u0E07\u0E32\u0E21\u0E37\u0E14",
            requirements: { all: [] },
            choices: [
              {
                id: "c41.patrol_horde_breach",
                text: "ส่งสัญญาณให้ฝูงโถมเข้าชนแนวกั้นเปิดทางเข้าพื้นที่ขบวนรถ",
                note: "[ใช้ฝูงเปิดทาง] ฝูงดันแนวกั้นพังทลาย · เปิดทางสำรวจซากรถเสบียง · เพิ่มภัยถนน 15",
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.streets_breached", value: true },
                  { type: "flag.set", id: "c41.patrol_met", value: true },
                  { type: "location.threat.add", id: "streets", value: 15 }
                ],
                behaviorTags: ["hordeLed"]
              },
              {
                id: "c41.patrol_intimidate_human",
                text: "ขู่คำรามจากความมืดและเขย่าซากรถให้ทหารมนุษย์หวาดกลัว",
                note: "[คุกคาม] กดดันให้หน่วยลาดตระเวนล่าถอยโดยไม่ปะทะ · ความไว้ใจ +3 · สติ -4",
                requirements: { all: [{ kind: "stat", key: "sanity", min: 8 }] },
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.patrol_scattered", value: true },
                  { type: "flag.set", id: "c41.patrol_met", value: true },
                  { type: "stat.add", key: "trust", value: 3 },
                  { type: "stat.add", key: "sanity", value: -4 }
                ],
                behaviorTags: ["endured"]
              },
              {
                id: "c41.patrol_hold_horde",
                text: "กระชากแขนซอมบี้ข้างตัวรั้งฝูงไว้ในเงามืดจนทหารเดินผ่านไป",
                note: "[หยุดฝูง] อดกลั้นหลีกเลี่ยงการปะทะด้วยอาวุธ · สติ +2 · อำนาจฝูง -3",
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.horde_held", value: true },
                  { type: "flag.set", id: "c41.patrol_met", value: true },
                  { type: "stat.add", key: "sanity", value: 2 },
                  { type: "stat.add", key: "horde", value: -3 }
                ],
                behaviorTags: ["endured"]
              },
              {
                id: "c41.patrol_safe_retreat",
                text: "ถอยหลังกลืนหายไปกับซอยแคบอย่างระมัดระวัง",
                note: "[ถอย] ทางเลือกปลอดภัย · ไม่เสี่ยงเปิดเผยตำแหน่ง",
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.patrol_met", value: true }
                ],
                behaviorTags: ["endured"]
              }
            ]
          },
          // 3. Streets Convoy Standoff (Adapted from pack.human_alert_convoy_guard / pack.decision)
          {
            id: "c41.streets_convoy_standoff",
            location: "streets",
            title: "\u0E0B\u0E32\u0E01\u0E23\u0E16\u0E40\u0E2A\u0E1A\u0E35\u0E22\u0E07\u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E40\u0E1C\u0E0A\u0E34\u0E0D\u0E2B\u0E19\u0E49\u0E32\u0E04\u0E19\u0E02\u0E31\u0E1A\u0E17\u0E35\u0E48\u0E1A\u0E32\u0E14\u0E40\u0E08\u0E47\u0E1A",
            text: "หลังแนวกั้นที่พังทลาย ซากรถบรรทุกเสบียงคว่ำอยู่กลางถนน คนขับมนุษย์ติดอยู่ในห้องโดยสารพร้อมกลิ่นเลือดสดๆ ฝูงซอมบี้ที่ตามหลังมาเริ่มแยกเขี้ยวส่งเสียงขู่ฟ่ออย่างกระหายเลือด เจ้าสามารถใช้ฝูงบังสายตาเพื่อชิงกล่องเสบียง ยับยั้งฝูงไม่ให้ฆ่าคนขับ สั่งข่มขวัญกำลังเสริมที่กำลังมา หรือถอยออกมา",
            requirements: {
              all: [
                { kind: "flag", id: "c41.streets_breached", value: true }
              ]
            },
            choices: [
              {
                id: "c41.standoff_horde_screen",
                text: "สั่งฝูงล้อมหน้าต่างห้องโดยสารเป็นม่านกำบังแล้วดึงกล่องเสบียงออกมา",
                note: "[ใช้ฝูงเปิดทาง] ใช้ความชุลมุนเก็บเสบียงมนุษย์ · เสบียงมนุษย์ +1 · สติ -3",
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.convoy_resolved", value: true },
                  { type: "item.add", key: "supplies", value: 1 },
                  { type: "stat.add", key: "sanity", value: -3 }
                ],
                behaviorTags: ["hordeLed"]
              },
              {
                id: "c41.standoff_restrain_bloodlust",
                text: "ยืนขวางหน้ารถและผลักฝูงออกไปเพื่อไม่ให้ทำร้ายคนขับ",
                note: "[หยุดฝูง] ห้ามฝูงรุมฆ่าคนบาดเจ็บ · ความไว้ใจ +10 · อำนาจฝูง -10 · เมื่อความหิว ≥75: สภาพร่าง -3 · สติ -6 เพิ่มเติม",
                requirements: { all: [{ kind: "stat", key: "hp", min: 10 }] },
                pressure: true,
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.convoy_resolved", value: true },
                  { type: "flag.set", id: "c41.human_spared", value: true },
                  { type: "stat.add", key: "trust", value: 10 },
                  { type: "stat.add", key: "horde", value: -10 }
                ],
                behaviorTags: ["helped", "endured"]
              },
              {
                id: "c41.standoff_intimidate_reinforcements",
                text: "คำรามขู่และทุบตัวถังรถบรรทุกจนสนั่นเพื่อสกัดกำลังเสริม",
                note: "[คุกคาม] ทำให้หน่วยช่วยเหลือชะงักและถอยหลัง · อำนาจฝูง +5 · สติ -4",
                requirements: { all: [{ kind: "stat", key: "sanity", min: 8 }] },
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.convoy_resolved", value: true },
                  { type: "stat.add", key: "horde", value: 5 },
                  { type: "stat.add", key: "sanity", value: -4 }
                ],
                behaviorTags: ["hordeLed"]
              },
              {
                id: "c41.standoff_safe_retreat",
                text: "ผละออกจากพื้นที่ขบวนรถก่อนความวุ่นวายจะบานปลาย",
                note: "[ถอย] ทางเลือกปลอดภัย · ไม่เสี่ยงรับบาดเจ็บ",
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.convoy_resolved", value: true }
                ],
                behaviorTags: ["endured"]
              }
            ]
          },
          // 4. Radio Broadcast Intercept (Adapted from pack.radio_broadcast)
          {
            id: "c41.radio_broadcast_intercept",
            location: "radio",
            title: "\u0E2A\u0E16\u0E32\u0E19\u0E35\u0E2A\u0E48\u0E07\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E20\u0E31\u0E22\u0E02\u0E2D\u0E07\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C",
            text: "\u0E1A\u0E19\u0E14\u0E32\u0E14\u0E1F\u0E49\u0E32\u0E2D\u0E32\u0E04\u0E32\u0E23\u0E2B\u0E2D\u0E27\u0E34\u0E17\u0E22\u0E38 \u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E2A\u0E48\u0E07\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E01\u0E33\u0E25\u0E31\u0E07\u0E01\u0E23\u0E30\u0E08\u0E32\u0E22\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E1E\u0E34\u0E01\u0E31\u0E14\u0E02\u0E2D\u0E07\u0E1D\u0E39\u0E07\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E41\u0E25\u0E30\u0E40\u0E23\u0E35\u0E22\u0E01\u0E23\u0E27\u0E21\u0E1E\u0E25\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E01\u0E27\u0E32\u0E14\u0E25\u0E49\u0E32\u0E07 \u0E40\u0E2A\u0E35\u0E22\u0E07\u0E25\u0E33\u0E42\u0E1E\u0E07\u0E14\u0E36\u0E07\u0E14\u0E39\u0E14\u0E0B\u0E32\u0E01\u0E28\u0E1E\u0E08\u0E32\u0E01\u0E17\u0E38\u0E01\u0E17\u0E34\u0E28\u0E43\u0E2B\u0E49\u0E41\u0E2B\u0E48\u0E02\u0E36\u0E49\u0E19\u0E21\u0E32\u0E2D\u0E2D\u0E41\u0E19\u0E48\u0E19\u0E1A\u0E31\u0E19\u0E44\u0E14 \u0E40\u0E08\u0E49\u0E32\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E0A\u0E35\u0E49\u0E19\u0E33\u0E1D\u0E39\u0E07\u0E1E\u0E31\u0E07\u0E40\u0E2A\u0E32\u0E2A\u0E48\u0E07\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13 \u0E22\u0E31\u0E1A\u0E22\u0E31\u0E49\u0E07\u0E1D\u0E39\u0E07\u0E44\u0E21\u0E48\u0E43\u0E2B\u0E49\u0E21\u0E38\u0E48\u0E07\u0E2B\u0E19\u0E49\u0E32\u0E44\u0E1B\u0E42\u0E08\u0E21\u0E15\u0E35\u0E04\u0E48\u0E32\u0E22\u0E1E\u0E31\u0E01\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C \u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E02\u0E39\u0E48\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E02\u0E22\u0E32\u0E22\u0E40\u0E2A\u0E35\u0E22\u0E07 \u0E2B\u0E23\u0E37\u0E2D\u0E16\u0E2D\u0E22\u0E2D\u0E2D\u0E01\u0E44\u0E1B",
            requirements: { all: [] },
            choices: [
              {
                id: "c41.radio_jam_with_horde",
                text: "นำน้ำหนักตัวของฝูงโถมดึงสายอากาศและตัดสายไฟหลัก",
                note: "[ใช้ฝูงเปิดทาง] ตัดการประสานงานของมนุษย์ · ภัยคุกคามบนถนน -20 · อำนาจฝูง +3",
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.radio_jammed", value: true },
                  { type: "flag.set", id: "c41.radio_intercepted", value: true },
                  { type: "stat.add", key: "horde", value: 3 },
                  { type: "location.threat.add", id: "streets", value: -20 }
                ],
                behaviorTags: ["hordeLed"]
              },
              {
                id: "c41.radio_lure_away",
                text: "หมุนปรับคลื่นเสียงสะท้อนล่อฝูงให้เบนเข็มออกจากค่ายพักมนุษย์",
                note: "[หยุดฝูง] ปกป้องชุมชนมนุษย์ · ความไว้ใจ +8 · สติ +3 · อำนาจฝูง -8 · เมื่อความหิว ≥75: สภาพร่าง -3 · สติ -6 เพิ่มเติม",
                requirements: { all: [{ kind: "stat", key: "hp", min: 10 }, { kind: "stat", key: "sanity", min: 10 }] },
                pressure: true,
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.outpost_saved", value: true },
                  { type: "flag.set", id: "c41.radio_intercepted", value: true },
                  { type: "stat.add", key: "trust", value: 8 },
                  { type: "stat.add", key: "sanity", value: 3 },
                  { type: "stat.add", key: "horde", value: -8 }
                ],
                behaviorTags: ["helped", "endured"]
              },
              {
                id: "c41.radio_broadcast_threat",
                text: "คว้าไมโครโฟนเปล่งเสียงคำรามกระหายเลือดประกาศเตือนมนุษย์",
                note: "[คุกคาม] ขู่ให้ฝ่ายมนุษย์ล่าถอย · อำนาจฝูง +8 · สติ -5 · ภัยคุกคามที่หอวิทยุ +10",
                requirements: { all: [{ kind: "stat", key: "sanity", min: 6 }] },
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.radio_intercepted", value: true },
                  { type: "stat.add", key: "horde", value: 8 },
                  { type: "stat.add", key: "sanity", value: -5 },
                  { type: "location.threat.add", id: "radio", value: 10 }
                ],
                behaviorTags: ["hordeLed"]
              },
              {
                id: "c41.radio_safe_retreat",
                text: "ดับหน้าจอควบคุมแล้วไต่บันไดหนีไฟลงมาเงียบ ๆ",
                note: "[ถอย] ทางเลือกปลอดภัย · ไม่ดึงดูดความสนใจจากทั้งสองฝ่าย",
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.radio_intercepted", value: true }
                ],
                behaviorTags: ["endured"]
              }
            ]
          },
          // 5. Tunnel Ambush & Shortcut Resolve (Adapted from pack.silent_tunnel / pack.outcome_flank)
          {
            id: "c41.tunnel_ambush_resolve",
            location: "streets",
            title: "\u0E01\u0E32\u0E23\u0E0B\u0E38\u0E48\u0E21\u0E1C\u0E48\u0E32\u0E19\u0E17\u0E32\u0E07\u0E25\u0E31\u0E14\u0E2D\u0E38\u0E42\u0E21\u0E07\u0E04\u0E4C\u0E23\u0E30\u0E1A\u0E32\u0E22\u0E19\u0E49\u0E33",
            text: "\u0E2D\u0E38\u0E42\u0E21\u0E07\u0E04\u0E4C\u0E25\u0E31\u0E14\u0E43\u0E15\u0E49\u0E14\u0E34\u0E19\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E43\u0E08\u0E01\u0E25\u0E32\u0E07\u0E40\u0E21\u0E37\u0E2D\u0E07\u0E1E\u0E32\u0E40\u0E08\u0E49\u0E32\u0E41\u0E25\u0E30\u0E1D\u0E39\u0E07\u0E25\u0E31\u0E14\u0E40\u0E25\u0E35\u0E48\u0E22\u0E07\u0E14\u0E48\u0E32\u0E19\u0E15\u0E23\u0E27\u0E08\u0E2B\u0E25\u0E31\u0E01 \u0E40\u0E1A\u0E37\u0E49\u0E2D\u0E07\u0E2B\u0E19\u0E49\u0E32\u0E21\u0E35\u0E42\u0E14\u0E23\u0E19\u0E25\u0E32\u0E14\u0E15\u0E23\u0E30\u0E40\u0E27\u0E19\u0E1A\u0E34\u0E19\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E2B\u0E36\u0E48\u0E07\u0E46 \u0E41\u0E25\u0E30\u0E01\u0E25\u0E34\u0E48\u0E19\u0E2A\u0E32\u0E23\u0E40\u0E04\u0E21\u0E35\u0E23\u0E30\u0E04\u0E32\u0E22\u0E08\u0E21\u0E39\u0E01\u0E25\u0E2D\u0E22\u0E21\u0E32\u0E15\u0E32\u0E21\u0E17\u0E48\u0E2D\u0E23\u0E30\u0E1A\u0E32\u0E22\u0E19\u0E49\u0E33 \u0E40\u0E08\u0E49\u0E32\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E27\u0E34\u0E18\u0E35\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E01\u0E31\u0E1A\u0E2D\u0E38\u0E1B\u0E2A\u0E23\u0E23\u0E04\u0E43\u0E15\u0E49\u0E14\u0E34\u0E19\u0E19\u0E35\u0E49\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07\u0E15\u0E48\u0E2D\u0E44\u0E1B\u0E22\u0E31\u0E07\u0E08\u0E38\u0E14\u0E2B\u0E21\u0E32\u0E22",
            requirements: {
              all: [
                { kind: "flag", id: "c41.nest_route_open", value: true }
              ]
            },
            choices: [
              {
                id: "c41.tunnel_flank_horde",
                text: "แยกฝูงกระจายตัวโอบล้อมตามท่อแขนงเปิดเส้นทางตัดสู่หอวิทยุ",
                note: "[ใช้ฝูงเปิดทาง] ยึดเส้นทางใต้ดิน · ภัยคุกคามในรัง -10 · อำนาจฝูง +5",
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.tunnel_resolved", value: true },
                  { type: "stat.add", key: "horde", value: 5 },
                  { type: "location.threat.add", id: "nest", value: -10 }
                ],
                behaviorTags: ["hordeLed"]
              },
              {
                id: "c41.tunnel_halt_advance",
                text: "สั่งหยุดฝูงกะทันหันก่อนที่ซากศพแถวหน้าจะเดินเข้ากับดักแก๊สพิษ",
                note: "[หยุดฝูง] รักษาชีวิตของฝูงไม่ให้สูญเปล่า · สติ -4 · ความไว้ใจ +5",
                requirements: { all: [{ kind: "stat", key: "sanity", min: 8 }] },
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.tunnel_resolved", value: true },
                  { type: "stat.add", key: "sanity", value: -4 },
                  { type: "stat.add", key: "trust", value: 5 }
                ],
                behaviorTags: ["endured"]
              },
              {
                id: "c41.tunnel_intimidate_recon",
                text: "ขว้างเศษคอนกรีตและคำรามขู่จนโดรนตรวจจับบินล่าถอย",
                note: "[คุกคาม] ขับไล่อุปกรณ์ตรวจจับของมนุษย์ · อำนาจฝูง +4 · สติ -3",
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.tunnel_resolved", value: true },
                  { type: "stat.add", key: "horde", value: 4 },
                  { type: "stat.add", key: "sanity", value: -3 }
                ],
                behaviorTags: ["hordeLed"]
              },
              {
                id: "c41.tunnel_safe_retreat",
                text: "ปีนบันไดเหล็กกลับขึ้นสู่ผิวดินเพื่อความปลอดภัย",
                note: "[ถอย] ทางเลือกปลอดภัย · ไม่ฝืนเดินหน้าในพื้นที่เสี่ยง",
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "flag.set", id: "c41.tunnel_resolved", value: true }
                ],
                behaviorTags: ["endured"]
              }
            ]
          }
        ];
        return {
          id: "c41.v1",
          EVENTS,
          ACTIONS,
          FLAGS,
          NPCS,
          INITIAL_NPCS
        };
      });
    }
  });

  // ../../tmp/after-zero-zombie/next/data/remnant-candidate.js
  var require_remnant_candidate = __commonJS({
    "../../tmp/after-zero-zombie/next/data/remnant-candidate.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) {
          module.exports = factory();
        } else {
          root.AfterZeroNextData = root.AfterZeroNextData || {};
          root.AfterZeroNextData.RemnantCandidate = factory();
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        const FLAGS = {
          "c42.medical_recalled": { type: "boolean", default: false },
          "c42.past_detached": { type: "boolean", default: false },
          "c42.record_doubted": { type: "boolean", default: false },
          "c42.past_track": { type: "string", default: "" },
          "c42.route_known": { type: "boolean", default: false },
          "c42.crossroad_fortified": { type: "boolean", default: false },
          "c42.trap_wary": { type: "boolean", default: false },
          "c42.shelter_signaled": { type: "boolean", default: false },
          "c42.cat_observed": { type: "boolean", default: false },
          "c42.shelter_dismissed": { type: "boolean", default: false },
          "c42.truce_established": { type: "boolean", default: false },
          "c42.path_diverged": { type: "boolean", default: false },
          "c42.reunion_shadowed": { type: "boolean", default: false },
          "c42.shelter_fortified": { type: "boolean", default: false },
          "c42.horde_diverted": { type: "boolean", default: false },
          "c42.self_preserved": { type: "boolean", default: false },
          "c42.cache_looted": { type: "boolean", default: false },
          // Lifecycle completion flags (prevent ghost buttons after completed)
          "c42.shelter_resolved": { type: "boolean", default: false },
          "c42.crossroad_resolved": { type: "boolean", default: false },
          "c42.hospital_record_resolved": { type: "boolean", default: false },
          "c42.reunion_resolved": { type: "boolean", default: false },
          "c42.protective_stand_resolved": { type: "boolean", default: false }
        };
        const NPCS = {
          "remnant.mali": { states: ["unknown", "met", "allied", "departed"] }
        };
        const INITIAL_NPCS = {};
        const ACTIONS = [
          {
            id: "c42.hospital_record_search",
            name: "\u0E04\u0E49\u0E19\u0E41\u0E1F\u0E49\u0E21\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E04\u0E19\u0E44\u0E02\u0E49\u0E43\u0E19\u0E41\u0E1C\u0E19\u0E01\u0E09\u0E38\u0E01\u0E40\u0E09\u0E34\u0E19",
            glyph: "\u{1F4CB}",
            places: ["hospital"],
            note: "\u0E2A\u0E33\u0E23\u0E27\u0E08\u0E41\u0E1F\u0E49\u0E21\u0E40\u0E27\u0E0A\u0E23\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E17\u0E35\u0E48\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E23\u0E2D\u0E14\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1F\u0E37\u0E49\u0E19\u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33 \xB7 1 \u0E27\u0E31\u0E19",
            encounter: "c42.hospital_record",
            behaviorTags: ["remembered"],
            requirements: {
              all: [
                { kind: "flag", id: "c42.hospital_record_resolved", value: false }
              ]
            }
          },
          {
            id: "c42.crossroad_inspect",
            name: "\u0E2A\u0E33\u0E23\u0E27\u0E08\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E20\u0E31\u0E22\u0E41\u0E25\u0E30\u0E2A\u0E31\u0E0D\u0E25\u0E31\u0E01\u0E29\u0E13\u0E4C\u0E17\u0E35\u0E48\u0E2A\u0E35\u0E48\u0E41\u0E22\u0E01",
            glyph: "\u{1F6B8}",
            places: ["streets"],
            note: "\u0E2D\u0E48\u0E32\u0E19\u0E23\u0E48\u0E2D\u0E07\u0E23\u0E2D\u0E22\u0E41\u0E25\u0E30\u0E2A\u0E31\u0E0D\u0E25\u0E31\u0E01\u0E29\u0E13\u0E4C\u0E1A\u0E19\u0E15\u0E2D\u0E21\u0E48\u0E2D\u0E2A\u0E30\u0E1E\u0E32\u0E19\u0E41\u0E25\u0E30\u0E0B\u0E32\u0E01\u0E23\u0E16\u0E40\u0E21\u0E25\u0E4C \xB7 1 \u0E27\u0E31\u0E19",
            encounter: "c42.crossroad_message",
            behaviorTags: ["remembered"],
            requirements: {
              all: [
                { kind: "flag", id: "c42.crossroad_resolved", value: false }
              ]
            }
          },
          {
            id: "c42.shelter_listen",
            name: "\u0E1F\u0E31\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E25\u0E21\u0E08\u0E32\u0E01\u0E0A\u0E48\u0E2D\u0E07\u0E23\u0E30\u0E1A\u0E32\u0E22\u0E2D\u0E32\u0E01\u0E32\u0E28\u0E2B\u0E25\u0E1A\u0E20\u0E31\u0E22",
            glyph: "\u{1F6AA}",
            places: ["shelter"],
            note: "\u0E40\u0E07\u0E35\u0E48\u0E22\u0E2B\u0E39\u0E1F\u0E31\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E40\u0E04\u0E32\u0E30\u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E2B\u0E27\u0E14\u0E49\u0E32\u0E19\u0E19\u0E2D\u0E01\u0E0A\u0E48\u0E2D\u0E07\u0E25\u0E21 \xB7 1 \u0E27\u0E31\u0E19",
            encounter: "c42.shelter_whisper",
            behaviorTags: ["remembered"],
            requirements: {
              all: [
                { kind: "flag", id: "c42.shelter_resolved", value: false }
              ]
            }
          },
          {
            id: "c42.seek_contact",
            name: "\u0E15\u0E32\u0E21\u0E2B\u0E32\u0E23\u0E48\u0E2D\u0E07\u0E23\u0E2D\u0E22\u0E21\u0E32\u0E25\u0E35\u0E15\u0E32\u0E21\u0E2A\u0E31\u0E0D\u0E25\u0E31\u0E01\u0E29\u0E13\u0E4C\u0E17\u0E35\u0E48\u0E1E\u0E1A",
            glyph: "\u{1F463}",
            places: ["streets"],
            note: "\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E21\u0E32\u0E25\u0E35\u0E15\u0E32\u0E21\u0E23\u0E48\u0E2D\u0E07\u0E23\u0E2D\u0E22\u0E17\u0E35\u0E48\u0E17\u0E34\u0E49\u0E07\u0E44\u0E27\u0E49 \xB7 1 \u0E27\u0E31\u0E19",
            encounter: "c42.reunion_quiet",
            behaviorTags: ["remembered"],
            requirements: {
              all: [
                { kind: "npc", id: "remnant.mali", field: "alive", value: true },
                { not: { kind: "npc", id: "remnant.mali", field: "state", value: "departed" } },
                {
                  any: [
                    { kind: "flag", id: "c42.shelter_signaled", value: true },
                    { kind: "flag", id: "c42.route_known", value: true }
                  ]
                },
                { kind: "flag", id: "c42.reunion_resolved", value: false }
              ]
            }
          },
          {
            id: "c42.guard_shelter_gate",
            name: "\u0E40\u0E1D\u0E49\u0E32\u0E23\u0E30\u0E27\u0E31\u0E07\u0E2B\u0E19\u0E49\u0E32\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E01\u0E31\u0E49\u0E19\u0E17\u0E35\u0E48\u0E2B\u0E25\u0E1A\u0E20\u0E31\u0E22",
            glyph: "\u{1F6E1}",
            places: ["shelter"],
            note: "\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E23\u0E31\u0E1A\u0E21\u0E37\u0E2D\u0E20\u0E31\u0E22\u0E04\u0E38\u0E01\u0E04\u0E32\u0E21\u0E2B\u0E19\u0E49\u0E32\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E2B\u0E25\u0E1A\u0E20\u0E31\u0E22 \xB7 1 \u0E27\u0E31\u0E19",
            encounter: "c42.protective_stand",
            behaviorTags: ["endured"],
            requirements: {
              all: [
                {
                  any: [
                    { kind: "flag", id: "c42.shelter_signaled", value: true },
                    { kind: "flag", id: "c42.truce_established", value: true }
                  ]
                },
                { kind: "flag", id: "c42.protective_stand_resolved", value: false }
              ]
            }
          },
          {
            id: "c42.hospital_supply_cache",
            name: "\u0E04\u0E49\u0E19\u0E15\u0E39\u0E49\u0E22\u0E32\u0E09\u0E38\u0E01\u0E40\u0E09\u0E34\u0E19\u0E17\u0E35\u0E48\u0E08\u0E33\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E44\u0E14\u0E49",
            glyph: "\u271A",
            places: ["hospital"],
            note: "\u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23\u0E41\u0E1E\u0E17\u0E22\u0E4C\u0E40\u0E1B\u0E34\u0E14\u0E17\u0E32\u0E07\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07\u0E22\u0E32 1 \u0E0A\u0E34\u0E49\u0E19 \xB7 \u0E40\u0E2A\u0E35\u0E48\u0E22\u0E07\u0E20\u0E31\u0E22\u0E42\u0E23\u0E07\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25 10 \xB7 1 \u0E27\u0E31\u0E19",
            requirements: {
              all: [
                { kind: "flag", id: "c42.medical_recalled", value: true },
                { kind: "flag", id: "c42.cache_looted", value: false }
              ]
            },
            effects: [
              { type: "item.add", key: "medicine", value: 1 },
              { type: "flag.set", id: "c42.cache_looted", value: true },
              { type: "location.threat.add", id: "hospital", value: 10 }
            ]
          },
          {
            id: "c42.shelter_backdoor",
            name: "\u0E1E\u0E31\u0E01\u0E43\u0E19\u0E0A\u0E48\u0E2D\u0E07\u0E25\u0E21\u0E2B\u0E25\u0E1A\u0E20\u0E31\u0E22\u0E17\u0E35\u0E48\u0E08\u0E33\u0E44\u0E14\u0E49",
            glyph: "\u2302",
            places: ["shelter"],
            note: "\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E2B\u0E25\u0E1A\u0E20\u0E31\u0E22\u0E17\u0E35\u0E48\u0E08\u0E33\u0E44\u0E14\u0E49\u0E40\u0E1B\u0E34\u0E14\u0E17\u0E35\u0E48\u0E0B\u0E48\u0E2D\u0E19\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 \xB7 \u0E1E\u0E31\u0E01\u0E1C\u0E48\u0E2D\u0E19\u0E1F\u0E37\u0E49\u0E19\u0E1F\u0E39\u0E2A\u0E15\u0E34 \xB7 1 \u0E27\u0E31\u0E19",
            requirements: {
              all: [
                { kind: "flag", id: "c42.route_known", value: true }
              ]
            },
            effects: [
              { type: "stat", path: "stats.sanity", value: 5 },
              { type: "stat", path: "stats.instinct", value: 3 }
            ]
          }
        ];
        const EVENTS = [
          // -------------------------------------------------------------------------
          // Unit 1: Hospital Record (hospital)
          // -------------------------------------------------------------------------
          {
            id: "c42.hospital_record",
            title: "\u0E41\u0E1F\u0E49\u0E21\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E04\u0E19\u0E44\u0E02\u0E49\u0E43\u0E19\u0E41\u0E1C\u0E19\u0E01\u0E09\u0E38\u0E01\u0E40\u0E09\u0E34\u0E19",
            location: "hospital",
            text: "\u0E17\u0E48\u0E32\u0E21\u0E01\u0E25\u0E32\u0E07\u0E15\u0E39\u0E49\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E17\u0E35\u0E48\u0E25\u0E49\u0E21\u0E04\u0E27\u0E48\u0E33\u0E43\u0E19\u0E41\u0E1C\u0E19\u0E01\u0E09\u0E38\u0E01\u0E40\u0E09\u0E34\u0E19 \u0E40\u0E08\u0E49\u0E32\u0E1E\u0E1A\u0E41\u0E1F\u0E49\u0E21\u0E40\u0E27\u0E0A\u0E23\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E17\u0E35\u0E48\u0E04\u0E38\u0E49\u0E19\u0E15\u0E32 \u0E25\u0E32\u0E22\u0E21\u0E37\u0E2D\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E01\u0E32\u0E23\u0E23\u0E31\u0E01\u0E29\u0E32\u0E41\u0E25\u0E30\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E17\u0E32\u0E07\u0E41\u0E1E\u0E17\u0E22\u0E4C\u0E1B\u0E25\u0E38\u0E01\u0E40\u0E2A\u0E35\u0E49\u0E22\u0E27\u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33\u0E40\u0E01\u0E48\u0E32\u0E27\u0E48\u0E32\u0E15\u0E19\u0E40\u0E04\u0E22\u0E40\u0E1B\u0E47\u0E19\u0E43\u0E04\u0E23\u0E01\u0E48\u0E2D\u0E19\u0E42\u0E25\u0E01\u0E08\u0E30\u0E1E\u0E31\u0E07\u0E17\u0E25\u0E32\u0E22",
            once: false,
            cooldownDays: 0,
            requirements: {
              all: [
                { kind: "flag", id: "c42.hospital_record_resolved", value: false }
              ]
            },
            choices: [
              {
                id: "c42.hospital_record.recall",
                text: "\u0E23\u0E30\u0E25\u0E36\u0E01\u0E16\u0E36\u0E07\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E01\u0E32\u0E23\u0E23\u0E31\u0E01\u0E29\u0E32: \u0E22\u0E2D\u0E21\u0E23\u0E31\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33\u0E02\u0E2D\u0E07\u0E41\u0E1E\u0E17\u0E22\u0E4C\u0E43\u0E19\u0E2D\u0E14\u0E35\u0E15",
                note: "ฟื้นความทรงจำการแพทย์ · ชุดเย็บแผล +1 · สติ +6 · งานวิจัย +15 · ตัวอย่างเชื้อ +1",
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "stat.add", key: "sanity", value: 6 },
                  { type: "item.add", key: "medicine", value: 1 },
                  { type: "flag.set", id: "c42.medical_recalled", value: true },
                  { type: "flag.set", id: "c42.past_track", value: "medical" },
                  { type: "flag.set", id: "c42.hospital_record_resolved", value: true }
                ],
                behaviorTags: ["remembered"]
              },
              {
                id: "c42.hospital_record.detach",
                text: "\u0E15\u0E31\u0E14\u0E02\u0E32\u0E14\u0E08\u0E32\u0E01\u0E2D\u0E14\u0E35\u0E15: \u0E25\u0E30\u0E17\u0E34\u0E49\u0E07\u0E1A\u0E17\u0E1A\u0E32\u0E17\u0E40\u0E01\u0E48\u0E32\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E31\u0E0D\u0E0A\u0E32\u0E15\u0E0D\u0E32\u0E13\u0E40\u0E2D\u0E32\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E23\u0E2D\u0E14",
                note: "ตัดขาดอดีต · สัญชาตญาณ +5 · สติ -5 · กลายพันธุ์ +8",
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "stat.add", key: "instinct", value: 5 },
                  { type: "stat.add", key: "sanity", value: -5 },
                  { type: "flag.set", id: "c42.past_detached", value: true },
                  { type: "flag.set", id: "c42.past_track", value: "instinct" },
                  { type: "flag.set", id: "c42.hospital_record_resolved", value: true }
                ],
                behaviorTags: ["endured"]
              },
              {
                id: "c42.hospital_record.doubt",
                text: "\u0E44\u0E21\u0E48\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E41\u0E1F\u0E49\u0E21\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34: \u0E23\u0E30\u0E41\u0E27\u0E07\u0E27\u0E48\u0E32\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23\u0E41\u0E1E\u0E17\u0E22\u0E4C\u0E16\u0E39\u0E01\u0E08\u0E31\u0E14\u0E09\u0E32\u0E01",
                note: "ระแวงบันทึก · สติ -2",
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "stat.add", key: "sanity", value: -2 },
                  { type: "flag.set", id: "c42.record_doubted", value: true },
                  { type: "flag.set", id: "c42.past_track", value: "doubt" },
                  { type: "flag.set", id: "c42.hospital_record_resolved", value: true }
                ],
                behaviorTags: ["endured"]
              },
              {
                id: "c42.hospital_record.retreat",
                text: "\u0E16\u0E2D\u0E22\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E2B\u0E49\u0E2D\u0E07\u0E41\u0E1F\u0E49\u0E21\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E23\u0E30\u0E21\u0E31\u0E14\u0E23\u0E30\u0E27\u0E31\u0E07",
                note: "\u0E16\u0E2D\u0E19\u0E15\u0E31\u0E27\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E20\u0E32\u0E22\u0E2B\u0E25\u0E31\u0E07 \xB7 \u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 \u0E44\u0E21\u0E48\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E40\u0E2A\u0E35\u0E22\u0E2B\u0E32\u0E22",
                requirements: { all: [] },
                costs: [],
                effects: [],
                behaviorTags: []
              }
            ]
          },
          // -------------------------------------------------------------------------
          // Unit 2: Crossroad Message (streets)
          // -------------------------------------------------------------------------
          {
            id: "c42.crossroad_message",
            title: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E20\u0E31\u0E22\u0E17\u0E35\u0E48\u0E2A\u0E35\u0E48\u0E41\u0E22\u0E01",
            location: "streets",
            text: "\u0E1A\u0E19\u0E40\u0E2A\u0E32\u0E15\u0E2D\u0E21\u0E48\u0E2D\u0E2A\u0E30\u0E1E\u0E32\u0E19\u0E02\u0E49\u0E32\u0E21\u0E41\u0E22\u0E01 \u0E21\u0E35\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E1E\u0E48\u0E19\u0E2A\u0E35\u0E2A\u0E40\u0E1B\u0E23\u0E22\u0E4C\u0E2A\u0E35\u0E02\u0E32\u0E27\u0E0A\u0E35\u0E49\u0E17\u0E34\u0E28\u0E17\u0E32\u0E07\u0E2B\u0E25\u0E1A\u0E20\u0E31\u0E22 \u0E25\u0E39\u0E01\u0E28\u0E23\u0E40\u0E02\u0E35\u0E22\u0E19\u0E14\u0E49\u0E27\u0E22\u0E04\u0E27\u0E32\u0E21\u0E40\u0E23\u0E48\u0E07\u0E23\u0E35\u0E1A\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E16\u0E36\u0E07\u0E2D\u0E31\u0E19\u0E15\u0E23\u0E32\u0E22\u0E02\u0E2D\u0E07\u0E1D\u0E39\u0E07\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E43\u0E19\u0E22\u0E48\u0E32\u0E19\u0E18\u0E38\u0E23\u0E01\u0E34\u0E08",
            once: false,
            cooldownDays: 0,
            requirements: {
              all: [
                { kind: "flag", id: "c42.crossroad_resolved", value: false }
              ]
            },
            choices: [
              {
                id: "c42.crossroad_message.follow",
                text: "\u0E41\u0E01\u0E30\u0E23\u0E2D\u0E22\u0E15\u0E32\u0E21\u0E2A\u0E31\u0E0D\u0E25\u0E31\u0E01\u0E29\u0E13\u0E4C\u0E25\u0E39\u0E01\u0E28\u0E23: \u0E04\u0E49\u0E19\u0E2B\u0E32\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E17\u0E35\u0E48\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E43\u0E0A\u0E49\u0E2B\u0E25\u0E1A\u0E2B\u0E19\u0E35",
                note: "ปลดล็อกเส้นทางเชื่อมต่อที่ซ่อนอยู่ · สติ +4",
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "stat.add", key: "sanity", value: 4 },
                  { type: "flag.set", id: "c42.route_known", value: true },
                  { type: "flag.set", id: "c42.crossroad_resolved", value: true }
                ],
                behaviorTags: ["remembered"]
              },
              {
                id: "c42.crossroad_message.fortify",
                text: "\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E41\u0E19\u0E27\u0E01\u0E31\u0E49\u0E19\u0E40\u0E28\u0E29\u0E0B\u0E32\u0E01\u0E23\u0E16\u0E40\u0E21\u0E25\u0E4C: \u0E2A\u0E23\u0E49\u0E32\u0E07\u0E08\u0E38\u0E14\u0E2B\u0E25\u0E1A\u0E20\u0E31\u0E22\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27\u0E01\u0E25\u0E32\u0E07\u0E2A\u0E35\u0E48\u0E41\u0E22\u0E01",
                note: "เสริมแนวกั้นแยก · ภัยคุกคามบนถนน -5 · สัญชาตญาณ +4",
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "stat.add", key: "instinct", value: 4 },
                  { type: "location.threat.add", id: "streets", value: -5 },
                  { type: "flag.set", id: "c42.crossroad_fortified", value: true },
                  { type: "flag.set", id: "c42.crossroad_resolved", value: true }
                ],
                behaviorTags: ["endured"]
              },
              {
                id: "c42.crossroad_message.doubt",
                text: "\u0E23\u0E30\u0E27\u0E31\u0E07\u0E01\u0E31\u0E1A\u0E14\u0E31\u0E01: \u0E21\u0E2D\u0E07\u0E2B\u0E32\u0E2A\u0E34\u0E48\u0E07\u0E1C\u0E34\u0E14\u0E1B\u0E01\u0E15\u0E34\u0E41\u0E25\u0E30\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2B\u0E19\u0E35",
                note: "ระแวงกับดัก · สัญชาตญาณ +3",
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "stat.add", key: "instinct", value: 3 },
                  { type: "flag.set", id: "c42.trap_wary", value: true },
                  { type: "flag.set", id: "c42.crossroad_resolved", value: true }
                ],
                behaviorTags: ["endured"]
              },
              {
                id: "c42.crossroad_message.retreat",
                text: "\u0E40\u0E14\u0E34\u0E19\u0E40\u0E25\u0E35\u0E48\u0E22\u0E07\u0E1C\u0E48\u0E32\u0E19\u0E2A\u0E35\u0E48\u0E41\u0E22\u0E01\u0E44\u0E1B\u0E15\u0E32\u0E21\u0E1B\u0E01\u0E15\u0E34",
                note: "\u0E16\u0E2D\u0E19\u0E15\u0E31\u0E27\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E2A\u0E33\u0E23\u0E27\u0E08\u0E20\u0E32\u0E22\u0E2B\u0E25\u0E31\u0E07 \xB7 \u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 \u0E44\u0E21\u0E48\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E40\u0E2A\u0E35\u0E22\u0E2B\u0E32\u0E22",
                requirements: { all: [] },
                costs: [],
                effects: [],
                behaviorTags: []
              }
            ]
          },
          // -------------------------------------------------------------------------
          // Unit 3: Shelter Whisper (shelter)
          // -------------------------------------------------------------------------
          {
            id: "c42.shelter_whisper",
            title: "\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E41\u0E27\u0E48\u0E27\u0E08\u0E32\u0E01\u0E0A\u0E48\u0E2D\u0E07\u0E23\u0E30\u0E1A\u0E32\u0E22\u0E2D\u0E32\u0E01\u0E32\u0E28\u0E17\u0E35\u0E48\u0E2B\u0E25\u0E1A\u0E20\u0E31\u0E22",
            location: "shelter",
            text: "\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E40\u0E04\u0E32\u0E30\u0E40\u0E1A\u0E32\u0E46 \u0E14\u0E31\u0E07\u0E25\u0E2D\u0E14\u0E1C\u0E48\u0E32\u0E19\u0E0A\u0E48\u0E2D\u0E07\u0E23\u0E30\u0E1A\u0E32\u0E22\u0E2D\u0E32\u0E01\u0E32\u0E28\u0E17\u0E35\u0E48\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E2D\u0E2D\u0E01\u0E2A\u0E39\u0E48\u0E0B\u0E2D\u0E22\u0E41\u0E04\u0E1A\u0E14\u0E49\u0E32\u0E19\u0E2B\u0E25\u0E31\u0E07 \u0E40\u0E2A\u0E35\u0E22\u0E07\u0E25\u0E21\u0E2B\u0E32\u0E22\u0E43\u0E08\u0E2A\u0E31\u0E48\u0E19\u0E23\u0E30\u0E23\u0E34\u0E01\u0E1A\u0E48\u0E07\u0E1A\u0E2D\u0E01\u0E27\u0E48\u0E32\u0E21\u0E35\u0E2A\u0E34\u0E48\u0E07\u0E21\u0E35\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E01\u0E33\u0E25\u0E31\u0E07\u0E0B\u0E48\u0E2D\u0E19\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E25\u0E31\u0E07\u0E41\u0E1C\u0E07\u0E40\u0E2B\u0E25\u0E47\u0E01",
            once: false,
            cooldownDays: 0,
            requirements: {
              all: [
                { kind: "flag", id: "c42.shelter_resolved", value: false }
              ]
            },
            choices: [
              {
                id: "c42.shelter_whisper.signal",
                text: "\u0E2A\u0E48\u0E07\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E40\u0E04\u0E32\u0E30\u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A\u0E16\u0E36\u0E07\u0E21\u0E32\u0E25\u0E35: \u0E2A\u0E48\u0E07\u0E23\u0E2B\u0E31\u0E2A\u0E1A\u0E2D\u0E01\u0E2A\u0E15\u0E34\u0E41\u0E25\u0E30\u0E04\u0E27\u0E32\u0E21\u0E40\u0E1B\u0E47\u0E19\u0E21\u0E34\u0E15\u0E23",
                note: "พบมาลี · ความไว้ใจของมาลีอย่างน้อย 15 · สติ +5 · ปลดล็อกช่องลมหลบภัย · เมื่อความหิว ≥75: สภาพร่าง -3 · สติ -6 เพิ่มเติม",
                pressure: true,
                requirements: {
                  all: [
                    { kind: "npc", id: "remnant.mali", field: "alive", value: true },
                    { kind: "npc", id: "remnant.mali", field: "state", value: "unknown" }
                  ]
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "sanity", value: 5 },
                  { type: "npc.set", id: "remnant.mali", field: "state", value: "met" },
                  { type: "npc.set", id: "remnant.mali", field: "trust", value: 15, minimum: true },
                  { type: "flag.set", id: "c42.shelter_signaled", value: true },
                  { type: "flag.set", id: "c42.shelter_resolved", value: true }
                ],
                behaviorTags: ["helped", "remembered"]
              },
              {
                id: "c42.shelter_whisper.signal_survivors",
                text: "\u0E2A\u0E48\u0E07\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E40\u0E04\u0E32\u0E30\u0E2B\u0E32\u0E1C\u0E39\u0E49\u0E23\u0E2D\u0E14\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E04\u0E19\u0E2D\u0E37\u0E48\u0E19\u0E43\u0E19\u0E17\u0E35\u0E48\u0E2B\u0E25\u0E1A\u0E20\u0E31\u0E22",
                note: "ส่งสัญญาณเคาะหาคนข้างใน · สติ +3 · เมื่อความหิว ≥75: สภาพร่าง -3 · สติ -6 เพิ่มเติม",
                pressure: true,
                requirements: {
                  any: [
                    { not: { kind: "npc", id: "remnant.mali", field: "alive", value: true } },
                    { kind: "npc", id: "remnant.mali", field: "state", value: "departed" }
                  ]
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "sanity", value: 3 },
                  { type: "flag.set", id: "c42.shelter_signaled", value: true },
                  { type: "flag.set", id: "c42.shelter_resolved", value: true }
                ],
                behaviorTags: ["helped", "remembered"]
              },
              {
                id: "c42.shelter_whisper.cat",
                text: "\u0E40\u0E1D\u0E49\u0E32\u0E21\u0E2D\u0E07\u0E41\u0E21\u0E27\u0E08\u0E23\u0E08\u0E31\u0E14\u0E17\u0E35\u0E48\u0E0A\u0E48\u0E2D\u0E07\u0E23\u0E30\u0E1A\u0E32\u0E22\u0E25\u0E21: \u0E41\u0E1A\u0E48\u0E07\u0E04\u0E27\u0E32\u0E21\u0E2D\u0E1A\u0E2D\u0E38\u0E48\u0E19\u0E43\u0E19\u0E04\u0E27\u0E32\u0E21\u0E40\u0E07\u0E35\u0E22\u0E1A",
                note: "สังเกตแมว · สติ +3 · ไม่นับเป็นการช่วยผู้รอดชีวิต",
                pressure: false,
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "stat.add", key: "sanity", value: 3 },
                  { type: "flag.set", id: "c42.cat_observed", value: true },
                  { type: "flag.set", id: "c42.shelter_resolved", value: true }
                ],
                behaviorTags: ["remembered"]
              },
              {
                id: "c42.shelter_whisper.dismiss",
                text: "\u0E40\u0E21\u0E34\u0E19\u0E40\u0E09\u0E22\u0E15\u0E48\u0E2D\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E40\u0E04\u0E32\u0E30\u0E41\u0E25\u0E30\u0E16\u0E2D\u0E22\u0E2B\u0E48\u0E32\u0E07: \u0E23\u0E31\u0E01\u0E29\u0E32\u0E04\u0E27\u0E32\u0E21\u0E40\u0E07\u0E35\u0E22\u0E1A\u0E07\u0E31\u0E19",
                note: "ไม่ตอบสนอง · สัญชาตญาณ +3 · ไม่เปลี่ยนความสัมพันธ์กับมาลี",
                pressure: false,
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "stat.add", key: "instinct", value: 3 },
                  { type: "flag.set", id: "c42.shelter_dismissed", value: true },
                  { type: "flag.set", id: "c42.shelter_resolved", value: true }
                ],
                behaviorTags: ["endured"]
              },
              {
                id: "c42.shelter_whisper.retreat",
                text: "\u0E1B\u0E34\u0E14\u0E0A\u0E48\u0E2D\u0E07\u0E23\u0E30\u0E1A\u0E32\u0E22\u0E2D\u0E32\u0E01\u0E32\u0E28\u0E40\u0E07\u0E35\u0E22\u0E1A\u0E46 \u0E41\u0E25\u0E49\u0E27\u0E16\u0E2D\u0E22\u0E09\u0E32\u0E01",
                note: "\u0E16\u0E2D\u0E19\u0E15\u0E31\u0E27\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E15\u0E31\u0E14\u0E2A\u0E34\u0E19\u0E43\u0E08\u0E20\u0E32\u0E22\u0E2B\u0E25\u0E31\u0E07 \xB7 \u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 \u0E44\u0E21\u0E48\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E40\u0E2A\u0E35\u0E22\u0E2B\u0E32\u0E22",
                pressure: false,
                requirements: { all: [] },
                costs: [],
                effects: [],
                behaviorTags: []
              },
              {
                id: "c42.shelter_whisper.signal_known",
                text: "\u0E40\u0E04\u0E32\u0E30\u0E23\u0E2B\u0E31\u0E2A\u0E17\u0E35\u0E48\u0E40\u0E04\u0E22\u0E43\u0E0A\u0E49\u0E01\u0E31\u0E1A\u0E21\u0E32\u0E25\u0E35\u0E1C\u0E48\u0E32\u0E19\u0E0A\u0E48\u0E2D\u0E07\u0E25\u0E21",
                note: "ส่งสัญญาณถึงมาลีโดยรักษาความสัมพันธ์เดิม · สติ +5 · เมื่อความหิว ≥75: สภาพร่าง -3 · สติ -6 เพิ่มเติม",
                pressure: true,
                requirements: { all: [
                  { kind: "npc", id: "remnant.mali", field: "alive", value: true },
                  { any: [{ kind: "npc", id: "remnant.mali", field: "state", value: "met" }, { kind: "npc", id: "remnant.mali", field: "state", value: "allied" }] }
                ] },
                costs: [],
                effects: [
                  { type: "stat.add", key: "sanity", value: 5 },
                  { type: "flag.set", id: "c42.shelter_signaled", value: true },
                  { type: "flag.set", id: "c42.shelter_resolved", value: true }
                ],
                behaviorTags: ["helped", "remembered"]
              }
            ]
          },
          // -------------------------------------------------------------------------
          // Unit 4: Reunion Quiet (streets)
          // -------------------------------------------------------------------------
          {
            id: "c42.reunion_quiet",
            title: "\u0E01\u0E32\u0E23\u0E1E\u0E1A\u0E01\u0E31\u0E19\u0E40\u0E07\u0E35\u0E22\u0E1A\u0E46 \u0E17\u0E35\u0E48\u0E21\u0E38\u0E21\u0E15\u0E36\u0E01\u0E23\u0E49\u0E32\u0E07",
            location: "streets",
            text: "\u0E21\u0E32\u0E25\u0E35\u0E2B\u0E25\u0E1A\u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E25\u0E31\u0E07\u0E01\u0E2D\u0E07\u0E01\u0E25\u0E48\u0E2D\u0E07\u0E44\u0E21\u0E49\u0E40\u0E01\u0E48\u0E32 \u0E21\u0E37\u0E2D\u0E02\u0E49\u0E32\u0E07\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E01\u0E33\u0E17\u0E48\u0E2D\u0E19\u0E40\u0E2B\u0E25\u0E47\u0E01\u0E41\u0E19\u0E48\u0E19 \u0E2D\u0E35\u0E01\u0E02\u0E49\u0E32\u0E07\u0E1B\u0E23\u0E30\u0E04\u0E2D\u0E07\u0E44\u0E2B\u0E25\u0E48\u0E17\u0E35\u0E48\u0E1A\u0E32\u0E14\u0E40\u0E08\u0E47\u0E1A \u0E40\u0E21\u0E37\u0E48\u0E2D\u0E40\u0E2B\u0E47\u0E19\u0E41\u0E27\u0E27\u0E15\u0E32\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E21\u0E35\u0E2A\u0E15\u0E34\u0E02\u0E2D\u0E07\u0E40\u0E08\u0E49\u0E32 \u0E40\u0E18\u0E2D\u0E0A\u0E30\u0E07\u0E31\u0E01\u0E41\u0E25\u0E30\u0E25\u0E14\u0E2D\u0E32\u0E27\u0E38\u0E18\u0E25\u0E07\u0E04\u0E23\u0E36\u0E48\u0E07\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E14\u0E49\u0E27\u0E22\u0E04\u0E27\u0E32\u0E21\u0E25\u0E31\u0E07\u0E40\u0E25",
            once: false,
            cooldownDays: 0,
            requirements: {
              all: [
                { kind: "flag", id: "c42.reunion_resolved", value: false }
              ]
            },
            choices: [
              {
                id: "c42.reunion_quiet.truce",
                text: "\u0E40\u0E08\u0E23\u0E08\u0E32\u0E2A\u0E07\u0E1A\u0E28\u0E36\u0E01\u0E41\u0E25\u0E30\u0E41\u0E1A\u0E48\u0E07\u0E1B\u0E31\u0E19\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07: \u0E27\u0E32\u0E07\u0E2A\u0E34\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E41\u0E25\u0E30\u0E2A\u0E37\u0E48\u0E2D\u0E2A\u0E32\u0E23\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E21\u0E35\u0E2A\u0E15\u0E34",
                note: "มาลีเป็นพันธมิตร · ความไว้ใจของมาลีอย่างน้อย 40 · สติ +8 · ความไว้ใจ +10 · ความเป็นมนุษย์ +6 · เมื่อความหิว ≥75: สภาพร่าง -3 · สติ -6 เพิ่มเติม",
                pressure: true,
                requirements: {
                  all: [
                    { kind: "stat", key: "sanity", min: 20 },
                    { kind: "npc", id: "remnant.mali", field: "alive", value: true },
                    { not: { kind: "npc", id: "remnant.mali", field: "state", value: "departed" } }
                  ]
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "sanity", value: 8 },
                  { type: "npc.set", id: "remnant.mali", field: "state", value: "allied" },
                  { type: "npc.set", id: "remnant.mali", field: "trust", value: 40, minimum: true },
                  { type: "flag.set", id: "c42.truce_established", value: true },
                  { type: "flag.set", id: "c42.reunion_resolved", value: true }
                ],
                behaviorTags: ["helped", "remembered"]
              },
              {
                id: "c42.reunion_quiet.diverge",
                text: "\u0E41\u0E22\u0E01\u0E22\u0E49\u0E32\u0E22\u0E17\u0E32\u0E07\u0E43\u0E04\u0E23\u0E17\u0E32\u0E07\u0E21\u0E31\u0E19: \u0E1E\u0E22\u0E31\u0E01\u0E2B\u0E19\u0E49\u0E32\u0E1A\u0E2D\u0E01\u0E25\u0E32\u0E43\u0E2B\u0E49\u0E15\u0E48\u0E32\u0E07\u0E04\u0E19\u0E15\u0E48\u0E32\u0E07\u0E40\u0E2D\u0E32\u0E15\u0E31\u0E27\u0E23\u0E2D\u0E14",
                note: "แยกย้ายโดยสันติ · มาลีจากไปและความไว้ใจเป็น 0 · สัญชาตญาณ +8 · กลายพันธุ์ +8",
                pressure: false,
                requirements: {
                  all: [
                    { kind: "npc", id: "remnant.mali", field: "alive", value: true },
                    { not: { kind: "npc", id: "remnant.mali", field: "state", value: "departed" } }
                  ]
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "instinct", value: 8 },
                  { type: "npc.set", id: "remnant.mali", field: "state", value: "departed" },
                  { type: "npc.set", id: "remnant.mali", field: "trust", value: 0 },
                  { type: "flag.set", id: "c42.path_diverged", value: true },
                  { type: "flag.set", id: "c42.reunion_resolved", value: true }
                ],
                behaviorTags: ["endured"]
              },
              {
                id: "c42.reunion_quiet.shadow",
                text: "\u0E2B\u0E25\u0E1A\u0E40\u0E02\u0E49\u0E32\u0E40\u0E07\u0E32\u0E21\u0E37\u0E14\u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E43\u0E2B\u0E49\u0E21\u0E32\u0E25\u0E35\u0E1C\u0E48\u0E32\u0E19\u0E44\u0E1B: \u0E2A\u0E31\u0E07\u0E40\u0E01\u0E15\u0E01\u0E32\u0E23\u0E13\u0E4C\u0E42\u0E14\u0E22\u0E44\u0E21\u0E48\u0E1B\u0E23\u0E32\u0E01\u0E0F\u0E15\u0E31\u0E27",
                note: "เฝ้ามองจากมุมมืด · ความไว้ใจของมาลีเป็น 10 · สัญชาตญาณ +4",
                pressure: false,
                requirements: {
                  all: [
                    { kind: "npc", id: "remnant.mali", field: "alive", value: true },
                    { not: { kind: "npc", id: "remnant.mali", field: "state", value: "departed" } }
                  ]
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "instinct", value: 4 },
                  { type: "npc.set", id: "remnant.mali", field: "trust", value: 10 },
                  { type: "flag.set", id: "c42.reunion_shadowed", value: true },
                  { type: "flag.set", id: "c42.reunion_resolved", value: true }
                ],
                behaviorTags: ["endured"]
              },
              {
                id: "c42.reunion_quiet.retreat",
                text: "\u0E16\u0E2D\u0E22\u0E09\u0E32\u0E01\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E07\u0E35\u0E22\u0E1A\u0E40\u0E0A\u0E35\u0E22\u0E1A\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E1E\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E2B\u0E27",
                note: "ถอยออกมาโดยไม่ฝืนเข้าใกล้ · ไม่รับผลต่อสถานะเพิ่มเติม",
                pressure: false,
                requirements: { all: [] },
                costs: [],
                effects: [],
                behaviorTags: []
              }
            ]
          },
          // -------------------------------------------------------------------------
          // Unit 5: Protective Stand (shelter)
          // -------------------------------------------------------------------------
          {
            id: "c42.protective_stand",
            title: "\u0E40\u0E1C\u0E0A\u0E34\u0E0D\u0E2B\u0E19\u0E49\u0E32\u0E1D\u0E39\u0E07\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E2B\u0E19\u0E49\u0E32\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E01\u0E31\u0E49\u0E19",
            location: "shelter",
            text: "\u0E1D\u0E39\u0E07\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E44\u0E23\u0E49\u0E2A\u0E15\u0E34\u0E01\u0E25\u0E38\u0E48\u0E21\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E15\u0E32\u0E21\u0E01\u0E25\u0E34\u0E48\u0E19\u0E40\u0E25\u0E37\u0E2D\u0E14\u0E21\u0E32\u0E08\u0E19\u0E16\u0E36\u0E07\u0E1A\u0E32\u0E19\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E40\u0E2B\u0E25\u0E47\u0E01\u0E2B\u0E19\u0E49\u0E32\u0E2B\u0E49\u0E2D\u0E07\u0E2B\u0E25\u0E1A\u0E20\u0E31\u0E22 \u0E40\u0E2A\u0E35\u0E22\u0E07\u0E17\u0E38\u0E1A\u0E01\u0E23\u0E30\u0E41\u0E17\u0E01\u0E17\u0E33\u0E43\u0E2B\u0E49\u0E2A\u0E25\u0E31\u0E01\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E01\u0E33\u0E25\u0E31\u0E07\u0E08\u0E30\u0E1E\u0E31\u0E07\u0E17\u0E25\u0E32\u0E22\u0E25\u0E07 \u0E2B\u0E32\u0E01\u0E44\u0E21\u0E48\u0E21\u0E35\u0E43\u0E04\u0E23\u0E40\u0E02\u0E49\u0E32\u0E02\u0E27\u0E32\u0E07 \u0E1C\u0E39\u0E49\u0E23\u0E2D\u0E14\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E14\u0E49\u0E32\u0E19\u0E43\u0E19\u0E08\u0E30\u0E15\u0E49\u0E2D\u0E07\u0E08\u0E1A\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E25\u0E07",
            once: false,
            cooldownDays: 0,
            requirements: {
              all: [
                { kind: "flag", id: "c42.protective_stand_resolved", value: false }
              ]
            },
            choices: [
              {
                id: "c42.protective_stand.barricade_mali",
                text: "\u0E22\u0E31\u0E19\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E40\u0E2B\u0E25\u0E47\u0E01\u0E14\u0E31\u0E01\u0E1D\u0E39\u0E07\u0E44\u0E27\u0E49\u0E40\u0E04\u0E35\u0E22\u0E07\u0E02\u0E49\u0E32\u0E07\u0E21\u0E32\u0E25\u0E35: \u0E0A\u0E48\u0E27\u0E22\u0E43\u0E2B\u0E49\u0E04\u0E19\u0E02\u0E49\u0E32\u0E07\u0E43\u0E19\u0E1B\u0E34\u0E14\u0E25\u0E47\u0E2D\u0E01\u0E44\u0E14\u0E49\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08",
                note: "ช่วยคน +1 · สภาพร่าง -5 · ความไว้ใจของมาลีอย่างน้อย 60 · เมื่อความหิว ≥75: สภาพร่าง -3 · สติ -6 เพิ่มเติม",
                pressure: true,
                requirements: {
                  all: [
                    { kind: "stat", key: "hp", min: 10 },
                    { kind: "npc", id: "remnant.mali", field: "alive", value: true },
                    { not: { kind: "npc", id: "remnant.mali", field: "state", value: "departed" } }
                  ]
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "hp", value: -5 },
                  { type: "memory.record", key: "saved" },
                  { type: "npc.set", id: "remnant.mali", field: "trust", value: 60, minimum: true },
                  { type: "flag.set", id: "c42.shelter_fortified", value: true },
                  { type: "flag.set", id: "c42.protective_stand_resolved", value: true }
                ],
                behaviorTags: ["helped", "remembered"]
              },
              {
                id: "c42.protective_stand.barricade_survivors",
                text: "\u0E22\u0E31\u0E19\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E40\u0E2B\u0E25\u0E47\u0E01\u0E14\u0E31\u0E01\u0E1D\u0E39\u0E07\u0E44\u0E27\u0E49\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1B\u0E01\u0E1B\u0E49\u0E2D\u0E07\u0E1C\u0E39\u0E49\u0E23\u0E2D\u0E14\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E43\u0E19\u0E17\u0E35\u0E48\u0E2B\u0E25\u0E1A\u0E20\u0E31\u0E22",
                note: "ช่วยคน +1 · สภาพร่าง -5 · เมื่อความหิว ≥75: สภาพร่าง -3 · สติ -6 เพิ่มเติม",
                pressure: true,
                requirements: {
                  all: [
                    { kind: "stat", key: "hp", min: 10 },
                    {
                      any: [
                        { not: { kind: "npc", id: "remnant.mali", field: "alive", value: true } },
                        { kind: "npc", id: "remnant.mali", field: "state", value: "departed" }
                      ]
                    }
                  ]
                },
                costs: [],
                effects: [
                  { type: "stat.add", key: "hp", value: -5 },
                  { type: "memory.record", key: "saved" },
                  { type: "flag.set", id: "c42.shelter_fortified", value: true },
                  { type: "flag.set", id: "c42.protective_stand_resolved", value: true }
                ],
                behaviorTags: ["helped", "remembered"]
              },
              {
                id: "c42.protective_stand.lure_away",
                text: "\u0E2A\u0E48\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E04\u0E33\u0E23\u0E32\u0E21\u0E25\u0E48\u0E2D\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E2D\u0E2D\u0E01\u0E44\u0E1B\u0E17\u0E32\u0E07\u0E16\u0E19\u0E19: \u0E40\u0E1A\u0E35\u0E48\u0E22\u0E07\u0E40\u0E1A\u0E19\u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E17\u0E35\u0E48\u0E2B\u0E25\u0E1A\u0E20\u0E31\u0E22",
                note: "ล่อฝูงออกจากที่พัก · ภัยคุกคามบนถนน +10 · สัญชาตญาณ +6 · เมื่อความหิว ≥75: สภาพร่าง -3 · สติ -6 เพิ่มเติม",
                pressure: true,
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "stat.add", key: "instinct", value: 6 },
                  { type: "location.threat.add", id: "streets", value: 10 },
                  { type: "flag.set", id: "c42.horde_diverted", value: true },
                  { type: "flag.set", id: "c42.protective_stand_resolved", value: true }
                ],
                behaviorTags: ["helped", "endured"]
              },
              {
                id: "c42.protective_stand.self_preserve",
                text: "\u0E16\u0E2D\u0E22\u0E40\u0E02\u0E49\u0E32\u0E40\u0E07\u0E32\u0E21\u0E37\u0E14: \u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E43\u0E2B\u0E49\u0E23\u0E30\u0E1A\u0E1A\u0E1B\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E19\u0E02\u0E2D\u0E07\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E17\u0E33\u0E07\u0E32\u0E19\u0E40\u0E2D\u0E07\u0E15\u0E32\u0E21\u0E22\u0E16\u0E32\u0E01\u0E23\u0E23\u0E21",
                note: "เน้นความอยู่รอดของตน · สัญชาตญาณ +4",
                pressure: false,
                requirements: { all: [] },
                costs: [],
                effects: [
                  { type: "stat.add", key: "instinct", value: 4 },
                  { type: "flag.set", id: "c42.self_preserved", value: true },
                  { type: "flag.set", id: "c42.protective_stand_resolved", value: true }
                ],
                behaviorTags: ["endured"]
              },
              {
                id: "c42.protective_stand.retreat",
                text: "\u0E2B\u0E25\u0E1A\u0E09\u0E32\u0E01\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E07\u0E35\u0E22\u0E1A\u0E40\u0E0A\u0E35\u0E22\u0E1A\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E2A\u0E16\u0E32\u0E19\u0E01\u0E32\u0E23\u0E13\u0E4C\u0E43\u0E2B\u0E21\u0E48",
                note: "\u0E16\u0E2D\u0E19\u0E15\u0E31\u0E27\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E15\u0E31\u0E14\u0E2A\u0E34\u0E19\u0E43\u0E08\u0E20\u0E32\u0E22\u0E2B\u0E25\u0E31\u0E07 \xB7 \u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 \u0E44\u0E21\u0E48\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E40\u0E2A\u0E35\u0E22\u0E2B\u0E32\u0E22",
                pressure: false,
                requirements: { all: [] },
                costs: [],
                effects: [],
                behaviorTags: []
              }
            ]
          }
        ];
        return {
          id: "c42.v1",
          EVENTS,
          ACTIONS,
          FLAGS,
          NPCS,
          INITIAL_NPCS
        };
      });
    }
  });

  // ../../tmp/after-zero-zombie/next/wave3-integration.js
  var require_wave3_integration = __commonJS({
    "../../tmp/after-zero-zombie/next/wave3-integration.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) {
          module.exports = factory(
            require_runtime(),
            require_contract(),
            require_director2(),
            require_presentation(),
            require_horde_candidate(),
            require_remnant_candidate(),
            require_consequence_summary(),
            require_chronicle()
          );
        } else {
          root.AfterZeroNextSupport = root.AfterZeroNextSupport || {};
          root.AfterZeroNextSupport.Wave3Integration = factory(
            root.ZombieRuntime,
            root.ZombieCore.Contract,
            root.AfterZeroNextSystems.Director,
            root.AfterZeroNextSupport.Presentation,
            root.AfterZeroNextData.HordeCandidate,
            root.AfterZeroNextData.RemnantCandidate,
            root.AfterZeroNextUI.ConsequenceSummary,
            root.ZombieSystems.Chronicle
          );
        }
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(R, K, Director, Presentation, Horde, Remnant, Summary, Chronicle) {
        "use strict";
        function build(previous) {
          const merge = (old, extra, actions) => {
            const m = new Map(old.map((x) => [x.id, x]));
            for (const x of extra) {
              const before = m.get(x.id);
              m.set(x.id, actions && before ? {
                ...before,
                ...x,
                requirements: {
                  all: [
                    ...before.requirements ? [before.requirements] : [],
                    ...x.requirements ? [x.requirements] : []
                  ]
                }
              } : x);
            }
            return [...m.values()];
          };
          const version = "after-zero-next-03-wave3-r1";
          const candidateEvents = [...Horde.EVENTS, ...Remnant.EVENTS];
          const candidateActions = [...Horde.ACTIONS, ...Remnant.ACTIONS];
          const choiceBonuses = {
            "c42.hospital_record.recall": [{ type: "stat.add", key: "research", value: 15 }, { type: "item.add", key: "samples", value: 1 }],
            "donate": [{ type: "stat.add", key: "humanity", value: 6 }, { type: "stat.add", key: "trust", value: 6 }],
            "stay": [{ type: "stat.add", key: "research", value: 10 }, { type: "stat.add", key: "humanity", value: 5 }],
            "c40.clinic_reapproach.return_supplies": [{ type: "stat.add", key: "research", value: 12 }, { type: "stat.add", key: "trust", value: 8 }],
            "c40.clinic_reapproach.leave_at_door": [{ type: "stat.add", key: "research", value: 8 }, { type: "stat.add", key: "trust", value: 5 }],
            "c42.hospital_record.detach": [{ type: "stat.add", key: "mutation", value: 8 }],
            "c41.nest_intimidate_rival": [{ type: "stat.add", key: "mutation", value: 8 }],
            "c41.nest_commune_echo": [{ type: "stat.add", key: "horde", value: 10 }, { type: "stat.add", key: "mutation", value: 5 }],
            "c41.radio_jam_tower": [{ type: "stat.add", key: "campaign", value: 1 }, { type: "stat.add", key: "horde", value: 8 }],
            "c42.reunion_quiet.diverge": [{ type: "stat.add", key: "mutation", value: 8 }],
            "c42.reunion_quiet.truce": [{ type: "stat.add", key: "trust", value: 10 }, { type: "stat.add", key: "humanity", value: 6 }]
          };
          const mergedEvents = merge(previous.catalog.EVENTS, candidateEvents, false).map((ev) => ({
            ...ev,
            choices: (ev.choices || []).map((ch, idx) => {
              const key = ch.id || (ev.id === "next.recognition" && idx === 0 ? "stay" : null);
              const extra = key && choiceBonuses[key] ? choiceBonuses[key] : [];
              return extra.length ? { ...ch, effects: [...ch.effects || [], ...extra] } : ch;
            })
          }));
          const careAdjustments = {
            "c40.clinic_scavenge": [
              { type: "stat.add", key: "hp", value: 8 },
              { type: "stat.add", key: "sanity", value: 4 },
              { type: "stat.add", key: "hunger", value: -8 }
            ],
            "c40.clinic_perimeter_rest": [
              { type: "stat.add", key: "hp", value: 10 },
              { type: "stat.add", key: "sanity", value: 6 },
              { type: "stat.add", key: "hunger", value: -4 }
            ],
            "c42.shelter_backdoor": [
              { type: "stat.add", key: "hp", value: 12 },
              { type: "stat.add", key: "sanity", value: 8 },
              { type: "stat.add", key: "hunger", value: -5 }
            ]
          };
          const mergedActions = merge(previous.catalog.ACTIONS, candidateActions, true).map((act) => {
            if (careAdjustments[act.id]) {
              return { ...act, effects: careAdjustments[act.id] };
            }
            return act;
          });
          const catalog = K.snapshot({
            ...previous.catalog,
            CONTENT_VERSION: version,
            FLAGS: { ...previous.catalog.FLAGS, ...Horde.FLAGS, ...Remnant.FLAGS },
            NPCS: { ...previous.catalog.NPCS, ...Horde.NPCS, ...Remnant.NPCS },
            EVENTS: NpcRelationships.rebalanceRelationshipCatalog({EVENTS:mergedEvents}).EVENTS,
            ACTIONS: mergedActions,
            WORLD_CONTENT_EXTENSIONS: [
              ...previous.catalog.WORLD_CONTENT_EXTENSIONS,
              { version: 7, contentVersion: version, npcs: {} }
            ]
          });
          const raw = R.build({ Director }, catalog);
          function validate(value) {
            const current = value?.contentVersion === version;
            if (current) {
              if (value.world?.contentRevision !== 7 || value.story?.flags?.["next.initialized"] !== true) {
                throw Error("Invalid wave3 save");
              }
              const marker = value.story.flags["next.startProfile"];
              if (marker !== "legacy" && !previous.situation(value).profile) {
                throw Error("Unknown start profile");
              }
              if (!["rain", "patrol"].includes(value.story.flags["next.weather"]) || !["voice", "writing"].includes(value.story.flags["next.clue"])) {
                throw Error("Invalid starting context");
              }
            }
            return raw.validate(current ? value : previous.engine.validate(value));
          }
          function situation(s) {
            const base = previous.situation(s);
            const f = s.story?.flags || {};
            const c41Consequences = [
              f["c41.nest_route_open"] ? "\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E25\u0E31\u0E14\u0E1C\u0E48\u0E32\u0E19\u0E23\u0E31\u0E07\u0E43\u0E15\u0E49\u0E14\u0E34\u0E19\u0E16\u0E39\u0E01\u0E40\u0E1B\u0E34\u0E14\u0E2D\u0E2D\u0E01" : null,
              f["c41.outpost_saved"] ? "\u0E04\u0E48\u0E32\u0E22\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22\u0E2B\u0E25\u0E31\u0E07\u0E40\u0E08\u0E49\u0E32\u0E25\u0E48\u0E2D\u0E1D\u0E39\u0E07\u0E1E\u0E49\u0E19\u0E41\u0E19\u0E27\u0E23\u0E31\u0E49\u0E27" : null,
              f["c41.horde_held"] ? "\u0E40\u0E08\u0E49\u0E32\u0E40\u0E2B\u0E19\u0E35\u0E48\u0E22\u0E27\u0E23\u0E31\u0E49\u0E07\u0E1D\u0E39\u0E07\u0E44\u0E21\u0E48\u0E43\u0E2B\u0E49\u0E01\u0E25\u0E37\u0E19\u0E01\u0E34\u0E19\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E25\u0E32\u0E14\u0E15\u0E23\u0E30\u0E40\u0E27\u0E19" : null,
              f["c41.streets_breached"] ? "\u0E41\u0E19\u0E27\u0E01\u0E31\u0E49\u0E19\u0E1A\u0E19\u0E16\u0E19\u0E19\u0E16\u0E39\u0E01\u0E1E\u0E31\u0E07\u0E17\u0E30\u0E25\u0E27\u0E07\u0E14\u0E49\u0E27\u0E22\u0E01\u0E33\u0E25\u0E31\u0E07\u0E02\u0E2D\u0E07\u0E1D\u0E39\u0E07" : null,
              f["c41.patrol_scattered"] ? "\u0E2B\u0E19\u0E48\u0E27\u0E22\u0E25\u0E32\u0E14\u0E15\u0E23\u0E30\u0E40\u0E27\u0E19\u0E41\u0E15\u0E01\u0E41\u0E16\u0E27\u0E2B\u0E19\u0E35\u0E20\u0E31\u0E22\u0E04\u0E33\u0E23\u0E32\u0E21" : null,
              f["c41.radio_jammed"] ? "\u0E2A\u0E32\u0E22\u0E2D\u0E32\u0E01\u0E32\u0E28\u0E27\u0E34\u0E17\u0E22\u0E38\u0E16\u0E39\u0E01\u0E17\u0E33\u0E25\u0E32\u0E22 \u0E04\u0E25\u0E37\u0E48\u0E19\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E16\u0E39\u0E01\u0E15\u0E31\u0E14\u0E02\u0E32\u0E14" : null
            ].filter(Boolean);
            const c42Consequences = [
              f["c42.medical_recalled"] ? "\u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33\u0E40\u0E01\u0E35\u0E48\u0E22\u0E27\u0E01\u0E31\u0E1A\u0E41\u0E1F\u0E49\u0E21\u0E40\u0E27\u0E0A\u0E23\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E41\u0E08\u0E48\u0E21\u0E0A\u0E31\u0E14\u0E02\u0E36\u0E49\u0E19" : null,
              f["c42.past_detached"] ? "\u0E40\u0E08\u0E49\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E25\u0E30\u0E17\u0E34\u0E49\u0E07\u0E2D\u0E14\u0E35\u0E15\u0E41\u0E25\u0E30\u0E01\u0E49\u0E32\u0E27\u0E40\u0E14\u0E34\u0E19\u0E15\u0E48\u0E2D\u0E44\u0E1B" : null,
              f["c42.route_known"] ? "\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E25\u0E31\u0E14\u0E40\u0E25\u0E35\u0E48\u0E22\u0E07\u0E16\u0E19\u0E19\u0E43\u0E2B\u0E0D\u0E48\u0E16\u0E39\u0E01\u0E08\u0E14\u0E08\u0E33\u0E44\u0E14\u0E49" : null,
              f["c42.crossroad_fortified"] ? "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E20\u0E31\u0E22\u0E17\u0E35\u0E48\u0E2A\u0E35\u0E48\u0E41\u0E22\u0E01\u0E0A\u0E48\u0E27\u0E22\u0E43\u0E2B\u0E49\u0E1C\u0E39\u0E49\u0E23\u0E2D\u0E14\u0E0A\u0E35\u0E27\u0E34\u0E15\u0E23\u0E30\u0E27\u0E31\u0E07\u0E15\u0E31\u0E27" : null,
              f["c42.shelter_signaled"] ? "\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A\u0E08\u0E32\u0E01\u0E0A\u0E48\u0E2D\u0E07\u0E25\u0E21\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E01\u0E32\u0E23\u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E02\u0E2D\u0E07\u0E1C\u0E39\u0E49\u0E23\u0E2D\u0E14\u0E0A\u0E35\u0E27\u0E34\u0E15" : null,
              f["c42.truce_established"] ? "\u0E02\u0E49\u0E2D\u0E15\u0E01\u0E25\u0E07\u0E2A\u0E07\u0E1A\u0E28\u0E36\u0E01\u0E41\u0E25\u0E30\u0E23\u0E30\u0E22\u0E30\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22\u0E16\u0E39\u0E01\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E02\u0E36\u0E49\u0E19" : null,
              f["c42.shelter_fortified"] ? "\u0E17\u0E35\u0E48\u0E2B\u0E25\u0E1A\u0E20\u0E31\u0E22\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E1B\u0E01\u0E1B\u0E49\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E1D\u0E39\u0E07\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49" : null,
              f["c42.horde_diverted"] ? "\u0E1D\u0E39\u0E07\u0E0B\u0E2D\u0E21\u0E1A\u0E35\u0E49\u0E16\u0E39\u0E01\u0E40\u0E1A\u0E35\u0E48\u0E22\u0E07\u0E40\u0E1A\u0E19\u0E2D\u0E2D\u0E01\u0E44\u0E1B\u0E08\u0E32\u0E01\u0E41\u0E19\u0E27\u0E17\u0E35\u0E48\u0E2B\u0E25\u0E1A\u0E20\u0E31\u0E22" : null,
              f["c42.cache_looted"] ? "\u0E15\u0E39\u0E49\u0E22\u0E32\u0E41\u0E25\u0E30\u0E40\u0E27\u0E0A\u0E20\u0E31\u0E13\u0E11\u0E4C\u0E09\u0E38\u0E01\u0E40\u0E09\u0E34\u0E19\u0E16\u0E39\u0E01\u0E04\u0E49\u0E19\u0E19\u0E33\u0E21\u0E32\u0E43\u0E0A\u0E49\u0E41\u0E25\u0E49\u0E27" : null
            ].filter(Boolean);
            return {
              ...base,
              consequences: [...base.consequences, ...c41Consequences, ...c42Consequences]
            };
          }
          const candidateStoryActionIds = [
            ...Horde.ACTIONS.filter((a) => a.encounter).map((a) => a.id),
            ...Remnant.ACTIONS.filter((a) => a.encounter).map((a) => a.id)
          ];
          const storyActionIds = [...previous.storyActionIds || [], ...candidateStoryActionIds];
          const bundle = {
            ...previous,
            catalog,
            engine: {
              ...raw,
              create: (seed, options) => validate(previous.engine.create(seed, options)),
              validate
            },
            situation,
            storyActionIds
          };
          bundle.viewModel = (s, extras) => Presentation.build(bundle, s, extras);
          bundle.summarize = (s) => ({
            ...Chronicle.summarize(s),
            ...Summary.summarize(Presentation.summaryInput(s))
          });
          return bundle;
        }
        return { build };
      });
    }
  });

  // ../../tmp/after-zero-zombie/next/production.js
  var require_production = __commonJS({
    "../../tmp/after-zero-zombie/next/production.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory(require_runtime2(), require_start_candidates(), require_director2(), require_clinic_integration(), require_wave3_integration());
        else root.AfterZeroNextProduction = factory(root.AfterZeroNext, root.AfterZeroNextData.StartCandidates, root.AfterZeroNextSystems.Director, root.AfterZeroNextSupport.ClinicIntegration, root.AfterZeroNextSupport.Wave3Integration);
      })(typeof globalThis !== "undefined" ? globalThis : exports, function(N, Starts, Director, Clinic, Wave3) {
        "use strict";
        return Wave3.build(Clinic.build(N.build({ profiles: Starts.PROFILES, systems: { Director } })));
      });
    }
  });

  // ../../tmp/after-zero-zombie/ui/scene.js
  var require_scene = __commonJS({
    "../../tmp/after-zero-zombie/ui/scene.js"(exports, module) {
      (function(root, factory) {
        if (typeof module === "object" && module.exports) module.exports = factory();
        else root.ZombieScene = factory();
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        "use strict";
        function draw(canvas, state, frame = 0, options = {}) {
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.imageSmoothingEnabled = false;
          const color = { sky: "#14251f", back: "#1c3329", mid: "#284433", floor: "#2c4130", lime: "#c0e38b", window: "#92ad6b" };
          const rect = (x2, y2, w, h, c) => {
            ctx.fillStyle = c;
            ctx.fillRect(x2, y2, w, h);
          };
          rect(0, 0, 320, 144, color.sky);
          rect(235, 13, 16, 16, "#b7c58a");
          rect(231, 17, 24, 8, "#b7c58a");
          rect(235, 13, 8, 16, "#8d9d72");
          for (let i = 0; i < 17; i++) {
            const x2 = (i * 43 + 17) % 320, h = 18 + i * 19 % 48;
            rect(x2, 86 - h, 18 + i % 3 * 9, h, color.back);
            if (i % 2 === 0) rect(x2 + 4, 87 - h, 3, 3, "#496645");
          }
          if (state.place.startsWith("bkk_")) {
            const colors = {bkk_winstop:'#d79557',bkk_market:'#bf7772',bkk_ward:'#89b5be',bkk_power:'#d0b85d',bkk_depot:'#a3b968',bkk_cafe:'#aa8b73',bkk_office:'#9b89b3',bkk_pier:'#829da5',bkk_stockroom:'#ba8aa2',bkk_busyard:'#7d9fba'};
            const accent = colors[state.place];
            rect(121,36,177,88,'#2b443a'); rect(126,41,167,7,accent);
            rect(135,57,28,35,'#132b23'); rect(178,57,28,35,'#739789'); rect(225,57,57,35,'#132b23');
            if (['bkk_market','bkk_cafe','bkk_stockroom'].includes(state.place)) {
              rect(129,97,158,21,'#665345'); for(let i=0;i<5;i++) rect(136+i*28,83,19,14,accent);
            } else if (['bkk_winstop','bkk_busyard'].includes(state.place)) {
              rect(150,82,131,34,accent); rect(159,86,98,13,'#254239'); rect(163,111,15,12,'#15241e'); rect(254,111,15,12,'#15241e');
            } else if (state.place === 'bkk_pier') {
              rect(103,112,217,32,'#234e53'); rect(123,105,170,8,'#8b7753'); for(let i=0;i<5;i++)rect(118+i*36,125,22,2,'#65968e');
            } else if (state.place === 'bkk_ward') {
              rect(212,52,6,27,'#d3e0c2'); rect(201,62,28,6,'#d3e0c2'); rect(133,99,80,12,'#a5bab0');
            } else if (state.place === 'bkk_depot') {
              rect(147,91,45,27,accent); rect(209,87,5,36,'#b3b99a'); rect(195,119,30,5,'#99855b');
            } else {
              for(let i=0;i<3;i++){rect(137+i*47,83,35,23,accent);rect(142+i*47,87,25,13,'#284b40');}
            }
          } else if (state.place === "shelter") {
            rect(0, 14, 93, 109, "#2b392a");
            rect(3, 14, 87, 6, "#40513a");
            rect(13, 42, 46, 40, "#0d1913");
            rect(16, 45, 40, 32, "#456044");
            rect(34, 45, 3, 32, "#12241a");
            rect(16, 59, 40, 3, "#12241a");
            rect(160, 38, 147, 86, "#23372a");
            rect(164, 42, 139, 5, "#3b523a");
            rect(180, 68, 29, 44, "#0d1d14");
            rect(184, 71, 21, 39, "#354633");
            rect(199, 90, 2, 2, "#c4c27c");
            rect(243, 84, 44, 26, "#33422f");
            rect(245, 82, 40, 5, "#596347");
            rect(256, 63, 13, 17, "#ced1a0");
            rect(259, 67, 7, 9, "#697d54");
          } else if (state.place === "hospital") {
            rect(130, 17, 176, 106, "#46665a");
            rect(134, 21, 168, 5, "#6f9280");
            rect(190, 75, 46, 48, "#19362d");
            rect(211, 77, 3, 46, "#5d9b88");
            rect(143, 38, 24, 27, "#92b8a0");
            rect(247, 38, 40, 26, "#284d42");
            rect(251, 42, 32, 18, "#89ab92");
            rect(201, 29, 8, 25, "#d4dcb0");
            rect(193, 37, 24, 8, "#d4dcb0");
            rect(101, 80, 16, 42, "#45604b");
            rect(105, 74, 8, 8, "#9bd2a3");
          } else if (state.place === "nest") {
            rect(107, 35, 190, 89, "#2b3b30");
            rect(117, 45, 170, 79, "#0b1710");
            rect(125, 52, 154, 7, "#526249");
            rect(139, 59, 126, 65, "#14261b");
            for (let i = 0; i < 5; i++) {
              rect(158 + i * 21, 113 - i * 4, 21, 5, "#3b4f37");
            }
            for (let i = 0; i < 8; i++) {
              const x2 = 141 + i * 18;
              rect(x2, 94 + i % 2 * 6, 5, 9, "#74905f");
              rect(x2 - 1, 103 + i % 2 * 6, 7, 14, "#34452c");
              rect(x2 + 1, 97 + i % 2 * 6, 1, 1, "#d7df91");
            }
          } else if (state.place === "radio") {
            rect(228, 13, 4, 111, "#829574");
            for (let i = 0; i < 6; i++) {
              rect(211 + i * 3, 105 - i * 16, 37 - i * 6, 3, "#657b5a");
            }
            rect(217, 8, 26, 2, "#94ac7f");
            rect(230, 3, 2, 9, "#dda579");
            rect(124, 71, 75, 52, "#2e4a36");
            rect(128, 75, 67, 5, "#4f6a46");
            rect(145, 91, 21, 32, "#101f17");
            rect(175, 86, 13, 12, "#a1ae71");
            for (let i = 0; i < 3; i++) rect(242 + i * 9, 18 + i * 5, 2, 7, "#6f8962");
          } else {
            rect(115, 40, 72, 82, "#304a37");
            rect(119, 45, 64, 5, "#516746");
            rect(123, 59, 20, 28, "#152d20");
            rect(153, 58, 24, 29, "#a3ae75");
            rect(153, 72, 24, 3, "#47583e");
            rect(206, 57, 91, 67, "#28402f");
            rect(212, 66, 79, 8, "#536346");
            rect(218, 83, 29, 40, "#13271a");
            rect(257, 83, 29, 18, "#76895b");
            rect(98, 31, 3, 93, "#82916b");
            rect(96, 30, 18, 4, "#617b56");
            rect(108, 33, 6, 4, "#e0d597");
            rect(244, 114, 44, 13, "#475a3b");
            rect(252, 109, 22, 8, "#596b49");
            rect(249, 124, 6, 7, "#101b13");
            rect(277, 124, 6, 7, "#101b13");
          }
          rect(0, 123, 320, 21, color.floor);
          rect(0, 123, 320, 2, "#6b7850");
          for (let i = 0; i < 36; i++) {
            rect(i * 37 % 320, 128 + i * 11 % 14, 3 + i % 3 * 2, 1, i % 2 ? "#43543a" : "#61704a");
          }
          if (!options.hideCharacter) {
          const x = 65, y = 86, breathe = frame % 6 < 3 ? 0 : 1;
          rect(x - 7, y + 44, 28, 3, "#132219");
          rect(x, y + 30, 6, 15, "#303b2a");
          rect(x + 11, y + 30, 6, 15, "#303b2a");
          rect(x - 2, y + 43, 8, 3, "#101d14");
          rect(x + 11, y + 43, 9, 3, "#101d14");
          rect(x - 3, y + 15 + breathe, 23, 20, "#697a43");
          rect(x + 2, y + 17 + breathe, 5, 18, "#8e9856");
          rect(x + 11, y + 22 + breathe, 3, 5, "#293822");
          rect(x - 7, y + 17 + breathe, 5, 17, "#869a5b");
          rect(x + 20, y + 17 + breathe, 5, 17, "#869a5b");
          rect(x, y + 1 + breathe, 18, 17, "#9cb473");
          rect(x + 3, y - 2 + breathe, 13, 5, "#344b31");
          rect(x - 2, y + 5 + breathe, 3, 9, "#7e985e");
          rect(x + 5, y + 8 + breathe, 3, 3, frame % 29 === 0 ? "#7c925c" : "#172b1b");
          rect(x + 13, y + 8 + breathe, 3, 3, frame % 29 === 0 ? "#7c925c" : "#172b1b");
          rect(x + 9, y + 14 + breathe, 6, 2, "#435a39");
          if (state.stats.mutation >= 45) {
            rect(x + 16, y - 4, 4, 8, "#d0d69b");
            rect(x - 4, y + 8, 3, 6, "#c4ce92");
          }
          }
          if (state.stats.horde >= 45) {
            for (let i = 0; i < 3; i++) {
              const a = 23 + i * 14;
              rect(a, 107, 6, 7, "#7e965d");
              rect(a - 1, 114, 8, 14, "#344b31");
            }
          }
          for (let i = 0; i < 9; i++) {
            const a = (i * 39 + frame) % 320;
            rect(a, 30 + i * 17 % 70, 1, 1, "#697f55");
          }
          if (state.stats.sanity <= 20) {
            rect(0, 0, 320, 2, "#ad7855");
            rect(0, 142, 320, 2, "#ad7855");
          }
        }
        return { draw };
      });
    }
  });

  // ../../tmp/after-zero-entry.js
  var require_after_zero_entry = __commonJS({
    "../../tmp/after-zero-entry.js"(exports, module) {
      var Production = require_production();
      var Scene = require_scene();
      if (typeof window !== "undefined") {
        window.AfterZeroEngine = { Production, Scene };
      }
      module.exports = { Production, Scene };
    }
  });
  require_after_zero_entry();
})();
