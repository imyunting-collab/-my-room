import { useState } from 'react';
import { Link } from '../router';
import { useStats, useGoal } from '../state';
import { dateKey, fmtDate, fmtMinutes } from '../lib/util';
import { moodLabel } from '../ui';

export default function CalendarPage() {
  const { books, sessions, stats } = useStats();
  const goal = useGoal();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState(dateKey());
  const first = new Date(ym.y, ym.m, 1);
  const days = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => dateKey(new Date(ym.y, ym.m, i + 1)))];
  const shift = (d: number) => setYm(({ y, m }) => { const n = new Date(y, m + d, 1); return { y: n.getFullYear(), m: n.getMonth() }; });
  const monthMin = cells.reduce((s, d) => s + (d ? stats.minutesByDay[d] ?? 0 : 0), 0);
  const monthDays = cells.filter((d) => d && stats.minutesByDay[d] !== undefined).length;
  const daySessions = sessions.filter((s) => s.date === sel);
  const lvl = (m?: number) => (m === undefined ? '' : m >= goal ? 'l3' : m >= goal / 2 ? 'l2' : 'l1');
  return (
    <div>
      <div className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <button className="btn small" onClick={() => shift(-1)} aria-label="上個月">‹</button>
          <b>{ym.y} 年 {ym.m + 1} 月</b>
          <button className="btn small" onClick={() => shift(1)} aria-label="下個月">›</button>
        </div>
        <div className="calendar">
          {'日一二三四五六'.split('').map((d) => <div key={d} className="dow">{d}</div>)}
          {cells.map((d, i) => d ? (
            <button key={d} className={[lvl(stats.minutesByDay[d]), d === dateKey() ? 'today' : '', d === sel ? 'sel' : ''].join(' ')} onClick={() => setSel(d)} aria-label={`${d} ${stats.minutesByDay[d] ?? 0} 分鐘`}>
              {Number(d.slice(8))}
            </button>
          ) : <div key={'e' + i} />)}
        </div>
        <p className="small" style={{ marginBottom: 0 }}>本月閱讀 {monthDays} 天 · {fmtMinutes(monthMin)}　<span className="muted">顏色越深＝讀越久（深綠＝達成每日目標）</span></p>
      </div>
      <div className="card">
        <h2>{fmtDate(sel)}</h2>
        {daySessions.length === 0 ? <p className="muted">這天沒有閱讀紀錄。</p> : daySessions.map((s) => (
          <Link key={s.id} to={`/book/${s.bookId}`} className="list-item">
            <div style={{ flex: 1 }}><b>《{books.find((b) => b.id === s.bookId)?.title}》</b><div className="muted">{fmtMinutes(s.minutes)} · {s.pages} 頁 {moodLabel(s.mood)}</div></div>
          </Link>
        ))}
        <Link to="/add" className="btn small">＋ 新增閱讀紀錄</Link>
      </div>
    </div>
  );
}
