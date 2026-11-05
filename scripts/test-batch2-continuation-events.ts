import { evaluateEventCondition, EventEvaluationContext, DYNAMIC_NARRATIVE_EVENTS, DynamicNarrativeEventTemplate } from '../src/data/eventEngine';
import { COMMUNITY_DYNAMIC_EVENTS } from '../src/data/communityEvents';
import { CharacterBioDossier, ZoneNpc, ZonePopulationState } from '../src/data/pastLifeEchoes';

console.log('--- เริ่มการทดสอบ 12 เหตุการณ์ต่อเนื่องชุดที่สอง (AFTER ZERO) ---');

function makeBaseContext(overrides: Partial<any> = {}): EventEvaluationContext {
  const gameState: any = {
    day: overrides.day ?? 10,
    place: overrides.place ?? 'shelter',
    stats: {
      hp: 100,
      hunger: 20,
      sanity: 80,
      humanity: 50,
      mutation: 30,
      horde: 10,
      research: 10,
      ...(overrides.stats || {}),
    },
    items: {
      supplies: 3,
      medicine: 2,
      samples: 2,
      ...(overrides.items || {}),
    },
    memory: {
      killed: 0,
      saved: 0,
      ...(overrides.memory || {}),
    },
    story: {
      flags: { ...(overrides.flags || {}) },
    },
    world: {
      locations: {
        shelter: { threat: 20 },
        streets: { threat: 25 },
        hospital: { threat: 30 },
        tower: { threat: 20 },
        radio: { threat: 20 },
        nest: { threat: 40 },
        bkk_busyard: { threat: 20 },
        bkk_cafe: { threat: 15 },
        bkk_market: { threat: 20 },
        bkk_stockroom: { threat: 20 },
      },
      npcs: { ...(overrides.npcs || {}) },
    },
    carriedBloodBags: overrides.carriedBloodBags ?? 0,
  };

  const currentZonePop: ZonePopulationState = {
    placeId: gameState.place,
    placeName: gameState.place,
    initialTotalPopulation: overrides.zoneNpcs?.length || 0,
    unmetAnonymousSurvivors: 0,
    npcs: overrides.zoneNpcs || [],
  };

  const allZonePopulations: Record<string, ZonePopulationState> = {
    [gameState.place]: currentZonePop,
  };

  return {
    gameState,
    currentBio: { id: 'bio_default' } as unknown as CharacterBioDossier,
    currentZonePop,
    allZonePopulations,
    currentZoneAverageTrust: 50,
    currentZoneLivingCount: 5,
    pastLives: [],
    triggeredEventIds: overrides.triggeredEchoIds || [],
  };
}

const batch2Ids = [
  'dyn_nest_hive_resonance_directive',
  'dyn_nest_enzyme_analysis_discovery',
  'dyn_hunter_reformed_distrust_shadow',
  'dyn_hunter_intimidated_empty_corridor',
  'dyn_tower_depot_approach_perimeter',
  'dyn_tower_broadcast_frequency_echo',
  'dyn_somjit_wound_healed_gratitude',
  'dyn_somjit_fever_wound_festering',
  'dyn_bus_driver_log_legacy',
  'dyn_bus_salvaged_depot_remnant',
  'dyn_travel_awning_distant_glance',
  'dyn_travel_awning_raincoat_hasty_path',
];

// Test 0: All 12 events registered and structured correctly
for (const id of batch2Ids) {
  const ev = COMMUNITY_DYNAMIC_EVENTS.find(e => e.id === id);
  if (!ev) throw new Error(`ไม่พบอีเวนต์ ${id} ใน COMMUNITY_DYNAMIC_EVENTS`);
  if (!ev.title) throw new Error(`อีเวนต์ ${id} ไม่มีชื่อ`);
  if (!ev.text) throw new Error(`อีเวนต์ ${id} ไม่มีเนื้อหา`);
  if (!ev.choices || ev.choices.length < 2 || ev.choices.length > 3) {
    throw new Error(`อีเวนต์ ${id} ต้องมี 2-3 ตัวเลือก (พบ ${ev.choices?.length})`);
  }
  if (ev.advanceDay !== false) {
    throw new Error(`อีเวนต์ ${id} ต้องไม่ข้ามวันโดยไม่ตั้งใจ (advanceDay ต้องเป็น false)`);
  }
  if (ev.oncePerLife !== true) {
    throw new Error(`อีเวนต์ ${id} ต้องเป็น oncePerLife = true`);
  }
  for (let i = 0; i < ev.choices.length; i++) {
    const ch = ev.choices[i];
    if (!ch.outcomeText) {
      throw new Error(`อีเวนต์ ${id} ตัวเลือกที่ ${i} ไม่มี outcomeText`);
    }
  }
}
console.log('✓ ข้อ 0 ผ่าน: ครบทั้ง 12 เหตุการณ์, มี 2-3 ตัวเลือก, มี outcomeText, advanceDay=false, oncePerLife=true');

