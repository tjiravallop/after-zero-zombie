import type {ZonePopulationState, CharacterBioDossier} from './pastLifeEchoes';

export const PILOT_ENDING_IDS = ['king', 'human', 'escape_companion'] as const;
export const PHASE2_ENDING_IDS = [
  'evolved',
  'extinction',
  'silent_guardian',
  'conscious_exile',
  'horde_breakout',
] as const;

export const TAILORED_ENDING_IDS = [...PILOT_ENDING_IDS, ...PHASE2_ENDING_IDS] as const;
export type TailoredEndingId = typeof TAILORED_ENDING_IDS[number];
export type PilotEndingId = typeof PILOT_ENDING_IDS[number];

export function isTailoredEnding(id: string): id is TailoredEndingId {
  return (TAILORED_ENDING_IDS as readonly string[]).includes(id);
}

export function isPilotEnding(id: string): id is TailoredEndingId {
  return isTailoredEnding(id);
}

export const STATIC_ENDING_TEXTS: Record<TailoredEndingId, string> = {
  king: 'ฝูงนับไม่ถ้วนสงบลงเมื่อเจ้ายกมือ บัลลังก์สร้างจากเมืองเก่า และกฎข้อแรกของอาณาจักรใหม่จะเขียนด้วยสติที่เจ้ายังรักษาไว้',
  human: 'ความเจ็บปวดครั้งแรกหลังเซรุ่มไม่ใช่แผล แต่เป็นจังหวะเต้นในอก คนที่เจ้าเคยช่วยคอยจับมือไว้ ขณะที่เจ้าจำชื่อตนเองได้อีกครั้ง',
  escape_companion: 'ก่อนเส้นตาย 120 วัน เจ้าและผู้รอดชีวิตที่ไว้ใจเจ้าอย่างที่สุดลัดเลาะผ่านช่องทางระบายน้ำออกสู่แม่น้ำเจ้าพระยา ล่องเรือพ้นแนวปิดล้อมของเขตกักกันกรุงเทพฯ แม้หัวใจของเจ้าจะไม่เต้นอีกแล้ว แต่บนเส้นทางสายใหม่นอกเมืองยังมีคนเป็นคนหนึ่งที่คอยเรียกชื่อเจ้าอยู่ข้างกาย',
  evolved: 'ร่างกายเลิกเลียนแบบมนุษย์ และเลิกเชื่อฟังความตาย เจ้าลืมตาขึ้นพร้อมสัมผัสใหม่ ไม่มีชื่อสำหรับสายพันธุ์นี้ จนกว่าเจ้าจะตั้งให้กับมัน',
  extinction: 'เมือง ตามด้วยภูมิภาค และเครือข่ายทั่วโลกดับลงทีละแห่ง สัญญาณของเจ้ามีผู้รับทุกที่ แต่ไม่มีเสียงมนุษย์ตอบกลับมาอีกเลย เจ้าชนะ และไม่มีใครเหลือให้บอกเรื่องนี้',
  silent_guardian: 'เมื่อฝูงผู้ติดเชื้อคลั่งทะลักเข้าประชิดแนวป้องกัน เจ้าพาผู้รอดชีวิตในพื้นที่ลงสู่ห้องนิรภัยใต้ดินลึก แล้วดึงสลักประตูเหล็กปิดตายจากด้านนอก ใช้ร่างของตนยืนขวางหน้าประตูไว้จนวาระสุดท้าย ผู้คนที่อยู่หลังบานประตูนั้นรอดพ้นวิกฤตและจดจำเจ้าในฐานะผู้พิทักษ์เงียบงัน',
  conscious_exile: 'ตลอดเวลาในเขตกักกัน เจ้าประคองสติและความเห็นใจไว้ได้โดยไม่เคยคร่าชีวิตคนเป็น เมื่อพบเรือไม้ซ่อนอยู่ริมประตูระบายน้ำเก่า เจ้าจึงปลดเชือกปล่อยให้กระแสน้ำพัดเรือลอดแนวสะพานออกสู่แม่น้ำเจ้าพระยาก่อนฟ้าสาง มุ่งหน้าไปพ้นเขตกักกันพร้อมสติที่ยังเป็นของตัวเอง',
  horde_breakout: 'เจ้าส่งสัญญาณนำฝูงผู้ติดเชื้อที่ฝึกไว้เคลื่อนผ่านตรอกและจุดคอขวดเลียบคลองแสนแสบ เสียงสะท้อนริมน้ำไม่ทำให้แถวแตกกระจายอีกต่อไป พวกเจ้าพุ่งฝ่าแนวปิดล้อมปลายทางออกไปพ้นเขตกักกันกรุงเทพฯ ก่อนการกวาดล้างจะมาถึง',
};

export const STATIC_RESOLUTION_DESCS: Record<TailoredEndingId, string> = {
  king: 'เปลี่ยนความหิวไร้ทิศทางให้เป็นระเบียบและสัญญาณที่ฝูงยอมรับ ปกครองผู้ติดเชื้อในฐานะจ่าฝูงผู้มีสติ',
  human: 'เซรุ่มย้อนกลับเข็มสุดท้ายทำงานสมบูรณ์ หัวใจกลับมาสูบฉีดเลือดอุ่นและผ่านการตรวจรับเข้าสู่เขตรักษาในฐานะมนุษย์อีกครั้ง',
  escape_companion: 'ออกเดินทางเคียงข้างผู้รอดชีวิตที่ไว้ใจเจ้าเต็มหัวใจ ลัดเลาะพ้นแนวปิดล้อมออกไปเริ่มต้นเส้นทางใหม่นอกกรุงเทพมหานคร',
  evolved: 'ยอมรับการปรับตัวของระบบประสาทและโครงสร้างเซลล์ตามข้อมูลที่ตรวจสอบแล้ว ก้าวข้ามทั้งมนุษย์และซอมบี้ยุคแรก',
  extinction: 'ส่งสัญญาณความถี่จากหอวิทยุสะพานพระราม 8 ให้ฝูงผู้ติดเชื้อโหมบุกทลายแนวป้องกันของมนุษย์จนสิ้นสุดยุคสมัยเดิม',
  silent_guardian: 'เมื่อฝูงผู้ติดเชื้อคลั่งทะลักเข้าประชิด เจ้าพาผู้รอดชีวิตในพื้นที่ลงสู่หลุมหลบภัยใต้ดินลึก แล้วดึงประตูเหล็กหนาปิดตายจากด้านนอก',
  conscious_exile: 'ปลดเชือกเรือไม้ลำเล็กในคืนหมอกจัด ล่องพ้นเขตกักกันกรุงเทพฯ ไปอย่างเงียบงันโดยยังรักษาสติและไม่เคยฆ่าคนเป็น',
  horde_breakout: 'ใช้สัญญาณและเส้นทางเลียบคลองที่เตรียมไว้ พาฝูงผู้ติดเชื้อผ่านจุดคอขวดและทะลวงแนวปิดล้อมปลายทางออกจากเขตกักกัน',
};

