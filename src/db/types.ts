// MY ROOM data model. All ids are stable UUIDs (except keyed singleton rows).

export type ReadingStatus = 'want' | 'reading' | 'paused' | 'finished' | 'dropped';
export type Mood = 'happy' | 'calm' | 'moved' | 'tired' | 'sad' | 'excited' | 'thinking' | 'love';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverPhotoId?: string;
  category: string;
  publisher?: string;
  isbn?: string;
  totalPages: number;
  currentPage: number;
  status: ReadingStatus;
  startDate?: string; // YYYY-MM-DD
  finishDate?: string;
  rating?: number; // 0-5
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string;
  minutes: number;
  startPage?: number;
  endPage?: number;
  pages: number;
  mood?: Mood;
  reflection?: string;
  quote?: string;
  photoIds: string[];
  tags: string[];
  createdAt: number;
  updatedAt?: number;
}

export interface Quote {
  id: string;
  bookId?: string;
  sessionId?: string;
  text: string;
  page?: number;
  note?: string;
  tags: string[];
  createdAt: number;
}

export interface Photo {
  id: string;
  blob: Blob;
  type: string;
  createdAt: number;
}

export type DiaryTemplate = 'life' | 'reading' | 'love' | 'mood' | 'free';
export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  date: string;
  mood?: Mood;
  template: DiaryTemplate;
  photoIds: string[];
  tags: string[];
  isFavorite: boolean;
  isDraft: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WalletTransaction {
  id: string;
  amount: number; // + income, - expense
  reason: string;
  rewardKey?: string; // unique for rewards → never paid twice
  refType?: string;
  refId?: string;
  createdAt: number;
}

export interface AchievementRecord {
  id: string; // achievement definition id
  unlockedAt: number;
}

export interface OwnedFurniture {
  id: string;
  defId: string;
  roomId: RoomId | null; // null = stored (收納)
  x: number;
  y: number;
  /** mirrored left↔right */
  flip?: boolean;
  purchasedAt: number;
}

export interface OwnedClothing {
  id: string;
  defId: string;
  purchasedAt: number;
}

export type Slot = 'top' | 'neck' | 'bottom' | 'outer' | 'shoes' | 'bag' | 'hairAcc' | 'acc';
export type Equip = Partial<Record<Slot, string | null>>;

export interface Outfit {
  id: string;
  name: string;
  character: CharacterId;
  equip: Equip;
  createdAt: number;
}

export interface FoodInventory {
  foodId: string;
  quantity: number;
  updatedAt: number;
}

export interface OwnedPlant {
  id: string;
  defId: string;
  slot: number | null; // balcony slot, null = stored
  purchasedAt: number;
  lastWateredAt: number;
  growthMinutes: number;
  lastUpdatedAt: number;
}

export interface OwnedDevice {
  id: string;
  defId: string;
  isPlaced: boolean;
  roomId: RoomId | null;
  x: number;
  y: number;
  flip?: boolean;
  purchasedAt: number;
}

export interface Contact {
  id: string;
  displayName: string;
  avatarAsset: string;
  contactType: 'partner' | 'friend';
}

export interface ChatMessage {
  id: string;
  contactId: string;
  sender: 'me' | 'partner' | 'system';
  content: string;
  timestamp: number;
  emotion?: string;
  interactionType?: string;
  read: boolean;
}

export interface CallRecord {
  id: string;
  contactId: string;
  startedAt: number;
  endedAt: number;
  outcome: 'completed' | 'cancelled';
}

export interface VisitRecord {
  id: string;
  contactId: string;
  arrivedAt: number;
  departedAt?: number;
  interactions: { type: string; at: number; detail?: string }[];
}

export interface SharedMealRecord {
  id: string;
  foodId: string;
  quantity: number;
  date: string;
  partnerId: string;
  createdAt: number;
}

export interface ReadTogetherRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  date: string;
  partnerId: string;
  note?: string;
  createdAt: number;
}

export interface LoveMemory {
  id: string;
  title: string;
  content: string;
  date: string;
  photoIds: string[];
  sourceType: 'real' | 'game'; // real = user-written memory; game = saved in-game interaction
  createdAt: number;
  updatedAt: number;
}

export interface Anniversary {
  id: string;
  name: string;
  date: string;
  createdAt: number;
}

export interface RelationshipSettings {
  id: 'main';
  partnerDisplayName: string;
  anniversaryDate?: string;
  unlockedInteractions: string[];
  updatedAt: number;
}

export type RoomId = 'bedroom' | 'study';
export interface RoomConfiguration {
  id: RoomId | 'balcony';
  wallpaper: string;
  floor: string;
  updatedAt: number;
}

export interface KV<T = unknown> {
  key: string;
  value: T;
}

export type CharacterId = '99' | 'chen';

export interface Tables {
  books: Book;
  sessions: ReadingSession;
  quotes: Quote;
  photos: Photo;
  wallet: WalletTransaction;
  achievements: AchievementRecord;
  settings: KV;
  meta: KV;
  diary: DiaryEntry;
  ownedFurniture: OwnedFurniture;
  ownedClothing: OwnedClothing;
  outfits: Outfit;
  foodInventory: FoodInventory;
  ownedPlants: OwnedPlant;
  room: RoomConfiguration;
  ownedDevices: OwnedDevice;
  contacts: Contact;
  chat: ChatMessage;
  calls: CallRecord;
  visits: VisitRecord;
  meals: SharedMealRecord;
  readTogether: ReadTogetherRecord;
  loveMemories: LoveMemory;
  anniversaries: Anniversary;
  relationship: RelationshipSettings;
}
export type StoreName = keyof Tables;
