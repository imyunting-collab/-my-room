import { db } from '../db/idb';
import { useDayPart, useLive } from '../hooks';
import { Link, navigate } from '../router';
import { characterURL } from '../sprites/characters';
import { windowURL } from '../sprites/furniture';
import { useEquip, useGoal, useStats } from '../state';
import { BookCover, Icon, Progress } from '../ui';
import { DAYPART_LABEL, dateKey, daysBetween, fmtMinutes, timeHM } from '../lib/util';
import { plantById } from '../data/catalog';
import { plantStatus } from '../services/life';
import { ACHIEVEMENTS } from '../data/achievements';
import { MoodThermometer } from '../components/MoodThermometer';
import { LongDistanceCard, QuestsCard, WorldStrip } from '../components/HomeCards';

const GREET: Record<string, string> = { dawn: '早安，今天也慢慢來', day: '午安，給自己一點閱讀時間', dusk: '傍晚了，窗外的光好溫柔', night: '晚上好，開一盞桌燈吧', midnight: '夜深了，記得早點休息' };

export default function HomePage() {
  const { part, now } = useDayPart();
  const equip = useEquip('99');
  const { books, stats } = useStats();
  const goal = useGoal();
  const today = dateKey(now);
  const todayMin = stats.minutesByDay[today] ?? 0;
  const rel = useLive(() => db.get('relationship', 'main'), []);
  const visit = useLive(() => db.getKV<{ active: boolean }>('meta', 'visit', { active: false }), [], { active: false });
  const plants = useLive(() => db.all('ownedPlants'), [], []) ?? [];
  const thirsty = plants.filter((p) => p.slot != null && plantById.get(p.defId) && plantStatus(p, plantById.get(p.defId)!, now.getTime()).health !== 'healthy').length;
  const unlocked = useLive(() => db.all('achievements'), [], []) ?? [];
  const reading = books.filter((b) => b.status === 'reading').slice(0, 3);
  const dark = part === 'night' || part === 'midnight';
  const together = rel?.anniversaryDate ? daysBetween(rel.anniversaryDate, today) + 1 : null;
  const latestAch = unlocked.slice().sort((a, b) => b.unlockedAt - a.unlockedAt)[0];

  return (
    <div>
      <div className="hero">
        <img className="sky px" src={windowURL(part, 96, 48)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div className="content-in">
          <div className="who"><img className="px" src={characterURL({ who: '99', pose: part === 'midnight' ? 'read' : 'wave', expr: 'smile', equip })} alt="99" /></div>
          <div className={'greet' + (dark || part === 'dusk' ? ' on-dark' : '')}>
            <div className="clock-big" data-testid="home-clock">{timeHM(now)}</div>
            <b>{GREET[part]}</b>
            <span className="small">{DAYPART_LABEL[part]} · 把喜歡的生活，一點一點住進來。</span>
          </div>
        </div>
      </div>

      <WorldStrip />
      <MoodThermometer />
      <LongDistanceCard />
      <QuestsCard />

      {together != null && together > 0 && (
        <div className="card flat" style={{ background: '#fde9ea' }}>
          <div className="row"><Icon name="heart" size={24} /><div><b>和{rel?.partnerDisplayName ?? '陳卷毛'}在一起第 {together} 天</b><div className="muted">從 {rel!.anniversaryDate} 開始計算</div></div></div>
        </div>
      )}

      <div className="card">
        <h2><Icon name="clock" />今日閱讀</h2>
        <div className="row between small"><span>{fmtMinutes(todayMin)} / 目標 {goal} 分鐘</span><span>{todayMin >= goal ? '🎉 目標達成！' : `還差 ${goal - todayMin} 分鐘`}</span></div>
        <div style={{ margin: '8px 0 12px' }}><Progress value={todayMin / goal} /></div>
        <div className="grid3">
          <div className="stat"><b>{stats.currentStreak}</b><span>連續天數</span></div>
          <div className="stat"><b>{stats.bookCount}</b><span>藏書</span></div>
          <div className="stat"><b>{stats.finished}</b><span>已讀完</span></div>
        </div>
        <button className="btn primary block" style={{ marginTop: 12 }} onClick={() => navigate('/add')}><Icon name="plus" />記錄今天的閱讀</button>
      </div>

      <div className="card">
        <h2><Icon name="book" />正在讀</h2>
        {reading.length === 0 ? <p className="muted">還沒有正在讀的書。到 <Link to="/library">我的書庫</Link> 新增一本吧。</p> : (
          <div className="stack">
            {reading.map((b) => (
              <Link key={b.id} to={`/book/${b.id}`} className="list-item">
                <BookCover book={b} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{b.title}</b>
                  <div className="muted">{b.author || '未知作者'} · {b.totalPages ? `${b.currentPage}/${b.totalPages} 頁` : `${b.currentPage} 頁`}</div>
                  <Progress value={b.totalPages ? b.currentPage / b.totalPages : 0} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid2" style={{ marginBottom: 16 }}>
        <Link to="/room" className="btn block"><Icon name="home" />我的房間</Link>
        <Link to="/phone" className="btn block pink"><Icon name="phone" />打開手機</Link>
        <Link to="/diary" className="btn block"><Icon name="pen" />寫日記</Link>
        <Link to="/balcony" className="btn block"><Icon name="plant" />陽台{thirsty ? `（${thirsty} 盆想喝水）` : ''}</Link>
      </div>

      {visit?.active && <div className="card flat" style={{ background: '#fde9ea' }}><b>💗 陳卷毛正在你家</b><div className="muted">回到房間可以一起吃飯、看書、抱抱。</div><Link to="/room" className="btn small pink" >回房間</Link></div>}

      <div className="card">
        <h2><Icon name="trophy" />成就</h2>
        <p className="small" style={{ margin: 0 }}>已解鎖 {unlocked.length} / {ACHIEVEMENTS.length}{latestAch ? `，最新：「${ACHIEVEMENTS.find((a) => a.id === latestAch.id)?.name}」` : ''}</p>
        <div className="row" style={{ marginTop: 10 }}><Link to="/achievements" className="btn small">查看成就</Link><Link to="/stats" className="btn small">閱讀統計</Link><Link to="/review" className="btn small">年度回顧</Link></div>
      </div>
    </div>
  );
}
