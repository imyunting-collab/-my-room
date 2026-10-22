// Original pixel furniture, devices, food, plants, window/sky and UI icons.
import type { FurnStyle, FurnitureDef, DeviceDef, PlantDef } from '../data/catalog';
import type { DayPart } from '../lib/util';
import { Painter, shade, sprite } from './pixel';

interface Pal { main: string; dark: string; light: string; accent: string; fabric: string }
export const PAL: Record<FurnStyle, Pal> = {
  wood: { main: '#b07d52', dark: '#7a5235', light: '#d6a878', accent: '#6d8765', fabric: '#e8b8b2' },
  cream: { main: '#efe4cf', dark: '#c9b89a', light: '#fffaf0', accent: '#d99865', fabric: '#f6f0e5' },
  cafe: { main: '#8a5a3b', dark: '#5e3c27', light: '#c99a6a', accent: '#3f6a54', fabric: '#c9a789' },
  forest: { main: '#6d8765', dark: '#4a6045', light: '#9cb58f', accent: '#d99865', fabric: '#a9c39b' },
  candy: { main: '#f2b8c6', dark: '#c98d9c', light: '#fbe3ea', accent: '#8fcbd6', fabric: '#fbd6df' },
  dark: { main: '#5a3d30', dark: '#33231b', light: '#7e5a48', accent: '#8a3a3f', fabric: '#8a3a3f' },
};

export interface ShelfBook { color: string; finished: boolean; h: number }

export function furnitureURL(def: FurnitureDef, opts: { on?: boolean; open?: boolean; books?: ShelfBook[]; rows?: number; now?: Date } = {}): { url: string; w: number; h: number } {
  const c = PAL[def.style];
  let w = def.w, h = def.h;
  if (def.category === 'bookshelf') {
    const rows = Math.max(opts.rows ?? 3, 3);
    h = 8 + rows * 18 + 4;
    w = def.id === 'bookshelf_tall' ? 56 : 44;
    const books = opts.books ?? [];
    const key = `shelf|${def.id}|${rows}|${books.map((b) => b.color + (b.finished ? '1' : '0') + b.h).join('')}`;
    return { url: sprite(key, w, h, (p) => drawShelf(p, c, w, rows, books)), w, h };
  }
  const minute = opts.now ? `${opts.now.getHours()}:${opts.now.getMinutes()}` : '';
  const key = `furn|${def.id}|${opts.on ? 1 : 0}|${opts.open ? 1 : 0}|${def.category === 'clock' ? minute : ''}`;
  return { url: sprite(key, w, h, (p) => drawFurniture(p, def, c, opts)), w, h };
}

function drawShelf(p: Painter, c: Pal, w: number, rows: number, books: ShelfBook[]) {
  const h = 8 + rows * 18 + 4;
  p.r(0, 0, w, h, c.dark);
  p.r(0, 0, w, 4, c.main); p.r(0, 0, w, 1, c.light);
  p.r(2, 4, w - 4, h - 8, shade(c.dark, -0.25));
  const per = Math.floor((w - 6) / 4);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    const baseY = 8 + r * 18 + 14;
    p.r(1, baseY, w - 2, 3, c.main); p.r(1, baseY, w - 2, 1, c.light);
    let x = 3;
    for (let k = 0; k < per && i < books.length; k++, i++) {
      const b = books[i];
      const bh = 9 + (b.h % 5);
      p.r(x, baseY - bh, 3, bh, b.color);
      p.r(x, baseY - bh, 1, bh, shade(b.color, 0.2));
      p.r(x, baseY - bh + 2, 3, 1, shade(b.color, -0.3));
      if (b.finished) { p.p(x + 1, baseY - bh + 4, '#f6e27a'); p.p(x + 1, baseY - bh + 5, '#f6e27a'); }
      x += 4;
    }
  }
  p.r(0, h - 4, w, 4, c.main); p.r(2, h - 2, 3, 2, c.dark); p.r(w - 5, h - 2, 3, 2, c.dark);
}

// Tiny 3×5 pixel digits for the digital clock.
const DIGITS: Record<string, string> = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
  '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111', ':': '000010000010000',
};
function digits(p: Painter, x: number, y: number, s: string, col: string) {
  for (const ch of s) {
    const m = DIGITS[ch]; if (!m) { x += 2; continue; }
    for (let i = 0; i < 15; i++) if (m[i] === '1') p.p(x + (i % 3), y + Math.floor(i / 3), col);
    x += ch === ':' ? 3 : 4;
  }
}

function clockHands(p: Painter, cx: number, cy: number, r: number, now: Date, col: string) {
  const hAng = ((now.getHours() % 12) + now.getMinutes() / 60) / 12 * Math.PI * 2;
  const mAng = now.getMinutes() / 60 * Math.PI * 2;
  p.line(cx, cy, Math.round(cx + Math.sin(mAng) * r), Math.round(cy - Math.cos(mAng) * r), col);
  p.line(cx, cy, Math.round(cx + Math.sin(hAng) * (r - 2)), Math.round(cy - Math.cos(hAng) * (r - 2)), col);
}

