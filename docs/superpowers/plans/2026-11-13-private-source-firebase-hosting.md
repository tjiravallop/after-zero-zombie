# Private Source + Firebase Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. ผู้ใช้ขอแผนเท่านั้น ยังไม่อนุมัติ execution

**Goal:** เผยแพร่เกมบน Firebase Hosting ให้ระบบบัญชีและเซฟเดิมทำงาน แล้วปิด GitHub source เป็น Private โดยผู้เล่นมีทางย้ายเซฟก่อน

**Architecture:** คง Vite/React frontend และ Firebase backend เดิม เปลี่ยนเฉพาะที่เผยแพร่เว็บและการเข้าถึง repo เปิดเว็บใหม่คู่ขนานให้ตรวจสอบก่อน cutover แล้วคง CI ตรวจ build พร้อม deploy ผ่าน CLI ในระยะแรก

**Tech Stack:** React/Vite, pnpm 11.25.0, Node 24, Firebase Hosting CLI, Firebase Auth/Firestore เดิม

**Spec:** `docs/superpowers/specs/2026-11-13-private-source-firebase-hosting-design.md` — proposed, awaiting approval

## Global Constraints

- ใช้ project/site `after-zero-zombie-261112` และ Firestore `(default)` เดิม
- ยังไม่เปลี่ยน visibility, ปิด Pages, deploy Firebase Hosting หรือเปิด billing จนกว่าแผนได้รับอนุมัติ
- ห้ามล้างเซฟ ย้าย UID เอง เปลี่ยน effects/conditions หรือเลือกเซฟชนกันแทนผู้เล่น
- เผยแพร่เฉพาะ `dist`; ไม่มี standalone HTML, project ZIP, source maps, secrets หรือ source directories
- ไม่ commit token/service-account key และไม่อ่าน credential store เพื่อหลีกเลี่ยงข้อจำกัดของเครื่องมือ
- เก็บงาน writer ที่ยัง untracked ไว้; ไม่ force push ไม่ rewrite ประวัติ และไม่เปิด repo กลับเป็น Public เป็น rollback อัตโนมัติ
- เครื่องนี้อาจไม่มี `npx`; ใช้ Firebase CLI ผ่าน pnpm ที่ล็อกอินแล้วได้ โดยไม่สร้าง project ใหม่

## Review Focus

1. Guest เดิมบน Pages เปิดเว็บใหม่แล้วต้องได้รับคำแนะนำ Google/JSON ไม่ถูกอ้างว่าเซฟย้ายเอง
2. Google UID เดิมบนโดเมนใหม่ต้องได้ชีวิต ชื่อ คลังบทจบ และ counter continuity เดิม
3. path แพ็กเกม/แหล่ง source ที่ไม่ควรเผยแพร่ต้องไม่ถูก rewrite เป็นหน้าหลักจนผ่านเช็คแบบผิด ๆ
4. รุ่นเว็บกับ engine/config ที่ cache ไว้ต่างเวอร์ชันต้องไม่ทำให้เซฟเสียหรือ Login หลุด
5. โฮสต์ใหม่ยังไม่ผ่านตรวจหรือ Guest ยังย้ายไม่ครบ ต้องหยุดก่อน Private; rollback ต้องไม่เปิด source กลับเอง

## Task 1: เตรียม Hosting config และตรวจ artifact — AI

**Files:** Modify `firebase.json`; Create `scripts/test-hosting-delivery.mjs`; Test `scripts/test-playtest-ui.ts`

**Interfaces:** Consumes `dist` จาก `pnpm build`, project/site เดิม; produces Hosting config และ runnable delivery checks ไม่เปลี่ยน auth/save interfaces

