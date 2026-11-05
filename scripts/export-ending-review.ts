import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {ORGANIC_ENDING_CLIMAX_EVENTS} from '../src/data/externalEventsPack';
import {DYNAMIC_NARRATIVE_EVENTS} from '../src/data/eventEngine';
import {getTriggeredEndingClimaxModal,getSliceOfLifeAndEscapeEndings,deriveCauseOfDeath} from '../src/data/pastLifeEchoes';
import {getEndingReadiness,PROGRESSION_ROUTES} from '../src/data/progressionRules';
import {ENDING_REFLECTIONS} from '../src/data/endingPresentation';

const out=path.resolve(process.env.ENDING_REVIEW_DIR || 'docs/ending-review');fs.mkdirSync(path.join(out,'source'),{recursive:true});
const context={window:{} as any},bundle=fs.readFileSync('public/after-zero-bundle.js','utf8');
vm.runInNewContext(bundle,context);
const P=context.window.AfterZeroEngine.Production,C=P.catalog;
const stringify=(data:any)=>JSON.stringify(data,(_key,value)=>typeof value==='function'?{functionSource:value.toString()}:value,2);
const write=(name:string,data:any)=>fs.writeFileSync(path.join(out,name),typeof data==='string'?data:stringify(data)+'\n','utf8');
const endings=Object.entries(C.ENDINGS).map(([id,definition])=>({
  id,definition,
  coreActions:C.ACTIONS.filter((a:any)=>a.ending===id),
  coreEvents:C.EVENTS.filter((e:any)=>stringify(e).includes(`"${id}"`)&&/ending/.test(stringify(e))),
  climaxEvents:ORGANIC_ENDING_CLIMAX_EVENTS.filter(e=>e.choices.some(c=>c.effects.triggerEndingId===id)),
  dynamicEvents:DYNAMIC_NARRATIVE_EVENTS.filter(e=>stringify(e).includes(`"${id}"`)),
  progressionGuard:PROGRESSION_ROUTES.filter(r=>r.endings.includes(id)),
}));
write('01-ending-catalog.json',endings);
write('02-rules-and-dynamic-text.json',{
  maxDay:P.engine.MAX_DAY,places:C.PLACES,
  readiness:getEndingReadiness.toString(),climaxSelector:getTriggeredEndingClimaxModal.toString(),
  legacySliceOptions:getSliceOfLifeAndEscapeEndings.toString(),causeOfDeath:deriveCauseOfDeath.toString(),
  reflections:ENDING_REFLECTIONS,
  notes:[
    'แต่ละ action หรือ climax เป็นทางเลือก OR ภายในทางนั้นเงื่อนไขที่บังคับต้องผ่านทั้งหมด (AND) ห้ามรวมทุกทางเป็นเงื่อนไขชุดเดียว',
    'Core actions ใช้ requirements/min/cost/places ตาม object จริง; UI climax ต้องผ่าน selector และ getEndingReadiness ด้วย',
    'climax เลือกได้เมื่อไม่มี pending/ending, place radio เทียบเป็น tower, cooldown ใช้ช่วง floor(day/4), เลือกถอยได้',
    'requiresMaxTrustNpcInZone ใน selector ค้น NPC ที่ยังมีชีวิตและ trust>=100 ในทุกเขตด้วย ไม่ได้จำกัดเขตปัจจุบัน',
    'legacySliceOptions มี handler ใน App แต่ปัจจุบันไม่มีปุ่มเรียก handler นี้: แยกเป็นโค้ดสำรอง ไม่ถือเป็นเส้นทาง UI ที่เข้าถึงได้',
    'legacySliceOptions ปรับเกณฑ์และข้อความให้ตรงกับ climaxEvents แล้ว (silent_guardian: day>=14, zoneTrust>=20, saved>=2; conscious_exile: day>=12, killed===0)',
    'survivor core เมื่อถึง MAX_DAY ถูกส่ง cause bombardment; ตรวจความสอดคล้องคำว่าอยู่รอดกับสาเหตุโดยรายงานแยก',
    'memory.saved เป็นจำนวนครั้งที่ช่วย ไม่รับประกันจำนวนคนไม่ซ้ำ; memory.killed ไม่นับการกินศพโดยอัตโนมัติ',
    'horde เป็นอำนาจควบคุมฝูง ไม่ใช่จำนวนซอมบี้; พันธมิตรในหน้าจบคือ NPC ยังมีชีวิต trust>=85 นับ storyNpcKey ซ้ำเพียงครั้งเดียว',
  ],
});
const sources=['public/after-zero-bundle.js','src/App.tsx','src/data/pastLifeEchoes.ts','src/data/externalEventsPack.ts','src/data/eventEngine.ts','src/data/progressionRules.ts','src/data/progressionRoutes.json','src/data/bangkokLocations.json','src/data/endingPresentation.ts','src/components/EndingExperience.tsx'];
for(const file of sources)fs.copyFileSync(file,path.join(out,'source',path.basename(file)+'.txt'));
const forced=bundle.slice(bundle.indexOf('function finishDay(s, endingCandidate)'),bundle.indexOf('function adjusted(s, action)'));
write('03-forced-endings.txt',forced+'\n\nApp.tsx: ตรวจ handleResolveLifeSimModal, handleSurrenderToZombieInstinct และ handleTriggerSliceOfLifeEnding ใน source/App.tsx.txt สำหรับการจบที่ UI สั่งโดยตรง');
write('ENDINGS-อ่านก่อนรีวิว.md',`# AFTER ZERO — รีวิวฉากจบเดิมทั้งหมด (${endings.length} ID)\n\nข้อมูลจาก source ปัจจุบัน สคริปต์สร้างใหม่ได้ด้วย node --import tsx scripts/export-ending-review.ts\n\nอ่าน 02-rules-and-dynamic-text.json ก่อน: โค้ด selector เป็นเงื่อนไขที่ใช้จริง ไม่ใช่ทุก field ใน type จะถูกตรวจเสมอ คำบรรยาย dynamic และสาเหตุการจบมีหลายแขนง ต้องรีวิวด้วย\n\nแต่ละรายการด้านล่างแนบค่าจริงของ action/conditions/effects/guard ไว้ครบ; โค้ด source ฉบับเต็มอยู่ใน source/*.txt เพื่อให้ตรวจเงื่อนไขซ้อนและลำดับผลได้\n\n${endings.map((entry:any)=>`## ${entry.id} — ${entry.definition.title}\n\n${entry.definition.text}\n\n### เงื่อนไขและทางเข้า (JSON จากระบบจริง)\n\n\`\`\`json\n${stringify(entry)}\n\`\`\`\n`).join('\n')}\n## การจบอัตโนมัติ\n\n${'```js'}\n${forced}\n${'```'}\n`);
write('PROMPT-รีวิวฉากจบ.md',`คุณเป็นบรรณาธิการภาษาไทยและผู้ตรวจความต่อเนื่องของเกม AFTER ZERO ในกรุงเทพฯ ปี 2026\n\nงานนี้แก้ภาษาเท่านั้น ใช้ฉากจบเดิมทุก ID ใน 01-ending-catalog.json ห้ามสร้างฉากจบใหม่ ห้ามแก้เงื่อนไข สมดุล ค่า stat ผลลัพธ์ flag หรือโค้ดเกม\n\nอ่าน ENDINGS-อ่านก่อนรีวิว.md, 02-rules-and-dynamic-text.json, 03-forced-endings.txt และ source ที่เกี่ยวข้องก่อนเริ่ม ถ้าไฟล์ไม่ครบให้ระบุข้อจำกัด ห้ามเดาเงื่อนไข\n\nกติกาเรื่อง:\n- ผู้เล่นเป็นซอมบี้ที่ยังมีสติ อายุ10–80 เพศและอาชีพสุ่ม ห้ามสมมติเป็นชาย ผู้ใหญ่ ทหาร หรือมีคนรักทุกคน\n- อิ่มจากเลือดหรือเนื้อมนุษย์ อาหารกระป๋องเลี้ยงคนเป็น น้ำเกลือไม่ใช่อาหารซอมบี้\n- ผู้เล่นเลือกทนหิวได้ การฆ่า กินศพ และช่วยคนเป็นคนละตัวนับ\n- Kill Count มีทุกฉากจบ ห้ามตัดสินคนดี/คนเลวจากตัวเลขอย่างเดียว และห้ามอ้างว่าไม่เคยฆ่าเมื่อเงื่อนไขไม่ได้บังคับ killed=0\n- อำนาจฝูงไม่ใช่จำนวนลูกฝูง ไม่มีระบบนับจำนวนฝูง\n- วันจบขึ้นกับทางเข้าจริง ห้ามสมมติว่าเป็นวันที่120 หรือถึงวันที่30 หากทางนั้นไม่ได้บังคับ\n- NPC มีความกลัวและต้องสร้างความไว้ใจ ห้ามกล่าวว่าทั้งเมืองรักเรา หรือทุกคนรอด หากไม่มีผลระบบรองรับ\n\nขอบเขต:\n1. ตรวจทุก ending definition.title/text, ข้อความ climax ก่อนยืนยัน, ตัวเลือก/note/outcome, title/text dynamic ใน selector และ helper, causeOfDeath ทุกแขนง และ ENDING_REFLECTIONS ที่หน้าจบใช้\n2. แยกทางเข้า OR: core action, UI climax, การจบอัตโนมัติ และ helper สำรองที่ยังไม่ได้ผูกปุ่ม ภายในแต่ละทางแจกแจง AND/OR ให้ตรงโค้ด\n3. ระบุสถานที่ วันต่ำสุด/สูงสุด stat/items ต้นทุน flag ความสัมพันธ์ NPC และตัวนับ saved/killed รวมทั้งลำดับการตายที่อาจแซงฉากจบ\n4. รักษา template placeholder เช่นชื่อ NPC บทบาท จำนวนคนและสถานที่ ห้ามแทนด้วยชื่อคนจริงตายตัว ห้ามแก้ตัวแปร\n5. เกลาถ้อยคำให้เป็นไทย อ่านบนมือถือได้ กระชับ เห็นภาพ มีความสำเร็จ ความสูญเสียหรือความค้างคาตามผลที่เกิดจริง โดยไม่เพิ่มเหตุการณ์ใหม่\n6. ถ้าบทขัดกับกลไก แยกเป็นข้อขัดแย้ง อย่าแก้ระบบหรือแต่งข้อเท็จจริงกลบปัญหา ให้เสนอถ้อยคำที่ไม่กล่าวเกินเงื่อนไขเมื่อทำได้\n\nรูปแบบผลลัพธ์:\n- ตาราง coverage ทุก ID: ตรวจแล้ว/ไม่ต้องแก้/เสนอแก้/ข้อมูลไม่พอ พร้อมทุกทางเข้าที่พบ\n- แต่ละข้อเสนอ: source file, endingId/eventId, field path, เงื่อนไขที่ผูก (แยกทาง), ข้อความเดิม, ข้อความเสนอใหม่, เหตุผล\n- สำหรับ dynamic text ระบุ expression/placeholder เดิมครบ และยกตัวอย่างอย่างน้อย2สถานะที่ได้ผลต่างกัน\n- รายงานข้อขัดแย้งภาษา/ระบบแยก พร้อมหลักฐานโค้ด ไม่อ้างว่าแก้แล้ว\n- ปิดท้ายตรวจว่าไม่เพิ่ม/ลบ ending ID และไม่ได้เปลี่ยนเงื่อนไขเกม\n\nส่งข้อเสนอมาให้ผู้พัฒนารวม ยังไม่แก้ repository และยังไม่เผยแพร่\n`);
write('manifest.json',{exportedAt:new Date().toISOString(),endingCount:endings.length,endingIds:endings.map(e=>e.id),sources});
console.log(`Exported ${endings.length} existing endings to ${out}`);
