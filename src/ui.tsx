import { useEffect, useRef, useState, type ReactNode } from 'react';
import { iconURL } from './sprites/furniture';
import { sprite } from './sprites/pixel';
import { toast } from './lib/bus';
import { CATEGORY_COLORS } from './data/catalog';
import type { Book } from './db/types';
import { photoURL, savePhoto } from './services/journal';
import { GameError } from './services/wallet';

export function Icon({ name, size = 20, alt = '' }: { name: string; size?: number; alt?: string }) {
  return <img className="px" src={iconURL(name)} width={size} height={size} alt={alt} />;
}
export function Px({ src, w, scale = 1, alt = '', style, className }: { src: string; w: number; scale?: number; alt?: string; style?: Record<string, any>; className?: string }) {
  return <img className={'px ' + (className ?? '')} src={src} style={{ width: (w + 2) * scale, ...style }} alt={alt} />;
}

// 3×5 pixel font for short Latin labels ("MY ROOM", numbers)
const FONT: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011',
  H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101',
  O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111',
  V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111', ' ': '000000000000000',
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001', '5': '111100111001111',
  '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111', '&': '010101010101011', '!': '010010010000010', '.': '000000000000010', '♥': '101111111111010',
};
export function PixelText({ text, color = '#3a2a20', scale = 3, shadow = '#e8b8b2' }: { text: string; color?: string; scale?: number; shadow?: string }) {
  const chars = [...text.toUpperCase()];
  const w = chars.length * 4;
  const url = sprite(`ptext|${text}|${color}|${shadow}`, w, 6, (p) => {
    chars.forEach((ch, i) => {
      const m = FONT[ch] ?? FONT[' '];
      for (let k = 0; k < 15; k++) if (m[k] === '1') { if (shadow) p.p(i * 4 + (k % 3) + 1, Math.floor(k / 3) + 1, shadow); }
      for (let k = 0; k < 15; k++) if (m[k] === '1') p.p(i * 4 + (k % 3), Math.floor(k / 3), ch === '♥' ? '#d9475a' : color);
    });
  }, { outline: false, margin: 0 });
  return <img className="px" src={url} alt={text} style={{ height: 6 * scale, width: w * scale }} />;
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true">
      <div className="sheet">
        <div className="grab" />
        {title ? <div className="row between"><h3>{title}</h3><button className="btn ghost small" onClick={onClose} aria-label="關閉">✕</button></div> : null}
        {children}
      </div>
    </div>
  );
}

// in-app confirm dialog (no window.confirm)
let confirmImpl: ((msg: string, opts?: { ok?: string; danger?: boolean }) => Promise<boolean>) | null = null;
export function confirmDialog(msg: string, opts?: { ok?: string; danger?: boolean }) { return confirmImpl ? confirmImpl(msg, opts) : Promise.resolve(false); }
export function ConfirmHost() {
  const [state, setState] = useState<{ msg: string; ok?: string; danger?: boolean; resolve: (v: boolean) => void } | null>(null);
  useEffect(() => { confirmImpl = (msg, opts) => new Promise((resolve) => setState({ msg, ...opts, resolve })); return () => { confirmImpl = null; }; }, []);
  if (!state) return null;
  const done = (v: boolean) => { state.resolve(v); setState(null); };
  return (
    <Sheet open onClose={() => done(false)}>
      <p style={{ fontWeight: 700, margin: '4px 0 16px', whiteSpace: 'pre-wrap' }}>{state.msg}</p>
      <div className="grid2">
        <button className="btn" onClick={() => done(false)}>取消</button>
        <button className={'btn ' + (state.danger ? 'danger' : 'primary')} onClick={() => done(true)} data-testid="confirm-ok">{state.ok ?? '確定'}</button>
      </div>
    </Sheet>
  );
}

