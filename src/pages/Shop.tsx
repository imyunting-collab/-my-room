import { useEffect, useState } from 'react';
import { db } from '../db/idb';
import { useLive } from '../hooks';
import { navigate } from '../router';
import { CLOTHING, DEVICES, FOODS, FURNITURE, PLANTS, STYLE_LABEL, FURN_CAT_LABEL, type Unlock } from '../data/catalog';
import { autoPlaceDevice, buyClothing, buyDevice, buyFood, buyFurniture, buyPlant, isUnlocked, unlockContext, unlockText, type UnlockCtx } from '../services/life';
import { balance } from '../services/wallet';
import { checkAchievements } from '../services/reading';
import { characterURL, DEFAULT_EQUIP } from '../sprites/characters';
import { deviceURL, foodURL, furnitureURL, plantURL } from '../sprites/furniture';
import { Coins, Icon, Tabs, useAction } from '../ui';
import { toast } from '../lib/bus';

type Tab = 'furniture' | 'love' | 'devices' | 'clothing' | 'food' | 'plants';

type Area = 'all' | 'room' | 'kitchen' | 'balcony';
export default function ShopPage({ tab: initial, area: area0 }: { tab?: string; area?: string }) {
  const [tab, setTab] = useState<Tab>((initial as Tab) ?? 'furniture');
  const [area, setArea] = useState<Area>((area0 as Area) ?? 'all');
  const bal = useLive(balance, [], 0) ?? 0;
  const ownedF = new Set((useLive(() => db.all('ownedFurniture'), [], []) ?? []).map((f) => f.defId));
  const ownedD = new Set((useLive(() => db.all('ownedDevices'), [], []) ?? []).map((f) => f.defId));
  const ownedC = new Set((useLive(() => db.all('ownedClothing'), [], []) ?? []).map((f) => f.defId));
  const inv = useLive(() => db.all('foodInventory'), [], []) ?? [];
  const [ctx, setCtx] = useState<UnlockCtx | null>(null);
  const achCount = useLive(() => db.count('achievements'), [], 0);
  useEffect(() => { unlockContext().then(setCtx); }, [achCount]);
  const { busy, run } = useAction();
  const now = new Date();

  const item = (key: string, name: string, img: string, price: number, owned: boolean, unlock: Unlock | undefined, onBuy: () => Promise<unknown>, sub?: string, after?: () => void, extra?: string) => {
    const locked = ctx ? !isUnlocked(unlock, ctx) : false;
    return (
      <div key={key} className={'shop-item' + (locked ? ' locked' : '')} data-testid={`shop-${key}`}>
        <div className="thumb"><img src={img} alt="" /></div>
        <div className="name">{name}</div>
        {sub && <div className="muted">{sub}</div>}
        {extra && <div className="small" style={{ color: 'var(--forest-dark)' }}>{extra}</div>}
        <div className="price">{price === 0 ? '免費' : <Coins n={price} />}</div>
        {locked ? <div className="muted">🔒 {unlockText(unlock)}</div> : owned ? (
          <button className="btn small" disabled>已擁有</button>
        ) : (
          <button className="btn small primary" disabled={busy || bal < price} onClick={() => run(async () => { await onBuy(); after?.(); for (const a of await checkAchievements()) toast(`🏆 解鎖成就「${a.name}」+${a.reward}`, 'coin'); }, `購買成功：${name}`)} data-testid="buy">
            {bal < price ? '知識幣不足' : '購買'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="row between" style={{ marginBottom: 10 }}><span className="muted">用閱讀賺來的知識幣，把喜歡的東西搬進房間。</span><Coins n={bal} /></div>
      <Tabs value={tab} onChange={setTab} items={[['furniture', '家具'], ['love', '戀愛家具'], ['devices', '數位設備'], ['clothing', '服裝'], ['food', '食物'], ['plants', '盆栽']]} />
      {(tab === 'furniture' || tab === 'love') && <p className="small">買到的家具會先放進房間的「收納箱」，再擺到喜歡的位置。✨ 標示的家具真的可以互動。</p>}
      {tab === 'furniture' && (
        <div className="chips" style={{ marginBottom: 10 }}>
          {([['all', '全部'], ['room', '🛏 房間'], ['kitchen', '🍳 廚房'], ['balcony', '🌿 陽台']] as [Area, string][]).map(([k, l]) => <button key={k} className={'chip' + (area === k ? ' on' : '')} onClick={() => setArea(k)} data-testid={`area-${k}`}>{l}</button>)}
        </div>
      )}
      <div className="shop-grid">
        {tab === 'furniture' && FURNITURE.filter((f) => !f.love && f.price > 0 && (area === 'all' || (f.area ?? 'room') === area)).map((f) => item(f.id, f.name, furnitureURL(f, { now, books: [] }).url, f.price, ownedF.has(f.id), f.unlock, () => buyFurniture(f.id), `${FURN_CAT_LABEL[f.category]} · ${STYLE_LABEL[f.style]}`, undefined, f.act ? `✨ ${f.desc ?? `可以「${f.act.verb}」`}` : f.desc))}
        {tab === 'love' && FURNITURE.filter((f) => f.love).map((f) => item(f.id, f.name, furnitureURL(f, { now }).url, f.price, ownedF.has(f.id), f.unlock, () => buyFurniture(f.id), FURN_CAT_LABEL[f.category], undefined, f.act ? `✨ ${f.desc ?? `可以「${f.act.verb}」`}` : f.desc))}
        {tab === 'devices' && DEVICES.map((d) => item(d.id, d.name, deviceURL(d, true).url, d.price, ownedD.has(d.id), undefined, () => buyDevice(d.id), d.deviceType === 'phone' ? '手機外觀（到手機設定更換）' : '購買後自動放到書桌上', () => { autoPlaceDevice(d.id); })) }
        {tab === 'clothing' && CLOTHING.filter((c) => c.price > 0).map((c) => item(c.id, c.name, characterURL({ who: c.character, pose: 'stand', view: 'front', expr: 'smile', equip: { ...DEFAULT_EQUIP[c.character], [c.slot]: c.id } }), c.price, ownedC.has(c.id), c.unlock, () => buyClothing(c.id), `${c.character === 'chen' ? '陳卷毛 · ' : ''}${c.tag}`))}
        {tab === 'food' && FOODS.map((f) => (
          <div key={f.id} className="shop-item" data-testid={`shop-${f.id}`}>
            <div className="thumb"><img src={foodURL(f.id)} alt="" style={{ width: 56 }} /></div>
            <div className="name">{f.name}</div><div className="muted">{f.desc}</div>
            <div className="price"><Coins n={f.price} /> · 冰箱裡 {inv.find((x) => x.foodId === f.id)?.quantity ?? 0} 份</div>
            <button className="btn small primary" disabled={busy || bal < f.price} onClick={() => run(() => buyFood(f.id, 1), `買了${f.name}，放進冰箱了`)} data-testid="buy">{bal < f.price ? '知識幣不足' : '買一份'}</button>
          </div>
        ))}
        {tab === 'plants' && PLANTS.map((p) => item(p.id, p.name, plantURL(p, 2, false), p.price, false, p.unlock, async () => { const pl = await buyPlant(p.id); if (pl.slot == null) toast('陽台位置滿了，新盆栽先放在收納區', 'info'); }, `${p.group} · 約 ${Math.round(p.waterIntervalH / 24 * 10) / 10} 天澆一次`))}
      </div>
      {tab === 'food' && <button className="btn block" style={{ marginTop: 16 }} onClick={() => navigate('/fridge')}><Icon name="fridge" />打開冰箱</button>}
      {tab === 'plants' && <button className="btn block" style={{ marginTop: 16 }} onClick={() => navigate('/balcony')}><Icon name="plant" />去陽台</button>}
      {tab === 'clothing' && <button className="btn block" style={{ marginTop: 16 }} onClick={() => navigate('/wardrobe')}><Icon name="shirt" />到試衣間試穿</button>}
    </div>
  );
}
