import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {renderToStaticMarkup} from 'react-dom/server';
import React from 'react';
import {endingMetrics,endingReflections} from '../src/data/endingPresentation';
import EndingExperience from '../src/components/EndingExperience';
import {generateCharacter,createCharacterState} from '../src/data/characterPool';
import {buildPastLifeRecordFromState} from '../src/data/pastLifeEchoes';

const zones:any={shelter:{placeName:'ห้องแถว',npcs:[
  {id:'a',storyNpcKey:'mali',alive:true,trust:85},
  {id:'b',storyNpcKey:'mali',alive:true,trust:100},
  {id:'c',alive:false,trust:100},{id:'d',alive:true,trust:84},
]}};
assert.deepEqual(endingMetrics({day:30,memory:{saved:4,killed:9}},zones),{days:30,saved:4,killed:9,allies:1});
assert.deepEqual(endingMetrics({},{}),{days:1,saved:0,killed:0,allies:0});
assert(!endingReflections({stats:{horde:99},memory:{corpseMeals:5}}).join('').includes('สังหาร'));
assert(endingReflections({story:{flags:{'c42.shelter_fortified':true}}})[0].includes('แนวป้องกัน'));
const context={window:{} as any};vm.runInNewContext(fs.readFileSync('public/after-zero-bundle.js','utf8'),context);
const P=context.window.AfterZeroEngine.Production,bio=generateCharacter(44);
for(const [id,ending] of Object.entries(P.catalog.ENDINGS)){
  const state=createCharacterState(P,bio);state.pending=null;state.ending={id,day:30};state.day=30;
  const html=renderToStaticMarkup(React.createElement(EndingExperience,{state,ending,bio,zones,chronicle:null,onNewLife(){},onHub(){}}));
  assert(html.includes('สังหารมนุษย์'));assert(html.includes(`data-ending-id="${id}"`));
  state.npcZones=zones;const record=buildPastLifeRecordFromState(state,P.viewModel(state,{archive:[]}),1,bio);
  assert.equal(record.deeds.alliedHumans,1);
}
const exported=JSON.parse(fs.readFileSync('docs/ending-review/01-ending-catalog.json','utf8'));
assert.deepEqual(exported.map((e:any)=>e.id).sort(),Object.keys(P.catalog.ENDINGS).sort());
console.log(`PASS: ending counts, ally deduplication, real reflections, archive snapshot, rendering and export coverage for ${exported.length} endings`);
