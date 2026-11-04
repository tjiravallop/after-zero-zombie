import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {CHARACTER_OCCUPATIONS,generateCharacter,snapshotCharacter,createCharacterState} from '../src/data/characterPool';
import {DYNAMIC_NARRATIVE_EVENTS} from '../src/data/eventEngine';
import {EXTERNAL_AI_NPCS,EXTERNAL_AI_ROAM_EVENTS,ORGANIC_ENDING_CLIMAX_EVENTS} from '../src/data/externalEventsPack';

const out=path.resolve('docs/ai-writing-pack');
fs.mkdirSync(path.join(out,'source'),{recursive:true});
const context={window:{} as any};
vm.runInNewContext(fs.readFileSync('public/after-zero-bundle.js','utf8'),context);
const production=context.window.AfterZeroEngine.Production;
const replacer=(_key:string,value:any)=>typeof value==='function'?{__functionSource:value.toString()}:value;
const write=(name:string,value:any)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,replacer,2)+'\n','utf8');
const characters=CHARACTER_OCCUPATIONS.map((job,index)=>{
  const profile=generateCharacter(202600+index,{age:job.minAge,occupationId:job.id,gender:'ชาย'});
  const state=createCharacterState(production,profile);
  return {occupationId:job.id,minAge:job.minAge,maxAge:job.maxAge,startPlace:profile.startPlace,
    startPlaceName:production.catalog.PLACES[profile.startPlace!]?.name,
    exampleProfile:snapshotCharacter(profile),openingExample:production.engine.pendingEvent(state),
    startingStats:state.stats,startingItems:state.items,
    note:'ตัวอย่างหนึ่งคนต่ออาชีพ ไม่ใช่ตัวละครคงที่: อายุ เพศ รูปลักษณ์ และระยะติดเชื้อสุ่มได้ตามกฎ'};
});
write('01-character-pool.json',characters);
write('02-engine-events.json',production.catalog.EVENTS);
write('03-actions-places-endings.json',{
  actions:production.catalog.ACTIONS,places:production.catalog.PLACES,
  endings:production.catalog.ENDINGS,routes:production.catalog.ROUTES,
  npcs:production.catalog.NPCS,resources:production.catalog.RESOURCES,
});
write('04-roam-events-and-npcs.json',{npcs:EXTERNAL_AI_NPCS,roamEvents:EXTERNAL_AI_ROAM_EVENTS,climaxEvents:ORGANIC_ENDING_CLIMAX_EVENTS});
write('05-dynamic-events.json',DYNAMIC_NARRATIVE_EVENTS);
write('06-travel-dialogues.json',['src/data/travelDialogues.json','src/data/communityTravelDialogues.json'].flatMap(file=>JSON.parse(fs.readFileSync(file,'utf8'))));
for(const [file,name] of [['src/data/bangkokLocations.json','07-bangkok-locations.json'],['src/data/progressionRoutes.json','08-progression-routes.json']])fs.copyFileSync(file,path.join(out,name));
const sources=['src/data/characterPool.ts','src/data/pastLifeEchoes.ts','src/data/bangkokBios.ts','src/data/npcRelationships.js','src/data/npcInteractions.ts','src/data/eventEngine.ts','src/data/externalEventsPack.ts','src/data/communityEvents.ts','src/data/communityEngineEvents.json','src/data/communityTravelDialogues.json','src/data/bangkokLocations.json','src/data/progressionRoutes.json','src/data/progressionRules.ts','scripts/sync-bangkok-content.mjs','public/after-zero-bundle.js'];
sources.push('src/data/locationRoamEvents.ts');
for(const source of sources)fs.copyFileSync(source,path.join(out,'source',path.basename(source)));
const engineText=production.catalog.EVENTS.map((event:any)=>[
  `## ${event.id} — ${event.title}`,
  event.text||'',
  ...event.choices.map((choice:any)=>`- [${choice.id}] ${choice.text}\n  ต้นทุน/คำเตือน: ${choice.note||'—'}`),
  'เงื่อนไขและผลลัพธ์ฉบับเต็ม: ดู 02-engine-events.json โดยอ้างอิง ID เดียวกัน',
].join('\n\n')).join('\n\n');
fs.writeFileSync(path.join(out,'EVENTS-อ่านง่าย.md'),'# บทอีเวนต์จากแค็ตตาล็อกเอนจิน\n\nไฟล์นี้ไม่รวมบทที่ประกอบขณะเล่น ดูรายการครบใน README.md\n\n'+engineText+'\n','utf8');
write('manifest.json',{
  exportedAt:new Date().toISOString(),contentVersion:production.catalog.CONTENT_VERSION,
  counts:{occupations:characters.length,engineEvents:production.catalog.EVENTS.length,
    actions:production.catalog.ACTIONS.length,places:Object.keys(production.catalog.PLACES).length,
    engineEndings:Object.keys(production.catalog.ENDINGS).length,
    externalNpcs:EXTERNAL_AI_NPCS.length,roamEvents:EXTERNAL_AI_ROAM_EVENTS.length,
    climaxEvents:ORGANIC_ENDING_CLIMAX_EVENTS.length,dynamicEvents:DYNAMIC_NARRATIVE_EVENTS.length},
  sources,
  scope:'Current narrative catalog and character pool, plus source snapshots for runtime-composed text. Not an exhaustive transcript of all possible states.',
});
console.log(JSON.stringify(JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8')).counts));
