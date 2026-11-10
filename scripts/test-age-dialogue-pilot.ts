import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildLifeSimModalFromDynamicTemplate, DYNAMIC_NARRATIVE_EVENTS } from '../src/data/eventEngine';
import {
  applyLifeSimModalEffectsToState,
  buildFreeformNpcInteractionModal,
  createInitialZonePopulations,
  DANGER_HUMAN_ATTACK_SCENARIOS,
  getProactiveAllyNpcAidModal,
} from '../src/data/pastLifeEchoes';
import { resolveAgeDialogue, resolveAgeGroupTier, resolveLifeSimOutcomeForAge, resolvePendingEventForAge } from '../src/data/ageDialogue';
import { generateCharacter, createCharacterState } from '../src/data/characterPool';

console.log('====================================================');
console.log('RUNNING AGE-AWARE DIALOGUE PILOT TEST SUITE');
console.log('====================================================\n');

// 1. Load engine bundle in Node environment
const bundlePath = path.resolve('public/after-zero-bundle.js');
const bundleCode = fs.readFileSync(bundlePath, 'utf8');

// Set up minimal browser-like globals for the bundle
(globalThis as any).window = globalThis;
new Function(bundleCode)();

const P = (globalThis as any).AfterZeroEngine?.Production;
assert(P, 'AfterZeroEngine.Production must be initialized');

const PILOT_EVENT_IDS = [
  'prey',
  'returned',
  'shop',
  'doctor',
  'next.clinic',
  'c42.reunion_quiet',
] as const;

console.log('--- TEST 1: Age tier classification boundary test ---');
assert.equal(resolveAgeGroupTier(10), 'child');
assert.equal(resolveAgeGroupTier(12), 'child');
assert.equal(resolveAgeGroupTier(13), 'teen');
assert.equal(resolveAgeGroupTier(19), 'teen');
assert.equal(resolveAgeGroupTier(20), 'adult');
assert.equal(resolveAgeGroupTier(59), 'adult');
assert.equal(resolveAgeGroupTier(60), 'elder');
assert.equal(resolveAgeGroupTier(80), 'elder');
assert.equal(resolveAgeGroupTier(undefined), 'adult', 'undefined age must fallback to adult neutral');
assert.equal(resolveAgeGroupTier(null), 'adult', 'null age must fallback to adult neutral');
assert.equal(resolveAgeGroupTier(NaN), 'adult', 'NaN age must fallback to adult neutral');
console.log('✓ Age tier boundaries passed.\n');

console.log('--- TEST 2: Distinct Child (10–12) dialogue variants ---');
for (const evId of PILOT_EVENT_IDS) {
  const childText = resolveAgeDialogue({ eventId: evId, field: 'text' }, 11);
  const adultText = resolveAgeDialogue({ eventId: evId, field: 'text' }, 35);
  assert.notEqual(childText, adultText, `Event ${evId} child text must differ from adult text`);

  if (evId === 'prey') {
    assert(childText.includes('เด็ก... งั้นเหรอ?'), 'prey child text must have child nuance');
  } else if (evId === 'returned') {
    assert(childText.includes('ตอนนั้นขอบใจมากนะหนู'), 'returned child text must have child nuance');
  } else if (evId === 'shop') {
    assert(childText.includes('ร่างรุ่นราวคราวเดียวกัน'), 'shop child text must have child peer nuance');
  } else if (evId === 'doctor') {
    assert(childText.includes('หนู... ถ้ายังเข้าใจที่ฉันพูด'), 'doctor child text must address child safely');
  } else if (evId === 'next.clinic') {
    assert(childText.includes('อย่าเข้ามานะหนู... ถอยออกไป...'), 'next.clinic child text must reflect nurse hesitation');
  } else if (evId === 'c42.reunion_quiet') {
    assert(childText.includes('เธอ... ยังจำตัวเองได้งั้นเหรอ'), 'c42 child text must reflect Mali hesitation');
  }
}
console.log('✓ All 6 child dialogue variants verified distinct and lore-appropriate.\n');

