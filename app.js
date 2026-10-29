(() => {
  'use strict';
  const C = window.ZombieCatalog, E = window.ZombieEngine;
  const SAVE_KEY = 'awake-zombie-prototype-save-v1', META_KEY = 'awake-zombie-prototype-meta-v1';
  const $ = id => document.getElementById(id);
  let state, storageAvailable = true, toastTimer, lastEvent = '', lastEnding = '';
  let unlocked = [];
  try {
    const meta = JSON.parse(localStorage.getItem(META_KEY) || '[]');
    unlocked = Array.isArray(meta) ? [...new Set(meta.filter(id => C.ENDINGS[id]))] : [];
    const raw = localStorage.getItem(SAVE_KEY); state = raw ? E.validate(JSON.parse(raw)) : E.create(newSeed());
  } catch (error) {
    state = E.create(newSeed());
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) localStorage.setItem(`${SAVE_KEY}-recovery`, raw); } catch { storageAvailable = false; }
    setTimeout(() => toast('อ่านเซฟเดิมไม่ได้ เก็บสำเนาไว้เมื่อพื้นที่จัดเก็บอนุญาต และเริ่มชีวิตใหม่ให้แล้ว'), 200);
  }
  function newSeed() { return window.crypto?.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : Date.now() >>> 0; }
  function node(tag, text, className) { const element = document.createElement(tag); if (text != null) element.textContent = text; if (className) element.className = className; return element; }
  function toast(text) { $('toast').textContent = text; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3000); }
  function save(announce = false) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); localStorage.setItem(META_KEY, JSON.stringify(unlocked)); storageAvailable = true; }
    catch { storageAvailable = false; }
    $('save-status').textContent = storageAvailable ? 'บันทึกอัตโนมัติ · เวลาหยุดเมื่อไม่กดเล่น' : 'พื้นที่บันทึกไม่พร้อม · ส่งออกเซฟเก็บไว้ได้';
    if (announce) toast(storageAvailable ? 'บันทึกชีวิตนี้แล้ว' : 'บันทึกไม่ได้ โปรดส่งออกเซฟเก็บไว้');
  }
  function perform(id) { const result = E.act(state, id); if (!result.ok) return toast(result.reason); changed(); }
  function changed() { if (state.ending && !unlocked.includes(state.ending.id)) unlocked.push(state.ending.id); save(); render(); }
  function render() {
    document.body.classList.toggle('feral', state.stats.sanity <= 20);
    $('day-number').textContent = String(state.day).padStart(2, '0');
    const place = C.PLACES[state.place];
    $('scene-tag').textContent = place.tag; $('place-name').textContent = place.name; $('place-description').textContent = place.description;
    $('location-label').textContent = place.short;
    $('species-label').textContent = state.stats.sanity === 0 ? 'เสียงของเจ้ากำลังหายไป' : state.stats.mutation >= 70 ? 'บางสิ่งกำลังก้าวพ้นร่างเดิม' : state.stats.mutation >= 35 ? 'ร่างกายเริ่มเปลี่ยนไป' : 'ผู้ตายที่ยังมีสติ';
    for (const key of ['hp', 'hunger', 'sanity']) {
      const value = state.stats[key]; $(''+key+'-value').replaceChildren(document.createTextNode(String(Math.floor(value))), node('small', '/100'));
      const meter = $(key+'-meter'); meter.setAttribute('aria-valuenow', value); meter.querySelector('i').style.width = `${value}%`;
      meter.parentElement.classList.toggle('critical', key === 'hunger' ? value >= 85 : value <= 25);
    }
    const warnings = [];
    if (state.stats.hunger >= 75) warnings.push('ความหิวใกล้วิกฤต หาเลือดหรือเนื้อมนุษย์หรือเลือกทนต่อไป ร่างกายจะเสียสุขภาพเมื่อจบวันที่หิว 85 ขึ้นไป');
    if (state.stats.hp <= 25) warnings.push('ร่างกายใกล้ดับ พักที่บ้านหรือใช้ชุดเย็บแผล');
    if (state.stats.sanity <= 25) warnings.push(`สติต่ำ บางตัวเลือกถูกปิด · ใช้รูปถ่ายเพื่อเรียกสติกลับมา${state.stats.sanity === 0 ? ` · ไร้สติ ${state.feralDays}/3 วัน` : ''}`);
    $('warning').hidden = !warnings.length; $('warning').textContent = warnings.join(' · ');
    $('body-note').textContent = state.stats.hunger >= 85 ? 'ทุกกลิ่นคล้ายเลือด ร่างกำลังพัง แต่เจ้าจะกินหรือไม่ยังเลือกเอง · เข้าใกล้คนเพื่อช่วย: สติเสียเพิ่ม 6 และสุขภาพ 3' : state.stats.hunger >= 75 ? 'กลิ่นเลือดรบกวนความคิด · ฝืนช่วยคนตอนนี้เสียสติเพิ่ม 6 และสุขภาพ 3 แต่ไม่มีการบังคับให้กิน' : state.stats.hunger >= 50 ? 'ความอยากเริ่มชัดขึ้น จะออกหาอาหารหรือทำเรื่องอื่นต่อก็ได้' : 'ยังควบคุมความหิวได้ · อาหารกระป๋องเลี้ยงคนเป็น ร่างนี้ต้องการเลือดหรือเนื้อมนุษย์';
    renderActions(); renderRoutes(); renderInventory(); renderPlaces(); renderJournal(); renderCollection(); renderDialogs(); drawScene();
  }
  function renderActions() {
    const primary = $('actions'), extra = $('other-actions'); primary.replaceChildren(); extra.replaceChildren();
    const candidates = E.actions(state).filter(action => !action.move && !action.ending && (!action.places || action.places.includes(state.place)));
    for (const action of candidates) {
      const reasons = E.requirements(state, action), button = node('button', null, 'action-card'); button.type = 'button'; button.dataset.action = action.id;
      const copy = node('span'); copy.append(node('strong', action.name), node('small', action.note));
      if (reasons.length && !state.pending && !state.ending) copy.append(node('small', reasons.join(' · ')));
      button.append(node('span', action.glyph, 'glyph'), copy); button.disabled = reasons.length > 0; button.title = reasons.join(' · ') || `${action.name} · ใช้ 1 วัน`;
      button.onclick = () => perform(action.id); (['endure','corpse','hunt','blood','remember','rest'].includes(action.id) ? primary : extra).append(button);
    }
  }
  function renderPlaces() {
    const wrap = $('places'); wrap.replaceChildren();
    for (const [id, place] of Object.entries(C.PLACES)) {
      const button = node('button', null, `place-button${id === state.place ? ' current' : ''}`); button.type = 'button'; button.dataset.place = id;
      const connected = C.PLACES[state.place].neighbors.includes(id);
      button.append(node('span', place.short), node('small', id === state.place ? 'อยู่ที่นี่' : connected ? 'เดินทาง · 1 วัน' : 'ต้องผ่านถนนร้าง'));
      button.disabled = id === state.place || !connected || !!state.pending || !!state.ending;
      if (id === state.place) button.setAttribute('aria-current', 'location');
      button.onclick = () => perform(`move:${id}`); wrap.append(button);
    }
  }
  function renderRoutes() {
    const tabs = $('route-tabs'); tabs.replaceChildren();
    for (const [id, route] of Object.entries(C.ROUTES)) {
      const button = node('button', route.name, id === state.route ? 'selected' : ''); button.type = 'button'; button.dataset.route = id;
      button.setAttribute('aria-pressed', String(state.route === id)); button.onclick = () => { E.setRoute(state, id); save(); renderRoutes(); }; tabs.append(button);
    }
    const route = C.ROUTES[state.route], action = C.ACTIONS.find(action => action.id === route.action);
    $('route-subtitle').textContent = route.subtitle + ' · เป็นเพียงทางที่ติดตาม เปลี่ยนใจได้เสมอ';
    const wrap = $('route-requirements'); wrap.replaceChildren();
    const requirement = (label, current, target, ready) => { const row = node('div', null, `requirement${ready ? ' ready' : ''}`); row.append(node('span', label), node('b', `${ready ? '✓ พร้อม' : 'ยังต้องค้นหาต่อ'}`)); wrap.append(row); };
    for (const [key, value] of Object.entries(action.min || {})) requirement(C.LABELS[key], Math.floor(state.stats[key]), value, state.stats[key] >= value);
    for (const [key, value] of Object.entries(action.cost || {})) requirement(C.LABELS[key], state.items[key], value, state.items[key] >= value);
    requirement('สถานที่', C.PLACES[state.place].short, action.places.map(id => C.PLACES[id].short).join('/'), action.places.includes(state.place));
    const reasons = E.requirements(state, action), button = $('finale-button'); button.textContent = action.name; button.disabled = reasons.length > 0; button.dataset.action = action.id;
    button.onclick = () => perform(action.id);
    $('finale-reason').textContent = state.ending ? 'ชีวิตนี้จบลงแล้ว เริ่มชีวิตใหม่เพื่อค้นหาทางอื่นได้' : reasons.length ? `ลองไป${action.places.map(id=>C.PLACES[id].short).join('/')} แล้วสะสมประสบการณ์ด้านนี้ต่อ · ไม่ต้องเลือกบทจบตั้งแต่วันนี้` : 'พร้อมแล้ว · การกระทำนี้ใช้ 1 วันและจบเรื่องทันที';
  }
  function renderInventory() {
    const wrap = $('inventory'); wrap.replaceChildren();
    for (const key of ['supplies', 'medicine', 'samples']) { const box = node('div'); box.append(node('b', state.items[key]), node('small', C.LABELS[key])); wrap.append(box); }
    const stats = $('secondary-stats'); stats.replaceChildren();
    for (const key of ['humanity', 'trust', 'mutation', 'horde', 'research']) {
      const row = node('div', null, 'secondary-row'), bar = node('div', null, 'mini-meter'), fill = node('i');
      fill.style.width = `${Math.min(100, state.stats[key])}%`; bar.append(fill); row.append(node('span', C.LABELS[key]), node('b', `${Math.floor(state.stats[key])}${key === 'horde' ? ' / 200' : ' / 100'}`), bar); stats.append(row);
    }
    $('campaign-label').textContent = ['การระบาด: ยังจำกัดอยู่ในเมือง', 'การระบาด: เมืองล่มแล้ว · เป้าหมายต่อไปคือภูมิภาค', 'การระบาด: ภูมิภาคล่มแล้ว · คลื่นสุดท้ายต้องใช้หอวิทยุ'][state.stats.campaign];
  }
  function renderJournal() {
    const wrap = $('journal'); wrap.replaceChildren();
    for (const entry of state.log) { const row = node('li', null, entry.kind); row.append(node('time', `DAY ${String(entry.day).padStart(2,'0')}`), node('span', entry.text)); wrap.append(row); }
  }
  function renderCollection() {
    $('ending-count').textContent = `${unlocked.length} / ${Object.keys(C.ENDINGS).length}`;
    const wrap = $('ending-collection'); wrap.replaceChildren();
    for (const [id, ending] of Object.entries(C.ENDINGS)) { const row = node('div', null, `collection-item${unlocked.includes(id) ? ' unlocked' : ''}`); row.append(node('span', unlocked.includes(id) ? '◆' : '◇'), node('div', ending.title)); wrap.append(row); }
  }
  function renderDialogs() {
    const dialog = $('event-dialog');
    if (state.pending && !state.ending) {
      const event = C.EVENTS.find(event => event.id === state.pending.eventId);
      $('event-title').textContent = event.title; $('event-text').textContent = event.text;
      $('event-kicker').textContent = `${event.kicker || 'เสียงจากโลกที่ยังไม่เงียบ'} · วันที่ ${state.day}`;
      $('event-time-note').textContent = (event.id === 'bloodbank' ? `เลือดที่ยังใช้ได้ในตู้: ${state.bloodLeft} ถุง · ` : '') + (state.pending.turn ? 'เป็นเหตุการณ์ของกิจกรรมวันนี้ · เลือกแล้วจึงสรุปวัน ไม่เสียวันเพิ่มอีกครั้ง' : 'บทสนทนานี้ไม่ใช้วัน · เลือกแล้วจึงทำกิจกรรมของวันนี้ได้');
      const wrap = $('event-choices'); wrap.replaceChildren();
      event.choices.forEach((choice, index) => {
        const reasons = E.choiceReasons(state, choice), button = node('button', null, 'choice-button'); button.type = 'button'; button.dataset.choice = index;
        button.append(node('strong', choice.text), node('small', choice.note || '')); if (reasons.length) button.append(node('small', reasons.join(' · ')));
        button.disabled = reasons.length > 0; button.onclick = () => { const result = E.choose(state, index); if (result.ok) changed(); else toast(result.reason); }; wrap.append(button);
      });
      if (!dialog.open) dialog.showModal();
      if (lastEvent !== event.id) { wrap.querySelector('button:not(:disabled)')?.focus(); lastEvent = event.id; }
    } else { if (dialog.open) dialog.close(); lastEvent = ''; }
    if (state.ending && lastEnding !== state.ending.id) {
      lastEnding = state.ending.id; const ending = C.ENDINGS[state.ending.id];
      $('ending-tag').textContent = ending.tag; $('ending-title').textContent = ending.title; $('ending-text').textContent = ending.text;
      $('ending-seal').textContent = {death:'×',feral:'?',king:'♜',evolved:'⌘',human:'♥',extinction:'∅',survivor:'◇'}[state.ending.id];
      $('ending-seal').style.color = ending.color; $('ending-seal').style.borderColor = ending.color;
      $('ending-summary').replaceChildren(node('span', `วันที่ ${state.ending.day}`), node('span', `สติ ${state.stats.sanity}`), node('span', `กลายพันธุ์ ${state.stats.mutation}`), node('span', `บทจบสะสม ${unlocked.length}/7`));
      $('ending-dialog').showModal(); $('ending-restart').focus();
    }
  }
  function restart() { for (const id of ['event-dialog','ending-dialog','restart-dialog']) if ($(id).open) $(id).close(); lastEvent = ''; lastEnding = ''; state = E.create(newSeed()); changed(); window.scrollTo({top:0,behavior:'instant'}); }
  $('menu-toggle').onclick = () => { const menu = $('save-menu'); menu.hidden = !menu.hidden; $('menu-toggle').setAttribute('aria-expanded', String(!menu.hidden)); };
  $('save-button').onclick = () => save(true);
  $('export-button').onclick = () => { const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'}), url = URL.createObjectURL(blob), link = node('a'); link.href = url; link.download = `after-zero-day-${state.day}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('ส่งออกเซฟแล้ว'); };
  $('import-button').onclick = () => $('import-file').click();
  $('import-file').onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    try { if (file.size > 1024*1024) throw new Error('ไฟล์ใหญ่เกิน 1 MB'); const imported = E.validate(JSON.parse(await file.text())); for (const id of ['event-dialog','ending-dialog']) if ($(id).open) $(id).close(); state = imported; lastEvent = ''; lastEnding = ''; changed(); toast('นำเข้าชีวิตนี้แล้ว'); }
    catch (error) { toast(`นำเข้าไม่ได้: ${error.message}`); }
    event.target.value = '';
  };
  $('restart-button').onclick = () => $('restart-dialog').showModal(); $('cancel-restart').onclick = () => $('restart-dialog').close(); $('confirm-restart').onclick = restart;
  $('ending-restart').onclick = restart; $('ending-close').onclick = () => $('ending-dialog').close();
  $('event-dialog').addEventListener('cancel', event => event.preventDefault());
  window.addEventListener('beforeunload', () => save());

  const canvas = $('world-canvas'), ctx = canvas.getContext('2d');
  function drawScene(frame = 0) {
    if (!ctx) return; ctx.imageSmoothingEnabled = false;
    const color = { sky:'#14251f', back:'#1c3329', mid:'#284433', floor:'#2c4130', lime:'#c0e38b', window:'#92ad6b' };
    const rect = (x,y,w,h,c) => {ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
    rect(0,0,320,144,color.sky);
    rect(235,13,16,16,'#b7c58a'); rect(231,17,24,8,'#b7c58a'); rect(235,13,8,16,'#8d9d72');
    for (let i=0;i<17;i++) { const x=(i*43+17)%320, h=18+(i*19)%48; rect(x,86-h,18+(i%3)*9,h,color.back); if(i%2===0) rect(x+4,87-h,3,3,'#496645'); }
    if (state.place === 'shelter') {
      rect(0,14,93,109,'#2b392a'); rect(3,14,87,6,'#40513a'); rect(13,42,46,40,'#0d1913'); rect(16,45,40,32,'#456044'); rect(34,45,3,32,'#12241a'); rect(16,59,40,3,'#12241a');
      rect(160,38,147,86,'#23372a'); rect(164,42,139,5,'#3b523a'); rect(180,68,29,44,'#0d1d14'); rect(184,71,21,39,'#354633'); rect(199,90,2,2,'#c4c27c');
      rect(243,84,44,26,'#33422f'); rect(245,82,40,5,'#596347'); rect(256,63,13,17,'#ced1a0'); rect(259,67,7,9,'#697d54');
    } else if (state.place === 'hospital') {
      rect(130,17,176,106,'#46665a'); rect(134,21,168,5,'#6f9280'); rect(190,75,46,48,'#19362d'); rect(211,77,3,46,'#5d9b88'); rect(143,38,24,27,'#92b8a0');
      rect(247,38,40,26,'#284d42'); rect(251,42,32,18,'#89ab92'); rect(201,29,8,25,'#d4dcb0'); rect(193,37,24,8,'#d4dcb0');
      rect(101,80,16,42,'#45604b'); rect(105,74,8,8,'#9bd2a3');
    } else if (state.place === 'nest') {
      rect(107,35,190,89,'#2b3b30'); rect(117,45,170,79,'#0b1710'); rect(125,52,154,7,'#526249'); rect(139,59,126,65,'#14261b');
      for(let i=0;i<5;i++){rect(158+i*21,113-i*4,21,5,'#3b4f37');}
      for(let i=0;i<8;i++){ const x=141+i*18;rect(x,94+(i%2)*6,5,9,'#74905f');rect(x-1,103+(i%2)*6,7,14,'#34452c');rect(x+1,97+(i%2)*6,1,1,'#d7df91'); }
    } else if (state.place === 'radio') {
      rect(228,13,4,111,'#829574'); for(let i=0;i<6;i++){rect(211+i*3,105-i*16,37-i*6,3,'#657b5a');}rect(217,8,26,2,'#94ac7f');rect(230,3,2,9,'#dda579');
      rect(124,71,75,52,'#2e4a36');rect(128,75,67,5,'#4f6a46');rect(145,91,21,32,'#101f17');rect(175,86,13,12,'#a1ae71');
      for(let i=0;i<3;i++)rect(242+i*9,18+i*5,2,7,'#6f8962');
    } else {
      rect(115,40,72,82,'#304a37');rect(119,45,64,5,'#516746');rect(123,59,20,28,'#152d20');rect(153,58,24,29,'#a3ae75');rect(153,72,24,3,'#47583e');
      rect(206,57,91,67,'#28402f');rect(212,66,79,8,'#536346');rect(218,83,29,40,'#13271a');rect(257,83,29,18,'#76895b');
      rect(98,31,3,93,'#82916b');rect(96,30,18,4,'#617b56');rect(108,33,6,4,'#e0d597');
      rect(244,114,44,13,'#475a3b');rect(252,109,22,8,'#596b49');rect(249,124,6,7,'#101b13');rect(277,124,6,7,'#101b13');
    }
    rect(0,123,320,21,color.floor); rect(0,123,320,2,'#6b7850');
    for(let i=0;i<36;i++){rect((i*37)%320,128+(i*11)%14,3+(i%3)*2,1,i%2?'#43543a':'#61704a');}
    const x=65, y=86, breathe=frame%6<3?0:1;
    rect(x-7,y+44,28,3,'#132219'); rect(x,y+30,6,15,'#303b2a');rect(x+11,y+30,6,15,'#303b2a');rect(x-2,y+43,8,3,'#101d14');rect(x+11,y+43,9,3,'#101d14');
    rect(x-3,y+15+breathe,23,20,'#697a43');rect(x+2,y+17+breathe,5,18,'#8e9856');rect(x+11,y+22+breathe,3,5,'#293822');
    rect(x-7,y+17+breathe,5,17,'#869a5b');rect(x+20,y+17+breathe,5,17,'#869a5b');
    rect(x,y+1+breathe,18,17,'#9cb473');rect(x+3,y-2+breathe,13,5,'#344b31');rect(x-2,y+5+breathe,3,9,'#7e985e');rect(x+5,y+8+breathe,3,3,frame%29===0?'#7c925c':'#172b1b');rect(x+13,y+8+breathe,3,3,frame%29===0?'#7c925c':'#172b1b');rect(x+9,y+14+breathe,6,2,'#435a39');
    if(state.stats.mutation>=45){rect(x+16,y-4,4,8,'#d0d69b');rect(x-4,y+8,3,6,'#c4ce92');}
    if(state.stats.horde>=45){for(let i=0;i<3;i++){const a=23+i*14;rect(a,107,6,7,'#7e965d');rect(a-1,114,8,14,'#344b31');}}
    for(let i=0;i<9;i++){const a=(i*39+frame)%320;rect(a,30+(i*17)%70,1,1,'#697f55');}
    if(state.stats.sanity<=20){rect(0,0,320,2,'#ad7855');rect(0,142,320,2,'#ad7855');}
  }
  let frame=0, lastFrame=0;
  function animate(time) { if(time-lastFrame>180){lastFrame=time;drawScene(frame++);} requestAnimationFrame(animate); }
  changed();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(animate);
  // Public read-only snapshot for inspection; UI actions still pass through the engine.
  window.__zombie = { snapshot: () => JSON.parse(JSON.stringify(state)) };
})();
