import { useEffect, useRef, useState, type PointerEvent as RPE } from 'react';
import { db } from '../db/idb';
import { useDayPart, useLive } from '../hooks';
import { navigate } from '../router';
import { useEquip } from '../state';
import { BALCONY_SLOTS, FURN_CAT_LABEL, furnById, plantById, type ActFx } from '../data/catalog';
import { furniturePos, HEALTH_LABEL, movePlant, placeFurniture, plantStatus, refreshPlants, storeFurniture, toggleFlip, waterPlant } from '../services/life';
import { getVisit } from '../services/love';
import { FX_CHARS, performAct } from '../components/act';
import { opaqueAt, solidObjBelow } from '../lib/hit';
import { pick } from '../lib/util';
import { sfx } from '../lib/sound';
import { characterURL, type Pose } from '../sprites/characters';
import { furnitureURL, plantURL } from '../sprites/furniture';
import { sprite } from '../sprites/pixel';
import { Empty, Icon, Progress, Sheet, useAction } from '../ui';
import { toast } from '../lib/bus';
import { DAYPART_LABEL, sleep, type DayPart } from '../lib/util';
import type { OwnedFurniture, OwnedPlant } from '../db/types';

const W = 192, H = 168;
const SLOTS = [{ x: 30, y: 112 }, { x: 62, y: 112 }, { x: 94, y: 112 }, { x: 128, y: 150 }, { x: 160, y: 150 }, { x: 22, y: 160 }];
const SKY: Record<DayPart, [string, string]> = { dawn: ['#f7c6b3', '#c9d7ea'], day: ['#8fcbea', '#d8eef7'], dusk: ['#f39b65', '#f6d29a'], night: ['#26354d', '#3a4d6e'], midnight: ['#141c2b', '#1f2a40'] };