console.log('--- TEST 3: Distinct Elder (60–80) dialogue variants ---');
for (const evId of PILOT_EVENT_IDS) {
  const elderText = resolveAgeDialogue({ eventId: evId, field: 'text' }, 70);
  const adultText = resolveAgeDialogue({ eventId: evId, field: 'text' }, 35);
  const childText = resolveAgeDialogue({ eventId: evId, field: 'text' }, 11);

  assert.notEqual(elderText, adultText, `Event ${evId} elder text must differ from adult text`);
  assert.notEqual(elderText, childText, `Event ${evId} elder text must differ from child text`);

  if (evId === 'prey') {
    assert(elderText.includes('คนชราที่ควรได้รับการช่วยเหลือ'), 'prey elder text must have elder nuance');
  } else if (evId === 'returned') {
    assert(elderText.includes('ขอบคุณที่ช่วยพวกเราไว้ในวันนั้นนะครับ'), 'returned elder text must have polite respectful phrasing');
  } else if (evId === 'shop') {
    assert(elderText.includes('เห็นร่างชราที่ผิวแตกลาย'), 'shop elder text must have child seeing elder zombie');
  } else if (evId === 'doctor') {
    assert(elderText.includes('ถ้าคุณยังรับรู้ได้ วางตัวอย่างไว้ตรงช่องส่งของ'), 'doctor elder text must use respectful address');
  } else if (evId === 'next.clinic') {
    assert(elderText.includes('อย่าก้าวเข้ามาอีกเลยค่ะ... ฉันไม่อยากยิง'), 'next.clinic elder text must reflect nurse conflict');
  } else if (evId === 'c42.reunion_quiet') {
    assert(elderText.includes('คุณ... ยังมีสติอยู่ใช่ไหม'), 'c42 elder text must address elder respectfully');
  }
}

// Critical check: next.clinic must retain shared blood stock and depletion notice across ALL ages
const clinicSharedStockText = 'เลือดในตู้นี้คือเลือดแหล่งเดียวกับที่เจ้าพบในธนาคารเลือด ทุกถุงที่ใช้จะหมดไปจริง';
for (const age of [11, 16, 35, 70]) {
  const clinicText = resolveAgeDialogue({ eventId: 'next.clinic', field: 'text' }, age);
  assert(
    clinicText.includes(clinicSharedStockText),
    `next.clinic (age ${age}) must retain shared blood stock notice for fair gameplay decision`
  );
}
console.log('✓ All 6 elder dialogue variants verified distinct and lore-appropriate.');
console.log('✓ next.clinic shared blood stock statement verified across all age tiers.\n');

console.log('--- TEST 4: Adult (20–59) & Teen (13–19) canonical baseline parity ---');
for (const evId of PILOT_EVENT_IDS) {
  const defaultText = resolveAgeDialogue({ eventId: evId, field: 'text' }, 30);
  const teenText = resolveAgeDialogue({ eventId: evId, field: 'text' }, 16);
  assert.equal(teenText, defaultText, `Event ${evId} teen must use canonical baseline`);

  const eventInCatalog = P.catalog.EVENTS.find((e: any) => e.id === evId);
  assert(eventInCatalog, `Event ${evId} must exist in catalog`);
  if (evId !== 'prey') {
    assert.equal(defaultText, eventInCatalog.text, `Event ${evId} default must match catalog text`);
  }
}
console.log('✓ Adult and teen clean baseline parity verified.\n');

console.log('--- TEST 5: Fallback safety for missing age / legacy saves ---');
for (const evId of PILOT_EVENT_IDS) {
  const missingAgeText = resolveAgeDialogue({ eventId: evId, field: 'text' }, undefined);
  const nullAgeText = resolveAgeDialogue({ eventId: evId, field: 'text' }, null);
  const adultText = resolveAgeDialogue({ eventId: evId, field: 'text' }, 35);

  assert.equal(missingAgeText, adultText, `Event ${evId} missing age must cleanly fall back to adult text`);
  assert.equal(nullAgeText, adultText, `Event ${evId} null age must cleanly fall back to adult text`);
}
console.log('✓ Legacy save fallback safety verified.\n');

