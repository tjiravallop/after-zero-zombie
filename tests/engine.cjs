const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const E = require('../engine.js'), C = require('../data/catalog.js');
const results = [];
function test(name, fn) { try { const detail = fn(); results.push({name,passed:true,detail}); console.log('PASS', name); } catch(error) { results.push({name,passed:false,error:error.message}); console.error('FAIL',name,error.message); process.exitCode=1; } }
function choose(s, goal) {
  const event = C.EVENTS.find(e => e.id === s.pending.eventId);
  if (event.id === 'ambulance' || event.id === 'prey') { assert(E.choose(s,0).ok); return; }
  const weights = goal === 'human' ? {research:2,trust:1,humanity:1,sanity:1,hp:1,supplies:4,samples:4} : goal === 'evolved' ? {research:2,mutation:2,horde:.2,sanity:1,hp:1,supplies:4,samples:5} : {mutation:2,horde:2,sanity:1,hp:1,supplies:4,samples:1};
  let best = -Infinity, index = 0;
  event.choices.forEach((choice,i) => {
    if (E.choiceReasons(s,choice).length) return;
    let score = 0;
    for (const effect of choice.effects || []) { const key=effect.path.split('.')[1]; score += effect.value * (weights[key] || 0); if(key==='hp' && s.stats.hp<35) score += effect.value*3; if(key==='sanity' && s.stats.sanity<35) score += effect.value*3; }
    for (const [key,value] of Object.entries(choice.cost || {})) score -= value*(weights[key] || 1)*2;
    if(score > best) {best=score;index=i;}
  });
  assert(E.choose(s,index).ok);
}
function target(s, place, action) {
  if(s.place===place) return action;
  const queue=[[s.place,[]]], seen=new Set([s.place]);
  while(queue.length) {const [current,route]=queue.shift(); for(const next of C.PLACES[current].neighbors){if(seen.has(next))continue;const leg=[...route,next];if(next===place)return `move:${leg[0]}`;seen.add(next);queue.push([next,leg]);}}
  throw new Error('disconnected map');
}
function policy(s, goal) {
  if(s.stats.hp<=30) return s.items.medicine>0?'medicate':target(s,'shelter','rest');
  if(s.stats.sanity<=32) return 'remember';
  if(s.stats.hunger>=62) return target(s,'streets',goal==='human'?'corpse':'hunt');
  const final=C.ACTIONS.find(a=>a.id===C.ROUTES[goal]?.action);
  if(final && !E.requirements(s,final).length) return final.id;
  if(goal==='human' && s.items.supplies<1) return target(s,'streets','scavenge');
  if(goal==='human') {
    if(s.stats.trust<30) return target(s,'radio','share');
    if(s.stats.humanity<55 || s.stats.sanity<45) return 'remember';
    if(s.stats.research<90 || s.items.samples<2) return target(s,'hospital', s.items.samples<3?'labsearch':'research');
    return target(s,'hospital','cure');
  }
  if(goal==='evolved') {
    if(s.stats.research<35 || s.items.samples<3) return target(s,'hospital',s.items.samples<3?'labsearch':'research');
    if(s.stats.mutation<85) return target(s,'nest','adapt');
    return target(s,'nest','evolve');
  }
  if(s.stats.mutation<(goal==='king'?45:80)) return target(s,'streets','hunt');
  if(goal==='king') return target(s,'nest',s.stats.horde>=90?'crown':'recruit');
  if(goal==='extinction') {
    if(s.stats.campaign<2) {
      const need=s.stats.campaign===0?55:85;
      if(s.stats.horde<need) return target(s,'nest','recruit');
      if(s.items.supplies<2) return target(s,'streets','scavenge');
      return target(s,'nest','campaign');
    }
    if(s.stats.horde<110) return target(s,'nest','recruit');
    if(s.items.supplies<2) return target(s,'streets','scavenge');
    return target(s,'radio','extinguish');
  }
  return target(s,'shelter','rest');
}
function run(goal, seed=113) {
  const s=E.create(seed), trace=[];
  for(let steps=0;steps<400 && !s.ending;steps++) {
    if(s.pending) {choose(s,goal);continue;}
    const action=policy(s,goal); trace.push({day:s.day,action,hp:s.stats.hp,hunger:s.stats.hunger,sanity:s.stats.sanity,supplies:s.items.supplies});
    const result=E.act(s,action); assert(result.ok, `${action}: ${result.reason}`);
  }
  assert(s.ending,'no ending'); return {state:s,trace};
}
test('authored IDs and references are valid',()=>{
  for(const collection of [C.ACTIONS,C.EVENTS]) assert.equal(new Set(collection.map(x=>x.id)).size,collection.length);
  for(const place of Object.values(C.PLACES)) for(const id of place.neighbors) assert(C.PLACES[id]);
  const sample=E.create(1);
  for(const action of C.ACTIONS) {for(const id of action.places||[])assert(C.PLACES[id]);if(action.ending)assert(C.ENDINGS[action.ending]);for(const fx of action.effects||[])assert.equal(typeof E.readStatePath(sample,fx.path),'number');}
  for(const event of C.EVENTS) assert(event.choices.some(c=>!c.cost&&!c.min),'event has no unconditional fallback');
});
test('opening choice consumes no day; action consumes exactly one',()=>{const s=E.create(7);assert(E.choose(s,0).ok);assert.equal(s.day,1);E.act(s,'remember');if(s.pending)E.choose(s,0);assert.equal(s.day,2);assert.equal(s.completedDays,1);});
test('invalid location and missing costs mutate nothing',()=>{const s=E.create(3);E.choose(s,0);const before=JSON.stringify(s);assert(!E.act(s,'research').ok);assert.equal(JSON.stringify(s),before);s.place='radio';s.items.supplies=0;const next=JSON.stringify(s);assert(!E.act(s,'share').ok);assert.equal(JSON.stringify(s),next);});
test('pending event roundtrip neither replays rewards nor taxes twice',()=>{
  let saved;
  for(let seed=0;seed<50;seed++){const s=E.create(seed);E.choose(s,0);E.act(s,'remember');if(s.pending?.turn){saved=s;break;}}
  assert(saved);const restored=E.validate(JSON.parse(JSON.stringify(saved))),day=restored.day,supplies=restored.items.supplies;
  assert(!E.act(restored,'remember').ok);E.choose(restored,0);assert.equal(restored.day,day+1);assert.equal(restored.items.supplies,supplies);const snapshot=JSON.stringify(restored);assert(!E.choose(restored,0).ok);assert.equal(JSON.stringify(restored),snapshot);
});
test('same seed and choices are reproducible',()=>{const a=run('human',113),b=run('human',113);assert.deepEqual(a.state,b.state);});
for(const [goal, ending] of Object.entries({human:'human',king:'king',evolved:'evolved',extinction:'extinction'})) test(`from a fresh life to ${goal}`,()=>{const {state,trace}=run(goal);assert.equal(state.ending.id,ending,JSON.stringify({ending:state.ending,stats:state.stats,items:state.items,trace:trace.slice(-8)}));return {day:state.day,ending:state.ending.id,actions:trace.length};});
test('low sanity changes choices; remembering can recover before feral ending',()=>{const s=E.create(1);E.choose(s,0);s.place='hospital';s.stats.sanity=0;s.items.samples=3;assert(E.requirements(s,C.ACTIONS.find(a=>a.id==='research')).length);E.act(s,'remember');if(s.pending)choose(s,'human');assert(s.stats.sanity>0);assert(!s.ending);});
test('three days without sanity ends the conscious life, not immediately',()=>{const s=E.create(1);E.choose(s,0);s.stats.sanity=0;s.items.supplies=20;for(let i=0;i<3;i++){E.act(s,'endure');if(s.pending){const event=C.EVENTS.find(e=>e.id===s.pending.eventId);const choice=event.choices.findIndex(c=>(c.effects||[]).every(fx=>fx.path!=='stats.sanity'));E.choose(s,choice>=0?choice:0);s.stats.sanity=0;}if(i<2)assert(!s.ending);}assert.equal(s.ending.id,'feral');});
test('fatal body damage resolves death and prevents further actions',()=>{const s=E.create(1);E.choose(s,0);s.place='streets';s.stats.hp=5;E.act(s,'raid');assert.equal(s.ending.id,'death');assert(!E.act(s,'eat').ok);});
test('sixty daily actions reach the survivor ending',()=>{const s=E.create(9);E.choose(s,0);for(let i=0;i<200&&!s.ending;i++){if(s.pending){choose(s,'human');continue;}const action=s.stats.hunger>60?target(s,'streets','corpse'):s.stats.sanity<40?'remember':target(s,'shelter','rest');assert(E.act(s,action).ok);}assert.equal(s.ending.id,'survivor');assert.equal(s.completedDays,60);});
test('save validation rejects broken types and preserves plain text logs',()=>{const s=E.create(1);s.log[0].text='<img src=x onerror=alert(1)>';assert.equal(E.validate(s).log[0].text,s.log[0].text);for(const mutate of [s=>s.version=99,s=>s.stats.hp='85',s=>s.place='void',s=>s.pending.eventId='fake',s=>s.items.supplies=-1]){const x=E.create(2);mutate(x);assert.throws(()=>E.validate(x));}});
test('looking for prey never eats before an explicit decision',()=>{const s=E.create(1);E.choose(s,0);s.place='streets';const hunger=s.stats.hunger,sanity=s.stats.sanity;E.act(s,'hunt');assert.equal(s.stats.hunger,hunger);assert.equal(s.memory.killed,0);E.choose(s,2);assert.equal(s.stats.hunger,hunger+8);assert.equal(s.stats.sanity,sanity-1);assert.equal(s.memory.killed,0);});
test('eating a human does not directly damage sanity',()=>{const s=E.create(1);E.choose(s,0);s.place='streets';const sanity=s.stats.sanity;E.act(s,'hunt');E.choose(s,0);assert.equal(s.stats.sanity,sanity-1);assert.equal(s.memory.killed,1);assert(s.stats.hunger<30);});
test('enduring severe hunger never forces feeding',()=>{const s=E.create(1);E.choose(s,0);s.stats.hunger=90;E.act(s,'endure');assert.equal(s.stats.hunger,98);assert.equal(s.stats.hp,75);assert.equal(s.memory.endured,1);assert.equal(s.memory.killed,0);});
test('blood is finite and leaving the empty bank remains possible',()=>{const s=E.create(1);E.choose(s,0);s.place='hospital';s.bloodLeft=1;E.act(s,'blood');E.choose(s,0);assert.equal(s.bloodLeft,0);E.act(s,'blood');const before=JSON.stringify(s);assert(!E.choose(s,0).ok);assert.equal(JSON.stringify(s),before);assert(E.choose(s,2).ok);});
test('helping while hungry is costly but remains a player choice',()=>{const s=E.create(1);E.choose(s,0);s.place='streets';s.stats.hunger=80;const sanity=s.stats.sanity;E.act(s,'hunt');E.choose(s,1);assert.equal(s.memory.saved,1);assert.equal(s.memory.killed,0);assert.equal(s.stats.sanity,sanity-7);E.act(s,'endure');assert.equal(s.pending.eventId,'returned');assert.equal(s.pending.turn,false);const day=s.day;E.choose(s,0);assert.equal(s.day,day);assert.equal(s.items.medicine,2);});
test('old provisions migrate to human supplies and preserve pending choices',()=>{const old=E.create(1);old.version=1;old.items.food=old.items.supplies;delete old.items.supplies;delete old.memory;delete old.bloodLeft;const next=E.validate(old);assert.equal(next.version,2);assert.equal(next.items.supplies,3);assert.equal(next.pending.eventId,'awakening');assert.equal(next.memory.killed,0);});
fs.mkdirSync(path.join(__dirname,'../outputs'),{recursive:true});fs.writeFileSync(path.join(__dirname,'../outputs/engine-results.json'),JSON.stringify(results,null,2));console.log(`${results.filter(r=>r.passed).length}/${results.length} passed`);
module.exports={run};
