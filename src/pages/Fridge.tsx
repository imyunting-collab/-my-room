import { useState } from 'react';
import { db } from '../db/idb';
import { useLive } from '../hooks';
import { useEquip } from '../state';
import { FOODS, furnById } from '../data/catalog';
import { buyFood, eatFood } from '../services/life';
import { balance } from '../services/wallet';
import { characterURL, type Pose } from '../sprites/characters';
import { foodURL, furnitureURL } from '../sprites/furniture';
import { Coins, useAction } from '../ui';
import { sleep } from '../lib/util';

export default function FridgePage() {
  const inv = useLive(() => db.all('foodInventory'), [], []) ?? [];
  const fridges = useLive(() => db.all('ownedFurniture'), [], []) ?? [];
  const fridgeDef = furnById.get(fridges.find((f) => furnById.get(f.defId)?.category === 'fridge')?.defId ?? 'fridge_cream')!;
  const equip = useEquip('99');
  const bal = useLive(balance, [], 0) ?? 0;
  const [open, setOpen] = useState(true);
  const [pose, setPose] = useState<Pose>('stand');
  const [eating, setEating] = useState<string | null>(null);
  const { busy, run } = useAction();
  const qty = (id: string) => inv.find((x) => x.foodId === id)?.quantity ?? 0;
  const eat = (id: string) => run(async () => {
    await eatFood(id);
    setEating(id); setPose('takeFood'); await sleep(700); setPose('eat'); await sleep(1400); setPose('stand'); setEating(null);
  }, `吃掉了一份${FOODS.find((f) => f.id === id)?.name}，好滿足！`);
  return (
    <div>
      <div className="card" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 24, background: '#f3e7d2' }}>
        <button onClick={() => setOpen(!open)} style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0 }} aria-label={open ? '關上冰箱' : '打開冰箱'} data-testid="fridge-toggle">
          <img className="px" src={furnitureURL(fridgeDef, { open }).url} alt="冰箱" style={{ width: 120 }} />
        </button>
        <div style={{ position: 'relative' }}>
          <img className="px" src={characterURL({ who: '99', pose, view: 'front', expr: pose === 'eat' ? 'happy' : 'smile', equip })} alt="99" style={{ width: 110 }} data-testid="fridge-99" data-pose={pose} />
          {eating && <img className="px" src={foodURL(eating)} alt="" style={{ position: 'absolute', top: -10, right: -6, width: 34 }} />}
        </div>
      </div>
      <p className="small center">{open ? '冰箱打開了，點冰箱可以關上。' : '冰箱關著，點一下打開。'}</p>
      {open && (
        <div className="shop-grid">
          {FOODS.map((f) => (
            <div key={f.id} className="shop-item" data-testid={`food-${f.id}`}>
              <div className="thumb"><img src={foodURL(f.id)} alt="" style={{ width: 52, opacity: qty(f.id) ? 1 : 0.35 }} /></div>
              <div className="name">{f.name}</div>
              <div className="small">庫存 <b data-testid="qty">{qty(f.id)}</b> 份</div>
              <div className="row">
                <button className="btn small primary" disabled={busy || qty(f.id) < 1} onClick={() => eat(f.id)}>吃一份</button>
                <button className="btn small" disabled={busy || bal < f.price} onClick={() => run(() => buyFood(f.id, 1), `${f.name} 放進冰箱了`)} aria-label={`購買${f.name}`}>＋<Coins n={f.price} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="muted" style={{ marginTop: 14 }}>陳卷毛來家裡時，可以從冰箱拿食物一起吃飯。食物不足時沒辦法一起吃。</p>
    </div>
  );
}
