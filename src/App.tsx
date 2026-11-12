import EndingExperience from './components/EndingExperience';
import EndingCollection from './components/EndingCollection';
import PlayerModal from './components/PlayerModal';
import PlayerServices from './components/PlayerServices';
import {queueLifeStart} from './services/playerBackend';
import { resolveAgeDialogue, resolveLifeSimOutcomeForAge } from './data/ageDialogue';
import StoryFeed, { storyLogKey, type StoryMoment } from './components/StoryFeed';
import { generateCharacter, resolveSavedCharacter, snapshotCharacter, getCharacterAgeGroup, createCharacterState } from './data/characterPool';
import PixelCityMap from './components/PixelCityMap';
import { buildMapLocations } from './data/mapLocations';
import ZombiePortrait from './components/ZombiePortrait';
import titleBackground from './assets/title-bangkok.png?inline';
import { getEndingReadiness, getRouteGuidance, PROGRESSION_ROUTES } from './data/progressionRules';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  CheckCircle2,
  Search,
  Download,
  Upload,
  Volume2,
  VolumeX,
  ArrowRight,
  Heart,
  Flame,
  Brain,
  MapPin,
  Package,
  Users,
  BookOpen,
  Sparkles,
  AlertTriangle,
  Shuffle,
  UserCheck,
  LogOut,
  Skull,
  Calendar,
  Play,
  FileText,
  Dna,
  Activity,
  Droplets,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import {
  PastLifeRecord,
  CharacterBioDossier,
  INITIAL_SAMPLE_PAST_LIVES,
  TIMELINE_START_DATE_LABEL,
  MAX_BOMBING_DAY,
  formatTimelineDate,
  getMutationStageInfo,
  MUTATION_MILESTONES,
  MutationMilestoneEntry,
  buildPastLifeRecordFromState,
  deriveCauseOfDeath,
  deriveDeathEndingPresentation,
  getOrganicEchoPopupForLocation,
  getFixedWorldTimelineEvent,
  getProactiveAllyNpcAidModal,
  getMidGameHorizonClues,
  getSliceOfLifeAndEscapeEndings,
  getTriggeredEndingClimaxModal,
  SliceOfLifeEndingOption,
  OrganicEchoPopupEvent,
  ZonePopulationState,
  LifeSimModalEvent,
  createInitialZonePopulations,
  syncZonePopulationsWithEngineState,
  calculateZoneTrustStats,
  buildFreeformNpcInteractionModal,
  buildFreeformRoamModal,
  buildActionClimaxDecisionModal,
  getDailyWeatherAndZoneHazard,
  applyDailyWeatherAndZoneHazardTurn,
  computeEngineSurvivalDayPolicy,
  applyFinalEndingToState,
  resolveSharedActivityTurn,
  applyLifeSimModalEffectsToState,
  DangerHumanAttackScenario,
  HazardTurnAttackResult,
  normalizeCanonicalMemory,
  sanitizeCanonicalStoryFlags,
} from './data/pastLifeEchoes';
import {
  ORGANIC_ENDING_CLIMAX_EVENTS,
  EXTERNAL_AI_ROAM_EVENTS,
  EXTERNAL_AI_NPCS,
} from './data/externalEventsPack';
import { getNextTriggeredDynamicEvent } from './data/eventEngine';
import { soundFx } from './utils/soundFx';

declare global {
  interface Window {
    AfterZeroEngine?: {
      Production: {
        catalog: {
          CONTENT_VERSION: string;
          ORIGINS?: Array<{ id: string; name: string; intro?: string }>;
          STRAINS?: Array<{ id: string; name: string; rule?: string }>;
          PLACES: Record<
            string,
            {
              id?: string;
              name: string;
              short: string;
              tag?: string;
              description: string;
              neighbors?: string[];
              color?: string;
            }
          >;
          ACTIONS: Array<{
            id: string;
            name: string;
            places?: string[];
            move?: string;
            encounter?: string;
            ending?: string;
            note?: string;
            requirements?: unknown;
            cost?: Record<string, number>;
            min?: Record<string, number>;
            effects?: Array<{ type: string; key?: string; id?: string; value?: unknown }>;
          }>;
          EVENTS: Array<{
            id: string;
            title: string;
            text: string;
            trigger?: string;
            day?: number;
            travelDialogue?: boolean;
            followup?: string;
            tags?: string[];
            choices: Array<{
              id?: string;
              text: string;
              note?: string;
              pressure?: boolean;
              outcomeText?: string;
              effects?: Array<{ type: string; key?: string; id?: string; value?: unknown }>;
            }>;
          }>;
          ENDINGS: Record<string, { title: string; tag: string; color: string; text: string }>;
          NPCS: Record<string, { states: string[] }>;
          FLAGS: Record<string, { type: string; default: unknown }>;
        };
        engine: {
          create: (seed: number, options?: any) => any;
          validate: (state: any) => any;
          act: (state: any, actionId: string) => { ok: boolean; reason?: string };
          choose: (state: any, choiceIndex: number, instanceId: string, armedPrey?: boolean) => { ok: boolean; reason?: string };
          previewAction: (state: any, actionId: string) => any;
          previewChoice: (state: any, choiceIndex: number) => any;
          previewDay: (state: any) => any;
          actions: (state: any) => any[];
          viewModel: (state: any) => any;
        };
        viewModel: (state: any, extras?: any) => any;
        summarize: (state: any) => any;
        storyActionIds: string[];
      };
      Scene?: {
        draw: (canvas: HTMLCanvasElement | null, state: any, tick?: number, options?: { hideCharacter?: boolean; livingCount?: number }) => void;
      };
    };
  }
}

type GameScreenStage = 'login' | 'hub' | 'playing';
type MobileDrawerTab = 'play' | 'map' | 'bag' | 'people' | 'journal';
type DesktopSideTab = 'map' | 'bag' | 'people' | 'journal';

import { prepareNpcModal, npcChoiceReason, applyNpcRelationships, npcEncounterWitnesses, validateZoneRelationships, migrateSavedRelationships } from './data/npcInteractions';
import { npcHuntEffects, npcPosture, relationshipTier } from './data/npcRelationships.js';
const STORAGE_KEY_USER = 'after_zero_v10_user_profile';
const STORAGE_KEY_STATE = 'after_zero_v10_save_state';
const STORAGE_KEY_ARCHIVE = 'after_zero_v10_past_lives_v3';
const STORAGE_KEY_BIO_ID = 'after_zero_v10_bio_id';
const STORAGE_KEY_TRIGGERED_ECHOES = 'after_zero_v10_triggered_echoes';
const STORAGE_KEY_ZONE_POPS = 'after_zero_v10_zone_populations';
const STORAGE_KEY_MUTATION_MILESTONES = 'after_zero_v10_mutation_milestones';
const STORAGE_KEY_NUMERIC_SPOILERS = 'after_zero_v10_numeric_spoilers';
const STORAGE_KEY_ROUTE_HINTS = 'after_zero_v10_route_hints';
const STORAGE_KEY_ROUTE_ASSISTANCE = 'after_zero_v10_route_assistance';
const STORAGE_KEY_ROUTE_SESSION = 'after_zero_v10_route_guidance_session';
type RouteGuidanceSession = {runId: string; pinnedRouteId: string | null; dismissedRouteIds: string[]};

function readPreference(key: string): boolean {
  try { return localStorage.getItem(key) === 'true'; } catch { return false; }
}

const NARRATIVE_ACTION_HINTS: Record<string, string> = {
  scavenge: 'คุ้ยหาเสบียงไว้แบ่งให้คนเป็น แต่อาจโดนเศษเหล็กบาดและไม่ช่วยให้อิ่ม',
  endure: 'ข่มความกระหายเลือดไว้เงียบ ๆ อาจหิวขึ้นตามเวลาแต่ไม่ต้องทำร้ายใคร',
  corpse: 'ตามกลิ่นเนื้อในรถพยาบาล อาจประทังความหิวได้โดยไม่ต้องล่าคนเป็น',
  blood: 'ลอบเข้าห้องเก็บเลือดสำรอง เพื่อเลือกดื่มประทังชีวิตหรือแบ่งให้คนเจ็บ',
  rest: 'ซ่อนตัวพักเย็บเนื้อเยื่อในมุมมืด ช่วยฟื้นฟูบาดแผลและทำให้จิตใจสงบ',
  remember: 'เพ่งมองรูปถ่ายเก่าเพื่อยึดเหนี่ยวสติและหัวใจ แม้ความหิวจะคืบคลาน',
  medicate: 'ใช้ชุดเวชภัณฑ์ปะติดปะต่อบาดแผลฉกรรจ์ตามร่างให้กลับมาขยับได้',
  labsearch: 'รื้อค้นหลอดตัวอย่างและเวชภัณฑ์ในห้องแล็บมืด เสี่ยงถูกเศษกระจกบาด',
  research: 'เทียบเคียงตัวอย่างเชื้อกับบันทึกในแล็บ ได้ความรู้แต่ต้องใช้สมาธิสูง',
  share: 'วางเสบียงแบ่งให้ผู้รอดชีวิตจากระยะห่าง ช่วยให้ผู้คนเริ่มเปิดใจ',
  hunt: 'สะกดรอยตามกลิ่นเลือดคนเป็น ยังเลือกได้ว่าจะล่า ช่วยเหลือ หรือถอยห่าง',
  recruit: 'ส่งเสียงคลื่นต่ำรวบรวมฝูงในอุโมงค์ให้ฟังคำสั่ง แต่อาจกัดกร่อนสติ',
  adapt: 'กระตุ้นเซลล์ด้วยตัวอย่างเชื้อให้กลายพันธุ์เร็วขึ้น แลกด้วยความเจ็บปวด',
  raid: 'บุกฝ่าแนวกั้นทหารเพื่อชิงของ เสี่ยงบาดเจ็บสาหัสและกระหายเลือดหนัก',
  campaign: 'สั่งการฝูงบุกขยายแนวระบาด สูญเสียความเป็นคนและบั่นทอนสติอย่างหนัก',
  cure: 'ก้าวเข้าสู่การตัดสินใจครั้งสำคัญเพื่อทวงคืนชีพจรและความเป็นมนุษย์',
  crown: 'ก้าวขึ้นสู่จุดสูงสุดเหนือฝูงผู้ติดเชื้อใต้ดินในฐานะผู้ปกครอง',
  evolve: 'ก้าวข้ามขีดจำกัดเดิมของทั้งมนุษย์และซอมบี้ไปสู่สายพันธุ์ใหม่',
  extinguish: 'ส่งคลื่นสัญญาณครั้งสุดท้ายจากยอดหอวิทยุเพื่อปิดฉากยุคของมนุษย์',
};

export interface ThreatAmbushAlert {
  scenario: DangerHumanAttackScenario;
  localThreat: number;
  chancePercent: number;
  hpLoss: number;
  sanityLoss: number;
  remainingHp: number;
  remainingSanity: number;
  day: number;
  locationName: string;
}

function sanitizeNonSpoilerReason(rawReason: string): string {
  return rawReason
    .replace(/สติต่ำกว่า\s*\d+\s*:\s*/g, 'สติพร่าเลือนเกินไป: ')
    .replace(/\s*\(ต้องมีสติอย่างน้อย\s*\d+\)/g, '')
    .replace(/\s*\(ความไว้ใจ\s*\d+\)/g, ' (อีกฝ่ายยังไม่ไว้ใจพอ)')
    .replace(/ต้องมี([^\d]+)\s*\d+\s*(ชิ้น|ชุด|หลอด|ถุง)/g, 'ต้องมี$1ติดตัวก่อน')
    .replace(/มีสติ\s*\d+\s*ความเป็นมนุษย์\s*\d+\s*และความไว้ใจ\s*\d+/g, 'มีสติ ความเป็นมนุษย์ และความไว้ใจจากผู้คนเพียงพอ');
}

function translateNumericNoteToNarrative(
  rawNote: string,
  options?: {
    actionId?: string;
    enabled?: boolean;
    disabledReason?: string;
  }
): string {
  if (!rawNote && !options?.disabledReason) return '';
  if (options?.enabled === false) {
    const lockText = options.disabledReason || rawNote;
    return sanitizeNonSpoilerReason(lockText);
  }
  const aid = options?.actionId || '';
  if (aid && NARRATIVE_ACTION_HINTS[aid]) {
    return NARRATIVE_ACTION_HINTS[aid];
  }
  if (aid.startsWith('bkk_') && aid.endsWith('.work')) {
    return 'ลงมือช่วยงานผู้คนในย่านนี้ตามความถนัด อาจเหนื่อยและหิวบ้างแต่ช่วยให้คนเปิดใจ';
  }
  if (aid.startsWith('bkk_') && aid.endsWith('.settle')) {
    return 'ตัดสินใจครั้งสำคัญเพื่อตั้งหลักดูแลผู้คนในย่านนี้ไปจนถึงวันสุดท้าย';
  }
  if (aid.startsWith('route.vaccine.')) {
    return 'รวบรวมข้อมูลและเตรียมความพร้อมสำหรับแนวทางเซรุ่ม อาจเหนื่อยและหิวขึ้นเล็กน้อย';
  }
  if (aid.startsWith('route.horde.')) {
    return 'สำรวจจุดยุทธศาสตร์และฝึกควบคุมจังหวะของฝูง อาจเหนื่อยและหิวขึ้นเล็กน้อย';
  }
  if (aid.startsWith('route.evolution.')) {
    return 'สังเกตและทดสอบการตอบสนองของร่างที่กำลังเปลี่ยนไป อาจเหนื่อยและหิวขึ้นเล็กน้อย';
  }

  const phrases: string[] = [];
  const addPhrase = (p: string) => {
    if (p && !phrases.includes(p)) phrases.push(p);
  };

  const parts = String(rawNote)
    .split(/\s*(?:·|,)\s*/)
    .map(s => s.trim())
    .filter(Boolean);

  for (const part of parts) {
    // Kill / Save
    if (/ฆ่าคน\s*\+?\d+/.test(part)) {
      addPhrase('พรากชีวิตคนเป็น');
      continue;
    }
    if (/ช่วยคน\s*\+?\d+/.test(part)) {
      addPhrase('ช่วยต่อลมหายใจให้ผู้รอดชีวิต');
      continue;
    }

    // HP / สุขภาพ / สภาพร่าง / ร่างกาย
    const hpMinus = part.match(/(?:สภาพร่าง|สุขภาพ|ร่างกาย)\s*-\s*(\d+)/);
    if (hpMinus) {
      const val = Number(hpMinus[1]);
      addPhrase(val >= 12 ? 'เสี่ยงบาดเจ็บหนัก' : 'อาจบาดเจ็บตามร่างกาย');
      continue;
    }
    if (/(?:สภาพร่าง|สุขภาพ|ร่างกาย)\s*\+\s*\d+/.test(part)) {
      addPhrase('ช่วยฟื้นฟูบาดแผล');
      continue;
    }

    // Hunger / ความหิว
    const hungerPlus = part.match(/(?:ความหิว\s*\+|หิวเพิ่ม\s*|หิว\s*\+)\s*(\d+)/);
    if (hungerPlus) {
      const val = Number(hungerPlus[1]);
      addPhrase(val >= 8 ? 'อาจหิวโหยขึ้นมาก' : 'อาจเริ่มหิวขึ้น');
      continue;
    }
    const hungerMinus = part.match(/(?:ความหิว\s*-\s*(\d+)|ลดหิว|หิวลด|อิ่มมาก)/);
    if (hungerMinus) {
      const val = hungerMinus[1] ? Number(hungerMinus[1]) : 30;
      addPhrase(val >= 35 || /มาก/.test(part) ? 'คลายความหิวโหยได้มาก' : 'ช่วยประทังความหิว');
      continue;
    }
    if (/ยังหิว|ไม่ลดความหิว|ไม่ได้ทำให้อิ่ม/.test(part)) {
      addPhrase('ไม่ช่วยคลายความหิว');
      continue;
    }

    // Sanity / สติ
    const sanityMinus = part.match(/สติ\s*-\s*(\d+)/);
    if (sanityMinus) {
      const val = Number(sanityMinus[1]);
      addPhrase(val >= 7 ? 'บั่นทอนสติอย่างหนัก' : 'อาจทำให้จิตใจสั่นคลอน');
      continue;
    }
    if (/สติ\s*\+\s*\d+/.test(part)) {
      addPhrase('ช่วยให้จิตใจสงบขึ้น');
      continue;
    }

    // Humanity / ความเป็นมนุษย์ / ความเห็นใจ
    if (/(?:ความเป็นมนุษย์|ความเห็นใจ)\s*-\s*\d+/.test(part)) {
      addPhrase('สูญเสียความเป็นคนในใจ');
      continue;
    }
    if (/(?:ความเป็นมนุษย์|ความเห็นใจ)\s*\+\s*\d+/.test(part)) {
      addPhrase('รักษาหัวใจความเป็นมนุษย์');
      continue;
    }

    // Trust / ความไว้ใจ
    if (/ความไว้ใจ.*(?:\+\s*[1-9]|เพิ่ม)/.test(part)) {
      if (/ไว้ใจขึ้นยาก/.test(part)) {
        addPhrase('ช่วยให้เริ่มเปิดใจ (แต่คนในย่านยังระแวงอยู่)');
      } else {
        addPhrase('ช่วยให้ผู้คนเริ่มเปิดใจ');
      }
      continue;
    }
    if (/ความไว้ใจ.*\+\s*0|ยังไม่เพิ่มจากการทำซ้ำ/.test(part)) {
      addPhrase('การทำซ้ำเดิมอาจไม่ช่วยให้เปิดใจเพิ่ม');
      continue;
    }
    if (/ความไว้ใจ.*(?:-\s*\d+|ลด)/.test(part)) {
      addPhrase('ทำให้ผู้คนหวาดระแวง');
      continue;
    }

    // Mutation / กลายพันธุ์
    if (/(?:การ)?กลายพันธุ์\s*\+\s*\d+/.test(part)) {
      addPhrase('กระตุ้นให้ร่างกายกลายพันธุ์ขึ้น');
      continue;
    }
    if (/(?:การ)?กลายพันธุ์\s*-\s*\d+/.test(part)) {
      addPhrase('ช่วยชะลออาการกลายพันธุ์');
      continue;
    }

    // Research / งานวิจัย / ความเข้าใจเชื้อ
    if (/(?:งานวิจัย|ความเข้าใจเชื้อ)\s*\+\s*\d+/.test(part)) {
      addPhrase('เข้าใจธรรมชาติของเชื้อมากขึ้น');
      continue;
    }

    // Horde / อำนาจฝูง / ขยายการระบาด
    if (/(?:อำนาจฝูง|ขยายการระบาด)\s*\+?\s*\d+/.test(part)) {
      addPhrase('แผ่อิทธิพลเหนือฝูงผู้ติดเชื้อ');
      continue;
    }
    if (/อำนาจฝูง\s*-\s*\d+/.test(part)) {
      addPhrase('สูญเสียการควบคุมฝูงบางส่วน');
      continue;
    }

    // Items
    if (/(?:ใช้เสบียง|เสบียงมนุษย์\s*-\s*\d+|อาหารกระป๋อง\s*-\s*\d+)/.test(part)) {
      addPhrase('ใช้เสบียงอาหารที่มี');
      continue;
    }
    if (/(?:เสบียงมนุษย์|อาหารกระป๋อง)\s*\+\s*\d+/.test(part)) {
      addPhrase('อาจได้เสบียงอาหารติดมือ');
      continue;
    }
    if (/(?:ใช้ชุดเย็บแผล|ใช้เวชภัณฑ์|ชุดเย็บแผล\s*-\s*\d+|เวชภัณฑ์\s*-\s*\d+)/.test(part)) {
      addPhrase('ใช้ชุดเวชภัณฑ์ที่มี');
      continue;
    }
    if (/(?:ชุดเย็บแผล|เวชภัณฑ์)\s*\+\s*\d+/.test(part)) {
      addPhrase('อาจได้ชุดเวชภัณฑ์ติดมือ');
      continue;
    }
    if (/(?:ใช้ตัวอย่าง|ตัวอย่างเชื้อ\s*-\s*\d+)/.test(part)) {
      addPhrase('ใช้หลอดตัวอย่างเชื้อ');
      continue;
    }
    if (/ตัวอย่าง(?:เชื้อ)?\s*\+\s*\d+/.test(part)) {
      addPhrase('ได้หลอดตัวอย่างเชื้อ');
      continue;
    }
    if (/(?:ถุง)?เลือดพกพา\s*\+\s*\d+/.test(part)) {
      addPhrase('ได้ถุงเลือดสำรองพกติดตัว');
      continue;
    }

    // Clean remaining descriptive segment if it has no raw +/- numbers
    const cleaned = part
      .replace(/\s*\(ภัยพื้นที่[^)]*\)/g, ' (ผู้คนในย่านระแวงหนัก)')
      .replace(/เขาจะไม่ให้เข้าใกล้\s*\d+\s*วัน/g, 'เขาจะไม่ยอมให้เข้าใกล้ไปอีกพักใหญ่')
      .replace(/หิวจัด:\s*สภาพร่าง\s*-\d+\s*และสติ\s*-\d+\s*เพิ่มเติม/g, 'อาการหิวจัดจะยิ่งทรมานร่างและสติ')
      .replace(/[+-]?\d+\s*(?:วัน|ชิ้น|ถุง|หลอด|ศพ|ระยะ|%)/g, '')
      .trim();

    if (
      cleaned &&
      !/^[+-]?\d+$/.test(cleaned) &&
      !/^(?:1 วัน|กิจกรรมนี้ใช้|ไม่เปลี่ยนสถานะ|ไม่ใช้สิ่งของ)$/.test(cleaned)
    ) {
      addPhrase(cleaned);
    }
  }

  if (phrases.length === 0) {
    return 'ก้าวเดินไปตามการตัดสินใจของเจ้า';
  }
  return phrases.slice(0, 3).join(' · ');
}

const LEGACY_02_STORY_ACTION_IDS = new Set(['story.clinic', 'story.pack', 'story.remnant']);
const CONDITIONAL_CARE_ACTION_IDS = new Set([
  'next.rest',
  'c40.clinic_scavenge',
  'c40.clinic_perimeter_rest',
  'c42.hospital_supply_cache',
  'c42.shelter_backdoor',
]);

function classifyActionLayer(id: string, move?: string, ending?: string): string {
  if (move) return 'เดินทาง';
  if (id.startsWith('bkk_')) return 'ย่านอาชีพ';
  if (id.startsWith('route.')) return 'เส้นทาง';
  if (ending) return 'บทจบ';
  if (LEGACY_02_STORY_ACTION_IDS.has(id)) return 'เนื้อเรื่อง';
  if (id.startsWith('next.')) return 'เนื้อเรื่อง';
  if (id.startsWith('c40.')) return 'คลินิก';
  if (id.startsWith('c41.')) return 'ฝูง';
  if (id.startsWith('c42.')) return 'ความทรงจำ';
  return 'พื้นฐาน';
}

function computeStateDeltas(before: any, after: any): string[] {
  if (!before || !after) return [];
  const deltas: string[] = [];
  const killDiff = Math.round((after.memory?.killed || 0) - (before.memory?.killed || 0));
  if (killDiff > 0) {
    deltas.push(`ฆ่าคน +${killDiff} ศพ`);
  }
  const statLabels: Record<string, string> = {
    hp: 'สภาพร่าง',
    hunger: 'ความหิว',
    sanity: 'สติ',
    humanity: 'ความเป็นมนุษย์',
    research: 'ความเข้าใจเชื้อ',
    mutation: 'การกลายพันธุ์',
    horde: 'อำนาจฝูง',
    campaign: 'ขยายแนวรบ',
  };
  for (const [k, label] of Object.entries(statLabels)) {
    const diff = Math.round((after.stats?.[k] || 0) - (before.stats?.[k] || 0));
    if (diff !== 0) {
      deltas.push(`${label} ${diff > 0 ? '+' + diff : diff}`);
    }
  }
  const itemLabels: Record<string, string> = {
    supplies: 'เสบียงมนุษย์',
    medicine: 'ชุดเย็บแผล',
    samples: 'ตัวอย่างเชื้อ',
  };
  for (const [k, label] of Object.entries(itemLabels)) {
    const diff = Math.round((after.items?.[k] || 0) - (before.items?.[k] || 0));
    if (diff !== 0) {
      deltas.push(`${label} ${diff > 0 ? '+' + diff : diff}`);
    }
  }
  const carriedBloodDiff = (after.carriedBloodBags ?? 0) - (before.carriedBloodBags ?? 0);
  if (carriedBloodDiff !== 0) {
    deltas.push(`ถุงเลือดพกพา ${carriedBloodDiff > 0 ? '+' + carriedBloodDiff : carriedBloodDiff} ถุง`);
  }
  return deltas;
}

