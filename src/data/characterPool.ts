import {CHARACTER_BIO_DOSSIERS, type CharacterBioDossier, type CharacterAgeGroup, type CharacterAppearance} from './pastLifeEchoes';

type Occupation = {id:string;minAge:number;maxAge:number;template:CharacterBioDossier;role:string;title?:string};
const startingPlaces:Record<string,string>={primary:'shelter',secondary:'shelter',vocational:'bkk_power',student:'hospital',paramedic:'bkk_ward',courier:'streets',watchman:'shelter',subway:'nest',radio:'radio',mototaxi:'bkk_winstop',vendor:'bkk_market',nurse:'bkk_ward',electrician:'bkk_power',cleaner:'bkk_depot',barista:'bkk_cafe',developer:'bkk_office',boatcrew:'bkk_pier',liveseller:'bkk_stockroom',busdriver:'bkk_busyard',retiredteacher:'shelter',retired:'bkk_depot'};
function everyday(id:string,occupation:string,item:string,clothing:string,memory:string,choice:string,outcome:string):CharacterBioDossier {
  return {id,age:20,gender:'ชาย',occupation,fullNameHint:'ชื่อที่เลือนหายบนของติดตัว',clothingClue:clothing,
    personalItemClue:item,signatureItemName:item,signatureItemDesc:'ของติดตัวที่ช่วยสื่อสารและดูแลคนเป็นได้ โดยไม่ทำให้ซอมบี้อิ่ม',
    specialChoiceLabel:choice,specialChoiceOutcome:outcome,specialChoiceEffect:{sanity:4,humanity:4,npcTrustDelta:6,hunger:6},
    preDeathDetail:memory,autopsyObservation:'ร่องรอยติดเชื้อทำให้ผิวเย็นซีด แต่ยังจดจำวิธีใช้ของติดตัวได้',daysInfectedEstimate:2,
    startingNote:`พก${item} · เปิดตัวเลือกตามความถนัด`,perkSummary:'สติ +6 · ความเห็นใจ +3',
    applyToState(s:any){s.stats.sanity=Math.min(100,s.stats.sanity+6);s.stats.humanity=Math.min(100,s.stats.humanity+3);s.carriedBloodBags=0;},
  };
}
const primary=everyday('pool_primary','นักเรียนประถมโรงเรียนชุมชนย่านดินแดง','สมุดการบ้านและดินสอ','เสื้อนักเรียนสีขาวกับกระเป๋านักเรียนสีน้ำเงิน',
  'เสียงเรียกเข้าแถวยังติดอยู่ในความจำ สมุดการบ้านค้างอยู่หน้าที่วาดแผนที่ทางกลับบ้าน',
  '[ความคุ้นเคยของนักเรียน] วาดทางกลับชุมชนและชี้จุดที่เคยรอผู้ปกครอง',
  'เจ้าวาดจุดสังเกตง่าย ๆ ลงบนสมุดแล้ววางให้เขาดู คนตรงหน้าจึงรู้ว่าต้องเดินไปทางไหนโดยไม่ต้องเข้าใกล้เจ้า');
const secondary=everyday('pool_secondary','นักเรียนมัธยมโรงเรียนย่านพญาไท','สมุดจดและขวดน้ำติดชื่อนักเรียน','เสื้อนักเรียนสีขาวกับชุดนักเรียนสีน้ำเงินเข้ม',
  'กระดาษตารางเรียนยังคั่นอยู่ในสมุด เจ้าจำทางเดินกลับจากโรงเรียนได้ แม้ถนนจะเงียบไปแล้ว',
  '[ความคุ้นเคยของนักเรียนมัธยม] เขียนข้อความและจุดนัดพบให้ผู้รอดชีวิต',
  'เจ้าจดจุดนัดพบที่จำได้ แล้วยื่นสมุดผ่านช่องว่างก่อนถอย อีกฝ่ายอ่านช้า ๆ แล้วพยักหน้ารับ');
