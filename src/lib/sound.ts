// Little synthesized sound effects (pop, coin, brew, meow…).
import type { SfxName } from '../data/catalog';
import { audio, audioSettings } from './audio';

type Wave = OscillatorType;
function tone(c: AudioContext, out: AudioNode, f0: number, f1: number, t: number, dur: number, gain: number, wave: Wave = 'sine') {
  const o = c.createOscillator(), g = c.createGain();
  o.type = wave;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.02, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + dur + 0.05);
}
let noiseBuf: AudioBuffer | null = null;
function noise(c: AudioContext, out: AudioNode, t: number, dur: number, gain: number, freq = 1200, q = 0.8, type: BiquadFilterType = 'bandpass') {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
const N = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

const SFX: Record<SfxName, (c: AudioContext, o: AudioNode, t: number) => void> = {
  tap: (c, o, t) => tone(c, o, 1400, 900, t, 0.05, 0.12, 'triangle'),
  pop: (c, o, t) => tone(c, o, 300, 900, t, 0.09, 0.3, 'sine'),
  coin: (c, o, t) => { tone(c, o, N(88), N(88), t, 0.08, 0.18, 'square'); tone(c, o, N(93), N(93), t + 0.08, 0.25, 0.18, 'square'); },
  squeak: (c, o, t) => { tone(c, o, 900, 1600, t, 0.12, 0.2, 'sine'); tone(c, o, 1500, 1100, t + 0.12, 0.1, 0.15, 'sine'); },
  brew: (c, o, t) => { noise(c, o, t, 1.2, 0.18, 600, 0.6); for (let i = 0; i < 5; i++) tone(c, o, 500 + Math.random() * 300, 300, t + 0.2 + i * 0.18, 0.08, 0.08, 'sine'); },
  water: (c, o, t) => { noise(c, o, t, 0.9, 0.22, 2400, 0.7); for (let i = 0; i < 4; i++) tone(c, o, 900 + i * 120, 1500 + i * 100, t + i * 0.15, 0.06, 0.07, 'sine'); },
  ding: (c, o, t) => { tone(c, o, N(84), N(84), t, 1.0, 0.25, 'sine'); tone(c, o, N(96), N(96), t, 0.6, 0.06, 'sine'); },
  chime: (c, o, t) => { [76, 79, 83, 88, 84].forEach((m, i) => tone(c, o, N(m), N(m), t + i * 0.16, 0.7, 0.13, 'sine')); },
  meow: (c, o, t) => { tone(c, o, 520, 820, t, 0.18, 0.18, 'triangle'); tone(c, o, 820, 480, t + 0.18, 0.3, 0.16, 'triangle'); },
  woof: (c, o, t) => { tone(c, o, 260, 180, t, 0.12, 0.3, 'sawtooth'); tone(c, o, 300, 200, t + 0.2, 0.12, 0.25, 'sawtooth'); },
  bubble: (c, o, t) => { for (let i = 0; i < 4; i++) tone(c, o, 300 + i * 90, 900 + i * 120, t + i * 0.11, 0.07, 0.14, 'sine'); },
  clink: (c, o, t) => { tone(c, o, 2400, 2400, t, 0.15, 0.1, 'sine'); tone(c, o, 3100, 3100, t + 0.07, 0.15, 0.08, 'sine'); },
  clang: (c, o, t) => { tone(c, o, 620, 600, t, 0.6, 0.14, 'square'); tone(c, o, 1240, 1200, t, 0.4, 0.06, 'triangle'); },
  sizzle: (c, o, t) => noise(c, o, t, 1.3, 0.16, 5000, 0.4, 'highpass'),
  whirr: (c, o, t) => { tone(c, o, 120, 180, t, 1.2, 0.12, 'sawtooth'); noise(c, o, t, 1.2, 0.05, 800, 1); },
  tweet: (c, o, t) => { for (let i = 0; i < 3; i++) tone(c, o, 2200, 3200, t + i * 0.16, 0.08, 0.12, 'sine'); },
  twinkle: (c, o, t) => { [84, 88, 91, 96].forEach((m, i) => tone(c, o, N(m), N(m), t + i * 0.09, 0.4, 0.08, 'triangle')); },
  shutter: (c, o, t) => { noise(c, o, t, 0.05, 0.4, 3000, 1); noise(c, o, t + 0.08, 0.06, 0.3, 2000, 1); },
  paper: (c, o, t) => noise(c, o, t, 0.35, 0.2, 3500, 0.5),
  gacha: (c, o, t) => { for (let i = 0; i < 6; i++) tone(c, o, 600, 650, t + i * 0.07, 0.05, 0.1, 'square'); tone(c, o, N(84), N(91), t + 0.5, 0.3, 0.15, 'triangle'); },
  kiss: (c, o, t) => { tone(c, o, 1800, 600, t, 0.08, 0.2, 'sine'); },
  hug: (c, o, t) => { tone(c, o, N(67), N(67), t, 0.4, 0.1, 'triangle'); tone(c, o, N(71), N(71), t + 0.12, 0.4, 0.1, 'triangle'); tone(c, o, N(74), N(74), t + 0.24, 0.5, 0.1, 'triangle'); },
  message: (c, o, t) => { tone(c, o, N(81), N(81), t, 0.12, 0.14, 'sine'); tone(c, o, N(88), N(88), t + 0.1, 0.25, 0.14, 'sine'); },
  door: (c, o, t) => { tone(c, o, 140, 90, t, 0.18, 0.3, 'sine'); tone(c, o, 160, 100, t + 0.22, 0.18, 0.25, 'sine'); },
  page: (c, o, t) => noise(c, o, t, 0.25, 0.18, 2500, 0.6),
  switch: (c, o, t) => tone(c, o, 1800, 1800, t, 0.03, 0.15, 'square'),
  boil: (c, o, t) => { noise(c, o, t, 1.2, 0.12, 900, 0.7); tone(c, o, N(91), N(91), t + 1.0, 0.4, 0.06, 'sine'); },
  sparkle: (c, o, t) => { [88, 93, 100].forEach((m, i) => tone(c, o, N(m), N(m), t + i * 0.06, 0.3, 0.06, 'sine')); },
};

/** Play a sound effect (respects the 音效 setting). */
export function sfx(name?: SfxName) {
  if (!name || !audioSettings.sfxOn || audioSettings.sfxVol <= 0) return;
  const c = audio();
  if (!c || c.state !== 'running') return;
  const out = c.createGain();
  out.gain.value = audioSettings.sfxVol;
  out.connect(c.destination);
  try { SFX[name](c, out, c.currentTime + 0.01); } catch { /* ignore */ }
  setTimeout(() => out.disconnect(), 2500);
}