export default function App() {
  const [screenStage, setScreenStage] = useState<GameScreenStage>('login');
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_USER) || 'ผู้บันทึกเขตศูนย์ (Subject-00)';
    } catch {
      return 'ผู้บันทึกเขตศูนย์ (Subject-00)';
    }
  });
  const [loginInput, setLoginInput] = useState<string>(playerName);
  const [showEndingCollection, setShowEndingCollection] = useState(false);
  const [showPlayerGuide, setShowPlayerGuide] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(() => readPreference('after_zero_v10_onboarding_seen'));
  const [localSaveStatus, setLocalSaveStatus] = useState<{savedAt: number | null; error: boolean}>({savedAt: null, error: false});
  const storageFailures = useRef(new Set<string>());
  const persistPlayerData = (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      storageFailures.current.delete(key);
      setLocalSaveStatus({savedAt: Date.now(), error: storageFailures.current.size > 0});
    } catch {
      storageFailures.current.add(key);
      setLocalSaveStatus(previous => ({...previous, error: true}));
    }
  };
  const closePlayerGuide = () => {
    setShowPlayerGuide(false);
    setOnboardingSeen(true);
    persistPlayerData('after_zero_v10_onboarding_seen', 'true');
  };
  useEffect(() => {persistPlayerData(STORAGE_KEY_USER, playerName);}, [playerName]);

  const [mobileTab, setMobileTab] = useState<MobileDrawerTab>('play');
  const [desktopSideTab, setDesktopSideTab] = useState<DesktopSideTab>('map');

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [ambientEnabled, setAmbientEnabled] = useState<boolean>(false);
  const [showRouteHints, setShowRouteHints] = useState(() => readPreference(STORAGE_KEY_ROUTE_HINTS));
  const [routeAssistanceEnabled, setRouteAssistanceEnabled] = useState(() => readPreference(STORAGE_KEY_ROUTE_ASSISTANCE));
  const [routeGuidanceSession, setRouteGuidanceSession] = useState<RouteGuidanceSession>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_ROUTE_SESSION) || 'null');
      const known = (id: unknown) => PROGRESSION_ROUTES.some(route => route.id === id);
      if (saved && typeof saved.runId === 'string' && (saved.pinnedRouteId === null || known(saved.pinnedRouteId)) &&
          Array.isArray(saved.dismissedRouteIds) && saved.dismissedRouteIds.length <= PROGRESSION_ROUTES.length && saved.dismissedRouteIds.every(known)) return saved;
    } catch { /* Invalid preferences do not affect the character save. */ }
    return {runId: '', pinnedRouteId: null, dismissedRouteIds: []};
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ROUTE_HINTS, String(showRouteHints));
      localStorage.setItem(STORAGE_KEY_ROUTE_ASSISTANCE, String(routeAssistanceEnabled));
    } catch { /* Preferences remain usable for this session when storage is unavailable. */ }
  }, [showRouteHints, routeAssistanceEnabled]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_ROUTE_SESSION, JSON.stringify(routeGuidanceSession)); } catch { /* Keep the in-memory pin. */ }
  }, [routeGuidanceSession]);
  const [showNumericSpoilers, setShowNumericSpoilers] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_NUMERIC_SPOILERS) === 'true';
    } catch {
      return false;
    }
  });

  // Silent Past Lives Archive
  const [pastLives, setPastLives] = useState<PastLifeRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ARCHIVE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_SAMPLE_PAST_LIVES;
  });

  // Store the complete rolled identity; IDs alone cannot restore generated characters.
  const [currentBio, setCurrentBio] = useState<CharacterBioDossier>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STATE);
      const legacyId = localStorage.getItem(STORAGE_KEY_BIO_ID) || undefined;
      if (raw || legacyId) return resolveSavedCharacter(raw ? JSON.parse(raw) : null, legacyId);
    } catch { /* A malformed save falls back to a fresh character. */ }
    return generateCharacter(Math.floor(Math.random() * 0x100000000));
  });
  const currentBioId = currentBio.id;

  // Pending Newly Rolled Character Dossier Popup
  const [rolledPreviewCandidate, setRolledPreviewCandidate] = useState<{
    state: any;
    bio: CharacterBioDossier;
    viewModel: any;
  } | null>(null);

  // Surrender to Zombie Instinct confirmation modal
  const [showSurrenderConfirmModal, setShowSurrenderConfirmModal] = useState<boolean>(false);

  // Active Freeform Life-Sim Blocking Modal Event
  const [activeLifeSimModal, setActiveLifeSimModal] = useState<LifeSimModalEvent | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STATE);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        parsed.memory = normalizeCanonicalMemory(parsed.memory);
        if (parsed.story?.flags && window.AfterZeroEngine?.Production?.catalog?.FLAGS) {
          parsed.story.flags = sanitizeCanonicalStoryFlags(parsed.story.flags, window.AfterZeroEngine.Production.catalog.FLAGS);
        }
      }
      return window.AfterZeroEngine?.Production?.engine.validate(parsed).npcEncounter || null;
    }
    catch { return null; }
  });
  const resolvingModalRef = useRef<string | null>(null);

  // Active Mutation Milestone Alert Modal (25, 50, 75)
  // Active Threat Ambush Alert Modal & Screen Shake state
  const [activeThreatAmbushAlert, setActiveThreatAmbushAlert] =
    useState<ThreatAmbushAlert | null>(null);
  const [isScreenShaking, setIsScreenShaking] = useState<boolean>(false);

  const [activeMutationMilestoneAlert, setActiveMutationMilestoneAlert] =
    useState<MutationMilestoneEntry | null>(null);

  // Track recorded mutation milestones (25, 50, 75) in the current life
  const [recordedMutationMilestones, setRecordedMutationMilestones] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MUTATION_MILESTONES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Track which subtle echoes, fixed timeline events, and ally aid events have triggered in this life
  const [triggeredEchoIds, setTriggeredEchoIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRIGGERED_ECHOES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [importJsonText, setImportJsonText] = useState<string>('');
  const [showImportBox, setShowImportBox] = useState<boolean>(false);
  const [journalSubTab, setJournalSubTab] = useState<'story' | 'clues' | 'save'>('story');
  const [saveStatusFeedback, setSaveStatusFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedStoryDay, setSelectedStoryDay] = useState<number | 'all'>('all');

  // Initialize or restore game state
  const restoredRunRef = useRef(false);
  const [gameState, setGameState] = useState<any>(() => {
    const prod = window.AfterZeroEngine?.Production;
    if (!prod) return null;
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEY_STATE);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (parsed && typeof parsed === 'object') {
          parsed.memory = normalizeCanonicalMemory(parsed.memory);
          if (parsed.story?.flags && prod.catalog?.FLAGS) {
            parsed.story.flags = sanitizeCanonicalStoryFlags(parsed.story.flags, prod.catalog.FLAGS);
          }
        }
        resolveSavedCharacter(parsed, localStorage.getItem(STORAGE_KEY_BIO_ID) || undefined, currentBio);
        const validated = prod.engine.validate(parsed);
        validated.memory = normalizeCanonicalMemory(validated.memory);
        const savedZones=parsed.npcZones || JSON.parse(localStorage.getItem(STORAGE_KEY_ZONE_POPS)||'null');
        if(savedZones)migrateSavedRelationships(validated,savedZones);
        validated.carriedBloodBags = Number(parsed.carriedBloodBags || 0);
        validated.characterProfile = snapshotCharacter(currentBio);
        validated.roamCooldowns = (parsed && typeof parsed.roamCooldowns === 'object' && parsed.roamCooldowns !== null && !Array.isArray(parsed.roamCooldowns)) ? parsed.roamCooldowns : {};
        validated.asokWreckDepletedParts = Array.isArray(parsed?.asokWreckDepletedParts) ? parsed.asokWreckDepletedParts.filter((p: any) => typeof p === 'string') : [];
        restoredRunRef.current = true;
        return validated;
      }
    } catch {
      // Fallback to fresh game state
    }
    const seed = currentBio.generationSeed ?? Math.floor(Date.now() % 100000);
    const fresh = createCharacterState(prod, currentBio, seed);
    return structuredClone(fresh);
  });
  const [hasStartedRun, setHasStartedRun] = useState(restoredRunRef.current);

  useEffect(() => {
    const runId = gameState?.runId || '';
    setRouteGuidanceSession(previous => {
      if (previous.runId === runId && routeAssistanceEnabled && !gameState?.ending) return previous;
      if (previous.runId === runId && !previous.pinnedRouteId && previous.dismissedRouteIds.length === 0) return previous;
      return {runId, pinnedRouteId: null, dismissedRouteIds: []};
    });
  }, [gameState?.runId, Boolean(gameState?.ending), routeAssistanceEnabled]);

  // Per-Zone Survivor Populations & Individual NPC Trust State
  const [zonePopulations, setZonePopulations] = useState<Record<string, ZonePopulationState>>(() => {
    try {
      const savedState=JSON.parse(localStorage.getItem(STORAGE_KEY_STATE)||'null');
      const saved = savedState?.npcZones ? JSON.stringify(savedState.npcZones) : localStorage.getItem(STORAGE_KEY_ZONE_POPS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.hospital && parsed.streets) return validateZoneRelationships(parsed);
      }
    } catch {
      // ignore
    }
    return createInitialZonePopulations(Math.floor(Date.now() % 100000));
  });

  const [actionToast, setActionToast] = useState<string | null>(null);
  const [modalErrorToast, setModalErrorToast] = useState<string | null>(null);

  useEffect(() => {
    if (!actionToast) return;
    const t = setTimeout(() => setActionToast(null), 4500);
    return () => clearTimeout(t);
  }, [actionToast]);
  const [latestStory, setLatestStory] = useState<StoryMoment | null>(null);
  const [isCareExpanded, setIsCareExpanded] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const [recordedCurrentEndingRunId, setRecordedCurrentEndingRunId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const production = window.AfterZeroEngine?.Production;

  // Sync Story NPCs from engine state into Zone Populations
  const syncedZonePopulations = useMemo(() => {
    return syncZonePopulationsWithEngineState(zonePopulations, gameState);
  }, [zonePopulations, gameState]);

  const currentZonePop: ZonePopulationState | undefined = useMemo(() => {
    if (!gameState) return undefined;
    return syncedZonePopulations[gameState.place || 'shelter'];
  }, [syncedZonePopulations, gameState]);

  const discoveredNpcs = currentZonePop?.npcs.filter(npc => npc.met || npc.seen) ?? [];
  const knownNpcCount = discoveredNpcs.filter(npc => npc.met && npc.alive).length;
  const undiscoveredNpc = currentZonePop?.npcs.find(npc => npc.alive && !npc.met && !npc.seen);
  const huntCandidate = currentZonePop?.npcs.find(npc => npc.alive && npc.localResident && !npc.met && !npc.seen)
    ?? currentZonePop?.npcs.find(npc => npc.alive);
  const pendingHunt = gameState?.pending?.eventId === 'prey';
  const boundHuntNpcId = pendingHunt ? gameState.pending.context?.huntTargetId : undefined;
  const huntTarget = boundHuntNpcId
    ? currentZonePop?.npcs.find(npc => npc.alive && npc.id === boundHuntNpcId)
    : huntCandidate;
  const armedHuntTarget = pendingHunt && huntTarget ? npcPosture(huntTarget, gameState.day || 1).armed : false;
  const currentZoneTrustStats = useMemo(() => {
    return calculateZoneTrustStats(currentZonePop);
  }, [currentZonePop]);

  // Collapsible state for NPC Crisis Alerts on Mobile Dashboard & People Tab
  const [isCrisisListExpanded, setIsCrisisListExpanded] = useState<boolean>(false);
  const [isPeopleCrisisSectionExpanded, setIsPeopleCrisisSectionExpanded] = useState<boolean>(true);
  const [expandedNpcCardCrisisIds, setExpandedNpcCardCrisisIds] = useState<Record<string, boolean>>({});
  const [travelGoalId, setTravelGoalId] = useState<string | null>(null);

  // Active unresolved NPC crises in the current zone
  const activeZoneCrises = useMemo(() => {
    if (!currentZonePop || !gameState) return [];
    const currentDay = gameState.day || 1;
    return currentZonePop.npcs.filter(
      npc => npc.alive && !npc.crisisResolved && npc.crisisDay && currentDay >= npc.crisisDay
    );
  }, [currentZonePop, gameState]);

  // Active unresolved NPC crises across all Bangkok zones (current zone prioritized first)
  const allActiveCityCrises = useMemo(() => {
    if (!syncedZonePopulations || !gameState) return [];
    const currentDay = gameState.day || 1;
    const currentPlaceId = gameState.place || 'shelter';
    const placesCatalog = production?.catalog?.PLACES || {};
    const list: Array<{
      npc: ZonePopulationState['npcs'][number];
      placeId: string;
      placeName: string;
      isCurrentZone: boolean;
    }> = [];

    Object.entries(syncedZonePopulations).forEach(([placeId, zonePop]) => {
      if (placeId === 'tower' && syncedZonePopulations.radio) return;
      const canonicalPlaceId = placeId === 'tower' ? 'radio' : placeId;
      const placeInfo = placesCatalog[canonicalPlaceId];
      const placeName = placeInfo?.short || placeInfo?.name || zonePop.placeName || canonicalPlaceId;
      const isCurrentZone = canonicalPlaceId === currentPlaceId;
      zonePop.npcs.forEach(npc => {
        if (npc.alive && !npc.crisisResolved && npc.crisisDay && currentDay >= npc.crisisDay) {
          list.push({
            npc,
            placeId: canonicalPlaceId,
            placeName,
            isCurrentZone,
          });
        }
      });
    });

    return list.sort((a, b) => {
      if (a.isCurrentZone !== b.isCurrentZone) return a.isCurrentZone ? -1 : 1;
      return (a.npc.crisisDay || 99) - (b.npc.crisisDay || 99);
    });
  }, [syncedZonePopulations, gameState, production]);

  // System 1: Current Mutation Stage Info
  const currentMutationStage = useMemo(() => {
    return getMutationStageInfo(gameState?.stats?.mutation || 0);
  }, [gameState?.stats?.mutation]);

  // Current Kill Count & Humanity
  const currentKillCount = Number(gameState?.memory?.killed || 0);
  const currentHumanity = Math.floor(gameState?.stats?.humanity ?? 50);

  // Persist state, past lives, bio, and zone populations to localStorage
  useEffect(() => {
    if (hasStartedRun && gameState) {
      persistPlayerData(STORAGE_KEY_STATE, {...gameState, npcZones: syncedZonePopulations});
    }
  }, [hasStartedRun, gameState, syncedZonePopulations]);

  // Monitor mutation level and auto-record significant milestones (25, 50, 75) to the player's life log / journal
  useEffect(() => {
    if (!gameState || !gameState.stats || gameState.ending) return;
    const currentMut = Math.floor(gameState.stats.mutation || 0);
    const thresholds: (25 | 50 | 75)[] = [25, 50, 75];

    for (const th of thresholds) {
      if (currentMut >= th && !recordedMutationMilestones.includes(th)) {
        const milestone = MUTATION_MILESTONES[th];
        if (milestone) {
          setRecordedMutationMilestones(prev =>
            prev.includes(th) ? prev : [...prev, th]
          );

          // Prepend distinct mutation milestone log into the state
          setGameState((prev: any) => {
            if (!prev) return prev;
            const updated = structuredClone(prev);
            const entryText = `[บันทึกการกลายพันธุ์ · ${milestone.category}] ${milestone.awakeningText}`;
            const logEntry = {
              id: Date.now() + th,
              day: updated.day || 1,
              text: entryText,
              kind: 'mutation_milestone',
            };
            updated.log = [logEntry, ...(updated.log || [])].slice(0, 70);
            return updated;
          });

          // Trigger high-priority alert popup
          setActiveMutationMilestoneAlert(milestone);
          if (soundEnabled) soundFx.playMutationAwakening();
          break; // Trigger one milestone modal at a time
        }
      }
    }
  }, [gameState?.stats?.mutation, recordedMutationMilestones, soundEnabled]);

  // Sync SoundManager flags and procedural Bangkok ambient soundscape
  useEffect(() => {
    soundFx.enabled = soundEnabled;
    soundFx.ambientEnabled = soundEnabled && ambientEnabled;
    if (screenStage === 'playing' && gameState) {
      soundFx.syncSceneAmbience(gameState.place, gameState.ending?.id);
    } else {
      soundFx.stopAmbience();
    }
  }, [soundEnabled, ambientEnabled, screenStage, gameState?.place, gameState?.ending?.id]);

  useEffect(() => {
    persistPlayerData(STORAGE_KEY_ARCHIVE, pastLives);
  }, [pastLives]);

  useEffect(() => {
    if (!hasStartedRun) return;
    persistPlayerData(STORAGE_KEY_BIO_ID, currentBioId);
  }, [hasStartedRun, currentBioId]);

  useEffect(() => {
    if (!hasStartedRun) return;
    persistPlayerData(STORAGE_KEY_TRIGGERED_ECHOES, triggeredEchoIds);
  }, [hasStartedRun, triggeredEchoIds]);

  useEffect(() => {
    if (!hasStartedRun) return;
    persistPlayerData(STORAGE_KEY_MUTATION_MILESTONES, recordedMutationMilestones);
  }, [hasStartedRun, recordedMutationMilestones]);

  useEffect(() => {
    if (!hasStartedRun) return;
    persistPlayerData(STORAGE_KEY_ZONE_POPS, syncedZonePopulations);
  }, [hasStartedRun, syncedZonePopulations]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NUMERIC_SPOILERS, showNumericSpoilers ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, [showNumericSpoilers]);

  // Draw the procedural pixel-art scene canvas
  useEffect(() => {
    const scene = window.AfterZeroEngine?.Scene;
    if (!scene || typeof scene.draw !== 'function' || !gameState) return;
    if (screenStage === 'playing' && canvasRef.current) {
      scene.draw(canvasRef.current, gameState, gameState.day || 1, { hideCharacter: true, livingCount: currentZoneTrustStats.livingCount });
    }
  }, [screenStage, gameState, mobileTab, currentZoneTrustStats.livingCount]);

  // Global reputation and the average trust of this zone are separate quantities.
  const effectiveGameState = useMemo(() => {
    if (!gameState) return null;
    const clone = structuredClone(gameState);
    clone.memory = normalizeCanonicalMemory(clone.memory);
    if (clone.story?.flags && production?.catalog?.FLAGS) {
      clone.story.flags = sanitizeCanonicalStoryFlags(clone.story.flags, production.catalog.FLAGS);
    }
    if (clone.ending) {
      clone.pending = null;
      const derived = deriveDeathEndingPresentation(
        gameState,
        currentBio,
        {
          id: gameState.ending.id,
          title: gameState.ending.title,
          text: gameState.ending.text,
          causeCode: gameState.ending.causeCode,
        },
        syncedZonePopulations
      );
      clone.ending.causeCode = derived.cause.code.toLowerCase();
      clone.ending.causeOfDeath = derived.cause;
      clone.ending.title = derived.title;
      clone.ending.text = derived.text;
      const knownEndings = production?.catalog?.ENDINGS || {};
      if (!knownEndings[clone.ending.id]) {
        clone.ending.id = clone.ending.id === 'death' ? 'death' : 'feral';
      }
    }
    return clone;
  }, [gameState, currentZoneTrustStats.averageTrust, production]);

  const rawViewModel = useMemo(() => {
    if (!production || !effectiveGameState) return null;
    return production.viewModel(effectiveGameState, { archive: [] });
  }, [production, effectiveGameState]);

  // Automatically record completed life into Past Lives Archive when an ending is reached
  useEffect(() => {
    if (!gameState || !gameState.ending || !rawViewModel) return;
    if (recordedCurrentEndingRunId === gameState.runId) return;

    const newRecord = buildPastLifeRecordFromState(
      {...gameState,npcZones:syncedZonePopulations},
      rawViewModel,
      pastLives.length + 1,
      currentBio
    );
    setPastLives(prev => {
      if (prev.some(p => p.runId === newRecord.runId)) return prev;
      return [newRecord, ...prev];
    });
    setRecordedCurrentEndingRunId(gameState.runId);
  }, [gameState, rawViewModel, pastLives.length, currentBio, recordedCurrentEndingRunId, syncedZonePopulations]);

  // System 2: Fixed 15-Oct Timeline World Event Popup (Day 3 Ambulance, Day 4 Black Rain, Day 6 Streets Airdrop, Day 8 Hospital Blackout)
  const activeTimelineWorldModal: LifeSimModalEvent | null = useMemo(() => {
    if (
      screenStage !== 'playing' ||
      !gameState ||
      gameState.pending ||
      gameState.ending ||
      activeLifeSimModal
    ) {
      return null;
    }
    return getFixedWorldTimelineEvent(gameState, currentBio, triggeredEchoIds);
  }, [screenStage, gameState, currentBio, triggeredEchoIds, activeLifeSimModal]);

  // System 3: Proactive Ally NPC Aid Popup (When a high-trust NPC in the current zone comes to help the player automatically)
  const activeProactiveAllyModal: LifeSimModalEvent | null = useMemo(() => {
    if (
      screenStage !== 'playing' ||
      !gameState ||
      gameState.pending ||
      gameState.ending ||
      activeLifeSimModal ||
      activeTimelineWorldModal
    ) {
      return null;
    }
    return getProactiveAllyNpcAidModal(currentZonePop, gameState, triggeredEchoIds);
  }, [
    screenStage,
    gameState,
    currentZonePop,
    triggeredEchoIds,
    activeLifeSimModal,
    activeTimelineWorldModal,
  ]);

  // System 4: Organic Action-Driven Ending Climax Trigger Event Popup
  // Endings CANNOT be chosen manually from a button list — they trigger automatically when actions, stats, NPC relationships, and location align!
  const activeEndingClimaxModal: LifeSimModalEvent | null = useMemo(() => {
    if (
      screenStage !== 'playing' ||
      !gameState ||
      gameState.pending ||
      gameState.ending ||
      activeLifeSimModal ||
      activeTimelineWorldModal ||
      activeProactiveAllyModal
    ) {
      return null;
    }
    return getTriggeredEndingClimaxModal(
      gameState,
      currentZonePop,
      syncedZonePopulations,
      triggeredEchoIds
    );
  }, [
    screenStage,
    gameState,
    currentZonePop,
    syncedZonePopulations,
    triggeredEchoIds,
    activeLifeSimModal,
    activeTimelineWorldModal,
    activeProactiveAllyModal,
  ]);

  // System 4.5: Structured Dynamic Event Trigger Engine (Evaluates complex conditions across day, trust, location, vitals, mutation, kills, items, and NPCs)
  const activeDynamicEngineModal: LifeSimModalEvent | null = useMemo(() => {
    if (
      screenStage !== 'playing' ||
      !gameState ||
      gameState.pending ||
      gameState.ending ||
      activeLifeSimModal ||
      activeTimelineWorldModal ||
      activeProactiveAllyModal ||
      activeEndingClimaxModal
    ) {
      return null;
    }
    return getNextTriggeredDynamicEvent({
      gameState,
      currentBio,
      currentZonePop,
      allZonePopulations: syncedZonePopulations,
      currentZoneAverageTrust: currentZoneTrustStats.averageTrust,
      currentZoneLivingCount: currentZoneTrustStats.livingCount,
      pastLives,
      triggeredEventIds: triggeredEchoIds,
    });
  }, [
    screenStage,
    gameState,
    currentBio,
    currentZonePop,
    syncedZonePopulations,
    currentZoneTrustStats.averageTrust,
    currentZoneTrustStats.livingCount,
    pastLives,
    triggeredEchoIds,
    activeLifeSimModal,
    activeTimelineWorldModal,
    activeProactiveAllyModal,
    activeEndingClimaxModal,
  ]);

  // Subtle Unlabelled Echo Popup: triggers naturally when visiting a location where a previous character acted
  const activeOrganicEchoPopup: OrganicEchoPopupEvent | null = useMemo(() => {
    if (
      screenStage !== 'playing' ||
      !gameState ||
      gameState.pending ||
      gameState.ending ||
      activeLifeSimModal ||
      activeTimelineWorldModal ||
      activeProactiveAllyModal ||
      activeEndingClimaxModal ||
      activeDynamicEngineModal
    ) {
      return null;
    }
    return getOrganicEchoPopupForLocation(
      pastLives,
      gameState.place || 'shelter',
      gameState.day || 1,
      triggeredEchoIds
    );
  }, [
    screenStage,
    gameState,
    pastLives,
    triggeredEchoIds,
    activeLifeSimModal,
    activeTimelineWorldModal,
    activeProactiveAllyModal,
    activeEndingClimaxModal,
    activeDynamicEngineModal,
  ]);

  // Filter daily actions
  const filteredActions = useMemo(() => {
    if (!rawViewModel || !production || !effectiveGameState) return [];
    const actions: any[] = rawViewModel.actions || [];

    return actions
      .map(a => {
        let visible = a.visible;
        const isStory =
          production.storyActionIds.includes(a.id) || a.id.startsWith('story.');
        const isConditionalCare = CONDITIONAL_CARE_ACTION_IDS.has(a.id);

        if (LEGACY_02_STORY_ACTION_IDS.has(a.id)) {
          const flags = effectiveGameState.story?.flags || {};
          const unlockedWave2 =
            effectiveGameState.day >= 3 ||
            (a.id === 'story.clinic' && flags['next.clinic']) ||
            (a.id === 'story.pack' && flags['c41.streets_scouted']) ||
            (a.id === 'story.remnant' && flags['c42.crossroad_resolved']);
          if (!unlockedWave2) {
            visible = false;
          }
        }

        const availableWithoutPending = effectiveGameState.pending
          ? production.engine.previewAction({ ...effectiveGameState, pending: null }, a.id).enabled
          : a.preview?.enabled;

        if ((isStory || isConditionalCare) && !availableWithoutPending && !effectiveGameState.ending) {
          visible = false;
        }

        const currentSanityVal = Number(effectiveGameState.stats?.sanity ?? 100);
        const isLowSanityHumanLocked =
          currentSanityVal < 25 &&
          (a.id === 'research' || (a.id.startsWith('bkk_') && a.id.endsWith('.work')));

        const rawDescription = isLowSanityHumanLocked
          ? 'สติต่ำกว่า 25: สมองพร่าเลือนและพูดไม่เป็นภาษา ไม่อาจทำงานซับซ้อนของมนุษย์ได้ในขณะนี้'
          : String(a.description || '')
              .replace(/^บทจบ:\s*/g, 'จุดตัดสินใจสำคัญ: ')
              .replace(/จบชีวิตนี้ทันที/g, 'ก้าวเข้าสู่บทสรุปของเส้นทางนี้');

        const finalPreview = isLowSanityHumanLocked
          ? {
              ...a.preview,
              enabled: false,
              reason: 'สติต่ำกว่า 25: สมองพร่าเลือนและมือสั่นเกร็งเกินกว่าจะทำงานวิจัยหรืองานซับซ้อนของมนุษย์ได้ (ควรพักซ่อนตัวหรือทบทวนความทรงจำก่อน)',
            }
          : a.preview;

        return {
          ...a,
          visible: (a.id.startsWith('bkk_') || a.id.startsWith('route.')) ? true : visible,
          ...((a.id.startsWith('bkk_') || a.id.startsWith('route.')) ? { group: 'story', ending: production.catalog.ACTIONS.find(entry => entry.id === a.id)?.ending } : {}),
          preview: finalPreview,
          description: showNumericSpoilers
            ? rawDescription
            : translateNumericNoteToNarrative(rawDescription, {
                actionId: a.id,
                enabled: finalPreview?.enabled,
                disabledReason: finalPreview?.reason,
              }),
          layerTag: classifyActionLayer(
            a.id,
            a.group === 'travel' ? 'move' : undefined,
            a.ending
          ),
        };
      })
      .filter(a => a.visible);
  }, [rawViewModel, production, effectiveGameState, showNumericSpoilers]);

  // Compute Mid-Game Horizon Clues
  const horizonClues = useMemo(() => {
    if (!showRouteHints || !effectiveGameState) return [];
    return getMidGameHorizonClues(effectiveGameState);
  }, [showRouteHints, effectiveGameState]);

  // Compute Slice-of-Life & Pre-Bombing Escape Endings
  const sliceOfLifeEndings = useMemo(() => {
    if (!effectiveGameState) return [];
    return getSliceOfLifeAndEscapeEndings(
      effectiveGameState,
      currentZonePop,
      syncedZonePopulations
    );
  }, [effectiveGameState, currentZonePop, syncedZonePopulations]);

  const daysUntilBombing = Math.max(0, MAX_BOMBING_DAY - (gameState?.day || 1));

  // Carried items list (Includes Signature Item from Pre-Death Occupation + Consumables physically on the character!)
  const carriedInventoryItems = useMemo(() => {
    if (!gameState) return [];
    const items: Array<{
      id: string;
      name: string;
      count: number;
      unit: string;
      tag?: string;
      desc: string;
      accent: string;
      iconPath: string;
      canUseDirectly?: boolean;
      useLabel?: string;
    }> = [
      {
        id: 'signature-occupation-item',
        iconPath: 'M5 2h6v3h4v9H1V5h4z M7 4v1h2V4z M1 8v1h6v2h2V9h6V8z',
        name: currentBio.signatureItemName,
        count: 1,
        unit: 'ของติดตัวก่อนตาย',
        tag: 'ของติดตัวก่อนตาย',
        desc: currentBio.signatureItemDesc,
        accent: 'text-lime-300 border-lime-400/50 bg-lime-950/20',
      },
    ];

    const supplies = Number(gameState.items?.supplies || 0);
    const medicine = Number(gameState.items?.medicine || 0);
    const samples = Number(gameState.items?.samples || 0);
    const carriedBlood = Number(gameState.carriedBloodBags || 0);

    if (supplies > 0) {
      items.push({
        id: 'supplies',
        iconPath: 'M4 1h8v1h2v12h-2v1H4v-1H2V2h2z M3 4v1h10V4z M3 11v1h10v-1z M6 7v2h4V7z',
        name: 'เสบียงมนุษย์ (อาหารกระป๋อง)',
        count: supplies,
        unit: 'ชิ้น',
        tag: 'เสบียงแบ่งคนเป็น',
        desc: 'ซอมบี้กินอาหารคนเป็นแล้วไม่อิ่ม ใช้สำหรับแบ่งให้ผู้รอดชีวิตเพื่อเพิ่มความไว้ใจรายบุคคล',
        accent: 'text-amber-300 border-amber-500/40',
      });
    }
    if (medicine > 0) {
      items.push({
        id: 'medicine',
        iconPath: 'M5 2h6v3h4v9H1V5h4z M7 4v1h2V4z M7 6v2H5v2h2v2h2v-2h2V8H9V6z',
        name: 'ชุดเย็บแผลและเวชภัณฑ์',
        count: medicine,
        unit: 'ชุด',
        tag: 'เวชภัณฑ์เนื้อเยื่อ',
        desc: 'ใช้ปะติดปะต่อเนื้อเยื่อของร่าง (+40 สภาพร่าง) หรือมอบให้คนเจ็บในพื้นที่',
        accent: 'text-emerald-300 border-emerald-500/40',
      });
    }
    if (samples > 0) {
      items.push({
        id: 'samples',
        iconPath: 'M4 1h8v3h-1v9h-1v2H6v-2H5V4H4z M7 4v4h2V4z M7 10v2h1v-2z',
        name: 'หลอดตัวอย่างเชื้อเรืองแสง',
        count: samples,
        unit: 'หลอด',
        tag: 'สารกระตุ้นวิจัย',
        desc: 'ตัวอย่างเชื้อความเข้มข้นสูง ใช้สำหรับวิจัยเซรุ่มหรือกระตุ้นการวิวัฒน์สายพันธุ์',
        accent: 'text-teal-300 border-teal-500/40',
      });
    }
    if (carriedBlood > 0) {
      items.push({
        id: 'carriedBloodBags',
        iconPath: 'M6 1h4v2h3v2h1v7h-1v2h-3v2H8v-2H3v-2H2V5h1V3h3z M7 5v2H6v1H5v3h1v1h4v-1h1V8h-1V7H9V5z',
        name: 'ถุงเลือดพกพา',
        count: carriedBlood,
        unit: 'ถุง',
        tag: 'ดื่มได้ทันที',
        desc: 'ถุงเลือดสำรองที่พกติดตัวไว้ในกระเป๋า สามารถฉีกดื่มประทังความหิวได้ทันที (-28 ความหิว)',
        accent: 'text-rose-300 border-rose-500/50',
        canUseDirectly: true,
        useLabel: 'ดื่มถุงเลือดพกพา (-28 ความหิว)',
      });
    }
    return items;
  }, [gameState, currentBio]);

  // Selected item state in Bag inspection panel
  const [selectedBagItemId, setSelectedBagItemId] = useState<string | null>(null);

  const activeSelectedBagItem = useMemo(() => {
    if (!carriedInventoryItems.length) return null;
    return carriedInventoryItems.find(it => it.id === selectedBagItemId) || carriedInventoryItems[0];
  }, [carriedInventoryItems, selectedBagItemId]);

  // Unlocked Mutation Stages up to current reached stage
  const unlockedMutationStages = useMemo(() => {
    const currentStageNum = currentMutationStage.stageNumber;
    const stageThresholds = [0, 30, 60, 85];
    const stages = [];
    for (let i = 0; i < currentStageNum; i++) {
      stages.push(getMutationStageInfo(stageThresholds[i]));
    }
    return stages;
  }, [currentMutationStage.stageNumber]);

  // Step 1 -> Step 2: Login Submit
  const handleLoginSubmit = (e?: React.FormEvent, intent: 'hub' | 'continue' | 'new' = 'hub') => {
    e?.preventDefault();
    const clean = loginInput.trim().slice(0, 80) || 'ผู้บันทึกเขตศูนย์ (Subject-00)';
    setPlayerName(clean);
    if (soundEnabled) soundFx.success();
    if (intent === 'continue' && hasStartedRun) {
      setScreenStage('playing');
    } else {
      setScreenStage('hub');
      if (intent === 'new') handleRollCharacterPreview();
    }
  };

  // Roll a new character candidate and open the Character Bio Dossier Popup!
  const handleRollCharacterPreview = () => {
    if (!production) return;
    if (soundEnabled) soundFx.click();

    const seed = Math.floor(Math.random() * 0x100000000);
    const randomBio = generateCharacter(seed);
    const nextState = createCharacterState(production, randomBio, seed);
    const previewVm = production.viewModel(nextState, { archive: [] });

    setRolledPreviewCandidate({
      state: structuredClone(nextState),
      bio: randomBio,
      viewModel: previewVm,
    });
  };

  // Confirm waking up as the rolled character
  const handleConfirmWakeUpWithRolledCharacter = () => {
    if (!rolledPreviewCandidate) return;
    if (soundEnabled) soundFx.success();

    const seed = rolledPreviewCandidate.state.initialSeed;
    setCurrentBio(rolledPreviewCandidate.bio);
    setTriggeredEchoIds([]);
    setRecordedMutationMilestones([]);
    setActiveMutationMilestoneAlert(null);
    setActiveThreatAmbushAlert(null);
    setIsScreenShaking(false);
    setLatestStory(null);
    setTravelGoalId(null);
    setRecordedCurrentEndingRunId(null);
    setActiveLifeSimModal(null);
    setZonePopulations(createInitialZonePopulations(seed));
    const freshState = structuredClone(rolledPreviewCandidate.state);
    freshState.roamCooldowns = {};
    freshState.asokWreckDepletedParts = [];
    setGameState(freshState);
    setHasStartedRun(true);
    setRolledPreviewCandidate(null);
    try {queueLifeStart(freshState.runId);} catch { /* Gameplay remains available if statistics cannot be queued. */ }
    if (!onboardingSeen) setShowPlayerGuide(true);
    setScreenStage('playing');
    setMobileTab('play');
    setActionToast(null);
  };

  const recordStoryResult = (
    before: any,
    next: any,
    moment: Pick<StoryMoment, 'title' | 'choice' | 'text' | 'endingOutcomeId'> & { extraLogKeys?: string[] }
  ) => {
    const previousKeys = new Set((before.log || []).map(storyLogKey));
    const effects = computeStateDeltas(before, next);
    const nextZones = syncZonePopulationsWithEngineState(next.npcZones || syncedZonePopulations, next);
    const seen = new Set<string>();
    for (const zone of Object.values(syncedZonePopulations)) for (const npc of zone.npcs) {
      if (seen.has(npc.id)) continue;
      seen.add(npc.id);
      const changed = nextZones[zone.placeId]?.npcs.find(person => person.id === npc.id);
      const delta = changed ? Math.round(changed.trust - npc.trust) : 0;
      if (delta) effects.push('ความไว้ใจของ' + npc.name + ' ' + (delta > 0 ? '+' : '') + delta);
    }
    const { extraLogKeys = [], ...storyMoment } = moment;
    const newLogKeys = (next.log || [])
      .filter((entry: any) => entry.kind !== 'danger' && !previousKeys.has(storyLogKey(entry)))
      .map(storyLogKey);
    setLatestStory({
      ...storyMoment, runId: next.runId, day: next.day || 1,
      place: production?.catalog.PLACES[next.place]?.short || '', effects,
      logKeys: Array.from(new Set([...newLogKeys, ...extraLogKeys])),
    });
    setActionToast(null);
  };

  // Drink a carried blood bag directly from inventory (non-day-consuming)
  const handleDrinkCarriedBloodBag = () => {
    if (!gameState || (gameState.carriedBloodBags || 0) <= 0) return;
    if (soundEnabled) soundFx.success();

    const before = structuredClone(gameState);
    const next = structuredClone(gameState);
    next.carriedBloodBags = Math.max(0, (next.carriedBloodBags || 0) - 1);
    next.stats.hunger = Math.max(0, (next.stats.hunger || 0) - 28);
    const policy = computeEngineSurvivalDayPolicy(next, next.stats.hunger);
    const scaledHeal = Math.floor(4 * policy.healingMultiplier);
    const maxRoom = Math.max(0, policy.ceiling - Number(next.stats.hp || 0));
    const actualHeal = Math.max(0, Math.min(scaledHeal, maxRoom));
    next.stats.hp = Math.min(100, (next.stats.hp || 0) + actualHeal);
    next.stats.sanity = Math.min(100, (next.stats.sanity || 0) + 2);
    resolveSharedActivityTurn(next, before, {
      consumesDay: false,
      currentBio,
    });
    next.log = [
      {
        id: Date.now(),
        day: next.day || 1,
        text: 'เจ้าหยิบถุงเลือดที่พกติดตัวไว้ในกระเป๋าขึ้นมาดื่มเงียบๆ ความหิวโหยที่บีบคั้นในอกทุเลาลง',
        kind: 'care',
      },
      ...(next.log || []),
    ];

    recordStoryResult(before, next, { title: 'ประทังความหิว', text: next.log[0].text });
    setGameState(next);
  };

  // Trigger Freeform NPC Interaction Modal (1 Day Life Simulation)
  const handleOpenFreeformNpcModal = (specificNpcId?: string) => {
    if (!currentZonePop || !gameState || gameState.pending || gameState.ending) return;
    if (soundEnabled) soundFx.click();
    const modal = buildFreeformNpcInteractionModal(
      {...currentZonePop, placeId: gameState.place || currentZonePop.placeId},
      gameState,
      currentBio,
      specificNpcId
    );
    if (!modal) {
      setActionToast('ไม่พบผู้รอดชีวิตที่ยังมีชีวิตอยู่ในเขตนี้แล้ว');
      return;
    }
    const canonicalModalPlaceId = modal.placeId === 'tower' ? 'radio' : modal.placeId;
    const zone = syncedZonePopulations[canonicalModalPlaceId] || syncedZonePopulations[modal.placeId];
    if (zone?.npcs.some(npc => npc.id === modal.targetNpcId && !npc.met && !npc.seen)) {
      setZonePopulations(zones => ({
        ...zones,
        [canonicalModalPlaceId]: {...zone, npcs: zone.npcs.map(npc => npc.id === modal.targetNpcId ? {...npc, seen: true} : npc)},
      }));
    }
    setActiveLifeSimModal(modal);
    setGameState({...gameState,npcEncounter:modal});
  };

  // Trigger Freeform Zombie Roaming / Scavenge Modal (1 Day Life Simulation)
  const handleOpenFreeformRoamModal = () => {
    if (!currentZonePop || !gameState || gameState.pending || gameState.ending) return;
    if (soundEnabled) soundFx.click();
    const modal = buildFreeformRoamModal(currentZonePop, gameState, currentBio, triggeredEchoIds);
    setActiveLifeSimModal(modal);
    setGameState({...gameState,npcEncounter:modal});
  };

  const triggerThreatAmbushAlert = (
    hazardRes: HazardTurnAttackResult,
    targetState: any,
    currentDay: number,
    placeName: string
  ) => {
    if (!hazardRes?.attacked || !hazardRes?.scenario) return;

    if (soundEnabled) {
      soundFx.playDamageAmbush();
    }
    setIsScreenShaking(true);
    setTimeout(() => {
      setIsScreenShaking(false);
    }, 700);

    if ((targetState?.stats?.hp || 0) > 0 && !targetState?.ending) {
      setActiveThreatAmbushAlert({
        scenario: hazardRes.scenario,
        localThreat: hazardRes.localThreat,
        chancePercent: hazardRes.chancePercent,
        hpLoss: hazardRes.scenario.hpLoss,
        sanityLoss: hazardRes.scenario.sanityLoss || 0,
        remainingHp: Math.max(0, Math.floor(targetState.stats?.hp || 0)),
        remainingSanity: Math.max(0, Math.floor(targetState.stats?.sanity || 0)),
        day: currentDay,
        locationName: placeName,
      });
    }
  };

  const handleDismissActiveModal = () => {
    if (soundEnabled) soundFx.click();
    setActiveLifeSimModal(null);
    setModalErrorToast(null);
    if (gameState) {
      const clean = structuredClone(gameState);
      delete clean.npcEncounter;
      setGameState(clean);
    }
  };

  // Resolve choice inside any LifeSimModalEvent (Freeform NPC, Roaming, Fixed Timeline World Event, or Proactive Ally Aid)
  const handleChooseLifeSimModalOption = (
    modalEvent: LifeSimModalEvent,
    choiceIndex: number
  ) => {
    if (!modalEvent || !gameState) return;
    const choice = modalEvent.choices[choiceIndex];
    if (!choice) return;
    if (!choice.enabled) {
      if (soundEnabled) soundFx.warning();
      const reason = choice.disabledReason || choice.note || 'ยังไม่พร้อมเลือกตัวเลือกนี้';
      setActionToast(reason);
      setModalErrorToast(reason);
      return;
    }
    if (choice.effects?.executeEngineActionId) {
      const targetActionId = choice.effects.executeEngineActionId;
      setActiveLifeSimModal(null);
      setModalErrorToast(null);
      const clean = structuredClone(gameState);
      delete clean.npcEncounter;
      setGameState(clean);
      handlePerformAction(targetActionId, true);
      return;
    }
    if (resolvingModalRef.current) return;
    resolvingModalRef.current = modalEvent.id;
    try {
      const canonicalModalPlaceId = modalEvent.placeId === 'tower' ? 'radio' : modalEvent.placeId;
      const relationshipReason = npcChoiceReason(
        gameState,
        syncedZonePopulations[canonicalModalPlaceId] || syncedZonePopulations[gameState.place || 'shelter'],
        modalEvent,
        choice
      );
      if (relationshipReason) {
        if (soundEnabled) soundFx.warning();
        setActionToast(relationshipReason);
        setModalErrorToast(relationshipReason);
        return;
      }
      const readiness = getEndingReadiness(gameState, choice.effects?.triggerEndingId);
      if (!readiness.enabled) {
        if (soundEnabled) soundFx.warning();
        const reasonStr = readiness.reasons.join(' · ');
        setActionToast(reasonStr);
        setModalErrorToast(reasonStr);
        return;
      }
      if (soundEnabled) soundFx.success();
      setModalErrorToast(null);

      const before = structuredClone(gameState);
      const next = structuredClone(gameState);
      delete next.npcEncounter;
      next.memory = normalizeCanonicalMemory(next.memory);
      const eff = choice.effects || {};
      const contentId = modalEvent.contentId || modalEvent.id.replace(/-\d+.*$/, '');

      const nextZones = structuredClone(syncedZonePopulations);
      const zone = nextZones[canonicalModalPlaceId] || nextZones[modalEvent.placeId];
      const target = zone?.npcs.find(npc => npc.id === modalEvent.targetNpcId);
      const knewTarget = target?.met;
      let outcomeText = choice.outcomeText;
      let introduction = '';

      applyLifeSimModalEffectsToState(next, modalEvent, choiceIndex, {
        currentBio,
        runEnvironmentHazard: true,
        canonicalPlaceId: canonicalModalPlaceId,
        onBeforeTurnResolve: (nextState, beforeState, selectedChoice) => {
          if (nextState.story?.flags && production?.catalog?.FLAGS) {
            nextState.story.flags = sanitizeCanonicalStoryFlags(
              nextState.story.flags,
              production.catalog.FLAGS
            );
          }
          if (zone) {
            applyNpcRelationships(nextState, zone, modalEvent, selectedChoice, beforeState.day || 1);
          }
          const killedDiff = (nextState.memory?.killed || 0) - (beforeState.memory?.killed || 0);
          if (killedDiff > 0) {
            const currentHumanityDrop =
              (beforeState.stats?.humanity || 0) - (nextState.stats?.humanity || 0);
            if (currentHumanityDrop < 15 * killedDiff) {
              nextState.stats.humanity = Math.max(
                0,
                (beforeState.stats?.humanity || 0) - 15 * killedDiff
              );
            }
          }
          introduction = target?.met && !knewTarget
            ? ' ก่อนแยกกัน อีกฝ่ายบอกให้เจ้าเรียกว่า ' + target.name
            : '';
          outcomeText = selectedChoice.outcomeText + introduction;
          nextState.npcZones = nextZones;
        },
        onHazardResult: hazardRes => {
          if (hazardRes.attacked && hazardRes.scenario) {
            triggerThreatAmbushAlert(
              hazardRes,
              next,
              before.day || 1,
              production?.catalog?.PLACES?.[next.place]?.name || 'พื้นที่อันตราย'
            );
          }
        },
      });

      if (next.story?.flags && production?.catalog?.FLAGS) {
        next.story.flags = sanitizeCanonicalStoryFlags(next.story.flags, production.catalog.FLAGS);
      }

      next.log = [
        {
          id: Date.now(),
          day: before.day || 1,
          text: outcomeText,
          kind: next.ending ? 'ending' : 'lifesim',
        },
        ...(next.log || []),
      ];

      setTriggeredEchoIds(prev => {
        let updated = prev.includes(modalEvent.id) ? prev : [...prev, modalEvent.id];
        const shouldLockContentId =
          contentId &&
          !updated.includes(contentId) &&
          (!modalEvent.allowRepeatUntilDepleted || Boolean(eff.setFlag));
        if (shouldLockContentId) {
          updated = [...updated, contentId];
        }
        return updated;
      });
      setZonePopulations(nextZones);
      setActiveLifeSimModal(null);
      const ageOutcome = resolveLifeSimOutcomeForAge(
        modalEvent.id, choice.id, before.characterProfile?.age, target?.name, choice.outcomeSuffix
      );
      recordStoryResult(before, next, {
        title: modalEvent.title,
        choice: choice.text,
        text: ageOutcome ? ageOutcome.replaceAll('{signatureItem}', () => currentBio.signatureItemName) + introduction : outcomeText,
        endingOutcomeId: ageOutcome && eff.triggerEndingId === next.ending?.id ? next.ending?.id : undefined,
      });
      setGameState(next);
      if (next.ending || eff.triggerEndingId) {
        setMobileTab('play');
      }
    } finally {
      resolvingModalRef.current = null;
    }
  };

  // Surrender to zombie instinct -> Sanity drops to 0 and triggers the Madness / Mindless Zombie ending!
  const handleSurrenderToZombieInstinct = () => {
    if (!gameState || !rawViewModel) return;
    if (soundEnabled) soundFx.warning();

    const next = structuredClone(gameState);
    delete next.npcEncounter;
    next.stats.sanity = 0;
    next.pending = null;
    if (next.lifecycle && typeof next.lifecycle === 'object') {
      next.lifecycle.activeTurn = null;
    }
    const causeOfDeath = deriveCauseOfDeath(next, {
      id: 'madness',
      causeCode: 'surrender',
      surrendered: true,
    });
    next.ending = {
      id: 'madness',
      day: next.day || 1,
      causeCode: causeOfDeath.code.toLowerCase(),
      causeOfDeath,
    };
    next.log = [
      {
        id: Date.now(),
        day: next.day || 1,
        text: `เจ้าหยุดฝืนต้านทานเสียงเพรียกของเชื้อในสมอง ปล่อยให้สติสัมปชัญญะสุดท้ายดับวูบลง กลายเป็นซอมบี้ไร้สติที่เดินลากขาไปตามสัญชาตญาณดิบใน${rawViewModel.place?.name || 'เมือง'}`,
        kind: 'ending',
      },
      ...(next.log || []),
    ];

    const record = buildPastLifeRecordFromState(
      {...next,npcZones:syncedZonePopulations},
      rawViewModel,
      pastLives.length + 1,
      currentBio,
      {
        id: 'madness',
        title: 'สติถูกกลืนกิน · กลายเป็นซอมบี้ไร้สติในฝูง',
        text: 'เมื่อเลือกยอมแพ้ต่อสัญชาตญาณดิบ ความทรงจำและชื่อที่เคยพยายามยึดเหนี่ยวก็เลือนหายไป ร่างนี้ยังคงเดินต่อไปในเมืองในฐานะซอมบี้ไร้สติที่ขับเคลื่อนด้วยความหิวเท่านั้น',
        surrendered: true,
      }
    );

    setPastLives(prev => [record, ...prev.filter(p => p.runId !== record.runId)]);
    setRecordedCurrentEndingRunId(next.runId);
    setGameState(next);
    setShowSurrenderConfirmModal(false);
    setMobileTab('play');
  };

  // Trigger a Slice-of-Life / Escape Ending before Day 120 Bombing
  const handleTriggerSliceOfLifeEnding = (option: SliceOfLifeEndingOption) => {
    if (!gameState || !rawViewModel || !option.enabled) return;
    const readiness = getEndingReadiness(gameState, option.id);
    if (!readiness.enabled) { setActionToast(readiness.reasons.join(' · ')); return; }
    if (soundEnabled) soundFx.success();

    const before = structuredClone(gameState);
    const next = structuredClone(gameState);
    delete next.npcEncounter;
    next.pending = null;
    resolveSharedActivityTurn(next, before, {
      consumesDay: false,
      endingCandidate: option.id,
      currentBio,
    });
    if (next.ending?.id === option.id) {
      const causeOfDeath = deriveCauseOfDeath(next, {
        id: option.id,
        title: option.title,
        text: option.endingText,
      });
      next.ending = {
        id: option.id,
        day: next.day || 1,
        title: option.endingTitle || option.title,
        text: option.endingText,
        causeCode: causeOfDeath.code.toLowerCase(),
        causeOfDeath,
      };
    }
    next.log = [
      {
        id: Date.now(),
        day: next.day || 1,
        text: option.endingText,
        kind: 'ending',
      },
      ...(next.log || []),
    ];

    const record = buildPastLifeRecordFromState(
      {...next,npcZones:syncedZonePopulations},
      rawViewModel,
      pastLives.length + 1,
      currentBio,
      {
        id: next.ending?.id || option.id,
        title: option.endingTitle,
        text: option.endingText,
      }
    );

    setPastLives(prev => [record, ...prev.filter(p => p.runId !== record.runId)]);
    setRecordedCurrentEndingRunId(next.runId);
    setGameState(next);
    setMobileTab('play');
  };

  // Choose an option inside the Subtle Unlabelled Echo Modal Popup (non-day-consuming)
  const handleChooseOrganicEchoOption = (
    echo: OrganicEchoPopupEvent,
    choiceIndex: number
  ) => {
    const choice = echo.choices[choiceIndex];
    if (!choice || !gameState) return;
    if (soundEnabled) soundFx.click();

    const before = structuredClone(gameState);
    const next = structuredClone(gameState);

    if (choice.effects?.stat && choice.effects?.delta) {
      const k = choice.effects.stat;
      let delta = choice.effects.delta;
      if (k === 'hp' && delta > 0) {
        const policy = computeEngineSurvivalDayPolicy(next, next.stats.hunger);
        const scaledHeal = Math.floor(delta * policy.healingMultiplier);
        const maxRoom = Math.max(0, policy.ceiling - Number(next.stats.hp || 0));
        delta = Math.max(0, Math.min(scaledHeal, maxRoom));
      }
      next.stats[k] = Math.min(100, Math.max(0, (next.stats[k] || 0) + delta));
    }
    if (choice.effects?.item && choice.effects?.itemDelta) {
      const ik = choice.effects.item;
      if (ik === 'carriedBloodBags') {
        next.carriedBloodBags = Math.max(0, (next.carriedBloodBags || 0) + choice.effects.itemDelta);
      } else {
        next.items[ik] = Math.max(0, (next.items[ik] || 0) + choice.effects.itemDelta);
      }
    }

    resolveSharedActivityTurn(next, before, {
      consumesDay: false,
      currentBio,
    });

    next.log = [
      {
        id: Date.now(),
        day: next.day || 1,
        text: choice.outcomeLog,
        kind: next.ending ? 'ending' : 'event',
      },
      ...(next.log || []),
    ];

    setTriggeredEchoIds(prev => [...prev, echo.id]);
    recordStoryResult(before, next, { title: echo.title, choice: choice.text, text: choice.outcomeLog });
    setGameState(next);
  };

  const handlePerformAction = (actionId: string, bypassEndingClimaxModal = false) => {
    if (!production || !effectiveGameState) return;
    if (actionId === 'hunt' && !huntCandidate) {
      setActionToast('ไม่พบผู้รอดชีวิตให้ตามรอยในเขตนี้');
      return;
    }
    const currentSanityVal = Number(effectiveGameState.stats?.sanity ?? 100);
    if (
      currentSanityVal < 25 &&
      (actionId === 'research' || (actionId.startsWith('bkk_') && actionId.endsWith('.work')))
    ) {
      if (soundEnabled) soundFx.warning();
      setActionToast(
        'ยังเลือกไม่ได้: สติต่ำกว่า 25 สมองพร่าเลือนเกินกว่าจะทำงานวิจัยหรืองานซับซ้อนของมนุษย์ได้'
      );
      return;
    }

    const catalogAction = production.catalog.ACTIONS.find(entry => entry.id === actionId);
    if (catalogAction?.ending && !bypassEndingClimaxModal) {
      const preview = production.engine.previewAction(effectiveGameState, actionId);
      if (!preview.enabled) {
        if (soundEnabled) soundFx.warning();
        setActionToast(`ยังเลือกไม่ได้: ${preview.reason}`);
        return;
      }
      if (soundEnabled) soundFx.click();
      const climaxModal = buildActionClimaxDecisionModal(
        catalogAction,
        effectiveGameState,
        currentBio,
        currentZonePop
      );
      setActiveLifeSimModal(climaxModal);
      return;
    }

    const before = structuredClone(effectiveGameState);
    const next = structuredClone(effectiveGameState);
    delete next.npcEncounter;
    next.memory = normalizeCanonicalMemory(next.memory);
    if (next.story?.flags && production.catalog?.FLAGS) {
      next.story.flags = sanitizeCanonicalStoryFlags(next.story.flags, production.catalog.FLAGS);
    }
    const res = production.engine.act(next, actionId);
    if (!res.ok) {
      if (soundEnabled) soundFx.warning();
      setActionToast(`ยังเลือกไม่ได้: ${res.reason}`);
      return;
    }
    if (next.pending?.eventId === 'prey' && huntCandidate) {
      next.pending.context.huntTargetId = huntCandidate.id;
    }
    next.carriedBloodBags = before.carriedBloodBags || 0;

    // System 1: Apply daily mutation regeneration & weather/zone-threat modifiers if a day turn was committed
    let actionAttackToast: string | null = null;
    const actionDayCommitted = Number(next.completedDays || 0) > Number(before.completedDays || 0);
    if (
      actionDayCommitted &&
      (next.stats?.hp || 0) > 0 &&
      next.ending?.id !== 'death' &&
      next.ending?.id !== 'feral'
    ) {
      const policy = computeEngineSurvivalDayPolicy(next, next.stats.hunger);
      const mutStage = getMutationStageInfo(next.stats?.mutation || 0);
      if (mutStage.dailyHpRegen > 0) {
        const scaledRegen = Math.floor(mutStage.dailyHpRegen * policy.healingMultiplier);
        const maxRoom = Math.max(0, policy.ceiling - Number(next.stats.hp || 0));
        const actualRegen = Math.max(0, Math.min(scaledRegen, maxRoom));
        if (actualRegen > 0) {
          next.stats.hp = Math.min(100, (next.stats.hp || 0) + actualRegen);
        }
      }
      const hazardRes = applyDailyWeatherAndZoneHazardTurn(next, before, { forceDayConsumed: true });
      if (hazardRes.attacked && hazardRes.scenario) {
        actionAttackToast = `⚠️ ถูกคนในพื้นที่โจมตี — ${hazardRes.scenario.title} (สภาพร่าง -${hazardRes.scenario.hpLoss}${hazardRes.scenario.sanityLoss > 0 ? ` · สติ -${hazardRes.scenario.sanityLoss}` : ''})`;
        triggerThreatAmbushAlert(
          hazardRes,
          next,
          before.day || 1,
          production?.catalog?.PLACES?.[next.place]?.name || 'พื้นที่อันตราย'
        );
      }
      if (next.stats.hp <= 0) {
        const inferredCauseCode =
          hazardRes?.attacked || actionId === 'raid'
            ? 'human_attack'
            : (next.stats.hunger >= 85 || (next.body?.starvationDays || 0) >= 2)
            ? 'starvation'
            : 'fatal_trauma';
        applyFinalEndingToState(next, 'death', before.day || 1, inferredCauseCode, currentBio);
      }
    } else if (next.ending?.id === 'death' && actionId === 'raid') {
      applyFinalEndingToState(next, 'death', before.day || 1, 'human_attack', currentBio);
    }

    // Enforce humanity penalty if this action directly killed a human
    const killedDiff = (next.memory?.killed || 0) - (before.memory?.killed || 0);
    if (killedDiff > 0) {
      const currentHumanityDrop = (before.stats?.humanity || 0) - (next.stats?.humanity || 0);
      if (currentHumanityDrop < 15 * killedDiff) {
        next.stats.humanity = Math.max(0, (before.stats?.humanity || 0) - 15 * killedDiff);
      }
    }

    if (soundEnabled) {
      if (actionAttackToast) soundFx.warning();
      else soundFx.click();
    }
    if (actionId.startsWith('move:') && next.place === travelGoalId) {
      setTravelGoalId(null);
    }
    const fromPlaceName = production?.catalog?.PLACES?.[before.place]?.short || production?.catalog?.PLACES?.[before.place]?.name || 'จุดเดิม';
    const toPlaceName = production?.catalog?.PLACES?.[next.place]?.name || 'ย่านใหม่';
    recordStoryResult(before, next, {
      title: catalogAction?.name || (actionId.startsWith('move:') ? 'ออกเดินทาง' : 'การตัดสินใจของเจ้า'),
      text: actionId.startsWith('move:')
        ? next.pending
          ? `ระหว่างเดินทางจาก${fromPlaceName} มุ่งหน้าสู่${toPlaceName} มีเหตุการณ์เกิดขึ้นระหว่างทาง`
          : `เจ้าเดินทางจาก${fromPlaceName} มาถึง${toPlaceName}`
        : next.pending ? 'สถานการณ์ตรงหน้ารอให้เจ้าตัดสินใจ'
        : (next.log || []).find((entry: any) => entry.kind === 'routine' && entry.text !== catalogAction?.name && !(before.log || []).some((old: any) => storyLogKey(old) === storyLogKey(entry)))?.text || 'เจ้า' + (catalogAction?.name || 'ลงมือทำสิ่งที่เลือก'),
    });
    setGameState(next);
    setMobileTab('play');
  };

  const handleChoosePending = (choiceIndex: number) => {
    if (!production || !effectiveGameState || !effectiveGameState.pending) return;
    if (pendingHunt && !huntTarget && choiceIndex !== 2) return;
    const before = structuredClone(effectiveGameState);
    const next = structuredClone(effectiveGameState);
    next.memory = normalizeCanonicalMemory(next.memory);
    if (next.story?.flags && production.catalog?.FLAGS) {
      next.story.flags = sanitizeCanonicalStoryFlags(next.story.flags, production.catalog.FLAGS);
    }
    const event = production.catalog.EVENTS.find(entry => entry.id === next.pending.eventId);
    const chosen = event?.choices[choiceIndex];
    const res = production.engine.choose(next, choiceIndex, next.pending.instanceId, armedHuntTarget);
    if (!res.ok) {
      if (soundEnabled) soundFx.warning();
      setActionToast(`เลือกไม่ได้: ${res.reason}`);
      return;
    }

    // System 1: Apply daily mutation regeneration & weather/zone-threat modifiers if a day turn was committed
    const pendingDayCommitted = Number(next.completedDays || 0) > Number(before.completedDays || 0);
    if (
      pendingDayCommitted &&
      (next.stats?.hp || 0) > 0 &&
      next.ending?.id !== 'death' &&
      next.ending?.id !== 'feral'
    ) {
      const policy = computeEngineSurvivalDayPolicy(next, next.stats.hunger);
      const mutStage = getMutationStageInfo(next.stats?.mutation || 0);
      if (mutStage.dailyHpRegen > 0) {
        const scaledRegen = Math.floor(mutStage.dailyHpRegen * policy.healingMultiplier);
        const maxRoom = Math.max(0, policy.ceiling - Number(next.stats.hp || 0));
        const actualRegen = Math.max(0, Math.min(scaledRegen, maxRoom));
        if (actualRegen > 0) {
          next.stats.hp = Math.min(100, (next.stats.hp || 0) + actualRegen);
        }
      }
      const hazardRes = applyDailyWeatherAndZoneHazardTurn(next, before, { forceDayConsumed: true });
      if (hazardRes.attacked && hazardRes.scenario) {
        triggerThreatAmbushAlert(
          hazardRes,
          next,
          before.day || 1,
          production?.catalog?.PLACES?.[next.place]?.name || 'พื้นที่อันตราย'
        );
      }
      if (next.stats.hp <= 0) {
        const inferredCauseCode =
          hazardRes?.attacked
            ? 'human_attack'
            : (next.stats.hunger >= 85 || (next.body?.starvationDays || 0) >= 2)
            ? 'starvation'
            : 'fatal_trauma';
        applyFinalEndingToState(next, 'death', before.day || 1, inferredCauseCode, currentBio);
      }
    }

    const killedDiff = (next.memory?.killed || 0) - (before.memory?.killed || 0);
    const savedDiff = (next.memory?.saved || 0) - (before.memory?.saved || 0);

    // Ensure killing a human ALWAYS lowers Humanity by at least 15 per kill!
    if (killedDiff > 0) {
      const existingDrop = (before.stats?.humanity || 0) - (next.stats?.humanity || 0);
      if (existingDrop < 15 * killedDiff) {
        next.stats.humanity = Math.max(0, (before.stats?.humanity || 0) - 15 * killedDiff);
      }
    }

    let outcomeText = chosen?.outcomeText || '';
    if (event?.travelDialogue && chosen?.id) {
      outcomeText = resolveAgeDialogue(
        { sourceFamily: 'travel', eventId: event.id, choiceId: chosen.id, field: 'choices.outcomeText' },
        before.characterProfile?.age,
        outcomeText
      );
    }
    if (pendingHunt && huntTarget) {
      const nextZones = structuredClone(syncedZonePopulations);
      const zone = nextZones[before.place];
      const kill = choiceIndex === 0;
      const rescue = choiceIndex === 1;
      const huntEffects = npcHuntEffects(armedHuntTarget);
      applyNpcRelationships(next, zone, {
        id: before.pending.instanceId,
        placeId: before.place,
        targetNpcId: huntTarget.id,
        witnessIds: kill ? npcEncounterWitnesses(zone, huntTarget.id).map(npc => npc.id) : [],
      }, {
        relationshipKind: kill ? 'breach' : rescue ? 'rescue' : 'information',
        effects: kill ? huntEffects : rescue ? {targetNpcTrustDelta: 14} : {},
      }, before.day, {
        killAlreadyRecorded: true,
        threat: Math.min(100, (before.world?.locations?.[before.place]?.threat ?? 20) + (kill ? huntEffects.threatDelta : 0)),
      });
      if (rescue && !huntTarget.met) {
        outcomeText = [outcomeText, `เมื่อพ้นอันตราย อีกฝ่ายบอกให้เจ้าเรียกว่า ${huntTarget.name}`].filter(Boolean).join(' ');
      }
      next.npcZones = nextZones;
      setZonePopulations(nextZones);
    } else if (killedDiff > 0 || savedDiff > 0) {
      const nextZones = structuredClone(syncedZonePopulations);
      const z = nextZones[next.place || 'shelter'];
      if (z) {
        if (killedDiff > 0) {
          const alreadyKilled = z.npcs.filter(npc => npc.storyNpcKey &&
            before.world?.npcs?.[npc.storyNpcKey]?.alive !== false &&
            next.world?.npcs?.[npc.storyNpcKey]?.alive === false);
          const living = z.npcs.filter(npc => npc.alive && !alreadyKilled.includes(npc)).reverse();
          // A generic encounter reaches undiscovered locals before named story contacts.
          const unnamed = living.filter(npc => npc.localResident && !npc.met && !npc.seen);
          const victims = [...unnamed, ...living.filter(npc => !unnamed.includes(npc))];
          for (const victim of victims.slice(0, Math.max(0, killedDiff - alreadyKilled.length))) {
            victim.alive = false;
            victim.trust = 0;
            const canonical = victim.storyNpcKey && next.world?.npcs?.[victim.storyNpcKey];
            if (canonical) {
              canonical.alive = false;
              canonical.trust = 0;
            }
          }
        }

        next.npcZones = nextZones;
        setZonePopulations(nextZones);
      }
    }

    if (soundEnabled) soundFx.success();
    const isTravelEncounter = Boolean(event?.travelDialogue || (before.pending?.context?.from && before.pending?.context?.to));
    if (isTravelEncounter) {
      const arrivedPlaceName = production?.catalog?.PLACES?.[next.place]?.name || '';
      if (arrivedPlaceName && !outcomeText.includes(arrivedPlaceName)) {
        outcomeText = [outcomeText, `เจ้าเดินทางมาถึง${arrivedPlaceName}`].filter(Boolean).join(' ');
      }
      if (next.place === travelGoalId) {
        setTravelGoalId(null);
      }
    }
    const sameTurnRoutineLogKeys = before.pending?.turn
      ? (before.log || [])
          .filter((entry: any) => entry.day === before.day && entry.kind === 'routine')
          .slice(0, 1)
          .map(storyLogKey)
      : [];
    recordStoryResult(before, next, {
      title: event?.title || 'การตัดสินใจของเจ้า',
      choice: chosen?.text,
      text: outcomeText,
      extraLogKeys: sameTurnRoutineLogKeys,
    });
    setGameState(next);
  };

  const handleExportSaveJson = () => {
    if (!hasStartedRun) return;
    const payload = {
      version: 'after-zero-1.0-save-bundle',
      exportedAt: new Date().toISOString(),
      playerName,
      currentBioId,
      triggeredEchoIds,
      mutationMilestones: recordedMutationMilestones,
      pastLives,
      zonePopulations: syncedZonePopulations,
      gameState: {
        ...gameState,
        npcZones: syncedZonePopulations,
        characterProfile: snapshotCharacter(currentBio),
        roamCooldowns: gameState?.roamCooldowns || {},
        asokWreckDepletedParts: gameState?.asokWreckDepletedParts || [],
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `after-zero-1.0-save-day${gameState?.day || 1}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const exportMsg = 'ส่งออกไฟล์เซฟ (.json) เรียบร้อยแล้ว';
    setActionToast(exportMsg);
    setSaveStatusFeedback({ type: 'success', message: exportMsg });
  };

  const handleImportSaveJson = (providedText?: string) => {
    const saveText = providedText ?? importJsonText;
    if (!saveText.trim()) {
      if (soundEnabled) soundFx.warning();
      const emptyMsg = 'กรุณาวางโค้ด JSON จากไฟล์เซฟก่อนกดยืนยัน';
      setActionToast(emptyMsg);
      setSaveStatusFeedback({ type: 'error', message: emptyMsg });
      return false;
    }
    if (!production) return false;
    try {
      if (new TextEncoder().encode(saveText).length > 10 * 1024 * 1024) throw new Error('ไฟล์เซฟใหญ่เกิน 10 MB');
      const parsed = JSON.parse(saveText.trim());
      const rawState = parsed.gameState || parsed;
      if (!rawState || typeof rawState !== 'object') {
        throw new Error('โครงสร้างไฟล์เซฟไม่ถูกต้อง (ไม่พบข้อมูลสถานะเกม)');
      }
      if (rawState && typeof rawState === 'object') {
        rawState.memory = normalizeCanonicalMemory(rawState.memory);
        if (rawState.story?.flags && production.catalog?.FLAGS) {
          rawState.story.flags = sanitizeCanonicalStoryFlags(rawState.story.flags, production.catalog.FLAGS);
        }
      }
      const validated = production.engine.validate(rawState);
      validated.memory = normalizeCanonicalMemory(validated.memory);
      const importedBio = resolveSavedCharacter(validated, parsed.currentBioId, currentBio);
      const importedZones=rawState.npcZones || parsed.zonePopulations || createInitialZonePopulations(validated.initialSeed||1);
      migrateSavedRelationships(validated,importedZones);
      validated.carriedBloodBags = Number(rawState.carriedBloodBags || 0);
      validated.characterProfile = snapshotCharacter(importedBio);
      validated.roamCooldowns = (rawState && typeof rawState.roamCooldowns === 'object' && rawState.roamCooldowns !== null && !Array.isArray(rawState.roamCooldowns)) ? rawState.roamCooldowns : {};
      validated.asokWreckDepletedParts = Array.isArray(rawState?.asokWreckDepletedParts) ? rawState.asokWreckDepletedParts.filter((p: any) => typeof p === 'string') : [];
      if (Array.isArray(parsed.pastLives) && parsed.pastLives.some((life: any) => !life || typeof life !== 'object' || typeof life.endingId !== 'string')) throw new Error('ประวัติชีวิตในเซฟไม่ถูกต้อง');
      setCurrentBio(importedBio);
      if (typeof parsed.playerName === 'string') {
        setPlayerName(parsed.playerName.slice(0, 80));
        setLoginInput(parsed.playerName.slice(0, 80));
      }
      setRouteGuidanceSession({runId: validated.runId, pinnedRouteId: null, dismissedRouteIds: []});
      setGameState(validated);
      setHasStartedRun(true);
      setActiveLifeSimModal(validated.npcEncounter||null);
      setZonePopulations(importedZones);
      if (parsed.gameState) {
        if (Array.isArray(parsed.pastLives)) setPastLives(parsed.pastLives);
        if (Array.isArray(parsed.triggeredEchoIds)) setTriggeredEchoIds(parsed.triggeredEchoIds);
        if (Array.isArray(parsed.mutationMilestones)) setRecordedMutationMilestones(parsed.mutationMilestones);
        // NPC snapshot and relationship history were validated before committing the import.
      }
      setShowImportBox(false);
      setImportJsonText('');
      if (soundEnabled) soundFx.success();
      setScreenStage('playing');
      setLatestStory(null);
      setTravelGoalId(null);
      const successMsg = 'นำเข้าเซฟสำเร็จ! เล่นต่อจากจุดเดิมได้ทันที';
      setActionToast(successMsg);
      setSaveStatusFeedback({ type: 'success', message: successMsg });
      return true;
    } catch (err: any) {
      if (soundEnabled) soundFx.warning();
      const detail = typeof err?.message === 'string' && /[\u0e00-\u0e7f]/.test(err.message) ? err.message : 'ไม่สามารถอ่านไฟล์ JSON นี้ได้';
      const errMsg = `ไฟล์เซฟไม่ถูกต้อง: ${detail}`;
      setActionToast(errMsg);
      setSaveStatusFeedback({ type: 'error', message: errMsg });
      return false;
    }
  };

  const playerSnapshot = useMemo(() => hasStartedRun ? JSON.stringify({
    version: 'after-zero-1.0-save-bundle', playerName, currentBioId, pastLives, triggeredEchoIds,
    mutationMilestones: recordedMutationMilestones, zonePopulations: syncedZonePopulations,
    gameState: {...gameState, npcZones: syncedZonePopulations, characterProfile: snapshotCharacter(currentBio)},
  }) : null, [hasStartedRun, playerName, currentBioId, pastLives, triggeredEchoIds,
    recordedMutationMilestones, syncedZonePopulations, gameState, currentBio]);

  // District settlement endings are explicit choices; core endings use climax events.
  const storyActionsList = filteredActions.filter(a => (a.group === 'story' && !a.ending) || a.id.startsWith('bkk_') || a.id.startsWith('route.'));
  const careActionsList = filteredActions.filter(a => a.group === 'care' && !a.id.startsWith('bkk_') && !a.id.startsWith('route.'));
  const routeGuidance = useMemo(() => getRouteGuidance(effectiveGameState), [effectiveGameState]);
  const guidanceSession = routeAssistanceEnabled && !gameState?.ending && routeGuidanceSession.runId === gameState?.runId ? routeGuidanceSession : null;
  const pinnedRoute = guidanceSession ? routeGuidance.find(route => route.routeId === guidanceSession.pinnedRouteId) : undefined;
  const suggestedRoutes = guidanceSession ? routeGuidance.filter(route => route.eligible && !guidanceSession.dismissedRouteIds.includes(route.routeId)) : [];
  const pinnedPlaceId = pinnedRoute?.nextStep?.placeId || (pinnedRoute?.requirementsMet ? pinnedRoute.destination : null);
  const pinnedActionId = pinnedRoute?.nextStep?.actionId;
  const primaryStoryAction = storyActionsList.find(action => action.id === pinnedActionId) || storyActionsList.find(action => action.preview.enabled);
  const otherStoryActions = storyActionsList.filter(action => action !== primaryStoryAction);

  const mapPlaces = useMemo(() => buildMapLocations(production, effectiveGameState, syncedZonePopulations, triggeredEchoIds, {currentBio,pastLives}, {showRouteHints}),
    [production, effectiveGameState, syncedZonePopulations, triggeredEchoIds, currentBio, pastLives, showRouteHints]);
  const activeTravelGoalPlace = useMemo(
    () => (travelGoalId && gameState?.place !== travelGoalId ? mapPlaces.find(p => p.id === travelGoalId) : undefined),
    [travelGoalId, gameState?.place, mapPlaces]
  );
  const mapNotificationCount = mapPlaces.filter(p => p.signals.length > 0).length;
  const mapHasUrgentNews = mapPlaces.some(p => p.signals.some(s => s.kind === 'crisis'));
  const currentWeatherAndHazard = useMemo(
    () => getDailyWeatherAndZoneHazard(effectiveGameState),
    [effectiveGameState]
  );

  // Life summary when an ending is reached
  const endingChronicle = useMemo(() => {
    if (!production || !effectiveGameState || !effectiveGameState.ending) return null;
    try {
      return production.summarize(effectiveGameState);
    } catch {
      return null;
    }
  }, [production, effectiveGameState]);

  // Unified Blocking Life-Sim / World Timeline / Proactive Ally / Ending Climax / Dynamic Engine Modal
  const rawActiveLifeSimModal =
    activeLifeSimModal ||
    activeTimelineWorldModal ||
    activeProactiveAllyModal ||
    activeEndingClimaxModal ||
    activeDynamicEngineModal;
  const canonicalRawModalPlaceId = rawActiveLifeSimModal?.placeId === 'tower' ? 'radio' : rawActiveLifeSimModal?.placeId;
  const currentActiveLifeSimModal=rawActiveLifeSimModal&&gameState?prepareNpcModal(rawActiveLifeSimModal,gameState,(canonicalRawModalPlaceId?syncedZonePopulations[canonicalRawModalPlaceId]:undefined)||syncedZonePopulations[rawActiveLifeSimModal.placeId]):null;

  const openStoryHistory = () => {
    setJournalSubTab('story');
    setSelectedStoryDay('all');
    setMobileTab('journal');
    setDesktopSideTab('journal');
    requestAnimationFrame(() => document.getElementById('life-story-history')?.scrollIntoView({ block: 'start' }));
  };

  const availableStoryDays = useMemo(() => {
    const days = new Set<number>();
    (gameState?.log || []).forEach((entry: any) => {
      const d = typeof entry === 'string' ? 1 : entry?.day || 1;
      days.add(d);
    });
    return Array.from(days).sort((a, b) => b - a);
  }, [gameState?.log]);

  const displayedJournalLog = useMemo(() => {
    if (selectedStoryDay === 'all' || !availableStoryDays.includes(selectedStoryDay)) return gameState?.log || [];
    return (gameState?.log || []).filter((entry: any) => {
      const d = typeof entry === 'string' ? 1 : entry?.day || 1;
      return d === selectedStoryDay;
    });
  }, [gameState?.log, selectedStoryDay, availableStoryDays]);
  const formatStoryEffect = (effect: string) => {
    if (showNumericSpoilers) return effect;
    const trust = effect.match(/^ความไว้ใจของ(.+?) ([+-])\d+$/);
    if (trust) return trust[1] + (trust[2] === '+' ? 'เริ่มเปิดใจมากขึ้น' : 'ระแวงมากขึ้น');
    if (/^ถุงเลือดพกพา -/.test(effect)) return 'ใช้ถุงเลือดพกพา';
    return translateNumericNoteToNarrative(effect).replace(/อาจ/g, '').replace(/^เสี่ยง/, '');
  };
  const storyFeed = <StoryFeed
    log={gameState?.log || []}
    latest={latestStory?.runId === gameState?.runId ? latestStory : null}
    formatEffect={formatStoryEffect}
    onHistory={openStoryHistory}
  />;
  const renderStoryAction = (action: any, primary = false) => {
    const isLocked = !action.preview?.enabled;
    const rawReasonsList: string[] = [];
    if (action.preview?.reason) {
      rawReasonsList.push(action.preview.reason);
    } else if (Array.isArray(action.preview?.reasons) && action.preview.reasons.length > 0) {
      rawReasonsList.push(...action.preview.reasons);
    } else if (Array.isArray(action.reasons) && action.reasons.length > 0) {
      rawReasonsList.push(...action.reasons);
    }
    const rawDisabledReason = rawReasonsList.filter(Boolean).join(' · ') || 'ยังไม่พร้อมทำกิจกรรมนี้';
    let disabledReason = showNumericSpoilers
      ? rawDisabledReason
      : sanitizeNonSpoilerReason(rawDisabledReason);

    if (!showNumericSpoilers) {
      disabledReason = disabledReason
        .replace(/ความไว้ใจ\s*\d+\/\d+/g, 'ความไว้ใจจากผู้คนยังไม่พอ')
        .replace(/ตัวอย่าง\s*\d+\/\d+/g, 'ขาดหลอดตัวอย่างเชื้อ')
        .replace(/ชุดเย็บแผล\s*\d+\/\d+/g, 'ขาดชุดเย็บแผล')
        .replace(/อาหารกระป๋อง\s*\d+\/\d+/g, 'ขาดเสบียงอาหาร');
    }

    const costs: string[] = [];
    const dayCost =
      typeof action.preview?.dayCost === 'number'
        ? action.preview.dayCost
        : typeof action.dayCost === 'number'
        ? action.dayCost
        : null;

    if (dayCost !== null) {
      costs.push(dayCost === 0 ? 'ไม่ใช้วัน' : `ใช้ ${dayCost} วัน`);
    }

    if (Array.isArray(action.preview?.costSummary)) {
      for (const costItem of action.preview.costSummary) {
        if (costItem && typeof costItem === 'string' && !costs.includes(costItem)) {
          costs.push(costItem);
        }
      }
    } else if (action.preview?.costs) {
      const { items = {}, blood = 0 } = action.preview.costs;
      if (blood > 0) {
        costs.push(`ใช้เลือด ${blood} ถุง`);
      }
      for (const [key, qty] of Object.entries(items)) {
        if (typeof qty === 'number' && qty > 0) {
          const label = (production?.catalog as any)?.LABELS?.[key] || key;
          costs.push(`ใช้ ${label} ${qty}`);
        }
      }
    }

    let cleanDescription = (action.description || '').trim();
    cleanDescription = cleanDescription
      .replace(/^(?:ใช้\s*)?1\s*วัน\s*[·•\-]\s*/, '')
      .replace(/\s*[·•\-]\s*(?:ใช้\s*)?1\s*วัน$/, '');

    if (isLocked) {
      cleanDescription = cleanDescription
        .replace(/\s*[·•\-]\s*ยังไม่ผ่านเงื่อนไขกิจกรรม$/, '')
        .replace(/\s*[·•\-]\s*เลือกคำตอบของเหตุการณ์ก่อน$/, '');
    }

    const isPinned = action.id === pinnedActionId;

    return (
      <button
        key={action.id}
        type="button"
        data-action-id={action.id}
        data-locked={isLocked}
        onClick={() => {
          if (isLocked) {
            if (soundEnabled) soundFx.warning();
            setActionToast(`ยังทำไม่ได้: ${disabledReason}`);
          } else {
            handlePerformAction(action.id);
          }
        }}
        className={`story-action ${primary ? 'story-action-primary' : ''} ${isPinned ? 'is-pinned' : ''} ${isLocked ? 'story-action-locked opacity-75' : ''}`}
        title={isLocked ? disabledReason : undefined}
      >
        <span className="story-action-title">
          <span className="story-action-title-text">{action.name}</span>
          {isPinned && <span className="story-action-pin-badge">📌 ปักหมุด</span>}
          <ArrowRight size={16} aria-hidden="true" />
        </span>
        {isPinned && <span className="route-pin-label">เป้าหมายที่ปักหมุด</span>}
        {cleanDescription && (
          <span className="story-action-description">{cleanDescription}</span>
        )}
        {costs.length > 0 && (
          <span className="story-action-costs" aria-label={`ต้นทุน: ${costs.join(', ')}`}>
            {costs.map((cost, idx) => (
              <span key={idx} className="story-action-cost-tag">{cost}</span>
            ))}
          </span>
        )}
        {isLocked && (
          <span className="story-action-disabled-reason text-amber-300 font-medium">
            🔒 {disabledReason}
          </span>
        )}
      </button>
    );
  };
  return (
    <div data-screen={screenStage} data-ending={Boolean(screenStage === 'playing' && rawViewModel?.ending)} data-mobile-tab={mobileTab} data-playing={screenStage === 'playing'} className={`game-shell min-h-screen bg-[#0c1310] text-slate-100 flex flex-col pb-16 lg:pb-0 selection:bg-lime-400 selection:text-slate-950 ${isScreenShaking ? 'screen-shake' : ''}`}>
      {isScreenShaking && <div className="damage-vignette" />}
      <PlayerServices snapshot={playerSnapshot} onRestore={handleImportSaveJson} onBackup={handleExportSaveJson} />
      {hasStartedRun && !localSaveStatus.error && localSaveStatus.savedAt && <p className="px-4 py-1 text-xs text-slate-400" role="status">บันทึกในเครื่องแล้ว {new Date(localSaveStatus.savedAt).toLocaleTimeString('th-TH')}</p>}
      {localSaveStatus.error && <div role="alert" className="sticky top-0 z-50 border-b border-amber-500 bg-amber-950 px-4 py-3 text-sm text-amber-100">
        บันทึกลงเครื่องไม่สำเร็จ กรุณาดาวน์โหลดเซฟสำรองก่อนปิดเกม
        {hasStartedRun && <button type="button" className="ml-3 underline" onClick={handleExportSaveJson}>สำรองเซฟตอนนี้</button>}
      </div>}
      {showPlayerGuide && <PlayerModal title="ก่อนเริ่มชีวิตนี้" onClose={closePlayerGuide}>
        <div className="space-y-4 text-sm leading-relaxed text-slate-200">
          <p>เจ้าเป็นซอมบี้ที่ยังมีสติ เลือกสำรวจ ช่วยคนเป็น หรือหาทางเอาตัวรอดก่อนกองทัพกวาดล้างเมือง</p>
          <p>ดูแลสภาพร่าง ความหิว และสติ เลือดช่วยดับความหิว ส่วนอาหารกระป๋องมีไว้แบ่งให้คนเป็น</p>
          <p>อ่านผลและเวลาของแต่ละตัวเลือกก่อนกด บางกิจกรรมใช้หนึ่งวัน บางบทสนทนาไม่ใช้วัน คนเป็นยังกลัวเจ้า จงรักษาระยะและค่อย ๆ สร้างความไว้ใจ</p>
          <p>เกมบันทึกอัตโนมัติในเบราว์เซอร์นี้ ดาวน์โหลดเซฟสำรองได้จากเมนูบันทึก เพื่อเก็บชีวิตที่เล่นไว้เมื่อย้ายเครื่อง</p>
          <p>แต่ละชีวิตอาจจบเร็วหรือยาวต่างกัน บทจบที่ยังไม่เคยพบจะเก็บเป็นความลับในคลังบทจบ</p>
          <button type="button" onClick={closePlayerGuide} className="rounded-xl bg-lime-300 px-4 py-3 font-bold text-slate-950">เข้าใจแล้ว</button>
        </div>
      </PlayerModal>}
      {showEndingCollection && production && <EndingCollection catalog={production.catalog.ENDINGS} lives={pastLives}
        currentEndingId={hasStartedRun ? effectiveGameState?.ending?.id : undefined} onClose={() => setShowEndingCollection(false)} />}
      {/* STICKY COMPACT TOP HUD */}
      {screenStage !== 'login' && <header className="game-hud sticky top-0 z-30 bg-[#0c1310]/95 backdrop-blur-md border-b border-emerald-950/80 px-3 sm:px-6 py-2.5">
        <div className="max-w-[1380px] mx-auto flex flex-col gap-2">
          {/* Top Row: Brand, Timeline Date, Kill Count Badge & Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setScreenStage('hub');
                }}
                className="text-sm sm:text-base font-extrabold tracking-tight text-lime-300 whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                AFTER ZERO <span className="text-xs font-mono text-emerald-400/90">1.0</span>
              </button>

              {rawViewModel && screenStage === 'playing' && (
                <div className="hud-desktop-context hidden lg:flex items-center gap-1.5 text-xs text-slate-300 truncate">
                  <span className="text-slate-600">·</span>
                  <span className="font-mono text-amber-300 font-semibold shrink-0 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    วันที่ {rawViewModel.day} · {formatTimelineDate(rawViewModel.day)}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-emerald-200 font-medium truncate">
                    {rawViewModel.place?.short || rawViewModel.place?.name}
                  </span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded border shrink-0 flex items-center gap-1 ${
                      daysUntilBombing <= 20
                        ? 'bg-rose-950/90 border-rose-500 text-rose-200 animate-pulse'
                        : 'bg-amber-950/70 border-amber-500/50 text-amber-200'
                    }`}
                    title="เมื่อครบ 120 วัน กองทัพจะทิ้งระเบิดเพลิงปูพรมเผาทำลายเขตกักกันกรุงเทพฯ ทั้งหมด"
                  >
                    <Flame className="w-3 h-3 text-amber-400" />
                    <span>ระเบิดปูพรม: อีก {daysUntilBombing} วัน</span>
                  </span>
                  <span className="text-slate-600">·</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded border shrink-0 flex items-center gap-1 ${
                      currentKillCount > 0
                        ? 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                    title="จำนวนมนุษย์ที่คุณสังหารในชีวิตนี้ (การฆ่าคนจะลดความเป็นมนุษย์ลง)"
                  >
                    <Skull className="w-3 h-3 text-rose-400" />
                    <span>ฆ่าคน: {currentKillCount} ศพ</span>
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <>
                <button
                  type="button"
                  onClick={() => setScreenStage('hub')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-200 flex items-center gap-1 transition-colors"
                  title="กลับหน้าเลือกเซฟ / สุ่มตัวละคร"
                >
                  <Shuffle className="w-3.5 h-3.5 text-lime-300" />
                  <span className="hidden sm:inline">หน้าเซฟ/สุ่มตัวละคร</span>
                </button>
              </>



              <button
                type="button"
                onClick={() => {
                  const nextAmb = !ambientEnabled;
                  if (nextAmb && !soundEnabled) setSoundEnabled(true);
                  setAmbientEnabled(nextAmb);
                }}
                className={`px-2 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors ${
                  ambientEnabled && soundEnabled
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title={
                  ambientEnabled
                    ? 'ปิดเสียงบรรยากาศกรุงเทพฯ (ฝน/คลื่นวิทยุ/ไซเรน)'
                    : 'เปิดเสียงบรรยากาศกรุงเทพฯ (ฝน/คลื่นวิทยุ/ไซเรน)'
                }
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">
                  {ambientEnabled && soundEnabled ? 'บรรยากาศ: เปิด' : 'บรรยากาศ'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title={soundEnabled ? 'ปิดเสียงเอฟเฟกต์' : 'เปิดเสียงเอฟเฟกต์'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-lime-300" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {screenStage === 'playing' && rawViewModel && (
            <div className="mobile-dayline lg:hidden flex justify-between gap-3 text-xs">
              <span className="font-bold text-amber-200">วันที่ {rawViewModel.day} · {formatTimelineDate(rawViewModel.day)}</span>
              <span className="truncate text-emerald-200">{rawViewModel.place?.short}</span>
            </div>
          )}
          {/* Second Row (Only when actively playing): Always-Visible Compact Vital Statistics */}
          {screenStage === 'playing' && rawViewModel && (
            <div className="hud-vitals grid grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2.5 pt-0.5">
              {rawViewModel.vitals.map((v: any) => {
                const isHunger = v.id === 'hunger';
                const isDanger =
                  (isHunger && v.value >= 75) || (!isHunger && v.value <= 25);
                const isCaution =
                  !isDanger &&
                  ((isHunger && v.value >= 55) || (!isHunger && v.value <= 45));

                const barColor = isDanger
                  ? 'bg-rose-500'
                  : isCaution
                  ? 'bg-amber-400'
                  : v.id === 'hp'
                  ? 'bg-emerald-400'
                  : v.id === 'hunger'
                  ? 'bg-orange-400'
                  : 'bg-sky-400';

                return (
                  <div
                    key={v.id}
                    className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border transition-colors ${
                      isDanger
                        ? 'bg-rose-950/40 border-rose-500/60'
                        : 'bg-slate-900/80 border-slate-800/90'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] sm:text-xs">
                      <span
                        className={`font-medium flex items-center gap-1 truncate ${
                          isDanger ? 'text-rose-200 font-semibold' : 'text-slate-300'
                        }`}
                      >
                        {v.id === 'hp' && <Heart className="w-3 h-3 text-emerald-400 shrink-0" />}
                        {v.id === 'hunger' && <Flame className="w-3 h-3 text-orange-400 shrink-0" />}
                        {v.id === 'sanity' && <Brain className="w-3 h-3 text-sky-400 shrink-0" />}
                        <span className="truncate">{v.label}</span>
                      </span>
                      <span
                        className={`font-mono tabular-nums font-bold shrink-0 ${
                          isDanger ? 'text-rose-300' : 'text-slate-100'
                        }`}
                      >
                        {v.value}/{v.max}
                      </span>
                    </div>
                    <div className="w-full h-1 sm:h-1.5 bg-slate-950 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${Math.max(0, Math.min(100, v.value))}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* 4th Vital Bar: Humanity, Mutation & Kill Count */}
              <div hidden={false} data-secondary-vital
                className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border transition-colors ${
                  currentHumanity <= 25
                    ? 'bg-rose-950/40 border-rose-500/60'
                    : 'bg-slate-900/80 border-slate-800/90'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] sm:text-xs">
                  <span className="font-medium text-slate-300 flex items-center gap-1 truncate">
                    <Users className="w-3 h-3 text-teal-400 shrink-0" />
                    <span className="truncate">ความเป็นมนุษย์</span>
                  </span>
                  <span className="font-mono tabular-nums font-bold text-teal-300 shrink-0">
                    {currentHumanity}/100{' '}
                    <span className="text-rose-400 text-[10px]">
                      (ฆ่า {currentKillCount})
                    </span>
                  </span>
                </div>
                <div className="w-full h-1 sm:h-1.5 bg-slate-950 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full transition-all duration-300 ${
                      currentHumanity <= 25 ? 'bg-rose-500' : 'bg-teal-400'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, currentHumanity))}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </header>}

      {/* =====================================================================
          STAGE 1: LOGIN SCREEN
         ===================================================================== */}
      {screenStage === 'login' && (
        <main className="title-screen" aria-label="หน้าไตเติล AFTER ZERO">
          <img className="title-backdrop" src={titleBackground} alt="" fetchPriority="high" />
          <div className="title-shade" aria-hidden="true" />
          {hasStartedRun && (
            <div className="title-character" aria-hidden="true">
              <ZombiePortrait bio={currentBio} mutation={Math.floor(gameState?.stats?.mutation || 0)} />
            </div>
          )}
          <div className="title-content">
            <h1 className="title-wordmark"><span>AFTER</span><span>ZERO <small>1.0</small></span></h1>
            <p className="title-subtitle">กรุงเทพฯ หลังวันศูนย์ · รุ่นทดลอง</p>
            <form className="title-menu" onSubmit={e => handleLoginSubmit(e, hasStartedRun ? 'continue' : 'new')}>
              {hasStartedRun ? (
                <>
                  <button type="submit" className="title-button title-button-primary"><Play size={18} aria-hidden="true" />เล่นต่อ</button>
                  <p className="title-save-note">{formatTimelineDate(gameState.day)} · {production?.catalog.PLACES[gameState.place]?.short || currentBio.occupation}</p>
                  <button type="button" className="title-button title-button-secondary" onClick={() => handleLoginSubmit(undefined, 'new')}>เริ่มชีวิตใหม่</button>
                </>
              ) : (
                <button type="submit" className="title-button title-button-primary"><Play size={18} aria-hidden="true" />เริ่มชีวิตใหม่</button>
              )}
              <button type="button" className="title-text-button" onClick={() => handleLoginSubmit(undefined, 'hub')}>จัดการเซฟ / นำเข้าเซฟ</button>
              <details className="title-settings">
                <summary>ตั้งค่าและชื่อผู้เล่น <ChevronDown size={14} aria-hidden="true" /></summary>
                <div className="title-settings-content">
                  <label htmlFor="title-player-name"><UserCheck size={15} aria-hidden="true" />ชื่อผู้เล่น</label>
                  <input id="title-player-name" type="text" maxLength={80} value={loginInput} onChange={e => setLoginInput(e.target.value)} placeholder="กรอกชื่อผู้เล่น..." />
                  <button type="button" className="title-text-button" aria-pressed={soundEnabled} onClick={() => setSoundEnabled(enabled => !enabled)}>เสียงเกม {soundEnabled ? 'เปิด' : 'ปิด'}</button>
                </div>
              </details>
              <button type="button" className="title-text-button" onClick={() => setShowPlayerGuide(true)}>วิธีเล่น</button>
              <button type="button" className="title-text-button" onClick={() => setShowEndingCollection(true)}>บทจบที่ค้นพบ</button>
              <p className="text-xs text-slate-400">เล่นแบบ Guest · เซฟอยู่ในเบราว์เซอร์นี้ สำรองไฟล์ไว้เพื่อย้ายเครื่อง</p>

            </form>
            <details className="title-about">
              <summary>เรื่องราวก่อนเริ่มชีวิต</summary>
              <p>เมื่อหัวใจหยุดเต้นแต่ความทรงจำยังไม่ดับลง — ตื่นขึ้นในเขตกักกันพิเศษกรุงเทพมหานคร วันที่ 15 ตุลาคม ก่อนที่กองทัพจะทิ้งระเบิดเพลิงปูพรมเผากรุงเทพฯ ในวันที่ 120 เลือกช่วยเหลือผู้คน พาคู่หูหนีพ้นเมือง หรือเปลี่ยนชะตาของตัวเองก่อนเวลาหมดลง</p>
            </details>
          </div>
        </main>
      )}

      {/* =====================================================================
          STAGE 2: SAVE LOAD & CHARACTER ROLL HUB
         ===================================================================== */}
      {screenStage === 'hub' && rawViewModel && gameState && (
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-lime-300">ผู้เล่น: {playerName}</div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
                เลือกโหลดเซฟปัจจุบัน หรือสุ่มตัวละครใหม่
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                ไทม์ไลน์เริ่มต้นเดียวกันที่ {TIMELINE_START_DATE_LABEL}
              </p>
            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={() => setScreenStage('login')}
                className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                กลับหน้าหลัก
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CARD 1: LOAD EXISTING SAVE */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-300 font-bold">เซฟปัจจุบันในเครื่อง</span>
                  {hasStartedRun && <span className="text-amber-300">{formatTimelineDate(rawViewModel.day)}</span>}
                </div>
                {hasStartedRun ? <>
                  <h2 className="text-lg font-extrabold text-white">
                    อดีต{currentBio.occupation} (เพศ{currentBio.gender} · อายุ {currentBio.age} ปี)
                  </h2>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 text-slate-300">
                    <div>
                      <span className="text-slate-500">สถานที่ปัจจุบัน:</span>{' '}
                      <span className="font-semibold text-lime-200">{rawViewModel.place?.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">ของติดตัวก่อนตาย:</span>{' '}
                      <span className="text-amber-200">{currentBio.signatureItemName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">สถานะร่าง:</span>{' '}
                      <span className="font-mono">
                        HP {Math.floor(gameState.stats?.hp || 0)}/100 · สติ{' '}
                        {Math.floor(gameState.stats?.sanity || 0)}/100 · ความเป็นมนุษย์{' '}
                        {currentHumanity}/100 · ฆ่าคน {currentKillCount} ศพ
                      </span>
                    </div>
                  </div>
                </> : <p className="text-sm text-slate-300">ยังไม่มีเซฟ เริ่มจากสุ่มตัวละครใหม่หรือนำเข้าไฟล์เซฟของเจ้า</p>}
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={!hasStartedRun}
                  onClick={() => {
                    if (soundEnabled) soundFx.click();
                    setScreenStage('playing');
                  }}
                  className="w-full py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {gameState.ending ? 'ดูบทสรุปของเซฟนี้' : 'โหลดเซฟเล่นต่อทันที'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!hasStartedRun}
                    onClick={handleExportSaveJson}
                    className="flex-1 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-3.5 h-3.5 text-lime-300" />
                    ส่งออกเซฟ (.json)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImportBox(!showImportBox)}
                    className="flex-1 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-300" />
                    นำเข้าไฟล์เซฟ
                  </button>
                </div>

                {saveStatusFeedback && <p role={saveStatusFeedback.type === 'error' ? 'alert' : 'status'} className={`rounded-xl border p-3 text-sm ${saveStatusFeedback.type === 'error' ? 'border-red-500 text-red-200' : 'border-lime-500 text-lime-200'}`}>{saveStatusFeedback.message}</p>}
                {showImportBox && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <label className="block text-sm">เลือกไฟล์เซฟจากเครื่อง
                      <input type="file" accept=".json,application/json" className="mt-2 block w-full"
                        onChange={async event => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          if (!file) return;
                          try {
                            if (file.size > 10 * 1024 * 1024) throw new Error('ไฟล์ใหญ่เกินไป');
                            handleImportSaveJson(await file.text());
                          } catch {
                            setSaveStatusFeedback({type: 'error', message: 'อ่านไฟล์เซฟไม่สำเร็จ กรุณาเลือกไฟล์ที่ส่งออกจากเกม'});
                          }
                        }} />
                    </label>
                    <textarea
                      value={importJsonText}
                      onChange={e => setImportJsonText(e.target.value)}
                      placeholder="วาง JSON ของไฟล์เซฟที่นี่..."
                      rows={3}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleImportSaveJson()}
                      className="w-full py-2 rounded-lg bg-lime-400 text-slate-950 font-bold text-xs"
                    >
                      ยืนยันนำเข้าเซฟ
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* CARD 2: ROLL NEW CHARACTER */}
            <div className="p-6 rounded-2xl bg-slate-900 border-2 border-lime-400/50 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-lime-300 font-bold">เริ่มต้นชีวิตใหม่</span>
                  <span className="text-amber-300">15 ตุลาคม</span>
                </div>
                <h2 className="text-lg font-extrabold text-white">
                  สุ่มตัวละครผู้ติดเชื้อตนใหม่
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  สุ่มอายุ 10–80 ปี เพศ และอาชีพตามช่วงวัยในกรุงเทพฯ พร้อมรูปลักษณ์และของติดตัวจากชีวิตก่อนตาย
                </p>
              </div>

              <button
                type="button"
                onClick={handleRollCharacterPreview}
                className="w-full py-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-extrabold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <Shuffle className="w-4 h-4" />
                สุ่มตัวละครใหม่
              </button>
            </div>
          </div>
        </main>
      )}

      {/* =====================================================================
          STAGE 3: PLAYING SCREEN
         ===================================================================== */}
      {screenStage === 'playing' && rawViewModel?.ending && gameState && (
        <EndingExperience state={effectiveGameState} ending={effectiveGameState.ending} bio={currentBio} zones={syncedZonePopulations} chronicle={endingChronicle} finalChoice={latestStory && latestStory.runId === effectiveGameState.runId && latestStory.endingOutcomeId === effectiveGameState.ending.id ? latestStory : undefined} onNewLife={handleRollCharacterPreview} onHub={()=>setScreenStage('hub')} onCollection={() => setShowEndingCollection(true)} />
      )}
      {screenStage === 'playing' && rawViewModel && !rawViewModel.ending && gameState && (
        <main className="flex-1 max-w-[1380px] w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
          {/* Consequence Feedback Toast (Fixed Floating) */}
          {actionToast && (
            <div role="status" className="action-toast fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] max-w-lg w-[92%] px-4 py-3 rounded-2xl bg-slate-900/95 border-2 border-lime-400 text-xs sm:text-sm text-lime-100 shadow-2xl flex items-center justify-between gap-3 animate-fade-in backdrop-blur-md">
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-semibold truncate">{actionToast}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActionToast(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 shrink-0 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* COLLAPSIBLE COMPACT SCROLLABLE NPC CRISIS ALERTS DRAWER (Mobile-First Dashboard Strip) */}
          {!rawViewModel.ending && allActiveCityCrises.length > 0 && (
            <div className="city-alerts mb-4 rounded-xl bg-slate-900/95 border border-amber-500/40 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsCrisisListExpanded(prev => !prev)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                    <span className="font-bold text-amber-200">
                      วิกฤตผู้รอดชีวิต ({allActiveCityCrises.length} คน)
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="font-mono text-[11px] text-amber-300/90">
                      เขตนี้ {activeZoneCrises.length} คน
                    </span>
                    {!isCrisisListExpanded && allActiveCityCrises[0] && (
                      <>
                        <span className="hidden sm:inline text-slate-500">·</span>
                        <span className="text-[11px] text-slate-300 truncate max-w-[200px] sm:max-w-xs">
                          ด่วน: {allActiveCityCrises[0].npc.met ? allActiveCityCrises[0].npc.name : 'มีคนต้องการความช่วยเหลือ'} ({allActiveCityCrises[0].placeName})
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-semibold text-amber-300">
                  <span>{isCrisisListExpanded ? 'ย่อเก็บ' : 'ดูรายการ'}</span>
                  {isCrisisListExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {isCrisisListExpanded && (
                <div className="max-h-36 sm:max-h-44 overflow-y-auto overscroll-contain border-t border-slate-800 divide-y divide-slate-800/80 bg-slate-950/90 px-3 py-1">
                  {allActiveCityCrises.map(({ npc, placeName, isCurrentZone }) => (
                    <div
                      key={`${npc.id}-${placeName}`}
                      className="py-2 flex items-start justify-between gap-2.5 text-xs"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-slate-100">{npc.met ? npc.name : 'ยังไม่รู้ว่าเป็นใคร'}</span>
                          <span className="text-slate-500">·</span>
                          <span
                            className={`font-mono text-[11px] ${
                              isCurrentZone ? 'text-lime-300 font-semibold' : 'text-slate-400'
                            }`}
                          >
                            {isCurrentZone ? `เขตนี้ (${placeName})` : placeName}
                          </span>
                          <span className="text-slate-500">·</span>
                          {npc.met && <span className="font-mono text-[11px] text-emerald-300">ไว้ใจ {npc.trust}/100</span>}
                        </div>
                        <p className="text-[11px] text-amber-200/90 leading-snug line-clamp-2">
                          {npc.met ? npc.crisisText : 'มีเบาะแสว่าคนในย่านนี้กำลังเดือดร้อน'}
                        </p>
                      </div>

                      {!gameState.pending && (
                        <div className="shrink-0 pt-0.5">
                          {isCurrentZone ? (
                            <button
                              type="button"
                              onClick={() => handleOpenFreeformNpcModal(npc.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] transition-colors whitespace-nowrap"
                            >
                              เข้าช่วย (1 วัน)
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setMobileTab('map');
                                setDesktopSideTab('map');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-[11px] transition-colors whitespace-nowrap"
                            >
                              ไปที่แผนที่
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ===============================================================
                PRIMARY STAGE (Left 7 cols on Desktop, 'play' tab on Mobile)
               =============================================================== */}
            <div
              className={`primary-stage lg:col-span-7 space-y-4 ${
                mobileTab === 'play' ? 'block' : 'hidden lg:block'
              }`}
            >
              {/* Scene Canvas & Location Banner */}
              <div
                data-mutation-stage={currentMutationStage.stageNumber}
                className="character-scene rounded-2xl overflow-hidden border border-slate-800/90 bg-slate-900/90 shadow-xl transition-all duration-300"
              >
                <div className="scene-art relative">
                  <canvas
                    ref={canvasRef}
                    width={320}
                    height={144}
                    className="w-full h-44 sm:h-56 object-cover block bg-[#14251f]"
                    style={{ imageRendering: 'pixelated' }}
                  />

                  <div className="character-portrait">
                    <ZombiePortrait
                      animated
                      bio={currentBio}
                      mutation={Math.floor(gameState?.stats?.mutation || 0)}
                    />
                  </div>
                  {/* Top-left Character Bio & Zone Trust Average + Kill Count */}
                  <div className="scene-badges absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                    <span className="px-2.5 py-1 rounded-md bg-slate-950/85 backdrop-blur-sm border border-slate-800 text-[11px] font-medium text-slate-200">
                      อดีต{currentBio.occupation} · {getCharacterAgeGroup(currentBio.age)} · อายุ {currentBio.age} ปี
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-md bg-slate-950/85 backdrop-blur-sm border border-amber-500/50 text-[11px] font-mono text-amber-300">
                        ก่อนทิ้งระเบิดกรุงเทพฯ {daysUntilBombing} วัน
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-slate-950/85 backdrop-blur-sm border border-sky-500/40 text-[11px] font-mono text-sky-200">
                        อากาศ: {currentWeatherAndHazard.weatherBadge}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-md bg-slate-950/85 backdrop-blur-sm border text-[11px] font-mono ${
                          currentWeatherAndHazard.localThreat >= 60
                            ? 'border-rose-500/60 text-rose-300'
                            : currentWeatherAndHazard.localThreat >= 35
                            ? 'border-amber-500/50 text-amber-200'
                            : 'border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        ภัยพื้นที่ {currentWeatherAndHazard.localThreat}/100 ({currentWeatherAndHazard.threatTierTitle})
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-slate-950/85 backdrop-blur-sm border border-slate-800 text-[11px] font-mono text-emerald-300">
                        ไว้ใจพื้นที่ {currentZoneTrustStats.averageTrust}/100 ({currentZoneTrustStats.livingCount} คน)
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-slate-950/85 backdrop-blur-sm border border-rose-500/40 text-[11px] font-mono text-rose-300">
                        ฆ่าคน {currentKillCount} ศพ
                      </span>
                    </div>
                  </div>

                </div>
                {/* Bottom Location Title & Timeline Date */}
                <div className="scene-caption">
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-lime-300">
                      {formatTimelineDate(rawViewModel.day)} · {currentMutationStage.title}
                    </div>
                    <h1 className="text-base sm:text-xl font-bold text-white leading-tight break-words">
                      {rawViewModel.place?.name}
                    </h1>
                    {rawViewModel.place?.description && (
                      <p className="text-xs text-slate-300 mt-1 break-words">
                        {rawViewModel.place?.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="scene-vitals" aria-label="สถานะร่างปัจจุบัน">
                  {[
                    {key: 'hp', label: 'สภาพร่าง'},
                    {key: 'hunger', label: 'ความหิว'},
                    {key: 'sanity', label: 'สติ'},
                  ].map(({key, label}) => {
                    const value = Math.floor(gameState.stats?.[key] ?? 0);
                    return (
                      <div key={key} data-vital={key}>
                        <span>{label} <strong>{value}</strong></span>
                        <div role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
                          <i style={{width: `${Math.max(0, Math.min(100, value))}%`}} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Daily Hunger Pressure & Carried Items Strip */}
                <div className="scene-inventory px-4 py-2.5 bg-slate-950/90 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-200/90">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{rawViewModel.pressure}</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">
                    ของติดตัว: {currentBio.signatureItemName}
                    {carriedInventoryItems.length > 1
                      ? ' · ' +
                        carriedInventoryItems
                          .slice(1)
                          .map(i => `${i.name} ${i.count}`)
                          .join(' · ')
                      : ''}
                  </div>
                </div>
              </div>

              {/* CURRENT SITUATION */}
              {(() => {
                const placeDesc = (rawViewModel.place?.description || '').trim();
                const situationCandidates = [
                  rawViewModel.situation?.consequences?.[rawViewModel.situation.consequences.length - 1],
                  rawViewModel.situation?.clue,
                  rawViewModel.situation?.weather,
                  rawViewModel.situation?.profile?.text,
                  currentBio?.preDeathDetail,
                ];
                const situationText = situationCandidates.find(
                  t => typeof t === 'string' && t.trim().length > 0 && t.trim() !== placeDesc && !placeDesc.includes(t.trim())
                ) || rawViewModel.situation?.clue || currentBio?.preDeathDetail || '';

                const isHungerCritical = (gameState.stats?.hunger || 0) >= 75;
                const isSanityCritical = (gameState.stats?.sanity ?? 100) <= 35;
                const isThreatHigh = currentWeatherAndHazard.localThreat >= 60;

                return (
                  <div className="current-situation space-y-2.5">
                    <div className="current-situation-header">
                      <span className="current-situation-title">
                        สถานการณ์
                      </span>
                      <div className="current-situation-badges">
                        <span className="px-1.5 py-0.5 rounded bg-slate-950/80 border border-sky-500/30 text-sky-200">
                          {currentWeatherAndHazard.weatherBadge}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded bg-slate-950/80 border ${
                            isThreatHigh
                              ? 'border-rose-500/50 text-rose-300'
                              : currentWeatherAndHazard.localThreat >= 35
                              ? 'border-amber-500/40 text-amber-200'
                              : 'border-emerald-500/30 text-emerald-300'
                          }`}
                        >
                          {showNumericSpoilers
                            ? `ภัย ${currentWeatherAndHazard.localThreat}/100 (${currentWeatherAndHazard.threatTierTitle})`
                            : currentWeatherAndHazard.threatTierTitle}
                        </span>
                      </div>
                    </div>

                    {situationText && (
                      <p className="current-situation-text">
                        {situationText}
                      </p>
                    )}

                    {/* อาการสำคัญที่ต้องเห็นได้ก่อนกดกิจกรรม */}
                    {(isHungerCritical || isSanityCritical || isThreatHigh) && (
                      <div className="current-situation-alerts" aria-label="อาการสำคัญและภัยฉุกเฉิน">
                        {isHungerCritical && (
                          <div className="current-situation-alert is-hunger">
                            <strong className="current-situation-alert-badge">หิวจัด:</strong>
                            <span>กลิ่นเลือดคนเป็นทำให้ขากรรไกรสั่นเกร็ง สายตาเผลอจ้องเส้นเลือดที่ลำคอของผู้รอดชีวิต</span>
                          </div>
                        )}
                        {isSanityCritical && (
                          <div className="current-situation-alert is-sanity">
                            <strong className="current-situation-alert-badge">สติพร่าเลือน:</strong>
                            <span>ถ้อยคำในหัวแตกสลายเป็นเสียงครางต่ำ{(gameState.stats?.sanity ?? 100) < 30 ? ' · มือสั่นเกร็งจนไม่อาจเจรจาได้' : ''}</span>
                          </div>
                        )}
                        {isThreatHigh && (
                          <div className="current-situation-alert is-threat">
                            <strong className="current-situation-alert-badge">ภัยพื้นที่สูง ({currentWeatherAndHazard.localThreat}/100):</strong>
                            <span>{currentWeatherAndHazard.localThreat >= 85 ? 'ผู้คนและหน่วยลาดตระเวนตื่นตระหนกสุดขีด พร้อมยิงทันที' : 'ผู้คนในย่านนี้หวาดระแวงหนักและพกอาวุธคุ้มกันตัว เสี่ยงถูกทำร้าย'}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ส่วนเปิดอ่านเพิ่ม: รายละเอียดสภาพอากาศและสภาพร่าง */}
                    <details className="current-situation-details">
                      <summary>
                        <span>สภาพอากาศและสภาพร่างเพิ่มเติม</span>
                        <span className="font-mono text-[10px] text-lime-300/90">
                          เปิดอ่านเพิ่ม ▾
                        </span>
                      </summary>
                      <div className="current-situation-details-body">
                        <div>
                          <strong className="text-sky-200">สภาพอากาศวันนี้:</strong>{' '}
                          {showNumericSpoilers
                            ? currentWeatherAndHazard.weatherEffectSummary
                            : currentWeatherAndHazard.weatherEffectSummary.replace(/\s*\([^)]*[+-]\d+[^)]*\)/g, '')}
                        </div>
                        <div>
                          <strong className="text-amber-200">บรรยากาศพื้นที่ ({currentWeatherAndHazard.threatTierTitle}):</strong>{' '}
                          {showNumericSpoilers
                            ? currentWeatherAndHazard.threatEffectSummary
                            : currentWeatherAndHazard.localThreat >= 85
                            ? 'ผู้คนและหน่วยลาดตระเวนตื่นตระหนกสุดขีด พร้อมยิงหรือโจมตีผู้ติดเชื้อทันทีที่พบเห็น และยากมากที่จะทำให้ใครเชื่อใจ'
                            : currentWeatherAndHazard.localThreat >= 60
                            ? 'ผู้คนในย่านนี้หวาดระแวงหนักและพกอาวุธคุ้มกันตัว มีความเสี่ยงสูงที่จะถูกทำร้าย และสร้างความไว้ใจได้ยากขึ้นมาก'
                            : currentWeatherAndHazard.localThreat >= 35
                            ? 'ผู้คนเริ่มตั้งการ์ดระวังตัวจากข่าวการปะทะ อาจถูกขว้างปาสิ่งของไล่และต้องใช้เวลาพิสูจน์ใจนานขึ้น'
                            : 'พื้นที่ค่อนข้างสงบ ผู้คนยังไม่ตื่นตระหนกจนเกินไป'}
                        </div>
                        <div className="pt-1 border-t border-emerald-950/60">
                          <strong className="text-purple-300">{currentMutationStage.title}:</strong>{' '}
                          <span>{currentMutationStage.abilityText}</span>{' '}
                          <span className="text-amber-200/80">({currentMutationStage.sideEffectText})</span>
                        </div>
                      </div>
                    </details>
                  </div>
                );
              })()}

              {/* =============================================================
                  DAILY ACTIVITY GROUPS (Compact Above-the-Fold Mobile Grid)
                 ============================================================= */}
              <div className="daily-actions space-y-3">
                {guidanceSession && (pinnedRoute ? [pinnedRoute] : suggestedRoutes).map(route => (
                  <section key={route.routeId} data-route-guidance={route.routeId} className="route-guidance-card" aria-label={`ตัวช่วย${route.label}`}>
                    <h2>{pinnedRoute ? 'เป้าหมายที่ปักหมุด' : 'เส้นทางที่เจ้าเริ่มมองเห็น'} · {route.label}</h2>
                    {pinnedRoute && <p>{route.nextStep
                      ? `${route.nextStep.title} · ${production?.catalog.PLACES[route.nextStep.placeId]?.name || route.nextStep.placeId}`
                      : route.requirementsMet
                      ? `เดินทางไป${production?.catalog.PLACES[route.destination]?.name || route.destination} เพื่อติดตามผลของสิ่งที่เตรียมไว้`
                      : [
                          route.missingStatKeys.some(key => key === 'research') && 'ยังต้องศึกษาการตอบสนองของเชื้อ',
                          route.missingStatKeys.some(key => key === 'horde') && 'ยังต้องฝึกควบคุมฝูงให้มั่นคง',
                          route.missingStatKeys.some(key => key === 'mutation') && 'ร่างกายยังต้องปรับตัวอีก',
                          route.missingStatKeys.some(key => key === 'sanity') && 'ยังต้องประคองสติให้มั่นคง',
                          route.missingStatKeys.some(key => key === 'humanity') && 'ยังต้องรักษาความเห็นใจต่อคนเป็น',
                          route.missingStatKeys.some(key => key === 'trust') && 'ยังต้องสร้างความเชื่อใจจากผู้คน',
                          route.missingSamples && 'ยังต้องรวบรวมตัวอย่างเชื้อเพิ่มเติม',
                        ].filter(Boolean).join(' · ')}</p>}
                    {!pinnedRoute && <p>สิ่งที่เจ้าลงมือเตรียมเริ่มเป็นรูปเป็นร่างแล้ว จะติดตามงานที่เหลือต่อหรือไม่</p>}
                    <div className="route-guidance-buttons">
                      <button type="button" onClick={() => setRouteGuidanceSession({...guidanceSession, pinnedRouteId: pinnedRoute ? null : route.routeId})}>{pinnedRoute ? 'ปลดหมุด' : 'ปักหมุด'}</button>
                      {pinnedRoute && pinnedPlaceId && <button type="button" onClick={() => {setMobileTab('map'); setDesktopSideTab('map');}}>ดูเป้าหมายบนแผนที่</button>}
                      <button type="button" onClick={() => setRouteGuidanceSession({...guidanceSession, pinnedRouteId: pinnedRoute ? null : guidanceSession.pinnedRouteId, dismissedRouteIds: [...guidanceSession.dismissedRouteIds, route.routeId]})}>ไม่แนะนำเส้นทางนี้อีกในชีวิตนี้</button>
                    </div>
                  </section>
                ))}
                {/* Group B: Storylines */}
                <section className="scene-actions" aria-labelledby="scene-actions-heading">
                  <h2 id="scene-actions-heading">ตรงหน้าเจ้า</h2>
                  {primaryStoryAction && renderStoryAction(primaryStoryAction, true)}

                  {/* Group A: Freeform Zombie Life Simulation & Random NPC Encounters */}
                  <div className="scene-quick-actions">
                    <button type="button" onClick={() => {
                      if (!currentZonePop?.npcs.some(npc => npc.alive)) {
                        if (soundEnabled) soundFx.warning();
                        setActionToast('ไม่มีผู้รอดชีวิตที่ยังมีชีวิตอยู่ในเขตนี้แล้ว');
                      } else {
                        handleOpenFreeformNpcModal();
                      }
                    }} className={`story-action ${!currentZonePop?.npcs.some(npc => npc.alive) ? 'story-action-locked opacity-70' : ''}`}>
                      <span className="story-action-title">
                        <Users size={18} aria-hidden="true" />
                        <span className="story-action-title-text">พบผู้รอดชีวิต</span>
                        <ArrowRight size={16} aria-hidden="true" />
                      </span>
                      <span className="story-action-description">พูดคุย ช่วยเหลือ หรือล่า · {currentZoneTrustStats.livingCount} คน</span>
                      {!currentZonePop?.npcs.some(npc => npc.alive) && (
                        <span className="story-action-disabled-reason text-amber-300 font-medium">🔒 ไม่มีผู้รอดชีวิตเหลืออยู่ในเขตนี้</span>
                      )}
                    </button>
                    <button type="button" onClick={handleOpenFreeformRoamModal} className="story-action">
                      <span className="story-action-title">
                        <Search size={18} aria-hidden="true" />
                        <span className="story-action-title-text">สำรวจบริเวณนี้</span>
                        <ArrowRight size={16} aria-hidden="true" />
                      </span>
                      <span className="story-action-description">ค้นหาเสบียงและร่องรอย</span>
                    </button>
                  </div>
                  {otherStoryActions.length > 0 && <details className="other-story-actions" key={gameState.place}>
                    <summary>เหตุการณ์และเส้นทางอื่น ({otherStoryActions.length}) <ChevronDown size={16} aria-hidden="true" /></summary>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">{otherStoryActions.map(action => renderStoryAction(action))}</div>
                  </details>}
                </section>

                {/* Group C: Daily Survival, Feeding & Enduring Hunger */}
                <section className="self-care-menu">
                  <button type="button" className="self-care-toggle" aria-expanded={isCareExpanded} aria-controls="self-care-actions"
                    onClick={() => setIsCareExpanded(expanded => !expanded)}>
                    <Heart size={20} aria-hidden="true" />
                    <span><strong>ดูแลตัวเอง</strong><small>
                      {(gameState.stats?.hp || 0) < 80 ? 'บาดเจ็บ' : 'ร่างกายยังไหว'} · ชุดเย็บแผล {gameState.items?.medicine || 0} ชุด · ถุงเลือด {gameState.carriedBloodBags || 0} ถุง
                    </small></span>
                    {isCareExpanded ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
                  </button>
                  <div id="self-care-actions" hidden={!isCareExpanded}>
                    <div className="self-care-options">
                      {careActionsList.map(action => renderStoryAction(action))}
                      <button
                        type="button"
                        onClick={() => {
                          if ((gameState.carriedBloodBags || 0) <= 0) {
                            if (soundEnabled) soundFx.warning();
                            setActionToast('ไม่มีถุงเลือดพกพาในกระเป๋า (ต้องมีถุงเลือดก่อน)');
                            return;
                          }
                          if (gameState.pending) {
                            if (soundEnabled) soundFx.warning();
                            setActionToast('ต้องตัดสินใจเหตุการณ์ตรงหน้าให้เสร็จก่อน');
                            return;
                          }
                          handleDrinkCarriedBloodBag();
                        }}
                        className={`story-action ${(gameState.carriedBloodBags || 0) <= 0 || gameState.pending ? 'story-action-locked opacity-70' : ''}`}
                      >
                        <span className="story-action-title">
                          <span className="story-action-title-text flex items-center gap-1.5">
                            <Droplets size={16} aria-hidden="true" /> ดื่มถุงเลือด
                          </span>
                          <ArrowRight size={16} aria-hidden="true" />
                        </span>
                        <span className="story-action-description">
                          {gameState.carriedBloodBags > 0
                            ? `ดื่มจากถุงเลือดที่พกไว้ (${gameState.carriedBloodBags} ถุง)`
                            : 'ฟื้นฟูสภาพร่างและความหิวโดยไม่เสียวัน'}
                        </span>
                        <span className="story-action-costs" aria-label="ต้นทุน: ไม่ใช้วัน, ใช้ถุงเลือด 1 ถุง">
                          <span className="story-action-cost-tag">ไม่ใช้วัน</span>
                          <span className="story-action-cost-tag">ใช้ถุงเลือด 1 ถุง</span>
                        </span>
                        {(gameState.carriedBloodBags || 0) <= 0 && (
                          <span className="story-action-disabled-reason text-amber-300 font-medium">
                            🔒 ไม่มีถุงเลือดพกพาในกระเป๋า
                          </span>
                        )}
                        {gameState.carriedBloodBags > 0 && gameState.pending && (
                          <span className="story-action-disabled-reason text-amber-300 font-medium">
                            🔒 ต้องตัดสินใจเหตุการณ์ตรงหน้าให้เสร็จก่อน
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </section>
                {activeTravelGoalPlace && activeTravelGoalPlace.travelTarget && !gameState.pending && (
                  <div className="p-3 rounded-xl bg-sky-950/50 border border-sky-500/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sky-200 flex items-center gap-1.5">
                        <MapPin size={14} className="text-sky-300 shrink-0" />
                        กำลังเดินทางไป: {activeTravelGoalPlace.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTravelGoalId(null)}
                        className="text-[11px] text-slate-400 hover:text-slate-200 underline underline-offset-2"
                      >
                        หยุดพักที่นี่
                      </button>
                    </div>
                    <p className="text-[11px] text-sky-200/90">
                      เส้นทางที่เหลือ ({activeTravelGoalPlace.route.length - 1} ช่วง):{' '}
                      {activeTravelGoalPlace.route
                        .map(id => production?.catalog?.PLACES?.[id]?.short || id)
                        .join(' → ')}
                    </p>
                    <button
                      type="button"
                      disabled={!activeTravelGoalPlace.preview.enabled}
                      onClick={() => handlePerformAction('move:' + activeTravelGoalPlace.travelTarget)}
                      className="w-full py-2.5 px-3 rounded-lg bg-lime-300 hover:bg-lime-200 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>
                        เดินทางช่วงถัดไปไป
                        {production?.catalog?.PLACES?.[activeTravelGoalPlace.travelTarget]?.short ||
                          activeTravelGoalPlace.travelTarget}{' '}
                        · 1 วัน
                      </span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                )}
                <button type="button" className="travel-map-action" onClick={() => { setMobileTab('map'); setDesktopSideTab('map'); }}>
                  <MapPin size={18} aria-hidden="true" /> เปิดแผนที่เดินทาง <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
              <div className="mobile-story-feed">{storyFeed}</div>
            </div>

            {/* ===============================================================
                SECONDARY COMPANION PANEL (Right 5 cols on Desktop, Tabs on Mobile)
               =============================================================== */}
            <div
              className={`lg:col-span-5 space-y-4 ${
                mobileTab !== 'play' ? 'block' : 'hidden lg:block'
              }`}
            >
              <div className="desktop-story-feed">{storyFeed}</div>

              {/* Desktop Tab Bar */}
              <div className="hidden lg:grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
                {(
                  [
                    ['map', 'แผนที่เขต', MapPin],
                    ['bag', 'กระเป๋า / ร่าง', Package],
                    ['people', `ผู้คน (${knownNpcCount})`, Users],
                    ['journal', 'บันทึก / เซฟ', BookOpen],
                  ] as const
                ).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setDesktopSideTab(id);
                      setMobileTab(id);
                    }}
                    className={`relative py-2 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                      desktopSideTab === id
                        ? 'bg-slate-800 text-lime-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {id === 'map' && mapNotificationCount > 0 && <span className={`map-tab-notice ${mapHasUrgentNews ? 'has-urgent-news' : ''}`} aria-label={`${mapNotificationCount} ย่านมีเรื่องพิเศษ`}>{mapNotificationCount}</span>}
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>

              {/* Map is the only place to confirm travel. */}
              {(mobileTab === 'map' || (mobileTab === 'play' && desktopSideTab === 'map')) && (
                <PixelCityMap
                  places={mapPlaces}
                  pinnedPlaceId={pinnedPlaceId}
                  travelGoalId={activeTravelGoalPlace?.id || null}
                  onClearTravelGoal={() => setTravelGoalId(null)}
                  onTravel={(nextHopId, destinationId) => {
                    setTravelGoalId(destinationId && destinationId !== nextHopId ? destinationId : null);
                    handlePerformAction('move:' + nextHopId);
                  }}
                />
              )}

              {/* PANEL 2: BAG (CARRIED ITEMS ONLY + SIGNATURE ITEM) & BODY / MUTATION STAGE STATS */}
              {(mobileTab === 'bag' || (mobileTab === 'play' && desktopSideTab === 'bag')) && (
                <div className="bag-body-panel">
                  {/* SECTION A: CARRIED INVENTORY ONLY */}
                  <div className="bag-section">
                    <div className="bag-section-header">
                      <h3 className="bag-section-title">
                        <Package className="w-4 h-4 text-lime-300" />
                        <span>กระเป๋าสะพายหลัง</span>
                      </h3>
                      <span className="bag-badge-counter">
                        {carriedInventoryItems.length} รายการ
                      </span>
                    </div>

                    <div className="bag-grid" aria-label="ไอเทมในกระเป๋า">
                      {carriedInventoryItems.map(item => {
                        const isSelected = activeSelectedBagItem?.id === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedBagItemId(item.id)}
                            className={`bag-slot ${isSelected ? 'is-selected' : ''}`}
                            aria-pressed={isSelected}
                          >
                            <span className="bag-slot-count" aria-label={`${item.count} ${item.unit}`}>×{item.count}</span>
                            <div className="bag-slot-icon-box" style={{ color: item.id === 'carriedBloodBags' ? '#f43f5e' : item.id === 'medicine' ? '#34d399' : item.id === 'supplies' ? '#fbbf24' : item.id === 'samples' ? '#2dd4bf' : '#bfd773' }}>
                              <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
                                <path d={item.iconPath} fill="currentColor" fillRule="evenodd" />
                              </svg>
                            </div>
                            <span className="bag-slot-name">{item.name}</span>
                            <span className="bag-slot-tag">{item.tag || item.unit}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Inspection Drawer below Grid */}
                    {activeSelectedBagItem && (
                      <div className="bag-inspection-drawer" aria-live="polite">
                        <div className="bag-inspection-header">
                          <div className="bag-inspection-title">
                            <span>▶ {activeSelectedBagItem.name}</span>
                          </div>
                          <span className="bag-inspection-unit">
                            {activeSelectedBagItem.count} {activeSelectedBagItem.unit}
                          </span>
                        </div>
                        <p className="bag-inspection-desc">
                          {activeSelectedBagItem.desc}
                        </p>
                        {activeSelectedBagItem.canUseDirectly && !gameState.ending && (
                          <button
                            type="button"
                            onClick={handleDrinkCarriedBloodBag}
                            className="bag-use-btn"
                          >
                            <Droplets className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
                            <span>{activeSelectedBagItem.useLabel}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* SECTION B: ZOMBIE PHYSIOLOGY, MUTATION STAGE & KILL COUNT */}
                  <div className="body-section-divider pt-2">
                    <div className="bag-section-header">
                      <h3 className="bag-section-title">
                        <Dna className="w-4 h-4 text-purple-300" />
                        <span>สภาพร่างกาย & การวิวัฒน์</span>
                      </h3>
                      <span className="bag-badge-counter text-rose-300 border-rose-900/60 bg-rose-950/40">
                        ฆ่าคน: {currentKillCount} ศพ
                      </span>
                    </div>

                    {/* Hero Pixel Portrait & Identity Card */}
                    <div className="body-hero-card">
                      <div className="body-portrait-frame">
                        <ZombiePortrait
                          bio={currentBio}
                          mutation={Math.floor(gameState.stats?.mutation || 0)}
                        />
                      </div>

                      <div className="body-bio-info">
                        <div className="body-name">{currentBio.fullNameHint || playerName || 'ผู้บันทึกเขตศูนย์'}</div>
                        <div className="body-meta">
                          อายุ {currentBio.age} ปี · เพศ{currentBio.gender} · {currentBio.occupation}
                        </div>
                        <div className="body-tags-row">
                          <span className="body-tag">
                            กลายพันธุ์มาแล้ว ~{currentBio.daysInfectedEstimate + (rawViewModel.day - 1)} วัน
                          </span>
                          {currentKillCount === 0 ? (
                            <span className="body-tag text-emerald-300 border-emerald-800">
                              ไม่เคยฆ่าคนเป็น
                            </span>
                          ) : (
                            <span className="body-tag body-tag-danger">
                              พรากชีวิตคนเป็น {currentKillCount} คน
                            </span>
                          )}
                        </div>

                        <div className="body-symptom-box">
                          <strong>อาการปัจจุบัน: </strong>
                          <span>{currentMutationStage.sideEffectText}</span>
                        </div>
                      </div>
                    </div>

                    {/* Vitals Meters */}
                    <div className="body-vitals-grid mt-3">
                      {[
                        {
                          label: 'การกลายพันธุ์',
                          value: Math.floor(gameState.stats?.mutation || 0),
                          max: 100,
                          color: '#c084fc',
                          textClass: 'text-purple-300',
                          desc: 'การเปลี่ยนแปลงของเซลล์และเนื้อเยื่อ',
                        },
                        {
                          label: 'ความเป็นมนุษย์',
                          value: currentHumanity,
                          max: 100,
                          color: '#34d399',
                          textClass: 'text-emerald-300',
                          desc: `สติและความเห็นใจ (ฆ่าไปแล้ว ${currentKillCount} ศพ)`,
                        },
                        {
                          label: 'คุมฝูง (Horde)',
                          value: Math.floor(gameState.stats?.horde || 0),
                          max: 100,
                          color: '#fbbf24',
                          textClass: 'text-amber-300',
                          desc: 'คลื่นความถี่สั่งการผู้ติดเชื้อรอบข้าง',
                        },
                        {
                          label: 'วิจัยเซรุ่ม',
                          value: Math.floor(gameState.stats?.research || 0),
                          max: 100,
                          color: '#2dd4bf',
                          textClass: 'text-teal-300',
                          desc: 'ความเข้าใจโครงสร้างไวรัสและเซรุ่ม',
                        },
                      ].map(st => (
                        <div key={st.label} className="body-vital-card">
                          <div className="body-vital-header">
                            <span className={st.textClass}>{st.label}</span>
                            <span className="font-mono text-lime-300 font-bold">
                              {st.value}/{st.max}
                            </span>
                          </div>
                          <div className="body-vital-bar">
                            <div
                              className="body-vital-fill"
                              style={{
                                width: `${Math.min(100, Math.max(0, st.value))}%`,
                                backgroundColor: st.color,
                              }}
                            />
                          </div>
                          <div className="body-vital-desc">{st.desc}</div>
                        </div>
                      ))}
                    </div>

                    {/* Mutation Stages (Unlocked Progression Only) */}
                    <div className="body-mutation-container mt-3">
                      <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                        <span>ลำดับการกลายพันธุ์ที่ปลดล็อกแล้ว ({unlockedMutationStages.length}/4)</span>
                        <span className="text-[11px] font-mono text-purple-300">
                          ระดับ {currentMutationStage.stageNumber}
                        </span>
                      </div>
                      {unlockedMutationStages.map(st => {
                        const isCurrent = st.stageNumber === currentMutationStage.stageNumber;
                        return (
                          <div
                            key={st.stageNumber}
                            className={`body-mutation-card ${isCurrent ? 'is-active-stage' : ''}`}
                          >
                            <div className="body-mutation-title">
                              <span className={isCurrent ? 'text-sky-300 font-bold' : 'text-slate-300'}>
                                {st.title}
                              </span>
                              <span className="body-mutation-badge">
                                {isCurrent ? 'ระยะปัจจุบัน' : 'ผ่านพ้นแล้ว'}
                              </span>
                            </div>
                            <div className="body-mutation-ability">
                              <strong>ความสามารถของร่าง:</strong> {st.abilityText}
                            </div>
                            <div className="body-mutation-sideeffect">
                              <strong>อาการข้างเคียง:</strong> {st.sideEffectText}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Expandable Pre-Death Dossier */}
                    <details className="body-bio-disclosure mt-3">
                      <summary className="body-bio-summary">
                        <span>📜 ประวัติก่อนตาย & บันทึกการชันสูตร</span>
                        <span className="text-[11px] font-mono opacity-80">[เปิดอ่านเพิ่ม]</span>
                      </summary>
                      <div className="body-bio-content">
                        <div className="body-bio-entry">
                          <strong className="text-lime-300">ภูมิหลังก่อนเสียชีวิต:</strong>
                          <p className="text-slate-200">{currentBio.preDeathDetail}</p>
                        </div>
                        <div className="body-bio-entry">
                          <strong className="text-amber-300">ข้อสังเกตการชันสูตรร่าง:</strong>
                          <p className="text-amber-100/90">{currentBio.autopsyObservation}</p>
                        </div>
                      </div>
                    </details>
                  </div>

                  {/* SECTION C: MID-GAME HORIZON CLUES */}
                  {horizonClues.length > 0 && (
                    <div className="space-y-2.5 pt-3 border-t border-slate-800">
                      <div className="text-xs font-bold text-slate-200">
                        เบาะแสเส้นทางชีวิตที่ค้นพบแล้ว
                      </div>
                      <div className="space-y-2.5">
                        {horizonClues.map(clue => (
                          <div
                            key={clue.id}
                            className={`p-3.5 rounded-xl border space-y-1.5 ${clue.accentColor}`}
                          >
                            <div className="flex items-center justify-between gap-2 text-xs font-bold">
                              <span>{clue.routeTitle}</span>
                              <span className="font-mono text-[11px] opacity-90">
                                {clue.locationHint}
                              </span>
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed">
                              {clue.narrativeClue}
                            </p>
                            <div className="text-[11px] font-mono pt-1 opacity-90">
                              {clue.progressText}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PANEL 3: TACTICAL SURVIVOR ROSTER (แท็บผู้คน - แฟ้มข้อมูลผู้รอดชีวิตภาคสนาม) */}
              {(mobileTab === 'people' ||
                (mobileTab === 'play' && desktopSideTab === 'people')) && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-slate-800 space-y-4">
                  {/* HEADER (Contains 'ผู้คนใน' for test suite compatibility) */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <Users className="w-4 h-4 text-lime-300 shrink-0" />
                      <span>ผู้คนใน{rawViewModel.place?.name}</span>
                    </h3>
                    <span className="text-xs font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-md font-bold">
                      รู้จัก {knownNpcCount} คน
                    </span>
                  </div>

                  {/* Empty state when no NPCs are discovered yet in this district */}
                  {discoveredNpcs.length === 0 && (
                    <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/60 text-center space-y-1">
                      <p className="text-sm font-bold text-slate-200">เจ้ายังไม่รู้จักใครในย่านนี้</p>
                      <p className="text-xs text-slate-400">บริเวณรอบตัวเงียบสงบ ยังไม่มีใครสบตาหรือทักทายเจ้าโดยตรง</p>
                    </div>
                  )}

                  {/* Clue button: Follow leads to discover unmet survivors */}
                  {undiscoveredNpc && !gameState.ending && (
                    <button
                      type="button"
                      disabled={Boolean(gameState.pending)}
                      onClick={() =>
                        handleOpenFreeformNpcModal(
                          activeZoneCrises.find(npc => !npc.met && !npc.seen)?.id ?? undiscoveredNpc.id
                        )
                      }
                      className="story-action disabled:opacity-50 border-lime-800/40 hover:border-lime-500/50 bg-slate-950"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="story-action-title flex items-center gap-2 text-lime-300 text-xs sm:text-sm font-bold">
                          <span>🔍</span>
                          <span>
                            {activeZoneCrises.some(npc => !npc.met && !npc.seen)
                              ? 'ตามเบาะแสคนที่ต้องการความช่วยเหลือ'
                              : 'ออกไปพบผู้คนในย่าน'}
                          </span>
                        </span>
                        <span className="text-[11px] text-lime-400 font-mono shrink-0">1 วัน</span>
                      </div>
                    </button>
                  )}

                  {(() => {
                    // Deduplicate discovered NPCs by ID so each person appears exactly once
                    const dedupedDiscovered = discoveredNpcs.filter(
                      (npc, index, self) => index === self.findIndex(n => n.id === npc.id)
                    );

                    const currentDay = gameState.day || 1;

                    // 1. Priority Crises: Known, alive, unresolved active crisis
                    const livingCrisisNpcs = dedupedDiscovered.filter(
                      npc =>
                        npc.met &&
                        npc.alive &&
                        !npc.crisisResolved &&
                        npc.crisisDay &&
                        currentDay >= npc.crisisDay
                    );
                    const crisisIdSet = new Set(livingCrisisNpcs.map(npc => npc.id));

                    // 2. Regular Living Roster: Living met or seen survivors, excluding active crisis NPCs already pinned at top
                    const livingRosterNpcs = dedupedDiscovered.filter(
                      npc => npc.alive && !crisisIdSet.has(npc.id)
                    );

                    // 3. Deceased Roster: Fallen survivors preserved in bottom memorial archive
                    const deceasedNpcs = dedupedDiscovered.filter(npc => !npc.alive);

                    // Pixel role archetype icon helper
                    const renderPixelRoleBadge = (role?: string) => {
                      const r = role || '';
                      if (/ไฟ|ช่าง|เครื่อง|ซ่อม/.test(r)) {
                        return (
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                            <path d="M14 9V7h-2.1a4.9 4.9 0 00-.7-1.7l1.5-1.5-1.4-1.4-1.5 1.5a4.9 4.9 0 00-1.7-.7V1H7v2.1a4.9 4.9 0 00-1.7.7L3.8 2.3 2.4 3.7l1.5 1.5a4.9 4.9 0 00-.7 1.7H1v2h2.1c.2.6.4 1.2.7 1.7l-1.5 1.5 1.4 1.4 1.5-1.5c.5.3 1.1.5 1.7.7V15h2v-2.1c.6-.2 1.2-.4 1.7-.7l1.5 1.5 1.4-1.4-1.5-1.5c.3-.5.5-1.1.7-1.7H14zM8 10a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        );
                      }
                      if (/วิทยุ|สื่อสาร|เสา|คลื่น/.test(r)) {
                        return (
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                            <path d="M12 2H4a2 2 0 00-2 2v9a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2zM5 4h6v2H5V4zm3 9a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                          </svg>
                        );
                      }
                      if (/เฝ้า|รปภ|วิน|อาวุธ|การ์ด|ทหาร|ป้องกัน/.test(r)) {
                        return (
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                            <path d="M8 1L2 3v5c0 4 6 7 6 7s6-3 6-7V3L8 1zm0 2.2l4 1.3v3.5c0 2.7-3.4 5.1-4 5.6-.6-.5-4-2.9-4-5.6V4.5l4-1.3z" />
                          </svg>
                        );
                      }
                      if (/เสบียง|ตลาด|ข้าว|กาแฟ|คลัง|แพ็ก|พัสดุ|อาหาร|น้ำ|ยา|พยาบาล/.test(r)) {
                        return (
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                            <path d="M2 3h12v2H2V3zm1 3h10v8H3V6zm2 2v4h6V8H5z" />
                          </svg>
                        );
                      }
                      return (
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                          <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 2c-4 0-6 2-6 4v1h12v-1c0-2-2-4-6-4z" />
                        </svg>
                      );
                    };

                    return (
                      <>
                        {/* 1. TOP PRIORITY: PEOPLE IN CRISIS (Full-width cards, pinned at top) */}
                        {livingCrisisNpcs.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs px-0.5">
                              <span className="font-bold text-amber-300 flex items-center gap-1.5 font-mono">
                                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                <span>ต้องการความช่วยเหลือด่วน ({livingCrisisNpcs.length} คน)</span>
                              </span>
                              <span className="text-[11px] text-amber-400/80 font-mono">ลำดับความสำคัญสูงสุด</span>
                            </div>

                            {livingCrisisNpcs.map(npc => {
                              const posture = npcPosture(npc, currentDay);
                              return (
                                <div
                                  key={`crisis-priority-${npc.id}`}
                                  className="rounded-xl border border-amber-500/70 bg-gradient-to-r from-amber-950/40 to-slate-900/90 p-3.5 space-y-2.5 shadow-lg shadow-amber-950/20"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2.5 min-w-0">
                                      <div className="w-8 h-8 rounded-lg bg-amber-900/60 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0 people-pixel-badge">
                                        {renderPixelRoleBadge(npc.role)}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-sm font-bold text-slate-100">{npc.name}</span>
                                          <span className="text-xs text-slate-400">(วัย {npc.age} ปี)</span>
                                          {npc.isStoryNpc && (
                                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-lime-950 text-lime-300 border border-lime-500/40">
                                              ตัวละครหลัก
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs text-amber-200/90 font-medium truncate">{npc.role}</div>
                                      </div>
                                    </div>
                                    <span className="inline-flex items-center text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950 shrink-0">
                                      วิกฤตด่วน
                                    </span>
                                  </div>

                                  <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200 leading-relaxed">
                                    <strong className="text-amber-300">สถานการณ์:</strong> {npc.crisisText}
                                  </div>

                                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                                    <div className="text-[11px] font-mono text-emerald-300">
                                      ไว้ใจ {npc.trust}/100 · {posture.label}
                                    </div>
                                    {!gameState.ending && !gameState.pending && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenFreeformNpcModal(npc.id)}
                                        className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shrink-0 shadow transition-colors flex items-center gap-1"
                                      >
                                        <span>⚡</span>
                                        <span>เข้าช่วย {npc.name} (1 วัน)</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* 2. MAIN ROSTER: 2 COLUMNS PER ROW ON MOBILE */}
                        {livingRosterNpcs.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs px-0.5 pt-1">
                              <span className="font-bold text-slate-300">
                                ผู้รอดชีวิตที่เคยพบ ({livingRosterNpcs.length} คน)
                              </span>
                              <span className="text-[11px] text-slate-400">แตะการ์ดเพื่อดูรายละเอียด</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              {livingRosterNpcs.map(npc => {
                                const isUnnamed = !npc.met && npc.seen;
                                const isExpanded = Boolean(expandedNpcCardCrisisIds[npc.id]);
                                const posture = npcPosture(npc, currentDay);

                                // Seen but unmet: Anonymous survivor card
                                if (isUnnamed) {
                                  return (
                                    <div
                                      key={`unnamed-${npc.id}`}
                                      className="people-card-tactical col-span-1 p-2.5 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 flex flex-col justify-between gap-2"
                                    >
                                      <div className="space-y-1.5">
                                        <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 people-pixel-badge">
                                          {renderPixelRoleBadge('')}
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-slate-300 line-clamp-1">ผู้รอดชีวิตที่ยังไม่รู้ชื่อ</p>
                                          <p className="text-[10px] text-slate-400 line-clamp-1">เคยเห็นในระยะสายตา</p>
                                        </div>
                                      </div>
                                      {!gameState.ending && !gameState.pending && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenFreeformNpcModal(npc.id)}
                                          className="w-full py-1 text-center text-[10px] font-semibold text-lime-300 bg-lime-950/40 hover:bg-lime-950/80 border border-lime-700/40 rounded transition-colors"
                                        >
                                          กลับไปทัก
                                        </button>
                                      )}
                                    </div>
                                  );
                                }

                                const postureColorClass = posture.warning
                                  ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                                  : npc.trust >= 70
                                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                                  : 'bg-slate-800/70 text-slate-300 border-slate-700';

                                return (
                                  <div
                                    key={`npc-roster-${npc.id}`}
                                    onClick={() =>
                                      setExpandedNpcCardCrisisIds(prev => ({
                                        ...prev,
                                        [npc.id]: !prev[npc.id],
                                      }))
                                    }
                                    className={`people-card-tactical col-span-1 p-2.5 rounded-xl border bg-slate-950/80 hover:border-slate-700 flex flex-col justify-between gap-2 cursor-pointer ${
                                      isExpanded
                                        ? 'border-lime-500/60 bg-slate-900/95 ring-1 ring-lime-500/40'
                                        : 'border-slate-800'
                                    }`}
                                  >
                                    <div className="space-y-1.5">
                                      <div className="flex items-center justify-between gap-1">
                                        <div className="w-6 h-6 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-lime-400 shrink-0 people-pixel-badge">
                                          {renderPixelRoleBadge(npc.role)}
                                        </div>
                                        <span
                                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border truncate max-w-[85px] ${postureColorClass}`}
                                          title={posture.label}
                                        >
                                          {posture.label}
                                        </span>
                                      </div>

                                      <div>
                                        <div className="text-xs font-bold text-slate-100 truncate" title={`${npc.name} (วัย ${npc.age} ปี)`}>
                                          {npc.name} <span className="text-[10px] font-normal text-slate-400">({npc.age}ป)</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 truncate" title={npc.role}>
                                          {npc.role}
                                        </div>
                                      </div>

                                      {/* Mini trust progress bar */}
                                      <div className="space-y-0.5 pt-0.5">
                                        <div className="flex justify-between text-[9px] font-mono text-slate-400">
                                          <span>ไว้ใจ</span>
                                          <span className="text-emerald-400 font-bold">{npc.trust}/100</span>
                                        </div>
                                        <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-emerald-400"
                                            style={{ width: `${Math.min(100, Math.max(0, npc.trust))}%` }}
                                          />
                                        </div>
                                      </div>

                                      {/* Expanded Details on tap */}
                                      {isExpanded && (
                                        <div className="pt-2 border-t border-slate-800/90 space-y-1.5 text-[10px]">
                                          <p className="text-slate-300 leading-relaxed italic line-clamp-3">
                                            “{posture.text}”
                                          </p>
                                          {npc.trait && (
                                            <p className="text-slate-400 line-clamp-2">
                                              <span className="text-slate-300 font-semibold">อุปนิสัย:</span> {npc.trait}
                                            </p>
                                          )}
                                          {npc.lastNote && (
                                            <p className="text-slate-400 line-clamp-2">
                                              <span className="text-slate-300 font-semibold">บันทึก:</span> {npc.lastNote}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Action button */}
                                    <div className="pt-1" onClick={e => e.stopPropagation()}>
                                      {isExpanded && !gameState.ending && !gameState.pending ? (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenFreeformNpcModal(npc.id)}
                                          className="w-full py-1 px-1.5 text-center text-[10px] font-bold rounded bg-lime-400 hover:bg-lime-300 text-slate-950 transition-colors shadow-sm"
                                        >
                                          เข้าหา {npc.name} (1 วัน)
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setExpandedNpcCardCrisisIds(prev => ({
                                              ...prev,
                                              [npc.id]: !prev[npc.id],
                                            }))
                                          }
                                          className="w-full py-1 px-1.5 text-center text-[10px] font-medium rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-colors"
                                        >
                                          แตะดูรายละเอียด ▾
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 3. DECEASED SECTION: Collapsible Memorial at Bottom */}
                        {deceasedNpcs.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/80">
                            <details className="group rounded-xl bg-slate-950 border border-rose-950/60 overflow-hidden">
                              <summary className="px-3 py-2 flex items-center justify-between text-xs text-rose-300 font-medium cursor-pointer hover:bg-slate-900/60 transition-colors list-none">
                                <span className="flex items-center gap-1.5 font-mono">
                                  <span>🕊️</span>
                                  <span>บันทึกผู้จากไปในย่านนี้ ({deceasedNpcs.length} คน)</span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono group-open:rotate-180 transition-transform">
                                  ▼
                                </span>
                              </summary>
                              <div className="px-3 py-2 space-y-2 border-t border-slate-900 text-xs text-slate-400 bg-slate-950/90 divide-y divide-slate-900">
                                {deceasedNpcs.map(npc => {
                                  const isKnown = Boolean(npc.met);
                                  return (
                                    <div key={`deceased-${npc.id}`} className="flex items-center justify-between gap-2 pt-1.5 first:pt-0">
                                      <div className="min-w-0">
                                        <span className={`line-through font-bold ${isKnown ? 'text-slate-300' : 'text-slate-400'}`}>
                                          {isKnown ? `${npc.name} (วัย ${npc.age} ปี)` : 'ผู้รอดชีวิตที่ยังไม่รู้ชื่อ'}
                                        </span>
                                        <span className="text-[11px] text-slate-400 block truncate">
                                          {isKnown
                                            ? `${npc.role}${npc.lastNote ? ` · ${npc.lastNote}` : ''}`
                                            : npc.seen
                                            ? 'เคยเห็นในระยะสายตาก่อนเสียชีวิต'
                                            : 'ร่างผู้เสียชีวิตที่ยังไม่รู้ชื่อ'}
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-mono text-rose-400 shrink-0">เสียชีวิต</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </details>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* PANEL 4: JOURNAL, PROGRESSION TRACKER, SOUNDSCAPE, SAVE/EXPORT/IMPORT & SURRENDER */}
              {(mobileTab === 'journal' ||
                (mobileTab === 'play' && desktopSideTab === 'journal')) && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-slate-800 space-y-4 sm:space-y-5">
                  {/* TOP HEADER & QUICK SHORTCUTS */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="w-4 h-4 text-lime-400 shrink-0" />
                      <h2 className="text-sm sm:text-base font-bold text-slate-100 truncate">
                        บันทึกและจัดการข้อมูล
                      </h2>
                      <button type="button" onClick={() => setShowEndingCollection(true)} className="text-xs text-lime-300 underline">บทจบที่ค้นพบ</button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileTab('map');
                        setDesktopSideTab('map');
                      }}
                      className="text-xs font-semibold text-lime-300 hover:text-lime-200 underline underline-offset-2 flex items-center gap-1 shrink-0"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      เปิดแผนที่เดินทาง
                    </button>
                  </div>

                  {/* SUB-SEGMENTED TAB SWITCHER (3 MODES) */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold" role="tablist" aria-label="หมวดหมู่บันทึก">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={journalSubTab === 'story'}
                      onClick={() => setJournalSubTab('story')}
                      className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        journalSubTab === 'story'
                          ? 'bg-lime-400 text-slate-950 shadow-md font-extrabold'
                          : 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">เรื่องราวชีวิต</span>
                      {(gameState?.log || []).length > 0 && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                          journalSubTab === 'story' ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {(gameState?.log || []).length}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={journalSubTab === 'clues'}
                      onClick={() => setJournalSubTab('clues')}
                      className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        journalSubTab === 'clues'
                          ? 'bg-lime-400 text-slate-950 shadow-md font-extrabold'
                          : 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">เบาะแสเส้นทาง</span>
                      {showRouteHints && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                          journalSubTab === 'clues' ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}>
                          3 ทาง
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={journalSubTab === 'save'}
                      onClick={() => setJournalSubTab('save')}
                      className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        journalSubTab === 'save'
                          ? 'bg-lime-400 text-slate-950 shadow-md font-extrabold'
                          : 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">จัดการเซฟ & ตั้งค่า</span>
                    </button>
                  </div>

                  {/* SUB-VIEW 1: STORY & CHRONICLE */}
                  {journalSubTab === 'story' && (
                    <div className="space-y-4 animate-fade-in">
                      {/* Mutation Milestones if unlocked */}
                      {recordedMutationMilestones.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                              <Dna className="w-4 h-4 text-purple-400" />
                              ประวัติการกลายพันธุ์ระดับสำคัญ (Mutation Milestones)
                            </span>
                            <span className="text-[11px] font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">
                              ค้นพบแล้ว {recordedMutationMilestones.length}/3 ขั้น
                            </span>
                          </div>
                          <div className="space-y-2">
                            {([25, 50, 75] as const).map(th => {
                              const reached = recordedMutationMilestones.includes(th);
                              const meta = MUTATION_MILESTONES[th];
                              if (!reached || !meta) return null;
                              return (
                                <div
                                  key={th}
                                  className={`p-2.5 rounded-xl border text-xs transition-all ${meta.badgeColor} shadow-sm`}
                                >
                                  <div className="flex items-center justify-between font-bold">
                                    <span>{meta.title}</span>
                                    <span className="font-mono text-[10px]">
                                      ปลดล็อกแล้ว
                                    </span>
                                  </div>
                                  <p className="mt-1 text-slate-300 leading-relaxed text-[11px]">
                                    {meta.awakeningText}
                                  </p>
                                  <div className="mt-1 text-[10px] text-slate-400 italic">
                                    การเปลี่ยนแปลงทางกายภาพ: {meta.bodyChange}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Day Navigation & Chronology Filters */}
                      {availableStoryDays.length > 1 && (
                        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-300 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-lime-400" />
                              เลือกลำดับวันเพื่ออ่านย้อนหลัง
                            </span>
                            {selectedStoryDay !== 'all' && (
                              <button
                                type="button"
                                onClick={() => setSelectedStoryDay('all')}
                                className="text-lime-300 hover:underline text-[10px] font-mono"
                              >
                                แสดงทั้งหมด
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            <button
                              type="button"
                              onClick={() => setSelectedStoryDay('all')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                                selectedStoryDay === 'all'
                                  ? 'bg-lime-400 text-slate-950'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                              }`}
                            >
                              ทั้งหมด
                            </button>
                            {availableStoryDays.map(d => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setSelectedStoryDay(d)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                                  selectedStoryDay === d
                                    ? 'bg-lime-400 text-slate-950'
                                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                                }`}
                              >
                                วันที่ {d}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* StoryFeed Component with selector */}
                      <div id="life-story-history" className="scroll-mt-40">
                        <StoryFeed
                          fullHistory
                          log={displayedJournalLog}
                          latest={latestStory?.runId === gameState?.runId ? latestStory : null}
                          formatEffect={formatStoryEffect}
                          onHistory={openStoryHistory}
                        />
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW 2: CLUES & HORIZONS */}
                  {journalSubTab === 'clues' && (
                    <div className="space-y-4 animate-fade-in">
                      {/* Route Hints Checklist if enabled */}
                      {showRouteHints ? (
                        <div data-route-checklist className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-lime-300" />
                              <span>สมุดบันทึกเบาะแสเส้นทางสู่อนาคต</span>
                            </h3>
                            <button
                              type="button"
                              onClick={() => setShowNumericSpoilers(prev => !prev)}
                              className={`px-2 py-1 rounded border text-[10px] font-mono shrink-0 transition-colors ${
                                showNumericSpoilers
                                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                                  : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {showNumericSpoilers ? 'กำลังเปิดตัวเลขตรงๆ' : 'ปิดตัวเลข (ใช้บทบรรยาย)'}
                            </button>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            ติดตามความคืบหน้าการเตรียมงานตามย่านต่าง ๆ และแนวโน้มชะตาชีวิตของร่างนี้โดยไม่สปอยล์เนื้อหาบทสรุป
                          </p>

                          {/* 3 Core Preparation Routes */}
                          <div className="space-y-2.5">
                            {PROGRESSION_ROUTES.map(route => {
                              const completedCount = route.steps.filter((_, i) =>
                                Boolean(gameState.story?.flags?.[`route.${route.id}.${i}`])
                              ).length;
                              const destPlace =
                                production?.catalog.PLACES[route.destination]?.name ||
                                route.destination;
                              const reqEntries = Object.entries(route.requirements || {});
                              const statLabelMap: Record<string, string> = {
                                research: 'งานวิจัย',
                                humanity: 'ความเป็นมนุษย์',
                                sanity: 'สติ',
                                trust: 'ความไว้ใจรวม',
                                horde: 'อำนาจฝูง',
                                mutation: 'การกลายพันธุ์',
                              };
                              return (
                                <div
                                  key={route.id}
                                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs sm:text-sm font-bold text-amber-200">
                                      เส้นทาง: {route.label}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-lime-300">
                                      เตรียมงาน {completedCount}/{route.steps.length} จุด
                                    </span>
                                  </div>

                                  <div className="space-y-1 text-xs">
                                    {route.steps.map((step, idx) => {
                                      const done = Boolean(
                                        gameState.story?.flags?.[`route.${route.id}.${idx}`]
                                      );
                                      const isHere = gameState.place === step.place;
                                      return (
                                        <div
                                          key={step.place}
                                          className={`flex items-center justify-between gap-2 py-1 px-2 rounded ${
                                            done
                                              ? 'bg-emerald-950/30 text-emerald-200'
                                              : isHere
                                              ? 'bg-amber-950/30 text-amber-200 font-semibold'
                                              : 'text-slate-300'
                                          }`}
                                        >
                                          <span>
                                            {done ? '✓' : '○'} ขั้นที่ {idx + 1}: {step.name}
                                          </span>
                                          <span className="font-mono text-[11px] text-slate-400 shrink-0">
                                            {step.placeName}
                                            {isHere ? ' (อยู่ที่นี่)' : ''}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <div className="pt-1.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-mono text-slate-400">
                                    <span>
                                      {showNumericSpoilers
                                        ? `ความพร้อม: ${reqEntries
                                            .map(([k, target]) => {
                                              const cur = Math.floor(gameState.stats?.[k] || 0);
                                              return `${statLabelMap[k] || k} ${cur}/${target}`;
                                            })
                                            .join(' · ')}${
                                            route.samples
                                              ? ` · ตัวอย่างเชื้อ ${gameState.items?.samples || 0}/${route.samples}`
                                              : ''
                                          }`
                                        : `ต้องการ: ${reqEntries
                                            .map(([k, target]) => {
                                              const cur = Math.floor(gameState.stats?.[k] || 0);
                                              const ready = cur >= Number(target);
                                              return `${statLabelMap[k] || k}${ready ? ' (พร้อมแล้ว)' : ' (ยังต้องสั่งสมเพิ่ม)'}`;
                                            })
                                            .join(' · ')}`}
                                    </span>
                                    <span className="text-sky-300">ย่านปลายทาง: {destPlace}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Personal / Slice-of-Life & District Settle Clues */}
                          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                            <div className="font-bold text-sky-200">
                              เบาะแสทางเลือกวิถีชีวิตและการตั้งหลักในกรุงเทพฯ
                            </div>
                            <div className="grid grid-cols-1 gap-1.5 text-slate-300">
                              <div className="flex items-center justify-between gap-2 py-1 border-b border-slate-900">
                                <span>ปกป้องผู้คนในเขต (ผู้เฝ้าประตูเงียบงัน)</span>
                                <span className="font-mono text-[11px] text-emerald-300">
                                  {showNumericSpoilers
                                    ? `ช่วยคน ${Number(gameState.memory?.saved || 0)}/2 · ไว้ใจเขต ${currentZoneTrustStats.averageTrust}/20 · วันที่ ${gameState.day || 1}/14`
                                    : 'ต้องเคยช่วยชีวิตผู้คนและได้รับความเชื่อใจในย่านนั้น'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 py-1 border-b border-slate-900">
                                <span>หนีพ้นเขตกักกันพร้อมคู่หูที่ไว้ใจเต็มหัวใจ</span>
                                <span className="font-mono text-[11px] text-sky-300">
                                  {showNumericSpoilers
                                    ? `ไว้ใจสูงสุด ${Math.max(
                                        0,
                                        ...Object.values(syncedZonePopulations)
                                          .flatMap(z => z.npcs)
                                          .filter(n => n.alive)
                                          .map(n => n.trust)
                                      )}/100 · สติ ${Math.floor(gameState.stats?.sanity || 0)}/40`
                                    : 'ต้องมีใครสักคนที่เชื่อใจเจ้าอย่างสุดหัวใจและยังมีสติมั่นคง'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 py-1 border-b border-slate-900">
                                <span>ล่องเรือพ้นแม่น้ำเจ้าพระยาโดยไม่เคยฆ่าคน</span>
                                <span className="font-mono text-[11px] text-teal-300">
                                  {showNumericSpoilers
                                    ? `วันที่ ${gameState.day || 1}/12 · สติ ${Math.floor(gameState.stats?.sanity || 0)}/55 · ฆ่า ${currentKillCount}/0`
                                    : 'มือต้องไม่เปื้อนเลือดคนเป็นและประคองสติไว้ให้มั่นคง'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 py-1">
                                <span>ปักหลักดูแลย่านอาชีพในกรุงเทพฯ</span>
                                <span className="font-mono text-[11px] text-amber-300">
                                  ช่วยงานย่านแล้ว{' '}
                                  {
                                    Object.keys(gameState.story?.flags || {}).filter(
                                      k => k.startsWith('bkk_') && k.endsWith('.helped') && gameState.story.flags[k]
                                    ).length
                                  }
                                  /10 ย่าน
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Sealed Clues Notice when showRouteHints is disabled */
                        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-center">
                          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400">
                            <BookOpen className="w-5 h-5 text-slate-400" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-200">
                            สมุดบันทึกเบาะแสถูกปิดไว้เพื่อสวมบทบาทค้นพบด้วยตัวเอง
                          </h4>
                          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                            การตั้งค่าปัจจุบันซ่อนคู่มือเตรียมเส้นทางและเงื่อนไขบทจบล่วงหน้าไว้ เพื่อให้ท่านออกสำรวจและเผชิญหน้ากับเรื่องราวตามธรรมชาติ
                          </p>
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => setShowRouteHints(true)}
                              className="px-4 py-2 rounded-xl bg-lime-400 text-slate-950 font-bold text-xs hover:bg-lime-300 transition-colors shadow-md"
                            >
                              เปิดแสดงสมุดบันทึกเบาะแส
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-VIEW 3: SAVE MANAGEMENT, AUDIO & SETTINGS */}
                  {journalSubTab === 'save' && (
                    <div className="space-y-5 animate-fade-in">
                      {/* CARD A: SAVE MANAGEMENT (EXPORT / IMPORT) */}
                      <div className="p-4 sm:p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                              <Download className="w-4 h-4 text-lime-300" />
                              <span>จัดการและสำรองข้อมูลเซฟ (Save & Backup)</span>
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                              เกมบันทึกอัตโนมัติลงเบราว์เซอร์ทุกครั้ง สามารถดาวน์โหลดเก็บไว้หรือนำเข้าเล่นต่อได้
                            </p>
                          </div>
                          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800">
                            เซฟอัตโนมัติ: วันที่ {gameState?.day || 1}
                          </span>
                        </div>

                        {/* INLINE STATUS BANNER (SUCCESS / ERROR) */}
                        {saveStatusFeedback && (
                          <div
                            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 animate-fade-in ${
                              saveStatusFeedback.type === 'success'
                                ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                                : 'bg-rose-950/70 border-rose-500/60 text-rose-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {saveStatusFeedback.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                              )}
                              <span className="font-semibold break-words">{saveStatusFeedback.message}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSaveStatusFeedback(null)}
                              className="text-xs p-1 rounded hover:bg-slate-900/60 shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        {/* EXPORT & IMPORT BUTTONS SIDE-BY-SIDE */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={handleExportSaveJson}
                            className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-lime-300 flex items-center justify-center gap-2 transition-colors shadow-sm"
                          >
                            <Download className="w-4 h-4 text-lime-400" />
                            <span>ส่งออกเซฟ (.json)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowImportBox(!showImportBox);
                              setSaveStatusFeedback(null);
                            }}
                            className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-sky-300 flex items-center justify-center gap-2 transition-colors shadow-sm"
                          >
                            <Upload className="w-4 h-4 text-sky-400" />
                            <span>{showImportBox ? 'ปิดกล่องนำเข้า' : 'นำเข้าเซฟ (.json)'}</span>
                          </button>
                        </div>

                        {/* IMPORT BOX */}
                        {showImportBox && (
                          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 animate-fade-in">
                            <label className="block text-[11px] font-semibold text-slate-300">
                              วางโค้ด JSON จากไฟล์เซฟที่ส่งออกไว้:
                            </label>
                            <textarea
                              value={importJsonText}
                              onChange={e => {
                                setImportJsonText(e.target.value);
                                if (saveStatusFeedback) setSaveStatusFeedback(null);
                              }}
                              placeholder="วางโค้ด JSON จากไฟล์เซฟที่นี่..."
                              rows={4}
                              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-lime-400"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => handleImportSaveJson()}
                                className="px-4 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-xs transition-colors shadow-md"
                              >
                                ยืนยันการนำเข้าเซฟ
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setImportJsonText('');
                                  setShowImportBox(false);
                                  setSaveStatusFeedback(null);
                                }}
                                className="text-xs text-slate-400 hover:text-slate-200 underline"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* CARD B: AMBIENT SOUNDSCAPE */}
                      <div className="p-4 sm:p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                            <Volume2 className="w-4 h-4 text-emerald-400" />
                            ระบบเสียงบรรยากาศเขตกักกันกรุงเทพฯ (Ambient Soundscape)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const nextAmb = !ambientEnabled;
                              if (nextAmb && !soundEnabled) setSoundEnabled(true);
                              setAmbientEnabled(nextAmb);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                              ambientEnabled && soundEnabled
                                ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                            }`}
                          >
                            {ambientEnabled && soundEnabled ? 'กำลังเล่นเสียงบรรยากาศ' : 'เปิดเสียงบรรยากาศ'}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          <button
                            type="button"
                            onClick={() => {
                              if (!soundEnabled) setSoundEnabled(true);
                              soundFx.playDistantSiren();
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                          >
                            ฟังตัวอย่างเสียงไซเรนไกล ๆ
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!soundEnabled) setSoundEnabled(true);
                              soundFx.playRadioStaticBurst();
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                          >
                            ฟังตัวอย่างคลื่นวิทยุซ่า ๆ
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!soundEnabled) setSoundEnabled(true);
                              soundFx.playHeartbeatPulse();
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
                          >
                            ฟังตัวอย่างเสียงหัวใจเต้น
                          </button>
                        </div>
                      </div>

                      {/* CARD C: ISOLATED DANGER ZONE (SURRENDER) */}
                      {!gameState.ending && (
                        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-bold text-rose-300">
                            <span className="flex items-center gap-1.5">
                              <Skull className="w-4 h-4 text-rose-400" />
                              โซนอันตราย: ยอมจำนนต่อสัญชาตญาณซอมบี้ (Surrender)
                            </span>
                            <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800 uppercase">
                              แยกต่างหากจากเซฟ
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            ⚠️ การตัดสินใจนี้ไม่สามารถย้อนกลับได้: หากสติถูกกลืนกินหรือไม่อยากฝืนทน สามารถยอมจำนนต่อเชื้อไวรัสและจบชีวิตตัวละครทันที
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowSurrenderConfirmModal(true)}
                            className="w-full py-2.5 px-4 rounded-xl bg-rose-950/80 hover:bg-rose-900/90 border border-rose-500/60 text-xs font-bold text-rose-200 transition-colors flex items-center justify-center gap-2 shadow-sm"
                          >
                            <Skull className="w-4 h-4 text-rose-400" />
                            ยอมแพ้ต่อสัญชาตญาณ (สติถูกกลืนกินจนหมด)
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* FOOTER: ADVANCED SETTINGS DRAWER (ALWAYS ACCESSIBLE) */}
                  <details data-advanced-settings className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
                    <summary className="cursor-pointer py-1 hover:text-slate-400 select-none font-bold text-xs text-slate-400">
                      ปรับแต่งขั้นสูง
                    </summary>
                    <div className="space-y-2 pt-2">
                      <label className="route-setting">
                        <span>
                          <strong>แสดงเบาะแสและเงื่อนไขเส้นทาง</strong>
                          <small>เปิดคู่มือเตรียมเส้นทางและเบาะแสบทจบล่วงหน้า · ปิดไว้เพื่อค้นพบด้วยตัวเอง</small>
                        </span>
                        <input
                          type="checkbox"
                          role="switch"
                          aria-checked={showRouteHints}
                          data-setting="route-hints"
                          checked={showRouteHints}
                          onChange={event => {
                            setShowRouteHints(event.target.checked);
                            if (event.target.checked) setJournalSubTab('clues');
                          }}
                        />
                      </label>
                      <label className="route-setting">
                        <span>
                          <strong>ช่วยแนะนำและปักหมุดเส้นทางช่วงท้าย</strong>
                          <small>เสนอให้ติดตามงานเมื่อเตรียมเส้นทางมาไกลแล้ว · ไม่เปิดคู่มือเฉลย</small>
                        </span>
                        <input
                          type="checkbox"
                          role="switch"
                          aria-checked={routeAssistanceEnabled}
                          data-setting="route-assistance"
                          checked={routeAssistanceEnabled}
                          onChange={event => {
                            setRouteAssistanceEnabled(event.target.checked);
                            if (!event.target.checked) setRouteGuidanceSession({runId: gameState?.runId || '', pinnedRouteId: null, dismissedRouteIds: []});
                          }}
                        />
                      </label>
                      <div className="mt-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/70 flex items-center justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-slate-300 font-medium text-[11px]">
                            คำอธิบายใต้ตัวเลือกแบบตัวเลขตรงๆ
                          </div>
                          <div className="text-[10px] text-slate-500 leading-snug">
                            {showNumericSpoilers
                              ? 'กำลังแสดงตัวเลขผลลัพธ์ตรงๆ (อาจลดความอินในการสวมบทบาท)'
                              : 'กำลังใช้คำบรรยายสั้นๆ ตามบทบาทแทนตัวเลข (ค่าเริ่มต้น)'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowNumericSpoilers(prev => !prev)}
                          className={`px-2 py-1 rounded border text-[10px] font-mono shrink-0 transition-colors ${
                            showNumericSpoilers
                              ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {showNumericSpoilers ? 'เปิดตัวเลขอยู่' : 'ปิดตัวเลข (ปกติ)'}
                        </button>
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {screenStage === 'playing' && !rawViewModel?.ending && (
        <nav aria-label="เมนูเกม" className="mobile-nav lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#101b15] border-t border-[#354a3b] grid grid-cols-5 px-1 py-1.5">
          {(
            [
              ['play', 'กิจกรรมวันนี้', Sparkles],
              ['map', 'แผนที่', MapPin],
              ['bag', 'กระเป๋า/ร่าง', Package],
              ['people', `ผู้คน (${knownNpcCount})`, Users],
              ['journal', 'บันทึก/เซฟ', BookOpen],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setMobileTab(id);
                if (id !== 'play') setDesktopSideTab(id);
              }}
              aria-current={mobileTab === id ? 'page' : undefined}
              className="relative flex flex-col items-center justify-center py-1 rounded-lg text-[11px] font-medium text-[#acbeaf] transition-colors hover:text-slate-100"
            >
              <Icon className="w-4 h-4 mb-0.5" aria-hidden="true" />
              {id === 'map' && mapNotificationCount > 0 && <span className={`map-tab-notice ${mapHasUrgentNews ? 'has-urgent-news' : ''}`} aria-label={`${mapNotificationCount} ย่านมีเรื่องพิเศษ`}>{mapNotificationCount}</span>}
              <span className="truncate max-w-full px-0.5">{label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* =====================================================================
          BLOCKING POPUP MODAL 1: PENDING ENGINE EVENT
         ===================================================================== */}
      {screenStage === 'playing' &&
        rawViewModel?.pending &&
        !rawViewModel?.ending && (
          <div role="dialog" aria-modal="true" className="game-dialog fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="max-w-xl w-full p-6 rounded-2xl bg-slate-900 border-2 border-amber-400/80 space-y-4 shadow-2xl my-auto">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  เหตุการณ์ตรงหน้า · ต้องตัดสินใจก่อนไปต่อ
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {rawViewModel.pending.dayNote}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
                {rawViewModel.pending.title}
              </h2>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                {pendingHunt && !huntTarget
                  ? 'ร่องรอยขาดหาย เจ้าหาคนบาดเจ็บไม่พบแล้ว'
                  : rawViewModel.pending.text}
                {pendingHunt && huntTarget?.met && ` เจ้าจำได้ว่าคนตรงหน้าคือ ${huntTarget.name}`}
              </p>

              <div className="space-y-2.5 pt-2">
                {rawViewModel.pending.choices.map((c: any) => {
                  const noHuntTarget = pendingHunt && !huntTarget && c.index !== 2;
                  const isLocked = noHuntTarget || !c.preview?.enabled;
                  const reason = noHuntTarget ? 'หาคนบาดเจ็บไม่พบแล้ว' : c.preview?.reason || 'ยังไม่พร้อมสำหรับตัวเลือกนี้';
                  return (
                    <button
                      key={c.index}
                      type="button"
                      onClick={() => {
                        if (isLocked) {
                          if (soundEnabled) soundFx.warning();
                          setActionToast(`ยังเลือกไม่ได้: ${reason}`);
                        } else {
                          handleChoosePending(c.index);
                        }
                      }}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        !isLocked
                          ? 'bg-slate-950 hover:bg-slate-800 border-slate-700 hover:border-lime-400 text-slate-100 shadow-md'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-amber-400/50'
                      }`}
                    >
                      <div className="text-sm sm:text-base font-bold leading-snug flex items-center justify-between gap-2">
                        <span>{c.text}</span>
                        {isLocked && <span className="text-xs font-normal text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50 shrink-0">ยังเลือกไม่ได้</span>}
                      </div>
                      {c.description && (
                        <div className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                          {showNumericSpoilers
                            ? c.description
                            : translateNumericNoteToNarrative(c.description, {
                                enabled: c.preview?.enabled,
                                disabledReason: c.preview?.reason,
                              })}
                        </div>
                      )}
                      {isLocked && (
                        <div className="text-xs text-amber-300/90 mt-1 font-medium">
                          🔒 {reason}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      {/* =====================================================================
          BLOCKING POPUP MODAL 2: LIFE-SIMULATION, FIXED TIMELINE EVENT & ALLY AID
         ===================================================================== */}
      {screenStage === 'playing' &&
        !rawViewModel?.pending &&
        !rawViewModel?.ending &&
        currentActiveLifeSimModal && (
          <div role="dialog" aria-modal="true" className="game-dialog fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div
              className={`max-w-xl w-full p-6 rounded-2xl bg-slate-900 border-2 space-y-4 shadow-2xl my-auto ${
                currentActiveLifeSimModal.isEndingClimax
                  ? 'border-amber-400 shadow-amber-950/50'
                  : 'border-emerald-400/80'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <span
                  className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    currentActiveLifeSimModal.isEndingClimax
                      ? 'text-amber-300'
                      : 'text-emerald-300'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  {currentActiveLifeSimModal.isEndingClimax
                    ? 'จุดทริกเกอร์ชะตาชีวิต · ผลจากการกระทำของเจ้า!'
                    : 'เหตุการณ์ตรงหน้า · ต้องตัดสินใจก่อนไปต่อ'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">
                    {currentActiveLifeSimModal.dayNote}
                  </span>
                  <button
                    type="button"
                    onClick={handleDismissActiveModal}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="ปิดหน้าต่างนี้ / ถอยออกมาก่อน"
                    aria-label="ปิดหน้าต่าง"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
                {currentActiveLifeSimModal.title}
              </h2>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed whitespace-pre-line">
                {resolveAgeDialogue(
                  { sourceFamily: 'dynamic', eventId: currentActiveLifeSimModal.id, field: 'text' },
                  gameState?.characterProfile?.age,
                  currentActiveLifeSimModal.text
                )}
              </p>
              {currentActiveLifeSimModal.statusNote && <p className="text-xs text-emerald-200/80 border-t border-slate-700 pt-3 whitespace-pre-line">{currentActiveLifeSimModal.statusNote}</p>}

              {modalErrorToast && (
                <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-500/70 text-xs sm:text-sm text-rose-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{modalErrorToast}</span>
                </div>
              )}

              <div className="space-y-2.5 pt-2">
                {currentActiveLifeSimModal.choices.map((ch, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      handleChooseLifeSimModalOption(currentActiveLifeSimModal, idx)
                    }
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      ch.enabled
                        ? 'bg-slate-950 hover:bg-slate-800 border-slate-700 hover:border-emerald-400 text-slate-100 shadow-md'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-amber-400/50'
                    }`}
                  >
                    <div className="text-sm sm:text-base font-bold leading-snug flex items-center justify-between gap-2">
                      <span>{ch.text}</span>
                      {!ch.enabled && <span className="text-xs font-normal text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50 shrink-0">ยังเลือกไม่ได้</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      {showNumericSpoilers
                        ? ch.note
                        : translateNumericNoteToNarrative(ch.note, {
                            enabled: ch.enabled,
                            disabledReason: ch.disabledReason,
                          })}
                    </div>
                    {!ch.enabled && ch.disabledReason && (
                      <div className="text-xs text-amber-300/90 mt-1 font-medium">
                        🔒 {ch.disabledReason}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      
      {/* =====================================================================
          BLOCKING POPUP MODAL: THREAT AMBUSH DAMAGE ALERT (ซุ่มโจมตีในเขตภัยคุกคามสูง)
         ===================================================================== */}
      {screenStage === 'playing' &&
        activeThreatAmbushAlert && (() => {
          const scen = activeThreatAmbushAlert.scenario;
          const tier = scen.tier || (
            activeThreatAmbushAlert.localThreat >= 85
              ? 'lockdown'
              : activeThreatAmbushAlert.localThreat >= 60
              ? 'high'
              : activeThreatAmbushAlert.localThreat >= 35
              ? 'watch'
              : 'calm'
          );
          const tierVisual =
            tier === 'lockdown'
              ? {
                  badgeText: 'พื้นที่สีแดง · แนวปิดล้อมกวาดล้างเขตกักกัน',
                  zoneStatusLabel: 'เขตปิดล้อมกวาดล้างขั้นวิกฤต',
                  borderClass: 'border-rose-500/90 shadow-rose-950/90',
                  headerBg: 'from-rose-950/95 via-slate-900 to-slate-950',
                  pillClass: 'bg-rose-950/90 text-rose-200 border-rose-700/70',
                }
              : tier === 'high'
              ? {
                  badgeText: 'ปะทะด่านชุมชน · เขตอันตรายสูง',
                  zoneStatusLabel: 'ด่านปิดกั้นชุมชนเข้มงวด',
                  borderClass: 'border-orange-500/80 shadow-orange-950/80',
                  headerBg: 'from-orange-950/90 via-slate-900 to-slate-950',
                  pillClass: 'bg-orange-950/80 text-orange-200 border-orange-700/60',
                }
              : tier === 'watch'
              ? {
                  badgeText: 'ถูกเวรยามซอยสกัดกั้น · เขตเฝ้าระวัง',
                  zoneStatusLabel: 'ตรอกซอกซอยมีเวรยามและกับดัก',
                  borderClass: 'border-amber-500/75 shadow-amber-950/75',
                  headerBg: 'from-amber-950/85 via-slate-900 to-slate-950',
                  pillClass: 'bg-amber-950/80 text-amber-200 border-amber-700/60',
                }
              : {
                  badgeText: 'ความตื่นตระหนกของคนเป็น · เขตระแวงภัย',
                  zoneStatusLabel: 'ชาวบ้านหลบภัยหลังเหล็กดัดตึกแถว',
                  borderClass: 'border-rose-500/65 shadow-slate-950/90',
                  headerBg: 'from-rose-950/80 via-slate-900 to-slate-950',
                  pillClass: 'bg-slate-900/90 text-amber-200 border-amber-800/50',
                };

          const hpStateLabel =
            activeThreatAmbushAlert.remainingHp <= 25
              ? 'สาหัสวิกฤต'
              : activeThreatAmbushAlert.remainingHp <= 55
              ? 'บาดเจ็บต้องระวัง'
              : 'ยังพยุงร่างต่อได้';

          return (
            <div
              role="alertdialog"
              aria-modal="true"
              className="game-dialog fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            >
              <div
                className={`max-w-xl w-full p-5 sm:p-7 rounded-2xl bg-gradient-to-b ${tierVisual.headerBg} border-2 ${tierVisual.borderClass} shadow-2xl space-y-4 my-auto relative animate-in fade-in zoom-in-95 duration-200`}
              >
                {/* Header Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-rose-900/50">
                  <span className="flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-wider text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce shrink-0" />
                    {tierVisual.badgeText}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-950/90 text-slate-200 border border-slate-800 text-xs font-mono font-semibold">
                    วันที่ {activeThreatAmbushAlert.day} ({formatTimelineDate(activeThreatAmbushAlert.day)}) · {activeThreatAmbushAlert.locationName}
                  </span>
                </div>

                {/* Diegetic Quarantine Context Tags (No internal scene counts or raw RNG percentages) */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`px-2.5 py-1 rounded-md border font-medium ${tierVisual.pillClass}`}>
                    สถานะพื้นที่: <strong className="font-bold">{tierVisual.zoneStatusLabel}</strong>
                    {showNumericSpoilers ? ` (${activeThreatAmbushAlert.localThreat}/100)` : ''}
                  </span>
                  {scen.attackerSource && (
                    <span className="px-2.5 py-1 rounded-md bg-slate-950/85 text-slate-300 border border-slate-800">
                      ผู้ลงมือ: <strong className="text-slate-100">{scen.attackerSource}</strong>
                    </span>
                  )}
                </div>

                {/* Title, Narrative Description & Weapon/Wound Breakdown */}
                <div className="space-y-3">
                  <h2 className="text-lg sm:text-xl font-black text-rose-100 leading-snug flex items-start gap-2.5">
                    <Skull className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <span>{scen.title}</span>
                  </h2>

                  <div className="bg-slate-950/75 p-4 rounded-xl border border-rose-950/80 space-y-3">
                    <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                      {resolveAgeDialogue(
                        { sourceFamily: 'hazard', eventId: scen.id, field: 'description' },
                        gameState?.characterProfile?.age,
                        scen.description
                      )}
                    </p>

                    {(scen.weaponUsed || scen.injuryDetail) && (
                      <div className="pt-2.5 border-t border-slate-800/90 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        {scen.weaponUsed && (
                          <div className="bg-slate-900/70 px-3 py-2 rounded-lg border border-slate-800/80">
                            <div className="text-[11px] font-mono text-slate-400 uppercase">อาวุธ / สิ่งสกัดกั้น</div>
                            <div className="text-slate-200 font-medium mt-0.5">{scen.weaponUsed}</div>
                          </div>
                        )}
                        {scen.injuryDetail && (
                          <div className="bg-rose-950/35 px-3 py-2 rounded-lg border border-rose-900/40">
                            <div className="text-[11px] font-mono text-rose-300/80 uppercase">ลักษณะบาดแผล</div>
                            <div className="text-rose-100 font-medium mt-0.5">{scen.injuryDetail}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Damage & Impact Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                  <div className="p-3.5 rounded-xl bg-rose-950/55 border border-rose-500/45 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-rose-400" />
                        ความเสียหายต่อร่าง
                      </div>
                      <span className="text-lg font-black text-rose-400">
                        -{activeThreatAmbushAlert.hpLoss} HP
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-rose-950">
                      <div
                        className={`h-full transition-all ${
                          activeThreatAmbushAlert.remainingHp <= 25
                            ? 'bg-rose-500'
                            : activeThreatAmbushAlert.remainingHp <= 55
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, activeThreatAmbushAlert.remainingHp))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">สภาพร่างคงเหลือ ({hpStateLabel})</span>
                      <span
                        className={`font-mono font-bold ${
                          activeThreatAmbushAlert.remainingHp <= 25
                            ? 'text-rose-400 animate-pulse'
                            : 'text-slate-200'
                        }`}
                      >
                        {activeThreatAmbushAlert.remainingHp}/100
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/75 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Brain className="w-3.5 h-3.5 text-sky-400" />
                        ผลกระทบต่อสติ
                      </div>
                      <span className="text-lg font-black text-sky-300">
                        {activeThreatAmbushAlert.sanityLoss > 0
                          ? `-${activeThreatAmbushAlert.sanityLoss} สติ`
                          : 'สติไม่ลดลง'}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-sky-400 transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, activeThreatAmbushAlert.remainingSanity))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">สติสัมปชัญญะคงเหลือ</span>
                      <span className="font-mono font-bold text-sky-300">
                        {activeThreatAmbushAlert.remainingSanity}/100
                      </span>
                    </div>
                  </div>
                </div>

                {/* Survival Tip */}
                <div className="p-3.5 rounded-xl bg-slate-950/85 border border-slate-800/90 text-xs leading-relaxed text-slate-300">
                  {activeThreatAmbushAlert.remainingHp <= 25 ? (
                    <p className="text-rose-300 font-semibold flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>
                        เนื้อเยื่อเสียหายหนักจนจวนเจียนจะล้มพับ! รีบใช้ถุงเลือดสำรอง พักฟื้นร่างกาย หรือถอยออกจากย่านนี้ไปยังจุดพักพิงที่มีความระแวงต่ำกว่าทันที
                      </span>
                    </p>
                  ) : tier === 'lockdown' || tier === 'high' ? (
                    <p className="flex items-start gap-2 text-slate-300">
                      <span className="text-amber-400 shrink-0 mt-0.5">💡</span>
                      <span>
                        ย่านนี้มีการตั้งด่านและเวรยามติดอาวุธคอยดักซุ่มผู้ติดเชื้อ อาศัยวันที่มีฝนเขม่าหรือหมอกควันทึบเพื่อพรางตัว ลอบตัดไฟด่านตรวจ หรือย้ายไปตั้งหลักในย่านที่ผู้คนไม่ตื่นตระหนก
                      </span>
                    </p>
                  ) : (
                    <p className="flex items-start gap-2 text-slate-300">
                      <span className="text-amber-400 shrink-0 mt-0.5">💡</span>
                      <span>
                        คนเป็นในตึกแถวและตรอกซอกซอยของกรุงเทพฯ ที่ถูกตัดขาดกำลังหวาดกลัวผู้ติดเชื้อ การเดินเข้าใกล้ประตูบ้านหรือแผงกั้นซอยโดยไม่มีคนคุ้นเคยรับรองอาจทำให้ถูกทำร้ายได้เสมอ
                      </span>
                    </p>
                  )}
                </div>

                {/* Confirm / Dismiss button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveThreatAmbushAlert(null);
                      if (soundEnabled) soundFx.click();
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm sm:text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-950/60 active:scale-[0.99]"
                  >
                    <ArrowRight className="w-4 h-4" />
                    ประคองร่างถอยเข้ามุมมืดและไปต่อ
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* =====================================================================
          BLOCKING POPUP MODAL: MUTATION MILESTONE AWAKENING ALERT (25, 50, 75)
         ===================================================================== */}
      {screenStage === 'playing' &&
        activeMutationMilestoneAlert && (
          <div role="dialog" aria-modal="true" className="game-dialog fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div
              className={`max-w-lg w-full p-6 rounded-2xl bg-slate-900 border-2 space-y-4 shadow-2xl my-auto ${activeMutationMilestoneAlert.badgeColor}`}
            >
              <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-slate-800">
                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-purple-300">
                  <Dna className="w-4 h-4 text-purple-400 animate-pulse" />
                  การเปลี่ยนแปลงทางชีวภาพ · Mutation Awakening
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-950 text-[11px] font-bold">
                  ระดับ {activeMutationMilestoneAlert.threshold}%
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-24 shrink-0 p-2 rounded-xl bg-slate-950/90 border border-purple-500/40">
                  <ZombiePortrait
                    bio={currentBio}
                    mutation={Math.max(
                      activeMutationMilestoneAlert.threshold,
                      Math.floor(gameState?.stats?.mutation || 0)
                    )}
                  />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    {activeMutationMilestoneAlert.category}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
                    {activeMutationMilestoneAlert.title}
                  </h2>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-200 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                {activeMutationMilestoneAlert.awakeningText}
              </p>

              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  การเปลี่ยนแปลงของสรีระร่างกาย:
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {activeMutationMilestoneAlert.bodyChange}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMutationMilestoneAlert(null);
                    if (soundEnabled) soundFx.click();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-extrabold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  รับรู้การเปลี่ยนแปลงทางชีวภาพ (บันทึกลงสมุดบันทึกแล้ว)
                </button>
              </div>
            </div>
          </div>
        )}

      {/* =====================================================================
          BLOCKING POPUP MODAL 3: SUBTLE UNLABELLED ECHO POPUP
         ===================================================================== */}
      {screenStage === 'playing' &&
        !rawViewModel?.pending &&
        !rawViewModel?.ending &&
        !currentActiveLifeSimModal &&
        activeOrganicEchoPopup && (
          <div role="dialog" aria-modal="true" className="game-dialog fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="max-w-xl w-full p-6 rounded-2xl bg-slate-900 border-2 border-amber-400/80 space-y-4 shadow-2xl my-auto">
              <div className="flex items-center justify-between text-xs font-mono text-amber-300 pb-2 border-b border-slate-800">
                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  เหตุการณ์ตรงหน้า · ต้องตัดสินใจก่อนไปต่อ
                </span>
                <span className="text-slate-400">เหตุการณ์ระหว่างทาง</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
                {activeOrganicEchoPopup.title}
              </h3>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                {activeOrganicEchoPopup.text}
              </p>

              <div className="space-y-2.5 pt-2">
                {activeOrganicEchoPopup.choices.map((ch, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      handleChooseOrganicEchoOption(activeOrganicEchoPopup, idx)
                    }
                    className="w-full text-left p-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-lime-400 text-slate-100 transition-all shadow-md"
                  >
                    <div className="text-sm sm:text-base font-bold">{ch.text}</div>
                    <div className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      {showNumericSpoilers
                        ? ch.note
                        : translateNumericNoteToNarrative(ch.note, { enabled: true })}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      {/* =====================================================================
          POPUP MODAL 4: ROLLED CHARACTER BACKGROUND DOSSIER
         ===================================================================== */}
      {rolledPreviewCandidate && (
        <div role="dialog" aria-modal="true" className="game-dialog fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-xl w-full p-6 rounded-2xl bg-slate-900 border-2 border-lime-400/80 space-y-5 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-mono text-lime-300">
                <FileText className="w-4 h-4" />
                <span>แฟ้มชันสูตรและภูมิหลังผู้ติดเชื้อที่สุ่มได้</span>
              </div>
              <span className="text-xs font-mono text-amber-300">
                ตื่นขึ้น: 15 ตุลาคม
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-mono text-slate-400">
                  ข้อมูลบุคคลก่อนเสียชีวิต:
                </div>
                <div className="mx-auto w-32"><ZombiePortrait bio={rolledPreviewCandidate.bio} /></div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white">
                  อดีตก่อนตาย: อายุ {rolledPreviewCandidate.bio.age} ปี · เพศ
                  {rolledPreviewCandidate.bio.gender} · {getCharacterAgeGroup(rolledPreviewCandidate.bio.age)} · {rolledPreviewCandidate.bio.occupation}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {rolledPreviewCandidate.bio.preDeathDetail}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/25 border border-amber-500/40 space-y-1.5">
                <div className="text-xs font-mono font-bold text-amber-300">
                  การประเมินร่องรอยการติดเชื้อและกลายพันธุ์:
                </div>
                <p className="text-xs sm:text-sm text-amber-100 leading-relaxed">
                  {rolledPreviewCandidate.bio.autopsyObservation} (คาดว่ากลายพันธุ์มาแล้วประมาณ{' '}
                  <strong>{rolledPreviewCandidate.bio.daysInfectedEstimate} วัน</strong>)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400">ของติดตัวจากอาชีพก่อนตาย</div>
                  <div className="font-bold text-lime-300 mt-1">
                    {rolledPreviewCandidate.bio.signatureItemName}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {rolledPreviewCandidate.bio.signatureItemDesc}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400">จุดเกิดและความถนัดเริ่มต้น</div>
                  <div className="font-bold text-slate-100 mt-1">
                    {production?.catalog.PLACES[rolledPreviewCandidate.state.place]?.name}
                  </div>
                  <div className="text-[11px] text-lime-300 mt-1">
                    {rolledPreviewCandidate.bio.perkSummary}
                  </div>
                  <div className="text-xs text-slate-300 mt-2">{rolledPreviewCandidate.bio.specialChoiceLabel}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmWakeUpWithRolledCharacter}
                className="flex-1 py-3.5 px-5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-extrabold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <Play className="w-4 h-4 fill-current" />
                ลืมตาตื่นขึ้นในร่างนี้ (เริ่มวันที่ 15 ตุลาคม)
              </button>
              <button
                type="button"
                onClick={handleRollCharacterPreview}
                className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <Shuffle className="w-3.5 h-3.5" />
                สุ่มตัวละครใหม่อีกครั้ง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          POPUP MODAL 5: SURRENDER TO ZOMBIE INSTINCT CONFIRMATION
         ===================================================================== */}
      {showSurrenderConfirmModal && (
        <div role="dialog" aria-modal="true" className="game-dialog fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border-2 border-rose-500/60 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
              <Skull className="w-5 h-5" />
              <span>ยอมแพ้ต่อสัญชาตญาณซอมบี้?</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              หากเจ้าเลือกหยุดฝืนต้านทานความหิวและเสียงเพรียกของเชื้อ{' '}
              <strong className="text-rose-300">
                สติสัมปชัญญะของร่างนี้จะถูกกลืนกินจนหมดสิ้น (สติเหลือ 0)
              </strong>{' '}
              และเข้าสู่ฉากจบกลายเป็นซอมบี้ไร้สติทันที
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSurrenderToZombieInstinct}
                className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-extrabold text-xs transition-colors"
              >
                ปล่อยให้สติถูกกลืนกิน (จบชีวิตนี้)
              </button>
              <button
                type="button"
                onClick={() => setShowSurrenderConfirmModal(false)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
              >
                ยังประคองสติสู้ต่อ
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
