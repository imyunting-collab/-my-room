// Pixel art for the living world: the tuxedo cat, festival decorations, desk details.
import { sprite } from './pixel';
import type { Festival } from '../services/world';

const BLK = '#2a2629', BLK2 = '#3d383c', WHT = '#f7f4ee', EYE = '#9cd36a', NOSE = '#f2a0a8';

export type CatPose = 'sit' | 'walk1' | 'walk2' | 'sleep' | 'eat' | 'happy';
/** 黑白賓士貓, facing right (flip with CSS). 22×16. */
export function catURL(pose: CatPose, blink = false): string {
  return sprite(`cat|${pose}|${blink ? 1 : 0}`, 22, 16, (p) => {
    const eyes = (x: number, y: number) => {
      if (blink || pose === 'happy') { p.r(x, y, 2, 1, '#151214'); p.r(x + 4, y, 2, 1, '#151214'); return; }
      p.r(x, y, 2, 2, EYE); p.p(x + 1, y + 1, '#151214'); p.r(x + 4, y, 2, 2, EYE); p.p(x + 5, y + 1, '#151214');
    };
    const head = (x: number, y: number) => {
      p.p(x, y, BLK); p.r(x, y + 1, 2, 1, BLK); p.p(x + 7, y, BLK); p.r(x + 6, y + 1, 2, 1, BLK);
      p.p(x + 1, y + 1, NOSE); p.p(x + 6, y + 1, NOSE);
      p.r(x, y + 2, 8, 6, BLK); p.r(x + 2, y + 5, 4, 3, WHT); p.r(x + 3, y + 3, 2, 2, WHT);
      eyes(x + 1, y + 3); p.p(x + 3, y + 5, NOSE); p.p(x + 4, y + 5, NOSE);
      p.p(x - 1, y + 6, '#bdb6ad'); p.p(x + 8, y + 6, '#bdb6ad');
    };
    switch (pose) {
      case 'sit': case 'happy':
        p.r(1, 9, 2, 5, BLK); p.r(2, 7, 2, 2, BLK); p.p(3, 6, BLK);
        p.rows([[7, 6, 13], [8, 5, 14], [9, 4, 15], [10, 4, 15], [11, 4, 15], [12, 4, 15], [13, 4, 15], [14, 4, 15]], BLK);
        p.r(10, 8, 4, 6, WHT); p.r(3, 15, 13, 1, BLK); p.r(9, 14, 2, 2, WHT); p.r(12, 14, 2, 2, WHT);
        head(10, 0);
        if (pose === 'happy') { p.p(20, 1, '#e05c6e'); p.r(19, 2, 3, 1, '#e05c6e'); p.p(20, 3, '#e05c6e'); }
        break;
      case 'walk1': case 'walk2': {
        const a = pose === 'walk1';
        p.r(0, 3, 2, 2, BLK); p.r(1, 5, 2, 3, BLK); p.r(2, 7, 2, 2, BLK);
        p.r(3, 7, 12, 5, BLK); p.r(6, 11, 8, 1, WHT);
        p.r(a ? 4 : 5, 12, 2, 4, BLK); p.r(a ? 12 : 13, 12, 2, 4, WHT); p.r(a ? 7 : 6, 12, 2, 3, WHT); p.r(a ? 14 : 11, 12, 2, 3, BLK);
        p.r(a ? 4 : 5, 15, 2, 1, WHT);
        head(13, 2);
        break;
      }
      case 'sleep':
        p.rows([[8, 6, 15], [9, 4, 17], [10, 3, 18], [11, 2, 19], [12, 2, 19], [13, 2, 19], [14, 3, 18], [15, 5, 16]], BLK);
        p.r(8, 12, 7, 3, WHT); p.r(2, 13, 6, 2, BLK2); p.r(1, 12, 2, 2, BLK);
        p.p(14, 7, BLK); p.p(19, 7, BLK); p.r(14, 8, 6, 4, BLK); p.r(15, 10, 4, 2, WHT); p.r(15, 9, 2, 1, '#151214'); p.r(18, 9, 1, 1, '#151214');
        break;
      case 'eat':
        p.r(0, 4, 2, 2, BLK); p.r(1, 6, 2, 3, BLK);
        p.r(3, 7, 11, 5, BLK); p.r(6, 11, 7, 1, WHT); p.r(4, 12, 2, 4, BLK); p.r(11, 12, 2, 4, WHT); p.r(4, 15, 2, 1, WHT);
        head(13, 7);
        break;
    }
  });
}
/** little book the cat sleeps on */
export function catBookURL(color: string): string {
  return sprite(`catbook|${color}`, 20, 5, (p) => { p.r(0, 0, 20, 4, color); p.r(0, 1, 20, 1, '#fbf7ef'); p.r(0, 2, 20, 1, '#efe5d3'); p.r(19, 0, 1, 4, '#fbf7ef'); p.r(0, 4, 20, 1, '#5e3c27'); });
}
export function bowlURL(full: boolean): string {
  return sprite(`bowl|${full ? 1 : 0}`, 10, 5, (p) => { p.r(0, 1, 10, 4, '#e8b8b2'); p.r(1, 4, 8, 1, '#c98d86'); if (full) { p.r(1, 0, 8, 2, '#d99865'); p.p(3, 0, '#f3c46b'); } else p.r(1, 1, 8, 1, '#f6e9e6'); });
}

