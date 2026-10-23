// Generated music loops: the record player (lo-fi) and the background music (音樂盒／雨天／咖啡廳).
import { audio, audioSettings, isUnlocked } from './audio';

interface Track {
  bpm: number;
  chords: number[][];       // MIDI, two bars each
  melody: number[];         // -1 = rest, one per eighth note
  lead: OscillatorType;
  pad: OscillatorType;
  leadGain: number; padGain: number; bassGain: number;
  crackle?: number;         // vinyl noise
  rain?: number;            // rain noise
  lowpass: number;
  swing?: boolean;
}

const LOFI: Track = {
  bpm: 76, chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]],
  melody: [72, -1, 69, 67, -1, 64, 65, -1, 71, -1, 67, 64, -1, 62, 64, -1, 69, -1, 65, 64, -1, 62, 60, -1, 67, -1, 64, 62, -1, 60, 59, -1],
  lead: 'sine', pad: 'triangle', leadGain: 0.045, padGain: 0.035, bassGain: 0.07, crackle: 0.25, lowpass: 2200, swing: true,
};
const MUSICBOX: Track = {
  bpm: 64, chords: [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59]],
  melody: [76, 79, 84, -1, 83, 79, 76, -1, 74, 76, 79, -1, 76, 72, -1, -1, 72, 76, 81, -1, 79, 76, 72, -1, 74, 79, 83, -1, 79, 74, -1, -1],
  lead: 'triangle', pad: 'sine', leadGain: 0.05, padGain: 0.02, bassGain: 0.035, lowpass: 3800,
};
const RAIN: Track = {
  bpm: 58, chords: [[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [45, 52, 57, 60]],
  melody: [74, -1, -1, 72, -1, 69, -1, -1, 70, -1, -1, 69, -1, 65, -1, -1, 72, -1, -1, 69, -1, 67, -1, -1, 69, -1, 64, -1, -1, -1, -1, -1],
  lead: 'sine', pad: 'triangle', leadGain: 0.04, padGain: 0.03, bassGain: 0.04, rain: 0.22, lowpass: 2000,
};
const CAFE: Track = {
  bpm: 84, chords: [[50, 53, 57, 60], [43, 53, 55, 59], [48, 52, 55, 59], [45, 52, 55, 60]],
  melody: [74, 72, -1, 69, 72, -1, 74, -1, 77, -1, 76, 74, 72, -1, -1, -1, 71, 72, -1, 74, -1, 71, 67, -1, 69, -1, 72, -1, 71, 69, -1, -1],
  lead: 'triangle', pad: 'sine', leadGain: 0.04, padGain: 0.035, bassGain: 0.07, crackle: 0.12, lowpass: 2600, swing: true,
};
export const BGM_TRACKS = { musicbox: { label: '音樂盒', track: MUSICBOX }, rain: { label: '雨天鋼琴', track: RAIN }, cafe: { label: '咖啡廳爵士', track: CAFE } } as const;

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class Loop {
  private timer: ReturnType<typeof setInterval> | null = null;
  private master: GainNode | null = null;
  private noiseSrc: AudioBufferSourceNode | null = null;
  private step = 0;
  private next = 0;
  constructor(private track: Track, private volume: () => number) {}
  get playing() { return this.timer !== null; }
  setTrack(t: Track) { const was = this.playing; if (was) this.stop(); this.track = t; if (was) this.start(); }
  refreshVolume() { if (this.master) this.master.gain.value = this.volume(); }

  private tone(c: AudioContext, f: number, t: number, dur: number, gain: number, type: OscillatorType) {
    if (!this.master) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  private tick = () => {
    const c = audio(); if (!c) return;
    const T = this.track, STEP = 60 / T.bpm / 2;
    while (this.next < c.currentTime + 0.25) {
      const bar = Math.floor(this.step / 8), chord = T.chords[Math.floor(bar / 2) % T.chords.length];
      const s8 = this.step % 8;
      if (s8 === 0) { chord.forEach((n) => this.tone(c, hz(n), this.next, STEP * 7.5, T.padGain, T.pad)); this.tone(c, hz(chord[0] - 12), this.next, STEP * 3, T.bassGain, 'sine'); }
      if (s8 === 4) this.tone(c, hz(chord[0] - 12), this.next, STEP * 3, T.bassGain * 0.7, 'sine');
      const m = T.melody[this.step % T.melody.length];
      if (m > 0) this.tone(c, hz(m), this.next, STEP * 1.8, T.leadGain, T.lead);
      this.next += STEP * (T.swing ? (s8 % 2 ? 0.92 : 1.08) : 1);
      this.step++;
    }
  };
  start() {
    if (this.timer) return;
    const c = audio(); if (!c) return;
    this.master = c.createGain(); this.master.gain.value = this.volume();
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = this.track.lowpass;
    this.master.connect(lp).connect(c.destination);
    const amount = this.track.crackle ?? this.track.rain ?? 0;
    if (amount) {
      const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      const rain = !!this.track.rain;
      for (let i = 0; i < len; i++) d[i] = rain ? (Math.random() * 2 - 1) * 0.12 : Math.random() < 0.0015 ? (Math.random() * 2 - 1) * 0.6 : (Math.random() * 2 - 1) * 0.01;
      this.noiseSrc = c.createBufferSource(); this.noiseSrc.buffer = buf; this.noiseSrc.loop = true;
      const ng = c.createGain(); ng.gain.value = amount;
      let node: AudioNode = this.noiseSrc;
      if (rain) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400; node = this.noiseSrc.connect(f); }
      node.connect(ng).connect(this.master);
      this.noiseSrc.start();
    }
    this.step = 0; this.next = c.currentTime + 0.05;
    this.tick();
    this.timer = setInterval(this.tick, 100);
  }
  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    try { this.noiseSrc?.stop(); } catch { /* already stopped */ }
    this.noiseSrc = null;
    const c = audio();
    if (this.master && c) { const m = this.master; m.gain.setTargetAtTime(0.0001, c.currentTime, 0.08); setTimeout(() => m.disconnect(), 400); }
    this.master = null;
  }
}

// record player: an in-game sound, so it follows the 音效 setting
const record = new Loop(LOFI, () => (audioSettings.sfxOn ? 0.5 + audioSettings.sfxVol * 0.6 : 0));
const bgm = new Loop(BGM_TRACKS[audioSettings.bgmTrack]?.track ?? MUSICBOX, () => audioSettings.bgmVol * 0.9);

export function isPlaying() { return record.playing; }
export function playMusic() { bgm.stop(); record.start(); }
export function stopMusic() { record.stop(); syncBgm(); }

/** Start / stop / retune the background music to match the settings. */
export function syncBgm() {
  bgm.setTrack(BGM_TRACKS[audioSettings.bgmTrack]?.track ?? MUSICBOX);
  record.refreshVolume();
  const want = audioSettings.bgmOn && audioSettings.bgmVol > 0 && isUnlocked() && !record.playing && document.visibilityState !== 'hidden';
  if (want && !bgm.playing) bgm.start();
  else if (!want && bgm.playing) bgm.stop();
  else bgm.refreshVolume();
}