// Test 1: Origin 1 - Hive Synapse
const ev1_1 = COMMUNITY_DYNAMIC_EVENTS.find(e => e.id === 'dyn_nest_hive_resonance_directive')!;
const ev1_2 = COMMUNITY_DYNAMIC_EVENTS.find(e => e.id === 'dyn_nest_enzyme_analysis_discovery')!;

// 1.1 Directive: Requires hive_synapse_connected
const ctx1_ok = makeBaseContext({ day: 12, place: 'nest', flags: { hive_synapse_connected: true } });
const res1_ok = evaluateEventCondition(ev1_1.conditions, ctx1_ok);
if (!res1_ok.matched) throw new Error(`1.1 ล้มเหลว: ควรเกิดเมื่อเชื่อมต่อรังแล้ว (${res1_ok.unmetReasons.join(', ')})`);

const ctx1_no = makeBaseContext({ day: 12, place: 'nest', flags: { hive_synapse_sampled: true } });
const res1_no = evaluateEventCondition(ev1_1.conditions, ctx1_no);
if (res1_no.matched) throw new Error(`1.1 ล้มเหลว: ไม่ควรเกิดถ้าไม่ได้เชื่อมต่อรัง`);

// 1.2 Enzyme: Requires hive_synapse_sampled
const ctx2_ok = makeBaseContext({ day: 12, place: 'hospital', flags: { hive_synapse_sampled: true } });
const res2_ok = evaluateEventCondition(ev1_2.conditions, ctx2_ok);
if (!res2_ok.matched) throw new Error(`1.2 ล้มเหลว: ควรเกิดเมื่อสกัดเอนไซม์ (${res2_ok.unmetReasons.join(', ')})`);

const ctx2_no = makeBaseContext({ day: 12, place: 'hospital', flags: { hive_synapse_connected: true } });
const res2_no = evaluateEventCondition(ev1_2.conditions, ctx2_no);
if (res2_no.matched) throw new Error(`1.2 ล้มเหลว: ไม่ควรเกิดถ้าไม่ได้เก็บตัวอย่าง`);
console.log('✓ ข้อ 1 ผ่าน: สายรังใต้ดินแยกผลการเชื่อมต่อฝูงกับการเก็บตัวอย่างเอนไซม์อย่างถูกต้อง');

// Test 2: Origin 2 - Hunter Reputation
const ev2_1 = COMMUNITY_DYNAMIC_EVENTS.find(e => e.id === 'dyn_hunter_reformed_distrust_shadow')!;
const ev2_2 = COMMUNITY_DYNAMIC_EVENTS.find(e => e.id === 'dyn_hunter_intimidated_empty_corridor')!;

const ctxHunterReformed = makeBaseContext({ day: 7, place: 'shelter', flags: { hunter_reputation_reformed: true } });
if (!evaluateEventCondition(ev2_1.conditions, ctxHunterReformed).matched) throw new Error('2.1 ล้มเหลว: สายกลับตัวควรเกิด');
if (evaluateEventCondition(ev2_2.conditions, ctxHunterReformed).matched) throw new Error('2.1 ล้มเหลว: สายกลับตัวต้องไม่เกิดฉากข่มขู่');

const ctxHunterIntimidated = makeBaseContext({ day: 7, place: 'streets', flags: { hunter_reputation_intimidated: true } });
if (!evaluateEventCondition(ev2_2.conditions, ctxHunterIntimidated).matched) throw new Error('2.2 ล้มเหลว: สายข่มขู่ควรเกิด');
if (evaluateEventCondition(ev2_1.conditions, ctxHunterIntimidated).matched) throw new Error('2.2 ล้มเหลว: สายข่มขู่ต้องไม่เกิดฉากกลับตัว');
console.log('✓ ข้อ 2 ผ่าน: สายนักล่าแยกผลการพยายามกลับตัวกับการใช้ความกลัวอย่างชัดเจน');

// Test 3: Origin 3 - Tower Blackbox
const ev3_1 = COMMUNITY_DYNAMIC_EVENTS.find(e => e.id === 'dyn_tower_depot_approach_perimeter')!;
const ev3_2 = COMMUNITY_DYNAMIC_EVENTS.find(e => e.id === 'dyn_tower_broadcast_frequency_echo')!;

