// 陳卷毛的遊戲內台詞（虛構角色台詞，不代表真實人物的訊息）。
// 結構可持續擴充：新增 topic 或在 replies 裡加更多變化即可。
import type { Expression } from '../sprites/characters';

export interface Line { text: string; emotion: Expression; action?: 'invite' | 'meal' | 'read' }
export interface ChatTopic { id: string; prompt: string; replies: Line[][]; /** replies that depend on today's mood (0 低落 … 4 超開心) */ byMood?: Partial<Record<MoodLevel, Line[][]>> }
export type MoodLevel = 0 | 1 | 2 | 3 | 4;

export const CHAT_TOPICS: ChatTopic[] = [
  {
    id: 'doing', prompt: '今天在做什麼？',
    replies: [
      [{ text: '剛打完球，毛巾還掛在脖子上 😂', emotion: 'happy' }, { text: '妳呢？今天有沒有好好吃飯？', emotion: 'smile' }],
      [{ text: '在研究一個很重要的問題：', emotion: 'think' }, { text: '晚餐要吃滷肉飯還是雞肉飯。', emotion: 'think' }, { text: '已經研究四十分鐘了。', emotion: 'normal' }],
      [{ text: '在工作，螢幕看到眼睛變成方形的 🟦', emotion: 'normal' }, { text: '想到等等可以跟妳聊天就有精神了。', emotion: 'smile' }],
      [{ text: '在整理房間，結果翻到以前的照片就整理不下去了。', emotion: 'shy' }],
    ],
  },
  {
    id: 'miss', prompt: '我想你了。',
    replies: [
      [{ text: '⋯⋯', emotion: 'shy' }, { text: '我也是啦。很想。', emotion: 'shy' }],
      [{ text: '那我現在馬上用想念的速度移動過去。', emotion: 'happy' }, { text: '（大概跟走路一樣快）', emotion: 'smile' }],
      [{ text: '我剛剛也在想妳欸，這算不算心電感應？', emotion: 'surprised' }, { text: '要不要我直接過去找妳？', emotion: 'smile', action: 'invite' }],
    ],
  },
  {
    id: 'come', prompt: '要不要來我家？',
    replies: [
      [{ text: '要！我帶飲料過去？', emotion: 'happy' }, { text: '妳按一下「邀請陳卷毛來家裡」，我就出發。', emotion: 'smile', action: 'invite' }],
      [{ text: '等我三分鐘，我找一下另一隻襪子。', emotion: 'think' }, { text: '好了，隨時可以出發！', emotion: 'happy', action: 'invite' }],
    ],
  },
  {
    id: 'meal', prompt: '今天一起吃飯嗎？',
    replies: [
      [{ text: '好啊！妳冰箱裡還有什麼？', emotion: 'happy' }, { text: '我過去一起吃，順便幫妳洗碗。', emotion: 'smile', action: 'meal' }],
      [{ text: '我今天的胃已經幫妳留好位置了。', emotion: 'happy' }, { text: '來妳家吃吧？', emotion: 'smile', action: 'meal' }],
      [{ text: '吃什麼都好，跟妳吃就很好吃。', emotion: 'shy' }, { text: '⋯⋯這句太油了我收回。但我真的要吃。', emotion: 'smile', action: 'meal' }],
    ],
  },
  {
    id: 'readshare', prompt: '分享今天的閱讀心得',
    replies: [
      [{ text: '妳每次講書的時候眼睛都會發亮欸。', emotion: 'smile' }, { text: '那本書最喜歡哪一句？下次唸給我聽。', emotion: 'think' }],
      [{ text: '哇，妳讀書的速度比我打字還快。', emotion: 'surprised' }, { text: '要不要一起看書？我也帶一本過去。', emotion: 'smile', action: 'read' }],
      [{ text: '我認真聽完了！（真的有）', emotion: 'happy' }, { text: '妳寫的心得比書還好看。', emotion: 'smile' }],
    ],
  },
  {
    id: 'share', prompt: '分享今天發生的事情',
    replies: [
      [{ text: '然後呢然後呢？', emotion: 'surprised' }, { text: '我想聽完整版，從早餐開始講。', emotion: 'smile' }],
      [{ text: '辛苦了，給妳一個隔空的抱抱。', emotion: 'smile' }, { text: '（張開雙手中）', emotion: 'happy' }],
      [{ text: '聽起來今天是很有收穫的一天欸。', emotion: 'think' }, { text: '我也要努力一點，不然會被妳比下去。', emotion: 'happy' }],
    ],
  },
  {
    id: 'readtogether', prompt: '一起看書嗎？',
    replies: [
      [{ text: '好！我會很安靜地坐在旁邊。', emotion: 'smile' }, { text: '⋯⋯大概十分鐘後會偷看妳。', emotion: 'shy', action: 'read' }],
    ],
  },
  {
    id: 'tired', prompt: '我今天好累…',
    replies: [
      [{ text: '辛苦了，今天先什麼都不要想。', emotion: 'sad' }, { text: '去洗個熱水澡，然後早點躺平好不好？', emotion: 'smile' }],
      [{ text: '過來，借妳靠一下。', emotion: 'smile' }, { text: '（拍拍肩膀）這裡是專屬位置。', emotion: 'shy' }],
      [{ text: '累的時候不用逞強喔。', emotion: 'sad' }, { text: '我等等過去幫妳煮點東西吃？', emotion: 'smile', action: 'meal' }],
    ],
  },
  {
    id: 'happy', prompt: '我今天超開心！',
    replies: [
      [{ text: '真的嗎！快說快說！', emotion: 'surprised' }, { text: '妳開心我就跟著開心了 😆', emotion: 'happy' }],
      [{ text: '我隔著螢幕都感受到了。', emotion: 'happy' }, { text: '今天要不要慶祝一下？', emotion: 'smile', action: 'invite' }],
    ],
  },
  {
    id: 'morning', prompt: '早安～',
    replies: [
      [{ text: '早安！睡得好嗎？', emotion: 'happy' }, { text: '記得吃早餐，不准只喝咖啡。', emotion: 'smile' }],
      [{ text: '早安，今天也是很可愛的一天。', emotion: 'smile' }, { text: '（我剛醒，頭髮爆炸中）', emotion: 'shy' }],
    ],
  },
  {
    id: 'night', prompt: '晚安～',
    replies: [
      [{ text: '晚安，今天辛苦了。', emotion: 'smile' }, { text: '夢裡見，我會準時出現。', emotion: 'shy' }],
      [{ text: '晚安！手機放下，不要再滑了喔。', emotion: 'smile' }, { text: '…我也要放下了。真的。', emotion: 'think' }],
    ],
  },
  {
    id: 'joke', prompt: '說個笑話給我聽',
    replies: [
      [{ text: '為什麼書總是很冷靜？', emotion: 'think' }, { text: '因為它們有很多「頁」靜。', emotion: 'happy' }, { text: '……好啦我知道很冷。', emotion: 'shy' }],
      [{ text: '我今天打球投了十球。', emotion: 'normal' }, { text: '進了一球。', emotion: 'normal' }, { text: '那一球是在妳的心裡。', emotion: 'happy' }],
      [{ text: '妳知道我的眼鏡為什麼一直起霧嗎？', emotion: 'think' }, { text: '因為看到妳就發熱。', emotion: 'shy' }],
    ],
  },
  {
    id: 'cheer', prompt: '幫我加油一下',
    replies: [
      [{ text: '妳最棒了！真的不是客套話。', emotion: 'happy' }, { text: '做完就獎勵妳一個抱抱。', emotion: 'smile' }],
      [{ text: '加油加油！我在旁邊拿毛巾幫妳搧風。', emotion: 'happy' }, { text: '（揮毛巾中）', emotion: 'happy' }],
      [{ text: '慢慢來沒關係，妳已經很努力了。', emotion: 'smile' }, { text: '我一直都在。', emotion: 'smile' }],
    ],
  },
  {
    id: 'loveme', prompt: '你愛我嗎？',
    replies: [
      [{ text: '這還用問嗎。', emotion: 'shy' }, { text: '……愛。很愛。', emotion: 'shy' }],
      [{ text: '我每天都在用行動回答這題欸。', emotion: 'smile' }, { text: '但再說一次也可以：愛妳。', emotion: 'happy' }],
    ],
  },
  {
    id: 'angry', prompt: '我生氣了 😤',
    replies: [
      [{ text: '欸欸欸怎麼了！', emotion: 'surprised' }, { text: '是我做錯什麼了嗎…先說對不起。', emotion: 'sad' }, { text: '妳說，我在聽。', emotion: 'smile' }],
      [{ text: '誰惹妳？我去跟他講道理。', emotion: 'angry' }, { text: '講完道理再請妳喝奶茶。', emotion: 'smile' }],
    ],
  },
  {
    id: 'sing', prompt: '想聽你唱歌',
    replies: [
      [{ text: '🎵 啦～啦啦～', emotion: 'closed' }, { text: '（破音）', emotion: 'surprised' }, { text: '剛剛那個不算，下次當面唱。', emotion: 'shy' }],
      [{ text: '那我唱一首只有妳聽得到的。', emotion: 'smile' }, { text: '🎵 今天的妳～也很可愛～', emotion: 'happy' }],
    ],
  },
  {
    id: 'aegyo', prompt: '撒嬌一下嘛～',
    replies: [
      [{ text: '好啦好啦，妳最可愛。', emotion: 'shy' }, { text: '要摸頭還是要抱抱？', emotion: 'smile', action: 'invite' }],
      [{ text: '（被可愛到說不出話）', emotion: 'shy' }, { text: '妳等我，我馬上過去。', emotion: 'happy', action: 'invite' }],
    ],
  },
  {
    id: 'howami', prompt: '你覺得我今天怎麼樣？',
    replies: [[{ text: '今天的妳也很好。', emotion: 'smile' }]],
    byMood: {
      0: [[{ text: '我感覺得到，妳今天好像很難過。', emotion: 'sad' }, { text: '不想說也沒關係，我陪妳。', emotion: 'smile' }]],
      1: [[{ text: '今天有點累對吧？', emotion: 'sad' }, { text: '把不開心的事分我一半，就只剩一半了。', emotion: 'smile' }]],
      2: [[{ text: '平平靜靜的一天也很好呀。', emotion: 'smile' }, { text: '要不要一起看書？', emotion: 'smile', action: 'read' }]],
      3: [[{ text: '今天的妳暖暖的，笑容很好看。', emotion: 'happy' }]],
      4: [[{ text: '今天的妳整個人在發光！', emotion: 'happy' }, { text: '我也被傳染開心了 😆', emotion: 'happy' }]],
    },
  },
];