function bg(part: DayPart) {
  return sprite(`balcony|${part}`, W, H, (p) => {
    const [a, b] = SKY[part];
    p.r(0, 0, W, 70, a); p.r(0, 40, W, 30, b);
    if (part === 'night' || part === 'midnight') { for (const [x, y] of [[20, 10], [60, 22], [110, 8], [150, 26], [178, 12], [90, 30]]) p.p(x, y, '#fff6c8'); p.r(160, 8, 6, 6, '#fff1b8'); }
    else if (part === 'day') { p.r(26, 12, 14, 4, '#fff'); p.r(30, 9, 7, 3, '#fff'); p.r(150, 10, 9, 9, '#fff1b8'); }
    else if (part === 'dusk') p.r(120, 44, 18, 9, '#ffcf7a');
    for (let x = 0; x < W; x += 16) p.r(x, 50 - (x % 32 ? 6 : 14), 14, 30, '#9aa7b8');
    p.r(0, 66, W, 4, '#7d8b9c');
    p.r(0, 70, W, H - 70, '#d9c7aa');
    for (let y = 70; y < H; y += 12) { p.r(0, y, W, 1, '#c3ad8c'); for (let x = (y / 12) % 2 ? 0 : 12; x < W; x += 24) p.r(x, y, 1, 12, '#c3ad8c'); }
    // railing
    p.r(0, 78, W, 4, '#f3e7d2'); p.r(0, 78, W, 1, '#fff');
    for (let x = 4; x < W; x += 10) p.r(x, 82, 3, 18, '#f3e7d2');
    p.r(0, 100, W, 3, '#e2d3b8');
    // plant shelf for back row
    p.r(14, 112, 98, 4, '#b07d52'); p.r(16, 116, 3, 12, '#7a5235'); p.r(106, 116, 3, 12, '#7a5235');
  }, { outline: false, margin: 0 });
}
const TINT: Record<DayPart, string> = { dawn: 'rgba(255,205,180,0.18)', day: 'rgba(0,0,0,0)', dusk: 'rgba(255,160,90,0.2)', night: 'rgba(60,80,150,0.38)', midnight: 'rgba(30,35,80,0.5)' };
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export default function BalconyPage() {
  const { part, now } = useDayPart();
  const equip = useEquip('99');
  const plants = useLive(() => db.all('ownedPlants'), [], []) ?? [];
  const [sel, setSel] = useState<OwnedPlant | null>(null);
  const [emptySlot, setEmptySlot] = useState<number | null>(null);
  const [me, setMe] = useState<{ x: number; pose: Pose; flip: boolean }>({ x: 150, pose: 'stand', flip: false });
  const [drops, setDrops] = useState<{ id: number; x: number; y: number } | null>(null);
  const { run, busy } = useAction();
  useEffect(() => { refreshPlants(); }, []);

  // ───────── 陽台裝飾 ─────────
  const furniture = useLive(() => db.all('ownedFurniture'), [], []) ?? [];
  const visit = useLive(getVisit, [], { active: false });
  const decor = furniture.filter((f) => f.roomId === 'balcony');
  const storedFurn = furniture.filter((f) => !f.roomId);
  const [arrange, setArrange] = useState(false);
  const [placing, setPlacing] = useState<{ id: string; name: string } | null>(null);
  const [decorBox, setDecorBox] = useState(false);
  const [selDecor, setSelDecor] = useState<OwnedFurniture | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const dragStart = useRef<{ id: string; px: number; py: number; ox: number; oy: number; moved: boolean; pointerId: number } | null>(null);
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [wiggling, setWiggling] = useState<Record<string, boolean>>({});
  const [fx, setFx] = useState<{ id: number; x: number; y: number; ch: string }[]>([]);
  const [bubble, setBubble] = useState<{ id: number; text: string; who: '99' | 'chen' } | null>(null);
  const [note, setNote] = useState<{ title: string; text: string } | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((v) => v + 1), 650); return () => clearInterval(t); }, []);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const coords = (e: { clientX: number; clientY: number }) => { const r = sceneRef.current!.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
  const fxBurst = (kind: ActFx, x: number, y: number) => {
    const chars = FX_CHARS[kind];
    const items = Array.from({ length: 4 }, (_, i) => ({ id: Math.random(), x: x + (i - 1.5) * 6, y: y - 3 * i, ch: chars[i % chars.length] }));
    setFx((h) => [...h, ...items]); setTimeout(() => setFx((h) => h.filter((x) => !items.includes(x))), 1700);
  };
  const say = (who: '99' | 'chen', text: string, ms = 2300) => { const id = Math.random(); setBubble({ id, text, who }); setTimeout(() => setBubble((b) => (b?.id === id ? null : b)), ms); };
  const busyRef = useRef(false);
  async function useDecor(f: OwnedFurniture) {
    const d = furnById.get(f.defId); if (!d) return;
    if (!d.act) { say('99', pick(['好可愛～', '放在陽台剛剛好'])); return; }
    if (busyRef.current) return; busyRef.current = true;
    try {
      if (!d.act.toggle) { setMe({ x: f.x + (me.x < f.x ? -16 : 16), pose: 'walk1', flip: f.x < me.x }); await sleep(500); setMe((m) => ({ ...m, pose: d.act!.pose === 'water' ? 'water' : 'stand' })); }
      await performAct(f, { x: f.x, y: f.y - d.h - 4 }, {
        visiting: !!visit?.active, say, fx: fxBurst, flash: () => undefined,
        wiggle: (id) => { setWiggling((w) => ({ ...w, [id]: true })); setTimeout(() => setWiggling((w) => ({ ...w, [id]: false })), 700); },
        showNote: (title, text) => setNote({ title, text }),
        isOn: (id) => !!toggled[id], setOn: (id, on) => setToggled((t) => ({ ...t, [id]: on })),
      });
      await sleep(d.act.ms ?? 900); setMe((m) => ({ ...m, pose: 'stand' }));
    } finally { busyRef.current = false; }
  }
  function onSceneClick(e: { clientX: number; clientY: number }) {
    if (!placing) return;
    const { x, y } = coords(e); const id = placing.id;
    setPlacing(null); run(() => placeFurniture(id, 'balcony', x, y), '擺好了');
  }
  function decorDown(e: RPE<HTMLElement>, f: OwnedFurniture) {
    if (!arrange || placing) return;
    if (!opaqueAt(e.currentTarget, e.clientX, e.clientY)) {
      const below = solidObjBelow(e.currentTarget, e.clientX, e.clientY); e.stopPropagation();
      if (below) below.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId, pointerType: e.pointerType, isPrimary: true }));
      return;
    }
    e.stopPropagation(); e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const p = coords(e); dragStart.current = { id: f.id, px: p.x, py: p.y, ox: f.x, oy: f.y, moved: false, pointerId: e.pointerId };
  }
  function decorMove(e: RPE<HTMLElement>) {
    const s0 = dragStart.current; if (!s0 || s0.pointerId !== e.pointerId) return;
    const p = coords(e), dx = p.x - s0.px, dy = p.y - s0.py;
    if (!s0.moved && Math.hypot(dx, dy) < 3) return;
    s0.moved = true;
    const f = furniture.find((o) => o.id === s0.id); if (!f) return;
    setDrag({ id: s0.id, ...furniturePos(furnById.get(f.defId)!, s0.ox + dx, s0.oy + dy, 'balcony') });
  }
  function decorUp(e: RPE<HTMLElement>) {
    const s0 = dragStart.current; if (!s0 || s0.pointerId !== e.pointerId) return;
    dragStart.current = null; e.stopPropagation();
    if (!s0.moved) { setDrag(null); const f = furniture.find((o) => o.id === s0.id); if (f) setSelDecor(f); return; }
    const d = drag && drag.id === s0.id ? drag : null; if (!d) return;
    placeFurniture(s0.id, 'balcony', d.x, d.y).finally(() => setTimeout(() => setDrag((c) => (c && c.id === s0.id ? null : c)), 120));
  }
  const placed = plants.filter((p) => p.slot != null);
  const stored = plants.filter((p) => p.slot == null);
  const cur = sel ? plants.find((p) => p.id === sel.id) ?? null : null;

  const water = (p: OwnedPlant) => run(async () => {
    const slot = SLOTS[p.slot ?? 0];
    setSel(null);
    setMe({ x: slot.x - 18, pose: 'walk1', flip: slot.x - 18 < me.x });
    await sleep(500);
    setMe({ x: slot.x - 18, pose: 'water', flip: false });
    const r = await waterPlant(p.id);
    if (r === 'tooSoon') { toast('土壤還很濕，一小時後再澆吧', 'info'); setMe((m) => ({ ...m, pose: 'stand' })); return; }
    sfx('water');
    setDrops({ id: Math.random(), x: slot.x, y: slot.y - 30 });
    await sleep(1100);
    setDrops(null);
    setMe((m) => ({ ...m, pose: 'stand' }));
    toast(`幫${plantById.get(p.defId)?.name}澆了水 💧`, 'success');
  });

  return (
    <div>
      <div className="scene-tabs">
        <button onClick={() => navigate('/room?scene=bedroom')}>🛏 臥室</button>
        <button onClick={() => navigate('/room?scene=study')}>📚 書房</button>
        <button onClick={() => navigate('/room?scene=kitchen')}>🍳 廚房</button>
        <button className="on">🌿 陽台</button>
      </div>
      <div className="scene-wrap">
        <div className={'scene balcony' + (arrange ? ' arrange' : '')} style={{ aspectRatio: `${W} / ${H}` }} data-testid="balcony" ref={sceneRef}
          onClick={onSceneClick} onPointerMove={decorMove} onPointerUp={decorUp} onPointerCancel={() => { dragStart.current = null; setDrag(null); }}>
          <img className="layer px" src={bg(part)} alt="" style={{ width: '100%', height: '100%' }} />
          {SLOTS.slice(0, BALCONY_SLOTS).map((s, i) => {
            const p = placed.find((x) => x.slot === i);
            if (!p) return <button key={i} className="slot empty" style={{ left: pct(s.x, W), top: pct(s.y, H), zIndex: s.y }} onClick={(e) => { e.stopPropagation(); if (placing) return onSceneClick(e); if (arrange) return; setEmptySlot(i); }} aria-label={`空位 ${i + 1}`} />;
            const def = plantById.get(p.defId)!;
            const st = plantStatus(p, def, now.getTime());
            return (
              <button key={p.id} className="slot" style={{ left: pct(s.x, W), top: pct(s.y, H), width: pct(26, W), zIndex: s.y }} onClick={(e) => { e.stopPropagation(); if (placing) return onSceneClick(e); setSel(p); }} aria-label={def.name} data-testid="plant">
                <img src={plantURL(def, st.stage, st.health !== 'healthy')} alt="" />
              </button>
            );
          })}
          {decor.map((f) => {
            const d = furnById.get(f.defId); if (!d) return null;
            const dragging = drag?.id === f.id;
            const fx0 = dragging ? drag.x : f.x, fy0 = dragging ? drag.y : f.y;
            const { url, w } = furnitureURL(d, { on: !!toggled[f.id], frame: tick % 2, now });
            return <img key={f.id} draggable={false} className={'obj px' + (f.flip ? ' flipped' : '') + (wiggling[f.id] ? ' wiggle' : '') + (arrange ? ' arranging' : '') + (dragging ? ' dragging' : '')}
              src={url} alt={d.name} data-testid={`decor-${d.id}`} style={{ left: pct(fx0, W), top: pct(fy0, H), width: pct(w + 2, W), zIndex: dragging ? 290 : Math.round(fy0) }}
              onPointerDown={(e) => decorDown(e, f)}
              onClick={(e) => { e.stopPropagation(); if (placing) return onSceneClick(e); if (arrange) return; useDecor(f); }} />;
          })}
          {decor.filter((f) => toggled[f.id] && ['string_lights', 'camp_lantern', 'neon_heart'].includes(f.defId)).map((f) => (
            <div key={'g' + f.id} className="glow" style={{ left: pct(f.x - 34, W), top: pct(f.y - (furnById.get(f.defId)?.h ?? 20) - 22, H), width: pct(68, W), height: pct((furnById.get(f.defId)?.h ?? 20) + 40, H), zIndex: 295 }} />
          ))}
          {fx.map((h) => <div key={h.id} className="hearts" style={{ left: pct(h.x, W), top: pct(h.y, H) }}>{h.ch}</div>)}
          {bubble && <div className="bubble" style={{ left: pct(Math.max(40, Math.min(W - 40, me.x)), W), top: pct(110, H) }}>{bubble.text}</div>}
          {arrange && !placing && <div className="place-hint">🛠 拖曳陽台小物移動 · 點一下可收納／翻轉 · <button className="btn small" style={{ minHeight: 24, padding: '0 6px' }} onClick={(e) => { e.stopPropagation(); setArrange(false); }}>完成</button></div>}
          {placing && <div className="place-hint">點選要放「{placing.name}」的位置 · <button className="btn small" style={{ minHeight: 24, padding: '0 6px' }} onClick={(e) => { e.stopPropagation(); setPlacing(null); }}>取消</button></div>}
          <div className="actor" style={{ left: pct(me.x, W), top: pct(162, H), width: pct(34, W), zIndex: 170, transitionDuration: '0.5s' }}>
            <img src={characterURL({ who: '99', pose: me.pose, view: me.pose === 'stand' ? 'front' : 'side', expr: 'smile', equip, flip: me.flip })} alt="99" />
          </div>
          {drops && <div className="drops" style={{ left: pct(drops.x - 6, W), top: pct(drops.y, H), fontSize: 14 }}>💧💧</div>}
          <div className="tint" style={{ background: TINT[part], zIndex: 300 }} />
          <div className="scene-hud"><span className="hud-pill">陽台 · {DAYPART_LABEL[part]}</span><span className="hud-pill">{placed.length}/{BALCONY_SLOTS} 盆</span></div>
        </div>
      </div>
      <div style={{ padding: 14 }}>
        <p className="muted">植物會依照真實經過的時間成長。久沒澆水只會暫停成長、變得沒精神，不會枯死。</p>
        {placed.length === 0 && <Empty icon="plant">陽台還沒有植物。到商店挑一盆吧！</Empty>}
        <div className="grid2">
          <button className="btn primary" onClick={() => navigate('/shop?tab=plants')}><Icon name="plant" />買盆栽</button>
          <button className="btn" onClick={() => setDecorBox(true)} data-testid="balcony-decor">🎀 擺裝飾{storedFurn.length ? ` ${storedFurn.length}` : ''}</button>
          <button className={'btn' + (arrange ? ' primary' : '')} onClick={() => { setArrange((v) => !v); setDrag(null); setPlacing(null); }} data-testid="balcony-arrange">🛠 {arrange ? '完成擺設' : '擺設'}</button>
          <button className="btn" onClick={() => navigate('/shop?tab=furniture&area=balcony')}>🛒 陽台小物</button>
        </div>
        {stored.length > 0 && (
          <div className="card" style={{ marginTop: 14 }}>
            <h2>收納中的盆栽</h2>
            {stored.map((p) => <button key={p.id} className="list-item" onClick={() => setSel(p)}>🪴 {plantById.get(p.defId)?.name}</button>)}
          </div>
        )}
      </div>

      <Sheet open={!!cur} onClose={() => setSel(null)} title={cur ? plantById.get(cur.defId)!.name : ''}>
        {cur && (() => {
          const def = plantById.get(cur.defId)!;
          const st = plantStatus(cur, def, now.getTime());
          return (
            <div className="stack">
              <div className="row">
                <img className="px" src={plantURL(def, st.stage, st.health !== 'healthy')} alt="" style={{ width: 72 }} />
                <div style={{ flex: 1 }}>
                  <div className="small">{def.group} · 成長階段 {st.stage}/4 · <b>{HEALTH_LABEL[st.health]}</b></div>
                  <Progress value={st.progress} />
                  <div className="muted">{st.nextStageHours == null ? '已經長到最茂盛了 🌸' : `再約 ${Math.ceil(st.nextStageHours)} 小時（照顧得好時）進入下一階段`}</div>
                  <div className="muted">上次澆水：{new Date(cur.lastWateredAt).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · 約每 {Math.round(def.waterIntervalH / 24 * 10) / 10} 天澆一次</div>
                </div>
              </div>
              {cur.slot != null && <button className="btn primary" disabled={busy} onClick={() => water(cur)} data-testid="water">💧 澆水</button>}
              <b className="small">移到位置</b>
              <div className="chips">{SLOTS.map((_, i) => <button key={i} className={'chip' + (cur.slot === i ? ' on' : '')} onClick={() => { setSel(null); run(() => movePlant(cur.id, i), '已移動'); }}>{i + 1}</button>)}</div>
              {cur.slot != null && <button className="btn" onClick={() => { setSel(null); run(() => movePlant(cur.id, null), '已收納'); }}>收納</button>}
            </div>
          );
        })()}
      </Sheet>
      <Sheet open={decorBox} onClose={() => setDecorBox(false)} title="擺到陽台">
        {storedFurn.length === 0 ? <Empty icon="gift">收納箱是空的。商店的「陽台小物」可以買花盆、燈串、吊椅…</Empty> : (
          <div className="shop-grid">
            {storedFurn.map((f) => { const d = furnById.get(f.defId)!; return (
              <div key={f.id} className="shop-item">
                <div className="thumb"><img src={furnitureURL(d, { now }).url} alt="" /></div>
                <div className="name">{d.name}</div><div className="muted">{FURN_CAT_LABEL[d.category]}</div>
                <button className="btn small primary" onClick={() => { setDecorBox(false); setPlacing({ id: f.id, name: d.name }); }} data-testid="place-decor">擺到陽台</button>
              </div>
            ); })}
          </div>
        )}
      </Sheet>
      <Sheet open={!!selDecor} onClose={() => setSelDecor(null)} title={selDecor ? furnById.get(selDecor.defId)?.name : ''}>
        {selDecor && (
          <div className="stack">
            {furnById.get(selDecor.defId)?.act && <button className="btn primary" onClick={() => { const f = selDecor; setSelDecor(null); useDecor(f); }}>{furnById.get(selDecor.defId)!.act!.verb}</button>}
            <div className="grid2">
              <button className="btn" onClick={() => { const f = selDecor; setSelDecor(null); setPlacing({ id: f.id, name: furnById.get(f.defId)!.name }); }}>移動</button>
              <button className="btn" onClick={() => { const f = selDecor; setSelDecor(null); run(() => storeFurniture(f.id), '已收進收納箱'); }}>收納</button>
            </div>
            <button className="btn" onClick={() => { const f = selDecor; setSelDecor(null); run(() => toggleFlip('furn', f.id)); }} data-testid="flip-item">↔ 左右翻轉</button>
          </div>
        )}
      </Sheet>
      <Sheet open={!!note} onClose={() => setNote(null)} title={note?.title}>
        {note && <div className="love-note"><p>{note.text}</p><span>— 陳卷毛</span></div>}
      </Sheet>
      <Sheet open={emptySlot != null} onClose={() => setEmptySlot(null)} title={`空位 ${(emptySlot ?? 0) + 1}`}>
        {stored.length > 0 ? <div className="list">{stored.map((p) => <button key={p.id} className="list-item" onClick={() => { const s = emptySlot; setEmptySlot(null); run(() => movePlant(p.id, s), '擺好了'); }}>🪴 把{plantById.get(p.defId)?.name}放這裡</button>)}</div>
          : <div className="stack"><p className="muted">這裡空空的，買一盆新植物吧。</p><button className="btn primary" onClick={() => navigate('/shop?tab=plants')}>去商店</button></div>}
      </Sheet>
    </div>
  );
}
