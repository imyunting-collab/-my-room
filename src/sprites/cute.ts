// Original pixel art for the cute / kitchen / balcony / love pieces. Drawn by furniture id.
import type { FurnitureDef } from '../data/catalog';
import { Painter, shade } from './pixel';

type Draw = (p: Painter, d: FurnitureDef, o: { on?: boolean; frame?: number }) => void;

const BROWN = '#b07d52', BROWN_D = '#7a5235', CREAM = '#fbf7ef', PINK = '#f2b8c6', PINK_D = '#c98d9c', RED = '#e05c6e';
const GREEN = '#6d8765', GREEN_L = '#9cb58f', GREEN_D = '#4a6045', SKY = '#8fcbd6', YEL = '#f6e27a', INK = '#2b1d1a', GRAY = '#c9c9c9';

function heart(p: Painter, x: number, y: number, col: string) {
  p.rows([[y, x, x + 1], [y, x + 3, x + 4], [y + 1, x, x + 4], [y + 2, x + 1, x + 3], [y + 3, x + 2, x + 2]], col);
}
function pot(p: Painter, x: number, y: number, w: number, h: number, col = '#c96f4a') {
  p.r(x, y, w, 2, shade(col, 0.15)); p.r(x + 1, y + 2, w - 2, h - 2, col); p.r(x + 1, y + 2, 1, h - 2, shade(col, 0.2));
}
function plushFace(p: Painter, x: number, y: number) {
  p.p(x, y, INK); p.p(x + 4, y, INK); p.r(x + 1, y + 2, 3, 1, '#6b4433'); p.p(x - 1, y + 2, '#f2a0a8'); p.p(x + 5, y + 2, '#f2a0a8');
}