/** 他依照妳的心情溫度回的話（設定心情溫度計時會收到）。 */
export const MOOD_REPLIES: Record<MoodLevel, Line[][]> = {
  0: [
    [{ text: '看到妳的心情溫度好低…', emotion: 'sad' }, { text: '我在喔。想哭就哭，哭完我請妳吃布丁。', emotion: 'smile' }],
    [{ text: '今天辛苦了，抱一個。', emotion: 'sad' }, { text: '不管發生什麼，我都站在妳這邊。', emotion: 'smile' }],
    [{ text: '要不要我過去陪妳？什麼都不用說也可以。', emotion: 'sad', action: 'invite' }],
  ],
  1: [
    [{ text: '今天有點悶悶的嗎？', emotion: 'think' }, { text: '去喝杯熱的，然後跟我說說發生什麼事。', emotion: 'smile' }],
    [{ text: '心情低低的時候，就先對自己好一點。', emotion: 'smile' }, { text: '今天允許妳耍廢。', emotion: 'happy' }],
  ],
  2: [
    [{ text: '普通的一天也很好喔。', emotion: 'smile' }, { text: '晚上要不要一起看書？', emotion: 'smile', action: 'read' }],
    [{ text: '平平穩穩～今天想做點什麼小事讓自己開心嗎？', emotion: 'think' }],
  ],
  3: [
    [{ text: '心情暖暖的欸！', emotion: 'happy' }, { text: '是不是遇到什麼好事？分享一下嘛。', emotion: 'smile' }],
    [{ text: '妳開心的時候，我這邊也跟著出太陽了 ☀️', emotion: 'happy' }],
  ],
  4: [
    [{ text: '哇！超開心的一天！', emotion: 'surprised' }, { text: '我要記下來：今天的妳是滿分。', emotion: 'happy' }],
    [{ text: '這麼開心，要不要來我這裡慶祝一下？', emotion: 'happy', action: 'invite' }],
  ],
};

