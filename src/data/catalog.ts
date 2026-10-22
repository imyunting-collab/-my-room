// Static game content (商品定義). Owned items are stored in IndexedDB and reference these ids.
import type { CharacterId, RoomId, Slot } from '../db/types';

export type FurnStyle = 'wood' | 'cream' | 'cafe' | 'forest' | 'candy' | 'dark';
export const STYLE_LABEL: Record<FurnStyle, string> = {
  wood: '日系木質', cream: '奶油色簡約', cafe: '復古咖啡館', forest: '森林植物系', candy: '彩色可愛系', dark: '深色復古系',
};

export type FurnCategory =
  | 'desk' | 'chair' | 'bed' | 'clock' | 'bookshelf' | 'fridge' | 'wardrobe' | 'lamp' | 'rug' | 'curtain'
  | 'plantShelf' | 'deco' | 'sofa' | 'table' | 'projector' | 'photoWall' | 'mug' | 'pillow' | 'readingLamp' | 'cabinet' | 'recordPlayer';
export const FURN_CAT_LABEL: Record<FurnCategory, string> = {
  desk: '書桌', chair: '椅子', bed: '床', clock: '時鐘', bookshelf: '書櫃', fridge: '冰箱', wardrobe: '衣櫃', lamp: '桌燈',
  rug: '地毯', curtain: '窗簾', plantShelf: '植物架', deco: '裝飾品', sofa: '沙發', table: '餐桌', projector: '投影機',
  photoWall: '照片牆', mug: '馬克杯', pillow: '抱枕', readingLamp: '閱讀燈', cabinet: '櫃子', recordPlayer: '唱片機',
};

export type Unlock =
  | { kind: 'achievement'; id: string }
  | { kind: 'books'; n: number }
  | { kind: 'pages'; n: number };

export interface FurnitureDef {
  id: string;
  name: string;
  category: FurnCategory;
  style: FurnStyle;
  price: number;
  placement: 'floor' | 'wall' | 'surface';
  w: number; // sprite logical size
  h: number;
  interaction: 'sit' | 'sleep' | 'shelf' | 'fridge' | 'wardrobe' | 'lamp' | 'clock' | 'desk' | 'deco' | 'sofa' | 'table' | 'projector' | 'plantShelf' | 'music';
  love?: boolean;
  unlock?: Unlock;
  starter?: { room: RoomId; x: number; y: number };
  desc?: string;
}