export const CUTE: Record<string, Draw> = {
  // ───── room ─────
  plush_bear: (p, d) => {
    const b = '#c99a6a', b2 = '#a87a4c';
    p.r(1, 0, 5, 5, b); p.r(12, 0, 5, 5, b); p.r(2, 1, 3, 3, '#e8c49c'); p.r(13, 1, 3, 3, '#e8c49c');
    p.r(2, 2, 14, 10, b); p.r(6, 7, 6, 4, '#e8c49c'); plushFace(p, 6, 5);
    p.r(3, 12, 12, 7, b); p.r(6, 13, 6, 5, '#e8c49c'); p.r(0, 12, 4, 4, b2); p.r(14, 12, 4, 4, b2);
    p.r(2, d.h - 2, 5, 2, b2); p.r(11, d.h - 2, 5, 2, b2); p.r(7, 11, 4, 2, RED);
  },
  plush_dog: (p) => {
    const w = '#f6efe2', e = '#a8754a', sp = '#d8a56a';
    p.rows([[0, 6, 13], [1, 4, 15], [2, 3, 16]], w); p.r(3, 3, 14, 6, w); p.rows([[9, 4, 15]], w);
    p.r(0, 2, 4, 7, e); p.r(16, 2, 4, 7, e); p.p(1, 9, e); p.p(18, 9, e);
    p.r(4, 3, 5, 4, sp);
    p.p(6, 4, INK); p.p(13, 4, INK); p.p(6, 3, '#ffffff');
    p.r(8, 6, 4, 3, '#fffaf0'); p.r(9, 6, 2, 1, INK); p.p(10, 8, '#e8707e');
    p.r(5, 10, 10, 4, w); p.r(5, 10, 10, 1, '#e05c6e'); p.p(10, 11, YEL);
    p.r(5, 14, 3, 2, shade(w, -0.1)); p.r(12, 14, 3, 2, shade(w, -0.1)); p.r(15, 11, 3, 2, w); p.p(17, 10, w);
  },
  rug_cloud: (p, d) => {
    const c = '#e4f0f6', c2 = '#c7dfea';
    p.rows([[0, 10, 18], [0, 26, 36], [1, 6, 22], [1, 22, 42], [2, 3, 50], [3, 1, 54]], c);
    p.r(0, 4, d.w, d.h - 8, c);
    p.rows([[d.h - 4, 1, 54], [d.h - 3, 3, 50], [d.h - 2, 6, 44], [d.h - 1, 10, 38]], c);
    p.r(10, 6, 30, 1, c2); p.r(16, 9, 26, 1, c2); p.p(8, 7, '#fff'); p.p(44, 5, '#fff');
  },
  rug_strawberry: (p, d) => {
    const r = '#e8707e', r2 = '#c95462';
    p.rows([[0, 14, 25], [1, 10, 29], [2, 6, 33]], GREEN); p.r(18, 0, 3, 1, GREEN_D);
    p.r(2, 3, d.w - 4, d.h - 8, r); p.rows([[d.h - 5, 4, d.w - 5], [d.h - 4, 8, d.w - 9], [d.h - 3, 13, d.w - 14]], r);
    for (let y = 5; y < d.h - 5; y += 3) for (let x = 5 + (y % 2) * 3; x < d.w - 5; x += 6) p.p(x, y, YEL);
    p.r(3, 4, d.w - 6, 1, shade(r, 0.2)); p.r(2, d.h - 6, d.w - 4, 1, r2);
  },
  beanbag: (p, d) => {
    const c = '#8fb08a', c2 = '#6d8f68';
    p.rows([[0, 8, 22], [1, 5, 25], [2, 3, 27], [3, 2, 28]], c); p.r(1, 4, d.w - 2, d.h - 8, c);
    p.rows([[d.h - 4, 0, d.w - 1], [d.h - 3, 0, d.w - 1], [d.h - 2, 1, d.w - 2], [d.h - 1, 3, d.w - 4]], c2);
    p.r(8, 6, 14, 6, shade(c, -0.1)); p.r(6, 2, 6, 1, shade(c, 0.25)); p.r(13, 14, 4, 1, c2);
  },
  lamp_star: (p, d, o) => {
    const glow = o.on ? '#fff1b8' : '#f3e2c2';
    p.rows([[0, 6, 7], [1, 5, 8], [2, 0, 13], [3, 2, 11], [4, 3, 10], [5, 2, 11], [6, 1, 4], [6, 9, 12]], glow);
    p.p(6, 3, o.on ? '#ffffff' : '#e0cfae');
    p.r(6, 7, 2, d.h - 11, BROWN_D); p.r(2, d.h - 4, 10, 4, BROWN_D); p.r(3, d.h - 4, 8, 1, BROWN);
  },
  lamp_lava: (p, d, o) => {
    const fr = o.frame ?? 0;
    p.r(3, 0, 4, 2, '#5a3d30'); p.rows([[2, 2, 7], [3, 2, 7]], '#5a3d30');
    p.r(2, 4, 6, 10, o.on ? '#f7c6d8' : '#e9d6de'); p.r(1, 6, 8, 6, o.on ? '#f7c6d8' : '#e9d6de');
    const blob = o.on ? '#e05c9e' : '#c98daa';
    p.r(3, 5 + (fr % 2) * 2, 3, 3, blob); p.r(4, 10 - (fr % 2), 3, 2, blob);
    p.rows([[14, 1, 8], [15, 0, 9], [16, 0, 9], [17, 1, 8], [18, 1, 8], [19, 0, 9]], '#5a3d30');
  },
  musicbox: (p, d, o) => {
    const fr = o.frame ?? 0;
    p.rows([[0, 7, 8], [1, 5, 10], [2, 3, 12], [3, 1, 14]], PINK); p.r(0, 4, 16, 2, PINK_D);
    p.r(7, 6, 2, 6, YEL);
    const hx = fr % 2 ? 9 : 3; p.r(hx, 7, 4, 3, CREAM); p.p(hx + (fr % 2 ? 3 : 0), 6, CREAM); p.p(hx + 1, 10, CREAM);
    p.r(1, 12, 14, 6, SKY); p.r(1, 12, 14, 1, shade(SKY, 0.2)); for (let x = 3; x < 14; x += 4) p.p(x, 14, YEL);
    p.r(15, 14, 1, 2, YEL);
  },
  catbed: (p, d, o) => {
    const fr = o.frame ?? 0, cat = '#e8a25a', cat2 = '#c47f3c';
    p.rows([[6, 1, 24], [7, 0, 25]], '#d6a878'); p.r(0, 8, d.w, d.h - 9, BROWN); p.r(2, 8, d.w - 4, 3, '#e8c49c'); p.r(1, d.h - 1, d.w - 2, 1, BROWN_D);
    // cat curled up
    p.r(5, 3, 14, 6, cat); p.r(5, 3, 14, 1, shade(cat, 0.2)); for (let x = 8; x < 17; x += 3) p.r(x, 4, 1, 3, cat2);
    p.r(15, 1, 6, 6, cat); p.p(15, 0, cat); p.p(20, 0, cat); p.p(17, 3, fr % 2 ? INK : cat2); p.p(19, 3, fr % 2 ? INK : cat2); p.p(18, 5, '#f2a0a8');
    p.r(3, 6, 4, 2, cat2);
  },
  fishbowl: (p, d, o) => {
    const fr = o.frame ?? 0, water = '#bfe3ee';
    p.rows([[0, 4, 11], [1, 3, 12]], '#e6f4f8');
    p.rows([[2, 1, 14], [3, 0, 15], [4, 0, 15], [5, 0, 15], [6, 0, 15], [7, 0, 15], [8, 0, 15], [9, 0, 15], [10, 1, 14], [11, 2, 13]], water);
    p.r(1, 2, 14, 1, '#e6f4f8');
    const fx = fr % 2 ? 4 : 7; p.r(fx, 6, 4, 2, '#f08a3c'); p.p(fx + (fr % 2 ? 4 : -1), 6, '#f08a3c'); p.p(fx + (fr % 2 ? 4 : -1), 7, '#f08a3c'); p.p(fx + (fr % 2 ? 1 : 2), 6, INK);
    p.r(3, 10, 3, 1, GREEN); p.r(10, 9, 1, 2, GREEN); p.p(12, 4, '#fff');
    p.r(2, 12, 12, 2, BROWN_D); p.r(3, 14, 10, 2, BROWN);
  },

  // ───── kitchen basics ─────
  counter_wood: (p, d) => {
    const top = '#e9e2d6', wood = '#c99a6a', wood2 = '#a87a4c';
    p.r(0, 0, d.w, 4, top); p.r(0, 0, d.w, 1, '#ffffff'); p.r(0, 3, d.w, 1, '#c9bfae');
    // stove top
    p.r(d.w - 22, 1, 18, 2, '#3a3a3a'); p.r(d.w - 20, 1, 5, 1, '#e05c3c'); p.r(d.w - 11, 1, 5, 1, '#e05c3c');
    // cutting board + knife + veggies
    p.r(4, 0, 14, 2, '#d6a878'); p.r(7, -0, 3, 1, '#e05c3c'); p.r(12, 0, 3, 1, GREEN_L);
    p.r(1, 4, d.w - 2, d.h - 7, wood);
    for (let x = 1; x < d.w - 2; x += 14) { p.r(x + 1, 6, 12, d.h - 11, shade(wood, 0.06)); p.r(x + 6, 8, 3, 1, wood2); p.r(x + 13, 4, 1, d.h - 7, wood2); }
    p.r(1, 4, d.w - 2, 1, wood2); p.r(0, d.h - 3, d.w, 3, wood2);
  },
  sink_white: (p, d) => {
    p.r(0, 6, d.w, 4, '#f1f1ee'); p.r(0, 6, d.w, 1, '#ffffff'); p.r(4, 7, d.w - 8, 2, '#bcc7cc');
    p.r(13, 0, 3, 7, GRAY); p.r(13, 0, 8, 2, GRAY); p.r(19, 2, 2, 2, GRAY); p.r(10, 3, 2, 2, SKY); p.r(18, 3, 2, 2, '#e8a0a0');
    p.r(2, 10, d.w - 4, d.h - 13, '#f6f3ec'); p.r(2, 10, 1, d.h - 13, '#ffffff');
    p.r(4, 12, d.w / 2 - 5, d.h - 17, '#e9e5dc'); p.r(d.w / 2 + 1, 12, d.w / 2 - 5, d.h - 17, '#e9e5dc');
    p.r(d.w / 2 - 3, 20, 2, 3, GRAY); p.r(d.w / 2 + 1, 20, 2, 3, GRAY);
    p.r(1, d.h - 3, d.w - 2, 3, '#d8d2c4'); p.r(3, 4, 6, 2, YEL); p.p(4, 3, '#ffffff');
  },

  // ───── kitchen ware ─────
  coffee_machine: (p, d) => {
    const body = '#3a3a3c', body2 = '#5a5a5e';
    p.r(0, 0, d.w, 4, body2); p.r(0, 4, 4, d.h - 6, body); p.r(d.w - 3, 4, 3, d.h - 6, body);
    p.r(4, 4, d.w - 7, 2, body); p.r(6, 6, 3, 2, GRAY);
    p.r(5, 11, 5, 5, CREAM); p.r(10, 12, 1, 2, CREAM); p.r(6, 11, 3, 1, '#7a4a2a');
    p.r(0, d.h - 2, d.w, 2, body2); p.p(1, 1, '#9cf0a8'); p.p(3, 1, '#e05c3c');
  },
  toaster: (p, d) => {
    p.r(3, 0, 3, 2, '#e8c49c'); p.r(9, 0, 3, 2, '#e8c49c');
    p.r(0, 2, d.w, d.h - 3, '#efe4cf'); p.r(0, 2, d.w, 1, '#fffaf0'); p.r(2, 2, 4, 1, '#3a3a3a'); p.r(9, 2, 4, 1, '#3a3a3a');
    p.r(d.w - 2, 5, 2, 3, '#d99865'); p.r(2, 6, 8, 1, '#c9b89a'); p.r(1, d.h - 1, d.w - 2, 1, '#c9b89a');
  },
  rice_cooker: (p, d) => {
    p.rows([[0, 6, 9], [1, 4, 11], [2, 1, 14], [3, 0, 15]], '#f6f0e5'); p.r(6, 0, 4, 1, '#c9b89a');
    p.r(0, 4, d.w, d.h - 5, '#f3d9c7'); p.r(0, 4, d.w, 1, '#fff4ea'); p.r(5, 8, 6, 3, '#fffaf0'); p.p(6, 9, '#e05c6e'); p.p(9, 9, GREEN);
    p.r(1, d.h - 1, d.w - 2, 1, '#c9a38a'); for (let x = 3; x < 13; x += 3) p.p(x, 6, '#e8b8b2');
  },
  kettle: (p, d) => {
    p.r(4, 0, 4, 2, GREEN_D); p.rows([[2, 2, 9], [3, 1, 10]], GREEN); p.r(1, 4, 10, d.h - 5, GREEN); p.r(1, 4, 1, d.h - 5, GREEN_L);
    p.r(10, 6, 2, 1, GREEN); p.r(11, 5, 1, 1, GREEN); p.r(0, 6, 1, 4, GREEN_D); p.r(1, d.h - 1, 10, 1, GREEN_D); p.r(4, 7, 4, 3, CREAM);
  },
  waffle_maker: (p, d) => {
    p.r(1, 0, d.w - 2, 4, '#f2b8c6'); p.r(1, 0, d.w - 2, 1, '#fbe3ea'); p.r(d.w - 3, 1, 3, 2, '#c98d9c');
    p.r(2, 4, d.w - 4, 3, '#e8b066'); for (let x = 3; x < d.w - 3; x += 3) p.p(x, 5, '#c98a3c');
    p.r(0, 7, d.w, 3, '#f2b8c6'); p.r(0, 9, d.w, 1, '#c98d9c'); p.p(2, 8, '#9cf0a8');
  },
  fruit_basket: (p, d) => {
    p.r(3, 0, 4, 4, RED); p.p(4, 0, '#fff'); p.r(8, 1, 5, 3, '#f39b3c'); p.r(13, 0, 3, 3, '#a8d36a'); p.p(5, -0, GREEN_D); p.r(10, 0, 2, 1, GREEN);
    p.r(0, 4, d.w, 2, '#d6a878'); p.r(1, 6, d.w - 2, 4, BROWN); for (let x = 2; x < d.w - 2; x += 3) p.r(x, 6, 1, 4, '#d6a878');
  },
  spice_rack: (p, d) => {
    p.r(0, 10, d.w, 3, BROWN); p.r(0, 10, d.w, 1, '#d6a878'); p.r(1, 13, 2, 1, BROWN_D); p.r(d.w - 3, 13, 2, 1, BROWN_D);
    [['#f3f0e8', '#c9c9c9'], ['#e05c3c', '#a33a30'], ['#6d8765', '#4a6045'], ['#f3c46b', '#c9a227'], ['#8a5a3b', '#5e3c27']].forEach(([a, b], i) => {
      const x = 1 + i * 5; p.r(x, 3, 4, 7, a); p.r(x, 1, 4, 2, b); p.r(x + 1, 5, 2, 2, '#fffaf0');
    });
  },
  pan_rack: (p, d) => {
    p.r(0, 0, d.w, 2, '#5a5a5e'); p.p(0, 2, '#5a5a5e'); p.p(d.w - 1, 2, '#5a5a5e');
    p.r(4, 2, 1, 3, GRAY); p.rows([[5, 1, 7], [6, 0, 8], [7, 0, 8], [8, 0, 8], [9, 1, 7]], '#3a3a3c'); p.r(2, 6, 3, 1, '#5a5a5e');
    p.r(14, 2, 1, 4, GRAY); p.r(13, 6, 3, 7, '#c99a6a'); p.r(12, 13, 5, 4, '#d6a878');
    p.r(23, 2, 1, 3, GRAY); p.rows([[5, 20, 26], [6, 19, 27], [7, 19, 27], [8, 19, 27], [9, 20, 26], [10, 21, 25]], '#c96f4a'); p.r(21, 6, 3, 1, '#e8956a');
  },
  herb_pot: (p, d) => {
    p.rows([[0, 4, 6], [1, 2, 8], [2, 1, 10], [3, 3, 9], [4, 0, 4], [4, 7, 11], [5, 1, 10], [6, 2, 9], [7, 4, 7]], GREEN); p.r(5, 1, 1, 7, GREEN_D);
    p.p(2, 2, GREEN_L); p.p(8, 4, GREEN_L);
    pot(p, 1, 8, 10, 8, '#e9dcc0'); p.r(3, 11, 6, 2, GREEN_L);
  },
  stand_mixer: (p, d) => {
    const c = '#f2b8c6', c2 = '#c98d9c';
    p.r(2, 0, 11, 5, c); p.r(2, 0, 11, 1, '#fbe3ea'); p.r(10, 0, 3, 12, c); p.r(10, 5, 3, 7, c2);
    p.r(5, 5, 1, 3, GRAY); p.rows([[8, 1, 9], [9, 1, 9], [10, 2, 8], [11, 3, 7]], '#e9e9ec'); p.r(2, 8, 7, 1, '#ffffff');
    p.r(0, 12, d.w, 4, c); p.r(0, 15, d.w, 1, c2); p.r(0, 16, d.w, 2, c2);
  },

  // ───── balcony ─────
  pot_tulip: (p, d) => {
    for (const [x, col] of [[1, '#f2a0b8'], [5, '#e05c6e'], [9, '#f6e27a']] as [number, string][]) {
      p.rows([[1, x, x + 2], [2, x, x + 2], [3, x, x + 2]], col); p.p(x, 0, col); p.p(x + 2, 0, col); p.r(x + 1, 4, 1, 6, GREEN);
    }
    p.r(2, 7, 2, 2, GREEN_L); p.r(8, 6, 2, 2, GREEN_L);
    pot(p, 1, 10, 10, d.h - 10, '#f2b8c6');
  },
  pot_sunflower: (p, d) => {
    const pet = '#f6c93c';
    p.rows([[0, 5, 10], [1, 3, 12], [2, 2, 13], [3, 2, 13], [4, 2, 13], [5, 2, 13], [6, 3, 12], [7, 5, 10]], pet);
    p.r(5, 2, 6, 4, '#7a4a2a'); p.p(6, 3, '#a87a4c'); p.p(9, 4, '#a87a4c');
    p.r(7, 8, 2, 10, GREEN); p.r(3, 11, 4, 3, GREEN_L); p.r(9, 13, 4, 3, GREEN_L);
    pot(p, 2, 18, 12, d.h - 18, '#c96f4a');
  },
  watering_can: (p, d) => {
    const c = '#9cb58f', c2 = '#6d8765';
    p.r(3, 0, 6, 2, c2); p.r(2, 2, 9, d.h - 2, c); p.r(2, 2, 1, d.h - 2, '#c6dcbc'); p.r(11, 4, 2, 2, c); p.r(13, 2, 2, 2, c); p.r(14, 1, 2, 2, c2);
    p.r(0, 3, 2, 5, c2); p.p(5, 5, INK); p.p(8, 5, INK); p.r(6, 7, 2, 1, '#e8a0a0'); p.p(3, 1, c); p.p(9, 1, c);
  },
  string_lights: (p, d, o) => {
    p.r(1, 2, 2, d.h - 2, BROWN_D); p.r(d.w - 3, 2, 2, d.h - 2, BROWN_D); p.r(0, d.h - 2, 4, 2, BROWN_D); p.r(d.w - 4, d.h - 2, 4, 2, BROWN_D);
    for (let i = 0; i < d.w - 4; i++) { const x = 2 + i, y = 2 + Math.round(5 * Math.sin((i / (d.w - 4)) * Math.PI)); p.p(x, y, '#5a3d30'); }
    const cols = o.on ? ['#fff1b8', '#ffd6e0', '#d6f4ff'] : ['#d8cfb4', '#d8c8cc', '#c8d4d8'];
    for (let i = 0, x = 5; x < d.w - 4; x += 5, i++) { const y = 3 + Math.round(5 * Math.sin(((x - 2) / (d.w - 4)) * Math.PI)); p.r(x, y, 2, 3, cols[i % 3]); }
    p.r(6, 16, d.w - 12, 2, '#5a3d30'); p.r(8, 18, 4, 4, o.on ? '#fff1b8' : '#d8cfb4'); p.r(15, 18, 4, 4, o.on ? '#ffd6e0' : '#d8c8cc'); p.r(22, 18, 4, 4, o.on ? '#d6f4ff' : '#c8d4d8');
  },
  camp_lantern: (p, d, o) => {
    p.r(3, 0, 4, 1, '#3a3a3c'); p.p(2, 1, '#3a3a3c'); p.p(7, 1, '#3a3a3c');
    p.r(1, 2, 8, 2, GREEN_D); p.r(2, 4, 6, 8, o.on ? '#fff1b8' : '#e9e2d0'); p.r(2, 4, 1, 8, GREEN_D); p.r(7, 4, 1, 8, GREEN_D);
    if (o.on) p.r(4, 6, 2, 4, '#ffd36a');
    p.r(1, 12, 8, 4, GREEN_D); p.r(1, 12, 8, 1, GREEN);
  },
  swing_chair: (p, d) => {
    const r = '#d6a878', r2 = '#a87a4c';
    p.r(d.w / 2 - 1, 0, 2, 8, BROWN_D); p.r(d.w / 2 - 4, 0, 8, 2, BROWN_D);
    p.rows([[8, 11, 16], [9, 8, 19], [10, 6, 21], [11, 4, 23], [12, 3, 24], [13, 2, 25]], r);
    p.r(1, 14, d.w - 2, 18, r); for (let y = 10; y < 32; y += 3) p.r(2, y, d.w - 4, 1, r2);
    p.r(4, 22, d.w - 8, 6, '#f3e7d2'); p.r(6, 20, 8, 4, PINK);
    p.rows([[32, 2, 25], [33, 4, 23], [34, 7, 20]], r2); p.r(d.w / 2 - 1, 35, 2, d.h - 37, BROWN_D); p.r(d.w / 2 - 6, d.h - 2, 12, 2, BROWN_D);
  },
  bird_feeder: (p, d, o) => {
    const fr = o.frame ?? 0;
    p.rows([[0, 5, 8], [1, 3, 10], [2, 1, 12], [3, 0, 13]], '#c96f4a'); p.r(2, 4, 10, 8, '#e9dcc0'); p.r(5, 6, 4, 4, '#5a3d30');
    p.r(1, 12, 12, 2, BROWN); p.r(3, 11, 2, 1, YEL); p.r(9, 11, 2, 1, YEL);
    if (fr % 2) { p.r(9, 8, 4, 3, SKY); p.p(12, 8, INK); p.p(13, 9, '#f3c46b'); p.r(8, 10, 2, 1, '#6aaabb'); }
    p.r(6, 14, 2, d.h - 16, BROWN_D); p.r(3, d.h - 2, 8, 2, BROWN_D);
  },
  wind_chime: (p, d, o) => {
    const fr = o.frame ?? 0;
    p.rows([[0, 5, 6], [1, 3, 8], [2, 2, 9], [3, 1, 10], [4, 1, 10]], '#d6f4ff'); p.r(1, 4, 10, 1, '#a8d8e8'); p.p(4, 2, RED); p.p(7, 3, '#f3c46b');
    const sway = fr % 2 ? 1 : 0;
    p.r(5 + sway, 5, 1, 9, GRAY); p.r(4 + sway, 14, 3, 6, '#fffaf0'); p.r(4 + sway, 16, 3, 1, RED);
    p.r(5, 20, 2, d.h - 22, BROWN_D); p.r(2, d.h - 2, 8, 2, BROWN_D);
  },
  garden_bench: (p, d) => {
    const w = '#c99a6a', w2 = '#a87a4c';
    p.r(1, 0, d.w - 2, 3, w); p.r(1, 4, d.w - 2, 3, w); p.r(1, 2, d.w - 2, 1, w2); p.r(1, 6, d.w - 2, 1, w2);
    p.r(3, 0, 2, 11, w2); p.r(d.w - 5, 0, 2, 11, w2);
    p.r(0, 10, d.w, 3, w); p.r(0, 10, d.w, 1, '#e8c49c'); p.r(0, 13, d.w, 1, w2);
    p.r(2, 14, 3, d.h - 14, w2); p.r(d.w - 5, 14, 3, d.h - 14, w2); p.r(10, 6, 6, 4, PINK);
  },
  telescope: (p, d) => {
    p.r(2, 4, 14, 5, '#2f3b57'); p.r(14, 3, 5, 7, '#3d4a6a'); p.r(0, 5, 3, 3, '#1f2840'); p.r(2, 4, 14, 1, '#56688a'); p.r(8, 5, 2, 3, YEL);
    p.r(9, 9, 2, 6, '#5a5a5e');
    p.line(10, 15, 3, d.h - 1, '#5a5a5e'); p.line(10, 15, 17, d.h - 1, '#5a5a5e'); p.line(10, 15, 10, d.h - 1, '#5a5a5e');
  },

  // ───── love ─────
  polaroid: (p, d) => {
    p.r(0, 2, d.w, d.h - 2, '#f3efe6'); p.r(0, 2, d.w, 1, '#ffffff'); p.r(0, d.h - 3, d.w, 3, '#e8dfcc');
    p.r(1, 4, d.w - 2, 1, RED); p.r(1, 5, d.w - 2, 1, '#f3c46b'); p.r(1, 6, d.w - 2, 1, SKY);
    p.r(4, 5, 6, 5, '#3a3a3c'); p.r(5, 6, 4, 3, '#5d7fa6'); p.p(6, 6, '#d6f4ff');
    p.r(1, 0, 3, 2, '#3a3a3c'); p.r(10, 3, 2, 1, '#fff1b8');
  },
  swing_love: (p, d) => {
    const pk = '#f2b8c6';
    p.r(0, 0, d.w, 3, '#fbf7ef'); p.r(0, 0, d.w, 1, '#ffffff'); heart(p, d.w / 2 - 2, 0, RED);
    p.r(2, 3, 2, d.h - 3, '#fbf7ef'); p.r(d.w - 4, 3, 2, d.h - 3, '#fbf7ef');
    p.r(7, 3, 1, 20, '#c9b89a'); p.r(d.w - 8, 3, 1, 20, '#c9b89a');
    p.r(5, 14, d.w - 10, 8, pk); p.r(5, 14, d.w - 10, 1, '#fbe3ea'); heart(p, 10, 16, RED); heart(p, d.w - 15, 16, RED);
    p.r(5, 22, d.w - 10, 4, PINK_D); p.r(0, d.h - 2, 6, 2, '#e8dfcc'); p.r(d.w - 6, d.h - 2, 6, 2, '#e8dfcc');
  },
  balloons: (p, d, o) => {
    const fr = o.frame ?? 0, dy = fr % 2;
    const b = (x: number, y: number, col: string) => { p.rows([[y, x + 1, x + 2], [y, x + 4, x + 5], [y + 1, x, x + 6], [y + 2, x, x + 6], [y + 3, x + 1, x + 5], [y + 4, x + 2, x + 4], [y + 5, x + 3, x + 3]], col); p.p(x + 1, y + 1, '#ffffff'); };
    b(0, 2 + dy, RED); b(10, 0, PINK); b(5, 8 - dy, '#f2a0b8');
    p.line(3, 8, 8, 30, GRAY); p.line(13, 6, 9, 30, GRAY); p.line(8, 14, 9, 30, GRAY);
    p.r(5, 30, 8, d.h - 30, '#e9dcc0'); p.r(5, 30, 8, 1, '#fff'); heart(p, 7, 33, RED);
  },
  lovebox: (p, d) => {
    p.rows([[0, 3, 10], [1, 1, 12], [2, 0, 13]], PINK_D); p.r(0, 3, d.w, d.h - 3, PINK); p.r(0, 3, d.w, 1, '#fbe3ea');
    p.r(3, 5, 8, 4, '#fffaf0'); p.line(3, 5, 7, 7, '#e0cfae'); p.line(10, 5, 7, 7, '#e0cfae'); heart(p, 5, 9, RED);
    p.r(d.w - 2, 4, 2, 4, RED);
  },
  rose_vase: (p, d) => {
    for (const [x, y] of [[1, 0], [5, 1], [3, 4]]) { p.r(x, y, 4, 3, RED); p.p(x + 1, y + 1, '#a33a40'); }
    p.r(3, 7, 1, 5, GREEN); p.r(6, 4, 1, 8, GREEN); p.p(2, 9, GREEN_L); p.p(7, 8, GREEN_L);
    p.rows([[12, 2, 7], [13, 1, 8], [14, 1, 8], [15, 1, 8], [16, 1, 8], [17, 2, 7], [18, 2, 7]], '#d6f4ff'); p.r(2, 13, 1, 5, '#ffffff'); p.r(1, 19, 8, 1, '#a8d8e8');
  },
  star_projector: (p, d, o) => {
    p.rows([[0, 4, 9], [1, 2, 11], [2, 1, 12], [3, 0, 13], [4, 0, 13], [5, 0, 13]], o.on ? '#3d4a8a' : '#2f3b57');
    for (const [x, y] of [[3, 2], [7, 1], [10, 3], [5, 4]]) p.p(x, y, o.on ? '#fff1b8' : '#8a96b8');
    p.r(0, 6, d.w, 6, '#26354d'); p.r(0, 6, d.w, 1, '#3d4a6a'); p.p(2, 9, o.on ? '#9cf0a8' : '#3a5560');
  },
  neon_heart: (p, d, o) => {
    const c = o.on ? '#ff6fae' : '#c99aaa', g = o.on ? '#ffd0e6' : '#d8c4cc';
    p.r(0, 0, d.w, d.h, '#3a2a30'); p.r(1, 1, d.w - 2, d.h - 2, '#4a3640');
    const hx = 3, hy = 3;
    p.rows([[hy, hx + 1, hx + 5], [hy, hx + 10, hx + 14], [hy + 1, hx, hx + 6], [hy + 1, hx + 9, hx + 15], [hy + 2, hx, hx + 15], [hy + 3, hx, hx + 15], [hy + 4, hx + 1, hx + 14], [hy + 5, hx + 2, hx + 13], [hy + 6, hx + 4, hx + 11], [hy + 7, hx + 6, hx + 9], [hy + 8, hx + 7, hx + 8]], c);
    p.rows([[hy + 2, hx + 2, hx + 13], [hy + 3, hx + 2, hx + 13], [hy + 4, hx + 3, hx + 12], [hy + 5, hx + 5, hx + 10], [hy + 6, hx + 7, hx + 8]], '#4a3640');
    p.p(hx + 2, hy + 1, g); p.r(3, d.h - 4, d.w - 6, 1, o.on ? '#ff9ccc' : '#9a7a86');
  },
  gacha_love: (p, d, o) => {
    const fr = o.frame ?? 0;
    p.rows([[0, 5, 12], [1, 3, 14], [2, 2, 15]], '#e8f6fb'); p.r(1, 3, 16, 11, '#e8f6fb'); p.r(1, 3, 1, 11, '#ffffff');
    for (const [x, y, c] of [[3, 8, RED], [8, 9, YEL], [12, 7, SKY], [5, 11, PINK], [10, 11, GREEN_L], [6, 5, '#c9a0e8']] as [number, number, string][]) p.r(x, y, 3, 3, c);
    p.r(0, 14, d.w, d.h - 14, PINK); p.r(0, 14, d.w, 1, '#fbe3ea'); p.r(0, d.h - 2, d.w, 2, PINK_D);
    p.r(6, 17, 6, 6, '#fffaf0'); p.r(8, 19, 2, 2, fr % 2 ? RED : PINK_D); p.r(4, 25, 10, 4, '#c98d9c'); p.r(6, 26, 6, 2, '#3a2a30');
    heart(p, 2, 16, RED);
  },
  bear_pair: (p, d) => {
    const a = '#c99a6a', b = '#f3e7d2';
    const bear = (x: number, col: string) => { p.r(x, 0, 4, 4, col); p.r(x + 8, 0, 4, 4, col); p.r(x + 1, 2, 10, 8, col); plushFace(p, x + 4, 5); p.r(x + 2, 10, 8, d.h - 10, col); };
    bear(0, a); bear(14, b); p.r(10, 11, 6, 3, a); p.r(11, 12, 4, 2, b); heart(p, 11, 2, RED);
  },
  photo_frame: (p, d) => {
    p.r(0, 0, d.w, d.h - 2, BROWN); p.r(1, 1, d.w - 2, d.h - 4, '#fffaf0'); p.r(2, 2, d.w - 4, d.h - 7, '#f7c6b3');
    p.r(2, 7, d.w - 4, 3, '#9cb58f'); p.r(3, 4, 2, 4, '#3a2a20'); p.r(7, 4, 2, 4, '#5a3d30'); p.p(3, 3, '#f2d0b4'); p.p(7, 3, '#f2d0b4');
    heart(p, 3, d.h - 6, RED); p.r(d.w / 2 - 2, d.h - 2, 4, 2, BROWN_D);
  },
};
