// 把一段戀愛回憶做成像素明信片（PNG），可以存下來、自己傳給真的他。
import { characterURL } from '../sprites/characters';
import { photoURL } from '../services/journal';
import type { Equip } from '../db/types';

function loadImg(src: string) { return new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const ch of para) { if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch; }
    out.push(line);
  }
  return out;
}

export interface PostcardInput { title: string; date: string; content: string; photoId?: string; equip99: Equip; equipChen: Equip; from?: string }
/** Renders a 1200×800 postcard and returns it as a PNG blob. */
export async function renderPostcard(m: PostcardInput): Promise<Blob> {
  const W = 1200, H = 800, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  const font = '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  // paper
  x.fillStyle = '#fffaf1'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#f3e7d2'; for (let i = 0; i < W; i += 40) { x.fillRect(i, 0, 20, 12); x.fillRect(i + 20, H - 12, 20, 12); }
  x.strokeStyle = '#3a2a20'; x.lineWidth = 8; x.strokeRect(20, 20, W - 40, H - 40);
  // left: photo or pixel couple
  const lx = 60, ly = 90, lw = 500, lh = 500;
  x.fillStyle = '#ffffff'; x.fillRect(lx - 14, ly - 14, lw + 28, lh + 90); x.strokeStyle = '#d8cdbd'; x.lineWidth = 3; x.strokeRect(lx - 14, ly - 14, lw + 28, lh + 90);
  let drewPhoto = false;
  if (m.photoId) {
    const url = await photoURL(m.photoId);
    if (url) {
      const img = await loadImg(url);
      const s = Math.max(lw / img.width, lh / img.height), sw = lw / s, sh = lh / s;
      x.imageSmoothingEnabled = true; x.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, lx, ly, lw, lh); x.imageSmoothingEnabled = false;
      drewPhoto = true;
    }
  }
  if (!drewPhoto) {
    const sky = x.createLinearGradient(0, ly, 0, ly + lh); sky.addColorStop(0, '#f7c6b3'); sky.addColorStop(1, '#c9d7ea');
    x.fillStyle = sky; x.fillRect(lx, ly, lw, lh);
    x.fillStyle = '#c99a6a'; x.fillRect(lx, ly + lh - 120, lw, 120);
    const a = await loadImg(characterURL({ who: '99', pose: 'hug', view: 'side', expr: 'shy', equip: m.equip99, flip: false }));
    const b = await loadImg(characterURL({ who: 'chen', pose: 'hug', view: 'side', expr: 'happy', equip: m.equipChen, flip: true }));
    const sc = 7;
    x.drawImage(a, lx + lw / 2 - a.width * sc + 30, ly + lh - 40 - a.height * sc, a.width * sc, a.height * sc);
    x.drawImage(b, lx + lw / 2 - 30, ly + lh - 40 - b.height * sc * 1.07, b.width * sc * 1.07, b.height * sc * 1.07);
    x.fillStyle = '#e05c6e'; x.font = `bold 64px ${font}`; x.fillText('♥', lx + lw / 2 - 22, ly + 120);
  }
  x.fillStyle = '#6f5a4a'; x.font = `28px ${font}`; x.fillText(m.date, lx, ly + lh + 52);
  // divider
  x.strokeStyle = '#d8cdbd'; x.lineWidth = 3; x.beginPath(); x.moveTo(640, 80); x.lineTo(640, H - 80); x.stroke();
  // stamp
  const sx = W - 190, sy = 60;
  x.fillStyle = '#ffffff'; x.fillRect(sx, sy, 130, 150);
  x.fillStyle = '#f2b8c6'; x.fillRect(sx + 12, sy + 12, 106, 126);
  x.fillStyle = '#e05c6e'; x.font = `bold 72px ${font}`; x.fillText('♥', sx + 34, sy + 100);
  x.fillStyle = '#3a2a20'; x.font = `bold 18px ${font}`; x.fillText('MY ROOM', sx + 24, sy + 130);
  x.strokeStyle = '#ffffff'; x.setLineDash([6, 6]); x.lineWidth = 4; x.strokeRect(sx + 2, sy + 2, 126, 146); x.setLineDash([]);
  // text
  x.fillStyle = '#3a2a20'; x.font = `bold 44px ${font}`;
  wrap(x, m.title, 440).slice(0, 2).forEach((l, i) => x.fillText(l, 680, 120 + i * 54));
  x.font = `30px ${font}`; x.fillStyle = '#4a3a30';
  const lines = wrap(x, m.content || '想把這一天寄給你。', 470);
  const shown = lines.slice(0, 10);
  if (lines.length > 10) shown[9] = shown[9].slice(0, -1) + '…';
  x.strokeStyle = '#efe5d3'; x.lineWidth = 2;
  shown.forEach((l, i) => { const y = 260 + i * 46; x.beginPath(); x.moveTo(680, y + 12); x.lineTo(W - 70, y + 12); x.stroke(); x.fillText(l, 680, y); });
  x.fillStyle = '#c98d86'; x.font = `bold 32px ${font}`; x.fillText(`— ${m.from ?? '99'} ♥`, W - 270, H - 80);
  return new Promise((res) => c.toBlob((b) => res(b!), 'image/png'));
}
