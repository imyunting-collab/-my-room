// Layered pixel characters: 99 and 陳卷毛.
// 32×48 logical px, unified coordinate system so every clothing layer lines up for every pose.
import type { CharacterId, Equip, Slot } from '../db/types';
import { clothById, type ClothingDef } from '../data/catalog';
import { Painter, sprite, shade } from './pixel';

export type Expression = 'normal' | 'smile' | 'happy' | 'sad' | 'angry' | 'think' | 'shy' | 'surprised' | 'closed';
export type Pose =
  | 'stand' | 'walk1' | 'walk2' | 'sit' | 'read' | 'write' | 'phone' | 'computer' | 'water' | 'takeFood' | 'eat'
  | 'wave' | 'hug' | 'kiss' | 'holdL' | 'holdR' | 'work';
export type View = 'front' | 'side' | 'back';
export const CHAR_W = 32, CHAR_H = 48;

export const EXPRESSION_LABEL: Record<Expression, string> = {
  normal: '普通', smile: '微笑', happy: '開心', sad: '難過', angry: '生氣', think: '思考', shy: '害羞', surprised: '驚訝', closed: '閉眼',
};
export const POSE_LABEL: Record<Pose, string> = {
  stand: '站立', walk1: '走路', walk2: '走路', sit: '坐下', read: '閱讀', write: '寫日記', phone: '使用手機', computer: '使用電腦',
  water: '澆花', takeFood: '拿取食物', eat: '吃東西', wave: '揮手', hug: '擁抱', kiss: '親親', holdL: '牽手', holdR: '牽手', work: '工作',
};

const SKIN = '#f7d3b8', SKIN_SH = '#e3ad90', BLUSH = '#f0a09a', EYE = '#2a1f1f', WHITE = '#ffffff', MOUTH = '#a8473f', MOUTH_IN = '#e07d74';
const HAIR: Record<CharacterId, [string, string]> = { '99': ['#4a2e27', '#6e4639'], chen: ['#33272a', '#5a4641'] };
const GLASSES = '#141114';

type Rect = [number, number, number, number];
type ArmFront = 'down' | 'book' | 'write' | 'phone' | 'wave' | 'food' | 'eat' | 'reachL' | 'reachR';
type ArmSide = 'down' | 'swing1' | 'swing2' | 'forward' | 'hug' | 'can';
type Legs = 'stand' | 'walk1' | 'walk2' | 'sit';
interface Geo { view: View; dy: number; legs: Legs; armF: ArmFront; armS: ArmSide; lean: number; prop?: 'book' | 'notebook' | 'phone' | 'food' | 'can' | 'laptop' }

function geometry(pose: Pose, view: View): Geo {
  const g: Geo = { view, dy: 0, legs: 'stand', armF: 'down', armS: 'down', lean: 0 };
  switch (pose) {
    case 'walk1': return { ...g, view: 'side', legs: 'walk1', armS: 'swing1' };
    case 'walk2': return { ...g, view: 'side', legs: 'walk2', armS: 'swing2' };
    case 'sit': return { ...g, dy: 4, legs: 'sit', view: view === 'back' ? 'front' : view };
    case 'read': return { ...g, view: 'front', dy: 4, legs: 'sit', armF: 'book', prop: 'book' };
    case 'write': return { ...g, view: 'front', dy: 4, legs: 'sit', armF: 'write', prop: 'notebook' };
    case 'phone': return { ...g, view: 'front', armF: 'phone', prop: 'phone' };
    case 'computer': case 'work': return { ...g, view: 'side', dy: 4, legs: 'sit', armS: 'forward' };
    case 'water': return { ...g, view: 'side', armS: 'can', prop: 'can' };
    case 'takeFood': return { ...g, view: 'front', armF: 'food', prop: 'food' };
    case 'eat': return { ...g, view: 'front', dy: 4, legs: 'sit', armF: 'eat', prop: 'food' };
    case 'wave': return { ...g, view: 'front', armF: 'wave' };
    case 'hug': return { ...g, view: 'side', armS: 'hug' };
    case 'kiss': return { ...g, view: 'side', lean: 1 };
    case 'holdL': return { ...g, view: 'front', armF: 'reachL' };
    case 'holdR': return { ...g, view: 'front', armF: 'reachR' };
    default: return g;
  }
}

// ── arm geometry: [upper, fore, hand] ──
const ARMS_FRONT: Record<ArmFront, { L: Rect[]; R: Rect[] }> = {
  down: { L: [[6, 21, 3, 5], [6, 26, 3, 5], [6, 31, 3, 2]], R: [[23, 21, 3, 5], [23, 26, 3, 5], [23, 31, 3, 2]] },
  book: { L: [[7, 21, 3, 5], [9, 26, 4, 3], [12, 25, 2, 3]], R: [[22, 21, 3, 5], [19, 26, 4, 3], [18, 25, 2, 3]] },
  write: { L: [[7, 21, 3, 6], [9, 27, 4, 3], [12, 27, 2, 2]], R: [[22, 21, 3, 6], [19, 27, 4, 3], [17, 26, 2, 3]] },
  phone: { L: [[6, 21, 3, 5], [6, 26, 3, 5], [6, 31, 3, 2]], R: [[23, 21, 3, 4], [21, 17, 3, 7], [20, 15, 3, 3]] },
  wave: { L: [[6, 21, 3, 5], [6, 26, 3, 5], [6, 31, 3, 2]], R: [[23, 16, 3, 6], [24, 11, 3, 5], [24, 8, 3, 3]] },
  food: { L: [[6, 21, 3, 5], [6, 26, 3, 5], [6, 31, 3, 2]], R: [[23, 21, 3, 4], [24, 24, 4, 3], [27, 22, 3, 3]] },
  eat: { L: [[7, 21, 3, 5], [9, 26, 4, 3], [12, 26, 2, 2]], R: [[22, 21, 3, 4], [19, 18, 3, 5], [17, 16, 3, 3]] },
  reachL: { L: [[6, 21, 3, 5], [3, 26, 4, 3], [1, 28, 3, 3]], R: [[23, 21, 3, 5], [23, 26, 3, 5], [23, 31, 3, 2]] },
  reachR: { L: [[6, 21, 3, 5], [6, 26, 3, 5], [6, 31, 3, 2]], R: [[23, 21, 3, 5], [25, 26, 4, 3], [28, 28, 3, 3]] },
};
const ARMS_SIDE: Record<ArmSide, Rect[]> = {
  down: [[14, 21, 4, 5], [14, 26, 4, 5], [14, 31, 4, 2]],
  swing1: [[15, 21, 4, 5], [17, 25, 3, 5], [18, 30, 3, 2]],
  swing2: [[13, 21, 4, 5], [11, 25, 3, 5], [10, 30, 3, 2]],
  forward: [[15, 21, 4, 4], [18, 23, 6, 3], [24, 23, 2, 3]],
  hug: [[15, 21, 4, 4], [18, 22, 8, 3], [26, 22, 2, 3]],
  can: [[15, 21, 4, 5], [18, 25, 5, 3], [23, 25, 2, 3]],
};

