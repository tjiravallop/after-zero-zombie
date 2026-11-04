import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {LOCATION_ROAM_EVENTS} from '../src/data/locationRoamEvents';
import {EXTERNAL_AI_ROAM_EVENTS} from '../src/data/externalEventsPack';
import {buildFreeformRoamModal,createInitialZonePopulations} from '../src/data/pastLifeEchoes';
import {generateCharacter,createCharacterState} from '../src/data/characterPool';

const context={window:{} as any};vm.runInNewContext(fs.readFileSync('public/after-zero-bundle.js','utf8'),context);
const P=context.window.AfterZeroEngine.Production;
assert.equal(LOCATION_ROAM_EVENTS.length, 30);
assert.equal(new Set(EXTERNAL_AI_ROAM_EVENTS.map(e => e.id)).size, EXTERNAL_AI_ROAM_EVENTS.length);
const previousRandom = Math.random;
let cases = 0;
try {
  Math.random = () => 0;
  for (const event of LOCATION_ROAM_EVENTS) {
    assert(P.catalog.PLACES[event.placeId!]);
    assert.equal(event.advanceDay, true);
    assert.deepEqual(event.choices.at(-1)?.effects, {});
    assert(event.choices.at(-1)?.note.includes('1 วัน'));
    const otherIds = EXTERNAL_AI_ROAM_EVENTS.filter(e => e.id !== event.id).map(e => e.id);
    for (const age of [10, 38, 80]) {
      const bio = generateCharacter(20261104 + age, { age });
      const state = createCharacterState(P, bio);
      state.pending = null;
      state.place = event.placeId;
      state.day = event.conditions!.minDay;
      const zone = createInitialZonePopulations(2026)[event.placeId!];
      const modal = buildFreeformRoamModal(zone, state, bio, otherIds);
      assert(modal.id.startsWith(event.id));
      assert.equal(modal.placeId, event.placeId === 'radio' ? 'tower' : event.placeId);
      assert.equal(modal.choices.length, event.choices.length);
      for (const choice of modal.choices) {
        assert.equal(choice.enabled, true);
        assert(!choice.effects.killTargetNpc);
        assert(!choice.effects.targetNpcTrustDelta && !choice.effects.bystanderTrustDelta);
        if ((choice.effects.hunger || 0) < 0 && event.id !== 'roam-hospital-blood-bank-vault') {
          assert.equal(choice.effects.corpseMeals, 1);
        }
        assert(!choice.effects.triggerEndingId);
        const restored = P.engine.validate(JSON.parse(JSON.stringify({ ...state, npcEncounter: modal })));
        assert.equal(restored.npcEncounter.id, modal.id);
        assert.equal(restored.day, state.day);
        assert.deepEqual(JSON.parse(JSON.stringify(restored.npcEncounter.choices)), JSON.parse(JSON.stringify(modal.choices)));
        cases++;
      }
      if (event.conditions?.oncePerRun) {
        assert.notEqual(buildFreeformRoamModal(zone, state, bio, [...otherIds, event.id]).id, event.id);
      }
      state.day = event.conditions!.maxDay! + 1;
      assert.notEqual(buildFreeformRoamModal(zone, state, bio, otherIds).id, event.id);
      state.day = event.conditions!.minDay! - 1;
      if (state.day > 0) assert.notEqual(buildFreeformRoamModal(zone, state, bio, otherIds).id, event.id);
      const wrongPlace = event.placeId === 'shelter' ? 'hospital' : 'shelter';
      const wrongZone = createInitialZonePopulations(2026)[wrongPlace];
      state.place = wrongPlace;
      state.day = event.conditions!.minDay;
      assert.notEqual(buildFreeformRoamModal(wrongZone, state, bio, otherIds).id, event.id);
    }
  }
} finally {
  Math.random = previousRandom;
}
console.log(`PASS: ${LOCATION_ROAM_EVENTS.length} events, day boundaries, once-per-run including retreat, ${cases} choice/save cases across ages 10/38/80, corpse meals distinct from kills`);
