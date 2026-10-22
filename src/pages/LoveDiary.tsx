import { useState } from 'react';
import { db } from '../db/idb';
import { useLive } from '../hooks';
import { foodById } from '../data/catalog';
import { deleteAnniversary, deleteMemory, saveAnniversary, saveMemory, updateRelationship } from '../services/love';
import { confirmDialog, Empty, Field, Icon, PhotoPicker, PhotoThumb, Sheet, Tabs, useAction } from '../ui';
import { dateKey, daysBetween, fmtDateTime, parseDateKey } from '../lib/util';
import type { LoveMemory } from '../db/types';

const INTERACTION: Record<string, string> = { chat: '聊天', hug: '抱抱', kiss: '親親', sit: '一起坐著', meal: '一起吃飯', read: '一起看書', movie: '看電影', diary: '分享日記', gift: '送禮物' };

export default function LoveDiaryPage() {
  const [tab, setTab] = useState<'memories' | 'dates' | 'records'>('memories');
  return (
    <div>
      <Tabs value={tab} onChange={setTab} items={[['memories', '戀愛回憶'], ['dates', '紀念日'], ['records', '共同紀錄']]} />
      {tab === 'memories' && <Memories />}
      {tab === 'dates' && <Dates />}
      {tab === 'records' && <Records />}
    </div>
  );
}

function Memories() {
  const all = (useLive(() => db.all('loveMemories'), [], []) ?? []).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const [filter, setFilter] = useState<'all' | 'real' | 'game'>('all');
  const [edit, setEdit] = useState<Partial<LoveMemory> | null>(null);
  const list = all.filter((m) => filter === 'all' || m.sourceType === filter);
  return (
    <div>
      <p className="muted">「真實回憶」是你自己寫下的事；「遊戲紀錄」是在 MY ROOM 裡和陳卷毛（遊戲角色）互動後，你選擇收藏的片段。兩者會分開標示。</p>
      <div className="row between" style={{ marginBottom: 10 }}>
        <div className="chips">
          {([['all', '全部'], ['real', '真實回憶'], ['game', '遊戲紀錄']] as const).map(([k, l]) => <button key={k} className={'chip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>{l}</button>)}
        </div>
        <button className="btn small pink" onClick={() => setEdit({ sourceType: 'real', date: dateKey(), title: '', content: '', photoIds: [] })} data-testid="new-memory">＋ 寫下回憶</button>
      </div>
      <div className="card">
        {list.length === 0 ? <Empty icon="heart">還沒有回憶。</Empty> : list.map((m) => (
          <div key={m.id} className="list-item" onClick={() => setEdit(m)} role="button" tabIndex={0} data-testid="memory-row">
            {m.photoIds[0] && <PhotoThumb id={m.photoIds[0]} size={52} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row between"><b>{m.title}</b><span className={'tag ' + m.sourceType}>{m.sourceType === 'real' ? '真實回憶' : '遊戲紀錄'}</span></div>
              <div className="muted">{m.date}</div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.content}</div>
            </div>
          </div>
        ))}
      </div>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? '編輯回憶' : '寫下回憶'}>{edit && <MemoryForm m={edit} onDone={() => setEdit(null)} />}</Sheet>
    </div>
  );
}

function MemoryForm({ m, onDone }: { m: Partial<LoveMemory>; onDone: () => void }) {
  const [f, setF] = useState({ title: m.title ?? '', content: m.content ?? '', date: m.date ?? dateKey(), photoIds: m.photoIds ?? [] });
  const { busy, run } = useAction();
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(async () => { await saveMemory({ ...m, ...f, sourceType: m.sourceType ?? 'real' }); onDone(); }, '回憶已儲存'); }}>
      <span className={'tag ' + (m.sourceType ?? 'real')}>{m.sourceType === 'game' ? '遊戲紀錄' : '真實回憶'}</span>
      <Field label="標題"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required name="memory-title" /></Field>
      <Field label="日期"><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
      <Field label="內容"><textarea value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} placeholder="想記住的那個瞬間…" /></Field>
      <Field label="照片"><PhotoPicker ids={f.photoIds} onChange={(v) => setF({ ...f, photoIds: v })} /></Field>
      <div className="grid2">
        {m.id ? <button type="button" className="btn danger" onClick={async () => { if (await confirmDialog('刪除這段回憶？', { danger: true, ok: '刪除' })) { await run(() => deleteMemory(m.id!), '已刪除'); onDone(); } }}>刪除</button> : <span />}
        <button className="btn primary" disabled={busy} data-testid="save-memory">儲存</button>
      </div>
    </form>
  );
}

