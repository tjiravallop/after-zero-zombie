import {initializeApp, getApps, type FirebaseOptions} from 'firebase/app';
import {getAuth, signInAnonymously, GoogleAuthProvider, linkWithPopup, signInWithCredential, signInWithPopup,
  onAuthStateChanged, signOut, connectAuthEmulator, updateCurrentUser, type User} from 'firebase/auth';
import {getFirestore, doc, getDoc, runTransaction, serverTimestamp, collection, connectFirestoreEmulator, type Firestore} from 'firebase/firestore';

export type PlayerBackend = {auth: ReturnType<typeof getAuth>; db: Firestore};
export type CloudSave = {revision: number; payload: string; updatedAt: number};
export class CloudSaveConflict extends Error {}

let backendPromise: Promise<PlayerBackend | null> | undefined;
export function getPlayerBackend() {
  backendPromise ??= (async () => {
    if (location.protocol === 'file:') return null;
    const response = await fetch(new URL('firebase-config.json', document.baseURI), {cache: 'no-store'});
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('โหลดการเชื่อมต่อบัญชีไม่สำเร็จ');
    const config: FirebaseOptions & {useEmulators?: boolean} = await response.json();
    if (!config.apiKey || !config.projectId || !config.authDomain || !config.appId) return null;
    const app = getApps().find(app => app.name === 'after-zero') ?? initializeApp(config, 'after-zero');
    const auth = getAuth(app);
    const db = getFirestore(app);
    if (config.useEmulators && config.projectId.startsWith('demo-') && ['localhost', '127.0.0.1'].includes(location.hostname)) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', {disableWarnings: true});
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
    }
    return {auth, db};
  })().catch(error => {backendPromise = undefined; throw error;});
  return backendPromise;
}

export function watchPlayer(backend: PlayerBackend, callback: (user: User | null) => void) {
  return onAuthStateChanged(backend.auth, callback);
}
export async function enterGuest(backend: PlayerBackend) {
  await backend.auth.authStateReady();
  if (!backend.auth.currentUser) await signInAnonymously(backend.auth);
}
export async function enterGoogle(backend: PlayerBackend) {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({prompt: 'select_account'});
  const user = backend.auth.currentUser;
  if (!user?.isAnonymous) return signInWithPopup(backend.auth, provider);
  try { return await linkWithPopup(user, provider); }
  catch (error: unknown) {
    if (!['auth/credential-already-in-use', 'auth/email-already-in-use'].includes((error as {code?: string}).code ?? '')) throw error;
    const credential = GoogleAuthProvider.credentialFromError(error as Parameters<typeof GoogleAuthProvider.credentialFromError>[0]);
    if (!credential) throw error;
    // Keep only the former anonymous identity so its already-counted lives can finish after linking to an existing account.
    const formerGuest = await guestBackendFor(backend, user.uid);
    await updateCurrentUser(formerGuest.auth, user);
    return signInWithCredential(backend.auth, credential);
  }
}
export async function leaveAccount(backend: PlayerBackend) {
  await signOut(backend.auth);
  await enterGuest(backend);
}

async function guestBackendFor(primary: PlayerBackend, uid: string): Promise<PlayerBackend> {
  const name = 'after-zero-former-guest-' + uid;
  const existing = getApps().find(app => app.name === name);
  const app = existing ?? initializeApp(primary.auth.app.options, name);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const emulator = primary.auth.emulatorConfig;
  if (!existing && emulator) {
    connectAuthEmulator(auth, emulator.protocol + '://' + emulator.host + ':' + emulator.port, {disableWarnings: true});
    connectFirestoreEmulator(db, emulator.host, 8080);
  }
  await auth.authStateReady();
  return {auth, db};
}

