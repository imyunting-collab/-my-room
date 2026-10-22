import { useLive } from '../hooks';
import { balance, transactions } from '../services/wallet';
import { Empty, Icon } from '../ui';
import { fmtDateTime } from '../lib/util';
import { Link } from '../router';

export default function WalletPage() {
  const bal = useLive(balance, [], 0) ?? 0;
  const tx = useLive(transactions, [], []) ?? [];
  const income = tx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const spent = -tx.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  return (
    <div>
      <div className="card" style={{ background: '#fff3c8', textAlign: 'center' }}>
        <Icon name="coin" size={40} />
        <div style={{ fontSize: 36, fontWeight: 800 }} data-testid="wallet-balance">{bal}</div>
        <div className="muted">知識幣 · 累積獲得 {income} · 已花費 {spent}</div>
        <Link to="/shop" className="btn small" >去商店逛逛</Link>
      </div>
      <div className="card">
        <h2><Icon name="wallet" />交易紀錄</h2>
        <p className="muted">閱讀紀錄 +5（每天最多 6 筆）、當日滿 20 分鐘 +5、達成每日目標 +10、讀完一本書 +30、解鎖成就另有獎勵。</p>
        {tx.length === 0 ? <Empty icon="coin">還沒有交易。</Empty> : tx.map((t) => (
          <div key={t.id} className="list-item" style={{ cursor: 'default' }}>
            <div style={{ flex: 1 }}><div>{t.reason}</div><div className="muted">{fmtDateTime(t.createdAt)}</div></div>
            <b style={{ color: t.amount > 0 ? 'var(--ok)' : 'var(--danger)' }}>{t.amount > 0 ? '+' : ''}{t.amount}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
