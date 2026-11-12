# AFTER ZERO: Private source + Firebase Hosting

**สถานะ:** แบบเสนอเพื่ออนุมัติ ผู้ใช้ขอให้เตรียมแผน ยังไม่ได้อนุมัติให้ย้ายเว็บหรือเปลี่ยน visibility

## เป้าหมายและขอบเขต

เก็บต้นฉบับเกมใน GitHub Private และให้ผู้เล่นเปิดเว็บผ่าน Firebase Hosting โดยใช้ Authentication, Firestore, UID, cloud saves, Feedback และตัวนับจากโปรเจกต์เดิม `after-zero-zombie-261112` เว็บใหม่ต้องพร้อมก่อนปิด Pages เดิม

การซ่อน repo ปิดการเปิดอ่านต้นฉบับ/ประวัติผ่าน GitHub สำหรับบุคคลทั่วไป แต่เบราว์เซอร์ยังต้องรับ JavaScript ภาพ และข้อมูลที่ใช้เล่น จึงไม่ใช่การรับประกันว่าคัดลอกเกมเว็บไม่ได้ ไฟล์หรือ fork ที่คนอื่นเก็บไว้ก่อนหน้านี้ไม่สามารถเรียกคืนด้วยการเปลี่ยน visibility

ไม่เพิ่มระบบจ่ายเงิน ไม่เปลี่ยนเงื่อนไขเกม ไม่สร้าง Firebase project/ฐานข้อมูลใหม่ ไม่เปลี่ยน plan เป็นแบบเสียเงิน และไม่แก้ License ในงานย้ายนี้

## Approaches

| ทางเลือก | ผล | ข้อพิจารณา |
| --- | --- | --- |
| Private + Firebase Hosting | ต้นฉบับเป็น Private เว็บเล่นได้ที่ Firebase | ผู้ใช้เลือกให้เตรียมแผนนี้ มี Firebase backend อยู่แล้ว |
| Private + GitHub Pages | อาจคงลิงก์เดิมได้เมื่อแผน GitHub รองรับ | ยังไม่ได้ตรวจแผนบัญชี; GitHub Free ไม่รองรับ Pages ของ Private repo |
| Public + เอาดาวน์โหลดออก | หยุดแจกไฟล์พร้อมเล่นแบบคลิกเดียว | ยังเปิดอ่านต้นฉบับได้ จึงไม่พอกับเป้าหมายซ่อน source |

## สิ่งที่ตรวจแล้ว

- Repo `tjiravallop/after-zero-zombie` เป็น Public
- Firebase Hosting มี site `after-zero-zombie-261112` อยู่จริงแล้ว เป้าหมายคือ `https://after-zero-zombie-261112.web.app/` การมี site ยังไม่แปลว่า deploy เกมแล้ว
- `firebase.json` ปัจจุบันมี Auth/Firestore/emulators แต่ยังไม่มี `hosting`
- Vite ใช้ `base: './'` เกมเปลี่ยนหน้าด้วย state ไม่มี router สำหรับ URL ย่อย
- `.github/workflows/deploy.yml` ปัจจุบัน build/test แล้วเผยแพร่ Pages
- หน้าล็อกอินจริงบน Pages มีปุ่มออกจากบัญชี Google และพบเซฟคลาวด์แล้ว ผู้ใช้ยังต้องเลือกเซฟเองเมื่อข้อมูลต่างกัน

## แบบที่เสนอ

