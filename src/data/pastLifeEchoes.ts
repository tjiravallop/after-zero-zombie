import {endingMetrics} from './endingPresentation';
import {
  ORGANIC_ENDING_CLIMAX_EVENTS,
  EXTERNAL_AI_ROAM_EVENTS,
  EXTERNAL_AI_NPCS,
  ExternalGameEventTemplate,
} from './externalEventsPack';
import { BANGKOK_2026_BIOS } from './bangkokBios';
import districts from './bangkokLocations.json';
import { getEndingReadiness } from './progressionRules';
import { relationshipState, relationshipTier, npcPosture, npcHuntEffects, crisisNeed } from './npcRelationships.js';
import { npcEncounterWitnesses, prepareNpcModal } from './npcInteractions';
import { materializeZoneResidents } from './zoneResidents';

export type CharacterAgeGroup = 'เด็ก' | 'วัยรุ่น' | 'ผู้ใหญ่' | 'ผู้สูงอายุ';
export interface CharacterAppearance {
  hairStyle: 'short' | 'bob' | 'long' | 'tied' | 'messy' | 'undercut' | 'curly' | 'parted' | 'twin';
  hairColor: '#354b42' | '#51443c' | '#46516b' | '#88938c' | '#b5b8a5';
  outfitVariant: 0 | 1 | 2;
  eyeType?: number;
  glassesType?: number;
}
export interface CharacterBioDossier {
  id: string;
  fullNameHint: string;
  age: number;
  gender: 'ชาย' | 'หญิง';
  occupation: string;
  clothingClue: string;
  personalItemClue: string;
  signatureItemName: string;
  signatureItemDesc: string;
  specialChoiceLabel: string;
  specialChoiceOutcome: string;
  specialChoiceEffect: {
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
    npcTrustDelta?: number;
  };
  preDeathDetail: string;
  autopsyObservation: string;
  daysInfectedEstimate: number;
  startingNote: string;
  perkSummary: string;
  applyToState: (state: any) => void;
  profileVersion?: 1;
  generationSeed?: number;
  occupationId?: string;
  templateId?: string;
  portraitRole?: string;
  ageGroup?: CharacterAgeGroup;
  appearance?: CharacterAppearance;
  startPlace?: string;
}

export interface MutationStageInfo {
  stageNumber: 1 | 2 | 3 | 4;
  title: string;
  rangeLabel: string;
  accentColor: string;
  abilityText: string;
  sideEffectText: string;
  dailyHpRegen: number;
  unlocksDarkSenseChoice: boolean;
  unlocksApexHordeChoice: boolean;
}

export interface CauseOfDeathInfo {
  code: string;
  categoryLabel: string;
  title: string;
  description: string;
  badgeColor: string;
  narrativeTitle?: string;
  narrativeText?: string;
}

export interface DeathEndingNarrative {
  cause: CauseOfDeathInfo;
  title: string;
  text: string;
}

/** เกณฑ์จำนวนสังหารมนุษย์จำนวนมาก (5 คนขึ้นไป) สำหรับตัดสินฉากจบความหิวและพฤติกรรม */
export const HIGH_KILLS_THRESHOLD = 5;

export interface PastLifeRecord {
  characterProfile?: Omit<CharacterBioDossier, 'applyToState'>;
  runId: string;
  lifeNumber: number;
  timelineDate: string;
  dayReached: number;
  originId: string;
  originName: string;
  strainId: string;
  strainName: string;
  bioDossier: {
    id: string;
    age: number;
    gender: string;
    occupation: string;
    clothingClue: string;
    personalItemClue: string;
    daysInfectedEstimate: number;
  };
  endingId: string;
  endingTitle: string;
  causeOfDeath?: CauseOfDeathInfo;
  finalPlaceId: string;
  finalPlaceName: string;
  summaryText: string;
  deeds: {
    alliedHumans?: number;
    savedHumans: number;
    killedHumans: number;
    corpseMeals: number;
    carriedBloodBags?: number;
    enduredDays: number;
    helpedClinic: boolean;
    alliedMali: boolean;
    recalledMedicalPast: boolean;
    ledHorde: boolean;
    jammedRadio: boolean;
    fortifiedShelter: boolean;
    surrenderedToInstinct: boolean;
    researchScore: number;
    hordeScore: number;
    mutationScore: number;
    humanityScore: number;
  };
}

export interface OrganicEchoPopupEvent {
  id: string;
  fromLifeNumber: number;
  placeId: string;
  title: string;
  text: string;
  choices: Array<{
    text: string;
    note: string;
    outcomeLog: string;
    effects?: {
      stat?: 'sanity' | 'humanity' | 'research' | 'horde' | 'mutation' | 'hp' | 'hunger';
      delta?: number;
      item?: 'supplies' | 'medicine' | 'samples' | 'carriedBloodBags';
      itemDelta?: number;
    };
  }>;
}

export interface ZoneNpc {
  relationship?: ReturnType<typeof relationshipState>;
  id: string;
  name: string;
  age: number;
  role: string;
  trait: string;
  placeId: string;
  isStoryNpc?: boolean;
  storyNpcKey?: string;
  alive: boolean;
  met: boolean;
  seen?: boolean;
  localResident?: boolean;
  trust: number; // 0 to 100 individual trust
  lastNote: string;
  crisisDay?: number;
  crisisText?: string;
  crisisResolved?: boolean;
}

export interface ZonePopulationState {
  placeId: string;
  placeName: string;
  initialTotalPopulation: number;
  unmetAnonymousSurvivors: number;
  npcs: ZoneNpc[];
}

export interface LifeSimModalEvent {
  runId?: string;
  relationshipPrepared?: boolean;
  expectedDay?: number;
  witnessIds?: string[];
  id: string;
  title: string;
  text: string;
  dayNote: string;
  statusNote?: string;
  targetNpcId?: string;
  placeId: string;
  advanceDay?: boolean;
  isEndingClimax?: boolean;
  contentId?: string;
  cooldownDays?: number;
  onResolveSetFlags?: string[];
  allowRepeatUntilDepleted?: boolean;
  choices: Array<{
    relationshipKind?: string;
    pressure?: boolean;
    partKey?: string;
    text: string;
    note: string;
    enabled: boolean;
    disabledReason?: string;
    outcomeText: string;
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
      tensionDays?: number;
      threatDelta?: number;
      setFlag?: string;
      setFlags?: string[];
      triggerEndingId?: string;
      executeEngineActionId?: string;
    };
  }>;
}

export const MAX_BOMBING_DAY = 120;
export const TIMELINE_START_DATE_LABEL =
  '15 ตุลาคม · วันที่ 1 หลังปิดตายเขตกักกันกรุงเทพฯ (เส้นตาย 120 วันก่อนปูพรมทิ้งระเบิด)';

export function formatTimelineDate(day: number): string {
  const d = Math.max(1, Math.floor(day || 1));
  const baseDay = 14 + d; // Day 1 = 15 Oct
  if (baseDay <= 31) {
    return `${baseDay} ตุลาคม`;
  }
  const novDay = baseDay - 31; // Nov has 30 days (Day 18 = 1 Nov, Day 47 = 30 Nov)
  if (novDay <= 30) {
    return `${novDay} พฤศจิกายน`;
  }
  const decDay = novDay - 30; // Dec has 31 days (Day 48 = 1 Dec, Day 78 = 31 Dec)
  if (decDay <= 31) {
    return `${decDay} ธันวาคม`;
  }
  const janDay = decDay - 31; // Jan has 31 days (Day 79 = 1 Jan, Day 109 = 31 Jan)
  if (janDay <= 31) {
    return `${janDay} มกราคม`;
  }
  const febDay = janDay - 31; // Feb (Day 110 = 1 Feb, Day 120 = 11 Feb)
  return `${febDay} กุมภาพันธ์`;
}

export interface MutationMilestoneEntry {
  threshold: 25 | 50 | 75;
  title: string;
  category: string;
  bodyChange: string;
  awakeningText: string;
  badgeColor: string;
}

export const MUTATION_MILESTONES: Record<25 | 50 | 75, MutationMilestoneEntry> = {
  25: {
    threshold: 25,
    title: 'เซลล์กลายพันธุ์ระยะตื่นรู้ · ประสาทสัมผัสเชื่อมต่อความมืด (Mutation 25%)',
    category: 'การกลายพันธุ์ระดับที่ 1 (Mutation Milestone 25%)',
    bodyChange: 'ม่านตาขยายกว้างและไวต่อการเคลื่อนไหวในเงามืด เส้นเสียงเริ่มแห้งกร้านและเปล่งคลื่นความถี่ต่ำในลำคอ',
    awakeningText:
      'ค่าการกลายพันธุ์แตะระดับ 25/100! เซลล์ไวรัสในร่างเริ่มจัดโครงสร้างใหม่ ประสาทสัมผัสไวขึ้นจนมองเห็นในเงามืดและได้กลิ่นเลือดหรือสิ่งของจากระยะไกล ปลดล็อกการฟื้นฟูเนื้อเยื่ออัตโนมัติ',
    badgeColor: 'border-amber-400 text-amber-300 bg-amber-950/40',
  },
  50: {
    threshold: 50,
    title: 'โครงสร้างชีวภาพแปรสภาพ · เชื่อมต่อคลื่นความถี่ฝูงซอมบี้ (Mutation 50%)',
    category: 'การกลายพันธุ์ระดับที่ 2 (Mutation Milestone 50%)',
    bodyChange: 'ผิวหนังเปลี่ยนเป็นสีเทาคล้ำ แผลภายนอกเริ่มสมานตัวด้วยเส้นใยชีวภาพ ซอมบี้ทั่วไปหยุดมองเจ้าเป็นเหยื่อ',
    awakeningText:
      'ค่าการกลายพันธุ์แตะระดับ 50/100! เนื้อเยื่อกลายพันธุ์ยึดครองระบบประสาทอย่างลึกซึ้ง ซอมบี้ไร้สติเริ่มหลีกทางให้ และร่างนี้เริ่มส่งคลื่นเสียงสะท้อนนำทางพวกมันได้ อัตราฟื้นฟูแผลเพิ่มขึ้น',
    badgeColor: 'border-purple-400 text-purple-300 bg-purple-950/40',
  },
  75: {
    threshold: 75,
    title: 'วิวัฒน์สู่ระดับอัลฟ่า · ร่างวิวัฒน์จ่าฝูงไร้พ่าย (Mutation 75%)',
    category: 'การกลายพันธุ์ระดับสูงสุด (Mutation Milestone 75%)',
    bodyChange: 'กระดูกและกล้ามเนื้อขยายขนาดขึ้น รูปลักษณ์หลุดพ้นจากความเป็นมนุษย์อย่างสิ้นเชิง แต่พลังกลายพันธุ์พุ่งสู่ขีดสุด',
    awakeningText:
      'ค่าการกลายพันธุ์แตะระดับ 75/100! ก้าวข้ามขีดจำกัดของสิ่งมีชีวิตเดิม กลายเป็นจ่าฝูงผู้ติดเชื้อที่ทรงพลัง เนื้อเยื่อสมานตัวรวดเร็ว ร่างกายทนทานต่อการบาดเจ็บอย่างน่าสะพรึงกลัว',
    badgeColor: 'border-lime-400 text-lime-300 bg-lime-950/40',
  },
};

/**
 * ข้อ 1: การตื่นรู้ของร่างกาย (Mutation Stages & Physical Side Effects)
 */
export function getMutationStageInfo(mutationValue: number): MutationStageInfo {
  const m = Math.floor(mutationValue || 0);
  if (m >= 85) {
    return {
      stageNumber: 4,
      title: 'ระยะที่ 4 · ร่างวิวัฒน์ขั้นสูงสุด (Apex Strain)',
      rangeLabel: `${m}/100 (85–100)`,
      accentColor: 'text-lime-300 border-lime-400/60 bg-lime-950/30',
      abilityText:
        'เซลล์กลายพันธุ์สมบูรณ์ ฟื้นฟูสภาพร่างอัตโนมัติ +5 HP ทุกวัน ปลดล็อกตัวเลือก [คลื่นสั่งการจ่าฝูง] และตรวจจับทุกสิ่งในความมืด',
      sideEffectText:
        'รูปลักษณ์ภายนอกไม่หลงเหลือเค้าโครงคนเดิม มนุษย์ที่ไม่คุ้นเคยจะตื่นกลัวทันทีหากไม่แสดงการช่วยเหลือ',
      dailyHpRegen: 5,
      unlocksDarkSenseChoice: true,
      unlocksApexHordeChoice: true,
    };
  }
  if (m >= 60) {
    return {
      stageNumber: 3,
      title: 'ระยะที่ 3 · เนื้อเยื่อชีวภาพกลายพันธุ์ & คลื่นจ่าฝูง',
      rangeLabel: `${m}/100 (60–84)`,
      accentColor: 'text-purple-300 border-purple-400/60 bg-purple-950/30',
      abilityText:
        'ซอมบี้ไร้สติไม่โจมตีและยอมหลีกทางให้ เนื้อเยื่อสมานแผลเอง +3 HP ทุกวัน ปลดล็อกตัวเลือก [คลื่นความถี่สั่งฝูง]',
      sideEffectText:
        'เส้นเลือดดำและโครงกระดูกเปลี่ยนรูปชัดเจน เสียงที่เปล่งออกมาเป็นคลื่นความถี่ต่ำของซอมบี้โดยสมบูรณ์',
      dailyHpRegen: 3,
      unlocksDarkSenseChoice: true,
      unlocksApexHordeChoice: true,
    };
  }
  if (m >= 30) {
    return {
      stageNumber: 2,
      title: 'ระยะที่ 2 · ประสาทสัมผัสผู้ติดเชื้อตื่นตัว',
      rangeLabel: `${m}/100 (30–59)`,
      accentColor: 'text-amber-300 border-amber-400/60 bg-amber-950/30',
      abilityText:
        'ดวงตามองเห็นในที่มืดสนิทและได้กลิ่นเลือด/สิ่งของจากระยะไกล (ปลดล็อกตัวเลือก [ประสาทสัมผัสกลายพันธุ์] ในเหตุการณ์)',
      sideEffectText:
        'เส้นเสียงแข็งตัวจนพูดออกเสียงภาษามนุษย์ไม่ได้แล้ว ต้องสื่อสารด้วยการขีดเขียนหรือภาษากายเท่านั้น',
      dailyHpRegen: 1,
      unlocksDarkSenseChoice: true,
      unlocksApexHordeChoice: false,
    };
  }
  return {
    stageNumber: 1,
    title: 'ระยะที่ 1 · เพิ่งกลายพันธุ์ (ร่างยังคล้ายคนเป็น)',
    rangeLabel: `${m}/100 (0–29)`,
    accentColor: 'text-sky-300 border-sky-400/40 bg-sky-950/25',
    abilityText:
      'รูปลักษณ์ภายนอกยังใกล้เคียงมนุษย์ ทำให้เข้าใกล้ผู้รอดชีวิตได้โดยไม่ทำให้ตื่นตระหนกทันที',
    sideEffectText:
      'ร่างกายยังบอบบางเหมือนคนเพิ่งตายและยังไม่มีการฟื้นฟูเนื้อเยื่ออัตโนมัติ',
    dailyHpRegen: 0,
    unlocksDarkSenseChoice: false,
    unlocksApexHordeChoice: false,
  };
}

/**
 * ข้อ 4: ของติดตัวและตัวเลือกพิเศษจากอาชีพก่อนตาย (Signature Item & Occupation Perks)
 */
export const CHARACTER_BIO_DOSSIERS: CharacterBioDossier[] = [
  {
    id: 'bio_student_20m',
    fullNameHint: 'ป้ายชื่อนักศึกษาที่มุมขาดหาย',
    age: 20,
    gender: 'ชาย',
    occupation: 'นักศึกษาปี 2 คณะวิทยาศาสตร์ชีวภาพ',
    clothingClue: 'เสื้อช็อปปฏิบัติการสีขาวหม่นที่มีคราบกาแฟแห้งตรงอกซ้าย',
    personalItemClue: 'พวงกุญแจหอพักนักศึกษาที่บิดงอและสมุดจดแล็บเล่มเล็ก',
    signatureItemName: 'สมุดจดแล็บชีวภาพ & บัตรผ่านห้องวิจัย',
    signatureItemDesc: 'ของติดตัวก่อนตาย: ใช้เปิดทางเลือกวิเคราะห์เชื้อและช่วยตรวจอาการติดเชื้อให้ผู้รอดชีวิตได้',
    specialChoiceLabel: '[ความถนัดนักศึกษาชีวภาพ] ใช้ความรู้แล็บตรวจคัดกรองเชื้อและอธิบายด้วยสมุดจด',
    specialChoiceOutcome: 'เจ้าใช้สมุดจดแล็บที่พกติดตัวเขียนอธิบายระยะการแพร่เชื้อและวิธีป้องกันให้เขาเข้าใจอย่างแม่นยำ จนเขาวางใจและมอบหลอดตัวอย่างให้',
    specialChoiceEffect: {
      research: 12,
      sanity: 4,
      samples: 1,
      npcTrustDelta: 7,
      hunger: 6,
    },
    preDeathDetail:
      'สวมเสื้อช็อปปฏิบัติการสีขาวหม่นที่มีคราบกาแฟแห้งตรงอกซ้าย ในกระเป๋ากางเกงยังมีพวงกุญแจหอพักนักศึกษาที่บิดงอและสมุดจดแล็บเล่มเล็ก',
    autopsyObservation:
      'ดูจากรอยกัดบริเวณข้อมือซ้ายและสีของเส้นเลือดที่เปลี่ยนเป็นสีคล้ำ คาดว่าติดเชื้อและกลายพันธุ์มาแล้วประมาณ 3 วัน ก่อนที่สติจะค่อยๆ ฟื้นคืนมาในเช้าวันนี้',
    daysInfectedEstimate: 3,
    startingNote: 'พกสมุดจดแล็บติดตัว · เปิดตัวเลือกพิเศษสายวิเคราะห์เชื้อ',
    perkSummary: 'งานวิจัยเริ่มต้น +10 · สติ +4',
    applyToState: (s: any) => {
      s.stats.research = Math.min(100, (s.stats.research || 10) + 10);
      s.stats.sanity = Math.min(100, (s.stats.sanity || 70) + 4);
      s.carriedBloodBags = 0;
    },
  },
  {
    id: 'bio_paramedic_26f',
    fullNameHint: 'ริบบิ้นป้ายชื่อหน่วยกู้ชีพฉุกเฉิน',
    age: 26,
    gender: 'หญิง',
    occupation: 'อาสาสมัครกู้ชีพกะดึก',
    clothingClue: 'เสื้อกั๊กสะท้อนแสงหน่วยกู้ชีพที่ขาดวิ่นข้างหนึ่ง',
    personalItemClue: 'กระเป๋าปฐมพยาบาลคาดเอวสีแดงหม่นที่มีรอยกรงเล็บข่วน',
    signatureItemName: 'ชุดคีมและเข็มกู้ชีพฉุกเฉินประจำตัว',
    signatureItemDesc: 'ของติดตัวก่อนตาย: ช่วยห้ามเลือดและปฐมพยาบาลคนเจ็บหรือเย็บแผลตัวเองได้โดยไม่เสียชุดเย็บแผล',
    specialChoiceLabel: '[ความถนัดอาสากู้ชีพ] ใช้เครื่องมือกู้ชีพประจำตัวช่วยปฐมพยาบาลแผลให้โดยไม่เสียเวชภัณฑ์',
    specialChoiceOutcome: 'สองมือที่เคยชินกับงานกู้ชีพกะดึกช่วยทำแผลและเข้าเฝือกชั่วคราวให้เขาอย่างคล่องแคล่ว แม้เจ้าจะกลายเป็นซอมบี้ไปแล้วแต่สัญชาตญาณการช่วยชีวิตยังอยู่ครบ',
    specialChoiceEffect: {
      hp: 10,
      humanity: 8,
      sanity: 5,
      npcTrustDelta: 9,
      hunger: 6,
    },
    preDeathDetail:
      'สวมเสื้อกั๊กสะท้อนแสงหน่วยกู้ชีพที่ขาดวิ่นข้างหนึ่ง ที่เอวยังมีกระเป๋าปฐมพยาบาลสีแดงหม่นที่มีรอยกรงเล็บข่วนและชุดเข็มเย็บแผลฉุกเฉินชุดเดียว',
    autopsyObservation:
      'พบรอยข่วนลึกที่หัวไหล่ขวาซึ่งเริ่มสมานตัวด้วยเนื้อเยื่อกลายพันธุ์ คาดว่าเสียชีวิตและกลายพันธุ์มาแล้วประมาณ 4 วัน ร่างกายยังจำท่าทางการพันแผลได้โดยอัตโนมัติ',
    daysInfectedEstimate: 4,
    startingNote: 'พกชุดคีมกู้ชีพติดตัว · เปิดตัวเลือกปฐมพยาบาลฟรีในเหตุการณ์',
    perkSummary: 'ชุดเย็บแผลเริ่มต้น +1 · สภาพร่าง +6',
    applyToState: (s: any) => {
      s.items.medicine = (s.items.medicine || 0) + 1;
      s.stats.hp = Math.min(100, (s.stats.hp || 80) + 6);
      s.carriedBloodBags = 0;
    },
  },
  {
    id: 'bio_courier_23m',
    fullNameHint: 'ใบนำส่งพัสดุที่เปื้อนเขม่าควัน',
    age: 23,
    gender: 'ชาย',
    occupation: 'พนักงานส่งของด่วนประจำเขตเมืองชั้นใน',
    clothingClue: 'เสื้อคลุมกันฝนสีเหลืองหม่นและรองเท้าวิ่งพื้นสึก',
    personalItemClue: 'กระเป๋าสะพายส่งพัสดุที่มีแถบสะท้อนแสงขาดครึ่งท่อน',
    signatureItemName: 'กระเป๋าสะพายส่งพัสดุ & แผนที่ตรอกลัดในเมือง',
    signatureItemDesc: 'ของติดตัวก่อนตาย: รู้จักซอกตึกและจุดซ่อนพัสดุฉุกเฉิน ใช้ชี้ทางหนีปลอดภัยให้คนเป็นได้',
    specialChoiceLabel: '[ความถนัดคนส่งของด่วน] ชี้เส้นทางลัดหลบฝูงซอมบี้และเปิดจุดซ่อนพัสดุให้',
    specialChoiceOutcome: 'เจ้าใช้แผนที่ตรอกลัดที่จำได้แม่นยำนำทางเขาหลบจุดที่มีฝูงซอมบี้ดักอยู่ พร้อมแบ่งพัสดุเสบียงที่ซ่อนอยู่ตามตึกให้',
    specialChoiceEffect: {
      supplies: 1,
      humanity: 5,
      sanity: 5,
      npcTrustDelta: 7,
      hunger: 6,
    },
    preDeathDetail:
      'สวมเสื้อคลุมกันฝนสีเหลืองหม่นและรองเท้าวิ่งพื้นสึก ในกระเป๋าสะพายส่งพัสดุที่มีแถบสะท้อนแสงขาดครึ่งท่อนยังมีอาหารกระป๋องของมนุษย์หลงเหลืออยู่ 1 กระป๋อง',
    autopsyObservation:
      'ดูจากสภาพกล้ามเนื้อขาที่เกร็งค้างและแผลติดเชื้อที่น่อง คาดว่ากลายพันธุ์มาแล้วราว 2 วันเต็มหลังพยายามวิ่งหนีฝูงซอมบี้เข้าซอยตัน',
    daysInfectedEstimate: 2,
    startingNote: 'พกแผนที่ตรอกลัด · เปิดตัวเลือกหาเสบียงและชี้ทางลัด',
    perkSummary: 'เสบียงมนุษย์เริ่มต้น +1 · สติ +6',
    applyToState: (s: any) => {
      s.items.supplies = (s.items.supplies || 0) + 1;
      s.stats.sanity = Math.min(100, (s.stats.sanity || 70) + 6);
      s.carriedBloodBags = 0;
    },
  },
  {
    id: 'bio_watchman_38m',
    fullNameHint: 'พวงกุญแจเหล็กของรปภ.ตึกแถว',
    age: 38,
    gender: 'ชาย',
    occupation: 'คนเฝ้ายามอาคารพาณิชย์ใกล้ถนนหมายเลขศูนย์',
    clothingClue: 'เสื้อเชิ้ตเครื่องแบบสีกรมท่าที่กระดุมหลุดหายไปครึ่งแถว',
    personalItemClue: 'ไฟฉายกระบอกเหล็กที่เลนส์ร้าวและนกหวีดทองเหลือง',
    signatureItemName: 'พวงกุญแจมาสเตอร์คีย์ & ไฟฉายกระบอกเหล็ก',
    signatureItemDesc: 'ของติดตัวก่อนตาย: ใช้ไขประตูเหล็กกั้นภัยและส่งสัญญาณไฟฉายเตือนภัยให้ผู้รอดชีวิต',
    specialChoiceLabel: '[ความถนัดคนเฝ้ายาม] ใช้พวงกุญแจสำรองไขห้องปลอดภัยและกะพริบไฟฉายบอกทาง',
    specialChoiceOutcome: 'เจ้ากะพริบไฟฉายกระบอกเหล็กเป็นจังหวะบอกสัญญาณปลอดภัย แล้วไขประตูห้องพักเวรให้เขาเข้าไปหลบฝูงซอมบี้ได้ทัน',
    specialChoiceEffect: {
      sanity: 6,
      humanity: 6,
      medicine: 1,
      npcTrustDelta: 8,
      hunger: 6,
    },
    preDeathDetail:
      'สวมเสื้อเชิ้ตเครื่องแบบสีกรมท่าที่กระดุมหลุดหายไปครึ่งแถว ข้างเอวเหน็บไฟฉายกระบอกเหล็กที่เลนส์ร้าวและนกหวีดทองเหลือง ข้อนิ้วมือมีรอยถลอกจากการยันประตูเหล็ก',
    autopsyObservation:
      'ผิวหนังเริ่มซีดเทาและอุณหภูมิร่างกายเย็นเฉียบ คาดว่ากลายพันธุ์มาแล้วประมาณ 5 วัน แต่จิตใต้สำนึกที่เคยเฝ้าประตูทำให้ยังยั้งสัญชาตญาณความหิวได้ดี',
    daysInfectedEstimate: 5,
    startingNote: 'พกพวงกุญแจมาสเตอร์คีย์ · เปิดตัวเลือกไขห้องปลอดภัยและคุ้มกัน',
    perkSummary: 'ความหิวเริ่มต้นลดลง -8 · ความเห็นใจ +6',
    applyToState: (s: any) => {
      s.stats.hunger = Math.max(0, (s.stats.hunger || 25) - 8);
      s.stats.humanity = Math.min(100, (s.stats.humanity || 50) + 6);
      s.carriedBloodBags = 0;
    },
  },
  {
    id: 'bio_subway_19f',
    fullNameHint: 'ตั๋วรถไฟใต้ดินเที่ยวสุดท้ายที่ยับยู่ยี่',
    age: 19,
    gender: 'หญิง',
    occupation: 'พนักงานพาร์ทไทม์ร้านสะดวกซื้อในสถานีใต้ดิน',
    clothingClue: 'เสื้อฮู้ดสีเทาตัวโคร่งทับผ้ากันเปื้อนร้านสะดวกซื้อสีเขียวเข้ม',
    personalItemClue: 'ป้ายชื่อพลาสติกกลัดอกที่ร้าวครึ่งแผ่นและเหรียญหยอดตู้กดน้ำ',
    signatureItemName: 'กุญแจสต็อกร้านค้าใต้ดิน & เหรียญโทเคน',
    signatureItemDesc: 'ของติดตัวก่อนตาย: รู้จุดซ่อนของในตู้แช่หลังร้านและคุ้นเคยกับเสียงสะท้อนในอุโมงค์',
    specialChoiceLabel: '[ความถนัดเด็กพาร์ทไทม์ใต้ดิน] เปิดห้องสต็อกลับและกันฝูงซอมบี้ในเงามืดออกไป',
    specialChoiceOutcome: 'เจ้าพาเขาหลบเข้าช่องทางเดินพนักงานหลังร้านและส่งเสียงสะท้อนในลำคอดึงความสนใจของฝูงซอมบี้ไปอีกฝั่ง',
    specialChoiceEffect: {
      horde: 12,
      mutation: 5,
      supplies: 1,
      npcTrustDelta: 6,
      hunger: 6,
    },
    preDeathDetail:
      'สวมเสื้อฮู้ดสีเทาตัวโคร่งทับผ้ากันเปื้อนร้านสะดวกซื้อสีเขียวเข้ม ดวงตาปรับตัวเข้ากับความมืดสนิทได้เร็วผิดปกติ และได้ยินเสียงคลื่นความถี่ต่ำของฝูงซอมบี้ชัดเจน',
    autopsyObservation:
      'เส้นเลือดดำรอบดวงตาขยายตัวชัด คาดว่าติดเชื้อจากในอุโมงค์ใต้ดินและกลายพันธุ์มาแล้วประมาณ 3 วัน เชื้อในร่างปรับตัวเข้ากับสายพันธุ์ฝูงได้เร็วมาก',
    daysInfectedEstimate: 3,
    startingNote: 'พกกุญแจสต็อกร้านค้า · เปิดตัวเลือกควบคุมจังหวะฝูงและหาของซ่อน',
    perkSummary: 'อำนาจฝูงเริ่มต้น +10 · กลายพันธุ์ +6',
    applyToState: (s: any) => {
      s.stats.horde = Math.min(120, (s.stats.horde || 0) + 10);
      s.stats.mutation = Math.min(100, (s.stats.mutation || 10) + 6);
      s.carriedBloodBags = 0;
    },
  },
  {
    id: 'bio_radio_31f',
    fullNameHint: 'บัตรประจำตัวเจ้าหน้าที่กระจายเสียงท้องถิ่น',
    age: 31,
    gender: 'หญิง',
    occupation: 'ช่างเทคนิคห้องส่งวิทยุกระจายเสียง',
    clothingClue: 'เสื้อแจ็กเก็ตผ้าร่มสีดำที่มีรอยไหม้ตรงปลายแขน',
    personalItemClue: 'หูฟังมอนิเตอร์ข้างเดียวที่สายขาดห้อยอยู่รอบคอ',
    signatureItemName: 'วิทยุรับส่งคลื่นสั้นดัดแปลง & หูฟังมอนิเตอร์',
    signatureItemDesc: 'ของติดตัวก่อนตาย: ดักฟังคลื่นความถี่ฉุกเฉินและซ่อมวงจรสื่อสารให้ผู้รอดชีวิตได้',
    specialChoiceLabel: '[ความถนัดช่างเทคนิควิทยุ] จูนคลื่นวิทยุพกพาเพื่อเตือนภัยและซ่อมเครื่องมือสื่อสารให้',
    specialChoiceOutcome: 'เจ้าต่อสายวิทยุพกพาเข้ากับลำโพงเล็กเพื่อเปิดคลื่นสัญญาณบอกตำแหน่งปลอดภัยให้เขารู้ล่วงหน้า',
    specialChoiceEffect: {
      research: 10,
      sanity: 6,
      humanity: 5,
      npcTrustDelta: 8,
      hunger: 6,
    },
    preDeathDetail:
      'สวมเสื้อแจ็กเก็ตผ้าร่มสีดำที่มีรอยไหม้ตรงปลายแขนและมีหูฟังมอนิเตอร์ข้างเดียวที่สายขาดห้อยอยู่รอบคอ ที่ข้อมือมีรอยปากกาเมจิกเขียนความถี่วิทยุฉุกเฉินจางๆ',
    autopsyObservation:
      'พบรอยกัดบริเวณต้นคอที่ตกสะเก็ดดำ คาดว่ากลายพันธุ์มาแล้วประมาณ 3 วันครึ่ง สติสัมปชัญญะยังเกาะติดอยู่กับเสียงคลื่นวิทยุ',
    daysInfectedEstimate: 3,
    startingNote: 'พกวิทยุคลื่นสั้นดัดแปลง · เปิดตัวเลือกซ่อมอุปกรณ์และดักฟังสัญญาณ',
    perkSummary: 'สติเริ่มต้น +8 · งานวิจัย +6',
    applyToState: (s: any) => {
      s.stats.sanity = Math.min(100, (s.stats.sanity || 70) + 8);
      s.stats.research = Math.min(100, (s.stats.research || 10) + 6);
      s.carriedBloodBags = 0;
    },
  },
];

// Keep original entries first so old saves and sample defaults retain their identity.
CHARACTER_BIO_DOSSIERS.push(...BANGKOK_2026_BIOS);

export const INITIAL_SAMPLE_PAST_LIVES: PastLifeRecord[] = [];