const off = (r: Rect, dy: number, dx = 0): Rect => [r[0] + dx, r[1] + dy, r[2], r[3]];

export interface CharSpec {
  who: CharacterId;
  pose?: Pose;
  view?: View;
  expr?: Expression;
  equip: Equip;
  flip?: boolean;
}

export const DEFAULT_EQUIP: Record<CharacterId, Equip> = {
  '99': { top: 'top_sweat_brown', neck: 'neck_lace', bottom: 'bottom_plaid_brown', shoes: 'shoes_chunky', bag: 'bag_cross_bunny', hairAcc: 'hairacc_clip', outer: null, acc: null },
  chen: { top: 'chen_top_black', neck: 'chen_towel', bottom: 'chen_pants_gray', shoes: 'chen_shoes_bw', bag: 'chen_backpack', hairAcc: 'chen_headband', acc: 'chen_watch', outer: null },
};

type Worn = Partial<Record<Slot, ClothingDef>>;
function resolve(equip: Equip): Worn {
  const w: Worn = {};
  for (const [slot, id] of Object.entries(equip) as [Slot, string | null | undefined][]) {
    const def = id ? clothById.get(id) : undefined;
    if (def && def.slot === slot) w[slot] = def;
  }
  return w;
}

export function characterURL(spec: CharSpec): string {
  const pose = spec.pose ?? 'stand';
  const view = spec.view ?? 'front';
  const expr = spec.expr ?? 'normal';
  const worn = resolve(spec.equip);
  const key = `char|${spec.who}|${pose}|${view}|${expr}|${Object.entries(spec.equip).sort().map(([k, v]) => `${k}=${v ?? ''}`).join(',')}`;
  return sprite(key, CHAR_W, CHAR_H, (p) => drawCharacter(p, spec.who, geometry(pose, view), expr, worn, pose), { flip: spec.flip });
}

function drawCharacter(p: Painter, who: CharacterId, g: Geo, expr: Expression, w: Worn, pose: Pose) {
  const dy = g.dy;
  // shadow
  p.r(9, 46, 14, 1, 'rgba(60,40,30,0.25)');
  if (g.view === 'back') {
    drawBagBack(p, w.bag, dy);
    drawLegs(p, g, w.bottom, w.shoes);
    drawTorso(p, g, w.top, who);
    drawNeck(p, g, w.neck);
    drawOuter(p, g, w.outer);
    drawArms(p, g, w.top, w.outer, w.acc);
    drawBagFrontLayer(p, g, w.bag);
    drawHead(p, who, g, expr, w);
    return;
  }
  if (g.view === 'side') drawBagBehind(p, g, w.bag);
  drawLegs(p, g, w.bottom, w.shoes);
  drawTorso(p, g, w.top, who);
  drawNeck(p, g, w.neck);
  drawOuter(p, g, w.outer);
  drawBagFrontLayer(p, g, w.bag);
  drawHead(p, who, g, expr, w);
  // props + arms (arms after head so raised hands overlap hair)
  drawArms(p, g, w.top, w.outer, w.acc);
  drawProp(p, g, pose);
}

// ───────────────────────── legs & shoes ─────────────────────────
function legRects(g: Geo): { legs: Rect[]; shoes: Rect[] } {
  const dy = g.dy;
  if (g.view === 'side') {
    switch (g.legs) {
      case 'walk1': return { legs: [[9, 32, 6, 12], [16, 32, 6, 12]], shoes: [[8, 44, 7, 3], [16, 44, 8, 3]] };
      case 'walk2': return { legs: [[11, 32, 9, 11]], shoes: [[10, 44, 6, 3], [14, 43, 8, 3]] };
      case 'sit': return { legs: [[11, 32 + dy - 1, 12, 4], [19, 35 + dy, 4, 5]], shoes: [[19, 44, 7, 3]] };
      default: return { legs: [[11, 32, 10, 12]], shoes: [[11, 44, 10, 3]] };
    }
  }
  if (g.legs === 'sit') return { legs: [[8, 32 + dy, 7, 4], [17, 32 + dy, 7, 4], [9, 36 + dy, 6, 2], [17, 36 + dy, 6, 2]], shoes: [[8, 38 + dy, 7, 3], [17, 38 + dy, 7, 3]] };
  return { legs: [[9, 32, 7, 12], [16, 32, 7, 12]], shoes: [[8, 44, 7, 3], [17, 44, 7, 3]] };
}