export function isStaticEndingText(endingId: string, text?: string): boolean {
  if (!text) return true;
  if (text.includes('ครั้งแรกเจ้าเสียหัวใจ ครั้งนี้ร่างกายยอมแพ้เสียก่อน')) return true;
  if (isTailoredEnding(endingId)) {
    const staticText = STATIC_ENDING_TEXTS[endingId];
    const staticDesc = STATIC_RESOLUTION_DESCS[endingId];
    if (text === staticText || text === staticDesc) return true;
  }
  return false;
}

export function endingMetrics(state: any, zones: Record<string, ZonePopulationState>) {
  const allies = new Set(
    Object.values(zones || {}).flatMap(zone => zone?.npcs || [])
      .filter(npc => npc.alive && npc.trust >= 85)
      .map(npc => npc.storyNpcKey || npc.id)
  );
  return {
    days: state?.day || 1,
    saved: state?.memory?.saved || 0,
    killed: state?.memory?.killed || 0,
    allies: allies.size,
  };
}

// Observed community milestone actions
export const ENDING_REFLECTIONS = [
  {flag: 'c42.shelter_fortified', text: 'เจ้าช่วยเสริมแนวป้องกันที่หลบภัย ร่องรอยของการตัดสินใจนั้นยังอยู่'},
  {flag: 'c41.radio_jammed', text: 'เจ้ารบกวนสัญญาณวิทยุ การตัดสินใจของเจ้าเปลี่ยนการสื่อสารในเมือง'},
  {flag: 'c40.clinic_stabilized', text: 'เจ้าช่วยประคองคลินิกผ่านวิกฤต คนเป็นกับคนตายเคยร่วมมือกันที่นั่น'},
];

/**
 * Curates 1–2 most significant life traces + community impact reflections,
 * avoiding raw counter dumps while maintaining documentation and system integrity.
 */
export function endingReflections(state: any, zones?: Record<string, ZonePopulationState>): string[] {
  const flags = state?.story?.flags || {};
  const lines: string[] = [];

  // 1. Community actions with permanent flags
  for (const rule of ENDING_REFLECTIONS) {
    if (flags[rule.flag]) {
      lines.push(rule.text);
    }
  }

  const saved = Number(state?.memory?.saved || 0);
  const killed = Number(state?.memory?.killed || 0);
  const corpseMeals = Number(state?.memory?.corpseMeals || 0);
  const endured = Number(state?.memory?.endured || 0);

  // 2. Curate 1–2 significant survival traces based on deterministic hierarchy
  if (saved > 0 && killed > 0) {
    lines.push(`บันทึกนี้มีการช่วยชีวิตผู้รอดชีวิต ${saved} ครั้ง ควบคู่กับความสูญเสีย ${killed} ชีวิตจากการกระทำของร่างนี้`);
  } else if (saved > 0 && killed === 0) {
    lines.push(`บันทึกนี้มีการช่วยชีวิตผู้รอดชีวิต ${saved} ครั้ง โดยไม่เคยพรากชีวิตคนเป็น`);
  } else if (killed > 0 && saved === 0) {
    lines.push(`มีมนุษย์ ${killed} คนเสียชีวิตจากการกระทำของร่างนี้`);
  } else if (corpseMeals > 0 && killed === 0) {
    lines.push(`เจ้าเคยประทังชีวิตด้วยการกินซากศพ ${corpseMeals} ครั้ง โดยไม่เคยทำร้ายคนเป็น`);
  } else if (endured > 0 && killed === 0) {
    lines.push(`เจ้าเคยเลือกทนหิว ${endured} ครั้งเพื่อไม่ล่าคนเป็น`);
  }

  return lines.length ? lines : ['ทุกการเลือกพาเจ้ามาถึงที่นี่ บันทึกชีวิตนี้สิ้นสุดลงแล้ว'];
}

export interface ResolvedNpcReference {
  id: string;
  name: string;
  role: string;
  alive: boolean;
  trust: number;
}

export function findEligibleCompanion(
  state: any,
  zones?: Record<string, ZonePopulationState>
): ResolvedNpcReference | null {
  const allZones: Record<string, ZonePopulationState> = zones || state?.npcZones || {};
  const npcs = Object.values(allZones).flatMap(z => z?.npcs || []);

  if (!npcs.length) {
    if (state?.companion && typeof state.companion === 'object') {
      return {
        id: state.companion.id || 'companion',
        name: state.companion.name || 'ผู้ร่วมทาง',
        role: state.companion.role || 'ผู้รอดชีวิต',
        alive: Boolean(state.companion.alive),
        trust: Number(state.companion.trust || 100),
      };
    }
    return null;
  }

  const trackedId = state?.targetNpcId || state?.story?.flags?.['companion.id'];
  if (trackedId) {
    const tracked = npcs.find(n => n.id === trackedId);
    if (tracked) {
      return {
        id: tracked.id,
        name: tracked.name,
        role: tracked.role,
        alive: Boolean(tracked.alive),
        trust: Number(tracked.trust ?? 0),
      };
    }
  }

  // 1. Alive NPC with trust >= 100
  const maxTrustAlive = npcs
    .filter(n => n.alive && n.trust >= 100)
    .sort((a, b) => b.trust - a.trust || a.id.localeCompare(b.id))[0];
  if (maxTrustAlive) {
    return {
      id: maxTrustAlive.id,
      name: maxTrustAlive.name,
      role: maxTrustAlive.role,
      alive: true,
      trust: maxTrustAlive.trust,
    };
  }

  // 2. Alive NPC with trust >= 85
  const highTrustAlive = npcs
    .filter(n => n.alive && n.trust >= 85)
    .sort((a, b) => b.trust - a.trust || a.id.localeCompare(b.id))[0];
  if (highTrustAlive) {
    return {
      id: highTrustAlive.id,
      name: highTrustAlive.name,
      role: highTrustAlive.role,
      alive: true,
      trust: highTrustAlive.trust,
    };
  }

  // 3. Known candidate who died (accurately recognize loss; NEVER portray as alive)
  const deadCandidate = npcs
    .filter(n => !n.alive && (n.trust >= 85 || n.id === trackedId))
    .sort((a, b) => b.trust - a.trust || a.id.localeCompare(b.id))[0];
  if (deadCandidate) {
    return {
      id: deadCandidate.id,
      name: deadCandidate.name,
      role: deadCandidate.role,
      alive: false,
      trust: deadCandidate.trust,
    };
  }

  return null;
}

