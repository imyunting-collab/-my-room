import { DiaryApp } from '../components/apps';
import { splitPath, usePath } from '../router';

export default function DiaryPage() {
  const id = splitPath(usePath()).query.get('id') ?? undefined;
  return (
    <div>
      <p className="muted">這裡和房間裡的電腦、平板、手機是同一本日記。</p>
      <div className="card"><DiaryApp key={id ?? 'list'} startId={id} /></div>
    </div>
  );
}