function drawLegs(p: Painter, g: Geo, bottom?: ClothingDef, shoes?: ClothingDef) {
  const { legs, shoes: sh } = legRects(g);
  const [a, b, c] = bottom?.colors ?? ['#6b6662', '#4f4b48', '#86817c'];
  const style = bottom?.style ?? 'wideSolid';
  if (style === 'skirt') {
    const y0 = 32 + g.dy;
    if (g.view === 'side') {
      p.r(10, y0, 11, 6, a); for (let x = 11; x < 21; x += 2) p.r(x, y0 + 1, 1, 5, b);
      if (g.legs !== 'sit') { p.r(13, 38, 3, 6, SKIN); p.r(16, 38, 3, 6, SKIN_SH); p.r(13, 41, 6, 3, c); }
      else { p.r(19, 36 + g.dy, 3, 5, SKIN); p.r(19, 39 + g.dy, 3, 2, c); }
    } else {
      p.rows([[y0, 9, 22], [y0 + 1, 9, 22], [y0 + 2, 8, 23], [y0 + 3, 8, 23], [y0 + 4, 7, 24], [y0 + 5, 7, 24]], a);
      for (let x = 9; x <= 22; x += 2) p.r(x, y0 + 2, 1, 4, b);
      p.r(7, y0 + 5, 18, 1, b);
      if (g.legs === 'sit') { p.r(10, y0 + 6, 4, 2, SKIN); p.r(18, y0 + 6, 4, 2, SKIN); p.r(10, y0 + 6, 4, 1, c); p.r(18, y0 + 6, 4, 1, c); }
      else { p.r(10, 38, 4, 6, SKIN); p.r(18, 38, 4, 6, SKIN); p.r(10, 41, 4, 3, c); p.r(18, 41, 4, 3, c); }
    }
  } else {
    for (const [x, y, ww, hh] of legs) {
      p.r(x, y, ww, hh, a);
      if (style === 'widePlaid') {
        for (let yy = y + 1; yy < y + hh; yy += 3) p.r(x, yy, ww, 1, b);
        for (let xx = x + 1; xx < x + ww; xx += 3) p.r(xx, y, 1, hh, c);
        for (let yy = y + 1; yy < y + hh; yy += 3) for (let xx = x + 1; xx < x + ww; xx += 3) p.p(xx, yy, shade(b, -0.25));
      } else {
        p.r(x + ww - 1, y + 2, 1, hh - 2, b); // inner shading
        if (hh > 6) p.r(x + 2, y + 3, 1, hh - 5, c); // crease highlight
        if (style === 'cargo' && hh > 8) { p.r(x + (g.view === 'side' ? 2 : 0), y + 4, 3, 3, b); p.r(x + (g.view === 'side' ? 2 : 0), y + 4, 3, 1, c); }
      }
    }
    if (g.view === 'front' && g.legs !== 'sit') {
      p.r(15, 35, 1, 9, shade(a, -0.35)); // gap between wide legs
      p.r(9, 43, 14, 1, shade(a, -0.15)); // hem
    }
    if (g.view === 'front' && bottom?.character === '99' && bottom.style === 'widePlaid') { // drawstring
      p.r(13, 32 + g.dy, 1, 3, '#f4ead6'); p.r(15, 32 + g.dy, 1, 4, '#f4ead6'); p.p(14, 32 + g.dy, '#f4ead6');
    }
    p.r(legs[0][0], 32 + g.dy, g.view === 'side' ? 10 : 14, 1, shade(a, -0.2)); // waistband
  }
  // shoes
  const [sa, sb, sc] = shoes?.colors ?? ['#f2efe8', '#9a9aa0', '#2f2f35'];
  const ss = shoes?.style ?? 'chunky';
  for (const [x, y, ww, hh] of sh) {
    const top = ss === 'boots' ? y - 2 : y;
    const h2 = ss === 'boots' ? hh + 2 : hh;
    p.r(x, top, ww, h2, sa);
    p.r(x, y + hh - 1, ww, 1, ss === 'maryjane' || ss === 'loafer' || ss === 'boots' ? sb : sb); // sole
    switch (ss) {
      case 'chunky': p.r(x + 1, y + 1, ww - 3, 1, sc); p.r(x, y + hh - 1, ww, 1, '#8d8d93'); break;
      case 'bwSneaker': p.r(x + 1, y, ww - 3, 2, sb); p.r(x, y + hh - 1, ww, 1, sc); break;
      case 'retro': p.r(x + 1, y + 1, ww - 2, 1, sb); p.r(x, y + hh - 1, ww, 1, sc); break;
      case 'outdoor': p.r(x + 2, y, 3, 1, sc); p.r(x, y + hh - 1, ww, 1, sb); break;
      case 'maryjane': p.r(x, y, ww, 1, sc); p.r(x + 1, y + 1, ww - 2, 1, sb); break;
      case 'loafer': p.p(x + 3, y + 1, sc); p.r(x, y + hh - 1, ww, 1, sb); break;
      case 'boots': p.r(x, top, ww, 1, shade(sa, 0.15)); break;
    }
  }
}

// ───────────────────────── torso / top ─────────────────────────
function torsoRect(g: Geo, oversized: boolean): Rect {
  if (g.view === 'side') return [oversized ? 10 : 11, 20 + g.dy, oversized ? 11 : 10, 12];
  return [oversized ? 9 : 10, 20 + g.dy, oversized ? 14 : 12, 12];
}

