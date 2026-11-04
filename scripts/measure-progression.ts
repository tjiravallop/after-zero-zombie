import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  getMutationStageInfo,
  CHARACTER_BIO_DOSSIERS,
  getFixedWorldTimelineEvent,
  buildFreeformRoamModal,
  buildFreeformNpcInteractionModal,
  buildActionClimaxDecisionModal,
  getTriggeredEndingClimaxModal,
  getSliceOfLifeAndEscapeEndings,
  getMidGameHorizonClues,
  applyLifeSimModalEffectsToState,
  createInitialZonePopulations,
} from '../src/data/pastLifeEchoes';
import { generateCharacter, createCharacterState } from '../src/data/characterPool';
import { PROGRESSION_ROUTES } from '../src/data/progressionRules';
import { LATE_GAME_CITY_CRISIS_EVENTS, LATE_GAME_ROAM_FOLLOWUP_EVENTS } from '../src/data/externalEventsPack';

const c = { window: {} as any };
vm.runInNewContext(fs.readFileSync('public/after-zero-bundle.js', 'utf8'), c);
const P = c.window.AfterZeroEngine.Production;
const { engine: E, catalog: C } = P;

function hop(from: string, to: string) {
  const q = [[from]],
    seen = new Set([from]);
  while (q.length) {
    const path = q.shift()!;
    if (path.at(-1) === to) return path[1];
    for (const next of C.PLACES[path.at(-1)!].neighbors)
      if (!seen.has(next)) {
        seen.add(next);
        q.push([...path, next]);
      }
  }
}

// ============================================================================
// PART 1: Verification of All 12 Mid-to-Late Game Events & New Roleplay Rules
// ============================================================================
assert.equal(LATE_GAME_CITY_CRISIS_EVENTS.length, 8, '8 time-windowed city crisis events');
assert.equal(LATE_GAME_ROAM_FOLLOWUP_EVENTS.length, 4, '4 follow-up roam events');

{
  // Test Water Escape (conscious_exile) tightened rules + Low-Sanity & Hunger NPC interactions + Climax Modal
  const bio = generateCharacter(2026, { age: 30, occupationId: 'boatcrew' });
  const s = createCharacterState(P, bio);
  s.pending = null;
  const zones = createInitialZonePopulations(2026);

  // Day 12 with high sanity/humanity & 0 kills MUST NOT unlock conscious_exile anymore
  s.day = 12;
  s.place = 'streets';
  s.stats.sanity = 75;
  s.stats.humanity = 75;
  s.memory.killed = 0;
  const earlyOptions = getSliceOfLifeAndEscapeEndings(s, zones.streets, zones);
  assert.equal(earlyOptions.find(o => o.id === 'conscious_exile')?.enabled, false, 'Water escape blocked on Day 12');
  assert.equal(getTriggeredEndingClimaxModal(s, zones.streets, zones, []), null, 'No early water escape modal on Day 12');

  // Day 33 after bridge demolition + bkk_pier.helped + endured >= 3 unlocks conscious_exile
  s.day = 33;
  s.place = 'bkk_pier';
  s.memory.endured = 3;
  s.story.flags['bkk_pier.helped'] = true;
  const readyOptions = getSliceOfLifeAndEscapeEndings(s, zones.bkk_pier, zones);
  assert.equal(readyOptions.find(o => o.id === 'conscious_exile')?.enabled, true, 'Water escape unlocked when all conditions met');

  // Test Hunger >= 75 neck-staring & Sanity < 30 cognitive breakdown locks in NPC modal
  s.stats.hunger = 80;
  s.stats.sanity = 24;
  zones.streets.npcs[0].trust = 85;
  const npcModal = buildFreeformNpcInteractionModal(zones.streets, s, bio, zones.streets.npcs[0].id)!;
  assert.match(npcModal.text, /จ้องเส้นเลือดใหญ่ที่เต้นตุบ ๆ ข้างลำคอ/, 'Hunger >= 75 shows neck-staring text');
  assert.match(npcModal.text, /ถ้อยคำภาษามนุษย์แตกสลายกลายเป็นเพียงเสียงครางต่ำในลำคอ/, 'Sanity <= 35 shows slurred speech text');
  const workChoice = npcModal.choices.find(ch => ch.relationshipKind === 'work')!;
  assert.equal(workChoice.enabled, false, 'Sanity < 30 locks complex human occupation work choice');
  assert.match(workChoice.disabledReason || '', /สติต่ำเกินไป/);

  // Test buildActionClimaxDecisionModal for ending actions
  const cureAction = C.ACTIONS.find((a: any) => a.id === 'cure');
  const climaxModal = buildActionClimaxDecisionModal(cureAction, s, bio, zones.bkk_ward);
  assert.equal(climaxModal.isEndingClimax, true);
  assert.equal(climaxModal.choices[0].effects.executeEngineActionId, 'cure');
}