function drawFurniture(p: Painter, def: FurnitureDef, c: Pal, o: { on?: boolean; open?: boolean; now?: Date }) {
  const { w, h } = def;
  switch (def.category) {
    case 'desk':
      p.r(0, 0, w, 4, c.light); p.r(0, 3, w, 1, c.dark);
      p.r(2, 4, w - 4, 6, c.main); p.r(w - 20, 5, 16, 4, c.dark); p.r(w - 13, 6, 3, 1, c.light);
      p.r(2, 10, 4, h - 10, c.main); p.r(w - 6, 10, 4, h - 10, c.main); p.r(3, 10, 1, h - 10, c.light);
      break;
    case 'chair':
      p.r(2, 0, 14, 3, c.main); p.r(2, 0, 2, 14, c.main); p.r(14, 0, 2, 14, c.main);
      for (let x = 6; x < 13; x += 3) p.r(x, 3, 1, 10, c.dark);
      if (def.style === 'candy') { p.r(1, 0, 16, 13, c.light); p.r(3, 2, 12, 9, c.main); }
      p.r(0, 13, 18, 4, c.light); p.r(0, 16, 18, 1, c.dark);
      p.r(1, 17, 2, h - 17, c.main); p.r(15, 17, 2, h - 17, c.main); p.r(5, 17, 1, h - 18, c.dark); p.r(12, 17, 1, h - 18, c.dark);
      break;
    case 'bed': {
      const blanket = def.style === 'forest' ? '#6d8765' : def.style === 'cream' ? '#f3d9c7' : '#e8b8b2';
      p.r(0, 0, 8, h, c.main); p.r(1, 1, 6, 6, c.light); p.r(0, 0, 8, 1, c.light);
      p.r(w - 5, 12, 5, h - 12, c.main);
      p.r(6, 16, w - 10, 10, '#fbf7ef'); p.r(6, 25, w - 10, 1, '#d8cdbd');
      p.r(9, 12, 14, 7, '#ffffff'); p.r(9, 18, 14, 1, '#d8cdbd'); p.r(10, 13, 4, 1, '#f1ece2');
      p.r(24, 14, w - 29, 13, blanket); p.r(24, 14, w - 29, 1, shade(blanket, 0.25)); p.r(24, 26, w - 29, 1, shade(blanket, -0.2));
      if (def.style === 'forest') for (let x = 26; x < w - 6; x += 4) p.r(x, 15, 1, 11, shade(blanket, -0.15));
      else for (let x = 28; x < w - 6; x += 6) for (let y = 17; y < 25; y += 4) p.p(x, y, shade(blanket, 0.35));
      p.r(4, 26, w - 6, 5, c.dark); p.r(4, 26, w - 6, 1, c.main);
      p.r(4, 31, 3, h - 31, c.dark); p.r(w - 6, 31, 3, h - 31, c.dark);
      break;
    }
    case 'fridge':
      p.r(0, 0, w, h, c.main); p.r(0, 0, w, 1, c.light); p.r(0, 0, 1, h, c.light);
      if (o.open) {
        p.r(2, 2, w - 4, h - 5, '#eef4f4'); for (let y = 12; y < h - 4; y += 10) p.r(2, y, w - 4, 1, '#c6d4d4');
        p.r(4, 6, 4, 6, '#f6f0e5'); p.r(10, 8, 6, 4, '#e8b8b2'); p.r(5, 16, 6, 5, '#f3c46b'); p.r(14, 18, 5, 3, '#9cb58f');
        p.r(w - 3, 2, 3, h - 5, c.dark);
      } else {
        p.r(0, 15, w, 1, c.dark); p.r(w - 5, 5, 2, 7, c.dark); p.r(w - 5, 19, 2, 12, c.dark);
        p.r(4, 22, 4, 4, '#e8b8b2'); p.p(5, 23, '#ffffff'); p.r(10, 26, 3, 3, '#9cb58f');
      }
      p.r(1, h - 3, 4, 3, c.dark); p.r(w - 5, h - 3, 4, 3, c.dark);
      break;
    case 'wardrobe':
      p.r(0, 0, w, h - 3, c.main); p.r(0, 0, w, 4, c.light); p.r(0, 3, w, 1, c.dark);
      p.r(2, 5, w / 2 - 3, h - 11, shade(c.main, 0.08)); p.r(w / 2 + 1, 5, w / 2 - 3, h - 11, shade(c.main, 0.08));
      p.r(w / 2 - 1, 5, 2, h - 11, c.dark); p.r(w / 2 - 4, h / 2 - 3, 2, 6, c.dark); p.r(w / 2 + 2, h / 2 - 3, 2, 6, c.dark);
      p.r(0, h - 6, w, 3, c.dark); p.r(2, h - 3, 3, 3, c.dark); p.r(w - 5, h - 3, 3, 3, c.dark);
      break;
    case 'lamp': case 'readingLamp': {
      const glow = o.on ? '#fff1b8' : def.style === 'candy' ? '#f2b8c6' : '#f3e2c2';
      if (def.category === 'readingLamp') {
        p.r(6, 8, 2, h - 12, c.dark); p.r(2, h - 4, 10, 4, c.dark);
        p.rows([[0, 4, 9], [1, 3, 10], [2, 2, 11], [3, 1, 12], [4, 1, 12], [5, 0, 13]], glow); p.r(0, 6, 14, 1, c.dark);
      } else if (def.style === 'candy') {
        p.rows([[0, 3, 8], [1, 1, 10], [2, 0, 11], [3, 0, 11], [4, 0, 11]], glow); p.p(3, 2, '#ffffff'); p.p(8, 3, '#ffffff');
        p.r(4, 5, 4, 9, '#fbf7ef'); p.r(2, 14, 8, 4, c.dark);
      } else {
        p.rows([[0, 3, 8], [1, 2, 9], [2, 2, 9], [3, 1, 10], [4, 1, 10], [5, 0, 11], [6, 0, 11]], glow); p.r(0, 7, 12, 1, shade(glow, -0.2));
        p.r(5, 8, 2, 7, def.style === 'cafe' ? '#c9a227' : c.dark); p.r(2, 15, 8, 3, def.style === 'cafe' ? '#a8851d' : c.dark);
      }
      break;
    }
    case 'rug': {
      const col = def.style === 'forest' ? '#9cb58f' : def.style === 'candy' ? '#fbd6df' : '#e9dcc0';
      p.rows([[0, 10, w - 11], [1, 5, w - 6], [2, 2, w - 3]], col);
      p.r(0, 3, w, h - 6, col);
      p.rows([[h - 3, 2, w - 3], [h - 2, 5, w - 6], [h - 1, 10, w - 11]], col);
      if (def.style === 'candy') for (let x = 4; x < w - 4; x += 6) { p.r(x, 4, 3, 3, '#8fcbd6'); p.r(x + 3, 8, 3, 3, '#f6e27a'); }
      else if (def.style === 'forest') for (let x = 6; x < w - 6; x += 8) { p.r(x, 6, 4, 2, '#6d8765'); p.p(x + 1, 5, '#6d8765'); }
      else { p.rows([[3, 8, w - 9], [h - 4, 8, w - 9]], shade(col, -0.12)); p.r(16, 6, w - 32, 4, shade(col, -0.08)); }
      break;
    }
    case 'curtain': {
      const col = def.style === 'forest' ? '#7d9c72' : def.style === 'dark' ? '#8a3a3f' : '#f3e7d2';
      p.r(0, 0, w, 3, '#7a5235'); p.r(0, 0, 3, 3, '#5e3c27'); p.r(w - 3, 0, 3, 3, '#5e3c27');
      for (const x0 of [2, w - 14]) {
        p.r(x0, 3, 12, h - 3, col);
        for (let x = x0 + 2; x < x0 + 12; x += 3) p.r(x, 3, 1, h - 3, shade(col, -0.15));
        p.r(x0, h * 0.62, 12, 2, '#c9a227');
      }
      break;
    }
    case 'clock': {
      const now = o.now ?? new Date();
      if (def.id === 'clock_digital') {
        p.r(0, 0, w, h, '#2b2a2c'); p.r(1, 1, w - 2, h - 2, '#1c2a22');
        const hh = String(now.getHours()).padStart(2, '0'), mm = String(now.getMinutes()).padStart(2, '0');
        digits(p, 2, 3, `${hh}:${mm}`, '#9cf0a8');
      } else if (def.id === 'clock_cat') {
        p.rows([[0, 1, 3], [0, 12, 14], [1, 1, 4], [1, 11, 14]], '#2b2a2c');
        p.r(0, 2, 16, 14, '#2b2a2c'); p.r(2, 3, 12, 11, '#fbf7ef');
        clockHands(p, 8, 8, 4, now, '#2b2a2c');
        p.p(4, 5, '#2b2a2c'); p.p(11, 5, '#2b2a2c');
        const tail = now.getSeconds() % 2 ? 10 : 6;
        p.r(7, 16, 2, 4, '#2b2a2c'); p.r(tail, 20, 2, 3, '#2b2a2c');
      } else {
        const ring = def.id === 'clock_wood' ? '#b07d52' : '#7a5235';
        p.rows([[0, 5, 12], [1, 3, 14], [2, 2, 15], [3, 1, 16], [4, 1, 16]], ring);
        p.r(0, 5, 18, 8, ring);
        p.rows([[13, 1, 16], [14, 1, 16], [15, 2, 15], [16, 3, 14], [17, 5, 12]], ring);
        p.rows([[2, 6, 11], [3, 4, 13], [4, 3, 14]], '#fbf7ef'); p.r(2, 5, 14, 8, '#fbf7ef'); p.rows([[13, 3, 14], [14, 4, 13], [15, 6, 11]], '#fbf7ef');
        p.p(9, 2, ring); p.p(9, 15, ring); p.p(2, 9, ring); p.p(15, 9, ring);
        clockHands(p, 9, 9, 5, now, '#2b1d1a');
      }
      break;
    }
    case 'plantShelf':
      p.r(2, 0, 2, h, c.dark); p.r(w - 4, 0, 2, h, c.dark);
      for (const y of [10, 24, h - 4]) p.r(0, y, w, 3, '#b07d52');
      p.r(6, 4, 6, 6, '#c96f4a'); p.rows([[0, 7, 10], [1, 6, 11], [2, 5, 12], [3, 6, 11]], '#6d8765');
      p.r(17, 18, 6, 6, '#e9dcc0'); p.rows([[13, 18, 21], [14, 17, 22], [15, 16, 23], [16, 17, 22], [17, 18, 21]], '#9cb58f');
      p.r(8, h - 10, 8, 6, '#c96f4a'); p.rows([[h - 16, 11, 12], [h - 15, 10, 13], [h - 14, 9, 14], [h - 13, 10, 13], [h - 12, 11, 12], [h - 11, 9, 14]], '#4a6045');
      break;
    case 'sofa':
      p.r(4, 0, w - 8, 14, c.main); p.r(4, 0, w - 8, 2, c.light); p.r(w / 2 - 1, 2, 2, 12, c.dark);
      p.r(0, 8, 8, 18, c.dark); p.r(w - 8, 8, 8, 18, c.dark); p.r(0, 8, 8, 2, c.main); p.r(w - 8, 8, 8, 2, c.main);
      p.r(8, 14, w - 16, 8, c.light); p.r(w / 2 - 1, 14, 2, 8, c.main); p.r(8, 21, w - 16, 1, c.dark);
      p.r(4, 22, w - 8, 4, c.dark); p.r(4, 26, 3, h - 26, '#33231b'); p.r(w - 7, 26, 3, h - 26, '#33231b');
      p.rows([[4, 12, 13], [4, 15, 16], [5, 11, 17], [6, 12, 16], [7, 13, 15], [8, 14, 14]], '#e8b8b2');
      break;
    case 'table':
      p.r(0, 0, w, 4, c.light); p.r(0, 3, w, 2, c.dark); p.r(w / 2 - 6, -0, 12, 1, '#fbf7ef');
      p.r(4, 5, 3, h - 5, c.main); p.r(w - 7, 5, 3, h - 5, c.main); p.r(4, h - 8, w - 8, 2, c.dark);
      break;
    case 'mug':
      p.r(0, 1, 5, 6, '#f2b8c6'); p.r(5, 2, 1, 3, '#f2b8c6'); p.p(2, 3, '#e05c6e');
      p.r(8, 1, 5, 6, '#8fcbd6'); p.r(13, 2, 1, 3, '#8fcbd6'); p.p(10, 3, '#e05c6e');
      p.r(0, 1, 5, 1, '#fbe3ea'); p.r(8, 1, 5, 1, '#d3eef3');
      break;
    case 'pillow':
      p.rows([[0, 2, 7], [0, 13, 18], [1, 1, 9], [1, 11, 19], [2, 0, 20], [3, 0, 20], [4, 0, 20], [5, 1, 19], [6, 2, 18], [7, 4, 16], [8, 6, 14], [9, 8, 12], [10, 9, 11]], '#e8b8b2');
      p.rows([[1, 3, 5], [2, 2, 4]], '#fbe3ea'); p.r(9, 4, 3, 2, '#c98d86');
      break;
    case 'projector':
      p.r(0, 3, w, h - 4, '#2b2a2c'); p.r(0, 3, w, 1, '#555'); p.r(w - 6, 5, 5, 5, '#8fcbd6'); p.r(w - 5, 6, 3, 3, o.on ? '#fff6c8' : '#3a5560');
      p.r(2, h - 1, 3, 1, '#1a1a1a'); p.r(w - 5, h - 1, 3, 1, '#1a1a1a'); p.r(3, 6, 6, 1, '#777');
      break;
    case 'photoWall':
      p.line(0, 2, w / 2, 5, '#7a5235'); p.line(w / 2, 5, w - 1, 2, '#7a5235');
      [[3, 5], [15, 7], [27, 7], [37, 4]].forEach(([x, y], i) => {
        p.r(x, y, 8, 10, '#fbf7ef'); p.r(x + 1, y + 1, 6, 6, ['#e8b8b2', '#9cb58f', '#8fcbd6', '#f3c46b'][i]);
        p.r(x + 2, y + 4, 4, 3, shade(['#e8b8b2', '#9cb58f', '#8fcbd6', '#f3c46b'][i], -0.25)); p.p(x + 3, y - 1, '#c96f4a');
      });
      p.rows([[18, 19, 20], [18, 22, 23], [19, 18, 24], [20, 19, 23], [21, 20, 22], [22, 21, 21]], '#e05c6e');
      break;
    case 'deco':
      switch (def.id) {
        case 'deco_poster':
          p.r(0, 0, w, h, '#5e3c27'); p.r(1, 1, w - 2, h - 2, '#f3e2c2'); p.r(2, 2, w - 4, 16, '#f3b27a');
          p.rows([[5, 9, 12], [6, 8, 13], [7, 8, 13], [8, 9, 12]], '#fff1b8'); p.r(2, 14, w - 4, 4, '#6d8765'); p.r(2, 12, 8, 3, '#4a6045');
          p.r(4, 21, w - 8, 2, '#5e3c27'); p.r(6, 25, w - 12, 1, '#a17c5c');
          break;
        case 'deco_garland':
          p.line(0, 1, w / 2, 5, '#5e3c27'); p.line(w / 2, 5, w - 1, 1, '#5e3c27');
          for (let x = 3; x < w - 2; x += 7) { const y = 2 + Math.round(4 * Math.sin((x / w) * Math.PI)); p.r(x, y + 1, 3, 3, ['#f6e27a', '#f2b8c6', '#8fcbd6'][x % 3]); p.p(x + 1, y, '#5e3c27'); }
          break;
        case 'deco_wallshelf':
          p.r(0, 10, w, 3, '#b07d52'); p.r(0, 10, w, 1, '#d6a878'); p.r(3, 13, 2, 1, '#7a5235'); p.r(w - 5, 13, 2, 1, '#7a5235');
          p.r(3, 4, 5, 6, '#fbf7ef'); p.r(8, 5, 1, 3, '#fbf7ef'); p.r(12, 1, 8, 9, '#7a5235'); p.r(13, 2, 6, 7, '#9cb58f');
          p.r(24, 5, 6, 5, '#c96f4a'); p.rows([[1, 26, 27], [2, 25, 28], [3, 24, 29], [4, 25, 28]], '#6d8765');
          break;
        case 'deco_monstera':
          p.r(6, h - 10, 10, 10, '#e9dcc0'); p.r(6, h - 10, 10, 2, '#d0c2a4');
          p.rows([[2, 4, 9], [3, 2, 11], [4, 1, 12], [5, 1, 12], [6, 2, 11], [7, 3, 10], [8, 5, 8]], '#4a7a4f');
          p.rows([[6, 11, 18], [7, 10, 20], [8, 9, 21], [9, 9, 21], [10, 10, 20], [11, 12, 18]], '#5b8c5c');
          p.rows([[13, 3, 9], [14, 2, 10], [15, 2, 10], [16, 3, 9], [17, 5, 7]], '#6d9b67');
          p.p(6, 5, '#e9dcc0'); p.p(8, 6, '#e9dcc0'); p.p(15, 9, '#e9dcc0'); p.p(17, 8, '#e9dcc0'); p.p(6, 15, '#e9dcc0');
          p.line(7, 9, 10, h - 10, '#3d6b42'); p.line(15, 12, 11, h - 10, '#3d6b42'); p.line(6, 17, 10, h - 10, '#3d6b42');
          break;
        case 'deco_record':
          p.r(0, 2, w, h - 2, '#5a3d30'); p.r(2, 0, 10, 8, '#1a1a1a'); p.r(6, 3, 2, 2, '#c84a3e'); p.r(13, 1, 1, 6, '#c9c9c9'); p.r(14, 6, 3, 1, '#c9c9c9');
          break;
      }
      break;
    default:
      p.r(0, 0, w, h, c.main);
  }
}