console.log('--- TEST 6: Gender neutrality test ---');
for (const evId of PILOT_EVENT_IDS) {
  const maleChildBio = generateCharacter(12345, { age: 11, gender: 'ชาย' });
  const femaleChildBio = generateCharacter(12345, { age: 11, gender: 'หญิง' });
  const maleText = resolveAgeDialogue({ eventId: evId, field: 'text' }, maleChildBio.age);
  const femaleText = resolveAgeDialogue({ eventId: evId, field: 'text' }, femaleChildBio.age);
  assert.equal(maleText, femaleText, `Event ${evId} dialogue must not discriminate by gender`);

  const maleElderBio = generateCharacter(12345, { age: 68, gender: 'ชาย' });
  const femaleElderBio = generateCharacter(12345, { age: 68, gender: 'หญิง' });
  const maleElderText = resolveAgeDialogue({ eventId: evId, field: 'text' }, maleElderBio.age);
  const femaleElderText = resolveAgeDialogue({ eventId: evId, field: 'text' }, femaleElderBio.age);
  assert.equal(maleElderText, femaleElderText, `Event ${evId} elder dialogue must not discriminate by gender`);
}
console.log('✓ Gender neutrality verified.\n');

console.log('--- TEST 7: Dynamic scene prefix preservation in prey ---');
const scenePrefix = 'ชายอีกคนกุมแผลอยู่หลังซากรถเมล์';
const childPrey = resolveAgeDialogue({ eventId: 'prey', field: 'text' }, 10, '', { scenePrefix });
const elderPrey = resolveAgeDialogue({ eventId: 'prey', field: 'text' }, 75, '', { scenePrefix });
const adultPrey = resolveAgeDialogue({ eventId: 'prey', field: 'text' }, 28, '', { scenePrefix });

assert(childPrey.startsWith(scenePrefix), 'child prey must preserve dynamic scene prefix');
assert(elderPrey.startsWith(scenePrefix), 'elder prey must preserve dynamic scene prefix');
assert(adultPrey.startsWith(scenePrefix), 'adult prey must preserve dynamic scene prefix');
console.log('✓ Dynamic scene prefix preservation verified.\n');

console.log('--- TEST 8: Full Engine Runtime Parity & Invariance ---');
// Verify engine pendingEvent resolution for all 6 events with Child vs Elder vs Adult
for (const age of [11, 35, 70]) {
  const bio = generateCharacter(99999, { age, gender: 'ชาย' });
  for (const evId of PILOT_EVENT_IDS) {
    const state = createCharacterState(P, bio, 123);
    state.pending = { instanceId: 'inst_1', eventId: evId, turn: true };

    const pending = P.engine.pendingEvent(state);
    assert(pending, `Engine pendingEvent must return event for ${evId}`);
    assert.equal(pending.id, evId);

    const expectedText = resolveAgeDialogue(
      { eventId: evId, field: 'text' },
      age,
      undefined,
      state.pending.context
    );
    assert.equal(pending.text, expectedText, `Engine pendingEvent text for ${evId} (age ${age}) must match resolved age dialogue`);

    // Verify viewModel output matches
    const vm = P.viewModel(state);
    assert(vm.pending, `ViewModel must have pending for ${evId}`);
    assert.equal(vm.pending.text, expectedText, `ViewModel pending text for ${evId} (age ${age}) must match resolved age dialogue`);
  }
}
console.log('✓ Engine pendingEvent & ViewModel integration verified.\n');