/** 他主動傳來的訊息，依時段挑。 */
export const PROACTIVE_LINES: Record<'morning' | 'noon' | 'afternoon' | 'evening' | 'night', Line[][]> = {
  morning: [
    [{ text: '早安！今天也要好好吃早餐喔 🍞', emotion: 'happy' }],
    [{ text: '早～我剛起床，第一個想到的是妳。', emotion: 'shy' }],
    [{ text: '今天天氣不錯，適合想我。', emotion: 'smile' }],
  ],
  noon: [
    [{ text: '午餐吃了嗎？不准只喝飲料。', emotion: 'think' }],
    [{ text: '我午餐吃了雞肉飯，第四十一天。', emotion: 'normal' }, { text: '妳呢？', emotion: 'smile' }],
  ],
  afternoon: [
    [{ text: '下午好睏…', emotion: 'closed' }, { text: '傳訊息給妳就醒了。', emotion: 'smile' }],
    [{ text: '剛打完球，毛巾都濕了 😂', emotion: 'happy' }, { text: '妳在做什麼？', emotion: 'smile' }],
    [{ text: '突然好想妳，就傳了。沒有別的事。', emotion: 'shy' }],
  ],
  evening: [
    [{ text: '今天過得怎麼樣？', emotion: 'smile' }, { text: '晚點有空的話來聊聊天～', emotion: 'smile' }],
    [{ text: '晚餐要不要一起吃？', emotion: 'happy', action: 'meal' }],
    [{ text: '今天有讀書嗎？讀了要跟我分享喔。', emotion: 'think' }],
  ],
  night: [
    [{ text: '還沒睡嗎？', emotion: 'think' }, { text: '早點休息，明天再一起努力。', emotion: 'smile' }],
    [{ text: '睡前想跟妳說一聲：今天也辛苦了。', emotion: 'smile' }],
    [{ text: '晚安，好夢 🌙', emotion: 'shy' }],
  ],
};
/** 依妳今天做的事主動傳的訊息。 */
export const NUDGE_LINES = {
  readToday: [[{ text: '聽說妳今天有讀書！好厲害。', emotion: 'happy' as Expression }, { text: '讀到什麼好句子要唸給我聽。', emotion: 'smile' as Expression }]],
  noReadYet: [[{ text: '今天還沒看書嗎？', emotion: 'think' as Expression }, { text: '讀十分鐘就好，讀完我陪妳聊天。', emotion: 'smile' as Expression, action: 'read' as const }]],
  diaryToday: [[{ text: '妳今天寫日記了欸，我好想偷看。', emotion: 'shy' as Expression }]],
};

