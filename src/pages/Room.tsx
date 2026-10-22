import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../db/idb';
import { useDayPart, useLive, useReducedMotion } from '../hooks';
import { navigate } from '../router';
import { useBooks, useEquip } from '../state';
import { characterURL, CHAR_W, type Expression, type Pose, type View } from '../sprites/characters';
import { doorURL, furnitureURL, deviceURL, windowURL, foodURL } from '../sprites/furniture';
import { sprite } from '../sprites/pixel';
import { deviceById, furnById, FURN_CAT_LABEL, GIFTS, foodById, type FurnitureDef } from '../data/catalog';
import { shelfBooks, shelfRows } from '../components/shelf';
import { placeDevice, placeFurniture, storeFurniture, swapFurniture, ROOM_H, ROOM_W, FLOOR_Y } from '../services/life';
import { endVisit, getVisit, giveGift, logInteraction, readTogether, saveMemory, shareMeal, startVisit } from '../services/love';
import { checkAchievements } from '../services/reading';
import { VISIT_LINES, type Line } from '../data/dialogue';
import { confirmDialog, Empty, Icon, Sheet, useAction } from '../ui';
import { toast } from '../lib/bus';
import { clamp, DAYPART_LABEL, pick, sleep, timeHM } from '../lib/util';
import type { OwnedDevice, OwnedFurniture, RoomId } from '../db/types';

// ───────── scene constants ─────────
const WINDOW: Record<RoomId, { x: number; y: number }> = { bedroom: { x: 54, y: 66 }, study: { x: 76, y: 62 } };
const BALCONY_DOOR: Record<RoomId, { x: number } | null> = { bedroom: null, study: { x: 18 } };
const ENTRY_DOOR: Record<RoomId, { x: number } | null> = { bedroom: { x: 176 }, study: null };
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