// ───────── devices ─────────
export function deviceURL(def: DeviceDef, on = false): { url: string; w: number; h: number } {
  if (def.deviceType === 'computer') return { url: sprite(`dev|pc|${on}`, 26, 24, (p) => {
    p.r(2, 0, 22, 16, '#e9e1cf'); p.r(2, 0, 22, 1, '#fbf7ef'); p.r(4, 2, 18, 11, on ? '#2f5b74' : '#26354d');
    if (on) { p.r(5, 3, 6, 4, '#e8b8b2'); p.r(12, 3, 9, 1, '#f6f0e5'); p.r(12, 5, 7, 1, '#f6f0e5'); p.r(5, 9, 15, 3, '#6d8765'); }
    else { p.p(6, 4, '#3d5576'); p.p(7, 5, '#3d5576'); }
    p.r(10, 16, 6, 3, '#c9bfa8'); p.r(6, 19, 14, 2, '#c9bfa8');
    p.r(0, 21, 20, 3, '#efe7d6'); for (let x = 1; x < 19; x += 2) p.p(x, 22, '#b8ad96'); p.r(22, 21, 4, 3, '#efe7d6');
  }), w: 26, h: 24 };
  if (def.deviceType === 'tablet') return { url: sprite(`dev|tab|${on}`, 16, 12, (p) => {
    p.r(0, 0, 16, 12, '#f3ece0'); p.r(1, 1, 14, 9, on ? '#f6f0e5' : '#3d4a5c'); if (on) { p.r(2, 2, 5, 3, '#e8b8b2'); p.r(8, 2, 6, 1, '#795b43'); p.r(8, 4, 5, 1, '#c9b8a0'); }
    p.p(7, 10, '#c9bfa8'); p.p(8, 10, '#c9bfa8');
  }), w: 16, h: 12 };
  const s = def.skin ?? { body: '#c9a789', screen: '#f6f0e5', accent: '#795b43' };
  return { url: sprite(`dev|phone|${def.id}|${on}`, 7, 11, (p) => {
    p.r(0, 0, 7, 11, s.body); p.r(1, 1, 5, 8, on ? s.screen : shade(s.body, -0.45)); p.p(3, 9, s.accent);
  }), w: 7, h: 11 };
}