console.log('--- TEST 9: Mechanics, Choices, Costs, and Effects Invariance ---');
// Choice effects, costs, requirements, and tags must remain identical between ages
for (const evId of PILOT_EVENT_IDS) {
  const childBio = generateCharacter(11111, { age: 11, gender: 'หญิง' });
  const adultBio = generateCharacter(22222, { age: 35, gender: 'ชาย' });
  const elderBio = generateCharacter(33333, { age: 72, gender: 'หญิง' });

  const childState = createCharacterState(P, childBio, 456);
  childState.pending = { instanceId: 'inst_test', eventId: evId, turn: true };
  const elderState = createCharacterState(P, elderBio, 456);
  elderState.pending = { instanceId: 'inst_test', eventId: evId, turn: true };

  const childEvent = P.engine.pendingEvent(childState);
  const elderEvent = P.engine.pendingEvent(elderState);

  assert.equal(childEvent.choices.length, elderEvent.choices.length, `Choices count for ${evId} must be equal`);
  for (let i = 0; i < childEvent.choices.length; i++) {
    const c1 = childEvent.choices[i];
    const c2 = elderEvent.choices[i];
    assert.equal(c1.id, c2.id, `Choice ${i} id must be identical`);
    assert.equal(c1.text, c2.text, `Choice ${i} text must be identical`);
    assert.equal(c1.note, c2.note, `Choice ${i} note must be identical`);
    assert.deepEqual(c1.cost, c2.cost, `Choice ${i} cost must be identical`);
    assert.deepEqual(c1.effects, c2.effects, `Choice ${i} effects must be identical`);
    assert.deepEqual(c1.requirements, c2.requirements, `Choice ${i} requirements must be identical`);
  }
}
console.log('✓ Choices, costs, effects, and mechanics invariance verified 100%.\n');

console.log('--- TEST 10: Integrated writer content and choice transitions ---');
const expansion = JSON.parse(fs.readFileSync('src/data/age-dialogue/expansion.json', 'utf8'));
const comparisonBio = generateCharacter(99999, { age: 35 });
let successfulTransitions = 0;
for (const family of ['engine', 'travel', 'route']) {
  for (const [eventId, entry] of Object.entries(expansion[family]) as [string, any][]) {
    const state = createCharacterState(P, comparisonBio, 123);
    const fromPlace = Object.keys(P.catalog.PLACES).find(place => place !== state.place)!;
    const turnId = state.runId + ':turn:' + (state.completedDays + 1);
    state.lifecycle.activeTurn = turnId;
    state.pending = { instanceId: 'writer_check', eventId, turn: true, turnId, actionApplied: true, context: { fromPlace } };
    const event = P.catalog.EVENTS.find((candidate: any) => candidate.id === eventId);
    assert(event, eventId);
    const prefix = family === 'travel'
      ? 'ระหว่างทางจาก' + P.catalog.PLACES[fromPlace].short + ' มุ่งหน้าสู่' + P.catalog.PLACES[state.place].short + ' — '
      : '';
    for (const [age, tier] of [[11, 'child'], [16, 'teen'], [35, 'adult'], [70, 'elder'], [undefined, 'adult']] as const) {
      const sample = structuredClone(state);
      if (age === undefined) delete sample.characterProfile.age;
      else sample.characterProfile.age = age;
      assert.equal(P.viewModel(sample).pending.text, prefix + (entry.text.variants[tier] ?? event.text), eventId);
    }
    for (const [choiceId, choiceText] of Object.entries(entry.choices ?? {}) as [string, any][]) {
      const choice = event.choices.find((candidate: any) => candidate.id === choiceId);
      assert(choice, choiceId);
      const key = { sourceFamily: family, eventId, choiceId, field: 'choices.outcomeText' };
      assert.equal(resolveAgeDialogue(key, 11, choice.outcomeText), choiceText.outcomeText.variants.child);
      assert.equal(resolveAgeDialogue(key, 70, choice.outcomeText), choiceText.outcomeText.variants.elder);
      assert.equal(resolveAgeDialogue(key, undefined, choice.outcomeText), choice.outcomeText);
    }
    for (let index = 0; index < event.choices.length; index++) {
      const resolve = (age: number) => {
        const sample = structuredClone(state);
        sample.characterProfile.age = age;
        const result = P.engine.choose(sample, index, state.pending.instanceId);
        delete sample.characterProfile.age;
        return { result, sample };
      };
      const adult = resolve(35);
      if (adult.result.ok) successfulTransitions++;
      assert.deepEqual(resolve(11), adult, eventId + ' child choice ' + index);
      assert.deepEqual(resolve(70), adult, eventId + ' elder choice ' + index);
    }
  }
}
assert(successfulTransitions > 0, 'At least one choice must actually resolve');
for (const [eventId, entry] of Object.entries(expansion.dynamic) as [string, any][]) {
  const template = DYNAMIC_NARRATIVE_EVENTS.find(candidate => candidate.id === eventId);
  if (!entry.text) continue;
  assert(template && typeof template.text === 'string', eventId);
  const key = { sourceFamily: 'dynamic', eventId, field: 'text' };
  assert.equal(resolveAgeDialogue(key, 11, template.text), entry.text.variants.child);
  assert.equal(resolveAgeDialogue(key, 70, template.text), entry.text.variants.elder);
  assert.equal(resolveAgeDialogue(key, undefined, template.text), template.text);
}
console.log('✓ Writer A/B/C coverage and ' + successfulTransitions + ' successful engine choice transitions verified.');


