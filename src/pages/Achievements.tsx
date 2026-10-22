import { useEffect, useState } from 'react';
import { db } from '../db/idb';
import { useLive } from '../hooks';
import { ACHIEVEMENTS, type AchievementContext } from '../data/achievements';
import { achievementContext } from '../services/reading';
import { Icon, Progress } from '../ui';

export default function AchievementsPage() {
  const unlocked = useLive(() => db.all('achievements'), [], []) ?? [];
  const [ctx, setCtx] = useState<AchievementContext | null>(null);
  useEffect(() => { achievementContext().then(setCtx); }, [unlocked.length]);
  const done = new Map(unlocked.map((a) => [a.id, a.unlockedAt]));
  return (
    <div>
      <p className="muted">已解鎖 {unlocked.length} / {ACHIEVEMENTS.length}。成就獎勵只會發放一次，部分家具、衣服與植物需要成就才能解鎖。</p>
      <div className="card">
        {ACHIEVEMENTS.map((a) => {
          const [cur, target] = ctx ? a.progress(ctx) : [0, 1];
          const at = done.get(a.id);
          return (
            <div key={a.id} className="list-item" style={{ cursor: 'default', opacity: at ? 1 : 0.8 }}>
              <div style={{ width: 44, height: 44, border: '2px solid var(--ink)', borderRadius: 8, display: 'grid', placeItems: 'center', background: at ? '#fff3c8' : 'var(--cream-2)', filter: at ? 'none' : 'grayscale(1)' }}><Icon name={a.icon} size={26} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between"><b>{a.name}</b><span className="small"><Icon name="coin" size={14} /> {a.reward}</span></div>
                <div className="muted">{a.desc}{at ? ` · ${new Date(at).toLocaleDateString('zh-TW')} 解鎖` : ''}</div>
                {!at && <div className="row small"><Progress value={cur / target} /><span style={{ whiteSpace: 'nowrap' }}>{Math.min(cur, target)}/{target}</span></div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
