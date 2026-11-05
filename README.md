# AFTER ZERO

เกมเล่าเรื่องและเอาชีวิตรอดในกรุงเทพฯ ปี 2026 ผู้เล่นเป็นซอมบี้ที่ยังมีสติ เลือกช่วยผู้คน ล่า ตามหาความทรงจำ หรือสร้างเส้นทางของตัวเอง

## พัฒนาและ build

บน Windows ดับเบิลคลิก **เล่นเกม.cmd** เพื่อเปิดเกมผ่านเว็บเซิร์ฟเวอร์ในเครื่อง ต้องติดตั้ง dependencies แล้ว และเปิดหน้าต่างคำสั่งค้างไว้ระหว่างเล่น

อย่าดับเบิลคลิก `index.html` หรือ `dist/index.html` โดยตรง เพราะเบราว์เซอร์บล็อก JavaScript modules ผ่าน `file://` หากต้องการเปิด build ให้รัน `pnpm preview` แล้วใช้ URL ที่คำสั่งแสดง

ต้องมี Node.js และ pnpm

```sh
pnpm install
pnpm dev
pnpm build
```

ก่อน dev/build ระบบจะเรียก `scripts/sync-bangkok-content.mjs` เพื่ออัปเดตเนื้อหาที่สร้างจาก JSON ลงในเอนจิน ไม่ต้องแก้บล็อกเนื้อหาที่สร้างอัตโนมัติด้วยมือ

## Deploy ขึ้น GitHub Pages

โปรเจกต์ตั้งค่า `base: './'` ใน `vite.config.ts` และมีไฟล์ `.github/workflows/deploy.yml` พร้อมใช้งานแล้ว:
1. กดปุ่ม **Save to GitHub** (ไอคอน GitHub มุมบนขวาใน AI Studio) หรือ push โค้ดขึ้นไปยัง branch `main`
2. ในหน้า Repository บน GitHub ไปที่ **Settings → Pages**
3. ในหัวข้อ **Build and deployment > Source** เลือกเป็น **GitHub Actions**
4. ระบบจะทำการ Build และ Deploy เว็บเกมขึ้น GitHub Pages ให้อัตโนมัติทุกครั้งที่มีการอัปเดตโค้ด


## ไฟล์หลัก

- `src/App.tsx`: หน้าเกม แท็บมือถือ และการเชื่อมต่อเอนจิน
- `src/components/ZombiePortrait.tsx`: ตัวละครพิกเซลตามอาชีพและเพศ
- `src/data/bangkokBios.ts`: อาชีพและภูมิหลังเพิ่มเติม
- `src/data/characterPool.ts`: สุ่มอายุ 10–80 ปี เพศ อาชีพตามวัย รูปลักษณ์ และสร้างสถานะเริ่มต้นตามอาชีพ
- `src/data/bangkokLocations.json`: สถานที่ เหตุการณ์ และบทจบประจำย่าน
- `src/data/progressionRoutes.json`: งานเตรียมเส้นทางและเงื่อนไขบทจบหลัก
- `src/data/travelDialogues.json`: บทสนทนาระหว่างเดินทาง
- `src/data/pastLifeEchoes.ts`: ตัวละคร ผู้คน ประวัติชีวิต และเหตุการณ์ต่อเนื่อง
- `public/after-zero-bundle.js`: เอนจินที่หน้าเกมใช้งานจริง รวมโมดูลพื้นฐานที่ยังจำเป็น

## ตรวจสอบเวอร์ชันปัจจุบัน

```sh
node test-blood-carry.mjs
node test-narrative.mjs
node test-travel.mjs
node --import tsx test-bangkok-world.tsx
node --import tsx test-bangkok-bios.tsx
node --import tsx test-map-locations.ts
node --import tsx test-character-pool.tsx
node --import tsx test-npc-wording.ts
```

เมื่อเปิด dev server แล้ว ใช้ `node test-mobile-ui.mjs` และ `node test-bangkok-browser.mjs` ตรวจหน้าเกมผ่าน Chrome บน Windows

ใช้ `node --import tsx test-pixel-map-browser.ts` ตรวจแผนที่ ป๊อปอัป จุดแจ้งเตือน และการเดินทางผ่านหน้าเกมจริง

ใช้ `node --import tsx scripts/test-ending-presentation.ts` ตรวจหน้าจบและความครบถ้วนของการส่งออกฉากจบ เทสต์สร้างชุดรีวิวในโฟลเดอร์ชั่วคราวและล้างออกเอง ไม่ต้องมี `docs/ending-review` ก่อน หากต้องการชุดรีวิวสำหรับอ่าน ให้รัน `node --import tsx scripts/export-ending-review.ts`

ใช้ `node --import tsx test-character-pool-browser.ts` ตรวจการสุ่ม จุดเกิด การรีโหลด และส่งออก/นำเข้าตัวละครผ่านหน้าเกม การจำลองตัวละครใหม่ในสคริปต์ใช้ `generateCharacter(seed)` ร่วมกับ `createCharacterState(production, bio)` เพื่อให้จุดเกิด โบนัส และเหตุการณ์เปิดตรงกับอาชีพ

`scripts/measure-progression.ts` ใช้วัดเส้นทางอ้างอิง ไม่ใช่ตัวแทนอัตราชนะของผู้เล่นจริง ผลลัพธ์และภาพที่สร้างใหม่เก็บใน `reports/` ซึ่งไม่ติดตามใน Git