function drawTorso(p: Painter, g: Geo, top: ClothingDef | undefined, who: CharacterId) {
  const [a, b, c] = top?.colors ?? ['#ddd', '#bbb', '#999'];
  const st = top?.style ?? 'tee';
  const [x, y, w, h] = torsoRect(g, true);
  const lx = g.lean;
  p.r(x + lx, y, w, h, a);
  p.r(x + lx, y + h - 1, w, 1, b); // hem
  if (g.view !== 'side') { p.r(x, y, 1, h, b); p.r(x + w - 1, y, 1, h, b); }
  const front = g.view === 'front';
  switch (st) {
    case 'sweatPrint':
      p.r(x + lx, y + h - 2, w, 1, b);
      if (front) { // little printed girl in a red dress + fruit
        p.r(15, y + 3, 2, 2, '#2b2020'); p.r(15, y + 4, 2, 1, '#f7d3b8');
        p.r(14, y + 5, 4, 3, c); p.r(13, y + 7, 6, 1, c); p.r(15, y + 8, 1, 1, '#2b2020'); p.r(17, y + 8, 1, 1, '#2b2020');
        p.p(11, y + 8, '#e58a3a'); p.p(20, y + 8, '#d9473f'); p.p(12, y + 9, '#e9d9b8'); p.p(19, y + 9, '#e9d9b8');
      }
      break;
    case 'knit':
      for (let xx = x + 2; xx < x + w - 1; xx += 3) p.r(xx + lx, y + 1, 1, h - 3, b);
      p.r(x + lx, y + h - 2, w, 1, c);
      break;
    case 'hoodie':
      if (front) { p.r(12, y + 7, 8, 3, b); p.r(13, y + 7, 6, 1, shade(a, 0.15)); p.r(14, y + 1, 1, 4, '#f2efe8'); p.r(17, y + 1, 1, 4, '#f2efe8'); }
      if (g.view === 'back') p.r(x + 2, y, w - 4, 4, b);
      break;
    case 'vest':
      if (front) { p.r(14, y, 4, 4, c); p.p(15, y + 4, c); p.p(16, y + 4, c); p.r(x, y, w, 1, c); }
      break;
    case 'stripe':
      for (let yy = y + 1; yy < y + h - 1; yy += 2) p.r(x + lx, yy, w, 1, b);
      break;
    case 'track':
      if (front) { p.r(15, y, 1, h - 1, c); p.r(x + 1, y + 1, 1, h - 2, c); p.r(x + w - 2, y + 1, 1, h - 2, c); }
      break;
    case 'tee':
      if (front && who === 'chen' && top?.id === 'chen_top_white') { p.r(14, y + 4, 4, 3, c); p.p(15, y + 5, a); }
      if (front && top?.id === 'chen_pj_top') { p.r(15, y + 1, 2, 2, c); }
      if (front && who === '99' && top?.id === 'top_tee_white') { p.r(15, y + 4, 3, 2, c); }
      break;
  }
  // neck skin above the collar
  if (g.view === 'side') p.r(14 + lx, 19 + g.dy, 4, 2, SKIN_SH);
  else p.r(14, 19 + g.dy, 4, 2, SKIN_SH);
}

function sleeveInfo(top?: ClothingDef, outer?: ClothingDef): { color: string; dark: string; long: boolean; accent?: string } {
  if (outer) return { color: outer.colors[0], dark: outer.colors[1], long: true, accent: outer.style === 'tech' ? outer.colors[2] : undefined };
  const [a, b, c] = top?.colors ?? ['#ddd', '#bbb', '#999'];
  const long = top ? top.style !== 'tee' : false;
  if (top?.style === 'vest') return { color: c, dark: shade(c, -0.15), long: true };
  if (top?.style === 'track') return { color: a, dark: b, long: true, accent: c };
  return { color: a, dark: b, long };
}

function drawArms(p: Painter, g: Geo, top?: ClothingDef, outer?: ClothingDef, acc?: ClothingDef) {
  const s = sleeveInfo(top, outer);
  const arms: Rect[][] = g.view === 'side' ? [ARMS_SIDE[g.armS]] : g.view === 'back' ? [ARMS_FRONT.down.L, ARMS_FRONT.down.R] : [ARMS_FRONT[g.armF].L, ARMS_FRONT[g.armF].R];
  arms.forEach((arm, i) => {
    const [up, fore, hand] = arm.map((r) => off(r, g.dy, g.view === 'side' ? g.lean : 0));
    if (s.long) {
      p.r(...up, s.color); p.r(...fore, s.color);
      // cuff
      const cuffY = fore[1] + fore[3] - 1;
      p.r(fore[0], cuffY, fore[2], 1, s.dark);
      if (s.accent) p.r(up[0] + (i === 0 ? 0 : up[2] - 1), up[1], 1, up[3], s.accent);
    } else {
      p.r(up[0] - (g.view === 'front' ? (i === 0 ? 1 : 0) : 0), up[1], up[2] + (g.view === 'front' ? 1 : 0), up[3], s.color);
      p.r(up[0], up[1] + up[3] - 1, up[2], 1, s.dark);
      p.r(...fore, SKIN);
      p.r(fore[0], fore[1], 1, fore[3], SKIN_SH);
    }
    if (g.view !== 'back') p.r(...hand, SKIN); else p.r(...hand, SKIN_SH);
    // watch on the left wrist (front: viewer's left arm)
    if (acc?.style === 'watch' && (g.view === 'side' || i === 0)) {
      p.r(fore[0], fore[1] + fore[3] - 1, fore[2], 1, acc.colors[0]);
      p.p(fore[0] + 1, fore[1] + fore[3] - 1, acc.colors[2]);
    }
  });
}