export function deriveCauseOfDeath(
  state: any,
  customEndingOverride?: {
    id?: string;
    title?: string;
    text?: string;
    causeCode?: string;
    surrendered?: boolean;
  }
): CauseOfDeathInfo {
  const existing = state?.ending?.causeOfDeath;
  if (
    existing &&
    typeof existing === 'object' &&
    existing.code &&
    existing.title &&
    existing.description &&
    existing.narrativeTitle &&
    !customEndingOverride?.causeCode &&
    !customEndingOverride?.id
  ) {
    return {
      code: existing.code,
      categoryLabel: existing.categoryLabel || 'บันทึกสาเหตุการสิ้นสุด',
      title: existing.title,
      description: existing.description,
      badgeColor: existing.badgeColor || 'rose',
      narrativeTitle: existing.narrativeTitle,
      narrativeText: existing.narrativeText,
    };
  }

  const endingId = customEndingOverride?.id || state?.ending?.id || 'death';
  const causeHint = (
    customEndingOverride?.causeCode ||
    state?.ending?.causeCode ||
    ''
  ).toLowerCase();

  const day = Number(state?.day || 1);
  const hunger = Number(state?.stats?.hunger ?? 0);
  const sanity = Number(state?.stats?.sanity ?? 0);
  const humanity = Number(state?.stats?.humanity ?? 0);
  const horde = Number(state?.stats?.horde ?? 0);
  const mutation = Number(state?.stats?.mutation ?? 0);
  const carriedBloodBags = Number(state?.carriedBloodBags ?? state?.items?.carriedBloodBags ?? 0);
  const starvationDays = Number(state?.body?.starvationDays ?? 0);
  const weather = state?.story?.flags?.['next.weather'];
  const place = String(state?.place || 'shelter');
  const killed = Number(state?.memory?.killed || 0);
  const corpseMeals = Number(state?.memory?.corpseMeals || 0);
  const saved = Number(state?.memory?.saved || 0);
  const endured = Number(state?.memory?.endured || 0);

  const recentLogText = (state?.log || [])
    .slice(0, 4)
    .map((entry: any) => entry?.text || '')
    .join(' ');

  // 1. ตรวจสอบการถูกโจมตีจากมนุษย์/กลุ่มติดอาวุธ
  const isHumanAttackContext =
    causeHint === 'human_attack' ||
    causeHint === 'attack' ||
    causeHint === 'killed_by_humans' ||
    /\[ภัยพื้นที่.*ปะทะ|ถูกยิง|โดนยิง|ซุ่มยิง|กระสุน|ลูกซอง|ปืนกล|แทง|หอกประดิษฐ์|ทหาร|ด่านทหาร|กลุ่มพลเรือนติดอาวุธ|ระดมยิง|ฝ่าด่านทหาร/.test(
      recentLogText
    );

  // 2. ตรวจสอบสภาพแวดล้อมหนาวเหน็บ/ฝนเขม่า
  const isColdOrRainContext =
    causeHint === 'hypothermia' ||
    causeHint === 'environmental' ||
    /ฝนเขม่า|ฝนกรด|พายุฝน|หนาวสั่น|เย็นเฉียบ|อุณหภูมิร่างกายลด|ตู้แช่/.test(recentLogText) ||
    (weather === 'rain' &&
      ['streets', 'radio', 'tower', 'nest'].includes(place) &&
      !isHumanAttackContext &&
      causeHint !== 'starvation');

  // 1. Bombardment (Day 120 Operation Firestorm / Bombed / Survivor on Day 120)
  if (
    causeHint === 'bombardment' ||
    endingId === 'bombed' ||
    (endingId === 'survivor' && day >= 120) ||
    (endingId === 'death' && day >= 120)
  ) {
    return {
      code: 'BOMBARDMENT',
      categoryLabel: 'Bombardment · ปฏิบัติการทิ้งระเบิดเพลิงปูพรม',
      title: 'ถูกเผาผลาญจากปฏิบัติการทิ้งระเบิดเพลิงกวาดล้างกรุงเทพฯ (Operation Firestorm)',
      description:
        'เมื่อครบกำหนดเส้นตาย 120 วัน ฝูงบินทิ้งระเบิดได้ปูพรมระเบิดเพลิงความร้อนสูงเหนือเขตกักกันกรุงเทพฯ คลื่นความร้อนและแรงอัดอากาศกวาดล้างทุกชีวิตที่ยังติดอยู่ในพื้นที่ปิดล้อม',
      badgeColor: 'orange',
      narrativeTitle: 'เปลวเพลิงลบล้างเขตกักกันกรุงเทพฯ · ครบกำหนด 120 วัน',
      narrativeText:
        'ครบ 120 วันหลังปิดตายกรุงเทพมหานคร ฝูงบินทิ้งระเบิดปูพรมโปรยเพลิงสังหารลงมาทั่วเขตกักกันเพื่อกวาดล้างเชื้อให้สิ้นซาก การติดอยู่ในเมืองจนหมดเวลาทำให้ร่างของเจ้ามอดไหม้ไปพร้อมกับซากตึกของกรุงเทพฯ',
    };
  }

  // 2. Voluntary Surrender to Zombie Instinct
  if (
    customEndingOverride?.surrendered ||
    causeHint === 'surrender' ||
    endingId === 'madness'
  ) {
    return {
      code: 'SURRENDER',
      categoryLabel: 'Mind Collapse · ยอมจำนนต่อสัญชาตญาณดิบ',
      title: 'ปล่อยวางสติสัมปชัญญะและยอมให้เชื้อกลืนกินตัวตนโดยสมบูรณ์',
      description:
        'เจ้าเลือกหยุดฝืนต้านทานเสียงเพรียกของไวรัสในสมอง ปล่อยให้ความทรงจำสุดท้ายดับวูบลง ร่างนี้จึงไม่เหลือตัวตนเดิมอีกต่อไปและเดินลากขาไปตามสัญชาตญาณดิบในฝูงผีดิบ',
      badgeColor: 'purple',
      narrativeTitle: 'ปล่อยวางสติสัมปชัญญะและยอมให้เชื้อกลืนกินตัวตน',
      narrativeText:
        'เมื่อสติสัมปชัญญะสุดท้ายดับวูบลง ความทรงจำและชื่อที่เคยพยายามยึดเหนี่ยวก็เลือนหายไป ร่างนี้ยังคงเดินต่อไปในเมืองในฐานะซอมบี้ไร้สติที่ขับเคลื่อนด้วยสัญชาตญาณความหิวเท่านั้น',
    };
  }

  // 3. Heroic Sacrifice (Silent Guardian)
  if (endingId === 'silent_guardian') {
    return {
      code: 'HEROIC_SACRIFICE',
      categoryLabel: 'Heroic Sacrifice · ยืนหยัดปกป้องจนวินาทีสุดท้าย',
      title: 'สละร่างยืนขวางฝูงผีดิบหน้าประตูหลุมหลบภัยจนผู้รอดชีวิตปลอดภัย',
      description:
        'แม้อวัยวะและกล้ามเนื้อจะฉีกขาดจากการรับคมเขี้ยวแทนผู้รอดชีวิตในเขตที่ดูแล แต่ร่างนี้ยังคงยืนขวางทางเข้าไว้จนผู้คนข้างในปลอดภัย',
      badgeColor: 'emerald',
      narrativeTitle: 'ผู้เฝ้าประตูเงียบงันแห่งเขตกักกันกรุงเทพฯ',
      narrativeText:
        'เมื่อฝูงผู้ติดเชื้อคลั่งทะลักเข้าประชิดแนวป้องกัน เจ้าพาผู้รอดชีวิตในพื้นที่ลงสู่ห้องนิรภัยใต้ดินลึก แล้วดึงสลักประตูเหล็กปิดตายจากด้านนอก ใช้ร่างของตนยืนขวางหน้าประตูไว้จนวาระสุดท้าย ผู้คนที่อยู่หลังบานประตูนั้นรอดพ้นวิกฤตและจดจำเจ้าในฐานะผู้พิทักษ์เงียบงัน',
    };
  }

  // 4. Human Attack (ถูกมนุษย์ทำร้ายจนตาย — ตรวจสอบก่อนความหิว เพื่อไม่ให้ถูกโจมตีตายกลายเป็นหิวตาย)
  if (endingId === 'death' && isHumanAttackContext) {
    let nTitle = 'เหยื่อของความตื่นตระหนก';
    let nText =
      'ในโลกที่คนเป็นมองเห็นเพียงความตาย ร่างนี้ถูกโจมตีด้วยอาวุธจนแหลกสลายเพียงเพราะก้าวเข้าไปในระยะสายตา ไม่มีคำถาม ไม่มีการเจรจา มีเพียงเสียงปืนและประกายไฟจากความตื่นตระหนกที่ดับการก้าวเดินของเจ้าลงตลอดกาล';
    let cTitle = 'ถูกคนเป็นใช้อาวุธทำร้ายจนเสียชีวิต (Fatal Human Encounter)';
    let cDesc =
      'ถูกโจมตีด้วยอาวุธปืนและของมีคมจากกลุ่มคนเป็นที่ตื่นตระหนก ความเสียหายต่อโครงสร้างร่างกายทำให้สภาพร่างลดลงเหลือ 0/100';

    if (killed >= HIGH_KILLS_THRESHOLD) {
      // 4.1 สัตว์ประหลาดในสายตาคนเป็น — ถูกมนุษย์ทำร้ายจนตาย หลังเคยฆ่าคนจำนวนมาก
      nTitle = 'สัตว์ประหลาดในสายตาคนเป็น';
      nText = `ในสายตาของผู้รอดชีวิตในเมืองปิดตาย ร่างของเจ้าคือมัจจุราชกระหายเลือดที่เคยพรากชีวิตคนเป็นไปถึง ${killed} คน ความกลัวและรอยแค้นที่สั่งสมผลักดันให้มนุษย์จับอาวุธร่วมมือกันล่าและวางกำลังตอบโต้ คมกระสุนและอาวุธทุกชนิดระดมเข้าใส่ร่างนี้ด้วยความตื่นตระหนกและหวาดผวาอย่างสุดขีด ไม่มีที่ว่างให้ความเมตตา ร่างของเจ้าล้มลงกลางซากตึก เป็นจุดจบอันสาสมและน่าสะพรึงกลัวของอสูรกายในสายตาคนเป็น`;
      cTitle = 'ถูกกลุ่มมนุษย์ติดอาวุธระดมสังหารเพื่อขจัดภัยคุกคามร้ายแรง (Terminated as Alpha Threat)';
      cDesc = `ประวัติการสังหารมนุษย์สะสม ${killed} คน ทำให้ตกเป็นเป้าหมายสูงสุดของกลุ่มผู้รอดชีวิต ถูกระดมยิงและทำลายล้างจนร่างกายแหลกสลาย`;
    } else if (saved > 0) {
      // 4.2 กระสุนของความหวาดระแวง — เคยช่วยชีวิตคนไว้ แต่ยังถูกยิงตาย
      nTitle = 'กระสุนของความหวาดระแวง';
      nText = `แม้ในชีวิตนี้เจ้าจะเคยยื่นมือเข้าช่วยเหลือผู้รอดชีวิตไว้ ${saved} ครั้ง แต่ในสายตาของคนถืออาวุธในเมืองปิดตาย ร่างที่ไร้ชีพจรของเจ้าก็ยังเป็นเพียงสัตว์ร้ายที่น่าสะพรึงกลัว คมกระสุนและอาวุธของคนเป็นระดมเข้าใส่โดยไม่มีใครหยุดฟังหรือจดจำสิ่งที่เจ้าเคยทำ ร่างนี้ล้มลงท่ามกลางความหวาดกลัวที่ไม่อาจก้าวข้าม`;
      cTitle = 'บาดแผลฉกรรจ์จากการถูกมนุษย์ใช้อาวุธโจมตี (Killed by Armed Survivors)';
      cDesc = `ถูกระดมยิงและโจมตีด้วยอาวุธจากกลุ่มคนเป็นที่หวาดระแวง บาดแผลฉกรรจ์ทำลายโครงสร้างร่างกายจนสภาพร่างดิ่งลงสู่ 0/100 แม้จะเคยช่วยชีวิตมนุษย์ไว้ ${saved} ครั้ง`;
    } else if (killed > 0) {
      // 4.3 จุดจบของนักล่า — เคยฆ่าคนบ้าง (1-4 คน)
      nTitle = 'จุดจบของนักล่า';
      nText =
        'เมืองนี้จำรอยเลือดและกลิ่นคาวที่เจ้าเคยทิ้งไว้ได้ เมื่อคนเป็นรวมกลุ่มจับอาวุธตั้งด่านตอบโต้ ผู้ที่เคยออกล่าจึงกลายเป็นเป้าหมาย ร่างของเจ้าถูกระดมยิงและกระหน่ำฟันจนล้มลงกลางซากตึก เป็นจุดจบของผู้ที่เลือกใช้คมเขี้ยวในโลกที่ทุกคนพร้อมจะเหนี่ยวไก';
      cTitle = 'ถูกกองกำลังมนุษย์ตอบโต้และสังหาร (Retaliatory Strike)';
      cDesc =
        'การออกล่าในอดีตทำให้ตกเป็นเป้าหมายของกลุ่มคนเป็นติดอาวุธ ถูกระดมยิงจนอวัยวะและกล้ามเนื้อฉีกขาดเกินกว่าจะสมานไหว';
    }

    return {
      code: 'HUMAN_ATTACK',
      categoryLabel: 'Human Attack · ถูกมนุษย์ทำร้ายจนตาย',
      title: cTitle,
      description: cDesc,
      badgeColor: 'rose',
      narrativeTitle: nTitle,
      narrativeText: nText,
    };
  }

  // 5. Hypothermia (ตายจากสภาพแวดล้อม เช่น ความหนาวหรือฝนเขม่า)
  if (endingId === 'death' && isColdOrRainContext) {
    if (humanity >= 60 && killed === 0 && saved > 0) {
      return {
        code: 'HYPOTHERMIA',
        categoryLabel: 'Hypothermia · เถ้าถ่านและหัวใจที่ไม่เคยดับ',
        title: 'ร่างที่เย็นเฉียบเคียงข้างหัวใจที่ไม่เคยละทิ้งความเป็นคน (Unbroken Humanity in the Cold)',
        description: `พายุฝนเขม่ากัดกร่อนจนอุณหภูมิร่างกายลดต่ำถึงจุดวิกฤต แต่ยังคงรักษาระดับความเป็นมนุษย์ไว้สูง (${Math.floor(
          humanity
        )}/100) ไม่เคยฆ่าคนเป็น และเคยช่วยชีวิตมนุษย์ไว้ ${saved} ครั้ง`,
        badgeColor: 'cyan',
        narrativeTitle: 'ยังไม่ได้กลายเป็นคน แต่ก็ไม่เคยเลิกเป็นคน',
        narrativeText: `แม้พายุฝนเขม่าดำและไอหนาวเหน็บจะกัดกร่อนร่างจนเย็นเฉียบ และร่างนี้จะไม่มีวันได้กลับไปเป็นมนุษย์อีกครั้ง แต่ตลอดเวลาที่ผ่านมา เจ้าไม่เคยยอมให้ความหนาวเหน็บพรากจิตวิญญาณไป ไม่เคยปลิดชีวิตใคร และเคยยื่นมือช่วยผู้รอดชีวิตไว้ ${saved} ครั้ง ร่างนี้หยุดก้าวเดินลงอย่างสงบท่ามกลางละอองเถ้าพิษ พร้อมกับความเป็นมนุษย์ที่ไม่เคยจางหาย`,
      };
    }

    return {
      code: 'HYPOTHERMIA',
      categoryLabel: 'Hypothermia · ภาวะตัวเย็นเกินและพิษฝนเขม่า',
      title: 'ภาวะตัวเย็นเกินเฉียบพลันท่ามกลางพายุฝนเขม่าดำ (Black Rain Hypothermia)',
      description:
        'การตากพายุฝนเขม่าพิษและลมหนาวกลางแจ้งติดต่อกันทำให้อุณหภูมิแกนกลางของร่างกายดิ่งลงต่ำกว่าจุดวิกฤต ระบบไหลเวียนเลือดที่ติดเชื้อแข็งตัวและหยุดทำงานในที่สุด',
      badgeColor: 'cyan',
      narrativeTitle: 'เถ้าถ่านและความเย็นเยียบ',
      narrativeText:
        'พายุฝนเขม่าดำและไอหนาวเหน็บกัดกร่อนร่างที่ไร้ความอบอุ่นทีละน้อย เลือดข้นคล้ำในเส้นเลือดแข็งตัวและหยุดไหลเวียน ร่างนี้ทรุดตัวลงพิงกำแพงผุพังอย่างเงียบงัน ไร้เสียงปืนและไร้การต่อสู้ มีเพียงละอองเถ้าพิษที่โปรยปรายลงมาปกคลุมร่างที่เย็นเฉียบ',
    };
  }

  // 6. Starvation (หิวตาย โดยแยกตามพฤติกรรมระหว่างเล่น)
  const isStarvation =
    causeHint === 'starvation' ||
    ((endingId === 'death' || endingId === 'feral') &&
      (hunger >= 85 || starvationDays >= 2));

  if (isStarvation) {
    let nTitle = '';
    let nText = '';
    let cTitle = '';
    let cDesc = '';

    if (carriedBloodBags > 0) {
      // 6.1 เลือดถุงสุดท้ายที่ไม่ได้เปิด — หิวตายทั้งที่ยังมีถุงเลือดในกระเป๋า
      nTitle = 'เลือดถุงสุดท้ายที่ไม่ได้เปิด';
      nText = `ในช่องกระเป๋าที่สะพายอยู่ ยังมีถุงเลือดสำรองจำนวน ${carriedBloodBags} ถุงที่ยังไม่ได้เปิดวางอยู่อย่างเงียบงัน เมื่อความหิวโหยพุ่งสูงจนระบบประสาทสั่งการเริ่มด้านชา นิ้วมือที่แข็งเกร็งและสั่นระริกพยายามเอื้อมไปหา แต่กลับหมดแรงและทอดนิ่งลงก่อนที่จะดึงสลักหรือเปิดถุงได้สำเร็จ ร่างนี้ทรุดลงสู่ความเงียบงัน เคียงข้างความอยู่รอดที่คว้ามาไว้ใกล้ตัวแค่นิ้วมือแต่ไม่อาจเปิดใช้`;
      cTitle = 'ภาวะขาดสารอาหารรุนแรงโดยมีเสบียงสำรองที่เปิดใช้ไม่ทัน (Unopened Emergency Reserve)';
      cDesc = `ความหิวโหยพุ่งสูงถึงขีดสุด (${Math.floor(
        hunger
      )}/100) จนกล้ามเนื้อและระบบประสาทสั่งการล้มเหลว ร่างนี้หมดสติและหยุดทำงานลง ทั้งที่ยังมีถุงเลือดพกพาตกค้างอยู่ในสัมภาระ ${carriedBloodBags} ถุง`;
    } else if (saved >= 2) {
      // 6.2 ผู้แจกอาหารที่ตัวเองกินไม่ได้ — หิวตาย หลังช่วยชีวิตคนไว้หลายครั้ง
      nTitle = 'ผู้แจกอาหารที่ตัวเองกินไม่ได้';
      nText = `ตลอดเวลาที่ผ่านมา เจ้าเคยยื่นมือเข้าช่วยชีวิตผู้รอดชีวิตไว้ถึง ${saved} ครั้ง ปกป้องเสบียง ยา และอาหารที่ร่างกายอันตายด้านนี้ไม่มีวันได้กินอีกต่อไป แต่เมื่อถึงคราวที่เซลล์ในร่างต้องการพลังงานเพื่อประคองสังขาร กลางซากเมืองที่รกร้างกลับไม่มีสิ่งใดตกถึงท้องเพื่อต่อชีวิต ร่างนี้ทรุดตัวลงสู่ความเงียบ เป็นฉากจบอันเศร้าและขมขื่นของคนที่คอยเกื้อกูลแบ่งปันให้ผู้อื่นจนวินาทีสุดท้าย แต่ไม่อาจประคองตัวเองให้รอดพ้นความหิว`;
      cTitle = 'ภาวะอดอยากรุนแรงหลังอุทิศทรัพยากรเพื่อช่วยชีวิตผู้อื่น (Altruistic Depletion)';
      cDesc = `อดอาหารจนเซลล์ล้มเหลว (${Math.floor(
        hunger
      )}/100) แม้ในอดีตจะเคยยื่นมือช่วยชีวิตมนุษย์ไว้ ${saved} ครั้งและปกป้องเสบียงให้คนเป็น แต่กลับไม่อาจหาพลังงานมาประทังตนเองจนร่างกายหยุดทำงาน`;
    } else if (killed >= HIGH_KILLS_THRESHOLD) {
      // 6.3 ความหิวที่ไม่มีวันพอ — หิวตาย ทั้งที่เคยฆ่าคนจำนวนมาก (>= 5 คน)
      nTitle = 'ความหิวที่ไม่มีวันพอ';
      nText = `เจ้าเคยพรากชีวิตคนเป็นไปถึง ${killed} คนเพื่อต่อลมหายใจที่ดับไปแล้ว แต่หลุมดำในร่างนี้ไม่เคยถูกเติมเต็มได้จริง ยิ่งล่า ความหิวก็ยิ่งเรียกร้องมากขึ้น จนกระทั่งวันที่ไม่มีเหยื่อให้ล่าอีกต่อไป ความหิวที่คุ้นเคยจึงย้อนกลับมากัดกินร่างของเจ้าจากข้างใน ลมหายใจที่แลกมาด้วยชีวิตผู้อื่นสิ้นสุดลงในความว่างเปล่า`;
      cTitle = 'ภาวะอดอยากรุนแรงหลังสิ้นสุดการล่า (Insatiable Starvation)';
      cDesc = `แม้จะเคยสังหารมนุษย์ไปถึง ${killed} คน แต่เมื่อขาดแคลนเหยื่อ ความหิวกระหาย (${Math.floor(
        hunger
      )}/100) ได้หวนกลับมาทำลายอวัยวะภายในจนล้มพับลง`;
    } else if (killed === 0 && corpseMeals > 0) {
      // 6.4 ผู้เก็บเศษซากที่ไร้ทางไป — หิวตาย เคยกินศพแต่ไม่เคยฆ่าคน
      nTitle = 'ผู้เก็บเศษซากที่ไร้ทางไป';
      nText = `เจ้าเลือกประทังความหิวด้วยร่างของผู้ที่จากไปแล้ว ${corpseMeals} ครั้ง โดยตั้งมั่นที่จะไม่ลงมือพรากชีวิตคนเป็น แต่เศษซากในซากปรักหักพังไม่ได้มีให้ค้นหาตลอดไป เมื่อทุกตรอกซอกซอยว่างเปล่า ร่างนี้จึงทรุดลงสู่ความเงียบงัน ยุติการก้าวเดินโดยที่สองมือยังไม่เคยเปื้อนเลือดของผู้รอดชีวิต`;
      cTitle = 'ภาวะอดอยากรุนแรงจากการขาดแคลนเศษซากอาหาร (Scavenger Depletion)';
      cDesc = `ประทังชีพด้วยซากศพสะสม ${corpseMeals} ครั้งโดยไม่เคยฆ่าคนเป็น เมื่อแหล่งซากศพหมดลง ความหิว (${Math.floor(
        hunger
      )}/100) จึงกัดกร่อนแกนประสาทจนร่างหยุดทำงาน`;
    } else if (killed > 0) {
      // 6.5 การข้ามเส้นที่ซื้อเวลาได้ชั่วคราว — หิวตาย เคยฆ่าคนบ้าง (1–4 คน)
      nTitle = 'การข้ามเส้นที่ซื้อเวลาได้ชั่วคราว';
      nText = `การตัดสินใจข้ามเส้นพรากชีวิตคนเป็น ${killed} คนในวันก่อน ซื้อเวลาให้ร่างนี้ก้าวเดินต่อได้เพียงไม่กี่วัน ความผิดบาปไม่ได้ช่วยให้อิ่มท้องได้ตลอดไป เมื่อเวลาที่ซื้อไว้หมดลง ความหิวโหยเดิมก็กลับมาทวงคืน และร่างนี้ก็ล้มลงสู่ผืนดินในจุดที่ไม่อาจลุกขึ้นมาได้อีก`;
      cTitle = 'ภาวะอดอยากรุนแรงหลังเวลาที่แลกมาหมดลง (Temporary Reprieve Expired)';
      cDesc = `การสังหารคนเป็น ${killed} คนซื้อเวลาได้เพียงชั่วคราว เมื่อขาดแคลนอาหารต่อเนื่อง เซลล์ในร่างจึงกัดกินตัวเองจนล้มลง`;
    } else {
      // 6.6 ซอมบี้ผู้กินเจ (ผู้ไม่ยอมกินใคร) — หิวตาย โดยไม่เคยฆ่าคนและไม่เคยกินศพ
      nTitle = 'ซอมบี้ผู้กินเจ (ผู้ไม่ยอมกินใคร)';
      nText =
        'แม้ความหิวโหยจะบิดเกลียวลำไส้และแผดเผาสมองจนแทบคลั่ง แต่ตลอดเวลาที่ลืมตาขึ้นในกรุงเทพฯ ร่างนี้ปฏิเสธที่จะแตะต้องทั้งคนเป็นและคนตาย เจ้าเลือกที่จะทนหิวซ้ำแล้วซ้ำเล่าจนกระทั่งเซลล์กลายพันธุ์ย่อยสลายอวัยวะภายในของตัวเองจนล้มพับลง กลายเป็นซอมบี้เพียงตนเดียวในเมืองที่สิ้นใจเพราะความดื้อรั้นที่จะไม่กินใคร';
      cTitle = 'ภาวะอดอยากรุนแรงจนเซลล์กลายพันธุ์กัดกินเนื้อเยื่อตัวเอง (Cellular Autophagy)';
      cDesc = `ความหิวโหยพุ่งสูงถึงขีดสุด (${Math.floor(
        hunger
      )}/100) โดยไม่เคยพรากชีวิตคนเป็นหรือแตะต้องซากศพ เซลล์ไวรัสจึงหันมาย่อยสลายกล้ามเนื้อและแกนประสาทของร่างนี้จนหยุดทำงาน`;
    }

    return {
      code: 'STARVATION',
      categoryLabel: 'Starvation · ภาวะอดอยากรุนแรง',
      title: cTitle,
      description: cDesc,
      badgeColor: 'amber',
      narrativeTitle: nTitle,
      narrativeText: nText,
    };
  }

  // 7. Feral Madness (Sanity = 0 โดยไม่อดอยาก)
  if (causeHint === 'feral_madness' || endingId === 'feral') {
    return {
      code: 'FERAL_MADNESS',
      categoryLabel: 'Feral Madness · สติสัมปชัญญะแตกสลาย',
      title: 'สติสัมปชัญญะพังทลายจากความตื่นตระหนกและเสียงกระซิบของเชื้อ (Feral Mind Death)',
      description: `ความตึงเครียดและบาดแผลทางใจกัดกร่อนสติจนเหลือ ${Math.floor(
        sanity
      )}/100 สมองส่วนเหตุผลถูกเชื้อยึดครองโดยสมบูรณ์จนกลายเป็นซอมบี้คลุ้มคลั่งไร้สติ`,
      badgeColor: 'fuchsia',
      narrativeTitle: 'เหลือเพียงความหิว',
      narrativeText:
        'เมื่อสติสัมปชัญญะสุดท้ายหลุดลอย รูปถ่ายกลายเป็นเพียงกระดาษ เสียงเรียกชื่อกลายเป็นเพียงเสียงรบกวน ร่างนี้ยังก้าวเดินต่อ แต่ตัวตนของเจ้าไม่ได้อยู่ในนั้นแล้ว',
    };
  }

  // 8. Fatal Trauma / Wounds (ร่างพังจากบาดแผลหรืออุบัติเหตุทั่วไป)
  if (endingId === 'death') {
    let nTitle = 'ร่างที่แหลกสลายกลางซากเมือง';
    let nText =
      'ความเสียหายสะสมจากการปะทะและการรื้อค้นซากปรักหักพัง ทำให้กล้ามเนื้อและแกนประสาทฉีกขาดจนหยุดตอบสนอง ความพยายามที่จะก้าวเดินต่อในเมืองปิดตายจบลงที่ตรงนี้ ร่างนี้ทอดกายสงบนิ่งเคียงข้างซากตึกที่พังทลาย';
    let cTitle = 'เนื้อเยื่อและอวัยวะเสียหายหนักเกินกว่าเซลล์กลายพันธุ์จะสมานไหว (Fatal Trauma)';
    let cDesc =
      'บาดแผลจากการปะทะ การเสียเลือดสะสม และความเสียหายต่อโครงสร้างร่างกายทำให้สภาพร่างดิ่งลงถึง 0/100 ร่างนี้จึงทรุดลงและหยุดเคลื่อนไหวไปตลอดกาล';

    if (humanity >= 60 && killed === 0 && saved > 0) {
      // 8.1 ยังไม่ได้กลายเป็นคน แต่ก็ไม่เคยเลิกเป็นคน — รักษาระดับความเป็นมนุษย์สูง ไม่เคยฆ่าคน และเคยช่วยชีวิตคน
      nTitle = 'ยังไม่ได้กลายเป็นคน แต่ก็ไม่เคยเลิกเป็นคน';
      nText = `แม้เชื้อไวรัสจะพรากลมหายใจและความอบอุ่นไป และร่างนี้จะไม่มีวันได้กลับไปเป็นมนุษย์ที่สมบูรณ์อีก แต่ตลอดเวลาที่ตื่นขึ้นมาในกรุงเทพฯ เจ้าไม่เคยยอมให้ความกระหายพรากจิตวิญญาณไป ไม่เคยปลิดชีวิตใคร และเคยยื่นมือช่วยชีวิตผู้รอดชีวิตไว้ถึง ${saved} ครั้ง... ร่างนี้อาจหยุดเคลื่อนไหวลงกลางซากปรักหักพัง แต่สิ่งที่ดับลงไปมีเพียงสังขาร ไม่ใช่ความเป็นมนุษย์ที่เจ้าปกป้องไว้จนวินาทีสุดท้าย`;
      cTitle = 'การหยุดทำงานของร่างกายโดยรักษาจิตสำนึกแห่งความเป็นมนุษย์ (Unbroken Humanity)';
      cDesc = `สภาพร่างกายลดลงเหลือ 0/100 จากความเสียหายสะสม แต่ยังคงรักษาระดับความเป็นมนุษย์ไว้สูง (${Math.floor(
        humanity
      )}/100) โดยไม่เคยพรากชีวิตคนเป็น และเคยช่วยชีวิตผู้รอดชีวิตไว้ ${saved} ครั้ง`;
    } else if (horde >= 40) {
      // 8.2 จ่าฝูงผู้เงียบเสียง — มีอำนาจควบคุมฝูงสูง แต่ร่างสิ้นอายุขัย
      nTitle = 'จ่าฝูงผู้เงียบเสียง';
      nText =
        'ในม่านหมอกและซากตึกของกรุงเทพฯ ฝูงผู้ติดเชื้อที่เคยเดินตามคำสั่งของเจ้ายังคงก้าวเดินต่อไปอย่างไร้ทิศทาง พวกมันยังคงส่งเสียงคำรามและขยับตัวตามกลิ่นคาว แต่เสียงคำรามนำทางและสัญญาณที่เคยรวบรวมพวกมันให้เป็นหนึ่งเดียวได้ดับวูบลงแล้ว ร่างของจ่าฝูงล้มลงสู่ผืนดิน ท่ามกลางฝูงที่ไม่เคยเข้าใจว่าผู้ชี้นำของพวกมันไม่ได้ลุกขึ้นมาอีกต่อไป';
      cTitle = 'การสูญสิ้นของจ่าฝูงผู้ควบคุมฝูง (Silent Alpha)';
      cDesc = `ร่างกายแหลกสลายจนสภาพร่างลดลงเหลือ 0/100 ขณะมีอำนาจควบคุมฝูงระดับสูง (${Math.floor(
        horde
      )}/100) ฝูงผู้ติดเชื้อกระจายตัวออกไปอย่างไร้ทิศทางเมื่อขาดเสียงสั่งการ`;
    } else if (mutation >= 50) {
      // 8.3 วิวัฒนาการที่ช่วยไว้ไม่ทัน — ร่างกลายพันธุ์สูง แต่บาดแผลเกินทน
      nTitle = 'วิวัฒนาการที่ช่วยไว้ไม่ทัน';
      nText =
        'เปลือกไคตินหนา กล้ามเนื้อที่ถักทอใหม่ และสายพันธุกรรมที่ปรับตัวจนเหนือกว่าซอมบี้ทั่วไป ไม่อาจต้านทานแรงกระแทกและบาดแผลฉกรรจ์ที่ถาโถมเข้ามาได้ เซลล์ที่พยายามแบ่งตัวซ่อมแซมอย่างบ้าคลั่งไม่อาจวิ่งแข่งกับความเสียหายที่เกินขีดจำกัด ร่างกลายพันธุ์ทรุดลงสู่ความเงียบ เป็นเครื่องเตือนใจว่าวิวัฒนาการที่ก้าวหน้าเพียงใด ก็ยังมีขอบเขตที่ไม่อาจก้าวข้าม';
      cTitle = 'เนื้อเยื่อกลายพันธุ์ขั้นสูงล้มเหลวจากความเสียหายรุนแรง (Overwhelmed Mutation)';
      cDesc = `แม้จะมีระดับการกลายพันธุ์สูง (${Math.floor(
        mutation
      )}/100) แต่บาดแผลฉกรรจ์รุนแรงเกินกว่าอัตราการซ่อมแซมของเซลล์กลายพันธุ์ โครงสร้างร่างกายจึงพังทลายลงในที่สุด`;
    } else if (day >= 20) {
      // 8.4 กระดูกและเนื้อเยื่อที่หมดอายุขัย
      nTitle = 'กระดูกและเนื้อเยื่อที่หมดอายุขัย';
      nText = `การเดินทางอย่างทรหดตลอด ${day} วันในเขตกักกัน ได้สร้างบาดแผลสะสมจนเกินกว่าโครงสร้างร่างกายนี้จะพยุงไหว ข้อต่อและกล้ามเนื้อที่ผุพังฉีกขาดจนไม่อาจก้าวเดินต่อ ร่างนี้ทรุดลงสู่พื้นดินอย่างสงบ ปลดปล่อยจากภาระของการประคองสังขารที่หมดอายุขัย`;
      cTitle = 'เนื้อเยื่อและโครงสร้างกระดูกพังทลายจากความเสื่อมสภาพ (Structural Failure)';
      cDesc = `การเดินทางและการตรากตรำต่อเนื่องยาวนาน ${day} วัน ทำให้เนื้อเยื่อและข้อต่อที่ติดเชื้อฉีกขาดสะสมจนร่างกายหยุดทำงานไปตลอดกาล`;
    }

    return {
      code: 'FATAL_TRAUMA',
      categoryLabel: 'Fatal Trauma · บาดแผลฉกรรจ์เกินขีดจำกัด',
      title: cTitle,
      description: cDesc,
      badgeColor: 'rose',
      narrativeTitle: nTitle,
      narrativeText: nText,
    };
  }

  // 9. Survival / Climax Resolution Endings (Cure, Escape, Horde Breakout, King, Evolved, Extinction, District Settle)
  const resolutionTitles: Record<string, { title: string; desc: string }> = {
    human: {
      title: 'ฟื้นคืนสู่ความเป็นมนุษย์ที่หอผู้ป่วยพักฟื้นราชวิถี (Humanity Restored)',
      desc: 'เซรุ่มย้อนกลับเข็มสุดท้ายทำงานสมบูรณ์ หัวใจกลับมาสูบฉีดเลือดอุ่นและผ่านการตรวจรับเข้าสู่เขตรักษาในฐานะมนุษย์อีกครั้ง',
    },
    escape_companion: {
      title: 'ฝ่าวงล้อมออกจากเขตกักกันกรุงเทพฯ พร้อมคนที่ไว้ใจ (Quarantine Breakout)',
      desc: 'ออกเดินทางเคียงข้างผู้รอดชีวิตที่ไว้ใจเจ้าเต็มหัวใจ ลัดเลาะพ้นแนวปิดล้อมออกไปเริ่มต้นเส้นทางใหม่นอกกรุงเทพมหานคร',
    },
    horde_breakout: {
      title: 'นำฝูงเคลื่อนผ่านแนวคลองแสนแสบฝ่าวงล้อมออกนอกเขต (Horde Breakout)',
      desc: 'ใช้สัญญาณและเส้นทางเลียบคลองที่เตรียมไว้ พาฝูงผู้ติดเชื้อผ่านจุดคอขวดและทะลวงแนวปิดล้อมปลายทางออกจากเขตกักกัน',
    },
    conscious_exile: {
      title: 'ล่องเรือผ่านช่องทางระบายน้ำออกสู่แม่น้ำเจ้าพระยา (Conscious Exile)',
      desc: 'ปลดเชือกเรือไม้ลำเล็กในคืนหมอกจัด ล่องพ้นเขตกักกันกรุงเทพฯ ไปอย่างเงียบงันโดยยังรักษาสติและไม่เคยฆ่าคนเป็น',
    },
    king: {
      title: 'ตั้งหลักนำฝูงผู้ติดเชื้อริมคลองและเขตเมืองเก่า (Crowned Leader of the Pack)',
      desc: 'เปลี่ยนความหิวไร้ทิศทางให้เป็นระเบียบและสัญญาณที่ฝูงยอมรับ ปกครองผู้ติดเชื้อในฐานะจ่าฝูงผู้มีสติ',
    },
    evolved: {
      title: 'วิวัฒนาการก้าวข้ามขีดจำกัดสายพันธุ์เดิม (Transcendental Mutation)',
      desc: 'ยอมรับการปรับตัวของระบบประสาทและโครงสร้างเซลล์ตามข้อมูลที่ตรวจสอบแล้ว ก้าวข้ามทั้งมนุษย์และซอมบี้ยุคแรก',
    },
    extinction: {
      title: 'กระจายคลื่นสัญญาณสุดท้ายให้ฝูงยึดครองเมือง (The Last Signal)',
      desc: 'ส่งสัญญาณความถี่จากหอวิทยุสะพานพระราม 8 ให้ฝูงผู้ติดเชื้อโหมบุกทลายแนวป้องกันของมนุษย์จนสิ้นสุดยุคสมัยเดิม',
    },
  };

  if (endingId.endsWith('.ending')) {
    return {
      code: 'SURVIVAL_RESOLUTION',
      categoryLabel: 'District Resolution · ตั้งหลักดูแลย่านในกรุงเทพฯ',
      title: state?.ending?.title || 'ตั้งหลักดูแลผู้คนและโครงสร้างพื้นฐานของย่าน',
      description:
        state?.ending?.text ||
        'หลังจากลงมือช่วยงานและสร้างความไว้ใจจนคนในพื้นที่ยอมรับ เจ้าเลือกปักหลักทำหน้าที่ดูแลย่านนี้ต่อไป',
      badgeColor: 'lime',
      narrativeTitle: state?.ending?.title || 'ตั้งหลักดูแลผู้คนและโครงสร้างพื้นฐานของย่าน',
      narrativeText:
        state?.ending?.text ||
        'หลังจากลงมือช่วยงานและสร้างความไว้ใจจนคนในพื้นที่ยอมรับ เจ้าเลือกปักหลักทำหน้าที่ดูแลย่านนี้ต่อไป',
    };
  }

  const matched = resolutionTitles[endingId];
  return {
    code: 'SURVIVAL_RESOLUTION',
    categoryLabel: 'Chronicle Resolution · บทสรุปชะตากรรม',
    title: matched?.title || state?.ending?.title || 'สิ้นสุดบันทึกการเดินทางในเขตศูนย์',
    description:
      matched?.desc ||
      state?.ending?.text ||
      'เรื่องราวของร่างนี้ในเขตกักกันกรุงเทพฯ ได้เดินทางมาถึงบทสรุปสุดท้าย',
    badgeColor: 'lime',
    narrativeTitle: matched?.title || state?.ending?.title || 'สิ้นสุดบันทึกการเดินทางในเขตศูนย์',
    narrativeText:
      matched?.desc ||
      state?.ending?.text ||
      'เรื่องราวของร่างนี้ในเขตกักกันกรุงเทพฯ ได้เดินทางมาถึงบทสรุปสุดท้าย',
  };
}

/**
 * แยก “สาเหตุที่ตาย” ออกจาก “เรื่องราวของชีวิตนั้น”
 * สาเหตุเป็นตัวกำหนดฉากหลัก ส่วนประวัติการกระทำกำหนดชื่อฉากและข้อความเฉพาะ
 */
export function deriveDeathEndingPresentation(
  state: any,
  bio?: CharacterBioDossier,
  customEndingOverride?: {
    id?: string;
    title?: string;
    text?: string;
    causeCode?: string;
    surrendered?: boolean;
  }
): DeathEndingNarrative {
  const cause = deriveCauseOfDeath(state, customEndingOverride);

  // สำหรับฉากจบสำเร็จ/ตั้งหลัก (Survival Resolution) ให้รักษาข้อความดั้งเดิมไว้
  if (cause.code === 'SURVIVAL_RESOLUTION') {
    return {
      cause,
      title: customEndingOverride?.title || state?.ending?.title || cause.narrativeTitle || cause.title,
      text: customEndingOverride?.text || state?.ending?.text || cause.narrativeText || cause.description,
    };
  }

  // ชื่อและข้อความมาตรฐานเดิมที่ถือว่าเป็น placeholder ทั่วไป ต้องถูกแทนที่ด้วยฉากเฉพาะ
  const isGenericTitle = (t?: string) =>
    !t ||
    t === 'ตายเป็นครั้งที่สอง' ||
    t === 'ร่างนี้สิ้นแรงและหยุดเดิน' ||
    t === 'บทจบของชีวิต';

  const isGenericText = (txt?: string) =>
    !txt ||
    txt.includes('ครั้งแรกเจ้าเสียหัวใจ ครั้งนี้ร่างกายยอมแพ้เสียก่อน');

  let title = cause.narrativeTitle || cause.title;
  let text = cause.narrativeText || cause.description;

  if (customEndingOverride?.title && !isGenericTitle(customEndingOverride.title)) {
    title = customEndingOverride.title;
  } else if (state?.ending?.title && !isGenericTitle(state.ending.title)) {
    title = state.ending.title;
  }

  if (customEndingOverride?.text && !isGenericText(customEndingOverride.text)) {
    text = customEndingOverride.text;
  } else if (state?.ending?.text && !isGenericText(state.ending.text)) {
    text = state.ending.text;
  }

  return {
    cause,
    title,
    text,
  };
}

export function buildPastLifeRecordFromState(
  state: any,
  viewModel: any,
  lifeNumber: number,
  bio: CharacterBioDossier,
  customEndingOverride?: { id: string; title: string; text: string; surrendered?: boolean }
): PastLifeRecord {
  const f = state?.story?.flags || {};
  const mali = state?.world?.npcs?.['remnant.mali'];
  const endingId = customEndingOverride?.id || state?.ending?.id || 'death';
  const presentation = deriveDeathEndingPresentation(state, bio, customEndingOverride);
  const causeOfDeath = presentation.cause;
  const endingTitle = presentation.title;

  const placeName = viewModel?.place?.name || state?.place || 'เขตร้าง';
  const saved = state?.memory?.saved || 0;
  const killed = state?.memory?.killed || 0;
  const endured = state?.memory?.endured || 0;
  const day = state?.day || 1;
  const {applyToState, ...characterProfile} = bio;

  return {
    runId: state?.runId || 'life-' + Date.now(),
    lifeNumber,
    characterProfile: structuredClone(characterProfile),
    timelineDate: `15 ตุลาคม – ${formatTimelineDate(day)}`,
    dayReached: day,
    originId: state?.originId || 'unknown',
    originName: bio.profileVersion === 1 ? bio.occupation : viewModel?.origin?.name || 'ผู้ติดเชื้อนิรนาม',
    strainId: state?.strainId || 'unknown',
    strainName: bio.profileVersion === 1 && state?.strainId === 'common' ? 'ยังไม่มีลักษณะเชื้อพิเศษ' : viewModel?.origin?.strain || 'สายพันธุ์ไม่ระบุ',
    bioDossier: {
      id: bio.id,
      age: bio.age,
      gender: bio.gender,
      occupation: bio.occupation,
      clothingClue: bio.clothingClue,
      personalItemClue: bio.personalItemClue,
      daysInfectedEstimate: bio.daysInfectedEstimate,
    },
    endingId,
    endingTitle,
    causeOfDeath,
    finalPlaceId: state?.place || 'shelter',
    finalPlaceName: placeName,
    summaryText: `${bio.occupation} (อายุ ${bio.age} ปี) · ${causeOfDeath.categoryLabel}`,
    deeds: {
      ...(state.npcZones ? {alliedHumans:endingMetrics(state,state.npcZones).allies} : {}),
      savedHumans: saved,
      killedHumans: killed,
      corpseMeals: state?.memory?.corpseMeals || 0,
      carriedBloodBags: Number(state?.carriedBloodBags ?? state?.items?.carriedBloodBags ?? 0),
      enduredDays: endured,
      helpedClinic: Boolean(f['next.clinic'] || f['c40.clinic_stabilized']),
      alliedMali: mali?.state === 'allied',
      recalledMedicalPast: Boolean(f['c42.medical_recalled']),
      ledHorde: (state?.stats?.horde || 0) >= 40 || Boolean(f['c41.nest_route_open']),
      jammedRadio: Boolean(f['c41.radio_jammed']),
      fortifiedShelter: Boolean(f['c42.shelter_fortified']),
      surrenderedToInstinct: Boolean(customEndingOverride?.surrendered || endingId === 'madness'),
      researchScore: Math.floor(state?.stats?.research || 0),
      hordeScore: Math.floor(state?.stats?.horde || 0),
      mutationScore: Math.floor(state?.stats?.mutation || 0),
      humanityScore: Math.floor(state?.stats?.humanity || 0),
    },
  };
}



/**
 * กิมมิคเงียบ (Subtle Unlabelled Echoes)
 */
export function getOrganicEchoPopupForLocation(
  pastLives: PastLifeRecord[],
  currentPlaceId: string,
  currentDay: number,
  triggeredIds: string[]
): OrganicEchoPopupEvent | null {
  if (!pastLives || pastLives.length === 0) return null;

  const recentLives = pastLives.slice(0, 4);

  for (const life of recentLives) {
    const cloth = life.bioDossier.clothingClue || `ชุดของ${life.bioDossier.occupation}`;
    const itemClue = life.bioDossier.personalItemClue || `ของใช้ส่วนตัวที่คุ้นตา`;

    if (life.deeds.surrenderedToInstinct && life.finalPlaceId === currentPlaceId) {
      const id = `echo-madness-${life.runId}-${currentPlaceId}`;
      if (!triggeredIds.includes(id)) {
        return {
          id,
          fromLifeNumber: life.lifeNumber,
          placeId: currentPlaceId,
          title: 'ผู้ติดเชื้อไร้สติที่เดินวนอยู่ตรงมุมมืด',
          text: `ระหว่างก้าวเดินผ่านมุมอับสายตา เจ้าสวนกับซอมบี้ร่างหนึ่งที่ดวงตาขาวขุ่นและไร้สติสัมปชัญญะโดยสิ้นเชิง มันสวม${cloth} และยังมี${itemClue}ห้อยติดตัวอยู่ ร่างนั้นเดินลากขาวนเวียนซ้ำไปซ้ำมาตรงจุดเดิมราวกับเพิ่งปล่อยให้สัญชาตญาณดิบกลืนกินตัวตนสุดท้ายไปเมื่อไม่นานนี้เอง`,
          choices: [
            {
              text: 'จ้องมองชุดและของติดตัวของมันเงียบๆ ก่อนก้าวหลบไปอีกทาง',
              note: 'สติ +4 · ภาพตรงหน้าทำให้เจ้าย้ำเตือนตัวเองให้ประคองสติไว้',
              outcomeLog: `เดินสวนกับซอมบี้ไร้สติที่สวม${cloth}เดินวนอยู่ในพื้นที่`,
              effects: { stat: 'sanity', delta: 4 },
            },
            {
              text: 'ค้นดูตามกระเป๋าของร่างไร้สตินั้นอย่างเบามือโดยไม่ให้มันคลั่ง',
              note: 'เสบียงมนุษย์ +1 · ความหิว +2',
              outcomeLog: `พบของที่ยังหลงเหลืออยู่กับซอมบี้ไร้สติใน${cloth}`,
              effects: { item: 'supplies', itemDelta: 1 },
            },
          ],
        };
      }
    }

    if (!life.deeds.surrenderedToInstinct && life.finalPlaceId === currentPlaceId && currentDay >= 2) {
      const id = `echo-fallen-${life.runId}-${currentPlaceId}`;
      if (!triggeredIds.includes(id)) {
        return {
          id,
          fromLifeNumber: life.lifeNumber,
          placeId: currentPlaceId,
          title: 'ร่างที่แน่นิ่งอยู่ข้างกำแพงเย็นเฉียบ',
          text: `ข้างกองเศษอิฐมีร่างของผู้ติดเชื้อตนหนึ่งนอนแน่นิ่งไม่ไหวติง ร่างนั้นสวม${cloth} ข้างมือที่กำแน่นยังมี${itemClue}ตกอยู่ ร่องรอยการปฐมพยาบาลตัวเองแบบลวกๆ บ่งบอกว่าเจ้าของร่างนี้เคยมีสติและพยายามฝืนชะตากรรมอยู่หลายวันก่อนจะสิ้นแรงลงตรงจุดนี้`,
          choices: [
            {
              text: 'เก็บของที่ยังใช้ได้ข้างร่างนั้นแล้วหลับตาลงครู่หนึ่ง',
              note: 'ชุดเย็บแผล +1 · สติ +2',
              outcomeLog: `พบร่างใน${cloth}ที่แน่นิ่งอยู่ข้างกำแพงและเก็บชุดเย็บแผลที่ตกอยู่มาใช้ต่อ`,
              effects: { item: 'medicine', itemDelta: 1 },
            },
            {
              text: 'ขยับแผ่นไม้บังร่างนั้นให้พ้นสายตาฝูงซอมบี้ที่เดินผ่าน',
              note: 'ความเห็นใจ +4 · สติ +3',
              outcomeLog: `ช่วยบังร่างที่สวม${cloth}ให้พ้นจากทางเดินของฝูง`,
              effects: { stat: 'humanity', delta: 4 },
            },
          ],
        };
      }
    }

    if (currentPlaceId === 'hospital' && life.deeds.helpedClinic && currentDay >= 2) {
      const id = `echo-clinic-deed-${life.runId}`;
      if (!triggeredIds.includes(id)) {
        return {
          id,
          fromLifeNumber: life.lifeNumber,
          placeId: 'hospital',
          title: 'บทสนทนาแผ่วเบาหลังบานประตูคลินิก',
          text: `ขณะเจ้าหลบอยู่ในเงามืดข้างทางเดินโรงพยาบาล เสียงเวรยามข้างในคุยกันเบาๆ ว่า "อย่าเพิ่งรีบยิงมั่วซั่วล่ะ วันก่อนก็มีตัวนึงที่ใส่${cloth} พก${itemClue} แวะมาแถวนี้แต่ไม่ได้ทำร้ายใคร แถมยังช่วยดันลังยาไว้ให้หน้าคลินิกด้วย..."`,
          choices: [
            {
              text: 'อาศัยจังหวะที่เวรยามลดปืนลง แอบสำรวจตู้เก็บตัวอย่างข้างทางเดิน',
              note: 'งานวิจัย +5 · สติ +2',
              outcomeLog: `เวรยามโรงพยาบาลชะงักไม่ยิงใส่ทันทีเพราะจำเรื่องผู้ติดเชื้อใน${cloth}ได้`,
              effects: { stat: 'research', delta: 5 },
            },
            {
              text: 'ถอยกลับเข้าเงามืดอย่างสงบโดยไม่ทำให้พวกเขาตื่นกลัว',
              note: 'ความเห็นใจ +4',
              outcomeLog: `ได้ยินคนในคลินิกพูดถึงผู้ติดเชื้อใน${cloth}ที่เคยมาช่วยก่อนหน้านี้`,
              effects: { stat: 'humanity', delta: 4 },
            },
          ],
        };
      }
    }

    if (currentPlaceId === 'streets' && life.deeds.killedHumans > 0 && currentDay >= 2) {
      const id = `echo-streets-hunter-${life.runId}`;
      if (!triggeredIds.includes(id)) {
        return {
          id,
          fromLifeNumber: life.lifeNumber,
          placeId: 'streets',
          title: 'ป้ายเตือนภัยที่เขียนด้วยสีสเปรย์สดใหม่',
          text: `บนกำแพงตึกแถวริมถนนหมายเลขศูนย์ มีข้อความสีสเปรย์พ่นเตือนไว้เร่งด่วนว่า "ระวัง! มีผู้ติดเชื้อที่ใส่${cloth} ซุ่มล่าคนเป็นแถวแยกนี้ มันไม่ได้เดินทื่อๆ เหมือนตัวอื่น!" ข้างใต้กำแพงยังมีเศษ${itemClue}ตกอยู่ท่ามกลางรอยเลือดแห้ง`,
          choices: [
            {
              text: 'อ่านข้อความเตือนนั้นเงียบๆ แล้วเปลี่ยนเส้นทางหลบสายตาคนเป็น',
              note: 'สติ +3 · รู้ว่าคนในพื้นที่กำลังระแวงขั้นสุด',
              outcomeLog: `พบป้ายเตือนภัยผู้ติดเชื้อใน${cloth}ที่เคยออกล่าคนบนถนนสายนี้`,
              effects: { stat: 'sanity', delta: 3 },
            },
            {
              text: 'สูดกลิ่นคาวเลือดที่ยังติดอยู่ตามซอกกำแพง',
              note: 'การกลายพันธุ์ +4',
              outcomeLog: `กลิ่นเลือดตรงจุดซุ่มล่ากระตุ้นเซลล์กลายพันธุ์ในร่าง`,
              effects: { stat: 'mutation', delta: 4 },
            },
          ],
        };
      }
    }
  }

  return null;
}

/**
 * ข้อ 2: เหตุการณ์ประจำวันของโลกที่ล็อกตามปฏิทินไทม์ไลน์ 15 ตุลาคม (Fixed World Timeline Schedule)
 * เกิดขึ้นในวันที่กำหนดเสมอในทุกชีวิต เพื่อให้ผู้เล่นที่เริ่มชีวิตใหม่ใช้ความรู้จากรูปรอบก่อนไปดักรอได้!
 */
export function getFixedWorldTimelineEvent(
  gameState: any,
  bio: CharacterBioDossier,
  triggeredIds: string[]
): LifeSimModalEvent | null {
  if (!gameState || gameState.ending || gameState.pending || gameState.npcEncounter) return null;
  const day = gameState.day || 1;
  const place = gameState.place || 'shelter';

  // วันที่ 3 (17 ตุลาคม): รถพยาบาลฉุกเฉินคว่ำหน้าทางเข้าโรงพยาบาลราชวิถี
  if (day === 3) {
    const id = 'world-timeline-day3-ambulance';
    if (!triggeredIds.includes(id)) {
      if (place === 'hospital') {
        return {
          id,
          title: '17 ตุลาคม · รถพยาบาลฉุกเฉินพุ่งชนรั้วหน้าโรงพยาบาลราชวิถี!',
          text: 'เสียงไซเรนดังแหวกอากาศก่อนที่รถพยาบาลคันหนึ่งจะเสียหลักพุ่งชนรั้วเหล็กหน้าโรงพยาบาลราชวิถีตรงหน้าเจ้า! ประตูท้ายรถดีดเปิดออก มีถุงเลือดสำรองและกล่องเวชภัณฑ์หล่นกระจายอยู่ก่อนที่ฝูงซอมบี้ไร้สติจะแห่กันมาถึง',
          dayNote: 'เหตุการณ์ประจำไทม์ไลน์วันที่ 17 ตุลาคม (ไม่เสียวันเพิ่ม)',
          placeId: place,
          advanceDay: false,
          choices: [
            {
              text: 'รีบเข้าไปคว้าถุงเลือดพกพาและชุดเย็บแผลจากท้ายรถพยาบาลทันที',
              note: 'ถุงเลือดพกพา +1 · ชุดเย็บแผล +1 · สติ +3',
              enabled: true,
              outcomeText: 'เจ้ามาถูกที่ถูกเวลาในวันที่ 17 ตุลาคม จึงคว้าถุงเลือดพกพาและชุดเย็บแผลไว้ได้ก่อนที่ฝูงจะรุมทึ้งรถพยาบาล',
              effects: {
                carriedBloodBags: 1,
                medicine: 1,
                sanity: 3,
              },
            },
            {
              text: 'ช่วยดึงคนขับรถพยาบาลที่ติดอยู่ตรงเบาะหน้าให้หนีเข้าตึกโรงพยาบาล',
              note: 'ความไว้ใจของคนในโรงพยาบาลเพิ่มขึ้น · ความเห็นใจ +8 · ถุงเลือดพกพา +1',
              enabled: true,
              outcomeText: 'เจ้าช่วยดึงคนขับรถพยาบาลออกจากซากรถได้ทันเวลา คนในโรงพยาบาลเห็นเหตุการณ์และวางถุงเลือดสำรองตอบแทนไว้ให้',
              effects: {
                humanity: 8,
                carriedBloodBags: 1,
                bystanderTrustDelta: 30,
              },
            },
          ],
        };
      } else {
        return {
          id,
          title: '17 ตุลาคม · เสียงไซเรนและเสียงชนสนั่นดังมาจากทิศโรงพยาบาล',
          text: 'ขณะที่เจ้าอยู่ในเขตนี้ เสียงไซเรนรถพยาบาลดังแหวกอากาศมุ่งหน้าไปทาง "โรงพยาบาลราชวิถี" ก่อนจะตามมาด้วยเสียงพุ่งชนรั้วเหล็กดังสนั่นหวั่นไหว หากใครอยู่ที่หน้าโรงพยาบาลในวันที่ 17 ตุลาคม คงไปถึงจุดที่รถพยาบาลคว่ำได้เป็นคนแรก...',
          dayNote: 'เหตุการณ์ประจำไทม์ไลน์วันที่ 17 ตุลาคม (ไม่เสียวันเพิ่ม)',
          placeId: place,
          advanceDay: false,
          choices: [
            {
              text: 'จดจำวันและเวลาที่เกิดเหตุการณ์นี้ไว้ในความทรงจำ (17 ตุลาคม · โรงพยาบาล)',
              note: 'สติ +3 · ข้อมูลสำคัญของไทม์ไลน์เมือง',
              enabled: true,
              outcomeText: 'เจ้าจดจำไว้แม่นยำว่าในวันที่ 17 ตุลาคม จะมีรถพยาบาลพุ่งชนรั้วหน้าโรงพยาบาลราชวิถี',
              effects: {
                sanity: 3,
              },
            },
          ],
        };
      }
    }
  }

  // วันที่ 4 (18 ตุลาคม): ฝนกรดและหมอกเขม่าดำปกคลุมทั่วเมือง
  if (day === 4) {
    const id = 'world-timeline-day4-blackrain';
    if (!triggeredIds.includes(id)) {
      return {
        id,
        title: '18 ตุลาคม · ฝนเขม่าสีดำโปรยปรายลงมาทั่วเขตศูนย์',
        text: 'ท้องฟ้าเหนือเมืองมืดครึ้มลงตั้งแต่เช้ามืดของวันที่ 18 ตุลาคม สายฝนที่ปนเปื้อนเขม่าควันและละอองเชื้อโปรยลงมาทำให้ผู้รอดชีวิตทุกคนต้องรีบหลบเข้าอาคาร ในขณะที่เชื้อเรืองแสงตามแอ่งน้ำเริ่มปะทุชัดเจนขึ้น',
        dayNote: 'สภาพอากาศประจำไทม์ไลน์วันที่ 18 ตุลาคม (ไม่เสียวันเพิ่ม)',
        placeId: place,
        advanceDay: false,
        choices: [
          {
            text: 'ตากสายฝนเขม่าเพื่อเก็บตัวอย่างเชื้อเรืองแสงที่ควบแน่นตามพื้น',
            note: 'ตัวอย่างเชื้อ +1 · การกลายพันธุ์ +5 · สภาพร่าง -4',
            enabled: true,
            outcomeText: 'เจ้าเก็บตัวอย่างเชื้อความเข้มข้นสูงจากแอ่งน้ำฝนสีดำใส่กระเป๋าได้ 1 หลอด',
            effects: {
              samples: 1,
              mutation: 5,
              hp: -4,
            },
          },
          {
            text: 'หลบเข้าใต้ชายคาฟังเสียงสายฝนเพื่อสงบใจและกดความหิว',
            note: 'สติ +7 · ความหิว -6',
            enabled: true,
            outcomeText: 'ความเย็นของสายฝนวันที่ 18 ตุลาคม ช่วยให้สมองที่ร้อนรุ่มด้วยความหิวสงบลง',
            effects: {
              sanity: 7,
              hunger: -6,
            },
          },
        ],
      };
    }
  }

  // วันที่ 6 (20 ตุลาคม): เฮลิคอปเตอร์ลำเลียงทิ้งร่มชูชีพกล่องเวชภัณฑ์ที่ถนนหมายเลขศูนย์
  if (day === 6) {
    const id = 'world-timeline-day6-airdrop';
    if (!triggeredIds.includes(id)) {
      if (place === 'streets') {
        return {
          id,
          title: '20 ตุลาคม · ร่มชูชีพเสบียงฉุกเฉินร่วงลงกลางถนนหมายเลขศูนย์!',
          text: 'เสียงใบพัดเฮลิคอปเตอร์ดังกึกก้องเหนือหัว ก่อนที่กล่องเหล็กติดร่มชูชีพสีส้มจะร่วงลงมาค้างอยู่ตรงเสาไฟของถนนหมายเลขศูนย์ตรงหน้าเจ้าพอดี! ภายในมีทั้งเสบียงอาหารกระป๋อง ชุดเย็บแผล และถุงเลือดสำรองแช่เย็น',
          dayNote: 'เหตุการณ์ประจำไทม์ไลน์วันที่ 20 ตุลาคม (ไม่เสียวันเพิ่ม)',
          placeId: place,
          advanceDay: false,
          choices: [
            {
              text: 'เปิดกล่องร่มชูชีพเก็บเสบียง ชุดเย็บแผล และถุงเลือดพกพาใส่กระเป๋าทั้งหมด',
              note: 'เสบียงมนุษย์ +2 · ชุดเย็บแผล +1 · ถุงเลือดพกพา +1',
              enabled: true,
              outcomeText: 'การอยู่บนถนนหมายเลขศูนย์ในวันที่ 20 ตุลาคม ทำให้เจ้าได้ครอบครองกล่องเสบียงทางอากาศทั้งหมด!',
              effects: {
                supplies: 2,
                medicine: 1,
                carriedBloodBags: 1,
              },
            },
            {
              text: 'เก็บเฉพาะถุงเลือดพกพา แล้วเคาะสัญญาณเรียกผู้รอดชีวิตบนถนนมารับอาหารและยาไป',
              note: 'ถุงเลือดพกพา +1 · ความไว้ใจของทุกคนบนถนน +35 · ความเห็นใจ +10',
              enabled: true,
              outcomeText: 'ผู้รอดชีวิตบนถนนหมายเลขศูนย์ซาบซึ้งที่เจ้ายอมแบ่งกล่องร่มชูชีพให้ ความไว้ใจในเขตถนนพุ่งสูงขึ้นทันที',
              effects: {
                carriedBloodBags: 1,
                humanity: 10,
                bystanderTrustDelta: 35,
              },
            },
          ],
        };
      } else {
        return {
          id,
          title: '20 ตุลาคม · เฮลิคอปเตอร์บินผ่านไปทิ้งร่มชูชีพที่ "ถนนหมายเลขศูนย์"',
          text: 'เจ้าแหงนมองขึ้นไปบนฟ้า เห็นเฮลิคอปเตอร์ลำเลียงบินฝ่าเมฆหมอกไปปล่อยร่มชูชีพกล่องเสบียงสีส้มลงตรงบริเวณ "ถนนหมายเลขศูนย์" ก่อนจะบินลับขอบฟ้าไป น่าเสียดายที่วันนี้เจ้าไม่ได้อยู่ที่ถนนสายนั้น...',
          dayNote: 'เหตุการณ์ประจำไทม์ไลน์วันที่ 20 ตุลาคม (ไม่เสียวันเพิ่ม)',
          placeId: place,
          advanceDay: false,
          choices: [
            {
              text: 'จดจำไว้ว่าวันที่ 20 ตุลาคม จะมีร่มชูชีพเสบียงตกที่ถนนหมายเลขศูนย์',
              note: 'สติ +3 · เบาะแสสำคัญของไทม์ไลน์วันที่ 20 ตุลาคม',
              enabled: true,
              outcomeText: 'เจ้าจำตำแหน่งและวันที่ร่มชูชีพตกไว้ในใจ (20 ตุลาคม · ถนนหมายเลขศูนย์)',
              effects: {
                sanity: 3,
              },
            },
          ],
        };
      }
    }
  }

  // วันที่ 8 (22 ตุลาคม): เครื่องปั่นไฟสำรองของโรงพยาบาลราชวิถีขัดข้อง
  if (day === 8) {
    const id = 'world-timeline-day8-blackout';
    if (!triggeredIds.includes(id)) {
      if (place === 'hospital') {
        return {
          id,
          title: '22 ตุลาคม · ไฟสำรองของโรงพยาบาลราชวิถีดับวูบลง!',
          text: 'เสียงเครื่องปั่นไฟหลังตึกโรงพยาบาลกระตุกดับลงในคืนวันที่ 22 ตุลาคม ตู้แช่เลือดและอุปกรณ์ห้องแล็บกำลังจะเสียสภาพ ท่ามกลางความโกลาหลของคนเจ็บและพยาบาลในตึก',
          dayNote: 'เหตุการณ์ประจำไทม์ไลน์วันที่ 22 ตุลาคม (ไม่เสียวันเพิ่ม)',
          placeId: place,
          advanceDay: false,
          choices: [
            {
              text: 'ฝ่าควันเครื่องยนต์เข้าไปสับสวิตช์สลับแบตเตอรี่สำรองให้โรงพยาบาลกลับมาสว่างอีกครั้ง',
              note: 'ความไว้ใจของทุกคนในโรงพยาบาล +35 · งานวิจัย +10 · ความเห็นใจ +8',
              enabled: true,
              outcomeText: 'ไฟในโรงพยาบาลกลับมาติดอีกครั้งท่ามกลางเสียงโห่ร้องด้วยความโล่งอก คนในโรงพยาบาลเห็นเงาของเจ้าที่ช่วยกู้ระบบไฟไว้',
              effects: {
                research: 10,
                humanity: 8,
                bystanderTrustDelta: 35,
              },
            },
            {
              text: `อาศัยจังหวะไฟดับแอบเข้าไปหยิบถุงเลือดพกพาและตัวอย่างเชื้อจากห้องแล็บ (${bio.occupation})`,
              note: 'ถุงเลือดพกพา +2 · ตัวอย่างเชื้อ +1',
              enabled: true,
              outcomeText: 'เจ้าอาศัยความมืดในวันที่ 22 ตุลาคม เก็บถุงเลือดพกพา 2 ถุงและตัวอย่างเชื้อออกมาได้โดยไม่มีใครเห็น',
              effects: {
                carriedBloodBags: 2,
                samples: 1,
              },
            },
          ],
        };
      }
    }
  }

  // วันที่ 15 (29 ตุลาคม · เหลือ 105 วัน): โปรยใบปลิวประกาศเส้นตาย 120 วันปูพรมทิ้งระเบิดกรุงเทพฯ
  if (day === 15) {
    const id = 'world-timeline-day15-bangkok-bombing-leaflets';
    if (!triggeredIds.includes(id)) {
      return {
        id,
        title: '29 ตุลาคม · ใบปลิวประกาศ "เส้นตาย 120 วัน ปูพรมทิ้งระเบิดกรุงเทพฯ"',
        text: 'กระดาษใบปลิวสีแดงนับหมื่นแผ่นปลิวว่อนลงมาจากเครื่องบินทหารเหนือท้องฟ้ากรุงเทพมหานคร ข้อความระบุชัดเจนว่า: "เขตกักกันพิเศษกรุงเทพฯ จะถูกเผาทำลายด้วยระเบิดเพลิงปูพรมในวันที่ 11 กุมภาพันธ์ (ครบกำหนด 120 วันหลังจุดศูนย์) ผู้ใดที่ยังติดอยู่ในกรุงเทพฯ หลังเส้นตายจะไม่มีโอกาสหลบหนีอีก" — การเอาแต่หลบซ่อนไปวันๆ จนครบ 120 วันจะหมายถึงความตายในกองเพลิง!',
        dayNote: 'ประกาศเส้นตายเขตกักกันกรุงเทพฯ (ไม่เสียวันเพิ่ม)',
        placeId: place,
        advanceDay: false,
        choices: [
          {
            text: 'เก็บใบปลิวแผนที่เขตกักกันกรุงเทพฯ ไว้เตือนสติตัวเองให้หาทางออกหรือสร้างความหมายก่อนวันที่ 120',
            note: 'สติ +6 · งานวิจัย +5 · รับรู้เส้นตาย 120 วัน',
            enabled: true,
            outcomeText: 'เจ้าพับใบปลิวเตือนภัยเก็บไว้ในกระเป๋า ตอนนี้เจ้ารู้แล้วว่ามีเวลาอีก 105 วันก่อนที่กรุงเทพฯ จะถูกปูพรมด้วยระเบิดเพลิง',
            effects: {
              sanity: 6,
              research: 5,
            },
          },
          {
            text: 'นำไปวางเตือนผู้รอดชีวิตในพื้นที่ให้รู้กำหนดการทิ้งระเบิดล่วงหน้า',
            note: 'ความไว้ใจทุกคนในเขต +15 · ความเป็นมนุษย์ +6',
            enabled: true,
            outcomeText: 'ผู้รอดชีวิตในเขตหยิบใบปลิวที่เจ้าวางเตือนไว้ขึ้นมาอ่าน พวกเขารู้ว่าเจ้ากำลังพยายามช่วยให้ทุกคนรอดพ้นเส้นตาย',
            effects: {
              humanity: 6,
              bystanderTrustDelta: 15,
            },
          },
        ],
      };
    }
  }

  // วันที่ 30 (13 พฤศจิกายน · เหลือ 90 วัน): ปิดตายสะพานข้ามแม่น้ำเจ้าพระยา & เปิดเบาะแสทางหนี
  if (day === 30) {
    const id = 'world-timeline-day30-chao-phraya-blockade';
    if (!triggeredIds.includes(id)) {
      return {
        id,
        title: '13 พฤศจิกายน (เหลือ 90 วัน) · เสียงระเบิดทำลายสะพานข้ามแม่น้ำเจ้าพระยา',
        text: 'เสียงระเบิดกึกก้องดังมาจากทิศตะวันตกของกรุงเทพฯ กองทัพเริ่มวางแนวแบริเออร์ปิดสะพานหลักและตั้งป้อมปืนกลรอบเขตกักกัน เหลือเพียงเส้นทางระบายน้ำใต้ดิน ช่องทางเรือริมสะพานพระราม 8 และหลุมหลบภัยใต้ดินลึกเท่านั้นที่จะรอดจากระเบิดปูพรมในวันที่ 120 ได้',
        dayNote: 'เหตุการณ์ไทม์ไลน์กรุงเทพฯ วันที่ 30 (ไม่เสียวันเพิ่ม)',
        placeId: place,
        advanceDay: false,
        choices: [
          {
            text: 'จดจำตำแหน่งช่องทางน้ำแม่น้ำเจ้าพระยาและหลุมหลบภัยใต้ดินไว้เป็นทางเลือกชีวิต',
            note: 'สติ +8 · งานวิจัย +6',
            enabled: true,
            outcomeText: 'เจ้าบันทึกร่องรอยเส้นทางหลบหนีและจุดหลบภัยของกรุงเทพฯ ไว้ในความทรงจำ',
            effects: {
              sanity: 8,
              research: 6,
            },
          },
          {
            text: 'ส่งเสียงคำรามปลุกฝูงผู้ติดเชื้อให้เตรียมพร้อมทะลวงด่านคอนกรีตก่อนวันระเบิดลง',
            note: 'อำนาจฝูง +15 · การกลายพันธุ์ +8',
            enabled: true,
            outcomeText: 'ฝูงผู้ติดเชื้อในกรุงเทพฯ ตอบรับเสียงคำรามของเจ้า เตรียมพร้อมพุ่งชนแนวปิดล้อมเมื่อถึงเวลา',
            effects: {
              horde: 15,
              mutation: 8,
            },
          },
        ],
      };
    }
  }

  const flags = gameState.story?.flags || {};
  const s = gameState.stats || {};
  const items = gameState.items || {};
  const hunger = Number(s.hunger || 0);
  const horde = Number(s.horde || 0);
  const humanity = Number(s.humanity || 0);
  const supplies = Number(items.supplies || 0);
  const medicine = Number(items.medicine || 0);
  const mutationStage = getMutationStageInfo(s.mutation || 0);

  // ==========================================================================
  // หมวด A: วิกฤตเมืองตามเวลา 8 เหตุการณ์ (City Crises by Time · Days 45–119)
  // ระบบคัดกรองช่วงวัน (Window Suppression): ทุกเหตุการณ์มี minDay..maxDay ชัดเจน
  // หากผู้เล่นกระโดดข้ามช่วงวัน เหตุการณ์ก่อนหน้าจะหมดอายุโดยอัตโนมัติ ไม่เกิดซ้อนกัน
  // ==========================================================================

  // 1. crisis-d45-flyer-drop (ช่วงเกิดจริง: วันที่ 45–54)
  if (day >= 45 && day <= 54) {
    const id = 'crisis-d45-flyer-drop';
    if (!flags['crisis_late_seen_d45'] && !triggeredIds.includes(id)) {
      const vaccinePrepDone =
        Boolean(flags['route.vaccine.0'] && flags['route.vaccine.1'] && flags['route.vaccine.2']) ||
        Boolean(flags['route.cure.0'] && flags['route.cure.1'] && flags['route.cure.2']) ||
        getEndingReadiness(gameState, 'human').enabled;
      const choice1BaseOutcome =
        'เจ้ากางแผ่นกระดาษเปียกชื้นออก ข้อความระบุชัดเจน: "ประกาศพื้นที่ควบคุมพิเศษขั้นเด็ดขาด — กรอบเวลาปฏิบัติการจำกัด 120 วันนับแต่วันปิดเมือง ฝูงบินกวาดล้างเชื้อชีวภาพจะเริ่มปฏิบัติการปูพรมเพลิงความร้อนสูงตามแนวเส้นรอบวงกาญจนาภิเษก ขอให้พลเรือนทุกคนมุ่งหน้าสู่จุดคัดกรองภายนอกก่อนครบกำหนด" ไม่มีคำสัญญาเรื่องหน่วยกู้ภัย มีเพียงเส้นตายที่เหลือเวลาอีกเพียงครึ่งทาง';

      return {
        id,
        title: `${formatTimelineDate(day)} · โดรนทหารโปรยใบปลิวยืนยันเส้นตาย 120 วันสู่การกวาดล้าง`,
        text: 'เสียงหวีดแหลมจากเครื่องยนต์ใบพัดขนาดเล็กกรีดผ่านฟากฟ้าสีเทาเหนือกรุงเทพฯ อากาศยานไร้คนขับ (โดรน) สีเทาด้านบินเลียบแม่น้ำเจ้าพระยาในระดับต่ำ ก่อนจะปล่อยกล่องพลาสติกขนาดใหญ่ที่แตกกระจายกลางอากาศ แผ่นกระดาษสีขาวสว่างนับพันใบปลิวว่อนลงมาราวกับหิมะกลางซากตึก บนกระดาษพิมพ์ตราสัญลักษณ์ทางราชการและตัวเลขสีแดงเข้มที่มองเห็นได้แต่ไกล',
        dayNote: 'วิกฤตเมืองตามเวลา (ช่วงวันที่ 45–54 · ไม่เสียวันเพิ่ม)',
        placeId: place,
        advanceDay: false,
        onResolveSetFlags: ['crisis_late_seen_d45'],
        choices: [
          {
            text: 'หยิบใบปลิวที่ร่วงลงมาตรงหน้าขึ้นมาตรวจดูข้อความและแผนผัง',
            note: 'ไม่มีต้นทุน · สติ +2 · ได้รับข้อมูลประกาศทางการ',
            enabled: true,
            outcomeText: vaccinePrepDone
              ? `${choice1BaseOutcome} พิกัดจุดกวาดล้างตรงกับแนวท่อระบายน้ำรอบโรงพยาบาล ทำให้เจ้ารู้ว่าห้องแช่แข็งเซรุ่มจะไม่รอดหากพ้นวันที่ 120`
              : choice1BaseOutcome,
            effects: {
              sanity: 2,
              setFlag: 'crisis_d45_read_map',
              setFlags: ['crisis_late_seen_d45', 'crisis_d45_read_map'],
            },
          },
          {
            text: 'ส่งเสียงคำรามเตือนผู้รอดชีวิตที่กำลังตื่นตกใจกลางถนนให้รีบหลบเข้าใต้ชายคา',
            note:
              hunger >= 80
                ? 'ใช้แรงกาย (HP -3) · คำเตือน: "ร่างที่หิวกระหายอาจส่งเสียงคลุ้มคลั่งจนคนหวาดกลัว"'
                : 'ใช้แรงกาย (HP -3) · สติ +3 · ความเป็นมนุษย์ +4',
            enabled: true,
            outcomeText:
              hunger < 80
                ? 'เสียงเตือนจากลำคอของเจ้าทำให้ชายหญิงสองคนที่กำลังวิ่งตามถนนสะดุ้งสุดตัวและพุ่งตัวเข้าซอยตึกแถวได้ทันเวลาก่อนโดรนลาดตระเวนจะบินผ่านไป แม้พวกเขาจะมองเจ้าด้วยความหวาดระแวง แต่ไม่มีใครถูกตรวจจับ'
                : 'เสียงคำรามที่ปนความหิวกระหายทำให้ผู้รอดชีวิตสองคนตื่นตระหนกสุดขีดและวิ่งเตลิดหนีเข้าไปในซอยลึกด้วยความหวาดกลัว',
            effects:
              hunger < 80
                ? { hp: -3, sanity: 3, humanity: 4, setFlag: 'crisis_late_seen_d45' }
                : { hp: -3, sanity: -2, setFlag: 'crisis_late_seen_d45' },
          },
          {
            text: 'ยืนมองกระดาษปลิวลงสู่คูน้ำนิ่งๆ โดยไม่เข้าไปแตะต้อง',
            note: 'ไม่เสียทรัพยากร · สติ +1 · การสังเกตเงียบๆ',
            enabled: true,
            outcomeText:
              'แผ่นกระดาษแช่อยู่ในน้ำครำจนหมึกดำเริ่มละลาย เวลาของเมืองภายนอกกำลังเดินหน้าไปตามกฎของพวกเขา แต่ในซอกตึกแห่งนี้ ลมหายใจที่หยุดนิ่งของเจ้ายังคงเผชิญหน้ากับความจริงเดิม',
            effects: {
              sanity: 1,
              setFlag: 'crisis_late_seen_d45',
            },
          },
        ],
      };
    }
  }

  // 2. crisis-d60-grid-collapse (ช่วงเกิดจริง: วันที่ 60–69)
  if (day >= 60 && day <= 69) {
    const id = 'crisis-d60-grid-collapse';
    if (!flags['crisis_late_seen_d60'] && !triggeredIds.includes(id)) {
      const bkkPowerCleared = Boolean(
        flags['bkk_power.helped'] ||
          gameState.world?.locations?.bkk_power?.helped ||
          flags['route.cure.1'] ||
          flags['route.evolution.2']
      );
      const choice1BaseOutcome =
        'น้ำมันดีเซลเหนียวหนืดก้นถังถูกเทลงช่องเติม แผงไฟฉุกเฉินกระพริบติดขึ้นมาเพียงดวงเดียวที่ทางเดินชั้นล่าง แม้จะไม่สว่างพอสำหรับทั้งตึก แต่มันช่วยให้ตู้เก็บยาและจุดพักคนเจ็บไม่ต้องจมอยู่ในความมืดมิด ช่างไฟฟ้าที่แอบอยู่หลังประตูพยักหน้าให้เจ้าอย่างเงียบๆ';

      return {
        id,
        title: `${formatTimelineDate(day)} · แหล่งน้ำมันปั่นไฟหลักหมดลง แสงไฟฉุกเฉินดับสู่ความมืดสนิท`,
        text: 'เสียงหึ่งต่ำของเครื่องกำเนิดไฟฟ้าดีเซลที่เคยดังแว่วมาจากตึกสูงใจกลางเมืองเริ่มกระตุก สำลักควันดำหนึ่งครั้ง ก่อนจะดับสนิทลงพร้อมกันเป็นลูกโซ่ แสงไฟฉุกเฉินสีส้มตามแนวทางเชื่อม อาคารพยาบาล และป้ายสัญญาณบนเสาสื่อสารดับวูบลง ความมืดสนิทเข้าครอบงำท้องถนนในพริบตา เหลือเพียงแสงจันทร์กระทบหลังคาสังกะสี เสียงกรีดร้องสั้นๆ ของคนเป็นดังมาจากมุมมืด ตามด้วยเสียงฝีเท้าซวนเซของฝูงผู้ติดเชื้อที่เริ่มตื่นตัวต่อความมืด',
        dayNote: 'วิกฤตเมืองตามเวลา (ช่วงวันที่ 60–69 · ไม่เสียวันเพิ่ม)',
        placeId: place,
        advanceDay: false,
        onResolveSetFlags: ['crisis_late_seen_d60'],
        choices: [
          {
            text: 'มุ่งหน้าไปยังห้องเครื่องที่ใกล้ที่สุด ช่วยใช้พละกำลังเข็นถังน้ำมันสำรองก้นคลังเข้าจุดจ่ายไฟ',
            note: 'ใช้แรงกาย (HP -4) · เสบียงมนุษย์ -1 (ใช้น้ำมันตะเกียงที่มี) · สติ +3 · มนุษยธรรม +4',
            enabled: true,
            outcomeText: bkkPowerCleared
              ? `${choice1BaseOutcome} ระบบสายไฟสำรองที่เจ้าเคยช่วยช่างตรวจไว้ยังทำงานได้ดี ทำให้ไฟติดเร็วขึ้นโดยไม่เกิดประกายไฟช็อต`
              : choice1BaseOutcome,
            effects: {
              hp: -4,
              supplies: supplies > 0 ? -1 : 0,
              sanity: 3,
              humanity: 4,
              setFlag: 'crisis_d60_helped_generator',
              setFlags: ['crisis_late_seen_d60', 'crisis_d60_helped_generator'],
            },
          },
          {
            text: 'ยืนประจำมุมถนน นำทางผู้รอดชีวิตที่ติดอยู่ในความมืดให้เข้าสู่ที่กำบังโดยไม่เข้าใกล้พวกเขาเกินไป',
            note: 'ความหิว +1 · คำเตือน: "หากความหิวสูง กลิ่นเหงื่อของมนุษย์ในความมืดอาจกระตุ้นความกระหาย"',
            enabled: true,
            outcomeText:
              hunger < 80
                ? 'เจ้าเคาะเสาเหล็กเป็นจังหวะสม่ำเสมอ เสียงสะท้อนนำทางให้กลุ่มคนที่คลำทางอยู่ในความมืดก้าวพ้นปากตรอกที่มีซอมบี้ซุ่มอยู่ได้ปลอดภัย เมื่อทุกคนเข้าพ้นประตูเหล็ก เจ้าจึงถอยกลับเข้าสู่เงามืด'
                : 'ในความมืด กลิ่นเหงื่อของคนเป็นกระตุ้นให้เจ้าเผลอแยกเขี้ยวส่งเสียงขู่ในลำคอจนผู้รอดชีวิตตื่นกลัวและขว้างเศษหินใส่ก่อนจะวิ่งหนีไป',
            effects:
              hunger < 80
                ? { hunger: 1, sanity: 3, humanity: 3, setFlag: 'crisis_late_seen_d60' }
                : { hunger: 1, sanity: -3, hp: -2, setFlag: 'crisis_late_seen_d60' },
          },
          {
            text: 'สัมผัสความมืดสนิทและปล่อยให้ประสาทสัมผัสซอมบี้รับรู้ความเคลื่อนไหวของฝูงรอบตัว',
            note: 'ฝึกอำนาจฝูง (horde +3) · สติ -2 (ยอมให้สัญชาตญาณสัตว์ร้ายครอบงำชั่วขณะ)',
            enabled: true,
            outcomeText:
              'เมื่อปราศจากแสงไฟ สายตาของเจ้ากลับมองเห็นความเคลื่อนไหวในความมืดได้ชัดเจนขึ้น ฝูงผู้ติดเชื้อรอบแยกหันมารับสัญญาณคลื่นสะท้อนในลำคอของเจ้า ความมืดไม่ได้ทำให้เจ้าอ่อนแอลง แต่มันทำให้เจ้าตระหนักว่าเมืองนี้กลายเป็นถิ่นของใคร',
            effects: {
              horde: 3,
              sanity: -2,
              mutation: 1,
              setFlag: 'crisis_late_seen_d60',
            },
          },
        ],
      };
    }
  }

  // 3. crisis-d75-canal-barricade (ช่วงเกิดจริง: วันที่ 75–84)
  if (day >= 75 && day <= 84) {
    const id = 'crisis-d75-canal-barricade';
    if (!flags['crisis_late_seen_d75'] && !triggeredIds.includes(id)) {
      const isBoatcrew = bio?.occupationId === 'boatcrew';
      const choice1HpCost = isBoatcrew ? -2 : -5;
      const choice1BaseOutcome =
        'สลักเหล็กขึ้นสนิมถูกงัดออกด้วยมือเปล่าของเจ้า โซ่เส้นใหญ่จมดิ่งลงสู่ก้นคลอง แพไม้บรรทุกเวชภัณฑ์และเด็กสามารถลอยลอดผ่านแนวสะพานหักไปได้ คนบนแพหันมามองร่างที่เปียกโชกด้วยน้ำเน่าของเจ้าด้วยแววตาที่พูดไม่ออก ก่อนจะพายเรือหนีหายไปในความมืด';

      return {
        id,
        title: `${formatTimelineDate(day)} · สะพานข้ามคลองถูกระเบิดสกัดฝูง ท่าเรือถูกขึงโซ่ตัดขาดเส้นทางน้ำ`,
        text: 'เสียงระเบิดดังกึกก้องมาจากแนวคลองแสนแสบ สะพานข้ามคลองช่วงต่อระหว่างสุขุมวิทกับเพชรบุรีพังทลายลงสู่ผิวน้ำดำคล้ำ เสาตอม่อหักสะบั้นด้วยฝีมือของกลุ่มติดอาวุธที่หวาดกลัวการข้ามฝั่งของฝูงผู้ติดเชื้อ บนผิวน้ำมีโซ่เหล็กขนาดใหญ่และซากเรือถูกขึงพาดสกัดลำคลอง ปิดกั้นไม่ให้เรือพายหรือแพชูชีพของผู้รอดชีวิตสัญจรได้อีกต่อไป ผู้คนสองฝั่งคลองยืนตะโกนด่าทอและเล็งปืนใส่กันด้วยความหวาดระแวง',
        dayNote: 'วิกฤตเมืองตามเวลา (ช่วงวันที่ 75–84 · ไม่เสียวันเพิ่ม)',
        placeId: place,
        advanceDay: false,
        onResolveSetFlags: ['crisis_late_seen_d75'],
        choices: [
          {
            text: 'มุดลงน้ำคลอง ใช้พละกำลังซอมบี้ที่ไร้ความเหนื่อยล้าช่วยปลดสลักโซ่ฝั่งทิศตะวันออกให้เรือลำเลียงผ่านได้',
            note: isBoatcrew
              ? '[ความถนัดลูกเรือ] สูญเสียพลังกายลดลง (HP -2 เพราะรู้วิธีปลดสลักเรือและหลบกระแสน้ำวน) · ความหิว +1'
              : 'สูญเสียพลังกาย (HP -5 จากน้ำสกปรกกัดกร่อนเนื้อเยื่อ) · ความหิว +1',
            enabled: true,
            outcomeText: isBoatcrew
              ? `${choice1BaseOutcome} ความคุ้นเคยสมัยเป็นลูกเรือทำให้เจ้ารู้จังหวะปลดสลักโซ่และหลบกระแสน้ำวนใต้น้ำได้อย่างชำนาญ`
              : choice1BaseOutcome,
            effects: {
              hp: choice1HpCost,
              hunger: 1,
              sanity: 2,
              humanity: 4,
              setFlag: 'crisis_d75_cleared_chain',
              setFlags: ['crisis_late_seen_d75', 'crisis_d75_cleared_chain'],
            },
          },
          {
            text: 'ส่งสัญญาณคำรามกดดันไม่ให้กลุ่มติดอาวุธยิงใส่แพของคนเจ็บที่ลอยอยู่กลางน้ำ',
            note: 'ใช้อำนาจฝูง (horde >= 30 จึงจะเห็นผลสมบูรณ์) · หากสติ < 30 มีความเสี่ยงสูญเสียการควบคุม',
            enabled: true,
            outcomeText:
              horde >= 30
                ? 'เสียงสะท้อนกร้าวในลำคอของเจ้าเรียกให้ซอมบี้ริมตลิ่งนับสิบตัวขยับเข้าใกล้แนวรั้ว ทหารอาสาที่กำลังเหนี่ยวไกปืนชะงักด้วยความผวาและยอมลดปากกระบอกปืนลง ปล่อยให้คนเจ็บลอยแพข้ามฝั่งไปโดยไม่มีการนองเลือด'
                : 'เสียงคำรามของเจ้ายังไม่มีอำนาจฝูงมากพอที่จะกดดันกลุ่มติดอาวุธ พวกเขายิงกราดเตือนจนกระสุนเฉี่ยวไหล่ของเจ้าไป',
            effects:
              horde >= 30
                ? { horde: 2, sanity: 1, humanity: 2, setFlag: 'crisis_late_seen_d75' }
                : { hp: -4, setFlag: 'crisis_late_seen_d75' },
          },
          {
            text: 'ยืนดูการตัดขาดอยู่บนแนวตลิ่ง แล้วถอยออกจากความขัดแย้งของคนเป็น',
            note: 'ไม่เสียทรัพยากร · สติ +1 · ความเป็นมนุษย์ -2 (เพิกเฉยต่อการตัดขาดของชุมชน)',
            enabled: true,
            outcomeText:
              'สะพานหักจมลงใต้น้ำอย่างสมบูรณ์ เมืองถูกหั่นออกเป็นชิ้นๆ อย่างไม่อาจประสาน มนุษย์สร้างกรงขังให้ตัวเองด้วยความกลัว ส่วนเจ้าทำได้เพียงหันหลังกลับสู่ซอยเปลี่ยว',
            effects: {
              sanity: 1,
              humanity: -2,
              setFlag: 'crisis_late_seen_d75',
            },
          },
        ],
      };
    }
  }

  // 4. crisis-d90-mass-schism (ช่วงเกิดจริง: วันที่ 90–99)
  if (day >= 90 && day <= 99) {
    const id = 'crisis-d90-mass-schism';
    if (!flags['crisis_late_seen_d90'] && !triggeredIds.includes(id)) {
      const hordeRouteAdvanced =
        Boolean(flags['route.horde.0'] && flags['route.horde.1'] && flags['route.horde.2']) ||
        horde >= 75 ||
        getEndingReadiness(gameState, 'king').enabled;
      const choice1BaseOutcome =
        'เสียงคำรามก้องสะท้อนไปตามใต้ทางด่วน ฝูงผู้ติดเชื้อที่กำลังพุ่งเข้าหารถหกล้อชะงักและเบี่ยงตัวออกไปทางตรอกข้างทาง ขบวนรถเร่งเครื่องพุ่งทะยานผ่านแนวถนนพระราม 9 ไปได้ แม้ไม่มีใครรู้ว่าปลายทางข้างหน้าจะมีทางรอดหรือไม่ แต่เจ้าได้เปิดทางให้พวกเขา';

      return {
        id,
        title: `${formatTimelineDate(day)} · ชุมชนแตกหัก ผู้รอดชีวิตกลุ่มใหญ่รวมรถบัสเสี่ยงแหกด่านหนี`,
        text: 'ที่ลานถนนกว้างหน้าอนุสาวรีย์ชัยฯ และทางด่วนดินแดง เสียงเครื่องยนต์รถหกล้อและรถตู้เก่าดังกระหึ่มควันขาวคลุ้ง ผู้รอดชีวิตกลุ่มใหญ่หลายสิบคนกำลังแย่งกันปีนขึ้นหลังคารถ สัมภาระถูกโยนทิ้งเกลื่อนกลาด มีเสียงทะเลาะวิวาทดังลั่นระหว่างคนที่ต้องการขับรถฝ่าแนวด่านทหารออกไปตายเอาดาบหน้า กับกลุ่มคนที่ยืนกรานจะหลบอยู่ในอุโมงค์ใต้ดินจนถึงวันสุดท้าย คนแก่และคนเจ็บหลายคนถูกทอดทิ้งให้นั่งอยู่ข้างเสาทางด่วน ท่ามกลางเสียงขู่คำรามของฝูงซอมบี้รอบนอกที่กำลังมุ่งหน้าตามเสียงเครื่องยนต์',
        dayNote: 'วิกฤตเมืองตามเวลา (ช่วงวันที่ 90–99 · ไม่เสียวันเพิ่ม)',
        placeId: place,
        advanceDay: false,
        onResolveSetFlags: ['crisis_late_seen_d90'],
        choices: [
          {
            text: 'ใช้คลื่นเสียงสั่งการฝูงซอมบี้รอบแนวถนนให้เบี่ยงทิศทาง เปิดทางให้ขบวนรถอพยพเคลื่อนตัวผ่านไปได้',
            note: 'ใช้อำนาจฝูง (horde >= 40) · สติ -3 (ต้องใช้สมาธิคุมฝูงอย่างหนัก)',
            enabled: true,
            outcomeText:
              horde >= 40
                ? hordeRouteAdvanced
                  ? `${choice1BaseOutcome} ฝูงซอมบี้ก้มหัวหมอบลงกับพื้นถนนราวกับกองทัพที่รอฟังคำสั่ง สร้างความตกตะลึงแก่ผู้รอดชีวิตบนรถ`
                  : choice1BaseOutcome
                : 'อำนาจสั่งการฝูงของเจ้ายังไม่สูงพอ ฝูงซอมบี้แตกตื่นกับเสียงเครื่องยนต์และรุมเบียดกระแทกจนเจ้าได้รับบาดเจ็บ',
            effects:
              horde >= 40
                ? {
                    horde: 5,
                    sanity: -3,
                    humanity: 4,
                    setFlag: 'crisis_d90_escorted_convoy',
                    setFlags: ['crisis_late_seen_d90', 'crisis_d90_escorted_convoy'],
                  }
                : {
                    hp: -6,
                    horde: -5,
                    setFlag: 'crisis_late_seen_d90',
                  },
          },
          {
            text: 'เข้าไปช่วยพยุงคนเจ็บและเด็กที่ตกรถ นำทางพวกเขาไปยังห้องแถวหลบภัยที่ใกล้ที่สุด',
            note:
              hunger >= 80
                ? 'ใช้แรงกาย (HP -4) · คำเตือน: "กลิ่นเลือดจากแผลคนเจ็บอาจทำให้สติของเจ้าขาดผึง"'
                : 'ใช้แรงกาย (HP -4) · สติ +4 · มนุษยธรรม +6',
            enabled: true,
            outcomeText:
              hunger < 80
                ? 'เจ้าอุ้มเด็กน้อยและพยุงคนแก่ที่ถูกเบียดตกข้างทางเข้าไปหลบหลังประตูเหล็กของอาคารพาณิชย์ แม้หญิงชราจะตัวสั่นงันงกเมื่อเห็นใบหน้าซีดเผือดไร้ชีวิตของเจ้า แต่มือที่เหี่ยวย่นคู่นั้นก็กุมข้อมือเจ้าไว้แน่นแทนคำขอบคุณ'
                : 'กลิ่นเลือดสดจากบาดแผลทำให้สติที่หิวโซของเจ้าขาดผึงชั่วขณะ สัญชาตญาณสัตว์ร้ายเข้าครอบงำให้เจ้าก้มลงกัดกินร่างผู้บาดเจ็บที่เพิ่งหมดลมหายใจตรงข้างเสาทางด่วน',
            effects:
              hunger < 80
                ? { hp: -4, sanity: 4, humanity: 6, setFlag: 'crisis_late_seen_d90' }
                : { hp: -4, sanity: -5, hunger: -10, corpseMeals: 1, setFlag: 'crisis_late_seen_d90' },
          },
          {
            text: 'คุ้ยหากระเป๋าสัมภาระที่ถูกโยนทิ้งเกลื่อนถนนเพื่อเก็บสิ่งของจำเป็นก่อนที่ทุกอย่างจะถูกเหยียบแหลก',
            note: 'ความหิว +1 · เสี่ยงโดนสะเก็ดกระจก (HP -2) · สติ -2 (การแย่งชิงของคนหนีตาย)',
            enabled: true,
            outcomeText:
              'ซากกระเป๋าเดินทางที่ถูกล้อรถทับแตกออก เผยให้เห็นปลากระป๋องและยาแก้ปวดตกอยู่ เจ้าก้มลงเก็บของเหล่านั้นท่ามกลางเศษเสื้อผ้าและรูปถ่ายครอบครัวที่ไม่มีใครเหลียวหลังกลับมามอง',
            effects: {
              hp: -2,
              hunger: 1,
              supplies: 2,
              sanity: -2,
              setFlag: 'crisis_late_seen_d90',
            },
          },
          {
            text: 'ยืนดูขบวนรถเร่งเครื่องจากไปโดยไม่แทรกแซง',
            note: 'ไม่เสียทรัพยากร · สติ +1',
            enabled: true,
            outcomeText:
              'รถตู้คันสุดท้ายวิ่งลับสายตาไป ทิ้งไว้เพียงควันไอเสียจางๆ และความเงียบสงัดที่คืนกลับสู่ลานอนุสาวรีย์ฯ เมืองว่างเปล่าลงไปอีกส่วนหนึ่งแล้ว',
            effects: {
              sanity: 1,
              setFlag: 'crisis_late_seen_d90',
            },
          },
        ],
      };
    }
  }

  // 5. crisis-d105-air-raid-siren (ช่วงเกิดจริง: วันที่ 105–111)
  if (day >= 105 && day <= 111) {
    const id = 'crisis-d105-air-raid-siren';
    if (!flags['crisis_late_seen_d105'] && !triggeredIds.includes(id)) {
      const evolutionPrepDone =
        Boolean(flags['route.evolution.0'] && flags['route.evolution.1'] && flags['route.evolution.2']) ||
        getEndingReadiness(gameState, 'evolve').enabled;
      const choice1BaseOutcome =
        'จากมุมสูง ลมกรรโชกแรงพัดพาละอองฝนปนกลิ่นกำมะถัน เจ้ามองเห็นแนวกำแพงคอนกรีตรอบกรุงเทพฯ ไกลลิบ ปราศจากรถถังหรือทหารลาดตระเวน มีเพียงแนวรั้วลวดหนามที่ถูกปิดตาย เมืองนี้กลายเป็นเกาะร้างกลางแผ่นดินใหญ่ที่กำลังนับถอยหลังสู่เปลวเพลิง';

      return {
        id,
        title: `${formatTimelineDate(day)} · ไซเรนเตือนภัยทางอากาศดังขึ้นครั้งแรก ทหารภายนอกถอนตัว 100%`,
        text: 'หวูดเตือนภัยทางอากาศรุ่นเก่าบนยอดอาคารสูงและเสาวิทยุพระราม 8 ที่เงียบงันมานานหลายเดือน ถูกสั่งเปิดทำงานจากระยะไกลด้วยคลื่นวิทยุฉุกเฉิน เสียงหวูดหมุนวน "วู้ววว... วู้ววว..." กึกก้องเสียดแทงแก้วหูสะท้อนข้ามแม่น้ำเจ้าพระยาไปทั่วทุกมุมตึก นกพิราบและอีกาแตกรังบินว่อน ฝูงซอมบี้ทั่วทั้งกรุงเทพฯ เงยหน้าขึ้นมองฟ้าและส่งเสียงโหยหวนตอบรับ บนแนวด่านกักกันรอบนอก ไม่มีแสงไฟสปอตไลต์ของทหารเฝ้าระวังอีกต่อไป มีเพียงเสียงตามสายอัตโนมัติแจ้งว่า: "ระยะปลอดภัยสิ้นสุดลง กำลังพลถอนตัวพ้นแนวปูพรมแล้ว"',
        dayNote: 'วิกฤตเมืองตามเวลา (ช่วงวันที่ 105–111 · ไม่เสียวันเพิ่ม)',
        placeId: place,
        advanceDay: false,
        onResolveSetFlags: ['crisis_late_seen_d105'],
        choices: [
          {
            text: 'ปีนขึ้นสู่ชั้นดาดฟ้าของอาคารสูงเพื่อตรวจดูทิศทางและแนวควันของแนวกักกันรอบนอก',
            note: 'ใช้พลังกาย (HP -3) · สติ +3 (ได้เห็นภาพรวมของชะตากรรมเมือง)',
            enabled: true,
            outcomeText: evolutionPrepDone
              ? `${choice1BaseOutcome} ดวงตาที่กลายพันธุ์ของเจ้ามองเห็นรังสีความร้อนและโครงสร้างบังเกอร์ใต้ดินชัดเจนขึ้น ร่างกายกำลังเตรียมพร้อมรับความเปลี่ยนแปลงครั้งใหญ่`
              : choice1BaseOutcome,
            effects: {
              hp: -3,
              sanity: 3,
              mutation: 1,
              setFlag: 'crisis_late_seen_d105',
            },
          },
          {
            text: 'นั่งลงพิงผนังซากตึก หลับตาลง และปล่อยให้เสียงไซเรนสะท้อนผ่านร่างที่ไร้ชีพจร',
            note: 'สติ +2 · ไม่เสียทรัพยากร · การยอมรับความจริง',
            enabled: true,
            outcomeText:
              'คลื่นเสียงหวีดหวิวสั่นสะเทือนผ่านกระดูกและเนื้อเยื่อที่เย็นเฉียบ ไม่มีชีพจรเต้นเร็วขึ้นด้วยความกลัว มีเพียงความสงบนิ่งแปลกประหลาด เมื่อเจ้ารู้ว่าจุดสิ้นสุดของความทรมานในร่างนี้ใกล้เข้ามาแล้ว',
            effects: {
              sanity: 2,
              setFlag: 'crisis_late_seen_d105',
            },
          },
          {
            text: 'ออกวิ่งไปตามถนน เคาะกระป๋องเตือนคนที่ยังติดอยู่ในซอกตึกให้เตรียมหาที่หลบภัยใต้ดิน',
            note: 'ใช้พลังกาย (HP -4) · ความหิว +2 · มนุษยธรรม +4',
            enabled: true,
            outcomeText:
              'เสียงเคาะเตือนของเจ้าปลุกให้ผู้รอดชีวิตที่ยังหลบซ่อนอยู่ในห้องใต้ดินรีบปิดผนึกช่องระบายอากาศ แม้จะช่วยชีวิตพวกเขาจากระเบิดไม่ได้ทั้งหมด แต่อย่างน้อยพวกเขาก็รู้ว่าเวลาเตรียมตัวใกล้หมดลงแล้ว',
            effects:
              hunger < 80
                ? { hp: -4, hunger: 2, sanity: 1, humanity: 4, setFlag: 'crisis_late_seen_d105' }
                : { hp: -4, hunger: 2, sanity: -3, setFlag: 'crisis_late_seen_d105' },
          },
        ],
      };
    }
  }

  // 6. crisis-d112-phosphorus-drift (ช่วงเกิดจริง: วันที่ 112–115)
  if (day >= 112 && day <= 115) {
    const id = 'crisis-d112-phosphorus-drift';
    if (!flags['crisis_late_seen_d112'] && !triggeredIds.includes(id)) {
      const resistSmoke = mutationStage.stageNumber >= 3;
      const hpCost1 = resistSmoke ? -3 : -6;
      const hpCost2Fail = resistSmoke ? -2 : -5;
      const hpCost3 = resistSmoke ? -1 : -2;

      return {
        id,
        title: `${formatTimelineDate(day)} · เครื่องบินโปรยพลุควันสีส้มและฟอสฟอรัสทำเครื่องหมายพิกัดทิ้งระเบิด`,
        text: 'เสียงหวีดแหวกอากาศดังเป็นสาย ฝูงบินความเร็วสูงทิ้งแท่งฟอสฟอรัสขาวและพลุควันสีส้มสว่างวาบลงตามสี่แยกหลัก เช่น แยกอโศก ประตูน้ำ และอนุสาวรีย์ชัยฯ ควันพิษหนาทึบกลิ่นกำมะถันแสบร้อนแผ่กระจายไปตามผิวถนน สะเก็ดไฟสีขาวลุกไหม้รุนแรงโดยไม่อาจดับด้วยน้ำ ผู้ติดเชื้อที่โดนสะเก็ดไฟดิ้นทุรนทุรายกรีดร้องด้วยความเจ็บปวด อาคารพาณิชย์เก่าเริ่มมีเปลวไฟลามเลีย ท้องฟ้ายามบ่ายเปลี่ยนเป็นสีส้มทึบแสง',
        dayNote: 'วิกฤตเมืองตามเวลา (ช่วงวันที่ 112–115 · ไม่เสียวันเพิ่ม)',
        placeId: place,
        advanceDay: false,
        onResolveSetFlags: ['crisis_late_seen_d112'],
        choices: [
          {
            text: 'ใช้ผ้าชุบน้ำโคลนคลุมศีรษะ นำทางกลุ่มผู้รอดชีวิตที่สำลักควันลงสู่อุโมงค์รถไฟใต้ดิน (MRT) ที่ปลอดภัยจากไฟ',
            note: `สูญเสียพลังกาย (HP ${hpCost1} จากสะเก็ดควันฟอสฟอรัส${resistSmoke ? ' · เนื้อเยื่อกลายพันธุ์ลดความเสียหายกึ่งหนึ่ง' : ''}) · ความหิว +1 · มนุษยธรรม +5`,
            enabled: true,
            outcomeText:
              'สะเก็ดฟอสฟอรัสกัดเนื้อไหล่ของเจ้าจนไหม้เกรียมเป็นแผลดำ แต่เจ้าผลักผู้รอดชีวิตสี่คนสุดท้ายลงสู่บันไดสถานีรถไฟใต้ดินก่อนประตูเหล็กจะถูกดึงปิดลง ความร้อนบนผิวเนื้อของเจ้าเย็นลงเมื่ออยู่ในเงามืด แต่ความอบอุ่นในใจยังหลงเหลือ',
            effects: {
              hp: hpCost1,
              hunger: 1,
              sanity: 2,
              humanity: 5,
              setFlag: 'crisis_late_seen_d112',
            },
          },
          {
            text: 'สั่งการฝูงซอมบี้ที่กำลังตื่นตระหนกให้ถอยร่นเข้าไปในท่อระบายน้ำใต้ถนนเพื่อรักษาพลังฝูง',
            note: 'ใช้อำนาจฝูง (horde >= 50) · สติ -2 · อำนาจฝูง +5',
            enabled: true,
            outcomeText:
              horde >= 50
                ? 'คลื่นเสียงคำรามสั่งการของเจ้าทำให้ฝูงซอมบี้ที่กำลังวิ่งชนกำแพงไฟหันเหแถว มุดลอดตะแกรงท่อระบายน้ำลงสู่ใต้ดินนับร้อยตัว เจ้าได้ปกป้องกองทัพใต้ดินของเจ้าไว้ใต้ชั้นคอนกรีตหนา'
                : 'ฝูงซอมบี้ตื่นตระหนกกับเปลวไฟฟอสฟอรัสและเหยียบกันเองจนควบคุมไม่ได้ ร่างของเจ้าถูกเบียดกระแทกท่ามกลางควันพิษ',
            effects:
              horde >= 50
                ? { horde: 5, sanity: -2, mutation: 1, setFlag: 'crisis_late_seen_d112' }
                : { hp: hpCost2Fail, horde: -10, setFlag: 'crisis_late_seen_d112' },
          },
          {
            text: 'มุดเข้าใต้ซากสะพานคอนกรีตหนา ปิดประสาทรับกลิ่นและรอจนกว่าหมอกควันจะจางลง',
            note: `สูญเสียพลังกายเล็กน้อย (HP ${hpCost3}${resistSmoke ? ' · ทนควันพิษ' : ''}) · สติ +1 · ไม่ยุ่งเกี่ยวกับคนอื่น`,
            enabled: true,
            outcomeText:
              'ใต้คานคอนกรีตหนา ควันพิษลอยเฉียดผ่านไป สะเก็ดไฟไหม้เสื้อผ้าของเจ้าบางส่วน แต่ร่างที่ไร้ความเจ็บปวดแบบมนุษย์ยังคงยืนหยัดอยู่ได้ เมืองรอบตัวกำลังถูกเปลี่ยนสภาพเป็นซากเถ้าถ่าน',
            effects: {
              hp: hpCost3,
              sanity: 1,
              setFlag: 'crisis_late_seen_d112',
            },
          },
        ],
      };
    }
  }

  // 7. crisis-d116-final-vigil (ช่วงเกิดจริง: วันที่ 116–118)
  if (day >= 116 && day <= 118) {
    const id = 'crisis-d116-final-vigil';
    if (!flags['crisis_late_seen_d116'] && !triggeredIds.includes(id)) {
      const highHumanity = humanity >= 60;
      const tearSentence = highHumanity
        ? ' หยดน้ำตาที่แห้งเหือดไปนานกลับรื้นขึ้นมาที่ขอบตาของร่างที่ไร้ชีพจร'
        : '';

      const choice2Effects =
        supplies > 0
          ? { supplies: -1, sanity: 5, humanity: 6, bystanderTrustDelta: 10, setFlag: 'crisis_late_seen_d116' }
          : medicine > 0
          ? { medicine: -1, sanity: 5, humanity: 6, bystanderTrustDelta: 10, setFlag: 'crisis_late_seen_d116' }
          : { sanity: 3, humanity: 3, bystanderTrustDelta: 10, setFlag: 'crisis_late_seen_d116' };

      return {
        id,
        title: `${formatTimelineDate(day)} · คนที่ยังติดอยู่ในเมืองหยุดดิ้นรน นั่งล้อมวงจุดตะเกียงส่งท้าย`,
        text: `ควันไฟจากวันก่อนจางลง เหลือเพียงกลิ่นเถ้าถ่านและความเงียบงันที่แปลกประหลาด ในอาคารพักพิงที่ยังเหลือรอด (เช่น หอผู้ป่วยราชวิถี หรือครัวคลองเตย) ผู้รอดชีวิตกลุ่มสุดท้ายไม่ได้วิ่งหาของหรือซ่อมรั้วอีกแล้ว พวกเขานั่งล้อมวงอยู่ข้างตะเกียงน้ำมันดวงเล็กๆ เสียงพูดคุยเบาๆ เล่าถึงความทรงจำในอดีต อาหารกระป๋องมื้อสุดท้ายถูกเปิดแบ่งให้ทุกคนอย่างเท่าเทียม เด็กบางคนผล็อยหลับไปในอ้อมแขนแม่ ไม่มีเสียงปืน ไม่มีเสียงตะโกน มีเพียงการรอคอยชะตากรรมด้วยหัวใจที่ยอมรับ${tearSentence}`,
        dayNote: 'วิกฤตเมืองตามเวลา (ช่วงวันที่ 116–118 · ไม่เสียวันเพิ่ม)',
        placeId: place,
        advanceDay: false,
        onResolveSetFlags: ['crisis_late_seen_d116'],
        choices: [
          {
            text: 'ยืนเฝ้าอยู่หน้าประตูทางเข้าเงียบๆ ทำหน้าที่เป็น "ผู้พิทักษ์ไร้เงา" ให้พวกเขามีช่วงเวลาสงบสุขสุดท้าย',
            note: 'สติ +4 · มนุษยธรรม +4 · ไม่เสียทรัพยากร',
            enabled: true,
            outcomeText: `เจ้าหยุดยืนอยู่ตรงธรณีประตู ลมหนาวพัดชายเสื้อที่ขาดวิ่นของเจ้า ไม่มีใครส่งเสียงกรีดร้องเมื่อเห็นเงาของเจ้า ผู้หญิงคนหนึ่งเงยหน้าขึ้นสบตากับเจ้าแล้วพยักหน้าช้าๆ เจ้าปกป้องคืนอันสงบสุขนี้ไว้จนกระทั่งแสงตะเกียงริบหรี่ดับลง${tearSentence}`,
            effects: {
              sanity: 4,
              humanity: 4,
              setFlag: 'crisis_late_seen_d116',
            },
          },
          {
            text: 'ก้าวเข้าไปในระยะสายตา มอบสิ่งของหรือบันทึกที่เจ้าเก็บรักษาไว้ตลอดการเดินทางให้แก่พวกเขา',
            note: 'เสียเสบียงหรือเวชภัณฑ์ที่มี (Supplies -1 หรือ Medicine -1) · ความไว้ใจเขต +10 · สติ +5',
            enabled: true,
            outcomeText: `เจ้าก้มลงวางกล่องเสบียงลงบนโต๊ะไม้ ผู้รอดชีวิตมองดูมือที่ไร้ชีพจรของเจ้า ชายชราคนหนึ่งเอื้อมมือมาแตะหลังมือเจ้าเบาๆ "ขอบคุณนะ... ไม่ว่าเจ้าจะเป็นใครมาก่อน ขอให้เจ้าได้ไปสู่ที่สงบเช่นกัน" คำพูดนั้นเติมเต็มเศษเสี้ยววิญญาณที่แหลกสลายของเจ้า${tearSentence}`,
            effects: choice2Effects,
          },
          {
            text: 'นั่งลงข้างขอบหน้าต่างชั้นบน มองดูแสงตะเกียงดวงเล็กๆ นั้นแล้วปล่อยวางเรื่องราวทั้งหมด',
            note: 'สติ +3 · จิตใจสงบนิ่ง · ไม่เสียทรัพยากร',
            enabled: true,
            outcomeText: `จากขอบหน้าต่าง แสงตะเกียงสะท้อนดวงตาที่ขุ่นมัวของเจ้า กรุงเทพฯ ในคืนนี้ช่างเงียบสงบราวกับภาพวาดในอดีต เจ้าได้อยู่จนถึงช่วงเวลาที่มนุษย์หยุดเกลียดชังกัน และนั่นก็เพียงพอแล้ว${tearSentence}`,
            effects: {
              sanity: 3,
              setFlag: 'crisis_late_seen_d116',
            },
          },
        ],
      };
    }
  }

  // 8. crisis-d119-eve-of-impact (วันที่ 119 เท่านั้น)
  if (day === 119) {
    const id = 'crisis-d119-eve-of-impact';
    if (!flags['crisis_late_seen_d119'] && !triggeredIds.includes(id)) {
      const cureCount = Math.max(
        ['route.vaccine.0', 'route.vaccine.1', 'route.vaccine.2'].filter(k => Boolean(flags[k])).length,
        ['route.cure.0', 'route.cure.1', 'route.cure.2'].filter(k => Boolean(flags[k])).length
      );
      const hordeCount = ['route.horde.0', 'route.horde.1', 'route.horde.2'].filter(k => Boolean(flags[k])).length;
      const evoCount = ['route.evolution.0', 'route.evolution.1', 'route.evolution.2'].filter(k => Boolean(flags[k])).length;
      const helpedDistricts = districts.filter(d => Boolean(flags[d.id + '.helped'])).length;
      const savedCount = Number(gameState.memory?.saved || 0);
      const anyRouteReady =
        cureCount === 3 ||
        hordeCount === 3 ||
        evoCount === 3 ||
        helpedDistricts >= 1 ||
        getEndingReadiness(gameState, 'human').enabled ||
        getEndingReadiness(gameState, 'king').enabled ||
        getEndingReadiness(gameState, 'evolve').enabled ||
        getEndingReadiness(gameState, 'horde_breakout').enabled;

      const routeSummary = `สรุปเส้นทางที่เตรียมไว้: วัคซีน ${cureCount}/3 · ฝูง ${hordeCount}/3 · กลายพันธุ์ ${evoCount}/3 · ช่วยเหลือชุมชน ${helpedDistricts} ย่าน (ช่วยชีวิต ${savedCount} ครั้ง)`;

      return {
        id,
        title: `${formatTimelineDate(day)} · คืนสุดท้ายก่อนเส้นตาย แสงสปอตไลต์ระยะไกลกวาดขอบฟ้าและความเงียบ`,
        text: `วันที่ 119 สิ้นสุดลง ท้องฟ้ายามราตรีเหนือกรุงเทพมหานครสว่างวาบด้วยลำแสงสปอตไลต์นับสิบดวงจากแนวกักกันรอบนอกที่สาดขึ้นสู่กลีบเมฆ เสียงคำรามทึบต่ำของเครื่องยนต์เจ็ตขนาดใหญ่ดังกึกก้องแว่วมาจากอ่าวไทยอย่างต่อเนื่อง บนถนนสายหลักไม่มีมนุษย์เดินเท้าอีกแล้ว แม้แต่ฝูงซอมบี้ก็ยังสงบนิ่งราวกับรับรู้ถึงชะตากรรมร่วมกัน ลมร้อนพัดพาเศษผงเถ้าถ่านปลิวว่อนผ่านร่างของเจ้า เวลาแห่งการตัดสินใจสิ้นสุดลงแล้ว ค่ำคืนนี้คือช่วงเวลาสุดท้ายของเมืองหลวง\n\n[${routeSummary}]`,
        statusNote: routeSummary,
        dayNote: 'คืนสุดท้ายก่อนเส้นตายวันที่ 120 (ไม่เสียวันเพิ่ม)',
        placeId: place,
        advanceDay: false,
        onResolveSetFlags: ['crisis_late_seen_d119'],
        choices: [
          {
            text: 'สำรวจสภาพร่างและทบทวนเส้นทางฉากจบที่ตนได้เตรียมไว้ (พร้อมมุ่งหน้าสู่จุดไคลแมกซ์ในวันพรุ่งนี้)',
            note: anyRouteReady
              ? 'สติ +5 · "เจ้ายังมีโอกาสเดินหน้าสู่ฉากจบเดิมก่อนระเบิดลง"'
              : 'สติ +5 · ทบทวนเส้นทางและโอกาสสุดท้ายก่อนฟ้าสาง',
            enabled: true,
            outcomeText:
              'เจ้าตรวจสอบสิ่งของในกระเป๋า บันทึกวิจัย และสภาพร่างกายของตนเอง หากเจ้าต้องการฉีดเซรุ่ม สั่งการฝูง หรือหนีออกนอกเมือง วันพรุ่งนี้คือโอกาสสุดท้ายก่อนที่ท้องฟ้าจะถล่มลงมา',
            effects: {
              sanity: 5,
              setFlag: 'crisis_late_seen_d119',
            },
          },
          {
            text: 'ก้าวออกไปยืนกลางสี่แยกถนน มองขึ้นสู่ท้องฟ้าสีเลือดเป็นครั้งสุดท้ายเพื่อเผชิญหน้ากับเปลวเพลิง',
            note: 'สติ +5 · ความเป็นมนุษย์ +5 · ไม่เสียทรัพยากร · การเผชิญหน้ากับจุดจบอย่างสงบ',
            enabled: true,
            outcomeText:
              'ลมร้อนกรรโชกพัดผ่านใบหน้า เสียงเครื่องบินทิ้งระเบิดใกล้เข้ามาทุกที เจ้าไม่รู้สึกกลัวอีกต่อไป ร่างนี้อาจเคยตายไปแล้วครั้งหนึ่ง แต่วันนี้เจ้าได้มีชีวิตอยู่จนถึงวินาทีสุดท้ายด้วยเจตจำนงของตนเอง',
            effects: {
              sanity: 5,
              humanity: 5,
              setFlag: 'crisis_late_seen_d119',
            },
          },
          {
            text: 'คุกเข่าลง แตะมือลงบนพื้นยางมะตอยของกรุงเทพฯ แล้วตั้งจิตระลึกถึงชื่อและความทรงจำเดิมของตน',
            note: 'สติ +10 · ความเป็นมนุษย์ +5 · ฟื้นฟูเศษเสี้ยวความทรงจำสมบูรณ์',
            enabled: true,
            outcomeText:
              'ปลายนิ้วสัมผัสความอบอุ่นที่ยังหลงเหลือบนพื้นถนน ภาพความทรงจำในอดีตผุดขึ้นมาชัดเจนราวกับเพิ่งเกิดขึ้นเมื่อวาน เจ้าจำชื่อตนเอง จำผู้คนที่เคยรัก และจำความหมายของการมีชีวิตอยู่ได้ครบถ้วน แม้เมืองนี้จะมอดไหม้ แต่จิตวิญญาณของเจ้าไม่ได้สูญหายไปกับเชื้อร้าย',
            effects: {
              sanity: 10,
              humanity: 5,
              setFlag: 'crisis_late_seen_d119',
            },
          },
        ],
      };
    }
  }

  return null;
}

export function normalizeCanonicalMemory(mem: any) {
  return {
    saved: Math.min(120, Math.max(0, Math.floor(Number(mem?.saved || 0)))),
    killed: Math.min(120, Math.max(0, Math.floor(Number(mem?.killed || 0)))),
    corpseMeals: Math.min(120, Math.max(0, Math.floor(Number(mem?.corpseMeals || 0)))),
    endured: Math.min(120, Math.max(0, Math.floor(Number(mem?.endured || 0)))),
    savedOn: Math.min(120, Math.max(0, Math.floor(Number(mem?.savedOn || 0)))),
    killedOn: Math.min(120, Math.max(0, Math.floor(Number(mem?.killedOn || 0)))),
  };
}

export function sanitizeCanonicalStoryFlags(flags: any, knownCatalogFlags?: Record<string, any>) {
  if (!flags || typeof flags !== 'object') return {};
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(flags)) {
    if (!knownCatalogFlags || Object.hasOwn(knownCatalogFlags, k)) {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

/**
 * Helper สำหรับจำลองหรือประมวลผลผลลัพธ์ของ LifeSimModalEvent ลงใน gameState (ใช้ร่วมกันทั้งใน UI และการทดสอบจำลองสมดุล)
 */
export function applyLifeSimModalEffectsToState(
  gameState: any,
  modalEvent: LifeSimModalEvent,
  choiceIndex: number
): any {
  const choice = modalEvent.choices[choiceIndex];
  if (!choice || !choice.enabled) return gameState;
  const eff = choice.effects;

  if (!gameState.story || typeof gameState.story !== 'object') {
    gameState.story = { flags: {} };
  }
  if (!gameState.story.flags || typeof gameState.story.flags !== 'object') {
    gameState.story.flags = {};
  }
  if (Array.isArray(modalEvent.onResolveSetFlags)) {
    for (const f of modalEvent.onResolveSetFlags) {
      if (f) gameState.story.flags[f] = true;
    }
  }
  if (eff.setFlag) {
    gameState.story.flags[eff.setFlag] = true;
  }
  if (Array.isArray(eff.setFlags)) {
    for (const f of eff.setFlags) {
      if (f) gameState.story.flags[f] = true;
    }
  }

  if (modalEvent.advanceDay !== false) {
    gameState.day = (gameState.day || 1) + 1;
    const mutStage = getMutationStageInfo(gameState.stats?.mutation || 0);
    if (mutStage.dailyHpRegen > 0 && (gameState.stats?.hp || 0) > 0) {
      gameState.stats.hp = Math.min(100, (gameState.stats.hp || 0) + mutStage.dailyHpRegen);
    }
  }

  const applyClamped = (key: string, delta?: number, max = 100) => {
    if (!delta) return;
    gameState.stats[key] = Math.min(max, Math.max(0, (gameState.stats[key] || 0) + delta));
  };

  applyClamped('hp', eff.hp, 100);
  applyClamped('hunger', eff.hunger, 100);
  applyClamped('sanity', eff.sanity, 100);
  applyClamped('humanity', eff.humanity, 100);
  applyClamped('mutation', eff.mutation, 100);
  applyClamped('research', eff.research, 100);
  applyClamped('horde', eff.horde, 120);

  if (!gameState.memory || typeof gameState.memory !== 'object') {
    gameState.memory = {};
  }
  gameState.memory = normalizeCanonicalMemory(gameState.memory);
  for (const key of ['corpseMeals', 'endured'] as const) {
    if (eff[key]) {
      gameState.memory[key] = Math.min(120, (gameState.memory[key] || 0) + eff[key]!);
    }
  }

  if (!gameState.items || typeof gameState.items !== 'object') {
    gameState.items = {};
  }
  if (eff.supplies) {
    gameState.items.supplies = Math.max(0, (gameState.items.supplies || 0) + eff.supplies);
  }
  if (eff.medicine) {
    gameState.items.medicine = Math.max(0, (gameState.items.medicine || 0) + eff.medicine);
  }
  if (eff.samples) {
    gameState.items.samples = Math.max(0, (gameState.items.samples || 0) + eff.samples);
  }
  if (eff.carriedBloodBags) {
    gameState.carriedBloodBags = Math.max(0, (gameState.carriedBloodBags || 0) + eff.carriedBloodBags);
  }

  return gameState;
}

// ============================================================================
// PER-NPC TRUST, LIVING NPC CRISES & PROCEDURAL ZOMBIE LIFE-SIMULATION SYSTEM
// ============================================================================

const RANDOM_SURVIVOR_POOL: Record<
  'shelter' | 'streets' | 'hospital' | 'tower' | 'nest',
  Array<{ name: string; age: number; role: string; trait: string; crisisDay: number; crisisText: string }>
> = {
  hospital: [
    {
      name: 'หมอฝึกหัดกานต์',
      age: 25,
      role: 'นักศึกษาแพทย์เวรฉุกเฉิน',
      trait: 'ช่างสังเกตแต่ตื่นกลัวเสียงดัง',
      crisisDay: 4,
      crisisText: 'ติดอยู่ในห้องเก็บเวชภัณฑ์ที่ถูกซอมบี้คลั่งขวางประตูไว้',
    },
    {
      name: 'ป้าพิม',
      age: 52,
      role: 'เจ้าหน้าที่ห้องจ่ายยา',
      trait: 'ใจแข็งและหวงเวชภัณฑ์',
      crisisDay: 6,
      crisisText: 'กำลังขาดเสบียงอาหารอย่างหนักจนเกือบเป็นลมหน้าห้องยา',
    },
    {
      name: 'จ่าเดช',
      age: 44,
      role: 'อดีตตำรวจเฝ้าจุดคัดกรอง',
      trait: 'นิ้วแตะไกปืนตลอดเวลา',
      crisisDay: 5,
      crisisText: 'กระสุนปืนใกล้หมดและบาดเจ็บที่แขนจากการปะทะฝูงซอมบี้',
    },
    {
      name: 'มินตรา',
      age: 19,
      role: 'คนไข้ขาเข้าเฝือกชั้นสอง',
      trait: 'หนีไปไหนไม่ได้ไกล รอความช่วยเหลือ',
      crisisDay: 3,
      crisisText: 'แผลที่ขาอักเสบหนักและต้องการชุดเย็บแผลหรือการคุ้มกันด่วน',
    },
    {
      name: 'ลุงสมศักดิ์',
      age: 61,
      role: 'ช่างซ่อมบำรุงเครื่องปั่นไฟ รพ.',
      trait: 'คุ้นชินกับความมืดหลังตึก',
      crisisDay: 7,
      crisisText: 'ถูกล้อมอยู่ตรงห้องเครื่องปั่นไฟด้านหลังโรงพยาบาล',
    },
    {
      name: 'พยาบาลแพรว',
      age: 29,
      role: 'ผู้ช่วยห้องธนาคารเลือด',
      trait: 'จำรหัสตู้แช่เลือดได้แม่นยำ',
      crisisDay: 5,
      crisisText: 'กำลังพยายามขนย้ายถุงเลือดหนีซอมบี้คลั่งที่พังกระจกเข้ามา',
    },
  ],
  streets: [
    {
      name: 'เอก',
      age: 27,
      role: 'คนคุ้ยหาเสบียงตามร้านชำ',
      trait: 'วิ่งไวและระแวงเงาในตรอก',
      crisisDay: 3,
      crisisText: 'ขาพลิกขณะวิ่งหนีซอมบี้คลั่งอยู่ในตรอกข้างร้านชำ',
    },
    {
      name: 'ลุงรงค์',
      age: 55,
      role: 'คนขับรถบรรทุกที่ติดอยู่แยกไฟแดง',
      trait: 'ซ่อนตัวอยู่บนหลังคารถพ่วง',
      crisisDay: 5,
      crisisText: 'น้ำและอาหารบนหลังคารถบรรทุกหมดเกลี้ยงมาสองวันแล้ว',
    },
    {
      name: 'โจ้',
      age: 21,
      role: 'วัยรุ่นส่งสัญญาณพลุไฟ',
      trait: 'มุทะลุแต่รักพวกพ้อง',
      crisisDay: 4,
      crisisText: 'ทำพลุไฟตกจนล่อซอมบี้ไร้สติสามตัวเข้ามาล้อมตัวเอง',
    },
    {
      name: 'นภา',
      age: 34,
      role: 'อดีตเภสัชกรร้านขายยาหัวมุม',
      trait: 'พยายามเก็บยาปฏิชีวนะไปช่วยคนเจ็บ',
      crisisDay: 6,
      crisisText: 'ประตูเหล็กร้านขายยาติดขัดเปิดไม่ออกขณะฝูงซอมบี้ใกล้เข้ามา',
    },
    {
      name: 'คราม',
      age: 30,
      role: 'นักแม่นธนูบนดาดฟ้าตึกแถว',
      trait: 'เฝ้ามองพฤติกรรมของผู้ติดเชื้อจากที่สูง',
      crisisDay: 7,
      crisisText: 'บันไดหนีไฟพังลงมาทำให้ลงจากดาดฟ้าไม่ได้',
    },
  ],
  shelter: [
    {
      name: 'ป้าณี',
      age: 49,
      role: 'แม่บ้านดูแลครัวห้องหลบภัย',
      trait: 'คอยนับจำนวนอาหารกระป๋องทุกมื้อ',
      crisisDay: 4,
      crisisText: 'เสบียงอาหารกระป๋องในห้องหลบภัยร่อยหรอลงจนต้องอดมื้อกินมื้อ',
    },
    {
      name: 'ต้น',
      age: 17,
      role: 'เด็กหนุ่มเฝ้าช่องระบายอากาศ',
      trait: 'แอบมองออกมาข้างนอกผ่านตะแกรงเหล็ก',
      crisisDay: 3,
      crisisText: 'แอบปีนออกมาหาของหน้าห้องหลบภัยแล้วถูกซอมบี้ไร้สติดักทางกลับ',
    },
    {
      name: 'ครูวินัย',
      age: 46,
      role: 'ครูมัธยมผู้จัดเวรยาม',
      trait: 'เชื่อว่าผู้ติดเชื้อบางตนยังมีความจำหลงเหลือ',
      crisisDay: 5,
      crisisText: 'บาดเจ็บจากการซ่อมบานพับประตูเหล็กของห้องหลบภัย',
    },
    {
      name: 'ฝ้าย',
      age: 24,
      role: 'นักวาดภาพที่บันทึกเหตุการณ์หลังจุดศูนย์',
      trait: 'ไม่กลัวการสบตากับผู้ติดเชื้อที่สงบนิ่ง',
      crisisDay: 6,
      crisisText: 'กำลังถูกคนเป็นกลุ่มอื่นข่มขู่แย่งเสบียงอยู่หน้าทางลงใต้ดิน',
    },
  ],
  tower: [
    {
      name: 'วิศวกรพงศ์',
      age: 41,
      role: 'ผู้ดูแลเสาส่งสัญญาณหลัก',
      trait: 'พยายามซ่อมเครื่องส่งคลื่นสั้น',
      crisisDay: 4,
      crisisText: 'สายเคเบิลบนระเบียงหอวิทยุขาดและมีซอมบี้คลั่งเดินป้วนเปี้ยนอยู่ข้างล่าง',
    },
    {
      name: 'ริน',
      age: 26,
      role: 'เจ้าหน้าที่ถอดรหัสวิทยุทหาร',
      trait: 'เฝ้าฟังสัญญาณเตือนภัยจากนอกเมือง',
      crisisDay: 5,
      crisisText: 'ไข้ขึ้นสูงจากแผลถลอกและต้องการชุดเย็บแผลหรือยา',
    },
    {
      name: 'หมวดทศ',
      age: 37,
      role: 'ทหารสื่อสารหลงหน่วย',
      trait: 'คุ้มกันบันไดขึ้นหอส่งสัญญาณอย่างเข้มงวด',
      crisisDay: 6,
      crisisText: 'กำลังต้านฝูงซอมบี้ที่พยายามดันรั้วลวดหนามหน้าหอวิทยุ',
    },
  ],
  nest: [
    {
      name: 'ดร.ชลิต',
      age: 48,
      role: 'นักวิจัยเชื้อที่หลงอยู่ในอุโมงค์รถไฟ',
      trait: 'จดบันทึกการกลายพันธุ์ของรังใต้ดิน',
      crisisDay: 4,
      crisisText: 'ไฟฉายแบตหมดกลางอุโมงค์มืดสนิทขณะกำลังเก็บตัวอย่างเชื้อ',
    },
    {
      name: 'ก้อง',
      age: 32,
      role: 'คนงานขุดเจาะอุโมงค์ใต้ดิน',
      trait: 'ติดอยู่ในห้องควบคุมรางรถไฟเก่า',
      crisisDay: 5,
      crisisText: 'ขาดอาหารและถูกฝูงผู้ติดเชื้อใต้ดินดักอยู่หน้าประตูห้องควบคุมราง',
    },
  ],
};

export function createInitialZonePopulations(seed: number): Record<string, ZonePopulationState> {
  const pickRandomSubset = <T,>(arr: T[], count: number, offset: number): T[] => {
    const copy = [...arr];
    const out: T[] = [];
    let s = seed + offset;
    while (copy.length > 0 && out.length < count) {
      s = (s * 1664525 + 1013904223) % 4294967296;
      const idx = Math.abs(s) % copy.length;
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  };

  const makeZone = (
    placeId: string,
    placeName: string,
    totalPop: number,
    storyNpc?: { id: string; storyKey: string; name: string; age: number; role: string; trait: string },
    randomCount = 4
  ): ZonePopulationState => {
    const npcs: ZoneNpc[] = [];
    if (storyNpc) {
      npcs.push({
        id: storyNpc.id,
        storyNpcKey: storyNpc.storyKey,
        isStoryNpc: true,
        name: storyNpc.name,
        age: storyNpc.age,
        role: storyNpc.role,
        trait: storyNpc.trait,
        placeId,
        alive: true,
        met: false,
        trust: 0,
        lastNote: 'ยังไม่เคยเผชิญหน้าโดยตรง',
      });
    }
    const poolPlace = districts.find(d => d.id === placeId)?.parent || placeId;
    const pool = pickRandomSubset(RANDOM_SURVIVOR_POOL[poolPlace as keyof typeof RANDOM_SURVIVOR_POOL] || RANDOM_SURVIVOR_POOL.streets, randomCount, totalPop * 17);
    pool.forEach((p, idx) => {
      npcs.push({
        id: `npc-${placeId}-${idx}`,
        name: p.name,
        age: p.age,
        role: p.role,
        trait: p.trait,
        placeId,
        alive: true,
        met: false,
        trust: 0,
        lastNote: 'ยังระแวงผู้ติดเชื้อทุกตนในพื้นที่',
        crisisDay: p.crisisDay,
        crisisText: p.crisisText,
        crisisResolved: false,
      });
    });

    // ผสาน NPC จาก EXTERNAL_AI_NPCS เข้าไปในแต่ละเขตโดยอัตโนมัติ
    const externalPlaceId = placeId === 'radio' ? 'tower' : placeId;
    const externalNpcsForZone = EXTERNAL_AI_NPCS.filter(ext => ext.placeId === externalPlaceId);
    externalNpcsForZone.forEach((ext, extIdx) => {
      if (!npcs.some(existing => existing.name === ext.name)) {
        npcs.push({
          id: `npc-ext-${externalPlaceId}-${extIdx}`,
          name: ext.name,
          age: ext.age,
          role: ext.role,
          trait: ext.trait,
          placeId,
          alive: true,
          met: false,
          trust: 0,
          lastNote: 'ผู้รอดชีวิตในเขตกักกันที่คอยสังเกตท่าทีของเจ้า',
          crisisDay: ext.crisisDay,
          crisisText: ext.crisisText,
          crisisResolved: false,
        });
      }
    });

    const effectiveTotalPop = Math.max(totalPop, npcs.length);
    const unmetAnonymous = Math.max(0, effectiveTotalPop - npcs.length);
    const zone: ZonePopulationState = {
      placeId,
      placeName,
      initialTotalPopulation: effectiveTotalPop,
      unmetAnonymousSurvivors: unmetAnonymous,
      npcs,
    };
    materializeZoneResidents(zone, seed);
    return zone;
  };

  const radioZone = makeZone('radio', 'หอวิทยุสะพานพระราม 8', 10, undefined, 3);
  return {
    ...Object.fromEntries(districts.map((d, i) => [d.id, makeZone(d.id, d.name, 6 + i % 3, {
      id: d.id + '-coordinator', storyKey: d.id + '.coordinator',
      name: ['เอก', 'น้อย', 'พิม', 'ชัย', 'ละไม', 'ต้น', 'เมย์', 'บอย', 'ฝน', 'สมชาย'][i],
      age: BANGKOK_2026_BIOS[i].age,
      role: BANGKOK_2026_BIOS[i].occupation,
      trait: d.task,
    }, 2)])),
    hospital: makeZone(
      'hospital',
      'โรงพยาบาลเขตกักกันพญาไท–ราชวิถี',
      20,
      {
        id: 'story-nuan',
        storyKey: 'next.nuan',
        name: 'นวล',
        age: 33,
        role: 'พยาบาลเวรคลินิกโรงพยาบาลเขตกักกัน',
        trait: 'พยายามรักษาคนเจ็บที่เหลือและสังเกตผู้ติดเชื้อที่ไม่คลั่ง',
      },
      5
    ),
    streets: makeZone(
      'streets',
      'ถนนพระราม 4 – แยกอโศก',
      15,
      {
        id: 'story-mali',
        storyKey: 'remnant.mali',
        name: 'มาลี',
        age: 24,
        role: 'ผู้รอดชีวิตที่คุ้นชื่อบนป้ายของเจ้า',
        trait: 'ออกหาของตามแยกอโศกใต้ราง BTS และพยายามตามหาคนที่หายไป',
      },
      4
    ),
    shelter: makeZone(
      'shelter',
      'ห้องแถวเก่า ดินแดง–อนุสาวรีย์ฯ',
      12,
      {
        id: 'story-ing',
        storyKey: 'next.ing',
        name: 'อิง',
        age: 22,
        role: 'คนที่มาเคาะประตูเหล็กห้องแถวดินแดง',
        trait: 'กล้าเสี่ยงเข้ามาตรวจดูเสียงหลังประตูเหล็กดัด',
      },
      3
    ),
    tower: { ...radioZone, placeId: 'tower' },
    radio: radioZone,
    nest: makeZone('nest', 'อุโมงค์ MRT สามย่าน–คลองเตย', 5, undefined, 2),
  };
}

export function syncZonePopulationsWithEngineState(
  zones: Record<string, ZonePopulationState>,
  gameState: any
): Record<string, ZonePopulationState> {
  if (!gameState || !zones) return zones;
  const next = structuredClone(zones);
  if (districts.some(d => !next[d.id])) {
    const fresh = createInitialZonePopulations(gameState.initialSeed || 1);
    for (const d of districts) if (!next[d.id]) next[d.id] = fresh[d.id];
  }
  const flags = gameState.story?.flags || {};
  const engineNpcs = gameState.world?.npcs || {};

  for (const zone of Object.values(next)) {
    for (const npc of zone.npcs) {
      relationshipState(npc);
      // Older saves pre-marked the first generated survivor as met.
      if (npc.met && !npc.seen && !npc.relationship && npc.trust === 0 &&
          ['ยังระแวงผู้ติดเชื้อทุกตนในพื้นที่', 'ผู้รอดชีวิตในเขตกักกันที่คอยสังเกตท่าทีของเจ้า'].includes(npc.lastNote)) {
        npc.met = false;
      }
      const canonical=npc.storyNpcKey?engineNpcs[npc.storyNpcKey]:undefined;
      if(canonical) {
        npc.alive=canonical.alive!==false;
        npc.trust=canonical.trust;
        npc.relationship=canonical.relationship?structuredClone(canonical.relationship):undefined;
        if(canonical.state!=='unknown')npc.met=true;
        if(canonical.state==='hostile')npc.lastNote='ยังไม่ยอมให้เข้าใกล้';
        else npc.lastNote=relationshipTier(npc.trust).label+' · เคารพระยะที่ตกลงกัน';
      }
    }

    // ตรวจสอบให้เซฟเดิมได้รับ NPC ใหม่จาก EXTERNAL_AI_NPCS ครบทุกคนโดยไม่ต้องเริ่มเกมใหม่
    const normalizedPlaceId = (zone.placeId === ('radio' as any) ? 'tower' : zone.placeId) as
      | 'shelter'
      | 'streets'
      | 'hospital'
      | 'nest'
      | 'tower';
    const externalNpcsForZone = EXTERNAL_AI_NPCS.filter(ext => ext.placeId === normalizedPlaceId);
    externalNpcsForZone.forEach((ext, extIdx) => {
      if (!zone.npcs.some(n => n.name === ext.name)) {
        zone.npcs.push({
          id: `npc-ext-${normalizedPlaceId}-${extIdx}`,
          name: ext.name,
          age: ext.age,
          role: ext.role,
          trait: ext.trait,
          placeId: normalizedPlaceId,
          alive: true,
          met: false,
          trust: 0,
          lastNote: 'ผู้รอดชีวิตในเขตกักกันที่คอยสังเกตท่าทีของเจ้า',
          crisisDay: ext.crisisDay,
          crisisText: ext.crisisText,
          crisisResolved: false,
        });
        if (zone.unmetAnonymousSurvivors > 0) {
          zone.unmetAnonymousSurvivors = Math.max(0, zone.unmetAnonymousSurvivors - 1);
        } else {
          zone.initialTotalPopulation += 1;
        }
      }
    });
    materializeZoneResidents(zone, gameState.initialSeed || 1);
  }

  return next;
}

export function calculateZoneTrustStats(zone: ZonePopulationState | undefined): {
  livingCount: number;
  totalSumTrust: number;
  averageTrust: number;
  trustedPeopleCount: number;
} {
  if (!zone) {
    return { livingCount: 1, totalSumTrust: 0, averageTrust: 0, trustedPeopleCount: 0 };
  }
  const livingNamedNpcs = zone.npcs.filter(n => n.alive);
  const livingCount = livingNamedNpcs.length + Math.max(0, zone.unmetAnonymousSurvivors);
  if (livingCount <= 0) {
    return { livingCount: 0, totalSumTrust: 0, averageTrust: 0, trustedPeopleCount: 0 };
  }
  // Residents converted from anonymous population keep their own trust without diluting existing route thresholds.
  const communityContacts = livingNamedNpcs.filter(npc => !npc.localResident);
  const trustGroup = communityContacts.length ? communityContacts : livingNamedNpcs;
  const totalSumTrust = trustGroup.reduce(
    (acc, n) => acc + Math.max(0, Math.min(100, n.trust)),
    0
  );
  const averageTrust = trustGroup.length ? Math.round((totalSumTrust / trustGroup.length) * 10) / 10 : 0;
  const trustedPeopleCount = livingNamedNpcs.filter(n => n.trust >= 70).length;
  return {
    livingCount,
    totalSumTrust,
    averageTrust,
    trustedPeopleCount,
  };
}

/**
 * ข้อ 3: NPC มีชีวิตของตัวเอง — ถ้า NPC ในเขตนี้ไว้ใจเราสูง (>= 65) และเรากำลังหิวจัดหรือบาดเจ็บ
 * เขาจะเดินเอาของมาช่วยเราเองโดยอัตโนมัติ!
 */
export function getProactiveAllyNpcAidModal(
  zone: ZonePopulationState | undefined,
  gameState: any,
  triggeredIds: string[]
): LifeSimModalEvent | null {
  if (!zone || !gameState) return null;
  const day = gameState.day || 1;
  const hunger = gameState.stats?.hunger || 0;
  const hp = gameState.stats?.hp || 100;

  if (hunger < 55 && hp > 50) return null;

  const devotedAlly = zone.npcs.find(n => n.alive && n.trust >= 55);
  if (!devotedAlly) return null;

  const id = `ally-aid-${devotedAlly.id}-day-${day}`;
  if (triggeredIds.includes(id)) return null;
  if([1,2].some(offset=>triggeredIds.includes(`ally-aid-${devotedAlly.id}-day-${day-offset}`)))return null;

  return {
    id,
    title: `${devotedAlly.name} แอบนำความช่วยเหลือมาส่งให้เจ้า!`,
    text: `เพราะ ${devotedAlly.name} (${devotedAlly.role}) มีความไว้ใจต่อเจ้าถึง ${devotedAlly.trust}/100 เมื่อเขาเห็นว่าเจ้ากำลังเดินโซเซจากอาการบาดเจ็บและความหิวโหยใน${zone.placeName} เขาจึงแอบเคาะสัญญาณเรียกเจ้าเข้ามุมมืด แล้ววางถุงเลือดสำรองและผ้าพันแผลไว้ให้ด้วยตัวเอง!`,
    dayNote: 'ผู้รอดชีวิตที่ไว้ใจเจ้าเป็นฝ่ายเข้ามาช่วยเหลือ (ไม่เสียวัน)',
    targetNpcId: devotedAlly.id,
    placeId: zone.placeId,
    advanceDay: false,
    choices: [
      {
        text: `รับถุงเลือดพกพาและการปฐมพยาบาลจาก ${devotedAlly.name} ด้วยความซาบซึ้ง`,
        note: 'สภาพร่าง +16 · ความหิว -22 · ถุงเลือดพกพา +1 · ความเห็นใจ +5',
        enabled: true,
        outcomeText: `${devotedAlly.name} ช่วยทำแผลและมอบถุงเลือดสำรองให้เจ้าพกติดตัวไว้ นี่คือผลลัพธ์ของการที่เจ้าไม่ทำร้ายพวกเขา`,
        effects: {
          hp: 16,
          hunger: -22,
          carriedBloodBags: 1,
          humanity: 5,
          sanity: 5,
        },
      },
    ],
  };
}

/**
 * สร้างเหตุการณ์ป๊อปอัพแบบ Life Simulation เมื่อผู้เล่นเลือกมีปฏิสัมพันธ์กับผู้คนในพื้นที่
 * รวมทั้ง:
 * - วิกฤตของ NPC (ข้อ 3)
 * - ตัวเลือกพิเศษจากอาชีพก่อนตาย (ข้อ 4)
 * - ตัวเลือกพิเศษจากระยะการกลายพันธุ์ (ข้อ 1)
 * - อาการหิวจัดจ้องลำคอคนเป็น (hunger >= 75) และอาการสติพร่าเลือนพูดไม่รู้เรื่อง/ล็อกการกระทำซับซ้อน (sanity <= 35 / < 30)
 */
export function buildFreeformNpcInteractionModal(
  zone: ZonePopulationState, gameState: any, bio: CharacterBioDossier, specificNpcId?: string
): LifeSimModalEvent | null {
  const day=gameState.day||1, living=zone.npcs.filter(n=>n.alive);
  const target=specificNpcId?living.find(n=>n.id===specificNpcId):living.find(n=>!n.crisisResolved&&n.crisisDay&&day>=n.crisisDay)||living.find(n=>!n.met)||living[0];
  if(!target)return null;
  const name = target.met ? target.name : 'ผู้รอดชีวิตที่ยังไม่รู้จักชื่อ';
  const r=relationshipState(target),posture=npcPosture(target,day),tier=relationshipTier(target.trust);
  const crisis=Boolean(!target.crisisResolved&&target.crisisDay&&day>=target.crisisDay&&target.crisisText);
  const need=crisisNeed(target),tense=r.tensionUntil>day;
  const witnesses=npcEncounterWitnesses(zone,target.id);
  const supplies=gameState.items?.supplies||0,medicine=gameState.items?.medicine||0;
  const hungerVal=Number(gameState.stats?.hunger||0);
  const sanityVal=Number(gameState.stats?.sanity??100);
  const mutationVal=Number(gameState.stats?.mutation||0);
  const isStarving=hungerVal>=75;
  const isLowSanitySpeech=sanityVal<=35;
  const isCognitivelyLocked=sanityVal<30;
  const choices:LifeSimModalEvent['choices']=[];
  // Crisis help is distinct from trust, occupation work and routine gifts.
  if(crisis&&need==='rescue')choices.push({
    text:'ช่วยเปิดทางหนี โดยส่งสัญญาณให้เขารู้ก่อน',relationshipKind:'rescue',pressure:true,
    note:'สภาพร่าง -8 · ความหิว +8 · ความเป็นมนุษย์ +6 · ช่วยคน +1',enabled:true,
    outcomeText:'เจ้ารับแรงกระแทกไว้แล้วเปิดช่องให้อีกฝ่ายหนี เขาพ้นอันตรายเฉพาะหน้า แต่ยังถอยห่างเมื่อเจ้าหันกลับมา',
    effects:{hp:-8,hunger:8,humanity:6,targetNpcTrustDelta:14,resolveNpcCrisis:true,saveLife:true,bystanderTrustDelta:2},
  });
  const greetText = isLowSanitySpeech
    ? (posture.warning
        ? '"อึก... ถะ... ถอย..." — พยายามพูดแต่หลุดเป็นเสียงครางต่ำในลำคอ จึงได้แต่ยกมือที่สั่นเกร็งแล้วก้าวถอยหลัง'
        : '"อึก... ขะ... ไม่ทำร้าย..." — ถ้อยคำในหัวพร่าเลือนจนพูดเป็นประโยคไม่ได้ จึงผงกศีรษะจากระยะห่างแทน')
    : isStarving
    ? (posture.warning
        ? 'ข่มอาการขากรรไกรสั่นเกร็ง ยกมือให้เห็นแล้วรีบถอยห่างก่อนจะควบคุมสายตาที่จ้องลำคอเขาไม่ได้'
        : 'ฝืนกลืนน้ำลายข่มความอยากเลือด ส่งสัญญาณทักทายจากระยะไกลทั้งที่สายตายังเผลอมองเส้นเลือดที่คอของเขา')
    : (posture.warning ? 'หยุดตามคำเตือน ยกมือให้เห็นแล้วถอย' : 'ส่งสัญญาณทักทายจากระยะที่ตกลงกัน');
  const greetOutcome = isLowSanitySpeech
    ? 'เสียงครางกระท่อนกระแท่นของเจ้าทำให้เขาสะดุ้ง แต่เมื่อเห็นเจ้าพยายามผงกศีรษะและไม่ก้าวร้ำเส้น เขาจึงลดท่าทีระแวงลงเล็กน้อย'
    : (posture.warning
        ? 'เขามองตามจนเจ้าหยุดห่างออกไป แม้ยังไม่ยอมให้เข้าใกล้ แต่เห็นว่าเจ้าทำตามคำเตือนได้'
        : 'เขารับรู้สัญญาณของเจ้าแล้วคุยต่อจากอีกฝั่งของแนวกั้น');
  choices.push({text:greetText,
    relationshipKind:posture.warning?'respect':'information',note:'สติ +2 · ความหิว +2 · ไม่ใช้สิ่งของ',enabled:true,
    outcomeText:greetOutcome,
    effects:{sanity:2,hunger:2,targetNpcTrustDelta:posture.warning?4:2}});
  // Signature Item Choice: requires both trust AND sufficient sanity (sanity >= 30) to perform complex human work.
  const requiredTrust=/ทำแผล|พันแผล|ปฐมพยาบาล|ประคองผู้|ตรวจอาการ/.test(bio.specialChoiceLabel)?70:20;
  const workAllowed=target.trust>=requiredTrust&&!tense&&!isCognitivelyLocked;
  const workDisabledReason=isCognitivelyLocked
    ? 'สติต่ำเกินไป (ต้องมีสติอย่างน้อย 30) — สมองพร่าเลือนและมือสั่นเกร็งจนไม่อาจใช้อุปกรณ์หรือทำทักษะซับซ้อนของมนุษย์ได้'
    : tense
    ? 'เขายังไม่พร้อมเจรจา'
    : 'ต้องได้รับความยินยอมก่อน (ความไว้ใจ '+requiredTrust+')';
  choices.push({text:bio.specialChoiceLabel,relationshipKind:'work',
    note:'ความหิว +6 · สติ +2 · ทำเฉพาะจุดที่เขาอนุญาต',enabled:workAllowed,
    disabledReason:workDisabledReason,
    outcomeText:'เขาชี้จุดที่ยอมให้ช่วย เจ้าจึงใช้'+bio.signatureItemName+'ทำงานตามความคุ้นเคย โดยหยุดทันทีเมื่อเขาขอให้เว้นระยะ',
    effects:{hunger:6,sanity:2,targetNpcTrustDelta:Math.min(8,bio.specialChoiceEffect.npcTrustDelta||6)}});
  // Mutated senses provide information without conjuring blood bags from a conversation.
  if(getMutationStageInfo(mutationVal).unlocksDarkSenseChoice)choices.push({
    text:'ชี้ร่องรอยอันตรายจากเสียงและกลิ่น โดยไม่พาเขาเข้าใกล้',relationshipKind:'information',
    note:'ความหิว +4 · สติ +1 · ไม่ได้รับสิ่งของ',enabled:true,
    outcomeText:'เจ้าชี้จุดที่มีเสียงผิดปกติแล้วถอย เขารอดูด้วยตัวเองแทนที่จะเดินตามทันที',
    effects:{hunger:4,sanity:1,targetNpcTrustDelta:4}});
  const foodResolves=crisis&&need==='supplies',medResolves=crisis&&need==='medicine';
  choices.push({text:'วางอาหารกระป๋องไว้บนพื้น แล้วถอยให้เขามารับ',relationshipKind:'supplies',
    note:'ใช้เสบียงมนุษย์ 1 · ความหิว +4 · ความเป็นมนุษย์ +2'+(foodResolves?' · คลี่คลายวิกฤตขาดอาหาร':''),
    enabled:supplies>=1,disabledReason:'ต้องมีเสบียงมนุษย์ 1 ชิ้น',
    outcomeText:'เขารอจนเจ้าถอยพ้นระยะก่อนหยิบอาหารไปตรวจดู การรับของไม่ได้ทำให้เขายอมเปิดที่พักให้เจ้า'+(foodResolves?' แต่คนข้างในมีอาหารประทังชีวิตแล้ว':''),
    effects:{supplies:-1,hunger:4,humanity:2,targetNpcTrustDelta:6,resolveNpcCrisis:foodResolves,saveLife:foodResolves&&/อดอาหาร|อดอยาก/.test(target.crisisText||'')}});
  choices.push({text:'วางชุดเวชภัณฑ์ให้ โดยไม่พยายามแตะตัวเขา',relationshipKind:'medicine',
    note:'ใช้ชุดเย็บแผล 1 · ความหิว +4 · ความเป็นมนุษย์ +3'+(medResolves?' · คลี่คลายวิกฤตบาดเจ็บ':''),
    enabled:medicine>=1,disabledReason:'ต้องมีชุดเย็บแผล 1 ชิ้น',
    outcomeText:'เขาดึงกล่องเวชภัณฑ์ไปจากอีกฝั่งของที่กำบัง แล้วเรียกคนข้างในให้ช่วยดูแผล เจ้าหยุดรอห่าง ๆ ไม่ยื่นมือเข้าไป'+(medResolves?' อันตรายจากแผลได้รับการดูแลแล้ว แต่เขายังต้องพักฟื้น':''),
    effects:{medicine:-1,hunger:4,humanity:3,targetNpcTrustDelta:10,resolveNpcCrisis:medResolves,saveLife:medResolves&&/เลือดไหล|ติดเชื้อ|ไข้สูง/.test(target.crisisText||'')}});
  // Fair exchange remains a viable friendship route, using existing inventory only (locked when sanity < 30).
  if(target.trust>=45&&!tense&&/ค้า|ร้าน|เสบียง|ตลาด/.test(target.role))choices.push({
    text:'เสนอแลกเวชภัณฑ์ 1 ชุดกับเสบียง 2 ชิ้น ผ่านจุดวางของ',relationshipKind:'work',
    note:'ใช้ชุดเย็บแผล 1 · เสบียงมนุษย์ +2 · ความหิว +4',
    enabled:medicine>=1&&!isCognitivelyLocked,
    disabledReason:isCognitivelyLocked
      ? 'สติต่ำเกินไป (ต้องมีสติอย่างน้อย 30) — พูดสื่อสารไม่รู้เรื่องจนไม่อาจตกลงแลกเปลี่ยนสิ่งของได้'
      : 'ต้องมีชุดเย็บแผล 1 ชิ้น',
    outcomeText:'ต่างฝ่ายวางของแล้วผลัดกันถอย ไม่มีใครต้องยื่นมือเข้าไปหาอีกฝ่าย การแลกครั้งนี้จบตามที่ตกลง',
    effects:{medicine:-1,supplies:2,hunger:4,targetNpcTrustDelta:4}});
  choices.push({text:'เดินเข้าไปประชิดโดยไม่รอให้เขาอนุญาต',relationshipKind:'breach',
    note:'ฝืนขอบเขต · สภาพร่าง -'+(posture.armed?5:2)+' · สติ -1 · เขาจะไม่ให้เข้าใกล้ '+(tense?3:2)+' วัน',enabled:true,
    outcomeText:posture.armed?'เขาฟาดสกัดเมื่อเจ้าล้ำระยะที่เตือนไว้ แล้วถอยเข้าที่กำบังพร้อมปิดการเจรจา':'เขาผลักสกัดจนเจ้ากระแทกขอบทาง แล้วรีบหลบเข้าที่กำบังโดยไม่ยอมคุยต่อ',
    effects:{hp:posture.armed?-5:-2,sanity:-1,targetNpcTrustDelta:target.trust>=70?-8:-18,tensionDays:tense?3:2,bystanderTrustDelta:-4}});
  // Hunting remains optional. Eating does not directly reduce sanity; armed prey can hurt the attacker.
  choices.push({text:isStarving?'[สัญชาตญาณดิบพลุ่งพล่าน] กระโจนเข้าขย้ำลำคอที่เต้นตุบ ๆ เพื่อดื่มเลือดสด':'[ล่าเหยื่อ] กระโจนเข้าทำร้ายเพื่อกินเลือดเนื้อ',relationshipKind:'breach',
    note:'ฆ่าคน +1 · ความหิว -45 · ความเป็นมนุษย์ -18 · กลายพันธุ์ +6 · สภาพร่าง -'+(posture.armed?12:5)+' · คนที่เห็นจะหวาดกลัว',enabled:true,
    outcomeText:'อีกฝ่ายต่อสู้เพื่อเอาชีวิตรอดก่อนถูกเจ้าสังหาร ความหิวสงบลง แต่มีรอยแผลจากการต่อสู้และคนที่เห็นเหตุการณ์หลบหนี',
    effects:npcHuntEffects(posture.armed)});
  choices.push({text:'เดินจากไปโดยไม่เข้าใกล้และไม่รบกวน',relationshipKind:'information',
    note:'ความหิว +2 · ไม่เพิ่มหรือลดความไว้ใจ',enabled:true,outcomeText:'เจ้าถอยกลับสู่ทางเดิม อีกฝ่ายยังมองตาม แต่ไม่มีการเผชิญหน้าต่อ',effects:{hunger:2}});
  const rawZoneLoc =
    gameState?.world?.locations?.[zone.placeId] ||
    (zone.placeId === 'tower' ? gameState?.world?.locations?.radio : undefined);
  const zoneDangerVal = Math.min(100, Math.max(0, Math.round(Number(rawZoneLoc?.threat ?? 20))));
  const dangerTrustPenaltyPct = zoneDangerVal >= 85 ? 65 : zoneDangerVal >= 60 ? 50 : zoneDangerVal >= 35 ? 25 : 0;

  const hungerParagraph = isStarving
    ? '\n\n[ความหิวพุ่งสูง ' + Math.floor(hungerVal) + '/100] กลิ่นเลือดอุ่น ๆ ของคนเป็นทำให้สายตาของเจ้าเลื่อนไปจ้องเส้นเลือดใหญ่ที่เต้นตุบ ๆ ข้างลำคอของ ' + name + ' โดยไม่รู้ตัว เสียงหัวใจของเขาดังก้องในหูจนกลบเสียงพูด ขากรรไกรของเจ้าสั่นเกร็งจนอีกฝ่ายสังเกตเห็นและรีบก้าวถอยหลังขอให้เว้นระยะเพิ่ม'
    : '';
  const sanityParagraph = isLowSanitySpeech
    ? '\n\n[สติพร่าเลือน ' + Math.floor(sanityVal) + '/100] สมองของเจ้ามึนชาและสับสน ถ้อยคำภาษามนุษย์แตกสลายกลายเป็นเพียงเสียงครางต่ำในลำคอ ("อึก... ขะ...")' + (isCognitivelyLocked ? ' มือทั้งสองข้างสั่นเกร็งจนไม่อาจใช้อุปกรณ์ซับซ้อนหรือเจรจาต่อรองได้' : '')
    : '';
  const dangerParagraph =
    zoneDangerVal >= 85
      ? `\n\n[ภัยพื้นที่วิกฤต ${zoneDangerVal}/100 · เขตปิดล้อมสังหาร] ข่าวซอมบี้อาละวาดและเสียงปืนในย่านนี้ทำให้ ${name} ตื่นตระหนกสุดขีด มือกำอาวุธแน่นและระแวงทุกการขยับตัวของเจ้า (ความไว้ใจเพิ่มขึ้นยากสุดขีด -65%)`
      : zoneDangerVal >= 60
      ? `\n\n[ภัยพื้นที่สูง ${zoneDangerVal}/100 · เขตอันตรายสูง] ผู้คนในย่านนี้กำลังหวาดกลัวผู้ติดเชื้ออย่างหนัก ${name} จ้องมองเจ้าด้วยความระแวงและตั้งการ์ดสูงกว่าปกติ (ความไว้ใจเพิ่มขึ้นยากมาก -50%)`
      : zoneDangerVal >= 35
      ? `\n\n[ภัยพื้นที่ ${zoneDangerVal}/100 · เขตเฝ้าระวัง] ข่าวการปะทะในพื้นที่ทำให้ ${name} ระมัดระวังตัวมากขึ้น การเอาชนะใจต้องใช้ความอดทนกว่าเดิม (ความไว้ใจเพิ่มขึ้นยาก -25%)`
      : '';
  const mutationParagraph = mutationVal>=45
    ? (target.trust>=60
        ? '\n\nแม้ร่างของเจ้าจะมีร่องรอยกลายพันธุ์และดวงตาเปลี่ยนสี แต่เพราะความไว้ใจที่สั่งสมมา ' + name + ' จึงยังจำแววตาของเจ้าได้และไม่ยกอาวุธขึ้นขู่'
        : '\n\nเขาเหลือบมองร่องรอยกลายพันธุ์และดวงตาที่เปลี่ยนไปบนร่างของเจ้าด้วยความหวาดหวั่น ก่อนย้ำระยะที่ขอให้เจ้าหยุดอย่างเคร่งครัด')
    : '';
  return prepareNpcModal({id:'lifesim-npc-'+target.id+'-day-'+day,
    title:crisis?name+'ต้องการความช่วยเหลือ':'พบกับ'+name,
    text:'เจ้าพบ'+name+'ใน'+zone.placeName+'\n\n'+(target.localResident ? target.role+'คนนี้'+target.trait+'\n\n' : '')+posture.text+(crisis?'\n\n'+target.crisisText:'')+
      (witnesses.length?'\n\n'+witnesses.map(n=>n.name).join(' และ ')+'เฝ้ามองจากแนวกำบังใกล้ ๆ':'')+
      dangerParagraph+
      hungerParagraph+
      sanityParagraph+
      mutationParagraph,
    statusNote:(target.met ? name+' · '+target.role+' · อายุ '+target.age+' ปี\n'+tier.label+' · ความไว้ใจ '+target.trust+'/100' : posture.label)+(tense?' · ยังไม่พร้อมเจรจาถึงวันที่ '+r.tensionUntil:'')+(dangerTrustPenaltyPct>0?` · ภัยพื้นที่ ${zoneDangerVal}/100 (ความไว้ใจขึ้นยาก -${dangerTrustPenaltyPct}%)`:''),
    dayNote:'เลือกแล้วใช้เวลา 1 วัน',targetNpcId:target.id,witnessIds:witnesses.map(n=>n.id),placeId:zone.placeId,advanceDay:true,choices},gameState,zone);
}

/**
 * สร้างเหตุการณ์สุ่มแบบ Life Simulation เมื่อออกเดินสำรวจซอกมุมตามสัญชาตญาณ
 */
export function buildFreeformRoamModal(
  zone: ZonePopulationState,
  gameState: any,
  bio: CharacterBioDossier,
  triggeredEventIds: string[] = []
): LifeSimModalEvent {
  const mutationStage = getMutationStageInfo(gameState.stats?.mutation || 0);
  const currentDay = gameState.day || 1;

  // Check if any modular EXTERNAL_AI_ROAM_EVENTS match this zone & day (75% chance to pick from modular pack)
  const normalizedZoneId = (zone.placeId === ('radio' as any) ? 'tower' : zone.placeId) as
    | 'shelter'
    | 'streets'
    | 'hospital'
    | 'nest'
    | 'tower';

  const flags = gameState.story?.flags || {};
  const lateGameFollowUpIds = new Set([
    'roam-d45-flyer-crate',
    'roam-d60-dark-freezer',
    'roam-d75-sunken-boat',
    'roam-d90-abandoned-bus',
  ]);

  const matchingExternalRoam = EXTERNAL_AI_ROAM_EVENTS.filter(ev => {
    const evPlace = ev.placeId === 'radio' ? 'tower' : ev.placeId;
    const condPlaces = (ev.conditions?.places || []).map(p => (p === 'radio' ? 'tower' : p));
    const placeMatch =
      evPlace === 'any' ||
      ev.placeId === zone.placeId ||
      evPlace === normalizedZoneId ||
      condPlaces.includes(zone.placeId as any) ||
      condPlaces.includes(normalizedZoneId) ||
      (!evPlace && condPlaces.length === 0);
    const minDayOk = !ev.conditions?.minDay || currentDay >= ev.conditions.minDay;
    const maxDayOk = !ev.conditions?.maxDay || currentDay <= ev.conditions.maxDay;
    const researchOk = (gameState.stats?.research || 0) >= (ev.conditions?.minResearch || 0);
    const reqFlagOk = !ev.conditions?.requiredFlag || Boolean(flags[ev.conditions.requiredFlag]);
    const forbidFlagOk = !ev.conditions?.forbiddenFlag || !flags[ev.conditions.forbiddenFlag];
    const repeatOk =
      (!ev.conditions?.oncePerRun && !lateGameFollowUpIds.has(ev.id)) ||
      !triggeredEventIds.includes(ev.id);

    // Cooldown check (persistent in gameState.roamCooldowns)
    const cooldownOk = !gameState.roamCooldowns?.[ev.id] || currentDay >= gameState.roamCooldowns[ev.id];

    // Asok wreck pile check (exhausted when all 3 parts have been searched)
    if (ev.id === 'roam-streets-wreck-pile') {
      const depletedParts = Array.isArray(gameState.asokWreckDepletedParts) ? gameState.asokWreckDepletedParts : [];
      if (depletedParts.length >= 3) return false;
    }

    return placeMatch && minDayOk && maxDayOk && researchOk && reqFlagOk && forbidFlagOk && repeatOk && cooldownOk;
  });

  const matchingLateFollowUp = matchingExternalRoam.find(ev => lateGameFollowUpIds.has(ev.id));

  if (matchingLateFollowUp || (matchingExternalRoam.length > 0 && Math.random() < 0.75)) {
    const picked =
      matchingLateFollowUp ||
      matchingExternalRoam[Math.floor(Math.random() * matchingExternalRoam.length)];
    const hasSupplies = (gameState.items?.supplies || 0) >= 1;
    const hasMedicine = (gameState.items?.medicine || 0) >= 1;
    const hasSamples = (gameState.items?.samples || 0) >= 1;
    const hasBlood = (gameState.items?.carriedBloodBags || 0) >= 1;
    const hungerVal = Number(gameState.stats?.hunger || 0);
    const depletedWreckParts: string[] = Array.isArray(gameState.asokWreckDepletedParts) ? gameState.asokWreckDepletedParts : [];

    // Deterministic RNG roll for Event 21 (50% success)
    let isFlotsamSuccess = true;
    if (picked.id === 'roam-bkk-pier-flotsam-drift') {
      const seedVal = ((gameState.initialSeed || 1) ^ (currentDay * 2654435761) ^ 0x5a5a) >>> 0;
      isFlotsamSuccess = (seedVal % 100) < 50;
    }

    // Deterministic RNG roll for roam-d75-sunken-boat (50% success)
    let isSunkenBoatSuccess = true;
    if (picked.id === 'roam-d75-sunken-boat') {
      const seedVal = ((gameState.initialSeed || 1) ^ (currentDay * 2654435761) ^ 0x7575) >>> 0;
      isSunkenBoatSuccess = (seedVal % 100) < 50;
    }

    const isLateFollowUp = lateGameFollowUpIds.has(picked.id);

    return {
      id: picked.conditions?.oncePerRun
        ? picked.id
        : `${picked.id}-${currentDay}-${(gameState.initialSeed || 0) % 10000}`,
      contentId: picked.id,
      allowRepeatUntilDepleted: isLateFollowUp,
      cooldownDays: picked.conditions?.cooldownDays,
      title: picked.title,
      text: picked.text,
      dayNote: picked.dayNote,
      placeId: normalizedZoneId,
      advanceDay: picked.advanceDay !== false,
      choices: picked.choices.map((c, idx) => {
        const req = c.choiceRequirements;
        let enabled = true;
        let disabledReason: string | undefined;
        let note = c.note;
        let effects = { ...c.effects };
        let outcomeText = c.outcomeText;

        if (req?.minMutationStage && mutationStage.stageNumber < req.minMutationStage) {
          enabled = false;
          disabledReason = `ต้องอยู่ในระยะกลายพันธุ์ที่ ${req.minMutationStage} ขึ้นไป`;
        } else if (req?.requiresSupplies && !hasSupplies) {
          enabled = false;
          disabledReason = 'ต้องมีเสบียงมนุษย์ในกระเป๋า';
        } else if (req?.requiresMedicine && !hasMedicine) {
          enabled = false;
          disabledReason = 'ต้องมีชุดเย็บแผลในกระเป๋า';
        } else if (req?.requiresSamples && !hasSamples) {
          enabled = false;
          disabledReason = 'ต้องมีตัวอย่างเชื้อในกระเป๋า';
        } else if (req?.requiresCarriedBloodBags && !hasBlood) {
          enabled = false;
          disabledReason = 'ต้องมีถุงเลือดพกพาในกระเป๋า';
        }

        // Special handling for Event 21 (Flotsam drift deterministic RNG)
        if (picked.id === 'roam-bkk-pier-flotsam-drift' && idx === 0) {
          if (isFlotsamSuccess) {
            effects = { supplies: 1, hunger: 1 };
            outcomeText = 'เจ้าใช้ท่อนไม้ลากขวดขึ้นมาบนโป๊ะ ตรวจดูที่คอขวดพบรอยซีลพลาสติกเดิมจากโรงงานยังไม่ขาด น้ำด้านในยังสะอาด จึงเช็ดโคลนออกแล้วเก็บใส่ย่าม';
          } else {
            effects = { hunger: 1 };
            outcomeText = 'เจ้าลากขวดขึ้นมาดู พบว่าก้นขวดแตกเป็นรูและมีน้ำคลองดำซึมเข้าไปจนเต็ม เจ้าโยนขวดทิ้งลงน้ำตามเดิม เสียแรงเปล่า';
          }
        }

        // Special handling for roam-d45-flyer-crate
        if (picked.id === 'roam-d45-flyer-crate') {
          if (idx === 0 && Boolean(flags['crisis_d45_read_map'])) {
            outcomeText = `${outcomeText} เนื่องจากเจ้าเคยอ่านใบปลิวประกาศมาก่อน เจ้าจึงเข้าใจสัญลักษณ์ย่อทางการทหารบนแผนที่ได้ทันทีโดยไม่ต้องเสียเวลาตีความ`;
          } else if (idx === 1 && hungerVal >= 80) {
            note = 'เสบียงมนุษย์ +1 · คำเตือน: "อาหารมนุษย์ไม่อาจลดความหิวของเจ้าได้"';
          }
        }

        // Special handling for roam-d60-dark-freezer
        if (picked.id === 'roam-d60-dark-freezer' && idx === 0) {
          if (hungerVal >= 80) {
            note = 'ดื่มเลือดทันทีเพื่อดับความคลุ้มคลั่ง (ความหิว -25) · สติ -2 (กลิ่นเน่าเสียรบกวนจิตใจ)';
            effects = { hunger: -25, sanity: -2, setFlag: 'roam_late_depleted_d60' };
            outcomeText =
              'ความหิวที่พุ่งสูงทำให้เจ้าฉีกถุงเลือดที่ยังเย็นอยู่ดื่มรวดเดียวตรงนั้นเพื่อดับความคลุ้มคลั่ง กลิ่นคาวเลือดช่วยปลอบประโลมสัญชาตญาณความหิวกระหายในอก แม้สภาพแวดล้อมจะเต็มไปด้วยความเน่าเปื่อย';
          } else {
            effects = { carriedBloodBags: 1, sanity: -2, setFlag: 'roam_late_depleted_d60' };
          }
        }

        // Special handling for roam-d75-sunken-boat
        if (picked.id === 'roam-d75-sunken-boat') {
          const clearedChain = Boolean(flags['crisis_d75_cleared_chain']);
          if (idx === 0) {
            const hpCost = clearedChain ? 0 : -3;
            note = clearedChain
              ? 'เรือไม่ติดโซ่แน่น (ไม่เสีย HP) · ได้รับสิ่งของปิดผนึก'
              : 'ใช้พลังกาย (HP -3 จากน้ำเน่ากัดเนื้อเยื่อ) · ได้รับสิ่งของปิดผนึก';
            if (isSunkenBoatSuccess) {
              effects = {
                ...(hpCost ? { hp: hpCost } : {}),
                supplies: 1,
                medicine: 1,
                setFlag: 'roam_late_depleted_d75',
              };
              outcomeText =
                'ฝาถังถูกหมุนเปิดออก ภายในมีถุงซิปล็อกบรรจุข้าวสารแห้งและผ้าพันแผลสะอาดที่รอดพ้นจากน้ำคลองอย่างปาฏิหาริย์' +
                (clearedChain ? ' เนื่องจากปลดโซ่ไว้แล้ว เรือจึงไม่ติดโซ่แน่นและดึงของออกมาได้โดยไม่เสีย HP' : '');
            } else {
              effects = {
                ...(hpCost ? { hp: hpCost } : {}),
                hunger: 1,
                setFlag: 'roam_late_depleted_d75',
              };
              outcomeText =
                'ฝาถังแตกออก น้ำคลองสีดำไหลทะลัก สิ่งของข้างในกลายเป็นโคลนเน่าเหม็น เจ้าต้องทิ้งมันลงน้ำตามเดิม';
            }
          } else if (idx === 1) {
            const hpCost = clearedChain ? 0 : -2;
            note = clearedChain
              ? 'เรือไม่ติดโซ่แน่น (ไม่เสีย HP) · สติ +2 · ได้รับเครื่องมืองัดแงะ'
              : 'ใช้พลังกาย (HP -2) · สติ +2 · ได้รับเครื่องมืองัดแงะ';
            effects = {
              ...(hpCost ? { hp: hpCost } : {}),
              sanity: 2,
              setFlag: 'roam_late_depleted_d75',
            };
            if (clearedChain) {
              outcomeText = `${outcomeText} เพราะปลดโซ่คลองไว้ก่อนแล้ว เจ้าจึงงัดชะแลงออกมาได้โดยไม่เสีย HP`;
            }
          }
        }

        // Special handling for roam-d90-abandoned-bus
        if (picked.id === 'roam-d90-abandoned-bus' && idx === 1) {
          const isBusdriver = bio?.occupationId === 'busdriver';
          if (isBusdriver) {
            note = '[อดีตคนขับรถเมล์] สติ +6 · ความเป็นมนุษย์ +3 · ระลึกถึงเส้นทางเดินรถสายเก่าที่เคยขับ';
            effects = { sanity: 6, humanity: 3, setFlag: 'roam_late_depleted_d90' };
            outcomeText = `${outcomeText} ภาพพวงมาลัยและสมุดบันทึกการเดินรถปลุกความทรงจำสมัยที่เจ้าเคยขับรถเมล์รับส่งผู้โดยสารผ่านอนุสาวรีย์ชัยฯ ให้หวนคืนมาอย่างชัดเจน`;
          }
        }

        // Special handling for Event 23 (Wreck pile parts depletion)
        if (c.partKey && depletedWreckParts.includes(c.partKey)) {
          enabled = false;
          disabledReason = 'ส่วนนี้ถูกค้นหมดแล้วในชีวิตนี้';
          note = 'ส่วนนี้ถูกค้นหมดแล้วในชีวิตนี้';
        }

        return {
          partKey: c.partKey,
          text: c.text,
          note,
          enabled,
          disabledReason,
          outcomeText,
          effects,
        };
      }),
    };
  }

  const weatherAndHazard = getDailyWeatherAndZoneHazard(gameState, zone.placeId);
  const highThreatTacticalChoice: LifeSimModalEvent['choices'] =
    weatherAndHazard.localThreat >= 60
      ? [
          {
            text:
              weatherAndHazard.localThreat >= 85
                ? `[ยุทธวิธีเขตปิดล้อม · ภัย ${weatherAndHazard.localThreat}/100] ลอบตัดสายไฟสปอตไลท์ด่านตรวจและล่อหน่วยซุ่มยิงไปทางอื่น`
                : `[ยุทธวิธีเขตอันตรายสูง · ภัย ${weatherAndHazard.localThreat}/100] ลอบปลดลวดหนามพลุสัญญาณและลบคราบเลือดอำพรางร่องรอย`,
            note:
              weatherAndHazard.isStealthWeather
                ? `[พรางตัวด้วย${weatherAndHazard.weatherTitle}] ไม่เสีย HP · ภัยพื้นที่ลดลง -18 · เสบียงมนุษย์ +1 · สติ +4`
                : `เสี่ยงกระสุนถาก (HP -4) · ภัยพื้นที่ลดลง -15 · ชุดเย็บแผล +1 · งานวิจัย +5`,
            enabled: true,
            outcomeText: weatherAndHazard.isStealthWeather
              ? `อาศัย${weatherAndHazard.weatherTitle}ช่วยพรางตัว เจ้าลอบเข้าไปปลดชนวนพลุสัญญาณและคว้าเสบียงของเวรยามออกมาได้โดยไม่มีใครสังเกตเห็น ด่านตรวจลดระดับความระแวงในพื้นที่ลงมาก`
              : `เจ้าฝ่าแนวเลเซอร์ของหน่วยซุ่มยิงเข้าไปตัดสายพลุสัญญาณและฉวยกล่องปฐมพยาบาลภาคสนามออกมา แม้กระสุนจะถากไหล่ไปเล็กน้อย แต่พื้นที่นี้ก็ปลอดภัยขึ้นมาก`,
            effects: weatherAndHazard.isStealthWeather
              ? {
                  threatDelta: -18,
                  supplies: 1,
                  sanity: 4,
                  hunger: 6,
                }
              : {
                  hp: -4,
                  threatDelta: -15,
                  medicine: 1,
                  research: 5,
                  hunger: 6,
                },
          },
        ]
      : weatherAndHazard.localThreat >= 35
      ? [
          {
            text: `[ลดภัยคุกคามพื้นที่ ${weatherAndHazard.localThreat}/100] คอยหลบมุมมืดและจัดฉากให้เวรยามเข้าใจว่าพื้นที่นี้ปลอดผู้ติดเชื้อ`,
            note: 'ภัยพื้นที่ลดลง -12 · สติ +4 · ความหิว +5',
            enabled: true,
            outcomeText:
              'เจ้าเคลื่อนไหวอย่างเงียบเชียบและลบร่องรอยการคุ้ยหาของ ทำให้หน่วยลาดตระเวนถอนกำลังบางส่วนออกจากย่านนี้',
            effects: {
              threatDelta: -12,
              sanity: 4,
              hunger: 5,
            },
          },
        ]
      : [];

  const roll = Math.floor(Math.random() * 3);

  if (roll === 0) {
    return {
      id: `lifesim-roam-cooler-${Date.now()}`,
      title: `พบกระเป๋าเก็บความเย็นฉุกเฉินที่ถูกทิ้งไว้ใน${zone.placeName}`,
      text: `ระหว่างเดินสำรวจซอกมุมมืดใน${zone.placeName} เจ้าพบกล่องเก็บความเย็นของหน่วยแพทย์เคลื่อนที่ตกอยู่ข้างซากรถ ข้างในยังมีถุงเลือดสำรองที่ยังไม่เสียสภาพ 1 ถุง และหลอดตัวอย่างเชื้อที่ติดฉลากจางๆ (${weatherAndHazard.weatherTitle} · ${weatherAndHazard.threatTierTitle} ${weatherAndHazard.localThreat}/100)`,
      dayNote: `เหตุการณ์สำรวจอิสระ 1 วัน · ${weatherAndHazard.weatherTitle}`,
      placeId: normalizedZoneId,
      advanceDay: true,
      choices: [
        {
          text: 'เก็บถุงเลือดใส่กระเป๋าติดตัวไว้เผื่อยามหิวจัด',
          note: 'ถุงเลือดพกพา +1 (แสดงในกระเป๋า) · ความหิว +6',
          enabled: true,
          outcomeText: 'เจ้าเก็บถุงเลือดสำรองใส่กระเป๋าพกติดตัวไว้ สามารถหยิบขึ้นมาดื่มลดความหิวได้ทุกเมื่อ',
          effects: {
            carriedBloodBags: 1,
            hunger: 6,
            sanity: 2,
          },
        },
        {
          text: 'ฉีกถุงเลือดดื่มตรงนั้นทันทีและเก็บหลอดตัวอย่างเชื้อมาศึกษาร่างกาย',
          note: 'ความหิว -24 · ตัวอย่างเชื้อ +1 · การกลายพันธุ์ +4',
          enabled: true,
          outcomeText: 'เลือดเย็นเฉียบช่วยกดความหิวในกระเพาะลงได้มาก พร้อมกับเก็บหลอดตัวอย่างเชื้อใส่กระเป๋า',
          effects: {
            hunger: -24,
            samples: 1,
            mutation: 4,
          },
        },
        {
          text: `[ใช้ "${bio.signatureItemName}"] ตรวจเช็กซอกรถพยาบาลรอบๆ อย่างละเอียดตามความคุ้นเคยก่อนตาย`,
          note: 'ถุงเลือดพกพา +1 · ชุดเย็บแผล +1 · งานวิจัย +6 · ความหิว +6',
          enabled: true,
          outcomeText: `ความคุ้นเคยจากอดีต (${bio.occupation}) ทำให้เจ้าค้นพบช่องลับที่ซ่อนชุดเย็บแผลและถุงเลือดพกพาเพิ่มอีกชุด`,
          effects: {
            carriedBloodBags: 1,
            medicine: 1,
            research: 6,
            hunger: 6,
          },
        },
        ...highThreatTacticalChoice,
      ],
    };
  }

  if (roll === 1) {
    return {
      id: `lifesim-roam-feral-${Date.now()}`,
      title: `ฝูงผู้ติดเชื้อไร้สติกำลังเดินผ่าน${zone.placeName}`,
      text: `กลุ่มซอมบี้ที่สูญเสียสติไปแล้วเกือบสิบตนกำลังเดินลากขาผ่านตรอกแคบๆ ใน${zone.placeName} พวกมันส่งเสียงคลื่นความถี่ต่ำในลำคอและเริ่มหันมาดมกลิ่นของเจ้าที่ยังมีสติแตกต่างจากพวกมัน (${weatherAndHazard.weatherTitle} · ${weatherAndHazard.threatTierTitle} ${weatherAndHazard.localThreat}/100)`,
      dayNote: `เหตุการณ์สำรวจอิสระ 1 วัน · ${weatherAndHazard.weatherTitle}`,
      placeId: normalizedZoneId,
      advanceDay: true,
      choices: [
        {
          text: 'ส่งเสียงคำรามความถี่ต่ำเลียนแบบจ่าฝูงเพื่อสั่งให้พวกมันเปิดทาง',
          note: 'อำนาจฝูง +12 · การกลายพันธุ์ +6 · ความหิว +8',
          enabled: true,
          outcomeText: 'ซอมบี้รอบข้างชะงักและก้มหัวถอยห่างตามสัญชาตญาณฝูง เจ้าสัมผัสได้ถึงอำนาจที่ควบคุมพวกมันได้มากขึ้น',
          effects: {
            horde: 12,
            mutation: 6,
            hunger: 8,
          },
        },
        {
          text: 'หลบขึ้นที่สูงเพื่อสังเกตพฤติกรรมและการเคลื่อนที่ของเชื้อในร่างพวกมัน',
          note: 'งานวิจัย +10 · สติ +4 · ความหิว +8',
          enabled: true,
          outcomeText: 'เจ้าเฝ้าสังเกตการตอบสนองต่อแสงและเสียงของฝูงซอมบี้ ทำให้เข้าใจธรรมชาติของเชื้อในตัวเองลึกซึ้งขึ้น',
          effects: {
            research: 10,
            sanity: 4,
            hunger: 8,
          },
        },
        ...(mutationStage.unlocksApexHordeChoice
          ? [
              {
                text: `[คลื่นจ่าฝูง ระยะที่ ${mutationStage.stageNumber}] ปล่อยคลื่นความถี่สูงสะกดฝูงซอมบี้ให้คอยคุ้มกันเขตนี้`,
                note: 'อำนาจฝูง +18 · ภัยพื้นที่ลดลง -8 · สติ +5',
                enabled: true,
                outcomeText: 'ฝูงซอมบี้ไร้สติยอมรับคำสั่งจากร่างกลายพันธุ์ของเจ้าและถอยไปเฝ้ารอบนอกอย่างสงบ',
                effects: {
                  horde: 18,
                  sanity: 5,
                  threatDelta: -8,
                  hunger: 6,
                },
              },
            ]
          : []),
        ...highThreatTacticalChoice,
      ],
    };
  }

  return {
    id: `lifesim-roam-cache-${Date.now()}`,
    title: `ร่องรอยที่พักชั่วคราวของผู้รอดชีวิตใน${zone.placeName}`,
    text: `เจ้าพบห้องเก็บของเล็กๆ ที่เพิ่งถูกทิ้งร้างไปไม่นาน บนโต๊ะมีกล่องปฐมพยาบาลที่เปิดค้างไว้และอาหารกระป๋องของมนุษย์วางอยู่ข้างบันทึกที่เขียนค้างไว้ถึงความโกลาหลในวันที่ 15 ตุลาคม (${weatherAndHazard.weatherTitle} · ${weatherAndHazard.threatTierTitle} ${weatherAndHazard.localThreat}/100)`,
    dayNote: `เหตุการณ์สำรวจอิสระ 1 วัน · ${weatherAndHazard.weatherTitle}`,
    placeId: zone.placeId,
    advanceDay: true,
    choices: [
      {
        text: 'รวบรวมชุดเย็บแผลและเสบียงมนุษย์ใส่กระเป๋าสะพายติดตัว',
        note:
          weatherAndHazard.localThreat >= 60
            ? 'ชุดเย็บแผล +1 · เสบียงมนุษย์ +2 (โบนัสค้นเขตอันตรายสูง) · ความหิว +8'
            : 'ชุดเย็บแผล +1 · เสบียงมนุษย์ +1 · ความหิว +8',
        enabled: true,
        outcomeText:
          weatherAndHazard.localThreat >= 60
            ? 'เนื่องจากพื้นที่นี้มีด่านตรวจเข้มงวด เสบียงที่ถูกทิ้งไว้จึงมีมากกว่าปกติ เจ้าเก็บทั้งชุดเย็บแผลและเสบียงมนุษย์สองชุดใส่กระเป๋า'
            : 'เจ้าเก็บชุดเย็บแผลและอาหารกระป๋องของคนเป็นใส่กระเป๋า เผื่อใช้ดูแลร่างหรือนำไปแลกความไว้ใจกับผู้รอดชีวิต',
        effects: {
          medicine: 1,
          supplies: weatherAndHazard.localThreat >= 60 ? 2 : 1,
          hunger: 8,
        },
      },
      {
        text: 'นั่งอ่านบันทึกที่ถูกทิ้งไว้เพื่อทบทวนความทรงจำและประคองสติของตัวเอง',
        note: 'สติ +10 · ความเป็นมนุษย์ +6 · งานวิจัย +5 · ความหิว +6',
        enabled: true,
        outcomeText: 'ตัวอักษรของคนเป็นช่วยให้เสียงเพรียกของความหิวในหัวเบาบางลง สติสัมปชัญญะของเจ้ากลับมาแจ่มชัดอีกครั้ง',
        effects: {
          sanity: 10,
          humanity: 6,
          research: 5,
          hunger: 6,
        },
      },
      ...highThreatTacticalChoice,
    ],
  };
}

export interface DangerHumanAttackScenario {
  id: string;
  stageLevel: number;
  title: string;
  description: string;
  hpLoss: number;
  sanityLoss: number;
}

export const DANGER_HUMAN_ATTACK_SCENARIOS: DangerHumanAttackScenario[] = [
  {
    id: 'danger-attack-01-boiling-water',
    stageLevel: 1,
    title: 'คนหลบภัยหลังเหล็กดัดสาดน้ำร้อนและเขวี้ยงกระป๋องอาหารเก่าใส่',
    description:
      'มือที่สั่นเทาหลังหน้าต่างเหล็กดัดชั้นล่างสาดน้ำต้มเดือดและเขวี้ยงกระป๋องสังกะสีใส่เจ้าพร้อมเสียงกรีดร้องไล่ให้พ้นหน้าบ้าน',
    hpLoss: 2,
    sanityLoss: 0,
  },
  {
    id: 'danger-attack-02-bottles',
    stageLevel: 2,
    title: 'ชาวบ้านบนตึกแถวตกใจขว้างขวดแก้วและอิฐตัวหนอนใส่',
    description:
      'เสียงตะโกนโหวกเหวกดังมาจากระเบียงชั้นสอง "เฮ้ย! ซอมบี้เดินมาทางนี้!" ก่อนที่ขวดแก้วและก้อนอิฐตัวหนอนจะถูกขว้างลงมากระแทกไหล่และศีรษะของเจ้าด้วยความตื่นกลัว',
    hpLoss: 3,
    sanityLoss: 0,
  },
  {
    id: 'danger-attack-03-moto-chain',
    stageLevel: 3,
    title: 'คนขี่มอเตอร์ไซค์เร่งเครื่องเฉี่ยวชนแล้วเหวี่ยงโซ่ล็อกล้อฟาดใส่',
    description:
      'ผู้รอดชีวิตบนรถมอเตอร์ไซค์ดัดแปลงตกใจสุดขีดเมื่อเห็นเจ้าเดินพ้นหัวมุมตึก เขาบิดคันเร่งพุ่งเฉี่ยวสีข้างแล้วเหวี่ยงโซ่เหล็กเส้นหนาฟาดใส่ก่อนซิ่งหนีสุดชีวิต',
    hpLoss: 4,
    sanityLoss: 0,
  },
  {
    id: 'danger-attack-04-pipe',
    stageLevel: 4,
    title: 'กลุ่มคนหาของใช้ท่อเหล็กแป๊บน้ำและไม้หน้าสามดักฟาดสกัด',
    description:
      'คนหาของที่ซ่อนตัวหลังซากรถเข้าใจผิดคิดว่าเจ้ากำลังจะพุ่งเข้าขย้ำ พวกเขาจึงกระโจนออกมาใช้ท่อเหล็กแป๊บน้ำและไม้หน้าสามฟาดสกัดเข้าที่สีข้างอย่างแรงก่อนรีบวิ่งหนีเข้าตรอก',
    hpLoss: 5,
    sanityLoss: 0,
  },
  {
    id: 'danger-attack-05-car-battery-shock',
    stageLevel: 5,
    title: 'คนเฝ้าซอยปล่อยกระแสไฟจากแบตเตอรี่รถยนต์ช็อตสกัดที่รั้วสังกะสี',
    description:
      'ทันทีที่มือของเจ้าแตะแผงกั้นสังกะสีในตรอกแคบ คนเฝ้ายามหลังแนวกระสอบทรายก็สับคัตเอาต์พ่วงแบตเตอรี่รถยนต์ กระแสไฟแล่นแปลบเผาเนื้อเยื่อจนเจ้ากระเด็นถอยหลัง',
    hpLoss: 6,
    sanityLoss: 0,
  },
  {
    id: 'danger-attack-06-buckshot',
    stageLevel: 6,
    title: 'เวรยามอาสาสมัครยิงหนังสติ๊กลูกเหล็กและปืนลูกซองไทยประดิษฐ์ถากลำตัว',
    description:
      'อาสาสมัครเฝ้าซอยที่กำลังขวัญผวาเห็นเงาร่างของผู้ติดเชื้อในระยะประชิด จึงยิงลูกเหล็กและลั่นไกปืนลูกซองไทยประดิษฐ์ใส่ทันที สะเก็ดลูกปรายถากแขนและแผ่นหลังจนเนื้อเยื่อฉีกขาด',
    hpLoss: 7,
    sanityLoss: 1,
  },
  {
    id: 'danger-attack-07-molotov',
    stageLevel: 7,
    title: 'ผู้รอดชีวิตบนดาดฟ้าปาระเบิดขวดน้ำมันก๊าดลงมาสกัดกั้นทางเดิน',
    description:
      'ขวดแก้วติดไฟถูกเขวี้ยงลงมาจากดาดฟ้าตึกแถว แตกกระจายเป็นเปลวเพลิงลุกท่วมพื้นถนนและลวกผิวหนังของเจ้าอย่างรุนแรงท่ามกลางเสียงตะโกนสาปแช่งผู้ติดเชื้อ',
    hpLoss: 8,
    sanityLoss: 1,
  },
  {
    id: 'danger-attack-08-wire-snare',
    stageLevel: 8,
    title: 'กับดักลวดสลิงและไม้แหลมหน้าด่านชุมชนดีดรัดข้อเท้าจนเนื้อฉีก',
    description:
      'ฝีเท้าของเจ้าไปสะดุดเส้นเอ็นพรางตาหน้าแนวรั้วชุมชน ลวดสลิงเหล็กดีดตัวรัดข้อเท้าอย่างแรงพร้อมแผงไม้เสียบที่พุ่งกระแทกหน้าแข้ง ก่อนที่เสียงระฆังเตือนภัยจะดังลั่น',
    hpLoss: 9,
    sanityLoss: 1,
  },
  {
    id: 'danger-attack-09-mob',
    stageLevel: 9,
    title: 'กลุ่มผู้รอดชีวิตคลุ้มคลั่งถือมีดพร้าและชะแลงเหล็กดักต้อนรุมตี',
    description:
      'ความหวาดกลัวซอมบี้ในย่านนี้พุ่งสูงจนผู้คนคลุ้มคลั่ง กลุ่มชายฉกรรจ์พร้อมชะแลงเหล็กและมีดพร้าดักต้อนเจ้าเข้ามุมตึกแล้วระดมฟาดใส่ไม่ยั้งด้วยความโกรธแค้น จนเจ้าต้องฝืนรับคมเหล็กเพื่อกระโจนหนีออกมา',
    hpLoss: 10,
    sanityLoss: 1,
  },
  {
    id: 'danger-attack-10-crossbow',
    stageLevel: 10,
    title: 'พลซุ่มยิงประจำหอคอยชุมชนยิงหน้าไม้เหล็กดัดแปลงปักทะลุหัวไหล่',
    description:
      'เสียงสายสลิงดีดดังฉับจากหอสังเกตการณ์ชั้นบน ลูกดอกเหล็กเหลาแหลมพุ่งแหวกอากาศปักทะลุหัวไหล่ของเจ้าเต็มแรงจนร่างเซถลาชนกำแพง',
    hpLoss: 12,
    sanityLoss: 1,
  },
  {
    id: 'danger-attack-11-rifle',
    stageLevel: 11,
    title: 'ชุดลาดตระเวนเขตกักกันยิงพลุไฟและระดมยิงปืนไรเฟิลใส่เต็มแรง',
    description:
      'พลุไฟส่องสว่างถูกยิงขึ้นฟ้าพร้อมเสียงนกหวีดเตือนภัย! ชุดลาดตระเวนติดอาวุธเล็งลำแสงเลเซอร์มาที่ร่างของเจ้าแล้วลั่นกระสุนปืนไรเฟิลใส่เต็มแรง แรงกระสุนเจาะทะลุเนื้อเยื่อจนเจ้าต้องกลิ้งหลบเข้ามุมมืดแทบไม่ทัน',
    hpLoss: 13,
    sanityLoss: 2,
  },
  {
    id: 'danger-attack-12-armored-pickup',
    stageLevel: 12,
    title: 'รถกระบะติดเกราะของกลุ่มติดอาวุธพุ่งชนและกราดยิงปืนกลเบาจากท้ายกระบะ',
    description:
      'แสงไฟสปอตไลท์หน้ารถกระบะติดแผ่นเหล็กสาดส่องเข้ามาในซอย เสียงเครื่องยนต์คำรามพร้อมกันชนเหล็กที่พุ่งกระแทกร่างของเจ้า ตามด้วยชุดกระสุนปืนกลเบาจากท้ายกระบะที่ยิงกดจนเศษปูนแตกกระจายบาดทั่วร่าง',
    hpLoss: 15,
    sanityLoss: 2,
  },
  {
    id: 'danger-attack-13-claymore-mine',
    stageLevel: 13,
    title: 'กับระเบิดสังหารบุคคลแบบลูกปรายหน้าแนวป้องกันด่านทหารทำงานเมื่อก้าวผ่าน',
    description:
      'เสียงคลิกเบา ๆ ดังขึ้นใต้ฝ่าเท้าก่อนที่กับระเบิดลูกปรายที่ฝังไว้รอบเขตปิดล้อมจะระเบิดออก! แรงอัดอากาศและสะเก็ดลูกเหล็กนับร้อยฉีกกระชากเนื้อเยื่อของเจ้าอย่างรุนแรง',
    hpLoss: 16,
    sanityLoss: 2,
  },
  {
    id: 'danger-attack-14-flamethrower',
    stageLevel: 14,
    title: 'หน่วยกวาดล้างชุดกันไฟฉีดพ่นหัวเชื้อเพลิงเหลวเผาทำลายในตรอกแคบ',
    description:
      'เจ้าหน้าที่ชุดกันไฟเดินเรียงหน้ากระดานปิดปากซอย ทันทีที่ตรวจพบความเคลื่อนไหว หัวพ่นไฟแรงดันสูงก็พ่นลำเพลิงสีส้มแดงเข้าใส่ร่างของเจ้าเต็ม ๆ จนผิวหนังไหม้เกรียมก่อนที่เจ้าจะพุ่งทะลุหน้าต่างหนีตายออกมาได้',
    hpLoss: 18,
    sanityLoss: 2,
  },
  {
    id: 'danger-attack-15-heavy-killzone',
    stageLevel: 15,
    title: 'ป้อมปืนกลหนักประจำด่านปิดล้อมและพลซุ่มยิงเปิดฉากระดมยิงสังหารพร้อมกัน',
    description:
      'ไซเรนเตือนภัยขั้นสูงสุดดังก้องทั่วเขตปิดล้อมสังหาร! สปอตไลท์ทุกดวงจับจ้องมาที่เจ้าเป็นจุดเดียว ป้อมปืนกลหนักและพลซุ่มยิงบนอาคารสูงเปิดฉากระดมยิงกระสุนเจาะเกราะใส่ร่างของเจ้าอย่างบ้าคลั่งจนแทบแหลกสลาย!',
    hpLoss: 20,
    sanityLoss: 3,
  },
];

export interface DailyWeatherAndZoneHazardInfo {
  weatherId: 'black_rain' | 'ash_smog' | 'scorching_heat' | 'clear_recon' | 'monsoon_blackout';
  weatherTitle: string;
  weatherBadge: string;
  weatherDescription: string;
  weatherEffectSummary: string;
  isStealthWeather: boolean;
  isOutdoorPlace: boolean;
  localThreat: number;
  threatTier: 'calm' | 'watch' | 'high' | 'lockdown';
  threatTierTitle: string;
  threatEffectSummary: string;
  accentColor: string;
  trustGainScalePercent: number;
  humanAttackChancePercent: number;
  humanAttackDamageRangeLabel: string;
}

const OUTDOOR_PLACES = new Set([
  'streets',
  'radio',
  'tower',
  'bkk_pier',
  'bkk_busyard',
  'bkk_winstop',
  'bkk_market',
  'bkk_sweeper',
]);

export function getDailyWeatherAndZoneHazard(
  gameState: any,
  placeOverride?: string
): DailyWeatherAndZoneHazardInfo {
  const day = Number(gameState?.day || 1);
  const seed = Number(gameState?.initialSeed || 101);
  const place = String(placeOverride || gameState?.place || 'shelter');
  const rawLoc =
    gameState?.world?.locations?.[place] ||
    (place === 'tower' ? gameState?.world?.locations?.radio : undefined);
  const localThreat = Math.min(100, Math.max(0, Math.round(Number(rawLoc?.threat ?? 20))));
  const isOutdoorPlace = OUTDOOR_PLACES.has(place);

  // Deterministic daily weather cycle using seed + day
  const hash = ((seed ^ (day * 2246822519)) >>> 0) % 100;
  let weatherId: DailyWeatherAndZoneHazardInfo['weatherId'] = 'ash_smog';
  if (hash < 22) {
    weatherId = 'black_rain';
  } else if (hash < 44) {
    weatherId = 'ash_smog';
  } else if (hash < 64) {
    weatherId = 'scorching_heat';
  } else if (hash < 82) {
    weatherId = 'clear_recon';
  } else {
    weatherId = 'monsoon_blackout';
  }

  let weatherTitle = 'หมอกควันพิษปกคลุม';
  let weatherBadge = 'หมอกควันพรางตัว';
  let weatherDescription =
    'หมอกควันสีเทาหม่นจากซากตึกไฟไหม้ปกคลุมทั่วตรอกซอกซอย ช่วยบดบังสายตาของหน่วยลาดตระเวนแต่ชวนให้อึดอัด';
  let weatherEffectSummary =
    'พรางตัวจากด่านตรวจ (ลดภัยพื้นที่ -2/วัน · ลดโอกาสถูกคนพบเห็นทำร้ายลงครึ่งหนึ่ง · ลอบตัดไฟด่านได้โดยไม่เสีย HP) · ทัศนวิสัยมืดมัว สติ -1';
  let isStealthWeather = false;

  if (weatherId === 'black_rain') {
    weatherTitle = 'ฝนเขม่าพิษตกปรอย';
    weatherBadge = 'ฝนเขม่าพิษ';
    weatherDescription =
      'หยาดฝนสีดำปนเขม่าสารเคมีโปรยปรายลงมาทั่วกรุงเทพฯ ชะล้างกลิ่นเลือดและกลบเสียงฝีเท้า แต่กัดกร่อนผิวหนังกลางแจ้ง';
    weatherEffectSummary = isOutdoorPlace
      ? 'กลบกลิ่นและพรางตัว (ลดภัยพื้นที่ -3/วัน · ลดโอกาสถูกคนทำร้ายลงครึ่งหนึ่ง · ลอบปลดกับดักด่านได้โดยไม่เสีย HP) · อยู่กลางแจ้งเร่งกลายพันธุ์ +2'
      : 'กลบกลิ่นและพรางตัว (ลดภัยพื้นที่ -3/วัน · ลดโอกาสถูกคนทำร้ายลงครึ่งหนึ่ง · ลอบปลดกับดักด่านได้โดยไม่เสีย HP) · อยู่ในอาคารหลบฝนพิษได้';
    isStealthWeather = true;
  } else if (weatherId === 'ash_smog') {
    weatherTitle = 'หมอกควันพิษปกคลุม';
    weatherBadge = 'หมอกควันทึบ';
    weatherDescription =
      'หมอกควันทึบปกคลุมระดับสายตา เวรยามมนุษย์มองเห็นได้ไม่เกินสิบเมตร เหมาะแก่การลอบเร้นในพื้นที่อันตราย';
    weatherEffectSummary =
      'พรางตัวดีเยี่ยม (ลดภัยพื้นที่ -2/วัน · ลดโอกาสถูกคนทำร้ายลงครึ่งหนึ่ง · ลอบปลดกับดักด่านได้โดยไม่เสีย HP) · ทัศนวิสัยมืดมัว สติ -1';
    isStealthWeather = true;
  } else if (weatherId === 'scorching_heat') {
    weatherTitle = 'คลื่นความร้อนอบอ้าว';
    weatherBadge = 'แดดร้อนจัด';
    weatherDescription =
      'ไอร้อนระอุจากคอนกรีตเร่งให้ร่างกายสูญเสียน้ำและหิวเร็วขึ้น แต่แผงโซลาร์เซลล์และเครื่องมือวิจัยทำงานได้เต็มกำลัง';
    weatherEffectSummary =
      'เผาผลาญพลังงานเร็วขึ้น (ความหิว +2/วัน) · โซลาร์เซลล์จ่ายไฟเต็มที่ (งานวิจัย +2 เมื่อจบวัน)';
    isStealthWeather = false;
  } else if (weatherId === 'clear_recon') {
    weatherTitle = 'ฟ้าโปร่ง · ฮ.ลาดตระเวนบินต่ำ';
    weatherBadge = 'ฟ้าโปร่ง/ลาดตระเวน';
    weatherDescription =
      'ท้องฟ้าเปิดโล่งไร้เมฆหมอก เฮลิคอปเตอร์และเวรยามประจำด่านตรวจการณ์ได้ไกลขึ้น แต่แสงแดดช่วยให้จิตใจสงบในย่านที่ยังสงบ';
    weatherEffectSummary =
      localThreat >= 60
        ? 'วิสัยทัศน์เปิดโล่งในเขตอันตรายสูง! ฮ.ลาดตระเวนกดดันพื้นที่ (ภัยพื้นที่ +2 · สติ -1 เมื่อจบวัน)'
        : 'ย่านนี้ยังสงบและแสงแดดส่องถึง (ฟื้นฟูสติ +2 เมื่อจบวัน)';
    isStealthWeather = false;
  } else if (weatherId === 'monsoon_blackout') {
    weatherTitle = 'พายุฝนฟ้าคะนอง · ไฟด่านดับ';
    weatherBadge = 'พายุฝน/ไฟดับ';
    weatherDescription =
      'พายุฝนกระหน่ำและเสียงฟ้าร้องคำรามกลบเสียงคำรามของฝูงผู้ติดเชื้อ ระบบไฟสปอตไลท์ของด่านตรวจขัดข้องชั่วคราว';
    weatherEffectSummary =
      'เสียงฟ้าร้องพรางตัว (ลดภัยพื้นที่ -2/วัน · ลดโอกาสถูกคนทำร้ายลงครึ่งหนึ่ง · ลอบปลดกับดักด่านได้โดยไม่เสีย HP) · คลื่นเสียงกระตุ้นอำนาจฝูง +2';
    isStealthWeather = true;
  }

  let threatTier: DailyWeatherAndZoneHazardInfo['threatTier'] = 'calm';
  let threatTierTitle = 'เขตสงบ';
  let trustGainScalePercent = 100;
  let baseAttackChance = localThreat >= 25 ? 10 : 0;
  let humanAttackDamageRangeLabel = localThreat >= 25 ? '2–4 HP' : '0 HP';
  let accentColor = 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200';

  if (localThreat >= 85) {
    threatTier = 'lockdown';
    threatTierTitle = 'เขตปิดล้อมสังหาร';
    trustGainScalePercent = 35;
    baseAttackChance = 65;
    humanAttackDamageRangeLabel = localThreat >= 95 ? '15–20 HP' : '10–20 HP';
    accentColor = 'border-rose-500/60 bg-rose-950/40 text-rose-200';
  } else if (localThreat >= 60) {
    threatTier = 'high';
    threatTierTitle = 'เขตอันตรายสูง';
    trustGainScalePercent = 50;
    baseAttackChance = 45;
    humanAttackDamageRangeLabel = '5–12 HP';
    accentColor = 'border-amber-500/60 bg-amber-950/40 text-amber-200';
  } else if (localThreat >= 35) {
    threatTier = 'watch';
    threatTierTitle = 'เขตเฝ้าระวัง';
    trustGainScalePercent = 75;
    baseAttackChance = 25;
    humanAttackDamageRangeLabel = '3–7 HP';
    accentColor = 'border-sky-500/40 bg-sky-950/30 text-sky-200';
  }

  const humanAttackChancePercent = isStealthWeather
    ? Math.floor(baseAttackChance * 0.5)
    : baseAttackChance;

  let threatEffectSummary =
    humanAttackChancePercent > 0
      ? `ผู้คนยังไม่ตื่นตระหนกมาก (ความไว้ใจขึ้นปกติ 100%) · มีโอกาส ${humanAttackChancePercent}% ที่ชาวบ้านตกใจทำร้าย (-${humanAttackDamageRangeLabel})`
      : 'การตรวจการณ์เบาบาง ความไว้ใจของ NPC เพิ่มขึ้นตามปกติ (100%) และยังไม่มีความเสี่ยงถูกชาวบ้านดักทำร้าย';

  if (localThreat >= 85) {
    threatEffectSummary = `คนหวาดผวาซอมบี้สุดขีด! ความไว้ใจ NPC ในย่านนี้เพิ่มขึ้นยากมาก (-65%) · มีโอกาส ${humanAttackChancePercent}% ที่จะถูกชุดลาดตระเวน/ป้อมปืนกลระดมโจมตีหนัก (-${humanAttackDamageRangeLabel}) · สำรวจอิสระพบเสบียงด่านเพิ่ม (+2)`;
  } else if (localThreat >= 60) {
    threatEffectSummary = `ผู้คนตั้งป้อมระแวงสูง! ความไว้ใจ NPC ในย่านนี้เพิ่มขึ้นยาก (-50%) · มีโอกาส ${humanAttackChancePercent}% ที่จะถูกชาวบ้าน/เวรยามดักตีหรือวางกับดักโจมตี (-${humanAttackDamageRangeLabel}) · สำรวจอิสระพบเสบียงโบนัส (+2)`;
  } else if (localThreat >= 35) {
    threatEffectSummary = `คนในย่านเริ่มระแวงซอมบี้ ความไว้ใจ NPC เพิ่มขึ้นยากขึ้น (-25%) · มีโอกาส ${humanAttackChancePercent}% ที่จะถูกคนตื่นตกใจขว้างของหรือฟาดสกัด (-${humanAttackDamageRangeLabel})`;
  }

  return {
    weatherId,
    weatherTitle,
    weatherBadge,
    weatherDescription,
    weatherEffectSummary,
    isStealthWeather,
    isOutdoorPlace,
    localThreat,
    threatTier,
    threatTierTitle,
    threatEffectSummary,
    accentColor,
    trustGainScalePercent,
    humanAttackChancePercent,
    humanAttackDamageRangeLabel,
  };
}

export interface HazardTurnAttackResult {
  attacked: boolean;
  scenario?: DangerHumanAttackScenario;
  chancePercent: number;
  localThreat: number;
}

/**
 * ประมวลผลสภาพอากาศและระดับภัยคุกคามพื้นที่ (Danger/Threat) เมื่อข้ามวัน
 * 1) หากค่า Danger >= 35 การเพิ่มค่าความไว้ใจรวม (stats.trust) ในเทิร์นนั้นจะขึ้นยากขึ้นตามระดับความระแวงของคนในพื้นที่
 * 2) สุ่มโอกาสเป็น % (humanAttackChancePercent) ที่จะถูกมนุษย์/ชาวบ้าน/ชุดลาดตระเวนในพื้นที่โจมตี (15 ฉากเหตุการณ์ ลดเลือดตั้งแต่ -2 ถึงสูงสุด -20 HP ตามระดับ Danger)
 */
export function applyDailyWeatherAndZoneHazardTurn(
  nextState: any,
  beforeState: any
): HazardTurnAttackResult {
  const emptyResult: HazardTurnAttackResult = {
    attacked: false,
    chancePercent: 0,
    localThreat: 20,
  };
  if (!nextState || !nextState.stats || nextState.ending) return emptyResult;
  const beforeDay = Number(beforeState?.day || 1);
  const nextDay = Number(nextState?.day || 1);
  if (nextDay <= beforeDay) return emptyResult;
  if ((nextState.stats.hp || 0) <= 0) return emptyResult;

  const place = String(nextState.place || 'shelter');
  const info = getDailyWeatherAndZoneHazard(beforeState || nextState, place);
  const loc =
    nextState.world?.locations?.[place] ||
    (place === 'tower' ? nextState.world?.locations?.radio : undefined);

  const clampStat = (key: string, delta: number, minVal = 0, maxVal = 100) => {
    const cur = Number(nextState.stats[key] ?? 0);
    nextState.stats[key] = Math.min(maxVal, Math.max(minVal, cur + delta));
  };

  // 1) ผลของ Danger ต่อการเพิ่มความไว้ใจ (Trust Gain Resistance): หากความไว้ใจเพิ่มขึ้นในเทิร์นนี้ในย่านที่ Danger >= 35 จะขึ้นยากขึ้น
  const beforeTrust = Number(beforeState?.stats?.trust ?? nextState.stats.trust ?? 0);
  const afterTrust = Number(nextState.stats.trust ?? 0);
  if (afterTrust > beforeTrust && info.localThreat >= 35) {
    const rawGain = afterTrust - beforeTrust;
    const scaledGain = Math.max(1, Math.round((rawGain * info.trustGainScalePercent) / 100));
    nextState.stats.trust = Math.min(100, beforeTrust + scaledGain);
  }

  // 2) ประมวลผลผลกระทบตามสภาพอากาศรายวัน (เท่าเทียมกันทุกเขต ไม่มีข้อยกเว้นเซฟโซน)
  if (info.weatherId === 'black_rain') {
    if (loc && typeof loc.threat === 'number') {
      loc.threat = Math.min(100, Math.max(0, loc.threat - 3));
    }
    if (info.isOutdoorPlace) {
      clampStat('mutation', 2, 0, 100);
    }
  } else if (info.weatherId === 'ash_smog') {
    if (loc && typeof loc.threat === 'number') {
      loc.threat = Math.min(100, Math.max(0, loc.threat - 2));
    }
    if ((nextState.stats.sanity || 0) > 15) {
      clampStat('sanity', -1, 15, 100);
    }
  } else if (info.weatherId === 'scorching_heat') {
    if ((nextState.stats.hunger || 0) < 90) {
      clampStat('hunger', 2, 0, 92);
    }
    clampStat('research', 2, 0, 100);
  } else if (info.weatherId === 'clear_recon') {
    if (info.localThreat >= 60) {
      if ((nextState.stats.sanity || 0) > 15) {
        clampStat('sanity', -1, 15, 100);
      }
      if (loc && typeof loc.threat === 'number') {
        loc.threat = Math.min(100, Math.max(0, loc.threat + 2));
      }
    } else if (info.localThreat < 35) {
      clampStat('sanity', 2, 0, 100);
    }
  } else if (info.weatherId === 'monsoon_blackout') {
    if (loc && typeof loc.threat === 'number') {
      loc.threat = Math.min(100, Math.max(0, loc.threat - 2));
    }
    clampStat('horde', 2, 0, 120);
  }

  // 3) สุ่มโอกาสเป็น % (humanAttackChancePercent) ที่จะโดนคนในพื้นที่โจมตี (15 ฉาก ลดเลือดตั้งแต่ -2 ถึงสูงสุด -20 HP ตามระดับ Danger)
  if (info.humanAttackChancePercent > 0 && (nextState.stats.hp || 0) > 0) {
    const seed = Number(nextState.initialSeed || 101);
    let placeHash = 0;
    for (let i = 0; i < place.length; i++) {
      placeHash = (placeHash * 31 + place.charCodeAt(i)) >>> 0;
    }
    const rollHash =
      ((seed ^ (nextDay * 2654435761) ^ (info.localThreat * 374761393) ^ placeHash) >>> 0);
    const rollPercent = rollHash % 100;

    if (rollPercent < info.humanAttackChancePercent) {
      let poolIndices: number[] = [0, 1, 2];
      if (info.localThreat >= 95) {
        poolIndices = [11, 12, 13, 14]; // ฉากที่ 12–15 (-15, -16, -18, -20 HP)
      } else if (info.localThreat >= 85) {
        poolIndices = [8, 9, 10, 11, 12, 13, 14]; // ฉากที่ 9–15 (-10 ถึง -20 HP)
      } else if (info.localThreat >= 60) {
        poolIndices = [3, 4, 5, 6, 7, 8, 9]; // ฉากที่ 4–10 (-5 ถึง -12 HP)
      } else if (info.localThreat >= 35) {
        poolIndices = [1, 2, 3, 4, 5]; // ฉากที่ 2–6 (-3 ถึง -7 HP)
      } else {
        poolIndices = [0, 1, 2]; // ฉากที่ 1–3 (-2 ถึง -4 HP)
      }

      const scenarioIdx = poolIndices[(rollHash >>> 8) % poolIndices.length];
      const scenario = DANGER_HUMAN_ATTACK_SCENARIOS[scenarioIdx] || DANGER_HUMAN_ATTACK_SCENARIOS[0];

      clampStat('hp', -scenario.hpLoss, 0, 100);
      if (scenario.sanityLoss > 0 && (nextState.stats.sanity || 0) > 10) {
        clampStat('sanity', -scenario.sanityLoss, 10, 100);
      }

      const logText = `[ภัยพื้นที่ ${info.localThreat}/100 · โอกาสปะทะ ${info.humanAttackChancePercent}% — ฉากที่ ${scenario.stageLevel}/15: ${scenario.title}] ${scenario.description} (สภาพร่าง -${scenario.hpLoss}${scenario.sanityLoss > 0 ? ` · สติ -${scenario.sanityLoss}` : ''})`;
      if (Array.isArray(nextState.log)) {
        nextState.log = [
          {
            id: Date.now() + 17,
            day: nextDay,
            text: logText,
            kind: 'danger',
          },
          ...nextState.log,
        ];
      }

      return {
        attacked: true,
        scenario,
        chancePercent: info.humanAttackChancePercent,
        localThreat: info.localThreat,
      };
    }
  }

  return {
    attacked: false,
    chancePercent: info.humanAttackChancePercent,
    localThreat: info.localThreat,
  };
}


export interface HorizonClue {
  id: string;
  routeTitle: string;
  locationHint: string;
  progressText: string;
  narrativeClue: string;
  accentColor: string;
}

export function getMidGameHorizonClues(state: any): HorizonClue[] {
  if (!state || !state.stats) return [];
  const s = state.stats;
  const items = state.items || {};
  const flags = state.story?.flags || {};
  const saved = Number(state.memory?.saved || 0);
  const clues: HorizonClue[] = [];

  if (
    s.research >= 25 ||
    items.samples >= 1 ||
    flags['route.vaccine.0'] ||
    flags['route.vaccine.1'] ||
    flags['route.vaccine.2'] ||
    flags['route.cure.0'] ||
    flags['route.cure.1'] ||
    flags['route.cure.2']
  ) {
    const prepCount = [0, 1, 2].filter(i => Boolean(flags[`route.vaccine.${i}`] || flags[`route.cure.${i}`])).length;
    clues.push({
      id: 'clue-cure',
      routeTitle: 'ร่องรอยเหตุการณ์: ทางกลับสู่ความเป็นมนุษย์',
      locationHint: 'เตรียมงาน 3 จุด แล้วเดินทางไปที่ หอผู้ป่วยพักฟื้นราชวิถี (bkk_ward)',
      progressText: `เตรียมเส้นทาง ${prepCount}/3 · งานวิจัย ${Math.floor(s.research)}/90 · ความไว้ใจ ${Math.floor(
        s.trust
      )}/30 · ความเป็นมนุษย์ ${Math.floor(s.humanity)}/55 · สติ ${Math.floor(s.sanity)}/45 · ตัวอย่างเชื้อ ${items.samples || 0}/2`,
      narrativeClue:
        'เมื่อเตรียมตู้แช่ที่หอผู้ป่วยราชวิถี แยกสายไฟที่ห้องระบบไฟห้วยขวาง และค้นแฟ้มที่อาคารสำนักงานอโศกครบ พร้อมตัวอย่างเชื้อ 2 หลอด เหตุการณ์ฉีดเซรุ่มจะเปิดขึ้นที่หอผู้ป่วยพักฟื้นราชวิถี',
      accentColor: 'text-teal-300 border-teal-500/40 bg-teal-950/30',
    });
  }

  if (saved >= 1 || s.trust >= 10 || s.humanity >= 45) {
    const knewWaterRoute = Boolean(flags['bkk_pier.helped'] || flags['route.horde.2']);
    const enduredCount = Number(state.memory?.endured || 0);
    clues.push({
      id: 'clue-slice-of-life',
      routeTitle: 'ร่องรอยเหตุการณ์: สายสัมพันธ์และทางหนีพ้นเขตกักกันกรุงเทพฯ',
      locationHint: 'ทริกเกอร์ตามเขตที่ผูกพัน / ท่าเรือคลองแสนแสบ / สะพานพระราม 8',
      progressText: `ช่วยคนเป็น ${saved}/2 ครั้ง · ทนหิว ${enduredCount}/3 ครั้ง · สำรวจทางน้ำ ${knewWaterRoute ? 'พร้อมแล้ว' : 'ยังไม่เคย'} · ความไว้ใจรวม ${Math.floor(
        s.trust
      )}`,
      narrativeClue:
        'หากมีผู้รอดชีวิตไว้ใจเต็ม 100/100 (หลังวันที่ 22) อีกฝ่ายจะมาชวนหนีข้ามแม่น้ำ หรือหากผ่านวันที่ 32 หลังสะพานถูกตัดขาด เคยสำรวจร่องน้ำคลองแสนแสบ ทนหิวอย่างน้อย 3 ครั้ง และรักษาสติ/ความเป็นมนุษย์ >= 60 โดยไม่เคยฆ่าคน จะพบเรือหลบหนีทางน้ำ',
      accentColor: 'text-sky-300 border-sky-500/40 bg-sky-950/30',
    });
  }

  if (
    s.horde >= 22 ||
    flags['route.horde.0'] ||
    flags['route.horde.1'] ||
    flags['route.horde.2']
  ) {
    const prepCount = ['route.horde.0', 'route.horde.1', 'route.horde.2'].filter(k => Boolean(flags[k])).length;
    clues.push({
      id: 'clue-crown',
      routeTitle: 'ร่องรอยเหตุการณ์: เสียงสั่งการฝูง & ทางออกเลียบคลองแสนแสบ',
      locationHint: 'เตรียมงาน 3 จุด แล้วเดินทางไปที่ ท่าเรือพักคลองแสนแสบ (bkk_pier)',
      progressText: `เตรียมเส้นทาง ${prepCount}/3 · อำนาจฝูง ${Math.floor(s.horde)}/90 · กลายพันธุ์ ${Math.floor(
        s.mutation
      )}/45 · สติ ${Math.floor(s.sanity)}/25`,
      narrativeClue:
        'เมื่อจดผังตรอกที่คิววินอโศก ฝึกสัญญาณที่ลานจอดรถเมล์ลาดพร้าว และตรวจจุดคอขวดที่ท่าเรือคลองแสนแสบครบ การเดินทางไปท่าเรือพักคลองแสนแสบจะเปิดจุดตัดสินใจระหว่างตั้งหลักนำฝูงหรือพาฝูงฝ่าแนวปิดล้อม',
      accentColor: 'text-purple-300 border-purple-500/40 bg-purple-950/30',
    });
  }

  if (
    s.mutation >= 25 ||
    (items.samples >= 1 && s.mutation >= 18) ||
    flags['route.evolution.0'] ||
    flags['route.evolution.1'] ||
    flags['route.evolution.2']
  ) {
    const prepCount = ['route.evolution.0', 'route.evolution.1', 'route.evolution.2'].filter(k => Boolean(flags[k])).length;
    clues.push({
      id: 'clue-evolve',
      routeTitle: 'ร่องรอยเหตุการณ์: ก้าวพ้นคำว่ามนุษย์และซอมบี้',
      locationHint: 'เตรียมงาน 3 จุด แล้วเดินทางไปที่ ห้องระบบไฟอาคารห้วยขวาง (bkk_power)',
      progressText: `เตรียมเส้นทาง ${prepCount}/3 · กลายพันธุ์ ${Math.floor(s.mutation)}/85 · งานวิจัย ${Math.floor(
        s.research
      )}/35 · สติ ${Math.floor(s.sanity)}/30 · ตัวอย่างเชื้อ ${items.samples || 0}/2`,
      narrativeClue:
        'เมื่อเก็บสมุดตรวจอาการที่จุดพักงานกวาดถนน ให้ทีมพยาบาลตรวจตัวอย่างที่หอผู้ป่วยราชวิถี และแยกวงจรเสียที่ห้องระบบไฟห้วยขวางครบ พร้อมตัวอย่างเชื้อ 2 หลอด จุดตัดสินใจวิวัฒนาการจะเปิดขึ้นที่ห้องระบบไฟ',
      accentColor: 'text-lime-300 border-lime-500/40 bg-lime-950/30',
    });
  }

  if (s.campaign >= 1 || s.horde >= 40) {
    const prepCount = ['route.horde.0', 'route.horde.1', 'route.horde.2'].filter(k => Boolean(flags[k])).length;
    clues.push({
      id: 'clue-extinguish',
      routeTitle: 'ร่องรอยเหตุการณ์: คลื่นสัญญาณสุดท้ายของโลกเก่า',
      locationHint: 'เตรียมเส้นทางฝูงครบ 3 จุด แล้วเดินทางไปที่ หอส่งสัญญาณวิทยุ สะพานพระราม 8',
      progressText: `เตรียมเส้นทางฝูง ${prepCount}/3 · ขยายแนวรบ ${Math.floor(s.campaign || 0)}/2 · อำนาจฝูง ${Math.floor(
        s.horde
      )}/110 · กลายพันธุ์ ${Math.floor(s.mutation)}/80 · สติ ${Math.floor(s.sanity)}/25`,
      narrativeClue:
        'เมื่อเตรียมเส้นทางควบคุมฝูงครบ 3 จุด ขยายแนวรบครบ 2 ระยะ และมีอำนาจฝูงถึงขีดสุด การก้าวขึ้นไปบนหอส่งสัญญาณวิทยุสะพานพระราม 8 จะเปิดจุดตัดสินใจกระจายสัญญาณสุดท้าย',
      accentColor: 'text-amber-300 border-amber-500/40 bg-amber-950/30',
    });
  }

  return clues;
}

export interface SliceOfLifeEndingOption {
  id: 'silent_guardian' | 'escape_companion' | 'horde_breakout' | 'conscious_exile';
  title: string;
  subtitle: string;
  categoryLabel: string;
  description: string;
  requirementSummary: string;
  enabled: boolean;
  accentColor: string;
  endingTitle: string;
  endingText: string;
  companionName?: string;
}

/**
 * สร้างฉากตัดสินใจเชิงบทบาทสมมติ (In-Character Climax Decision Modal) เมื่อผู้เล่นเลือกการกระทำสำคัญที่จะนำไปสู่ฉากจบ
 * แทนที่จะกดปุ่มแล้วตัดจบเกมทันที ผู้เล่นจะได้อ่านบรรยากาศและเลือกยืนยันการกระทำในบทบาทของตัวละคร
 */
export function buildActionClimaxDecisionModal(
  action: any,
  gameState: any,
  bio: CharacterBioDossier,
  currentZonePop?: ZonePopulationState
): LifeSimModalEvent {
  const actionId = String(action?.id || '');
  const placeId = String(gameState?.place || 'shelter');
  const placeName = currentZonePop?.placeName || 'เขตกักกันกรุงเทพฯ';
  const signatureItem = bio?.signatureItemName || 'ของติดตัวจากชีวิตก่อน';

  if (actionId === 'cure') {
    return {
      id: `action-climax-cure-day-${gameState?.day || 1}`,
      title: 'จุดตัดสินใจสำคัญ · เข็มฉีดเซรุ่มย้อนกลับในมือที่สั่นเทา',
      text: `ภายในหอผู้ป่วยพักฟื้นราชวิถีที่เครื่องปั่นเหวี่ยงเพิ่งหยุดหมุน หลอดเซรุ่มย้อนกลับที่สกัดจากตัวอย่างเชื้อครบสองหลอดสะท้อนแสงไฟสำรองสีขาวนวล แขนที่เย็นเฉียบและไร้ชีพจรของเจ้าวางพาดอยู่บนโต๊ะโลหะ\n\nหากเจ้าจรดปลายเข็มและเดินยาเซรุ่มหลอดนี้เข้าสู่กระแสเลือด กระบวนการย้อนกลับสู่ความเป็นมนุษย์จะเริ่มต้นขึ้นทันที และเรื่องราวการเอาชีวิตรอดในฐานะผู้ติดเชื้อจะเดินทางมาถึงบทสรุป`,
      dayNote: 'การตัดสินใจครั้งสุดท้ายของเส้นทางวัคซีน · เลือกการกระทำของเจ้า',
      placeId,
      advanceDay: false,
      isEndingClimax: true,
      choices: [
        {
          text: 'จรดปลายเข็มฉีดเซรุ่มย้อนกลับเข้าสู่เส้นเลือด เพื่อทวงคืนชีพจรและความเป็นมนุษย์',
          note: 'ลงมือทำสิ่งนี้ให้ถึงที่สุด · ก้าวเข้าสู่บทสรุป: กลับมาเป็นมนุษย์',
          enabled: true,
          outcomeText:
            'ความร้อนสายหนึ่งแล่นพล่านผ่านเส้นเลือดที่เคยเย็นเฉียบ เสียงหัวใจเต้นตุบแรกดังก้องขึ้นในอกอีกครั้ง',
          effects: {
            executeEngineActionId: actionId,
          },
        },
        {
          text: 'วางเข็มฉีดยาลงและเก็บหลอดเซรุ่มเข้าตู้แช่แข็งไว้ก่อน — ยังมีเรื่องในเมืองนี้ที่ต้องสะสาง',
          note: 'ยั้งมือไว้ก่อน · ไม่เสียวัน · อยู่สำรวจเขตกักกันกรุงเทพฯ ต่อไป',
          enabled: true,
          outcomeText:
            'เจ้าเก็บหลอดเซรุ่มกลับเข้าตู้ควบคุมอุณหภูมิ แล้วหันหลังก้าวออกจากห้องแล็บเพื่อทำสิ่งที่ยังค้างคา',
          effects: {},
        },
      ],
    };
  }

  if (actionId === 'crown') {
    return {
      id: `action-climax-crown-day-${gameState?.day || 1}`,
      title: 'จุดตัดสินใจสำคัญ · เสียงคำรามรวบรวมฝูงผู้ติดเชื้อริมคลองแสนแสบ',
      text: `ที่ท่าเรือพักคลองแสนแสบ ฝูงผู้ติดเชื้อที่เจ้าฝึกฝนและวางแนวสัญญาณไว้ตลอดเส้นทางกำลังยืนเรียงรายอยู่ในเงามืดหลังแนวรถร้าง ดวงตาทุกคู่จ้องมองมาที่เจ้าในฐานะจ่าฝูงผู้ครองสติ\n\nหากเจ้าก้าวขึ้นไปบนหัวสะพานท่าเรือและเปล่งสัญญาณคำสั่งในตอนนี้ ฝูงทั้งหมดจะยึดพื้นที่เขตเมืองเก่าและตั้งหลักอยู่ภายใต้การปกครองของเจ้าอย่างถาวร`,
      dayNote: 'การตัดสินใจครั้งสุดท้ายของเส้นทางฝูง · เลือกการกระทำของเจ้า',
      placeId,
      advanceDay: false,
      isEndingClimax: true,
      choices: [
        {
          text: 'ก้าวขึ้นบนหัวสะพานท่าเรือและส่งสัญญาณคำสั่ง สถาปนาเขตปกครองของฝูงผู้มีสติ',
          note: 'ลงมือทำสิ่งนี้ให้ถึงที่สุด · ก้าวเข้าสู่บทสรุป: ราชาซอมบี้ผู้มีสติ',
          enabled: true,
          outcomeText:
            'ฝูงผู้ติดเชื้อทั้งหมดขานรับสัญญาณของเจ้าอย่างพร้อมเพรียง เขตเมืองเก่าริมคลองกลายเป็นอาณาจักรใหม่ภายใต้กฎของเจ้า',
          effects: {
            executeEngineActionId: actionId,
          },
        },
        {
          text: 'ส่งสัญญาณมือให้ฝูงหมอบซ่อนตัวรอในเงามืดไปก่อน — ยังไม่ถึงเวลาปักหลักถาวร',
          note: 'ยั้งมือไว้ก่อน · ไม่เสียวัน · อยู่สำรวจเขตกักกันกรุงเทพฯ ต่อไป',
          enabled: true,
          outcomeText:
            'เจ้าลดมือลง ฝูงผู้ติดเชื้อค่อย ๆ ถอยกลับเข้าซอกตึกริมคลองอย่างเงียบเชียบเพื่อรอคำสั่งครั้งหน้า',
          effects: {},
        },
      ],
    };
  }

  if (actionId === 'evolve') {
    return {
      id: `action-climax-evolve-day-${gameState?.day || 1}`,
      title: 'จุดตัดสินใจสำคัญ · ปลดปล่อยคลื่นกระตุ้นประสาทสายพันธุ์ใหม่',
      text: `ภายในห้องระบบไฟอาคารห้วยขวางที่แยกวงจรเสียออกเรียบร้อยแล้ว ตัวอย่างเชื้อบริสุทธิ์และกระแสไฟควบคุมพร้อมกระตุ้นเซลล์กลายพันธุ์ในร่างของเจ้าให้ก้าวข้ามขีดจำกัดเดิม\n\nหากเจ้าวางมือลงบนแผงวงจรเพื่อรับการกระตุ้นครั้งสุดท้าย โครงสร้างประสาทและร่างกายจะวิวัฒนาการสู่สายพันธุ์ใหม่ที่อยู่เหนือทั้งมนุษย์และซอมบี้เดิมอย่างสมบูรณ์`,
      dayNote: 'การตัดสินใจครั้งสุดท้ายของเส้นทางวิวัฒนาการ · เลือกการกระทำของเจ้า',
      placeId,
      advanceDay: false,
      isEndingClimax: true,
      choices: [
        {
          text: 'วางมือลงบนแผงควบคุมระบบไฟ ยอมรับการปรับเปลี่ยนโครงสร้างร่างสู่สายพันธุ์ใหม่อย่างสมบูรณ์',
          note: 'ลงมือทำสิ่งนี้ให้ถึงที่สุด · ก้าวเข้าสู่บทสรุป: วิวัฒน์สู่สายพันธุ์ใหม่',
          enabled: true,
          outcomeText:
            'กระแสพลังงานแล่นผ่านเซลล์ทุกอณู ประสาทสัมผัสใหม่ตื่นขึ้นอย่างสมบูรณ์โดยที่สติสัมปชัญญะยังเป็นของเจ้าทุกประการ',
          effects: {
            executeEngineActionId: actionId,
          },
        },
        {
          text: 'ชักมือออกจากแผงควบคุม — รักษาร่างปัจจุบันไว้ทำภารกิจอื่นในเมืองก่อน',
          note: 'ยั้งมือไว้ก่อน · ไม่เสียวัน · อยู่สำรวจเขตกักกันกรุงเทพฯ ต่อไป',
          enabled: true,
          outcomeText:
            'เจ้าดึงมือกลับและปิดสวิตช์สำรองไว้ชั่วคราว เลือกที่จะยังไม่เร่งการเปลี่ยนแปลงครั้งสุดท้ายในวันนี้',
          effects: {},
        },
      ],
    };
  }

  if (actionId === 'extinguish') {
    return {
      id: `action-climax-extinguish-day-${gameState?.day || 1}`,
      title: 'จุดตัดสินใจสำคัญ · คันโยกส่งคลื่นความถี่กวาดล้างบนหอวิทยุสะพานพระราม 8',
      text: `เบื้องล่างหอส่งสัญญาณวิทยุสะพานพระราม 8 คือฝูงผู้ติดเชื้อที่ขยายแนวรบครอบคลุมทั่วกรุงเทพฯ เครื่องส่งคลื่นความถี่แรงสูงตรงหน้าพร้อมกระจายสัญญาณคำสั่งขั้นสุดท้ายไปถึงผู้ติดเชื้อทุกตัว\n\nหากเจ้าสับคันโยกนี้ แนวป้องกันของมนุษย์ทุกจุดในกรุงเทพมหานครจะถูกฝูงซอมบี้โหมบุกเข้ายึดครองจนหมดสิ้น และยุคสมัยของมนุษย์ในเมืองนี้จะปิดฉากลงทันที`,
      dayNote: 'การตัดสินใจครั้งสุดท้ายบนหอส่งสัญญาณวิทยุ · เลือกการกระทำของเจ้า',
      placeId,
      advanceDay: false,
      isEndingClimax: true,
      choices: [
        {
          text: 'สับคันโยกกระจายคลื่นสัญญาณคำสั่งสูงสุด ให้ฝูงผู้ติดเชื้อเข้ายึดครองเมืองทั้งหมด',
          note: 'ลงมือทำสิ่งนี้ให้ถึงที่สุด · ก้าวเข้าสู่บทสรุป: โลกไร้มนุษย์',
          enabled: true,
          outcomeText:
            'คลื่นสัญญาณคำสั่งพุ่งกระจายออกจากยอดเสาสะพานพระราม 8 ฝูงผู้ติดเชื้อทั่วทั้งเมืองเคลื่อนพลเข้าทลายแนวกั้นสุดท้ายของมนุษย์',
          effects: {
            executeEngineActionId: actionId,
          },
        },
        {
          text: 'ละมือจากคันโยกส่งสัญญาณ — ยั้งมือไว้ก่อนที่จะไม่มีทางหวนกลับ',
          note: 'ยั้งมือไว้ก่อน · ไม่เสียวัน · อยู่สำรวจเขตกักกันกรุงเทพฯ ต่อไป',
          enabled: true,
          outcomeText:
            'เจ้าถอยห่างจากแผงควบคุมเครื่องส่งสัญญาณ ปล่อยให้เสียงลมเหนือแม่น้ำเจ้าพระยาพัดผ่านไปโดยยังไม่ส่งคำสั่งกวาดล้าง',
          effects: {},
        },
      ],
    };
  }

  const districtId = actionId.replace(/\.settle$/, '');
  const districtObj = (districts as any[]).find(d => d.id === districtId);
  const districtName = districtObj?.name || placeName;
  const endingTitle = districtObj?.ending || action?.name || 'ตั้งหลักดูแลย่านนี้';

  return {
    id: `action-climax-settle-${districtId}-day-${gameState?.day || 1}`,
    title: `จุดตัดสินใจวิถีชีวิต · ปักหลักทำหน้าที่ใน${districtName}`,
    text: `${districtObj?.text || ''}\n\nตลอดหลายวันที่ผ่านมา เจ้าได้พิสูจน์ตัวเองด้วยการทำงานช่วยเหลือผู้คนและรักษาความสงบใน${districtName} จนผู้รอดชีวิตยอมรับและไว้ใจให้เจ้าเป็นส่วนหนึ่งของที่นี่\n\nหากเจ้าเลือกวางสัมภาระลง หยิบ${signatureItem}ขึ้นมา และรับหน้าที่ดูแล${districtName}อย่างเต็มตัว การเร่ร่อนเอาชีวิตรอดไปวัน ๆ จะสิ้นสุดลง และเปลี่ยนเป็นการใช้ชีวิตปกป้องย่านนี้เคียงข้างพวกเขาจนถึงที่สุด`,
    dayNote: `จุดตัดสินใจตั้งหลักปักฐานประจำย่าน (${endingTitle}) · เลือกการกระทำของเจ้า`,
    placeId,
    advanceDay: false,
    isEndingClimax: true,
    choices: [
      {
        text: `วางสัมภาระลงและรับหน้าที่ดูแล${districtName}อย่างเต็มตัว (${endingTitle})`,
        note: `ตัดสินใจเลือกวิถีชีวิตนี้ · ก้าวเข้าสู่บทสรุป: ${endingTitle}`,
        enabled: true,
        outcomeText:
          districtObj?.epilogue ||
          `เจ้าตัดสินใจหยุดเร่ร่อนและใช้ชีวิตที่เหลืออยู่ดูแลความเรียบร้อยใน${districtName}เคียงข้างผู้คนที่ไว้ใจเจ้า`,
        effects: {
          executeEngineActionId: actionId,
        },
      },
      {
        text: 'เก็บสัมภาระขึ้นบ่าตามเดิม — ยังมีสถานที่และเรื่องราวอื่นในกรุงเทพฯ ที่ต้องไปจัดการก่อน',
        note: 'ยั้งมือไว้ก่อน · ไม่เสียวัน · ออกเดินทางสำรวจเขตกักกันต่อไป',
        enabled: true,
        outcomeText: `เจ้าพยักหน้าให้คนใน${districtName}เป็นสัญญาณว่าจะกลับมาใหม่ แล้วก้าวออกเดินทางต่อ`,
        effects: {},
      },
    ],
  };
}

/**
 * ระบบทริกเกอร์เหตุการณ์ไคลแมกซ์สู่ฉากจบโดยอัตโนมัติ (Organic Action-Driven Ending Climax Trigger)
 * ฉากจบไม่สามารถกดเลือกจากเมนูได้ แต่จะเด้งขึ้นมาเองเมื่อผลการกระทำ สเตตัส ความสัมพันธ์ NPC และสถานที่ของผู้เล่นบรรจบกันครบเงื่อนไข!
 */
export function getTriggeredEndingClimaxModal(
  gameState: any,
  currentZonePop: ZonePopulationState | undefined,
  allZones: Record<string, ZonePopulationState>,
  triggeredIds: string[]
): LifeSimModalEvent | null {
  if (!gameState || !gameState.stats || gameState.ending || gameState.pending) {
    return null;
  }

  const s = gameState.stats;
  const items = gameState.items || {};
  const day = gameState.day || 1;
  const place = (gameState.place || 'shelter') as
    | 'shelter'
    | 'streets'
    | 'hospital'
    | 'tower'
    | 'nest';
  const savedCount = Number(gameState.memory?.saved || 0);
  const killedCount = Number(gameState.memory?.killed || 0);
  const enduredCount = Number(gameState.memory?.endured || 0);
  const flags = gameState.story?.flags || {};
  const zoneStats = calculateZoneTrustStats(currentZonePop);
  const placeName = currentZonePop?.placeName || 'เขตกักกันกรุงเทพฯ';

  // ค้นหา NPC ที่ยังมีชีวิตและไว้ใจเราเต็ม 100/100
  const currentZoneMaxTrustNpc = currentZonePop?.npcs.find(
    n => n.alive && n.trust >= 100
  );
  const anyZoneMaxTrustNpc =
    currentZoneMaxTrustNpc ||
    Object.values(allZones || {})
      .flatMap(z => z.npcs)
      .find(n => n.alive && n.trust >= 100);

  // ใช้หน้าต่างเวลา 4 วันสำหรับ ID เหตุการณ์ เพื่อให้ถ้าผู้เล่นเลือก "ยังไม่พร้อม / ถอยออกมาก่อน"
  // เหตุการณ์จะไม่เด้งซ้ำในวันเดิม แต่สามารถกลับมาทริกเกอร์ใหม่ได้เมื่อเวลาผ่านไปอีก 4 วัน!
  const windowBucket = Math.floor(day / 4);

  for (const template of ORGANIC_ENDING_CLIMAX_EVENTS) {
    if (template.choices.some(c => !getEndingReadiness(gameState, c.effects.triggerEndingId).enabled)) continue;
    const cooldownId = `${template.id}-w${windowBucket}`;
    if (triggeredIds.includes(cooldownId)) continue;

    // ตรวจสอบเงื่อนไขเฉพาะของทางหนีทางน้ำ (conscious_exile): ต้องเคยสำรวจ/ช่วยท่าเรือคลองแสนแสบ และทนหิวอย่างน้อย 3 ครั้ง
    if (template.id === 'climax-conscious-exile') {
      const knewWaterRoute = Boolean(flags['bkk_pier.helped'] || flags['route.horde.2']);
      if (!knewWaterRoute || enduredCount < 3) continue;
    }

    // ตรวจสอบสถานที่ (รองรับทั้ง template.placeId และ conditions.places และแปลง 'radio' เป็น 'tower')
    const normalizedPlace = (place === ('radio' as any) ? 'tower' : place) as
      | 'shelter'
      | 'streets'
      | 'hospital'
      | 'tower'
      | 'nest';
    const tplPlace = template.placeId === 'radio' ? 'tower' : template.placeId;
    const cond = template.conditions || {};
    const condPlaces = (cond.places || []).map(p => (p === 'radio' ? 'tower' : p));

    if (condPlaces.length > 0) {
      if (!condPlaces.includes(normalizedPlace)) continue;
    } else if (tplPlace && tplPlace !== 'any' && tplPlace !== normalizedPlace) {
      continue;
    }

    if (cond.minDay !== undefined && day < cond.minDay) continue;
    if (cond.maxDay !== undefined && day > cond.maxDay) continue;
    if (cond.minSanity !== undefined && (s.sanity || 0) < cond.minSanity) continue;
    if (cond.minHumanity !== undefined && (s.humanity || 0) < cond.minHumanity) continue;
    if (cond.minMutation !== undefined && (s.mutation || 0) < cond.minMutation) continue;
    if (cond.minResearch !== undefined && (s.research || 0) < cond.minResearch) continue;
    if (cond.minHorde !== undefined && (s.horde || 0) < cond.minHorde) continue;
    if (cond.minCampaign !== undefined && (s.campaign || 0) < cond.minCampaign) continue;
    if (cond.minTrust !== undefined && (s.trust || 0) < cond.minTrust) continue;

    const minZoneTrustVal = cond.minZoneTrust ?? cond.minZoneAverageTrust;
    if (minZoneTrustVal !== undefined && zoneStats.averageTrust < minZoneTrustVal) {
      continue;
    }
    if (cond.minSavedCount !== undefined && savedCount < cond.minSavedCount) continue;

    const maxKillVal = cond.maxKilledCount ?? cond.maxKillCount;
    if (maxKillVal !== undefined && killedCount > maxKillVal) continue;

    if (cond.minSamples !== undefined && (items.samples || 0) < cond.minSamples) continue;

    const reqMaxCompanion = cond.requiresMaxTrustCompanion ?? cond.requiresMaxTrustNpcInZone;
    if (reqMaxCompanion && !anyZoneMaxTrustNpc) continue;

    // แทนที่ชื่อ NPC คู่หูหรือชื่อเขตในเนื้อเรื่องให้สมจริงตามการกระทำของผู้เล่น
    let dynamicTitle = template.title;
    let dynamicText = template.text;

    if (template.id === 'climax-escape-companion' && anyZoneMaxTrustNpc) {
      dynamicTitle = `จุดเปลี่ยนชะตา · "${anyZoneMaxTrustNpc.name}" ยื่นมือชวนเจ้าหนีพ้นเขตกักกันกรุงเทพฯ`;
      dynamicText = `ท่ามกลางเสียงเครื่องบินลาดตระเวนเหนือฟ้ากรุงเทพฯ "${anyZoneMaxTrustNpc.name}" (${anyZoneMaxTrustNpc.role} ผู้รอดชีวิตที่ไว้ใจเจ้าเต็ม 100/100 จากการกระทำของเจ้าที่ผ่านมา) แอบลัดเลาะมาหาเจ้าในเงามืดพร้อมแผนที่ช่องทางระบายน้ำและกุญแจเรือริมแม่น้ำเจ้าพระยา อีกฝ่ายกระซิบด้วยน้ำเสียงสั่นเครือว่า "ขืนอยู่ที่นี่ต่อไปจนถึงวันกวาดล้าง พวกเราไม่รอดแน่... ไปด้วยกันเถอะ ข้ารู้ว่าข้างในร่างนั้นยังเป็นเจ้า!"`;
    } else if (template.id === 'climax-silent-guardian') {
      dynamicTitle = `จุดเปลี่ยนชะตา · ประตูเหล็กบานสุดท้ายแห่ง${placeName}`;
      dynamicText = `ฝูงผู้ติดเชื้อคลั่งจำนวนมากกำลังทะลักเข้ามาใกล้แนวป้องกันของ${placeName} ในขณะที่ผู้รอดชีวิตทั้ง ${zoneStats.livingCount} คนที่เจ้าเคยช่วยเหลือและคอยแบ่งปันเสบียงให้กำลังเร่งถอยลงสู่หลุมหลบภัยใต้ดินลึก ทว่ากลไกล็อกประตูเหล็กนิรภัยจากด้านในชำรุด — ต้องมีใครสักคนยืนดึงสลักปิดตายประตูจาก "ด้านนอก" และใช้ตัวเองขวางฝูงซอมบี้คลั่งเอาไว้จนกว่าคนข้างในจะปลอดภัย`;
    }

    return {
      id: cooldownId,
      title: dynamicTitle,
      text: dynamicText,
      dayNote: template.dayNote,
      placeId: place,
      advanceDay: template.advanceDay !== false,
      isEndingClimax: true,
      choices: template.choices.map(c => ({
        text:
          template.id === 'climax-escape-companion' &&
          anyZoneMaxTrustNpc &&
          c.effects.triggerEndingId === 'escape_companion'
            ? `พยักหน้ารับและออกเดินทางฝ่าวงล้อมออกจากกรุงเทพฯ ไปพร้อมกับ "${anyZoneMaxTrustNpc.name}"`
            : c.text,
        note: c.note,
        enabled: true,
        outcomeText: c.outcomeText,
        effects: { ...c.effects },
      })),
    };
  }

  return null;
}

/**
 * ฉากจบย่อยตามวิถีชีวิต (Slice-of-Life Endings) & ทางหนีออกจากเขตกักกันกรุงเทพฯ
 */
export function getSliceOfLifeAndEscapeEndings(
  gameState: any,
  currentZonePop: ZonePopulationState | undefined,
  allZones: Record<string, ZonePopulationState>
): SliceOfLifeEndingOption[] {
  if (!gameState || !gameState.stats) return [];
  const s = gameState.stats;
  const day = gameState.day || 1;
  const savedCount = Number(gameState.memory?.saved || 0);
  const killedCount = Number(gameState.memory?.killed || 0);
  const enduredCount = Number(gameState.memory?.endured || 0);
  const flags = gameState.story?.flags || {};
  const knewWaterRoute = Boolean(flags['bkk_pier.helped'] || flags['route.horde.2']);
  const zoneStats = calculateZoneTrustStats(currentZonePop);
  const placeName = currentZonePop?.placeName || 'เขตกักกันกรุงเทพฯ';

  const currentZoneMaxTrustNpc = currentZonePop?.npcs.find(
    n => n.alive && n.trust >= 100
  );
  const anyZoneMaxTrustNpc =
    currentZoneMaxTrustNpc ||
    Object.values(allZones || {})
      .flatMap(z => z.npcs)
      .find(n => n.alive && n.trust >= 100);

  const guardianReady =
    day >= 24 &&
    zoneStats.averageTrust >= 25 &&
    savedCount >= 2 &&
    s.sanity >= 40 &&
    s.humanity >= 50;

  const companionReady =
    day >= 22 &&
    Boolean(anyZoneMaxTrustNpc) &&
    s.sanity >= 45 &&
    s.humanity >= 45;

  const hordeBreakoutReady = getEndingReadiness(gameState, 'horde_breakout').enabled;

  const consciousExileReady =
    day >= 32 &&
    knewWaterRoute &&
    enduredCount >= 3 &&
    s.sanity >= 60 &&
    s.humanity >= 60 &&
    killedCount === 0;

  return [
    {
      id: 'silent_guardian',
      title: `ผู้เฝ้าประตูเงียบงันแห่ง${placeName}`,
      subtitle: 'ฉากจบระดับบุคคล (Slice-of-Life · สละร่างปกป้องผู้คนในเขตให้รอดพ้นภัย)',
      categoryLabel: 'SLICE-OF-LIFE · GUARDIAN',
      description: `เลือกปักหลักคุ้มกันผู้รอดชีวิตทั้ง ${zoneStats.livingCount} คนใน${placeName} พาทุกคนลงสู่หลุมหลบภัยใต้ดินลึกและปิดประตูเหล็กกั้นตัวเองไว้ด้านนอกเพื่อขวางฝูงซอมบี้คลั่ง`,
      requirementSummary: `วันที่ ${day}/24 · ความไว้ใจเฉลี่ยเขต ${zoneStats.averageTrust}/25 · ช่วยคน ${savedCount}/2 ครั้ง · สติ ${Math.floor(
        s.sanity
      )}/40 · ความเป็นมนุษย์ ${Math.floor(s.humanity)}/50`,
      enabled: guardianReady,
      accentColor: 'border-emerald-400/60 bg-emerald-950/30 text-emerald-100',
      endingTitle: `ผู้เฝ้าประตูเงียบงันแห่ง${placeName}`,
      endingText: `เมื่อฝูงซอมบี้คลั่งทะลักเข้าประชิด เจ้าพาผู้รอดชีวิตทั้ง ${zoneStats.livingCount} คนใน${placeName}ลงสู่หลุมหลบภัยใต้ดินลึก แล้วดึงประตูเหล็กหนาปิดตายจากด้านนอก ใช้ร่างของตนยืนขวางฝูงผู้ติดเชื้อไม่ให้พังประตูเข้าไป แม้เจ้าจะไม่ได้กลับไปเป็นมนุษย์ แต่ทุกคนข้างในรอดปลอดภัยและจดจำเจ้าในฐานะผู้พิทักษ์เงียบงันของพวกเขาตลอดไป`,
    },
    {
      id: 'escape_companion',
      title: anyZoneMaxTrustNpc
        ? `ออกเดินทางพ้นเขตกักกันกรุงเทพฯ ไปกับ "${anyZoneMaxTrustNpc.name}"`
        : 'ออกเดินทางพ้นเขตกักกันกรุงเทพฯ (ไปพร้อมกับคนที่ไว้ใจเจ้าเต็ม 100)',
      subtitle: 'ฉากจบระดับบุคคล (Slice-of-Life · ออกเดินทางพ้นเขตกักกันพร้อมคู่หู)',
      categoryLabel: 'SLICE-OF-LIFE · COMPANION ESCAPE',
      description: anyZoneMaxTrustNpc
        ? `"${anyZoneMaxTrustNpc.name}" (${anyZoneMaxTrustNpc.role}) ไว้ใจเจ้าเต็ม 100/100 แล้ว!`
        : 'สร้างความไว้ใจกับ NPC คนใดคนหนึ่งให้เต็ม 100/100 เพื่อทริกเกอร์เหตุการณ์ชวนหนีออกจากกรุงเทพฯ',
      requirementSummary: `วันที่ ${day}/22 · NPC ไว้ใจเต็ม 100/100 · สติ ${Math.floor(s.sanity)}/45 · ความเป็นมนุษย์ ${Math.floor(s.humanity)}/45`,
      enabled: companionReady,
      companionName: anyZoneMaxTrustNpc?.name,
      accentColor: 'border-sky-400/60 bg-sky-950/30 text-sky-100',
      endingTitle: anyZoneMaxTrustNpc
        ? `ออกเดินทางพ้นเขตกักกันกรุงเทพฯ ไปพร้อมกับ "${anyZoneMaxTrustNpc.name}"`
        : 'ออกเดินทางพ้นเขตกักกันกรุงเทพฯ',
      endingText: `เจ้าและ ${
        anyZoneMaxTrustNpc?.name || 'คนที่ไว้ใจเจ้าหมดหัวใจ'
      } ลัดเลาะฝ่าแนวกั้นออกสู่ริมแม่น้ำเจ้าพระยาและล่องเรือพ้นเขตกักกันกรุงเทพมหานคร แม้หัวใจของเจ้าจะยังไม่กลับมาเต้นเหมือนมนุษย์ปกติ แต่ข้างกายเจ้ายังมีคนเป็นคนหนึ่งที่เรียกชื่อเจ้าเสมอบนเส้นทางสายใหม่นอกเมืองหลวง`,
    },
    {
      id: 'horde_breakout',
      title: 'นำฝูงตีฝ่าวงล้อมด่านกรุงเทพฯ',
      subtitle: 'ทางออกสายควบคุมฝูง (ทริกเกอร์เมื่อเตรียมเส้นทางคลองแสนแสบและควบคุมฝูงพร้อม)',
      categoryLabel: 'ESCAPE · HORDE BREAKOUT',
      description:
        'ใช้สัญญาณและเส้นทางเลียบคลองแสนแสบที่เตรียมไว้ พาฝูงผู้ติดเชื้อเคลื่อนผ่านจุดคอขวดและฝ่าแนวปิดล้อมปลายทางออกจากเขตกักกัน',
      requirementSummary: getEndingReadiness(gameState, 'horde_breakout').reasons.join(' · ') || 'เตรียมเส้นทางและควบคุมฝูงพร้อมแล้ว',
      enabled: hordeBreakoutReady,
      accentColor: 'border-purple-400/60 bg-purple-950/30 text-purple-100',
      endingTitle: 'นำฝูงตีฝ่าวงล้อมด่านกรุงเทพฯ',
      endingText:
        'เจ้าพาฝูงที่ฝึกตามสัญญาณเดินเลียบคลองแสนแสบ ผ่านจุดคอขวดที่สำรวจไว้จนถึงแนวปิดล้อมปลายทาง ฝูงไม่แตกแถวเมื่อเสียงสะท้อนดังขึ้น การเตรียมเส้นทางทำให้พวกเจ้าออกจากเขตกักกันได้สำเร็จ',
    },
    {
      id: 'conscious_exile',
      title: 'ล่องเรือพ้นแม่น้ำเจ้าพระยาในฐานะซอมบี้ผู้ครองสติ',
      subtitle: 'ฉากจบระดับบุคคล (ทริกเกอร์หลังวันที่ 32 เมื่อรู้ร่องน้ำคลองแสนแสบ ทนหิว และไม่เคยฆ่าคน)',
      categoryLabel: 'SLICE-OF-LIFE · SOLO EXILE',
      description:
        'หลังสะพานข้ามเจ้าพระยาถูกตัดขาด อาศัยความคุ้นเคยกับร่องน้ำคลองแสนแสบและการประคองสติโดยไม่เคยคร่าชีวิตคนเป็น ล่องเรือไม้ผ่านประตูระบายน้ำออกพ้นเขตกักกันก่อนฟ้าสาง',
      requirementSummary: `วันที่ ${day}/32 · สำรวจท่าเรือคลองแสนแสบ (${knewWaterRoute ? 'ครบ' : 'ยัง'}) · ทนหิว ${enduredCount}/3 ครั้ง · สติ ${Math.floor(s.sanity)}/60 · ความเป็นมนุษย์ ${Math.floor(
        s.humanity
      )}/60 · ไม่เคยฆ่าคน (${killedCount}/0 ศพ)`,
      enabled: consciousExileReady,
      accentColor: 'border-teal-400/60 bg-teal-950/30 text-teal-100',
      endingTitle: 'ล่องเรือพ้นแม่น้ำเจ้าพระยาก่อนฟ้าสาง',
      endingText:
        'ในฐานะซอมบี้ที่ยังคงรักษาสติและความเป็นมนุษย์ไว้ได้โดยไม่ยอมจำนนต่อความหิว เจ้าค้นพบช่องทางระบายน้ำที่เชื่อมออกสู่แม่น้ำเจ้าพระยา และปล่อยให้กระแสน้ำพัดเรือไม้ลำเล็กออกจากเขตกักกันกรุงเทพฯ ก่อนฟ้าสาง มุ่งหน้าสู่ดินแดนเบื้องหน้าพร้อมสติที่ยังเป็นของเจ้าเอง',
    },
  ];
}

