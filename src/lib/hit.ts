// Pixel-accurate hit testing for sprite <img>s: taps on transparent pixels fall through
// to whatever is underneath (e.g. the window behind a curtain, the floor next to a bed).
const alphaCache = new Map<string, { w: number; h: number; a: Uint8ClampedArray } | null>();

function alphaOf(img: HTMLImageElement) {
  const key = img.currentSrc || img.src;
  if (alphaCache.has(key)) return alphaCache.get(key)!;
  if (!img.complete || !img.naturalWidth) return null;
  try {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const a = new Uint8ClampedArray(c.width * c.height);
    for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
    const v = { w: c.width, h: c.height, a };
    if (alphaCache.size > 400) alphaCache.clear();
    alphaCache.set(key, v);
    return v;
  } catch {
    alphaCache.set(key, null);
    return null;
  }
}

/** true if (clientX, clientY) lands on (or within `slop` sprite-pixels of) an opaque pixel of the image. */
export function opaqueAt(img: Element, clientX: number, clientY: number, slop = 1): boolean {
  if (!(img instanceof HTMLImageElement)) return true;
  const data = alphaOf(img);
  if (!data) return true; // can't tell → treat as solid
  const r = img.getBoundingClientRect();
  if (!r.width || !r.height) return false;
  let u = (clientX - r.left) / r.width;
  const v = (clientY - r.top) / r.height;
  if (img.classList.contains('flipped')) u = 1 - u;
  const px = Math.floor(u * data.w), py = Math.floor(v * data.h);
  for (let dy = -slop; dy <= slop; dy++) for (let dx = -slop; dx <= slop; dx++) {
    const x = px + dx, y = py + dy;
    if (x >= 0 && y >= 0 && x < data.w && y < data.h && data.a[y * data.w + x] > 24) return true;
  }
  return false;
}

/** The topmost `.obj` under the point whose pixel there is opaque, skipping `self`. */
export function solidObjBelow(self: Element, clientX: number, clientY: number): Element | null {
  const els = document.elementsFromPoint(clientX, clientY);
  const start = els.indexOf(self);
  for (let i = start + 1; i < els.length; i++) {
    const el = els[i];
    if (el.classList.contains('obj') && opaqueAt(el, clientX, clientY)) return el;
    if (el.classList.contains('scene')) break;
  }
  return null;
}