// ───────────────────────── neck layer ─────────────────────────
function drawNeck(p: Painter, g: Geo, neck?: ClothingDef) {
  if (!neck) return;
  const [a, b, c] = neck.colors;
  const y = 19 + g.dy, lx = g.lean;
  if (neck.style === 'lace') {
    if (g.view === 'front') {
      p.rows([[y, 11, 20], [y + 1, 9, 22], [y + 2, 9, 22]], a);
      for (let x = 9; x <= 22; x += 2) p.p(x, y + 3, a);
      for (let x = 10; x <= 21; x += 3) p.p(x, y + 1, b);
      p.r(15, y + 2, 2, 3, b); p.p(14, y + 4, a); p.p(17, y + 4, a); p.p(15, y + 3, c);
    } else if (g.view === 'side') {
      p.rows([[y, 13 + lx, 19 + lx], [y + 1, 12 + lx, 20 + lx]], a);
      for (let x = 12; x <= 20; x += 2) p.p(x + lx, y + 2, a);
      p.p(15 + lx, y + 1, b);
    } else {
      p.rows([[y, 10, 21], [y + 1, 9, 22], [y + 2, 11, 20], [y + 3, 13, 18], [y + 4, 15, 16]], a);
      for (let x = 10; x <= 21; x += 3) p.p(x, y + 1, b);
    }
  } else if (neck.style === 'towel') {
    if (g.view === 'front') {
      p.r(10, y, 12, 2, a); p.r(13, y, 6, 1, c);
      p.r(10, y + 2, 3, 3, a); p.r(10, y + 5, 3, 3, b); p.r(10, y + 8, 3, 1, a); p.p(10, y + 9, a); p.p(12, y + 9, a);
      p.r(19, y + 2, 3, 3, b); p.r(19, y + 5, 3, 3, a); p.p(19, y + 8, a); p.p(21, y + 8, a);
      p.p(11, y + 3, c); p.p(20, y + 6, c);
    } else if (g.view === 'side') {
      p.r(13 + lx, y, 7, 2, a); p.r(18 + lx, y + 2, 3, 3, a); p.r(18 + lx, y + 5, 3, 2, b); p.p(18 + lx, y + 7, a); p.p(20 + lx, y + 7, a);
    } else {
      p.r(10, y, 12, 3, a); p.r(14, y, 4, 3, b);
    }
  }
}

// ───────────────────────── outerwear ─────────────────────────
function drawOuter(p: Painter, g: Geo, outer?: ClothingDef) {
  if (!outer) return;
  const [a, b, c] = outer.colors;
  const [x, y, w, h] = torsoRect(g, true);
  const lx = g.view === 'side' ? g.lean : 0;
  const closed = outer.style === 'tech';
  if (g.view === 'front') {
    if (closed) { p.r(x, y, w, h + 1, a); p.r(15, y, 1, h + 1, b); p.r(18, y + 3, 2, 1, c); p.r(x, y + h, w, 1, b); }
    else {
      p.r(x, y, 5, h + 1, a); p.r(x + w - 5, y, 5, h + 1, a);
      p.r(x + 4, y, 1, h + 1, b); p.r(x + w - 5, y, 1, h + 1, b);
      if (outer.style === 'cardigan') for (let yy = y + 2; yy < y + h; yy += 3) { p.p(x + 3, yy, c); }
      if (outer.style === 'denim') { p.r(x + 1, y + 4, 3, 2, b); p.r(x + w - 4, y + 4, 3, 2, b); p.r(x + 1, y, 4, 2, c); p.r(x + w - 5, y, 4, 2, c); }
      if (outer.style === 'zipHoodie') { p.r(x + 1, y - 1, w - 2, 2, b); p.r(13, y + 1, 1, 4, c); p.r(18, y + 1, 1, 4, c); }
    }
  } else if (g.view === 'side') {
    p.r(x + lx, y, w, h + 1, a); p.r(x + w - 2 + lx, y, 1, h + 1, b);
    if (outer.style === 'zipHoodie') p.r(x + lx, y - 1, 5, 3, b);
    if (outer.style === 'denim') p.r(x + 5 + lx, y + 4, 3, 2, b);
  } else {
    p.r(x, y, w, h + 1, a); p.r(15, y + 2, 2, h - 2, b);
    if (outer.style === 'zipHoodie') p.r(x + 2, y - 1, w - 4, 4, b);
  }
}

// ───────────────────────── bags ─────────────────────────
function drawBagBehind(p: Painter, g: Geo, bag?: ClothingDef) {
  if (!bag || g.view !== 'side') return;
  const [a, b] = bag.colors;
  const y = 20 + g.dy;
  if (bag.style === 'backpack') { p.r(5 + g.lean, y, 7, 12, a); p.r(6 + g.lean, y + 5, 5, 4, b); p.r(5 + g.lean, y, 7, 1, shade(a, 0.2)); }
  else { p.r(8, y + 9, 4, 5, a); p.r(8, y + 9, 4, 1, b); }
}
function drawBagBack(p: Painter, bag: ClothingDef | undefined, dy: number) {
  if (!bag || bag.style === 'backpack') return;
  const [a, b] = bag.colors;
  p.r(22, 29 + dy, 6, 5, a); p.r(22, 29 + dy, 6, 2, b);
}
function drawBagFrontLayer(p: Painter, g: Geo, bag?: ClothingDef) {
  if (!bag) return;
  const [a, b, c] = bag.colors;
  const y = 20 + g.dy;
  if (bag.style === 'backpack') {
    if (g.view === 'front') { p.r(11, y, 2, 10, a); p.r(19, y, 2, 10, a); p.p(11, y + 6, '#666'); p.p(20, y + 6, '#666'); }
    if (g.view === 'back') { p.r(10, y, 12, 12, a); p.r(12, y + 6, 8, 5, b); p.r(12, y + 6, 8, 1, '#555'); p.r(10, y, 12, 1, shade(a, 0.25)); }
    if (g.view === 'side') { p.r(13 + g.lean, y, 2, 9, b); }
    return;
  }
  // cross-body bag (+ bunny charm)
  if (g.view === 'front') {
    p.line(21, y, 10, y + 9, b);
    p.r(4, y + 8, 6, 5, a); p.r(4, y + 8, 6, 2, b); p.p(7, y + 10, c === '#d6b36a' ? c : shade(a, 0.3));
    if (bag.style === 'crossbody') { p.r(5, y + 14, 3, 3, c); p.p(5, y + 13, c); p.p(7, y + 13, c); p.p(5, y + 15, EYE); p.p(7, y + 15, EYE); p.p(6, y + 13, '#e8b8b2'); }
  } else if (g.view === 'side') {
    p.line(13 + g.lean, y, 18 + g.lean, y + 8, b);
  } else {
    p.line(10, y, 21, y + 9, b);
  }
}

