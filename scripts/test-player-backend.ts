import assert from 'node:assert/strict';
import {initializeApp, deleteApp} from 'firebase/app';
import {getAuth, connectAuthEmulator} from 'firebase/auth';
import {getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, deleteDoc, getDocs, collection, serverTimestamp} from 'firebase/firestore';
import {enterGuest, recordLife, readPublicStats, writeCloudSave, readCloudSave, CloudSaveConflict,
  encodeCloudSave, sendPlayerFeedback, type PlayerBackend} from '../src/services/playerBackend';

// Run only against `firebase emulators:start --only auth,firestore --project demo-after-zero`.
const apps = [initializeApp({apiKey: 'demo-key', projectId: 'demo-after-zero'}, 'rules-a-' + Date.now()),
  initializeApp({apiKey: 'demo-key', projectId: 'demo-after-zero'}, 'rules-b-' + Date.now())];
try {
  const services: PlayerBackend[] = apps.map(app => {
    const auth = getAuth(app);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', {disableWarnings: true});
    const db = getFirestore(app);
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    return {auth, db};
  });
  const [a, b] = services;
  await Promise.all(services.map(enterGuest));
  const uid = a.auth.currentUser!.uid;
  const before = await readPublicStats(a);
  const run = 'test-run-' + Date.now();
  await recordLife(a, uid, run);
  await recordLife(a, uid, run);
  assert.deepEqual(await readPublicStats(a), {...before, players: before.players + 1, lives: before.lives + 1});
  await recordLife(a, uid, run, 'death');
  await recordLife(a, uid, run, 'death');
  assert.deepEqual(await readPublicStats(a), {players: before.players + 1, lives: before.lives + 1, completed: before.completed + 1});
  assert((await getDoc(doc(a.db, 'players', uid, 'endings', 'death'))).exists());
  const payload = await encodeCloudSave('{"test":"private save"}');
  assert.equal(await writeCloudSave(a, uid, payload, 0), 1);
  assert.equal((await readCloudSave(a, uid))?.revision, 1);
  await assert.rejects(() => writeCloudSave(a, uid, payload, 0), CloudSaveConflict);
  await assert.rejects(() => readCloudSave(b, uid));
  await assert.rejects(() => getDocs(collection(b.db, 'players')));
  await assert.rejects(() => setDoc(doc(b.db, 'players', uid), {createdAt: serverTimestamp(), admin: true}));
  await assert.rejects(() => setDoc(doc(a.db, 'players', uid, 'cloud', 'current'), {encoding: 'gzip', payload, revision: 999, updatedAt: serverTimestamp()}));
  await assert.rejects(() => deleteDoc(doc(a.db, 'players', uid, 'runs', run)));
  await assert.rejects(async () => setDoc(doc(a.db, 'statistics', 'global'), {...await readPublicStats(a), lives: 9999999, proofRunId: run, operation: 'start'}));
  await assert.rejects(() => setDoc(doc(a.db, 'players', uid, 'runs', run), {startedAt: serverTimestamp(), endingId: null}));
  const id = await sendPlayerFeedback(a, uid, 'bug', 'ปัญหาทดสอบจาก emulator', {version: 'test'});
  assert((await getDoc(doc(a.db, 'feedback', id))).exists());
  await assert.rejects(() => getDoc(doc(b.db, 'feedback', id)));
  await assert.rejects(() => sendPlayerFeedback(a, uid, 'bug', 'ต้องถูกจำกัดความถี่', {version: 'test'}));
  console.log('Backend emulator: ownership, cloud revisions, duplicate counters, achievements, schema/replay attacks, and feedback passed.');
} finally {await Promise.all(apps.map(deleteApp));}
