import EndingExperience from './components/EndingExperience';
import StoryFeed, { storyLogKey, type StoryMoment } from './components/StoryFeed';
import { generateCharacter, resolveSavedCharacter, snapshotCharacter, getCharacterAgeGroup, createCharacterState } from './data/characterPool';
import PixelCityMap from './components/PixelCityMap';
import { buildMapLocations } from './data/mapLocations';
import ZombiePortrait from './components/ZombiePortrait';
import { getEndingReadiness, getRouteGuidance, PROGRESSION_ROUTES } from './data/progressionRules';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  Search,
  Download,
  Upload,
  Volume2,
  VolumeX,
  ArrowRight,
  Wrench,
  Terminal,
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
  Briefcase,
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
} from './data/pastLifeEchoes';
import {
  AI_COLLABORATION_PROMPTS,
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
          choose: (state: any, choiceIndex: number, instanceId: string) => { ok: boolean; reason?: string };
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
        draw: (canvas: HTMLCanvasElement | null, state: any, tick?: number, options?: { hideCharacter?: boolean }) => void;
      };
    };
  }
}

type AppMode = 'game' | 'studio';
type GameScreenStage = 'login' | 'hub' | 'playing';
type StudioTab = 'ai-pack' | 'inspector' | 'patches';
type MobileDrawerTab = 'play' | 'map' | 'bag' | 'people' | 'journal';
type DesktopSideTab = 'map' | 'bag' | 'people' | 'journal';

import { prepareNpcModal, npcChoiceReason, applyNpcRelationships, validateZoneRelationships, migrateSavedRelationships } from './data/npcInteractions';
import { relationshipTier } from './data/npcRelationships.js';
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