// ───────────────────────── head, face, hair ─────────────────────────
function drawHead(p: Painter, who: CharacterId, g: Geo, expr: Expression, w: Worn) {
  const dy = g.dy, lx = g.view === 'side' ? g.lean : 0;
  p.with(lx, dy, () => {
    const [H, HL] = HAIR[who];
    if (g.view === 'front') {
      p.rows([[7, 9, 22], [8, 9, 22], [9, 9, 22], [10, 9, 22], [11, 9, 22], [12, 9, 22], [13, 9, 22], [14, 9, 22], [15, 9, 22], [16, 10, 21], [17, 11, 20], [18, 13, 18]], SKIN);
      p.r(10, 10, 12, 1, SKIN_SH);
      p.r(22, 9, 1, 7, SKIN_SH);
      drawFace(p, who, expr, 'front');
      if (who === '99') {
        // side part on her right, bangs swept across, left side tucked behind the ear (from the 99 sheet)
        p.rows([[2, 11, 20], [3, 9, 22], [4, 8, 23], [5, 7, 24], [6, 7, 24], [7, 7, 24], [8, 7, 10], [8, 15, 24], [9, 7, 9], [9, 18, 24], [10, 7, 8], [10, 20, 24]], H);
        for (let y = 11; y <= 15; y++) { p.r(7, y, 1, 1, H); p.r(21, y, 4, 1, H); }
        p.rows([[16, 7, 9], [16, 21, 24], [17, 8, 9], [17, 21, 23]], H);
        p.rows([[3, 13, 16], [4, 15, 19], [5, 17, 21]], HL); p.r(23, 10, 1, 5, HL); p.p(12, 5, shade(H, -0.3)); p.p(12, 6, shade(H, -0.3));
        p.r(15, 8, 3, 1, shade(H, -0.25)); p.r(18, 9, 2, 1, shade(H, -0.25));
        // ear
        p.r(8, 12, 1, 3, SKIN); p.p(8, 13, SKIN_SH);
      } else {
        p.rows([[0, 9, 10], [0, 13, 18], [0, 21, 22], [1, 8, 23], [2, 7, 24], [3, 6, 25], [4, 5, 26], [5, 5, 26], [6, 5, 26], [7, 5, 26], [8, 5, 14], [8, 17, 26], [9, 5, 12], [9, 19, 26], [10, 5, 10], [10, 21, 26]], H);
        for (let y = 11; y <= 16; y++) { p.r(5, y, 5, 1, H); p.r(22, y, 5, 1, H); }
        p.r(5, 14, 1, 3, shade(H, -0.3)); p.r(26, 14, 1, 3, shade(H, -0.3));
        p.p(5, 17, H); p.p(7, 17, H); p.p(9, 18, H); p.p(22, 18, H); p.p(24, 17, H); p.p(26, 17, H);
        const CD = shade(H, -0.35);
        // curls: little arcs of highlight + darker hollows
        for (const [x, y] of [[10, 2], [15, 1], [20, 2]] as [number, number][]) { p.p(x, y, HL); p.p(x + 1, y + 1, HL); p.p(x + 1, y, CD); }
        for (const [x, y] of [[6, 12], [24, 13]] as [number, number][]) { p.p(x, y, HL); p.p(x, y + 1, CD); }
        // glasses (part of his look, always on)
        frame(p, 10, 11); frame(p, 17, 11); p.r(15, 12, 2, 1, GLASSES); p.p(9, 12, GLASSES); p.p(22, 12, GLASSES);
      }
    } else if (g.view === 'side') {
      p.rows([[7, 13, 22], [8, 13, 22], [9, 13, 22], [10, 13, 22], [11, 13, 22], [12, 13, 22], [13, 13, 23], [14, 13, 22], [15, 13, 22], [16, 14, 21], [17, 15, 21], [18, 16, 20]], SKIN);
      p.r(13, 10, 9, 1, SKIN_SH);
      drawFace(p, who, expr, 'side');
      if (who === '99') {
        p.rows([[2, 10, 19], [3, 8, 21], [4, 7, 22], [5, 7, 22], [6, 7, 22], [7, 7, 22], [8, 7, 15], [8, 19, 22], [9, 7, 14], [9, 20, 22]], H);
        for (let y = 10; y <= 15; y++) p.r(7, y, 7, 1, H);
        p.rows([[16, 8, 14], [17, 9, 13]], H);
        p.rows([[4, 10, 14], [5, 9, 11]], HL); p.r(8, 10, 1, 4, HL);
      } else {
        p.rows([[0, 9, 10], [0, 13, 17], [1, 7, 20], [2, 6, 22], [3, 5, 22], [4, 5, 23], [5, 5, 23], [6, 5, 23], [7, 5, 23], [8, 5, 14], [8, 19, 23], [9, 5, 13], [9, 20, 23]], H);
        for (let y = 10; y <= 16; y++) p.r(5, y, 9, 1, H);
        p.p(5, 17, H); p.p(8, 17, H); p.p(11, 17, H); p.p(13, 17, H);
        { const CD = shade(H, -0.35);
          for (const [x, y] of [[9, 2], [14, 1]] as [number, number][]) { p.p(x, y, HL); p.p(x + 1, y + 1, HL); p.p(x + 1, y, CD); }
          for (const [x, y] of [[7, 12]] as [number, number][]) { p.p(x, y, HL); p.p(x, y + 1, CD); } }
        frame(p, 17, 11); p.r(13, 12, 4, 1, GLASSES);
      }
    } else {
      // back of head
      p.r(14, 17, 4, 3, SKIN_SH);
      if (who === '99') {
        p.rows([[2, 11, 20], [3, 9, 22]], H);
        for (let y = 4; y <= 16; y++) p.r(7, y, 18, 1, H);
        p.r(8, 17, 16, 1, H);
        p.rows([[4, 11, 16], [5, 9, 12]], HL); p.r(16, 6, 1, 9, shade(H, 0.08));
      } else {
        p.rows([[0, 9, 10], [0, 13, 18], [0, 21, 22], [1, 8, 23], [2, 6, 25]], H);
        for (let y = 3; y <= 16; y++) p.r(5, y, 22, 1, H);
        for (let x = 5; x <= 26; x += 2) p.p(x, 17, H);
        { const CD = shade(H, -0.35);
          for (let y = 5; y <= 13; y += 8) for (let x = 9 + (y % 2) * 2; x <= 22; x += 6) { p.p(x, y, HL); p.p(x + 1, y + 1, CD); } }
        p.rows([[1, 11, 16], [2, 9, 13]], HL);
      }
    }
    drawHairAcc(p, g.view, w.hairAcc);
  });
}

