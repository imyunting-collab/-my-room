// A tiny generated lo-fi loop for the record player (Web Audio, no audio files, works offline).
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let crackle: AudioBufferSourceNode | null = null;
let step = 0;
let nextTime = 0;

const BPM = 76;
const STEP = 60 / BPM / 2; // eighth notes
// Fmaj7 → Em7 → Dm7 → Cmaj7, two bars each (MIDI notes)
const CHORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
const MELODY = [72, -1, 69, 67, -1, 64, 65, -1, 71, -1, 67, 64, -1, 62, 64, -1, 69, -1, 65, 64, -1, 62, 60, -1, 67, -1, 64, 62, -1, 60, 59, -1];
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function tone(freq: number, t: number, dur: number, gain: number, type: OscillatorType) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function schedule() {
  if (!ctx) return;
  while (nextTime < ctx.currentTime + 0.25) {
    const bar = Math.floor(step / 8), chord = CHORDS[Math.floor(bar / 2) % CHORDS.length];
    const s8 = step % 8;
    if (s8 === 0) { chord.forEach((n) => tone(hz(n), nextTime, STEP * 7.5, 0.035, 'triangle')); tone(hz(chord[0] - 12), nextTime, STEP * 3, 0.07, 'sine'); }
    if (s8 === 4) tone(hz(chord[0] - 12), nextTime, STEP * 3, 0.05, 'sine');
    const m = MELODY[step % MELODY.length];
    if (m > 0) tone(hz(m), nextTime, STEP * 1.8, 0.045, 'sine');
    nextTime += STEP * (s8 % 2 ? 0.92 : 1.08); // a little swing
    step++;
  }
}

export function isPlaying() { return timer !== null; }

export function playMusic() {
  if (timer) return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = ctx ?? new AC();
  ctx.resume().catch(() => undefined);
  master = ctx.createGain(); master.gain.value = 0.9;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
  master.connect(lp).connect(ctx.destination);
  // vinyl crackle
  const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() < 0.0015 ? (Math.random() * 2 - 1) * 0.6 : (Math.random() * 2 - 1) * 0.01;
  crackle = ctx.createBufferSource(); crackle.buffer = buf; crackle.loop = true;
  const cg = ctx.createGain(); cg.gain.value = 0.25; crackle.connect(cg).connect(lp); crackle.start();
  step = 0; nextTime = ctx.currentTime + 0.05;
  schedule();
  timer = setInterval(schedule, 100);
}

export function stopMusic() {
  if (timer) { clearInterval(timer); timer = null; }
  try { crackle?.stop(); } catch { /* already stopped */ }
  crackle = null;
  if (master && ctx) { const m = master; m.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08); setTimeout(() => m.disconnect(), 400); }
  master = null;
}
