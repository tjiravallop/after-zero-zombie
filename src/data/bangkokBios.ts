import type { CharacterBioDossier } from './pastLifeEchoes';

// Fictional Bangkok residents in 2026; bonuses follow the scale of the original dossiers.
type NewBio = Omit<CharacterBioDossier, 'applyToState' | 'startingNote' | 'perkSummary'> & {
  startingStats: Partial<Record<'hp' | 'hunger' | 'sanity' | 'humanity' | 'research' | 'horde', number>>;
  startingItems?: Partial<Record<'supplies' | 'medicine', number>>;
  perkSummary: string;
};

const residents: NewBio[] = [
  {
    id: 'bio_mototaxi_34m', age: 34, gender: 'ชาย', occupation: 'วินมอเตอร์ไซค์ปากซอยย่านดินแดง',
    fullNameHint: 'บัตรคิววินที่เขียนชื่อเล่นว่าเอก', clothingClue: 'เสื้อวินสีส้มทับเสื้อแขนยาวสีเทา',
    personalItemClue: 'หมวกกันน็อกสำรองที่มีแผนที่ซอยพับอยู่ข้างใน',
    signatureItemName: 'หมวกกันน็อกสำรองและแผนที่คิววิน', signatureItemDesc: 'จำทางเชื่อมระหว่างตรอกได้ ใช้วางเส้นทางพาคนหลบจุดเสี่ยง',
    specialChoiceLabel: '[ความถนัดวินมอเตอร์ไซค์] ชี้ตรอกลัดและให้หมวกกันน็อกป้องกันศีรษะ',
    specialChoiceOutcome: 'เจ้าเคาะเส้นทางบนแผนที่แล้วสวมหมวกสำรองให้เขา ก่อนนำลอดตรอกที่เคยรับส่งคนทุกเช้า',
    specialChoiceEffect: { sanity: 4, humanity: 5, npcTrustDelta: 7, hunger: 6 },
    preDeathDetail: 'ในเดือนตุลาคม 2026 เจ้ารับผู้โดยสารเที่ยวสุดท้ายจากดินแดง แต่กลับจำได้เพียงเสียงวิทยุแจ้งปิดถนนและหมวกสำรองที่ไม่มีใครรับคืน',
    autopsyObservation: 'รอยกัดใต้แขนเสื้อเริ่มตกสะเก็ด นิ้วยังกำกุญแจรถแน่น แม้เครื่องยนต์จะดับไปนานแล้ว',
    daysInfectedEstimate: 2, startingStats: { hp: 4, sanity: 4 }, perkSummary: 'สภาพร่าง +4 · สติ +4',
  },
  {
    id: 'bio_vendor_46f', age: 46, gender: 'หญิง', occupation: 'แม่ค้าข้าวแกงตลาดคลองเตย',
    fullNameHint: 'สมุดจดข้าวกล่องของป้าน้อย', clothingClue: 'ผ้ากันเปื้อนสีแดงและผ้าขาวม้าพาดบ่า',
    personalItemClue: 'ทัพพีสเตนเลสกับสมุดยอดข้าวกล่อง',
    signatureItemName: 'ทัพพีและสมุดแบ่งเสบียง', signatureItemDesc: 'จัดสรรอาหารให้คนเป็นได้ อาหารเหล่านี้ไม่ลดความหิวของร่างซอมบี้',
    specialChoiceLabel: '[ความถนัดแม่ค้าข้าวแกง] จัดเสบียงให้คนเจ็บและคนที่ดูแลเขา',
    specialChoiceOutcome: 'เจ้าขีดแบ่งมื้อบนกระดาษให้ทุกคนได้ส่วนเท่ากัน ความเคยชินหลังแผงอาหารยังอยู่ แม้เจ้าจะกินร่วมกับพวกเขาไม่ได้',
    specialChoiceEffect: { supplies: 1, humanity: 5, npcTrustDelta: 7, hunger: 6 },
    preDeathDetail: 'เช้ามืดเดือนตุลาคม 2026 เจ้าเตรียมข้าวกล่องให้ลูกค้าย่านคลองเตย กระดาษสั่งอาหารยังคั่นอยู่ในสมุดที่เปื้อนน้ำแกง',
    autopsyObservation: 'มีรอยข่วนที่ข้อเท้าและผิวซีดเย็น มือยังจำการตักอาหารให้คนอื่นได้',
    daysInfectedEstimate: 3, startingStats: { humanity: 6 }, startingItems: { supplies: 1 }, perkSummary: 'เสบียงมนุษย์ +1 · ความเห็นใจ +6',
  },
  {
    id: 'bio_nurse_29f', age: 29, gender: 'หญิง', occupation: 'พยาบาลเวรดึกโรงพยาบาลย่านราชวิถี',
    fullNameHint: 'ป้ายเวรที่ติดชื่อพิม', clothingClue: 'ชุดสครับสีฟ้าหม่นกับหมวกผ้ารวบผม', personalItemClue: 'กรรไกรตัดผ้าพันแผลและไฟฉายตรวจรูม่านตา',
    signatureItemName: 'กรรไกรพยาบาลและไฟฉายตรวจอาการ', signatureItemDesc: 'ประเมินบาดแผลและจัดท่าคนเจ็บก่อนเคลื่อนย้าย',
    specialChoiceLabel: '[ความถนัดพยาบาล] ประเมินอาการและพันแผลก่อนพาไปหลบ',
    specialChoiceOutcome: 'เจ้าวางกรรไกรให้เห็นก่อนเข้าใกล้ แล้วพันแผลด้วยท่าทางที่ร่างกายยังจำได้ คนเจ็บค่อย ๆ หยุดดิ้นหนี',
    specialChoiceEffect: { hp: 3, humanity: 5, npcTrustDelta: 8, hunger: 6 },
    preDeathDetail: 'เจ้าอยู่ต่อหลังหมดเวรในคืนหนึ่งของเดือนตุลาคม 2026 เพื่อช่วยเคลื่อนย้ายผู้ป่วย บัตรคล้องคอยังติดตารางเวรที่ไม่ได้ขีดวันหยุด',
    autopsyObservation: 'รอยกัดเหนือข้อมือถูกพันไว้ด้วยมือข้างเดียวอย่างเรียบร้อย เส้นเลือดดำแต่สติยังตอบสนองต่อเสียงขอความช่วยเหลือ',
    daysInfectedEstimate: 2, startingStats: { sanity: 4 }, startingItems: { medicine: 1 }, perkSummary: 'ชุดเย็บแผล +1 · สติ +4',
  },
  {
    id: 'bio_electrician_41m', age: 41, gender: 'ชาย', occupation: 'ช่างไฟอาคารชุดย่านห้วยขวาง',
    fullNameHint: 'ใบงานซ่อมไฟที่เซ็นชื่อช่างชัย', clothingClue: 'ชุดช่างสีน้ำเงินและหมวกนิรภัยสีเหลือง', personalItemClue: 'ไขควงหุ้มฉนวนกับสมุดผังตู้ไฟ',
    signatureItemName: 'ไขควงหุ้มฉนวนและผังวงจร', signatureItemDesc: 'ตรวจวงจรและต่อสัญญาณเตือนได้เมื่ออุปกรณ์ยังใช้การได้',
    specialChoiceLabel: '[ความถนัดช่างไฟ] ต่อไฟสัญญาณบอกทางเข้าที่หลบภัย',
    specialChoiceOutcome: 'เจ้าถอดสายที่ชำรุดออกแล้วต่อไฟดวงเล็กให้กะพริบ คนหลงทางจึงมองเห็นทางเข้าที่ปลอดภัย',
    specialChoiceEffect: { research: 8, sanity: 3, npcTrustDelta: 7, hunger: 6 },
    preDeathDetail: 'งานสุดท้ายในเดือนตุลาคม 2026 คือไฟดับทั้งชั้นของอาคารในห้วยขวาง เสียงเคาะจากห้องมิเตอร์ดังอยู่ในความจำไม่หยุด',
    autopsyObservation: 'รอยกัดที่น่องอยู่เหนือรองเท้านิรภัย มือมีคราบเขม่าจากงานซ่อมก่อนติดเชื้อ',
    daysInfectedEstimate: 4, startingStats: { research: 8, hp: 3 }, perkSummary: 'งานวิจัย +8 · สภาพร่าง +3',
  },
  {
    id: 'bio_cleaner_52f', age: 52, gender: 'หญิง', occupation: 'พนักงานกวาดถนนย่านพระนคร',
    fullNameHint: 'ป้ายชื่อมาลีบนเสื้อสะท้อนแสง', clothingClue: 'เสื้อสะท้อนแสงสีเขียวและหมวกปีกกว้าง', personalItemClue: 'คีมคีบขยะกับถุงมือหนา',
    signatureItemName: 'คีมคีบและถุงมือทำงาน', signatureItemDesc: 'เคลียร์เศษแก้วและสิ่งกีดขวางโดยไม่ใช้มือเปล่า',
    specialChoiceLabel: '[ความถนัดงานกวาดถนน] เปิดทางผ่านเศษแก้วให้ผู้รอดชีวิต',
    specialChoiceOutcome: 'เจ้าใช้คีมย้ายเศษโลหะออกทีละชิ้น เปิดทางแคบ ๆ ให้คนเจ็บผ่านไปโดยไม่ต้องเหยียบเศษแก้ว',
    specialChoiceEffect: { supplies: 1, sanity: 3, npcTrustDelta: 6, hunger: 6 },
    preDeathDetail: 'เจ้าจำเส้นทางกวาดถนนยามฟ้าสางในพระนครได้ดีกว่าชื่อตัวเอง รถเก็บขยะเที่ยวเดือนตุลาคม 2026 ไม่เคยมารับของตามนัด',
    autopsyObservation: 'มีรอยกัดที่หัวไหล่ใต้เสื้อสะท้อนแสง ร่างยังคงหยุดเก็บสิ่งกีดขวางเมื่อเดินผ่าน',
    daysInfectedEstimate: 5, startingStats: { hp: 6, sanity: 3 }, perkSummary: 'สภาพร่าง +6 · สติ +3',
  },
  {
    id: 'bio_barista_25m', age: 25, gender: 'ชาย', occupation: 'บาริสต้าร้านกาแฟย่านอารีย์',
    fullNameHint: 'ป้ายชื่อบาริสต้าต้น', clothingClue: 'ผ้ากันเปื้อนสีน้ำตาลทับเสื้อครีม', personalItemClue: 'กระติกน้ำกับปากกาเขียนชื่อบนแก้ว',
    signatureItemName: 'กระติกน้ำและปากกาเขียนแก้ว', signatureItemDesc: 'ใช้เขียนข้อความแทนการพูดและแบ่งน้ำให้คนเป็น กาแฟไม่ทำให้ซอมบี้อิ่ม',
    specialChoiceLabel: '[ความถนัดบาริสต้า] เขียนข้อความให้มั่นใจแล้วแบ่งน้ำสะอาด',
    specialChoiceOutcome: 'เจ้าเขียนว่าไม่ทำร้ายลงบนแก้วเปล่า วางกระติกไว้แล้วถอย คนตรงหน้าจึงกล้าหยิบน้ำไปดื่ม',
    specialChoiceEffect: { sanity: 5, humanity: 5, npcTrustDelta: 7, hunger: 6 },
    preDeathDetail: 'ในร้านย่านอารีย์เดือนตุลาคม 2026 มีแก้วที่เขียนชื่อผิดค้างอยู่หน้าเคาน์เตอร์ เจ้าจำเสียงหัวเราะของลูกค้าคนนั้นได้ แต่จำหน้าตัวเองไม่ได้',
    autopsyObservation: 'ผิวเย็นซีดและมีรอยกัดที่ต้นแขน กลิ่นกาแฟยังเรียกความทรงจำได้แต่ไม่หยุดความหิว',
    daysInfectedEstimate: 2, startingStats: { sanity: 8, humanity: 3 }, perkSummary: 'สติ +8 · ความเห็นใจ +3',
  },
  {
    id: 'bio_developer_28f', age: 28, gender: 'หญิง', occupation: 'นักพัฒนาแอปบริษัทเล็กย่านพระราม 9',
    fullNameHint: 'บัตรพนักงานชื่อเมย์ข้างสติกเกอร์รูปแมว', clothingClue: 'เสื้อฮู้ดสีม่วงกับแว่นกรอบกลม', personalItemClue: 'สมุดรหัสสำรองกับสายต่อข้อมูล',
    signatureItemName: 'สมุดผังระบบและสายต่อข้อมูล', signatureItemDesc: 'อ่านบันทึกจากเครื่องที่ยังมีไฟและจัดข้อมูลให้ใช้วางแผนได้',
    specialChoiceLabel: '[ความถนัดนักพัฒนาแอป] เรียงข้อมูลจุดปลอดภัยจากบันทึกออฟไลน์',
    specialChoiceOutcome: 'เจ้าไล่เวลาบนบันทึกที่เก็บไว้ในเครื่องแล้ววงจุดที่ยังติดต่อได้ ไม่ต้องมีอินเทอร์เน็ตก็พอมองเห็นเส้นทางที่ควรลอง',
    specialChoiceEffect: { research: 10, sanity: 3, npcTrustDelta: 6, hunger: 6 },
    preDeathDetail: 'งานแก้แอปคืนเดือนตุลาคม 2026 จบลงเมื่อสัญญาณเครือข่ายหายทั้งย่านพระราม 9 สมุดรหัสสำรองยังอยู่ แต่โทรศัพท์เปิดไม่ติด',
    autopsyObservation: 'พบรอยกัดหลังมือที่มีคราบหมึกจดงาน นิ้วยังขยับราวกับกำลังพิมพ์ประโยคที่ค้างอยู่',
    daysInfectedEstimate: 3, startingStats: { research: 10, sanity: 3 }, perkSummary: 'งานวิจัย +10 · สติ +3',
  },
  {
    id: 'bio_boatcrew_37m', age: 37, gender: 'ชาย', occupation: 'พนักงานประจำเรือคลองแสนแสบ',
    fullNameHint: 'สมุดตั๋วเรือที่เขียนชื่อบอย', clothingClue: 'เสื้อชูชีพสีส้มทับเสื้อกรมท่า', personalItemClue: 'เชือกผูกเรือสั้นกับกระบอกใส่ตั๋ว',
    signatureItemName: 'เชือกผูกเรือและนกหวีด', signatureItemDesc: 'ผูกจุดยึดช่วยคนข้ามพื้นต่างระดับ ไม่ได้สร้างเรือหรือเส้นทางเดินทางใหม่',
    specialChoiceLabel: '[ความถนัดลูกเรือ] ผูกเชือกพยุงคนเจ็บผ่านจุดลื่น',
    specialChoiceOutcome: 'เจ้าทดสอบปมเชือกก่อนส่งปลายให้เขาจับ ท่ามกลางเสียงฝูงที่ใกล้เข้ามา คนเจ็บข้ามพื้นลื่นได้โดยไม่ล้ม',
    specialChoiceEffect: { hp: 3, humanity: 4, npcTrustDelta: 7, hunger: 6 },
    preDeathDetail: 'เสียงนกหวีดที่ท่าเรือคลองแสนแสบในเดือนตุลาคม 2026 เป็นสิ่งสุดท้ายที่จำได้ ตั๋วเที่ยวสุดท้ายในกระบอกยังไม่ได้ฉีก',
    autopsyObservation: 'รอยกัดใต้เสื้อชูชีพเริ่มดำคล้ำ มือยังผูกเงื่อนเชือกได้แม้ไม่มีชีพจร',
    daysInfectedEstimate: 4, startingStats: { hp: 5, sanity: 4 }, perkSummary: 'สภาพร่าง +5 · สติ +4',
  },
  {
    id: 'bio_liveseller_30f', age: 30, gender: 'หญิง', occupation: 'แม่ค้าไลฟ์ขายเสื้อผ้าย่านประตูน้ำ',
    fullNameHint: 'สติกเกอร์จ่าหน้าร้านฝนเสื้อผ้า', clothingClue: 'เสื้อสีชมพูกับกระเป๋าคาดเอวใส่ปากกา', personalItemClue: 'ขาตั้งโทรศัพท์พับได้และม้วนเทปแพ็กของ',
    signatureItemName: 'ขาตั้งโทรศัพท์และเทปแพ็กพัสดุ', signatureItemDesc: 'ยึดของและทำป้ายบอกทางได้ แม้โทรศัพท์จะไม่มีสัญญาณแล้ว',
    specialChoiceLabel: '[ความถนัดแม่ค้าออนไลน์] แพ็กเสบียงให้หิ้วสะดวกและติดป้ายแบ่งของ',
    specialChoiceOutcome: 'เจ้าพันเทปประคองห่อของแล้วเขียนรายการให้เห็นชัด เขาจึงขนของจำเป็นไปได้โดยไม่ต้องย้อนกลับมาหลายเที่ยว',
    specialChoiceEffect: { supplies: 1, humanity: 4, npcTrustDelta: 7, hunger: 6 },
    preDeathDetail: 'ไลฟ์ขายเสื้อจากห้องเก็บของประตูน้ำในเดือนตุลาคม 2026 ถูกตัดกลางประโยค ขาตั้งยังพับเก็บอย่างเรียบร้อยและมีพัสดุรอส่งอีกหนึ่งห่อ',
    autopsyObservation: 'รอยข่วนลึกที่ต้นคอซ่อนใต้ปกเสื้อ เสียงแหบจนพูดไม่ได้ แต่ยังยกมือทักคนโดยอัตโนมัติ',
    daysInfectedEstimate: 2, startingStats: { humanity: 4 }, startingItems: { supplies: 1 }, perkSummary: 'เสบียงมนุษย์ +1 · ความเห็นใจ +4',
  },
  {
    id: 'bio_busdriver_48m', age: 48, gender: 'ชาย', occupation: 'พนักงานขับรถเมล์สายผ่านอนุสาวรีย์ชัยฯ',
    fullNameHint: 'สมุดลงเวลาที่เขียนชื่อลุงสมชาย', clothingClue: 'เสื้อเชิ้ตสีฟ้ากับหมวกแก๊ปกรมท่า', personalItemClue: 'ไฟฉายฉุกเฉินและสมุดจดป้ายรถเมล์',
    signatureItemName: 'ไฟฉายฉุกเฉินและสมุดเส้นทางรถเมล์', signatureItemDesc: 'จำจุดรวมคนและทางหลบจากถนนใหญ่ได้ ไม่จำเป็นต้องมีรถที่ขับได้',
    specialChoiceLabel: '[ความถนัดคนขับรถเมล์] ส่งสัญญาณและพาคนหลบจากถนนใหญ่',
    specialChoiceOutcome: 'เจ้ากะพริบไฟฉายเป็นจังหวะให้เขาหยุดรอ แล้วชี้ช่องระหว่างรถที่จอดขวาง ก่อนพาข้ามไปยังทางเดินที่เงียบกว่า',
    specialChoiceEffect: { sanity: 4, humanity: 5, npcTrustDelta: 7, hunger: 6 },
    preDeathDetail: 'เดือนตุลาคม 2026 เจ้าหยุดรถรับคนที่วิ่งหนีมาใกล้อนุสาวรีย์ชัยฯ หลังจากนั้นความจำเหลือเพียงเสียงประตูรถปิดและมือที่จับพวงมาลัยไม่ยอมปล่อย',
    autopsyObservation: 'รอยกัดที่หัวไหล่และรอยช้ำจากเข็มขัดนิรภัยยังเห็นชัด ร่างมักหันมองข้างหลังเหมือนกำลังเช็กผู้โดยสาร',
    daysInfectedEstimate: 3, startingStats: { hp: 6, sanity: 3 }, perkSummary: 'สภาพร่าง +6 · สติ +3',
  },
];

export const BANGKOK_2026_BIOS: CharacterBioDossier[] = residents.map(({ startingStats, startingItems, ...bio }) => ({
  ...bio,
  startingNote: `พก${bio.signatureItemName} · เปิดตัวเลือกตามความถนัดอาชีพ`,
  applyToState(s: any) {
    for (const [key, delta] of Object.entries(startingStats)) s.stats[key] = Math.max(0, Math.min(100, (s.stats[key] ?? 0) + delta));
    for (const [key, delta] of Object.entries(startingItems || {})) s.items[key] = (s.items[key] ?? 0) + delta;
    s.carriedBloodBags = 0;
  },
}));
