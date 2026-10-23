import { useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from 'react';
import { db } from '../db/idb';
import { useDayPart, useLive, useReducedMotion } from '../hooks';
import { navigate } from '../router';
import { useBooks, useEquip } from '../state';
import { characterURL, CHAR_W, type Expression, type Pose, type View } from '../sprites/characters';
import { bedBlanketURL, doorURL, furnitureURL, deviceURL, windowURL, foodURL } from '../sprites/furniture';
import { playMusic, stopMusic } from '../lib/music';
import { opaqueAt, solidObjBelow } from '../lib/hit';
import { sprite } from '../sprites/pixel';
import { deviceById, furnById, FURN_CAT_LABEL, GIFTS, foodById, type FurnitureDef } from '../data/catalog';
import { shelfBooks, shelfRows } from '../components/shelf';
import { DEFAULT_WINDOW, devicePos, furniturePos, getWindowLayout, placeDevice, placeFurniture, setWindowLayout, storeFurniture, swapFurniture, toggleFlip, windowPos, WINDOW_W, ROOM_H, ROOM_W, FLOOR_Y } from '../services/life';
import { endVisit, getTodayMood, getVisit, giveGift, logInteraction, moodLevel, readTogether, saveMemory, shareMeal, startVisit } from '../services/love';
import { checkAchievements } from '../services/reading';
import { MOOD_REPLIES, VISIT_LINES, type Line } from '../data/dialogue';
import { confirmDialog, Empty, Icon, Sheet, useAction } from '../ui';
import { toast } from '../lib/bus';
import { clamp, DAYPART_LABEL, pick, sleep, timeHM } from '../lib/util';
import { ROOM_LABEL, type OwnedDevice, type OwnedFurniture, type SceneRoom } from '../db/types';
import { FX_CHARS, performAct } from '../components/act';
import { sfx } from '../lib/sound';
import type { ActFx } from '../data/catalog';

// ───────── scene constants ─────────
const BALCONY_DOOR: Record<SceneRoom, { x: number } | null> = { bedroom: null, study: { x: 18 }, kitchen: null };
const ENTRY_DOOR: Record<SceneRoom, { x: number } | null> = { bedroom: { x: 176 }, study: null, kitchen: null };
// pieces whose sprite has two animation frames
const ANIMATED = new Set(['lamp_lava', 'musicbox', 'catbed', 'fishbowl', 'bird_feeder', 'wind_chime', 'balloons', 'gacha_love']);
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

function roomBg(room: SceneRoom) {
  return sprite(`roombg|${room}`, ROOM_W, ROOM_H, (p) => {
    if (room === 'kitchen') {
      // mint tiles + checkered floor
      p.r(0, 0, ROOM_W, FLOOR_Y, '#e4f0ea');
      for (let y = 0; y < FLOOR_Y - 6; y += 10) { p.r(0, y, ROOM_W, 1, '#cfe0d6'); for (let x = (y / 10) % 2 ? 0 : 5; x < ROOM_W; x += 10) p.r(x, y, 1, 10, '#cfe0d6'); }
      p.r(0, 58, ROOM_W, 4, '#f6c9c3'); p.r(0, 58, ROOM_W, 1, '#fbe3df');
      p.r(0, FLOOR_Y - 6, ROOM_W, 6, '#fbf7ef'); p.r(0, FLOOR_Y - 1, ROOM_W, 1, '#c9b89a');
      for (let y = FLOOR_Y, row = 0; y < ROOM_H; y += 12, row++) for (let x = 0, col = 0; x < ROOM_W; x += 12, col++) p.r(x, y, 12, 12, (row + col) % 2 ? '#f3ece0' : '#e2d2b6');
      return;
    }
    const wall = room === 'bedroom' ? '#f3dfd3' : '#e3e8d6', wall2 = room === 'bedroom' ? '#ecd1c3' : '#d6ddc6';
    p.r(0, 0, ROOM_W, FLOOR_Y, wall);
    for (let x = 0; x < ROOM_W; x += 12) p.r(x, 0, 6, FLOOR_Y, wall2);
    p.r(0, FLOOR_Y - 6, ROOM_W, 6, '#fbf7ef'); p.r(0, FLOOR_Y - 1, ROOM_W, 1, '#c9b89a');
    for (let y = FLOOR_Y; y < ROOM_H; y += 8) {
      p.r(0, y, ROOM_W, 8, (y / 8) % 2 ? '#c99a6a' : '#c3935f');
      p.r(0, y, ROOM_W, 1, '#a87a4c');
      for (let x = ((y / 8) % 3) * 23; x < ROOM_W; x += 64) p.r(x, y, 1, 8, '#a87a4c');
    }
  }, { outline: false, margin: 0 });
}

const TINT: Record<string, string> = { dawn: 'rgba(255,205,180,0.25)', day: 'rgba(255,255,255,0)', dusk: 'rgba(255,160,90,0.28)', night: 'rgba(60,80,150,0.45)', midnight: 'rgba(30,35,80,0.6)' };

interface Actor { x: number; y: number; pose: Pose; view: View; flip: boolean; expr: Expression; z?: number; dur: number; lying?: boolean; hidden?: boolean; bedId?: string; bedFlip?: boolean }
interface Bubble { id: number; who: '99' | 'chen'; text: string }

// persists across navigation within the session
let mem99: { room: SceneRoom; x: number; y: number } = { room: 'bedroom', x: 96, y: 206 };
let pendingArrival = false;
export function markArrival() { pendingArrival = true; }

export default function RoomPage({ initial }: { initial?: SceneRoom }) {
  const [room, setRoom] = useState<SceneRoom>(initial && ROOM_LABEL[initial] ? initial : mem99.room);
  const { part, now } = useDayPart();
  const reduce = useReducedMotion();
  const equip99 = useEquip('99');
  const equipChen = useEquip('chen');
  const books = useBooks();
  const furniture = useLive(() => db.all('ownedFurniture'), [], []) ?? [];
  const devices = useLive(() => db.all('ownedDevices'), [], []) ?? [];
  const visit = useLive(getVisit, [], { active: false });
  const food = useLive(() => db.all('foodInventory'), [], []) ?? [];
  const diary = (useLive(() => db.all('diary'), [], []) ?? []).filter((d) => !d.isDraft);
  const win = useLive(() => getWindowLayout(room), [room], DEFAULT_WINDOW[room]) ?? DEFAULT_WINDOW[room];

  const placed = furniture.filter((f) => f.roomId === room);
  const placedDev = devices.filter((d) => d.isPlaced && d.roomId === room);
  const stored = furniture.filter((f) => !f.roomId);
  const storedDev = devices.filter((d) => !d.isPlaced && deviceById.get(d.defId)?.placement === 'surface');

  const [me, setMe] = useState<Actor>(() => ({ x: mem99.room === room ? mem99.x : 96, y: mem99.room === room ? mem99.y : 206, pose: 'stand', view: 'front', flip: false, expr: 'smile', dur: 0 }));
  const [chen, setChen] = useState<Actor>({ x: 140, y: 206, pose: 'stand', view: 'front', flip: false, expr: 'smile', dur: 0, hidden: true });
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number; ch: string }[]>([]);
  const [selected, setSelected] = useState<OwnedFurniture | null>(null);
  const [selectedDev, setSelectedDev] = useState<OwnedDevice | null>(null);
  const [placing, setPlacing] = useState<{ kind: 'furn' | 'dev'; id: string; name: string } | null>(null);
  const [storage, setStorage] = useState(false);
  const [winMenu, setWinMenu] = useState(false);
  // 黑膠唱片機
  const [playing, setPlaying] = useState<string | null>(null);
  const [spin, setSpin] = useState(0);
  const [notes, setNotes] = useState<{ id: number; x: number; y: number; ch: string }[]>([]);
  // 擺設模式：拖曳任何家具／設備移動，點一下開選單
  const [arrange, setArrange] = useState(false);
  type DragKind = 'furn' | 'dev' | 'win';
  const [drag, setDrag] = useState<{ kind: DragKind; id: string; x: number; y: number } | null>(null);
  const dragStart = useRef<{ kind: DragKind; id: string; px: number; py: number; ox: number; oy: number; moved: boolean; pointerId: number } | null>(null);
  // curtains hanging on the window travel with it
  const attachedCurtains = (wx: number, wy: number) => placed.filter((f) => def(f).category === 'curtain' && Math.abs(f.x - wx) <= 10 && Math.abs(f.y - wy) <= 16);
  const [attached, setAttached] = useState<string[]>([]);
  const [lampOff, setLampOff] = useState<Record<string, boolean>>({});
  // interactive pieces: on/off lights, squish animation, flash, notes, 2-frame idle animation
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [wiggling, setWiggling] = useState<Record<string, boolean>>({});
  const [flashOn, setFlashOn] = useState(false);
  const [note, setNote] = useState<{ title: string; text: string } | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((v) => v + 1), 650); return () => clearInterval(t); }, []);
  const [projectorOn, setProjectorOn] = useState(false);
  const [picker, setPicker] = useState<null | 'meal' | 'read' | 'gift' | 'diary'>(null);
  const [lastMoment, setLastMoment] = useState<{ title: string; content: string } | null>(null);
  const busy = useRef(false);
  const walkTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { run } = useAction();
  const sceneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { if (initial) setRoom(initial); }, [initial]);
  useEffect(() => { mem99 = { room, x: me.x, y: me.y }; }, [room, me.x, me.y]);
  useEffect(() => () => { if (walkTimer.current) clearInterval(walkTimer.current); stopMusic(); }, []);
  // stop the music if the record player is put away / moved to another room
  useEffect(() => { if (playing && !furniture.some((f) => f.id === playing && f.roomId === room)) { stopMusic(); setPlaying(null); } }, [furniture, playing, room]);
  useEffect(() => {
    if (!playing) return;
    const t1 = setInterval(() => setSpin((v) => v + 1), 350);
    const t2 = setInterval(() => {
      const f = furniture.find((o) => o.id === playing); if (!f) return;
      const n = { id: Math.random(), x: f.x + (Math.random() * 10 - 5), y: f.y - 30, ch: pick(['♪', '♫', '♩', '♬']) };
      setNotes((a) => [...a.slice(-6), n]);
      setTimeout(() => setNotes((a) => a.filter((x) => x.id !== n.id)), 2400);
    }, 800);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [playing, furniture]);

  // 陳卷毛 appears when a visit is active
  useEffect(() => {
    if (!visit) return;
    if (visit.active && chen.hidden) {
      if (pendingArrival) { pendingArrival = false; arrive(); }
      else setChen((c) => ({ ...c, hidden: false, x: clamp(me.x + 26, 20, 172), y: me.y, pose: 'stand', view: 'front', dur: 0 }));
    }
    if (!visit.active && !chen.hidden) setChen((c) => ({ ...c, hidden: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit?.active]);

  const night = part === 'night' || part === 'midnight';

  // ───────── movement ─────────
  const meRef = useRef(me); meRef.current = me;
  const chenRef = useRef(chen); chenRef.current = chen;
  function walk(setA: (f: (a: Actor) => Actor) => void, ref: { current: Pick<Actor, 'x' | 'y'> }, x: number, y: number): Promise<void> {
    const from = ref.current;
    const tx = clamp(x, 12, ROOM_W - 12), ty = clamp(y, FLOOR_Y + 14, ROOM_H - 2);
    const dist = Math.hypot(tx - from.x, ty - from.y);
    if (dist < 2) return Promise.resolve();
    const dur = reduce ? 0 : Math.min(2.2, dist / 70);
    const flip = tx < from.x;
    let frame = 0;
    setA((a) => ({ ...a, lying: false, bedId: undefined, x: tx, y: ty, dur, pose: 'walk1', view: 'side', flip, z: undefined }));
    const t = setInterval(() => { frame++; setA((a) => ({ ...a, pose: frame % 2 ? 'walk2' : 'walk1' })); }, 170);
    return new Promise((res) => setTimeout(() => { clearInterval(t); setA((a) => ({ ...a, pose: 'stand', view: 'side', dur: 0 })); res(); }, dur * 1000 + 30));
  }
  const walkMe = (x: number, y: number) => walk(setMe, meRef, x, y);

  function say(who: '99' | 'chen', text: string, ms = 2300) {
    const id = Math.random();
    setBubbles((b) => [...b.filter((x) => x.who !== who), { id, who, text }]);
    setTimeout(() => setBubbles((b) => b.filter((x) => x.id !== id)), ms);
  }
  function burst(x: number, y: number, ch = '💗', n = 3) {
    const items = Array.from({ length: n }, (_, i) => ({ id: Math.random(), x: x + (i - 1) * 6, y: y - 4 * i, ch }));
    setHearts((h) => [...h, ...items]);
    setTimeout(() => setHearts((h) => h.filter((x) => !items.includes(x))), 1700);
  }
  function fxBurst(kind: ActFx, x: number, y: number) {
    const chars = FX_CHARS[kind];
    const items = Array.from({ length: 4 }, (_, i) => ({ id: Math.random(), x: x + (i - 1.5) * 6, y: y - 3 * i, ch: chars[i % chars.length] }));
    setHearts((h) => [...h, ...items]);
    setTimeout(() => setHearts((h) => h.filter((x) => !items.includes(x))), 1700);
  }
  async function guard(fn: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    try { await fn(); } catch (e) { toast((e as Error).message, 'error'); } finally { busy.current = false; }
  }

  // ───────── scene taps ─────────
  function sceneCoords(e: { clientX: number; clientY: number }) {
    const r = sceneRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * ROOM_W, y: ((e.clientY - r.top) / r.height) * ROOM_H };
  }
  function onSceneClick(e: { clientX: number; clientY: number }) {
    const { x, y } = sceneCoords(e);
    if (placing) {
      const kind = placing.kind, id = placing.id;
      setPlacing(null);
      run(() => (kind === 'furn' ? placeFurniture(id, room, x, y) : placeDevice(id, room, x, y)), '已擺放');
      return;
    }
    if (arrange) return;
    if (y > FLOOR_Y + 8) guard(async () => { await walkMe(x, y); setMe((a) => ({ ...a, view: 'front', flip: false })); });
  }

  const def = (f: OwnedFurniture) => furnById.get(f.defId)!;

  // ───────── 擺設模式拖曳 ─────────
  /** Taps on a transparent pixel go to the object underneath (or the floor). Returns true if handled that way. */
  function passClick(e: { currentTarget: Element; clientX: number; clientY: number; stopPropagation: () => void }) {
    if (opaqueAt(e.currentTarget, e.clientX, e.clientY)) return false;
    e.stopPropagation();
    const below = solidObjBelow(e.currentTarget, e.clientX, e.clientY);
    if (below) below.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY }));
    else onSceneClick(e);
    return true;
  }
  function dragDown(e: RPE<HTMLElement>, kind: DragKind, id: string, x: number, y: number) {
    if (!arrange || placing) return;
    if (!opaqueAt(e.currentTarget, e.clientX, e.clientY)) {
      const below = solidObjBelow(e.currentTarget, e.clientX, e.clientY);
      e.stopPropagation();
      if (below) below.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId, pointerType: e.pointerType, isPrimary: true }));
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    const p = sceneCoords(e);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    dragStart.current = { kind, id, px: p.x, py: p.y, ox: x, oy: y, moved: false, pointerId: e.pointerId };
    setAttached(kind === 'win' ? attachedCurtains(x, y).map((f) => f.id) : []);
  }
  function dragMove(e: RPE<HTMLElement>) {
    const s = dragStart.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const p = sceneCoords(e);
    const dx = p.x - s.px, dy = p.y - s.py;
    if (!s.moved && Math.hypot(dx, dy) < 3) return;
    s.moved = true;
    let pos: { x: number; y: number };
    if (s.kind === 'furn') { const f = furniture.find((o) => o.id === s.id); if (!f) return; pos = furniturePos(def(f), s.ox + dx, s.oy + dy); }
    else if (s.kind === 'win') pos = windowPos(s.ox + dx, s.oy + dy);
    else pos = devicePos(s.ox + dx, s.oy + dy);
    setDrag({ kind: s.kind, id: s.id, ...pos });
  }
  function dragUp(e: RPE<HTMLElement>) {
    const s = dragStart.current;
    if (!s || s.pointerId !== e.pointerId) return;
    dragStart.current = null;
    e.stopPropagation();
    if (!s.moved) {
      setDrag(null);
      if (s.kind === 'furn') { const f = furniture.find((o) => o.id === s.id); if (f) setSelected(f); }
      else if (s.kind === 'win') setWinMenu(true);
      else { const d = devices.find((o) => o.id === s.id); if (d) setSelectedDev(d); }
      return;
    }
    const d = drag && drag.id === s.id ? drag : null;
    if (!d) return;
    const moveCurtains = async () => { for (const c of placed.filter((f) => attached.includes(f.id))) await placeFurniture(c.id, room, c.x + (d.x - s.ox), c.y + (d.y - s.oy)); };
    const save = s.kind === 'furn' ? placeFurniture(s.id, room, d.x, d.y) : s.kind === 'win' ? Promise.all([setWindowLayout(room, { x: d.x, y: d.y }), moveCurtains()]) : placeDevice(s.id, room, d.x, d.y);
    save.catch((err) => toast((err as Error).message, 'error')).finally(() => setTimeout(() => setDrag((cur) => (cur && cur.id === s.id ? null : cur)), 120));
  }
  const dragProps = (kind: DragKind, id: string, x: number, y: number) => arrange ? {
    onPointerDown: (e: RPE<HTMLElement>) => dragDown(e, kind, id, x, y),
  } : {};
  const nearest = (cat: string) => placed.filter((f) => def(f).category === cat).sort((a, b) => Math.abs(a.x - me.x) - Math.abs(b.x - me.x))[0];

  async function interact(f: OwnedFurniture) {
    const d = def(f);
    const approach = async () => { await walkMe(f.x, Math.min(ROOM_H - 2, f.y + 6)); };
    switch (d.interaction) {
      case 'sit': await guard(async () => {
        if (me.pose === 'sit' && Math.abs(me.x - f.x) < 3) { setMe((a) => ({ ...a, pose: 'stand', view: 'front', y: f.y + 6, z: undefined })); say('99', '起身～'); return; }
        await approach();
        setMe((a) => ({ ...a, x: f.x, y: f.y - 2, pose: 'sit', view: 'front', flip: false, z: f.y + 1 }));
        say('99', '坐一下');
      }); break;
      case 'sofa': await guard(async () => { await walkMe(f.x - 10, f.y + 6); setMe((a) => ({ ...a, x: f.x - 10, y: f.y - 4, pose: 'sit', view: 'front', z: f.y + 1 })); }); break;
      case 'sleep': await guard(async () => {
        if (me.lying) { setMe((a) => ({ ...a, lying: false, bedId: undefined, pose: 'stand', view: 'front', y: f.y + 8, expr: 'smile', z: undefined })); say('99', '睡飽了！'); return; }
        await approach();
        setMe((a) => ({ ...a, x: f.flip ? f.x + 1 : f.x - 1, y: f.y - 10, lying: true, bedId: f.id, bedFlip: !!f.flip, pose: 'stand', view: 'front', expr: 'closed', z: f.y + 1 }));
        say('99', '晚安…');
      }); break;
      case 'fridge': await guard(async () => { await approach(); setMe((a) => ({ ...a, pose: 'takeFood', view: 'front' })); setOpenFridge(f.id); await sleep(650); navigate('/fridge'); }); break;
      case 'wardrobe': await guard(async () => { await approach(); setMe((a) => ({ ...a, view: 'back' })); await sleep(400); navigate('/wardrobe'); }); break;
      case 'shelf': setSelected(f); break;
      case 'lamp': setLampOff((s) => ({ ...s, [f.id]: !(s[f.id] ?? !night) })); break;
      case 'projector': setProjectorOn((v) => !v); break;
      case 'plantShelf': navigate('/balcony'); break;
      case 'music': await guard(async () => {
        if (playing === f.id) { stopMusic(); setPlaying(null); say('99', '先停一下～'); return; }
        await approach();
        setMe((a) => ({ ...a, view: 'back' }));
        await sleep(300);
        playMusic(); setPlaying(f.id);
        setMe((a) => ({ ...a, view: 'front', expr: 'happy' }));
        say('99', pick(['放首歌～', '這張唱片好好聽', '♪ 啦啦啦']));
      }); break;
      case 'act': await doAct(f); break;
      default: setSelected(f);
    }
  }
  const [openFridge, setOpenFridge] = useState<string | null>(null);

  async function doAct(f: OwnedFurniture) {
    const d = def(f), a = d.act!;
    await guard(async () => {
      if (!a.toggle) {
        await walkMe(f.x + (me.x < f.x ? -12 : 12), Math.min(ROOM_H - 2, Math.max(f.y + 6, FLOOR_Y + 20)));
        setMe((m) => ({ ...m, view: 'front', flip: false }));
        if (a.sit) setMe((m) => ({ ...m, x: f.x, y: f.y - 2, pose: 'sit', view: 'front', z: f.y + 1 }));
        else if (a.pose) setMe((m) => ({ ...m, pose: a.pose as Pose }));
      }
      await performAct(f, { x: f.x, y: f.y - d.h - 4 }, {
        visiting: !!visit?.active,
        say, fx: fxBurst, flash: () => { setFlashOn(true); setTimeout(() => setFlashOn(false), 260); },
        wiggle: (id) => { setWiggling((w) => ({ ...w, [id]: true })); setTimeout(() => setWiggling((w) => ({ ...w, [id]: false })), 700); },
        showNote: (title, text) => setNote({ title, text }),
        isOn: (id) => !!toggled[id], setOn: (id, on) => setToggled((t) => ({ ...t, [id]: on })),
      });
      if (!a.toggle && !a.sit) { await sleep(a.ms ?? 900); setMe((m) => ({ ...m, pose: 'stand' })); }
    });
  }

  async function useDevice(d: OwnedDevice) {
    const dd = deviceById.get(d.defId)!;
    await guard(async () => {
      if (dd.deviceType === 'computer') {
        await walkMe(d.x - 22, Math.min(ROOM_H - 2, d.y + 34));
        setMe((a) => ({ ...a, pose: 'computer', view: 'side', flip: false, y: d.y + 30, z: d.y + 31 }));
        await sleep(700);
        navigate('/computer');
      } else {
        await walkMe(d.x, Math.min(ROOM_H - 2, d.y + 34));
        setMe((a) => ({ ...a, pose: dd.deviceType === 'phone' ? 'phone' : 'read', view: 'front' }));
        await sleep(600);
        navigate(dd.deviceType === 'phone' ? '/phone' : '/tablet');
      }
    });
  }

  // ───────── 陳卷毛 ─────────
  async function arrive() {
    const door = ENTRY_DOOR[room];
    const sx = door ? door.x : ROOM_W + 14;
    sfx('door');
    setChen({ x: sx, y: FLOOR_Y + 22, pose: 'stand', view: 'front', flip: true, expr: 'happy', dur: 0, hidden: false });
    await sleep(350);
    const target = { x: clamp(me.x + 28, 30, 170), y: clamp(me.y, FLOOR_Y + 30, ROOM_H - 4) };
    await walk(setChen, { current: { x: sx, y: FLOOR_Y + 22 } }, target.x, target.y);
    setChen((c) => ({ ...c, view: 'side', flip: true, expr: 'happy' }));
        say('chen', pick(VISIT_LINES.arrive).text);
    setMe((a) => ({ ...a, pose: 'wave', view: 'front' }));
    await sleep(900);
    setMe((a) => ({ ...a, pose: 'stand', view: 'side', flip: false }));
  }

  async function invite() {
    await guard(async () => {

      markArrival();
      await startVisit();
      for (const a of await checkAchievements()) toast(`🏆 解鎖成就「${a.name}」+${a.reward}`, 'coin');
    });
  }

  /** Bring both characters face to face around a meeting point. */
  async function meet(gap: number) {
    const m = meRef.current, c = chenRef.current;
    const mx = clamp((m.x + c.x) / 2, 30, ROOM_W - 30), my = clamp((m.y + c.y) / 2, FLOOR_Y + 30, ROOM_H - 4);
    await Promise.all([walk(setMe, meRef, mx - gap, my), walk(setChen, chenRef, mx + gap, my)]);
    setMe((a) => ({ ...a, view: 'side', flip: false, x: mx - gap, y: my }));
    setChen((c) => ({ ...c, view: 'side', flip: true, x: mx + gap, y: my }));
    return { mx, my };
  }
  const line = (ls: Line[]) => { const l = pick(ls); setChen((c) => ({ ...c, expr: l.emotion })); say('chen', l.text, 2600); return l; };

  async function seatBoth() {
    const sofa = nearest('sofa'), bed = nearest('bed');
    if (sofa) {
      const s = sofa;
      await Promise.all([walk(setMe, meRef, s.x - 10, s.y + 6), walk(setChen, chenRef, s.x + 10, s.y + 6)]);
      setMe((a) => ({ ...a, x: s.x - 10, y: s.y - 4, pose: 'sit', view: 'front', flip: false, z: s.y + 1 }));
      setChen((c) => ({ ...c, x: s.x + 10, y: s.y - 4, pose: 'sit', view: 'front', flip: false, z: s.y + 1 }));
    } else if (bed) {
      const b = bed;
      await Promise.all([walk(setMe, meRef, b.x - 12, b.y + 6), walk(setChen, chenRef, b.x + 16, b.y + 6)]);
      setMe((a) => ({ ...a, x: b.x - 12, y: b.y - 6, pose: 'sit', view: 'front', flip: false, z: b.y + 1 }));
      setChen((c) => ({ ...c, x: b.x + 16, y: b.y - 6, pose: 'sit', view: 'front', flip: false, z: b.y + 1 }));
    } else {
      const { mx, my } = await meet(10);
      setMe((a) => ({ ...a, x: mx - 10, y: my, pose: 'sit', view: 'front' }));
      setChen((c) => ({ ...c, x: mx + 10, y: my, pose: 'sit', view: 'front' }));
    }
  }
  const standUp = () => {
    setMe((a) => ({ ...a, pose: 'stand', view: 'side', flip: false, z: undefined, y: a.pose === 'sit' || a.pose === 'eat' || a.pose === 'read' ? Math.min(ROOM_H - 2, a.y + 6) : a.y }));
    setChen((c) => ({ ...c, pose: 'stand', view: 'side', flip: true, z: undefined, y: c.pose === 'sit' || c.pose === 'eat' || c.pose === 'read' ? Math.min(ROOM_H - 2, c.y + 6) : c.y, expr: 'smile' }));
  };

  const love = {
    chat: () => guard(async () => {
      standUp(); await meet(12);
      // he notices how you feel today
      const mood = await getTodayMood();
      const l = mood && Math.random() < 0.6 ? line(pick(MOOD_REPLIES[moodLevel(mood.temp)])) : line(VISIT_LINES.chat);
      await sleep(1800); say('99', pick(['嗯嗯！', '真的嗎～', '哈哈哈', '我也這麼覺得'])); await logInteraction('chat', l.text);
    }),
    pat: () => guard(async () => {
      standUp(); const { mx, my } = await meet(9);
      setChen((c) => ({ ...c, pose: 'holdL', expr: 'smile' })); setMe((a) => ({ ...a, expr: 'shy', view: 'front' }));
      sfx('sparkle'); fxBurst('sparkles', mx - 9, my - 54); line(VISIT_LINES.pat); await logInteraction('pat');
      await sleep(2000); setChen((c) => ({ ...c, pose: 'stand' })); setMe((a) => ({ ...a, expr: 'happy', view: 'side' }));
      setLastMoment({ title: '摸摸頭', content: '他摸了摸我的頭，說今天也很努力。' });
    }),
    hands: () => guard(async () => {
      standUp(); const { mx, my } = await meet(8);
      setMe((a) => ({ ...a, pose: 'holdR', view: 'front', flip: false, expr: 'shy' })); setChen((c) => ({ ...c, pose: 'holdL', view: 'front', flip: false, expr: 'shy' }));
      sfx('hug'); fxBurst('hearts', mx, my - 30); line(VISIT_LINES.hands); await logInteraction('hands');
      await sleep(2600); setMe((a) => ({ ...a, pose: 'stand', view: 'side' })); setChen((c) => ({ ...c, pose: 'stand', view: 'side', flip: true }));
      setLastMoment({ title: '牽手', content: '牽著手在房間裡走了一圈。' });
    }),
    aegyo: () => guard(async () => {
      standUp(); const { mx, my } = await meet(10);
      say('99', pick(['陪我嘛～', '人家想你嘛', '抱一下下就好～']));
      setMe((a) => ({ ...a, expr: 'shy', pose: 'wave', view: 'front' })); sfx('squeak'); fxBurst('hearts', mx - 10, my - 52);
      await sleep(1200); setChen((c) => ({ ...c, expr: 'shy' })); line(VISIT_LINES.aegyo); await logInteraction('aegyo');
      await sleep(1600); setMe((a) => ({ ...a, pose: 'stand', view: 'side', expr: 'happy' }));
    }),
    dance: () => guard(async () => {
      standUp(); const { mx, my } = await meet(8);
      const rec = placed.find((f) => def(f).category === 'recordPlayer');
      if (rec && playing !== rec.id) { playMusic(); setPlaying(rec.id); }
      line(VISIT_LINES.dance); await logInteraction('dance');
      for (let i = 0; i < 8; i++) {
        const p1: Pose = i % 2 ? 'walk1' : 'walk2';
        setMe((a) => ({ ...a, pose: p1, view: i % 4 < 2 ? 'side' : 'front', flip: i % 4 === 1 }));
        setChen((c) => ({ ...c, pose: i % 2 ? 'walk2' : 'walk1', view: i % 4 < 2 ? 'side' : 'front', flip: i % 4 !== 1 }));
        if (i % 2 === 0) fxBurst('notes', mx, my - 56);
        await sleep(380);
      }
      setMe((a) => ({ ...a, pose: 'stand', view: 'side', flip: false })); setChen((c) => ({ ...c, pose: 'stand', view: 'side', flip: true }));
      setLastMoment({ title: '一起跳舞', content: rec ? '放著黑膠，在房間裡亂跳了一支舞。' : '沒有音樂也跳了一支舞，他踩到我的腳兩次。' });
    }),
    photo: () => guard(async () => {
      standUp(); const { mx, my } = await meet(7);
      setMe((a) => ({ ...a, pose: 'wave', view: 'front', flip: false, expr: 'happy' })); setChen((c) => ({ ...c, pose: 'wave', view: 'front', flip: false, expr: 'happy' }));
      line(VISIT_LINES.photo); await sleep(900);
      sfx('shutter'); setFlashOn(true); setTimeout(() => setFlashOn(false), 260); fxBurst('sparkles', mx, my - 56);
      await saveMemory({ title: '合照', content: '和陳卷毛在房間拍了一張合照。', sourceType: 'game' });
      await logInteraction('photo'); toast('📸 合照收進戀愛日記了', 'love');
      await sleep(1200); setMe((a) => ({ ...a, pose: 'stand', view: 'side' })); setChen((c) => ({ ...c, pose: 'stand', view: 'side', flip: true }));
    }),
    hug: () => guard(async () => {
      standUp(); const { mx, my } = await meet(6);
      setMe((a) => ({ ...a, pose: 'hug', expr: 'shy' })); setChen((c) => ({ ...c, pose: 'hug', expr: 'happy', z: my - 0.5 }));
      burst(mx, my - 52); sfx('hug'); line(VISIT_LINES.hug); await logInteraction('hug');
      await sleep(2600); setMe((a) => ({ ...a, pose: 'stand', expr: 'happy' })); setChen((c) => ({ ...c, pose: 'stand', z: undefined }));
      setLastMoment({ title: '抱抱', content: '在房間裡抱了一下，電量充滿。' });
    }),
    kiss: () => guard(async () => {
      standUp(); const { mx, my } = await meet(7);
      setMe((a) => ({ ...a, pose: 'kiss', expr: 'closed' })); setChen((c) => ({ ...c, pose: 'kiss', expr: 'closed' }));
      burst(mx, my - 50, '💗', 4); sfx('kiss'); await sleep(500); line(VISIT_LINES.kiss); await logInteraction('kiss');
      await sleep(2200); setMe((a) => ({ ...a, pose: 'stand', expr: 'shy' })); setChen((c) => ({ ...c, pose: 'stand', expr: 'shy' }));
      setLastMoment({ title: '親親', content: '耳朵都紅了的一個親親。' });
    }),
    sit: () => guard(async () => { await seatBoth(); line(VISIT_LINES.sit); await logInteraction('sit'); }),
    meal: () => setPicker('meal'),
    read: () => setPicker('read'),
    gift: () => setPicker('gift'),
    diary: () => setPicker('diary'),
    movie: () => guard(async () => {
      const proj = nearest('projector');
      await seatBoth();
      if (proj) setProjectorOn(true);
      else { toast('沒有投影機，先用手機一起看～（商店可以買小型投影機）', 'info'); }
      line(VISIT_LINES.movie); await logInteraction('movie', proj ? '投影機' : '手機');
      setLastMoment({ title: '一起看電影', content: proj ? '關燈、開投影機，窩在一起看了一部電影。' : '擠在一起用手機看了一部電影。' });
    }),
    leave: () => guard(async () => {
      standUp();
      line(VISIT_LINES.leave);
      setMe((a) => ({ ...a, pose: 'wave', view: 'front' }));
      await sleep(1400);
      const door = ENTRY_DOOR[room];
      await walk(setChen, chenRef, door ? door.x : ROOM_W + 16, door ? FLOOR_Y + 22 : chen.y);
      sfx('door');
      setChen((c) => ({ ...c, hidden: true }));
      await endVisit();
      setMe((a) => ({ ...a, pose: 'stand', view: 'front' }));
      toast('陳卷毛回家了，今天也很開心 💗', 'love');
    }),
  };

  async function doMeal(foodId: string) {
    setPicker(null);
    await guard(async () => {
      const r = await shareMeal(foodId);
      const table = nearest('table') ?? nearest('desk');
      if (table) {
        const t = table;
        await Promise.all([walk(setMe, meRef, t.x - 14, t.y + 6), walk(setChen, chenRef, t.x + 14, t.y + 6)]);
        setMe((a) => ({ ...a, x: t.x - 14, y: t.y + 4, pose: 'eat', view: 'front', flip: false, z: t.y + 2 }));
        setChen((c) => ({ ...c, x: t.x + 14, y: t.y + 4, pose: 'eat', view: 'front', flip: false, z: t.y + 2 }));
      } else {
        await seatBoth();
        setMe((a) => ({ ...a, pose: 'eat' })); setChen((c) => ({ ...c, pose: 'eat' }));
      }
      line(VISIT_LINES.eat);
      toast(`一起吃了${foodById.get(foodId)?.name}（用掉 ${r.used} 份）`, 'love');
      for (const a of await checkAchievements()) toast(`🏆 解鎖成就「${a.name}」+${a.reward}`, 'coin');
      setLastMoment({ title: `一起吃${foodById.get(foodId)?.name}`, content: '和陳卷毛一起吃東西，最後一口他讓給我。' });
      await sleep(2600);
      setMe((a) => ({ ...a, pose: 'sit' })); setChen((c) => ({ ...c, pose: 'sit' }));
    });
  }
  async function doRead(bookId: string) {
    setPicker(null);
    await guard(async () => {
      const b = await readTogether(bookId);
      await seatBoth();
      setMe((a) => ({ ...a, pose: 'read', expr: 'smile' })); setChen((c) => ({ ...c, pose: 'read' }));
      line(VISIT_LINES.read);
      for (const a of await checkAchievements()) toast(`🏆 解鎖成就「${a.name}」+${a.reward}`, 'coin');
      setLastMoment({ title: `一起讀《${b.title}》`, content: `並肩坐著讀《${b.title}》。` });
    });
  }
  async function doGift(id: string) {
    setPicker(null);
    await guard(async () => {
      const g = await giveGift(id);
      standUp(); const { mx, my } = await meet(10);
      setMe((a) => ({ ...a, pose: 'takeFood', view: 'front' }));
      setChen((c) => ({ ...c, expr: 'surprised' })); await sleep(500);
      say('chen', g.line, 3000); setChen((c) => ({ ...c, expr: 'happy' })); burst(mx, my - 50, '✨');
      await sleep(1200); setMe((a) => ({ ...a, pose: 'stand', view: 'side' }));
      setLastMoment({ title: `送了${g.name}`, content: `送陳卷毛${g.name}，他開心了好久。` });
    });
  }
  async function doDiary(id: string) {
    setPicker(null);
    const d = diary.find((x) => x.id === id);
    await guard(async () => {
      await seatBoth();
      setMe((a) => ({ ...a, pose: 'write' })); line(VISIT_LINES.diary);
      await logInteraction('diary', d?.title);
    });
  }

  // ───────── rendering helpers ─────────
  const lampOn = (f: OwnedFurniture) => (lampOff[f.id] === undefined ? night : !lampOff[f.id]);
  const actorEl = (a: Actor, who: '99' | 'chen') => {
    if (a.hidden) return null;
    const url = characterURL({ who, pose: a.pose, view: a.view, expr: a.expr, equip: who === '99' ? equip99 : equipChen, flip: a.flip });
    const scale = who === 'chen' ? 1.07 : 1;
    return (
      <div key={who} className="actor" data-testid={who === 'chen' ? 'actor-chen' : 'actor-99'} data-pose={a.pose}
        style={{ left: pct(a.x, ROOM_W), top: pct(a.y, ROOM_H), width: pct((CHAR_W + 2) * scale, ROOM_W), zIndex: Math.round((a.z ?? a.y) * 10) + (who === '99' ? 1 : 0), transitionDuration: `${a.dur}s`, transform: a.lying ? `translate(-50%,-60%) rotate(${a.bedFlip ? 90 : -90}deg)` : undefined }}>
        <img src={url} alt={who === '99' ? '99' : '陳卷毛'} />
      </div>
    );
  };
  const objStyle = (x: number, y: number, w: number, z: number) => ({ left: pct(x, ROOM_W), top: pct(y, ROOM_H), width: pct(w + 2, ROOM_W), zIndex: z });

  const shelfData = useMemo(() => shelfBooks(books), [books]);

  return (
    <div>
      <div className="scene-tabs" role="tablist">
        <button className={room === 'bedroom' ? 'on' : ''} onClick={() => setRoom('bedroom')}>🛏 臥室</button>
        <button className={room === 'study' ? 'on' : ''} onClick={() => setRoom('study')}>📚 書房</button>
        <button className={room === 'kitchen' ? 'on' : ''} onClick={() => setRoom('kitchen')} data-testid="tab-kitchen">🍳 廚房</button>
        <button onClick={() => navigate('/balcony')}>🌿 陽台</button>
        <button onClick={() => navigate('/phone')}>📱 手機</button>
      </div>
      <div className="scene-wrap">
        <div className={'scene' + (arrange ? ' arrange' : '')} ref={sceneRef} onClick={(e) => onSceneClick(e)} data-testid="room-scene" data-room={room}
          onPointerMove={dragMove} onPointerUp={dragUp} onPointerCancel={() => { dragStart.current = null; setDrag(null); }}>
          <img className="layer px" src={roomBg(room)} alt="" style={{ width: '100%', height: '100%' }} />
          {/* window with real-time sky */}
          {(() => {
            const dragging = drag?.kind === 'win';
            const wx = dragging ? drag.x : win.x, wy = dragging ? drag.y : win.y;
            return <img className={'obj px' + (win.flip ? ' flipped' : '') + (arrange ? ' arranging' : '') + (dragging ? ' dragging' : '')} draggable={false} src={windowURL(part)} alt={`窗外：${DAYPART_LABEL[part]}`} data-testid="room-window"
              style={objStyle(wx, wy, WINDOW_W, dragging ? 2800 : 2)} {...dragProps('win', 'window', win.x, win.y)}
              onClick={(e) => { if (passClick(e)) return; e.stopPropagation(); if (placing) return onSceneClick(e); if (arrange) return; toast(`現在是${DAYPART_LABEL[part]} ${timeHM(now)}`, 'info'); }} />;
          })()}
          {BALCONY_DOOR[room] && <img className="obj px" src={doorURL('balcony')} alt="陽台入口" data-testid="balcony-door" style={objStyle(BALCONY_DOOR[room]!.x, FLOOR_Y + 2, 28, 3)} onClick={(e) => { e.stopPropagation(); navigate('/balcony'); }} />}
          {ENTRY_DOOR[room] && <img className="obj px" src={doorURL('entry')} alt="大門" style={objStyle(ENTRY_DOOR[room]!.x, FLOOR_Y + 2, 28, 3)} onClick={(e) => { e.stopPropagation(); if (!visit?.active) toast('想見陳卷毛的話，可以按「邀請陳卷毛」', 'info'); }} />}
          {placed.map((f) => {
            const d = def(f);
            const isShelf = d.category === 'bookshelf';
            const perRow = d.id === 'bookshelf_tall' ? 12 : 9;
            const { url, w } = furnitureURL(d, { on: ((d.category === 'lamp' || d.category === 'readingLamp') && lampOn(f)) || playing === f.id || !!toggled[f.id], frame: playing === f.id ? spin % 2 : ANIMATED.has(d.id) ? tick % 2 : 0, open: openFridge === f.id, books: isShelf ? shelfData : undefined, rows: isShelf ? shelfRows(shelfData.length, perRow, d.id === 'bookshelf_tall' ? 6 : 5) : undefined, now: d.category === 'clock' ? now : undefined });
            const dragging = drag?.kind === 'furn' && drag.id === f.id;
            const riding = drag?.kind === 'win' && attached.includes(f.id);
            const fx = dragging ? drag.x : riding ? f.x + (drag.x - win.x) : f.x, fy = dragging ? drag.y : riding ? f.y + (drag.y - win.y) : f.y;
            const z = dragging ? 2800 : d.placement === 'wall' ? 4 : d.category === 'rug' ? 5 : d.placement === 'surface' ? Math.round(fy * 10) + 400 : Math.round(fy * 10);
            return (
              <img key={f.id} draggable={false} className={'obj px' + (f.flip ? ' flipped' : '') + (wiggling[f.id] ? ' wiggle' : '') + (selected?.id === f.id ? ' selected' : '') + (arrange ? ' arranging' : '') + (dragging ? ' dragging' : '')} src={url} alt={d.name} data-testid={`furn-${d.category}`} data-defid={d.id}
                style={objStyle(fx, fy, w, z)} {...dragProps('furn', f.id, f.x, f.y)}
                onClick={(e) => { if (passClick(e)) return; e.stopPropagation(); if (placing) return onSceneClick(e); if (arrange) return; interact(f); }} />
            );
          })}
          {placedDev.map((d) => {
            const dd = deviceById.get(d.defId)!;
            const { url, w } = deviceURL(dd, night || dd.deviceType !== 'phone');
            const dragging = drag?.kind === 'dev' && drag.id === d.id;
            const dx = dragging ? drag.x : d.x, dy = dragging ? drag.y : d.y;
            return <img key={d.id} draggable={false} className={'obj px' + (d.flip ? ' flipped' : '') + (arrange ? ' arranging' : '') + (dragging ? ' dragging' : '')} src={url} alt={dd.name} data-testid={`device-${dd.deviceType}`} style={objStyle(dx, dy, w, dragging ? 2850 : Math.round(dy * 10) + 500)} {...dragProps('dev', d.id, d.x, d.y)} onClick={(e) => { if (passClick(e)) return; e.stopPropagation(); if (placing) return onSceneClick(e); if (arrange) return; setSelectedDev(d); }} />;
          })}
          {/* lamp glow */}
          {placed.filter((f) => (def(f).category === 'lamp' || def(f).category === 'readingLamp') && lampOn(f)).map((f) => (
            <div key={'g' + f.id} className="glow" style={{ left: pct(f.x - 40, ROOM_W), top: pct(f.y - def(f).h - 30, ROOM_H), width: pct(80, ROOM_W), height: pct(70, ROOM_H), zIndex: 3000 }} />
          ))}
          {placed.filter((f) => toggled[f.id] && ['string_lights', 'camp_lantern', 'neon_heart'].includes(f.defId)).map((f) => (
            <div key={'tg' + f.id} className={'glow' + (f.defId === 'neon_heart' ? ' pink' : '')} style={{ left: pct(f.x - 34, ROOM_W), top: pct(f.y - def(f).h - 22, ROOM_H), width: pct(68, ROOM_W), height: pct(def(f).h + 40, ROOM_H), zIndex: 3000 }} />
          ))}
          {placed.some((f) => f.defId === 'star_projector' && toggled[f.id]) && <div className="star-sky" data-testid="star-sky" style={{ height: pct(FLOOR_Y, ROOM_H) }} />}
          {flashOn && <div className="photo-flash" />}
          {projectorOn && nearest('projector') && <div className="screen-glow" style={{ left: pct(110, ROOM_W), top: pct(20, ROOM_H), width: pct(66, ROOM_W), height: pct(44, ROOM_H), zIndex: 6 }} />}
          {actorEl(me, '99')}
          {actorEl(chen, 'chen')}
          {(() => {
            if (!me.lying || !me.bedId) return null;
            const b = placed.find((f) => f.id === me.bedId); if (!b) return null;
            const bd = def(b);
            return <img className={'obj px' + (b.flip ? ' flipped' : '')} src={bedBlanketURL(bd)} alt="" data-testid="blanket" style={{ ...objStyle(b.x, b.y, bd.w, Math.round((b.y + 1) * 10) + 5), pointerEvents: 'none' }} />;
          })()}
          {notes.map((n) => <div key={n.id} className="music-note" style={{ left: pct(n.x, ROOM_W), top: pct(n.y, ROOM_H) }}>{n.ch}</div>)}
          {me.lying && <div className="zzz" style={{ left: pct(me.x + 10, ROOM_W), top: pct(me.y - 30, ROOM_H), zIndex: 4000 }}>Zzz</div>}
          {bubbles.map((b) => { const a = b.who === '99' ? me : chen; return <div key={b.id} className="bubble" style={{ left: pct(clamp(a.x, 40, ROOM_W - 40), ROOM_W), top: pct(a.lying ? a.y - 30 : a.y - 52, ROOM_H) }}>{b.text}</div>; })}
          {hearts.map((h) => <div key={h.id} className="hearts" style={{ left: pct(h.x, ROOM_W), top: pct(h.y, ROOM_H) }}>{h.ch}</div>)}
          <div className="tint" style={{ background: TINT[part], zIndex: 2900 }} />
          <div className="scene-hud">
            <span className="hud-pill">{ROOM_LABEL[room]} · {DAYPART_LABEL[part]} {timeHM(now)}</span>
            {visit?.active && <span className="hud-pill" style={{ background: '#fde9ea' }}>💗 陳卷毛在家</span>}
          </div>
          {arrange && !placing && <div className="place-hint" data-testid="arrange-hint">🛠 拖曳家具移動 · 點一下可收納／更換 · <button className="btn small" style={{ minHeight: 24, padding: '0 6px' }} onClick={(e) => { e.stopPropagation(); setArrange(false); }}>完成</button></div>}
          {placing && <div className="place-hint">點選要放「{placing.name}」的位置 · <button className="btn small" style={{ minHeight: 24, padding: '0 6px' }} onClick={(e) => { e.stopPropagation(); setPlacing(null); }}>取消</button></div>}
        </div>
      </div>

      {visit?.active ? (
        <div>
          <div className="action-bar" data-testid="love-actions">
            <button className="btn" onClick={love.chat}>💬<span>聊天</span></button>
            <button className="btn pink" onClick={love.hug} data-testid="act-hug">🤗<span>抱抱</span></button>
            <button className="btn pink" onClick={love.kiss} data-testid="act-kiss">💋<span>親親</span></button>
            <button className="btn pink" onClick={love.pat} data-testid="act-pat">🫳<span>摸摸頭</span></button>
            <button className="btn pink" onClick={love.hands} data-testid="act-hands">🤝<span>牽手</span></button>
            <button className="btn pink" onClick={love.aegyo} data-testid="act-aegyo">🥺<span>撒嬌</span></button>
            <button className="btn" onClick={love.dance} data-testid="act-dance">💃<span>跳舞</span></button>
            <button className="btn" onClick={love.photo} data-testid="act-photo">📸<span>拍合照</span></button>
            <button className="btn" onClick={love.sit}>🛋<span>一起坐著</span></button>
            <button className="btn" onClick={love.meal} data-testid="act-meal">🍙<span>一起吃飯</span></button>
            <button className="btn" onClick={love.read}>📖<span>一起看書</span></button>
            <button className="btn" onClick={love.movie}>🎬<span>看電影</span></button>
            <button className="btn" onClick={love.diary}>📔<span>分享日記</span></button>
            <button className="btn" onClick={love.gift}>🎁<span>送小禮物</span></button>
            <button className="btn" onClick={() => navigate('/love')}>📱<span>傳訊息</span></button>
            <button className="btn" onClick={() => setStorage(true)}>📦<span>收納箱</span></button>
            <button className={'btn' + (arrange ? ' primary' : '')} onClick={() => { setArrange((v) => !v); setDrag(null); setPlacing(null); }} data-testid="arrange-toggle">🛠<span>{arrange ? '完成擺設' : '擺設'}</span></button>
            <button className="btn wood" onClick={love.leave} data-testid="act-leave">🚪<span>送他回家</span></button>
          </div>
          {lastMoment && (
            <div className="card flat" style={{ margin: '0 12px 12px', background: '#fde9ea' }}>
              <div className="row between"><span className="small">想把「{lastMoment.title}」收進戀愛日記嗎？<br /><span className="muted">（會標記為遊戲紀錄）</span></span>
                <button className="btn small pink" onClick={() => run(async () => { await saveMemory({ ...lastMoment, sourceType: 'game' }); setLastMoment(null); }, '已收藏到戀愛日記')}>收藏</button></div>
            </div>
          )}
        </div>
      ) : (
        <div className="action-bar">
          <button className="btn pink" onClick={invite} data-testid="invite-chen">💗<span>邀請陳卷毛</span></button>
          <button className="btn" onClick={() => setStorage(true)}>📦<span>收納箱{stored.length + storedDev.length ? ` ${stored.length + storedDev.length}` : ''}</span></button>
<button className={'btn' + (arrange ? ' primary' : '')} onClick={() => { setArrange((v) => !v); setDrag(null); setPlacing(null); }} data-testid="arrange-toggle">🛠<span>{arrange ? '完成擺設' : '擺設'}</span></button>
          <button className="btn" onClick={() => navigate('/shop')}><Icon name="gift" /><span>商店</span></button>
          <button className="btn" onClick={() => navigate('/bookshelf')}><Icon name="shelf" /><span>書架</span></button>
        </div>
      )}
      <p className="muted center small" style={{ padding: '0 12px' }}>點地板走路、點家具互動；按「🛠 擺設」就能拖曳移動任何家具，點一下可收納或更換。</p>

      {/* furniture menu */}
      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected ? def(selected).name : ''}>
        {selected && <FurnitureMenu f={selected} d={def(selected)} owned={furniture} onClose={() => setSelected(null)}
          onMove={() => { setPlacing({ kind: 'furn', id: selected.id, name: def(selected).name }); setSelected(null); }}
          onFlip={() => { const f = selected; setSelected(null); run(() => toggleFlip('furn', f.id)); }}
          onUse={() => { const f = selected; setSelected(null); if (def(f).interaction === 'shelf') navigate('/bookshelf'); else interact(f); }} />}
      </Sheet>
      <Sheet open={!!selectedDev} onClose={() => setSelectedDev(null)} title={selectedDev ? deviceById.get(selectedDev.defId)!.name : ''}>
        {selectedDev && (
          <div className="stack">
            <button className="btn primary" onClick={() => { const d = selectedDev; setSelectedDev(null); useDevice(d); }} data-testid="use-device">使用</button>
            <div className="grid2">
              <button className="btn" onClick={() => { setPlacing({ kind: 'dev', id: selectedDev.id, name: deviceById.get(selectedDev.defId)!.name }); setSelectedDev(null); }}>移動</button>
              <button className="btn" onClick={() => { const d = selectedDev; setSelectedDev(null); run(() => placeDevice(d.id, null), '已收進收納箱'); }}>收納</button>
            </div>
            <button className="btn" onClick={() => { const d = selectedDev; setSelectedDev(null); run(() => toggleFlip('dev', d.id)); }} data-testid="flip-item">↔ 左右翻轉</button>
          </div>
        )}
      </Sheet>
      <Sheet open={!!note} onClose={() => setNote(null)} title={note?.title}>
        {note && <div className="love-note" data-testid="love-note"><p>{note.text}</p><span>— 陳卷毛</span></div>}
      </Sheet>
      <Sheet open={winMenu} onClose={() => setWinMenu(false)} title="窗戶">
        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>在擺設模式下可以直接拖曳窗戶換位置。</p>
          <div className="grid2">
            <button className="btn" onClick={() => { setWinMenu(false); run(() => setWindowLayout(room, { flip: !win.flip })); }} data-testid="flip-window">↔ 左右翻轉</button>
            <button className="btn" onClick={() => { setWinMenu(false); run(() => setWindowLayout(room, null), '窗戶回到原位'); }}>回到原位</button>
          </div>
        </div>
      </Sheet>
      {/* storage box */}
      <Sheet open={storage} onClose={() => setStorage(false)} title="收納箱">
        {stored.length + storedDev.length === 0 ? <Empty icon="gift">收納箱是空的。在商店買的家具會先放在這裡。</Empty> : (
          <div className="shop-grid">
            {stored.map((f) => { const d = def(f); const { url } = furnitureURL(d, { books: d.category === 'bookshelf' ? shelfData : undefined, now }); return (
              <div key={f.id} className="shop-item">
                <div className="thumb"><img src={url} alt="" /></div>
                <div className="name">{d.name}</div><div className="muted">{FURN_CAT_LABEL[d.category]}</div>
                <button className="btn small primary" onClick={() => { setStorage(false); setPlacing({ kind: 'furn', id: f.id, name: d.name }); }} data-testid="place-item">擺到{ROOM_LABEL[room]}</button>
              </div>
            ); })}
            {storedDev.map((d) => { const dd = deviceById.get(d.defId)!; return (
              <div key={d.id} className="shop-item">
                <div className="thumb"><img src={deviceURL(dd, true).url} alt="" /></div>
                <div className="name">{dd.name}</div>
                <button className="btn small primary" onClick={() => { setStorage(false); setPlacing({ kind: 'dev', id: d.id, name: dd.name }); }}>擺到{ROOM_LABEL[room]}</button>
              </div>
            ); })}
          </div>
        )}
      </Sheet>
      {/* love pickers */}
      <Sheet open={picker === 'meal'} onClose={() => setPicker(null)} title="一起吃什麼？">
        {food.filter((x) => x.quantity > 0).length === 0 ? (
          <div className="stack"><p>{VISIT_LINES.noFood[0].text}</p><p className="muted">冰箱裡沒有食物，不能一起吃飯。</p><button className="btn primary" onClick={() => navigate('/shop?tab=food')} data-testid="go-buy-food">去買食物</button></div>
        ) : (
          <div className="shop-grid">
            {food.filter((x) => x.quantity > 0).map((x) => (
              <button key={x.foodId} className="shop-item" onClick={() => doMeal(x.foodId)} style={{ cursor: 'pointer' }} data-testid={`meal-${x.foodId}`}>
                <div className="thumb"><img src={foodURL(x.foodId)} alt="" style={{ width: 48 }} /></div>
                <div className="name">{foodById.get(x.foodId)?.name}</div><div className="muted">冰箱裡有 {x.quantity} 份</div>
              </button>
            ))}
          </div>
        )}
      </Sheet>
      <Sheet open={picker === 'read'} onClose={() => setPicker(null)} title="一起讀哪一本？">
        {books.length === 0 ? <Empty icon="book">書庫裡還沒有書。</Empty> : <div className="list">{books.map((b) => <button key={b.id} className="list-item" onClick={() => doRead(b.id)}>📖 {b.title}</button>)}</div>}
      </Sheet>
      <Sheet open={picker === 'gift'} onClose={() => setPicker(null)} title="送什麼小禮物？">
        <div className="list">{GIFTS.map((g) => <button key={g.id} className="list-item" onClick={() => doGift(g.id)}><span style={{ flex: 1 }}>{g.name}</span><Icon name="coin" size={14} />{g.price}</button>)}</div>
      </Sheet>
      <Sheet open={picker === 'diary'} onClose={() => setPicker(null)} title="分享哪一篇日記？">
        {diary.length === 0 ? <div className="stack"><p className="muted">還沒有日記。用電腦、平板或手機寫一篇吧。</p><button className="btn" onClick={() => navigate('/diary')}>去寫日記</button></div>
          : <div className="list">{diary.slice(0, 20).map((d) => <button key={d.id} className="list-item" onClick={() => doDiary(d.id)}>{d.date}｜{d.title}</button>)}</div>}
      </Sheet>
    </div>
  );
}

