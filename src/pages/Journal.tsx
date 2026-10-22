import { useState } from 'react';
import { db } from '../db/idb';
import { useLive } from '../hooks';
import { Link } from '../router';
import { useBooks, useSessions } from '../state';
import { Empty, Icon, MOODS, moodLabel, PhotoThumb, Tabs } from '../ui';
import { copyText, downloadText, fmtDate } from '../lib/util';
import { toast } from '../lib/bus';
import { diaryToMarkdown, TEMPLATES } from '../services/journal';

type Tab = 'quotes' | 'reflections' | 'diary' | 'mood' | 'photos';

export default function JournalPage() {
  const [tab, setTab] = useState<Tab>('quotes');
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const books = useBooks();
  const sessions = useSessions();
  const quotes = (useLive(() => db.all('quotes'), [], []) ?? []).sort((a, b) => b.createdAt - a.createdAt);
  const diary = (useLive(() => db.all('diary'), [], []) ?? []).filter((d) => !d.isDraft).sort((a, b) => b.date.localeCompare(a.date));
  const title = (id?: string) => books.find((b) => b.id === id)?.title ?? '';
  const hit = (s: string, tags: string[] = []) => (!q || s.toLowerCase().includes(q.toLowerCase())) && (!tag || tags.includes(tag));
  const allTags = [...new Set([...sessions.flatMap((s) => s.tags), ...quotes.flatMap((x) => x.tags), ...diary.flatMap((d) => d.tags)])];

  const fq = quotes.filter((x) => hit(x.text + title(x.bookId) + (x.note ?? ''), x.tags));
  const fr = sessions.filter((s) => s.reflection && hit(s.reflection + title(s.bookId), s.tags));
  const fd = diary.filter((d) => hit(d.title + d.content, d.tags));
  const photos = [...sessions.flatMap((s) => s.photoIds.map((p) => ({ p, label: `${title(s.bookId)} · ${s.date}` }))), ...diary.flatMap((d) => d.photoIds.map((p) => ({ p, label: `${d.title} · ${d.date}` })))];

  const md = (): string => {
    if (tab === 'quotes') return fq.map((x) => `> ${x.text}\n\n— 《${title(x.bookId) || '未標記書籍'}》${x.page ? ` p.${x.page}` : ''}`).join('\n\n');
    if (tab === 'reflections') return fr.map((s) => `## ${s.date}｜《${title(s.bookId)}》\n\n${s.reflection}${s.quote ? `\n\n> ${s.quote}` : ''}`).join('\n\n');
    if (tab === 'diary') return diaryToMarkdown(fd);
    return MOODS.map(([k, e, l]) => `${e} ${l}：${sessions.filter((s) => s.mood === k).length + diary.filter((d) => d.mood === k).length} 次`).join('\n');
  };
  const copy = async (t: string) => { const ok = await copyText(t); toast(ok ? '已複製' : '複製失敗', ok ? 'success' : 'error'); };

  return (
    <div>
      <Tabs value={tab} onChange={setTab} items={[['quotes', `佳句 ${quotes.length}`], ['reflections', '心得'], ['diary', '日記'], ['mood', '心情'], ['photos', '照片']]} />
      {tab !== 'mood' && tab !== 'photos' && (
        <div className="row" style={{ marginBottom: 10 }}>
          <input className="input" placeholder="搜尋手札…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="搜尋手札" />
        </div>
      )}
      {allTags.length > 0 && tab !== 'mood' && tab !== 'photos' && (
        <div className="chips" style={{ marginBottom: 10 }}>
          <button className={'chip' + (!tag ? ' on' : '')} onClick={() => setTag('')}>全部</button>
          {allTags.map((t) => <button key={t} className={'chip' + (tag === t ? ' on' : '')} onClick={() => setTag(tag === t ? '' : t)}>#{t}</button>)}
        </div>
      )}
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn small" onClick={() => copy(md())}>📋 一鍵複製</button>
        <button className="btn small" onClick={() => downloadText(md(), `MY-ROOM-手札-${tab}.md`, 'text/markdown')}>⬇ 匯出 .md</button>
        {tab === 'diary' && <Link to="/diary" className="btn small pink">＋ 寫日記</Link>}
      </div>

      <div className="card">
        {tab === 'quotes' && (fq.length === 0 ? <Empty icon="quote">還沒有佳句。在閱讀紀錄或書籍頁面收藏一句喜歡的話吧。</Empty> : fq.map((x) => (
          <div key={x.id} className="list-item" style={{ alignItems: 'flex-start', cursor: 'default' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, lineHeight: 1.7 }}>「{x.text}」</div>
              <div className="muted">《{title(x.bookId) || '未標記'}》{x.page ? ` p.${x.page}` : ''}</div>
            </div>
            <button className="btn small ghost" onClick={() => copy(`「${x.text}」——《${title(x.bookId)}》`)} aria-label="複製佳句">📋</button>
          </div>
        )))}
        {tab === 'reflections' && (fr.length === 0 ? <Empty icon="pen">還沒有閱讀心得。</Empty> : fr.map((s) => (
          <div key={s.id} className="list-item" style={{ alignItems: 'flex-start', cursor: 'default' }}>
            <div style={{ flex: 1 }}>
              <div className="row between"><b>《{title(s.bookId)}》</b><span className="muted">{fmtDate(s.date)}</span></div>
              <div className="muted">{moodLabel(s.mood)} {s.tags.map((t) => `#${t}`).join(' ')}</div>
              <p style={{ whiteSpace: 'pre-wrap', margin: '6px 0' }}>{s.reflection}</p>
              <button className="btn small ghost" onClick={() => copy(s.reflection!)}>📋 複製</button>
            </div>
          </div>
        )))}
        {tab === 'diary' && (fd.length === 0 ? <Empty icon="journal">還沒有日記。可以用房間裡的電腦、平板或手機寫，這裡都看得到。</Empty> : fd.map((d) => (
          <Link key={d.id} to={`/diary?id=${d.id}`} className="list-item" >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row between"><b>{d.isFavorite ? '★ ' : ''}{d.title}</b><span className="muted">{d.date}</span></div>
              <div className="muted">{TEMPLATES[d.template].label} {moodLabel(d.mood)}</div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.content}</div>
            </div>
          </Link>
        )))}
        {tab === 'mood' && (
          <div className="stack">
            {MOODS.map(([k, e, l]) => {
              const n = sessions.filter((s) => s.mood === k).length + diary.filter((d) => d.mood === k).length;
              const max = Math.max(1, ...MOODS.map(([kk]) => sessions.filter((s) => s.mood === kk).length + diary.filter((d) => d.mood === kk).length));
              return <div key={k} className="row"><span style={{ width: 70 }}>{e} {l}</span><div className="progress pink" style={{ flex: 1 }}><i style={{ width: `${(n / max) * 100}%` }} /></div><b style={{ width: 28, textAlign: 'right' }}>{n}</b></div>;
            })}
            <p className="muted">統計來自閱讀紀錄與日記中選擇的心情。</p>
          </div>
        )}
        {tab === 'photos' && (photos.length === 0 ? <Empty icon="star">還沒有照片。</Empty> : <div className="row wrap">{photos.map(({ p, label }) => <div key={p} title={label}><PhotoThumb id={p} size={96} /></div>)}</div>)}
      </div>
      <div className="row"><Link to="/calendar" className="btn small"><Icon name="calendar" />閱讀月曆</Link><Link to="/stats" className="btn small"><Icon name="chart" />統計</Link></div>
    </div>
  );
}
