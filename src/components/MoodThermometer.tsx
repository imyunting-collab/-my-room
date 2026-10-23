// 今日心情溫度計：0–100°，陳卷毛會依照溫度回訊息。
import { useEffect, useState } from 'react';
import { useLive } from '../hooks';
import { getTodayMood, moodHistory, moodLevel, MOOD_STEPS, setTodayMood } from '../services/love';
import { sfx } from '../lib/sound';
import { toast } from '../lib/bus';

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

export function MoodThermometer() {
  const saved = useLive(() => getTodayMood(), [], null);
  const hist = useLive(() => moodHistory(7), [saved?.temp], []) ?? [];
  const [temp, setTemp] = useState<number | null>(null);
  useEffect(() => { if (saved) setTemp(saved.temp); }, [saved?.temp]);
  const t = temp ?? 50;
  const step = MOOD_STEPS[moodLevel(t)];
  const commit = async (v: number) => {
    setTemp(v);
    await setTodayMood(v);
    sfx('sparkle');
    if (!saved || moodLevel(saved.temp) !== moodLevel(v)) toast(`今日心情：${MOOD_STEPS[moodLevel(v)].emoji} ${MOOD_STEPS[moodLevel(v)].label}（${v}°）`, 'love');
  };

  return (
    <div className="card mood-card" data-testid="mood-thermo">
      <h2>🌡️ 今日心情溫度計</h2>
      <div className="mood-body">
        <div className="thermo" aria-hidden="true">
          <div className="thermo-tube"><div className="thermo-fill" style={{ height: `${temp == null ? 0 : Math.max(6, t)}%`, background: step.color }} /></div>
          <div className="thermo-bulb" style={{ background: temp == null ? '#e9dcc0' : step.color }} />
          {[0, 25, 50, 75, 100].map((m) => <span key={m} className="thermo-tick" style={{ bottom: `calc(22px + (100% - 22px) * ${m / 100})` }}>{m}</span>)}
        </div>
        <div className="mood-right">
          <div className="mood-now">
            {temp == null ? <span className="muted">今天的心情幾度呢？點一個，陳卷毛會看到。</span>
              : <><span className="mood-emoji">{step.emoji}</span><b data-testid="mood-temp">{t}°</b><span>{step.label}</span></>}
          </div>
          <input type="range" min={0} max={100} value={t} aria-label="心情溫度" data-testid="mood-range"
            onChange={(e) => setTemp(Number(e.target.value))}
            onPointerUp={(e) => commit(Number((e.target as HTMLInputElement).value))}
            onKeyUp={(e) => commit(Number((e.target as HTMLInputElement).value))} />
          <div className="mood-steps">
            {MOOD_STEPS.map((m) => (
              <button key={m.level} className={'chip' + (temp != null && moodLevel(t) === m.level ? ' on' : '')} onClick={() => commit(m.level * 20 + 10)} data-testid={`mood-${m.level}`}>
                {m.emoji}<span>{m.label}</span>
              </button>
            ))}
          </div>
          {hist.some((h) => h.temp != null) && (
            <div className="mood-week" aria-label="這週的心情">
              {hist.map((h) => {
                const d = new Date(h.day + 'T00:00:00');
                return (
                  <div key={h.day} title={h.temp == null ? '沒有紀錄' : `${h.temp}°`}>
                    <i style={{ height: h.temp == null ? 2 : Math.max(4, h.temp * 0.32), background: h.temp == null ? '#e9dcc0' : MOOD_STEPS[moodLevel(h.temp)].color }} />
                    <span>{WEEK[d.getDay()]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