{
  // Test Window Suppression: jumping directly to Day 110 skips d45, d60, d75, d90 and triggers d105 only
  const bio = generateCharacter(2026, { age: 30, occupationId: 'boatcrew' });
  const s = createCharacterState(P, bio);
  s.pending = null;
  s.day = 110;
  const triggered: string[] = [];
  const ev110 = getFixedWorldTimelineEvent(s, bio, triggered);
  assert.ok(ev110, 'Day 110 triggers active window event');
  assert.equal(ev110!.id, 'crisis-d105-air-raid-siren', 'Window suppression skips expired d45..d90 and fires d105');
  assert.equal(ev110!.advanceDay, false, 'City crisis does not consume a day');
  applyLifeSimModalEffectsToState(s, ev110!, 0);
  triggered.push(ev110!.id);
  assert.equal(s.story.flags['crisis_late_seen_d105'], true);
  assert.equal(getFixedWorldTimelineEvent(s, bio, triggered), null, 'Does not re-trigger in same window');
  assert.doesNotThrow(() => E.validate(JSON.parse(JSON.stringify(s))), 'Engine validates late-game flags');
}

{
  // Test all 8 City Crisis Events + Dynamic Branches + 4 Follow-Up Roam Events + Retreat Non-Depletion
  const boatBio = generateCharacter(101, { age: 32, occupationId: 'boatcrew' });
  const busBio = generateCharacter(102, { age: 40, occupationId: 'busdriver' });
  const s = createCharacterState(P, boatBio);
  s.pending = null;
  const zones = createInitialZonePopulations(101);
  const triggered: string[] = [];

  // 1. Day 45: crisis-d45-flyer-drop (with vaccine route prepared)
  s.day = 45;
  s.story.flags['route.vaccine.0'] = true;
  s.story.flags['route.vaccine.1'] = true;
  s.story.flags['route.vaccine.2'] = true;
  const d45 = getFixedWorldTimelineEvent(s, boatBio, triggered)!;
  assert.equal(d45.id, 'crisis-d45-flyer-drop');
  assert.match(d45.choices[0].outcomeText, /ห้องแช่แข็งเซรุ่มจะไม่รอดหากพ้นวันที่ 120/);
  applyLifeSimModalEffectsToState(s, d45, 0);
  assert.equal(s.story.flags['crisis_late_seen_d45'], true);
  assert.equal(s.story.flags['crisis_d45_read_map'], true);

  // 9. Day 46: roam-d45-flyer-crate (test Choice 3 retreat does NOT deplete, then Choice 1 depletes)
  s.day = 46;
  s.place = 'streets';
  const r45a = buildFreeformRoamModal(zones.streets, s, boatBio, triggered);
  assert.equal(r45a.contentId, 'roam-d45-flyer-crate');
  assert.match(r45a.choices[0].outcomeText, /เข้าใจสัญลักษณ์ย่อทางการทหารบนแผนที่ได้ทันที/);
  // Validate save with open roam modal
  assert.doesNotThrow(() => E.validate(JSON.parse(JSON.stringify({ ...s, npcEncounter: r45a }))));
  // Choose Choice 3 (retreat)
  applyLifeSimModalEffectsToState(s, r45a, 2);
  assert.equal(Boolean(s.story.flags['roam_late_depleted_d45']), false, 'Retreat does not deplete crate');
  // Roam again on Day 47 -> still available!
  const r45b = buildFreeformRoamModal(zones.streets, s, boatBio, triggered);
  assert.equal(r45b.contentId, 'roam-d45-flyer-crate');
  applyLifeSimModalEffectsToState(s, r45b, 0);
  assert.equal(s.story.flags['roam_late_depleted_d45'], true, 'Choice 1 depletes crate');

  // 2. Day 60: crisis-d60-grid-collapse (with bkk_power.helped)
  s.day = 60;
  s.items.supplies = 2;
  s.story.flags['bkk_power.helped'] = true;
  const d60 = getFixedWorldTimelineEvent(s, boatBio, triggered)!;
  assert.equal(d60.id, 'crisis-d60-grid-collapse');
  assert.match(d60.choices[0].outcomeText, /ระบบสายไฟสำรองที่เจ้าเคยช่วยช่างตรวจไว้/);
  applyLifeSimModalEffectsToState(s, d60, 0);
  assert.equal(s.story.flags['crisis_late_seen_d60'], true);
  assert.equal(s.story.flags['crisis_d60_helped_generator'], true);
  assert.equal(s.items.supplies, 1);

  // 10. Day 61: roam-d60-dark-freezer (test hunger >= 80 forces immediate drinking)
  s.day = 61;
  s.place = 'bkk_market';
  s.stats.hunger = 85;
  const r60 = buildFreeformRoamModal(zones.bkk_market, s, boatBio, triggered);
  assert.equal(r60.contentId, 'roam-d60-dark-freezer');
  assert.equal(r60.choices[0].effects.hunger, -25);
  applyLifeSimModalEffectsToState(s, r60, 0);
  assert.equal(s.story.flags['roam_late_depleted_d60'], true);

  // 3. Day 75: crisis-d75-canal-barricade (with boatcrew occupation -> HP -2 instead of -5)
  s.day = 75;
  const d75 = getFixedWorldTimelineEvent(s, boatBio, triggered)!;
  assert.equal(d75.id, 'crisis-d75-canal-barricade');
  assert.equal(d75.choices[0].effects.hp, -2, 'Boatcrew reduces HP cost from -5 to -2');
  applyLifeSimModalEffectsToState(s, d75, 0);
  assert.equal(s.story.flags['crisis_late_seen_d75'], true);
  assert.equal(s.story.flags['crisis_d75_cleared_chain'], true);

  // 11. Day 76: roam-d75-sunken-boat (cleared chain -> 0 HP cost + deterministic RNG)
  s.day = 76;
  s.place = 'bkk_pier';
  const r75a = buildFreeformRoamModal(zones.bkk_pier, s, boatBio, triggered);
  const r75b = buildFreeformRoamModal(zones.bkk_pier, s, boatBio, triggered);
  assert.equal(r75a.contentId, 'roam-d75-sunken-boat');
  assert.equal(r75a.choices[0].effects.hp, undefined, 'Cleared chain removes HP cost on sunken boat');
  assert.deepEqual(r75a.choices[0].effects, r75b.choices[0].effects, 'Deterministic RNG on same seed/day');
  applyLifeSimModalEffectsToState(s, r75a, 0);
  assert.equal(s.story.flags['roam_late_depleted_d75'], true);

  // 4. Day 90: crisis-d90-mass-schism (with horde >= 80)
  s.day = 90;
  s.stats.horde = 80;
  const d90 = getFixedWorldTimelineEvent(s, busBio, triggered)!;
  assert.equal(d90.id, 'crisis-d90-mass-schism');
  assert.match(d90.choices[0].outcomeText, /ก้มหัวหมอบลงกับพื้นถนนราวกับกองทัพ/);
  applyLifeSimModalEffectsToState(s, d90, 0);
  assert.equal(s.story.flags['crisis_late_seen_d90'], true);
  assert.equal(s.story.flags['crisis_d90_escorted_convoy'], true);

  // 12. Day 91: roam-d90-abandoned-bus (with busdriver occupation -> sanity +6)
  s.day = 91;
  s.place = 'bkk_busyard';
  const r90 = buildFreeformRoamModal(zones.bkk_busyard, s, busBio, triggered);
  assert.equal(r90.contentId, 'roam-d90-abandoned-bus');
  assert.equal(r90.choices[1].effects.sanity, 6, 'Busdriver gets +6 sanity on journal choice');
  applyLifeSimModalEffectsToState(s, r90, 1);
  assert.equal(s.story.flags['roam_late_depleted_d90'], true);

  // 5. Day 105: crisis-d105-air-raid-siren (with evolution route prepared)
  s.day = 105;
  s.story.flags['route.evolution.0'] = true;
  s.story.flags['route.evolution.1'] = true;
  s.story.flags['route.evolution.2'] = true;
  const d105 = getFixedWorldTimelineEvent(s, busBio, triggered)!;
  assert.equal(d105.id, 'crisis-d105-air-raid-siren');
  assert.match(d105.choices[0].outcomeText, /รังสีความร้อนและโครงสร้างบังเกอร์ใต้ดิน/);
  applyLifeSimModalEffectsToState(s, d105, 0);

  // 6. Day 112: crisis-d112-phosphorus-drift (with mutation >= 60 stage 3 -> halved HP damage)
  s.day = 112;
  s.stats.mutation = 65;
  const d112 = getFixedWorldTimelineEvent(s, busBio, triggered)!;
  assert.equal(d112.id, 'crisis-d112-phosphorus-drift');
  assert.equal(d112.choices[0].effects.hp, -3, 'Stage 3+ mutation halves phosphorus HP damage (-6 -> -3)');
  assert.equal(d112.choices[2].effects.hp, -1, 'Stage 3+ mutation halves bridge shelter HP damage (-2 -> -1)');
  applyLifeSimModalEffectsToState(s, d112, 0);

  // 7. Day 116: crisis-d116-final-vigil (with humanity >= 60 -> tear narrative)
  s.day = 116;
  s.stats.humanity = 70;
  const d116 = getFixedWorldTimelineEvent(s, busBio, triggered)!;
  assert.equal(d116.id, 'crisis-d116-final-vigil');
  assert.match(d116.text, /หยดน้ำตาที่แห้งเหือดไปนาน/);
  applyLifeSimModalEffectsToState(s, d116, 0);

  // 8. Day 119: crisis-d119-eve-of-impact (displays route summary)
  s.day = 119;
  const d119 = getFixedWorldTimelineEvent(s, busBio, triggered)!;
  assert.equal(d119.id, 'crisis-d119-eve-of-impact');
  assert.match(d119.text, /สรุปเส้นทางที่เตรียมไว้: วัคซีน 3\/3/);
  assert.match(d119.choices[0].note, /เจ้ายังมีโอกาสเดินหน้าสู่ฉากจบเดิมก่อนระเบิดลง/);
  applyLifeSimModalEffectsToState(s, d119, 2);
  assert.equal(s.story.flags['crisis_late_seen_d119'], true);
  const horizonClues = getMidGameHorizonClues(s);
  assert(horizonClues.length > 0, 'getMidGameHorizonClues returns clues without error');
  assert.doesNotThrow(() => E.validate(JSON.parse(JSON.stringify(s))));
}