- [ ] บันทึก HEAD, URL Pages เดิม และ export เซฟของเจ้าของ เก็บ backup build นอก `public`/`dist` ที่จะเผยแพร่
- [ ] เขียน delivery check ให้ fail เมื่อยังไม่มี `hosting.public === 'dist'`, site ผิด, มี catch-all rewrite, หรือ artifact มีแพ็กเกม/source maps/source directories
- [ ] เพิ่ม `hosting.site = 'after-zero-zombie-261112'`, `hosting.public = 'dist'`, ignore ค่า Firebase มาตรฐาน และ cache headers ตาม Spec โดยเก็บ Auth/Firestore block เดิมครบ
- [ ] รัน `pnpm build`, `node scripts/test-hosting-delivery.mjs`, `pnpm lint` ต้องผ่าน; test ตรวจการเปิดเกมและสำรอง/นำเข้าเซฟยังผ่าน
- [ ] ตรวจ HTTP header ด้วย Hosting emulator และ `fetch`/assert โดยไม่เริ่มชีวิตจริงเพิ่มในสถิติ production
- [ ] Commit เฉพาะ config/check ที่ผ่านแล้ว ยังไม่เปลี่ยน repo visibility

## Task 2: เปิดเว็บ Firebase คู่ขนานและตรวจบัญชี — AI + เจ้าของ

**Files:** Modify `firebase.json` Auth domains เมื่อจำเป็น; Test `scripts/test-cloud-ui.ts`; record evidence in `docs/playtest-services.md`

**Interfaces:** Consumes Task 1 artifact/config; produces เว็บที่ `https://after-zero-zombie-261112.web.app/` พร้อมผลตรวจจริง โดยยังคง Pages เดิม

- [ ] ตรวจโดเมนที่อนุญาตสำหรับ Google; เพิ่มโดเมนใหม่ก่อนทดสอบ โดยคง Firebase handler และโดเมนเก่าระหว่างย้าย
- [ ] รัน `firebase deploy --only hosting --project after-zero-zombie-261112` ผ่าน CLI ที่ยืนยันตัวตนแล้ว; ถ้าต้องปรับ Auth ให้ deploy เฉพาะ Auth ตาม config ที่ทบทวน ไม่ deploy ฐานข้อมูลใหม่
- [ ] ตรวจ root/index/config/engine/assets status และ cache headers; path standalone/project ZIP/source ที่ห้ามเผยแพร่ต้อง 404 จริง
- [ ] ใช้ browser ใหม่ทดสอบ Guest, เริ่มชีวิต, reload, backup/import JSON และ Feedback ที่ไม่แนบข้อมูลเพิ่มโดยอัตโนมัติ
- [ ] เจ้าของเชื่อม Google บน Pages เดิม รอเซฟสำเร็จ แล้วใช้ Google เดียวกันบน Firebase; ตรวจ UID เดิมผ่านการกู้ชีวิตและข้อมูลส่วนตัว ไม่เพิ่ม start ซ้ำจากการโหลด
- [ ] ตรวจกรณี local/cloud ต่างกันว่ามีตัวเลือกและปุ่ม backup ทั้งสองฝั่ง เซฟไม่ถูกเขียนทับเอง และสถานะชื่อ/อีเมล Google แสดงชัด
- [ ] ถ้าเช็คใดไม่ผ่าน ให้แก้เว็บใหม่ขณะ Pages ยังใช้ได้ ไม่ดำเนิน Task 4

## Task 3: ย้ายผู้ทดสอบและกำหนด URL ใหม่ — AI เตรียม / เจ้าของยืนยัน

**Files:** Modify `src/App.tsx` สำหรับประกาศย้ายที่อ่านง่ายเมื่อจำเป็น; Modify `docs/playtest-services.md`; Test `scripts/test-playtest-ui.ts`

**Interfaces:** Consumes URL ที่ผ่าน Task 2; produces การแจ้งผู้เล่นและการยืนยันว่าเซฟ Guest ที่ต้องเก็บมีทางย้ายแล้ว ไม่มีการคัดลอก localStorage ข้ามโดเมน

- [ ] เจ้าของยืนยันว่ามีผู้เล่น Guest ที่ต้องรักษาเซฟหรือไม่ และกำหนดเวลาปิดลิงก์เก่าตามผู้เล่นจริง ห้ามอนุมานจากยอดบัญชีอย่างเดียว
- [ ] หากต้องมีช่วงย้าย ให้หน้าเดิมแสดง URL ใหม่และทางเลือก “เชื่อม Google แล้วรอเซฟ” / “สำรองเซฟ JSON” โดยไม่บังคับเปลี่ยนหน้าอัตโนมัติ
- [ ] ทดสอบย้าย JSON จาก origin เดิมไป origin ใหม่: ตัวละคร วัน และคลังบทจบยังอยู่ พร้อมระบุข้อจำกัดตัวนับของ Guest ตาม Spec
- [ ] ตรวจลิงก์ใหม่บนมือถือและเบราว์เซอร์อีกเครื่อง ให้เจ้าของยืนยันข้อมูลและผู้ทดสอบพร้อมก่อน Task 4