// ───────── desk details ─────────
export function dustURL(level: number, w: number): string {
  return sprite(`dust|${level}|${w}`, w, 8, (p) => {
    const n = level * 7;
    for (let i = 0; i < n; i++) { const x = (i * 37) % (w - 2) + 1, y = (i * 13) % 3; p.p(x, y + 2, i % 3 ? '#cfc6b8' : '#b9b0a2'); }
    if (level >= 2) { p.line(w - 1, 0, w - 7, 6, '#d8d2c8'); p.line(w - 1, 3, w - 5, 0, '#d8d2c8'); p.line(w - 4, 0, w - 4, 4, '#d8d2c8'); }
    if (level >= 3) { p.line(0, 0, 6, 6, '#d8d2c8'); p.line(0, 4, 5, 0, '#d8d2c8'); }
  }, { outline: false });
}
export function coffeeURL(): string {
  return sprite('deskcoffee', 9, 9, (p) => { p.r(0, 2, 7, 7, '#fbf7ef'); p.r(1, 2, 5, 2, '#6b4433'); p.r(7, 4, 2, 3, '#fbf7ef'); p.r(2, 5, 3, 2, '#e8b8b2'); p.p(2, 0, '#d8d2c8'); p.p(4, 1, '#d8d2c8'); });
}
export function notesURL(): string {
  return sprite('desknotes', 12, 8, (p) => { p.r(0, 3, 9, 5, '#f6e27a'); p.r(2, 1, 9, 5, '#f2b8c6'); p.r(3, 0, 9, 5, '#9cd3e0'); p.r(4, 2, 6, 1, '#5d7fa6'); p.r(4, 3, 4, 1, '#5d7fa6'); });
}

