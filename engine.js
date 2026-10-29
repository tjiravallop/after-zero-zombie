(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data/catalog.js'));
  else root.ZombieEngine = factory(root.ZombieCatalog);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (C) {
  'use strict';
  const VERSION = 2, MAX_DAY = 60;
  // Reused verbatim from One Life in Sect's root app.js.
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  function readStatePath(s, path) {
    return String(path || '').split('.').reduce((value, key) => value == null ? undefined : value[key], s);
  }
  // The original stat-effect and bounded-journal contracts are adapted for this game.
  function applyEffects(s, effects = []) {
    effects.forEach(effect => {
      if (effect.type !== 'stat' || !/^(stats|items|memory)\.[a-z]+$/i.test(effect.path) || !Number.isFinite(effect.value)) throw new Error('Invalid authored effect');
      const [group, key] = effect.path.split('.');
      if (!Object.hasOwn(s[group], key)) throw new Error('Unknown effect key');
      s[group][key] += effect.value;
      if (group === 'memory' && ['saved','killed'].includes(key) && !s.memory[key+'On']) s.memory[key+'On'] = s.day;
    });
    normalize(s);
  }
  function normalize(s) {
    for (const key of Object.keys(s.stats)) s.stats[key] = clamp(s.stats[key], 0, key === 'horde' ? 200 : key === 'campaign' ? 2 : 100);
    for (const key of Object.keys(s.items)) s.items[key] = clamp(s.items[key], 0, 99);
  }
  function log(s, text, kind = 'routine') {
    s.serial++; s.log.unshift({ id: s.serial, day: s.day, text, kind }); s.log = s.log.slice(0, 70);
  }
  function random(s) { s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0; return s.seed / 4294967296; }
  function create(seed = Date.now()) {
    return { version: VERSION, seed: Number(seed) >>> 0, initialSeed: Number(seed) >>> 0, day: 1, completedDays: 0, serial: 1, place: 'shelter', route: 'human', stats: { hp: 85, hunger: 30, sanity: 72, humanity: 65, trust: 0, mutation: 0, horde: 0, research: 0, campaign: 0 }, items: { supplies: 3, medicine: 1, samples: 0 }, bloodLeft: 8, memory: { saved: 0, killed: 0, corpseMeals: 0, endured: 0, savedOn: 0, killedOn: 0 }, pending: { eventId: 'awakening', turn: false }, ending: null, feralDays: 0, seen: ['awakening'], eventHistory: {}, log: [{ id: 1, day: 1, text: 'เจ้าตื่นขึ้นมา โดยไม่มีเสียงหัวใจ', kind: 'story' }] };
  }
  function actions(s) {
    const travel = C.PLACES[s.place].neighbors.map(id => ({ id: `move:${id}`, name: `ไป${C.PLACES[id].short}`, glyph: '→', note: 'ย้ายสถานที่ · ใช้ 1 วัน', move: id, effects: [] }));
    return [...C.ACTIONS, ...travel];
  }
  function requirements(s, action) {
    const reasons = [];
    if (!action) return ['ไม่พบกิจกรรมนี้'];
    if (s.ending) reasons.push('ชีวิตนี้จบลงแล้ว');
    if (s.pending) reasons.push('เลือกคำตอบของเหตุการณ์ก่อน');
    if (action.places && !action.places.includes(s.place)) reasons.push(`ต้องไป${action.places.map(id => C.PLACES[id].short).join(' / ')} · ตอนนี้อยู่${C.PLACES[s.place].short}`);
    if (action.move && !C.PLACES[s.place].neighbors.includes(action.move)) reasons.push('ไม่มีทางเชื่อมจากที่นี่');
    for (const [key, value] of Object.entries(action.cost || {})) if (s.items[key] < value) reasons.push(`${C.LABELS[key]} ${s.items[key]}/${value}`);
    for (const [key, value] of Object.entries(action.min || {})) if (s.stats[key] < value) reasons.push(`${C.LABELS[key]} ${Math.floor(s.stats[key])}/${value}`);
    if (action.maxCampaign && s.stats.campaign >= action.maxCampaign) reasons.push('ยึดเมืองและภูมิภาคแล้ว ขั้นสุดท้ายอยู่ที่หอวิทยุ');
    if (action.id === 'campaign' && s.stats.campaign === 1) {
      if (s.stats.horde < 75) reasons.push(`อำนาจฝูง ${s.stats.horde}/75`);
      if (s.stats.mutation < 55) reasons.push(`กลายพันธุ์ ${s.stats.mutation}/55`);
    }
    return reasons;
  }
  function choiceReasons(s, choice) {
    const reasons = [];
    if (choice.bloodCost && s.bloodLeft < choice.bloodCost) reasons.push('เลือดที่ยังใช้ได้หมดแล้ว');
    for (const [key, value] of Object.entries(choice.cost || {})) if (s.items[key] < value) reasons.push(`${C.LABELS[key]} ${s.items[key]}/${value}`);
    for (const [key, value] of Object.entries(choice.min || {})) if (s.stats[key] < value) reasons.push(`${C.LABELS[key]} ${s.stats[key]}/${value}`);
    return reasons;
  }
  function pay(s, cost) { for (const [key, value] of Object.entries(cost || {})) s.items[key] -= value; }
  function finish(s, id) { s.ending = { id, day: s.day }; s.pending = null; log(s, C.ENDINGS[id].title, 'ending'); }
  function finishDay(s, endingCandidate) {
    s.stats.hunger += 8; s.stats.sanity -= 1;
    if (s.stats.hunger >= 100) { s.stats.hp -= 20; log(s, 'ความหิวกัดกินร่างกาย สุขภาพ -20', 'danger'); }
    else if (s.stats.hunger >= 85) { s.stats.hp -= 10; log(s, 'อดอยากจนร่างเริ่มพัง สุขภาพ -10', 'danger'); }
    normalize(s); s.completedDays++;
    s.feralDays = s.stats.sanity === 0 ? s.feralDays + 1 : 0;
    if (s.stats.hp <= 0) return finish(s, 'death');
    if (s.feralDays >= 3) return finish(s, 'feral');
    if (endingCandidate) return finish(s, endingCandidate);
    if (s.day >= MAX_DAY) return finish(s, 'survivor');
    s.day++;
    const story = C.EVENTS.find(event => event.day === s.day && !s.seen.includes(event.id));
    const consequence = C.EVENTS.find(event => event.followup && s.memory[event.followup] > 0 && s.day >= s.memory[event.followup+'On'] + 2 && !s.seen.includes(event.id));
    const next = story || consequence;
    if (next) { s.pending = { eventId: next.id, turn: false }; s.seen.push(next.id); }
  }
  function selectEvent(s, tag) {
    const candidates = C.EVENTS.filter(event => event.tags?.includes(tag) && s.day - (s.eventHistory[event.id] ?? -20) >= 4);
    if (!candidates.length || random(s) > .62) return null;
    return candidates[Math.floor(random(s) * candidates.length)];
  }
  function act(s, id) {
    const action = actions(s).find(action => action.id === id);
    const reasons = requirements(s, action);
    if (reasons.length) return { ok: false, reason: reasons.join(' · ') };
    pay(s, action.cost); applyEffects(s, action.effects || []);
    if (action.move) s.place = action.move;
    log(s, `${action.name}${action.cost ? ` · ใช้ ${Object.entries(action.cost).map(([key, value]) => `${C.LABELS[key]} ${value}`).join(', ')}` : ''}`, action.ending ? 'story' : 'routine');
    if (s.stats.hp <= 0) { finishDay(s); return { ok: true }; }
    const event = action.encounter ? C.EVENTS.find(event => event.id === action.encounter) : !action.ending && selectEvent(s, action.eventTag || 'quiet');
    if (event) { s.pending = { eventId: event.id, turn: true }; s.eventHistory[event.id] = s.day; }
    else finishDay(s, action.ending);
    return { ok: true };
  }
  function choose(s, index) {
    if (s.ending || !s.pending) return { ok: false, reason: 'ไม่มีเหตุการณ์รอเลือก' };
    const event = C.EVENTS.find(event => event.id === s.pending.eventId), choice = event?.choices[index];
    if (!choice) return { ok: false, reason: 'ไม่มีตัวเลือกนี้' };
    const reasons = choiceReasons(s, choice); if (reasons.length) return { ok: false, reason: reasons.join(' · ') };
    const turn = s.pending.turn;
    if (choice.bloodCost) s.bloodLeft -= choice.bloodCost;
    if (choice.pressure && s.stats.hunger >= 75) {
      s.stats.sanity -= 6; s.stats.hp -= 3;
      log(s, 'เจ้าฝืนเข้าใกล้คนทั้งที่หิวจัด สติ -6 · สุขภาพ -3 แต่ยังเลือกไม่กิน', 'danger');
    }
    pay(s, choice.cost); applyEffects(s, choice.effects || []); s.pending = null;
    log(s, `${event.title} — ${choice.text}`, 'story');
    if (turn) finishDay(s);
    else if (s.stats.hp <= 0) finish(s, 'death');
    return { ok: true };
  }
  function setRoute(s, route) { if (!C.ROUTES[route]) return false; s.route = route; return true; }
  function validate(input) {
    if (!input || ![1, VERSION].includes(input.version)) throw new Error('เวอร์ชันเซฟไม่รองรับ');
    const s = JSON.parse(JSON.stringify(input));
    if (s.version === 1) {
      const oldFood = s.items?.food;
      if (!Number.isFinite(oldFood) || oldFood < 0 || oldFood > 99) throw new Error('เสบียงเดิมไม่ถูกต้อง');
      delete s.items.food; s.items.supplies = oldFood;
      s.memory = create(1).memory; s.bloodLeft = 8; s.version = VERSION;
      s.log.unshift({id: ++s.serial, day: s.day, text: 'กติกาใหม่: ของกินเดิมคืออาหารกระป๋องสำหรับมนุษย์ ร่างซอมบี้ต้องหาเลือดหรือเนื้อมนุษย์เอง', kind: 'story'});
    }
    if (!C.PLACES[s.place] || !C.ROUTES[s.route] || !Number.isInteger(s.day) || s.day < 1 || s.day > MAX_DAY) throw new Error('ตำแหน่งหรือวันไม่ถูกต้อง');
    const base = create(1);
    if (!Number.isInteger(s.bloodLeft) || s.bloodLeft < 0 || s.bloodLeft > 8) throw new Error('จำนวนเลือดไม่ถูกต้อง');
    if (!s.memory || Object.keys(s.memory).length !== Object.keys(base.memory).length || Object.keys(base.memory).some(key => !Number.isInteger(s.memory[key]) || s.memory[key] < 0 || s.memory[key] > 120)) throw new Error('ความทรงจำไม่ถูกต้อง');
    for (const group of ['stats', 'items']) {
      if (!s[group] || Object.keys(s[group]).length !== Object.keys(base[group]).length) throw new Error('ข้อมูลสถานะไม่ครบ');
      for (const key of Object.keys(base[group])) if (!Number.isFinite(s[group][key]) || s[group][key] < 0 || s[group][key] > (group === 'items' ? 99 : key === 'horde' ? 200 : key === 'campaign' ? 2 : 100)) throw new Error('ค่าสถานะไม่ถูกต้อง');
    }
    for (const key of ['seed', 'initialSeed', 'completedDays', 'serial', 'feralDays']) if (!Number.isInteger(s[key]) || s[key] < 0) throw new Error('ข้อมูลเวลาไม่ถูกต้อง');
    if (s.pending && (!C.EVENTS.some(e => e.id === s.pending.eventId) || typeof s.pending.turn !== 'boolean')) throw new Error('เหตุการณ์ค้างไม่ถูกต้อง');
    if (s.ending && (!C.ENDINGS[s.ending.id] || s.pending)) throw new Error('บทจบไม่ถูกต้อง');
    if (!Array.isArray(s.seen) || !s.seen.every(id => C.EVENTS.some(e => e.id === id))) throw new Error('ประวัติไม่ถูกต้อง');
    s.log = Array.isArray(s.log) ? s.log.slice(0, 70).map(entry => ({ id: Number(entry.id) || 0, day: clamp(Number(entry.day) || 1, 1, MAX_DAY), text: String(entry.text).slice(0, 600), kind: ['routine', 'danger', 'story', 'ending'].includes(entry.kind) ? entry.kind : 'routine' })) : [];
    s.eventHistory = s.eventHistory && typeof s.eventHistory === 'object' && !Array.isArray(s.eventHistory) ? Object.fromEntries(Object.entries(s.eventHistory).filter(([id, day]) => C.EVENTS.some(e => e.id === id) && Number.isInteger(day) && day >= 1 && day <= s.day)) : {};
    return s;
  }
  return { VERSION, MAX_DAY, create, actions, requirements, choiceReasons, act, choose, setRoute, validate, readStatePath };
});