console.log('--- TEST 11: Round 2 NPC reactions, dynamic outcomes, and ambush display ---');
const roundTwoState = createCharacterState(P, comparisonBio, 123);
roundTwoState.pending = null;
roundTwoState.stats.hunger = 80;
roundTwoState.stats.sanity = 25;
roundTwoState.stats.mutation = 55;
roundTwoState.items.medicine = 5;
roundTwoState.items.supplies = 5;
const zones = createInitialZonePopulations(123);
const zone = zones.shelter;
const ally = zone.npcs.find(npc => npc.alive)!;
assert(ally);
ally.trust = 65;
const profiles = [11, 35, 70, undefined].map(age => {
  const sample = structuredClone(roundTwoState);
  if (age === undefined) delete sample.characterProfile.age;
  else sample.characterProfile.age = age;
  return sample;
});
const meetings = profiles.map(state => buildFreeformNpcInteractionModal(zone, state, comparisonBio, ally.id));
const aid = profiles.map(state => getProactiveAllyNpcAidModal(zone, state, []));
for (const [modals, eventId] of [[meetings, 'freeformEncounter'], [aid, 'proactiveAllyAid']] as const) {
  const [child, adult, elder, missing] = modals;
  assert(child && adult && elder && missing, eventId);
  assert.notEqual(child.text, adult.text);
  assert.notEqual(elder.text, adult.text);
  assert.equal(missing.text, adult.text);
  assert.deepEqual(child.choices, adult.choices);
  assert.deepEqual(elder.choices, adult.choices);
  if (eventId === 'freeformEncounter') {
    const neutralBranches = adult.text.slice(adult.text.indexOf('[ความหิวพุ่งสูง'));
    assert(neutralBranches.includes('[สติพร่าเลือน'));
    assert(child.text.endsWith(neutralBranches));
    assert(elder.text.endsWith(neutralBranches));
  } else {
    assert(child.text.includes(ally.name) && child.text.includes('65/100'));
    assert(!/\{(?:name|role|trust|placeName)\}/.test(child.text));
  }
}

let dynamicOutcomeCount = 0;
for (const [eventId, entry] of Object.entries(expansion.dynamic) as [string, any][]) {
  if (!entry.choices) continue;
  const template = DYNAMIC_NARRATIVE_EVENTS.find(candidate => candidate.id === eventId)!;
  const modal = buildLifeSimModalFromDynamicTemplate(template, {
    gameState: roundTwoState,
    currentBio: comparisonBio,
    allZonePopulations: zones,
    currentZoneAverageTrust: 65,
    currentZoneLivingCount: zone.npcs.length,
    pastLives: [],
    triggeredEventIds: [],
  });
  for (const [choiceId, choiceEntry] of Object.entries(entry.choices) as [string, any][]) {
    const index = modal.choices.findIndex(choice => choice.id === choiceId);
    const choice = modal.choices[index];
    assert(choice?.enabled, choiceId);
    const key = { sourceFamily: 'dynamic', eventId, choiceId, field: 'choices.outcomeText' };
    assert.equal(resolveAgeDialogue(key, 11, choice.outcomeText), choiceEntry.outcomeText.variants.child);
    assert.equal(resolveAgeDialogue(key, 70, choice.outcomeText), choiceEntry.outcomeText.variants.elder);
    assert.equal(resolveAgeDialogue(key, undefined, choice.outcomeText), choice.outcomeText);
    const results = profiles.slice(0, 3).map(state => {
      const result = applyLifeSimModalEffectsToState(structuredClone(state), modal, index, { currentBio: comparisonBio });
      delete result.characterProfile.age;
      return result;
    });
    assert.deepEqual(results[0], results[1], choiceId);
    assert.deepEqual(results[2], results[1], choiceId);
    dynamicOutcomeCount++;
  }
}
assert.equal(dynamicOutcomeCount, 22);
const attack = DANGER_HUMAN_ATTACK_SCENARIOS.find(scenario => scenario.id === 'danger-attack-03-moto-chain')!;
const attackKey = { sourceFamily: 'hazard', eventId: attack.id, field: 'description' };
assert.notEqual(resolveAgeDialogue(attackKey, 11, attack.description), attack.description);
assert.notEqual(resolveAgeDialogue(attackKey, 70, attack.description), attack.description);
assert.equal(resolveAgeDialogue(attackKey, undefined, attack.description), attack.description);
console.log('✓ NPC and ambush fallbacks and 22 dynamic choice transitions verified.');


