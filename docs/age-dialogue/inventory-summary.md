# AFTER ZERO — บัญชีข้อความสำหรับปรับตามวัย

สถานะ: สำรวจและจัดหมวดจาก source ปัจจุบัน ยังไม่เขียนบทใหม่ ไม่แก้โค้ดเกม เงื่อนไข effects flags costs หรือเซฟ

รากโปรเจกต์ปัจจุบัน: `C:/Users/thanachot/antigravity/ChoiceForge-Studio` ไฟล์ถูกย้ายจากโฟลเดอร์ย่อยระหว่างงาน ตรวจ hash แล้วเนื้อหา source เดิมไม่เปลี่ยน ข้อมูลหลักอยู่ใน [inventory.json](inventory.json)

## ผลนับและความหมาย

- เหตุการณ์ใน catalog ที่ไม่ซ้ำ **189 ID** จากเอนจิน/dynamic/roam/late crisis/climax; นิยามบทจบ **23 ID** แยกต่างหาก
- ต้นทางข้อความที่ไม่ซ้ำ **2257 ช่อง** เก็บการใช้จริง **2439 bindings**; รวม source ซ้ำออก **182 bindings** โดยยังเก็บบริบทครบใน occurrences
- รายการ scene/support **293 หน่วย** รวมฟังก์ชันประกอบฉาก วิกฤต NPC และ hazard จึงไม่ใช่จำนวนฉากเล่นทั้งหมด
- ช่องที่มีการใช้งานขาด stable ID **1199 ช่อง** ไม่ใช่จำนวน choice ที่ต้องเพิ่ม ID เพราะ text/note/outcome อาจเป็น choice เดียวกัน

| สถานะ | ช่องต้นทาง | ความหมาย |
|---|---:|---|
| needs_age_variant | 82 | มีหลักฐานปฏิกิริยาคนเป็นต่อผู้เล่นที่เห็นกัน เหมาะปรับตามวัย |
| neutral_is_appropriate | 1726 | ใช้ข้อความกลาง/ระบบ/เจตนาทางเลือกเดิมได้ |
| no_visible_age_context | 7 | ไม่เห็นผู้เล่นหรือเป็นสื่อบันทึก ไม่ให้รู้วัยโดยไม่มีเหตุ |
| needs_context_review | 442 | ยังต้องยืนยันบริบท binding หรืออายุชีวิตที่อ้างถึง |

การจัดสถานะเป็น conservative triage ด้วยหลักฐาน source และตรวจ pilot/visibility เฉพาะจุด ไม่ใช่คำอ้างว่าอ่านแบบบรรณาธิการครบทุกประโยค รายการ unknown ถูกคงไว้ตรง ๆ และไม่แต่งบริบทเพิ่ม

## ครอบคลุมต้นทางใดบ้าง

| Family | Scene/support units | ช่องต้นทางไม่ซ้ำ | Use-site bindings |
|---|---:|---:|---:|
| engine | 62 | 468 | 472 |
| district | 10 | 35 | 80 |
| route | 9 | 22 | 54 |
| travel | 18 | 98 | 189 |
| dynamic | 29 | 304 | 304 |
| roam | 49 | 572 | 572 |
| timeline | 14 | 270 | 270 |
| ending | 46 | 328 | 336 |
| past_life | 4 | 34 | 34 |
| npc | 3 | 57 | 59 |
| runtime_support | 2 | 2 | 2 |
| engine_runtime | 1 | 4 | 4 |
| npc_support | 31 | 33 | 33 |
| hazard | 15 | 30 | 30 |

ตัวเลข runtime อ้างอิง: engine 99 events / 272 choices; dynamic 29; external roam 45; late city crises 8; ending climaxes 8 การเดินทาง 18 ฉากอยู่ใน engine แล้ว และ late roam 4 ฉากอยู่ใน external roam แล้ว ห้ามนำทุกแถวบวกรวม

Fixed timeline ที่อยู่นอก catalog/static union เพิ่มอีก **6 ID**: `world-timeline-day3-ambulance`, `world-timeline-day4-blackrain`, `world-timeline-day6-airdrop`, `world-timeline-day8-blackout`, `world-timeline-day15-bangkok-bombing-leaflets`, `world-timeline-day30-chao-phraya-blockade` รวม ID คงที่ที่พบ **195 ID** ส่วน encounter ที่สร้างจาก NPC/day/เวลาไม่นับเป็น ID คงที่ใหม่ทุกครั้ง

## วิธีใช้ JSON แจกงาน

1. scenes บอกบริบท/เงื่อนไขต้นทาง; records เป็นงานข้อความที่ไม่ซ้ำตาม source expression
2. key ใช้ sourceFamily/eventId/choiceId/field ของจริง เมื่อขาด ID เก็บ null และใช้ auditId/source anchor สำหรับบัญชีเท่านั้น ไม่ได้เพิ่ม ID ลงเกม
3. originalText และ sourceExpression เก็บครบ ไม่ตัดข้อความ; function_source/template/expression เป็น source เต็ม ไม่ใช่ประโยคที่แต่งจากสถานะสมมติ ดู placeholders และ occurrences ประกอบ
4. occurrences เก็บผู้ใช้ข้อความเดียวกันทุกบริบท รวมคำที่ runtime ประกอบแล้ว เงื่อนไข และผลที่ห้ามเปลี่ยน; ห้ามแก้ต้นทาง shared โดยตรวจเพียง occurrence แรก
5. writerBatches.textAuditIds คือขอบเขตเจ้าของเพียงคนเดียว หากใช้ข้าม writers ให้ Integrator ถือ source นั้น
6. branchDiscriminatorRequired=true หมายถึง event/choice/field เดียวกันมีหลาย authored branch หรือ template เงา ต้องเลือก source ที่เกมใช้จริงก่อนเขียน
7. authoringReady=false และ missingStableIds ต้องถูกเตรียม/ตรวจต่อก่อนส่งเขียนจริง; ชื่อเสนอ choice_* ยังไม่ใช่ ID ของเกม

## แหล่งซ้อนกันที่ตัดการนับซ้ำแล้ว

- **src/data/travelDialogues.json + communityTravelDialogues.json** → catalog.EVENTS travel.*: นับ event เดียว ใช้ JSON เป็น canonical; ไม่แยก runtime catalog เป็นงานเขียนซ้ำ
- **communityEngineEvents.json** → catalog.EVENTS: นับครั้งเดียวตาม eventId; source JSON
- **bangkokLocations.json / progressionRoutes.json** → catalog district tasks/endings / route events: title/text ใน JSON ส่วนปุ่ม/note บางส่วนเป็นแม่แบบ shared ใน sync; รายงาน sharedSourceWith
- **COMMUNITY_DYNAMIC_EVENTS** → DYNAMIC_NARRATIVE_EVENTS: AST ต้นทาง communityEvents.ts เดียว ไม่ทำสำเนา event
- **LOCATION_ROAM_EVENTS + COMMUNITY_ROAM_EVENTS + LATE_GAME_ROAM_FOLLOWUP_EVENTS** → EXTERNAL_AI_ROAM_EVENTS: รวมตาม ID; lateRoam 4 รายการอยู่ใน external array แล้ว
- **npcRelationships.js** → bundle BEGIN NPC RELATIONSHIP RULES: ไม่นับ NPC posture/crisisNeed ซ้ำใน bundle
- **ORGANIC_ENDING_CLIMAX_EVENTS** → getTriggeredEndingClimaxModal dynamic title/text: เก็บข้อความฐานกับ runtime override เป็นคนละช่องใช้จริง พร้อมอ้าง selector; ไม่ถือเป็น event คนละชีวิต

