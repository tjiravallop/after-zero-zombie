import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
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

const ageContent = JSON.parse(fs.readFileSync('src/data/age-dialogue/expansion.json', 'utf8'));
for (const id of ['bkk_market.ending', 'bkk_ward.ending']) {
  const ending = { ...P.catalog.ENDINGS[id], id };
  const state = createCharacterState(P, bio);
  state.pending = null;
  state.ending = ending;
  for (const [age, tier] of [[11, 'child'], [35, 'adult'], [70, 'elder']] as const) {
    state.characterProfile.age = age;
    const finalChoice = {
      runId: state.runId, day: state.day, place: state.place, title: ending.title,
      text: 'ผลการเลือกทดสอบ', effects: [], logKeys: [], endingOutcomeId: id,
    };
    const html = renderToStaticMarkup(React.createElement(EndingExperience, {
      state, ending, bio, zones, chronicle: null, finalChoice, onNewLife(){}, onHub(){},
    }));
    const expected = ageContent.ending[id].text.variants[tier] ?? ending.text;
    assert(html.includes(expected), id);
    assert(html.includes('อ่านผลการเลือกครั้งสุดท้าย') && html.includes(finalChoice.text));
    assert.equal(state.ending.text, ending.text);
  }
}
console.log('PASS: district epilogues and final choice details render without changing the saved ending.');

const reviewDir=fs.mkdtempSync(path.join(os.tmpdir(),'after-zero-ending-review-'));
let exportedCount=0;
try {
  // Exercise the real exporter without requiring a previously generated review pack.
  execFileSync(process.execPath,['--import','tsx','scripts/export-ending-review.ts'],{
    env:{...process.env,ENDING_REVIEW_DIR:reviewDir},encoding:'utf8',
  });
  const exported=JSON.parse(fs.readFileSync(path.join(reviewDir,'01-ending-catalog.json'),'utf8'));
  assert.deepEqual(exported.map((e:any)=>e.id).sort(),Object.keys(P.catalog.ENDINGS).sort());
  exportedCount=exported.length;
} finally {
  // Only remove the directory this test created directly under the system temp folder.
  assert.equal(path.dirname(path.resolve(reviewDir)),path.resolve(os.tmpdir()));
  assert(path.basename(reviewDir).startsWith('after-zero-ending-review-'));
  fs.rmSync(reviewDir,{recursive:true,force:true});
}
console.log(`PASS: ending counts, ally deduplication, real reflections, archive snapshot, rendering and fresh export coverage for ${exportedCount} endings`);
