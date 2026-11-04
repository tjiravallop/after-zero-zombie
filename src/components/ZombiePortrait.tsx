import type {CharacterAppearance} from '../data/pastLifeEchoes';
type Bio = { id: string; gender: string; occupation: string; age?:number; portraitRole?:string; appearance?:CharacterAppearance };
type Pixel = [number, number, number, number, string];
const ink='#243d34', skin='#b5d69b', defaultHair='#354b42', light='#f3e7be';
const uniforms: Record<string,string> = {student:'#dae3d1',paramedic:'#e58c4b',courier:'#e7c350',watchman:'#6d88ab',subway:'#b3a0d2',radio:'#78b9b4',mototaxi:'#ed934b',vendor:'#bf6771',nurse:'#85bacf',electrician:'#6f95c0',cleaner:'#afc866',barista:'#a37f5c',developer:'#aa96cb',boatcrew:'#e59c54',liveseller:'#cc8ca9',busdriver:'#8eabc2'};
export default function ZombiePortrait({bio, mutation = 0}:{bio:Bio; mutation?:number}) {
  const role=bio.portraitRole || bio.id.split('_')[1];
  const hair=bio.appearance?.hairColor || defaultHair;
  const hairStyle=bio.appearance?.hairStyle || (bio.gender==='หญิง'?'long':'short');
  const age=bio.age ?? 30, small=age<=12;
  const mutStage = mutation >= 75 ? 4 : mutation >= 50 ? 3 : mutation >= 25 ? 2 : 1;
  const activeSkin = mutStage >= 4 ? '#8eb895' : mutStage >= 3 ? '#9ec498' : skin;
  const pixels:Pixel[]=[];
  const r=(x:number,y:number,w:number,h:number,c:string)=>pixels.push([x,y,w,h,c]);
  const uniform=({primary:'#edf0db',secondary:'#e2eadd',vocational:'#708ba6',retiredteacher:'#d3bfa0',retired:'#9bad95'} as Record<string,string>)[role] || uniforms[role] || '#8fb98c';

  // Stage 4 (75%+): Extra mutated dorsal arms & lower bio-appendages sprouting from back
  if (mutStage >= 4) {
    // Upper extra arms sprouting from shoulder blades
    r(2,14,4,2,'#3b1d54'); r(1,11,2,4,'#58297a'); r(1,9,1,2,'#f43f5e'); r(3,10,1,2,'#34d399');
    r(26,14,4,2,'#3b1d54'); r(29,11,2,4,'#58297a'); r(30,9,1,2,'#f43f5e'); r(28,10,1,2,'#34d399');
    // Lower bio-limbs / tendrils from ribs
    r(3,23,4,2,'#3b1d54'); r(1,24,3,2,'#58297a'); r(0,25,2,3,'#e11d48');
    r(25,23,4,2,'#3b1d54'); r(28,24,3,2,'#58297a'); r(30,25,2,3,'#e11d48');
  }

  // Stage 3 (50%+): Taller hulking silhouette, broadened shoulder plates & bone spurs
  if (mutStage >= 3) {
    r(6,19,4,3,'#2e1a47'); r(22,19,4,3,'#2e1a47');
    r(5,18,2,2,'#d8b4fe'); r(25,18,2,2,'#d8b4fe');
    r(10,small?28:29,5,3,'#1e1b2e'); r(17,small?28:29,5,3,'#1e1b2e');
  }

  r(7,small?30:31,18,1,'#122d24'); r(11,small?26:28,4,3,ink); r(18,small?26:28,4,3,ink);
  r(9,20,14,small?8:10,ink); r(10,21,12,small?6:age<=19?7:8,uniform); r(7,22,3,small?4:5,activeSkin); r(22,22,3,small?4:5,activeSkin);
  if(hairStyle==='long'||hairStyle==='bob'){r(7,7,18,hairStyle==='long'?16:13,hair);r(9,4,14,4,hair);}
  if(hairStyle==='tied'){r(24,6,4,4,hair);r(27,10,2,8,hair);r(25,9,2,1,'#b58b7a');}
  r(9,5,14,2,ink);r(7,7,18,11,ink);r(9,18,14,2,ink);
  r(9,7,14,11,activeSkin);r(8,9,16,7,activeSkin);r(10,18,12,1,activeSkin);r(6,11,2,4,activeSkin);r(24,11,2,4,activeSkin);
  r(9,4,14,3,hair);r(8,7,4,2,hair);r(12,7,4,1,hair);r(20,7,4,3,hair);
  r(11,11,2,3,ink);r(19,11,2,3,ink);r(11,11,1,1,light);r(19,11,1,1,light);
  r(9,15,3,1,'#d79988');r(21,15,3,1,'#d79988');r(14,17,4,1,ink);r(13,16,1,1,ink);r(18,16,1,1,ink);
  r(10,8,4,1,'#e6d2a0');r(11,9,2,1,'#e6d2a0');r(21,9,1,1,'#739066');
  if(age>=60){r(9,16,2,1,'#809079');r(21,16,2,1,'#809079');r(14,10,4,1,'#8fa584');}
  if(bio.appearance?.outfitVariant===1){r(10,22,2,1,light);r(20,22,2,1,light);}
  if(bio.appearance?.outfitVariant===2){r(19,24,2,2,light);r(11,24,2,1,ink);}
  if(['student','developer'].includes(role)){r(8,10,7,5,ink);r(17,10,7,5,ink);r(10,11,3,3,activeSkin);r(19,11,3,3,activeSkin);r(15,11,2,1,ink);}
  if(['paramedic','cleaner','mototaxi'].includes(role)){r(10,21,2,8,light);r(20,21,2,8,light);}
  if(['nurse','paramedic'].includes(role)){r(14,23,5,5,light);r(16,24,1,3,'#cc6868');r(15,25,3,1,'#cc6868');}
  if(['vendor','barista'].includes(role)){r(11,21,2,3,light);r(19,21,2,3,light);r(12,24,8,6,role==='vendor'?'#963f4d':'#6f5946');}
  if(['mototaxi','electrician'].includes(role)){r(10,2,12,2,'#e6c258');r(8,4,16,4,'#e6c258');r(7,8,18,1,'#bd9d43');r(15,3,2,4,light);}
  if(['watchman','busdriver'].includes(role)){r(10,3,12,3,'#526c88');r(9,6,16,2,'#3e536d');r(20,8,5,1,'#3e536d');r(16,21,1,8,light);}
  switch(role){
    case 'primary':case 'secondary':
      r(10,21,12,5,'#e9efdd');r(15,21,2,3,'#5a718e');
      if(bio.gender==='หญิง'){r(12,25,8,2,'#4d6687');r(10,27,12,small?1:2,'#4d6687');}
      else{r(11,25,4,3,'#4d6687');r(18,25,4,3,'#4d6687');}
      r(23,21,3,7,'#536e84');r(12,21,1,5,'#6e8790');break;
    case 'vocational':r(16,21,1,8,light);r(19,23,2,2,light);r(24,23,1,6,'#d8a977');break;
    case 'retiredteacher':
      r(8,10,7,5,'#86978f');r(17,10,7,5,'#86978f');r(10,11,3,3,activeSkin);r(19,11,3,3,activeSkin);r(15,11,2,1,'#86978f');
      r(23,24,5,6,'#a47f55');r(24,24,1,6,light);break;
    case 'retired':r(16,21,1,8,light);r(23,24,6,5,'#d6ceac');r(24,25,4,1,'#889782');r(24,27,4,1,'#889782');break;
    case 'courier':r(10,21,2,2,'#816342');r(12,23,3,2,'#816342');r(15,25,3,2,'#816342');r(18,26,6,4,'#b18a5b');r(20,26,1,4,light);break;
    case 'watchman':r(15,4,2,2,'#e6c779');r(20,23,2,2,'#e6c779');break;
    case 'subway':r(12,21,1,4,light);r(19,21,1,4,light);r(14,25,4,5,light);break;
    case 'radio':r(7,7,1,8,ink);r(24,7,1,8,ink);r(8,5,2,2,ink);r(22,5,2,2,ink);r(10,4,12,1,ink);r(6,11,2,4,'#d8c87c');r(24,11,2,4,'#d8c87c');r(24,15,1,3,ink);r(21,17,3,1,ink);break;
    case 'mototaxi':r(14,24,5,4,light);r(16,25,1,2,ink);break;
    case 'vendor':r(25,21,1,7,'#b8c6bd');r(24,20,3,2,'#d8dfcf');r(9,22,2,6,'#dfca94');break;
    case 'nurse':r(10,3,12,2,'#d3e5df');r(8,5,16,3,'#b9d5da');r(10,8,12,1,'#74a2b1');break;
    case 'electrician':r(9,27,14,2,'#6e5141');r(20,24,1,6,'#e19167');r(20,22,1,2,'#cddbd1');break;
    case 'cleaner':r(11,2,10,2,'#cbbb87');r(9,4,14,3,'#ddc99a');r(6,7,20,2,'#b8a576');r(9,25,14,1,light);r(26,19,1,9,'#b9c4a4');r(25,18,3,1,'#b9c4a4');break;
    case 'barista':r(25,24,4,5,light);r(29,25,1,3,light);r(26,21,1,2,'#9cb6a6');break;
    case 'developer':r(12,26,9,4,'#4e6070');r(14,27,1,1,'#bedba5');r(18,27,1,1,'#bedba5');break;
    case 'boatcrew':r(9,21,5,9,'#eab66d');r(18,21,5,9,'#eab66d');r(10,24,12,1,'#526b5e');r(10,27,12,1,'#526b5e');r(25,24,4,1,'#ddc88f');r(24,25,1,3,'#ddc88f');r(29,25,1,3,'#ddc88f');r(25,28,4,1,'#ddc88f');break;
    case 'liveseller':r(11,5,2,2,'#dd9bb4');r(14,5,2,2,'#dd9bb4');r(13,6,1,2,'#dd9bb4');r(10,26,12,3,'#a5638a');r(12,26,1,3,'#e5c77c');r(25,21,4,6,'#d6c7d3');r(26,22,2,4,'#52616c');r(26,27,1,3,'#7f9185');break;
    case 'busdriver':r(20,24,2,2,'#e3ce8d');r(25,25,3,1,ink);r(24,26,1,3,ink);r(28,26,1,3,ink);r(25,29,3,1,ink);break;
  }

  // Stage 2+ (25%+): Glowing crimson eyes, sharp fangs, and dark bio-veins
  if (mutStage >= 2) {
    // Glowing red eyes
    r(11,11,2,3,'#dc2626'); r(19,11,2,3,'#dc2626');
    r(11,11,1,1,'#fecaca'); r(19,11,1,1,'#fecaca');
    // Sharp protruding fangs
    r(13,17,1,2,'#f8fafc'); r(18,17,1,2,'#f8fafc');
    // Dark bio-veins on temple/neck
    r(9,13,1,2,'#581c87'); r(22,13,1,2,'#581c87'); r(12,19,1,2,'#581c87');
  }

  // Stage 3+ (50%+): Long curved claws on both hands & bio-veins on torso
  if (mutStage >= 3) {
    const handY = small ? 26 : 27;
    r(7,handY,1,2,'#e2e8f0'); r(9,handY,1,2,'#f43f5e');
    r(22,handY,1,2,'#f43f5e'); r(24,handY,1,2,'#e2e8f0');
    r(15,22,2,3,'#4c1d95');
  }

  // Stage 4 (75%+): Bio-luminescent cranial crest & glowing chest core
  if (mutStage >= 4) {
    r(15,1,2,3,'#a855f7'); r(16,0,1,2,'#34d399');
    r(15,23,2,2,'#34d399');
  }

  return <svg viewBox="0 0 32 33" shapeRendering="crispEdges" role="img" aria-label={`ซอมบี้ 8-bit เพศ${bio.gender}${bio.age ? ` อายุ ${bio.age} ปี` : ''} อดีต${bio.occupation}${mutStage > 1 ? ` กลายพันธุ์ระยะที่ ${mutStage}` : ''}`} className={`zombie-portrait mutation-stage-${mutStage}`}>{pixels.map(([x,y,width,height,fill],i)=><rect key={i} {...{x,y,width,height,fill}} />)}</svg>;
}
