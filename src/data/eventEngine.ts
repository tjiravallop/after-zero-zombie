import {
  CharacterBioDossier,
  LifeSimModalEvent,
  PastLifeRecord,
  ZoneNpc,
  ZonePopulationState,
  formatTimelineDate,
  getMutationStageInfo,
} from './pastLifeEchoes';
import { COMMUNITY_DYNAMIC_EVENTS } from './communityEvents';

export type ZonePlaceId =
  | 'shelter'
  | 'streets'
  | 'hospital'
  | 'tower'
  | 'nest'
  | 'radio'
  | 'bkk_winstop'
  | 'bkk_market'
  | 'bkk_ward'
  | 'bkk_power'
  | 'bkk_depot'
  | 'bkk_cafe'
  | 'bkk_office'
  | 'bkk_pier'
  | 'bkk_stockroom'
  | 'bkk_busyard';

export type DynamicEventCategory =
  | 'world_timeline'
  | 'zone_trust'
  | 'npc_relationship'
  | 'mutation_awakening'
  | 'occupation_memory'
  | 'morality_reckoning'
  | 'crisis_escalation';

/**
 * Declarative condition schema for triggering dynamic narrative events.
 * Every specified field acts as an AND gate; all specified conditions must pass.
 */
export interface EventTriggerCondition {
  /** Minimum day (inclusive, 1..120) */
  minDay?: number;
  /** Maximum day (inclusive, 1..120) */
  maxDay?: number;
  /** Exact day match */
  exactDay?: number;

  /** Allowed current location IDs */
  places?: ZonePlaceId[];
  /** Excluded location IDs */
  excludedPlaces?: ZonePlaceId[];

  /** Current zone average trust (0..100, sum of NPC trust / living humans in zone) */
  minZoneTrust?: number;
  maxZoneTrust?: number;

  /** Minimum / maximum living humans remaining in the current zone */
  minZoneLivingCount?: number;
  maxZoneLivingCount?: number;

  /** Current zone threat level (0..100) */
  minZoneThreat?: number;
  maxZoneThreat?: number;

  /** Specific NPC requirement in the current zone (or across any zone if globalSearch = true) */
  npcRequirement?: {
    npcId?: string;
    nameIncludes?: string;
    roleIncludes?: string;
    onlyCurrentZone?: boolean;
    mustBeAlive?: boolean;
    mustBeMet?: boolean;
    minTrust?: number;
    maxTrust?: number;
    hasActiveCrisis?: boolean;
  };

  /** Player vital & progression statistics conditions */
  stats?: {
    minHp?: number;
    maxHp?: number;
    minHunger?: number;
    maxHunger?: number;
    minSanity?: number;
    maxSanity?: number;
    minHumanity?: number;
    maxHumanity?: number;
    minMutation?: number;
    maxMutation?: number;
    minMutationStage?: 1 | 2 | 3 | 4;
    maxMutationStage?: 1 | 2 | 3 | 4;
    minResearch?: number;
    minHorde?: number;
    minKills?: number;
    maxKills?: number;
    minSaved?: number;
  };

  /** Carried inventory requirements */
  items?: {
    minSupplies?: number;
    minMedicine?: number;
    minSamples?: number;
    minCarriedBloodBags?: number;
  };

  /** Pre-death occupation dossier IDs that unlock this narrative */
  bioIds?: string[];

  /** Required or forbidden story flags on gameState.story.flags */
  requiredFlags?: string[];
  forbiddenFlags?: string[];

  /** Require at least N recorded past lives in the archive */
  minPastLivesCount?: number;

  /** Custom predicate for compound or cross-zone checks */
  customPredicate?: (ctx: EventEvaluationContext) => boolean;
}

export interface EventEvaluationContext {
  gameState: any;
  currentBio: CharacterBioDossier;
  currentZonePop?: ZonePopulationState;
  allZonePopulations: Record<string, ZonePopulationState>;
  currentZoneAverageTrust: number;
  currentZoneLivingCount: number;
  pastLives: PastLifeRecord[];
  triggeredEventIds: string[];
}

export interface DynamicEventChoiceTemplate {
  id?: string;
  text: string;
  note: string;
  outcomeText: string | ((ctx: EventEvaluationContext, matchedNpc?: ZoneNpc) => string);
  /** Optional condition to enable this specific choice (e.g., requires medicine or mutation stage) */
  isEnabled?: (ctx: EventEvaluationContext, matchedNpc?: ZoneNpc) => {
    enabled: boolean;
    disabledReason?: string;
  };
  effects: {
    corpseMeals?: number;
    endured?: number;
    hp?: number;
    hunger?: number;
    sanity?: number;
    humanity?: number;
    mutation?: number;
    research?: number;
    horde?: number;
    supplies?: number;
    medicine?: number;
    samples?: number;
    carriedBloodBags?: number;
    targetNpcTrustDelta?: number;
    bystanderTrustDelta?: number;
    killTargetNpc?: boolean;
    resolveNpcCrisis?: boolean;
    saveLife?: boolean;
    threatDelta?: number;
    triggerEndingId?: string;
    setFlag?: string;
    setFlags?: string[];
  };
}

export interface DynamicNarrativeEventTemplate {
  id: string;
  title: string | ((ctx: EventEvaluationContext, matchedNpc?: ZoneNpc) => string);
  category: DynamicEventCategory;
  /** Higher priority events evaluate first when multiple triggers are satisfied on the same turn */
  priority: number;
  /** Whether this event can only fire once per life (tracked in triggeredEchoIds) */
  oncePerLife: boolean;
  /**Whether resolving this event advances the day by 1 */
  advanceDay?: boolean;
  /** Whether this event represents an ending climax */
  isEndingClimax?: boolean;
  conditions: EventTriggerCondition;
  text: string | ((ctx: EventEvaluationContext, matchedNpc?: ZoneNpc) => string);
  choices: DynamicEventChoiceTemplate[];
}

