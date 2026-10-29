(function (root, factory) {
  const catalog = factory();
  if (typeof module === 'object' && module.exports) module.exports = catalog;
  else root.ZombieCatalog = catalog;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const fx = (path, value) => ({ type: 'stat', path, value });
  const stat = (key, value) => fx(`stats.${key}`, value);
  const item = (key, value) => fx(`items.${key}`, value);
  const memory = (key, value) => fx(`memory.${key}`, value);
  const PLACES = {
    shelter: { name: 'ห้องที่เคยเรียกว่าบ้าน', short: 'ที่หลบภัย', tag: 'SAFEHOUSE', description: 'รูปถ่ายที่จำหน้าไม่ได้ กับประตูที่ยังล็อกจากด้านใน', neighbors: ['streets'], color: '#adc977' },
    streets: { name: 'ถนนหมายเลขศูนย์', short: 'ถนนร้าง', tag: 'DEAD CITY', description: 'ไฟจราจรยังทำงาน แม้ไม่มีใครรอสัญญาณแล้ว', neighbors: ['shelter', 'hospital', 'nest', 'radio'], color: '#b9dc7e' },
    hospital: { name: 'โรงพยาบาลเซนต์ลาซารัส', short: 'โรงพยาบาล', tag: 'THE LAB', description: 'บางคนเคยเชื่อว่าความตายเป็นปัญหาที่แก้ไขได้', neighbors: ['streets', 'radio'], color: '#7dcfc8' },
    nest: { name: 'สถานีใต้ดินที่ไร้เสียงหัวใจ', short: 'รังใต้ดิน', tag: 'THE HIVE', description: 'พวกมันหันมามองเจ้า ราวกับกำลังรอคำสั่ง', neighbors: ['streets'], color: '#c5a5da' },
    radio: { name: 'หอส่งสัญญาณสุดท้าย', short: 'หอวิทยุ', tag: 'LAST SIGNAL', description: 'เสียงมนุษย์และเสียงของฝูง เดินทางผ่านสายไฟเส้นเดียวกัน', neighbors: ['streets', 'hospital'], color: '#e9bd76' }
  };
  const ACTIONS = [
    { id: 'scavenge', name: 'ค้นอาหารกระป๋องให้คนเป็น', glyph: '▦', places: ['streets'], note: 'อาหารกระป๋อง +3 · รื้อซากเสี่ยงบาดเจ็บ · ซอมบี้กินแล้วไม่อิ่ม', effects: [item('supplies', 3), stat('hp', -4)], eventTag: 'scavenge' },
    { id: 'endure', name: 'ทนหิวอยู่ตรงนี้อีกวัน', glyph: '◇', note: 'ไม่กินอะไร · ความหิวยังเพิ่มตามปกติ · ไม่มีใครบังคับให้ล่า', effects: [memory('endured', 1)], eventTag: 'endure' },
    { id: 'corpse', name: 'ตามหาศพที่ยังไม่เน่า', glyph: '▦', places: ['streets'], note: 'พบร่างในรถพยาบาล · เลือกเองว่าจะกินหรือเดินจากมา', encounter: 'ambulance' },
    { id: 'blood', name: 'เข้าไปที่ธนาคารเลือด', glyph: '▰', places: ['hospital'], note: 'เครื่องปั่นไฟยังทำงาน · เลือกว่าจะดื่ม แบ่ง หรือทิ้งไว้', encounter: 'bloodbank' },
    { id: 'rest', name: 'ปะติดปะต่อร่างกาย', glyph: '✚', places: ['shelter'], note: 'สุขภาพ +26 · สติ +5', effects: [stat('hp', 26), stat('sanity', 5)], eventTag: 'quiet' },
    { id: 'remember', name: 'มองรูปถ่ายในกระเป๋า', glyph: '▣', note: 'สติ +24 · ความเป็นมนุษย์ +3 · หิวเพิ่ม 4', effects: [stat('sanity', 24), stat('humanity', 3), stat('hunger', 4)], eventTag: 'memory' },
    { id: 'medicate', name: 'ใช้ชุดเย็บแผล', glyph: '+', cost: { medicine: 1 }, note: 'สุขภาพ +40', effects: [stat('hp', 40)], eventTag: 'quiet' },
    { id: 'labsearch', name: 'ค้นห้องแล็บที่ถูกทิ้ง', glyph: '⌑', places: ['hospital'], note: 'ตัวอย่าง +3 · ชุดเย็บแผล +1 · สุขภาพ -7', effects: [item('samples', 3), item('medicine', 1), stat('hp', -7), stat('research', 3)], eventTag: 'lab' },
    { id: 'research', name: 'ถอดรหัสบันทึกเซรุ่ม', glyph: '≡', places: ['hospital'], cost: { samples: 1 }, min: { sanity: 25 }, note: 'งานวิจัย +20 · สติ -4', effects: [stat('research', 20), stat('sanity', -4)], eventTag: 'lab' },
    { id: 'share', name: 'วางอาหารกระป๋องให้ผู้รอดชีวิต', glyph: '◇', places: ['radio'], cost: { supplies: 1 }, min: { sanity: 25 }, note: 'ความไว้ใจ +18 · ความเป็นมนุษย์ +10 · สติ +8', effects: [stat('trust', 18), stat('humanity', 10), stat('sanity', 8)], eventTag: 'human' },
    { id: 'hunt', name: 'ตามกลิ่นเลือดของคนเป็น', glyph: '╳', places: ['streets'], note: 'เข้าใกล้ผู้บาดเจ็บ · เจ้ายังเลือกกิน ช่วย หรือถอยได้', encounter: 'prey' },
    { id: 'recruit', name: 'สอนฝูงให้ฟังเสียงเจ้า', glyph: '♜', places: ['nest'], min: { mutation: 15 }, note: 'อำนาจฝูง +22 · กลายพันธุ์ +5 · สติ -7', effects: [stat('horde', 22), stat('mutation', 5), stat('sanity', -7), stat('humanity', -3)], eventTag: 'hive' },
    { id: 'adapt', name: 'ปล่อยร่างกายเขียนกฎใหม่', glyph: '⌘', places: ['nest'], cost: { samples: 1 }, note: 'กลายพันธุ์ +22 · สุขภาพ -8 · สติ -6', effects: [stat('mutation', 22), stat('hp', -8), stat('sanity', -6)], eventTag: 'hive' },
    { id: 'raid', name: 'ฝ่าด่านทหารที่ยังเหลือ', glyph: '!', places: ['streets'], note: 'อาหารกระป๋อง +2 · ตัวอย่าง +1 · สุขภาพ -25 · หิวเพิ่ม 8', effects: [item('supplies', 2), item('samples', 1), stat('hp', -25), stat('hunger', 8), stat('mutation', 8)], eventTag: 'hunt' },
    { id: 'campaign', name: 'ส่งฝูงออกยึดเขตมนุษย์', glyph: '⚑', places: ['nest'], min: { horde: 45, mutation: 35 }, note: 'ขยายการระบาด 1 ระยะ · อำนาจฝูง -8 · สติ -9', effects: [stat('campaign', 1), stat('horde', -8), stat('sanity', -9), stat('humanity', -15)], eventTag: 'hive', maxCampaign: 2 },
    { id: 'cure', name: 'ฉีดเซรุ่มเข็มสุดท้าย', glyph: '✚', places: ['hospital'], cost: { samples: 2 }, min: { research: 90, humanity: 55, sanity: 45, trust: 30 }, note: 'บทจบ: กลับเป็นมนุษย์ · จบชีวิตนี้ทันที', ending: 'human' },
    { id: 'crown', name: 'ขึ้นครองบัลลังก์ของฝูง', glyph: '♜', places: ['nest'], min: { horde: 90, mutation: 45, sanity: 25 }, note: 'บทจบ: ราชาซอมบี้ · จบชีวิตนี้ทันที', ending: 'king' },
    { id: 'evolve', name: 'ก้าวพ้นคำว่ามนุษย์และซอมบี้', glyph: '⌘', places: ['nest'], cost: { samples: 2 }, min: { mutation: 85, research: 35, sanity: 20 }, note: 'บทจบ: สายพันธุ์ใหม่ · จบชีวิตนี้ทันที', ending: 'evolved' },
    { id: 'extinguish', name: 'ส่งสัญญาณสุดท้ายไปทั่วโลก', glyph: '╳', places: ['radio'], min: { horde: 110, mutation: 80, campaign: 2, sanity: 10 }, note: 'บทจบ: โลกไร้มนุษย์ · จบชีวิตนี้ทันที', ending: 'extinction' }
  ];
  const ENDINGS = {
    death: { title: 'ตายเป็นครั้งที่สอง', tag: 'SECOND DEATH', color: '#ef8e7a', text: 'ครั้งแรกเจ้าเสียหัวใจ ครั้งนี้ร่างกายยอมแพ้เสียก่อน เรื่องราวที่ยังจำได้ดับลงพร้อมดวงตาคู่นั้น' },
    feral: { title: 'เหลือเพียงความหิว', tag: 'THE HOLLOW', color: '#db9b68', text: 'สามวันที่ไม่เหลือสติ รูปถ่ายกลายเป็นเพียงกระดาษ เสียงเรียกชื่อกลายเป็นเสียงรบกวน ร่างนี้ยังเดินต่อ แต่เจ้าไม่ได้อยู่ในนั้นแล้ว' },
    king: { title: 'ราชาแห่งผู้ไร้ชีพจร', tag: 'DEAD SOVEREIGN', color: '#c6abef', text: 'ฝูงนับไม่ถ้วนสงบลงเมื่อเจ้ายกมือ บัลลังก์สร้างจากเมืองเก่า และกฎข้อแรกของอาณาจักรใหม่จะเขียนด้วยสติที่เจ้ายังรักษาไว้' },
    evolved: { title: 'สิ่งมีชีวิตลำดับถัดไป', tag: 'SPECIES ZERO', color: '#aee27f', text: 'ร่างกายเลิกเลียนแบบมนุษย์ และเลิกเชื่อฟังความตาย เจ้าลืมตาขึ้นพร้อมสัมผัสใหม่ ไม่มีชื่อสำหรับสายพันธุ์นี้ จนกว่าเจ้าจะตั้งให้มัน' },
    human: { title: 'หัวใจเต้นอีกครั้ง', tag: 'HUMAN, AGAIN', color: '#7bd7cf', text: 'ความเจ็บปวดครั้งแรกหลังเซรุ่มไม่ใช่แผล แต่เป็นจังหวะเต้นในอก คนที่เจ้าเคยช่วยคอยจับมือไว้ ขณะที่เจ้าจำชื่อตนเองได้อีกครั้ง' },
    extinction: { title: 'โลกที่ไม่มีใครตอบกลับ', tag: 'THE LAST SIGNAL', color: '#f18e73', text: 'เมือง ตามด้วยภูมิภาค และเครือข่ายทั่วโลกดับลงทีละแห่ง สัญญาณของเจ้ามีผู้รับทุกที่ แต่ไม่มีเสียงมนุษย์ตอบกลับมาอีกเลย เจ้าชนะ และไม่มีใครเหลือให้บอกเรื่องนี้' },
    survivor: { title: 'คนตายที่ยังเลือกได้', tag: 'STILL HERE', color: '#e3c784', text: 'หกสิบวันผ่านไป เจ้าไม่ได้ครองโลกหรือแก้ไขความตาย แต่ทุกเช้ายังเลือกได้ว่าจะเป็นอะไร ในโลกแบบนี้ นั่นอาจเป็นชัยชนะที่ยากที่สุด' }
  };
  const EVENTS = [
    { id: 'ambulance', title: 'คนขับรถพยาบาลไม่หายใจแล้ว', text: 'ร่างยังไม่เน่า ไม่มีชีพจรให้หยุดอีกครั้ง แต่เขายังสวมป้ายชื่ออยู่ เจ้าจะกินหรือเดินจากไปก็ได้', choices: [
      { text: 'กินจากศพเพื่อให้ร่างเดินต่อได้', note: 'หิวลดมาก · ไม่ได้ฆ่าใคร · เสี่ยงจากบาดแผลและเนื้อที่ไม่สะอาด', effects: [stat('hunger', -40), stat('hp', -3), stat('mutation', 3), memory('corpseMeals', 1)] },
      { text: 'ปิดตาให้เขา แล้วเดินจากมา', note: 'ยังหิว · รักษาความตั้งใจของตนไว้', effects: [stat('humanity', 3), memory('endured', 1)] }
    ] },
    { id: 'bloodbank', title: 'ไฟสำรองยังเลี้ยงตู้เก็บเลือด', text: 'เลือดที่ยังใช้ได้เหลือจำกัด ในห้องข้างกันมีผู้รอดชีวิตที่ต้องใช้เลือดเช่นกัน ดื่มตรงนี้ได้ แต่ไม่มีตู้เย็นให้พกกลับ', choices: [
      { text: 'ดื่มเลือดหนึ่งถุง', bloodCost: 1, note: 'ลดหิวพอประทัง · ไม่ต้องฆ่าใคร · เลือดในตู้จะเหลือน้อยลง', effects: [stat('hunger', -30)] },
      { text: 'ส่งถุงเลือดให้คนในห้องข้าง ๆ', bloodCost: 1, pressure: true, note: 'ยังหิว · คนที่ช่วยจะจำเจ้าได้ · หิวจัดทำให้ฝืนเข้าใกล้คนยากขึ้น', effects: [stat('trust', 12), stat('humanity', 6), memory('saved', 1)] },
      { text: 'ปิดตู้ไว้แล้วถอยออกมา', note: 'ไม่ใช้เลือด · ไม่ได้กิน · เลือกทำอย่างอื่นต่อได้', effects: [memory('endured', 1)] }
    ] },
    { id: 'prey', title: 'เขายังมีชีวิตอยู่', text: 'ชายบาดเจ็บติดอยู่ในร้านขายยา เขาเห็นเจ้าแล้วพยายามลากตัวถอย กลิ่นเลือดบอกว่าเขาเป็นอาหาร แต่เขากำลังขอให้ช่วย', choices: [
      { text: 'ฆ่าเขาแล้วกิน', note: 'อิ่มมาก · เสี่ยงต่อสู้บาดเจ็บ · คนรู้จักเขาอาจจำเจ้าได้ · สติไม่ลดเพียงเพราะกินคน', effects: [stat('hunger', -52), stat('hp', -5), stat('mutation', 15), stat('humanity', -14), stat('trust', -8), memory('killed', 1)] },
      { text: 'พยุงเขาไปยังที่ที่มนุษย์จะพบ', pressure: true, note: 'ยังหิว · เสียแรงช่วย · ถ้าหิวจัดต้องฝืนตัวเองมากขึ้น', effects: [stat('hp', -5), stat('trust', 12), stat('humanity', 8), memory('saved', 1)] },
      { text: 'ถอยออกมาก่อนจะเปลี่ยนใจ', note: 'ยังหิว · ไม่ทำร้ายเขา · ไม่มีการบังคับให้กิน', effects: [memory('endured', 1)] }
    ] },
    { id: 'returned', title: 'คนที่เจ้าเคยช่วยกลับมา', followup: 'saved', text: 'เสียงเคาะสามครั้งดังจากนอกประตู คนที่เจ้าเคยไว้ชีวิตวางชุดเย็บแผลไว้ให้ “ฉันจำได้ว่าเธอหยุดตัวเอง” แล้วเขาก็ถอยไปให้ระยะห่าง', choices: [
      { text: 'รับของและปล่อยให้เขากลับอย่างปลอดภัย', note: 'ชุดเย็บแผล +1 · ความไว้ใจเพิ่ม', effects: [item('medicine', 1), stat('trust', 8)] },
      { text: 'ไม่เข้าใกล้ วันนี้ยังไว้ใจตัวเองไม่ได้', note: 'ยังหิว · เขาวางของไว้แล้วกลับไป', effects: [item('medicine', 1)] }
    ] },
    { id: 'wanted', title: 'ชื่อของคนที่หายไป', followup: 'killed', text: 'ประกาศตามหาคนที่เจ้าฆ่าถูกส่งไปทั่วคลื่นวิทยุ พยานบอกลักษณะของเจ้า ตอนนี้มนุษย์รู้แล้วว่าควรระวังใคร', choices: [
      { text: 'จำชื่อเขาไว้ แล้วเดินต่อ', note: 'ความไว้ใจลด · สิ่งที่ทำไปแล้วมีคนจำได้', effects: [stat('trust', -12)] },
      { text: 'เลี่ยงเส้นทางของผู้รอดชีวิต', note: 'เสียแรงอ้อมทาง · ความไว้ใจลดลงเล็กน้อย', effects: [stat('hp', -5), stat('trust', -5)] }
    ] },

    { id: 'awakening', title: 'เจ้าจำได้ว่าตนเองตายไปแล้ว', kicker: 'ปฐมบท', text: 'ตื่นขึ้นในห้องเดิม ไม่มีเสียงหัวใจ มีเพียงความหิว และรูปถ่ายในกระเป๋า ใบหน้าบนภาพดูคุ้นเคยอย่างน่ากลัว', choices: [
      { text: 'พูดชื่อบนหลังรูป แม้ยังจำไม่ได้ว่าเป็นใคร', note: 'สติ +8 · ความเป็นมนุษย์ +5', effects: [stat('sanity', 8), stat('humanity', 5)] },
      { text: 'ฟังเสียงความหิว มันอาจรู้วิธีอยู่รอด', note: 'กลายพันธุ์ +8 · มนุษยธรรม -5 · แค่ฟังความหิวไม่ได้ทำให้อิ่ม', effects: [ stat('mutation', 8), stat('humanity', -5)] }
    ] },
    { id: 'day7', day: 7, title: 'มีคนตอบวิทยุของเจ้า', kicker: 'สัญญาณจากมนุษย์', text: '“ถ้ายังเข้าใจคำพูด ช่วยเคาะสามครั้ง” เสียงจากหอวิทยุไม่ได้ถามว่าเจ้ายังเป็นมนุษย์หรือไม่ แต่ถามว่าเจ้ายังเลือกได้หรือเปล่า', choices: [
      { text: 'เคาะสามครั้ง แล้วบอกว่าจะไม่ทำร้ายใคร', note: 'ความไว้ใจ +12 · สติ +8', effects: [stat('trust', 12), stat('sanity', 8)] },
      { text: 'จดตำแหน่งเอาไว้ ฝูงอาจต้องการมัน', note: 'อำนาจฝูง +12 · กลายพันธุ์ +6', effects: [stat('horde', 12), stat('mutation', 6)] }
    ] },
    { id: 'day14', day: 14, title: 'คำสั่งกวาดล้าง', kicker: 'โลกเริ่มตอบโต้', text: 'ลำโพงทหารประกาศให้ผู้รอดชีวิตออกจากเมือง ก่อนปิดเส้นทางถาวร ยังมีห้องแล็บใต้โรงพยาบาล และรังใต้ดินที่พวกทหารไม่รู้จัก', choices: [
      { text: 'จำเส้นทางอพยพและช่วยคนที่หลงเหลือ', note: 'ความเป็นมนุษย์ +8 · ความไว้ใจ +8 · สุขภาพ -5', effects: [stat('humanity', 8), stat('trust', 8), stat('hp', -5)] },
      { text: 'พาฝูงหลบลงใต้ดิน', note: 'อำนาจฝูง +15 · สติ -5', effects: [stat('horde', 15), stat('sanity', -5)] }
    ] },
    { id: 'day28', day: 28, title: 'ข้อความที่ส่งไว้ก่อนตาย', kicker: 'ความทรงจำคืนกลับ', text: 'ในโทรศัพท์ที่แบตเตอรี่ใกล้หมด เจ้าพบบันทึกเสียงของตัวเอง “ถ้าฉันกลับมา อย่าปล่อยให้ความหิวเป็นคนตัดสินทุกอย่าง” ใต้ข้อความมีรหัสตู้เก็บตัวอย่าง', choices: [
      { text: 'ใช้รหัสนั้นตามหาคำตอบ', note: 'ตัวอย่าง +2 · งานวิจัย +10 · สติ +10', effects: [item('samples', 2), stat('research', 10), stat('sanity', 10)] },
      { text: 'ลบข้อความ ชีวิตเก่าไม่ใช่กฎของชีวิตนี้', note: 'กลายพันธุ์ +18 · สติ +6 · มนุษยธรรม -8', effects: [stat('mutation', 18), stat('sanity', 6), stat('humanity', -8)] }
    ] },
    { id: 'day45', day: 45, title: 'ก่อนโลกจะเงียบ', kicker: 'เหลืออีก 15 วัน', text: 'สถานีต่าง ๆ กำลังเงียบลง เจ้ารู้แล้วว่ามีทางกลับ มีบัลลังก์ และมีทางที่ไม่มีชื่อให้เดิน แต่เวลาที่เหลือกำลังสั้นลง', choices: [
      { text: 'ยังมีเวลาให้เลือกด้วยตนเอง', note: 'สติ +15 · อาหารกระป๋อง +1', effects: [stat('sanity', 15), item('supplies', 1)] },
      { text: 'รวมเสียงของฝูงเป็นเสียงเดียว', note: 'อำนาจฝูง +20 · กลายพันธุ์ +10', effects: [stat('horde', 20), stat('mutation', 10)] }
    ] },
    { id: 'shop', tags: ['scavenge'], title: 'กระป๋องสุดท้ายบนชั้น', text: 'มีมือเล็ก ๆ เอื้อมมาจากอีกฝั่งของชั้นวาง เด็กคนหนึ่งเห็นเจ้าแล้วหยุดหายใจ', choices: [
      { text: 'ถอยออกมาและวางอาหารไว้ให้', cost: { supplies: 1 }, note: 'ความไว้ใจ +10 · มนุษยธรรม +8 · สติ +5', effects: [stat('trust', 10), stat('humanity', 8), stat('sanity', 5)] },
      { text: 'เก็บกระป๋องของตน แล้วออกไปเงียบ ๆ', note: 'อาหารกระป๋อง +1 · เอาไว้ให้คนเป็น', effects: [item('supplies', 1)] }
    ] },
    { id: 'dog', tags: ['scavenge', 'memory'], title: 'มันยังจำกลิ่นเจ้าได้', text: 'สุนัขตัวหนึ่งเดินตามมา มันควรหนี แต่กลับวางหัวลงบนรองเท้าที่ขาดของเจ้า', choices: [
      { text: 'นั่งอยู่ด้วยกันสักพัก', note: 'สติ +10 · มนุษยธรรม +4', effects: [stat('sanity', 10), stat('humanity', 4)] },
      { text: 'ลุกออกไปก่อนที่มันจะไว้ใจมากกว่านี้', note: 'เจ้าจากมาโดยไม่ทำร้ายมัน · ความหิวไม่ลด', effects: [] }
    ] },
    { id: 'cache', tags: ['scavenge', 'quiet'], title: 'กล่องใต้ประตูเหล็ก', text: 'แสงจาง ๆ เผยเครื่องหมายกาชาดบนกล่องที่ติดอยู่ใต้บานประตู', choices: [
      { text: 'ใช้แขนรับน้ำหนักแล้วยกกล่องออก', note: 'ชุดเย็บแผล +1 · สุขภาพ -5', effects: [item('medicine', 1), stat('hp', -5)] },
      { text: 'จดจำตำแหน่งไว้ แล้วไม่ฝืนร่างกาย', note: 'สติ +3', effects: [stat('sanity', 3)] }
    ] },
    { id: 'mirror', tags: ['quiet', 'memory'], title: 'คนในกระจกขยับช้ากว่าเจ้า', text: 'เจ้าลองยิ้ม ภาพสะท้อนเหมือนกำลังรอคำสั่ง ความทรงจำเล็กน้อยผุดขึ้นมา เป็นวันที่ยังยิ้มโดยไม่ต้องคิด', choices: [
      { text: 'จำวันนั้นให้นานที่สุด', note: 'สติ +8 · มนุษยธรรม +3', effects: [stat('sanity', 8), stat('humanity', 3)] },
      { text: 'ฝึกให้ร่างใหม่นี้เชื่อฟัง', note: 'กลายพันธุ์ +5', effects: [stat('mutation', 5)] }
    ] },
    { id: 'doctor', tags: ['lab'], title: 'แพทย์หลังประตูกระจก', text: 'เธอยังมีชีวิต และไม่เล็งอาวุธ “ถ้าเข้าใจฉัน วางตัวอย่างไว้ตรงช่องส่งของ”', choices: [
      { text: 'ส่งตัวอย่างให้และฟังคำอธิบาย', cost: { samples: 1 }, min: { sanity: 25 }, note: 'งานวิจัย +12 · ความไว้ใจ +6', effects: [stat('research', 12), stat('trust', 6)] },
      { text: 'แสดงว่ามีสติ แล้วเก็บตัวอย่างไว้ก่อน', note: 'สติ +5 · งานวิจัย +3', effects: [stat('sanity', 5), stat('research', 3)] }
    ] },
    { id: 'culture', tags: ['lab'], title: 'ตัวอย่างที่ยังเรืองแสง', text: 'แสงสีเขียวเคลื่อนไหวอยู่ในภาชนะ บันทึกข้าง ๆ ไม่ได้เขียนว่ายารักษา แต่เขียนว่า “ทางเลือก”', choices: [
      { text: 'เก็บเพื่อศึกษาอย่างระมัดระวัง', note: 'ตัวอย่าง +1 · งานวิจัย +5', effects: [item('samples', 1), stat('research', 5)] },
      { text: 'ปล่อยให้มันเปลี่ยนร่างกาย', note: 'กลายพันธุ์ +12 · สุขภาพ -7', effects: [stat('mutation', 12), stat('hp', -7)] }
    ] },
    { id: 'name', tags: ['human'], title: 'เธอเรียกเจ้าว่าคน', text: 'ครั้งแรกในหลายวันที่ไม่มีใครใช้คำว่า “มัน” เด็กสาวถามว่าอยากให้เรียกชื่ออะไร', choices: [
      { text: 'บอกชื่อที่ยังจำได้', min: { sanity: 25 }, note: 'ความไว้ใจ +10 · สติ +8', effects: [stat('trust', 10), stat('sanity', 8)] },
      { text: 'ชี้ไปที่รูปถ่ายโดยไม่พูด', note: 'ความเป็นมนุษย์ +5 · สติ +4', effects: [stat('humanity', 5), stat('sanity', 4)] }
    ] },
    { id: 'kneel', tags: ['hive'], title: 'ฝูงตัวแรกคุกเข่าลง', text: 'เสียงของเจ้าทำให้คนตายเงียบทั้งสถานี มีบางอย่างในร่างกายตอบรับการเชื่อมต่อนี้', choices: [
      { text: 'ให้พวกมันจำเสียงของเจ้า', note: 'อำนาจฝูง +10 · กลายพันธุ์ +5 · สติ -3', effects: [stat('horde', 10), stat('mutation', 5), stat('sanity', -3)] },
      { text: 'ปล่อยให้พวกมันออกไปตามลำพัง', note: 'สติ +7', effects: [stat('sanity', 7)] }
    ] },
    { id: 'pulse', tags: ['hunt', 'hive'], title: 'เสียงหัวใจที่ยังเหลือ', text: 'สัญชาตญาณบอกตำแหน่งเหยื่อก่อนที่ตาจะมองเห็น เจ้าอาจฝึกประสาทสัมผัสนี้ หรือปฏิเสธมัน', choices: [
      { text: 'จำจังหวะของทุกหัวใจ', note: 'กลายพันธุ์ +8 · อำนาจฝูง +5 · มนุษยธรรม -5', effects: [stat('mutation', 8), stat('horde', 5), stat('humanity', -5)] },
      { text: 'ถอยออกมาจนเสียงเงียบ', note: 'สติ +6 · หิวเพิ่ม 5', effects: [stat('sanity', 6), stat('hunger', 5)] }
    ] }
  ];
  const ROUTES = {
    human: { name: 'กลับเป็นมนุษย์', subtitle: 'ยังมีใครบางคนรออยู่', action: 'cure' },
    king: { name: 'ครองฝูง', subtitle: 'ให้คนตายมีราชา', action: 'crown' },
    evolved: { name: 'สายพันธุ์ใหม่', subtitle: 'เขียนกฎชีวิตขึ้นใหม่', action: 'evolve' },
    extinction: { name: 'โลกไร้มนุษย์', subtitle: 'เหลือเสียงเจ้าเพียงเสียงเดียว', action: 'extinguish' }
  };
  const LABELS = { hp: 'สุขภาพ', hunger: 'ความหิว', sanity: 'สติ', humanity: 'ความเป็นมนุษย์', trust: 'ความไว้ใจ', mutation: 'กลายพันธุ์', horde: 'อำนาจฝูง', research: 'งานวิจัย', campaign: 'การระบาด', supplies: 'อาหารกระป๋อง', medicine: 'ชุดเย็บแผล', samples: 'ตัวอย่าง' };
  return { PLACES, ACTIONS, EVENTS, ENDINGS, ROUTES, LABELS };
});
