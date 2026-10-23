// Room add-ons: festival decorations, desk details, the cat, focus-mode overlay.
import { useEffect, useRef, useState } from 'react';
import { FESTIVAL_INFO, type DeskState, type Festival } from '../services/world';
import { balloonsURL, bowlURL, buntingURL, catBookURL, catURL, coffeeURL, dustURL, FESTIVAL_COLORS, garlandURL, lanternURL, notesURL, wreathURL, type CatPose } from '../sprites/world';
import { ROOM_H, ROOM_W, FLOOR_Y } from '../services/life';
import { clamp } from '../lib/util';

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

// ───────── festival decorations ─────────
export function FestivalDecor({ festivals, label }: { festivals: Festival[]; label?: string }) {
  if (!festivals.length) return null;
  const f = festivals[0];
  const colors = FESTIVAL_COLORS[f];
  const img = (src: string, x: number, y: number, w: number, z = 7, cls = '') => <img className={'deco px ' + cls} src={src} alt="" style={{ left: pct(x, ROOM_W), top: pct(y, ROOM_H), width: pct(w, ROOM_W), zIndex: z }} />;
  return (
    <>
      {f === 'christmas' ? img(garlandURL(), 0, 0, ROOM_W) : img(buntingURL(colors), 0, 0, ROOM_W)}
      {f === 'christmas' && img(wreathURL(), 160, 30, 20)}
      {f === 'lunarNewYear' && <>{img(lanternURL('red'), 150, 0, 14, 8, 'swing')}{img(lanternURL('red'), 172, 2, 14, 8, 'swing')}</>}
      {f === 'midAutumn' && <>{img(lanternURL('rabbit'), 150, 4, 14, 8, 'swing')}{img(lanternURL('rabbit'), 172, 2, 14, 8, 'swing')}</>}
      {(f === 'birthday99' || f === 'birthdayChen' || f === 'reunion' || f === 'anniversary' || f === 'valentine') && <>{img(balloonsURL(colors), 2, 78, 22, 8, 'bob')}{img(balloonsURL([...colors].reverse()), 168, 82, 22, 8, 'bob')}</>}
      {f === 'newyear' && <div className="confetti" />}
      <div className="festival-banner" data-testid="festival-banner" style={{ background: colors[0] }}>{FESTIVAL_INFO[f].emoji} {label ?? FESTIVAL_INFO[f].banner}</div>
    </>
  );
}

// ───────── the desk remembers ─────────
export function DeskDetails({ desk, state }: { desk: { x: number; y: number; w: number; h: number; flip?: boolean }; state: DeskState }) {
  const top = desk.y - desk.h;
  const left = desk.x - desk.w / 2;
  const z = Math.round(desk.y * 10) + 2;
  return (
    <>
      {state.dust > 0 && <img className="deco px" src={dustURL(state.dust, desk.w)} alt="" data-testid="desk-dust" title={`${state.daysAway} 天沒讀書，書桌積了一點灰`} style={{ left: pct(left + 1, ROOM_W), top: pct(top - 4, ROOM_H), width: pct(desk.w, ROOM_W), zIndex: z, transform: 'none' }} />}
      {state.notes && <img className="deco px" src={notesURL()} alt="" data-testid="desk-notes" style={{ left: pct(left + desk.w - 16, ROOM_W), top: pct(top - 7, ROOM_H), width: pct(12, ROOM_W), zIndex: z, transform: 'none' }} />}
      {state.coffee && <><img className="deco px" src={coffeeURL()} alt="" data-testid="desk-coffee" style={{ left: pct(left + 18, ROOM_W), top: pct(top - 8, ROOM_H), width: pct(9, ROOM_W), zIndex: z, transform: 'none' }} /><span className="steam" style={{ left: pct(left + 20, ROOM_W), top: pct(top - 15, ROOM_H), zIndex: z }}>~</span></>}
    </>
  );
}

