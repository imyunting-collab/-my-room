// 首頁：遠距離雙時鐘＋見面倒數、本週雙人任務、天氣節日
import { useEffect, useState } from 'react';
import { useLive } from '../hooks';
import { activeFestivals, FESTIVAL_INFO, getLD, getWeather, saveLD, seasonOf, SEASON_LABEL, timeIn, TIMEZONES, WEATHER_LABEL, type LDSettings } from '../services/world';
import { claimQuest, questStates } from '../services/progress';
import { deliverLines } from '../services/love';
import { Field, Progress, Sheet, useAction } from '../ui';
import { dateKey, daysBetween } from '../lib/util';
import { toast } from '../lib/bus';
import { sfx } from '../lib/sound';

const dayIcon = (h: number) => (h >= 6 && h < 17 ? '☀️' : h >= 17 && h < 19 ? '🌇' : '🌙');
const tzLabel = (tz: string) => TIMEZONES.find((t) => t[0] === tz)?.[1] ?? tz.split('/').pop()?.replace('_', ' ') ?? tz;

export function LongDistanceCard() {
  const ld = useLive(getLD, [], null);
  const [now, setNow] = useState(new Date());
  const [edit, setEdit] = useState<LDSettings | null>(null);
  const { run } = useAction();
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 20000); return () => clearInterval(t); }, []);
  if (!ld) return null;
  const myTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Taipei';
  const me = timeIn(myTz, now), him = timeIn(ld.partnerTz, now);
  const today = dateKey(now);
  const left = ld.nextMeet ? daysBetween(today, ld.nextMeet) : null;
  const hoursLeft = ld.nextMeet && left === 0 ? null : ld.nextMeet ? Math.max(0, Math.round((new Date(ld.nextMeet + 'T00:00:00').getTime() - now.getTime()) / 3600000)) : null;
  return (
    <div className="card ld-card" data-testid="ld-card">
      <div className="row between"><h2>🌏 遠距離</h2><button className="btn small ghost" onClick={() => setEdit({ ...ld })} data-testid="ld-edit">設定</button></div>
      <div className="ld-clocks">
        <div className="ld-clock"><span className="small">{dayIcon(me.hour)} 妳那邊・{tzLabel(myTz)}</span><b data-testid="clock-me">{me.hm}</b><span className="small muted">{me.date}（{me.weekday}）</span></div>
        <div className="ld-heart">♥</div>
        <div className="ld-clock"><span className="small">{dayIcon(him.hour)} 他那邊・{ld.partnerCity || tzLabel(ld.partnerTz)}</span><b data-testid="clock-him">{him.hm}</b><span className="small muted">{him.date}（{him.weekday}）</span></div>
      </div>
      {ld.partnerTz === myTz && !ld.partnerCity && <p className="small muted" style={{ margin: '0 0 8px', textAlign: 'center' }}>按「設定」選他所在的時區，兩邊的時間就會分開顯示。</p>}
      {left == null ? <button className="btn block small" onClick={() => setEdit({ ...ld })}>📅 設定下次見面的日期</button>
        : left > 0 ? <div className="ld-count" data-testid="meet-countdown">距離下次見面還有 <b>{left}</b> 天{hoursLeft != null && left <= 2 ? `（約 ${hoursLeft} 小時）` : ''}</div>
          : left === 0 ? <div className="ld-count today" data-testid="meet-countdown">🧳 就是今天！房間已經佈置好了 ♥</div>
            : <div className="ld-count" data-testid="meet-countdown">上次見面是 {-left} 天前・<button className="btn small ghost" onClick={() => setEdit({ ...ld, nextMeet: '' })}>設定下一次</button></div>}
      <Sheet open={!!edit} onClose={() => setEdit(null)} title="遠距離設定">
        {edit && (
          <form className="stack" onSubmit={(e) => { e.preventDefault(); run(async () => { await saveLD(edit); setEdit(null); }, '存好了'); }}>
            <Field label="他在哪個時區？"><select value={edit.partnerTz} onChange={(e) => setEdit({ ...edit, partnerTz: e.target.value })} data-testid="ld-tz">
              {!TIMEZONES.some((t) => t[0] === edit.partnerTz) && <option value={edit.partnerTz}>{edit.partnerTz}</option>}
              {TIMEZONES.map(([tz, l]) => <option key={tz} value={tz}>{l}</option>)}
            </select></Field>
            <Field label="他的城市（顯示用，選填）"><input value={edit.partnerCity} onChange={(e) => setEdit({ ...edit, partnerCity: e.target.value })} placeholder="例如：墨爾本" /></Field>
            <Field label="下次見面的日期"><input type="date" value={edit.nextMeet} onChange={(e) => setEdit({ ...edit, nextMeet: e.target.value })} data-testid="ld-meet" /></Field>
            <div className="grid2">
              <Field label="99 的生日"><input type="date" value={edit.myBirthday ? `2000-${edit.myBirthday}` : ''} onChange={(e) => setEdit({ ...edit, myBirthday: e.target.value.slice(5) })} /></Field>
              <Field label="陳卷毛的生日"><input type="date" value={edit.partnerBirthday ? `2000-${edit.partnerBirthday}` : ''} onChange={(e) => setEdit({ ...edit, partnerBirthday: e.target.value.slice(5) })} /></Field>
            </div>
            <p className="small muted" style={{ margin: 0 }}>生日和見面日當天，房間會自動出現小佈置（只看月和日）。</p>
            <button className="btn primary" data-testid="ld-save">儲存</button>
          </form>
        )}
      </Sheet>
    </div>
  );
}

