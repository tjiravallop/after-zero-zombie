import {useEffect, useRef, type ReactNode} from 'react';

export default function PlayerModal({title, onClose, children}: {title: string; onClose: () => void; children: ReactNode}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => previous?.focus();
  }, []);
  return <dialog ref={ref} className="player-modal" aria-label={title}
    onCancel={event => {event.preventDefault(); onClose();}}>
    <div className="flex items-center justify-between gap-4 mb-5">
      <h2 className="text-lg font-bold text-lime-200">{title}</h2>
      <button autoFocus type="button" onClick={onClose} className="rounded-lg border border-slate-600 px-3 py-2 text-sm">ปิด</button>
    </div>
    {children}
  </dialog>;
}
