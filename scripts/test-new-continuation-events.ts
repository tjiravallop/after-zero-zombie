import assert from 'node:assert/strict';
import {
  evaluateEventCondition,
  buildLifeSimModalFromDynamicTemplate,
  DYNAMIC_NARRATIVE_EVENTS,
  type EventEvaluationContext,
} from '../src/data/eventEngine';

console.log('--- เริ่มการทดสอบ 8 เหตุการณ์ต่อเนื่องระหว่างเล่น (AFTER ZERO) ---');

const baseBio: any = { id: 'bio-test-1', occupation: 'ช่างซ่อมบำรุง' };

function createContext(overrides: {
  day?: number;
  place?: string;
  flags?: Record<string, any>;
  npcs?: Record<string, any>;
  stats?: Record<string, number>;
  items?: Record<string, number>;
  triggeredEventIds?: string[];
}): EventEvaluationContext {
  return {
    gameState: {
      day: overrides.day || 5,
      place: overrides.place || 'shelter',
      story: { flags: overrides.flags || {} },
      world: {
        npcs: overrides.npcs || {},
        locations: {
          shelter: { threat: 20 },
          hospital: { threat: 30 },
          streets: { threat: 40 },
        },
      },
      stats: overrides.stats || { hp: 80, hunger: 30, sanity: 60, humanity: 50 },
      items: overrides.items || { supplies: 2, medicine: 2 },
    },
    currentBio: baseBio,
    currentZoneAverageTrust: 40,
    currentZoneLivingCount: 5,
    pastLives: [],
    allZonePopulations: {},
    triggeredEventIds: overrides.triggeredEventIds || [],
  };
}

// -----------------------------------------------------------------------------
// 1. สายอิง (Din Daeng Shelter)
// -----------------------------------------------------------------------------
const eventIng1 = DYNAMIC_NARRATIVE_EVENTS.find(e => e.id === 'dyn_ing_chalk_letter_grate')!;
const eventIng2 = DYNAMIC_NARRATIVE_EVENTS.find(e => e.id === 'dyn_ing_window_vigil_signal')!;

assert(eventIng1, 'ต้องพบอีเวนต์ dyn_ing_chalk_letter_grate');
assert(eventIng2, 'ต้องพบอีเวนต์ dyn_ing_window_vigil_signal');
assert.equal(eventIng1.advanceDay, false);
assert.equal(eventIng2.advanceDay, false);

// 1.1 Test Ing 1: Matches when bond & returned true and Ing is ally
{
  const ctx = createContext({
    day: 5,
    place: 'shelter',
    flags: { 'next.bond': true, 'next.returned': true },
    npcs: { 'next.ing': { alive: true, state: 'ally', trust: 70 } },
  });
  const res = evaluateEventCondition(eventIng1.conditions, ctx);
  assert.equal(res.matched, true, 'ต้องผ่านเงื่อนไขเมื่อมี bond, returned และอิงเป็น ally');
  console.log('✓ 1.1 ผ่าน: ฉากอิง 1 เกิดเมื่อผ่าน next.return และอิงเป็น ally');
}

// 1.2 Test Ing 1: Does NOT trigger if Ing is gone or dead
{
  const ctxGone = createContext({
    day: 5,
    place: 'shelter',
    flags: { 'next.bond': true, 'next.returned': true },
    npcs: { 'next.ing': { alive: true, state: 'gone', trust: 0 } },
  });
  assert.equal(evaluateEventCondition(eventIng1.conditions, ctxGone).matched, false);

  const ctxDead = createContext({
    day: 5,
    place: 'shelter',
    flags: { 'next.bond': true, 'next.returned': true },
    npcs: { 'next.ing': { alive: false, state: 'ally', trust: 70 } },
  });
  assert.equal(evaluateEventCondition(eventIng1.conditions, ctxDead).matched, false);
  console.log('✓ 1.2 ผ่าน: ฉากอิง 1 ไม่เกิดถ้าอิง gone หรือ dead');
}

