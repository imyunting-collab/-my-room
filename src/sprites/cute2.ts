// More original pixel art: reading-map props, frames, festival & quest furniture.
import type { FurnitureDef } from '../data/catalog';
import { Painter, shade } from './pixel';

type Draw = (p: Painter, d: FurnitureDef, o: { on?: boolean; frame?: number; cards?: string[] }) => void;
const INK = '#2b1d1a', RED = '#e05c6e', PINK = '#f2b8c6', YEL = '#f6e27a', GRAY = '#c9c9c9', BROWN = '#b07d52', BROWN_D = '#7a5235', SKY = '#8fcbd6';
function heart(p: Painter, x: number, y: number, col: string) { p.rows([[y, x, x + 1], [y, x + 3, x + 4], [y + 1, x, x + 4], [y + 2, x + 1, x + 3], [y + 3, x + 2, x + 2]], col); }

export const CUTE2: Record<string, Draw> = {
  poem_board: (p, d) => {
    p.r(0, 0, d.w, 24, BROWN); p.r(2, 2, d.w - 4, 20, '#2f4a3a');
    p.r(5, 6, 14, 1, '#e9f0e4'); p.r(5, 10, 18, 1, '#e9f0e4'); p.r(5, 14, 10, 1, '#e9f0e4'); p.r(18, 16, 4, 1, '#e9f0e4'); p.p(22, 5, YEL);
    p.r(4, 24, 2, d.h - 24, BROWN_D); p.r(d.w - 6, 24, 2, d.h - 24, BROWN_D); p.line(5, 26, d.w - 6, d.h - 2, BROWN_D); p.r(2, 22, 6, 2, '#fffaf0');
  },
  microscope: (p, d) => {
    p.r(2, d.h - 3, 12, 3, '#3a3a3c'); p.r(8, 6, 3, d.h - 9, '#5a5a5e'); p.r(4, 10, 8, 2, '#5a5a5e');
    p.line(3, 0, 8, 8, '#3a3a3c'); p.line(4, 0, 9, 8, '#3a3a3c'); p.r(2, 0, 3, 2, '#1f1f22'); p.r(5, 8, 3, 2, GRAY); p.r(4, 12, 6, 1, SKY);
  },
  chem_set: (p, d) => {
    p.r(0, d.h - 3, d.w, 3, BROWN); p.r(0, d.h - 3, d.w, 1, '#d6a878');
    p.rows([[3, 2, 4], [4, 2, 4], [5, 1, 5], [6, 0, 6], [7, 0, 6], [8, 0, 6], [9, 0, 6], [10, 1, 5]], '#e6f4f8'); p.r(0, 7, 7, 4, '#f2a0c8');
    p.r(9, 2, 4, 9, '#e6f4f8'); p.r(9, 6, 4, 5, '#9cf0a8'); p.r(14, 5, 4, 6, '#e6f4f8'); p.r(14, 8, 4, 3, SKY); p.p(11, 4, '#ffffff'); p.p(3, 1, '#e6f4f8');
  },
  globe: (p, d, o) => {
    const off = (o.frame ?? 0) % 2 ? 2 : 0;
    p.rows([[1, 5, 8], [2, 3, 10], [3, 2, 11], [4, 2, 11], [5, 2, 11], [6, 2, 11], [7, 2, 11], [8, 3, 10], [9, 5, 8]], '#6aaad6');
    p.r(4 + off, 3, 3, 2, '#7fb277'); p.r(7 - off, 6, 3, 2, '#7fb277'); p.r(5, 8, 2, 1, '#7fb277');
    p.line(1, 2, 1, 9, '#c9a227'); p.line(1, 2, 7, 0, '#c9a227'); p.line(1, 9, 7, 11, '#c9a227');
    p.r(6, 11, 2, 4, BROWN_D); p.r(3, d.h - 3, 8, 3, BROWN);
  },
  easel: (p, d) => {
    p.line(4, d.h - 1, 12, 0, BROWN_D); p.line(d.w - 5, d.h - 1, 13, 0, BROWN_D); p.r(12, 4, 2, d.h - 4, BROWN_D);
    p.r(2, 4, d.w - 4, 22, '#fffaf0'); p.r(3, 5, d.w - 6, 20, '#d6eef8'); p.rows([[17, 3, 22], [16, 5, 9], [15, 6, 8], [16, 14, 19], [15, 15, 18]], '#5d7fa6');
    p.r(3, 18, d.w - 6, 7, '#7aa3c9'); p.r(16, 8, 4, 4, '#f6c93c'); p.r(1, 26, d.w - 2, 2, BROWN); p.r(18, 27, 4, 2, RED); p.r(6, 27, 3, 2, YEL);
  },
  print_press: (p, d) => {
    p.r(0, d.h - 3, d.w, 3, '#3a3a3c'); p.r(2, 10, d.w - 4, d.h - 13, '#5a3d30'); p.r(2, 10, d.w - 4, 1, '#7e5a48');
    p.r(4, 4, d.w - 8, 6, GRAY); p.r(4, 4, d.w - 8, 1, '#ffffff'); p.r(d.w / 2 - 1, 0, 2, 4, '#5a5a5e'); p.r(d.w / 2 - 6, 0, 12, 2, '#5a5a5e');
    p.r(6, 12, d.w - 12, 7, '#fffaf0'); p.rows([[17, 7, 23], [16, 8, 12], [15, 9, 11], [16, 16, 21], [15, 17, 20]], '#3d6ea8'); p.r(7, 18, d.w - 14, 1, '#5d8ac0');
  },
  old_trunk: (p, d) => {
    p.rows([[0, 3, d.w - 4], [1, 1, d.w - 2]], '#8a5a3b'); p.r(0, 2, d.w, d.h - 2, '#6b4433'); p.r(0, 7, d.w, 2, '#3a2419');
    p.r(4, 0, 2, d.h, '#c9a227'); p.r(d.w - 6, 0, 2, d.h, '#c9a227'); p.r(d.w / 2 - 2, 6, 4, 4, '#c9a227'); p.p(d.w / 2, 8, INK);
    p.r(8, 12, 6, 4, '#e9dcc0'); p.r(16, 13, 5, 3, '#c96f4a');
  },
  art_frame: (p, d) => {
    p.r(0, 0, d.w, d.h, '#c9a227'); p.r(1, 1, d.w - 2, d.h - 2, '#e8c45a'); p.r(2, 2, d.w - 4, d.h - 4, '#fffaf0'); p.r(3, 3, d.w - 6, d.h - 6, '#e9e2d6');
    p.p(0, 0, '#a8851d'); p.p(d.w - 1, 0, '#a8851d'); p.p(0, d.h - 1, '#a8851d'); p.p(d.w - 1, d.h - 1, '#a8851d');
  },
  card_wall: (p, d, o) => {
    p.line(1, 3, d.w / 2, 0, BROWN_D); p.line(d.w / 2, 0, d.w - 2, 3, BROWN_D);
    p.r(0, 4, d.w, 2, BROWN); p.r(0, d.h - 2, d.w, 2, BROWN);
    const cards = (o.cards ?? []).slice(0, 3);
    for (let i = 0; i < 3; i++) {
      const x = 3 + i * 14, col = cards[i];
      if (!col) { p.r(x, 8, 12, 14, '#e9dcc0'); p.r(x + 1, 9, 10, 12, '#f3ece0'); continue; }
      p.r(x, 8, 12, 15, '#fffaf0'); p.r(x + 1, 9, 10, 8, col); p.r(x + 2, 18, 8, 1, '#c9b89a'); p.r(x + 2, 20, 6, 1, '#c9b89a'); p.p(x + 5, 7, RED);
    }
  },
  xmas_tree: (p, d, o) => {
    const on = !!o.on;
    p.rows([[0, 14, 15], [1, 13, 16]], YEL); p.p(14, 2, YEL);
    for (let i = 0; i < 4; i++) { const y = 3 + i * 9, half = 4 + i * 3; p.rows(Array.from({ length: 9 }, (_, k) => [y + k, 15 - Math.min(half, 2 + k + i * 2), 14 + Math.min(half, 2 + k + i * 2)] as [number, number, number]), i % 2 ? '#3f7a4c' : '#4a8a58'); }
    for (const [x, y, c] of [[12, 8, RED], [17, 12, SKY], [10, 18, YEL], [19, 21, RED], [8, 28, PINK], [15, 26, YEL], [22, 31, SKY], [6, 34, RED]] as [number, number, string][]) p.r(x, y, 2, 2, on ? c : shade(c, -0.35));
    p.r(12, 39, 6, 4, BROWN_D); p.r(8, 42, 14, 4, '#c96f4a'); p.r(8, 42, 14, 1, '#e8956a');
  },
  snowman: (p, d) => {
    p.rows([[0, 6, 11], [1, 5, 12]], '#3a3a3c'); p.r(4, 2, 10, 1, '#3a3a3c');
    p.rows([[3, 6, 11], [4, 5, 12], [5, 5, 12], [6, 5, 12], [7, 5, 12], [8, 6, 11]], '#ffffff'); p.p(7, 5, INK); p.p(10, 5, INK); p.r(8, 6, 2, 1, '#f39b3c');
    p.r(4, 9, 10, 2, RED); p.r(11, 10, 2, 4, RED);
    p.rows([[11, 4, 13], [12, 3, 14], [13, 2, 15], [14, 2, 15], [15, 2, 15], [16, 2, 15], [17, 2, 15], [18, 2, 15], [19, 3, 14], [20, 4, 13], [21, 6, 11]], '#ffffff');
    p.p(8, 14, INK); p.p(8, 17, INK); p.r(2, 22, 14, 2, '#d6eef8');
  },
  fireworks_jar: (p, d) => {
    p.r(1, 4, 10, d.h - 4, '#d6f4ff'); p.r(1, 4, 1, d.h - 4, '#ffffff'); p.r(0, 3, 12, 2, '#c9a227');
    for (const [x, y, c] of [[3, 7, RED], [7, 9, YEL], [4, 11, PINK], [8, 6, SKY]] as [number, number, string][]) { p.p(x, y, c); p.p(x + 1, y, c); p.p(x, y + 1, c); }
    p.r(5, 0, 1, 3, YEL); p.p(4, 0, RED); p.p(6, 1, RED);
  },
  red_lantern: (p, d, o) => {
    const c = o.on ? '#f05a4a' : '#c43a3a';
    p.r(7, 0, 2, 3, '#c9a227'); p.r(4, 3, 8, 2, '#c9a227');
    p.rows([[5, 3, 12], [6, 1, 14], [7, 0, 15], [8, 0, 15], [9, 0, 15], [10, 0, 15], [11, 0, 15], [12, 0, 15], [13, 0, 15], [14, 1, 14], [15, 3, 12]], c);
    for (let x = 3; x < 14; x += 3) p.r(x, 6, 1, 9, shade(c, -0.2));
    if (o.on) p.r(6, 8, 4, 5, '#ffd36a');
    p.r(4, 16, 8, 2, '#c9a227'); p.r(7, 18, 2, 6, '#f3c46b'); p.r(6, 24, 4, 1, '#f3c46b'); p.r(7, 25, 2, d.h - 27, BROWN_D); p.r(3, d.h - 2, 10, 2, BROWN_D);
  },
  choco_box: (p, d) => {
    p.r(0, 2, d.w, d.h - 2, RED); p.r(0, 2, d.w, 1, '#f28a96'); p.r(d.w / 2 - 1, 2, 2, d.h - 2, YEL); p.r(0, 5, d.w, 1, YEL);
    p.rows([[0, 4, 5], [0, 8, 9], [1, 5, 8]], YEL); heart(p, 2, 6, '#7a3a2a');
  },
  rabbit_lantern: (p, d, o) => {
    const b = o.on ? '#fff6e0' : '#f3ece0';
    p.r(5, 0, 3, 7, b); p.r(11, 0, 3, 7, b); p.r(6, 1, 1, 5, PINK); p.r(12, 1, 1, 5, PINK);
    p.rows([[7, 4, 15], [8, 2, 17], [9, 1, 18], [10, 1, 18], [11, 1, 18], [12, 1, 18], [13, 1, 18], [14, 2, 17], [15, 3, 16]], b);
    p.p(6, 10, RED); p.p(13, 10, RED); p.r(9, 12, 2, 1, PINK); if (o.on) p.r(7, 13, 6, 2, '#ffe9a8');
    p.r(3, 16, 14, 2, '#c43a3a'); p.r(8, 18, 4, 3, '#c43a3a'); p.r(9, 21, 2, d.h - 21, BROWN_D);
  },
  mooncake_box: (p, d) => {
    p.r(0, 2, d.w, d.h - 2, '#8a3a3f'); p.r(0, 2, d.w, 1, '#a54b51'); p.r(1, 0, d.w - 2, 2, '#c9a227');
    p.r(3, 4, 5, 4, '#e8b066'); p.r(10, 4, 5, 4, '#e8b066'); p.p(5, 5, '#c98a3c'); p.p(12, 5, '#c98a3c'); p.p(d.w - 3, 8, YEL);
  },
  tent_fort: (p, d) => {
    p.rows(Array.from({ length: 26 }, (_, k) => [k + 2, 20 - Math.round(k * 0.75) - 1, 19 + Math.round(k * 0.75)] as [number, number, number]), '#f6e2ea');
    for (let k = 4; k < 28; k += 6) p.r(20 - Math.round(k * 0.75), k, Math.round(k * 1.5), 1, '#f2b8c6');
    p.rows(Array.from({ length: 14 }, (_, k) => [k + 14, 20 - Math.round(k * 0.4) - 1, 19 + Math.round(k * 0.4)] as [number, number, number]), '#3a2a30');
    p.r(19, 0, 2, 4, BROWN_D); p.r(21, 0, 4, 3, YEL);
    p.r(0, 28, d.w, 6, '#e8b8b2'); p.r(2, 28, 10, 4, '#fbf7ef'); p.r(28, 28, 10, 4, SKY); p.p(36, 26, YEL); p.p(5, 25, YEL);
  },
  puzzle_wall: (p, d) => {
    p.r(0, 0, d.w, d.h, BROWN); p.r(2, 2, d.w - 4, d.h - 4, '#8fcbea');
    p.r(2, 14, d.w - 4, d.h - 16, '#7fb277'); p.r(22, 5, 5, 5, YEL); p.r(6, 9, 10, 3, '#ffffff');
    for (let x = 2; x < d.w - 2; x += 6) p.r(x, 2, 1, d.h - 4, 'rgba(0,0,0,0.12)'); for (let y = 2; y < d.h - 2; y += 6) p.r(2, y, d.w - 4, 1, 'rgba(0,0,0,0.12)');
    p.r(26, 17, 6, 6, '#e9dcc0'); heart(p, 12, 16, RED);
  },
  beanbag_pair: (p, d) => {
    for (const [x, c] of [[0, '#f2b8c6'], [22, '#8fcbd6']] as [number, string][]) {
      p.rows([[0, x + 6, x + 16], [1, x + 3, x + 19], [2, x + 1, x + 21]], c); p.r(x, 3, 22, d.h - 6, c);
      p.rows([[d.h - 3, x, x + 21], [d.h - 2, x + 1, x + 20], [d.h - 1, x + 3, x + 18]], shade(c, -0.15)); p.r(x + 5, 6, 10, 5, shade(c, -0.08));
    }
    heart(p, 20, 4, RED);
  },
  swap_shelf: (p, d) => {
    p.r(0, 0, d.w, d.h, BROWN_D); p.r(2, 2, d.w - 4, d.h - 6, '#4e3427');
    const rows = [[4, ['#e05c6e', '#f3c46b', '#5d7fa6', '#6d8765', '#e8b8b2']], [17, ['#8d7bb0', '#d99865', '#3f6a54', '#c96f4a']], [30, ['#5f9b8e', '#f2b8c6', '#b5654f']]] as [number, string[]][];
    for (const [y, cols] of rows) { cols.forEach((c, i) => p.r(4 + i * 4, y, 3, 10 - (i % 3), c)); p.r(2, y + 10, d.w - 4, 2, BROWN); }
    p.r(22, 18, 4, 3, '#fffaf0'); heart(p, 21, 31, RED); p.r(0, d.h - 3, d.w, 3, BROWN);
  },
};