// Firestore documents have a 1 MiB limit. Compress complete, validated save bundles.
export async function encodeCloudSave(json: string) {
  if (new TextEncoder().encode(json).length > 10 * 1024 * 1024) throw new Error('เซฟใหญ่เกินกว่าจะเก็บบนคลาวด์ กรุณาสำรองเป็นไฟล์');
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  const payload = btoa(binary);
  if (payload.length > 900_000) throw new Error('เซฟใหญ่เกินกว่าจะเก็บบนคลาวด์ กรุณาสำรองเป็นไฟล์');
  return payload;
}
export async function decodeCloudSave(payload: string) {
  if (payload.length > 900_000) throw new Error('ข้อมูลคลาวด์มีขนาดไม่ถูกต้อง');
  const bytes = Uint8Array.from(atob(payload), character => character.charCodeAt(0));
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 10 * 1024 * 1024) throw new Error('ข้อมูลคลาวด์มีขนาดไม่ถูกต้อง');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return new Blob(chunks as BlobPart[]).text();
}
export async function readCloudSave(backend: PlayerBackend, uid: string): Promise<CloudSave | null> {
  const snapshot = await getDoc(doc(backend.db, 'players', uid, 'cloud', 'current'));
  if (!snapshot.exists()) return null;
  const value = snapshot.data();
  if (value.encoding !== 'gzip' || typeof value.payload !== 'string' || !Number.isSafeInteger(value.revision)) throw new Error('เซฟบนคลาวด์ไม่ถูกต้อง');
  return {revision: value.revision, payload: value.payload, updatedAt: value.updatedAt?.toMillis() ?? 0};
}
export async function writeCloudSave(backend: PlayerBackend, uid: string, payload: string, revision: number) {
  const ref = doc(backend.db, 'players', uid, 'cloud', 'current');
  return runTransaction(backend.db, async transaction => {
    const existing = await transaction.get(ref);
    if ((existing.data()?.revision ?? 0) !== revision) throw new CloudSaveConflict('มีเซฟใหม่จากอีกเครื่อง กรุณาเลือกเซฟที่จะใช้');
    transaction.set(ref, {encoding: 'gzip', payload, revision: revision + 1, updatedAt: serverTimestamp()});
    return revision + 1;
  });
}

export type PublicStats = {players: number; lives: number; completed: number};
export async function readPublicStats(backend: PlayerBackend): Promise<PublicStats> {
  const value = (await getDoc(doc(backend.db, 'statistics', 'global'))).data();
  return {players: value?.players ?? 0, lives: value?.lives ?? 0, completed: value?.completed ?? 0};
}

export async function recordLife(backend: PlayerBackend, uid: string, runId: string, endingId?: string) {
  if (!runId || runId.length > 180 || runId.includes('/')) throw new Error('รหัสชีวิตไม่ถูกต้อง');
  const runRef = doc(backend.db, 'players', uid, 'runs', runId);
  const playerRef = doc(backend.db, 'players', uid);
  const statsRef = doc(backend.db, 'statistics', 'global');
  // One aggregate document suits the first playtest. Shard it if write contention grows.
  await runTransaction(backend.db, async transaction => {
    const [run, player, totals] = await Promise.all([transaction.get(runRef), transaction.get(playerRef), transaction.get(statsRef)]);
    if (run.exists()) return;
    if (!player.exists()) transaction.set(playerRef, {createdAt: serverTimestamp()});
    transaction.set(runRef, {startedAt: serverTimestamp(), endingId: null});
    const old = totals.data();
    transaction.set(statsRef, {
      players: (old?.players ?? 0) + Number(!player.exists()), lives: (old?.lives ?? 0) + 1,
      completed: old?.completed ?? 0, proofRunId: runId, operation: 'start',
    });
  });
  if (!endingId) return;
  if (endingId.length > 100 || endingId.includes('/')) throw new Error('รหัสบทจบไม่ถูกต้อง');
  const personalRef = doc(backend.db, 'players', uid, 'endings', endingId);
  const endingRef = doc(backend.db, 'endingStatistics', endingId);
  await runTransaction(backend.db, async transaction => {
    const [run, totals, personal, ending] = await Promise.all([
      transaction.get(runRef), transaction.get(statsRef), transaction.get(personalRef), transaction.get(endingRef),
    ]);
    if (!run.exists() || run.data().endingId) return;
    transaction.update(runRef, {endingId, finishedAt: serverTimestamp()});
    if (!personal.exists()) transaction.set(personalRef, {firstRunId: runId, unlockedAt: serverTimestamp()});
    const old = totals.data()!;
    transaction.set(statsRef, {...old, completed: old.completed + 1, operation: 'end', proofRunId: runId});
    transaction.set(endingRef, {players: (ending.data()?.players ?? 0) + Number(!personal.exists()),
      lives: (ending.data()?.lives ?? 0) + 1, proofRunId: runId});
  });
}