export function QuestsCard() {
  const qs = useLive(() => questStates(), [], []) ?? [];
  const { run } = useAction();
  if (!qs.length) return null;
  return (
    <div className="card" data-testid="quests-card">
      <h2>💞 本週雙人任務</h2>
      <p className="small muted" style={{ marginTop: 0 }}>每週一換三個任務。完成後可以領雙人家具或解鎖新的對話。</p>
      <div className="stack" style={{ gap: 10 }}>
        {qs.map((q) => (
          <div key={q.def.id} className="quest" data-testid={`quest-${q.def.id}`}>
            <div className="row between"><b className="small">{q.def.title}</b><span className="small">{Math.min(q.value, q.def.goal)} / {q.def.goal} {q.def.unit}</span></div>
            <Progress value={q.value / q.def.goal} />
            <div className="row between"><span className="small muted">🎁 {q.def.rewardText}</span>
              {q.claimed ? <span className="small">✓ 已領取</span> : <button className="btn small pink" disabled={!q.done} onClick={() => run(async () => {
                const d = await claimQuest(q.def.id); sfx('chime');
                toast(`🎉 完成「${d.title}」！獎勵：${d.rewardText}`, 'love');
                deliverLines([{ text: `我們完成「${d.title}」了！`, emotion: 'happy' }, { text: d.reward.furniture ? '獎勵放在妳的收納箱了，擺出來給我看～' : '我想到新的話題想跟妳聊了 💞', emotion: 'smile' }], 'quest', 1000).catch(() => undefined);
              })} data-testid="quest-claim">{q.done ? '領取' : '進行中'}</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorldStrip() {
  const w = useLive(() => getWeather(), [], 'sunny') ?? 'sunny';
  const fest = useLive(() => activeFestivals(), [], []) ?? [];
  return (
    <div className="world-strip" data-testid="world-strip">
      <span>{WEATHER_LABEL[w].emoji} 今天{WEATHER_LABEL[w].label}{w === 'rain' ? '・陽台植物自動澆到水' : ''}</span>
      <span>{SEASON_LABEL[seasonOf()]}{fest.length ? `・${fest.map((f) => `${FESTIVAL_INFO[f].emoji} ${FESTIVAL_INFO[f].name}`).join('・')}` : ''}</span>
    </div>
  );
}
