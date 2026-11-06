import fs from 'node:fs';
import {createHash} from 'node:crypto';
const rows = JSON.parse(fs.readFileSync('src/data/bangkokLocations.json', 'utf8'));
const routes = JSON.parse(fs.readFileSync('src/data/progressionRoutes.json', 'utf8'));
const dialogues = ['src/data/travelDialogues.json','src/data/communityTravelDialogues.json'].flatMap(file => JSON.parse(fs.readFileSync(file, 'utf8')));
const community = JSON.parse(fs.readFileSync('src/data/communityEngineEvents.json', 'utf8'));
const file = 'public/after-zero-bundle.js';
let source = fs.readFileSync(file, 'utf8');
const originalSource = source;
const relationshipSource = fs.readFileSync('src/data/npcRelationships.js','utf8').replace(/^export /gm,'');
const relationshipStart = '// BEGIN NPC RELATIONSHIP RULES', relationshipEnd = '// END NPC RELATIONSHIP RULES';
const relationshipCode = `${relationshipStart}\n  const NpcRelationships = (() => {\n${relationshipSource}\nreturn {relationshipState,changeTrust,previewTrust,npcPosture,npcHuntEffects,relationshipTier,recordRescue,scaledTrust,rebalanceRelationshipCatalog,validateSavedEncounter};\n})();\n  ${relationshipEnd}`;
if(source.includes(relationshipStart)) source=source.slice(0,source.indexOf(relationshipStart))+relationshipCode+source.slice(source.indexOf(relationshipEnd)+relationshipEnd.length);
else source=source.replace('(() => {','(() => {\n  '+relationshipCode);
const start = '// BEGIN BANGKOK OCCUPATION CONTENT';
const end = '// END BANGKOK OCCUPATION CONTENT';
const code = `${start}
        const districts = ${JSON.stringify(rows)};
        const FLAGS = {};
        EVENTS.push({id:'career.awakening',trigger:'opening',once:true,title:'วันแรกที่ได้สติ',text:'เจ้าตื่นขึ้นพร้อมของติดตัวจากชีวิตก่อนติดเชื้อ',choices:[
          {id:'career.awakening.check',text:'ตั้งสติแล้วตรวจของติดตัว',note:'สติ +3 · ไม่ใช้วัน',effects:[{type:'stat.add',key:'sanity',value:3}]},
          {id:'career.awakening.listen',text:'อยู่นิ่ง ๆ แล้วฟังเสียงรอบตัว',note:'สติ +2 · ไม่ใช้วัน',effects:[{type:'stat.add',key:'sanity',value:2}]},
          {id:'career.awakening.look',text:'มองหาทางออกก่อน',note:'ไม่เปลี่ยนสถานะ · ไม่ใช้วัน',effects:[]}
        ]});
        for (const d of districts) {
          PLACES[d.id] = { name: d.name, short: d.name, description: d.text, tag: 'BANGKOK 2026', color: d.color, neighbors: [d.parent] };
          PLACES[d.parent].neighbors.push(d.id);
          const flag = d.id + '.helped', eventId = d.id + '.work';
          FLAGS[flag] = { type: 'boolean', default: false };
          ACTIONS.push({ id: eventId, name: d.task, places: [d.id], encounter: eventId, note: '1 วัน · ช่วยงานหรือเก็บของ แล้วเลือกได้ว่าจะทำอย่างไร', requirements: { kind: 'flag', id: flag, value: false } });
          EVENTS.push({ id: eventId, title: d.task, text: d.text, location: d.id, once: false, choices: [
            { id: eventId + '.help', text: d.work, pressure: true, note: 'สภาพร่าง -4 · ความหิว -14 (ได้รับเสบียงแบ่งปัน) · ความไว้ใจ +8 · ' + ({sanity:'สติ',research:'งานวิจัย',humanity:'ความเป็นมนุษย์'}[d.reward]) + ' +6 · เปิดทางตั้งหลักในย่านนี้', effects: [{type:'stat.add',key:'hp',value:-4},{type:'stat.add',key:'hunger',value:-14},{type:'stat.add',key:'trust',value:8},{type:'stat.add',key:d.reward,value:6},{type:'flag.set',id:flag,value:true}], behaviorTags:['helped'] },
            { id: eventId + '.salvage', text: 'ค้นของจำเป็นและเศษเสบียงแล้วถอย โดยยังไม่รับงาน', note: 'เสบียงมนุษย์ +1 · ความหิว -8 · สภาพร่าง -3 · ยังไม่เปิดทางตั้งหลัก', effects:[{type:'item.add',key:'supplies',value:1},{type:'stat.add',key:'hunger',value:-8},{type:'stat.add',key:'hp',value:-3}] },
            { id: eventId + '.leave', text:'ถอยไปตั้งหลักก่อน', note:'ยังไม่เปิดทางตั้งหลัก · กิจกรรมนี้ใช้ 1 วัน', effects:[] }
          ] });
          ENDINGS[d.id + '.ending'] = { title: d.ending, text: d.epilogue };
          ACTIONS.push({id:d.id+'.settle',name:'ตัดสินใจตั้งหลักดูแลย่านนี้ — '+d.ending,places:[d.id],ending:d.id+'.ending',min:{humanity:60,sanity:50,trust:55},requirements:{kind:'flag',id:flag,value:true},note:'จุดตัดสินใจวิถีชีวิต · ต้องเคยช่วยงานย่านนี้ มีสติ 50 ความเป็นมนุษย์ 60 และความไว้ใจ 55'});
        }
        const MAP_NEIGHBORS = {
          radio: ['hospital', 'bkk_depot', 'bkk_cafe', 'shelter'],
          bkk_depot: ['radio', 'hospital', 'bkk_stockroom', 'nest'],
          bkk_cafe: ['radio', 'hospital', 'bkk_busyard', 'shelter', 'bkk_power'],
          bkk_busyard: ['bkk_cafe', 'hospital', 'bkk_ward', 'shelter', 'bkk_winstop'],
          hospital: ['radio', 'bkk_depot', 'bkk_cafe', 'bkk_busyard', 'bkk_ward', 'bkk_stockroom', 'shelter', 'streets', 'nest'],
          bkk_ward: ['hospital', 'bkk_busyard', 'shelter', 'bkk_winstop', 'bkk_stockroom', 'bkk_pier'],
          shelter: ['radio', 'bkk_cafe', 'bkk_busyard', 'hospital', 'bkk_ward', 'bkk_power', 'bkk_winstop', 'bkk_office', 'streets'],
          bkk_power: ['bkk_cafe', 'shelter', 'bkk_winstop', 'bkk_office'],
          bkk_winstop: ['shelter', 'bkk_power', 'bkk_busyard', 'bkk_ward', 'bkk_pier', 'bkk_office', 'streets'],
          bkk_stockroom: ['bkk_depot', 'hospital', 'bkk_ward', 'bkk_pier', 'nest', 'streets'],
          bkk_pier: ['bkk_stockroom', 'bkk_ward', 'bkk_winstop', 'bkk_office', 'streets', 'nest'],
          bkk_office: ['bkk_power', 'shelter', 'bkk_winstop', 'bkk_pier', 'streets', 'bkk_market'],
          nest: ['bkk_depot', 'hospital', 'bkk_stockroom', 'bkk_pier', 'streets', 'bkk_market'],
          streets: ['hospital', 'shelter', 'bkk_winstop', 'bkk_stockroom', 'bkk_pier', 'bkk_office', 'nest', 'bkk_market'],
          bkk_market: ['streets', 'nest', 'bkk_office']
        };
        for (const [placeId, neighbors] of Object.entries(MAP_NEIGHBORS)) {
          if (PLACES[placeId]) PLACES[placeId].neighbors = [...neighbors];
        }
        const routes = ${JSON.stringify(routes)};
        const lateFlags = [
          'crisis_late_seen_d45','crisis_late_seen_d60','crisis_late_seen_d75','crisis_late_seen_d90',
          'crisis_late_seen_d105','crisis_late_seen_d112','crisis_late_seen_d116','crisis_late_seen_d119',
          'crisis_d45_read_map','crisis_d60_helped_generator','crisis_d75_cleared_chain','crisis_d90_escorted_convoy',
          'roam_late_depleted_d45','roam_late_depleted_d60','roam_late_depleted_d75','roam_late_depleted_d90',
          'travel_rain_awning_waited','travel_rain_awning_signaled','travel_rain_awning_left',
          'travel_awning_glance_done','travel_awning_hasty_done',
          'hive_synapse_connected','hive_synapse_sampled',
          'nest_resonance_directive_done','nest_enzyme_discovery_done',
          'hunter_reputation_reformed','hunter_reputation_intimidated',
          'hunter_reformed_shadow_done','hunter_intimidated_corridor_done',
          'tower_decrypted_depot','tower_warned_survivors','tower_stimulated_horde',
          'tower_depot_approach_done','tower_broadcast_echo_done',
          'somjit_wound_treated','somjit_food_given_unhealed',
          'somjit_wound_healed_done','somjit_fever_festering_done',
          'bus_salvaged_firstaid','bus_read_driver_log',
          'bus_log_legacy_done','bus_salvaged_remnant_done'
        ];
        for (const lf of lateFlags) FLAGS[lf] = {type:'boolean',default:false};
        for (const route of routes) {
          const bonusStat = route.id === 'vaccine' ? 'research' : route.id === 'horde' ? 'horde' : 'mutation';
          const bonusLabel = route.id === 'vaccine' ? 'งานวิจัย +4' : route.id === 'horde' ? 'อำนาจฝูง +4' : 'กลายพันธุ์ +4';
          route.steps.forEach((step,i) => {
            const id = 'route.' + route.id + '.' + i;
            FLAGS[id] = {type:'boolean',default:false};
            ACTIONS.push({id,name:step.name,places:[step.place],encounter:id,requirements:{kind:'flag',id,value:false},note:'เตรียม'+route.label+' · 1 วัน · ทำสำเร็จครั้งเดียว'});
            EVENTS.push({id,title:step.name,text:step.text,location:step.place,once:false,choices:[
              {id:id+'.prepare',text:'ลงมือเตรียมงานนี้ให้เสร็จ',note:'สภาพร่าง -3 · ความหิว +2 · '+bonusLabel+' · บันทึกความคืบหน้าของเส้นทาง',effects:[{type:'stat.add',key:'hp',value:-3},{type:'stat.add',key:'hunger',value:2},{type:'stat.add',key:bonusStat,value:4},{type:'flag.set',id,value:true}]},
              {id:id+'.leave',text:'ยังไม่พร้อม ถอยไปเตรียมตัวก่อน',note:'ยังไม่บันทึกความคืบหน้า · ใช้กิจกรรมเดินสำรวจวันนี้',effects:[]}
            ]});
          });
          for(const action of ACTIONS.filter(a=>route.endings.includes(a.ending))) {
            action.requirements={all:[...(action.requirements?[action.requirements]:[]),...route.steps.map((_,i)=>({kind:'flag',id:'route.'+route.id+'.'+i,value:true}))]};
            action.places=[action.ending==='extinction'?'radio':route.destination];
            action.min=action.ending==='extinction'?{...route.requirements,...action.min,sanity:route.requirements.sanity}:{...action.min,...route.requirements};
            action.note+=' · เตรียมงาน 3 จุดแล้วเดินทางสู่จุดตัดสินใจ';
          }
        }
        const recruit = ACTIONS.find(a=>a.id==='recruit');
        for(const fx of recruit.effects) { if(fx.path==='stats.horde')fx.value=12; if(fx.path==='stats.mutation')fx.value=3; if(fx.path==='stats.sanity')fx.value=-5; }
        recruit.note='อำนาจฝูง +12 · กลายพันธุ์ +3 · สติ -5 · ความเป็นมนุษย์ -3';
        const research = ACTIONS.find(a=>a.id==='research');
        for(const fx of research.effects) {if(fx.path==='stats.research')fx.value=10;if(fx.path==='stats.sanity')fx.value=-3;}
        research.note='งานวิจัย +10 · สติ -3 · ใช้ตัวอย่างเชื้อ 1';
        const adapt = ACTIONS.find(a=>a.id==='adapt');
        for(const fx of adapt.effects) {if(fx.path==='stats.mutation')fx.value=8;if(fx.path==='stats.hp')fx.value=-6;if(fx.path==='stats.sanity')fx.value=-3;}
        adapt.note='กลายพันธุ์ +8 · สุขภาพ -6 · สติ -3 · ใช้ตัวอย่างเชื้อ 1';
        EVENTS.push(...${JSON.stringify(community)});
        for(const d of ${JSON.stringify(dialogues)}) EVENTS.push({id:'travel.'+d.id,title:d.title,text:d.text,locations:d.places,routes:d.routes,travelDialogue:true,once:d.once??false,cooldownDays:d.cooldownDays??5,choices:d.choices ? d.choices.map((c,i)=>({id:'travel.'+d.id+'.choice.'+i,...c})) : [
          {id:'travel.'+d.id+'.reply',text:d.reply,note:({trust:'ความไว้ใจ',humanity:'ความเป็นมนุษย์',sanity:'สติ',research:'งานวิจัย',horde:'อำนาจฝูง'}[d.stat])+' +'+d.value,pressure:d.pressure||false,outcomeText:d.outcome,effects:[{type:'stat.add',key:d.stat,value:d.value}]},
          {id:'travel.'+d.id+'.signal',text:'ส่งสัญญาณว่ารับรู้ แล้วเดินต่อโดยรักษาระยะ',note:'ไม่เข้าใกล้ · ไม่เปลี่ยนสถานะเพิ่มเติม',outcomeText:'อีกฝ่ายรับรู้ว่าเจ้าเข้าใจ เจ้าจึงเดินต่อโดยรักษาระยะห่าง',effects:[]},
          {id:'travel.'+d.id+'.leave',text:'หลบออกมาเงียบ ๆ โดยไม่ตอบ',note:'ไม่เปลี่ยนสถานะเพิ่มเติม · เดินทางต่อได้',outcomeText:'เจ้ารักษาระยะแล้วเดินต่อ เสียงสนทนาค่อย ๆ หายไปด้านหลัง',effects:[]}
        ]});
        ${end}`;
if (source.includes(start)) source = source.slice(0, source.indexOf(start)) + code + source.slice(source.indexOf(end) + end.length);
else source = source.replace('        return { PLACES, ACTIONS, EVENTS, ENDINGS, ROUTES:', code + '\n        return { PLACES, ACTIONS, EVENTS, ENDINGS, ROUTES:').replace('STRAINS: {}, FLAGS: {}, NPCS: {}, RESOURCES: {}', 'STRAINS: {}, FLAGS, NPCS: {}, RESOURCES: {}');
if (source !== originalSource) {
  fs.writeFileSync(file, source);
}
// Refresh the classic engine script when a new build changes its contents.
const indexFile = 'index.html';
const engineVersion = createHash('sha256').update(source).digest('hex').slice(0, 12);
const currentIndex = fs.readFileSync(indexFile, 'utf8');
const nextIndex = currentIndex.replace(/\.\/after-zero-bundle\.js(?:\?v=[a-z0-9-]+)?/g, './after-zero-bundle.js?v=' + engineVersion);
if (nextIndex !== currentIndex) {
  fs.writeFileSync(indexFile, nextIndex);
}