// 1.3 Test Ing 2: Matches only after Ing 1 completed
{
  const ctxBefore1 = createContext({
    day: 8,
    place: 'shelter',
    flags: { 'next.returned': true },
    npcs: { 'next.ing': { alive: true, state: 'ally', trust: 70 } },
  });
  assert.equal(evaluateEventCondition(eventIng2.conditions, ctxBefore1).matched, false, 'ต้องไม่เกิดถ้ายังไม่ผ่านฉากที่ 1');

  const ctxAfter1 = createContext({
    day: 8,
    place: 'shelter',
    flags: { 'next.returned': true, ing_letter_grate_done: true },
    npcs: { 'next.ing': { alive: true, state: 'ally', trust: 70 } },
  });
  assert.equal(evaluateEventCondition(eventIng2.conditions, ctxAfter1).matched, true);
  console.log('✓ 1.3 ผ่าน: ฉากอิง 2 เกิดต่อเนื่องหลังจากผ่านฉากที่ 1 เท่านั้น');
}

// -----------------------------------------------------------------------------
// 2. สายนวล (Hospital)
// -----------------------------------------------------------------------------
const eventNuanHelped = DYNAMIC_NARRATIVE_EVENTS.find(e => e.id === 'dyn_nuan_antiseptic_relay')!;
const eventNuanRaided = DYNAMIC_NARRATIVE_EVENTS.find(e => e.id === 'dyn_nuan_barricade_confrontation')!;

assert(eventNuanHelped, 'ต้องพบอีเวนต์ dyn_nuan_antiseptic_relay');
assert(eventNuanRaided, 'ต้องพบอีเวนต์ dyn_nuan_barricade_confrontation');

// 2.1 Test Nual Helped route: Matches when next.helped and ally
{
  const ctx = createContext({
    day: 6,
    place: 'hospital',
    flags: { 'next.helped': true },
    npcs: { 'next.nuan': { alive: true, state: 'ally', trust: 65 } },
  });
  assert.equal(evaluateEventCondition(eventNuanHelped.conditions, ctx).matched, true);
  assert.equal(evaluateEventCondition(eventNuanRaided.conditions, ctx).matched, false, 'สายนวลช่วยคนต้องไม่เจอฉากประจันหน้าแนวกั้น');
  console.log('✓ 2.1 ผ่าน: สายนวลช่วยคน เกิดฉากกล่องสำลีชุบยา และไม่ชนกับฉากกบฏ/ปล้น');
}

// 2.2 Test Nual Raided route: Matches when next.raided and hostile
{
  const ctx = createContext({
    day: 6,
    place: 'hospital',
    flags: { 'next.raided': true },
    npcs: { 'next.nuan': { alive: true, state: 'hostile', trust: 0 } },
  });
  assert.equal(evaluateEventCondition(eventNuanRaided.conditions, ctx).matched, true);
  assert.equal(evaluateEventCondition(eventNuanHelped.conditions, ctx).matched, false, 'สายนวลถูกปล้นต้องไม่เจอฉากสำลี');
  console.log('✓ 2.2 ผ่าน: สายนวลถูกปล้นเลือด เกิดฉากประจันหน้าแนวกั้นอย่างถูกต้อง');
}

// -----------------------------------------------------------------------------
// 3. สายเครื่องปั่นไฟและหมอวิชัย (Hospital)
// -----------------------------------------------------------------------------
const eventGenRepaired = DYNAMIC_NARRATIVE_EVENTS.find(e => e.id === 'dyn_generator_repaired_aftermath')!;
const eventGenFailed = DYNAMIC_NARRATIVE_EVENTS.find(e => e.id === 'dyn_generator_failed_aftermath')!;

assert(eventGenRepaired, 'ต้องพบอีเวนต์ dyn_generator_repaired_aftermath');
assert(eventGenFailed, 'ต้องพบอีเวนต์ dyn_generator_failed_aftermath');

// 3.1 Test Generator Repaired: Matches when clinic.generator_running is true
{
  const ctx = createContext({
    day: 5,
    place: 'hospital',
    flags: { 'clinic.generator_running': true },
    npcs: { 'clinic.dr_wichai': { alive: true, state: 'friendly' } },
  });
  assert.equal(evaluateEventCondition(eventGenRepaired.conditions, ctx).matched, true);
  assert.equal(evaluateEventCondition(eventGenFailed.conditions, ctx).matched, false);
  console.log('✓ 3.1 ผ่าน: ซ่อมเครื่องปั่นไฟสำเร็จ เกิดฉากเครื่องดีเซลใต้ถุน');
}