// ───────── food ─────────
export function foodURL(id: string): string {
  return sprite(`food|${id}`, 14, 14, (p) => {
    switch (id) {
      case 'milk': p.r(3, 3, 8, 10, '#fbf7ef'); p.rows([[1, 5, 8], [2, 4, 9]], '#fbf7ef'); p.r(3, 6, 8, 4, '#8fcbd6'); p.r(6, 0, 2, 1, '#8fcbd6'); p.r(4, 7, 2, 1, '#ffffff'); break;
      case 'fruit': p.r(1, 6, 12, 7, '#fbf7ef'); p.r(1, 6, 12, 1, '#d8cdbd'); p.r(2, 4, 4, 4, '#e05c6e'); p.p(3, 5, '#ffd1d8'); p.r(6, 3, 4, 4, '#f39b45'); p.r(9, 5, 3, 3, '#b9d36b'); p.p(4, 3, '#6d8765'); break;
      case 'pudding': p.rows([[3, 4, 9], [4, 3, 10], [5, 3, 10]], '#8a4b2a'); p.r(3, 6, 8, 5, '#f3c46b'); p.r(2, 11, 10, 2, '#fbf7ef'); p.p(5, 7, '#fde7a6'); break;
      case 'onigiri': p.rows([[2, 6, 7], [3, 5, 8], [4, 4, 9], [5, 3, 10], [6, 2, 11], [7, 2, 11], [8, 1, 12], [9, 1, 12], [10, 1, 12], [11, 1, 12]], '#fbf7ef'); p.r(4, 8, 6, 4, '#2f4a3a'); p.p(6, 5, '#f39b45'); break;
      case 'bread': p.rows([[3, 3, 10], [4, 2, 11], [5, 1, 12]], '#d99865'); p.r(1, 6, 12, 6, '#d99865'); p.r(2, 7, 10, 4, '#f3d9a8'); p.r(3, 4, 2, 1, '#f3d9a8'); break;
      case 'yogurt': p.r(3, 4, 8, 9, '#fbf7ef'); p.r(2, 3, 10, 2, '#e8b8b2'); p.r(4, 7, 6, 3, '#f2b8c6'); p.p(6, 8, '#ffffff'); break;
      case 'juice': p.r(3, 2, 8, 11, '#e9f3f6'); p.r(4, 5, 6, 7, '#f39b45'); p.r(8, 0, 1, 5, '#e05c6e'); p.r(4, 5, 6, 1, '#f8bd7b'); break;
      case 'cake': p.r(2, 6, 10, 7, '#fbf7ef'); p.r(2, 6, 10, 2, '#fbd6df'); p.r(2, 10, 10, 1, '#f2b8c6'); p.r(6, 3, 3, 3, '#e05c6e'); p.p(7, 2, '#6d8765'); break;
      default: p.r(2, 2, 10, 10, '#d99865');
    }
  });
}

