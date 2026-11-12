import {useEffect, useRef, useState} from 'react';
import type {User} from 'firebase/auth';
import PlayerModal from './PlayerModal';
import {CloudSaveConflict, decodeCloudSave, encodeCloudSave, enterGoogle, enterGuest, getPlayerBackend,
  leaveAccount, readCloudSave, readPublicStats, sendPlayerFeedback, watchPlayer, writeCloudSave,
  flushLifeEvents, queueLifeEnding, queueLifeEndings, resumeLifeTracking,
  type CloudSave, type PlayerBackend, type PublicStats} from '../services/playerBackend';

const playerError = (error: unknown, fallback: string) => error instanceof Error && /[\u0e00-\u0e7f]/.test(error.message) ? error.message : fallback;

export default function PlayerServices({snapshot, onRestore, onBackup}: {
  snapshot: string | null;
  onRestore: (json: string) => boolean;
  onBackup: () => void;
}) {
  const [backend, setBackend] = useState<PlayerBackend | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [panel, setPanel] = useState<'account' | 'feedback' | null>(null);
  const [message, setMessage] = useState('เล่นและบันทึกในเครื่องได้');
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [remote, setRemote] = useState<CloudSave | null>(null);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [syncTick, setSyncTick] = useState(0);
  const [connectionTick, setConnectionTick] = useState(0);
  const [feedback, setFeedback] = useState(() => {
    try {return (localStorage.getItem('after_zero_v10_feedback_draft') ?? '').slice(0, 4000);} catch {return '';}
  });
  const [category, setCategory] = useState('bug');
  const [diagnosticsAllowed, setDiagnosticsAllowed] = useState(false);
  const [attachSave, setAttachSave] = useState(false);
  const revision = useRef(0);
  const saved = useRef<string | null>(null);
  const latestSnapshot = useRef(snapshot);
  const restore = useRef(onRestore);
  const currentUid = useRef<string | null>(null);
  const uploading = useRef(false);
  latestSnapshot.current = snapshot;
  restore.current = onRestore;

  useEffect(() => {
    try {localStorage.setItem('after_zero_v10_feedback_draft', feedback);} catch { /* Keep the draft in memory if storage is unavailable. */ }
  }, [feedback]);

  useEffect(() => {
    let alive = true;
    let unsubscribe: (() => void) | undefined;
    getPlayerBackend().then(async service => {
      if (!alive || !service) return;
      setBackend(service);
      unsubscribe = watchPlayer(service, account => {
        if (!alive) return;
        const changed = currentUid.current !== (account?.uid ?? null);
        currentUid.current = account?.uid ?? null;
        setUser(account);
        if (changed) {setSyncEnabled(false); setRemote(null); setAuthNotice(null);}
      });
      await enterGuest(service);
    }).catch(() => {if (alive) setMessage('เชื่อมต่อบัญชีไม่ได้ เล่นต่อและสำรองเซฟในเครื่องได้');});
    return () => {alive = false; unsubscribe?.();};
  }, [connectionTick]);

  useEffect(() => {
    if (!backend || !user) return;
    let alive = true;
    setSyncEnabled(false);
    revision.current = 0;
    saved.current = null;
    readPublicStats(backend).then(value => {if (alive) setStats(value);}).catch(() => {});
    readCloudSave(backend, user.uid).then(async cloud => {
      if (!alive) return;
      if (!cloud) {setSyncEnabled(true); setMessage('เชื่อมต่อแล้ว พร้อมบันทึกบนคลาวด์'); return;}
      const json = await decodeCloudSave(cloud.payload);
      if (!alive) return;
      if (!latestSnapshot.current || latestSnapshot.current === json) {
        if (latestSnapshot.current || restore.current(json)) {
          revision.current = cloud.revision;
          saved.current = json;
          setSyncEnabled(true);
          setMessage('โหลดเซฟจากคลาวด์แล้ว');
        } else setMessage('เซฟบนคลาวด์เปิดไม่ได้ กรุณาใช้ไฟล์สำรอง');
      } else {setRemote(cloud); setPanel('account'); setMessage('พบเซฟบนคลาวด์ กรุณาเลือกชีวิตที่จะเล่นต่อ');}
    }).catch(() => {if (alive) setMessage('อ่านเซฟคลาวด์ไม่สำเร็จ เล่นต่อในเครื่องได้');});
    return () => {alive = false;};
  }, [backend, user?.uid, connectionTick]);

  useEffect(() => {
    const retry = () => {if (!uploading.current) setConnectionTick(value => value + 1);};
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, []);

  useEffect(() => {
    if (!snapshot) return;
    try {
      const bundle = JSON.parse(snapshot);
      queueLifeEndings([...(bundle.pastLives ?? []),
        {runId: bundle.gameState?.runId, endingId: bundle.gameState?.ending?.id}]);
    } catch { /* Local gameplay remains available; no imported life creates a statistics event. */ }
  }, [snapshot]);

  useEffect(() => {
    if (!backend || !user || !snapshot) return;
    let alive = true;
    const uid = user.uid;
    const state = JSON.parse(snapshot).gameState;
    void (async () => {
      await resumeLifeTracking(backend, uid, state.runId);
      if (!alive) return;
      if (state.ending?.id) queueLifeEnding(state.runId, state.ending.id);
      await flushLifeEvents(backend, uid);
      if (alive) setStats(await readPublicStats(backend));
    })().catch(() => { /* Durable life events retry on the next action or reconnection. */ });
    return () => {alive = false;};
  }, [backend, user?.uid, snapshot, syncTick, connectionTick]);

  useEffect(() => {
    if (!backend || !user || !syncEnabled || !snapshot || snapshot === saved.current) return;
    const uid = user.uid;
    const timer = setTimeout(async () => {
      if (uploading.current || currentUid.current !== uid) return;
      uploading.current = true;
      setIsUploading(true);
      setMessage('กำลังบันทึกบนคลาวด์');
      try {
        const payload = await encodeCloudSave(snapshot);
        if (currentUid.current !== uid) return;
        const nextRevision = await writeCloudSave(backend, uid, payload, revision.current);
        if (currentUid.current !== uid) return;
        revision.current = nextRevision;
        saved.current = snapshot;
        setMessage(latestSnapshot.current === snapshot ? 'บันทึกบนคลาวด์แล้ว' : 'มีความคืบหน้าใหม่ กำลังเตรียมบันทึก');
      } catch (error) {
        if (currentUid.current !== uid) return;
        if (error instanceof CloudSaveConflict) {
          setSyncEnabled(false);
          try {setRemote(await readCloudSave(backend, uid)); setPanel('account');} catch { /* Retry from account panel. */ }
        }
        setMessage(playerError(error, 'บันทึกคลาวด์ไม่สำเร็จ เซฟในเครื่องยังใช้เล่นต่อได้'));
      } finally {
        uploading.current = false;
        setIsUploading(false);
        if (currentUid.current === uid && saved.current === snapshot && latestSnapshot.current !== snapshot) setSyncTick(value => value + 1);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [backend, user?.uid, syncEnabled, snapshot, syncTick]);

  async function chooseSave(useCloud: boolean) {
    if (!remote || !user || busy || uploading.current) return;
    setBusy(true);
    const uid = user.uid;
    try {
      const json = await decodeCloudSave(remote.payload);
      if (currentUid.current !== uid) return;
      if (useCloud && !restore.current(json)) throw new Error('เซฟบนคลาวด์เปิดไม่ได้ กรุณาใช้ไฟล์สำรอง');
      revision.current = remote.revision;
      saved.current = useCloud ? json : null;
      setRemote(null);
      setSyncEnabled(true);
      setMessage(useCloud ? 'เลือกเซฟบนคลาวด์แล้ว' : 'เลือกเซฟในเครื่องแล้ว กำลังเตรียมสำรองบนคลาวด์');
    } catch (error) {setMessage(playerError(error, 'เปิดเซฟไม่สำเร็จ ยังเลือกเซฟเดิมได้'));}
    finally {setBusy(false);}
  }

  async function backupCloud() {
    if (!remote || busy) return;
    setBusy(true);
    try {
      const json = await decodeCloudSave(remote.payload);
      const url = URL.createObjectURL(new Blob([json], {type: 'application/json'}));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'after-zero-cloud-backup.json';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {setMessage('ดาวน์โหลดเซฟคลาวด์ไม่สำเร็จ ยังเลือกเซฟเดิมได้');}
    finally {setBusy(false);}
  }

  async function google() {
    if (!backend || busy || uploading.current) return;
    setBusy(true);
    try {
      const credential = await enterGoogle(backend);
      setUser(credential.user);
      setAuthNotice('เข้าสู่ระบบ Google สำเร็จ');
    }
    catch (error) {
      console.warn('Google sign-in failed:', (error as {code?: string}).code ?? 'unknown');
      setMessage('เข้าสู่ระบบ Google ไม่สำเร็จ กรุณาลองใหม่');
    }
    finally {setBusy(false);}
  }
  async function logout() {
    if (!backend || busy || uploading.current) return;
    setBusy(true);
    setAuthNotice(null);
    setSyncEnabled(false);
    try {await leaveAccount(backend);}
    catch {setMessage('ออกจากบัญชีไม่สำเร็จ กรุณาลองใหม่');}
    finally {setBusy(false);}
  }
  async function sendFeedback() {
    if (!backend || !user || busy) return;
    setBusy(true);
    try {
      const bundle = snapshot ? JSON.parse(snapshot) : null;
      const info: Record<string, string | number> = diagnosticsAllowed ? {
        version: 'playtest-1', day: Number(bundle?.gameState?.day ?? 0),
        place: String(bundle?.gameState?.place ?? ''), runId: String(bundle?.gameState?.runId ?? ''),
        browser: navigator.userAgent.slice(0, 300),
      } : {version: 'playtest-1'};
      const attachment = attachSave && snapshot ? await encodeCloudSave(snapshot) : undefined;
      const id = await sendPlayerFeedback(backend, user.uid, category, feedback, info, attachment);
      setFeedback('');
      setMessage('ส่งความคิดเห็นแล้ว หมายเลขอ้างอิง ' + id);
    } catch (error) {setMessage(playerError(error, 'ส่งไม่สำเร็จ ข้อความยังอยู่ ลองอีกครั้งได้'));}
    finally {setBusy(false);}
  }

  return <>
    <aside className="player-services" aria-label="บัญชีและบริการผู้เล่น">
      <strong data-auth-state={user && !user.isAnonymous ? 'google' : 'guest'} className={user && !user.isAnonymous ? 'text-lime-300' : 'text-slate-300'}>
        {user && !user.isAnonymous ? '✓ เข้าสู่ระบบ Google แล้ว' : 'Guest · ยังไม่ได้เชื่อม Google'}
      </strong>
      {user && !user.isAnonymous && user.displayName && <span>{user.displayName}</span>}
      <span>{message}</span>
      <button type="button" onClick={() => setPanel('account')}>บัญชีและเซฟ</button>
      <button type="button" onClick={() => setPanel('feedback')}>ส่งความคิดเห็น</button>
      {stats && <span>ผู้ติดเชื้อที่ตื่นขึ้น {stats.lives.toLocaleString()} ชีวิต · ผู้เล่น {stats.players.toLocaleString()} คน</span>}
    </aside>
    {panel === 'account' && <PlayerModal title="บัญชีและเซฟคลาวด์" onClose={() => setPanel(null)}>
      <div className="space-y-4 text-sm">
        {user && !user.isAnonymous && <div data-account-identity className="rounded-xl border border-lime-500/60 bg-lime-950/50 p-4">
          <p className="font-bold text-lime-200">เข้าสู่ระบบ Google แล้ว</p>
          <p className="mt-2 break-words">{user.displayName || 'บัญชี Google'}</p>
          {user.email && <p className="break-all text-slate-300">{user.email}</p>}
        </div>}
        {authNotice && <p data-auth-notice role="status" className="font-semibold text-lime-300">{authNotice}</p>}
        <p role="status">{message}</p>
        <button type="button" onClick={onBackup} disabled={!snapshot} className="player-secondary">ดาวน์โหลดเซฟสำรองในเครื่อง</button>
        <button type="button" onClick={() => {if (!uploading.current) setConnectionTick(value => value + 1);}} disabled={!backend || busy} className="player-secondary">ลองเชื่อมต่ออีกครั้ง</button>
        <p>{user && !user.isAnonymous ? 'บัญชี Google นี้ใช้สำรองเซฟและกลับมาเล่นต่อจากเครื่องอื่นได้' : 'Guest เล่นได้ทันทีในเบราว์เซอร์นี้ เชื่อม Google เพื่อกลับมาเล่นเซฟเดิมจากเครื่องอื่น'}</p>
        {!backend && <p>ยังเชื่อมต่อบัญชีไม่ได้ เล่นต่อและสำรองเซฟในเครื่องได้</p>}
        <button type="button" disabled={!backend || busy || isUploading} onClick={google} className="player-primary">{isUploading ? 'กำลังบันทึกเซฟ รอสักครู่' : user && !user.isAnonymous ? 'เปลี่ยนบัญชี Google' : 'เชื่อมบัญชี Google'}</button>
        {user && !user.isAnonymous && <><button type="button" disabled={busy || isUploading} onClick={logout} className="player-secondary">ออกจากบัญชี แล้วเล่นเป็น Guest</button><p>การออกจากบัญชียังคงเซฟและร่างความคิดเห็นในเครื่องไว้ ผู้ใช้เบราว์เซอร์นี้ยังเปิดข้อมูลเหล่านี้ได้</p></>}
        {remote && <div className="rounded-xl border border-amber-600 p-4 space-y-3">
          <p>เซฟในเครื่องกับคลาวด์ต่างกัน เซฟที่เลือกจะใช้เล่นต่อและแทนที่เซฟอีกฝั่ง สำรองทั้งสองชีวิตได้ก่อนเลือก</p>
          <p>คลาวด์บันทึกล่าสุด {remote.updatedAt ? new Date(remote.updatedAt).toLocaleString('th-TH') : 'ไม่ทราบเวลา'}</p>
          <button type="button" disabled={busy} className="player-secondary" onClick={backupCloud}>ดาวน์โหลดเซฟสำรองบนคลาวด์</button>
          <button type="button" disabled={busy} className="player-primary" onClick={() => chooseSave(true)}>ใช้เซฟบนคลาวด์</button>
          <button type="button" disabled={busy} className="player-secondary" onClick={() => chooseSave(false)}>ใช้เซฟในเครื่อง</button>
        </div>}
      </div>
    </PlayerModal>}
    {panel === 'feedback' && <PlayerModal title="ส่งความคิดเห็น" onClose={() => setPanel(null)}>
      <form className="space-y-4 text-sm" onSubmit={event => {event.preventDefault(); void sendFeedback();}}>
        <label className="block">ประเภท<select value={category} onChange={event => setCategory(event.target.value)} className="player-input"><option value="bug">พบปัญหา</option><option value="idea">ข้อเสนอแนะ</option><option value="other">อื่น ๆ</option></select></label>
        <label className="block">รายละเอียด<textarea required minLength={5} maxLength={4000} rows={5} value={feedback} onChange={event => setFeedback(event.target.value)} className="player-input" /></label>
        <label className="block"><input type="checkbox" checked={diagnosticsAllowed} onChange={event => setDiagnosticsAllowed(event.target.checked)} /> แนบวัน สถานที่ และข้อมูลเบราว์เซอร์เพื่อช่วยตรวจปัญหา</label>
        <label className="block"><input type="checkbox" checked={attachSave} disabled={!snapshot} onChange={event => setAttachSave(event.target.checked)} /> แนบเซฟชีวิตนี้ให้ผู้พัฒนาตรวจ รวมชื่อผู้เล่นและประวัติชีวิตในไฟล์เซฟ</label>
        <p>ความคิดเห็นส่งให้ผู้พัฒนาและไม่แสดงต่อผู้เล่นอื่น</p>
        {!backend && <p>ยังเชื่อมต่อบริการไม่ได้ เล่นผ่านเว็บเกมที่เชื่อมต่ออินเทอร์เน็ตเพื่อส่งความคิดเห็น ร่างข้อความจะเก็บในเครื่องเมื่อเบราว์เซอร์อนุญาต</p>}
        <button type="submit" disabled={!backend || !user || busy} className="player-primary">{busy ? 'กำลังส่ง' : 'ส่งความคิดเห็น'}</button>
        <p role="status">{message}</p>
      </form>
    </PlayerModal>}
  </>;
}
