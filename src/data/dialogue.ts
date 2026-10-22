// 陳卷毛的遊戲內台詞（虛構角色台詞，不代表真實人物的訊息）。
// 結構可持續擴充：新增 topic 或在 replies 裡加更多變化即可。
import type { Expression } from '../sprites/characters';

export interface Line { text: string; emotion: Expression; action?: 'invite' | 'meal' | 'read' }
export interface ChatTopic { id: string; prompt: string; replies: Line[][] }

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