export function findEligibleWitness(
  state: any,
  zones?: Record<string, ZonePopulationState>,
  endingId?: string
): ResolvedNpcReference | null {
  const allZones: Record<string, ZonePopulationState> = zones || state?.npcZones || {};
  const npcs = Object.values(allZones).flatMap(z => z?.npcs || []);
  if (!npcs.length) return null;

  if (endingId === 'human') {
    // Prefer hospital / clinic living ally
    const hospitalAlly = npcs.find(n => n.alive && n.trust >= 50 && (n.placeId === 'hospital' || n.placeId === 'bkk_ward'));
    if (hospitalAlly) {
      return { id: hospitalAlly.id, name: hospitalAlly.name, role: hospitalAlly.role, alive: true, trust: hospitalAlly.trust };
    }
  }

  if (endingId === 'silent_guardian') {
    const place = state?.place || 'shelter';
    const localAlly = npcs.find(n => n.alive && n.trust >= 85 && n.placeId === place);
    if (localAlly) {
      return { id: localAlly.id, name: localAlly.name, role: localAlly.role, alive: true, trust: localAlly.trust };
    }
  }

  // Any living ally with trust >= 85
  const anyAlly = npcs
    .filter(n => n.alive && n.trust >= 85)
    .sort((a, b) => b.trust - a.trust || a.id.localeCompare(b.id))[0];
  if (anyAlly) {
    return { id: anyAlly.id, name: anyAlly.name, role: anyAlly.role, alive: true, trust: anyAlly.trust };
  }

  return null;
}

