// What happens when you use an interactive piece (咖啡機、熊熊、扭蛋機…). Shared by the rooms and the balcony;
// walking / poses are done by the page, this does the effects, lines and real rewards.
import { furnById, foodById, type ActFx } from '../data/catalog';
import { useFurnitureAct } from '../services/life';
import { gachaLine, logInteraction, loveNote, saveMemory } from '../services/love';
import { checkAchievements } from '../services/reading';
import { sfx } from '../lib/sound';
import { toast } from '../lib/bus';
import { pick, sleep } from '../lib/util';

export interface ActCtx {
  visiting: boolean;
  say: (who: '99' | 'chen', text: string, ms?: number) => void;
  fx: (kind: ActFx, x: number, y: number) => void;
  wiggle: (id: string) => void;
  flash: () => void;
  showNote: (title: string, text: string) => void;
  isOn: (id: string) => boolean;
  setOn: (id: string, on: boolean) => void;
}

export const FX_CHARS: Record<ActFx, string[]> = {
  hearts: ['💗', '💕', '❤️'], notes: ['♪', '♫', '♬'], drops: ['💧'], sparkles: ['✨', '⭐'], bubbles: ['○', '◦', '○'],
  steam: ['☁️'], stars: ['⭐', '🌟', '✨'], flash: ['✨'], zzz: ['z', 'Z', 'z'],
};

/** Runs the effects + rewards of an interactive furniture piece. `top` is where effects appear. */
export async function performAct(owned: { id: string; defId: string }, top: { x: number; y: number }, ctx: ActCtx) {
  const d = furnById.get(owned.defId);
  const a = d?.act;
  if (!d || !a) return;

  if (a.toggle) {
    const on = !ctx.isOn(owned.id);
    ctx.setOn(owned.id, on);
    sfx(a.sfx ?? 'switch');
    if (on) { ctx.fx(a.fx ?? 'sparkles', top.x, top.y); ctx.say('99', pick(a.lines)); }
    if (on && ctx.visiting && a.chen) setTimeout(() => ctx.say('chen', pick(a.chen!)), 900);
    return;
  }

  if (a.wiggle) ctx.wiggle(owned.id);
  sfx(a.sfx);
  if (a.fx === 'flash') ctx.flash();
  ctx.fx(a.fx ?? 'sparkles', top.x, top.y);
  ctx.say('99', pick(a.lines));
  if (ctx.visiting && a.chen) setTimeout(() => ctx.say('chen', pick(a.chen!)), 1000);

  // real rewards
  if (a.coin || a.food || a.waterAll) {
    try {
      const r = await useFurnitureAct(d.id);
      if (r.coins) toast(`${d.name}・${a.verb} +${r.coins} 知識幣`, 'coin');
      if (r.food) toast(`${foodById.get(r.food)?.name ?? '食物'}放進冰箱了 🧊`, 'success');
      if (r.capped === 'coin') toast(`今天的${a.verb}獎勵領完囉（每天 ${a.coinPerDay} 次），明天再來～`, 'info');
      if (r.capped === 'food') toast(`今天已經做過${a.foodPerDay === 1 ? '' : ` ${a.foodPerDay} 次`}了，明天再做～`, 'info');
      if (a.waterAll) toast(r.watered ? `幫 ${r.watered} 盆植物澆了水 💧` : '大家的土都還很濕，晚點再澆～', r.watered ? 'success' : 'info');
    } catch (e) { toast((e as Error).message, 'error'); }
  }
  if (a.memory) {
    await saveMemory({ title: '拍立得', content: ctx.visiting ? '和陳卷毛擠在一起拍了一張拍立得。' : '用拍立得拍了一張今天的房間。', sourceType: 'game' });
    toast('📸 照片收進戀愛日記了', 'love');
  }
  if (a.note) { await sleep(500); ctx.showNote('💌 陳卷毛的小紙條', loveNote()); }
  if (a.gacha) { await sleep(700); const l = gachaLine(); ctx.showNote('🎰 扭蛋結果', l.text); }

  // using a love item (or anything he joins in on) while he's here is a love interaction
  if (ctx.visiting && (d.love || a.chen)) {
    try { await logInteraction('furniture', d.name); for (const x of await checkAchievements()) toast(`🏆 解鎖成就「${x.name}」+${x.reward}`, 'coin'); } catch { /* not visiting anymore */ }
  }
}
