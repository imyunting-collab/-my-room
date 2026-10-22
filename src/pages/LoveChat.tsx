import { useState } from 'react';
import { CallScreen, ChatApp } from '../components/apps';
import { portraitURL } from '../sprites/characters';
import { Link } from '../router';

export default function LoveChatPage() {
  const [calling, setCalling] = useState(false);
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100dvh - var(--header-h) - var(--nav-h) - var(--safe-b) - 10px)' }}>
      <div className="row" style={{ padding: '10px 14px', borderBottom: '2px solid var(--cream-2)' }}>
        <img className="px" src={portraitURL('chen', 'smile')} alt="" style={{ width: 44, borderRadius: 10, border: '2px solid var(--ink)' }} />
        <div style={{ flex: 1 }}><b>陳卷毛</b><div className="muted">遊戲角色 · 回覆皆為虛構台詞</div></div>
        <Link to="/love-diary" className="btn small">戀愛日記</Link>
      </div>
      {calling ? <CallScreen onEnd={() => setCalling(false)} /> : <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}><ChatApp onCall={() => setCalling(true)} embedded /></div>}
    </div>
  );
}