export interface EventConditionEvaluationResult {
  matched: boolean;
  matchedNpc?: ZoneNpc;
  unmetReasons: string[];
}

/**
 * Helper to locate a matching NPC based on `npcRequirement`
 */
function findMatchingNpc(
  req: NonNullable<EventTriggerCondition['npcRequirement']>,
  ctx: EventEvaluationContext
): ZoneNpc | undefined {
  const currentPlace = (ctx.gameState?.place || 'shelter') as ZonePlaceId;
  const candidatePools: ZoneNpc[] =
    req.onlyCurrentZone !== false
      ? ctx.currentZonePop?.npcs || []
      : Object.values(ctx.allZonePopulations).flatMap(z => z.npcs || []);

  const currentDay = ctx.gameState?.day || 1;

  return candidatePools.find(npc => {
    if (req.onlyCurrentZone !== false && npc.placeId !== currentPlace) return false;
    if (req.npcId && npc.id !== req.npcId) return false;
    if (req.nameIncludes && !npc.name.includes(req.nameIncludes)) return false;
    if (req.roleIncludes && !npc.role.includes(req.roleIncludes)) return false;
    if (req.mustBeAlive !== undefined && npc.alive !== req.mustBeAlive) return false;
    if (req.mustBeMet !== undefined && npc.met !== req.mustBeMet) return false;
    if (req.minTrust !== undefined && npc.trust < req.minTrust) return false;
    if (req.maxTrust !== undefined && npc.trust > req.maxTrust) return false;
    if (req.hasActiveCrisis !== undefined) {
      const activeCrisis = Boolean(
        npc.alive &&
          npc.crisisDay &&
          currentDay >= npc.crisisDay &&
          !npc.crisisResolved &&
          npc.crisisText
      );
      if (activeCrisis !== req.hasActiveCrisis) return false;
    }
    return true;
  });
}

/**
 * Evaluates a single `EventTriggerCondition` against the current `EventEvaluationContext`.
 * Returns whether all conditions matched, any matched NPC, and human-readable diagnostic reasons.
 */