## Task 4: เปลี่ยน source เป็น Private และเลิกเผยแพร่ Pages — AI + เจ้าของ admin

**Files:** Modify `.github/workflows/deploy.yml`; Modify `README.md`; update operations docs

**Interfaces:** Consumes acceptance จาก Tasks 2–3; produces repo Private, Firebase เป็น URL หลัก, CI-only build checks และคำสั่ง deploy ผ่าน CLI

- [ ] เตรียม workflow ให้คง install/lint/save tests/build/ตรวจแพ็กเกม แต่ถอด `actions/configure-pages`, `actions/upload-pages-artifact`, Pages deploy job และสิทธิ์ `pages: write`/`id-token: write` ที่ไม่ได้ใช้ ออกหลังโฮสต์ใหม่พร้อม ให้ CI-only เหลือสิทธิ์ `contents: read`
- [ ] ปรับ README/URL หลักเป็น Firebase และบอกชัดว่าช่วงแรก push จะตรวจ CI ส่วนการเผยแพร่ใช้ `firebase deploy --only hosting --project after-zero-zombie-261112`
- [ ] ให้เจ้าของอนุมัติ cutover จากเว็บใหม่ที่ตรวจได้จริง แล้วเจ้าของหรือเครื่องมือ admin ที่ได้รับอนุญาตเปลี่ยน repo เป็น Private ถ้าเครื่องมือไม่รองรับ ให้เจ้าของทำผ่าน Settings → Danger Zone → Change visibility
- [ ] ตรวจจากเครื่องมือไม่ล็อกอิน GitHub ว่า source/ไฟล์ในประวัติไม่เปิดอ่านผ่าน repo ที่ปิดแล้ว; ทราบว่าของที่ถูก fork/cache/ดาวน์โหลดไปก่อนหน้าไม่หายตาม
- [ ] ตรวจ Firebase ยังเล่นได้ Google/เซฟ/Feedback ยังทำงาน และ CI ของ Private repo ผ่าน โดยไม่เปิด source กลับ

## Task 5: ส่งมอบและทางย้อนเวอร์ชัน — AI

**Files:** Update operations docs และ `.agents/checkpoints/current.md`

- [ ] เก็บ URL หลัก, release/artifact ที่ตรวจผ่าน, คำสั่ง deploy และวิธี rollback เว็บ Firebase
- [ ] ถ้า release หลัง cutover เสีย ให้ rollback Hosting release หรือ redeploy artifact ที่เก็บไว้ ห้ามลบข้อมูล/เปลี่ยน Auth project/เปิด repo Public อัตโนมัติ
- [ ] บันทึกงานต่อยอดแยก: Firebase auto-deploy แบบสิทธิ์เหมาะสม, custom domain, หรือย้ายข้อมูลเกมสำคัญไป server หากต้องการควบคุมการส่งข้อมูลมากกว่านี้ ทั้งหมดอยู่นอกการย้ายครั้งแรก

## Acceptance / Execution

เสร็จเมื่อ repo เป็น Private, ผู้เล่นใช้ URL Firebase ได้, บัญชี Google/เซฟเดิมทำงาน, Guest มีทางย้ายที่ยืนยันแล้ว, ไม่มีแพ็กเกม/source files ใน deployment และมี rollback ที่คง privacy

เสนอให้ AI ตัวเดียวทำตามลำดับนี้ เจ้าของตรวจ Google จริงและอนุมัติ cutover จุดสำคัญ แผนนี้ยังไม่ใช่คำสั่งให้เปลี่ยน visibility หรือย้ายโฮสต์ทันที

Builder check: ผู้ตรวจแยกอ่าน Spec/Plan แล้ว ไม่พบคำถามสำคัญที่ขาดสำหรับลงมือ การตรวจรับ Google/Guest ยังเป็น gate ของเจ้าของตาม Tasks 2–4 ไม่ใช่สิ่งที่ถือว่าผ่านแล้ว