const F = (d: FurnitureDef) => d;
export const FURNITURE: FurnitureDef[] = [
  // ── starter set (free, owned from the beginning) ──
  F({ id: 'desk_wood', name: '原木書桌', category: 'desk', style: 'wood', price: 0, placement: 'floor', w: 48, h: 30, interaction: 'desk', starter: { room: 'study', x: 70, y: 150 } }),
  F({ id: 'chair_wood', name: '原木椅子', category: 'chair', style: 'wood', price: 0, placement: 'floor', w: 18, h: 28, interaction: 'sit', starter: { room: 'study', x: 70, y: 168 } }),
  F({ id: 'bookshelf_wood', name: '原木書櫃', category: 'bookshelf', style: 'wood', price: 0, placement: 'floor', w: 44, h: 64, interaction: 'shelf', starter: { room: 'study', x: 150, y: 150 } }),
  F({ id: 'lamp_wood', name: '木質桌燈', category: 'lamp', style: 'wood', price: 0, placement: 'surface', w: 12, h: 18, interaction: 'lamp', starter: { room: 'study', x: 56, y: 122 } }),
  F({ id: 'clock_retro', name: '復古掛鐘', category: 'clock', style: 'wood', price: 0, placement: 'wall', w: 18, h: 18, interaction: 'clock', starter: { room: 'study', x: 160, y: 40 } }),
  F({ id: 'bed_wood', name: '原木單人床', category: 'bed', style: 'wood', price: 0, placement: 'floor', w: 64, h: 36, interaction: 'sleep', starter: { room: 'bedroom', x: 48, y: 170 } }),
  F({ id: 'wardrobe_wood', name: '原木衣櫃', category: 'wardrobe', style: 'wood', price: 0, placement: 'floor', w: 36, h: 60, interaction: 'wardrobe', starter: { room: 'bedroom', x: 106, y: 134 } }),
  F({ id: 'fridge_cream', name: '奶油小冰箱', category: 'fridge', style: 'cream', price: 0, placement: 'floor', w: 26, h: 46, interaction: 'fridge', starter: { room: 'bedroom', x: 144, y: 136 } }),
  F({ id: 'rug_cream', name: '圓形編織地毯', category: 'rug', style: 'cream', price: 0, placement: 'floor', w: 60, h: 16, interaction: 'deco', starter: { room: 'bedroom', x: 112, y: 205 } }),
  F({ id: 'curtain_cream', name: '奶油色窗簾', category: 'curtain', style: 'cream', price: 0, placement: 'wall', w: 56, h: 52, interaction: 'deco', starter: { room: 'bedroom', x: 54, y: 72 } }),

  // ── shop: furniture ──
  F({ id: 'desk_cream', name: '奶油白書桌', category: 'desk', style: 'cream', price: 80, placement: 'floor', w: 48, h: 30, interaction: 'desk' }),
  F({ id: 'desk_dark', name: '胡桃木復古書桌', category: 'desk', style: 'dark', price: 110, placement: 'floor', w: 48, h: 30, interaction: 'desk', unlock: { kind: 'achievement', id: 'hours10' } }),
  F({ id: 'chair_cafe', name: '咖啡館曲木椅', category: 'chair', style: 'cafe', price: 45, placement: 'floor', w: 18, h: 28, interaction: 'sit' }),
  F({ id: 'chair_candy', name: '粉彩圓凳', category: 'chair', style: 'candy', price: 40, placement: 'floor', w: 18, h: 28, interaction: 'sit' }),
  F({ id: 'chair_forest', name: '藤編扶手椅', category: 'chair', style: 'forest', price: 60, placement: 'floor', w: 18, h: 28, interaction: 'sit' }),
  F({ id: 'bed_cream', name: '奶油雲朵床', category: 'bed', style: 'cream', price: 120, placement: 'floor', w: 64, h: 36, interaction: 'sleep' }),
  F({ id: 'bed_forest', name: '森林綠格紋床', category: 'bed', style: 'forest', price: 130, placement: 'floor', w: 64, h: 36, interaction: 'sleep' }),
  F({ id: 'bookshelf_tall', name: '大型落地書櫃', category: 'bookshelf', style: 'wood', price: 150, placement: 'floor', w: 56, h: 80, interaction: 'shelf', unlock: { kind: 'books', n: 10 }, desc: '藏書滿 10 本解鎖，可放更多書。' }),
  F({ id: 'bookshelf_dark', name: '深色復古書櫃', category: 'bookshelf', style: 'dark', price: 120, placement: 'floor', w: 44, h: 64, interaction: 'shelf', unlock: { kind: 'achievement', id: 'finish5' } }),
  F({ id: 'lamp_cafe', name: '黃銅咖啡館檯燈', category: 'lamp', style: 'cafe', price: 50, placement: 'surface', w: 12, h: 18, interaction: 'lamp', unlock: { kind: 'achievement', id: 'streak7' } }),
  F({ id: 'lamp_candy', name: '蘑菇小夜燈', category: 'lamp', style: 'candy', price: 45, placement: 'surface', w: 12, h: 18, interaction: 'lamp' }),
  F({ id: 'clock_digital', name: '像素數位鐘', category: 'clock', style: 'dark', price: 35, placement: 'wall', w: 22, h: 12, interaction: 'clock' }),
  F({ id: 'clock_wood', name: '原木圓鐘', category: 'clock', style: 'wood', price: 30, placement: 'wall', w: 18, h: 18, interaction: 'clock' }),
  F({ id: 'clock_cat', name: '貓咪擺尾鐘', category: 'clock', style: 'candy', price: 55, placement: 'wall', w: 16, h: 24, interaction: 'clock' }),
  F({ id: 'rug_forest', name: '葉子地毯', category: 'rug', style: 'forest', price: 40, placement: 'floor', w: 60, h: 16, interaction: 'deco' }),
  F({ id: 'rug_candy', name: '彩虹格子地毯', category: 'rug', style: 'candy', price: 45, placement: 'floor', w: 60, h: 16, interaction: 'deco' }),
  F({ id: 'curtain_forest', name: '森林綠窗簾', category: 'curtain', style: 'forest', price: 35, placement: 'wall', w: 56, h: 52, interaction: 'deco' }),
  F({ id: 'curtain_dark', name: '酒紅絨布窗簾', category: 'curtain', style: 'dark', price: 40, placement: 'wall', w: 56, h: 52, interaction: 'deco' }),
  F({ id: 'plantshelf_wood', name: '木頭植物架', category: 'plantShelf', style: 'forest', price: 60, placement: 'floor', w: 30, h: 40, interaction: 'plantShelf', unlock: { kind: 'achievement', id: 'plant1' } }),
  F({ id: 'deco_poster', name: '電影海報（原創）', category: 'deco', style: 'cafe', price: 25, placement: 'wall', w: 22, h: 30, interaction: 'deco' }),
  F({ id: 'deco_garland', name: '星星燈串', category: 'deco', style: 'candy', price: 30, placement: 'wall', w: 60, h: 10, interaction: 'deco' }),
  F({ id: 'deco_wallshelf', name: '牆上小層板', category: 'deco', style: 'wood', price: 28, placement: 'wall', w: 34, h: 14, interaction: 'deco' }),
  F({ id: 'deco_monstera', name: '大型龜背芋盆栽', category: 'deco', style: 'forest', price: 50, placement: 'floor', w: 22, h: 36, interaction: 'deco' }),
  F({ id: 'recordplayer_wood', name: '復古黑膠唱片機', category: 'recordPlayer', style: 'wood', price: 90, placement: 'floor', w: 28, h: 36, interaction: 'music', desc: '點一下就會放音樂，唱片會轉、音符會飄出來。' }),
  F({ id: 'cabinet_wood', name: '原木矮櫃', category: 'cabinet', style: 'wood', price: 55, placement: 'floor', w: 40, h: 26, interaction: 'deco' }),
  F({ id: 'cabinet_drawer', name: '原木抽屜櫃', category: 'cabinet', style: 'wood', price: 65, placement: 'floor', w: 30, h: 42, interaction: 'deco' }),
  F({ id: 'cabinet_cream', name: '奶油白矮櫃', category: 'cabinet', style: 'cream', price: 55, placement: 'floor', w: 40, h: 26, interaction: 'deco' }),
  F({ id: 'deco_record', name: '黑膠唱盤', category: 'deco', style: 'dark', price: 70, placement: 'surface', w: 18, h: 10, interaction: 'deco', unlock: { kind: 'achievement', id: 'pages2000' } }),

  // ── love furniture ──
  F({ id: 'sofa_love', name: '雙人沙發', category: 'sofa', style: 'cafe', price: 120, placement: 'floor', w: 56, h: 30, interaction: 'sofa', love: true }),
  F({ id: 'table_dining', name: '雙人餐桌', category: 'table', style: 'wood', price: 90, placement: 'floor', w: 44, h: 26, interaction: 'table', love: true }),
  F({ id: 'mug_pair', name: '雙人馬克杯', category: 'mug', style: 'candy', price: 20, placement: 'surface', w: 14, h: 8, interaction: 'deco', love: true }),
  F({ id: 'pillow_couple', name: '情侶抱枕', category: 'pillow', style: 'candy', price: 25, placement: 'floor', w: 22, h: 12, interaction: 'deco', love: true }),
  F({ id: 'projector_mini', name: '小型投影機', category: 'projector', style: 'dark', price: 110, placement: 'floor', w: 16, h: 12, interaction: 'projector', love: true }),
  F({ id: 'photowall', name: '紀念照片牆', category: 'photoWall', style: 'wood', price: 60, placement: 'wall', w: 44, h: 26, interaction: 'deco', love: true }),
  F({ id: 'lamp_pair', name: '雙人閱讀燈', category: 'readingLamp', style: 'cream', price: 70, placement: 'floor', w: 14, h: 44, interaction: 'lamp', love: true, unlock: { kind: 'achievement', id: 'readTogether1' } }),
];