// ───────── plants (balcony) ─────────
export function plantURL(def: PlantDef, stage: number, thirsty: boolean): string {
  return sprite(`plant|${def.id}|${stage}|${thirsty}`, 24, 34, (p) => {
    const g = thirsty ? '#8e9f6a' : '#5b8c5c', g2 = thirsty ? '#a9b47e' : '#7fb277', g3 = thirsty ? '#6f7d52' : '#3d6b42';
    const potCol = def.group === '多肉植物' ? '#e9dcc0' : def.group === '花卉' ? '#c96f4a' : '#b07d52';
    p.r(5, 24, 14, 10, potCol); p.r(4, 22, 16, 3, shade(potCol, -0.1)); p.r(4, 22, 16, 1, shade(potCol, 0.2)); p.r(6, 26, 2, 6, shade(potCol, 0.15));
    p.r(6, 23, 12, 1, '#5e3c27');
    const s = Math.max(0, Math.min(4, stage));
    const droop = thirsty ? 1 : 0;
    switch (def.kind) {
      case 'rosette': case 'jade': {
        const r = 2 + s;
        const col = def.kind === 'jade' ? '#8fbf9a' : '#9cc5b0';
        for (let i = 0; i < r; i++) p.r(12 - i - 1, 21 - Math.floor(i * 0.8), 2 * i + 2, 2, i % 2 ? col : shade(col, -0.12));
        p.r(11, 22 - r, 2, 2, shade(col, 0.2));
        if (def.kind === 'jade') for (let i = 0; i < s; i++) p.p(10 + i * 2, 20 - i, '#e2f3e6');
        if (s >= 4) { p.r(16, 10, 1, 8, '#7fb277'); p.r(15, 8, 3, 2, '#f2b8c6'); }
        break;
      }
      case 'haworthia':
        for (let i = 0; i < 3 + s; i++) { const x = 7 + i * 2 - (i > 3 ? 4 : 0), h = 5 + s + (i % 2) * 2; p.r(x, 22 - h, 2, h, g3); for (let y = 22 - h + 1; y < 22; y += 2) p.p(x, y, '#e2f3e6'); }
        break;
      case 'snake':
        for (let i = 0; i < 2 + Math.ceil(s / 1.3); i++) { const x = 7 + i * 3, h = 6 + s * 2 + (i % 2) * 3; p.r(x, 22 - h, 2, h, g); p.r(x, 22 - h, 1, h, '#c9d36b'); p.p(x + 1, 22 - h + 2, g3); }
        break;
      case 'monstera': case 'philo': case 'lily': case 'pothos': case 'bird': {
        const leaves = 1 + s;
        for (let i = 0; i < leaves; i++) {
          const ang = (i / Math.max(1, leaves - 1) - 0.5) * 1.8;
          const len = def.kind === 'bird' ? 8 + s * 2 : 5 + s * 1.5;
          const x = Math.round(12 + Math.sin(ang) * len), y = Math.round(21 - Math.cos(ang) * len * (1 - droop * 0.35));
          p.line(12, 21, x, y, g3);
          const lw = def.kind === 'monstera' ? 3 : 2;
          p.rows([[y - 1, x - lw + 1, x + lw - 1], [y, x - lw, x + lw], [y + 1, x - lw + 1, x + lw - 1]], i % 2 ? g : g2);
          if (def.kind === 'monstera' && s >= 2) p.p(x, y, '#e9dcc0');
          if (def.kind === 'pothos') p.p(x - 1, y, '#e5d36a');
        }
        if (def.kind === 'pothos' && s >= 3) { p.line(5, 24, 2, 32, g); p.r(1, 28, 2, 2, g2); p.line(19, 24, 22, 31, g); }
        if (def.kind === 'lily' && s >= 3) { p.line(12, 21, 13, 6, g3); p.rows([[4, 12, 14], [5, 12, 15], [6, 12, 14]], '#fbf7ef'); p.p(13, 3, '#f6e27a'); }
        if (def.kind === 'bird' && s >= 4) { p.rows([[5, 15, 18], [6, 14, 19]], '#f39b45'); p.rows([[4, 16, 17]], '#5d7fa6'); }
        break;
      }
      case 'lavender': case 'daisy': case 'rose': {
        const stems = 2 + s;
        for (let i = 0; i < stems; i++) {
          const x = 7 + Math.round((i * 10) / Math.max(1, stems - 1)), top = 20 - (4 + s * 2) + (i % 2) * 2 + droop * 2;
          p.r(x, top, 1, 22 - top, g3);
          if (i % 2 === 0) p.r(x - 1, top + 4, 2, 1, g2);
          if (s >= 2) {
            if (def.kind === 'lavender') { for (let y = top - 3; y < top + 1; y++) p.p(x + (y % 2), y, '#9b83c4'); p.p(x, top - 4, '#b9a6dc'); }
            else if (def.kind === 'daisy') { p.rows([[top - 2, x, x], [top - 1, x - 1, x + 1], [top, x, x]], '#ffffff'); p.p(x, top - 1, '#f6c94a'); }
            else { p.rows([[top - 2, x - 1, x + 1], [top - 1, x - 1, x + 1]], '#d9475a'); p.p(x, top - 2, '#f08a96'); }
          }
        }
        break;
      }
    }
    if (thirsty) { p.r(6, 23, 12, 1, '#a07a55'); }
  }, { outline: '#3a2a20' });
}