const LIFE_QUEUE_KEY = 'after_zero_v10_life_events';
type LifeEvent = {runId: string; endingId?: string; uid?: string; started?: boolean; finished?: boolean};
function readLifeQueue(): LifeEvent[] {
  const value = JSON.parse(localStorage.getItem(LIFE_QUEUE_KEY) ?? '[]');
  if (!Array.isArray(value)) throw new Error('อ่านคิวสถิติไม่สำเร็จ');
  return value.filter(event => event && typeof event.runId === 'string' && event.runId.length <= 180);
}
export function queueLifeStart(runId: string) {
  const queue = readLifeQueue();
  if (!queue.some(event => event.runId === runId)) {
    localStorage.setItem(LIFE_QUEUE_KEY, JSON.stringify([...queue, {runId}]));
  }
}
export function queueLifeEnding(runId: string, endingId: string) {
  queueLifeEndings([{runId, endingId}]);
}
export function queueLifeEndings(lives: {runId?: string; endingId?: string}[]) {
  const endings = new Map(lives.filter(life => typeof life.runId === 'string' && typeof life.endingId === 'string')
    .map(life => [life.runId!, life.endingId!]));
  if (!endings.size) return;
  const queue = readLifeQueue();
  let changed = false;
  for (const event of queue) {
    if (!event.endingId && endings.has(event.runId)) {
      event.endingId = endings.get(event.runId);
      changed = true;
    }
  }
  if (changed) localStorage.setItem(LIFE_QUEUE_KEY, JSON.stringify(queue));
}
export async function resumeLifeTracking(backend: PlayerBackend, uid: string, runId: string) {
  if (!runId || runId.length > 180 || runId.includes('/')) return;
  const queue = readLifeQueue();
  if (queue.some(event => event.runId === runId)) return;
  const existing = await getDoc(doc(backend.db, 'players', uid, 'runs', runId));
  // A cloud-restored life already belongs to this account. Imported unknown lives do not add starts.
  if (existing.exists()) {
    const fresh = readLifeQueue();
    if (!fresh.some(event => event.runId === runId)) localStorage.setItem(LIFE_QUEUE_KEY,
      JSON.stringify([...fresh, {runId, uid, started: true, finished: Boolean(existing.data().endingId)}]));
  }
}
export async function flushLifeEvents(backend: PlayerBackend, uid: string) {
  for (const pending of readLifeQueue()) {
    if (pending.finished || pending.started && !pending.endingId) continue;
    let service = backend;
    let owner = uid;
    if (pending.uid && pending.uid !== uid) {
      service = await guestBackendFor(backend, pending.uid);
      if (service.auth.currentUser?.uid !== pending.uid || !service.auth.currentUser.isAnonymous) continue;
      owner = pending.uid;
    }
    const queue = readLifeQueue();
    const event = queue.find(event => event.runId === pending.runId);
    if (!event) continue;
    event.uid = owner;
    localStorage.setItem(LIFE_QUEUE_KEY, JSON.stringify(queue));
    await recordLife(service, owner, event.runId, event.endingId);
    // Read again because gameplay may have queued a new ending during the request.
    const fresh = readLifeQueue();
    const updated = fresh.find(row => row.runId === event.runId);
    if (updated) {
      updated.started = true;
      updated.finished = Boolean(event.endingId && event.endingId === updated.endingId);
      localStorage.setItem(LIFE_QUEUE_KEY, JSON.stringify(fresh));
    }
  }
}
export async function readEndingStatistics(backend: PlayerBackend, endingId: string) {
  const data = (await getDoc(doc(backend.db, 'endingStatistics', endingId))).data();
  return data ? {players: Number(data.players), lives: Number(data.lives)} : null;
}

export async function sendPlayerFeedback(backend: PlayerBackend, uid: string, category: string, message: string,
  diagnostics: Record<string, string | number>, attachment?: string) {
  if (!['bug', 'idea', 'other'].includes(category) || message.trim().length < 5 || message.length > 4000) throw new Error('กรุณาเขียนรายละเอียด 5–4,000 ตัวอักษร');
  const feedbackRef = doc(collection(backend.db, 'feedback'));
  const rateRef = doc(backend.db, 'feedbackLimits', uid);
  await runTransaction(backend.db, async transaction => {
    const rate = await transaction.get(rateRef);
    if (Date.now() - (rate.data()?.sentAt?.toMillis() ?? 0) < 30_000) throw new Error('กรุณารอ 30 วินาทีก่อนส่งอีกครั้ง');
    transaction.set(feedbackRef, {ownerUid: uid, category, message: message.trim(), diagnostics,
      attachment: attachment ?? '', createdAt: serverTimestamp()});
    transaction.set(rateRef, {sentAt: serverTimestamp(), feedbackId: feedbackRef.id});
  });
  return feedbackRef.id;
}