export type DeviceType = 'computer' | 'tablet' | 'phone';
export interface DeviceDef {
  id: string;
  name: string;
  deviceType: DeviceType;
  assetPath: string; // sprite key
  price: number;
  interactionType: 'desktop' | 'tablet' | 'phone';
  skin?: { body: string; screen: string; accent: string };
  starter?: { room: RoomId; x: number; y: number };
  placement: 'surface' | 'none';
}
export const DEVICES: DeviceDef[] = [
  { id: 'phone_basic', name: '奶茶色手機', deviceType: 'phone', assetPath: 'phone', price: 0, interactionType: 'phone', skin: { body: '#c9a789', screen: '#f6f0e5', accent: '#795b43' }, starter: { room: 'bedroom', x: 74, y: 152 }, placement: 'surface' },
  { id: 'computer_retro', name: '復古桌上型電腦', deviceType: 'computer', assetPath: 'computer', price: 120, interactionType: 'desktop', placement: 'surface' },
  { id: 'tablet_cream', name: '奶油白平板', deviceType: 'tablet', assetPath: 'tablet', price: 90, interactionType: 'tablet', placement: 'surface' },
  { id: 'phone_retro', name: '復古掀蓋風手機殼', deviceType: 'phone', assetPath: 'phone', price: 40, interactionType: 'phone', skin: { body: '#6d8765', screen: '#e9f0d6', accent: '#354b3b' }, placement: 'none' },
  { id: 'phone_clear', name: '透明手機殼', deviceType: 'phone', assetPath: 'phone', price: 50, interactionType: 'phone', skin: { body: '#cfe3ea', screen: '#ffffff', accent: '#7aa3b3' }, placement: 'none' },
  { id: 'phone_pink', name: '復古粉手機殼', deviceType: 'phone', assetPath: 'phone', price: 50, interactionType: 'phone', skin: { body: '#e8b8b2', screen: '#fff4f1', accent: '#b56f6a' }, placement: 'none' },
  { id: 'phone_minimal', name: '簡約黑手機', deviceType: 'phone', assetPath: 'phone', price: 40, interactionType: 'phone', skin: { body: '#2b2a2c', screen: '#f3f3f0', accent: '#555' }, placement: 'none' },
];