// ============================================================================
// PART 2: Route Progression & Full-Run Playtest Balance (Days 1–120)
// ============================================================================
const results: any[] = [];
for (const route of PROGRESSION_ROUTES) {
  for (let seed = 1; seed <= 20; seed++) {
    const s = E.create(seed);
    const bio = CHARACTER_BIO_DOSSIERS[seed % CHARACTER_BIO_DOSSIERS.length];
    bio.applyToState(s);
    const triggered: string[] = [];
    const travel = (to: string) => (to === s.place ? undefined : 'move:' + hop(s.place, to));
    const enabled = (id: string, place = s.place) => E.previewAction({ ...s, place, pending: null }, id).enabled;
    const hasFood = (event: string) =>
      Object.entries(C.RESOURCES).some(
        ([id, def]: [string, any]) => def.eventId === event && (s.world.resources[id]?.remaining || 0) > 0
      );
    const regen = (before: number) => {
      if (s.day > before && !s.ending && s.stats.hp > 0) {
        s.stats.hp = Math.min(100, s.stats.hp + getMutationStageInfo(s.stats.mutation).dailyHpRegen);
      }
    };
    const take = (id: string) => {
      const before = s.day;
      const res = E.act(s, id);
      if (!res.ok) throw Error(id + ': ' + res.reason);
      regen(before);
    };

    let steps = 0,
      reason = '';
    while (!s.ending && steps++ < 500) {
      if (s.pending) {
        const id = s.pending.eventId,
          before = s.day;
        const choices = C.EVENTS.find((e: any) => e.id === id).choices.map((_: any, i: number) =>
          E.previewChoice(s, i)
        );
        const index =
          id === 'prey' || id === 'bloodbank' || id.startsWith('route.')
            ? 0
            : id.startsWith('travel.')
            ? 1
            : choices.findIndex((v: any) => v.enabled);
        const res = E.choose(s, index, s.pending.instanceId);
        if (!res.ok) {
          reason = res.reason;
          break;
        }
        regen(before);
        continue;
      }

      // Trigger fixed timeline & city crisis events if available
      const crisisModal = getFixedWorldTimelineEvent(s, bio, triggered);
      if (crisisModal) {
        applyLifeSimModalEffectsToState(s, crisisModal, 0);
        triggered.push(crisisModal.id);
      }

      const ending = route.id === 'vaccine' ? 'cure' : route.id === 'horde' ? 'crown' : 'evolve';
      if (enabled(ending)) {
        take(ending);
        continue;
      }
      if ((s.carriedBloodBags || 0) > 0 && s.stats.hunger >= 55) {
        s.carriedBloodBags -= 1;
        s.stats.hunger = Math.max(0, s.stats.hunger - 28);
      }
      if (s.stats.hp < 55 && s.stats.hunger < 75 && enabled('medicate')) {
        take('medicate');
        continue;
      }
      if (s.stats.hunger >= 55) {
        if (s.place === 'hospital' && hasFood('bloodbank') && enabled('blood')) {
          take('blood');
          continue;
        }
        if (s.place === 'streets') {
          if (hasFood('ambulance') && enabled('corpse')) {
            take('corpse');
            continue;
          }
          if (hasFood('prey') && enabled('hunt')) {
            take('hunt');
            continue;
          }
        }
        const source =
          hasFood('bloodbank') && enabled('blood', 'hospital')
            ? 'hospital'
            : hasFood('prey') || hasFood('ambulance')
            ? 'streets'
            : null;
        if (source) {
          const move = travel(source);
          if (move) {
            take(move);
            continue;
          }
        }
      }
      if (s.stats.hp < 45 && enabled('medicate')) {
        take('medicate');
        continue;
      }
      if (s.stats.sanity < 40 && enabled('remember')) {
        take('remember');
        continue;
      }
      if (s.stats.hp < 35) {
        const move = travel('shelter');
        take(move || 'rest');
        continue;
      }
      const unfinished = route.steps.findIndex((_, i) => !s.story.flags['route.' + route.id + '.' + i]);
      if (unfinished >= 0) {
        const step = route.steps[unfinished];
        take(travel(step.place) || 'route.' + route.id + '.' + unfinished);
        continue;
      }
      if (route.id === 'vaccine' && (s.stats.research < 90 || s.items.samples < 2)) {
        const move = travel('hospital');
        if (move) {
          take(move);
          continue;
        }
        take(s.items.samples < 3 ? 'labsearch' : 'research');
        continue;
      }
      if (route.id === 'vaccine' && (s.stats.humanity < 55 || s.stats.trust < 30)) {
        if (s.items.supplies < 1) {
          take(travel('streets') || 'scavenge');
          continue;
        }
        take(travel('radio') || 'share');
        continue;
      }
      if (route.id === 'evolution' && (s.stats.research < 35 || s.items.samples < 2)) {
        const move = travel('hospital');
        if (move) {
          take(move);
          continue;
        }
        take(s.items.samples < 3 ? 'labsearch' : 'research');
        continue;
      }
      if (route.id === 'evolution' && s.stats.mutation < 85) {
        if (s.items.samples < 3) {
          take(travel('hospital') || 'labsearch');
          continue;
        }
        take(travel('nest') || 'adapt');
        continue;
      }
      if (route.id === 'horde' && (s.stats.mutation < 45 || s.stats.horde < 90)) {
        if (s.stats.mutation < 15) {
          take(travel('streets') || 'hunt');
          continue;
        }
        take(travel('nest') || 'recruit');
        continue;
      }
      const move = travel(route.destination);
      if (move) {
        take(move);
        continue;
      }
      reason = E.previewAction(s, ending).reasons.join(' · ');
      break;
    }
    results.push({
      route: route.id,
      seed,
      day: s.day,
      ending: s.ending?.id || 'unfinished',
      reason,
      stats: s.stats,
      lastLogs: s.log.slice(0, 4),
    });
  }
}

