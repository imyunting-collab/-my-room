// 音效與背景音樂設定
import { useState } from 'react';
import { useBus } from '../hooks';
import { audioSettings, saveAudioSettings, unlockAudio, type AudioSettings } from '../lib/audio';
import { BGM_TRACKS, syncBgm } from '../lib/music';
import { sfx } from '../lib/sound';

export function SoundSettings() {
  const [s, setS] = useState<AudioSettings>({ ...audioSettings });
  useBus<AudioSettings>('audioSettings', setS);
  const set = async (patch: Partial<AudioSettings>) => { unlockAudio(); await saveAudioSettings(patch); syncBgm(); };
  return (
    <div className="card" data-testid="sound-settings">
      <h2>🔊 音效與背景音樂</h2>
      <p className="small">所有聲音都是程式即時產生的，離線也能用。iPhone 開啟靜音模式時可能聽不到。</p>
      <div className="sound-row">
        <label className="switch"><input type="checkbox" checked={s.sfxOn} onChange={(e) => set({ sfxOn: e.target.checked })} data-testid="sfx-toggle" /><span>音效</span></label>
        <input type="range" min={0} max={100} value={Math.round(s.sfxVol * 100)} disabled={!s.sfxOn} aria-label="音效音量"
          onChange={(e) => setS({ ...s, sfxVol: Number(e.target.value) / 100 })} onPointerUp={(e) => { set({ sfxVol: Number((e.target as HTMLInputElement).value) / 100 }).then(() => sfx('pop')); }} onKeyUp={(e) => set({ sfxVol: Number((e.target as HTMLInputElement).value) / 100 })} />
        <button className="btn small" onClick={() => { unlockAudio(); sfx('coin'); }}>試聽</button>
      </div>
      <div className="sound-row">
        <label className="switch"><input type="checkbox" checked={s.bgmOn} onChange={(e) => set({ bgmOn: e.target.checked })} data-testid="bgm-toggle" /><span>背景音樂</span></label>
        <input type="range" min={0} max={100} value={Math.round(s.bgmVol * 100)} disabled={!s.bgmOn} aria-label="背景音樂音量"
          onChange={(e) => setS({ ...s, bgmVol: Number(e.target.value) / 100 })} onPointerUp={(e) => set({ bgmVol: Number((e.target as HTMLInputElement).value) / 100 })} onKeyUp={(e) => set({ bgmVol: Number((e.target as HTMLInputElement).value) / 100 })} />
      </div>
      <div className="chips">
        {(Object.keys(BGM_TRACKS) as (keyof typeof BGM_TRACKS)[]).map((k) => (
          <button key={k} className={'chip' + (s.bgmTrack === k ? ' on' : '')} onClick={() => set({ bgmTrack: k, bgmOn: true })} data-testid={`bgm-${k}`}>🎵 {BGM_TRACKS[k].label}</button>
        ))}
      </div>
      <p className="muted" style={{ marginBottom: 0 }}>房間裡的黑膠唱片機播放時，背景音樂會自動暫停。</p>
    </div>
  );
}
