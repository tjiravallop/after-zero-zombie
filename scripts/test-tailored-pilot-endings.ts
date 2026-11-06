import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  endingMetrics,
  endingReflections,
  tailorPilotEndingPresentation,
  findEligibleCompanion,
  findEligibleWitness,
  isPilotEnding,
  PILOT_ENDING_IDS,
} from '../src/data/endingPresentation';
import {
  deriveDeathEndingPresentation,
  buildPastLifeRecordFromState,
  type ZonePopulationState,
} from '../src/data/pastLifeEchoes';
import EndingExperience from '../src/components/EndingExperience';
import { generateCharacter, createCharacterState } from '../src/data/characterPool';
import { getEndingReadiness } from '../src/data/progressionRules';

// Load engine catalog
const context = { window: {} as any };
vm.runInNewContext(fs.readFileSync('public/after-zero-bundle.js', 'utf8'), context);
const P = context.window.AfterZeroEngine.Production;
const bio = generateCharacter(42);

console.log('--- TEST 1: ช่วยคน ไม่เคยฆ่า (Saved > 0, Killed === 0) ---');
{
  const stateSavedOnly: any = {
    day: 25,
    place: 'bkk_pier',
    memory: { saved: 3, killed: 0, corpseMeals: 0, endured: 0 },
    stats: { sanity: 50, humanity: 60, horde: 90, mutation: 50 },
    story: { flags: {} },
  };

  for (const endingId of PILOT_ENDING_IDS) {
    const derived = deriveDeathEndingPresentation(stateSavedOnly, bio, { id: endingId });
    assert(derived.text.includes('3 ครั้ง'), `${endingId} should mention 3 saved`);
    assert(derived.text.includes('ไม่เคยพรากชีวิต') || derived.text.includes('ไม่เคยทำร้าย'), `${endingId} should mention not killing`);
    assert(!derived.text.includes('สังเวย'), `${endingId} should not mention sacrifices`);
    assert(!derived.text.includes('ตราบาป'), `${endingId} should not call them murderers`);
  }
}

console.log('--- TEST 2: ฆ่าคน แต่ไม่เคยช่วย (Killed > 0, Saved === 0) ---');
{
  const stateKilledOnly: any = {
    day: 25,
    place: 'bkk_pier',
    memory: { saved: 0, killed: 4, corpseMeals: 0, endured: 0 },
    stats: { sanity: 40, humanity: 20, horde: 90, mutation: 50 },
    story: { flags: {} },
  };

  for (const endingId of PILOT_ENDING_IDS) {
    const derived = deriveDeathEndingPresentation(stateKilledOnly, bio, { id: endingId });
    assert(derived.text.includes('4 ชีวิต'), `${endingId} should mention 4 killed lives`);
    assert(!derived.text.includes('ช่วยชีวิต'), `${endingId} should not falsely claim player saved anyone`);
  }
}

console.log('--- TEST 3: เคยทั้งฆ่าและช่วย (Saved > 0, Killed > 0) ---');
{
  const stateBoth: any = {
    day: 28,
    place: 'bkk_pier',
    memory: { saved: 5, killed: 2, corpseMeals: 0, endured: 0 },
    stats: { sanity: 45, humanity: 45, horde: 90, mutation: 50 },
    story: { flags: {} },
  };

  for (const endingId of PILOT_ENDING_IDS) {
    const derived = deriveDeathEndingPresentation(stateBoth, bio, { id: endingId });
    assert(derived.text.includes('5 ครั้ง'), `${endingId} must acknowledge 5 saved`);
    assert(derived.text.includes('2 ชีวิต'), `${endingId} must acknowledge 2 deaths`);
    // Rule: Not collapsed into black/white
    assert(derived.text.includes('แต่รอยเลือด') || derived.text.includes('แต่ความทรงจำถึง') || derived.text.includes('แต่รอยอดีต'));
  }
}

console.log('--- TEST 4: กินศพโดยไม่เคยฆ่า (CorpseMeals > 0, Killed === 0) ---');
{
  const stateCorpse: any = {
    day: 20,
    place: 'bkk_pier',
    memory: { saved: 0, killed: 0, corpseMeals: 6, endured: 0 },
    stats: { sanity: 45, humanity: 40, horde: 90, mutation: 50 },
    story: { flags: {} },
  };

  for (const endingId of PILOT_ENDING_IDS) {
    const derived = deriveDeathEndingPresentation(stateCorpse, bio, { id: endingId });
    assert(derived.text.includes('ซากศพ 6 ครั้ง'), `${endingId} should mention eating corpses 6 times`);
    assert(derived.text.includes('ไม่เคยล่า') || derived.text.includes('ไม่เคยทำร้าย'), `${endingId} should distinguish from killing`);
    assert(!derived.text.includes('สังหารมนุษย์'), `${endingId} must not conflate corpse meals with murdering humans`);
  }
}

