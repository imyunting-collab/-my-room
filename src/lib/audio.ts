// Shared Web Audio context + the player's sound settings (音效／背景音樂).
// Everything is synthesized in code — no audio files, works offline.
import { db } from '../db/idb';
import { emit } from './bus';

export interface AudioSettings { sfxOn: boolean; sfxVol: number; bgmOn: boolean; bgmVol: number; bgmTrack: 'musicbox' | 'rain' | 'cafe' }
export const DEFAULT_AUDIO: AudioSettings = { sfxOn: true, sfxVol: 0.6, bgmOn: true, bgmVol: 0.35, bgmTrack: 'musicbox' };
export const audioSettings: AudioSettings = { ...DEFAULT_AUDIO };

let ctx: AudioContext | null = null;
let unlocked = false;

export function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
  }
  if (ctx.state === 'suspended' && unlocked) ctx.resume().catch(() => undefined);
  return ctx;
}
/** Browsers only allow sound after the first tap. */
export function unlockAudio() {
  if (unlocked) return false;
  unlocked = true;
  const c = audio();
  c?.resume().catch(() => undefined);
  return true;
}
export function isUnlocked() { return unlocked; }

export async function loadAudioSettings() {
  const s = await db.getKV<Partial<AudioSettings>>('settings', 'audio', {});
  Object.assign(audioSettings, DEFAULT_AUDIO, s);
  emit('audioSettings', { ...audioSettings });
}
export async function saveAudioSettings(patch: Partial<AudioSettings>) {
  Object.assign(audioSettings, patch);
  await db.setKV('settings', 'audio', { ...audioSettings });
  emit('audioSettings', { ...audioSettings });
}