// ───────── the cat ─────────
export interface CatState { x: number; y: number; pose: CatPose; flip: boolean; dur: number; sleeping: boolean; blink: boolean }
export function useCatBrain(room: string, reduce: boolean) {
  const [cat, setCat] = useState<CatState>(() => ({ x: 150, y: 214, pose: 'sit', flip: true, dur: 0, sleeping: false, blink: false }));
  const busy = useRef(0);
  const walkTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const ref = useRef(cat); ref.current = cat;

  const walkTo = (x: number, y: number) => new Promise<void>((res) => {
    const c = ref.current, tx = clamp(x, 14, ROOM_W - 14), ty = clamp(y, FLOOR_Y + 22, ROOM_H - 4);
    const dist = Math.hypot(tx - c.x, ty - c.y), dur = reduce ? 0 : Math.min(4, dist / 32);
    let f = 0;
    if (walkTimer.current) clearInterval(walkTimer.current);
    setCat((k) => ({ ...k, x: tx, y: ty, dur, pose: 'walk1', flip: tx < k.x, sleeping: false }));
    walkTimer.current = setInterval(() => { f++; setCat((k) => ({ ...k, pose: f % 2 ? 'walk2' : 'walk1' })); }, 180);
    setTimeout(() => { if (walkTimer.current) clearInterval(walkTimer.current); setCat((k) => ({ ...k, pose: 'sit', dur: 0 })); res(); }, dur * 1000 + 40);
  });

  useEffect(() => {
    setCat((k) => ({ ...k, x: 150, y: 214, pose: 'sit', dur: 0, sleeping: false }));
    let sleepLeft = 0;
    const t = setInterval(() => {
      if (Date.now() < busy.current) return;
      if (sleepLeft > 0) { sleepLeft--; if (sleepLeft === 0) setCat((k) => ({ ...k, pose: 'sit', sleeping: false })); return; }
      const r = Math.random();
      if (r < 0.42) walkTo(16 + Math.random() * (ROOM_W - 32), FLOOR_Y + 26 + Math.random() * (ROOM_H - FLOOR_Y - 32));
      else if (r < 0.62) { setCat((k) => ({ ...k, blink: true })); setTimeout(() => setCat((k) => ({ ...k, blink: false })), 300); }
      else if (r < 0.8) { sleepLeft = 3 + Math.floor(Math.random() * 4); setCat((k) => ({ ...k, pose: 'sleep', sleeping: true })); }
      else setCat((k) => ({ ...k, flip: !k.flip }));
    }, 3600);
    return () => { clearInterval(t); if (walkTimer.current) clearInterval(walkTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  return {
    cat,
    hold(ms: number) { busy.current = Date.now() + ms; },
    async happy() { busy.current = Date.now() + 2500; setCat((k) => ({ ...k, pose: 'happy', sleeping: false })); setTimeout(() => setCat((k) => ({ ...k, pose: 'sit' })), 1800); },
    async eat(x: number, y: number) {
      busy.current = Date.now() + 9000;
      await walkTo(x, y);
      setCat((k) => ({ ...k, pose: 'eat', flip: false }));
      await new Promise((r) => setTimeout(r, 2600));
      setCat((k) => ({ ...k, pose: 'happy' }));
      await new Promise((r) => setTimeout(r, 1200));
      setCat((k) => ({ ...k, pose: 'sit' }));
    },
    walkTo,
  };
}
export function CatSprite({ cat, bookColor, onTap, bowl, inert }: { cat: CatState; bookColor?: string; onTap: () => void; bowl?: { x: number; y: number; full: boolean } | null; inert?: boolean }) {
  const z = Math.round(cat.y * 10) + 3;
  return (
    <>
      {bowl && <img className="obj px" src={bowlURL(bowl.full)} alt="" style={{ left: pct(bowl.x, ROOM_W), top: pct(bowl.y, ROOM_H), width: pct(12, ROOM_W), zIndex: Math.round(bowl.y * 10) }} />}
      {cat.sleeping && bookColor && <img className="obj px" src={catBookURL(bookColor)} alt="" style={{ left: pct(cat.x, ROOM_W), top: pct(cat.y + 3, ROOM_H), width: pct(22, ROOM_W), zIndex: z - 1, transitionProperty: 'none' }} />}
      <div className="pet" data-testid="pet-cat" data-pose={cat.pose} onClick={(e) => { e.stopPropagation(); onTap(); }}
        style={{ left: pct(cat.x, ROOM_W), top: pct(cat.y - (cat.sleeping && bookColor ? 3 : 0), ROOM_H), width: pct(24, ROOM_W), zIndex: z, transitionDuration: `${cat.dur}s`, pointerEvents: inert ? 'none' : undefined }}>
        <img src={catURL(cat.pose, cat.blink)} alt="黑白貓" style={{ transform: cat.flip ? 'scaleX(-1)' : undefined }} />
      </div>
      {cat.sleeping && <div className="zzz small-zzz" style={{ left: pct(cat.x + 8, ROOM_W), top: pct(cat.y - 18, ROOM_H), zIndex: 4000 }}>z</div>}
    </>
  );
}

// ───────── focus mode ─────────
export function FocusOverlay({ startedAt, target, bookTitle, onEnd }: { startedAt: number; target: number; bookTitle: string; onEnd: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const sec = Math.max(0, Math.floor((now - startedAt) / 1000));
  const mm = String(Math.floor(sec / 60)).padStart(2, '0'), ss = String(sec % 60).padStart(2, '0');
  const done = target > 0 && sec >= target * 60;
  const ang = (sec % 60) * 6, mang = ((sec / 60) % 60) * 6;
  return (
    <div className="focus-veil" data-testid="focus-overlay">
      <div className="focus-panel" onClick={(e) => e.stopPropagation()}>
        <svg viewBox="0 0 40 40" width="54" height="54" aria-hidden="true" className="focus-clock">
          <circle cx="20" cy="20" r="17" fill="#fffaf1" stroke="#3a2a20" strokeWidth="3" />
          {[0, 90, 180, 270].map((a) => <rect key={a} x="19" y="5" width="2" height="3" fill="#3a2a20" transform={`rotate(${a} 20 20)`} />)}
          <line x1="20" y1="20" x2="20" y2="10" stroke="#3a2a20" strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${mang} 20 20)`} />
          <line x1="20" y1="20" x2="20" y2="7" stroke="#c98d86" strokeWidth="1.4" strokeLinecap="round" transform={`rotate(${ang} 20 20)`} style={{ transition: 'transform 0.9s linear' }} />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📖 專注閱讀《{bookTitle}》</div>
          <b className="focus-time" data-testid="focus-time">{mm}:{ss}</b>
          <div className="muted small">{target > 0 ? (done ? '🎉 時間到了！可以結束，或繼續讀' : `目標 ${target} 分鐘`) : '不限時'}</div>
        </div>
        <button className="btn small primary" onClick={onEnd} data-testid="focus-end">結束</button>
      </div>
    </div>
  );
}
