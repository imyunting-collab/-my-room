import { Link } from '../router';
import { Icon, PixelText } from '../ui';

const GROUPS: [string, [string, string, string][]][] = [
  ['閱讀', [['/library', '我的書庫', 'library'], ['/add', '新增閱讀', 'plus'], ['/journal', '閱讀手札', 'journal'], ['/calendar', '閱讀月曆', 'calendar'], ['/stats', '閱讀統計', 'chart'], ['/review', '年度回顧', 'star'], ['/achievements', '成就', 'trophy'], ['/bookshelf', '動態書架', 'shelf']]],
  ['生活', [['/room?scene=bedroom', '臥室', 'home'], ['/room?scene=study', '書房', 'book'], ['/balcony', '陽台植物園', 'plant'], ['/wardrobe', '衣櫃', 'shirt'], ['/fridge', '冰箱', 'fridge'], ['/shop', '商店', 'gift'], ['/wallet', '知識幣', 'coin']]],
  ['設備與戀愛', [['/computer', '電腦', 'chart'], ['/tablet', '平板', 'book'], ['/phone', '手機', 'phone'], ['/diary', '日記', 'journal'], ['/love', '陳卷毛', 'heart'], ['/love-diary', '戀愛日記', 'pen']]],
  ['其他', [['/settings', '設定與備份', 'gear']]],
];

export default function MorePage() {
  return (
    <div>
      <div className="center" style={{ margin: '6px 0 16px' }}><PixelText text="MY ROOM♥" scale={5} /><div className="muted">把喜歡的生活，一點一點住進來。</div></div>
      {GROUPS.map(([g, items]) => (
        <div key={g} className="card">
          <h2>{g}</h2>
          <div className="grid3">
            {items.map(([to, l, ic]) => <Link key={to} to={to} className="btn" ><span className="stack" style={{ alignItems: 'center', gap: 2 }}><Icon name={ic} size={24} /><span className="small">{l}</span></span></Link>)}
          </div>
        </div>
      ))}
    </div>
  );
}