export function evaluateEventCondition(
  condition: EventTriggerCondition,
  ctx: EventEvaluationContext
): EventConditionEvaluationResult {
  const unmetReasons: string[] = [];
  const gs = ctx.gameState;
  if (!gs) {
    return { matched: false, unmetReasons: ['ไม่มีสถานะเกม (gameState)'] };
  }

  const day = Number(gs.day || 1);
  const rawPlace = gs.place || 'shelter';
  const place = (rawPlace === 'radio' ? 'tower' : rawPlace) as ZonePlaceId;
  const stats = gs.stats || {};
  const items = gs.items || {};
  const memory = gs.memory || {};
  const flags = gs.story?.flags || {};

  // 1. Day checks
  if (condition.exactDay !== undefined && day !== condition.exactDay) {
    unmetReasons.push(`ต้องเป็นวันที่ ${condition.exactDay} (ปัจจุบันวันที่ ${day})`);
  }
  if (condition.minDay !== undefined && day < condition.minDay) {
    unmetReasons.push(`ต้องถึงวันที่ ${condition.minDay} ขึ้นไป (ปัจจุบันวันที่ ${day})`);
  }
  if (condition.maxDay !== undefined && day > condition.maxDay) {
    unmetReasons.push(`เลยกำหนดวันที่ ${condition.maxDay} แล้ว`);
  }

  // 2. Location checks
  if (condition.places && condition.places.length > 0) {
    const normalizedCondPlaces = condition.places.map(p => ((p as string) === 'radio' ? 'tower' : p));
    if (!normalizedCondPlaces.includes(place)) {
      unmetReasons.push(`ต้องอยู่ในพื้นที่ [${condition.places.join(', ')}] (ปัจจุบัน: ${rawPlace})`);
    }
  }
  if (condition.excludedPlaces) {
    const normalizedExcluded = condition.excludedPlaces.map(p => ((p as string) === 'radio' ? 'tower' : p));
    if (normalizedExcluded.includes(place)) {
      unmetReasons.push(`ต้องไม่อยู่ในพื้นที่ ${rawPlace}`);
    }
  }

  // 3. Zone Trust & Population checks
  if (
    condition.minZoneTrust !== undefined &&
    ctx.currentZoneAverageTrust < condition.minZoneTrust
  ) {
    unmetReasons.push(
      `ความไว้ใจเฉลี่ยในพื้นที่ต้อง >= ${condition.minZoneTrust}% (ปัจจุบัน ${ctx.currentZoneAverageTrust.toFixed(1)}%)`
    );
  }
  if (
    condition.maxZoneTrust !== undefined &&
    ctx.currentZoneAverageTrust > condition.maxZoneTrust
  ) {
    unmetReasons.push(
      `ความไว้ใจเฉลี่ยในพื้นที่ต้อง <= ${condition.maxZoneTrust}% (ปัจจุบัน ${ctx.currentZoneAverageTrust.toFixed(1)}%)`
    );
  }
  if (
    condition.minZoneLivingCount !== undefined &&
    ctx.currentZoneLivingCount < condition.minZoneLivingCount
  ) {
    unmetReasons.push(
      `ผู้รอดชีวิตในเขตต้อง >= ${condition.minZoneLivingCount} คน (ปัจจุบัน ${ctx.currentZoneLivingCount} คน)`
    );
  }
  if (
    condition.maxZoneLivingCount !== undefined &&
    ctx.currentZoneLivingCount > condition.maxZoneLivingCount
  ) {
    unmetReasons.push(
      `ผู้รอดชีวิตในเขตต้อง <= ${condition.maxZoneLivingCount} คน (ปัจจุบัน ${ctx.currentZoneLivingCount} คน)`
    );
  }

  // 4. Zone Threat checks
  const currentThreat = Number(gs.world?.locations?.[place]?.threat ?? 20);
  if (condition.minZoneThreat !== undefined && currentThreat < condition.minZoneThreat) {
    unmetReasons.push(`ภัยคุกคามในเขตต้อง >= ${condition.minZoneThreat} (ปัจจุบัน ${currentThreat})`);
  }
  if (condition.maxZoneThreat !== undefined && currentThreat > condition.maxZoneThreat) {
    unmetReasons.push(`ภัยคุกคามในเขตต้อง <= ${condition.maxZoneThreat} (ปัจจุบัน ${currentThreat})`);
  }

  // 5. Vital & Progression Stats checks
  if (condition.stats) {
    const s = condition.stats;
    const hp = Number(stats.hp ?? 100);
    const hunger = Number(stats.hunger ?? 0);
    const sanity = Number(stats.sanity ?? 100);
    const humanity = Number(stats.humanity ?? 50);
    const mutation = Number(stats.mutation ?? 0);
    const mutationStage = getMutationStageInfo(mutation).stageNumber;
    const research = Number(stats.research ?? 0);
    const horde = Number(stats.horde ?? 0);
    const kills = Number(memory.killed ?? 0);
    const saved = Number(memory.saved ?? 0);

    if (s.minHp !== undefined && hp < s.minHp) unmetReasons.push(`HP < ${s.minHp}`);
    if (s.maxHp !== undefined && hp > s.maxHp) unmetReasons.push(`HP > ${s.maxHp}`);
    if (s.minHunger !== undefined && hunger < s.minHunger)
      unmetReasons.push(`ความหิว < ${s.minHunger}`);
    if (s.maxHunger !== undefined && hunger > s.maxHunger)
      unmetReasons.push(`ความหิว > ${s.maxHunger}`);
    if (s.minSanity !== undefined && sanity < s.minSanity)
      unmetReasons.push(`สติ < ${s.minSanity}`);
    if (s.maxSanity !== undefined && sanity > s.maxSanity)
      unmetReasons.push(`สติ > ${s.maxSanity}`);
    if (s.minHumanity !== undefined && humanity < s.minHumanity)
      unmetReasons.push(`ความเป็นมนุษย์ < ${s.minHumanity}`);
    if (s.maxHumanity !== undefined && humanity > s.maxHumanity)
      unmetReasons.push(`ความเป็นมนุษย์ > ${s.maxHumanity}`);
    if (s.minMutation !== undefined && mutation < s.minMutation)
      unmetReasons.push(`การกลายพันธุ์ < ${s.minMutation}`);
    if (s.maxMutation !== undefined && mutation > s.maxMutation)
      unmetReasons.push(`การกลายพันธุ์ > ${s.maxMutation}`);
    if (s.minMutationStage !== undefined && mutationStage < s.minMutationStage)
      unmetReasons.push(`ระยะกลายพันธุ์ < ระยะที่ ${s.minMutationStage}`);
    if (s.maxMutationStage !== undefined && mutationStage > s.maxMutationStage)
      unmetReasons.push(`ระยะกลายพันธุ์ > ระยะที่ ${s.maxMutationStage}`);
    if (s.minResearch !== undefined && research < s.minResearch)
      unmetReasons.push(`วิจัย < ${s.minResearch}`);
    if (s.minHorde !== undefined && horde < s.minHorde)
      unmetReasons.push(`อำนาจฝูง < ${s.minHorde}`);
    if (s.minKills !== undefined && kills < s.minKills)
      unmetReasons.push(`จำนวนฆ่าคน < ${s.minKills}`);
    if (s.maxKills !== undefined && kills > s.maxKills)
      unmetReasons.push(`จำนวนฆ่าคน > ${s.maxKills}`);
    if (s.minSaved !== undefined && saved < s.minSaved)
      unmetReasons.push(`จำนวนช่วยชีวิต < ${s.minSaved}`);
  }

  // 6. Carried Inventory checks
  if (condition.items) {
    const it = condition.items;
    const supplies = Number(items.supplies ?? 0);
    const medicine = Number(items.medicine ?? 0);
    const samples = Number(items.samples ?? 0);
    const bags = Number(gs.carriedBloodBags ?? 0);

    if (it.minSupplies !== undefined && supplies < it.minSupplies)
      unmetReasons.push(`เสบียงไม่พอ (${supplies}/${it.minSupplies})`);
    if (it.minMedicine !== undefined && medicine < it.minMedicine)
      unmetReasons.push(`เวชภัณฑ์ไม่พอ (${medicine}/${it.minMedicine})`);
    if (it.minSamples !== undefined && samples < it.minSamples)
      unmetReasons.push(`ตัวอย่างเชื้อไม่พอ (${samples}/${it.minSamples})`);
    if (it.minCarriedBloodBags !== undefined && bags < it.minCarriedBloodBags)
      unmetReasons.push(`ถุงเลือดพกติดตัวไม่พอ (${bags}/${it.minCarriedBloodBags})`);
  }

  // 7. Pre-death Occupation Dossier check
  if (
    condition.bioIds &&
    condition.bioIds.length > 0 &&
    !condition.bioIds.some(id => id === ctx.currentBio?.id || id === ctx.currentBio?.templateId)
  ) {
    unmetReasons.push(`ต้องเป็นภูมิหลังอาชีพที่กำหนด (${condition.bioIds.join(', ')})`);
  }

  // 8. Story Flags check
  if (condition.requiredFlags && condition.requiredFlags.length > 0) {
    for (const flag of condition.requiredFlags) {
      if (!flags[flag]) {
        unmetReasons.push(`ยังไม่มีแฟล็กเนื้อเรื่อง '${flag}'`);
      }
    }
  }
  if (condition.forbiddenFlags && condition.forbiddenFlags.length > 0) {
    for (const flag of condition.forbiddenFlags) {
      if (flags[flag]) {
        unmetReasons.push(`ติดแฟล็กต้องห้าม '${flag}'`);
      }
    }
  }

  // 9. Past lives count check
  if (
    condition.minPastLivesCount !== undefined &&
    ctx.pastLives.length < condition.minPastLivesCount
  ) {
    unmetReasons.push(`ต้องมีบันทึกชีวิตก่อนหน้าอย่างน้อย ${condition.minPastLivesCount} รอบ`);
  }

  // 10. NPC requirement check
  let matchedNpc: ZoneNpc | undefined;
  if (condition.npcRequirement) {
    matchedNpc = findMatchingNpc(condition.npcRequirement, ctx);
    if (!matchedNpc) {
      unmetReasons.push('ไม่พบ NPC ในพื้นที่ที่ตรงตามเงื่อนไขความไว้ใจ/สถานะ');
    }
  }

  // 11. Custom predicate check
  if (unmetReasons.length === 0 && condition.customPredicate) {
    try {
      const ok = condition.customPredicate(ctx);
      if (!ok) {
        unmetReasons.push('ไม่ผ่านเงื่อนไขเฉพาะ (customPredicate)');
      }
    } catch {
      unmetReasons.push('เกิดข้อผิดพลาดในการประเมิน customPredicate');
    }
  }

  return {
    matched: unmetReasons.length === 0,
    matchedNpc,
    unmetReasons,
  };
}

