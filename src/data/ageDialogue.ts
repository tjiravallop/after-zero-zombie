import npcDialogueData from './age-dialogue/npc.json';
import expansion from './age-dialogue/expansion.json';

export type AgeGroupTier = 'child' | 'teen' | 'adult' | 'elder';

export interface AgeDialogueKey {
  sourceFamily?: string;
  eventId: string;
  choiceId?: string | null;
  field?: string;
}

export interface AgeDialogueContext {
  scenePrefix?: string;
  resourceId?: string;
}

type DialogueField = { default?: string; variants?: Partial<Record<AgeGroupTier, string>> };
type DialogueEvent = {
  text?: DialogueField;
  description?: DialogueField;
  choices?: Record<string, { outcomeText?: DialogueField }>;
};
const expansionByFamily: Record<string, Record<string, DialogueEvent>> = expansion;
const pilotEvents: Record<string, DialogueEvent> = npcDialogueData.events;

const PREY_SCENE_PREFIXES: Record<string, string> = {
  'world.prey': 'ชายบาดเจ็บติดอยู่ในร้านขายยา',
  'world.prey.2': 'ชายอีกคนกุมแผลอยู่หลังซากรถเมล์',
  'world.prey.3': 'ชายสวมเสื้อช่างนั่งพิงกำแพงในซอยแคบ เลือดซึมจากขาของเขา',
  'world.prey.4': 'ชายส่งของบาดเจ็บหลบอยู่ข้างรถเข็นที่พลิกคว่ำ',
  'world.prey.5': 'ชายวัยกลางคนลากขาที่บาดเจ็บอยู่ใต้ทางเดินยกระดับ',
  'world.prey.6': 'ชายหนุ่มกดผ้าห้ามเลือดอยู่หลังแผงขายของร้าง',
};

/**
 * Classifies numeric character age (10–80) into an age group tier.
 * Returns 'adult' as safe neutral fallback if age is missing or invalid.
 */
export function resolveAgeGroupTier(age?: number | null): AgeGroupTier {
  if (typeof age !== 'number' || !Number.isFinite(age)) {
    return 'adult';
  }
  if (age <= 12) return 'child';
  if (age <= 19) return 'teen';
  if (age <= 59) return 'adult';
  return 'elder';
}

/**
 * Resolves age-aware dialogue text for a given event, choice, and field.
 * Returns defaultText if no specialized variant exists for the character's age tier.
 */
export function resolveAgeDialogue(
  key: AgeDialogueKey,
  age?: number | null,
  defaultText = '',
  context?: AgeDialogueContext
): string {
  const family = key.sourceFamily ?? 'engine';
  const event = expansionByFamily[family]?.[key.eventId] ??
    (family === 'engine' ? pilotEvents[key.eventId] : undefined);
  const fieldConfig = key.field === 'choices.outcomeText' && key.choiceId
    ? event?.choices?.[key.choiceId]?.outcomeText
    : key.choiceId ? undefined : key.field === 'description' ? event?.description :
      (!key.field || key.field === 'text') ? event?.text : undefined;
  if (!fieldConfig || !fieldConfig.variants) {
    return fieldConfig?.default || defaultText || '';
  }

  const tier = resolveAgeGroupTier(age);
  const variant: string | undefined = fieldConfig.variants[tier];

  let resultText = variant || fieldConfig.default || defaultText || '';

  // Handle dynamic scene prefix placeholder e.g. {scene} in prey event
  if (resultText.includes('{scene}')) {
    const scenePrefix =
      context?.scenePrefix ||
      (context?.resourceId && PREY_SCENE_PREFIXES[context.resourceId]) ||
      'ผู้บาดเจ็บคนหนึ่งหลบอยู่ริมถนน';
    resultText = resultText.replace(/\{scene\}/g, scenePrefix);
  }

  return resultText;
}

/**
 * Wraps an engine pending event and returns an age-aware view of it,
 * guaranteeing zero mutations to underlying game mechanics or choices.
 */
export function resolvePendingEventForAge(
  event: any,
  age?: number | null,
  context?: any
): any {
  if (!event || !event.id) return event;

  const resolvedText = resolveAgeDialogue(
    { sourceFamily: 'engine', eventId: event.id, field: 'text' },
    age,
    event.text,
    context
  );

  if (resolvedText === event.text) {
    return event;
  }

  return {
    ...event,
    text: resolvedText,
  };
}

/** Picks presentation text for a LifeSim result while keeping the canonical outcome in the game log. */
export function resolveLifeSimOutcomeForAge(
  modalId: string,
  choiceId: string | undefined,
  age: number | undefined,
  targetName?: string,
  outcomeSuffix = ''
): string {
  if (!choiceId) return '';
  const npcEvent = modalId.startsWith('lifesim-npc-') ? 'freeformEncounter'
    : modalId.startsWith('ally-aid-') ? 'proactiveAllyAid' : undefined;
  if (npcEvent === 'proactiveAllyAid' && !targetName) return '';
  const climaxEvent = modalId.startsWith('climax-') ? modalId.replace(/-w\d+$/, '') : undefined;
  const text = resolveAgeDialogue({
    sourceFamily: npcEvent ? 'npc' : climaxEvent ? 'ending' : 'dynamic',
    eventId: npcEvent ?? climaxEvent ?? modalId,
    choiceId,
    field: 'choices.outcomeText',
  }, age);
  if (!text) return '';
  return (targetName ? text.replaceAll('{name}', () => targetName) : text) + outcomeSuffix;
}