function roomBg(room: RoomId) {
  return sprite(`roombg|${room}`, ROOM_W, ROOM_H, (p) => {
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

interface Actor { x: number; y: number; pose: Pose; view: View; flip: boolean; expr: Expression; z?: number; dur: number; lying?: boolean; hidden?: boolean }
interface Bubble { id: number; who: '99' | 'chen'; text: string }

// persists across navigation within the session
let mem99: { room: RoomId; x: number; y: number } = { room: 'bedroom', x: 96, y: 206 };
let pendingArrival = false;
export function markArrival() { pendingArrival = true; }

export default function RoomPage({ initial }: { initial?: RoomId }) {
  const [room, setRoom] = useState<RoomId>(initial ?? mem99.room);
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
  const [lampOff, setLampOff] = useState<Record<string, boolean>>({});
  const [projectorOn, setProjectorOn] = useState(false);
  const [picker, setPicker] = useState<null | 'meal' | 'read' | 'gift' | 'diary'>(null);
  const [lastMoment, setLastMoment] = useState<{ title: string; content: string } | null>(null);
  const busy = useRef(false);
  const walkTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { run } = useAction();
  const sceneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { if (initial) setRoom(initial); }, [initial]);
  useEffect(() => { mem99 = { room, x: me.x, y: me.y }; }, [room, me.x, me.y]);
  useEffect(() => () => { if (walkTimer.current) clearInterval(walkTimer.current); }, []);

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
    setA((a) => ({ ...a, lying: false, x: tx, y: ty, dur, pose: 'walk1', view: 'side', flip, z: undefined }));
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
    if (y > FLOOR_Y + 8) guard(async () => { await walkMe(x, y); setMe((a) => ({ ...a, view: 'front', flip: false })); });
  }

  const def = (f: OwnedFurniture) => furnById.get(f.defId)!;
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
        if (me.lying) { setMe((a) => ({ ...a, lying: false, pose: 'stand', view: 'front', y: f.y + 8, expr: 'smile', z: undefined })); say('99', '睡飽了！'); return; }
        await approach();
        setMe((a) => ({ ...a, x: f.x + 6, y: f.y - 12, lying: true, pose: 'stand', view: 'front', expr: 'closed', z: f.y + 1 }));
      }); break;
      case 'fridge': await guard(async () => { await approach(); setMe((a) => ({ ...a, pose: 'takeFood', view: 'front' })); setOpenFridge(f.id); await sleep(650); navigate('/fridge'); }); break;
      case 'wardrobe': await guard(async () => { await approach(); setMe((a) => ({ ...a, view: 'back' })); await sleep(400); navigate('/wardrobe'); }); break;
      case 'shelf': setSelected(f); break;
      case 'lamp': setLampOff((s) => ({ ...s, [f.id]: !(s[f.id] ?? !night) })); break;
      case 'projector': setProjectorOn((v) => !v); break;
      case 'plantShelf': navigate('/balcony'); break;
      default: setSelected(f);
    }
  }
  const [openFridge, setOpenFridge] = useState<string | null>(null);

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
      if (room !== 'bedroom' && room !== 'study') return;
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
    chat: () => guard(async () => { standUp(); await meet(12); const l = line(VISIT_LINES.chat); await sleep(1600); say('99', pick(['嗯嗯！', '真的嗎～', '哈哈哈', '我也這麼覺得'])); await logInteraction('chat', l.text); }),
    hug: () => guard(async () => {
      standUp(); const { mx, my } = await meet(6);
      setMe((a) => ({ ...a, pose: 'hug', expr: 'shy' })); setChen((c) => ({ ...c, pose: 'hug', expr: 'happy', z: my - 0.5 }));
      burst(mx, my - 52); line(VISIT_LINES.hug); await logInteraction('hug');
      await sleep(2600); setMe((a) => ({ ...a, pose: 'stand', expr: 'happy' })); setChen((c) => ({ ...c, pose: 'stand', z: undefined }));
      setLastMoment({ title: '抱抱', content: '在房間裡抱了一下，電量充滿。' });
    }),
    kiss: () => guard(async () => {
      standUp(); const { mx, my } = await meet(7);
      setMe((a) => ({ ...a, pose: 'kiss', expr: 'closed' })); setChen((c) => ({ ...c, pose: 'kiss', expr: 'closed' }));
      burst(mx, my - 50, '💗', 4); await sleep(500); line(VISIT_LINES.kiss); await logInteraction('kiss');
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
        style={{ left: pct(a.x, ROOM_W), top: pct(a.y, ROOM_H), width: pct((CHAR_W + 2) * scale, ROOM_W), zIndex: Math.round((a.z ?? a.y) * 10) + (who === '99' ? 1 : 0), transitionDuration: `${a.dur}s`, transform: a.lying ? 'translate(-50%,-60%) rotate(-90deg)' : undefined }}>
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
        <button onClick={() => navigate('/balcony')}>🌿 陽台</button>
        <button onClick={() => navigate('/phone')}>📱 手機</button>
      </div>
      <div className="scene-wrap">
        <div className="scene" ref={sceneRef} onClick={(e) => onSceneClick(e)} data-testid="room-scene" data-room={room}>
          <img className="layer px" src={roomBg(room)} alt="" style={{ width: '100%', height: '100%' }} />
          {/* window with real-time sky */}
          <img className="obj px" src={windowURL(part)} alt={`窗外：${DAYPART_LABEL[part]}`} style={objStyle(WINDOW[room].x, WINDOW[room].y, 52, 2)} onClick={(e) => { e.stopPropagation(); toast(`現在是${DAYPART_LABEL[part]} ${timeHM(now)}`, 'info'); }} />
          {BALCONY_DOOR[room] && <img className="obj px" src={doorURL('balcony')} alt="陽台入口" data-testid="balcony-door" style={objStyle(BALCONY_DOOR[room]!.x, FLOOR_Y + 2, 28, 3)} onClick={(e) => { e.stopPropagation(); navigate('/balcony'); }} />}
          {ENTRY_DOOR[room] && <img className="obj px" src={doorURL('entry')} alt="大門" style={objStyle(ENTRY_DOOR[room]!.x, FLOOR_Y + 2, 28, 3)} onClick={(e) => { e.stopPropagation(); if (!visit?.active) toast('想見陳卷毛的話，可以按「邀請陳卷毛」', 'info'); }} />}
          {placed.map((f) => {
            const d = def(f);
            const isShelf = d.category === 'bookshelf';
            const perRow = d.id === 'bookshelf_tall' ? 12 : 9;
            const { url, w } = furnitureURL(d, { on: (d.category === 'lamp' || d.category === 'readingLamp') && lampOn(f), open: openFridge === f.id, books: isShelf ? shelfData : undefined, rows: isShelf ? shelfRows(shelfData.length, perRow, d.id === 'bookshelf_tall' ? 6 : 5) : undefined, now: d.category === 'clock' ? now : undefined });
            const z = d.placement === 'wall' ? 4 : d.category === 'rug' ? 5 : d.placement === 'surface' ? Math.round(f.y * 10) + 400 : Math.round(f.y * 10);
            return (
              <img key={f.id} className={'obj px' + (selected?.id === f.id ? ' selected' : '')} src={url} alt={d.name} data-testid={`furn-${d.category}`} data-defid={d.id}
                style={objStyle(f.x, f.y, w, z)} onClick={(e) => { e.stopPropagation(); if (placing) return onSceneClick(e); interact(f); }} />
            );
          })}
          {placedDev.map((d) => {
            const dd = deviceById.get(d.defId)!;
            const { url, w } = deviceURL(dd, night || dd.deviceType !== 'phone');
            return <img key={d.id} className="obj px" src={url} alt={dd.name} data-testid={`device-${dd.deviceType}`} style={objStyle(d.x, d.y, w, Math.round(d.y * 10) + 500)} onClick={(e) => { e.stopPropagation(); if (placing) return onSceneClick(e); setSelectedDev(d); }} />;
          })}
          {/* lamp glow */}
          {placed.filter((f) => (def(f).category === 'lamp' || def(f).category === 'readingLamp') && lampOn(f)).map((f) => (
            <div key={'g' + f.id} className="glow" style={{ left: pct(f.x - 40, ROOM_W), top: pct(f.y - def(f).h - 30, ROOM_H), width: pct(80, ROOM_W), height: pct(70, ROOM_H), zIndex: 3000 }} />
          ))}
          {projectorOn && nearest('projector') && <div className="screen-glow" style={{ left: pct(110, ROOM_W), top: pct(20, ROOM_H), width: pct(66, ROOM_W), height: pct(44, ROOM_H), zIndex: 6 }} />}
          {actorEl(me, '99')}
          {actorEl(chen, 'chen')}
          {me.lying && <div className="zzz" style={{ left: pct(me.x + 10, ROOM_W), top: pct(me.y - 30, ROOM_H), zIndex: 4000 }}>Zzz</div>}
          {bubbles.map((b) => { const a = b.who === '99' ? me : chen; return <div key={b.id} className="bubble" style={{ left: pct(clamp(a.x, 40, ROOM_W - 40), ROOM_W), top: pct(a.y - 52, ROOM_H) }}>{b.text}</div>; })}
          {hearts.map((h) => <div key={h.id} className="hearts" style={{ left: pct(h.x, ROOM_W), top: pct(h.y, ROOM_H) }}>{h.ch}</div>)}
          <div className="tint" style={{ background: TINT[part], zIndex: 2900 }} />
          <div className="scene-hud">
            <span className="hud-pill">{room === 'bedroom' ? '臥室' : '書房'} · {DAYPART_LABEL[part]} {timeHM(now)}</span>
            {visit?.active && <span className="hud-pill" style={{ background: '#fde9ea' }}>💗 陳卷毛在家</span>}
          </div>
          {placing && <div className="place-hint">點選要放「{placing.name}」的位置 · <button className="btn small" style={{ minHeight: 24, padding: '0 6px' }} onClick={(e) => { e.stopPropagation(); setPlacing(null); }}>取消</button></div>}
        </div>
      </div>

      {visit?.active ? (
        <div>
          <div className="action-bar" data-testid="love-actions">
            <button className="btn" onClick={love.chat}>💬<span>聊天</span></button>
            <button className="btn pink" onClick={love.hug} data-testid="act-hug">🤗<span>抱抱</span></button>
            <button className="btn pink" onClick={love.kiss} data-testid="act-kiss">💋<span>親親</span></button>
            <button className="btn" onClick={love.sit}>🛋<span>一起坐著</span></button>
            <button className="btn" onClick={love.meal} data-testid="act-meal">🍙<span>一起吃飯</span></button>
            <button className="btn" onClick={love.read}>📖<span>一起看書</span></button>
            <button className="btn" onClick={love.movie}>🎬<span>看電影</span></button>
            <button className="btn" onClick={love.diary}>📔<span>分享日記</span></button>
            <button className="btn" onClick={love.gift}>🎁<span>送小禮物</span></button>
            <button className="btn" onClick={() => navigate('/love')}>📱<span>傳訊息</span></button>
            <button className="btn" onClick={() => setStorage(true)}>📦<span>收納箱</span></button>
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
          <button className="btn" onClick={() => navigate('/shop')}><Icon name="gift" /><span>商店</span></button>
          <button className="btn" onClick={() => navigate('/bookshelf')}><Icon name="shelf" /><span>書架</span></button>
        </div>
      )}
      <p className="muted center small" style={{ padding: '0 12px' }}>點地板走路、點家具互動；家具可以移動、收納、更換。</p>

      {/* furniture menu */}
      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected ? def(selected).name : ''}>
        {selected && <FurnitureMenu f={selected} d={def(selected)} owned={furniture} onClose={() => setSelected(null)}
          onMove={() => { setPlacing({ kind: 'furn', id: selected.id, name: def(selected).name }); setSelected(null); }}
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
          </div>
        )}
      </Sheet>
      {/* storage box */}
      <Sheet open={storage} onClose={() => setStorage(false)} title="收納箱">
        {stored.length + storedDev.length === 0 ? <Empty icon="gift">收納箱是空的。在商店買的家具會先放在這裡。</Empty> : (
          <div className="shop-grid">
            {stored.map((f) => { const d = def(f); const { url } = furnitureURL(d, { books: d.category === 'bookshelf' ? shelfData : undefined, now }); return (
              <div key={f.id} className="shop-item">
                <div className="thumb"><img src={url} alt="" /></div>
                <div className="name">{d.name}</div><div className="muted">{FURN_CAT_LABEL[d.category]}</div>
                <button className="btn small primary" onClick={() => { setStorage(false); setPlacing({ kind: 'furn', id: f.id, name: d.name }); }} data-testid="place-item">擺到{room === 'bedroom' ? '臥室' : '書房'}</button>
              </div>
            ); })}
            {storedDev.map((d) => { const dd = deviceById.get(d.defId)!; return (
              <div key={d.id} className="shop-item">
                <div className="thumb"><img src={deviceURL(dd, true).url} alt="" /></div>
                <div className="name">{dd.name}</div>
                <button className="btn small primary" onClick={() => { setStorage(false); setPlacing({ kind: 'dev', id: d.id, name: dd.name }); }}>擺到{room === 'bedroom' ? '臥室' : '書房'}</button>
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

function FurnitureMenu({ f, d, owned, onClose, onMove, onUse }: { f: OwnedFurniture; d: FurnitureDef; owned: OwnedFurniture[]; onClose: () => void; onMove: () => void; onUse: () => void }) {
  const { run } = useAction();
  const alts = owned.filter((o) => !o.roomId && furnById.get(o.defId)?.category === d.category);
  const useLabel: Partial<Record<FurnitureDef['interaction'], string>> = { shelf: '看動態書架', clock: '', deco: '', desk: '', table: '' };
  const label = useLabel[d.interaction] ?? '互動';
  return (
    <div className="stack">
      {d.category === 'clock' && <p style={{ fontSize: 28, fontWeight: 800, margin: 0, textAlign: 'center' }}>{timeHM()}</p>}
      {d.category === 'desk' && <p className="muted" style={{ margin: 0 }}>書桌上可以放電腦、平板和桌燈。點電腦就能使用。</p>}
      {label && <button className="btn primary" onClick={onUse}>{label}</button>}
      <div className="grid2">
        <button className="btn" onClick={onMove}>移動</button>
        <button className="btn" onClick={async () => { if (await confirmDialog(`把「${d.name}」收進收納箱？`)) { onClose(); run(() => storeFurniture(f.id), '已收進收納箱'); } }}>收納</button>
      </div>
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