// 3.1 Depot approach requires tower_decrypted_depot and day >= 12
const ctxTowerDepot = makeBaseContext({ day: 14, place: 'hospital', flags: { tower_decrypted_depot: true } });
if (!evaluateEventCondition(ev3_1.conditions, ctxTowerDepot).matched) throw new Error('3.1 ล้มเหลว: สายถอดรหัสพิกัดควรเกิด');

const ctxTowerRadioPlace = makeBaseContext({ day: 14, place: 'radio', flags: { tower_decrypted_depot: true } });
if (!evaluateEventCondition(ev3_1.conditions, ctxTowerRadioPlace).matched) throw new Error('3.1 ล้มเหลว: รองรับสถานที่ radio/tower');

// 3.2 Broadcast frequency echo
const ctxTowerWarned = makeBaseContext({ day: 13, place: 'tower', flags: { tower_warned_survivors: true } });
if (!evaluateEventCondition(ev3_2.conditions, ctxTowerWarned).matched) throw new Error('3.2 ล้มเหลว: สายเตือนภัยผู้รอดชีวิตควรเกิด');

const ctxTowerStimulated = makeBaseContext({ day: 13, place: 'tower', flags: { tower_stimulated_horde: true } });
if (!evaluateEventCondition(ev3_2.conditions, ctxTowerStimulated).matched) throw new Error('3.2 ล้มเหลว: สายกระตุ้นฝูงควรเกิด');

const ctxTowerNeither = makeBaseContext({ day: 13, place: 'tower', flags: {} });
if (evaluateEventCondition(ev3_2.conditions, ctxTowerNeither).matched) throw new Error('3.2 ล้มเหลว: ต้องไม่เกิดถ้ายังไม่ได้เลือกสายวิทยุ');
console.log('✓ ข้อ 3 ผ่าน: สายหอวิทยุรองรับ radio/tower และแยกการติดตามผลตามตัวเลือกอย่างถูกต้อง');

// Test 4: Origin 4 - Somjit
const ev4_1 = COMMUNITY_DYNAMIC_EVENTS.find(e => e.id === 'dyn_somjit_wound_healed_gratitude')!;
const ev4_2 = COMMUNITY_DYNAMIC_EVENTS.find(e => e.id === 'dyn_somjit_fever_wound_festering')!;

const somjitAlive: ZoneNpc = {
  id: 'somjit_1',
  name: 'ป้าสมจิตร์',
  age: 58,
  lastNote: '',
  placeId: 'shelter',
  role: 'แม่ค้าอาหารตามสั่งเก่า',
  trait: 'ใจดี',
  trust: 20,
  alive: true,
  met: true,
};

const somjitDead: ZoneNpc = {
  ...somjitAlive,
  alive: false,
};

// 4.1 Wound healed
const ctxSomjitHealed = makeBaseContext({
  day: 8,
  place: 'shelter',
  flags: { somjit_wound_treated: true },
  zoneNpcs: [somjitAlive],
});
if (!evaluateEventCondition(ev4_1.conditions, ctxSomjitHealed).matched) throw new Error('4.1 ล้มเหลว: ป้าสมจิตร์แผลหายควรเกิด');

// Somjit dead -> must not trigger
const ctxSomjitDead = makeBaseContext({
  day: 8,
  place: 'shelter',
  flags: { somjit_wound_treated: true },
  zoneNpcs: [somjitDead],
});
if (evaluateEventCondition(ev4_1.conditions, ctxSomjitDead).matched) throw new Error('4.1 ล้มเหลว: ป้าสมจิตร์ตายแล้วต้องไม่เกิด');

// 4.2 Food given but wound remains
const ctxSomjitFoodOnly = makeBaseContext({
  day: 8,
  place: 'shelter',
  flags: { somjit_food_given_unhealed: true },
  zoneNpcs: [somjitAlive],
});
if (!evaluateEventCondition(ev4_2.conditions, ctxSomjitFoodOnly).matched) throw new Error('4.2 ล้มเหลว: ให้อาหารแต่แผลยังอักเสบควรเกิด');

// If wound was already treated, 4.2 must NOT trigger
const ctxSomjitBothFlags = makeBaseContext({
  day: 8,
  place: 'shelter',
  flags: { somjit_food_given_unhealed: true, somjit_wound_treated: true },
  zoneNpcs: [somjitAlive],
});
if (evaluateEventCondition(ev4_2.conditions, ctxSomjitBothFlags).matched) throw new Error('4.2 ล้มเหลว: รักษาแผลแล้วต้องไม่เกิดฉากแผลอักเสบซ้ำ');
console.log('✓ ข้อ 4 ผ่าน: สายป้าสมจิตร์แยกแผลหายกับแผลอักเสบ และไม่เกิดหากป้าเสียชีวิต');

