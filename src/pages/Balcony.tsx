import { useEffect, useState } from 'react';
import { db } from '../db/idb';
import { useDayPart, useLive } from '../hooks';
import { navigate } from '../router';
import { useEquip } from '../state';
import { BALCONY_SLOTS, plantById } from '../data/catalog';
import { HEALTH_LABEL, movePlant, plantStatus, refreshPlants, waterPlant } from '../services/life';
import { characterURL, type Pose } from '../sprites/characters';
import { plantURL } from '../sprites/furniture';
import { sprite } from '../sprites/pixel';
import { Empty, Icon, Progress, Sheet, useAction } from '../ui';
import { toast } from '../lib/bus';
import { DAYPART_LABEL, sleep, type DayPart } from '../lib/util';
import type { OwnedPlant } from '../db/types';

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
        <button className="on">🌿 陽台</button>
      </div>
      <div className="scene-wrap">
        <div className="scene balcony" style={{ aspectRatio: `${W} / ${H}` }} data-testid="balcony">
          <img className="layer px" src={bg(part)} alt="" style={{ width: '100%', height: '100%' }} />
          {SLOTS.slice(0, BALCONY_SLOTS).map((s, i) => {
            const p = placed.find((x) => x.slot === i);
            if (!p) return <button key={i} className="slot empty" style={{ left: pct(s.x, W), top: pct(s.y, H), zIndex: s.y }} onClick={() => setEmptySlot(i)} aria-label={`空位 ${i + 1}`} />;
            const def = plantById.get(p.defId)!;
            const st = plantStatus(p, def, now.getTime());
            return (
              <button key={p.id} className="slot" style={{ left: pct(s.x, W), top: pct(s.y, H), width: pct(26, W), zIndex: s.y }} onClick={() => setSel(p)} aria-label={def.name} data-testid="plant">
                <img src={plantURL(def, st.stage, st.health !== 'healthy')} alt="" />
              </button>
            );
          })}
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
        <button className="btn block primary" onClick={() => navigate('/shop?tab=plants')}><Icon name="plant" />買盆栽</button>
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
      <Sheet open={emptySlot != null} onClose={() => setEmptySlot(null)} title={`空位 ${(emptySlot ?? 0) + 1}`}>
        {stored.length > 0 ? <div className="list">{stored.map((p) => <button key={p.id} className="list-item" onClick={() => { const s = emptySlot; setEmptySlot(null); run(() => movePlant(p.id, s), '擺好了'); }}>🪴 把{plantById.get(p.defId)?.name}放這裡</button>)}</div>
          : <div className="stack"><p className="muted">這裡空空的，買一盆新植物吧。</p><button className="btn primary" onClick={() => navigate('/shop?tab=plants')}>去商店</button></div>}
      </Sheet>
    </div>
  );
}
