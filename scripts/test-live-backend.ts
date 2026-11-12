import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeApp, deleteApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';
import {enterGuest, encodeCloudSave, decodeCloudSave, writeCloudSave, readCloudSave, readPublicStats, sendPlayerFeedback} from '../src/services/playerBackend';

if (!process.argv.includes('--live')) throw new Error('Requires --live: creates a temporary anonymous account, private connectivity save, and TEST feedback. No run/ending counts are changed.');
const config = JSON.parse(await readFile('public/firebase-config.json', 'utf8'));
if (config.projectId !== 'after-zero-zombie-261112') throw new Error('Unexpected project');
const app = initializeApp(config, 'live-smoke-' + Date.now());
try {
  const backend = {auth: getAuth(app), db: getFirestore(app)};
  await enterGuest(backend);
  const uid = backend.auth.currentUser!.uid;
  const totals = await readPublicStats(backend);
  const text = JSON.stringify({kind: 'TEST connectivity check', createdAt: new Date().toISOString()});
  await writeCloudSave(backend, uid, await encodeCloudSave(text), 0);
  assert.equal(await decodeCloudSave((await readCloudSave(backend, uid))!.payload), text);
  await assert.rejects(() => readCloudSave(backend, 'other-owner'));
  const feedbackId = await sendPlayerFeedback(backend, uid, 'other', 'TEST: ตรวจการเชื่อมต่อ Feedback ก่อนเปิดรุ่นทดลอง', {version: 'live-smoke-1'});
  assert.deepEqual(await readPublicStats(backend), totals);
  console.log(JSON.stringify({passed: true, uid, feedbackId, countersUnchanged: true}));
} finally {await deleteApp(app);}