function Dates() {
  const rel = useLive(() => db.get('relationship', 'main'), []);
  const list = (useLive(() => db.all('anniversaries'), [], []) ?? []).sort((a, b) => a.date.localeCompare(b.date));
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState<string | null>(null);
  const { busy, run } = useAction();
  const today = dateKey();
  const startDate = start ?? rel?.anniversaryDate ?? '';
  const nextOccurrence = (d: string) => {
    const x = parseDateKey(d), t = parseDateKey(today);
    const n = new Date(t.getFullYear(), x.getMonth(), x.getDate());
    if (n < t) n.setFullYear(n.getFullYear() + 1);
    return daysBetween(today, dateKey(n));
  };
  return (
    <div>
      <div className="card">
        <h2><Icon name="heart" />交往紀念日</h2>
        <p className="muted">設定後，首頁會用真實日期計算在一起的天數。</p>
        <form className="row" onSubmit={(e) => { e.preventDefault(); run(() => updateRelationship({ anniversaryDate: startDate || undefined }), '已儲存交往紀念日'); }}>
          <input className="input" type="date" value={startDate} onChange={(e) => setStart(e.target.value)} aria-label="交往紀念日" />
          <button className="btn small primary" disabled={busy}>儲存</button>
        </form>
        {rel?.anniversaryDate && <p style={{ marginBottom: 0 }}>在一起第 <b data-testid="together-days">{daysBetween(rel.anniversaryDate, today) + 1}</b> 天</p>}
      </div>
      <div className="card">
        <h2><Icon name="calendar" />自訂紀念日</h2>
        <form className="stack" onSubmit={(e) => { e.preventDefault(); run(async () => { await saveAnniversary(name, date); setName(''); setDate(''); }, '已新增紀念日'); }}>
          <div className="grid2"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="名稱，例如：第一次約會" /><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <button className="btn small" disabled={busy}>＋ 新增紀念日</button>
        </form>
        {list.map((a) => (
          <div key={a.id} className="list-item" style={{ cursor: 'default' }}>
            <div style={{ flex: 1 }}><b>{a.name}</b><div className="muted">{a.date} · 已經 {daysBetween(a.date, today)} 天 · 下一次還有 {nextOccurrence(a.date)} 天</div></div>
            <button className="btn small ghost" aria-label="刪除紀念日" onClick={async () => { if (await confirmDialog(`刪除「${a.name}」？`, { danger: true, ok: '刪除' })) run(() => deleteAnniversary(a.id)); }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Records() {
  const meals = (useLive(() => db.all('meals'), [], []) ?? []).sort((a, b) => b.createdAt - a.createdAt);
  const reads = (useLive(() => db.all('readTogether'), [], []) ?? []).sort((a, b) => b.createdAt - a.createdAt);
  const visits = (useLive(() => db.all('visits'), [], []) ?? []).sort((a, b) => b.arrivedAt - a.arrivedAt);
  return (
    <div>
      <p className="muted">以下都是 MY ROOM 遊戲裡的互動紀錄。</p>
      <div className="card"><h2>🍙 共同用餐</h2>{meals.length === 0 ? <p className="muted">還沒有。</p> : meals.map((m) => <div key={m.id} className="list-item" style={{ cursor: 'default' }}>{m.date} · 一起吃了{foodById.get(m.foodId)?.name}（{m.quantity} 份）</div>)}</div>
      <div className="card"><h2>📖 共同閱讀</h2>{reads.length === 0 ? <p className="muted">還沒有。</p> : reads.map((r) => <div key={r.id} className="list-item" style={{ cursor: 'default' }}>{r.date} · 一起讀《{r.bookTitle}》</div>)}</div>
      <div className="card"><h2>🏠 到訪紀錄</h2>{visits.length === 0 ? <p className="muted">還沒有。</p> : visits.map((v) => (
        <div key={v.id} className="list-item" style={{ cursor: 'default' }}><div><b>{fmtDateTime(v.arrivedAt)}{v.departedAt ? ` – ${fmtDateTime(v.departedAt)}` : '（還在家裡）'}</b><div className="muted">{v.interactions.length ? v.interactions.map((i) => INTERACTION[i.type] ?? i.type).join('、') : '只是來坐坐'}</div></div></div>
      ))}</div>
    </div>
  );
}
