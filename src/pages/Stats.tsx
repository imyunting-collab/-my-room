import { useState } from 'react';
import { db } from '../db/idb';
import { Link } from '../router';
import { useStats, useGoal } from '../state';
import { CATEGORY_COLORS } from '../data/catalog';
import { fmtMinutes } from '../lib/util';
import { Icon, useAction } from '../ui';

export default function StatsPage() {
  const { stats, sessions } = useStats();
  const goal = useGoal();
  const [year, setYear] = useState(new Date().getFullYear());
  const [metric, setMetric] = useState<'minutes' | 'pages'>('minutes');
  const { run } = useAction();
  const months = Array.from({ length: 12 }, (_, m) => sessions.filter((s) => s.date.startsWith(`${year}-${String(m + 1).padStart(2, '0')}`)).reduce((a, s) => a + (metric === 'minutes' ? s.minutes : s.pages), 0));
  const max = Math.max(1, ...months);
  const cats = Object.entries(stats.categories).sort((a, b) => b[1] - a[1]);
  const catTotal = cats.reduce((a, [, n]) => a + n, 0) || 1;
  return (
    <div>
      <div className="grid2" style={{ marginBottom: 16 }}>
        <div className="stat"><b>{stats.totalPages}</b><span>累積頁數</span></div>
        <div className="stat"><b>{fmtMinutes(stats.totalMinutes)}</b><span>累積時間</span></div>
        <div className="stat"><b>{stats.finished}</b><span>完成書籍</span></div>
        <div className="stat"><b>{stats.readingDays}</b><span>閱讀天數</span></div>
        <div className="stat"><b>{stats.currentStreak}</b><span>目前連續天數</span></div>
        <div className="stat"><b>{stats.longestStreak}</b><span>最長連續天數</span></div>
      </div>
      <div className="card">
        <div className="row between"><h2 style={{ margin: 0 }}><Icon name="chart" />每月趨勢</h2>
          <div className="row"><button className="btn small" onClick={() => setYear(year - 1)} aria-label="前一年">‹</button><b>{year}</b><button className="btn small" onClick={() => setYear(year + 1)} aria-label="下一年">›</button></div></div>
        <div className="chips" style={{ margin: '10px 0' }}>
          <button className={'chip' + (metric === 'minutes' ? ' on' : '')} onClick={() => setMetric('minutes')}>分鐘</button>
          <button className={'chip' + (metric === 'pages' ? ' on' : '')} onClick={() => setMetric('pages')}>頁數</button>
        </div>
        <div className="bars">
          {months.map((v, i) => <div key={i} className="bar"><b>{v || ''}</b><i style={{ height: `${(v / max) * 100}%` }} /><span>{i + 1}月</span></div>)}
        </div>
      </div>
      <div className="card">
        <h2><Icon name="star" />分類比例</h2>
        {cats.length === 0 ? <p className="muted">有閱讀紀錄或讀完的書後，這裡會顯示分類比例。</p> : (
          <>
            <div style={{ display: 'flex', height: 22, border: '2px solid var(--ink)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
              {cats.map(([c, n]) => <div key={c} title={c} style={{ width: `${(n / catTotal) * 100}%`, background: CATEGORY_COLORS[c] ?? '#999' }} />)}
            </div>
            {cats.map(([c, n]) => <div key={c} className="row small"><span style={{ width: 12, height: 12, background: CATEGORY_COLORS[c] ?? '#999', border: '2px solid var(--ink)' }} />{c}<span className="spacer" />{n} 本 · {Math.round((n / catTotal) * 100)}%</div>)}
          </>
        )}
      </div>
      <div className="card">
        <h2><Icon name="clock" />每日閱讀目標</h2>
        <div className="row wrap">{[10, 20, 30, 45, 60].map((n) => <button key={n} className={'chip' + (goal === n ? ' on' : '')} onClick={() => run(() => db.setKV('settings', 'dailyGoal', n), `每日目標改為 ${n} 分鐘`)}>{n} 分鐘</button>)}</div>
        <p className="muted" style={{ marginBottom: 0 }}>每天第一次達成目標可獲得 10 知識幣。</p>
      </div>
      <Link to="/review" className="btn block"><Icon name="star" />看年度回顧</Link>
    </div>
  );
}