function frame(p: Painter, x: number, y: number) {
  p.r(x, y, 5, 1, GLASSES); p.r(x, y + 3, 5, 1, GLASSES); p.r(x, y, 1, 4, GLASSES); p.r(x + 4, y, 1, 4, GLASSES);
}

function eye(p: Painter, x: number, y: number, expr: Expression, small: boolean, mirror: boolean) {
  const h = small ? 2 : 3;
  const EYE = small ? '#2a1f1f' : '#3b2420';
  switch (expr) {
    case 'smile': case 'happy':
      p.p(x, y + 1, EYE); p.p(x + 1, y, EYE); if (!small) p.p(x + 2, y + 1, EYE); else p.p(x + 1, y + 1, shade(EYE, 0.3));
      break;
    case 'closed':
      p.r(x, y + h - 1, 2, 1, EYE);
      break;
    case 'shy':
      if (!mirror) { p.p(x, y, EYE); p.p(x + 1, y + 1, EYE); if (!small) p.p(x, y + 2, EYE); }
      else { p.p(x + 1, y, EYE); p.p(x, y + 1, EYE); if (!small) p.p(x + 1, y + 2, EYE); }
      break;
    case 'sad': case 'angry':
      p.r(x, y + 1, 2, h - 1, EYE); p.p(x, y + 1, WHITE);
      break;
    case 'surprised':
      p.r(x, y, 2, h, EYE); p.p(x, y, WHITE); p.p(x + 1, y + h - 1, WHITE);
      break;
    case 'think':
      p.r(x, y, 2, h, EYE); p.p(x + 1, y, WHITE);
      break;
    default:
      p.r(x, y, 2, h, EYE); p.p(x, y, WHITE); if (!small) p.p(x + 1, y + 2, '#7a4a35');
  }
}

function drawFace(p: Painter, who: CharacterId, expr: Expression, view: 'front' | 'side') {
  const chen = who === 'chen';
  if (view === 'front') {
    const lx = chen ? 12 : 11, rx = chen ? 18 : 19, ey = 12;
    eye(p, lx, ey, expr, chen, false);
    eye(p, rx, ey, expr, chen, true);
    // brows
    if (expr === 'sad') { p.p(lx, ey - 2, EYE); p.p(lx + 1, ey - 3, EYE); p.p(rx, ey - 3, EYE); p.p(rx + 1, ey - 2, EYE); }
    if (expr === 'angry') { p.p(lx, ey - 3, EYE); p.p(lx + 1, ey - 2, EYE); p.p(rx, ey - 2, EYE); p.p(rx + 1, ey - 3, EYE); }
    if (expr === 'think') { p.r(rx, ey - 3, 2, 1, EYE); }
    const blush = expr === 'shy' ? 2 : expr === 'smile' || expr === 'happy' || expr === 'closed' || !chen ? 1 : 0;
    if (blush) { p.r(10, 15, 2, 1, BLUSH); p.r(20, 15, 2, 1, BLUSH); if (blush > 1) { p.r(9, 14, 3, 1, BLUSH); p.r(20, 14, 3, 1, BLUSH); } }
    switch (expr) {
      case 'happy': p.r(14, 16, 4, 2, MOUTH); p.r(15, 17, 2, 1, MOUTH_IN); break;
      case 'smile': case 'closed': p.r(15, 16, 2, 1, MOUTH); p.p(14, 15, MOUTH); p.p(17, 15, MOUTH); break;
      case 'sad': p.r(15, 16, 2, 1, MOUTH); p.p(14, 17, MOUTH); p.p(17, 17, MOUTH); p.p(22, 14, '#8fc3e8'); p.p(22, 15, '#8fc3e8'); break;
      case 'angry': p.r(14, 17, 4, 1, MOUTH); break;
      case 'think': p.r(16, 16, 2, 1, MOUTH); break;
      case 'shy': p.p(15, 16, MOUTH); p.p(16, 17, MOUTH); p.p(17, 16, MOUTH); break;
      case 'surprised': p.r(15, 16, 2, 2, MOUTH); p.p(15, 16, MOUTH_IN); break;
      default: p.r(15, 16, 2, 1, MOUTH);
    }
  } else {
    eye(p, 19, 12, expr, chen, true);
    if (expr === 'shy' || expr === 'smile' || expr === 'happy' || expr === 'closed' || !chen) p.r(19, 15, 2, 1, BLUSH);
    if (expr === 'shy') p.r(18, 14, 3, 1, BLUSH);
    switch (expr) {
      case 'happy': case 'surprised': p.r(21, 16, 1, 2, MOUTH); break;
      case 'sad': p.p(21, 17, MOUTH); break;
      case 'closed': p.p(22, 16, MOUTH); p.p(23, 15, MOUTH); break; // little pucker for the kiss pose
      default: p.p(21, 16, MOUTH);
    }
  }
}

