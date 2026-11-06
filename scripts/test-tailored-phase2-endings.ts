import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PHASE2_ENDING_IDS,
  TAILORED_ENDING_IDS,
  tailorEndingPresentation,
  findEligibleWitness,
  isTailoredEnding,
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
const bio = generateCharacter(77);

console.log('--- TEST 1: Phase 2 - EVOLVED (Saved, Killed, Both, Living Ally Witness) ---');
{
  const zones: Record<string, ZonePopulationState> = {
    hospital: {
      placeId: 'hospital',
      placeName: 'โรงพยาบาลราชวิถี',
      initialTotalPopulation: 5,
      unmetAnonymousSurvivors: 0,
      npcs: [
        {
          id: 'npc-nuan',
          name: 'พยาบาลนวล',
          age: 34,
          role: 'พยาบาลวิชาชีพ',
          trait: 'เมตตา',
          placeId: 'hospital',
          alive: true,
          met: true,
          trust: 90,
          lastNote: 'พันธมิตร',
        },
      ],
    },
  };

  // 1a. Saved only
  const stateSaved = {
    day: 28,
    place: 'bkk_power',
    memory: { saved: 4, killed: 0, corpseMeals: 0, endured: 0 },
    stats: { sanity: 50, mutation: 85, research: 40 },
    npcZones: zones,
  };
  const dSaved = deriveDeathEndingPresentation(stateSaved, bio, { id: 'evolved' }, zones);
  assert(dSaved.text.includes('4 ครั้ง'), 'Evolved should mention 4 saved');
  assert(dSaved.text.includes('ไม่เคยพรากชีวิตคนเป็น'), 'Evolved should acknowledge no killing');
  assert(dSaved.text.includes('"พยาบาลนวล"'), 'Evolved should mention living ally witness');

  // 1b. Killed only
  const stateKilled = {
    day: 28,
    place: 'bkk_power',
    memory: { saved: 0, killed: 3, corpseMeals: 0, endured: 0 },
    stats: { sanity: 40, mutation: 85, research: 40 },
    npcZones: {},
  };
  const dKilled = deriveDeathEndingPresentation(stateKilled, bio, { id: 'evolved' }, {});
  assert(dKilled.text.includes('3 ชีวิต'), 'Evolved should acknowledge 3 killed lives');
  assert(dKilled.text.includes('หลบลี้หนีหาย'), 'Witness should describe fear when no allies');

  // 1c. Both
  const stateBoth = {
    day: 28,
    place: 'bkk_power',
    memory: { saved: 3, killed: 1, corpseMeals: 0, endured: 0 },
    stats: { sanity: 50, mutation: 85, research: 40 },
    npcZones: zones,
  };
  const dBoth = deriveDeathEndingPresentation(stateBoth, bio, { id: 'evolved' }, zones);
  assert(dBoth.text.includes('3 ครั้ง') && dBoth.text.includes('1 ชีวิต'), 'Evolved must acknowledge both without erasing either');
}

console.log('--- TEST 2: Phase 2 - EXTINCTION (The Last Signal) ---');
{
  const stateExtinctSaved = {
    day: 30,
    place: 'tower',
    memory: { saved: 5, killed: 0 },
    stats: { sanity: 40, horde: 95 },
  };
  const dExtSaved = deriveDeathEndingPresentation(stateExtinctSaved, bio, { id: 'extinction' });
  assert(dExtSaved.text.includes('5 ครั้ง'), 'Extinction should acknowledge 5 saved in past');
  assert(dExtSaved.text.includes('ไม่มีเสียงมนุษย์ตอบกลับ'), 'Extinction should confirm complete silence');

  const stateExtinctKilled = {
    day: 30,
    place: 'tower',
    memory: { saved: 0, killed: 6 },
    stats: { sanity: 30, horde: 95 },
  };
  const dExtKilled = deriveDeathEndingPresentation(stateExtinctKilled, bio, { id: 'extinction' });
  assert(dExtKilled.text.includes('6 คน'), 'Extinction should acknowledge 6 killed in past');
}