// ───────── festival decorations ─────────
export function buntingURL(colors: string[], w = 192): string {
  return sprite(`bunting|${colors.join()}|${w}`, w, 14, (p) => {
    for (let x = 0; x < w; x++) p.p(x, 1 + Math.round(3 * Math.sin((x / w) * Math.PI)), '#7a5235');
    for (let i = 0, x = 4; x < w - 8; x += 12, i++) {
      const y = 2 + Math.round(3 * Math.sin((x / w) * Math.PI));
      p.rows([[y, x, x + 7], [y + 1, x + 1, x + 6], [y + 2, x + 1, x + 6], [y + 3, x + 2, x + 5], [y + 4, x + 2, x + 5], [y + 5, x + 3, x + 4], [y + 6, x + 3, x + 4]], colors[i % colors.length]);
    }
  }, { outline: false });
}
export function garlandURL(w = 192): string {
  return sprite(`garland|${w}`, w, 12, (p) => {
    for (let x = 0; x < w; x++) { const y = 2 + Math.round(4 * Math.sin((x / w) * Math.PI * 3) ** 2); p.r(x, y, 1, 3, x % 4 < 2 ? '#3f7a4c' : '#4a8a58'); }
    for (let x = 6, i = 0; x < w; x += 11, i++) { const y = 5 + Math.round(4 * Math.sin((x / w) * Math.PI * 3) ** 2); p.r(x, y, 2, 2, ['#e05c6e', '#f6e27a', '#8fcbd6', '#f2b8c6'][i % 4]); }
  }, { outline: false });
}
export function lanternURL(kind: 'red' | 'rabbit'): string {
  return sprite(`hanglantern|${kind}`, 14, 30, (p) => {
    p.r(6, 0, 1, 8, '#7a5235');
    if (kind === 'red') {
      p.r(4, 8, 6, 2, '#c9a227'); p.rows([[10, 2, 11], [11, 1, 12], [12, 0, 13], [13, 0, 13], [14, 0, 13], [15, 0, 13], [16, 0, 13], [17, 0, 13], [18, 1, 12], [19, 2, 11]], '#d9473f');
      for (let x = 3; x < 12; x += 3) p.r(x, 11, 1, 8, '#b33a33'); p.r(4, 20, 6, 2, '#c9a227'); p.r(6, 22, 2, 6, '#f3c46b');
    } else {
      p.r(3, 6, 2, 5, '#fff6e0'); p.r(9, 6, 2, 5, '#fff6e0'); p.rows([[11, 2, 11], [12, 1, 12], [13, 0, 13], [14, 0, 13], [15, 0, 13], [16, 0, 13], [17, 1, 12], [18, 2, 11]], '#fff6e0');
      p.p(4, 13, '#e05c6e'); p.p(9, 13, '#e05c6e'); p.r(5, 15, 4, 2, '#ffe9a8'); p.r(5, 19, 4, 2, '#c43a3a');
    }
  });
}
export function balloonsURL(colors: string[]): string {
  return sprite(`balloons2|${colors.join()}`, 22, 40, (p) => {
    const b = (x: number, y: number, c: string) => { p.rows([[y, x + 2, x + 5], [y + 1, x + 1, x + 6], [y + 2, x, x + 7], [y + 3, x, x + 7], [y + 4, x, x + 7], [y + 5, x + 1, x + 6], [y + 6, x + 2, x + 5], [y + 7, x + 3, x + 4]], c); p.p(x + 2, y + 2, '#ffffff'); };
    b(0, 4, colors[0]); b(13, 2, colors[1 % colors.length]); b(7, 10, colors[2 % colors.length]);
    p.line(4, 12, 10, 39, '#9a8f86'); p.line(17, 10, 11, 39, '#9a8f86'); p.line(11, 18, 11, 39, '#9a8f86');
  });
}
export function wreathURL(): string {
  return sprite('wreath', 20, 22, (p) => {
    for (let a = 0; a < 40; a++) { const t = (a / 40) * Math.PI * 2, x = Math.round(10 + 7 * Math.cos(t)), y = Math.round(10 + 7 * Math.sin(t)); p.r(x - 1, y - 1, 3, 3, a % 2 ? '#3f7a4c' : '#4a8a58'); }
    for (const [x, y] of [[4, 6], [15, 7], [10, 17], [6, 15]]) p.r(x, y, 2, 2, '#e05c6e');
    p.rows([[17, 7, 9], [17, 11, 13], [18, 8, 12], [19, 9, 11]], '#d9473f');
  });
}
export function moonURL(): string {
  return sprite('fullmoon', 16, 16, (p) => { p.rows([[0, 5, 10], [1, 3, 12], [2, 2, 13], [3, 1, 14], [4, 1, 14], [5, 0, 15], [6, 0, 15], [7, 0, 15], [8, 0, 15], [9, 0, 15], [10, 0, 15], [11, 1, 14], [12, 1, 14], [13, 2, 13], [14, 3, 12], [15, 5, 10]], '#fff3b8'); p.r(4, 5, 3, 2, '#f2dc8a'); p.r(9, 9, 3, 3, '#f2dc8a'); p.p(10, 4, '#f2dc8a'); });
}
export const FESTIVAL_COLORS: Record<Festival, string[]> = {
  christmas: ['#d9473f', '#3f7a4c', '#f6e27a'], newyear: ['#f6e27a', '#8fcbd6', '#f2b8c6', '#c9a0e8'], lunarNewYear: ['#d9473f', '#f3c46b'],
  valentine: ['#e05c6e', '#f2b8c6', '#ffffff'], midAutumn: ['#f3c46b', '#e8b066', '#fff6e0'], birthday99: ['#f2b8c6', '#8fcbd6', '#f6e27a', '#9cb58f'],
  birthdayChen: ['#5d7fa6', '#f6e27a', '#2f2f35', '#9cb58f'], anniversary: ['#e05c6e', '#f2b8c6', '#fbf7ef'], reunion: ['#f2b8c6', '#8fcbd6', '#f6e27a'],
};