export function tailorEndingPresentation({
  endingId,
  state,
  zones,
  bio,
  customOverride,
}: {
  endingId: string;
  state: any;
  zones?: Record<string, ZonePopulationState>;
  bio?: CharacterBioDossier;
  customOverride?: { id?: string; title?: string; text?: string };
}): { title: string; text: string } {
  if (!isTailoredEnding(endingId)) {
    return {
      title: customOverride?.title || state?.ending?.title || 'บทจบของชีวิต',
      text: customOverride?.text || state?.ending?.text || '',
    };
  }

  const effectiveZones: Record<string, ZonePopulationState> = zones || state?.npcZones || {};
  const saved = Number(state?.memory?.saved || 0);
  const killed = Number(state?.memory?.killed || 0);
  const corpseMeals = Number(state?.memory?.corpseMeals || 0);
  const endured = Number(state?.memory?.endured || 0);
  const allies = endingMetrics(state, effectiveZones).allies;

  // Preserve non-generic custom texts (e.g. from previously tailored and saved record)
  if (customOverride?.text && !isStaticEndingText(endingId, customOverride.text)) {
    return {
      title: customOverride.title || state?.ending?.title || getDefaultEndingTitle(endingId),
      text: customOverride.text,
    };
  }
  if (state?.ending?.text && !isStaticEndingText(endingId, state.ending.text)) {
    return {
      title: state.ending.title || getDefaultEndingTitle(endingId),
      text: state.ending.text,
    };
  }

  let coreText = '';
  let lifeTraceText = '';
  let witnessText = '';

  // 1. KING
  if (endingId === 'king') {
    coreText =
      'ฝูงผู้ติดเชื้อหยุดนิ่งลงเมื่อเจ้ายกมือและส่งสัญญาณที่ฝึกฝนไว้ บัลลังก์สร้างขึ้นริมคลองและแนวตึกเก่าของเมือง กฎข้อแรกของอาณาจักรใหม่ถูกจารึกด้วยสติที่เจ้ายังรักษาไว้';

    if (saved > 0 && killed > 0) {
      if (killed >= 10) {
        lifeTraceText = `แม้จะมีบันทึกการช่วยชีวิตผู้รอดชีวิต ${saved} ครั้ง แต่บัลลังก์นี้กลับถูกสร้างขึ้นบนซากความสูญเสียของมนุษย์กว่า ${killed} ชีวิต รอยเลือดที่นองท่วมเมืองเก่าเป็นความจริงอันโหดร้ายที่ไม่อาจลบล้างได้`;
      } else {
        lifeTraceText = `แม้จะมีบันทึกการช่วยชีวิตผู้รอดชีวิต ${saved} ครั้ง แต่รอยเลือดจาก ${killed} ชีวิตที่สูญเสียไปจากการกระทำของร่างนี้ก็ยังคงเป็นความจริงที่ไม่อาจลบล้างได้`;
      }
    } else if (saved > 0 && killed === 0) {
      lifeTraceText = `ตลอดการเดินทางที่ผ่านมา ร่างนี้ไม่เคยพรากชีวิตคนเป็น และมีบันทึกการยื่นมือช่วยชีวิตผู้รอดชีวิตไว้ ${saved} ครั้ง`;
    } else if (killed > 0 && saved === 0) {
      if (killed >= 10) {
        lifeTraceText = `บัลลังก์ราชาแห่งผู้ไร้ชีพจรถูกสถาปนาขึ้นด้วยการล่าอันโหดเหี้ยม มนุษย์กว่า ${killed} ชีวิตต้องจบลงเพื่อเป็นบันไดสู่อำนาจนำฝูง ทิ้งให้เมืองเก่าจมอยู่ใต้เงามืดของการเข่นฆ่า`;
      } else {
        lifeTraceText = `อำนาจที่ได้มาแลกด้วย ${killed} ชีวิตของมนุษย์ที่ต้องสูญเสียไปให้กับการเอาชีวิตรอด โดยไร้บันทึกของการยื่นมือเข้าช่วยเหลือผู้ใด`;
      }
    } else if (corpseMeals > 0 && killed === 0) {
      lifeTraceText = `เจ้าเคยประทังความหิวด้วยการกินซากศพ ${corpseMeals} ครั้งเพื่อรักษาการมีอยู่ของร่างนี้ โดยไม่เคยล่าหรือปลิดชีวิตคนเป็น`;
    } else if (endured > 0 && killed === 0) {
      lifeTraceText = `เจ้าเคยเลือกข่มสัญชาตญาณและทนต่อความหิวโหย ${endured} ครั้ง เพื่อหลีกเลี่ยงการทำร้ายคนเป็น`;
    } else {
      lifeTraceText =
        'การตัดสินใจแต่ละก้าวในเขตกักกันนำพาร่างนี้มาสู่การเป็นผู้นำ แม้ไร้ร่องรอยบันทึกที่เด่นชัด แต่การกระทำทั้งหมดยังคงฝากไว้กับเมืองนี้';
    }

    if (allies > 0) {
      witnessText =
        'คนเป็นที่ยังมีชีวิตและเคยผูกพันกับเจ้าต่างเฝ้ามองการตั้งหลักนี้ด้วยความยำเกรง รับรู้ว่าผู้ที่กุมอำนาจเหนือฝูงไม่ใช่ปีศาจที่ไร้หัวใจ';
    } else if (killed >= 10 && allies === 0 && saved === 0) {
      witnessText =
        'ผู้รอดชีวิตที่เหลืออยู่ในเมืองต่างขนหัวลุกและหลบซ่อนตัวในเงามืด มองดูราชาแห่งฝูงตนใหม่ด้วยความสะพรึงกลัวอย่างขีดสุด';
    } else if (killed > 0 && allies === 0 && saved === 0) {
      witnessText =
        'ผู้รอดชีวิตที่เหลืออยู่ในเมืองต่างล่าถอยออกจากละแวกคลองด้วยความหวาดกลัวต่อผู้ปกครองฝูงตนใหม่';
    } else if (saved > 0 && killed > 0) {
      witnessText =
        'เสียงเล่าขานในหมู่คนเป็นเต็มไปด้วยความยำเกรงและคลุมเครือ — ทั้งในฐานะผู้เคยยื่นมือเข้าช่วย และในฐานะผู้ล่าที่น่าสะพรึงกลัว';
    } else {
      witnessText =
        'เงาของฝูงที่สงบนิ่งริมคลองกลายเป็นเขตแดนใหม่ที่ผู้คนในเมืองต้องเรียนรู้ที่จะอยู่ร่วมกัน';
    }

    return {
      title: customOverride?.title || state?.ending?.title || 'ราชาแห่งผู้ไร้ชีพจร',
      text: `${coreText} ${lifeTraceText} ${witnessText}`,
    };
  }

  // 2. HUMAN
  if (endingId === 'human') {
    coreText =
      'ความเจ็บปวดแรกหลังเซรุ่มย้อนกลับทำงานสมบูรณ์คือจังหวะเต้นของหัวใจในอก เลือดอุ่นเริ่มสูบฉีดผ่านเส้นเลือดอีกครั้ง เจ้าก้าวพ้นสภาพผู้ติดเชื้อและได้รับการตรวจรับเข้าสู่เขตรักษาในฐานะมนุษย์';

    if (saved > 0 && killed > 0) {
      lifeTraceText = `แม้ชีพจรจะกลับมาเต้นและเคยยื่นมือช่วยชีวิตคนไว้ ${saved} ครั้ง แต่ความทรงจำถึง ${killed} ชีวิตที่ดับสูญไปด้วยมือคู่นี้ยังคงเป็นตราบาปที่ไม่อาจลืมเลือน`;
    } else if (saved > 0 && killed === 0) {
      lifeTraceText = `ความทรงจำจากการยื่นมือช่วยชีวิตผู้รอดชีวิต ${saved} ครั้งโดยไม่เคยพรากชีวิตใคร กลายเป็นหลักยึดเหนี่ยวที่พาเจ้ากลับคืนสู่ความเป็นคน`;
    } else if (killed > 0 && saved === 0) {
      lifeTraceText = `แม้ร่างกายจะกลับมาเป็นมนุษย์ แต่รอยเลือดจาก ${killed} ชีวิตที่ต้องสูญเสียไปจากการล่าในอดีต จะยังคงเป็นเงาตามตัวเจ้าไปตลอดกาล`;
    } else if (corpseMeals > 0 && killed === 0) {
      lifeTraceText = `แม้ในวันที่มืดมนที่สุดเจ้าจำต้องประทังชีวิตด้วยซากศพ ${corpseMeals} ครั้ง แต่การไม่เคยทำร้ายคนเป็นทำให้จิตวิญญาณเดิมยังคงหลงเหลืออยู่`;
    } else if (endured > 0 && killed === 0) {
      lifeTraceText = `ความอดทนต่อความหิวโหย ${endured} ครั้งโดยไม่ยอมทำร้ายคนเป็น กลายเป็นบทพิสูจน์ว่าจิตสำนึกของมนุษย์ไม่เคยยอมแพ้ต่อเชื้อร้าย`;
    } else {
      lifeTraceText =
        'ทุกหยาดหยดของเซรุ่มลบล้างพิษร้ายออกจากกาย คืนความเป็นมนุษย์ที่เคยหลุดลอยให้กลับคืนมาอีกครั้ง';
    }

    const witness = findEligibleWitness(state, effectiveZones, 'human');
    if (witness && witness.alive) {
      witnessText = `"${witness.name}" (${witness.role}) ที่ยังมีชีวิต คอยยืนเฝ้ามองดูการฟื้นตัวอยู่ข้างเตียงด้วยสายตาที่เปี่ยมไปด้วยความหวัง`;
    } else if (killed > 0 && !witness) {
      witnessText =
        'ทีมแพทย์ในหอผู้ป่วยเฝ้าสังเกตอาการด้วยความระมัดระวัง แม้จะยืนยันการฟื้นคืนชีพจร แต่ระยะห่างและความระแวงต่ออดีตที่ผ่านมายังคงสัมผัสได้';
    } else {
      witnessText =
        'ทีมแพทย์และพยาบาลในหอพักฟื้นเฝ้าบันทึกสัญญาณชีพอย่างใกล้ชิด ขณะที่เจ้าเริ่มเรียกคืนชื่อของตนเองได้อีกครั้ง';
    }

    return {
      title: customOverride?.title || state?.ending?.title || 'หัวใจเต้นอีกครั้ง',
      text: `${coreText} ${lifeTraceText} ${witnessText}`,
    };
  }

  // 3. ESCAPE_COMPANION
  if (endingId === 'escape_companion') {
    coreText =
      'ก่อนเส้นตาย 120 วันจะมาถึง เรือไม้ลำเล็กแล่นผ่านช่องทางระบายน้ำออกสู่แม่น้ำเจ้าพระยา ล่องพ้นแนวปิดล้อมของเขตกักกันกรุงเทพฯ มุ่งหน้าสู่เส้นทางใหม่ภายนอก';

    const companion = findEligibleCompanion(state, effectiveZones);
    if (companion && companion.alive) {
      witnessText = `เคียงข้างด้วย "${companion.name}" (${companion.role}) ผู้รอดชีวิตที่ไว้ใจเจ้าอย่างเต็มหัวใจ คอยประคองพายและเรียกชื่อเจ้าท่ามกลางสายหมอก`;
    } else if (companion && !companion.alive) {
      witnessText = `แม้การเดินทางฝ่าวงล้อมจะต้องก้าวต่อไปเพียงลำพังหลังการสูญเสีย "${companion.name}" (${companion.role}) ไปในเมือง แต่เส้นทางสู่อิสรภาพภายนอกยังคงทอดรออยู่เบื้องหน้า`;
    } else {
      witnessText =
        'ร่วมเดินทางไปกับผู้รอดชีวิตที่ร่วมชะตากรรม คอยผลัดกันเฝ้าระวังภัยบนเส้นทางสายใหม่นอกเมือง';
    }

    if (saved > 0 && killed > 0) {
      lifeTraceText = `แม้จะมีบันทึกการช่วยชีวิตผู้รอดชีวิต ${saved} ครั้ง แต่รอยอดีตจาก ${killed} ชีวิตที่สูญเสียไปก็ไม่อาจทิ้งไว้เบื้องหลังได้ทั้งหมด`;
    } else if (saved > 0 && killed === 0) {
      lifeTraceText = `การไม่เคยทำร้ายคนเป็นและเคยช่วยชีวิตผู้รอดชีวิต ${saved} ครั้ง ทำให้การเดินทางสู่โลกภายนอกเปี่ยมไปด้วยความหวังและความบริสุทธิ์ใจ`;
    } else if (killed > 0 && saved === 0) {
      lifeTraceText = `แม้จะหลุดพ้นจากเขตกักกันมาได้ แต่ความสูญเสียของ ${killed} ชีวิตที่เคยจบลงด้วยมือคู่นี้ จะยังคงเป็นเงาที่ไม่อาจลบล้างได้บนแผ่นดินใหม่`;
    } else if (corpseMeals > 0 && killed === 0) {
      lifeTraceText = `การประทังชีวิตด้วยซากศพ ${corpseMeals} ครั้งในอดีตเพื่อประคองร่างให้อยู่รอดโดยไม่เคยทำร้ายคนเป็น กลายเป็นเพียงความทรงจำอันขมขื่นที่ถูกทิ้งไว้ในเมืองเก่า`;
    } else if (endured > 0 && killed === 0) {
      lifeTraceText = `ความทรหดจากการทนหิว ${endured} ครั้งโดยไม่ทำร้ายใคร เป็นเครื่องยืนยันถึงเจตจำนงที่แน่วแน่จนถึงก้าวสุดท้ายพ้นเขตกักกัน`;
    } else {
      lifeTraceText =
        'สายน้ำเจ้าพระยาพัดพาเรือห่างออกจากซากเมืองหลวง ละทิ้งเรื่องราวทั้งหมดไว้เบื้องหลัง';
    }

    return {
      title: customOverride?.title || state?.ending?.title || 'ออกเดินทางพ้นเขตกักกันกรุงเทพฯ',
      text: `${coreText} ${witnessText} ${lifeTraceText}`,
    };
  }

  // 4. EVOLVED
  if (endingId === 'evolved') {
    coreText =
      'ร่างกายเลิกเลียนแบบมนุษย์และเลิกเชื่อฟังความตาย ระบบประสาทและการตอบสนองต่อเชื้อปรับตัวสู่สภาวะสมดุลใหม่ เจ้าลืมตาขึ้นพร้อมการรับรู้ที่ก้าวข้ามขีดจำกัดเดิมของทั้งคนเป็นและคนตาย';

    if (saved > 0 && killed > 0) {
      lifeTraceText = `แม้เซลล์ในร่างจะปรับตัวจนก้าวข้ามขีดจำกัด และเคยช่วยชีวิตคนไว้ ${saved} ครั้ง แต่รอยเลือดจาก ${killed} ชีวิตที่สูญเสียไปในอดีตยังเป็นส่วนหนึ่งของรหัสชีวภาพที่ประกอบขึ้นเป็นร่างนี้`;
    } else if (saved > 0 && killed === 0) {
      lifeTraceText = `การวิวัฒนาการครั้งนี้เกิดขึ้นโดยไม่เคยพรากชีวิตคนเป็น และมีบันทึกการยื่นมือช่วยชีวิตผู้รอดชีวิต ${saved} ครั้ง เป็นเครื่องพิสูจน์ว่าจิตสำนึกไม่ได้ถูกทำลายลงไปพร้อมกับการกลายพันธุ์`;
    } else if (killed > 0 && saved === 0) {
      lifeTraceText = `การก้าวข้ามสายพันธุ์เดิมแลกมาด้วยการล่า ${killed} ชีวิตของมนุษย์ที่ต้องดับสูญไป กลายเป็นเส้นทางสายวิวัฒนาการที่เปื้อนเลือด`;
    } else if (corpseMeals > 0 && killed === 0) {
      lifeTraceText = `การประทังชีวิตด้วยซากศพ ${corpseMeals} ครั้งกลายเป็นข้อมูลการปรับตัวทางชีวเคมี โดยไม่เคยล่าหรือทำร้ายคนเป็น`;
    } else if (endured > 0 && killed === 0) {
      lifeTraceText = `การทนต่อความหิวโหย ${endured} ครั้งช่วยประคองสติให้เซลล์ในร่างค่อย ๆ ปรับตัวเข้ากับไวรัสอย่างเป็นระเบียบ โดยไม่ต้องพึ่งพาการล่าคนเป็น`;
    } else {
      lifeTraceText =
        'การกลายพันธุ์ดำเนินมาถึงจุดสมบูรณ์แบบ ทิ้งตัวตนเดิมไว้เบื้องหลังและก้าวสู่วิถีชีวิตใหม่กลางซากเมือง';
    }

    const witness = findEligibleWitness(state, effectiveZones, 'evolved');
    if (witness && witness.alive) {
      witnessText = `"${witness.name}" (${witness.role}) ที่ยังมีชีวิตต่างรับรู้ถึงการเปลี่ยนแปลงนี้ แม้รูปลักษณ์จะแปลกแยกจนไม่ใช่มนุษย์เดิม แต่แววตาที่มองกลับมายังคงมีประกายของสติที่จำได้`;
    } else if (killed > 0 && !witness) {
      witnessText =
        'มนุษย์ที่หลงเหลืออยู่ในละแวกใกล้เคียงต่างหลบลี้หนีหาย เมื่อรับรู้ถึงการมีอยู่ของสิ่งมีชีวิตสายพันธุ์ใหม่ที่ไม่คุ้นเคย';
    } else {
      witnessText =
        'เสียงฝีเท้าใหม่ก้าวข้ามซากปรักหักพังอย่างมั่นคง พร้อมสัมผัสที่รับรู้ถึงเมืองหลวงในมุมมองที่ไม่เคยมีใครเห็นมาก่อน';
    }

    return {
      title: customOverride?.title || state?.ending?.title || 'สิ่งมีชีวิตลำดับถัดไป',
      text: `${coreText} ${lifeTraceText} ${witnessText}`,
    };
  }

  // 5. EXTINCTION
  if (endingId === 'extinction') {
    coreText =
      'คลื่นสัญญาณความถี่จากยอดหอวิทยุสะพานพระราม 8 ถูกส่งออกไปทั่วทุกช่องสัญญาณ ฝูงผู้ติดเชื้อโหมบุกตามคลื่นความถี่จนแนวป้องกันของมนุษย์ดับลงทีละแห่ง ไร้เสียงมนุษย์ตอบกลับมาอีกเลย';

    if (saved > 0 && killed > 0) {
      lifeTraceText = `แม้ในอดีตจะมีบันทึกการช่วยชีวิตผู้รอดชีวิต ${saved} ครั้ง และมี ${killed} ชีวิตที่เคยดับสูญไปด้วยมือคู่นี้ แต่วันนี้คลื่นสัญญาณที่กระจายออกไปได้ปิดฉากเรื่องราวทั้งหมดลงอย่างถาวร`;
    } else if (saved > 0 && killed === 0) {
      lifeTraceText = `แม้ตลอดการเดินทางในเมืองจะไม่เคยพรากชีวิตคนเป็นและเคยช่วยชีวิตผู้รอดชีวิตไว้ ${saved} ครั้ง แต่การตัดสินใจเปิดสัญญาณความถี่ในครั้งนี้ได้ทำให้เสียงของมนุษย์ดับลงอย่างไม่มีวันหวนกลับ`;
    } else if (killed > 0 && saved === 0) {
      lifeTraceText = `การล่าที่คร่าชีวิตมนุษย์ไป ${killed} คนในอดีต กลายเป็นจุดเริ่มต้นของคลื่นสัญญาณมรณะที่กลืนกินผู้รอดชีวิตที่เหลืออยู่ในเมืองไปจนหมดสิ้น`;
    } else if (corpseMeals > 0 && killed === 0) {
      lifeTraceText = `จากผู้ติดเชื้อที่เคยประทังชีวิตด้วยซากศพ ${corpseMeals} ครั้งเพื่อประคองร่างโดยไม่เคยทำร้ายใคร คลื่นสัญญาณสุดท้ายได้กลายเป็นสิ่งที่ปิดฉากเสียงของผู้รอดชีวิตทุกคนลง`;
    } else if (endured > 0 && killed === 0) {
      lifeTraceText = `จากวันที่เคยทนหิว ${endured} ครั้งเพื่อไม่ทำร้ายคนเป็น จุดจบกลับมาถึงเมื่อคลื่นวิทยุปิดฉากทุกความหวังของมนุษยชาติลง`;
    } else {
      lifeTraceText =
        'ทุกช่องความถี่ว่างเปล่า เสียงสัญญาณซ่าบนหน้าปัดวิทยุกลายเป็นบทสรุปสุดท้ายของเมืองหลวง';
    }

    witnessText =
      'ไม่มีเสียงมนุษย์ตอบกลับมาจากฝั่งพระนครหรือธนบุรีอีกต่อไป มีเพียงเสียงลมพัดผ่านเสาสัญญาณร้างบนยอดสะพาน';

    return {
      title: customOverride?.title || state?.ending?.title || 'โลกที่ไม่มีใครตอบกลับ',
      text: `${coreText} ${lifeTraceText} ${witnessText}`,
    };
  }

  // 6. SILENT_GUARDIAN
  if (endingId === 'silent_guardian') {
    coreText =
      'เมื่อฝูงผู้ติดเชื้อคลั่งทะลักเข้าประชิดแนวป้องกัน เจ้าพาผู้รอดชีวิตในพื้นที่ลงสู่ห้องนิรภัยใต้ดินลึก แล้วดึงสลักประตูเหล็กปิดตายจากด้านนอก ใช้ร่างของตนยืนขวางหน้าประตูไว้จนวาระสุดท้าย';

    if (saved > 0 && killed > 0) {
      lifeTraceText = `แม้จะมีบันทึกการช่วยชีวิตผู้รอดชีวิต ${saved} ครั้ง แต่รอยเลือดจาก ${killed} ชีวิตที่เคยสูญเสียไปจากการกระทำของร่างนี้ก็ยังเป็นความจริงที่ไม่อาจลบล้าง ทว่าในการตัดสินใจครั้งสุดท้าย ร่างนี้เลือกที่จะยืนหยัดเพื่อปกป้องคนข้างหลัง`;
    } else if (saved > 0 && killed === 0) {
      lifeTraceText = `การยื่นมือช่วยชีวิตผู้รอดชีวิต ${saved} ครั้งโดยไม่เคยพรากชีวิตคนเป็น สิ้นสุดลงด้วยการอุทิศร่างเพื่อเป็นปราการด่านสุดท้ายให้คนเป็นได้มีชีวิตรอดต่อไป`;
    } else if (killed > 0 && saved === 0) {
      lifeTraceText = `แม้ในอดีตจะมีมนุษย์ ${killed} คนต้องสังเวยให้กับการเอาชีวิตรอดของร่างนี้ แต่วินาทีสุดท้ายหน้าบานประตูเหล็ก ร่างนี้กลับเลือกที่จะยืนขวางฝูงคลั่งเพื่อปกป้องผู้รอดชีวิตที่อยู่ข้างใน`;
    } else if (corpseMeals > 0 && killed === 0) {
      lifeTraceText = `ตลอดเวลาที่ผ่านมาเจ้ากินเพียงซากศพ ${corpseMeals} ครั้งโดยไม่เคยทำร้ายคนเป็น จนถึงวาระสุดท้ายที่เลือกใช้ร่างนี้เป็นเกราะกำบังให้ผู้รอดชีวิต`;
    } else if (endured > 0 && killed === 0) {
      lifeTraceText = `ความอดทนต่อความหิวโหย ${endured} ครั้งสะท้อนชัดในจิตสำนึกสุดท้าย เมื่อเจ้าเลือกยืนขวางหน้าประตูเหล็กโดยไม่คิดทำร้ายคนข้างใน`;
    } else {
      lifeTraceText =
        'ร่างที่ยืนนิ่งหน้าบานประตูเหล็กหยุดการเคลื่อนไหวลง ทิ้งความสงบไว้เบื้องหลังให้แก่ผู้ที่อยู่ด้านใน';
    }

    const witness = findEligibleWitness(state, effectiveZones, 'silent_guardian');
    const placeName = effectiveZones[state?.place]?.placeName || 'ที่หลบภัย';
    if (witness && witness.alive) {
      witnessText = `"${witness.name}" (${witness.role}) และผู้คนหลังบานประตูเหล็กปลอดภัยจากการเสียสละนี้ และจะจดจำเจ้าในฐานะผู้พิทักษ์เงียบงันตลอดไป`;
    } else {
      witnessText = `ผู้รอดชีวิตที่ปลอดภัยอยู่หลังบานประตูเหล็กหนาใน${placeName} จะจดจำเจ้าในฐานะผู้พิทักษ์เงียบงันของพวกเขาตลอดไป`;
    }

    return {
      title: customOverride?.title || state?.ending?.title || 'ผู้เฝ้าประตูเงียบงันแห่งเขตกักกันกรุงเทพฯ',
      text: `${coreText} ${lifeTraceText} ${witnessText}`,
    };
  }

  // 7. CONSCIOUS_EXILE
  if (endingId === 'conscious_exile') {
    coreText =
      'ตลอดเวลาในเขตกักกัน เจ้าประคองสติไว้ได้โดยไม่เคยคร่าชีวิตคนเป็น เมื่อพบเรือไม้ซ่อนอยู่ริมประตูระบายน้ำเก่า เจ้าจึงปลดเชือกปล่อยให้เรือลอดแนวสะพานออกสู่แม่น้ำเจ้าพระยาก่อนฟ้าสาง มุ่งหน้าไปพ้นเขตกักกันพร้อมสติที่ยังเป็นของตัวเอง';

    if (saved > 0) {
      lifeTraceText = `การยื่นมือช่วยชีวิตผู้รอดชีวิต ${saved} ครั้งในเมืองกลายเป็นความทรงจำอันมีค่าที่พกติดตัวไป แม้ร่างนี้จะไม่ได้กลับเป็นมนุษย์ แต่หัวใจไม่เคยแปดเปื้อนการเข่นฆ่า`;
    } else if (corpseMeals > 0) {
      lifeTraceText = `แม้เคยจำต้องกินซากศพ ${corpseMeals} ครั้งเพื่อประทังความหิว แต่การไม่เคยทำร้ายคนเป็นทำให้การเดินทางออกจากเมืองไร้ซึ่งตราบาปของการเบียดเบียน`;
    } else if (endured > 0) {
      lifeTraceText = `ความทรหดจากการทนหิว ${endured} ครั้งกลายเป็นหลักฐานของสติสัมปชัญญะที่ไม่เคยยอมแพ้ต่อสัญชาตญาณดิบ`;
    } else {
      lifeTraceText =
        'สติสัมปชัญญะที่ยังเป็นของตัวเองนำพาร่างนี้ลอยลำไปตามกระแสน้ำ มุ่งหน้าสู่ความเงียบสงบนอกเขตกักกัน';
    }

    if (allies > 0) {
      witnessText =
        'ผู้รอดชีวิตที่เคยผูกพันกับเจ้าในเมืองอาจไม่มีวันรู้ว่าเจ้าไปอยู่ที่ใด แต่เรื่องเล่าของซอมบี้ผู้มีสติตนหนึ่งยังคงถูกเล่าขานต่อกันริมแม่น้ำ';
    } else {
      witnessText =
        'สายหมอกยามเช้าเหนือแม่น้ำเจ้าพระยากลืนภาพเรือไม้ลำเล็กหายไป ทิ้งกรุงเทพฯ ไว้เบื้องหลังอย่างเงียบสงบ';
    }

    return {
      title: customOverride?.title || state?.ending?.title || 'ล่องเรือพ้นแม่น้ำเจ้าพระยาก่อนฟ้าสาง',
      text: `${coreText} ${lifeTraceText} ${witnessText}`,
    };
  }

  // 8. HORDE_BREAKOUT
  coreText =
    'เจ้าส่งสัญญาณนำฝูงผู้ติดเชื้อที่ฝึกไว้เคลื่อนผ่านตรอกและจุดคอขวดเลียบคลองแสนแสบ เสียงสะท้อนริมน้ำไม่ทำให้แถวแตกกระจายอีกต่อไป พวกเจ้าพุ่งฝ่าแนวปิดล้อมปลายทางออกไปพ้นเขตกักกันกรุงเทพฯ ก่อนการกวาดล้างจะมาถึง';

  if (saved > 0 && killed > 0) {
    if (killed >= 10) {
      lifeTraceText = `แม้จะมีบันทึกการช่วยชีวิตผู้รอดชีวิต ${saved} ครั้ง แต่การกรุยทางเพื่อรวบรวมฝูงกลับชุ่มโชกไปด้วยรอยเลือดจากมนุษย์กว่า ${killed} ชีวิต ความสูญเสียระดับนี้คือตราบาปอันหนักหน่วงที่ฝูงต้องแบกรับข้ามแนวด่านกักกัน`;
    } else {
      lifeTraceText = `แม้จะมีบันทึกการช่วยชีวิตผู้รอดชีวิต ${saved} ครั้ง แต่รอยเลือดจาก ${killed} ชีวิตที่สูญเสียไปในอดีตก็ยังคงเป็นความจริงที่ไม่อาจทิ้งไว้เบื้องหลัง`;
    }
  } else if (saved > 0 && killed === 0) {
    lifeTraceText = `ตลอดเส้นทางที่ผ่านมา ร่างนี้ไม่เคยพรากชีวิตคนเป็น และเคยยื่นมือช่วยชีวิตผู้รอดชีวิตไว้ ${saved} ครั้ง การนำฝูงครั้งนี้จึงถูกขับเคลื่อนด้วยวินัยและสัญญาณ ไม่ใช่ความกระหายเลือด`;
  } else if (killed > 0 && saved === 0) {
    if (killed >= 10) {
      lifeTraceText = `การพาฝูงฝ่าวงล้อมกลายเป็นการกรุยทางที่นองเลือด มนุษย์กว่า ${killed} ชีวิตต้องสังเวยให้กับการล่าอย่างไม่หยุดหย่อน กลิ่นคาวเลือดและซากความสูญเสียกลายเป็นรอยแผลขนาดใหญ่ที่เมืองนี้จะไม่มีวันลืม`;
    } else {
      lifeTraceText = `การฝ่าแนวปิดล้อมของฝูงแลกมาด้วยความสูญเสีย ${killed} ชีวิตของมนุษย์ในอดีต ทิ้งรอยแผลของการล่าไว้เบื้องหลังตามตรอกซอกซอยของเมืองหลวง`;
    }
  } else if (corpseMeals > 0 && killed === 0) {
    lifeTraceText = `เจ้าเคยประทังความหิวด้วยการกินซากศพ ${corpseMeals} ครั้งโดยไม่เคยทำร้ายคนเป็น ทำให้การเคลื่อนฝูงครั้งนี้มุ่งตรงสู่การเอาชีวิตรอดภายนอกโดยไม่แวะล่า`;
  } else if (endured > 0 && killed === 0) {
    lifeTraceText = `การเลือกทนหิว ${endured} ครั้งช่วยให้เจ้าควบคุมสัญชาตญาณของตนเองและฝึกฝูงให้อยู่ในระเบียบได้จนถึงก้าวสุดท้ายพ้นเขตกักกัน`;
  } else {
    lifeTraceText =
      'การตัดสินใจนำฝูงเคลื่อนผ่านจุดคอขวดเลียบคลองประสบความสำเร็จ ทะลวงแนวปิดล้อมมุ่งหน้าสู่แผ่นดินกว้างภายนอก';
  }

  if (allies > 0) {
    witnessText =
      'ผู้รอดชีวิตตามจุดหลบภัยริมคลองเฝ้ามองแถวฝูงที่เคลื่อนผ่านไปอย่างมีระเบียบด้วยความทึ่งปนหวาดเกรง โดยไม่มีใครถูกทำร้าย';
  } else if (killed >= 10 && allies === 0) {
    witnessText =
      'ทหารที่ด่านตรวจและผู้รอดชีวิตต่างมองดูฝูงที่เคลื่อนผ่านไปด้วยความสะพรึงกลัวอย่างที่สุด กลิ่นอายของการสังหารหมู่ที่นำโดยเจ้าทำให้ไม่มีใครกล้าแม้แต่จะขยับตัวขวางทาง';
  } else if (killed > 0 && allies === 0) {
    witnessText =
      'ทหารและหน่วยลาดตระเวนที่ด่านตรวจต่างแตกพ่ายถอยร่นเมื่อเผชิญกับฝูงผู้ติดเชื้อที่เคลื่อนพลอย่างมีแบบแผน';
  } else {
    witnessText =
      'เสียงสะท้อนริมคลองแสนแสบค่อย ๆ เงียบลงเมื่อแถวฝูงลับสายตาไปพ้นแนวด่านตรวจ';
  }

  return {
    title: customOverride?.title || state?.ending?.title || 'นำฝูงตีฝ่าวงล้อมด่านกรุงเทพฯ',
    text: `${coreText} ${lifeTraceText} ${witnessText}`,
  };
}

export const tailorPilotEndingPresentation = tailorEndingPresentation;

function getDefaultEndingTitle(id: TailoredEndingId): string {
  switch (id) {
    case 'king':
      return 'ราชาแห่งผู้ไร้ชีพจร';
    case 'human':
      return 'หัวใจเต้นอีกครั้ง';
    case 'escape_companion':
      return 'ออกเดินทางพ้นเขตกักกันกรุงเทพฯ';
    case 'evolved':
      return 'สิ่งมีชีวิตลำดับถัดไป';
    case 'extinction':
      return 'โลกที่ไม่มีใครตอบกลับ';
    case 'silent_guardian':
      return 'ผู้เฝ้าประตูเงียบงันแห่งเขตกักกันกรุงเทพฯ';
    case 'conscious_exile':
      return 'ล่องเรือพ้นแม่น้ำเจ้าพระยาก่อนฟ้าสาง';
    case 'horde_breakout':
      return 'นำฝูงตีฝ่าวงล้อมด่านกรุงเทพฯ';
  }
}