## จุดเสี่ยงจากการอ่านข้อความ

| จุด | หลักฐาน | ผลที่ต้องรักษา |
|---|---|---|
| death-cause-prose | [src/App.tsx:1561](../../src/App.tsx#L1561) | ตรวจ modal.title/text/choice.outcomeText รวมกันเพื่ออนุมาน hypothermia/human_attack; ห้ามใช้ prose ตามวัยเป็น canonical mechanics |
| npc-crisis-need | [src/data/npcRelationships.js:83](../../src/data/npcRelationships.js#L83) | regex crisisText แยก rescue/medicine/supplies ส่งผลต่อการรับความช่วยเหลือ |
| npc-rescue-accounting | [src/data/npcInteractions.ts:41](../../src/data/npcInteractions.ts#L41) | regex target.crisisText ประกอบการตั้ง effects.saveLife; เปลี่ยนข้อความอาจเปลี่ยนการนับช่วยชีวิต |
| npc-signature-work | [src/data/pastLifeEchoes.ts:2710](../../src/data/pastLifeEchoes.ts#L2710) | regex bio.specialChoiceLabel เลือก trust 70 หรือ 20 สำหรับงานรักษา ห้ามเปลี่ยนป้ายคำจนกระทบเงื่อนไข |
| npc-armed-posture | [src/data/npcRelationships.js:75](../../src/data/npcRelationships.js#L75) | regex npc.role + npc.trait ตัดสิน armed และน้ำเสียงเตือน; biography/trait มีบทบาทเชิงกติกา |
| death-title-text-fallback | [src/data/pastLifeEchoes.ts:574](../../src/data/pastLifeEchoes.ts#L574) | ตรวจชื่อ/ข้อความ ending รวมกับ state เพื่อ fallback สาเหตุการตาย เซฟเก่าอาจขึ้นกับ prose |
| story-history-delimiter | [src/components/StoryFeed.tsx:32](../../src/components/StoryFeed.tsx#L32) | แยก title/choice ด้วยตัวคั่น “ — ” และ kind/story/day; เปลี่ยนตัวคั่นอาจทำให้ประวัติจับคู่ผิด |
| story-numeric-stripping | [src/components/StoryFeed.tsx:22](../../src/components/StoryFeed.tsx#L22) | regex ลบ prefix/วงเล็บตัวเลข/ผลแบบ +N; prose ใหม่ที่ตรงรูปอาจถูกตัดโดยไม่ตั้งใจ |
| nonspoiler-note-translation | [src/App.tsx:224](../../src/App.tsx#L224) | แปล note จากรูปแบบข้อความเชิงตัวเลขเป็นคำบรรยาย; ควรคง note canonical |
| npc-crisis-urgency | [src/data/pastLifeEchoes.ts:2722](../../src/data/pastLifeEchoes.ts#L2722) | คำว่าอดอาหาร/อดอยาก/เลือดไหล/ติดเชื้อ/ไข้สูงใน crisisText และบทบาทร้านค้าเปลี่ยนจังหวะตัวเลือก NPC |
| dynamic-npc-role-match | [src/data/eventEngine.ts:212](../../src/data/eventEngine.ts#L212) | npc.role.includes(req.roleIncludes) มีผลต่อการเลือก NPC และ trigger; อย่าเปลี่ยน role/trait เพื่อแต่งวัยผู้เล่น |
| relationship-note-patching | [src/data/npcRelationships.js:103](../../src/data/npcRelationships.js#L103) | rebalanceRelationshipCatalog แก้ note ตามรูปแบบความไว้ใจ; คง note canonical แยกจาก prose |
| legacy-choice-note-factory | [public/after-zero-bundle.js:3537](../../public/after-zero-bundle.js#L3537) | choiceNotes ตาม id และ index ถูกแนบใน event factory; เป็น source ซ้ำ/ตำแหน่งเปราะบาง ต้องมี stable source mapping ก่อนเขียน |
| bloodbank-prose-patch | [public/after-zero-bundle.js:3466](../../public/after-zero-bundle.js#L3466) | ปรับข้อความ bloodbank ด้วย literal replace; ถ้าต้นฉบับเปลี่ยน การแก้ lore อาจไม่ทำงานแม้เกมไม่ crash |

มี textReaderCandidates **33 จุดเรียก** พร้อม expression เต็มใน JSON บางจุดเป็นการจัดรูปแบบ/ค้นหา ไม่ใช่เปลี่ยนกติกา ต้องแยกจากจุดที่กระทบ death cause/rescue/availability

## ข้อความเดินทางไปที่ไหน

### engine/travel/district/route

- ต้นทาง: catalog.EVENTS, JSON + sync generator
- หน้าต่าง: Production.engine.pendingEvent → viewModel.pending → App pending dialog
- หลังเลือก: Production.engine.choose ใช้ event/choice จาก catalog และลง U.log
- ประวัติ: App.handleChoosePending อ่าน chosen จาก catalog อีกครั้ง → recordStoryResult; ประวัติย้อนหลังอ่าน next.log
- เซฟ: STORAGE_KEY_STATE ใน localStorage และ export JSON
- ข้อควรระวัง: แก้เฉพาะ UI ไม่เปลี่ยน log ที่ engine ลง; ต้องผูกข้อความ presentation และ log ให้ตรงโดยไม่เปลี่ยน effects

### dynamic

- ต้นทาง: eventEngine.ts, communityEvents.ts
- หน้าต่าง: getNextTriggeredDynamicEvent → buildLifeSimModalFromDynamicTemplate resolve function → currentActiveLifeSimModal → prepareNpcModal → dialog
- หลังเลือก: handleChooseLifeSimModalOption ใช้ choice.effects และ outcomeText
- ประวัติ: next.log + recordStoryResult → StoryFeed
- เซฟ: npcEncounter ถูกเซฟเมื่อเปิดบางสาย freeform; dynamic/timeline อื่นคำนวณจาก state/triggeredEchoIds; ต้องตรวจ freeze text ระหว่าง reload
- ข้อควรระวัง: แยก original mechanics ออกจาก age-aware display; ไม่แทรกการเปลี่ยนคำใน prepareNpcModal จนกระทบผล

### NPC/roam/timeline/ally/climax

- ต้นทาง: pastLifeEchoes.ts, externalEventsPack.ts, npcRelationships.js
- หน้าต่าง: builder/selector → LifeSimModalEvent → dialog
- หลังเลือก: handleChooseLifeSimModalOption หรือ executeEngineActionId
- ประวัติ: choice.outcomeText → next.log และ recordStoryResult
- เซฟ: gameState + npcZones + triggeredEchoIds และ npcEncounter สำหรับ freeform
- ข้อควรระวัง: ID บางแบบผูก NPC/day/Date.now/windowBucket; choices หลายแห่งไม่มี ID

### past-life echoes

- ต้นทาง: getOrganicEchoPopupForLocation, pastLives
- หน้าต่าง: activeOrganicEchoPopup → organic echo dialog
- หลังเลือก: handleChooseOrganicEchoOption ใช้ effects/outcomeLog
- ประวัติ: outcomeLog → log + recordStoryResult
- เซฟ: archive และ current save เก็บคนละชีวิต
- ข้อควรระวัง: อย่าใช้ age ของ life.bioDossier แทน currentBio หรือแก้ประวัติเดิมย้อนหลัง

### endings

- ต้นทาง: catalog.ENDINGS, deriveCauseOfDeath, deriveDeathEndingPresentation, endingPresentation.ts
- หน้าต่าง: effectiveGameState → EndingExperience
- หลังเลือก: ending id + cause code + state อาจ override catalog text
- ประวัติ: ending archive ผ่าน buildPastLifeRecordFromState
- เซฟ: past-life record + current ending
- ข้อควรระวัง: ต้องตรวจทุกทางเข้า OR ไม่ใช่ดู definition อย่างเดียว; legacy slice helper ยังไม่มีปุ่มเรียก

จุดเชื่อมสำคัญ: App.tsx recordStoryResult เก็บ latestStory แยกจาก next.log; handleChoosePending อ่าน catalog ซ้ำหลังเลือก ขณะที่ LifeSim ใช้ choice.outcomeText ลง log โดยตรง ต้องให้ข้อความที่เห็นและที่บันทึกตรงกัน ไม่เปลี่ยนแค่ตัว render

## Pilot 12 ฉาก — มี ID จริงครบ

เลือก NPC encounters ใน catalog หกฉากที่มี ID จริง จึงไม่ต้องสร้างหก ID สมมติให้ freeform modal เดียว ส่วน freeform NPC ยังคงถูกสำรวจและอยู่ในชุด Writer A พร้อมช่องขาด stable choice ID

| กลุ่ม | Event ID | ต้นทาง | เหตุผล/สิ่งที่ควรต่างตามวัย |
|---|---|---|---|
| NPC 1: คนบาดเจ็บขอความช่วยเหลือ | `prey` | [public/after-zero-bundle.js:250](../../public/after-zero-bundle.js#L250) | ท่าทีขอร้อง/ความระแวงต่อวัย โดยไม่ลดความเสี่ยงกลิ่นเลือด |
| NPC 2: คนที่เคยช่วยกลับมาขอบคุณ | `returned` | [public/after-zero-bundle.js:255](../../public/after-zero-bundle.js#L255) | การขอบคุณและยืนยันการรักษาระยะ ไม่เพิ่มของตอบแทน |
| NPC 3: พบเด็กที่ชั้นวางสินค้า | `shop` | [public/after-zero-bundle.js:283](../../public/after-zero-bundle.js#L283) | แยกวัยของ NPC เด็กออกจากวัยผู้เล่น และรักษาความกลัวต่อซอมบี้ |
| NPC 4: แพทย์หลังประตูกระจก | `doctor` | [public/after-zero-bundle.js:299](../../public/after-zero-bundle.js#L299) | ภาษาคำสั่งและความยินยอมให้ส่งตัวอย่าง ไม่อนุมานอาชีพจากวัย |
| NPC 5: นวลเฝ้าถุงเลือด | `next.clinic` | [public/after-zero-bundle.js:3554](../../public/after-zero-bundle.js#L3554) | น้ำเสียงเตือนและความขัดแย้งกับความหิว โดยยังคงอาวุธ/ข้อจำกัดเดิม |
| NPC 6: มาลีพบผู้เล่นต่อหน้า | `c42.reunion_quiet` | [public/after-zero-bundle.js:5337](../../public/after-zero-bundle.js#L5337) | ความลังเลและการรับรู้ผู้เล่นหลังเหตุการณ์เดิม |
| เดินทาง 1: รถเข็นติดรอยแตก | `travel.market_cart` | [src/data/travelDialogues.json:3](../../src/data/travelDialogues.json#L3) | การขอให้ช่วยหรือเตือนเรื่องเสบียงต่อวัย โดยไม่เปลี่ยนแรง/รางวัล |
| เดินทาง 2: คำเตือนที่ท่าเรือ | `travel.pier_rope` | [src/data/travelDialogues.json:9](../../src/data/travelDialogues.json#L9) | จังหวะคำเตือนและปฏิกิริยาของเด็กข้างลูกเรือต่อวัยผู้เล่น |
| เดินทาง 3: แบ่งชายคาหลบฝน | `travel.rain_awning` | [src/data/travelDialogues.json:14](../../src/data/travelDialogues.json#L14) | การยอมแบ่งพื้นที่แต่ยังรักษาระยะสำหรับแต่ละวัย |
| ต่อเนื่อง 1: นวลส่งยา | `dyn_nuan_antiseptic_relay` | [src/data/communityEvents.ts:157](../../src/data/communityEvents.ts#L157) | คำแนะนำดูแลแผลและน้ำเสียงที่อ้างความสัมพันธ์เดิม |
| ต่อเนื่อง 2: สมจิตร์ขอบคุณเรื่องยา | `dyn_somjit_wound_healed_gratitude` | [src/data/communityEvents.ts:652](../../src/data/communityEvents.ts#L652) | การแสดงความขอบคุณ ไม่สมมติว่าซอมบี้กินอาหารคนได้ |
| ต่อเนื่อง 3: พบคนใต้ชายคาอีกครั้ง | `dyn_travel_awning_distant_glance` | [src/data/communityEvents.ts:820](../../src/data/communityEvents.ts#L820) | ภาษากายรับรู้วัยจากระยะที่มองเห็น; คงผลการเคารพระยะจากครั้งก่อน |

ผู้ใหญ่ใช้ต้นฉบับได้ถ้าเหมาะแล้ว เปรียบเทียบเด็ก10–12/วัยรุ่น13–19/ผู้ใหญ่20–59/ผู้สูงอายุ60–80 ในบริบทเดียวกัน ห้ามเปลี่ยนผลเกมหรือเพิ่มการแยกเพศ

## ชุดงานไม่ทับกัน

| เจ้าของ | ช่องต้นทาง | ต้องแปรตามวัย | ต้องตรวจบริบท | หน้าที่ |
|---|---:|---:|---:|---|
| Writer A | 325 | 42 | 22 | NPC/ความสัมพันธ์และ pilot NPC |
| Writer B | 133 | 11 | 26 | เดินทาง/คนในย่าน |
| Writer C | 1436 | 29 | 194 | เหตุการณ์ต่อเนื่อง/สำรวจ/โลก |
| Integrator | 1 | 0 | 0 | ข้อความ shared หลายกลุ่ม/แม่แบบ generator ต้องรวมโดยคนเดียว |
| later | 362 | 0 | 200 | บทจบ/ความทรงจำ รอบหลัง |

ส่งชุดแรกเฉพาะ pilot ที่ตรวจเงื่อนไขและ ID แล้ว อย่าแจกช่อง neutral/system เป็นงานแต่งใหม่ทั้งหมด แต่ละชุดต้องแนบ originalText, occurrences, context, placeholders และ immutableFacts จาก JSON

## รายการขาด stable ID แบบรวมกลุ่ม

ตารางนี้รวมตาม family/event หรือ source symbol รายช่องพร้อม proposedChoiceId และ source อยู่ใน missingStableIds ของ JSON รายการหนึ่ง choice อาจมีหลายช่องจึงไม่ใช่จำนวน ID ที่ต้องสร้าง

| Family | Event/reference | Source | ช่องที่เกี่ยวข้อง | เจ้าของ | ตัวอย่างชื่อเสนอ |
|---|---|---|---:|---|---|
| travel | travel.rain_awning | [src/data/travelDialogues.json:15](../../src/data/travelDialogues.json#L15) | 9 | Writer B | `choice_50605473b1` |
| travel | travel.broken_footbridge | [src/data/communityTravelDialogues.json:7](../../src/data/communityTravelDialogues.json#L7) | 6 | Writer B | `choice_ea018c3373` |
| travel | travel.bus_detour_paint | [src/data/communityTravelDialogues.json:16](../../src/data/communityTravelDialogues.json#L16) | 6 | Writer B | `choice_bdbc522d58` |
| travel | travel.canal_trapped_supplies | [src/data/communityTravelDialogues.json:25](../../src/data/communityTravelDialogues.json#L25) | 6 | Writer B | `choice_a81bc2e6c9` |
| dynamic | community-memory-student-card | [src/data/communityEvents.ts:48](../../src/data/communityEvents.ts#L48) | 6 | Writer C | `choice_3552b5b9d4` |
| dynamic | community-memory-courier-routes | [src/data/communityEvents.ts:57](../../src/data/communityEvents.ts#L57) | 6 | Writer C | `choice_ae6a168a25` |
| dynamic | community-npc-somjit-supplies | [src/data/communityEvents.ts:66](../../src/data/communityEvents.ts#L66) | 9 | Writer C | `choice_71fd9a1d7b` |
| dynamic | dyn_ing_chalk_letter_grate | [src/data/communityEvents.ts:95](../../src/data/communityEvents.ts#L95) | 9 | Writer C | `choice_ee4a008162` |
| dynamic | dyn_ing_window_vigil_signal | [src/data/communityEvents.ts:134](../../src/data/communityEvents.ts#L134) | 9 | Writer C | `choice_48a049a6fa` |
| dynamic | dyn_nuan_antiseptic_relay | [src/data/communityEvents.ts:177](../../src/data/communityEvents.ts#L177) | 9 | Writer C | `choice_174ed9d24f` |
| dynamic | dyn_nuan_barricade_confrontation | [src/data/communityEvents.ts:220](../../src/data/communityEvents.ts#L220) | 9 | Writer C | `choice_6f8b90e0d6` |
| dynamic | dyn_generator_repaired_aftermath | [src/data/communityEvents.ts:267](../../src/data/communityEvents.ts#L267) | 9 | Writer C | `choice_8ebf61ca70` |
| dynamic | dyn_generator_failed_aftermath | [src/data/communityEvents.ts:302](../../src/data/communityEvents.ts#L302) | 9 | Writer C | `choice_f13bd98e3a` |
| dynamic | dyn_khlongtoei_kitchen_hearth | [src/data/communityEvents.ts:341](../../src/data/communityEvents.ts#L341) | 9 | Writer C | `choice_b1c88c3ff2` |
| dynamic | dyn_khlongtoei_kitchen_unhelped | [src/data/communityEvents.ts:375](../../src/data/communityEvents.ts#L375) | 9 | Writer C | `choice_1ee9002794` |
| dynamic | dyn_nest_hive_resonance_directive | [src/data/communityEvents.ts:422](../../src/data/communityEvents.ts#L422) | 9 | Writer C | `choice_2abcfb8e66` |
| dynamic | dyn_nest_enzyme_analysis_discovery | [src/data/communityEvents.ts:457](../../src/data/communityEvents.ts#L457) | 9 | Writer C | `choice_76b505e015` |
| dynamic | dyn_hunter_reformed_distrust_shadow | [src/data/communityEvents.ts:500](../../src/data/communityEvents.ts#L500) | 9 | Writer C | `choice_13229a5a46` |
| dynamic | dyn_hunter_intimidated_empty_corridor | [src/data/communityEvents.ts:539](../../src/data/communityEvents.ts#L539) | 9 | Writer C | `choice_7280275cd5` |
| dynamic | dyn_tower_depot_approach_perimeter | [src/data/communityEvents.ts:578](../../src/data/communityEvents.ts#L578) | 9 | Writer C | `choice_a4fff4febc` |
| dynamic | dyn_tower_broadcast_frequency_echo | [src/data/communityEvents.ts:624](../../src/data/communityEvents.ts#L624) | 9 | Writer C | `choice_9ced90e9bb` |
| dynamic | dyn_somjit_wound_healed_gratitude | [src/data/communityEvents.ts:673](../../src/data/communityEvents.ts#L673) | 9 | Writer C | `choice_4a54410ea8` |
| dynamic | dyn_somjit_fever_wound_festering | [src/data/communityEvents.ts:713](../../src/data/communityEvents.ts#L713) | 9 | Writer C | `choice_5ba0ffb242` |
| dynamic | dyn_bus_driver_log_legacy | [src/data/communityEvents.ts:757](../../src/data/communityEvents.ts#L757) | 9 | Writer C | `choice_152a13e05d` |
| dynamic | dyn_bus_salvaged_depot_remnant | [src/data/communityEvents.ts:793](../../src/data/communityEvents.ts#L793) | 9 | Writer C | `choice_3fc9c589c0` |
| dynamic | dyn_travel_awning_distant_glance | [src/data/communityEvents.ts:836](../../src/data/communityEvents.ts#L836) | 9 | Writer C | `choice_7f48b43439` |
| dynamic | dyn_travel_awning_raincoat_hasty_path | [src/data/communityEvents.ts:872](../../src/data/communityEvents.ts#L872) | 9 | Writer C | `choice_d232f5d0eb` |
| dynamic | dyn_engine_shelter_community_shield | [src/data/eventEngine.ts:526](../../src/data/eventEngine.ts#L526) | 6 | Writer C | `choice_3ed8fb3a72` |
| dynamic | dyn_engine_hospital_blood_freezer_resonance | [src/data/eventEngine.ts:577](../../src/data/eventEngine.ts#L577) | 9 | Writer C | `choice_7e27c6813f` |
| dynamic | dyn_engine_bloodstained_reputation_tremor | [src/data/eventEngine.ts:635](../../src/data/eventEngine.ts#L635) | 6 | Writer C | `choice_9e4cff7e74` |
| dynamic | dyn_engine_active_crisis_direct_plea | [src/data/eventEngine.ts:692](../../src/data/eventEngine.ts#L692) | 9 | Writer C | `choice_e4594a8f3e` |
| dynamic | dyn_engine_tower_blackbox_decryption | [src/data/eventEngine.ts:763](../../src/data/eventEngine.ts#L763) | 9 | Writer C | `choice_1ecb80da40` |
| dynamic | dyn_engine_nest_hive_synapse | [src/data/eventEngine.ts:821](../../src/data/eventEngine.ts#L821) | 6 | Writer C | `choice_6d3a598cd7` |
| roam | roam-bkk-ward-restrained-patient | [src/data/locationRoamEvents.ts:12](../../src/data/locationRoamEvents.ts#L12) | 9 | Writer C | `choice_1c1e94a2ff` |
| roam | roam-hospital-ambulance-crash | [src/data/locationRoamEvents.ts:24](../../src/data/locationRoamEvents.ts#L24) | 9 | Writer C | `choice_c2ba170944` |
| roam | roam-bkk-market-cold-storage | [src/data/locationRoamEvents.ts:36](../../src/data/locationRoamEvents.ts#L36) | 9 | Writer C | `choice_e4317eb557` |
| roam | roam-bkk-winstop-bulletin | [src/data/locationRoamEvents.ts:48](../../src/data/locationRoamEvents.ts#L48) | 9 | Writer C | `choice_67c3681ad6` |
| roam | roam-bkk-cafe-grinder | [src/data/locationRoamEvents.ts:60](../../src/data/locationRoamEvents.ts#L60) | 9 | Writer C | `choice_581dbc2e2e` |
| roam | roam-bkk-office-terminal | [src/data/locationRoamEvents.ts:72](../../src/data/locationRoamEvents.ts#L72) | 9 | Writer C | `choice_a7ac5b8d62` |
| roam | roam-bkk-pier-canal-mooring | [src/data/locationRoamEvents.ts:84](../../src/data/locationRoamEvents.ts#L84) | 9 | Writer C | `choice_f3fb1704c0` |
| roam | roam-bkk-stockroom-parcels | [src/data/locationRoamEvents.ts:96](../../src/data/locationRoamEvents.ts#L96) | 9 | Writer C | `choice_49f0492e79` |
| roam | roam-bkk-busyard-depot-bus | [src/data/locationRoamEvents.ts:108](../../src/data/locationRoamEvents.ts#L108) | 9 | Writer C | `choice_ad783c1566` |
| roam | roam-bkk-power-breaker | [src/data/locationRoamEvents.ts:120](../../src/data/locationRoamEvents.ts#L120) | 9 | Writer C | `choice_26fbd5d0e3` |
| roam | roam-streets-asok-convenience | [src/data/locationRoamEvents.ts:132](../../src/data/locationRoamEvents.ts#L132) | 9 | Writer C | `choice_4b3c62a204` |
| roam | roam-shelter-rooftop-water-tank | [src/data/locationRoamEvents.ts:144](../../src/data/locationRoamEvents.ts#L144) | 9 | Writer C | `choice_edf900ef64` |
| roam | roam-nest-flooded-track | [src/data/locationRoamEvents.ts:156](../../src/data/locationRoamEvents.ts#L156) | 9 | Writer C | `choice_44d14c8035` |
| roam | roam-radio-checkpoint-sandbags | [src/data/locationRoamEvents.ts:168](../../src/data/locationRoamEvents.ts#L168) | 9 | Writer C | `choice_7ce7152849` |
| roam | roam-bkk-depot-street-sweeper | [src/data/locationRoamEvents.ts:180](../../src/data/locationRoamEvents.ts#L180) | 9 | Writer C | `choice_e7381d74af` |
| roam | roam-streets-overpass-pileup | [src/data/locationRoamEvents.ts:192](../../src/data/locationRoamEvents.ts#L192) | 9 | Writer C | `choice_3afa4cd612` |
| roam | roam-shelter-alley-shrine | [src/data/locationRoamEvents.ts:204](../../src/data/locationRoamEvents.ts#L204) | 9 | Writer C | `choice_3363cf5243` |
| roam | roam-nest-subway-car-darkness | [src/data/locationRoamEvents.ts:216](../../src/data/locationRoamEvents.ts#L216) | 9 | Writer C | `choice_8d8c5b3a2e` |
| roam | roam-radio-transmitter-balcony | [src/data/locationRoamEvents.ts:228](../../src/data/locationRoamEvents.ts#L228) | 9 | Writer C | `choice_30bf49c73f` |
| roam | roam-hospital-blood-bank-vault | [src/data/locationRoamEvents.ts:240](../../src/data/locationRoamEvents.ts#L240) | 9 | Writer C | `choice_5eb577d7c0` |
| roam | roam-bkk-pier-flotsam-drift | [src/data/locationRoamEvents.ts:256](../../src/data/locationRoamEvents.ts#L256) | 6 | Writer C | `choice_b9f32b4dec` |
| roam | roam-nest-spore-observation | [src/data/locationRoamEvents.ts:280](../../src/data/locationRoamEvents.ts#L280) | 6 | Writer C | `choice_c3492ff6eb` |
| roam | roam-streets-wreck-pile | [src/data/locationRoamEvents.ts:305](../../src/data/locationRoamEvents.ts#L305) | 12 | Writer C | `choice_478c67c783` |
| roam | roam-shelter-refuse-chute-debris | [src/data/locationRoamEvents.ts:343](../../src/data/locationRoamEvents.ts#L343) | 6 | Writer C | `choice_ac1452d0b7` |
| roam | roam-hospital-quarantine-barrier-finite | [src/data/locationRoamEvents.ts:367](../../src/data/locationRoamEvents.ts#L367) | 6 | Writer C | `choice_59c44b4b50` |
| roam | roam-radio-river-recon | [src/data/locationRoamEvents.ts:391](../../src/data/locationRoamEvents.ts#L391) | 6 | Writer C | `choice_9fc53d795d` |
| roam | roam-bkk-busyard-service-pit-finite | [src/data/locationRoamEvents.ts:415](../../src/data/locationRoamEvents.ts#L415) | 9 | Writer C | `choice_5b39574726` |
| roam | roam-bkk-market-butcher-alley-finite | [src/data/locationRoamEvents.ts:445](../../src/data/locationRoamEvents.ts#L445) | 9 | Writer C | `choice_737aa2c298` |
| roam | roam-bkk-power-breaker-cut-finite | [src/data/locationRoamEvents.ts:475](../../src/data/locationRoamEvents.ts#L475) | 6 | Writer C | `choice_73cda9dd65` |
| roam | roam-bkk-ward-trolley-finite | [src/data/locationRoamEvents.ts:499](../../src/data/locationRoamEvents.ts#L499) | 9 | Writer C | `choice_38f9608a73` |
| roam | community-roam-asok-pharmacy | [src/data/communityEvents.ts:12](../../src/data/communityEvents.ts#L12) | 9 | Writer C | `choice_9b8e31b363` |
| roam | community-roam-hospital-backup | [src/data/communityEvents.ts:24](../../src/data/communityEvents.ts#L24) | 9 | Writer C | `choice_a1bdd54a86` |
| roam | community-roam-market-coldroom | [src/data/communityEvents.ts:35](../../src/data/communityEvents.ts#L35) | 9 | Writer C | `choice_afc5ca23f1` |
| roam | ext-roam-asok-convenience | [src/data/externalEventsPack.ts:252](../../src/data/externalEventsPack.ts#L252) | 9 | Writer C | `choice_e456dadcb8` |
| roam | ext-roam-samyan-flooded-tunnel | [src/data/externalEventsPack.ts:303](../../src/data/externalEventsPack.ts#L303) | 9 | Writer C | `choice_39c054a53b` |
| roam | ext-roam-rajvithi-blood-bank | [src/data/externalEventsPack.ts:354](../../src/data/externalEventsPack.ts#L354) | 9 | Writer C | `choice_a0e8c57f53` |
| roam | ext-roam-dindaeng-flat-shrine | [src/data/externalEventsPack.ts:406](../../src/data/externalEventsPack.ts#L406) | 9 | Writer C | `choice_70d3f66134` |
| roam | ext-roam-rama8-radio-mast | [src/data/externalEventsPack.ts:458](../../src/data/externalEventsPack.ts#L458) | 9 | Writer C | `choice_d634fbfac8` |
| roam | ext-roam-expressway-toll-gate | [src/data/externalEventsPack.ts:507](../../src/data/externalEventsPack.ts#L507) | 9 | Writer C | `choice_7cf95976e4` |
| roam | ext-roam-khlongtoei-butcher-alley | [src/data/externalEventsPack.ts:558](../../src/data/externalEventsPack.ts#L558) | 9 | Writer C | `choice_cd4552dccb` |
| roam | bkk-roam-bts-asok-vending | [src/data/externalEventsPack.ts:609](../../src/data/externalEventsPack.ts#L609) | 6 | Writer C | `choice_27543e1854` |
| roam | roam-d45-flyer-crate | [src/data/externalEventsPack.ts:661](../../src/data/externalEventsPack.ts#L661) | 9 | Writer C | `choice_adc18f5077` |
| roam | roam-d60-dark-freezer | [src/data/externalEventsPack.ts:700](../../src/data/externalEventsPack.ts#L700) | 9 | Writer C | `choice_adf098dab4` |
| roam | roam-d75-sunken-boat | [src/data/externalEventsPack.ts:739](../../src/data/externalEventsPack.ts#L739) | 9 | Writer C | `choice_1ade45b6dd` |
| roam | roam-d90-abandoned-bus | [src/data/externalEventsPack.ts:778](../../src/data/externalEventsPack.ts#L778) | 9 | Writer C | `choice_11912f8fde` |
| timeline | crisis-d45-flyer-drop | [src/data/externalEventsPack.ts:815](../../src/data/externalEventsPack.ts#L815) | 18 | Writer C | `choice_c678c7ad01` |
| timeline | crisis-d60-grid-collapse | [src/data/externalEventsPack.ts:848](../../src/data/externalEventsPack.ts#L848) | 18 | Writer C | `choice_4591e685e6` |
| timeline | crisis-d75-canal-barricade | [src/data/externalEventsPack.ts:881](../../src/data/externalEventsPack.ts#L881) | 18 | Writer C | `choice_6ff609378d` |
| timeline | crisis-d90-mass-schism | [src/data/externalEventsPack.ts:914](../../src/data/externalEventsPack.ts#L914) | 24 | Writer C | `choice_31e275af66` |
| timeline | crisis-d105-air-raid-siren | [src/data/externalEventsPack.ts:954](../../src/data/externalEventsPack.ts#L954) | 18 | Writer C | `choice_ab8abe8fc2` |
| timeline | crisis-d112-phosphorus-drift | [src/data/externalEventsPack.ts:987](../../src/data/externalEventsPack.ts#L987) | 18 | Writer C | `choice_45c017e34c` |
| timeline | crisis-d116-final-vigil | [src/data/externalEventsPack.ts:1020](../../src/data/externalEventsPack.ts#L1020) | 18 | Writer C | `choice_87a6b6bd92` |
| timeline | crisis-d119-eve-of-impact | [src/data/externalEventsPack.ts:1053](../../src/data/externalEventsPack.ts#L1053) | 18 | Writer C | `choice_00c45d5f5c` |
| ending | climax-human-reversal | [src/data/externalEventsPack.ts:1103](../../src/data/externalEventsPack.ts#L1103) | 6 | later | `choice_6d2de03608` |
| ending | climax-king-underground-throne | [src/data/externalEventsPack.ts:1141](../../src/data/externalEventsPack.ts#L1141) | 6 | later | `choice_45cf1efcdf` |
| ending | climax-evolved-species-zero | [src/data/externalEventsPack.ts:1180](../../src/data/externalEventsPack.ts#L1180) | 6 | later | `choice_a454554bea` |
| ending | climax-extinction-broadcast | [src/data/externalEventsPack.ts:1218](../../src/data/externalEventsPack.ts#L1218) | 6 | later | `choice_8cd91cb7cc` |
| ending | climax-silent-guardian | [src/data/externalEventsPack.ts:1256](../../src/data/externalEventsPack.ts#L1256) | 6 | later | `choice_8479a8d85a` |
| ending | climax-escape-companion | [src/data/externalEventsPack.ts:1295](../../src/data/externalEventsPack.ts#L1295) | 6 | later | `choice_377dd24713` |
| ending | climax-horde-breakout | [src/data/externalEventsPack.ts:1332](../../src/data/externalEventsPack.ts#L1332) | 6 | later | `choice_6fcbedb34c` |
| ending | climax-conscious-exile | [src/data/externalEventsPack.ts:1371](../../src/data/externalEventsPack.ts#L1371) | 6 | later | `choice_5232e5a320` |
| ending | ไม่มี literal eventId: deriveCauseOfDeath | [src/data/pastLifeEchoes.ts:597](../../src/data/pastLifeEchoes.ts#L597) | 100 | later | `ต้องกำหนด event key ก่อน` |
| ending | ไม่มี literal eventId: cTitle | [src/data/pastLifeEchoes.ts:711](../../src/data/pastLifeEchoes.ts#L711) | 2 | later | `ต้องกำหนด event key ก่อน` |
| ending | ไม่มี literal eventId: cDesc | [src/data/pastLifeEchoes.ts:713](../../src/data/pastLifeEchoes.ts#L713) | 2 | later | `ต้องกำหนด event key ก่อน` |
| ending | ไม่มี literal eventId: nTitle | [src/data/pastLifeEchoes.ts:708](../../src/data/pastLifeEchoes.ts#L708) | 2 | later | `ต้องกำหนด event key ก่อน` |
| ending | ไม่มี literal eventId: nText | [src/data/pastLifeEchoes.ts:710](../../src/data/pastLifeEchoes.ts#L710) | 2 | later | `ต้องกำหนด event key ก่อน` |
| ending | ไม่มี literal eventId: resolutionTitles | [src/data/pastLifeEchoes.ts:922](../../src/data/pastLifeEchoes.ts#L922) | 8 | later | `ต้องกำหนด event key ก่อน` |
| ending | ไม่มี literal eventId: deriveDeathEndingPresentation | [src/data/pastLifeEchoes.ts:1039](../../src/data/pastLifeEchoes.ts#L1039) | 2 | later | `ต้องกำหนด event key ก่อน` |
| past_life | `echo-madness-${life.runId}-${currentPlaceId}` | [src/data/pastLifeEchoes.ts:1142](../../src/data/pastLifeEchoes.ts#L1142) | 6 | later | `choice_1efeeb71af` |
| past_life | `echo-fallen-${life.runId}-${currentPlaceId}` | [src/data/pastLifeEchoes.ts:1169](../../src/data/pastLifeEchoes.ts#L1169) | 6 | later | `choice_fcb4a2df82` |
| past_life | `echo-clinic-deed-${life.runId}` | [src/data/pastLifeEchoes.ts:1196](../../src/data/pastLifeEchoes.ts#L1196) | 6 | later | `choice_e4048a8c27` |
| past_life | `echo-streets-hunter-${life.runId}` | [src/data/pastLifeEchoes.ts:1223](../../src/data/pastLifeEchoes.ts#L1223) | 6 | later | `choice_3d78de67a3` |
| timeline | world-timeline-day3-ambulance | [src/data/pastLifeEchoes.ts:1270](../../src/data/pastLifeEchoes.ts#L1270) | 9 | Writer C | `choice_48160d20eb` |
| timeline | world-timeline-day4-blackrain | [src/data/pastLifeEchoes.ts:1330](../../src/data/pastLifeEchoes.ts#L1330) | 6 | Writer C | `choice_ad985504c6` |
| timeline | world-timeline-day6-airdrop | [src/data/pastLifeEchoes.ts:1369](../../src/data/pastLifeEchoes.ts#L1369) | 9 | Writer C | `choice_5f7e31f503` |
| timeline | world-timeline-day8-blackout | [src/data/pastLifeEchoes.ts:1430](../../src/data/pastLifeEchoes.ts#L1430) | 6 | Writer C | `choice_1e15672bb8` |
| timeline | world-timeline-day15-bangkok-bombing-leaflets | [src/data/pastLifeEchoes.ts:1469](../../src/data/pastLifeEchoes.ts#L1469) | 6 | Writer C | `choice_dbe8df98fd` |
| timeline | world-timeline-day30-chao-phraya-blockade | [src/data/pastLifeEchoes.ts:1506](../../src/data/pastLifeEchoes.ts#L1506) | 6 | Writer C | `choice_aac61f5417` |
| npc | `ally-aid-${devotedAlly.id}-day-${day}` | [src/data/pastLifeEchoes.ts:2642](../../src/data/pastLifeEchoes.ts#L2642) | 3 | Writer A | `choice_13b5f5d6a4` |
| npc | 'lifesim-npc-'+target.id+'-day-'+day | [src/data/pastLifeEchoes.ts:2686](../../src/data/pastLifeEchoes.ts#L2686) | 33 | Writer A | `rescue_686e181938` |
| roam | picked.conditions?.oncePerRun
        ? picked.id
        : `${picked.id}-${currentDay}-${(gameState.initialSeed \|\| 0) % 10000}` | [src/data/pastLifeEchoes.ts:3017](../../src/data/pastLifeEchoes.ts#L3017) | 3 | Writer C | `choice_7c43e3f515` |
| roam | `lifesim-roam-cache-${Date.now()}` | [src/data/pastLifeEchoes.ts:3033](../../src/data/pastLifeEchoes.ts#L3033) | 12 | Writer C | `choice_1f0e5651ee` |
| roam | `lifesim-roam-cooler-${Date.now()}` | [src/data/pastLifeEchoes.ts:3089](../../src/data/pastLifeEchoes.ts#L3089) | 9 | Writer C | `choice_61703225ea` |
| roam | `lifesim-roam-feral-${Date.now()}` | [src/data/pastLifeEchoes.ts:3137](../../src/data/pastLifeEchoes.ts#L3137) | 9 | Writer C | `choice_9c194692f5` |
| ending | `action-climax-cure-day-${gameState?.day \|\| 1}` | [src/data/pastLifeEchoes.ts:3848](../../src/data/pastLifeEchoes.ts#L3848) | 6 | later | `choice_6a775778e9` |
| ending | `action-climax-crown-day-${gameState?.day \|\| 1}` | [src/data/pastLifeEchoes.ts:3880](../../src/data/pastLifeEchoes.ts#L3880) | 6 | later | `choice_65e78f51cc` |
| ending | `action-climax-evolve-day-${gameState?.day \|\| 1}` | [src/data/pastLifeEchoes.ts:3912](../../src/data/pastLifeEchoes.ts#L3912) | 6 | later | `choice_0d9a9e4e8f` |
| ending | `action-climax-extinguish-day-${gameState?.day \|\| 1}` | [src/data/pastLifeEchoes.ts:3944](../../src/data/pastLifeEchoes.ts#L3944) | 6 | later | `choice_f1e47cc541` |
| ending | `action-climax-settle-${districtId}-day-${gameState?.day \|\| 1}` | [src/data/pastLifeEchoes.ts:3980](../../src/data/pastLifeEchoes.ts#L3980) | 6 | later | `choice_daabaf7441` |
| ending | `${template.id}-w${windowBucket}` | [src/data/pastLifeEchoes.ts:4119](../../src/data/pastLifeEchoes.ts#L4119) | 1 | later | `choice_547fcea178` |
| ending | ไม่มี literal eventId: isHumanAttackContext | [src/data/pastLifeEchoes.ts:635](../../src/data/pastLifeEchoes.ts#L635) | 1 | later | `ต้องกำหนด event key ก่อน` |
| ending | ไม่มี literal eventId: isColdOrRainContext | [src/data/pastLifeEchoes.ts:644](../../src/data/pastLifeEchoes.ts#L644) | 1 | later | `ต้องกำหนด event key ก่อน` |
| ending | ไม่มี literal eventId: isGenericTitle | [src/data/pastLifeEchoes.ts:1012](../../src/data/pastLifeEchoes.ts#L1012) | 1 | later | `ต้องกำหนด event key ก่อน` |
| ending | ไม่มี literal eventId: isGenericText | [src/data/pastLifeEchoes.ts:1018](../../src/data/pastLifeEchoes.ts#L1018) | 1 | later | `ต้องกำหนด event key ก่อน` |
| npc | ไม่มี literal eventId: npcPosture | [src/data/npcRelationships.js:76](../../src/data/npcRelationships.js#L76) | 10 | Writer A | `ต้องกำหนด event key ก่อน` |
| runtime_support | ไม่มี literal eventId: handleDrinkCarriedBloodBag | [src/App.tsx:1358](../../src/App.tsx#L1358) | 1 | Writer C | `ต้องกำหนด event key ก่อน` |
| engine_runtime | ไม่มี literal eventId: pendingEvent | [public/after-zero-bundle.js:1467](../../public/after-zero-bundle.js#L1467) | 4 | Writer C | `ต้องกำหนด event key ก่อน` |
| npc_support | ไม่มี literal eventId: RANDOM_SURVIVOR_POOL | [src/data/pastLifeEchoes.ts:2204](../../src/data/pastLifeEchoes.ts#L2204) | 20 | Writer A | `ต้องกำหนด event key ก่อน` |
| npc_support | ไม่มี literal eventId: makeZone | [src/data/pastLifeEchoes.ts:2421](../../src/data/pastLifeEchoes.ts#L2421) | 2 | Writer A | `ต้องกำหนด event key ก่อน` |
| npc_support | ไม่มี literal eventId: syncZonePopulationsWithEngineState | [src/data/pastLifeEchoes.ts:2565](../../src/data/pastLifeEchoes.ts#L2565) | 1 | Writer A | `ต้องกำหนด event key ก่อน` |
| npc_support | ไม่มี literal eventId: EXTERNAL_AI_NPCS | [src/data/externalEventsPack.ts:135](../../src/data/externalEventsPack.ts#L135) | 10 | Writer A | `ต้องกำหนด event key ก่อน` |
| ending | ไม่มี literal eventId: endingReflections | [src/data/endingPresentation.ts:17](../../src/data/endingPresentation.ts#L17) | 5 | later | `ต้องกำหนด event key ก่อน` |

## ข้อจำกัดและส่วนที่ยังไม่พร้อมแจกเขียน

- รายการนี้เป็น source/catalog inventory ไม่ใช่ transcript ทุกชุดสถานะที่เป็นไปได้; function/template เก็บ expression เต็มและ placeholders แทนการแต่งค่าตัวแปรสมมติ
- สถานะส่วนใหญ่เป็น conservative triage จากประเภท field และหลักฐานคนเป็น/การมองเห็น; needs_context_review ต้องอ่านก่อนแจกเขียนจริง ไม่ได้อ้างว่าทุกข้อความผ่านบรรณาธิการรายบรรทัดแล้ว
- ไม่ได้รัน browser gameplay ทุกแขนงหรือทดสอบข้ามวัย เพราะรอบนี้ไม่เปลี่ยนระบบ; ตรวจการไหลของข้อมูลจาก source handlers
- ข้อความที่ไม่มี authoring source แยกจาก bundle ต้องอ้าง bundle ปัจจุบันเป็นต้นทางจริง ห้ามแก้ generated block ด้วยมือ
- บาง engine field เป็นค่า runtime ที่ generator ประกอบจากหลายส่วน; sourceResolution ระบุจุดที่หา AST ของ field ตรงไม่ได้และควรตรวจ generator ก่อนเขียน
- runtime branch บางแห่งไม่มี eventId literal หรือ choiceId; unkeyed-source เป็น audit reference เท่านั้น ไม่ใช่ ID ที่เพิ่มลงเกม ต้องกำหนด stable ID ก่อนให้ writers แก้
- ไม่ได้รวม UI labels ทั่วไป เสียง ภาพพิกเซล ข้อความเครื่องมือ AI Studio และประวัติจากเซฟส่วนตัว; ไม่มีการอ่านหรือแก้เซฟผู้ใช้
- ข้อมูลอาชีพ/ภูมิหลังถูกอ่านเพื่อบริบท แต่ยังไม่สร้าง inventory ครบทุกคำใน biography; signature-choice labels ที่เป็นกลไกถูกระบุเป็น risk และ dependencies
- ตัวแปรที่ประกอบฉากผ่าน spread/map/ฟังก์ชันอาจมี runtime overlay อื่นนอกช่องที่ AST collector จับได้ รายการ unsupported/unresolved แสดงตรง ๆ ไม่เท่ากับ coverage 100%
- เครื่องมือใน node_modules ถูกย้ายพร้อมโปรเจกต์ระหว่างงาน ใช้เครื่องมือชั่วคราวนอก repository เพื่อทำ audit ต่อ; ไม่ได้รัน install/build/sync กับโปรเจกต์
- sceneUnits รวม event, runtime composer, NPC support และ hazard definition จึงไม่เท่ากับจำนวนฉากเล่น; ใช้ uniqueRuntimeCatalogEventIds สำหรับ ID เหตุการณ์ใน catalog ที่ไม่ซ้ำ
- source expression เดียวที่มีหลาย event bindings ถูกนับครั้งเดียวใน records และเก็บทุกการใช้งานใน occurrences; ห้ามรวม textFields กับ textUseSiteBindings
- พบ 41 กลุ่มที่ event/choice/field เหมือนกันแต่เป็นหลาย authored branch หรือ template เงา: branchDiscriminatorRequired=true ต้องกำหนดการอ้าง branch ก่อนแจกเขียน ห้ามถือ auditBranchReference เป็น ID ใหม่ของเกม
- LATE_GAME_CITY_CRISIS_EVENTS เป็น reference template ที่สคริปต์วัด progression ใช้ ส่วน App ใช้ฉาก hardcoded ใน getFixedWorldTimelineEvent; เก็บทั้งสองต้นทางแต่ไม่รวมเป็น event ID ใหม่
- ยังต้องตรวจชื่อเสนอ choice_* แบบ content hash ให้เป็นชื่อเชิงความหมายก่อนเพิ่มลงเกม; รายการที่ authoringReady=false ยังไม่ใช่งานที่พร้อมให้ writer แก้

## การตรวจเอกสารรอบนี้

- parse source สำเร็จ 20 ไฟล์; เก็บ SHA-256 ทุกไฟล์และตรวจว่าไม่เปลี่ยน
- auditId ไม่ซ้ำ; ทุก record มีต้นฉบับ/เหตุผล/ตำแหน่ง/เจ้าของ/บริบท; pilot 12 รายการอ้าง record ที่มีจริง
- ทุก canonical source field อยู่ใน writerBatches เพียงหนึ่งเจ้าของ; aliases อยู่ใน occurrences ไม่แจกซ้ำ
- ไม่มีการรัน build/sync หรือแก้ source และไม่ได้อ่านเซฟส่วนตัว; ไม่มี commit/push/deploy
- ไม่ได้ทดสอบเกมทุกแขนงในรอบเอกสารนี้ และไม่อ้าง coverage เชิงประสบการณ์เล่น 100%