function classifyEventLayer(id: string): string {
  if (id.startsWith('travel.')) return 'เดินทาง';
  if (id.startsWith('bkk_')) return 'ย่านอาชีพ';
  if (id.startsWith('route.')) return 'เส้นทาง';
  if (id.startsWith('clinic.') || id.startsWith('pack.') || id.startsWith('remnant.')) {
    return 'เนื้อเรื่อง';
  }
  if (id.startsWith('origins.')) return 'จุดกำเนิด';
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
  const [appMode, setAppMode] = useState<AppMode>('game');
  const [screenStage, setScreenStage] = useState<GameScreenStage>('login');
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_USER) || 'ผู้บันทึกเขตศูนย์ (Subject-00)';
    } catch {
      return 'ผู้บันทึกเขตศูนย์ (Subject-00)';
    }
  });
  const [loginInput, setLoginInput] = useState<string>(playerName);

  const [studioTab, setStudioTab] = useState<StudioTab>('ai-pack');
  const [mobileTab, setMobileTab] = useState<MobileDrawerTab>('play');
  const [desktopSideTab, setDesktopSideTab] = useState<DesktopSideTab>('map');

  const [copiedId, setCopiedId] = useState<string | null>(null);
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
  const [showDownloadGameModal, setShowDownloadGameModal] = useState<boolean>(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  // Active Freeform Life-Sim Blocking Modal Event
  const [activeLifeSimModal, setActiveLifeSimModal] = useState<LifeSimModalEvent | null>(() => {
    try { return window.AfterZeroEngine?.Production?.engine.validate(JSON.parse(localStorage.getItem(STORAGE_KEY_STATE)||'null')).npcEncounter || null; }
    catch { return null; }
  });
  const resolvingModalRef = useRef<string | null>(null);

  // Active Mutation Milestone Alert Modal (25, 50, 75)
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

  // Live Engine Patches
  const [patches, setPatches] = useState({
    staggerLegacy02Story: true,
    hideLockedCareSpoilers: true,
    bridge03ToEndings: true,
    midGameHorizonClues: true,
    pastLifeEchoesEnabled: true,
  });

  // Initialize or restore game state
  const [gameState, setGameState] = useState<any>(() => {
    const prod = window.AfterZeroEngine?.Production;
    if (!prod) return null;
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEY_STATE);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        resolveSavedCharacter(parsed, localStorage.getItem(STORAGE_KEY_BIO_ID) || undefined, currentBio);
        const validated = prod.engine.validate(parsed);
        const savedZones=parsed.npcZones || JSON.parse(localStorage.getItem(STORAGE_KEY_ZONE_POPS)||'null');
        if(savedZones)migrateSavedRelationships(validated,savedZones);
        validated.carriedBloodBags = Number(parsed.carriedBloodBags || 0);
        validated.characterProfile = snapshotCharacter(currentBio);
        validated.roamCooldowns = (parsed && typeof parsed.roamCooldowns === 'object' && parsed.roamCooldowns !== null && !Array.isArray(parsed.roamCooldowns)) ? parsed.roamCooldowns : {};
        validated.asokWreckDepletedParts = Array.isArray(parsed?.asokWreckDepletedParts) ? parsed.asokWreckDepletedParts.filter((p: any) => typeof p === 'string') : [];
        return validated;
      }
    } catch {
      // Fallback to fresh game state
    }
    const seed = currentBio.generationSeed ?? Math.floor(Date.now() % 100000);
    const fresh = createCharacterState(prod, currentBio, seed);
    return structuredClone(fresh);
  });

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
  const [searchQuery, setSearchQuery] = useState('');
  const [layerFilter, setLayerFilter] = useState<string>('ALL');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loginCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const production = window.AfterZeroEngine?.Production;

  // Sync Story NPCs from engine state into Zone Populations
  const syncedZonePopulations = useMemo(() => {
    return syncZonePopulationsWithEngineState(zonePopulations, gameState);
  }, [zonePopulations, gameState]);

  const currentZonePop: ZonePopulationState | undefined = useMemo(() => {
    if (!gameState) return undefined;
    return syncedZonePopulations[gameState.place || 'shelter'];
  }, [syncedZonePopulations, gameState]);

  const currentZoneTrustStats = useMemo(() => {
    return calculateZoneTrustStats(currentZonePop);
  }, [currentZonePop]);

  // Collapsible state for NPC Crisis Alerts on Mobile Dashboard & People Tab
  const [isCrisisListExpanded, setIsCrisisListExpanded] = useState<boolean>(false);
  const [isPeopleCrisisSectionExpanded, setIsPeopleCrisisSectionExpanded] = useState<boolean>(true);
  const [expandedNpcCardCrisisIds, setExpandedNpcCardCrisisIds] = useState<Record<string, boolean>>({});

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
      const placeInfo = placesCatalog[placeId];
      const placeName = placeInfo?.short || placeInfo?.name || placeId;
      const isCurrentZone = placeId === currentPlaceId;
      zonePop.npcs.forEach(npc => {
        if (npc.alive && !npc.crisisResolved && npc.crisisDay && currentDay >= npc.crisisDay) {
          list.push({
            npc,
            placeId,
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
    if (gameState) {
      try {
        localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify({...gameState,npcZones:syncedZonePopulations}));
      } catch {
        // ignore
      }
    }
  }, [gameState, syncedZonePopulations]);

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
    if (appMode === 'game' && screenStage === 'playing' && gameState) {
      soundFx.syncSceneAmbience(gameState.place, gameState.ending?.id);
    } else {
      soundFx.stopAmbience();
    }
  }, [soundEnabled, ambientEnabled, appMode, screenStage, gameState?.place, gameState?.ending?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ARCHIVE, JSON.stringify(pastLives));
    } catch {
      // ignore
    }
  }, [pastLives]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BIO_ID, currentBioId);
    } catch {
      // ignore
    }
  }, [currentBioId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TRIGGERED_ECHOES, JSON.stringify(triggeredEchoIds));
    } catch {
      // ignore
    }
  }, [triggeredEchoIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MUTATION_MILESTONES, JSON.stringify(recordedMutationMilestones));
    } catch {
      // ignore
    }
  }, [recordedMutationMilestones]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ZONE_POPS, JSON.stringify(syncedZonePopulations));
    } catch {
      // ignore
    }
  }, [syncedZonePopulations]);

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
    if (appMode === 'game' && screenStage === 'playing' && canvasRef.current) {
      scene.draw(canvasRef.current, gameState, gameState.day || 1, { hideCharacter: true });
    }
    if (appMode === 'game' && screenStage === 'login' && loginCanvasRef.current) {
      scene.draw(loginCanvasRef.current, gameState, 1);
    }
  }, [appMode, screenStage, gameState, mobileTab]);

  // Global reputation and the average trust of this zone are separate quantities.
  const effectiveGameState = useMemo(() => {
    if (!gameState) return null;
    const clone = structuredClone(gameState);
    if (clone.ending) {
      clone.pending = null;
      const derived = deriveDeathEndingPresentation(gameState, currentBio, {
        id: gameState.ending.id,
        title: gameState.ending.title,
        text: gameState.ending.text,
        causeCode: gameState.ending.causeCode,
      });
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
      !patches.pastLifeEchoesEnabled ||
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
    patches.pastLifeEchoesEnabled,
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

        if (patches.staggerLegacy02Story && LEGACY_02_STORY_ACTION_IDS.has(a.id)) {
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

        if (patches.hideLockedCareSpoilers) {
          const availableWithoutPending = effectiveGameState.pending
            ? production.engine.previewAction({ ...effectiveGameState, pending: null }, a.id).enabled
            : a.preview?.enabled;

          if ((isStory || isConditionalCare) && !availableWithoutPending && !effectiveGameState.ending) {
            visible = false;
          }
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
  }, [rawViewModel, production, effectiveGameState, patches, showNumericSpoilers]);

  // Compute Mid-Game Horizon Clues
  const horizonClues = useMemo(() => {
    if (!showRouteHints || !patches.midGameHorizonClues || !effectiveGameState) return [];
    return getMidGameHorizonClues(effectiveGameState);
  }, [showRouteHints, patches.midGameHorizonClues, effectiveGameState]);

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
      desc: string;
      accent: string;
      isSignature?: boolean;
      canUseDirectly?: boolean;
      useLabel?: string;
    }> = [
      {
        id: 'signature-occupation-item',
        name: currentBio.signatureItemName,
        count: 1,
        unit: 'ของติดตัวก่อนตาย',
        desc: currentBio.signatureItemDesc,
        accent: 'text-lime-300 border-lime-400/50 bg-lime-950/20',
        isSignature: true,
      },
    ];

    const supplies = Number(gameState.items?.supplies || 0);
    const medicine = Number(gameState.items?.medicine || 0);
    const samples = Number(gameState.items?.samples || 0);
    const carriedBlood = Number(gameState.carriedBloodBags || 0);

    if (supplies > 0) {
      items.push({
        id: 'supplies',
        name: 'เสบียงมนุษย์ (อาหารกระป๋อง)',
        count: supplies,
        unit: 'ชิ้น',
        desc: 'ซอมบี้กินอาหารคนเป็นแล้วไม่อิ่ม ใช้สำหรับแบ่งให้ผู้รอดชีวิตเพื่อเพิ่มความไว้ใจรายบุคคล',
        accent: 'text-amber-300 border-amber-500/40',
      });
    }
    if (medicine > 0) {
      items.push({
        id: 'medicine',
        name: 'ชุดเย็บแผลและเวชภัณฑ์',
        count: medicine,
        unit: 'ชุด',
        desc: 'ใช้ปะติดปะต่อเนื้อเยื่อของร่าง (+40 สภาพร่าง) หรือมอบให้คนเจ็บในพื้นที่',
        accent: 'text-emerald-300 border-emerald-500/40',
      });
    }
    if (samples > 0) {
      items.push({
        id: 'samples',
        name: 'หลอดตัวอย่างเชื้อเรืองแสง',
        count: samples,
        unit: 'หลอด',
        desc: 'ตัวอย่างเชื้อความเข้มข้นสูง ใช้สำหรับวิจัยเซรุ่มหรือกระตุ้นการวิวัฒน์สายพันธุ์',
        accent: 'text-teal-300 border-teal-500/40',
      });
    }
    if (carriedBlood > 0) {
      items.push({
        id: 'carriedBloodBags',
        name: 'ถุงเลือดพกพา',
        count: carriedBlood,
        unit: 'ถุง',
        desc: 'ถุงเลือดสำรองที่พกติดตัวไว้ในกระเป๋า สามารถฉีกดื่มประทังความหิวได้ทันที (-28 ความหิว)',
        accent: 'text-rose-300 border-rose-500/50',
        canUseDirectly: true,
        useLabel: 'ดื่มถุงเลือดพกพา (-28 ความหิว)',
      });
    }
    return items;
  }, [gameState, currentBio]);

  // Step 1 -> Step 2: Login Submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = loginInput.trim() || 'ผู้บันทึกเขตศูนย์ (Subject-00)';
    setPlayerName(clean);
    try {
      localStorage.setItem(STORAGE_KEY_USER, clean);
    } catch {
      // ignore
    }
    if (soundEnabled) soundFx.success();
    setScreenStage('hub');
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
    setLatestStory(null);
    setRecordedCurrentEndingRunId(null);
    setActiveLifeSimModal(null);
    setZonePopulations(createInitialZonePopulations(seed));
    const freshState = structuredClone(rolledPreviewCandidate.state);
    freshState.roamCooldowns = {};
    freshState.asokWreckDepletedParts = [];
    setGameState(freshState);
    setRolledPreviewCandidate(null);
    setScreenStage('playing');
    setMobileTab('play');
    setActionToast(null);
  };

  const recordStoryResult = (before: any, next: any, moment: Pick<StoryMoment, 'title' | 'choice' | 'text'>) => {
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
    setLatestStory({
      ...moment, runId: next.runId, day: next.day || 1,
      place: production?.catalog.PLACES[next.place]?.short || '', effects,
      logKeys: (next.log || []).filter((entry: any) => entry.kind !== 'danger' && !previousKeys.has(storyLogKey(entry))).map(storyLogKey),
    });
    setActionToast(null);
  };

  // Drink a carried blood bag directly from inventory
  const handleDrinkCarriedBloodBag = () => {
    if (!gameState || (gameState.carriedBloodBags || 0) <= 0) return;
    if (soundEnabled) soundFx.success();

    const before = structuredClone(gameState);
    const next = structuredClone(gameState);
    next.carriedBloodBags = Math.max(0, (next.carriedBloodBags || 0) - 1);
    next.stats.hunger = Math.max(0, (next.stats.hunger || 0) - 28);
    next.stats.hp = Math.min(100, (next.stats.hp || 0) + 4);
    next.stats.sanity = Math.min(100, (next.stats.sanity || 0) + 2);
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
      currentZonePop,
      gameState,
      currentBio,
      specificNpcId
    );
    if (!modal) {
      setActionToast('ไม่พบผู้รอดชีวิตที่ยังมีชีวิตอยู่ในเขตนี้แล้ว');
      return;
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
      const relationshipReason = npcChoiceReason(
        gameState,
        syncedZonePopulations[modalEvent.placeId] || syncedZonePopulations[gameState.place || 'shelter'],
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
      const eff = choice.effects || {};

    // Advance 1 day only if the modal event consumes a day
    if (modalEvent.advanceDay !== false) {
      next.day = (next.day || 1) + 1;
      // System 1: Apply daily mutation tissue regeneration if stage >= 2
      const mutStage = getMutationStageInfo(next.stats?.mutation || 0);
      if (mutStage.dailyHpRegen > 0 && (next.stats?.hp || 0) > 0) {
        next.stats.hp = Math.min(100, (next.stats.hp || 0) + mutStage.dailyHpRegen);
      }
    }

    // Roam cooldown handling (starts after choosing any option including retreat)
    const contentId = modalEvent.contentId || modalEvent.id.replace(/-\d+.*$/, '');
    if (modalEvent.cooldownDays && modalEvent.cooldownDays > 0) {
      if (!next.roamCooldowns || typeof next.roamCooldowns !== 'object') {
        next.roamCooldowns = {};
      }
      next.roamCooldowns[contentId] = (next.day || 1) + modalEvent.cooldownDays;
    }

    // Event 23 (Wreck pile parts depletion)
    if ((choice as any).partKey) {
      const part = (choice as any).partKey;
      const currentDepleted = Array.isArray(next.asokWreckDepletedParts) ? [...next.asokWreckDepletedParts] : [];
      if (!currentDepleted.includes(part)) {
        currentDepleted.push(part);
      }
      next.asokWreckDepletedParts = currentDepleted;
    }

    const applyClampedStat = (key: string, delta?: number, max = 100) => {
      if (!delta) return;
      next.stats[key] = Math.min(max, Math.max(0, (next.stats[key] || 0) + delta));
    };

    applyClampedStat('hp', eff.hp, 100);
    applyClampedStat('hunger', eff.hunger, 100);
    applyClampedStat('sanity', eff.sanity, 100);
    applyClampedStat('humanity', eff.humanity, 100);
    applyClampedStat('mutation', eff.mutation, 100);
    applyClampedStat('research', eff.research, 100);
    applyClampedStat('horde', eff.horde, 120);
    for (const key of ['corpseMeals', 'endured'] as const) {
      if (eff[key]) {
        next.memory[key] = (next.memory[key] || 0) + eff[key]!;
        if (!next.memory[key + 'On']) next.memory[key + 'On'] = next.day;
      }
    }

    if (eff.supplies) {
      next.items.supplies = Math.max(0, (next.items.supplies || 0) + eff.supplies);
    }
    if (eff.medicine) {
      next.items.medicine = Math.max(0, (next.items.medicine || 0) + eff.medicine);
    }
    if (eff.samples) {
      next.items.samples = Math.max(0, (next.items.samples || 0) + eff.samples);
    }
    if (eff.carriedBloodBags) {
      next.carriedBloodBags = Math.max(0, (next.carriedBloodBags || 0) + eff.carriedBloodBags);
    }

    // Persist story flags from timeline crises and follow-up roam events
    if (!next.story || typeof next.story !== 'object') {
      next.story = { flags: {} };
    }
    if (!next.story.flags || typeof next.story.flags !== 'object') {
      next.story.flags = {};
    }
    if (Array.isArray(modalEvent.onResolveSetFlags)) {
      for (const flagKey of modalEvent.onResolveSetFlags) {
        if (flagKey) next.story.flags[flagKey] = true;
      }
    }
    if (eff.setFlag) {
      next.story.flags[eff.setFlag] = true;
    }
    if (Array.isArray(eff.setFlags)) {
      for (const flagKey of eff.setFlags) {
        if (flagKey) next.story.flags[flagKey] = true;
      }
    }

    if (eff.threatDelta && next.world?.locations?.[modalEvent.placeId]) {
      const loc = next.world.locations[modalEvent.placeId];
      loc.threat = Math.min(100, Math.max(0, (loc.threat || 20) + eff.threatDelta));
    }

    // Trust, crisis resolution and lives saved are independent outcomes.
    const nextZones = structuredClone(syncedZonePopulations);
    const zone = nextZones[modalEvent.placeId];
    if(zone)applyNpcRelationships(next,zone,modalEvent,choice,before.day||1);
    next.npcZones=nextZones;

    // System 1b: Apply Daily Bangkok Weather & Zone Danger (threat) turn modifiers if day advanced
    let hazardAttacked = false;
    if (modalEvent.advanceDay !== false) {
      const hazardRes = applyDailyWeatherAndZoneHazardTurn(next, before);
      hazardAttacked = Boolean(hazardRes.attacked);
      if (hazardRes.attacked && hazardRes.scenario) {
        if (soundEnabled) soundFx.warning();
      }
    }

    // Check if this choice inside a Climax Trigger Event directly culminates in an Ending!
    const modalTextCombined = `${modalEvent.title || ''} ${modalEvent.text || ''} ${choice.outcomeText || ''}`;
    const isColdModalContext =
      modalEvent.id.includes('black_rain') ||
      /ฝนเขม่า|ฝนกรด|พายุฝน|หนาวสั่น|เย็นเฉียบ|อุณหภูมิร่างกายลด|ตู้แช่/.test(modalTextCombined);

    if (eff.triggerEndingId) {
      next.pending = null;
      const derived = deriveDeathEndingPresentation(next, currentBio, {
        id: eff.triggerEndingId,
        causeCode: eff.triggerEndingId === 'bombed' ? 'bombardment' : undefined,
      });
      next.ending = {
        id: eff.triggerEndingId,
        day: next.day,
        title: derived.title,
        text: derived.text,
        causeCode: derived.cause.code.toLowerCase(),
        causeOfDeath: derived.cause,
      };
    } else if (next.stats.hp <= 0) {
      next.pending = null;
      const inferredCauseCode =
        next.day >= MAX_BOMBING_DAY
          ? 'bombardment'
          : isColdModalContext
          ? 'hypothermia'
          : hazardAttacked || /ยิง|กระสุน|ทหาร|แทง|อาวุธ|ปะทะ/.test(modalTextCombined)
          ? 'human_attack'
          : (next.stats.hunger >= 85 || (next.body?.starvationDays || 0) >= 2)
          ? 'starvation'
          : 'fatal_trauma';
      const derived = deriveDeathEndingPresentation(next, currentBio, {
        id: 'death',
        causeCode: inferredCauseCode,
      });
      next.ending = {
        id: 'death',
        day: next.day,
        title: derived.title,
        text: derived.text,
        causeCode: derived.cause.code.toLowerCase(),
        causeOfDeath: derived.cause,
      };
    } else if (next.stats.sanity <= 0 || next.stats.hunger >= 100) {
      next.pending = null;
      const inferredCauseCode =
        next.stats.hunger >= 85 || (next.body?.starvationDays || 0) >= 2
          ? 'starvation'
          : 'feral_madness';
      const derived = deriveDeathEndingPresentation(next, currentBio, {
        id: 'feral',
        causeCode: inferredCauseCode,
      });
      next.ending = {
        id: 'feral',
        day: next.day,
        title: derived.title,
        text: derived.text,
        causeCode: derived.cause.code.toLowerCase(),
        causeOfDeath: derived.cause,
      };
    } else if (next.day >= MAX_BOMBING_DAY) {
      next.pending = null;
      const derived = deriveDeathEndingPresentation(next, currentBio, {
        id: 'bombed',
        causeCode: 'bombardment',
      });
      next.ending = {
        id: 'bombed',
        day: next.day,
        title: derived.title,
        text: derived.text,
        causeCode: derived.cause.code.toLowerCase(),
        causeOfDeath: derived.cause,
      };
    }

    next.log = [
      {
        id: Date.now(),
        day: next.day,
        text: choice.outcomeText,
        kind: eff.triggerEndingId ? 'ending' : 'lifesim',
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
    recordStoryResult(before, next, { title: modalEvent.title, choice: choice.text, text: choice.outcomeText });
    setGameState(next);
    if (eff.triggerEndingId) {
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
    next.stats.sanity = 0;
    next.pending = null;
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

    const next = structuredClone(gameState);
    next.pending = null;
    const causeOfDeath = deriveCauseOfDeath(next, {
      id: option.id,
      title: option.title,
      text: option.endingText,
    });
    next.ending = {
      id: option.id,
      day: next.day || 1,
      causeCode: causeOfDeath.code.toLowerCase(),
      causeOfDeath,
    };
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
        id: option.id,
        title: option.endingTitle,
        text: option.endingText,
      }
    );

    setPastLives(prev => [record, ...prev.filter(p => p.runId !== record.runId)]);
    setRecordedCurrentEndingRunId(next.runId);
    setGameState(next);
    setMobileTab('play');
  };

  // Choose an option inside the Subtle Unlabelled Echo Modal Popup
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
      next.stats[k] = Math.min(100, Math.max(0, (next.stats[k] || 0) + choice.effects.delta));
    }
    if (choice.effects?.item && choice.effects?.itemDelta) {
      const ik = choice.effects.item;
      if (ik === 'carriedBloodBags') {
        next.carriedBloodBags = (next.carriedBloodBags || 0) + choice.effects.itemDelta;
      } else {
        next.items[ik] = (next.items[ik] || 0) + choice.effects.itemDelta;
      }
    }

    next.log = [
      {
        id: Date.now(),
        day: next.day || 1,
        text: choice.outcomeLog,
        kind: 'event',
      },
      ...(next.log || []),
    ];

    setTriggeredEchoIds(prev => [...prev, echo.id]);
    recordStoryResult(before, next, { title: echo.title, choice: choice.text, text: choice.outcomeLog });
    setGameState(next);
  };

  const handlePerformAction = (actionId: string, bypassEndingClimaxModal = false) => {
    if (!production || !effectiveGameState) return;
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
    const res = production.engine.act(next, actionId);
    if (!res.ok) {
      if (soundEnabled) soundFx.warning();
      setActionToast(`ยังเลือกไม่ได้: ${res.reason}`);
      return;
    }
    next.carriedBloodBags = before.carriedBloodBags || 0;

    // System 1: Apply daily mutation regeneration & weather/zone-threat modifiers if day advanced
    let actionAttackToast: string | null = null;
    if ((next.day || 1) > (before.day || 1) && (next.stats?.hp || 0) > 0 && !next.ending) {
      const mutStage = getMutationStageInfo(next.stats?.mutation || 0);
      if (mutStage.dailyHpRegen > 0) {
        next.stats.hp = Math.min(100, (next.stats.hp || 0) + mutStage.dailyHpRegen);
      }
      const hazardRes = applyDailyWeatherAndZoneHazardTurn(next, before);
      if (hazardRes.attacked && hazardRes.scenario) {
        actionAttackToast = `⚠️ [ภัยพื้นที่ ${hazardRes.localThreat}/100 · โอกาสปะทะ ${hazardRes.chancePercent}%] ${hazardRes.scenario.title}: ${hazardRes.scenario.description} (สภาพร่าง -${hazardRes.scenario.hpLoss}${hazardRes.scenario.sanityLoss > 0 ? ` · สติ -${hazardRes.scenario.sanityLoss}` : ''})`;
      }
      if (next.stats.hp <= 0 && !next.ending) {
        next.pending = null;
        const inferredCauseCode =
          hazardRes?.attacked || actionId === 'raid'
            ? 'human_attack'
            : (next.stats.hunger >= 85 || (next.body?.starvationDays || 0) >= 2)
            ? 'starvation'
            : 'fatal_trauma';
        const derived = deriveDeathEndingPresentation(next, currentBio, { id: 'death', causeCode: inferredCauseCode });
        next.ending = {
          id: 'death',
          day: next.day,
          title: derived.title,
          text: derived.text,
          causeCode: derived.cause.code.toLowerCase(),
          causeOfDeath: derived.cause,
        };
      }
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
    recordStoryResult(before, next, {
      title: catalogAction?.name || (actionId.startsWith('move:') ? 'ออกเดินทาง' : 'การตัดสินใจของเจ้า'),
      text: actionId.startsWith('move:')
        ? 'เจ้าเดินทางมาถึง' + (production.catalog.PLACES[next.place]?.name || 'ย่านใหม่')
        : next.pending ? 'สถานการณ์ตรงหน้ารอให้เจ้าตัดสินใจ'
        : (next.log || []).find((entry: any) => entry.kind === 'routine' && entry.text !== catalogAction?.name && !(before.log || []).some((old: any) => storyLogKey(old) === storyLogKey(entry)))?.text || 'เจ้า' + (catalogAction?.name || 'ลงมือทำสิ่งที่เลือก'),
    });
    setGameState(next);
    setMobileTab('play');
  };

  const handleChoosePending = (choiceIndex: number) => {
    if (!production || !effectiveGameState || !effectiveGameState.pending) return;
    const before = structuredClone(effectiveGameState);
    const next = structuredClone(effectiveGameState);
    const event = production.catalog.EVENTS.find(entry => entry.id === next.pending.eventId);
    const chosen = event?.choices[choiceIndex];
    const res = production.engine.choose(next, choiceIndex, next.pending.instanceId);
    if (!res.ok) {
      if (soundEnabled) soundFx.warning();
      setActionToast(`เลือกไม่ได้: ${res.reason}`);
      return;
    }

    // System 1: Apply daily mutation regeneration & weather/zone-threat modifiers if day advanced
    if ((next.day || 1) > (before.day || 1) && (next.stats?.hp || 0) > 0 && !next.ending) {
      const mutStage = getMutationStageInfo(next.stats?.mutation || 0);
      if (mutStage.dailyHpRegen > 0) {
        next.stats.hp = Math.min(100, (next.stats.hp || 0) + mutStage.dailyHpRegen);
      }
      const hazardRes = applyDailyWeatherAndZoneHazardTurn(next, before);
      if (hazardRes.attacked && hazardRes.scenario) {
        if (soundEnabled) soundFx.warning();
      }
      if (next.stats.hp <= 0 && !next.ending) {
        next.pending = null;
        const inferredCauseCode =
          hazardRes?.attacked
            ? 'human_attack'
            : (next.stats.hunger >= 85 || (next.body?.starvationDays || 0) >= 2)
            ? 'starvation'
            : 'fatal_trauma';
        const derived = deriveDeathEndingPresentation(next, currentBio, { id: 'death', causeCode: inferredCauseCode });
        next.ending = {
          id: 'death',
          day: next.day,
          title: derived.title,
          text: derived.text,
          causeCode: derived.cause.code.toLowerCase(),
          causeOfDeath: derived.cause,
        };
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

    if (killedDiff > 0 || savedDiff > 0) {
      const nextZones = structuredClone(syncedZonePopulations);
      const z = nextZones[next.place || 'shelter'];
      if (z) {
        const living = z.npcs.filter(n => n.alive);
        if (killedDiff > 0) {
          if (z.unmetAnonymousSurvivors > 0) {
            z.unmetAnonymousSurvivors = Math.max(0, z.unmetAnonymousSurvivors - killedDiff);
          } else if (living.length > 0) {
            const victim = living[living.length - 1];
            victim.alive = false;
            victim.trust = 0;
          }
        }

        setZonePopulations(nextZones);
      }
    }

    if (soundEnabled) soundFx.success();
    recordStoryResult(before, next, {
      title: event?.title || 'การตัดสินใจของเจ้า',
      choice: chosen?.text,
      text: chosen?.outcomeText || '',
    });
    setGameState(next);
  };

  const handleExportSaveJson = () => {
    const payload = {
      version: 'after-zero-1.0-save-bundle',
      exportedAt: new Date().toISOString(),
      playerName,
      currentBioId,
      triggeredEchoIds,
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
    setActionToast('ส่งออกไฟล์เซฟ (.json) เรียบร้อยแล้ว');
  };

  const handleDownloadGameAsset = async (
    fileName: string,
    downloadName: string,
    mimeType: string
  ) => {
    try {
      setDownloadingFile(fileName);
      if (soundEnabled) soundFx.click();
      const res = await fetch(`./${fileName}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const typedBlob = new Blob([blob], { type: mimeType });
      const url = URL.createObjectURL(typedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setActionToast(`ดาวน์โหลด ${downloadName} ลงเครื่องเรียบร้อยแล้ว`);
    } catch {
      const a = document.createElement('a');
      a.href = `./${fileName}`;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleImportSaveJson = () => {
    if (!importJsonText.trim() || !production) return;
    try {
      const parsed = JSON.parse(importJsonText.trim());
      const rawState = parsed.gameState || parsed;
      const validated = production.engine.validate(rawState);
      const importedBio = resolveSavedCharacter(validated, parsed.currentBioId, currentBio);
      const importedZones=rawState.npcZones || parsed.zonePopulations || createInitialZonePopulations(validated.initialSeed||1);
      migrateSavedRelationships(validated,importedZones);
      validated.carriedBloodBags = Number(rawState.carriedBloodBags || 0);
      validated.characterProfile = snapshotCharacter(importedBio);
      validated.roamCooldowns = (rawState && typeof rawState.roamCooldowns === 'object' && rawState.roamCooldowns !== null && !Array.isArray(rawState.roamCooldowns)) ? rawState.roamCooldowns : {};
      validated.asokWreckDepletedParts = Array.isArray(rawState?.asokWreckDepletedParts) ? rawState.asokWreckDepletedParts.filter((p: any) => typeof p === 'string') : [];
      setCurrentBio(importedBio);
      setRouteGuidanceSession({runId: validated.runId, pinnedRouteId: null, dismissedRouteIds: []});
      setGameState(validated);
      setActiveLifeSimModal(validated.npcEncounter||null);
      setZonePopulations(importedZones);
      if (parsed.gameState) {
        if (Array.isArray(parsed.pastLives)) setPastLives(parsed.pastLives);
        if (Array.isArray(parsed.triggeredEchoIds)) setTriggeredEchoIds(parsed.triggeredEchoIds);
        // NPC snapshot and relationship history were validated before committing the import.
      }
      setShowImportBox(false);
      setImportJsonText('');
      if (soundEnabled) soundFx.success();
      setScreenStage('playing');
      setLatestStory(null);
      setActionToast('นำเข้าเซฟสำเร็จ! เล่นต่อจากจุดเดิมได้ทันที');
    } catch (err: any) {
      if (soundEnabled) soundFx.warning();
      setActionToast(`ไฟล์เซฟไม่ถูกต้อง: ${err?.message || 'ไม่สามารถอ่าน JSON ได้'}`);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    if (soundEnabled) soundFx.copy();
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  const catalogActions = useMemo(() => {
    if (!production) return [];
    return production.catalog.ACTIONS.map(a => ({
      ...a,
      layer: classifyActionLayer(a.id, a.move, a.ending),
    })).filter(a => {
      const matchesLayer = layerFilter === 'ALL' || a.layer.includes(layerFilter);
      const matchesSearch =
        !searchQuery ||
        a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.note && a.note.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesLayer && matchesSearch;
    });
  }, [production, layerFilter, searchQuery]);

  const catalogEvents = useMemo(() => {
    if (!production) return [];
    return production.catalog.EVENTS.map(e => ({
      ...e,
      layer: classifyEventLayer(e.id),
    })).filter(e => {
      const matchesLayer = layerFilter === 'ALL' || e.layer.includes(layerFilter);
      const matchesSearch =
        !searchQuery ||
        e.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.text.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLayer && matchesSearch;
    });
  }, [production, layerFilter, searchQuery]);


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
  const currentActiveLifeSimModal=rawActiveLifeSimModal&&gameState?prepareNpcModal(rawActiveLifeSimModal,gameState,syncedZonePopulations[rawActiveLifeSimModal.placeId]):null;

  const openStoryHistory = () => {
    setMobileTab('journal');
    setDesktopSideTab('journal');
    requestAnimationFrame(() => document.getElementById('life-story-history')?.scrollIntoView({ block: 'start' }));
  };
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
    const disabledReason = showNumericSpoilers
      ? (action.preview?.reason || '')
      : sanitizeNonSpoilerReason(action.preview?.reason || 'ยังไม่พร้อมทำกิจกรรมนี้');

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
        className={`story-action ${primary ? 'story-action-primary' : ''} ${action.id === pinnedActionId ? 'is-pinned' : ''} ${isLocked ? 'story-action-locked opacity-75' : ''}`}
        title={isLocked ? disabledReason : undefined}
      >
        <span className="story-action-title">
          {action.name}
          <ArrowRight size={16} aria-hidden="true" />
        </span>
        {action.id === pinnedActionId && <span className="route-pin-label">เป้าหมายที่ปักหมุด</span>}
        <span className="story-action-description">{action.description}</span>
        {isLocked && (
          <span className="story-action-description text-amber-300 font-medium">
            🔒 {disabledReason}
          </span>
        )}
      </button>
    );
  };

  return (
    <div data-ending={Boolean(appMode === 'game' && screenStage === 'playing' && rawViewModel?.ending)} data-mobile-tab={mobileTab} data-playing={appMode === 'game' && screenStage === 'playing'} className="game-shell min-h-screen bg-[#0c1310] text-slate-100 flex flex-col pb-16 lg:pb-0 selection:bg-lime-400 selection:text-slate-950">
      {/* STICKY COMPACT TOP HUD */}
      <header className="game-hud sticky top-0 z-30 bg-[#0c1310]/95 backdrop-blur-md border-b border-emerald-950/80 px-3 sm:px-6 py-2.5">
        <div className="max-w-[1380px] mx-auto flex flex-col gap-2">
          {/* Top Row: Brand, Timeline Date, Kill Count Badge, Mode Switcher & Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setAppMode('game');
                  setScreenStage('hub');
                }}
                className="text-sm sm:text-base font-extrabold tracking-tight text-lime-300 whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                AFTER ZERO <span className="text-xs font-mono text-emerald-400/90">1.0</span>
              </button>

              {rawViewModel && appMode === 'game' && screenStage === 'playing' && (
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
              <div className="hud-mode-switch flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setAppMode('game')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    appMode === 'game'
                      ? 'bg-lime-400 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ตัวเกม 1.0
                </button>
                <button
                  type="button"
                  onClick={() => setAppMode('studio')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 ${
                    appMode === 'studio'
                      ? 'bg-lime-400 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-3 h-3" />
                  <span className="hidden sm:inline">โค้ด & Prompt</span>
                  <span className="sm:hidden">โค้ด</span>
                </button>
              </div>

              {appMode === 'game' && screenStage !== 'login' && (
                <button
                  type="button"
                  onClick={() => setScreenStage('hub')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-200 flex items-center gap-1 transition-colors"
                  title="กลับหน้าเลือกเซฟ / สุ่มตัวละคร"
                >
                  <Shuffle className="w-3.5 h-3.5 text-lime-300" />
                  <span className="hidden sm:inline">หน้าเซฟ/สุ่มตัวละคร</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowDownloadGameModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-lime-400/15 hover:bg-lime-400/25 border border-lime-400/50 text-xs font-bold text-lime-300 flex items-center gap-1 transition-colors"
                title="ดาวน์โหลดเกมลงเครื่อง (Export ไฟล์ HTML พร้อมเล่น หรือ ZIP โปรเจกต์เต็ม)"
              >
                <Download className="w-3.5 h-3.5 text-lime-300 shrink-0" />
                <span className="hidden sm:inline">โหลดเกมลงเครื่อง</span>
                <span className="sm:hidden">โหลดเกม</span>
              </button>

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

          {appMode === 'game' && screenStage === 'playing' && rawViewModel && (
            <div className="mobile-dayline lg:hidden flex justify-between gap-3 text-xs">
              <span className="font-bold text-amber-200">วันที่ {rawViewModel.day} · {formatTimelineDate(rawViewModel.day)}</span>
              <span className="truncate text-emerald-200">{rawViewModel.place?.short}</span>
            </div>
          )}
          {/* Second Row (Only when actively playing): Always-Visible Compact Vital Statistics */}
          {appMode === 'game' && screenStage === 'playing' && rawViewModel && (
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
      </header>

      {/* =====================================================================
          STAGE 1: LOGIN SCREEN
         ===================================================================== */}
      {appMode === 'game' && screenStage === 'login' && (
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="max-w-md w-full rounded-2xl overflow-hidden bg-slate-900/95 border border-slate-800 shadow-2xl">
            <div className="relative">
              <canvas
                ref={loginCanvasRef}
                width={320}
                height={144}
                className="w-full h-44 object-cover block bg-[#14251f]"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-950/40 to-transparent" />
              <div className="absolute bottom-3 left-5 right-5">
                <div className="text-[11px] font-mono uppercase tracking-widest text-lime-300">
                  ZOMBIE LIFE & CONSCIOUSNESS SIMULATION · 1.0
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  AFTER ZERO
                </h1>
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="p-6 space-y-5">
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                เมื่อหัวใจหยุดเต้นแต่ความทรงจำยังไม่ดับลง — ตื่นขึ้นใน{' '}
                <strong className="text-amber-300">
                  เขตกักกันพิเศษกรุงเทพมหานคร วันที่ 15 ตุลาคม
                </strong>{' '}
                ก่อนที่กองทัพจะทิ้งระเบิดเพลิงปูพรมเผากรุงเทพฯ ในวันที่ 120 เลือกช่วยเหลือผู้คน พาคู่หูหนีพ้นเมือง หรือเปลี่ยนชะตาของตัวเองก่อนเวลาหมดลง
              </p>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-lime-300" />
                  <span>ลงชื่อเข้าใช้ (Player ID):</span>
                </label>
                <input
                  type="text"
                  value={loginInput}
                  onChange={e => setLoginInput(e.target.value)}
                  placeholder="กรอกชื่อผู้เล่น..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-lime-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-extrabold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <Play className="w-4 h-4 fill-current" />
                เข้าสู่เกม AFTER ZERO
              </button>

              <button
                type="button"
                onClick={() => setShowDownloadGameModal(true)}
                className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-lime-400/40 text-lime-300 font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                ดาวน์โหลดเกมลงเครื่อง (ไฟล์เล่นออฟไลน์ / ZIP โปรเจกต์)
              </button>
            </form>
          </div>
        </main>
      )}

      {/* =====================================================================
          STAGE 2: SAVE LOAD & CHARACTER ROLL HUB
         ===================================================================== */}
      {appMode === 'game' && screenStage === 'hub' && rawViewModel && gameState && (
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
                onClick={() => setShowDownloadGameModal(true)}
                className="px-3 py-2 rounded-xl bg-lime-400/15 hover:bg-lime-400/25 border border-lime-400/50 text-xs font-bold text-lime-300 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                ดาวน์โหลดตัวเกมลงเครื่อง (Export)
              </button>
              <button
                type="button"
                onClick={() => setScreenStage('login')}
                className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                สลับบัญชี
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CARD 1: LOAD EXISTING SAVE */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-300 font-bold">เซฟปัจจุบันในเครื่อง</span>
                  <span className="text-amber-300">{formatTimelineDate(rawViewModel.day)}</span>
                </div>
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
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (soundEnabled) soundFx.click();
                    setScreenStage('playing');
                  }}
                  className="w-full py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {gameState.ending ? 'ดูบทสรุปของเซฟนี้' : 'โหลดเซฟเล่นต่อทันที'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportSaveJson}
                    className="flex-1 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center justify-center gap-1.5"
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

                {showImportBox && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <textarea
                      value={importJsonText}
                      onChange={e => setImportJsonText(e.target.value)}
                      placeholder="วาง JSON ของไฟล์เซฟที่นี่..."
                      rows={3}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={handleImportSaveJson}
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
      {appMode === 'game' && screenStage === 'playing' && rawViewModel?.ending && gameState && (
        <EndingExperience state={effectiveGameState} ending={effectiveGameState.ending} bio={currentBio} zones={syncedZonePopulations} chronicle={endingChronicle} onNewLife={handleRollCharacterPreview} onHub={()=>setScreenStage('hub')} />
      )}
      {appMode === 'game' && screenStage === 'playing' && rawViewModel && !rawViewModel.ending && gameState && (
        <main className="flex-1 max-w-[1380px] w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
          {/* Consequence Feedback Toast (Fixed Floating) */}
          {actionToast && (
            <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] max-w-lg w-[92%] px-4 py-3 rounded-2xl bg-slate-900/95 border-2 border-lime-400 text-xs sm:text-sm text-lime-100 shadow-2xl flex items-center justify-between gap-3 animate-fade-in backdrop-blur-md">
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
                          ด่วน: {allActiveCityCrises[0].npc.name} ({allActiveCityCrises[0].placeName})
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
                          <span className="font-bold text-slate-100">{npc.name}</span>
                          <span className="text-slate-500">·</span>
                          <span
                            className={`font-mono text-[11px] ${
                              isCurrentZone ? 'text-lime-300 font-semibold' : 'text-slate-400'
                            }`}
                          >
                            {isCurrentZone ? `เขตนี้ (${placeName})` : placeName}
                          </span>
                          <span className="text-slate-500">·</span>
                          <span className="font-mono text-[11px] text-emerald-300">
                            ไว้ใจ {npc.trust}/100
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-200/90 leading-snug line-clamp-2">
                          {npc.crisisText}
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
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    width={320}
                    height={144}
                    className="w-full h-44 sm:h-56 object-cover block bg-[#14251f]"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent pointer-events-none" />

                  <div className="character-portrait">
                    <ZombiePortrait
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

                  {/* Bottom Location Title & Timeline Date */}
                  <div className="scene-caption absolute bottom-3 left-4 right-4 flex items-end justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-wider text-lime-300">
                        {formatTimelineDate(rawViewModel.day)} · {currentMutationStage.title}
                      </div>
                      <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">
                        {rawViewModel.place?.name}
                      </h1>
                      <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">
                        {rawViewModel.place?.description}
                      </p>
                    </div>
                  </div>
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

              <div className="mobile-story-feed">{storyFeed}</div>

              {/* CURRENT SITUATION & MUTATION STAGE AWAKENING (Compact on Mobile) */}
              <details className="current-situation p-2.5 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800/90 space-y-2">
                <summary className="flex flex-wrap items-center justify-between gap-1.5 text-xs text-slate-400 cursor-pointer">
                  <span className="font-semibold text-slate-300">
                    สภาพร่างและบรรยากาศ ▾
                    {(gameState.stats?.hunger || 0) >= 75 && <span className="ml-2 text-rose-300">หิวจัด</span>}
                    {(gameState.stats?.sanity ?? 100) <= 35 && <span className="ml-2 text-amber-300">สติพร่าเลือน</span>}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-sky-500/30 text-sky-200">
                      {currentWeatherAndHazard.weatherBadge}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded bg-slate-950 border ${
                        currentWeatherAndHazard.localThreat >= 60
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
                </summary>
                <p className="text-xs sm:text-sm text-slate-200 leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-none">
                  {rawViewModel.situation?.Hook || currentBio.preDeathDetail}
                </p>

                {(gameState.stats?.hunger || 0) >= 75 && (
                  <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-500/50 text-[11px] sm:text-xs text-rose-200 leading-snug">
                    <strong>ความหิวบีบคั้นหนัก:</strong> กลิ่นเลือดคนเป็นทำให้ขากรรไกรสั่นเกร็ง สายตาเผลอจ้องเส้นเลือดที่ลำคอของผู้รอดชีวิตโดยไม่รู้ตัว
                  </div>
                )}
                {(gameState.stats?.sanity ?? 100) <= 35 && (
                  <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/50 text-[11px] sm:text-xs text-amber-200 leading-snug">
                    <strong>สติพร่าเลือน:</strong> ถ้อยคำในหัวแตกสลายเป็นเสียงครางต่ำในลำคอ
                    {(gameState.stats?.sanity ?? 100) < 30
                      ? ' · มือสั่นเกร็งจนไม่อาจใช้อุปกรณ์ซับซ้อนหรือเจรจาต่อรองได้'
                      : ''}
                  </div>
                )}

                <details className="mutation-details rounded-lg bg-slate-950/80 border border-slate-800/80 px-2.5 py-1.5 text-xs text-slate-300">
                  <summary className="cursor-pointer text-[11px] sm:text-xs text-slate-300 flex items-center justify-between gap-2 select-none">
                    <span>
                      สภาพอากาศ ({currentWeatherAndHazard.weatherBadge}) · {currentMutationStage.title}
                    </span>
                    <span className="text-[10px] font-mono text-lime-300/90 shrink-0">
                      ดูรายละเอียด
                    </span>
                  </summary>
                  <div className="pt-2 mt-1.5 border-t border-slate-800/80 space-y-1.5 text-[11px] leading-relaxed">
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
                    <div className="pt-1 border-t border-slate-900">
                      <strong className="text-purple-300">{currentMutationStage.title}:</strong>{' '}
                      <span>{currentMutationStage.abilityText}</span>{' '}
                      <span className="text-amber-200/80">({currentMutationStage.sideEffectText})</span>
                    </div>
                  </div>
                </details>
              </details>

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
                  <button type="button" onClick={() => {
                    if (!currentZonePop?.npcs.some(npc => npc.alive)) {
                      if (soundEnabled) soundFx.warning();
                      setActionToast('ไม่มีผู้รอดชีวิตที่ยังมีชีวิตอยู่ในเขตนี้แล้ว');
                    } else {
                      handleOpenFreeformNpcModal();
                    }
                  }} className={`story-action ${!currentZonePop?.npcs.some(npc => npc.alive) ? 'opacity-70' : ''}`}>
                    <span className="story-action-title"><Users size={18} aria-hidden="true" /> พบผู้รอดชีวิต <ArrowRight size={16} aria-hidden="true" /></span>
                    <span className="story-action-description">พูดคุย ช่วยเหลือ แบ่งของ หรือล่า · ผู้คน {currentZoneTrustStats.livingCount} คน</span>
                    {!currentZonePop?.npcs.some(npc => npc.alive) && (
                      <span className="story-action-description text-amber-300 font-medium">🔒 ไม่มีผู้รอดชีวิตเหลืออยู่ในเขตนี้</span>
                    )}
                  </button>
                  <button type="button" onClick={handleOpenFreeformRoamModal} className="story-action">
                    <span className="story-action-title"><Search size={18} aria-hidden="true" /> สำรวจบริเวณนี้ <ArrowRight size={16} aria-hidden="true" /></span>
                    <span className="story-action-description">ค้นหาของประทังชีวิตและร่องรอยในย่านนี้</span>
                  </button>
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
                      {careActionsList.map(action => {
                        const isLocked = !action.preview?.enabled;
                        const reason = showNumericSpoilers
                          ? (action.preview?.reason || '')
                          : sanitizeNonSpoilerReason(action.preview?.reason || 'ยังไม่พร้อมทำกิจกรรมนี้');
                        return (
                          <button
                            key={action.id}
                            type="button"
                            onClick={() => {
                              if (isLocked) {
                                if (soundEnabled) soundFx.warning();
                                setActionToast(`ยังทำไม่ได้: ${reason}`);
                              } else {
                                handlePerformAction(action.id);
                              }
                            }}
                            className={`story-action ${isLocked ? 'opacity-70' : ''}`}
                          >
                            <span className="story-action-title">{action.name}</span>
                            <span className="story-action-description">{action.description}</span>
                            {isLocked && (
                              <span className="story-action-description text-amber-300 font-medium">🔒 {reason}</span>
                            )}
                          </button>
                        );
                      })}
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
                        className={`story-action ${(gameState.carriedBloodBags || 0) <= 0 ? 'opacity-70' : ''}`}
                      >
                        <span className="story-action-title"><Droplets size={16} aria-hidden="true" /> ดื่มถุงเลือด</span>
                        <span className="story-action-description">{gameState.carriedBloodBags > 0 ? `ดื่มจากถุงเลือดที่พกไว้ (${gameState.carriedBloodBags} ถุง) · ไม่ใช้วัน` : 'ต้องมีถุงเลือดพกพาก่อน'}</span>
                      </button>
                    </div>
                  </div>
                </section>
                <button type="button" className="travel-map-action" onClick={() => { setMobileTab('map'); setDesktopSideTab('map'); }}>
                  <MapPin size={18} aria-hidden="true" /> เปิดแผนที่เดินทาง <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
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
                    ['people', `ผู้คน (${currentZoneTrustStats.livingCount})`, Users],
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
                <PixelCityMap places={mapPlaces} pinnedPlaceId={pinnedPlaceId} onTravel={id => handlePerformAction('move:' + id)} />
              )}

              {/* PANEL 2: BAG (CARRIED ITEMS ONLY + SIGNATURE ITEM) & BODY / MUTATION STAGE STATS */}
              {(mobileTab === 'bag' || (mobileTab === 'play' && desktopSideTab === 'bag')) && (
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-6">
                  {/* SECTION A: CARRIED INVENTORY ONLY */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <Package className="w-4 h-4 text-lime-300" />
                        <span>กระเป๋า (เฉพาะสิ่งที่พกอยู่บนตัวเท่านั้น)</span>
                      </h3>
                      <span className="text-xs font-mono text-slate-400">
                        {carriedInventoryItems.length} รายการ
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {carriedInventoryItems.map(item => (
                        <div
                          key={item.id}
                          className={`p-3.5 rounded-xl bg-slate-950 border ${item.accent} flex flex-col gap-1.5`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                              {item.isSignature && (
                                <Briefcase className="w-3.5 h-3.5 text-lime-300 shrink-0" />
                              )}
                              {item.name}
                            </span>
                            <span className="text-xs font-mono font-extrabold text-lime-300 shrink-0">
                              {item.isSignature ? item.unit : `${item.count} ${item.unit}`}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {item.desc}
                          </p>
                          {item.canUseDirectly && !gameState.ending && (
                            <button
                              type="button"
                              onClick={handleDrinkCarriedBloodBag}
                              className="mt-1 py-2 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/50 text-xs font-bold text-rose-200 flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Droplets className="w-3.5 h-3.5 text-rose-400" />
                              {item.useLabel}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SECTION B: ZOMBIE PHYSIOLOGY, MUTATION STAGE & KILL COUNT */}
                  <div className="space-y-3 pt-4 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <Dna className="w-4 h-4 text-purple-300" />
                        <span>สภาพร่าง ระยะการกลายพันธุ์ & ประวัติการล่า</span>
                      </h3>
                      <span className="text-xs font-mono font-bold text-rose-300">
                        ฆ่าคน: {currentKillCount} ศพ
                      </span>
                    </div>

                    {/* System 1: Active Mutation Stage Card + Visual Anatomy Portrait */}
                    <div className={`p-3.5 rounded-xl border space-y-3 ${currentMutationStage.accentColor}`}>
                      <div className="flex items-start gap-3.5">
                        <div className="w-20 shrink-0 p-1.5 rounded-xl bg-slate-950/90 border border-slate-800">
                          <ZombiePortrait
                            bio={currentBio}
                            mutation={Math.floor(gameState.stats?.mutation || 0)}
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span>{currentMutationStage.title}</span>
                            <span className="font-mono">{currentMutationStage.rangeLabel}</span>
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed">
                            <strong>ความสามารถของร่าง:</strong> {currentMutationStage.abilityText}
                          </p>
                          <p className="text-xs text-amber-200/90 leading-relaxed">
                            <strong>อาการข้างเคียง:</strong> {currentMutationStage.sideEffectText}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-1.5 text-[11px]">
                        {[
                          {
                            th: 25,
                            label: 'ขั้น 2 (25%+): ตาแดงเรืองแสง & เขี้ยวงอก',
                          },
                          {
                            th: 50,
                            label: 'ขั้น 3 (50%+): ร่างขยายสูง & กรงเล็บกระดูก',
                          },
                          {
                            th: 75,
                            label: 'ขั้น 4 (75%+): แขนขา/ระยางค์ชีวภาพงอกเพิ่ม',
                          },
                        ].map(item => {
                          const unlocked = (gameState.stats?.mutation || 0) >= item.th;
                          return (
                            <div
                              key={item.th}
                              className={`px-2 py-1 rounded border font-mono ${
                                unlocked
                                  ? 'bg-purple-950/60 border-purple-400/50 text-purple-200'
                                  : 'bg-slate-950/50 border-slate-800 text-slate-500'
                              }`}
                            >
                              {unlocked ? '✓ ' : '○ '}
                              {item.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      {[
                        {
                          label: 'การกลายพันธุ์ (Mutation)',
                          value: Math.floor(gameState.stats?.mutation || 0),
                          max: 100,
                          color: 'bg-purple-400',
                          desc: 'ระดับการเปลี่ยนแปลงของเซลล์และเนื้อเยื่อซอมบี้',
                        },
                        {
                          label: 'ความเป็นมนุษย์ / ความเห็นใจ',
                          value: currentHumanity,
                          max: 100,
                          color: 'bg-emerald-400',
                          desc: `ลดลงทุกครั้งที่ฆ่าคน (ปัจจุบันฆ่าไปแล้ว ${currentKillCount} ศพ)`,
                        },
                        {
                          label: 'ความเข้าใจเชื้อ / งานวิจัย',
                          value: Math.floor(gameState.stats?.research || 0),
                          max: 100,
                          color: 'bg-teal-400',
                          desc: 'ความเข้าใจต่อโครงสร้างไวรัสและสูตรเซรุ่ม',
                        },
                        {
                          label: 'อำนาจสั่งการฝูง (Horde)',
                          value: Math.floor(gameState.stats?.horde || 0),
                          max: 100,
                          color: 'bg-amber-400',
                          desc: 'คลื่นความถี่และอิทธิพลเหนือผู้ติดเชื้อรอบข้าง',
                        },
                      ].map(st => (
                        <div
                          key={st.label}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200">{st.label}</span>
                            <span className="font-mono font-bold text-lime-300">
                              {st.value}/{st.max}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${st.color}`}
                              style={{ width: `${Math.min(100, Math.max(0, st.value))}%` }}
                            />
                          </div>
                          <div className="text-[11px] text-slate-500">{st.desc}</div>
                        </div>
                      ))}
                    </div>

                    {/* Pre-Death Character Dossier Details */}
                    <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono text-lime-300">
                        <span>ภูมิหลังของร่างนี้</span>
                        <span>
                          กลายพันธุ์มาแล้ว ~{currentBio.daysInfectedEstimate + (rawViewModel.day - 1)} วัน
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-100">
                        อดีตก่อนตาย: อายุ {currentBio.age} ปี · เพศ{currentBio.gender} · {currentBio.occupation}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {currentBio.preDeathDetail}
                      </p>
                      <p className="text-xs text-amber-200/90 leading-relaxed">
                        {currentBio.autopsyObservation}
                      </p>
                    </div>
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

              {/* PANEL 3: PER-NPC TRUST, LIVING NPC CRISES & ZONE POPULATION BREAKDOWN */}
              {(mobileTab === 'people' ||
                (mobileTab === 'play' && desktopSideTab === 'people')) && (
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <Users className="w-4 h-4 text-lime-300" />
                        <span>ผู้คนใน{rawViewModel.place?.name}</span>
                      </h3>
                      <span className="text-xs font-mono text-emerald-300 font-bold">
                        ประชากร {currentZoneTrustStats.livingCount} คน
                      </span>
                    </div>

                    {/* Zone Average Trust Formula Explanation Card */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-semibold">
                          ค่าความไว้ใจเฉลี่ยของพื้นที่นี้:
                        </span>
                        <span className="font-mono font-extrabold text-sm text-emerald-300">
                          {currentZoneTrustStats.averageTrust} / 100
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(0, currentZoneTrustStats.averageTrust))}%`,
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">
                        คิดจากผลรวมความไว้ใจรายบุคคล ({currentZoneTrustStats.totalSumTrust} คะแนน) ÷ จำนวนคนที่ยังมีชีวิตในพื้นที่ ({currentZoneTrustStats.livingCount} คน)
                      </p>
                    </div>
                  </div>

                  {/* Collapsible Compact Scrollable Vertical List for Active Crises in Current Zone */}
                  {activeZoneCrises.length > 0 && (
                    <div className="rounded-xl bg-slate-950 border border-amber-500/40 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setIsPeopleCrisisSectionExpanded(prev => !prev)}
                        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-900/80 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-xs font-bold text-amber-200 truncate">
                            ผู้รอดชีวิตที่กำลังเผชิญวิกฤตในเขตนี้ ({activeZoneCrises.length} คน)
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1 shrink-0">
                          <span>{isPeopleCrisisSectionExpanded ? 'ย่อเก็บ' : 'ขยายดู'}</span>
                          {isPeopleCrisisSectionExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </span>
                      </button>

                      {isPeopleCrisisSectionExpanded && (
                        <div className="max-h-40 overflow-y-auto overscroll-contain divide-y divide-slate-800/80 border-t border-slate-800 px-3 py-1">
                          {activeZoneCrises.map(npc => (
                            <div
                              key={`crisis-compact-${npc.id}`}
                              className="py-2 flex items-start justify-between gap-2.5 text-xs"
                            >
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-100">
                                    {npc.name} (วัย {npc.age} ปี)
                                  </span>
                                  <span className="text-slate-500">·</span>
                                  <span className="font-mono text-[11px] text-emerald-300">
                                    {relationshipTier(npc.trust).label} · {npc.trust}/100
                                  </span>
                                </div>
                                <p className="text-[11px] text-amber-200/90 leading-snug line-clamp-2">
                                  {npc.crisisText}
                                </p>
                              </div>
                              {!gameState.ending && !gameState.pending && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenFreeformNpcModal(npc.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] shrink-0 transition-colors"
                                >
                                  เข้าช่วย
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* List of Individual NPCs in Current Zone (Scrollable on Mobile) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">
                        รายชื่อ NPC ในพื้นที่ ({currentZonePop?.npcs.length || 0} คนที่ระบุตัวตนได้ + คนอื่นๆ อีก {currentZonePop?.unmetAnonymousSurvivors || 0} คน)
                      </span>
                    </div>

                    <div className="max-h-[420px] sm:max-h-[540px] overflow-y-auto overscroll-contain pr-1 space-y-2.5">
                      {currentZonePop?.npcs.map(npc => {
                        const hasCrisis = Boolean(
                          npc.alive &&
                            !npc.crisisResolved &&
                            npc.crisisDay &&
                            (gameState.day || 1) >= npc.crisisDay
                        );
                        const isCardCrisisOpen = Boolean(expandedNpcCardCrisisIds[npc.id]);
                        return (
                          <div
                            key={npc.id}
                            className={`p-3 rounded-xl border space-y-2 ${
                              !npc.alive
                                ? 'bg-rose-950/20 border-rose-900/50 opacity-60'
                                : hasCrisis
                                ? 'bg-amber-950/25 border-amber-400/60'
                                : npc.trust >= 50
                                ? 'bg-emerald-950/25 border-emerald-500/40'
                                : 'bg-slate-950 border-slate-800'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center flex-wrap gap-1.5">
                                  <span className="text-sm font-bold text-slate-100">
                                    {npc.name} (วัย {npc.age} ปี)
                                  </span>
                                  {npc.isStoryNpc && (
                                    <span className="text-[11px] font-mono text-lime-300">
                                      · ตัวละครหลัก
                                    </span>
                                  )}
                                  {hasCrisis && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedNpcCardCrisisIds(prev => ({
                                          ...prev,
                                          [npc.id]: !prev[npc.id],
                                        }))
                                      }
                                      className="text-[11px] font-mono text-amber-300 hover:text-amber-200 underline underline-offset-2 flex items-center gap-0.5"
                                    >
                                      <span>· วิกฤตด่วน ({isCardCrisisOpen ? 'ซ่อน' : 'ดูอาการ'})</span>
                                    </button>
                                  )}
                                </div>
                                <div className="text-xs text-slate-400 truncate">
                                  {npc.role} · {npc.trait}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                {!npc.alive ? (
                                  <span className="text-xs font-mono text-rose-400 font-bold">
                                    เสียชีวิตแล้ว
                                  </span>
                                ) : (
                                  <span className="text-xs font-mono tabular-nums font-bold text-emerald-300">
                                    ไว้ใจ {npc.trust}/100
                                  </span>
                                )}
                              </div>
                            </div>

                            {npc.alive && (
                              <>
                                {hasCrisis && isCardCrisisOpen && (
                                  <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200 leading-relaxed">
                                    <strong>สถานการณ์ด่วน:</strong> {npc.crisisText}
                                  </div>
                                )}
                                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-400"
                                    style={{ width: `${Math.min(100, Math.max(0, npc.trust))}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between gap-2 pt-0.5">
                                  <span className="text-[11px] text-slate-400 truncate">
                                    {hasCrisis && !isCardCrisisOpen
                                      ? `วิกฤต: ${npc.crisisText}`
                                      : npc.lastNote}
                                  </span>
                                  {!gameState.ending && !gameState.pending && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenFreeformNpcModal(npc.id)}
                                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold shrink-0 transition-colors ${
                                        hasCrisis
                                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/40 text-emerald-200'
                                      }`}
                                    >
                                      {hasCrisis
                                        ? `เข้าช่วย ${npc.name} (1 วัน)`
                                        : `เข้าหา ${npc.name} (1 วัน)`}
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* PANEL 4: JOURNAL, PROGRESSION TRACKER, SOUNDSCAPE, SAVE/EXPORT/IMPORT & SURRENDER */}
              {(mobileTab === 'journal' ||
                (mobileTab === 'play' && desktopSideTab === 'journal')) && (
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5">
                  {/* SECTION 1: NON-SPOILERY ROUTE & HORIZON CHECKLIST (PROGRESSION TRACKER) */}
                  {showRouteHints && <div data-route-checklist className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-lime-300" />
                        <span>สมุดบันทึกเบาะแสเส้นทางสู่อนาคต (Route Checklist)</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileTab('map');
                          setDesktopSideTab('map');
                        }}
                        className="text-xs font-semibold text-lime-300 hover:text-lime-200 underline underline-offset-2"
                      >
                        เปิดแผนที่เดินทาง
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
                  </div>}

                  {/* SECTION 1.5: AMBIENT SOUNDSCAPE CONTROLS */}
                  <div className="space-y-2.5 pt-3 border-t border-slate-800">
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
                            : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
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
                        className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300"
                      >
                        ทดสอบเสียงไซเรนไกล ๆ
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!soundEnabled) setSoundEnabled(true);
                          soundFx.playRadioStaticBurst();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300"
                      >
                        ทดสอบคลื่นวิทยุซ่า ๆ
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!soundEnabled) setSoundEnabled(true);
                          soundFx.playHeartbeatPulse();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300"
                      >
                        ทดสอบเสียงหัวใจเต้น
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-lime-300" />
                      <span>ระบบเซฟ ส่งออก/นำเข้า & ยอมแพ้ต่อสัญชาตญาณ</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      บันทึกอัตโนมัติลงเบราว์เซอร์ทุกการตัดสินใจ สามารถส่งออกไฟล์เซฟเก็บไว้หรือเลือกยอมจำนนต่อสัญชาตญาณซอมบี้ได้ที่หน้านี้
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleExportSaveJson}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-lime-300" />
                        ส่งออกเซฟ (.json)
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowImportBox(!showImportBox)}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-sky-300" />
                        นำเข้าเซฟ (.json)
                      </button>
                    </div>

                    {showImportBox && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <textarea
                          value={importJsonText}
                          onChange={e => setImportJsonText(e.target.value)}
                          placeholder="วางโค้ด JSON จากไฟล์เซฟที่นี่..."
                          rows={4}
                          className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-lime-400"
                        />
                        <button
                          type="button"
                          onClick={handleImportSaveJson}
                          className="px-4 py-2 rounded-lg bg-lime-400 text-slate-950 font-bold text-xs"
                        >
                          ยืนยันการนำเข้าเซฟ
                        </button>
                      </div>
                    )}

                    {/* Surrender to Zombie Instinct Button (Placed right here on the Save page!) */}
                    {!gameState.ending && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setShowSurrenderConfirmModal(true)}
                          className="w-full py-3 px-4 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/50 text-xs font-bold text-rose-200 transition-colors flex items-center justify-center gap-2"
                        >
                          <Skull className="w-4 h-4 text-rose-400" />
                          ยอมแพ้ต่อสัญชาตญาณซอมบี้ (สติถูกกลืนกินจนหมด)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Distinct Mutation Milestones Section */}
                  {recordedMutationMilestones.length > 0 && (
                    <div className="space-y-2.5 pt-3 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                          <Dna className="w-4 h-4 text-purple-400" />
                          ประวัติการกลายพันธุ์ระดับสำคัญ (Mutation Milestones)
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {recordedMutationMilestones.length}/3 ขั้น
                        </span>
                      </div>
                      <div className="space-y-2">
                        {([25, 50, 75] as const).map(th => {
                          const reached = recordedMutationMilestones.includes(th);
                          const meta = MUTATION_MILESTONES[th];
                          if (!meta) return null;
                          return (
                            <div
                              key={th}
                              className={`p-3 rounded-xl border text-xs transition-all ${
                                reached
                                  ? `${meta.badgeColor} shadow-sm`
                                  : 'bg-slate-950/40 border-slate-800/60 text-slate-500 opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span>{meta.title}</span>
                                <span className="font-mono text-[11px]">
                                  {reached ? 'ปลดล็อกแล้ว' : `ยังไม่ถึง (${th}%)`}
                                </span>
                              </div>
                              <p className="mt-1 text-slate-300 leading-relaxed">
                                {reached ? meta.awakeningText : meta.bodyChange}
                              </p>
                              {reached && (
                                <div className="mt-1.5 text-[11px] text-slate-400 italic">
                                  การเปลี่ยนแปลงทางกายภาพ: {meta.bodyChange}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recent Life Log */}
                  <div id="life-story-history" className="scroll-mt-40">
                    <StoryFeed fullHistory log={gameState?.log || []}
                      latest={latestStory?.runId === gameState?.runId ? latestStory : null}
                      formatEffect={formatStoryEffect} onHistory={openStoryHistory} />
                  </div>

                  {/* Deep Hidden Option: Toggle Numeric Action Spoilers vs Roleplay Narrative Hints */}
                  <details data-advanced-settings className="pt-2 border-t border-slate-800/40 text-[11px] text-slate-500">
                    <summary className="cursor-pointer py-1 hover:text-slate-400 select-none">
                      ปรับแต่งขั้นสูง
                    </summary>
                    <label className="route-setting">
                      <span><strong>แสดงเบาะแสและเงื่อนไขเส้นทาง</strong><small>เปิดคู่มือเตรียมเส้นทางและเบาะแสบทจบล่วงหน้า · ปิดไว้เพื่อค้นพบด้วยตัวเอง</small></span>
                      <input type="checkbox" role="switch" aria-checked={showRouteHints} data-setting="route-hints" checked={showRouteHints} onChange={event => setShowRouteHints(event.target.checked)} />
                    </label>
                    <label className="route-setting">
                      <span><strong>ช่วยแนะนำและปักหมุดเส้นทางช่วงท้าย</strong><small>เสนอให้ติดตามงานเมื่อเตรียมเส้นทางมาไกลแล้ว · ไม่เปิดคู่มือเฉลย</small></span>
                      <input type="checkbox" role="switch" aria-checked={routeAssistanceEnabled} data-setting="route-assistance" checked={routeAssistanceEnabled} onChange={event => {
                        setRouteAssistanceEnabled(event.target.checked);
                        if (!event.target.checked) setRouteGuidanceSession({runId: gameState?.runId || '', pinnedRouteId: null, dismissedRouteIds: []});
                      }} />
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
                  </details>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {appMode === 'game' && screenStage === 'playing' && !rawViewModel?.ending && (
        <nav aria-label="เมนูเกม" className="mobile-nav lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0c1310]/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-5 px-1 py-1.5">
          {(
            [
              ['play', 'กิจกรรมวันนี้', Sparkles],
              ['map', 'แผนที่', MapPin],
              ['bag', 'กระเป๋า/ร่าง', Package],
              [
                'people',
                activeZoneCrises.length > 0
                  ? `ผู้คน (${currentZoneTrustStats.livingCount}·!${activeZoneCrises.length})`
                  : `ผู้คน (${currentZoneTrustStats.livingCount})`,
                Users,
              ],
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
              className={`relative flex flex-col items-center justify-center py-1 rounded-lg text-[11px] font-medium transition-colors ${
                mobileTab === id
                  ? 'text-lime-300 bg-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              {id === 'map' && mapNotificationCount > 0 && <span className={`map-tab-notice ${mapHasUrgentNews ? 'has-urgent-news' : ''}`} aria-label={`${mapNotificationCount} ย่านมีเรื่องพิเศษ`}>{mapNotificationCount}</span>}
              <span className="truncate max-w-full px-0.5">{label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* =====================================================================
          BLOCKING POPUP MODAL 1: PENDING ENGINE EVENT
         ===================================================================== */}
      {appMode === 'game' &&
        screenStage === 'playing' &&
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
                {rawViewModel.pending.text}
              </p>

              <div className="space-y-2.5 pt-2">
                {rawViewModel.pending.choices.map((c: any) => {
                  const isLocked = !c.preview?.enabled;
                  const reason = c.preview?.reason || 'ยังไม่พร้อมสำหรับตัวเลือกนี้';
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
      {appMode === 'game' &&
        screenStage === 'playing' &&
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
                {currentActiveLifeSimModal.text}
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
          BLOCKING POPUP MODAL: MUTATION MILESTONE AWAKENING ALERT (25, 50, 75)
         ===================================================================== */}
      {appMode === 'game' &&
        screenStage === 'playing' &&
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
      {appMode === 'game' &&
        screenStage === 'playing' &&
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

      {/* =====================================================================
          POPUP MODAL 6: DOWNLOAD / EXPORT GAME TO LOCAL MACHINE
         ===================================================================== */}
      {showDownloadGameModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="game-dialog fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="max-w-lg w-full p-6 rounded-2xl bg-slate-900 border-2 border-lime-400/70 space-y-5 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-lime-300 font-extrabold text-base">
                <Download className="w-5 h-5" />
                <span>ดาวน์โหลดเกมลงเครื่อง (Export Game)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDownloadGameModal(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800"
              >
                ปิดหน้าต่าง
              </button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              {/* OPTION 1: STANDALONE PLAYABLE SINGLE HTML FILE */}
              <div className="p-4 rounded-xl bg-slate-950 border border-lime-400/50 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-lime-300 text-sm">
                    1. ไฟล์เกมพร้อมเล่นทันที (แนะนำ · เปิดเล่นออฟไลน์ได้เลย)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-lime-400/15 text-lime-300 font-mono text-[11px]">
                    .HTML ไฟล์เดียวจบ
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  รวมตัวเกม เอนจิน และกราฟิกทั้งหมดไว้ในไฟล์เดียว ดาวน์โหลดเสร็จแล้ว{' '}
                  <strong className="text-white">
                    ดับเบิลคลิกเปิดในเบราว์เซอร์ (Chrome / Edge / Safari) เล่นบนเครื่องได้ทันที
                  </strong>{' '}
                  โดยไม่ต้องติดตั้งโปรแกรมหรือรันเซิร์ฟเวอร์ใดๆ
                </p>
                <button
                  type="button"
                  disabled={downloadingFile !== null}
                  onClick={() =>
                    handleDownloadGameAsset(
                      'after-zero-bangkok-standalone.html',
                      'AFTER-ZERO-Bangkok-Playable.html',
                      'text/html;charset=utf-8'
                    )
                  }
                  className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 disabled:opacity-60 text-slate-950 font-extrabold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  {downloadingFile === 'after-zero-bangkok-standalone.html'
                    ? 'กำลังเตรียมไฟล์ดาวน์โหลด...'
                    : 'ดาวน์โหลดไฟล์เกมพร้อมเล่น (.HTML)'}
                </button>
              </div>

              {/* OPTION 2: FULL PROJECT SOURCE + DIST ZIP */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-sky-300 text-sm">
                    2. ไฟล์โปรเจกต์เต็ม + โค้ดต้นฉบับ (สำหรับแก้โค้ด / ขึ้น GitHub)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky-400/15 text-sky-300 font-mono text-[11px]">
                    .ZIP ทั้งโปรเจกต์
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  รวมซอร์สโค้ดทั้งหมด (<code className="text-amber-200">src/</code>,{' '}
                  <code className="text-amber-200">public/</code>,{' '}
                  <code className="text-amber-200">package.json</code>, GitHub Actions) และโฟลเดอร์{' '}
                  <code className="text-amber-200">dist/</code> ที่ Build แล้ว สำหรับนำไปแตกไฟล์ลงเครื่องหรืออัปโหลดขึ้น GitHub
                </p>
                <button
                  type="button"
                  disabled={downloadingFile !== null}
                  onClick={() =>
                    handleDownloadGameAsset(
                      'after-zero-bangkok-project.zip',
                      'after-zero-bangkok-project.zip',
                      'application/zip'
                    )
                  }
                  className="w-full py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 disabled:opacity-60 text-slate-950 font-extrabold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {downloadingFile === 'after-zero-bangkok-project.zip'
                    ? 'กำลังเตรียมไฟล์ ZIP...'
                    : 'ดาวน์โหลดโปรเจกต์เต็ม (.ZIP)'}
                </button>
              </div>

              {/* OPTION 3: SAVE FILE JSON */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-300">
                  <div className="font-bold text-slate-200">สำรองเฉพาะไฟล์เซฟปัจจุบัน (.JSON)</div>
                  <div className="text-[11px] text-slate-400">
                    ใช้สำหรับนำเข้าเซฟกลับเข้ามาเล่นต่อในภายหลัง
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportSaveJson}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs shrink-0 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-lime-300" />
                  เซฟ (.json)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODE 2: DEV STUDIO
         ===================================================================== */}
      {appMode === 'studio' && (
        <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ['ai-pack', 'Prompt & โครงสร้างอีเวนต์ (แจกงาน AI ตัวอื่น)'],

                  ['inspector', 'ฐานข้อมูลกิจกรรมและเหตุการณ์ปัจจุบัน'],
                  ['patches', 'ตั้งค่าระบบ'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStudioTab(id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    studioTab === id
                      ? 'bg-lime-400 text-slate-950'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>


          </div>

          {studioTab === 'ai-pack' && (
            <section className="space-y-6">
              <div className="p-6 rounded-2xl bg-slate-900 border border-lime-500/40 space-y-3">
                <h2 className="text-lg sm:text-xl font-extrabold text-lime-300">
                  ระบบแยกส่วนอีเวนต์ (Modular Event Architecture) & Prompt สำหรับให้ AI ตัวอื่นช่วยแต่ง
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  คุณสามารถก๊อปปี้ Prompt ด้านล่างไปวางให้ ChatGPT, Claude หรือ Gemini ตัวอื่นช่วยแต่ง{' '}
                  <strong className="text-white">
                    (1) อีเวนต์สำรวจกรุงเทพฯ, (2) อีเวนต์จุดทริกเกอร์ฉากจบ (Ending Climax Triggers), หรือ (3) ตัวละคร NPC ผู้รอดชีวิตรายบุคคล
                  </strong>{' '}
                  แล้วนำโค้ด JSON/TypeScript ที่ได้กลับมาส่งให้ผมรวบรวมเข้าไฟล์{' '}
                  <code className="text-amber-300 font-mono">src/data/externalEventsPack.ts</code> ได้ทันที!
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="font-mono text-sky-300 font-bold">
                      1. ผู้รอดชีวิตกรุงเทพฯ (NPC Pack):
                    </div>
                    <div className="text-slate-300 mt-1">
                      รวมแล้ว +{EXTERNAL_AI_NPCS.length} คน (กระจายครบ 5 เขต พร้อมวิกฤตวันที่ 5–38)
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="font-mono text-emerald-300 font-bold">
                      2. อีเวนต์สำรวจกรุงเทพฯ (Roam Pack):
                    </div>
                    <div className="text-slate-300 mt-1">
                      รวมแล้ว {EXTERNAL_AI_ROAM_EVENTS.length} เหตุการณ์ใน{' '}
                      <code className="font-mono">EXTERNAL_AI_ROAM_EVENTS</code>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="font-mono text-amber-300 font-bold">
                      3. ทริกเกอร์ฉากจบอัตโนมัติ (Climax Pack):
                    </div>
                    <div className="text-slate-300 mt-1">
                      รวมแล้ว {ORGANIC_ENDING_CLIMAX_EVENTS.length} สายฉากจบ (เด้งขึ้นเองจากผลการกระทำ 100%)
                    </div>
                  </div>
                </div>
              </div>

              {AI_COLLABORATION_PROMPTS.map(item => (
                <div
                  key={item.id}
                  className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-white">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.id, item.promptText)}
                      className="px-4 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shrink-0"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          คัดลอก Prompt นี้แล้ว!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          คัดลอก Prompt ไปให้ AI ตัวอื่น
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                    {item.promptText}
                  </pre>
                </div>
              ))}
            </section>
          )}

          {studioTab === 'inspector' && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="ค้นหา Action หรือ Event..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100"
                  />
                </div>
                {['ALL', 'พื้นฐาน', 'เนื้อเรื่อง', 'คลินิก', 'ฝูง', 'ความทรงจำ', 'จุดกำเนิด', 'ย่านอาชีพ', 'เส้นทาง', 'เดินทาง', 'บทจบ'].map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setLayerFilter(f)}
                    className={`px-3 py-1.5 text-xs rounded-md ${
                      layerFilter === f
                        ? 'bg-lime-400 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-200">
                    Actions ({catalogActions.length})
                  </h3>
                  <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                    {catalogActions.map(a => (
                      <div
                        key={a.id}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex justify-between font-mono text-[11px] text-lime-300">
                          <span>{a.id}</span>
                          <span>{a.layer}</span>
                        </div>
                        <div className="font-bold text-slate-100">{a.name}</div>
                        <div className="text-slate-400">{a.note}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-200">
                    Events ({catalogEvents.length})
                  </h3>
                  <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                    {catalogEvents.map(e => (
                      <div
                        key={e.id}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex justify-between font-mono text-[11px] text-amber-300">
                          <span>{e.id}</span>
                          <span>{e.layer}</span>
                        </div>
                        <div className="font-bold text-slate-100">{e.title}</div>
                        <div className="text-slate-400 line-clamp-2">{e.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {studioTab === 'patches' && (
            <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-lime-300" />
                <span>สวิตช์เปิด-ปิดระบบรุ่น 1.0 (Live Engine Toggles)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {(
                  [
                    [
                      'pastLifeEchoesEnabled',
                      'ระบบกิมมิคเงียบจากการกระทำจริงในชีวิตก่อน',
                      'ไม่แสดงป้ายบอกตรงๆ แต่บรรยายชุดและสิ่งของของร่างเก่าให้คนเล่นสังเกตเห็นเอง',
                    ],
                    [
                      'midGameHorizonClues',
                      'เบาะแสบทจบระยะกลางเกม (Mid-Game Horizon Clues)',
                      'เปิดเผยเบาะแสและปุ่มบทจบเมื่อผู้เล่นพัฒนาสายนั้นเกิน ~35% โดยไม่เฉลยตั้งแต่วันแรก',
                    ],
                    [
                      'staggerLegacy02Story',
                      'จัดจังหวะการเปิดเนื้อเรื่อง',
                      'ลดปุ่มเนื้อเรื่องชนกัน 5 ปุ่มในวันที่ 1–2 โดยให้ story.clinic/pack/remnant เปิดในวันที่ 3+ หรือหลังสำรวจครั้งแรก',
                    ],
                    [
                      'hideLockedCareSpoilers',
                      'ซ่อนปุ่ม Care พิเศษที่ยังไม่ปลดล็อก Flag',
                      'ซ่อน next.rest, c40.clinic_scavenge, c42.shelter_backdoor จนกว่าจะผ่านเนื้อเรื่อง',
                    ],
                  ] as const
                ).map(([key, title, desc]) => (
                  <label
                    key={key}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={patches[key]}
                      onChange={e =>
                        setPatches(prev => ({ ...prev, [key]: e.target.checked }))
                      }
                      className="mt-1 accent-lime-400"
                    />
                    <div>
                      <div className="font-bold text-slate-100">{title}</div>
                      <div className="text-slate-400 mt-0.5 leading-relaxed">{desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </section>
          )}
        </main>
      )}
    </div>
  );
}