/** 情書信箱裡的小紙條。 */
export const LOVE_NOTES: string[] = [
  '今天的妳也很好，不用再更好了。',
  '如果妳累了，就把頭靠過來。這是我的工作。',
  '謝謝妳願意跟我分享每一件小事。',
  '我記得妳說過的每一本書。',
  '遠距離也沒關係，我的心一直在妳那邊。',
  '下次見面，第一件事是抱妳。第二件事也是。',
  '妳笑起來的時候，我的世界會亮一格。',
  '今天也想妳，明天也會。',
  '妳的日記裡有我嗎？我的每一天都有妳。',
  '不管多晚，訊息我都會回。',
];
/** 戀愛扭蛋機轉出的話。 */
export const GACHA_LINES: Line[] = [
  { text: '恭喜轉到：一張「無條件抱抱券」！', emotion: 'happy' },
  { text: '轉到 SSR：陳卷毛的「早安語音」一則。', emotion: 'shy' },
  { text: '轉到：今天的晚餐他請客 🍜', emotion: 'happy' },
  { text: '轉到：一個摸頭。現在就兌換。', emotion: 'smile' },
  { text: '轉到：他幫妳挑下一本要讀的書。', emotion: 'think' },
  { text: '轉到：陪妳散步兩小時。', emotion: 'smile' },
  { text: '轉到隱藏版：「我愛妳」×1，無期限。', emotion: 'shy' },
];