function drawHairAcc(p: Painter, view: View, acc?: ClothingDef) {
  if (!acc) return;
  const [a, b, c] = acc.colors;
  switch (acc.style) {
    case 'clip':
      if (view === 'front') { for (const [x, y] of [[8, 6], [7, 8]] as [number, number][]) { p.r(x, y, 4, 1, '#c9573f'); p.p(x + 1, y, a); p.p(x + 3, y, a); } }
      else if (view === 'side') { p.r(8, 7, 4, 1, '#c9573f'); p.p(9, 7, a); p.r(9, 9, 4, 1, '#c9573f'); p.p(11, 9, a); }
      else { p.r(20, 7, 4, 1, '#c9573f'); p.p(21, 7, a); p.r(19, 9, 4, 1, '#c9573f'); }
      break;
    case 'ribbon':
      if (view === 'back') { p.rows([[5, 9, 10], [6, 10, 12], [7, 9, 10]], a); p.p(12, 5, a); p.p(12, 7, a); break; }
      { const x = view === 'side' ? 12 : 19; p.rows([[4, x, x + 1], [4, x + 3, x + 4], [5, x, x + 4], [6, x, x + 1], [6, x + 3, x + 4]], a); p.p(x + 2, 5, b); }
      break;
    case 'cap':
      if (view === 'front') { p.rows([[0, 10, 21], [1, 8, 23], [2, 7, 24], [3, 7, 24], [4, 7, 24], [5, 7, 24]], a); p.r(6, 6, 20, 2, b); p.p(15, 0, c); p.r(14, 2, 4, 2, shade(a, 0.15)); }
      else if (view === 'side') { p.rows([[0, 10, 18], [1, 8, 20], [2, 7, 21], [3, 7, 21], [4, 7, 21], [5, 7, 21]], a); p.r(18, 6, 8, 2, b); p.p(14, 0, c); }
      else { p.rows([[0, 10, 21], [1, 8, 23], [2, 7, 24], [3, 7, 24], [4, 7, 24], [5, 7, 24]], a); p.r(14, 5, 4, 2, '#2b2020'); p.r(13, 4, 6, 1, b); }
      break;
    case 'beret':
      if (view === 'side') { p.rows([[0, 9, 18], [1, 7, 21], [2, 6, 22], [3, 7, 21]], a); p.p(13, 0, c); p.r(8, 3, 12, 1, b); }
      else { p.rows([[0, 9, 21], [1, 7, 24], [2, 6, 25], [3, 7, 23]], a); p.p(16, 0, c); p.r(8, 3, 15, 1, b); }
      break;
    case 'headband':
      if (view === 'front') { p.r(7, 5, 18, 3, a); p.r(7, 5, 18, 1, c); }
      else if (view === 'side') { p.r(9, 5, 14, 3, a); p.r(9, 5, 14, 1, c); }
      else { p.r(6, 5, 20, 3, a); p.r(6, 5, 20, 1, c); p.r(15, 8, 2, 2, b); }
      break;
  }
}

// ───────────────────────── props ─────────────────────────
function drawProp(p: Painter, g: Geo, pose: Pose) {
  const dy = g.dy;
  if (g.view === 'front') {
    const hands = ARMS_FRONT[g.armF];
    if (g.prop === 'book') {
      p.r(11, 22 + dy, 10, 7, '#b5654f'); p.r(15, 22 + dy, 2, 7, '#8a4535'); p.r(12, 23 + dy, 2, 1, '#f3e4c4'); p.r(18, 23 + dy, 2, 1, '#f3e4c4');
    } else if (g.prop === 'notebook') {
      p.r(10, 28 + dy, 12, 4, '#f6f0e5'); p.r(10, 28 + dy, 12, 1, '#e8b8b2'); for (let x = 11; x < 21; x += 3) p.r(x, 30 + dy, 2, 1, '#c9b8a0');
      p.r(17, 25 + dy, 1, 3, '#5d7fa6');
    } else if (g.prop === 'phone') {
      p.r(19, 11 + dy, 3, 6, '#c9a789'); p.r(19, 11 + dy, 3, 1, '#795b43');
    } else if (g.prop === 'food') {
      if (pose === 'eat') { p.r(15, 14 + dy, 4, 3, '#f3e9d2'); p.r(15, 16 + dy, 4, 1, '#2f4a3a'); }
      else { p.r(27, 18 + dy, 5, 4, '#f3e9d2'); p.r(27, 20 + dy, 5, 2, '#2f4a3a'); }
    }
    // hands over props
    for (const r of [hands.L[2], hands.R[2]]) if (g.prop && (g.armF === 'book' || g.armF === 'eat' || g.armF === 'phone' || g.armF === 'food' || g.armF === 'write')) p.r(r[0], r[1] + dy, r[2], r[3], SKIN);
  } else if (g.view === 'side' && g.prop === 'can') {
    p.r(23, 24 + dy, 6, 5, '#6d8765'); p.r(23, 24 + dy, 6, 1, '#8aa57f'); p.r(29, 23 + dy, 2, 1, '#6d8765'); p.r(30, 22 + dy, 1, 1, '#6d8765'); p.r(24, 22 + dy, 3, 2, '#354b3b');
    p.r(23, 25 + dy, 2, 3, SKIN);
  }
}

/** Head-only portrait (for avatars / chat). 24×24 crop of the front sprite. */
export function portraitURL(who: CharacterId, expr: Expression = 'smile', equip?: Equip): string {
  const eq = equip ?? DEFAULT_EQUIP[who];
  const worn = resolve(eq);
  const key = `portrait|${who}|${expr}|${eq.hairAcc ?? ''}`;
  return sprite(key, 28, 24, (p) => {
    p.r(0, 0, 28, 24, who === 'chen' ? '#d9e3d2' : '#f3dcd6');
    p.with(-2, 3, () => {
      drawTorso(p, { view: 'front', dy: 0, legs: 'stand', armF: 'down', armS: 'down', lean: 0 }, worn.top, who);
      drawNeck(p, { view: 'front', dy: 0, legs: 'stand', armF: 'down', armS: 'down', lean: 0 }, worn.neck);
      drawHead(p, who, { view: 'front', dy: 0, legs: 'stand', armF: 'down', armS: 'down', lean: 0 }, expr, worn);
    });
  }, { outline: false, margin: 0 });
}