/**
 * Compiles a matched `DynamicNarrativeEventTemplate` into a playable `LifeSimModalEvent`
 */
export function buildLifeSimModalFromDynamicTemplate(
  template: DynamicNarrativeEventTemplate,
  ctx: EventEvaluationContext,
  matchedNpc?: ZoneNpc
): LifeSimModalEvent {
  const day = Number(ctx.gameState?.day || 1);
  const place = (ctx.gameState?.place || 'shelter') as ZonePlaceId;
  const resolvedTitle =
    typeof template.title === 'function' ? template.title(ctx, matchedNpc) : template.title;
  const resolvedText =
    typeof template.text === 'function' ? template.text(ctx, matchedNpc) : template.text;

  return {
    id: template.id,
    title: resolvedTitle,
    text: resolvedText,
    dayNote: `${formatTimelineDate(day)} · เหตุการณ์ทริกเกอร์อัตโนมัติ`,
    targetNpcId: matchedNpc?.id,
    placeId: place,
    advanceDay: template.advanceDay ?? false,
    isEndingClimax: template.isEndingClimax ?? false,
    choices: template.choices.map(ch => {
      const availability = ch.isEnabled ? ch.isEnabled(ctx, matchedNpc) : { enabled: true };
      const outcomeText =
        typeof ch.outcomeText === 'function'
          ? ch.outcomeText(ctx, matchedNpc)
          : ch.outcomeText;

      return {
        ...(ch.id ? { id: ch.id } : {}),
        text: ch.text,
        note: availability.enabled
          ? ch.note
          : `${ch.note} (${availability.disabledReason || 'ยังไม่พร้อมเลือก'})`,
        enabled: availability.enabled,
        disabledReason: availability.disabledReason,
        outcomeText,
        effects: { ...ch.effects },
      };
    }),
  };
}

/**
 * Built-in catalog of structured dynamic events that inject emergent narratives
 * when combinations of day, location, zone trust, NPC status, mutation stage,
 * humanity/kill count, or pre-death occupation align.
 */
