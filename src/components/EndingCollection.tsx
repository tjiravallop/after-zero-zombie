import PlayerModal from './PlayerModal';
import {useEffect, useState} from 'react';
import {getPlayerBackend, readEndingStatistics} from '../services/playerBackend';
import {endingCollection, type EndingDefinition} from '../data/endingCollection';

export default function EndingCollection({catalog, lives, currentEndingId, onClose}: {
  catalog: Record<string, EndingDefinition>;
  lives: {endingId?: string; runId?: string}[];
  currentEndingId?: string;
  onClose: () => void;
}) {
  const entries = endingCollection(catalog, lives, currentEndingId ? {endingId: currentEndingId} : undefined);
  const count = entries.filter(entry => entry.unlocked).length;
  const earnedIds = entries.filter(entry => entry.unlocked).map(entry => entry.id).join('|');
  const [totals, setTotals] = useState<Record<string, number>>({});
  useEffect(() => {
    let alive = true;
    void getPlayerBackend().then(async backend => {
      if (!backend?.auth.currentUser || !earnedIds) return;
      await Promise.all(earnedIds.split('|').map(async id => {
        const total = await readEndingStatistics(backend, id);
        if (alive && total) setTotals(previous => ({...previous, [id]: total.players}));
      }));
    }).catch(() => { /* The personal collection remains available offline. */ });
    return () => {alive = false;};
  }, [earnedIds]);
  return <PlayerModal title="บทจบที่ค้นพบ" onClose={onClose}>
    <p className="mb-2 text-slate-200">ค้นพบแล้ว {count}/{entries.length} บทจบ · ยังรอค้นพบ {entries.length - count}</p>
    <p className="mb-5 text-sm text-slate-400">บันทึกจากชีวิตที่เล่นจบในเครื่องนี้ รวมอยู่ในไฟล์สำรองเซฟของเจ้า</p>
    <div className="grid gap-3 sm:grid-cols-2" data-ending-collection>
      {entries.map((entry, index) => <article key={index} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
        {entry.unlocked ? <><h3 className="font-bold text-lime-200">{entry.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{entry.text}</p>
          {totals[entry.id] !== undefined && <p className="mt-2 text-xs text-lime-300">ผู้เล่นที่พบแล้ว {totals[entry.id].toLocaleString()} คน</p>}</>
          : <><h3 className="font-bold text-slate-400">???</h3><p className="mt-2 text-sm text-slate-500">ยังไม่ค้นพบ</p></>}
      </article>)}
    </div>
  </PlayerModal>;
}
