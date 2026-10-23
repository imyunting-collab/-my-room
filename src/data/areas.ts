// 閱讀地圖：依書的分類解鎖新區域，房間會慢慢「長大」。
import type { AreaId } from '../db/types';

export interface AreaDef {
  id: AreaId; name: string; emoji: string; cats: string[]; desc: string;
  /** furniture placed when it unlocks */
  props: { defId: string; x: number; y: number; flip?: boolean }[];
  window: boolean;
}
export const AREA_PAGES = 100; // read this many pages in the category, or finish one book
export const AREAS: AreaDef[] = [
  { id: 'rooftop', name: '星空屋頂', emoji: '🌌', cats: ['詩集'], desc: '讀詩集解鎖。屋頂上隨時都看得到星星。', window: false,
    props: [{ defId: 'telescope', x: 150, y: 196 }, { defId: 'garden_bench', x: 70, y: 206 }, { defId: 'poem_board', x: 40, y: 150 }, { defId: 'string_lights', x: 118, y: 150 }] },
  { id: 'lab', name: '小實驗室', emoji: '🧪', cats: ['科普'], desc: '讀科普解鎖。顯微鏡、燒杯、地球儀都可以玩。', window: true,
    props: [{ defId: 'microscope', x: 50, y: 150 }, { defId: 'chem_set', x: 100, y: 150 }, { defId: 'globe', x: 152, y: 156 }] },
  { id: 'studio', name: '藝術工作室', emoji: '🎨', cats: ['藝術設計'], desc: '讀藝術設計解鎖。有畫架和版畫壓印機。', window: true,
    props: [{ defId: 'easel', x: 56, y: 170 }, { defId: 'print_press', x: 140, y: 160 }] },
  { id: 'greenhouse', name: '溫室花園', emoji: '🌷', cats: ['生活風格', '散文'], desc: '讀生活風格或散文解鎖。花花草草都可以照顧。', window: false,
    props: [{ defId: 'pot_tulip', x: 40, y: 170 }, { defId: 'pot_sunflower', x: 70, y: 176 }, { defId: 'herb_pot', x: 150, y: 150 }, { defId: 'watering_can', x: 110, y: 210 }, { defId: 'swing_chair', x: 156, y: 210 }] },
  { id: 'attic', name: '歷史閣樓', emoji: '🗝️', cats: ['歷史'], desc: '讀歷史解鎖。舊皮箱裡藏著小故事。', window: true,
    props: [{ defId: 'old_trunk', x: 60, y: 200 }, { defId: 'globe', x: 140, y: 160 }, { defId: 'recordplayer_wood', x: 166, y: 200 }] },
  { id: 'nook', name: '書店咖啡角', emoji: '☕', cats: ['文學小說'], desc: '讀文學小說解鎖。可以泡咖啡、窩著讀小說。', window: true,
    props: [{ defId: 'coffee_machine', x: 44, y: 150 }, { defId: 'beanbag', x: 120, y: 206 }, { defId: 'lamp_star', x: 160, y: 190 }] },
];
export const areaById = new Map(AREAS.map((a) => [a.id, a]));
