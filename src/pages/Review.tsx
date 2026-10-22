import { useState } from 'react';
import { db } from '../db/idb';
import { useLive } from '../hooks';
import { useEquip, useStats } from '../state';
import { computeStats } from '../data/achievements';
import { characterURL } from '../sprites/characters';
import { BookCover, Empty, Icon, MOODS } from '../ui';
import { fmtMinutes } from '../lib/util';

export default function ReviewPage() {
  const { books, sessions } = useStats();
  const equip = useEquip('99');
  const quotes = useLive(() => db.all('quotes'), [], []) ?? [];
  const [year, setYear] = useState(new Date().getFullYear());
  const ys = sessions.filter((s) => s.date.startsWith(String(year)));
  const st = computeStats(books, ys);
  const finished = books.filter((b) => b.status === 'finished' && b.finishDate?.startsWith(String(year)));
  const monthly = Array.from({ length: 12 }, (_, m) => ys.filter((s) => s.date.slice(5, 7) === String(m + 1).padStart(2, '0')).reduce((a, s) => a + s.minutes, 0));
  const bestMonth = monthly.indexOf(Math.max(...monthly));
  const topCat = Object.entries(st.categories).sort((a, b) => b[1] - a[1])[0];
  const moodCount = MOODS.map(([k, e, l]) => [e + ' ' + l, ys.filter((s) => s.mood === k).length] as const).sort((a, b) => b[1] - a[1])[0];
  const yq = quotes.filter((q) => new Date(q.createdAt).getFullYear() === year).slice(0, 3);
  const bookTitle = (id?: string) => books.find((b) => b.id === id)?.title ?? '';
  return (
    <div>
      <div className="row between" style={{ marginBottom: 12 }}>
        <button className="btn small" onClick={() => setYear(year - 1)} aria-label="前一年">‹</button>
        <b style={{ fontSize: 18 }}>{year} 年度閱讀回顧</b>
        <button className="btn small" onClick={() => setYear(year + 1)} aria-label="下一年">›</button>
      </div>
      {ys.length === 0 && finished.length === 0 ? <div className="card"><Empty icon="star">{year} 年還沒有閱讀紀錄。</Empty></div> : (
        <>
          <div className="card" style={{ background: 'linear-gradient(#26354d, #3a4d6e)', color: '#fffaf1' }}>
            <div className="row">
              <img className="px" src={characterURL({ who: '99', pose: 'read', expr: 'happy', equip })} alt="" style={{ width: 90 }} />
              <div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>這一年，99 讀了</div>
                <div style={{ fontSize: 30, fontWeight: 800 }}>{st.totalPages} 頁</div>
                <div>共 {fmtMinutes(st.totalMinutes)}，{st.readingDays} 天有翻開書</div>
              </div>
            </div>
          </div>
          <div className="grid2" style={{ marginBottom: 16 }}>
            <div className="stat"><b>{finished.length}</b><span>讀完的書</span></div>
            <div className="stat"><b>{st.longestStreak}</b><span>最長連續天數</span></div>
            <div className="stat"><b>{monthly[bestMonth] ? `${bestMonth + 1} 月` : '—'}</b><span>最認真的月份</span></div>
            <div className="stat"><b style={{ fontSize: 17 }}>{topCat ? topCat[0] : '—'}</b><span>最常讀的分類</span></div>
          </div>
          {moodCount && moodCount[1] > 0 && <div className="card flat"><b>今年最常出現的閱讀心情：{moodCount[0]}</b></div>}
          <div className="card">
            <h2><Icon name="check" />{year} 讀完的書</h2>
            {finished.length === 0 ? <p className="muted">還沒有讀完的書。</p> : <div className="row wrap">{finished.map((b) => <div key={b.id} title={b.title}><BookCover book={b} /></div>)}</div>}
          </div>
          {yq.length > 0 && <div className="card"><h2><Icon name="quote" />這一年收藏的句子</h2>{yq.map((q) => <p key={q.id}>「{q.text}」<span className="muted">——《{bookTitle(q.bookId)}》</span></p>)}</div>}
        </>
      )}
    </div>
  );
}