const vocational=everyday('pool_vocational','นักเรียนอาชีวศึกษาย่านดินแดง','สมุดงานช่างและไขควงด้ามสั้น','เสื้อช็อปอาชีวะสีกรมท่ากับกระเป๋าผ้า',
  'ในสมุดยังมีรูปชิ้นงานที่ทำไม่เสร็จ เจ้าจำเสียงครูเตือนให้ตรวจเครื่องมือก่อนใช้ได้ชัดเจน',
  '[พื้นฐานอาชีวศึกษา] ช่วยขันอุปกรณ์ยึดที่หลวมตามคำแนะนำของช่าง',
  'เจ้ารอให้ช่างชี้จุดที่ปลอดภัยแล้วค่อยขันอุปกรณ์จนแน่น เขาทดสอบซ้ำก่อนใช้ช่วยคนเจ็บ');
const retiredTeacher=everyday('pool_retiredteacher','ครูเกษียณย่านพญาไท','แว่นอ่านหนังสือและสมุดบันทึก','เสื้อเชิ้ตสีครีมกับกระเป๋าผ้าใส่สมุด',
  'เจ้าเก็บสมุดรายชื่อนักเรียนเก่าไว้ที่บ้าน ความจำเกี่ยวกับห้องเรียนยังชัดกว่าใบหน้าของตัวเอง',
  '[ประสบการณ์ครูเกษียณ] เขียนคำอธิบายเส้นทางให้เข้าใจทีละขั้น',
  'เจ้าแบ่งข้อความยาวเป็นข้อสั้น ๆ แล้วชี้จุดสำคัญซ้ำ คนอ่านเริ่มตั้งสติและวางแผนเดินทางต่อได้');
const retired=everyday('pool_retired','ข้าราชการเกษียณย่านพระนคร','สมุดจดเบอร์ติดต่อและแฟ้มเอกสาร','เสื้อเชิ้ตสีเขียวหม่นกับกระเป๋าสะพายใบเก่า',
  'สมุดจดมีรายชื่อเพื่อนบ้านที่เคยช่วยประสานงานกัน เจ้ายังจำวิธีเรียงข้อมูลให้คนอื่นตามต่อได้',
  '[ประสบการณ์งานประสาน] จัดรายชื่อคนและของจำเป็นให้ตรวจสอบง่าย',
  'เจ้าจัดรายชื่อกับสิ่งของเป็นหมวด แล้ววางแฟ้มไว้ให้คนเฝ้าจุดพัก ทุกคนจึงตรวจได้ว่าใครยังขาดความช่วยเหลือ');

const ranges:Record<string,[number,number]>={student:[18,29],paramedic:[18,65],courier:[18,65],watchman:[20,70],subway:[18,60],radio:[20,70],mototaxi:[20,70],vendor:[18,80],nurse:[22,65],electrician:[20,75],cleaner:[18,65],barista:[18,60],developer:[20,70],boatcrew:[20,65],liveseller:[18,80],busdriver:[25,65]};
export const CHARACTER_OCCUPATIONS:Occupation[]=[
  {id:'primary',minAge:10,maxAge:12,template:primary,role:'primary'},
  {id:'secondary',minAge:13,maxAge:18,template:secondary,role:'secondary'},
  {id:'vocational',minAge:15,maxAge:19,template:vocational,role:'vocational'},
  ...CHARACTER_BIO_DOSSIERS.map(template=>{const role=template.id.split('_')[1],[minAge,maxAge]=ranges[role];return {id:role,minAge,maxAge,template,role,title:role==='student'?'นักศึกษาคณะวิทยาศาสตร์ชีวภาพ':undefined};}),
  {id:'retiredteacher',minAge:60,maxAge:80,template:retiredTeacher,role:'retiredteacher'},
  {id:'retired',minAge:60,maxAge:80,template:retired,role:'retired'},
];
export function getCharacterAgeGroup(age:number):CharacterAgeGroup {
  return age<=12?'เด็ก':age<=19?'วัยรุ่น':age<=59?'ผู้ใหญ่':'ผู้สูงอายุ';
}
export function eligibleOccupations(age:number):Occupation[] {
  if(!Number.isInteger(age)||age<10||age>80)throw Error('อายุตัวละครต้องเป็นจำนวนเต็ม 10–80 ปี');
  return CHARACTER_OCCUPATIONS.filter(job=>age>=job.minAge&&age<=job.maxAge);
}
const hairColors:CharacterAppearance['hairColor'][]=['#354b42','#51443c','#46516b','#88938c','#b5b8a5'];
const hairStyles:CharacterAppearance['hairStyle'][]=['short','bob','long','tied'];
const profileId=(seed:number,job:string,age:number,gender:string)=>`pool_${seed.toString(36)}_${job}_${age}${gender==='หญิง'?'f':'m'}`;