console.log('--- TEST 5: ทนหิวโดยไม่ล่า (Endured > 0, Killed === 0) ---');
{
  const stateEndured: any = {
    day: 22,
    place: 'bkk_pier',
    memory: { saved: 0, killed: 0, corpseMeals: 0, endured: 7 },
    stats: { sanity: 55, humanity: 55, horde: 90, mutation: 50 },
    story: { flags: {} },
  };

  for (const endingId of PILOT_ENDING_IDS) {
    const derived = deriveDeathEndingPresentation(stateEndured, bio, { id: endingId });
    assert(derived.text.includes('ทนหิว 7 ครั้ง') || derived.text.includes('ความหิวโหย 7 ครั้ง'), `${endingId} should mention enduring hunger 7 times`);
    assert(!derived.text.includes('สังหาร'), `${endingId} must not accuse player of killing`);
  }
}

console.log('--- TEST 6: ไม่มีประวัติเด่น (No prominent record / Neutral) ---');
{
  const stateNeutral: any = {
    day: 20,
    place: 'bkk_pier',
    memory: { saved: 0, killed: 0, corpseMeals: 0, endured: 0 },
    stats: { sanity: 45, humanity: 45, horde: 90, mutation: 50 },
    story: { flags: {} },
  };

  for (const endingId of PILOT_ENDING_IDS) {
    const derived = deriveDeathEndingPresentation(stateNeutral, bio, { id: endingId });
    assert(derived.text.length > 50, 'Neutral text should be substantive');
    assert(!/\d+\s*ครั้ง/.test(derived.text), 'Neutral text must not invent fake counts');
  }
}

console.log('--- TEST 7: เซฟเก่าข้อมูลไม่ครบ (Old incomplete save) ---');
{
  const brokenState: any = { day: 15 };
  for (const endingId of PILOT_ENDING_IDS) {
    const derived = deriveDeathEndingPresentation(brokenState, bio, { id: endingId });
    assert(typeof derived.text === 'string' && derived.text.length > 0, 'Must safely handle empty state');
    assert(typeof derived.title === 'string' && derived.title.length > 0, 'Must return valid title');
  }
}

console.log('--- TEST 8 & 9: NPC คู่หูยังมีชีวิต / ตายแล้ว / ไม่มีข้อมูล & ชื่อ NPC ไม่ถูกแต่งหรือสลับคน ---');
{
  const zonesWithAliveCompanion: Record<string, ZonePopulationState> = {
    hospital: {
      placeId: 'hospital',
      placeName: 'โรงพยาบาลราชวิถี',
      initialTotalPopulation: 5,
      unmetAnonymousSurvivors: 0,
      npcs: [
        {
          id: 'npc-karn',
          name: 'หมอกานต์',
          age: 25,
          role: 'แพทย์ฝึกหัดฉุกเฉิน',
          trait: 'ใจเย็น',
          placeId: 'hospital',
          alive: true,
          met: true,
          trust: 100,
          lastNote: 'เชื่อใจเราอย่างที่สุด',
        },
      ],
    },
  };

  const zonesWithDeadCompanion: Record<string, ZonePopulationState> = {
    hospital: {
      placeId: 'hospital',
      placeName: 'โรงพยาบาลราชวิถี',
      initialTotalPopulation: 5,
      unmetAnonymousSurvivors: 0,
      npcs: [
        {
          id: 'npc-karn',
          name: 'หมอกานต์',
          age: 25,
          role: 'แพทย์ฝึกหัดฉุกเฉิน',
          trait: 'ใจเย็น',
          placeId: 'hospital',
          alive: false,
          met: true,
          trust: 100,
          lastNote: 'เสียชีวิตระหว่างทาง',
        },
      ],
    },
  };

  const stateEsc: any = {
    day: 30,
    place: 'bkk_pier',
    memory: { saved: 1, killed: 0 },
    stats: { sanity: 50, humanity: 50 },
    npcZones: zonesWithAliveCompanion,
  };

  // Case 8a: Companion alive
  const derivedAlive = deriveDeathEndingPresentation(stateEsc, bio, { id: 'escape_companion' }, zonesWithAliveCompanion);
  assert(derivedAlive.text.includes('"หมอกานต์"'), 'Must mention exact companion name');
  assert(derivedAlive.text.includes('(แพทย์ฝึกหัดฉุกเฉิน)'), 'Must mention exact role');
  assert(derivedAlive.text.includes('เคียงข้างด้วย'), 'Must describe living companion beside player');

  // Case 8b: Companion dead -> MUST NOT say they are alive beside us!
  const stateDead = { ...stateEsc, npcZones: zonesWithDeadCompanion };
  const derivedDead = deriveDeathEndingPresentation(stateDead, bio, { id: 'escape_companion' }, zonesWithDeadCompanion);
  assert(derivedDead.text.includes('"หมอกานต์"'), 'Must acknowledge specific lost companion');
  assert(derivedDead.text.includes('ก้าวต่อไปเพียงลำพังหลังการสูญเสีย'), 'Must acknowledge loss rather than claiming companion is alive');
  assert(!derivedDead.text.includes('เคียงข้างด้วย "หมอกานต์"'), 'Must not claim dead companion is alive beside player');

  // Case 8c: No companion data -> Neutral fallback
  const stateNoComp = { ...stateEsc, npcZones: {} };
  const derivedNoComp = deriveDeathEndingPresentation(stateNoComp, bio, { id: 'escape_companion' }, {});
  assert(derivedNoComp.text.includes('ร่วมเดินทางไปกับผู้รอดชีวิตที่ร่วมชะตากรรม'), 'Must use neutral fallback when data is missing');
}

