// Low-level pixel painter + sprite cache. All art is drawn procedurally (original pixel art).

export class Painter {
  constructor(public ctx: CanvasRenderingContext2D, public ox = 0, public oy = 0) {}
  r(x: number, y: number, w: number, h: number, c: string) {
    if (w <= 0 || h <= 0) return;
    this.ctx.fillStyle = c;
    this.ctx.fillRect(this.ox + x, this.oy + y, w, h);
  }
  p(x: number, y: number, c: string) { this.r(x, y, 1, 1, c); }
  /** horizontal rows from a list: [y, x0, x1] inclusive */
  rows(rows: [number, number, number][], c: string) { for (const [y, a, b] of rows) this.r(a, y, b - a + 1, 1, c); }
  clear(x: number, y: number, w: number, h: number) { this.ctx.clearRect(this.ox + x, this.oy + y, w, h); }
  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, x = x0, y = y0;
    for (;;) {
      this.p(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }
  with(dx: number, dy: number, fn: () => void) { this.ox += dx; this.oy += dy; fn(); this.ox -= dx; this.oy -= dy; }
}

export function hasCanvas(): boolean {
  if (typeof document === 'undefined') return false;
  const c = document.createElement('canvas');
  return !!(c.getContext && c.getContext('2d'));
}

/** Adds a 1px outline around the opaque silhouette. */
export function outline(ctx: CanvasRenderingContext2D, w: number, h: number, color = '#2b1d1a') {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const [r, g, b] = hex(color);
  const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 40;
  const marks: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (opaque(x, y)) continue;
    if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) marks.push((y * w + x) * 4);
  }
  for (const i of marks) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
  ctx.putImageData(img, 0, 0);
}

export function hex(c: string): [number, number, number] {
  const s = c.replace('#', '');
  const f = s.length === 3 ? s.split('').map((x) => x + x).join('') : s;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
}
export function shade(c: string, amt: number): string {
  const [r, g, b] = hex(c);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const cache = new Map<string, string>();
const EMPTY = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

/** Render once into a data URL (cached by key). Falls back to a blank pixel where canvas is unavailable. */
export function sprite(key: string, w: number, h: number, draw: (p: Painter, ctx: CanvasRenderingContext2D) => void, opts: { outline?: string | false; flip?: boolean; margin?: number } = {}): string {
  const k = `${key}|${opts.flip ? 'f' : ''}`;
  const hit = cache.get(k);
  if (hit) return hit;
  if (typeof document === 'undefined') return EMPTY;
  const m = opts.margin ?? 1;
  const c = document.createElement('canvas');
  c.width = w + m * 2;
  c.height = h + m * 2;
  const ctx = c.getContext('2d');
  if (!ctx) return EMPTY;
  ctx.imageSmoothingEnabled = false;
  if (opts.flip) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
  draw(new Painter(ctx, m, m), ctx);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (opts.outline !== false) outline(ctx, c.width, c.height, opts.outline || '#2b1d1a');
  const url = c.toDataURL('image/png');
  cache.set(k, url);
  return url;
}