export type ClothStyleTag = '日系復古少女' | '韓系街頭' | '學院文青' | 'Outdoor 戶外' | '寬鬆休閒' | '溫柔針織' | '復古運動' | '季節限定' | '陳卷毛';
export interface ClothingDef {
  id: string;
  name: string;
  character: CharacterId;
  slot: Slot;
  style: string; // renderer style key
  colors: [string, string, string]; // main, shade/line, accent
  price: number;
  tag: ClothStyleTag;
  starter?: boolean;
  unlock?: Unlock;
}
const C = (d: ClothingDef) => d;
export const CLOTHING: ClothingDef[] = [
  // 99 starter look (from her outfit photo)
  C({ id: 'top_sweat_brown', name: '棕色印花大學T', character: '99', slot: 'top', style: 'sweatPrint', colors: ['#6b4433', '#4f3125', '#d9473f'], price: 0, tag: '日系復古少女', starter: true }),
  C({ id: 'neck_lace', name: '奶油色蕾絲領', character: '99', slot: 'neck', style: 'lace', colors: ['#f4ead6', '#d8c8ab', '#ffffff'], price: 0, tag: '日系復古少女', starter: true }),
  C({ id: 'bottom_plaid_brown', name: '棕色格紋寬褲', character: '99', slot: 'bottom', style: 'widePlaid', colors: ['#d8d0c3', '#7c6d60', '#a99a8a'], price: 0, tag: '日系復古少女', starter: true }),
  C({ id: 'shoes_chunky', name: '復古厚底運動鞋', character: '99', slot: 'shoes', style: 'chunky', colors: ['#f2efe8', '#9a9aa0', '#2f2f35'], price: 0, tag: '復古運動', starter: true }),
  C({ id: 'bag_cross_bunny', name: '黑色斜背包＋兔兔吊飾', character: '99', slot: 'bag', style: 'crossbody', colors: ['#2b2527', '#151214', '#f6efe6'], price: 0, tag: '日系復古少女', starter: true }),
  C({ id: 'hairacc_clip', name: '條紋側邊髮夾', character: '99', slot: 'hairAcc', style: 'clip', colors: ['#f3e6d0', '#c9b28d', '#ffffff'], price: 0, tag: '日系復古少女', starter: true }),
  // 99 shop
  C({ id: 'bottom_plaid_blue', name: '藍色格紋寬褲', character: '99', slot: 'bottom', style: 'widePlaid', colors: ['#d7dde3', '#5d7fa6', '#a8b7c7'], price: 40, tag: '日系復古少女' }),
  C({ id: 'bottom_jeans_wide', name: '寬版牛仔褲', character: '99', slot: 'bottom', style: 'wideSolid', colors: ['#7f9cc0', '#5b7698', '#b4c6dc'], price: 45, tag: '寬鬆休閒' }),
  C({ id: 'bottom_cargo', name: '卡其工作褲', character: '99', slot: 'bottom', style: 'cargo', colors: ['#b8a47e', '#8d7a58', '#6e5f45'], price: 50, tag: 'Outdoor 戶外' }),
  C({ id: 'bottom_skirt_pleat', name: '學院百褶裙', character: '99', slot: 'bottom', style: 'skirt', colors: ['#4b5a75', '#36425a', '#f2efe8'], price: 45, tag: '學院文青' }),
  C({ id: 'top_knit_cream', name: '奶油麻花針織衫', character: '99', slot: 'top', style: 'knit', colors: ['#efe3cc', '#d6c4a2', '#c9b28d'], price: 55, tag: '溫柔針織' }),
  C({ id: 'top_tee_white', name: '寬鬆白T', character: '99', slot: 'top', style: 'tee', colors: ['#f7f4ee', '#d9d4ca', '#e8b8b2'], price: 30, tag: '寬鬆休閒' }),
  C({ id: 'top_hoodie_street', name: '灰色街頭帽T', character: '99', slot: 'top', style: 'hoodie', colors: ['#a9a8ab', '#7f7e83', '#2f2f35'], price: 55, tag: '韓系街頭' }),
  C({ id: 'top_shirt_college', name: '學院襯衫背心', character: '99', slot: 'top', style: 'vest', colors: ['#6d5a49', '#4e3f33', '#f4f1ea'], price: 50, tag: '學院文青' }),
  C({ id: 'top_track_retro', name: '復古運動外衣', character: '99', slot: 'top', style: 'track', colors: ['#3f6a54', '#2c4c3c', '#f2efe8'], price: 55, tag: '復古運動' }),
  C({ id: 'top_xmas_knit', name: '聖誕紅毛衣', character: '99', slot: 'top', style: 'knit', colors: ['#b64545', '#8c3333', '#f4ead6'], price: 60, tag: '季節限定', unlock: { kind: 'achievement', id: 'streak30' } }),
  C({ id: 'outer_cardigan', name: '燕麥針織外套', character: '99', slot: 'outer', style: 'cardigan', colors: ['#d9c7a5', '#b9a37d', '#f2e9d6'], price: 60, tag: '溫柔針織' }),
  C({ id: 'outer_tech', name: '墨綠機能外套', character: '99', slot: 'outer', style: 'tech', colors: ['#3e5446', '#2b3b31', '#d99865'], price: 75, tag: 'Outdoor 戶外' }),
  C({ id: 'outer_denim', name: '水洗牛仔外套', character: '99', slot: 'outer', style: 'denim', colors: ['#6f8fb5', '#4d6b8f', '#d7e1ec'], price: 70, tag: '韓系街頭' }),
  C({ id: 'shoes_retro', name: '復古球鞋', character: '99', slot: 'shoes', style: 'retro', colors: ['#f4f1ea', '#c84a3e', '#2f2f35'], price: 40, tag: '復古運動' }),
  C({ id: 'shoes_outdoor', name: '戶外運動鞋', character: '99', slot: 'shoes', style: 'outdoor', colors: ['#7a6a55', '#4b4135', '#d99865'], price: 50, tag: 'Outdoor 戶外' }),
  C({ id: 'shoes_maryjane', name: '瑪莉珍鞋', character: '99', slot: 'shoes', style: 'maryjane', colors: ['#2b2527', '#151214', '#f4f1ea'], price: 45, tag: '日系復古少女' }),
  C({ id: 'shoes_loafer', name: '厚底樂福鞋', character: '99', slot: 'shoes', style: 'loafer', colors: ['#5a3a2a', '#3a2419', '#c9a227'], price: 50, tag: '學院文青' }),
  C({ id: 'shoes_boots', name: '短靴', character: '99', slot: 'shoes', style: 'boots', colors: ['#6b4433', '#4f3125', '#2b2527'], price: 55, tag: '季節限定' }),
  C({ id: 'bag_satchel', name: '復古皮革斜背包', character: '99', slot: 'bag', style: 'satchel', colors: ['#8a5a3b', '#5e3c27', '#d6b36a'], price: 45, tag: '學院文青' }),
  C({ id: 'top_knit_pink', name: '粉色毛衣', character: '99', slot: 'top', style: 'knit', colors: ['#efb7bf', '#d6939d', '#f8d6db'], price: 55, tag: '溫柔針織' }),
  C({ id: 'top_stripe', name: '條紋上衣', character: '99', slot: 'top', style: 'stripe', colors: ['#f4f1ea', '#3d4a66', '#c9b8a0'], price: 40, tag: '寬鬆休閒' }),
  C({ id: 'outer_varsity', name: '學院外套', character: '99', slot: 'outer', style: 'denim', colors: ['#2f3b57', '#1f2840', '#f4f1ea'], price: 70, tag: '學院文青' }),
  C({ id: 'outer_black', name: '黑色短外套', character: '99', slot: 'outer', style: 'zipHoodie', colors: ['#2b2729', '#171516', '#c9c5bd'], price: 65, tag: '韓系街頭' }),
  C({ id: 'bottom_white_wide', name: '白色寬褲', character: '99', slot: 'bottom', style: 'wideSolid', colors: ['#f2ece0', '#d6cdbd', '#ffffff'], price: 40, tag: '溫柔針織' }),
  C({ id: 'bottom_sweat_gray', name: '灰色運動褲', character: '99', slot: 'bottom', style: 'wideSolid', colors: ['#8f8d92', '#6c6a70', '#a9a7ad'], price: 40, tag: '復古運動' }),
  C({ id: 'bag_tote_cream', name: '奶油托特包＋兔兔', character: '99', slot: 'bag', style: 'crossbody', colors: ['#efe3cc', '#c9b28d', '#ffffff'], price: 40, tag: '日系復古少女' }),
  C({ id: 'hairacc_cap', name: '米色棒球帽', character: '99', slot: 'hairAcc', style: 'cap', colors: ['#e6dbc6', '#c6b79a', '#795b43'], price: 30, tag: '韓系街頭' }),
  C({ id: 'hairacc_beret', name: '酒紅貝雷帽', character: '99', slot: 'hairAcc', style: 'beret', colors: ['#8a3a3f', '#65282d', '#a54b51'], price: 35, tag: '學院文青' }),
  C({ id: 'hairacc_ribbon', name: '小蝴蝶結髮夾', character: '99', slot: 'hairAcc', style: 'ribbon', colors: ['#e8b8b2', '#c98d86', '#ffffff'], price: 20, tag: '日系復古少女' }),

  // 陳卷毛 starter (from his reference)
  C({ id: 'chen_top_black', name: '黑色寬鬆上衣', character: 'chen', slot: 'top', style: 'tee', colors: ['#2a2729', '#1a1819', '#3a3639'], price: 0, tag: '陳卷毛', starter: true }),
  C({ id: 'chen_towel', name: '黑白運動毛巾', character: 'chen', slot: 'neck', style: 'towel', colors: ['#f2efe8', '#2a2729', '#c9c5bd'], price: 0, tag: '陳卷毛', starter: true }),
  C({ id: 'chen_pants_gray', name: '灰色寬鬆長褲', character: 'chen', slot: 'bottom', style: 'wideSolid', colors: ['#6b6662', '#4f4b48', '#86817c'], price: 0, tag: '陳卷毛', starter: true }),
  C({ id: 'chen_shoes_bw', name: '黑白運動鞋', character: 'chen', slot: 'shoes', style: 'bwSneaker', colors: ['#f2efe8', '#2a2729', '#b9b5ad'], price: 0, tag: '陳卷毛', starter: true }),
  C({ id: 'chen_backpack', name: '黑色休閒背包', character: 'chen', slot: 'bag', style: 'backpack', colors: ['#2a2729', '#161415', '#444'], price: 0, tag: '陳卷毛', starter: true }),
  C({ id: 'chen_headband', name: '黑色運動髮帶', character: 'chen', slot: 'hairAcc', style: 'headband', colors: ['#1f1d1f', '#0e0d0e', '#3a3a3a'], price: 0, tag: '陳卷毛', starter: true }),
  C({ id: 'chen_watch', name: '智慧手錶', character: 'chen', slot: 'acc', style: 'watch', colors: ['#1a1a1a', '#4d5a3a', '#7e8b6a'], price: 0, tag: '陳卷毛', starter: true }),
  // 陳卷毛 shop
  C({ id: 'chen_outer_hoodie', name: '黑色連帽外套', character: 'chen', slot: 'outer', style: 'zipHoodie', colors: ['#2a2729', '#161415', '#d0ccc4'], price: 55, tag: '陳卷毛' }),
  C({ id: 'chen_top_grayhoodie', name: '灰色帽T', character: 'chen', slot: 'top', style: 'hoodie', colors: ['#a9a8ab', '#7f7e83', '#2f2f35'], price: 50, tag: '陳卷毛' }),
  C({ id: 'chen_top_white', name: '白色印花T', character: 'chen', slot: 'top', style: 'tee', colors: ['#f4f1ea', '#d6d1c7', '#2a2729'], price: 30, tag: '陳卷毛' }),
  C({ id: 'chen_outer_denim', name: '牛仔外套', character: 'chen', slot: 'outer', style: 'denim', colors: ['#5f80a8', '#45638a', '#d7e1ec'], price: 65, tag: '陳卷毛' }),
  C({ id: 'chen_top_sweater', name: '咖啡色毛衣', character: 'chen', slot: 'top', style: 'knit', colors: ['#5a4136', '#3f2d25', '#8a6a58'], price: 55, tag: '陳卷毛' }),
  C({ id: 'chen_pants_jeans', name: '深色牛仔寬褲', character: 'chen', slot: 'bottom', style: 'wideSolid', colors: ['#3a4a66', '#283449', '#56688a'], price: 45, tag: '陳卷毛' }),
  C({ id: 'chen_pj_top', name: '居家睡衣上衣', character: 'chen', slot: 'top', style: 'tee', colors: ['#2a2729', '#1a1819', '#f2efe8'], price: 25, tag: '陳卷毛' }),
  C({ id: 'chen_pj_pants', name: '藍格紋睡褲', character: 'chen', slot: 'bottom', style: 'widePlaid', colors: ['#dfe5ee', '#3d5a8a', '#9fb0c9'], price: 30, tag: '陳卷毛' }),
];