1. เพิ่ม Hosting ที่เผยแพร่เฉพาะ `dist` ไม่เผยแพร่ root project, `src`, docs, `.git`, source maps หรือแพ็กเกม HTML/ZIP
2. ใช้ Auth/Firestore config เดิม ตรวจและอนุญาตโดเมนใหม่ก่อนเปิดใช้ Google บนเว็บใหม่ ไม่ย้ายเอกสารผู้เล่นหรือสร้าง UID ใหม่ให้บัญชี Google เดิม
3. ยังไม่ใส่ catch-all rewrite เกมใช้ URL รากอยู่แล้ว เพื่อให้ path ของแพ็กเกมที่ลบออกตอบ 404 จริง
4. ตั้ง cache ของ `/`, `/index.html`, `/firebase-config.json` เป็น `no-store`; `/after-zero-bundle.js` ต้องตรวจเวอร์ชันใหม่; `/assets/**` ที่มี hash ใช้ immutable cache
5. เปิดเว็บ Firebase คู่ขนานกับ Pages และทดสอบให้จบก่อนประกาศย้าย/เปลี่ยน repo เป็น Private
6. ช่วงย้ายครั้งแรกเสนอให้ deploy ด้วย CLI ของเจ้าของที่ล็อกอินอยู่แล้ว ส่วน GitHub Actions คงตรวจ type/build/นโยบายไม่แจกแพ็กเกม เมื่อปิด Pages ให้ถอด job deploy Pages ออก การทำ Firebase auto-deploy เป็นงานต่อยอดที่ต้องจัดสิทธิ์ CI ให้เหมาะสม ไม่ขอ service-account key มาใส่แชตหรือ repo

## เซฟเมื่อเปลี่ยนโดเมน

- **Google:** ให้เชื่อม Google ที่เว็บเดิมและรอเซฟคลาวด์สำเร็จ จากนั้นเข้า Google บัญชีเดียวกันที่เว็บใหม่ ใช้ UID/เซฟคลาวด์เดิม และตรวจชื่อ ตัวละคร วัน คลังบทจบ
- **Guest:** session และ localStorage ของโดเมนเดิมไม่ย้ายไปอีกโดเมนอัตโนมัติ ทางเลือกคือเชื่อม Google ก่อนย้าย หรือดาวน์โหลดเซฟ JSON แล้วนำเข้าที่เว็บใหม่ ไฟล์เซฟไม่ใช่ไฟล์เกมพร้อมเล่น
- **Guest + JSON:** เล่นต่อได้ แต่ตัวนับไม่ควรสร้าง start ย้อนหลังให้ imported run ที่ยังพิสูจน์เจ้าของเดิมไม่ได้ การจบ run เดิมที่นับภายใต้ Guest UID คนละโดเมนจึงอาจไม่ต่อสถิติกลาง เสนอ Google เป็นทางย้ายที่รักษา identity/counter continuity
- ห้ามล้าง localStorage, กดเลือกเซฟแทนผู้เล่น หรือถือว่าผู้เล่น Guest ย้ายแล้วเพียงเพราะเว็บใหม่โหลดได้ เจ้าของต้องยืนยันผู้ทดสอบที่ต้องเก็บเซฟย้ายครบก่อนปิดลิงก์เก่า

## เจ้าของงานและจุดอนุมัติ

AI ตัวเดียวทำ config, tests, deploy เว็บใหม่ และตรวจระบบตามลำดับ เจ้าของเกมตรวจด้วย Google จริงและยืนยันเรื่องผู้เล่น Guest การเปลี่ยน Public เป็น Private เป็นขั้นสุดท้ายหลังเห็นเว็บใหม่และข้อมูลพร้อมแล้ว โดยเจ้าของหรือเครื่องมือ admin ที่ได้รับอนุญาต

ข้อเสนอเพื่ออนุมัติ: ใช้ URL Firebase ใหม่ในระยะแรก ไม่ซื้อโดเมน/อัปเกรดแพ็กเกจ และ deploy ผ่าน CLI ก่อน หากต้องรักษาลิงก์ Pages เดิม ต้องเพิ่มแผน redirect แยกต่างหาก; อย่าเปลี่ยนชื่อ repo หรือสร้าง public redirect repo โดยพลการ

## Rollback

ก่อน Private ใช้ Pages เดิมเป็นทางสำรองได้ หลัง Private ให้ rollback Firebase release หรือ deploy artifact ที่ตรวจผ่านแล้ว การเปิด source กลับเป็น Public ไม่ใช่ rollback อัตโนมัติ ห้ามลบฐานข้อมูลหรือเปลี่ยน Auth project เพื่อย้อนเวอร์ชันเว็บ

## หลักฐานอ้างอิง

- [GitHub: ผลของการเปลี่ยน visibility](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
- [Firebase Hosting configuration](https://firebase.google.com/docs/hosting/full-config)
- [Firebase Authentication persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)