// ───────── window with real-time sky ─────────
export function windowURL(part: DayPart, w = 52, h = 44): string {
  return sprite(`win|${part}|${w}x${h}`, w, h, (p) => {
    const skies: Record<DayPart, [string, string]> = {
      dawn: ['#f7c6b3', '#c9d7ea'], day: ['#8fcbea', '#cfe9f5'], dusk: ['#f39b65', '#f6d29a'], night: ['#26354d', '#3a4d6e'], midnight: ['#141c2b', '#1f2a40'],
    };
    const [top, bottom] = skies[part];
    p.r(0, 0, w, h, '#f3e7d2');
    p.r(3, 3, w - 6, h - 6, bottom); p.r(3, 3, w - 6, Math.floor((h - 6) / 2), top);
    if (part === 'day' || part === 'dawn') { p.r(8, 10, 10, 3, '#ffffff'); p.r(10, 8, 6, 2, '#ffffff'); p.r(w - 18, 18, 9, 2, '#ffffff'); p.r(w - 16, 16, 5, 2, '#ffffff'); }
    if (part === 'day') { p.r(w - 15, 6, 6, 6, '#fff1b8'); p.r(w - 14, 5, 4, 8, '#fff1b8'); }
    if (part === 'dawn') { p.rows([[h - 9, 10, 17], [h - 10, 11, 16], [h - 11, 12, 15]], '#ffd9a0'); }
    if (part === 'dusk') { p.rows([[h - 12, 22, 29], [h - 13, 21, 30], [h - 14, 22, 29], [h - 15, 23, 28]], '#ffcf7a'); p.r(3, h - 10, w - 6, 3, '#e07a5f'); }
    if (part === 'night' || part === 'midnight') {
      for (const [x, y] of [[8, 8], [16, 14], [26, 7], [36, 12], [12, 22], [40, 24], [30, 20], [20, 28]] as [number, number][]) if (x < w - 4 && y < h - 4) p.p(x, y, part === 'night' ? '#fff6c8' : '#cfd8ff');
      p.rows([[6, w - 14, w - 11], [7, w - 15, w - 12], [8, w - 15, w - 12], [9, w - 15, w - 12], [10, w - 14, w - 11]], '#fff1b8');
      p.rows([[7, w - 12, w - 11], [8, w - 12, w - 11], [9, w - 12, w - 11]], top);
    }
    // city silhouette
    p.r(3, h - 8, 8, 5, shade(bottom, -0.35)); p.r(12, h - 11, 6, 8, shade(bottom, -0.3)); p.r(19, h - 7, 10, 4, shade(bottom, -0.4)); p.r(30, h - 12, 7, 9, shade(bottom, -0.3)); p.r(38, h - 9, w - 41, 6, shade(bottom, -0.38));
    if (part === 'night' || part === 'midnight' || part === 'dusk') for (const [x, y] of [[14, h - 9], [32, h - 10], [34, h - 7], [5, h - 6]] as [number, number][]) p.p(x, y, '#ffe08a');
    p.r(Math.floor(w / 2) - 1, 3, 2, h - 6, '#f3e7d2'); p.r(3, Math.floor(h / 2) - 1, w - 6, 2, '#f3e7d2');
    p.r(0, h - 3, w, 3, '#d6c4a2');
  });
}