console.log('--- TEST 3: Phase 2 - SILENT_GUARDIAN (Heroic Stand at Blast Door) ---');
{
  const zonesWithShelterAlly: Record<string, ZonePopulationState> = {
    shelter: {
      placeId: 'shelter',
      placeName: 'ห้องแถวที่หลบภัย',
      initialTotalPopulation: 4,
      unmetAnonymousSurvivors: 0,
      npcs: [
        {
          id: 'npc-somchai',
          name: 'ลุงสมชาย',
          age: 58,
          role: 'ช่างไม้ประจำชุมชน',
          trait: 'รอบคอบ',
          placeId: 'shelter',
          alive: true,
          met: true,
          trust: 95,
          lastNote: 'ปลอดภัยหลังประตู',
        },
      ],
    },
  };

  const zonesWithDeadShelterAlly: Record<string, ZonePopulationState> = {
    shelter: {
      placeId: 'shelter',
      placeName: 'ห้องแถวที่หลบภัย',
      initialTotalPopulation: 4,
      unmetAnonymousSurvivors: 0,
      npcs: [
        {
          id: 'npc-somchai',
          name: 'ลุงสมชาย',
          age: 58,
          role: 'ช่างไม้ประจำชุมชน',
          trait: 'รอบคอบ',
          placeId: 'shelter',
          alive: false,
          met: true,
          trust: 95,
          lastNote: 'เสียชีวิตไปก่อนหน้า',
        },
      ],
    },
  };

  // 3a. Living ally behind door
  const stateGuardianAlive = {
    day: 20,
    place: 'shelter',
    memory: { saved: 6, killed: 0 },
    stats: { sanity: 50, humanity: 70 },
    npcZones: zonesWithShelterAlly,
  };
  const dGAlive = deriveDeathEndingPresentation(stateGuardianAlive, bio, { id: 'silent_guardian' }, zonesWithShelterAlly);
  assert(dGAlive.text.includes('"ลุงสมชาย"'), 'Must mention living ally behind door');
  assert(dGAlive.text.includes('(ช่างไม้ประจำชุมชน)'), 'Must mention correct role');
  assert(dGAlive.text.includes('ผู้พิทักษ์เงียบงัน'), 'Must confirm legacy title');

  // 3b. Dead NPC MUST NOT appear as living behind door
  const stateGuardianDead = {
    day: 20,
    place: 'shelter',
    memory: { saved: 6, killed: 0 },
    stats: { sanity: 50, humanity: 70 },
    npcZones: zonesWithDeadShelterAlly,
  };
  const dGDead = deriveDeathEndingPresentation(stateGuardianDead, bio, { id: 'silent_guardian' }, zonesWithDeadShelterAlly);
  assert(!dGDead.text.includes('"ลุงสมชาย" (ช่างไม้ประจำชุมชน) และผู้คนหลังบานประตูเหล็กปลอดภัย'), 'Dead NPC must not appear alive');
  assert(dGDead.text.includes('ห้องแถวที่หลบภัย') || dGDead.text.includes('ที่หลบภัย'), 'Must fallback to location memory');

  // 3c. Both saved and killed
  const stateGuardianBoth = {
    day: 20,
    place: 'shelter',
    memory: { saved: 4, killed: 2 },
    stats: { sanity: 50, humanity: 70 },
    npcZones: zonesWithShelterAlly,
  };
  const dGBoth = deriveDeathEndingPresentation(stateGuardianBoth, bio, { id: 'silent_guardian' }, zonesWithShelterAlly);
  assert(dGBoth.text.includes('4 ครั้ง') && dGBoth.text.includes('2 ชีวิต'), 'Must acknowledge both past saved and killed');
}

