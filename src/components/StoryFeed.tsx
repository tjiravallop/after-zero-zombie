import { useId, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { formatTimelineDate } from '../data/pastLifeEchoes';

export type StoryMoment = {
  runId: string;
  day: number;
  place: string;
  title: string;
  choice?: string;
  endingOutcomeId?: string;
  text: string;
  effects: string[];
  logKeys: string[];
};

type LifeLogEntry = { id?: number; day?: number; text?: string; kind?: string } | string;

export function storyLogKey(entry: LifeLogEntry): string {
  return typeof entry === 'string' ? entry : `${entry.id}:${entry.day}:${entry.text}`;
}

export function storyText(text: string): string {
  return text
    .replace(/^\[(?:ภัยพื้นที่|บันทึกการกลายพันธุ์)[^\]]*\]\s*/, '')
    .replace(/\s*\([^)]*(?:[+−-]\d|\d+\/\d+)[^)]*\)/g, '')
    .split(/\s*·\s*/)
    .filter(part => !/^[^.!?…]{0,45}\s[+−-]\s*\d/.test(part))
    .join(' · ')
    .trim();
}

export function buildStoryHistory(log: LifeLogEntry[], excludedKeys: string[] = [], limit = 12) {
  const history: Array<{ key: string; day: number; title: string; choice?: string; text: string }> = [];
  for (let i = 0; i < log.length; i++) {
    const entry = log[i];
    if (excludedKeys.includes(storyLogKey(entry))) continue;
    const raw = typeof entry === 'string' ? entry : entry.text || '';
    const text = storyText(raw);
    if (!text) continue;
    const day = typeof entry === 'string' ? 1 : entry.day || 1;
    const previous = log[i + 1];
    const decision = previous && typeof previous !== 'string' && previous.kind === 'story'
      && previous.day === day && !excludedKeys.includes(storyLogKey(previous))
      ? previous.text?.split(' — ') : undefined;
    // The engine writes the outcome immediately above its corresponding choice.
    if (decision?.length === 2 && typeof entry !== 'string' && entry.kind === 'story' && !raw.includes(' — ')) {
      history.push({ key: storyLogKey(entry), day, title: decision[0], choice: storyText(decision[1]), text });
      i++;
    } else {
      const [title, choice] = text.split(' — ');
      history.push({ key: storyLogKey(entry), day, title: choice ? title : '', choice, text: choice ? '' : text });
    }
    if (history.length === limit) break;
  }
  return history;
}

export default function StoryFeed({ log, latest, formatEffect, onHistory, fullHistory = false }: {
  log: LifeLogEntry[];
  latest: StoryMoment | null;
  formatEffect: (effect: string) => string;
  onHistory: () => void;
  fullHistory?: boolean;
}) {
  const headingId = useId();
  const [historyOpen, setHistoryOpen] = useState(() => fullHistory || window.matchMedia('(min-width: 1024px)').matches);
  const history = buildStoryHistory(log, latest?.logKeys, fullHistory ? 70 : 12);
  const current = latest || history[0];
  const older = latest ? history : history.slice(1);
  const effects = latest ? [...new Set(latest.effects.map(formatEffect).filter(Boolean))] : [];

  return (
    <section className="story-feed" aria-labelledby={headingId}>
      <header className="story-feed-heading">
        <h2 id={headingId}><BookOpen size={17} aria-hidden="true" /> {fullHistory ? 'บันทึกเรื่องราว' : 'เรื่องราวล่าสุด'}</h2>
        {!fullHistory && <button type="button" onClick={onHistory}>ดูทั้งหมด <span aria-hidden="true">›</span></button>}
      </header>
      <div className="story-feed-latest" role={fullHistory ? undefined : 'status'} aria-live={fullHistory ? undefined : 'polite'} aria-atomic="true">
        {current ? (
          <article>
            <p className="story-feed-date">{formatTimelineDate(current.day)}{latest?.place && ` · ${latest.place}`}</p>
            {current.title && <h3>{current.title}</h3>}
            {current.choice && (current.text ? <details className="story-feed-decision">
              <summary>สิ่งที่เจ้าเลือก</summary>
              <p className="story-feed-choice">{current.choice}</p>
            </details> : <p className="story-feed-choice">เจ้าเลือก: {current.choice}</p>)}
            {current.text && <p className="story-feed-prose">{storyText(current.text)}</p>}
            {effects.length > 0 && <ul className="story-feed-effects" aria-label="ผลของการตัดสินใจ">
              {effects.map(effect => <li key={effect}>{effect}</li>)}
            </ul>}
          </article>
        ) : <p className="story-feed-empty">เจ้าลืมตาขึ้นในเมืองที่เปลี่ยนไป การตัดสินใจต่อจากนี้จะกลายเป็นเรื่องราวของเจ้า</p>}
      </div>
      {older.length > 0 && <details className="story-feed-history" open={historyOpen} onToggle={event => setHistoryOpen(event.currentTarget.open)}>
        <summary>ก่อนหน้านี้ <span aria-hidden="true">⌄</span></summary>
        <div className="story-feed-older">
          {older.map(entry => <article key={entry.key}>
            <p className="story-feed-date">{formatTimelineDate(entry.day)}</p>
            {entry.title && <h3>{entry.title}</h3>}
            {entry.choice && <p className="story-feed-choice">เจ้าเลือก: {entry.choice}</p>}
            {entry.text && <p className="story-feed-prose">{entry.text}</p>}
          </article>)}
        </div>
      </details>}
    </section>
  );
}