export function generateCharacter(seed:number,options:{age?:number;gender?:'ชาย'|'หญิง';occupationId?:string}={}):CharacterBioDossier {
  if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw Error('Seed ตัวละครไม่ถูกต้อง');
  let value=seed>>>0;
  const random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/0x100000000;};
  random();random();random();
  const age=options.age??10+Math.floor(random()*71),gender=options.gender??(random()<.5?'ชาย':'หญิง');
  const jobs=eligibleOccupations(age),job=options.occupationId?jobs.find(j=>j.id===options.occupationId):jobs[Math.floor(random()*jobs.length)];
  if(!job||!['ชาย','หญิง'].includes(gender))throw Error('อาชีพหรือเพศไม่ตรงกับเงื่อนไขตัวละคร');
  const template=job.template;
  const genderText=(text:string)=>gender==='ชาย'?text.replaceAll('แม่ค้า','พ่อค้า'):text;
  const appearance:CharacterAppearance={hairStyle:hairStyles[Math.floor(random()*hairStyles.length)],hairColor:hairColors[(age>=60?3:0)+Math.floor(random()*(age>=60?2:3))],outfitVariant:Math.floor(random()*3) as 0|1|2};
  const daysInfectedEstimate=1+Math.floor(random()*5);
  const occupation=genderText(job.title||template.occupation);
  return {...template,id:profileId(seed,job.id,age,gender),profileVersion:1,generationSeed:seed,occupationId:job.id,templateId:template.id,portraitRole:job.role,
    age,gender,occupation,ageGroup:getCharacterAgeGroup(age),appearance,daysInfectedEstimate,startPlace:startingPlaces[job.id],
    fullNameHint:`ของติดตัวจาก${occupation} อายุ ${age} ปี`,
    clothingClue:genderText(template.clothingClue),personalItemClue:genderText(template.personalItemClue),
    signatureItemName:genderText(template.signatureItemName),signatureItemDesc:genderText(template.signatureItemDesc),
    specialChoiceLabel:genderText(template.specialChoiceLabel),specialChoiceOutcome:genderText(template.specialChoiceOutcome),
    specialChoiceEffect:{...template.specialChoiceEffect},
    preDeathDetail:`ในกรุงเทพฯ เดือนตุลาคม 2026 เจ้าอายุ ${age} ปี เป็น${occupation} ${genderText(template.preDeathDetail)}`,
    autopsyObservation:`ผิวเย็นซีดและมีร่องรอยติดเชื้อ คาดว่ากลายพันธุ์มาแล้วประมาณ ${daysInfectedEstimate} วัน ร่างยังจำวิธีใช้${genderText(template.signatureItemName)}ได้`,
  };
}

export function snapshotCharacter(bio:CharacterBioDossier):Omit<CharacterBioDossier,'applyToState'> {
  const {applyToState,...snapshot}=bio;
  return structuredClone(snapshot);
}