export const SLOT_LABEL: Record<Slot, string> = {
  top: '上衣', neck: '領飾/毛巾', bottom: '下身', outer: '外套', shoes: '鞋子', bag: '包包', hairAcc: '髮飾/帽子', acc: '配件',
};
export const SLOT_ORDER: Slot[] = ['top', 'bottom', 'outer', 'shoes', 'bag', 'hairAcc', 'neck', 'acc'];

export interface FoodDef { id: string; name: string; price: number; desc: string }
export const FOODS: FoodDef[] = [
  { id: 'milk', name: '鮮奶', price: 8, desc: '冰冰涼涼的一瓶。' },
  { id: 'fruit', name: '水果盒', price: 10, desc: '草莓、橘子和蘋果片。' },
  { id: 'pudding', name: '焦糖布丁', price: 12, desc: '湯匙一挖會晃的那種。' },
  { id: 'onigiri', name: '鮭魚飯糰', price: 10, desc: '海苔脆脆的。' },
  { id: 'bread', name: '奶油麵包', price: 8, desc: '烤一下更香。' },
  { id: 'yogurt', name: '優格', price: 9, desc: '加一點蜂蜜。' },
  { id: 'juice', name: '柳橙汁', price: 9, desc: '早上來一杯。' },
  { id: 'cake', name: '草莓小蛋糕', price: 15, desc: '值得慶祝的日子。' },
];