export const DYNAMIC_NARRATIVE_EVENTS: DynamicNarrativeEventTemplate[] = [
  ...COMMUNITY_DYNAMIC_EVENTS,
  // 1. High Zone Trust Sanctuary Pact in Shelter
  {
    id: 'dyn_engine_shelter_community_shield',
    title: 'สภาห้องแถวดินแดง: ข้อตกลงคุ้มครองผู้ติดเชื้อที่ยังมีหัวใจ',
    category: 'zone_trust',
    priority: 85,
    oncePerLife: true,
    advanceDay: false,
    conditions: {
      minDay: 7,
      places: ['shelter'],
      minZoneTrust: 35,
      minZoneLivingCount: 5,
      stats: {
        maxKills: 1,
        minHumanity: 45,
      },
    },
    text: ctx =>
      `ตลอดหลายวันที่ผ่านมา การกระทำของเจ้าในห้องแถวพักพิงทำให้ค่าความไว้ใจเฉลี่ยของคนในพื้นที่ขยับขึ้นถึง ${ctx.currentZoneAverageTrust.toFixed(
        1
      )}% (${
        ctx.currentZoneLivingCount
      } ชีวิต) คืนนี้ตัวแทนผู้รอดชีวิตนำตะเกียงน้ำมันมาวางหน้าห้องพักของเจ้า พวกเขาลงมติกันว่าจะไม่ไล่ล่าหรือแจ้งทหารมาจับเจ้า และพร้อมแบ่งเสบียงสำรองให้หากเจ้ายังคงช่วยเฝ้าระวังภัยให้ชุมชน`,
    choices: [
      {
        text: 'รับตะเกียงและให้สัญญาด้วยการพยักหน้า (ความไว้ใจทั้งเขต +8, เสบียง +2, ความเป็นมนุษย์ +6)',
        note: 'สร้างพันธสัญญาระยะยาวกับชาวห้องแถวดินแดง',
        outcomeText:
          'เจ้าพยักหน้ารับแสงตะเกียง ชาวบ้านหลายคนถอนหายใจด้วยความโล่งอกและวางห่อข้าวสารแห้งไว้ให้หน้าประตู',
        effects: {
          supplies: 2,
          humanity: 6,
          sanity: 5,
          bystanderTrustDelta: 8,
          threatDelta: -10,
        },
      },
      {
        text: 'ชี้ไปที่แนวรั้วสังกะสีเพื่อขอเวชภัณฑ์แลกกับการเดินลาดตระเวนรอบดึก (เวชภัณฑ์ +1, ภัยคุกคามเขตลดลง)',
        note: 'เน้นความปลอดภัยเชิงยุทธวิธีของห้องแถว',
        outcomeText:
          'เจ้าออกเดินตรวจแนวรั้วสังกะสีตลอดคืนจนซอมบี้เร่ร่อนไม่กล้าเข้าใกล้ ชาวบ้านจึงมอบกล่องยาทำแผลให้เป็นการตอบแทน',
        effects: {
          medicine: 1,
          sanity: 4,
          bystanderTrustDelta: 5,
          threatDelta: -18,
        },
      },
    ],
  },

  // 2. Hospital Cold Storage Blood-Thirst vs Oath Dilemma
  {
    id: 'dyn_engine_hospital_blood_freezer_resonance',
    title: 'เสียงครางของเครื่องทำความเย็นและกลิ่นเลือดแช่แข็ง',
    category: 'mutation_awakening',
    priority: 82,
    oncePerLife: true,
    advanceDay: false,
    conditions: {
      minDay: 5,
      places: ['hospital'],
      stats: {
        minHunger: 50,
        minMutation: 25,
      },
    },
    text: ctx => {
      const stage = getMutationStageInfo(ctx.gameState?.stats?.mutation || 0);
      return `ในความมืดของตึกศัลยกรรมโรงพยาบาล ประสาทสัมผัสจาก [${stage.title}] ทำให้เจ้าได้ยินเสียงหัวใจของผู้รอดชีวิตที่ซ่อนตัวอยู่หลังห้องจ่ายยา ผสมกับกลิ่นคาวเหล็กเข้มข้นจากตู้แช่พลาสมาที่ไฟสำรองเพิ่งตัดดับลง ความหิวในระดับ ${Math.floor(
        ctx.gameState?.stats?.hunger || 0
      )}/100 บีบเค้นกระเพาะจนมือสั่นเทา`;
    },
    choices: [
      {
        text: 'งัดตู้แช่ที่ไฟดับเพื่อเก็บถุงเลือดสำรองแทนการทำร้ายคนเป็น (ถุงเลือดพกติดตัว +2, ความหิว -15)',
        note: 'ประทังสัญชาตญาณดิบโดยไม่แตะต้องผู้รอดชีวิตในตึก',
        outcomeText:
          'เจ้าคว้าถุงเลือดเย็นเฉียบจากตู้ที่ไฟดับมาดื่มประทังความหิวและเก็บสำรองใส่กระเป๋าไว้ 2 ถุง โดยไม่แตะต้องผู้รอดชีวิตในห้องจ่ายยาเลย',
        effects: {
          carriedBloodBags: 2,
          hunger: -15,
          sanity: 4,
          humanity: 3,
        },
      },
      {
        text: 'สกัดตัวอย่างพลาสมาที่ปนเปื้อนเชื้อในตู้แช่เพื่อใช้ศึกษาวิจัย (ตัวอย่างเชื้อ +2, วิจัย +8)',
        note: 'เปลี่ยนวิกฤตความหิวเป็นข้อมูลทางชีวภาพ',
        outcomeText:
          'เจ้ากัดฟันข่มความหิวไว้ แล้วบรรจุหลอดพลาสมาที่ทำปฏิกิริยากับเชื้อใส่กระเป๋าได้ 2 ตัวอย่างพร้อมบันทึกผล',
        effects: {
          samples: 2,
          research: 8,
          sanity: 2,
        },
      },
      {
        text: 'ปล่อยให้เซลล์กลายพันธุ์ดูดซับเลือดตกค้างในห้องผ่าตัดอย่างตะกละตะกลาม (ความหิว -35, การกลายพันธุ์ +10, ความเป็นมนุษย์ -6)',
        note: 'ลดความหิวอย่างรวดเร็วแต่เร่งการกลายพันธุ์',
        outcomeText:
          'เจ้าก้มลงซดเลือดตกค้างในห้องผ่าตัดจนความหิวสงบลง แต่เส้นเลือดดำที่ลำคอกลับปูdnโปนและเร่งการกลายพันธุ์ขึ้นอีกขั้น',
        effects: {
          hunger: -35,
          mutation: 10,
          humanity: -6,
          hp: 8,
        },
      },
    ],
  },

  // 3. Blood-Stained Hands Guilt & Fear Reaction (Triggered when Kill Count >= 2)
  {
    id: 'dyn_engine_bloodstained_reputation_tremor',
    title: 'กลิ่นคาวเลือดบนฝ่ามือและสายตาที่หวาดผวา',
    category: 'morality_reckoning',
    priority: 88,
    oncePerLife: true,
    advanceDay: false,
    conditions: {
      minDay: 4,
      stats: {
        minKills: 2,
        maxHumanity: 40,
      },
    },
    text: ctx => {
      const kills = Number(ctx.gameState?.memory?.killed || 0);
      return `หลังจากที่มือของเจ้าปลิดชีพมนุษย์ไปแล้วถึง ${kills} ศพ กลิ่นคาวเลือดและแววตาสุดท้ายของเหยื่อยังคงติดอยู่ในมโนสำนึก เมื่อเจ้าเดินผ่านมุมมืดของเขตกักกัน ผู้รอดชีวิตที่แอบซุ่มอยู่ถึงกับกลั้นหายใจและกำอาวุธแน่นด้วยความหวาดกลัวสุดขีด ขณะที่เสียงสัญชาตญาณดิบในหัวกลับกระซิบว่าเจ้าไม่จำเป็นต้องแคร์ความเป็นมนุษย์อีกต่อไป`;
    },
    choices: [
      {
        text: 'ล้างคราบเลือดด้วยน้ำฝนและวางเสบียงทิ้งไว้ให้พวกเขา 1 ชิ้นเพื่อพิสูจน์ว่ายังยั้งมือได้ (เสบียง -1, ความเป็นมนุษย์ +10, สติ +6)',
        note: 'ต้องมีเสบียงอย่างน้อย 1 ชิ้นเพื่อไถ่บาปและดึงความเป็นมนุษย์กลับมา',
        isEnabled: ctx => ({
          enabled: Number(ctx.gameState?.items?.supplies || 0) >= 1,
          disabledReason: 'ไม่มีเสบียงติดตัวสำหรับวางไว้',
        }),
        outcomeText:
          'เจ้าล้างคราบเลือดออกจากฝ่ามือ วางเสบียงทิ้งไว้บนลังไม้แล้วถอยห่างออกมา ความรู้สึกผิดช่วยปลุกมโนธรรมที่เกือบด้านชาให้กลับมาตระหนักรู้ถึงความเป็นมนุษย์อีกครั้ง',
        effects: {
          supplies: -1,
          humanity: 10,
          sanity: 6,
          bystanderTrustDelta: 6,
          setFlag: 'hunter_reputation_reformed',
        },
      },
      {
        text: 'ขู่คำรามในลำคอให้ผู้รอดชีวิตแตกกระเจิงและยึดพื้นที่นี้ด้วยความกลัว (อำนาจฝูง +10, การกลายพันธุ์ +8, ความเป็นมนุษย์ -8)',
        note: 'ยอมรับวิถีนักล่าและใช้ความกลัวปกครองเขต',
        outcomeText:
          'เสียงคำรามความถี่ต่ำจากลำคอของเจ้าทำให้ผู้รอดชีวิตวิ่งหนีสุดชีวิต ในขณะที่ซอมบี้รอบข้างเริ่มก้มหัวรับคำสั่งของจ่าฝูงคนใหม่',
        effects: {
          horde: 10,
          mutation: 8,
          humanity: -8,
          bystanderTrustDelta: -10,
          setFlag: 'hunter_reputation_intimidated',
        },
      },
    ],
  },

  // 4. Urgent Unresolved NPC Crisis Auto-Intervention Alert
  {
    id: 'dyn_engine_active_crisis_direct_plea',
    title: (_ctx, npc) =>
      `เสียงร้องขอความช่วยเหลือฉุกเฉิน: ${npc ? npc.name : 'ผู้รอดชีวิตในเขต'}`,
    category: 'crisis_escalation',
    priority: 90,
    oncePerLife: true,
    advanceDay: false,
    conditions: {
      minDay: 5,
      npcRequirement: {
        onlyCurrentZone: true,
        mustBeAlive: true,
        hasActiveCrisis: true,
      },
    },
    text: (_ctx, npc) =>
      `ขณะเดินสำรวจพื้นที่ เสียงเคาะเหล็กส่งสัญญาณขอความช่วยเหลือดังมาจากจุดที่ ${
        npc?.name || 'ผู้รอดชีวิต'
      } (${npc?.role || 'ชาวบ้าน'}) ซ่อนตัวอยู่! สถานการณ์วิกฤตกำลังเข้าขั้นวิกฤต: "${
        npc?.crisisText || 'ต้องการความช่วยเหลือด่วน'
      }" หากปล่อยไว้โดยไม่ยื่นมือเข้าช่วย ชีวิตและความไว้ใจในพื้นที่นี้อาจพังทลายลง`,
    choices: [
      {
        text: 'ใช้เวชภัณฑ์และแรงกายเข้าคลี่คลายวิกฤตเดี๋ยวนี้ (เวชภัณฑ์ -1, คลี่คลายวิกฤตทันที, ความไว้ใจเป้าหมาย +35)',
        note: 'ต้องมีเวชภัณฑ์อย่างน้อย 1 ชิ้นเพื่อช่วยชีวิตอย่างปลอดภัย',
        isEnabled: ctx => ({
          enabled: Number(ctx.gameState?.items?.medicine || 0) >= 1,
          disabledReason: 'ต้องมีเวชภัณฑ์อย่างน้อย 1 ชิ้น',
        }),
        outcomeText: (_ctx, npc) =>
          `เจ้าตัดสินใจใช้เวชภัณฑ์และเรี่ยวแรงทั้งหมดเข้าช่วย ${
            npc?.name || 'ผู้รอดชีวิต'
          } จนพ้นขีดอันตราย! แววตาที่เคยหวาดระแวงเปลี่ยนเป็นความซาบซึ้งใจอย่างสุดซึ้ง`,
        effects: {
          medicine: -1,
          resolveNpcCrisis: true,
          targetNpcTrustDelta: 35,
          bystanderTrustDelta: 6,
          humanity: 8,
          sanity: 5,
        },
      },
      {
        text: 'ใช้ร่างกายของผู้ติดเชื้อเข้าขวางอันตรายแทนแม้ต้องบาดเจ็บ (HP -14, คลี่คลายวิกฤต, ความไว้ใจเป้าหมาย +30)',
        note: 'ไม่ต้องใช้เวชภัณฑ์ แต่ต้องแลกด้วยพลังชีวิตของร่างนี้',
        outcomeText: (_ctx, npc) =>
          `เจ้าใช้ร่างที่ทนทานต่อความเจ็บปวดเข้ารับแรงกระแทกและสกัดภัยคุกคามจน ${
            npc?.name || 'ผู้รอดชีวิต'
          } รอดชีวิตมาได้ แม้ร่างของเจ้าจะมีแผลฉีกขาดแต่คนในเขตต่างเห็นการเสียสละครั้งนี้ชัดเจน`,
        effects: {
          hp: -14,
          resolveNpcCrisis: true,
          targetNpcTrustDelta: 30,
          bystanderTrustDelta: 5,
          humanity: 7,
        },
      },
      {
        text: 'ถอยฉากออกมาเงียบๆ เพื่อรักษาตัวรอดก่อน (สติ -4, ความไว้ใจเป้าหมาย -10)',
        note: 'ยังไม่เสี่ยงเข้าช่วยในตอนนี้ (วิกฤตยังคงดำเนินต่อไป)',
        outcomeText: (_ctx, npc) =>
          `เจ้าเลือกถอยกลับเข้าเงามืด ปล่อยให้ ${
            npc?.name || 'ผู้รอดชีวิต'
          } ต้องเผชิญวิกฤตตามลำพังไปก่อน`,
        effects: {
          sanity: -4,
          targetNpcTrustDelta: -10,
        },
      },
    ],
  },

  // 5. Radio Tower Military Intercept & Countdown Intelligence
  {
    id: 'dyn_engine_tower_blackbox_decryption',
    title: 'คลื่นวิทยุลับกองบัญชาการ: พิกัดทิ้งระเบิดเพลิงและช่องทางหลบหนี',
    category: 'world_timeline',
    priority: 84,
    oncePerLife: true,
    advanceDay: false,
    conditions: {
      minDay: 10,
      places: ['tower'],
      stats: {
        minSanity: 35,
      },
    },
    text: ctx =>
      `บนหอวิทยุสื่อสารที่ลมแรงพัดหวีดหวิว เครื่องรับสัญญาณความถี่ทหารที่ถูกทิ้งไว้กะพริบไฟสีแดงถี่รัว เสียงเทปบันทึกคำสั่งยุทธการ "ล้างบางเขตกักกันกรุงเทพฯ ในวันที่ 120" ดังซ้ำไปมา พร้อมแผนผังความถี่คลื่นรบกวนที่สามารถใช้ดึงดูดเฮลิคอปเตอร์กู้ภัย หรือใช้กระจายคลื่นปลุกฝูงซอมบี้ทั่วทั้งเขต (เหลือเวลาอีก ${Math.max(
        0,
        120 - Number(ctx.gameState?.day || 1)
      )} วันก่อนปูพรมทิ้งระเบิด)`,
    choices: [
      {
        text: 'ถอดรหัสพิกัดห้องแล็บและคลังเวชภัณฑ์จากคลื่นความถี่ทหาร (วิจัย +10, เวชภัณฑ์ +1, สติ +4)',
        note: 'เร่งความก้าวหน้าสายวิจัยเซรุ่มและความรู้ในพื้นที่',
        outcomeText:
          'เจ้าจดบันทึกพิกัดคลังเวชภัณฑ์และรหัสผ่านเครือข่ายวิจัยจากสัญญาณวิทยุทหาร ทำให้การค้นคว้าหาทางรักษาคืบหน้าไปอีกขั้น',
        effects: {
          research: 10,
          medicine: 1,
          sanity: 4,
          setFlag: 'tower_decrypted_depot',
        },
      },
      {
        text: 'ส่งสัญญาณเตือนภัยคลื่นสั้นแจ้งผู้รอดชีวิตทุกเขตให้รู้จุดหลบภัย (ความไว้ใจผู้คนในเขต +10, ความเป็นมนุษย์ +6)',
        note: 'ช่วยให้ผู้คนในหอวิทยุและเขตใกล้เคียงเตรียมรับมือทัน',
        outcomeText:
          'เจ้าหมุนจูนคลื่นความถี่พลเรือนแล้วเคาะรหัสมอร์สแจ้งเตือนพิกัดปลอดภัย ผู้รอดชีวิตที่ได้ยินสัญญาณต่างพากันขอบคุณผู้ส่งสารลึกลับบนหอคอย',
        effects: {
          bystanderTrustDelta: 10,
          humanity: 6,
          threatDelta: -12,
          setFlag: 'tower_warned_survivors',
        },
      },
      {
        text: 'ปรับเสาอากาศส่งคลื่นความถี่ต่ำกระตุ้นฝูงผู้ติดเชื้อในรัง (อำนาจฝูง +12, การกลายพันธุ์ +6)',
        note: 'เสริมฐานอำนาจจ่าฝูงและควบคุมซอมบี้ในพื้นที่',
        outcomeText:
          'คลื่นความถี่ต่ำจากเสาอากาศสะท้อนก้องไปทั่วซากตึก ฝูงซอมบี้เบื้องล่างแหงนมองขึ้นมายังหอวิทยุและรับรู้ถึงอำนาจสั่งการของเจ้า',
        effects: {
          horde: 12,
          mutation: 6,
          setFlag: 'tower_stimulated_horde',
        },
      },
    ],
  },

  // 6. Nest Apex Hive Resonance (High Mutation Stage 3+ in the Nest)
  {
    id: 'dyn_engine_nest_hive_synapse',
    title: 'เครือข่ายใยชีวภาพใต้ดิน: เสียงประสานของรังผู้ติดเชื้อ',
    category: 'mutation_awakening',
    priority: 86,
    oncePerLife: true,
    advanceDay: false,
    conditions: {
      minDay: 9,
      places: ['nest'],
      stats: {
        minMutation: 60,
      },
    },
    text: ctx =>
      `เมื่อก้าวเข้าสู่ใจกลางรังเชื้อในสภาพที่การกลายพันธุ์พุ่งถึง ${Math.floor(
        ctx.gameState?.stats?.mutation || 0
      )}/100 เส้นใยชีวภาพเรืองแสงตามผนังอุโมงค์ใต้ดินก็สั่นพ้องกับจังหวะชีพจรของเจ้า ซอมบี้กลายพันธุ์นับสิบตัวแหวกทางออกและค้อมศีรษะลง ราวกับรอฟังว่าเจ้าจะนำพาพวกมันไปสู่การวิวัฒนาการขั้นต่อไป หรือจะสกัดแก่นเชื้อจากใจกลางรัง`,
    choices: [
      {
        text: 'เชื่อมต่อประสาทสัมผัสเข้ากับแกนกลางรังเพื่อขึ้นเป็นจ่าฝูงสูงสุด (อำนาจฝูง +16, HP +15, การกลายพันธุ์ +8)',
        note: 'ปูทางสู่ฉากจบสายวิวัฒนาการหรือจ่าฝูงเต็มตัว',
        outcomeText:
          'เจ้าวางฝ่ามือลงบนแกนกลางใยชีวภาพ คลื่นพลังของฝูงซอมบี้ทั่วทั้งอุโมงค์หลั่งไหลเข้ามาฟื้นฟูบาดแผลและยอมจำนนต่อคำสั่งของเจ้าโดยสมบูรณ์',
        effects: {
          horde: 16,
          hp: 15,
          mutation: 8,
          sanity: 4,
          setFlag: 'hive_synapse_connected',
        },
      },
      {
        text: 'ผ่าเก็บตัวอย่างเอนไซม์บริสุทธิ์จากใจกลางรังโดยไม่ถูกฝูงโจมตี (ตัวอย่างเชื้อ +3, วิจัย +12, ความเป็นมนุษย์ +4)',
        note: 'ใช้ประโยชน์จากร่างกลายพันธุ์เพื่อเก็บตัวอย่างหายากกลับไปวิจัยยาต้าน',
        outcomeText:
          'อาศัยที่ฝูงซอมบี้ไม่ทำร้ายเจ้า เจ้าจึงค่อยๆ สกัดเอนไซม์บริสุทธิ์จากแกนรังได้ถึง 3 หลอด ซึ่งเป็นกุญแจสำคัญในการสังเคราะห์เซรุ่มย้อนกลับ',
        effects: {
          samples: 3,
          research: 12,
          humanity: 4,
          setFlag: 'hive_synapse_sampled',
        },
      },
    ],
  },
];