// ============================================================================
// PART 3: Late-Game Marathon Playtest (Days 45–119 Crisis & Roam Follow-Up Run)
// ============================================================================
const marathonRuns: any[] = [];
for (let seed = 1; seed <= 20; seed++) {
  const bio = generateCharacter(202600 + seed, { age: 28, occupationId: seed % 2 === 0 ? 'boatcrew' : 'busdriver' });
  const s = createCharacterState(P, bio);
  const zones = createInitialZonePopulations(seed);
  const triggered: string[] = [];
  // Resolve day 1 opening
  E.choose(s, 0, s.pending.instanceId);
  // Prepare route & enter Day 45 mid-game state
  s.day = 45;
  s.completedDays = 44;
  Object.assign(s.stats, { hp: 88, hunger: 25, sanity: 75, humanity: 68, trust: 45, research: 92, mutation: 62, horde: 82 });
  s.items.supplies = 3;
  s.items.medicine = 3;
  s.items.samples = 3;
  s.carriedBloodBags = 2;
  for (const r of PROGRESSION_ROUTES) r.steps.forEach((_, i) => (s.story.flags['route.' + r.id + '.' + i] = true));

  const seenCrises: string[] = [];
  const depletedFollowUps: string[] = [];

  while (s.day <= 119 && !s.ending) {
    // 1. Check for fixed timeline / city crisis event (advanceDay: false)
    const crisis = getFixedWorldTimelineEvent(s, bio, triggered);
    if (crisis) {
      seenCrises.push(crisis.id);
      applyLifeSimModalEffectsToState(s, crisis, 0);
      triggered.push(crisis.id);
    }

    if (s.day === 119) {
      // On Day 119 after eve-of-impact, trigger prepared climax ending before Day 120 bombardment
      s.place = 'bkk_ward';
      s.stats.hp = Math.max(40, s.stats.hp);
      s.stats.sanity = Math.max(50, s.stats.sanity);
      s.stats.humanity = Math.max(60, s.stats.humanity);
      s.stats.trust = Math.max(35, s.stats.trust);
      s.stats.research = Math.max(90, s.stats.research);
      s.items.samples = Math.max(2, s.items.samples);
      const res = E.act(s, 'cure');
      assert.equal(res.ok, true, res.reason);
      break;
    }

    // 2. Visit follow-up roam zones when unlocked
    let isFollowUpRoamWindow = false;
    if (s.day >= 46 && s.day <= 58 && s.story.flags['crisis_late_seen_d45'] && !s.story.flags['roam_late_depleted_d45']) {
      s.place = 'streets';
      isFollowUpRoamWindow = true;
    } else if (s.day >= 61 && s.day <= 73 && s.story.flags['crisis_late_seen_d60'] && !s.story.flags['roam_late_depleted_d60']) {
      s.place = 'bkk_market';
      isFollowUpRoamWindow = true;
    } else if (s.day >= 76 && s.day <= 88 && s.story.flags['crisis_late_seen_d75'] && !s.story.flags['roam_late_depleted_d75']) {
      s.place = 'bkk_pier';
      isFollowUpRoamWindow = true;
    } else if (s.day >= 91 && s.day <= 103 && s.story.flags['crisis_late_seen_d90'] && !s.story.flags['roam_late_depleted_d90']) {
      s.place = 'bkk_busyard';
      isFollowUpRoamWindow = true;
    }

    // 3. Perform 1-day roam exploration (or rest/feed on non-follow-up days)
    if (isFollowUpRoamWindow) {
      const zone = zones[s.place] || zones.streets;
      const roamModal = buildFreeformRoamModal(zone, s, bio, triggered);
      if (roamModal.contentId?.startsWith('roam-d')) {
        depletedFollowUps.push(roamModal.contentId);
      }
      applyLifeSimModalEffectsToState(s, roamModal, 0);
    } else {
      s.day += 1;
      s.completedDays = Math.min(120, (s.completedDays || 0) + 1);
      s.stats.hp = Math.min(100, s.stats.hp + getMutationStageInfo(s.stats.mutation).dailyHpRegen);
    }
    if ((s.carriedBloodBags || 0) > 0 && s.stats.hunger >= 55) {
      s.carriedBloodBags -= 1;
      s.stats.hunger = Math.max(0, s.stats.hunger - 28);
    }
    s.stats.hp = Math.max(35, s.stats.hp);
  }

  assert.equal(seenCrises.length, 8, `Seed ${seed} experienced all 8 late-game city crises`);
  assert.equal(depletedFollowUps.length, 4, `Seed ${seed} completed all 4 late-game roam follow-ups`);
  marathonRuns.push({ seed, ending: s.ending?.id, day: s.day, seenCrises: seenCrises.length, depletedFollowUps: depletedFollowUps.length });
}

fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/progression-reference.json', JSON.stringify({ routeRuns: results, marathonRuns }, null, 2));
for (const route of PROGRESSION_ROUTES) {
  const runs = results.filter(r => r.route === route.id),
    wins = runs.filter(r => !['death', 'feral', 'unfinished'].includes(r.ending));
  console.log(
    route.id,
    JSON.stringify({
      runs: runs.length,
      endings: runs.reduce((o, r) => ((o[r.ending] = (o[r.ending] || 0) + 1), o), {}),
      winDays: wins.map(r => r.day),
      unfinished: runs.find(r => r.reason),
    })
  );
}
console.log(
  'marathon_d45_d119',
  JSON.stringify({
    runs: marathonRuns.length,
    all8CrisesSeen: marathonRuns.every(r => r.seenCrises === 8),
    all4FollowUpsDepleted: marathonRuns.every(r => r.depletedFollowUps === 4),
    endings: marathonRuns.reduce((o, r) => ((o[r.ending] = (o[r.ending] || 0) + 1), o), {}),
  })
);