export interface PlantDef {
  id: string;
  name: string;
  group: '多肉植物' | '觀葉植物' | '花卉';
  price: number;
  waterIntervalH: number;
  stageHours: [number, number, number, number]; // growth hours to reach stage 1..4
  kind: 'rosette' | 'haworthia' | 'jade' | 'monstera' | 'pothos' | 'snake' | 'lily' | 'philo' | 'bird' | 'lavender' | 'daisy' | 'rose';
  unlock?: Unlock;
}
export const PLANTS: PlantDef[] = [
  { id: 'echeveria', name: '石蓮花', group: '多肉植物', price: 25, waterIntervalH: 96, stageHours: [24, 72, 168, 336], kind: 'rosette' },
  { id: 'haworthia', name: '十二之卷', group: '多肉植物', price: 25, waterIntervalH: 96, stageHours: [24, 72, 168, 336], kind: 'haworthia' },
  { id: 'obtusa', name: '玉露', group: '多肉植物', price: 30, waterIntervalH: 96, stageHours: [24, 72, 168, 336], kind: 'jade' },
  { id: 'monstera', name: '龜背芋', group: '觀葉植物', price: 45, waterIntervalH: 48, stageHours: [18, 60, 144, 288], kind: 'monstera' },
  { id: 'pothos', name: '黃金葛', group: '觀葉植物', price: 30, waterIntervalH: 48, stageHours: [12, 48, 120, 240], kind: 'pothos' },
  { id: 'snake', name: '虎尾蘭', group: '觀葉植物', price: 35, waterIntervalH: 120, stageHours: [24, 72, 168, 336], kind: 'snake' },
  { id: 'peacelily', name: '白鶴芋', group: '觀葉植物', price: 40, waterIntervalH: 48, stageHours: [18, 60, 144, 288], kind: 'lily' },
  { id: 'philodendron', name: '蔓綠絨', group: '觀葉植物', price: 40, waterIntervalH: 48, stageHours: [18, 60, 144, 288], kind: 'philo' },
  { id: 'bird', name: '天堂鳥', group: '觀葉植物', price: 60, waterIntervalH: 60, stageHours: [24, 96, 216, 400], kind: 'bird', unlock: { kind: 'achievement', id: 'finish1' } },
  { id: 'lavender', name: '薰衣草', group: '花卉', price: 35, waterIntervalH: 36, stageHours: [12, 48, 120, 240], kind: 'lavender' },
  { id: 'daisy', name: '小雛菊', group: '花卉', price: 25, waterIntervalH: 36, stageHours: [12, 48, 120, 240], kind: 'daisy' },
  { id: 'rose', name: '迷你玫瑰', group: '花卉', price: 45, waterIntervalH: 36, stageHours: [18, 60, 144, 288], kind: 'rose', unlock: { kind: 'achievement', id: 'streak7' } },
];
export const BALCONY_SLOTS = 6;