/** Wraps an async action: blocks double taps while running and shows errors as toasts. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function run<T>(fn: () => Promise<T>, success?: string | ((r: T) => string | undefined)): Promise<T | undefined> {
    if (lock.current) return undefined;
    lock.current = true; setBusy(true);
    try {
      const r = await fn();
      const msg = typeof success === 'function' ? success(r) : success;
      if (msg) toast(msg, 'success');
      return r;
    } catch (e) {
      toast(e instanceof GameError ? e.message : `發生錯誤：${(e as Error)?.message ?? e}`, 'error');
      if (!(e instanceof GameError)) console.error(e);
      return undefined;
    } finally { lock.current = false; setBusy(false); }
  }
  return { busy, run };
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: [T, string][] }) {
  return <div className="tabs" role="tablist">{items.map(([k, l]) => <button key={k} role="tab" aria-selected={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{l}</button>)}</div>;
}
export function Progress({ value, pink }: { value: number; pink?: boolean }) {
  return <div className={'progress' + (pink ? ' pink' : '')} role="progressbar" aria-valuenow={Math.round(value * 100)}><i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} /></div>;
}
export function Empty({ icon = 'star', children }: { icon?: string; children: ReactNode }) {
  return <div className="empty"><Icon name={icon} size={40} /><div>{children}</div></div>;
}
export function Coins({ n }: { n: number }) {
  return <span className="row" style={{ gap: 4, display: 'inline-flex' }}><Icon name="coin" size={16} /><b>{n}</b></span>;
}

export function usePhoto(id?: string) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { let alive = true; if (id) photoURL(id).then((u) => alive && setUrl(u)); else setUrl(null); return () => { alive = false; }; }, [id]);
  return url;
}
export function PhotoThumb({ id, size = 72, onRemove }: { id: string; size?: number; onRemove?: () => void }) {
  const url = usePhoto(id);
  return (
    <div style={{ position: 'relative', width: size, height: size, border: '2px solid var(--ink)', borderRadius: 6, overflow: 'hidden', background: 'var(--cream-2)', flexShrink: 0 }}>
      {url && <img src={url} alt="照片" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      {onRemove && <button onClick={onRemove} aria-label="移除照片" style={{ position: 'absolute', top: 2, right: 2, border: '2px solid var(--ink)', borderRadius: 4, background: '#fff', width: 26, height: 26, cursor: 'pointer', fontWeight: 900 }}>✕</button>}
    </div>
  );
}
export function PhotoPicker({ ids, onChange, max = 6 }: { ids: string[]; onChange: (ids: string[]) => void; max?: number }) {
  const { busy, run } = useAction();
  return (
    <div className="row wrap">
      {ids.map((id) => <PhotoThumb key={id} id={id} onRemove={() => onChange(ids.filter((x) => x !== id))} />)}
      {ids.length < max && (
        <label className="btn small" style={{ cursor: 'pointer' }}>
          {busy ? '儲存中…' : '＋ 照片'}
          <input type="file" accept="image/*" multiple hidden onChange={(e) => {
            const files = [...(e.target.files ?? [])].slice(0, max - ids.length);
            e.target.value = '';
            run(async () => { const added: string[] = []; for (const f of files) added.push(await savePhoto(f)); onChange([...ids, ...added]); });
          }} />
        </label>
      )}
    </div>
  );
}

export function BookCover({ book, large }: { book: Pick<Book, 'title' | 'category' | 'coverPhotoId'>; large?: boolean }) {
  const url = usePhoto(book.coverPhotoId);
  return (
    <div className={'book-cover' + (large ? ' lg' : '')} style={{ background: url ? `url(${url}) center/cover` : CATEGORY_COLORS[book.category] ?? '#9a8f86' }}>
      {!url && book.title.slice(0, large ? 12 : 6)}
    </div>
  );
}

export const MOODS: [string, string, string][] = [
  ['happy', '😊', '開心'], ['calm', '🍵', '平靜'], ['moved', '🥹', '感動'], ['excited', '✨', '興奮'], ['thinking', '🤔', '思考'], ['love', '💗', '心動'], ['tired', '😪', '疲倦'], ['sad', '🌧️', '難過'],
];
export const moodLabel = (m?: string) => { const x = MOODS.find((k) => k[0] === m); return x ? `${x[1]} ${x[2]}` : ''; };
export function MoodPicker({ value, onChange }: { value?: string; onChange: (v: any) => void }) {
  return <div className="chips">{MOODS.map(([k, e, l]) => <button type="button" key={k} className={'chip' + (value === k ? ' on' : '')} onClick={() => onChange(value === k ? undefined : k)}>{e} {l}</button>)}</div>;
}
export function TagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join(' '));
  useEffect(() => { if (text.split(/\s+/).filter(Boolean).join(' ') !== value.join(' ')) setText(value.join(' ')); }, [value.join(' ')]);
  return <input className="input" placeholder="用空格分隔，例如：療癒 散文" value={text} onChange={(e) => { setText(e.target.value); onChange(e.target.value.split(/\s+/).filter(Boolean)); }} />;
}