export function restoreCharacter(snapshot:any):CharacterBioDossier {
  if(snapshot?.profileVersion!==1){
    const legacy=CHARACTER_BIO_DOSSIERS.find(b=>b.id===snapshot?.id);
    if(legacy)return legacy;
    throw Error('ข้อมูลตัวละครในเซฟไม่รองรับ');
  }
  const jobs=eligibleOccupations(snapshot.age),job=jobs.find(j=>j.id===snapshot.occupationId);
  const seed=snapshot.generationSeed;
  if(!job||!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff||!['ชาย','หญิง'].includes(snapshot.gender)||snapshot.id!==profileId(seed,job.id,snapshot.age,snapshot.gender)||snapshot.templateId!==job.template.id||snapshot.portraitRole!==job.role||snapshot.ageGroup!==getCharacterAgeGroup(snapshot.age))throw Error('ข้อมูลอายุ อาชีพ หรือช่วงวัยในเซฟไม่สอดคล้องกัน');
  const appearance=snapshot.appearance;
  if(!appearance||!hairStyles.includes(appearance.hairStyle)||!hairColors.includes(appearance.hairColor)||![0,1,2].includes(appearance.outfitVariant))throw Error('ข้อมูลรูปลักษณ์ในเซฟไม่ถูกต้อง');
  const result=generateCharacter(seed,{age:snapshot.age,gender:snapshot.gender,occupationId:job.id});
  if(snapshot.startPlace!==undefined&&snapshot.startPlace!==result.startPlace)throw Error('สถานที่เริ่มต้นไม่ตรงกับอาชีพ');
  const textKeys=['occupation','fullNameHint','clothingClue','personalItemClue','signatureItemName','signatureItemDesc','specialChoiceLabel','specialChoiceOutcome','preDeathDetail','autopsyObservation','startingNote','perkSummary'] as const;
  for(const key of textKeys){if(typeof snapshot[key]!=='string'||!snapshot[key].trim()||snapshot[key].length>3000)throw Error('ข้อความตัวละครในเซฟไม่ครบ');result[key]=snapshot[key];}
  if(!Number.isInteger(snapshot.daysInfectedEstimate)||snapshot.daysInfectedEstimate<1||snapshot.daysInfectedEstimate>120)throw Error('ระยะติดเชื้อในเซฟไม่ถูกต้อง');
  result.daysInfectedEstimate=snapshot.daysInfectedEstimate;
  const effect=snapshot.specialChoiceEffect,allowed=new Set(['hp','hunger','sanity','humanity','mutation','research','horde','supplies','medicine','samples','carriedBloodBags','npcTrustDelta']);
  if(!effect||typeof effect!=='object'||Array.isArray(effect)||Object.entries(effect).some(([key,value])=>!allowed.has(key)||typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>100))throw Error('ผลความถนัดในเซฟไม่ถูกต้อง');
  result.specialChoiceEffect={...effect};result.appearance={...appearance};
  return result;
}

export function resolveSavedCharacter(state:any,legacyId?:string,fallback?:CharacterBioDossier):CharacterBioDossier {
  if(state?.characterProfile)return restoreCharacter(state.characterProfile);
  const legacy=CHARACTER_BIO_DOSSIERS.find(b=>b.id===legacyId);
  if(legacy)return legacy;
  if(legacyId?.startsWith('pool_'))throw Error('เซฟขาดรายละเอียดตัวละครที่สุ่มไว้');
  return fallback||CHARACTER_BIO_DOSSIERS[0];
}

export function createCharacterState(production:any,bio:CharacterBioDossier,seed:number=bio.generationSeed??Date.now()>>>0):any {
  const profile=snapshotCharacter(bio);
  const state=production.engine.create(seed,bio.profileVersion===1?{careerStart:{place:bio.startPlace,profile}}:undefined);
  bio.applyToState(state);
  state.characterProfile=profile;
  state.roamCooldowns={};
  state.asokWreckDepletedParts=[];
  return production.engine.validate(state);
}