console.log('--- TEST 12: Writer A posture and outcome integration ---');
const merchant = { ...ally, role: 'พ่อค้า', trust: 65 };
const merchantZone = { ...zone, npcs: [merchant] };
const calmState = structuredClone(profiles[0]);
calmState.stats.sanity = 80;
calmState.stats.hunger = 20;
const buildMeeting = (age: number, trust: number, tense = false) => {
  const state = structuredClone(calmState);
  state.characterProfile.age = age;
  const npc = { ...merchant, trust };
  if (tense) npc.relationship = { version: 1, history: [], evidence: 0, tensionUntil: state.day + 1, boundaryAcknowledged: false, rescues: [] };
  return buildFreeformNpcInteractionModal({ ...merchantZone, npcs: [npc] }, state, comparisonBio, npc.id)!;
};
const postureCases = [
  [65, true, 'posture_tier0_tense_behavior'],
  [30, false, 'posture_tier2_cautious_behavior'],
  [55, false, 'posture_tier3_receptive_behavior'],
  [80, false, 'posture_tier4_cooperative_behavior'],
] as const;
for (const [trust, tense, dialogueId] of postureCases) {
  const adult = buildMeeting(35, trust, tense);
  for (const [age, tier] of [[11, 'child'], [70, 'elder']] as const) {
    const modal = buildMeeting(age, trust, tense);
    assert(modal.text.includes(expansion.npc[dialogueId].text.variants[tier]), dialogueId);
    assert.deepEqual(modal.choices, adult.choices, dialogueId);
  }
}
const calmMeeting = buildMeeting(35, 65);
assert(!buildMeeting(11, 10).choices.some(choice => choice.id === 'lifesim_choice_greet'));
assert(!meetings[0]?.choices.some(choice => choice.id === 'lifesim_choice_greet'));
for (const id of ['lifesim_choice_greet', 'lifesim_choice_barter_supplies', 'lifesim_choice_leave_peacefully']) {
  const choice = calmMeeting.choices.find(choice => choice.id === id);
  assert(choice?.enabled, id);
  for (const [age, tier] of [[11, 'child'], [70, 'elder']] as const) {
    assert.equal(resolveLifeSimOutcomeForAge(calmMeeting.id, id, age), expansion.npc.freeformEncounter.choices[id].outcomeText.variants[tier]);
  }
  assert.equal(resolveLifeSimOutcomeForAge(calmMeeting.id, id, undefined), '');
}
const aidChoice = aid[0]?.choices[0];
assert.equal(aidChoice?.id, 'ally_aid_choice_accept');
const aidOutcome = resolveLifeSimOutcomeForAge(aid[0]!.id, aidChoice!.id, 11, ally.name);
assert(aidOutcome.includes(ally.name) && !aidOutcome.includes('{name}'));
assert.equal(resolveLifeSimOutcomeForAge(aid[0]!.id, aidChoice!.id, 11), '');
console.log('✓ Four posture variants and four choice outcomes verified.');


