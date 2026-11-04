import assert from 'node:assert/strict';
import {
  deriveCauseOfDeath,
  deriveDeathEndingPresentation,
  buildPastLifeRecordFromState,
  HIGH_KILLS_THRESHOLD,
  type CharacterBioDossier,
} from '../src/data/pastLifeEchoes';

const sampleBio = {
  id: 'test-bio-1',
  age: 35,
  gender: 'ชาย',
  occupation: 'วิศวกรซ่อมบำรุง',
  clothingClue: 'เสื้อช่างสีกรมท่าเปื้อนคราบน้ำมัน',
  personalItemClue: 'พวงกุญแจไขตู้ควบคุม',
  daysInfectedEstimate: 5,
} as unknown as CharacterBioDossier;

console.log('--- เริ่มการทดสอบฉากจบการตายตามสาเหตุและพฤติกรรม (AFTER ZERO) ---');

// Case 1: หิวตาย โดยไม่เคยฆ่าคนและไม่เคยกินศพ
{
  const state = {
    day: 10,
    place: 'shelter',
    stats: { hp: 0, hunger: 90, sanity: 40 },
    body: { starvationDays: 3 },
    memory: { killed: 0, corpseMeals: 0, saved: 0, endured: 4 },
    ending: { id: 'death', causeCode: 'starvation' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'STARVATION');
  assert.equal(presentation.title, 'ซอมบี้ผู้กินเจ (ผู้ไม่ยอมกินใคร)');
  assert(presentation.text.includes('ดื้อรั้นที่จะไม่กินใคร'));
  assert(!presentation.text.includes('เลือด')); // ห้ามกล่าวว่าไม่เคยดื่มเลือด หากระบบไม่ได้ติดตามข้อมูลนี้

  const record = buildPastLifeRecordFromState(state, null, 1, sampleBio);
  assert.equal(record.endingTitle, presentation.title);
  assert.equal(record.causeOfDeath?.code, 'STARVATION');
  assert.equal(record.deeds.killedHumans, 0);
  assert.equal(record.deeds.corpseMeals, 0);
  console.log('✓ Case 1 ผ่าน: หิวตาย โดยไม่เคยฆ่าคนและไม่เคยกินศพ -> "ซอมบี้ผู้กินเจ (ผู้ไม่ยอมกินใคร)"');
}

// Case 2: หิวตาย ทั้งที่เคยฆ่าคนจำนวนมาก (>= 5 คน)
{
  const state = {
    day: 25,
    place: 'streets',
    stats: { hp: 0, hunger: 95, sanity: 20 },
    body: { starvationDays: 2 },
    memory: { killed: HIGH_KILLS_THRESHOLD + 2, corpseMeals: 1, saved: 0, endured: 1 },
    ending: { id: 'death', causeCode: 'starvation' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'STARVATION');
  assert.equal(presentation.title, 'ความหิวที่ไม่มีวันพอ');
  assert(presentation.text.includes('หลุมดำในร่างนี้ไม่เคยถูกเติมเต็มได้จริง'));
  assert(presentation.text.includes(String(HIGH_KILLS_THRESHOLD + 2)));

  const record = buildPastLifeRecordFromState(state, null, 1, sampleBio);
  assert.equal(record.endingTitle, presentation.title);
  console.log('✓ Case 2 ผ่าน: หิวตาย ทั้งที่เคยฆ่าคนจำนวนมาก -> "ความหิวที่ไม่มีวันพอ"');
}

// Case 3: หิวตาย เคยกินศพแต่ไม่เคยฆ่าคน
{
  const state = {
    day: 14,
    place: 'hospital',
    stats: { hp: 0, hunger: 88, sanity: 35 },
    body: { starvationDays: 2 },
    memory: { killed: 0, corpseMeals: 3, saved: 1, endured: 2 },
    ending: { id: 'death', causeCode: 'starvation' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'STARVATION');
  assert.equal(presentation.title, 'ผู้เก็บเศษซากที่ไร้ทางไป');
  assert(presentation.text.includes('ประทังความหิวด้วยร่างของผู้ที่จากไปแล้ว 3 ครั้ง'));
  assert(presentation.text.includes('โดยตั้งมั่นที่จะไม่ลงมือพรากชีวิตคนเป็น'));

  const record = buildPastLifeRecordFromState(state, null, 1, sampleBio);
  assert.equal(record.endingTitle, presentation.title);
  assert.equal(record.deeds.corpseMeals, 3);
  assert.equal(record.deeds.killedHumans, 0);
  console.log('✓ Case 3 ผ่าน: หิวตาย เคยกินศพแต่ไม่เคยฆ่าคน -> "ผู้เก็บเศษซากที่ไร้ทางไป"');
}

// Case 4: หิวตาย เคยฆ่าคนบ้างแต่ไม่ถึงระดับจำนวนมาก (1-4 คน)
{
  const state = {
    day: 18,
    place: 'radio',
    stats: { hp: 0, hunger: 92, sanity: 30 },
    body: { starvationDays: 2 },
    memory: { killed: 2, corpseMeals: 0, saved: 0, endured: 2 },
    ending: { id: 'death', causeCode: 'starvation' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'STARVATION');
  assert.equal(presentation.title, 'การข้ามเส้นที่ซื้อเวลาได้ชั่วคราว');
  assert(presentation.text.includes('ซื้อเวลาให้ร่างนี้ก้าวเดินต่อได้เพียงไม่กี่วัน'));

  const record = buildPastLifeRecordFromState(state, null, 1, sampleBio);
  assert.equal(record.endingTitle, presentation.title);
  console.log('✓ Case 4 ผ่าน: หิวตาย เคยฆ่าคนบ้าง (2 คน) -> "การข้ามเส้นที่ซื้อเวลาได้ชั่วคราว"');
}

// Case 5A: ถูกมนุษย์ทำร้ายจนตาย (เคยช่วยผู้รอดชีวิต)
{
  const state = {
    day: 12,
    place: 'radio',
    stats: { hp: 0, hunger: 40, sanity: 50 },
    memory: { killed: 0, corpseMeals: 0, saved: 3, endured: 1 },
    ending: { id: 'death', causeCode: 'human_attack' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'HUMAN_ATTACK');
  assert.equal(presentation.title, 'กระสุนของความหวาดระแวง');
  assert(presentation.text.includes('เคยยื่นมือเข้าช่วยเหลือผู้รอดชีวิตไว้ 3 ครั้ง'));
  assert(!presentation.text.includes('นวล') && !presentation.text.includes('มะลิ')); // ไม่แต่งว่า NPC ใดเป็นผู้ฆ่า

  const record = buildPastLifeRecordFromState(state, null, 1, sampleBio);
  assert.equal(record.endingTitle, presentation.title);
  console.log('✓ Case 5A ผ่าน: ถูกมนุษย์ทำร้ายจนตาย (เคยช่วยคน) -> "กระสุนของความหวาดระแวง"');
}

// Case 5B: ถูกมนุษย์ทำร้ายจนตาย (เคยออกล่า / ฆ่าคน)
{
  const state = {
    day: 16,
    place: 'streets',
    stats: { hp: 0, hunger: 50, sanity: 25 },
    memory: { killed: 3, corpseMeals: 1, saved: 0, endured: 0 },
    ending: { id: 'death', causeCode: 'human_attack' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'HUMAN_ATTACK');
  assert.equal(presentation.title, 'จุดจบของนักล่า');
  assert(presentation.text.includes('เมืองนี้จำรอยเลือดและกลิ่นคาว'));

  const record = buildPastLifeRecordFromState(state, null, 1, sampleBio);
  assert.equal(record.endingTitle, presentation.title);
  console.log('✓ Case 5B ผ่าน: ถูกมนุษย์ทำร้ายจนตาย (เคยออกล่า) -> "จุดจบของนักล่า"');
}

// Case 5C: ถูกมนุษย์ทำร้ายจนตาย (ไม่เคยช่วยและไม่เคยฆ่า)
{
  const state = {
    day: 7,
    place: 'streets',
    stats: { hp: 0, hunger: 50, sanity: 30 },
    memory: { killed: 0, corpseMeals: 0, saved: 0, endured: 0 },
    ending: { id: 'death', causeCode: 'human_attack' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'HUMAN_ATTACK');
  assert.equal(presentation.title, 'เหยื่อของความตื่นตระหนก');
  assert(presentation.text.includes('ในโลกที่คนเป็นมองเห็นเพียงความตาย'));

  const record = buildPastLifeRecordFromState(state, null, 1, sampleBio);
  assert.equal(record.endingTitle, presentation.title);
  console.log('✓ Case 5C ผ่าน: ถูกมนุษย์ทำร้ายจนตาย (ทั่วไป) -> "เหยื่อของความตื่นตระหนก"');
}

// Case 6: กฎสำคัญ — ความหิวสูงมาก (95/100) แต่ถูกมนุษย์ยิงตาย ต้องเป็น HUMAN_ATTACK ไม่กลายเป็นหิวตาย!
{
  const state = {
    day: 15,
    place: 'streets',
    stats: { hp: 0, hunger: 95, sanity: 15 },
    body: { starvationDays: 3 },
    memory: { killed: 0, corpseMeals: 0, saved: 2, endured: 3 },
    log: [{ text: '[ภัยพื้นที่ 80/100 · โอกาสปะทะ 45% — ฉากที่ 8/15: ถูกยิงจากหน้าต่างชั้นสอง] (สภาพร่าง -15)' }],
    ending: { id: 'death', causeCode: 'human_attack' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'HUMAN_ATTACK', 'ความหิวสูงแต่ถูกโจมตีตาย ต้องได้ HUMAN_ATTACK');
  assert.equal(presentation.title, 'กระสุนของความหวาดระแวง');
  console.log('✓ Case 6 ผ่าน (กฎสำคัญ): หิวสูง 95/100 แต่ถูกโจมตีตาย -> ไม่กลายเป็นหิวตาย แต่ระบุเป็น HUMAN_ATTACK อย่างถูกต้อง');
}

// Case 7: ตายจากสิ่งแวดล้อม (ความหนาว / ฝนเขม่า)
{
  const state = {
    day: 8,
    place: 'streets',
    stats: { hp: 0, hunger: 60, sanity: 30 },
    log: [{ text: 'ละอองฝนเขม่าดำและไอหนาวสั่นกัดกร่อนร่างกาย' }],
    ending: { id: 'death', causeCode: 'hypothermia' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'HYPOTHERMIA');
  assert.equal(presentation.title, 'เถ้าถ่านและความเย็นเยียบ');

  const record = buildPastLifeRecordFromState(state, null, 1, sampleBio);
  assert.equal(record.endingTitle, presentation.title);
  console.log('✓ Case 7 ผ่าน: ตายจากสิ่งแวดล้อม (ฝนเขม่า/หนาว) -> "เถ้าถ่านและความเย็นเยียบ"');
}

// Case 8A: ร่างพังจากบาดแผลสะสมยาวนาน (day >= 20)
{
  const state = {
    day: 28,
    place: 'shelter',
    stats: { hp: 0, hunger: 60, sanity: 40 },
    memory: { killed: 0, corpseMeals: 0, saved: 0, endured: 5 },
    ending: { id: 'death', causeCode: 'fatal_trauma' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'FATAL_TRAUMA');
  assert.equal(presentation.title, 'กระดูกและเนื้อเยื่อที่หมดอายุขัย');
  assert(presentation.text.includes('28 วัน'));

  const record = buildPastLifeRecordFromState(state, null, 1, sampleBio);
  assert.equal(record.endingTitle, presentation.title);
  console.log('✓ Case 8A ผ่าน: ร่างพังจากบาดแผลสะสมยาวนาน (วันที่ 28) -> "กระดูกและเนื้อเยื่อที่หมดอายุขัย"');
}

// Case 8B: ร่างพังจากอุบัติเหตุทั่วไป (Fallback วันที่น้อย)
{
  const state = {
    day: 5,
    place: 'hospital',
    stats: { hp: 0, hunger: 50, sanity: 40 },
    memory: { killed: 0, corpseMeals: 0, saved: 0, endured: 0 },
    ending: { id: 'death', causeCode: 'fatal_trauma' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'FATAL_TRAUMA');
  assert.equal(presentation.title, 'ร่างที่แหลกสลายกลางซากเมือง');

  const record = buildPastLifeRecordFromState(state, null, 1, sampleBio);
  assert.equal(record.endingTitle, presentation.title);
  console.log('✓ Case 8B ผ่าน: ร่างพังจากอุบัติเหตุทั่วไป (ฉากสำรอง) -> "ร่างที่แหลกสลายกลางซากเมือง"');
}

// Case 9: การทิ้งระเบิดวันสุดท้าย (Day 120 Bombardment) รักษาฉากเดิมไว้
{
  const state = {
    day: 120,
    place: 'streets',
    stats: { hp: 0, hunger: 50, sanity: 40 },
    ending: { id: 'death', causeCode: 'bombardment' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'BOMBARDMENT');
  assert.equal(presentation.title, 'เปลวเพลิงลบล้างเขตกักกันกรุงเทพฯ · ครบกำหนด 120 วัน');
  console.log('✓ Case 9 ผ่าน: การทิ้งระเบิดครบ 120 วัน -> รักษาฉากและสาเหตุ BOMBARDMENT เดิมไว้');
}

// Case 10: สละตนปกป้องคน (silent_guardian) รักษาฉากเดิมไว้
{
  const state = {
    day: 15,
    place: 'hospital',
    stats: { hp: 0, hunger: 50, sanity: 40 },
    ending: { id: 'silent_guardian' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'HEROIC_SACRIFICE');
  assert.equal(presentation.title, 'ผู้เฝ้าประตูเงียบงันแห่งเขตกักกันกรุงเทพฯ');
  console.log('✓ Case 10 ผ่าน: สละตนปกป้องคน (silent_guardian) -> ไม่กลายเป็นฉากตายทั่วไป');
}

// Case 11: ยอมจำนนต่อสัญชาตญาณดิบ (madness) รักษาฉากเดิมไว้
{
  const state = {
    day: 12,
    place: 'streets',
    stats: { hp: 50, hunger: 50, sanity: 0 },
    ending: { id: 'madness', title: 'สติถูกสัญชาตญาณดิบกลืนกิน' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'SURRENDER');
  console.log('✓ Case 11 ผ่าน: ยอมจำนนต่อสัญชาตญาณดิบ (madness) -> รักษาฉาก SURRENDER เดิมไว้');
}

// Case 12: เซฟเก่าข้อมูลไม่ครบ (Backward Compatibility)
{
  const legacyState = {
    // ไม่มี memory, ไม่มี body, ไม่มี flags
    stats: { hp: 0 },
    ending: { id: 'death', title: 'ตายเป็นครั้งที่สอง' }, // หัวข้อ generic เดิม
  };
  const presentation = deriveDeathEndingPresentation(legacyState, sampleBio);
  assert.equal(presentation.cause.code, 'FATAL_TRAUMA');
  // อัปเกรดจาก "ตายเป็นครั้งที่สอง" สู่ฉากสำรองที่สมจริง ไม่ fabricate ข้อมูล
  assert.equal(presentation.title, 'ร่างที่แหลกสลายกลางซากเมือง');
  assert(presentation.text.includes('ความเสียหายสะสม'));

  const record = buildPastLifeRecordFromState(legacyState, null, 1, sampleBio);
  assert.equal(record.endingTitle, 'ร่างที่แหลกสลายกลางซากเมือง');
  assert.equal(record.deeds.killedHumans, 0);
  assert.equal(record.deeds.savedHumans, 0);
  console.log('✓ Case 12 ผ่าน: เซฟเก่าข้อมูลไม่ครบ -> ทำงานได้อย่างปลอดภัย อัปเกรดชื่อฉากสำรอง ไม่แต่งประวัติเพิ่ม');
}

// Case 13: “เลือดถุงสุดท้ายที่ไม่ได้เปิด” — หิวตายทั้งที่ยังมีถุงเลือดในกระเป๋า
{
  const state = {
    day: 11,
    place: 'hospital',
    carriedBloodBags: 2,
    stats: { hp: 0, hunger: 92, sanity: 30 },
    body: { starvationDays: 2 },
    memory: { killed: 0, corpseMeals: 0, saved: 0, endured: 3 },
    ending: { id: 'death', causeCode: 'starvation' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'STARVATION');
  assert.equal(presentation.title, 'เลือดถุงสุดท้ายที่ไม่ได้เปิด');
  assert(presentation.text.includes('ถุงเลือดสำรองจำนวน 2 ถุงที่ยังไม่ได้เปิด'));
  assert(presentation.text.includes('เอื้อมไปหา'));

  const record = buildPastLifeRecordFromState(state, null, 1, sampleBio);
  assert.equal(record.endingTitle, presentation.title);
  assert.equal(record.deeds.carriedBloodBags, 2);
  console.log('✓ Case 13 ผ่าน: “เลือดถุงสุดท้ายที่ไม่ได้เปิด” -> หิวตายทั้งที่มีถุงเลือดพกพา 2 ถุง');
}

// Case 14: “ผู้แจกอาหารที่ตัวเองกินไม่ได้” — หิวตาย หลังช่วยชีวิตคนไว้หลายครั้ง
{
  const state = {
    day: 19,
    place: 'shelter',
    carriedBloodBags: 0,
    stats: { hp: 0, hunger: 95, sanity: 45 },
    body: { starvationDays: 3 },
    memory: { killed: 0, corpseMeals: 0, saved: 4, endured: 5 },
    ending: { id: 'death', causeCode: 'starvation' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'STARVATION');
  assert.equal(presentation.title, 'ผู้แจกอาหารที่ตัวเองกินไม่ได้');
  assert(presentation.text.includes('ช่วยชีวิตผู้รอดชีวิตไว้ถึง 4 ครั้ง'));
  assert(presentation.text.includes('อาหารที่ร่างกายอันตายด้านนี้ไม่มีวันได้กินอีกต่อไป'));

  const record = buildPastLifeRecordFromState(state, null, 1, sampleBio);
  assert.equal(record.endingTitle, presentation.title);
  assert.equal(record.deeds.savedHumans, 4);
  console.log('✓ Case 14 ผ่าน: “ผู้แจกอาหารที่ตัวเองกินไม่ได้” -> หิวตายหลังช่วยคนไว้หลายครั้ง (4 ครั้ง)');
}

// Case 15: “สัตว์ประหลาดในสายตาคนเป็น” — ถูกมนุษย์ทำร้ายจนตาย หลังเคยฆ่าคนจำนวนมาก (>= 5 คน)
{
  const state = {
    day: 22,
    place: 'streets',
    stats: { hp: 0, hunger: 30, sanity: 20 },
    memory: { killed: 6, corpseMeals: 1, saved: 1, endured: 0 },
    ending: { id: 'death', causeCode: 'human_attack' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'HUMAN_ATTACK');
  assert.equal(presentation.title, 'สัตว์ประหลาดในสายตาคนเป็น');
  assert(presentation.text.includes('เคยพรากชีวิตคนเป็นไปถึง 6 คน'));
  assert(presentation.text.includes('อสูรกายในสายตาคนเป็น'));

  const record = buildPastLifeRecordFromState(state, null, 1, sampleBio);
  assert.equal(record.endingTitle, presentation.title);
  assert.equal(record.deeds.killedHumans, 6);
  console.log('✓ Case 15 ผ่าน: “สัตว์ประหลาดในสายตาคนเป็น” -> ถูกคนเป็นรุมฆ่าหลังฆ่าคนสะสม 6 คน');
}

// Case 16: “ยังไม่ได้กลายเป็นคน แต่ก็ไม่เคยเลิกเป็นคน” — ตายโดยมีความเป็นมนุษย์สูง ไม่เคยฆ่า และเคยช่วยชีวิตผู้อื่น
{
  const state = {
    day: 14,
    place: 'shelter',
    stats: { hp: 0, hunger: 40, sanity: 70, humanity: 75, horde: 10, mutation: 20 },
    memory: { killed: 0, corpseMeals: 0, saved: 3, endured: 2 },
    ending: { id: 'death', causeCode: 'fatal_trauma' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'FATAL_TRAUMA');
  assert.equal(presentation.title, 'ยังไม่ได้กลายเป็นคน แต่ก็ไม่เคยเลิกเป็นคน');
  assert(presentation.text.includes('ไม่เคยยอมให้ความกระหายพรากจิตวิญญาณไป'));
  assert(presentation.text.includes('ช่วยชีวิตผู้รอดชีวิตไว้ถึง 3 ครั้ง'));

  const record = buildPastLifeRecordFromState(state, null, 1, sampleBio);
  assert.equal(record.endingTitle, presentation.title);
  assert.equal(record.deeds.humanityScore, 75);
  assert.equal(record.deeds.savedHumans, 3);
  assert.equal(record.deeds.killedHumans, 0);
  console.log('✓ Case 16 ผ่าน: “ยังไม่ได้กลายเป็นคน แต่ก็ไม่เคยเลิกเป็นคน” -> บาดแผลตาย แต่คงมนุษยธรรมสูง ไม่เคยฆ่า ช่วยคน');
}

// Case 17: “จ่าฝูงผู้เงียบเสียง” — ตายขณะมีอำนาจควบคุมฝูงสูง (horde >= 40)
{
  const state = {
    day: 16,
    place: 'nest',
    stats: { hp: 0, hunger: 40, sanity: 30, humanity: 20, horde: 55, mutation: 30 },
    memory: { killed: 2, corpseMeals: 1, saved: 0, endured: 1 },
    ending: { id: 'death', causeCode: 'fatal_trauma' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'FATAL_TRAUMA');
  assert.equal(presentation.title, 'จ่าฝูงผู้เงียบเสียง');
  assert(presentation.text.includes('ฝูงผู้ติดเชื้อที่เคยเดินตามคำสั่งของเจ้า'));
  assert(presentation.text.includes('เสียงคำรามนำทางและสัญญาณที่เคยรวบรวมพวกมันให้เป็นหนึ่งเดียวได้ดับวูบลง'));

  const record = buildPastLifeRecordFromState(state, null, 1, sampleBio);
  assert.equal(record.endingTitle, presentation.title);
  assert.equal(record.deeds.hordeScore, 55);
  console.log('✓ Case 17 ผ่าน: “จ่าฝูงผู้เงียบเสียง” -> ตายขณะคุมฝูงสูง (horde = 55)');
}

// Case 18: “วิวัฒนาการที่ช่วยไว้ไม่ทัน” — ร่างกลายพันธุ์สูง (mutation >= 50) แต่ตายจากบาดแผล
{
  const state = {
    day: 17,
    place: 'streets',
    stats: { hp: 0, hunger: 45, sanity: 35, humanity: 25, horde: 15, mutation: 65 },
    memory: { killed: 1, corpseMeals: 1, saved: 0, endured: 2 },
    ending: { id: 'death', causeCode: 'fatal_trauma' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'FATAL_TRAUMA');
  assert.equal(presentation.title, 'วิวัฒนาการที่ช่วยไว้ไม่ทัน');
  assert(presentation.text.includes('เปลือกไคตินหนา'));
  assert(presentation.text.includes('วิวัฒนาการที่ก้าวหน้าเพียงใด ก็ยังมีขอบเขตที่ไม่อาจก้าวข้าม'));

  const record = buildPastLifeRecordFromState(state, null, 1, sampleBio);
  assert.equal(record.endingTitle, presentation.title);
  assert.equal(record.deeds.mutationScore, 65);
  console.log('✓ Case 18 ผ่าน: “วิวัฒนาการที่ช่วยไว้ไม่ทัน” -> กลายพันธุ์สูง (mutation = 65) แต่ตายจากบาดแผล');
}

// Case 19: “ยังไม่ได้กลายเป็นคน แต่ก็ไม่เคยเลิกเป็นคน” ใน Hypothermia (ฝนเขม่า/หนาวเหน็บ)
{
  const state = {
    day: 9,
    place: 'streets',
    stats: { hp: 0, hunger: 50, sanity: 65, humanity: 80, horde: 5, mutation: 10 },
    memory: { killed: 0, corpseMeals: 0, saved: 2, endured: 1 },
    log: [{ text: 'ละอองฝนเขม่าดำและไอหนาวสั่นกัดกร่อนร่างกาย' }],
    ending: { id: 'death', causeCode: 'hypothermia' },
  };
  const presentation = deriveDeathEndingPresentation(state, sampleBio);
  assert.equal(presentation.cause.code, 'HYPOTHERMIA');
  assert.equal(presentation.title, 'ยังไม่ได้กลายเป็นคน แต่ก็ไม่เคยเลิกเป็นคน');
  assert(presentation.text.includes('ร่างที่เย็นเฉียบเคียงข้างหัวใจที่ไม่เคยละทิ้งความเป็นคน') || presentation.cause.title.includes('ร่างที่เย็นเฉียบเคียงข้างหัวใจที่ไม่เคยละทิ้งความเป็นคน'));
  assert(presentation.text.includes('ไม่เคยปลิดชีวิตใคร และเคยยื่นมือช่วยผู้รอดชีวิตไว้ 2 ครั้ง'));

  const record = buildPastLifeRecordFromState(state, null, 1, sampleBio);
  assert.equal(record.endingTitle, presentation.title);
  assert.equal(record.causeOfDeath?.code, 'HYPOTHERMIA');
  console.log('✓ Case 19 ผ่าน: “ยังไม่ได้กลายเป็นคน แต่ก็ไม่เคยเลิกเป็นคน” (Hypothermia) -> หนาวตายแต่คงมนุษยธรรมสูง');
}

console.log('\n========================================');
console.log('การทดสอบฉากจบการตายทุกกรณีผ่านทั้งหมด 100%!');
console.log('========================================');