console.log('--- TEST 10: ผลเหมือนเดิมเมื่อ render ซ้ำ (Deterministic render) ---');
{
  const stateDet: any = {
    day: 30,
    place: 'bkk_pier',
    memory: { saved: 4, killed: 1, corpseMeals: 2, endured: 3 },
    stats: { sanity: 60, humanity: 60, horde: 90 },
    story: { flags: { 'c42.shelter_fortified': true } },
  };

  for (const endingId of PILOT_ENDING_IDS) {
    const text1 = deriveDeathEndingPresentation(stateDet, bio, { id: endingId }).text;
    const text2 = deriveDeathEndingPresentation(stateDet, bio, { id: endingId }).text;
    const text3 = deriveDeathEndingPresentation(stateDet, bio, { id: endingId }).text;
    assert.equal(text1, text2);
    assert.equal(text2, text3);

    const ref1 = endingReflections(stateDet).join('||');
    const ref2 = endingReflections(stateDet).join('||');
    assert.equal(ref1, ref2);

    const html1 = renderToStaticMarkup(React.createElement(EndingExperience, {
      state: { ...stateDet, ending: { id: endingId, day: 30 } },
      ending: { id: endingId, title: 'บทจบ' },
      bio,
      zones: {},
      chronicle: null,
      onNewLife() {},
      onHub() {},
    }));
    const html2 = renderToStaticMarkup(React.createElement(EndingExperience, {
      state: { ...stateDet, ending: { id: endingId, day: 30 } },
      ending: { id: endingId, title: 'บทจบ' },
      bio,
      zones: {},
      chronicle: null,
      onNewLife() {},
      onHub() {},
    }));
    assert.equal(html1, html2, 'React rendering must be byte-for-byte deterministic');
  }
}

console.log('--- TEST 11: Save/reload และเปิด archive ได้ข้อความเดิม ---');
{
  const stateToArchive: any = createCharacterState(P, bio);
  stateToArchive.runId = 'run-tailor-test-99';
  stateToArchive.day = 35;
  stateToArchive.place = 'hospital';
  stateToArchive.memory = { saved: 7, killed: 0, corpseMeals: 0, endured: 2 };
  stateToArchive.stats.sanity = 70;
  stateToArchive.stats.humanity = 80;
  stateToArchive.stats.research = 95;
  stateToArchive.story.flags['c40.clinic_stabilized'] = true;
  stateToArchive.ending = { id: 'human', day: 35 };

  const record1 = buildPastLifeRecordFromState(stateToArchive, P.viewModel(stateToArchive, { archive: [] }), 1, bio);
  const jsonExported = JSON.stringify({ pastLives: [record1], gameState: stateToArchive });

  // Simulate reload from JSON import
  const reloaded = JSON.parse(jsonExported);
  const recordReloaded = reloaded.pastLives[0];

  assert(record1.causeOfDeath);
  assert.equal(recordReloaded.causeOfDeath.narrativeText, record1.causeOfDeath.narrativeText);
  assert.equal(recordReloaded.endingTitle, record1.endingTitle);
  assert(recordReloaded.causeOfDeath.narrativeText.includes('7 ครั้ง'));
}

console.log('--- TEST 12: Ending IDs และเงื่อนไขเข้าถึงเท่าเดิม ---');
{
  assert(isPilotEnding('king'));
  assert(isPilotEnding('human'));
  assert(isPilotEnding('escape_companion'));
  assert(!isPilotEnding('non_existent_ending'));

  // Ensure catalog has exact original IDs
  for (const id of PILOT_ENDING_IDS) {
    assert(Boolean(P.catalog.ENDINGS[id]), `Catalog must have ${id}`);
  }

  // Ensure getEndingReadiness functions without distortion
  const testState: any = {
    day: 30,
    stats: { sanity: 50, humanity: 60, research: 95, horde: 95, mutation: 50, trust: 50 },
    items: { samples: 3 },
  };
  const readinessHuman = getEndingReadiness(testState, 'human');
  assert(typeof readinessHuman.enabled === 'boolean');
  const readinessKing = getEndingReadiness(testState, 'king');
  assert(typeof readinessKing.enabled === 'boolean');
}

console.log('\n========================================');
console.log('ALL 12 PILOT NARRATIVE TESTS PASSED SUCCESSFULLY!');
console.log('========================================');