/**
 * Evaluates all registered dynamic events in descending priority order and returns
 * the highest-priority event whose conditions are fully satisfied (and hasn't been triggered yet if `oncePerLife`).
 */
export function getNextTriggeredDynamicEvent(
  ctx: EventEvaluationContext,
  customCatalog: DynamicNarrativeEventTemplate[] = DYNAMIC_NARRATIVE_EVENTS
): LifeSimModalEvent | null {
  if (!ctx.gameState || ctx.gameState.pending || ctx.gameState.ending) {
    return null;
  }

  const sorted = [...customCatalog].sort((a, b) => b.priority - a.priority);

  for (const eventTemplate of sorted) {
    if (eventTemplate.oncePerLife && ctx.triggeredEventIds.includes(eventTemplate.id)) {
      continue;
    }

    const result = evaluateEventCondition(eventTemplate.conditions, ctx);
    if (result.matched) {
      return buildLifeSimModalFromDynamicTemplate(eventTemplate, ctx, result.matchedNpc);
    }
  }

  return null;
}

/**
 * Returns a diagnostic overview of all dynamic events and their live condition evaluation state.
 * Useful for debugging or displaying in the Studio / Engine inspector.
 */
export function inspectAllDynamicEventsStatus(
  ctx: EventEvaluationContext,
  customCatalog: DynamicNarrativeEventTemplate[] = DYNAMIC_NARRATIVE_EVENTS
): Array<{
  id: string;
  title: string;
  category: DynamicEventCategory;
  priority: number;
  alreadyTriggered: boolean;
  matched: boolean;
  unmetReasons: string[];
}> {
  return customCatalog.map(ev => {
    const alreadyTriggered = ev.oncePerLife && ctx.triggeredEventIds.includes(ev.id);
    const evalRes = evaluateEventCondition(ev.conditions, ctx);
    const titleStr =
      typeof ev.title === 'function' ? ev.title(ctx, evalRes.matchedNpc) : ev.title;
    return {
      id: ev.id,
      title: titleStr,
      category: ev.category,
      priority: ev.priority,
      alreadyTriggered,
      matched: !alreadyTriggered && evalRes.matched,
      unmetReasons: alreadyTriggered ? ['เคยทริกเกอร์ไปแล้วในชีวิตนี้'] : evalRes.unmetReasons,
    };
  });
}