// Test 5: Origin 5 - Minibus Log
const ev5_1 = COMMUNITY_DYNAMIC_EVENTS.find(e => e.id === 'dyn_bus_driver_log_legacy')!;
const ev5_2 = COMMUNITY_DYNAMIC_EVENTS.find(e => e.id === 'dyn_bus_salvaged_depot_remnant')!;

const ctxBusLog = makeBaseContext({
  day: 95,
  place: 'bkk_busyard',
  flags: { bus_read_driver_log: true, roam_late_depleted_d90: true },
});
if (!evaluateEventCondition(ev5_1.conditions, ctxBusLog).matched) throw new Error('5.1 ล้มเหลว: สายอ่านสมุดควรเกิด');
if (evaluateEventCondition(ev5_2.conditions, ctxBusLog).matched) throw new Error('5.1 ล้มเหลว: สายอ่านสมุดต้องไม่เกิดฉากกล่องยาเปล่า');

const ctxBusSalvaged = makeBaseContext({
  day: 95,
  place: 'bkk_busyard',
  flags: { bus_salvaged_firstaid: true, roam_late_depleted_d90: true },
});
if (!evaluateEventCondition(ev5_2.conditions, ctxBusSalvaged).matched) throw new Error('5.2 ล้มเหลว: สายรื้อกล่องยาควรเกิด');
if (evaluateEventCondition(ev5_1.conditions, ctxBusSalvaged).matched) throw new Error('5.2 ล้มเหลว: สายรื้อกล่องยาต้องไม่เกิดฉากอ่านสมุด');

// Out of deadline (> 104)
const ctxBusLate = makeBaseContext({
  day: 110,
  place: 'bkk_busyard',
  flags: { bus_read_driver_log: true },
});
if (evaluateEventCondition(ev5_1.conditions, ctxBusLate).matched) throw new Error('5.1 ล้มเหลว: เลยวันกำหนดต้องไม่เกิด');
console.log('✓ ข้อ 5 ผ่าน: สายรถมินิบัสแยกผลอ่านสมุดกับการรื้อยาชัดเจน และเคารพเส้นตายของเมือง');

// Test 6: Origin 6 - Travel Rain Awning
const ev6_1 = COMMUNITY_DYNAMIC_EVENTS.find(e => e.id === 'dyn_travel_awning_distant_glance')!;
const ev6_2 = COMMUNITY_DYNAMIC_EVENTS.find(e => e.id === 'dyn_travel_awning_raincoat_hasty_path')!;

const ctxAwningWaited = makeBaseContext({
  day: 7,
  place: 'streets',
  flags: { travel_rain_awning_waited: true },
});
if (!evaluateEventCondition(ev6_1.conditions, ctxAwningWaited).matched) throw new Error('6.1 ล้มเหลว: สายหยุดรักษาระยะควรเกิด');
if (evaluateEventCondition(ev6_2.conditions, ctxAwningWaited).matched) throw new Error('6.1 ล้มเหลว: สายหยุดรักษาระยะต้องไม่เกิดฉากเดินหนี');

const ctxAwningSignaled = makeBaseContext({
  day: 7,
  place: 'bkk_market',
  flags: { travel_rain_awning_signaled: true },
});
if (!evaluateEventCondition(ev6_2.conditions, ctxAwningSignaled).matched) throw new Error('6.2 ล้มเหลว: สายส่งสัญญาณแล้วเดินต่อควรเกิด');
if (evaluateEventCondition(ev6_1.conditions, ctxAwningSignaled).matched) throw new Error('6.2 ล้มเหลว: สายส่งสัญญาณต้องไม่เกิดฉากพยักหน้ารับรู้');

const ctxAwningLeft = makeBaseContext({
  day: 7,
  place: 'shelter',
  flags: { travel_rain_awning_left: true },
});
if (!evaluateEventCondition(ev6_2.conditions, ctxAwningLeft).matched) throw new Error('6.2 ล้มเหลว: สายจากไปเงียบๆ ควรเกิด');

console.log('✓ ข้อ 6 ผ่าน: สายชายคาที่แบ่งกันใช้สะท้อนพฤติกรรมการรักษาระยะและการไม่ล้ำเส้นอย่างถูกต้อง');

console.log('\n========================================================================');
console.log('การทดสอบทั้ง 12 เหตุการณ์ต่อเนื่องชุดที่สอง ผ่านครบถ้วนสมบูรณ์ 100%!');
console.log('========================================================================');