export interface GiftDef { id: string; name: string; price: number; line: string }
export const GIFTS: GiftDef[] = [
  { id: 'flower', name: '一小束花', price: 15, line: '欸⋯⋯這是給我的？我要把它插在杯子裡。' },
  { id: 'card', name: '手寫小卡', price: 10, line: '妳的字好可愛，我會收在背包最裡面那層。' },
  { id: 'boba', name: '珍珠奶茶', price: 12, line: '半糖少冰，妳記得欸！' },
];

export const furnById = new Map(FURNITURE.map((f) => [f.id, f]));
export const deviceById = new Map(DEVICES.map((d) => [d.id, d]));
export const clothById = new Map(CLOTHING.map((c) => [c.id, c]));
export const foodById = new Map(FOODS.map((f) => [f.id, f]));
export const plantById = new Map(PLANTS.map((p) => [p.id, p]));

export const BOOK_CATEGORIES = ['文學小說', '散文', '詩集', '心理', '商業理財', '藝術設計', '歷史', '科普', '生活風格', '漫畫', '其他'];
export const CATEGORY_COLORS: Record<string, string> = {
  文學小說: '#b5654f', 散文: '#d99865', 詩集: '#e8b8b2', 心理: '#8d7bb0', 商業理財: '#5d7fa6', 藝術設計: '#c9a227',
  歷史: '#7c5a3a', 科普: '#5f9b8e', 生活風格: '#6d8765', 漫畫: '#e07a5f', 其他: '#9a8f86',
};