export function doorURL(kind: 'balcony' | 'entry'): string {
  return sprite(`door|${kind}`, 28, 56, (p) => {
    if (kind === 'balcony') {
      p.r(0, 0, 28, 56, '#f3e7d2'); p.r(3, 3, 22, 50, '#bfe0ec'); p.r(13, 3, 2, 50, '#f3e7d2'); p.r(3, 26, 22, 2, '#f3e7d2');
      p.line(5, 8, 10, 3, '#e6f5fa'); p.line(16, 30, 22, 24, '#e6f5fa'); p.r(10, 38, 2, 6, '#c9a227'); p.r(16, 38, 2, 6, '#c9a227');
    } else {
      p.r(0, 0, 28, 56, '#7a5235'); p.r(2, 2, 24, 54, '#b07d52'); p.r(5, 6, 18, 18, '#a26f47'); p.r(5, 30, 18, 20, '#a26f47'); p.r(21, 28, 3, 3, '#e3c26a');
    }
  });
}

// ───────── 12×12 UI icons from ascii maps ─────────
const ICON_PAL: Record<string, string> = { k: '#2b1d1a', y: '#f6c94a', o: '#d99865', b: '#795b43', w: '#ffffff', p: '#e8b8b2', r: '#d9475a', g: '#6d8765', G: '#354b3b', c: '#8fcbd6', n: '#26354d', s: '#c9b8a0', e: '#f6f0e5' };
const ICONS: Record<string, string[]> = {
  coin: ['...kkkkk....', '..kyyyyyk...', '.kyywwyyyk..', '.kywyyyyyk..', '.kyyybyyyk..', '.kyyybyyyk..', '.kyyybyyyk..', '.kyyyyyyok..', '..koyyyook..', '...kkkkk....', '............', '............'],
  heart: ['............', '.kkk...kkk..', 'krrrk.krrrk.', 'krwrrkrrrrk.', 'krrrrrrrrrk.', '.krrrrrrrk..', '..krrrrrk...', '...krrrk....', '....krk.....', '.....k......', '............', '............'],
  book: ['............', '.kkkkkkkkk..', '.kpppppppbk.', '.kpwwwwwpbk.', '.kpppppppbk.', '.kpwwwwppbk.', '.kpppppppbk.', '.kpppppppbk.', '.kkkkkkkkbk.', '..keeeeeeek.', '..kkkkkkkkk.', '............'],
  flame: ['.....k......', '....kok.....', '...koook....', '...koyok.k..', '..koyyookok.', '..koyyyoook.', '.koyywyyook.', '.koyywwyyok.', '.koyywwyyok.', '..koyyyyok..', '...kkkkkk...', '............'],
  crown: ['............', '.k...k...k..', 'kyk.kyk.kyk.', 'kyykyyykyyk.', 'kyyyyyyyyyk.', 'kyyryyyryyk.', 'kyyyyyyyyyk.', 'koooooooook.', '.kkkkkkkkk..', '............', '............', '............'],
  check: ['............', '.........kk.', '........kgk.', '.......kgk..', '.kk...kgk...', 'kgk..kgk....', '.kgkkgk.....', '..kggk......', '...kk.......', '............', '............', '............'],
  shelf: ['kkkkkkkkkkk.', 'kbbbbbbbbbk.', 'kbrbgbcbpbk.', 'kbrbgbcbpbk.', 'kkkkkkkkkkk.', 'kbbbbbbbbbk.', 'kbybpbgbrbk.', 'kbybpbgbrbk.', 'kkkkkkkkkkk.', 'kb.......bk.', 'kk.......kk.', '............'],
  page: ['.kkkkkk.....', '.keeeeekk...', '.keeeeekek..', '.kessseeek..', '.keeeeeeek..', '.kesssssek..', '.keeeeeeek..', '.kesssssek..', '.keeeeeeek..', '.kkkkkkkkk..', '............', '............'],
  clock: ['...kkkkk....', '..keeeeek...', '.keeekeeek..', '.keeekeeek..', '.keeekkkek..', '.keeeeeeek..', '.keeeeeeek..', '..keeeeek...', '...kkkkk....', '............', '............', '............'],
  star: ['.....k......', '....kyk.....', '....kyk.....', 'kkkkyyykkkk.', '.kyyyyyyyk..', '..kyyyyyk...', '..kyykyyk...', '.kyyk.kyyk..', '.kkk...kkk..', '............', '............', '............'],
  quote: ['............', '.kkk..kkk...', 'kbbbk.kbbbk.', 'kbbbk.kbbbk.', '.kkbk..kkbk.', '..kbk...kbk.', '.kbk...kbk..', '.kk....kk...', '............', '............', '............', '............'],
  pen: ['........kk..', '.......kpk..', '......kpk...', '.....kck....', '....kck.....', '...kck......', '..kbk.......', '.kbk........', '.kk.........', 'k...........', '............', '............'],
  leaf: ['........kkk.', '......kkggk.', '....kkgggk..', '...kggggGk..', '..kgggGgk...', '..kggGggk...', '..kgGggk....', '..kGkkk.....', '.kGk........', 'kk..........', '............', '............'],
  gift: ['...kk.kk....', '..krrkrrk...', '...krrrk....', 'kkkkkrkkkkk.', 'kpppprppppk.', 'kkkkkrkkkkk.', '.kppprpppk..', '.kppprpppk..', '.kppprpppk..', '.kkkkkkkkk..', '............', '............'],
  chat: ['............', '.kkkkkkkkk..', 'keeeeeeeeek.', 'kebebebebek.', 'keeeeeeeeek.', 'keeeeeeeeek.', '.kkkeekkkk..', '...keek.....', '...kek......', '...kk.......', '............', '............'],
  call: ['............', '.kk.........', 'kgkk........', 'kggk........', '.kgk........', '.kggk.......', '..kggk..kk..', '...kggkkgk..', '....kgggggk.', '.....kkkkk..', '............', '............'],
  home: ['.....kk.....', '....kook....', '...koooo k..', '..koooooookk', '.kkkkkkkkkk.', '..keeeeeek..', '..kebbeeek..', '..kebbeccek.', '..kebbeccek.', '..kkkkkkkk..', '............', '............'],
  plus: ['............', '....kkk.....', '....kwk.....', '....kwk.....', '.kkkkwkkkk..', '.kwwwwwwwk..', '.kkkkwkkkk..', '....kwk.....', '....kwk.....', '....kkk.....', '............', '............'],
  journal: ['............', '.kkkkkkkk...', '.kggggggbk..', '.kgeeeegbk..', '.kgggggggk..', '.kgeeeeegk..', '.kgggggggk..', '.kgggggggk..', '.kkkkkkkkk..', '............', '............', '............'],
  library: ['............', '.kkk.kk.kkk.', '.krk.kgkkck.', '.krk.kgkkck.', '.krk.kgkkck.', '.krk.kgkkck.', '.krk.kgkkck.', '.kkk.kkkkkk.', 'kkkkkkkkkkkk', '............', '............', '............'],
  gear: ['....kkk.....', '.kk.kek.kk..', '.kekkeeekek.', '..keekkeek..', 'kkeek..keekk', 'keek....keek', 'kkeek..keekk', '..keekkeek..', '.kekkeeekek.', '.kk.kek.kk..', '....kkk.....', '............'],
  chart: ['............', 'k...........', 'k.......kk..', 'k.......kgk.', 'k...kk..kgk.', 'k...kok.kgk.', 'k.kkkok.kgk.', 'k.kpkok.kgk.', 'k.kpkok.kgk.', 'kkkkkkkkkkkk', '............', '............'],
  calendar: ['.k.....k....', 'kkkkkkkkkk..', 'krrrrrrrrk..', 'kkkkkkkkkk..', 'kesesesek...', 'keeeeeeek...', 'kesesesek...', 'keeeeeeek...', 'kkkkkkkkk...', '............', '............', '............'],
  trophy: ['.kkkkkkkk...', 'kkyyyyyykk..', 'kykyyyyyky..', 'kykyyyyyky..', '.kkyyyyykk..', '...kyyyk....', '....kyk.....', '...kkykk....', '..kbbbbbk...', '..kkkkkkk...', '............', '............'],
  wallet: ['............', '..kkkkkkk...', '.kbbbbbbbk..', 'kkkkkkkkkkk.', 'kbbbbbbkkkk.', 'kbbbbbbkyyk.', 'kbbbbbbkkkk.', 'kbbbbbbbbbk.', 'kkkkkkkkkkk.', '............', '............', '............'],
  phone: ['...kkkkk....', '...kpppk....', '...keeek....', '...keeek....', '...keeek....', '...keeek....', '...keeek....', '...kpkpk....', '...kkkkk....', '............', '............', '............'],
  shirt: ['..kk...kk...', '.kbbk.kbbk..', 'kbbbbkbbbbk.', 'kkbbbbbbbkk.', '.kkbbbbbkk..', '..kbbbbbk...', '..kbbbbbk...', '..kbbbbbk...', '..kkkkkkk...', '............', '............', '............'],
  fridge: ['.kkkkkkk....', '.keeeeek....', '.keeeekk....', '.kkkkkkk....', '.keeeeek....', '.keeeekk....', '.keeeekk....', '.keeeeek....', '.kkkkkkk....', '..k...k.....', '............', '............'],
  plant: ['....k.k.....', '...kgkgk....', '..kgggggk...', '...kgGgk....', '....kGk.....', '..kkkkkkk...', '..kooooook..', '...kooook...', '...kooook...', '....kkkk....', '............', '............'],
  backup: ['............', '....kkk.....', '...kccck....', '..kccccck...', '.kkkcckkk...', '...kcck.....', '...kcck.....', 'kk.kkkk.kk..', 'kekkkkkkkek.', 'keeeeeeeeek.', 'kkkkkkkkkkk.', '............'],
  more: ['............', '............', '............', '.kk..kk..kk.', 'kyyk.kgk.kpk', '.kk..kk..kk.', '............', '............', '............', '............', '............', '............'],
};
export function iconURL(name: string): string {
  const map = ICONS[name] ?? ICONS.star;
  return sprite(`icon|${name}`, 12, 12, (p) => {
    map.forEach((row, y) => [...row].forEach((ch, x) => { const col = ICON_PAL[ch]; if (col) p.p(x, y, col); }));
  }, { outline: false, margin: 0 });
}