// 3.2 Test Generator Failed / Stolen: Matches when clinic.blood_stolen is true
{
  const ctx = createContext({
    day: 5,
    place: 'hospital',
    flags: { 'clinic.blood_stolen': true },
  });
  assert.equal(evaluateEventCondition(eventGenFailed.conditions, ctx).matched, true);
  assert.equal(evaluateEventCondition(eventGenRepaired.conditions, ctx).matched, false);
  console.log('✓ 3.2 ผ่าน: ขโมยเลือด/ไฟดับ เกิดฉากซากตู้แช่ดับสนิท');
}

// -----------------------------------------------------------------------------
// 4. สายครัวคลองเตย (Streets / bkk_market)
// -----------------------------------------------------------------------------
const eventKitchenHelped = DYNAMIC_NARRATIVE_EVENTS.find(e => e.id === 'dyn_khlongtoei_kitchen_hearth')!;
const eventKitchenUnhelped = DYNAMIC_NARRATIVE_EVENTS.find(e => e.id === 'dyn_khlongtoei_kitchen_unhelped')!;

assert(eventKitchenHelped, 'ต้องพบอีเวนต์ dyn_khlongtoei_kitchen_hearth');
assert(eventKitchenUnhelped, 'ต้องพบอีเวนต์ dyn_khlongtoei_kitchen_unhelped');

// 4.1 Test Kitchen Helped: Matches when bkk_market.helped is true
{
  const ctx = createContext({
    day: 5,
    place: 'streets',
    flags: { 'bkk_market.helped': true },
  });
  assert.equal(evaluateEventCondition(eventKitchenHelped.conditions, ctx).matched, true);
  assert.equal(evaluateEventCondition(eventKitchenUnhelped.conditions, ctx).matched, false, 'คนที่ช่วยครัวแล้วต้องไม่เจอฉากระแวง');
  console.log('✓ 4.1 ผ่าน: เคยช่วยงานครัวคลองเตย เกิดฉากที่นั่งว่างข้างเตาฟืน');
}

// 4.2 Test Kitchen Unhelped: Matches when bkk_market.helped is false/missing
{
  const ctx = createContext({
    day: 5,
    place: 'streets',
    flags: {}, // ไม่เคยช่วยงานครัว
  });
  assert.equal(evaluateEventCondition(eventKitchenUnhelped.conditions, ctx).matched, true);
  assert.equal(evaluateEventCondition(eventKitchenHelped.conditions, ctx).matched, false, 'คนที่ยังไม่เคยช่วยต้องไม่เจอฉากที่นั่งว่าง');
  console.log('✓ 4.2 ผ่าน: ยังไม่เคยช่วยงานครัว เกิดฉากแววตาระแวงหลังกระสอบข้าว');
}

// -----------------------------------------------------------------------------
// 5. Choices & OutcomeText Verification
// -----------------------------------------------------------------------------
{
  const allNewEvents = [
    eventIng1, eventIng2,
    eventNuanHelped, eventNuanRaided,
    eventGenRepaired, eventGenFailed,
    eventKitchenHelped, eventKitchenUnhelped,
  ];

  for (const ev of allNewEvents) {
    assert(ev.choices.length >= 2 && ev.choices.length <= 3, `${ev.id} ต้องมี 2-3 ตัวเลือก (มี ${ev.choices.length})`);
    for (const ch of ev.choices) {
      assert(ch.text && ch.text.length > 5, `${ev.id} ตัวเลือกต้องมีข้อความ`);
      assert(ch.note && ch.note.length > 3, `${ev.id} ตัวเลือกต้องมี note`);
      assert(typeof ch.outcomeText === 'string' && ch.outcomeText.length > 15, `${ev.id} ตัวเลือกต้องมี outcomeText`);
    }
    const modal = buildLifeSimModalFromDynamicTemplate(ev, createContext({}));
    assert.equal(modal.advanceDay, false, `${ev.id} ต้องไม่ข้ามวันโดยไม่ตั้งใจ`);
  }
  console.log('✓ 5 ผ่าน: ทุกฉากมี 2-3 ตัวเลือก, มี outcomeText ละเอียด, และ advanceDay เป็น false');
}

console.log('\n======================================================');
console.log('การทดสอบทั้ง 8 เหตุการณ์ต่อเนื่องผ่านครบถ้วนสมบูรณ์ 100%!');
console.log('======================================================');
