import type { CharacterAppearance } from '../data/pastLifeEchoes';

export type Bio = {
  id: string;
  gender: string;
  occupation: string;
  age?: number;
  portraitRole?: string;
  appearance?: CharacterAppearance;
  generationSeed?: number;
};

export type Pixel = [number, number, number, number, string];

const ink = '#243d34';
const skin = '#b5d69b';
const defaultHair = '#354b42';
const light = '#f3e7be';

const uniforms: Record<string, string> = {
  student: '#dae3d1',
  paramedic: '#e58c4b',
  courier: '#e7c350',
  watchman: '#6d88ab',
  subway: '#b3a0d2',
  radio: '#78b9b4',
  mototaxi: '#ed934b',
  vendor: '#bf6771',
  nurse: '#85bacf',
  electrician: '#6f95c0',
  cleaner: '#afc866',
  barista: '#a37f5c',
  developer: '#aa96cb',
  boatcrew: '#e59c54',
  liveseller: '#cc8ca9',
  busdriver: '#8eabc2',
};

function getSeedHash(id: string, seed?: number): number {
  if (typeof seed === 'number' && Number.isSafeInteger(seed)) {
    return Math.abs(seed);
  }
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

interface AgeLayout {
  isChild: boolean;
  isTeen: boolean;
  isAdult: boolean;
  isElderly: boolean;
  headX: number;
  headY: number;
  headW: number;
  headH: number;
  torsoX: number;
  torsoY: number;
  torsoW: number;
  torsoH: number;
  armLeftX: number;
  armRightX: number;
  armY: number;
  armH: number;
  armW: number;
  legLeftX: number;
  legRightX: number;
  legY: number;
  legH: number;
  legW: number;
  groundY: number;
  shadowX: number;
  shadowW: number;
  eyeY: number;
  eyeLeftX: number;
  eyeRightX: number;
  mouthY: number;
}

export function getAgeLayout(age: number): AgeLayout {
  if (age <= 12) {
    // เด็ก: ตัวเตี้ย ไหล่แคบ แขนขาสั้น หัวดูใหญ่ขึ้นเมื่อเทียบกับลำตัว (chibi ratio)
    return {
      isChild: true,
      isTeen: false,
      isAdult: false,
      isElderly: false,
      headX: 8,
      headY: 8,
      headW: 16,
      headH: 11,
      torsoX: 11,
      torsoY: 19,
      torsoW: 10,
      torsoH: 6,
      armLeftX: 9,
      armRightX: 21,
      armY: 19,
      armH: 5,
      armW: 2,
      legLeftX: 12,
      legRightX: 17,
      legY: 25,
      legH: 4,
      legW: 3,
      groundY: 29,
      shadowX: 9,
      shadowW: 14,
      eyeY: 13,
      eyeLeftX: 11,
      eyeRightX: 19,
      mouthY: 17,
    };
  }

  if (age <= 19) {
    // วัยรุ่น: สูงกว่าเด็ก ลำตัวยังเพรียว แขนขายาว
    return {
      isChild: false,
      isTeen: true,
      isAdult: false,
      isElderly: false,
      headX: 9,
      headY: 4,
      headW: 14,
      headH: 12,
      torsoX: 11,
      torsoY: 16,
      torsoW: 10,
      torsoH: 8,
      armLeftX: 8,
      armRightX: 21,
      armY: 16,
      armH: 7,
      armW: 3,
      legLeftX: 11,
      legRightX: 18,
      legY: 24,
      legH: 6,
      legW: 3,
      groundY: 30,
      shadowX: 8,
      shadowW: 16,
      eyeY: 10,
      eyeLeftX: 11,
      eyeRightX: 18,
      mouthY: 14,
    };
  }

  if (age <= 59) {
    // ผู้ใหญ่: สูงกว่าวัยรุ่นเล็กน้อย ช่วงไหล่และลำตัวดูโตเต็มวัย
    return {
      isChild: false,
      isTeen: false,
      isAdult: true,
      isElderly: false,
      headX: 8,
      headY: 4,
      headW: 16,
      headH: 13,
      torsoX: 9,
      torsoY: 17,
      torsoW: 14,
      torsoH: 9,
      armLeftX: 6,
      armRightX: 23,
      armY: 17,
      armH: 8,
      armW: 3,
      legLeftX: 10,
      legRightX: 18,
      legY: 26,
      legH: 5,
      legW: 4,
      groundY: 31,
      shadowX: 6,
      shadowW: 20,
      eyeY: 10,
      eyeLeftX: 11,
      eyeRightX: 19,
      mouthY: 15,
    };
  }

  // ผู้สูงอายุ: ท่าทางก้มเล็กน้อย ไหล่และคอค่อมลง ริ้วรอย
  return {
    isChild: false,
    isTeen: false,
    isAdult: false,
    isElderly: true,
    headX: 8,
    headY: 6,
    headW: 15,
    headH: 11,
    torsoX: 9,
    torsoY: 17,
    torsoW: 13,
    torsoH: 8,
    armLeftX: 6,
    armRightX: 22,
    armY: 17,
    armH: 7,
    armW: 3,
    legLeftX: 10,
    legRightX: 17,
    legY: 25,
    legH: 5,
    legW: 4,
    groundY: 30,
    shadowX: 7,
    shadowW: 18,
    eyeY: 11,
    eyeLeftX: 11,
    eyeRightX: 18,
    mouthY: 15,
  };
}

export function computePortraitPixels(bio: Bio, mutation = 0): Pixel[] {
  const role = bio.portraitRole || bio.id.split('_')[1] || '';
  const age = bio.age ?? 30;
  const layout = getAgeLayout(age);
  const mutStage = mutation >= 75 ? 4 : mutation >= 50 ? 3 : mutation >= 25 ? 2 : 1;
  const activeSkin = mutStage >= 4 ? '#8eb895' : mutStage >= 3 ? '#9ec498' : skin;

  // Elderly hair graying: if elderly, ensure hair is gray/silver even if randomized color was dark
  let hair = bio.appearance?.hairColor || defaultHair;
  if (layout.isElderly && (hair === '#354b42' || hair === '#51443c' || hair === '#46516b')) {
    hair = '#88938c';
  }
  const hairStyle = bio.appearance?.hairStyle || (bio.gender === 'หญิง' ? 'long' : 'short');

  const pixels: Pixel[] = [];
  const r = (x: number, y: number, w: number, h: number, c: string) => {
    // Keep strictly in canvas bounds (0..31 X, 0..32 Y)
    const cx = Math.max(0, Math.min(31, Math.floor(x)));
    const cy = Math.max(0, Math.min(32, Math.floor(y)));
    const cw = Math.max(1, Math.min(32 - cx, Math.floor(w)));
    const ch = Math.max(1, Math.min(33 - cy, Math.floor(h)));
    pixels.push([cx, cy, cw, ch, c]);
  };

  const uniform =
    ({
      primary: '#edf0db',
      secondary: '#e2eadd',
      vocational: '#708ba6',
      retiredteacher: '#d3bfa0',
      retired: '#9bad95',
    } as Record<string, string>)[role] || uniforms[role] || '#8fb98c';

  // ==========================================
  // BACKGROUND MUTATION FEATURES (Stage 4 & Stage 3)
  // Scaled & aligned with age silhouette
  // ==========================================

  // Stage 4 (75%+): Apex dorsal appendages / wings sprouting from back
  if (mutStage >= 4) {
    if (layout.isChild) {
      // Child: scaled down limbs that don't swamp the child's chibi head
      r(4, 16, 4, 2, '#3b1d54'); r(3, 14, 2, 3, '#58297a'); r(2, 13, 1, 2, '#f43f5e'); r(4, 13, 1, 2, '#34d399');
      r(24, 16, 4, 2, '#3b1d54'); r(27, 14, 2, 3, '#58297a'); r(29, 13, 1, 2, '#f43f5e'); r(27, 13, 1, 2, '#34d399');
      // Lower tendrils
      r(5, 22, 3, 2, '#3b1d54'); r(3, 23, 2, 2, '#58297a'); r(2, 24, 2, 2, '#e11d48');
      r(24, 22, 3, 2, '#3b1d54'); r(27, 23, 2, 2, '#58297a'); r(28, 24, 2, 2, '#e11d48');
    } else if (layout.isTeen) {
      // Teen: lean, arched dorsal appendages
      r(3, 13, 4, 2, '#3b1d54'); r(2, 10, 2, 4, '#58297a'); r(2, 8, 1, 2, '#f43f5e'); r(4, 9, 1, 2, '#34d399');
      r(25, 13, 4, 2, '#3b1d54'); r(28, 10, 2, 4, '#58297a'); r(29, 8, 1, 2, '#f43f5e'); r(27, 9, 1, 2, '#34d399');
      r(4, 21, 3, 2, '#3b1d54'); r(2, 22, 2, 2, '#58297a'); r(1, 23, 2, 2, '#e11d48');
      r(25, 21, 3, 2, '#3b1d54'); r(28, 22, 2, 2, '#58297a'); r(29, 23, 2, 2, '#e11d48');
    } else if (layout.isElderly) {
      // Elderly: asymmetrical stooped dorsal protrusions matching hunched back
      r(2, 14, 4, 2, '#3b1d54'); r(1, 11, 2, 4, '#58297a'); r(1, 9, 1, 2, '#f43f5e'); r(3, 10, 1, 2, '#34d399');
      r(25, 15, 4, 2, '#3b1d54'); r(28, 12, 2, 4, '#58297a'); r(29, 10, 1, 2, '#f43f5e'); r(27, 11, 1, 2, '#34d399');
      r(3, 22, 3, 2, '#3b1d54'); r(1, 23, 2, 2, '#58297a'); r(0, 24, 2, 2, '#e11d48');
      r(24, 23, 3, 2, '#3b1d54'); r(27, 24, 2, 2, '#58297a'); r(29, 25, 2, 2, '#e11d48');
    } else {
      // Adult: massive hulking appendages
      r(2, 14, 4, 2, '#3b1d54'); r(1, 11, 2, 4, '#58297a'); r(1, 9, 1, 2, '#f43f5e'); r(3, 10, 1, 2, '#34d399');
      r(26, 14, 4, 2, '#3b1d54'); r(29, 11, 2, 4, '#58297a'); r(30, 9, 1, 2, '#f43f5e'); r(28, 10, 1, 2, '#34d399');
      r(3, 23, 4, 2, '#3b1d54'); r(1, 24, 3, 2, '#58297a'); r(0, 25, 2, 3, '#e11d48');
      r(25, 23, 4, 2, '#3b1d54'); r(28, 24, 3, 2, '#58297a'); r(30, 25, 2, 3, '#e11d48');
    }
  }

  // Stage 3 (50%+): Bone spurs protruding from shoulders & armored leg plates
  if (mutStage >= 3) {
    if (layout.isChild) {
      r(layout.armLeftX - 1, layout.armY, 2, 2, '#2e1a47');
      r(layout.armRightX + layout.armW - 1, layout.armY, 2, 2, '#2e1a47');
      r(layout.armLeftX - 1, layout.armY - 1, 1, 1, '#d8b4fe');
      r(layout.armRightX + layout.armW, layout.armY - 1, 1, 1, '#d8b4fe');
      r(layout.legLeftX - 1, layout.legY + 1, 4, 2, '#1e1b2e');
      r(layout.legRightX, layout.legY + 1, 4, 2, '#1e1b2e');
    } else if (layout.isTeen) {
      r(layout.armLeftX - 1, layout.armY, 2, 3, '#2e1a47');
      r(layout.armRightX + layout.armW - 1, layout.armY, 2, 3, '#2e1a47');
      r(layout.armLeftX - 1, layout.armY - 1, 1, 2, '#d8b4fe');
      r(layout.armRightX + layout.armW, layout.armY - 1, 1, 2, '#d8b4fe');
      r(layout.legLeftX - 1, layout.legY + 2, 4, 2, '#1e1b2e');
      r(layout.legRightX, layout.legY + 2, 4, 2, '#1e1b2e');
    } else if (layout.isElderly) {
      // Stooped posture spurs: left hunched spur higher than right
      r(layout.armLeftX - 1, layout.armY - 1, 2, 3, '#2e1a47');
      r(layout.armRightX + layout.armW - 1, layout.armY + 1, 2, 3, '#2e1a47');
      r(layout.armLeftX - 1, layout.armY - 2, 1, 2, '#d8b4fe');
      r(layout.armRightX + layout.armW, layout.armY, 1, 2, '#d8b4fe');
      r(layout.legLeftX - 1, layout.legY + 1, 5, 2, '#1e1b2e');
      r(layout.legRightX, layout.legY + 1, 5, 2, '#1e1b2e');
    } else {
      // Adult broad spurs
      r(layout.armLeftX - 2, layout.armY + 1, 3, 3, '#2e1a47');
      r(layout.armRightX + layout.armW - 1, layout.armY + 1, 3, 3, '#2e1a47');
      r(layout.armLeftX - 2, layout.armY, 2, 2, '#d8b4fe');
      r(layout.armRightX + layout.armW, layout.armY, 2, 2, '#d8b4fe');
      r(layout.legLeftX - 1, layout.legY + 2, 5, 3, '#1e1b2e');
      r(layout.legRightX, layout.legY + 2, 5, 3, '#1e1b2e');
    }
  }

  // ==========================================
  // LOWER BODY & LEGS
  // ==========================================
  // Ground shadow
  r(layout.shadowX, layout.groundY, layout.shadowW, 1, '#122d24');

  // Legs / shoes
  r(layout.legLeftX, layout.legY, layout.legW, layout.legH, ink);
  r(layout.legRightX, layout.legY, layout.legW, layout.legH, ink);

  // ==========================================
  // TORSO & ARMS
  // ==========================================
  // Torso base dark contour
  r(layout.torsoX, layout.torsoY, layout.torsoW, layout.torsoH, ink);

  // Clothing fill
  r(layout.torsoX + 1, layout.torsoY + 1, layout.torsoW - 2, layout.torsoH - 1, uniform);

  // Arms (skin / infected arm color)
  r(layout.armLeftX, layout.armY + 1, layout.armW, layout.armH - 1, activeSkin);
  r(layout.armRightX, layout.armY + 1, layout.armW, layout.armH - 1, activeSkin);

  // Elderly stoop silhouette enhancement: raise back of left shoulder into a hunched contour
  if (layout.isElderly) {
    r(layout.armLeftX, layout.armY - 1, 3, 2, ink);
    r(layout.armLeftX + 1, layout.armY - 1, 2, 2, uniform);
  }

  // ==========================================
  // HAIR: BACK & BASE LAYERS
  // ==========================================
  const isFemale = bio.gender === 'หญิง';

  if (hairStyle === 'long') {
    const hairDrop = isFemale ? (layout.isChild ? 10 : 14) : (layout.isChild ? 7 : 10);
    r(layout.headX - 1, layout.headY + 2, layout.headW + 2, hairDrop, hair);
    r(layout.headX + 1, layout.headY - 1, layout.headW - 2, 3, hair);
  } else if (hairStyle === 'bob') {
    if (isFemale) {
      const hairDrop = layout.isChild ? 7 : 10;
      r(layout.headX - 1, layout.headY + 2, layout.headW + 2, hairDrop, hair);
      r(layout.headX + 1, layout.headY - 1, layout.headW - 2, 3, hair);
    } else {
      // Male medium taper cut (no long feminine drape)
      r(layout.headX, layout.headY + 1, layout.headW, 5, hair);
      r(layout.headX + 1, layout.headY - 1, layout.headW - 2, 3, hair);
    }
  } else if (hairStyle === 'curly') {
    // Voluminous curly hair puffing out on top and around ears
    const curlyH = layout.isChild ? 7 : 9;
    r(layout.headX - 2, layout.headY + 1, layout.headW + 4, curlyH, hair);
    r(layout.headX, layout.headY - 2, layout.headW, 3, hair);
    // Curl texture gaps
    r(layout.headX + 2, layout.headY - 2, 2, 1, activeSkin);
    r(layout.headX + layout.headW - 4, layout.headY - 2, 2, 1, activeSkin);
  } else if (hairStyle === 'messy') {
    // Spiky / messy textured survivor hair
    r(layout.headX - 1, layout.headY + 1, layout.headW + 2, 6, hair);
    r(layout.headX + 1, layout.headY - 1, layout.headW - 2, 3, hair);
    r(layout.headX + 2, layout.headY - 2, 2, 2, hair);
    r(layout.headX + 6, layout.headY - 3, 3, 3, hair);
    r(layout.headX + layout.headW - 4, layout.headY - 2, 2, 2, hair);
  } else if (hairStyle === 'undercut') {
    // Undercut / fade cut: clean top volume, shaved sides
    r(layout.headX + 2, layout.headY - 2, layout.headW - 4, 3, hair);
    r(layout.headX + 1, layout.headY, layout.headW - 2, 2, hair);
  } else if (hairStyle === 'parted') {
    // Middle / curtain parted hair draped over sides
    const partDrop = isFemale ? (layout.isChild ? 8 : 11) : (layout.isChild ? 5 : 7);
    r(layout.headX - 1, layout.headY + 1, 3, partDrop, hair);
    r(layout.headX + layout.headW - 2, layout.headY + 1, 3, partDrop, hair);
    r(layout.headX + 1, layout.headY - 1, layout.headW - 2, 3, hair);
  } else if (hairStyle === 'twin') {
    if (isFemale) {
      // Female twin bunches / pigtails on both sides with red ties
      const twinDrop = layout.isChild ? 6 : 8;
      r(layout.headX - 3, layout.headY + 3, 2, twinDrop, hair);
      r(layout.headX + layout.headW + 1, layout.headY + 3, 2, twinDrop, hair);
      r(layout.headX - 2, layout.headY + 2, 2, 2, '#f43f5e'); // twin tie
      r(layout.headX + layout.headW, layout.headY + 2, 2, 2, '#f43f5e'); // twin tie
      r(layout.headX + 1, layout.headY - 1, layout.headW - 2, 3, hair);
    } else {
      // Male double warrior topknots
      r(layout.headX + 2, layout.headY - 2, 3, 3, hair);
      r(layout.headX + layout.headW - 5, layout.headY - 2, 3, 3, hair);
      r(layout.headX + 1, layout.headY - 1, layout.headW - 2, 3, hair);
    }
  } else if (hairStyle === 'tied') {
    if (isFemale) {
      // Female: side ponytail with hair band
      const tieX = layout.headX + layout.headW;
      const tieY = layout.headY + 2;
      r(tieX - 1, tieY, 3, 3, hair);
      r(tieX + 1, tieY + 3, 2, layout.isChild ? 5 : 7, hair);
      r(tieX, tieY + 2, 2, 1, '#b58b7a'); // hair band
    } else {
      // Male: masculine topknot / man bun atop back of head
      r(14, layout.headY - 2, 4, 3, hair);
      r(15, layout.headY - 1, 2, 1, '#1e1b2e'); // dark leather band
    }
  }

  // ==========================================
  // HEAD BASE & FACE
  // ==========================================
  // Head outer dark border
  r(layout.headX + 1, layout.headY, layout.headW - 2, 2, ink);
  r(layout.headX, layout.headY + 2, layout.headW, layout.headH - 3, ink);
  r(layout.headX + 1, layout.headY + layout.headH - 1, layout.headW - 2, 1, ink);

  // Face skin fill
  r(layout.headX + 1, layout.headY + 2, layout.headW - 2, layout.headH - 3, activeSkin);
  r(layout.headX, layout.headY + 4, layout.headW, layout.headH - 6, activeSkin);
  r(layout.headX + 2, layout.headY + layout.headH - 2, layout.headW - 4, 1, activeSkin);

  // Ears
  r(layout.headX - 1, layout.headY + 5, 1, layout.isChild ? 2 : 3, activeSkin);
  r(layout.headX + layout.headW, layout.headY + 5, 1, layout.isChild ? 2 : 3, activeSkin);

  // Hair front fringe & top
  r(layout.headX + 1, layout.headY - 1, layout.headW - 2, 3, hair);
  if (isFemale) {
    if (hairStyle === 'parted') {
      // Curtain bangs parted in middle
      r(layout.headX, layout.headY + 2, 3, 2, hair);
      r(layout.headX + layout.headW - 3, layout.headY + 2, 3, 2, hair);
      r(layout.headX + 2, layout.headY + 2, 2, 1, hair);
      r(layout.headX + layout.headW - 4, layout.headY + 2, 2, 1, hair);
    } else if (hairStyle === 'curly') {
      // Curly texture bangs
      r(layout.headX, layout.headY + 2, 3, 2, hair);
      r(layout.headX + 3, layout.headY + 1, 2, 2, hair);
      r(layout.headX + 6, layout.headY + 2, 3, 1, hair);
      r(layout.headX + layout.headW - 4, layout.headY + 2, 4, 2, hair);
    } else {
      // Soft bangs/fringe across forehead
      r(layout.headX, layout.headY + 2, 3, 2, hair);
      r(layout.headX + 4, layout.headY + 2, 3, 1, hair);
      r(layout.headX + layout.headW - 4, layout.headY + 2, 4, 2, hair);
    }
  } else {
    // Male: clean masculine side-swept hair, sideburns, open forehead (NO blunt bangs/ผมม้า)
    r(layout.headX, layout.headY + 2, 2, 2, hair); // left sideburn
    r(layout.headX + layout.headW - 2, layout.headY + 2, 2, 2, hair); // right sideburn
    if (hairStyle === 'parted') {
      r(layout.headX + 1, layout.headY + 1, 3, 2, hair);
      r(layout.headX + layout.headW - 4, layout.headY + 1, 3, 2, hair);
    } else if (hairStyle === 'undercut') {
      r(layout.headX + 3, layout.headY + 1, layout.headW - 6, 2, hair);
    } else if (hairStyle === 'messy') {
      r(layout.headX + 2, layout.headY + 1, 3, 2, hair);
      r(layout.headX + 7, layout.headY + 1, 2, 1, hair);
      r(layout.headX + layout.headW - 4, layout.headY + 1, 3, 2, hair);
    } else {
      r(layout.headX + 1, layout.headY + 1, 4, 1, hair); // side part
      r(layout.headX + layout.headW - 5, layout.headY + 1, 3, 1, hair);
    }
  }

  // Elderly hair: silver / gray highlights
  if (layout.isElderly) {
    r(layout.headX + 2, layout.headY, layout.headW - 4, 1, '#cbd2c8');
    r(layout.headX + 1, layout.headY + 3, 2, 1, '#cbd2c8');
    r(layout.headX + layout.headW - 3, layout.headY + 3, 2, 1, '#cbd2c8');
  }

  // Eyebrows / forehead decay
  r(layout.headX + 2, layout.headY + 4, 4, 1, '#e6d2a0');
  r(layout.headX + 3, layout.headY + 5, 2, 1, '#e6d2a0');
  r(layout.headX + layout.headW - 3, layout.headY + 5, 1, 1, '#739066');

  // ==========================================
  // EYES & MUTATED OCULAR GLOW (6 Randomized Eye Types)
  // ==========================================
  const eyeSeed = getSeedHash(bio.id, bio.generationSeed);
  const eyeType = (bio.appearance as any)?.eyeType ?? (eyeSeed % 6);

  if (mutStage >= 2) {
    // Crimson mutated ocular glow
    if (eyeType === 1) {
      // Cataract: milky cloudy right eye with faint red core, left eye blazes crimson
      r(layout.eyeLeftX, layout.eyeY, 2, 3, '#dc2626');
      r(layout.eyeLeftX, layout.eyeY, 1, 1, '#fecaca');
      r(layout.eyeRightX, layout.eyeY, 2, 3, '#fca5a5');
      r(layout.eyeRightX, layout.eyeY + 1, 1, 1, '#dc2626');
    } else if (eyeType === 4) {
      // Scarred socket: vertical blood-red scar over left socket, right eye glows fiery red
      r(layout.eyeLeftX, layout.eyeY - 2, 1, 6, '#b91c1c');
      r(layout.eyeLeftX, layout.eyeY, 2, 3, '#450a0a');
      r(layout.eyeRightX, layout.eyeY, 2, 3, '#dc2626');
      r(layout.eyeRightX, layout.eyeY, 1, 1, '#fecaca');
    } else {
      // Dual glowing crimson eyes
      r(layout.eyeLeftX, layout.eyeY, 2, 3, '#dc2626');
      r(layout.eyeRightX, layout.eyeY, 2, 3, '#dc2626');
      r(layout.eyeLeftX, layout.eyeY, 1, 1, '#fecaca');
      r(layout.eyeRightX, layout.eyeY, 1, 1, '#fecaca');
    }
  } else {
    // Stage 1 (Survivor / Early zombie eyes):
    switch (eyeType) {
      case 1:
        // Milky cataract zombie eye (ขวาฝ้าขาว ซ้ายปกติ)
        r(layout.eyeLeftX, layout.eyeY, 2, 3, ink);
        r(layout.eyeLeftX, layout.eyeY, 1, 1, light);
        r(layout.eyeRightX, layout.eyeY, 2, 3, '#e2e8f0');
        r(layout.eyeRightX, layout.eyeY + 1, 1, 1, '#94a3b8');
        break;

      case 2:
        // Wide staring panicked / manic eyes (ตาโตเบิกกว้าง)
        r(layout.eyeLeftX - 1, layout.eyeY, 4, 3, light);
        r(layout.eyeRightX - 1, layout.eyeY, 4, 3, light);
        r(layout.eyeLeftX, layout.eyeY, 2, 3, ink);
        r(layout.eyeRightX, layout.eyeY, 2, 3, ink);
        r(layout.eyeLeftX, layout.eyeY, 1, 1, '#ffffff');
        r(layout.eyeRightX, layout.eyeY, 1, 1, '#ffffff');
        break;

      case 3:
        // Tired droopy eyelids & dark fatigue bags (ตาปรือ ขอบตาดำ)
        r(layout.eyeLeftX, layout.eyeY, 2, 1, '#334155');
        r(layout.eyeRightX, layout.eyeY, 2, 1, '#334155');
        r(layout.eyeLeftX, layout.eyeY + 1, 2, 2, ink);
        r(layout.eyeRightX, layout.eyeY + 1, 2, 2, ink);
        r(layout.eyeLeftX, layout.eyeY + 1, 1, 1, light);
        r(layout.eyeRightX, layout.eyeY + 1, 1, 1, light);
        r(layout.eyeLeftX - 1, layout.eyeY + 3, 3, 1, '#475569');
        r(layout.eyeRightX, layout.eyeY + 3, 3, 1, '#475569');
        break;

      case 4:
        // Scarred / blinded eye with slash (มีรอยแผลเป็นกรีดตา)
        r(layout.eyeLeftX, layout.eyeY - 2, 1, 6, '#7f1d1d'); // scar
        r(layout.eyeLeftX, layout.eyeY, 2, 3, '#1a2e26');
        r(layout.eyeRightX, layout.eyeY, 2, 3, ink);
        r(layout.eyeRightX, layout.eyeY, 1, 1, light);
        break;

      case 5:
        // Jaundiced infected yellowish eyes (ตาเหลืองติดเชื้อ)
        r(layout.eyeLeftX - 1, layout.eyeY, 3, 3, '#fef08a');
        r(layout.eyeRightX, layout.eyeY, 3, 3, '#fef08a');
        r(layout.eyeLeftX, layout.eyeY, 2, 3, ink);
        r(layout.eyeRightX, layout.eyeY, 2, 3, ink);
        r(layout.eyeLeftX, layout.eyeY, 1, 1, '#fde047');
        r(layout.eyeRightX, layout.eyeY, 1, 1, '#fde047');
        break;

      case 0:
      default:
        // Standard glazed dual eyes (ตาปกติ)
        r(layout.eyeLeftX, layout.eyeY, 2, 3, ink);
        r(layout.eyeRightX, layout.eyeY, 2, 3, ink);
        r(layout.eyeLeftX, layout.eyeY, 1, 1, light);
        r(layout.eyeRightX, layout.eyeY, 1, 1, light);
        break;
    }
  }

  // ==========================================
  // RANDOMIZED EYEGLASSES (แว่นตาสุ่มใส่ทุกคน)
  // ==========================================
  const glassesSeed = (eyeSeed * 37 + 13) >>> 0;
  const isStudious = ['student', 'developer', 'retiredteacher'].includes(role);
  let glassesType = (bio.appearance as any)?.glassesType;
  if (glassesType === undefined) {
    const roll = glassesSeed % 100;
    // 80% chance for studious occupations, 40% chance for any survivor
    const threshold = isStudious ? 80 : 40;
    glassesType = roll < threshold ? 1 + (glassesSeed % 4) : 0;
  }

  if (glassesType > 0) {
    const bridgeY = layout.eyeY + 1;
    const bridgeW = layout.eyeRightX - (layout.eyeLeftX + 2);

    switch (glassesType) {
      case 1: {
        // Round wire-rim glasses (แว่นกรอบกลมวินเทจ / กรอบโลหะทองหรือเงิน)
        const frameColor = (glassesSeed % 2 === 0) ? '#94a3b8' : '#eab308';
        r(layout.eyeLeftX - 1, layout.eyeY - 1, 4, 1, frameColor);
        r(layout.eyeLeftX - 1, layout.eyeY + 3, 4, 1, frameColor);
        r(layout.eyeLeftX - 1, layout.eyeY, 1, 3, frameColor);
        r(layout.eyeLeftX + 2, layout.eyeY, 1, 3, frameColor);

        r(layout.eyeRightX - 1, layout.eyeY - 1, 4, 1, frameColor);
        r(layout.eyeRightX - 1, layout.eyeY + 3, 4, 1, frameColor);
        r(layout.eyeRightX - 1, layout.eyeY, 1, 3, frameColor);
        r(layout.eyeRightX + 2, layout.eyeY, 1, 3, frameColor);

        r(layout.eyeLeftX + 2, bridgeY, bridgeW + 1, 1, frameColor); // bridge
        r(layout.eyeLeftX, layout.eyeY, 1, 1, '#f8fafc'); // glass gleam
        r(layout.eyeRightX, layout.eyeY, 1, 1, '#f8fafc');
        break;
      }

      case 2: {
        // Thick square nerd glasses (แว่นกรอบหนาสี่เหลี่ยมคลาสสิก)
        const frameColor = '#0f172a';
        r(layout.eyeLeftX - 1, layout.eyeY - 1, 4, 5, frameColor);
        r(layout.eyeRightX - 1, layout.eyeY - 1, 4, 5, frameColor);
        r(layout.eyeLeftX + 2, bridgeY, bridgeW + 1, 1, frameColor);
        // Hollow lens area to show eyes
        r(layout.eyeLeftX, layout.eyeY, 2, 3, activeSkin);
        r(layout.eyeRightX, layout.eyeY, 2, 3, activeSkin);
        r(layout.eyeLeftX, layout.eyeY, 1, 2, ink);
        r(layout.eyeRightX, layout.eyeY, 1, 2, ink);
        r(layout.eyeLeftX, layout.eyeY, 1, 1, light);
        r(layout.eyeRightX, layout.eyeY, 1, 1, light);
        break;
      }

      case 3: {
        // Dark sunglasses / tinted shades (แว่นกันแดดสีเข้มเท่ๆ)
        const shadeColor = '#0f172a';
        r(layout.eyeLeftX - 1, layout.eyeY - 1, 4, 4, shadeColor);
        r(layout.eyeRightX - 1, layout.eyeY - 1, 4, 4, shadeColor);
        r(layout.eyeLeftX + 2, bridgeY - 1, bridgeW + 1, 2, shadeColor);
        // Sleek reflection glare line
        r(layout.eyeLeftX, layout.eyeY - 1, 2, 1, '#64748b');
        r(layout.eyeLeftX + 1, layout.eyeY, 1, 1, '#94a3b8');
        r(layout.eyeRightX, layout.eyeY - 1, 2, 1, '#64748b');
        r(layout.eyeRightX + 1, layout.eyeY, 1, 1, '#94a3b8');
        break;
      }

      case 4: {
        // Cracked post-apocalyptic glasses with taped bridge (แว่นเลนส์ร้าวพันเทปดั้ง)
        const frameColor = '#334155';
        r(layout.eyeLeftX - 1, layout.eyeY - 1, 4, 1, frameColor);
        r(layout.eyeLeftX - 1, layout.eyeY + 3, 4, 1, frameColor);
        r(layout.eyeLeftX - 1, layout.eyeY, 1, 3, frameColor);
        r(layout.eyeLeftX + 2, layout.eyeY, 1, 3, frameColor);

        r(layout.eyeRightX - 1, layout.eyeY - 1, 4, 1, frameColor);
        r(layout.eyeRightX - 1, layout.eyeY + 3, 4, 1, frameColor);
        r(layout.eyeRightX - 1, layout.eyeY, 1, 3, frameColor);
        r(layout.eyeRightX + 2, layout.eyeY, 1, 3, frameColor);

        // Medical tape wrapped on bridge
        r(layout.eyeLeftX + 2, bridgeY - 1, bridgeW + 1, 2, '#f1f5f9');
        r(layout.eyeLeftX + 3, bridgeY - 1, 1, 2, '#94a3b8');
        // Spiderweb crack on left lens
        r(layout.eyeLeftX, layout.eyeY, 1, 2, '#e2e8f0');
        r(layout.eyeLeftX + 1, layout.eyeY + 1, 1, 1, '#ffffff');
        break;
      }
    }
  }

  // Cheeks & Mouth
  r(layout.headX + 1, layout.mouthY - 1, 2, 1, '#d79988');
  r(layout.headX + layout.headW - 3, layout.mouthY - 1, 2, 1, '#d79988');
  r(14, layout.mouthY + 1, layout.isChild ? 3 : 4, 1, ink);
  r(13, layout.mouthY, 1, 1, ink);
  r(layout.isChild ? 17 : 18, layout.mouthY, 1, 1, ink);

  // ==========================================
  // AGE SPECIFIC FACIAL DETAILS
  // ==========================================
  // Elderly wrinkles & aging lines (ทั้งสองเพศ)
  if (layout.isElderly) {
    // Forehead creases
    r(layout.headX + 3, layout.headY + 2, layout.headW - 6, 1, '#70826c');
    r(layout.headX + 4, layout.headY + 4, layout.headW - 8, 1, '#70826c');
    // Crow's feet near outer eye corners
    r(layout.headX + 1, layout.eyeY + 1, 1, 2, '#70826c');
    r(layout.headX + layout.headW - 2, layout.eyeY + 1, 1, 2, '#70826c');
    // Nasolabial laugh/aging lines from nose to mouth
    r(12, layout.mouthY - 1, 1, 2, '#70826c');
    r(18, layout.mouthY - 1, 1, 2, '#70826c');
  }

  // Elderly Male Mustache or Beard (ผลคงที่ตาม seed หรือตัวระบุ id ของตัวละคร)
  if (layout.isElderly && bio.gender === 'ชาย') {
    const facialHairType = getSeedHash(bio.id, bio.generationSeed) % 3;
    if (facialHairType === 1) {
      // Mustache (หนวดสีเทาเงิน)
      r(12, layout.mouthY, 7, 1, '#cad1c7');
      r(11, layout.mouthY + 1, 2, 1, '#9da69a');
      r(18, layout.mouthY + 1, 2, 1, '#9da69a');
    } else if (facialHairType === 2) {
      // Beard (เคราสีเทาเงินตามแนวกรามและคาง)
      r(12, layout.mouthY, 7, 1, '#cad1c7');
      r(11, layout.mouthY + 1, 9, 2, '#9da69a');
      r(12, layout.mouthY + 3, 7, 1, '#7e877c');
    }
  }

  // Stage 2+ (25%+): Sharp protruding fangs & dark bio-veins
  if (mutStage >= 2) {
    // Sharp protruding fangs
    r(layout.eyeLeftX + 1, layout.mouthY + 1, 1, 2, '#f8fafc');
    r(layout.eyeRightX, layout.mouthY + 1, 1, 2, '#f8fafc');
    // Dark bio-veins on temple & neck
    r(layout.headX + 1, layout.eyeY + 2, 1, 2, '#581c87');
    r(layout.headX + layout.headW - 2, layout.eyeY + 2, 1, 2, '#581c87');
    r(12, layout.torsoY + 1, 1, 2, '#581c87');
  }

  // Stage 3+ (50%+): Curved claws on both hands & torso bio-veins
  if (mutStage >= 3) {
    const handY = layout.armY + layout.armH - 1;
    r(layout.armLeftX, handY, 1, 2, '#e2e8f0');
    r(layout.armLeftX + 1, handY + 1, 1, 2, '#f43f5e');
    r(layout.armRightX + layout.armW - 2, handY + 1, 1, 2, '#f43f5e');
    r(layout.armRightX + layout.armW - 1, handY, 1, 2, '#e2e8f0');
    r(15, layout.torsoY + 2, 2, 3, '#4c1d95');
  }

  // Stage 4 (75%+): Bio-luminescent cranial crest & glowing chest core
  if (mutStage >= 4) {
    // Cranial crest positioned right on top of head for each age group
    r(15, layout.headY - 3, 2, 3, '#a855f7');
    r(16, layout.headY - 4, 1, 2, '#34d399');
    // Glowing chest core in center of torso
    const coreX = layout.isElderly ? 14 : 15;
    r(coreX, layout.torsoY + 2, 2, 2, '#34d399');
  }

  // ==========================================
  // OUTFIT VARIANTS (from character generation)
  // ==========================================
  if (bio.appearance?.outfitVariant === 1) {
    r(layout.torsoX + 1, layout.torsoY + 2, 2, 1, light);
    r(layout.torsoX + layout.torsoW - 3, layout.torsoY + 2, 2, 1, light);
  }
  if (bio.appearance?.outfitVariant === 2) {
    r(layout.torsoX + layout.torsoW - 3, layout.torsoY + 4, 2, 2, light);
    r(layout.torsoX + 2, layout.torsoY + 4, 2, 1, ink);
  }

  // ==========================================
  // OCCUPATION & UNIFORM DETAILS (21 Roles)
  // Preserving occupational identities adapted to silhouette
  // ==========================================
  if (['paramedic', 'cleaner', 'mototaxi'].includes(role)) {
    // Reflective safety stripes on torso
    r(layout.torsoX + 1, layout.torsoY + 1, 2, layout.torsoH - 2, light);
    r(layout.torsoX + layout.torsoW - 3, layout.torsoY + 1, 2, layout.torsoH - 2, light);
  }

  if (['nurse', 'paramedic'].includes(role)) {
    // Medic cross badge on torso
    r(14, layout.torsoY + 3, 4, 4, light);
    r(15, layout.torsoY + 4, 2, 2, '#cc6868');
  }

  if (['vendor', 'barista'].includes(role)) {
    // Apron bib
    r(layout.torsoX + 2, layout.torsoY + 1, 2, 3, light);
    r(layout.torsoX + layout.torsoW - 4, layout.torsoY + 1, 2, 3, light);
    r(layout.torsoX + 2, layout.torsoY + 3, layout.torsoW - 4, layout.torsoH - 3, role === 'vendor' ? '#963f4d' : '#6f5946');
  }

  if (['mototaxi', 'electrician'].includes(role)) {
    // Yellow rider / safety helmet on head
    r(layout.headX + 2, layout.headY - 3, layout.headW - 4, 2, '#e6c258');
    r(layout.headX, layout.headY - 1, layout.headW, 3, '#e6c258');
    r(layout.headX - 1, layout.headY + 2, layout.headW + 2, 1, '#bd9d43');
    r(15, layout.headY - 2, 2, 3, light);
  }

  if (['watchman', 'busdriver'].includes(role)) {
    // Peaked cap / uniform cap
    r(layout.headX + 2, layout.headY - 2, layout.headW - 4, 2, '#526c88');
    r(layout.headX, layout.headY, layout.headW, 2, '#3e536d');
    r(layout.headX + layout.headW - 4, layout.headY + 2, 4, 1, '#3e536d');
    r(15, layout.torsoY + 1, 1, layout.torsoH - 2, light);
  }

  switch (role) {
    case 'primary':
    case 'secondary':
      // School uniform: white shirt with tie and dark pants / skirt
      r(layout.torsoX + 1, layout.torsoY + 1, layout.torsoW - 2, layout.torsoH - 3, '#e9efdd');
      r(15, layout.torsoY + 1, 2, 3, '#5a718e'); // student tie
      if (bio.gender === 'หญิง') {
        // School skirt
        r(layout.torsoX, layout.torsoY + layout.torsoH - 3, layout.torsoW, 3, '#4d6687');
      } else {
        // School shorts
        r(layout.legLeftX - 1, layout.torsoY + layout.torsoH - 3, layout.legW + 1, 3, '#4d6687');
        r(layout.legRightX, layout.torsoY + layout.torsoH - 3, layout.legW + 1, 3, '#4d6687');
      }
      // School backpack shoulder strap
      r(layout.torsoX + layout.torsoW - 2, layout.torsoY + 1, 2, layout.torsoH - 2, '#536e84');
      r(layout.torsoX + 2, layout.torsoY + 1, 1, layout.torsoH - 3, '#6e8790');
      break;

    case 'vocational':
      // Vocational mechanics shop uniform
      r(15, layout.torsoY + 1, 1, layout.torsoH - 1, light);
      r(layout.torsoX + layout.torsoW - 3, layout.torsoY + 2, 2, 2, light);
      r(layout.armRightX + layout.armW - 1, layout.torsoY + 2, 1, 5, '#d8a977'); // tool in pocket
      break;

    case 'retiredteacher':
      // Cloth document tote bag
      r(layout.armRightX + layout.armW - 1, layout.torsoY + 3, 4, 5, '#a47f55');
      r(layout.armRightX + layout.armW, layout.torsoY + 3, 1, 5, light);
      break;

    case 'retired':
      // Retired official sage shirt & government document folio
      r(15, layout.torsoY + 1, 1, layout.torsoH - 2, light);
      r(layout.armRightX + layout.armW - 1, layout.torsoY + 3, 5, 5, '#d6ceac');
      r(layout.armRightX + layout.armW, layout.torsoY + 4, 3, 1, '#889782');
      r(layout.armRightX + layout.armW, layout.torsoY + 6, 3, 1, '#889782');
      break;

    case 'courier':
      // Crossbody bag strap & delivery parcel box
      r(layout.torsoX + 1, layout.torsoY + 1, 2, 2, '#816342');
      r(layout.torsoX + 3, layout.torsoY + 3, 3, 2, '#816342');
      r(layout.torsoX + 6, layout.torsoY + 5, 3, 2, '#816342');
      r(layout.armRightX, layout.torsoY + 4, 5, 4, '#b18a5b');
      r(layout.armRightX + 2, layout.torsoY + 4, 1, 4, light);
      break;

    case 'watchman':
      // Gold security cap badge & brass guard flashlight
      r(15, layout.headY - 1, 2, 2, '#e6c779');
      r(layout.armRightX + layout.armW - 1, layout.torsoY + 2, 2, 2, '#e6c779');
      break;

    case 'subway':
      // Underground convenience store hoodie & green apron
      r(12, layout.torsoY + 1, 1, 4, light);
      r(19, layout.torsoY + 1, 1, 4, light);
      r(14, layout.torsoY + 4, 4, 4, light);
      break;

    case 'radio':
      // Radio technician headset & microphone boom
      r(layout.headX - 1, layout.eyeY - 2, 2, 4, '#d8c87c');
      r(layout.headX + layout.headW - 1, layout.eyeY - 2, 2, 4, '#d8c87c');
      r(layout.headX + 1, layout.headY - 1, layout.headW - 2, 1, ink);
      r(layout.headX + layout.headW - 1, layout.mouthY, 1, 2, ink);
      r(layout.headX + layout.headW - 4, layout.mouthY + 1, 3, 1, ink);
      break;

    case 'mototaxi':
      // Reflective vest chest badge
      r(14, layout.torsoY + 3, 4, 3, light);
      r(15, layout.torsoY + 4, 2, 1, ink);
      break;

    case 'vendor':
      // Market waist cash pouch
      r(layout.armRightX + layout.armW, layout.torsoY + 1, 1, 6, '#b8c6bd');
      r(layout.armRightX + layout.armW - 1, layout.torsoY, 2, 2, '#d8dfcf');
      r(layout.armLeftX - 1, layout.torsoY + 2, 2, 5, '#dfca94');
      break;

    case 'nurse':
      if (isFemale) {
        // Nurse cap with red cross
        r(layout.headX + 2, layout.headY - 2, layout.headW - 4, 2, '#d3e5df');
        r(layout.headX, layout.headY, layout.headW, 2, '#b9d5da');
        r(15, layout.headY - 1, 2, 1, '#cc6868');
      } else {
        // Male nurse (บุรุษพยาบาล): medical badge on chest pocket
        r(layout.torsoX + 2, layout.torsoY + 2, 3, 3, '#d3e5df');
        r(layout.torsoX + 3, layout.torsoY + 2, 1, 3, '#cc6868');
        r(layout.torsoX + 2, layout.torsoY + 3, 3, 1, '#cc6868');
      }
      break;

    case 'electrician':
      // Tool belt & insulated wire cutter
      r(layout.torsoX, layout.torsoY + layout.torsoH - 2, layout.torsoW, 2, '#6e5141');
      r(layout.armRightX + layout.armW - 1, layout.torsoY + 3, 1, 5, '#e19167');
      r(layout.armRightX + layout.armW - 1, layout.torsoY + 1, 1, 2, '#cddbd1');
      break;

    case 'cleaner':
      // Municipal cleaner sun bandana & broom
      r(layout.headX + 2, layout.headY - 2, layout.headW - 4, 2, '#cbbb87');
      r(layout.headX, layout.headY, layout.headW, 2, '#ddc99a');
      r(layout.headX - 1, layout.headY + 2, layout.headW + 2, 1, '#b8a576');
      r(layout.torsoX + 1, layout.torsoY + layout.torsoH - 2, layout.torsoW - 2, 1, light);
      r(layout.armRightX + layout.armW, layout.torsoY - 2, 1, layout.torsoH + 5, '#b9c4a4');
      r(layout.armRightX + layout.armW - 1, layout.torsoY - 3, 3, 1, '#b9c4a4');
      break;

    case 'barista':
      // Coffee cup in hand & apron tag
      r(layout.armRightX + layout.armW - 1, layout.torsoY + 3, 4, 4, light);
      r(layout.armRightX + layout.armW + 3, layout.torsoY + 4, 1, 2, light);
      r(layout.torsoX + layout.torsoW - 3, layout.torsoY + 1, 1, 2, '#9cb6a6');
      break;

    case 'developer':
      // Lanyard & tech access card
      r(layout.torsoX + 2, layout.torsoY + 4, 7, 3, '#4e6070');
      r(layout.torsoX + 3, layout.torsoY + 5, 1, 1, '#bedba5');
      r(layout.torsoX + 6, layout.torsoY + 5, 1, 1, '#bedba5');
      break;

    case 'boatcrew':
      // Chao Phraya life vest & boat rope coil
      r(layout.torsoX, layout.torsoY + 1, 3, layout.torsoH - 1, '#eab66d');
      r(layout.torsoX + layout.torsoW - 3, layout.torsoY + 1, 3, layout.torsoH - 1, '#eab66d');
      r(layout.torsoX + 1, layout.torsoY + 3, layout.torsoW - 2, 1, '#526b5e');
      r(layout.armRightX + layout.armW - 1, layout.torsoY + 3, 4, 3, '#ddc88f');
      break;

    case 'liveseller':
      if (isFemale) {
        // Hairpin, chic blouse & mini microphone
        r(layout.headX + 2, layout.headY + 1, 2, 2, '#dd9bb4');
        r(layout.headX + layout.headW - 4, layout.headY + 1, 2, 2, '#dd9bb4');
        r(layout.torsoX + 1, layout.torsoY + layout.torsoH - 3, layout.torsoW - 2, 3, '#a5638a');
      } else {
        // Male streamer: urban dark shirt, collar clip microphone (no hairpins!)
        r(layout.torsoX + 1, layout.torsoY + 1, layout.torsoW - 2, layout.torsoH - 2, '#3b4252');
        r(layout.torsoX + 3, layout.torsoY + 2, 2, 2, '#d8dee9');
      }
      r(layout.armRightX + layout.armW - 1, layout.torsoY + 1, 3, 5, '#d6c7d3');
      break;

    case 'busdriver':
      // Gold bus cap insignia & ticket dispenser tube
      r(layout.armRightX + layout.armW - 1, layout.torsoY + 3, 2, 2, '#e3ce8d');
      r(layout.armRightX + layout.armW, layout.torsoY + 4, 2, 4, ink);
      break;
  }

  return pixels;
}

export default function ZombiePortrait({ bio, mutation = 0 }: { bio: Bio; mutation?: number }) {
  const mutStage = mutation >= 75 ? 4 : mutation >= 50 ? 3 : mutation >= 25 ? 2 : 1;
  const pixels = computePortraitPixels(bio, mutation);

  return (
    <svg
      viewBox="0 0 32 33"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`ซอมบี้ 8-bit เพศ${bio.gender}${bio.age ? ` อายุ ${bio.age} ปี` : ''} อดีต${bio.occupation}${
        mutStage > 1 ? ` กลายพันธุ์ระยะที่ ${mutStage}` : ''
      }`}
      className={`zombie-portrait mutation-stage-${mutStage}`}
    >
      {pixels.map(([x, y, width, height, fill], i) => (
        <rect key={i} {...{ x, y, width, height, fill }} />
      ))}
    </svg>
  );
}