console.log('--- TEST 4: Phase 2 - CONSCIOUS_EXILE (Chao Phraya Exile) ---');
{
  const stateExile = {
    day: 24,
    place: 'bkk_pier',
    memory: { saved: 3, killed: 0, endured: 5, corpseMeals: 2 },
    stats: { sanity: 60, humanity: 60 },
  };
  const dExile = deriveDeathEndingPresentation(stateExile, bio, { id: 'conscious_exile' });
  assert(dExile.text.includes('3 ครั้ง'), 'Conscious exile should mention saved');
  assert(dExile.text.includes('แม่น้ำเจ้าพระยา'), 'Conscious exile should set scene on Chao Phraya river');
  assert(!dExile.text.includes('สังหาร'), 'Conscious exile strictly enforces killed=0');
}

console.log('--- TEST 5: Phase 2 - HORDE_BREAKOUT (Canal Breakthrough) ---');
{
  const stateHordeSaved = {
    day: 26,
    place: 'bkk_pier',
    memory: { saved: 4, killed: 0 },
    stats: { sanity: 45, horde: 95, mutation: 50 },
  };
  const dHordeSaved = deriveDeathEndingPresentation(stateHordeSaved, bio, { id: 'horde_breakout' });
  assert(dHordeSaved.text.includes('4 ครั้ง'), 'Horde breakout should acknowledge 4 saved');
  assert(dHordeSaved.text.includes('คลองแสนแสบ'), 'Horde breakout should mention canal route');

  // 5b. Killed between 1 and 9 (0 < killed < 10)
  const stateHordeKilled = {
    day: 26,
    place: 'bkk_pier',
    memory: { saved: 0, killed: 5 },
    stats: { sanity: 40, horde: 95, mutation: 50 },
  };
  const dHordeKilled = deriveDeathEndingPresentation(stateHordeKilled, bio, { id: 'horde_breakout' });
  assert(dHordeKilled.text.includes('5 ชีวิต'), 'Horde breakout should acknowledge 5 killed');
  assert(dHordeKilled.text.includes('แตกพ่ายถอยร่น'), 'Horde breakout should describe military checkpoint retreat for moderate kills');

  // 5c. Killed 10 or more (killed >= 10)
  const stateHordeMassacre = {
    day: 26,
    place: 'bkk_pier',
    memory: { saved: 0, killed: 14 },
    stats: { sanity: 40, horde: 95, mutation: 50 },
  };
  const dHordeMassacre = deriveDeathEndingPresentation(stateHordeMassacre, bio, { id: 'horde_breakout' });
  assert(dHordeMassacre.text.includes('กว่า 14 ชีวิต'), 'Horde breakout should acknowledge over 14 killed');
  assert(dHordeMassacre.text.includes('นองเลือด'), 'Horde breakout should describe bloody breakthrough for >= 10 kills');
  assert(dHordeMassacre.text.includes('กลิ่นอายของการสังหารหมู่'), 'Horde breakout should describe massacre aura at checkpoints for >= 10 kills');

  // 5d. Both saved and killed (moderate vs high)
  const stateHordeBoth = {
    day: 26,
    place: 'bkk_pier',
    memory: { saved: 3, killed: 2 },
    stats: { sanity: 40, horde: 95, mutation: 50 },
  };
  const dHordeBoth = deriveDeathEndingPresentation(stateHordeBoth, bio, { id: 'horde_breakout' });
  assert(dHordeBoth.text.includes('3 ครั้ง') && dHordeBoth.text.includes('2 ชีวิต'), 'Horde breakout should acknowledge both without bias');

  const stateHordeBothHigh = {
    day: 26,
    place: 'bkk_pier',
    memory: { saved: 4, killed: 12 },
    stats: { sanity: 40, horde: 95, mutation: 50 },
  };
  const dHordeBothHigh = deriveDeathEndingPresentation(stateHordeBothHigh, bio, { id: 'horde_breakout' });
  assert(dHordeBothHigh.text.includes('4 ครั้ง') && dHordeBothHigh.text.includes('กว่า 12 ชีวิต'), 'Horde breakout should scale for both saved and >= 10 killed');
}