function FurnitureMenu({ f, d, owned, onClose, onMove, onUse, onFlip }: { f: OwnedFurniture; d: FurnitureDef; owned: OwnedFurniture[]; onClose: () => void; onMove: () => void; onUse: () => void; onFlip: () => void }) {
  const { run } = useAction();
  const alts = owned.filter((o) => !o.roomId && furnById.get(o.defId)?.category === d.category);
  const useLabel: Partial<Record<FurnitureDef['interaction'], string>> = { shelf: '看動態書架', clock: '', deco: '', desk: '', table: '' };
  const label = d.act?.verb ?? useLabel[d.interaction] ?? '互動';
  return (
    <div className="stack">
      {d.category === 'clock' && <p style={{ fontSize: 28, fontWeight: 800, margin: 0, textAlign: 'center' }}>{timeHM()}</p>}
      {d.category === 'desk' && <p className="muted" style={{ margin: 0 }}>書桌上可以放電腦、平板和桌燈。點電腦就能使用。</p>}
      {label && <button className="btn primary" onClick={onUse}>{label}</button>}
      <div className="grid2">
        <button className="btn" onClick={onMove}>移動</button>
        <button className="btn" onClick={async () => { if (await confirmDialog(`把「${d.name}」收進收納箱？`)) { onClose(); run(() => storeFurniture(f.id), '已收進收納箱'); } }}>收納</button>
      </div>
      <button className="btn" onClick={onFlip} data-testid="flip-item">↔ 左右翻轉</button>
      {alts.length > 0 && (
        <>
          <b className="small">更換成其他{FURN_CAT_LABEL[d.category]}</b>
          <div className="shop-grid">
            {alts.map((a) => { const ad = furnById.get(a.defId)!; return (
              <button key={a.id} className="shop-item" style={{ cursor: 'pointer' }} onClick={() => { onClose(); run(() => swapFurniture(f.id, a.id), `已換成「${ad.name}」`); }}>
                <div className="thumb"><img src={furnitureURL(ad, { now: new Date() }).url} alt="" /></div><div className="name">{ad.name}</div>
              </button>
            ); })}
          </div>
        </>
      )}
    </div>
  );
}