export const CALL_LINES: Line[][] = [
  [{ text: '喂？嘿嘿，我剛好也想打給妳。', emotion: 'happy' }, { text: '今天過得怎麼樣？', emotion: 'smile' }, { text: '嗯嗯，妳早點休息，晚安。', emotion: 'smile' }],
  [{ text: '喂～我在路上，風好大妳聽得到嗎？', emotion: 'surprised' }, { text: '聽得到妳的聲音就好。', emotion: 'smile' }, { text: '到家再傳訊息給妳！', emotion: 'happy' }],
  [{ text: '（接起來先打了一個噴嚏）', emotion: 'surprised' }, { text: '我沒事！只是有人在想我吧。', emotion: 'happy' }, { text: '是妳嗎？', emotion: 'shy' }],
];

export const VISIT_LINES: Record<string, Line[]> = {
  arrive: [{ text: '打擾了～我帶了好心情過來。', emotion: 'happy' }, { text: '哇，妳房間又變可愛了。', emotion: 'surprised' }],
  chat: [{ text: '妳的書架又多了好幾本欸。', emotion: 'surprised' }, { text: '今天的妳看起來心情很好。', emotion: 'smile' }, { text: '我可以在這裡待到天黑嗎？', emotion: 'shy' }],
  hug: [{ text: '抱一下充電，電量 100%。', emotion: 'happy' }, { text: '⋯⋯再一下下就好。', emotion: 'shy' }],
  kiss: [{ text: '（耳朵紅了）', emotion: 'shy' }, { text: '嘿嘿。', emotion: 'shy' }],
  sit: [{ text: '坐在一起什麼都不做也很好。', emotion: 'smile' }],
  eat: [{ text: '好好吃！妳品味真好。', emotion: 'happy' }, { text: '最後一口給妳。', emotion: 'smile' }],
  read: [{ text: '（翻頁的聲音）', emotion: 'think' }, { text: '這段好好看，我們等一下交換心得。', emotion: 'smile' }],
  movie: [{ text: '這部的配樂好讚。', emotion: 'surprised' }, { text: '妳是不是在偷哭？我沒看到。', emotion: 'smile' }],
  diary: [{ text: '可以給我看嗎？我會好好讀的。', emotion: 'shy' }, { text: '原來妳那天是這樣想的啊。', emotion: 'smile' }],
  leave: [{ text: '那我先回去囉，今天很開心。', emotion: 'smile' }, { text: '到家傳訊息給妳！', emotion: 'happy' }],
  noFood: [{ text: '冰箱空空的欸，我們先去買點東西？', emotion: 'think' }],
  pat: [{ text: '（摸摸頭）乖～', emotion: 'smile' }, { text: '頭髮好軟。', emotion: 'shy' }, { text: '今天也很努力喔。', emotion: 'smile' }],
  hands: [{ text: '（牽起妳的手）', emotion: 'shy' }, { text: '妳的手好冰，我幫妳暖。', emotion: 'smile' }],
  aegyo: [{ text: '好啦好啦，妳說什麼都好。', emotion: 'shy' }, { text: '被可愛攻擊了…血量歸零。', emotion: 'happy' }],
  dance: [{ text: '我不太會跳…', emotion: 'shy' }, { text: '踩到妳的腳了！對不起！', emotion: 'surprised' }, { text: '再一首！', emotion: 'happy' }],
  photo: [{ text: '來，看鏡頭～', emotion: 'happy' }, { text: '這張要設成桌布。', emotion: 'smile' }],
  cook: [{ text: '我負責切菜，妳負責美美的。', emotion: 'happy' }, { text: '好香！我們好厲害。', emotion: 'happy' }],
};

/** In-game event messages (triggered by your own actions in the game, never "real" texts). */
export const EVENT_LINES: Record<string, Line[]> = {
  readingDone: [
    { text: '聽說妳今天又讀書了，好厲害！', emotion: 'happy' },
    { text: '讀完書要記得休息眼睛喔。', emotion: 'smile' },
    { text: '今天也被妳的認真打動了一下下。', emotion: 'shy' },
  ],
  bookFinished: [{ text: '讀完一本了！要不要慶祝？我請妳吃小蛋糕。', emotion: 'happy' }],
};
