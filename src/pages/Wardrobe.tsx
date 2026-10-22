import { useEffect, useState } from 'react';
import { db } from '../db/idb';
import { useLive } from '../hooks';
import { useEquip } from '../state';
import { CLOTHING, SLOT_LABEL, SLOT_ORDER, clothById } from '../data/catalog';
import { applyOutfit, buyClothing, equipItem, isUnlocked, saveOutfit, unlockContext, unlockText, type UnlockCtx } from '../services/life';
import { characterURL, type View } from '../sprites/characters';
import { Coins, confirmDialog, Tabs, useAction } from '../ui';
import type { CharacterId, Equip, Slot } from '../db/types';
import { balance } from '../services/wallet';

export default function WardrobePage() {
  const [who, setWho] = useState<CharacterId>('99');
  const equip = useEquip(who);
  const [tryOn, setTryOn] = useState<Equip | null>(null);
  const [slot, setSlot] = useState<Slot>('top');
  const [view, setView] = useState<View>('front');
  const [name, setName] = useState('');
  const owned = new Set((useLive(() => db.all('ownedClothing'), [], []) ?? []).map((c) => c.defId));
  const outfits = (useLive(() => db.all('outfits'), [], []) ?? []).filter((o) => o.character === who);
  const bal = useLive(balance, [], 0) ?? 0;
  const [ctx, setCtx] = useState<UnlockCtx | null>(null);
  useEffect(() => { unlockContext().then(setCtx); }, []);
  useEffect(() => { setTryOn(null); }, [who]);
  const { busy, run } = useAction();
  const preview = tryOn ?? equip;
  const items = CLOTHING.filter((c) => c.character === who && c.slot === slot);
  const slots = SLOT_ORDER.filter((s) => CLOTHING.some((c) => c.character === who && c.slot === s));
  const trying = tryOn && Object.entries(tryOn).some(([k, v]) => v && !owned.has(v) && (equip as any)[k] !== v);

  return (
    <div>
      <Tabs value={who} onChange={setWho} items={[['99', '99 的衣櫃'], ['chen', '陳卷毛的衣櫃']]} />
      <div className="char-preview">
        <img src={characterURL({ who, pose: 'stand', view, expr: 'smile', equip: preview })} alt="角色預覽" data-testid="wardrobe-preview" />
        <div className="chips">{(['front', 'side', 'back'] as View[]).map((v) => <button key={v} className={'chip' + (view === v ? ' on' : '')} onClick={() => setView(v)}>{{ front: '正面', side: '側面', back: '背面' }[v]}</button>)}</div>
        {trying && <div className="row" style={{ marginTop: 8 }}><span className="small">試穿中（還沒買的單品不會被儲存）</span><button className="btn small" onClick={() => setTryOn(null)}>還原</button></div>}
      </div>
      <div style={{ height: 12 }} />
      <Tabs value={slot} onChange={setSlot} items={slots.map((s) => [s, SLOT_LABEL[s]] as [Slot, string])} />
      <div className="shop-grid">
        {slot !== 'top' && slot !== 'bottom' && (
          <div className="shop-item">
            <div className="thumb" style={{ fontSize: 28 }}>∅</div><div className="name">不穿{SLOT_LABEL[slot]}</div>
            <button className="btn small" disabled={!equip[slot]} onClick={() => run(() => equipItem(who, slot, null), '已脫下')}>脫下</button>
          </div>
        )}
        {items.map((c) => {
          const has = owned.has(c.id);
          const on = equip[slot] === c.id;
          const locked = ctx ? !isUnlocked(c.unlock, ctx) : false;
          return (
            <div key={c.id} className={'shop-item' + (locked ? ' locked' : '')} style={on ? { borderColor: 'var(--forest)', borderWidth: 3 } : undefined} data-testid={`cloth-${c.id}`}>
              <div className="thumb"><img src={characterURL({ who, pose: 'stand', view: 'front', expr: 'normal', equip: { ...equip, [slot]: c.id } })} alt="" /></div>
              <div className="name">{c.name}</div>
              <div className="muted">{c.tag}{!has && c.price ? ' · ' : ''}{!has && c.price ? <Coins n={c.price} /> : null}</div>
              {has ? (
                <button className={'btn small' + (on ? '' : ' primary')} disabled={on || busy} onClick={() => { setTryOn(null); run(() => equipItem(who, slot, c.id), `換上了${c.name}`); }} data-testid="equip">{on ? '穿著中' : '穿上'}</button>
              ) : locked ? <div className="muted">🔒 {unlockText(c.unlock)}</div> : (
                <div className="row">
                  <button className="btn small" onClick={() => setTryOn({ ...preview, [slot]: c.id })}>試穿</button>
                  <button className="btn small primary" disabled={busy || bal < c.price} onClick={() => run(async () => { await buyClothing(c.id); await equipItem(who, slot, c.id); setTryOn(null); }, `買下並換上了${c.name}`)}>購買</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2>儲存的整套穿搭</h2>
        <form className="row" onSubmit={(e) => { e.preventDefault(); run(async () => { await saveOutfit(who, name); setName(''); }, '已儲存這套穿搭'); }}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="穿搭名稱，例如：週末咖啡廳" />
          <button className="btn small primary" disabled={busy}>儲存目前穿搭</button>
        </form>
        {outfits.map((o) => (
          <div key={o.id} className="list-item" style={{ cursor: 'default' }}>
            <img className="px" src={characterURL({ who, pose: 'stand', expr: 'smile', equip: o.equip })} alt="" style={{ width: 40 }} />
            <div style={{ flex: 1 }}><b>{o.name}</b><div className="muted">{Object.values(o.equip).filter(Boolean).map((id) => clothById.get(id!)?.name).filter(Boolean).join('、')}</div></div>
            <button className="btn small" onClick={() => run(() => applyOutfit(o.id), `換上「${o.name}」`)}>換上</button>
            <button className="btn small ghost" aria-label="刪除穿搭" onClick={async () => { if (await confirmDialog(`刪除穿搭「${o.name}」？`, { danger: true, ok: '刪除' })) run(() => db.delete('outfits', o.id)); }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