console.log('--- TEST 13: NPC crisis outcome variants preserve conditional suffixes ---');
const aidCases = [
  ['lifesim_choice_rescue_target', 'ติดอยู่ใต้ซากเหล็ก', ''],
  ['lifesim_choice_give_supplies', 'อดอาหาร', ' แต่คนข้างในมีอาหารประทังชีวิตแล้ว'],
  ['lifesim_choice_give_medicine', 'แผลติดเชื้อ', ' อันตรายจากแผลได้รับการดูแลแล้ว แต่เขายังต้องพักฟื้น'],
] as const;
for (const [id, crisisText, suffix] of aidCases) {
  const npc = { ...merchant, crisisText, crisisDay: 1, crisisResolved: false };
  const crisisZone = { ...merchantZone, npcs: [npc] };
  const outcomes = [11, 35, 70].map(age => {
    const state = structuredClone(calmState);
    state.characterProfile.age = age;
    const modal = buildFreeformNpcInteractionModal(crisisZone, state, comparisonBio, npc.id)!;
    const index = modal.choices.findIndex(choice => choice.id === id);
    const choice = modal.choices[index];
    assert(choice?.enabled, id);
    assert(choice.effects.resolveNpcCrisis, id);
    assert.equal(choice.outcomeSuffix ?? '', suffix);
    assert(choice.outcomeText.endsWith(suffix));
    const text = resolveLifeSimOutcomeForAge(modal.id, id, age, npc.name, choice.outcomeSuffix);
    const tier = resolveAgeGroupTier(age);
    const expected = expansion.npc.freeformEncounter.choices[id].outcomeText.variants[tier];
    assert.equal(text, expected ? expected + suffix : '', id);
    const result = applyLifeSimModalEffectsToState(state, modal, index, { currentBio: comparisonBio });
    delete result.characterProfile.age;
    return { result, canonicalOutcome: choice.outcomeText };
  });
  assert.deepEqual(outcomes[0], outcomes[1], id);
  assert.deepEqual(outcomes[2], outcomes[1], id);
  if (suffix) {
    const regular = calmMeeting.choices.find(choice => choice.id === id)!;
    assert.equal(regular.outcomeSuffix, '');
    assert(!regular.effects.resolveNpcCrisis);
    assert(!resolveLifeSimOutcomeForAge(calmMeeting.id, id, 11, npc.name, regular.outcomeSuffix).endsWith(suffix));
  }
}
console.log('✓ Rescue, supplies, and medicine outcomes preserve game state and crisis-specific text.');


console.log('--- TEST 14: Remaining NPC posture and outcomes ---');
for (const armed of [false, true]) {
  const branch = armed ? 'armed' : 'unarmed';
  for (const trust of [10, 80]) {
    const npc = { ...merchant, role: armed ? 'ทหาร' : 'พ่อค้า', trait: 'ระวังตัว', trust, crisisResolved: true };
    const npcs = { ...merchantZone, npcs: [npc] };
    const build = (age: number) => {
      const state = structuredClone(calmState);
      state.characterProfile.age = age;
      return buildFreeformNpcInteractionModal(npcs, state, comparisonBio, npc.id)!;
    };
    const adult = build(35);
    for (const [age, tier] of [[11, 'child'], [70, 'elder']] as const) {
      const modal = build(age);
      assert.deepEqual(modal.choices, adult.choices);
      if (trust === 10) {
        assert(modal.text.includes(expansion.npc['posture_tier1_armed_or_unarmed_behavior_' + branch].text.variants[tier]));
      }
      const breachId = 'lifesim_choice_breach_approach_' + branch;
      assert.equal(modal.choices.find(choice => choice.id === breachId)?.effects.hp, armed ? -5 : -2);
      assert.equal(modal.choices.find(choice => choice.id === 'lifesim_choice_hunt_target')?.effects.hp, armed ? -12 : -5);
      if (trust === 80) assert(modal.choices.find(choice => choice.id === 'lifesim_choice_signature_work')?.enabled);
      for (const id of [breachId, 'lifesim_choice_hunt_target', 'lifesim_choice_signature_work']) {
        assert.equal(resolveLifeSimOutcomeForAge(modal.id, id, age), expansion.npc.freeformEncounter.choices[id].outcomeText.variants[tier]);
        assert.equal(resolveLifeSimOutcomeForAge(modal.id, id, undefined), '');
      }
    }
  }
}
console.log('✓ Both weapon branches and all three outcome lookups verified.');

console.log('ALL 14 AGE-AWARE DIALOGUE TESTS PASSED SUCCESSFULLY!');
console.log('====================================================');
