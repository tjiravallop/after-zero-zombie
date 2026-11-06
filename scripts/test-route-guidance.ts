import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as rules from '../src/data/progressionRules';
import {buildMapLocations, findMapRoute, MAP_POSITIONS} from '../src/data/mapLocations';
import {generateCharacter, createCharacterState} from '../src/data/characterPool';
import type {ZonePopulationState} from '../src/data/pastLifeEchoes';

assert.equal(typeof rules.getRouteGuidance, 'function', 'route guidance must calculate readiness');
const getGuidance = rules.getRouteGuidance;
const state = {
  day: 10, place: 'shelter', stats: {research: 90, humanity: 55, sanity: 45, trust: 30, horde: 90, mutation: 85},
  items: {samples: 2}, story: {flags: {} as Record<string, boolean>},
};
const vaccine = () => getGuidance(state).find(r => r.routeId === 'vaccine')!;
assert.equal(vaccine().eligible, false, 'high starting stats alone must not recommend a route');
state.story.flags['route.vaccine.0'] = true;
assert.equal(vaccine().eligible, false, 'one preparation is not deliberate enough progress');
state.story.flags['route.vaccine.1'] = true;
assert.equal(vaccine().eligible, true);
assert.ok(Math.abs(vaccine().readiness - 17 / 18) < 1e-10);
assert.deepEqual(vaccine().nextStep, {actionId: 'route.vaccine.2', placeId: 'bkk_office', title: rules.PROGRESSION_ROUTES[0].steps[2].name});
state.stats.research = 50;
state.stats.humanity = 0;
assert.equal(vaccine().eligible, false, 'preparation alone must not bypass readiness');
// Hand-derived boundary: (2/3 + 5/6 + 0 + 1 + 1 + 1) / 6 = .75.
state.stats.research = 75;
assert.equal(vaccine().readiness, .75);
assert.equal(vaccine().eligible, true, 'exactly 75% qualifies');
state.stats.research = 74.99;
assert.equal(vaccine().eligible, false, 'rounding must not admit values below 75%');
state.stats.research = 1000;
state.stats.humanity = 1000;
state.items.samples = 1000;
assert.ok(vaccine().readiness <= 1, 'excess stats cannot inflate readiness');
state.story.flags['route.vaccine.2'] = true;
assert.equal(vaccine().nextStep, null);
assert.equal(vaccine().requirementsMet, true);
state.items.samples = 0;
assert.equal(vaccine().missingSamples, true);
assert.equal(vaccine().requirementsMet, false);
state.story.flags['route.horde.0'] = true;
state.story.flags['route.horde.1'] = true;
assert.equal(getGuidance(state)[0].routeId, 'horde', 'eligible routes are ranked by readiness');
assert.equal(getGuidance(state)[0].eligible, true, 'horde needs no sample inventory');
assert.ok(Number.isFinite(getGuidance(state).find(r => r.routeId === 'horde')!.readiness), 'sample-free routes must not divide by zero');
assert.deepEqual(getGuidance(null), []);
assert.deepEqual(getGuidance({...state, ending: {id: 'death'}}), []);

const sandbox = {window: {}} as any;
vm.runInNewContext(fs.readFileSync('public/after-zero-bundle.js', 'utf8'), sandbox);
const production = sandbox.window.AfterZeroEngine.Production;
for (const route of getGuidance({...state, story: {flags: {}}})) {
  assert.ok(production.catalog.ACTIONS.some((a: any) => a.id === route.nextStep?.actionId));
}
const mapState = createCharacterState(production, generateCharacter(2026));
mapState.pending = null;
mapState.day = 30;
const zones: Record<string, ZonePopulationState> = {shelter: {placeId: 'shelter', placeName: 'Shelter', initialTotalPopulation: 1, unmetAnonymousSurvivors: 0,
  npcs: [{id: 'test-crisis', name: 'Test', age: 35, role: 'ผู้รอดชีวิต', trait: '', placeId: 'shelter', alive: true, met: true, lastNote: '', crisisDay: 1, crisisResolved: false, crisisText: 'ช่วยด้วย', trust: 30}]}};
const hidden = buildMapLocations(production, mapState, zones);
const shown = buildMapLocations(production, mapState, zones, [], undefined, {showRouteHints: true});
assert.ok(shown.some(p => p.signals.some(s => s.id.startsWith('route.'))), 'fixture must include route markers');
assert.equal(hidden.some(p => p.signals.some(s => s.kind === 'ending' || s.id.startsWith('route.'))), false);
assert.ok(hidden.find(p => p.id === 'shelter')!.signals.some(s => s.kind === 'crisis'));
assert.deepEqual(hidden.map(p => [p.route, p.travelTarget]), shown.map(p => [p.route, p.travelTarget]), 'hint visibility cannot change travel');

// Verify Bangkok map graph symmetry, coordinate coverage, and non-backtracking route consistency
const placesCatalog = production.catalog.PLACES;
const allPlaceIds = Object.keys(placesCatalog);
assert.equal(allPlaceIds.length, 15, 'all 15 Bangkok locations must exist');
for (const id of allPlaceIds) {
  assert.ok(MAP_POSITIONS[id], `missing map coordinates for ${id}`);
  for (const neighbor of placesCatalog[id].neighbors) {
    assert.ok(
      placesCatalog[neighbor]?.neighbors?.includes(id),
      `asymmetric neighbor link between ${id} and ${neighbor}`
    );
  }
}
for (const a of allPlaceIds) {
  for (const b of allPlaceIds) {
    const fwd = findMapRoute(placesCatalog, a, b);
    const rev = findMapRoute(placesCatalog, b, a);
    assert.ok(fwd.length >= 1, `missing route from ${a} to ${b}`);
    assert.deepEqual(fwd, [...rev].reverse(), `route ${a}->${b} must match reversed ${b}->${a}`);
  }
}
assert.deepEqual(findMapRoute(placesCatalog, 'bkk_power', 'bkk_office'), ['bkk_power', 'bkk_office']);
assert.deepEqual(findMapRoute(placesCatalog, 'radio', 'bkk_depot'), ['radio', 'bkk_depot']);
assert.deepEqual(findMapRoute(placesCatalog, 'bkk_busyard', 'hospital'), ['bkk_busyard', 'hospital']);
console.log('PASS route readiness boundaries, next tasks, map topology symmetry, and spoiler-free map');