console.log('--- TEST 6: Phase 2 Determinism & Static React Markup ---');
{
  for (const endingId of PHASE2_ENDING_IDS) {
    const s: any = {
      day: 25,
      place: 'shelter',
      memory: { saved: 2, killed: 1, corpseMeals: 3, endured: 4 },
      stats: { sanity: 50, humanity: 50, mutation: 50, horde: 90 },
      story: { flags: { 'c42.shelter_fortified': true } },
    };

    const text1 = deriveDeathEndingPresentation(s, bio, { id: endingId }).text;
    const text2 = deriveDeathEndingPresentation(s, bio, { id: endingId }).text;
    assert.equal(text1, text2, `${endingId} must be completely deterministic`);

    const html1 = renderToStaticMarkup(React.createElement(EndingExperience, {
      state: { ...s, ending: { id: endingId, day: 25 } },
      ending: { id: endingId, title: 'บทจบ' },
      bio,
      zones: {},
      chronicle: null,
      onNewLife() {},
      onHub() {},
    }));
    const html2 = renderToStaticMarkup(React.createElement(EndingExperience, {
      state: { ...s, ending: { id: endingId, day: 25 } },
      ending: { id: endingId, title: 'บทจบ' },
      bio,
      zones: {},
      chronicle: null,
      onNewLife() {},
      onHub() {},
    }));
    assert.equal(html1, html2, `${endingId} markup must be deterministic across renders`);
  }
}

console.log('--- TEST 7: Phase 2 Save/Reload & Archive snapshot ---');
{
  for (const endingId of PHASE2_ENDING_IDS) {
    const stateArch: any = createCharacterState(P, bio);
    stateArch.runId = `run-phase2-${endingId}`;
    stateArch.day = 29;
    stateArch.place = 'shelter';
    const killedCount = endingId === 'conscious_exile' ? 0 : 1;
    stateArch.memory = { saved: 3, killed: killedCount, corpseMeals: 0, endured: 2 };
    stateArch.ending = { id: endingId, day: 29 };

    const record = buildPastLifeRecordFromState(stateArch, P.viewModel(stateArch, { archive: [] }), 1, bio);
    assert(record.causeOfDeath);

    // Verify round-trip JSON serialization
    const serialized = JSON.stringify(record);
    const deserialized = JSON.parse(serialized);

    assert.equal(deserialized.causeOfDeath.narrativeText, record.causeOfDeath.narrativeText);
    assert.equal(deserialized.endingTitle, record.endingTitle);
    assert(deserialized.causeOfDeath.narrativeText.includes('3 ครั้ง'));
    if (killedCount > 0) {
      assert(deserialized.causeOfDeath.narrativeText.includes('1 ชีวิต'));
    }
  }
}

console.log('--- TEST 8: Catalog parity & Readiness intact for all 8 Tailored Endings ---');
{
  assert.equal(TAILORED_ENDING_IDS.length, 8);
  for (const id of TAILORED_ENDING_IDS) {
    assert(isTailoredEnding(id), `${id} must be recognized as tailored ending`);
    assert(Boolean(P.catalog.ENDINGS[id]), `Catalog must define ${id}`);

    const readyCheck = getEndingReadiness({
      day: 30,
      stats: { sanity: 80, humanity: 80, research: 95, horde: 95, mutation: 90, trust: 80 },
      items: { samples: 5 },
    }, id);
    assert(typeof readyCheck.enabled === 'boolean', `${id} readiness check must work`);
  }
}

console.log('\n========================================');
console.log('ALL PHASE 2 NARRATIVE TESTS PASSED SUCCESSFULLY!');
console.log('========================================');
