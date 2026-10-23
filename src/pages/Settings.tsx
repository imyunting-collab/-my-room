import { useEffect, useState } from 'react';
import { db } from '../db/idb';
import { useLive } from '../hooks';
import { applyBackup, exportBackup, parseBackup, resetAll, summarize, STORE_LABEL, type ImportSummary } from '../services/backup';
import { ensureSeed } from '../services/seed';
import { confirmDialog, Field, Icon, Sheet, useAction } from '../ui';
import { DAYPART_LABEL, DEFAULT_DAYPARTS, dateKey, downloadText, type DayPart, type DayPartRanges } from '../lib/util';
import { toast } from '../lib/bus';
import { SoundSettings } from '../components/SoundSettings';

export default function SettingsPage() {
  const { busy, run } = useAction();
  const reduced = useLive(() => db.getKV<boolean>('settings', 'reducedMotion', false), [], false);
  const ranges = useLive(() => db.getKV<DayPartRanges>('settings', 'dayparts', DEFAULT_DAYPARTS), [], DEFAULT_DAYPARTS) ?? DEFAULT_DAYPARTS;
  const preview = useLive(() => db.getKV<string>('settings', 'daypartPreview', ''), [], '');
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [usage, setUsage] = useState<string>('');
  useEffect(() => { navigator.storage?.estimate?.().then((e) => e.usage != null && setUsage(`${(e.usage / 1024 / 1024).toFixed(1)} MB`)).catch(() => undefined); }, []);

  const doExport = () => run(async () => {
    const b = await exportBackup();
    downloadText(JSON.stringify(b), `MY-ROOM-備份-${dateKey()}.json`, 'application/json');
  }, '備份檔已下載，請存到安全的地方（例如雲端硬碟）');
  const onFile = (file?: File) => file && run(async () => { const text = await file.text(); setSummary(await summarize(parseBackup(text))); });
  const apply = (mode: 'merge' | 'overwrite') => run(async () => {
    if (!summary) return;
    if (mode === 'overwrite' && !(await confirmDialog('覆蓋會刪除這台裝置上目前所有 MY ROOM 資料，換成備份檔的內容。確定嗎？', { danger: true, ok: '覆蓋' }))) return;
    const r = await applyBackup(summary.file, mode);
    await ensureSeed();
    setSummary(null);
    toast(`還原完成，匯入 ${r.added} 筆資料`, 'success');
  });

  return (
    <div>
      <SoundSettings />
      <div className="card">
        <h2><Icon name="backup" />資料備份與還原</h2>
        <p className="small">所有書籍、日記、照片、聊天與戀愛紀錄都只存在<b>這台裝置的瀏覽器</b>裡，不會上傳到任何伺服器。本機保存不等於自動同步：換手機或清除瀏覽器資料前，請先匯出備份。</p>
        {usage && <p className="muted">目前使用空間約 {usage}</p>}
        <div className="grid2">
          <button className="btn primary" disabled={busy} onClick={doExport} data-testid="export-backup">⬇ 匯出完整備份</button>
          <label className="btn" style={{ cursor: 'pointer' }}>⬆ 匯入備份<input type="file" accept="application/json,.json" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} data-testid="import-backup" /></label>
        </div>
      </div>

      <div className="card">
        <h2><Icon name="clock" />真實時間與日夜</h2>
        <p className="muted">房間依照裝置的真實時間變換清晨、白天、黃昏、夜晚與深夜。可以調整每段開始的小時。</p>
        <div className="grid2">
          {(Object.keys(DAYPART_LABEL) as DayPart[]).map((k) => (
            <Field key={k} label={`${DAYPART_LABEL[k]}開始`}>
              <select value={ranges[k]} onChange={(e) => run(() => db.setKV('settings', 'dayparts', { ...ranges, [k]: Number(e.target.value) }))}>
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
              </select>
            </Field>
          ))}
        </div>
        <button className="btn small" onClick={() => run(() => db.setKV('settings', 'dayparts', DEFAULT_DAYPARTS), '已恢復預設時段')}>恢復預設</button>
        <Field label="預覽其他時段（不影響真實時間）">
          <select value={preview ?? ''} onChange={(e) => run(() => db.setKV('settings', 'daypartPreview', e.target.value))}>
            <option value="">跟隨真實時間</option>{(Object.keys(DAYPART_LABEL) as DayPart[]).map((k) => <option key={k} value={k}>{DAYPART_LABEL[k]}</option>)}
          </select>
        </Field>
      </div>

      <div className="card">
        <h2><Icon name="gear" />顯示</h2>
        <label className="row" style={{ cursor: 'pointer' }}><input type="checkbox" checked={!!reduced} onChange={(e) => run(() => db.setKV('settings', 'reducedMotion', e.target.checked))} style={{ width: 22, height: 22 }} />減少動態效果</label>
        <p className="muted" style={{ marginBottom: 0 }}>系統開啟「減少動態效果」時也會自動套用。</p>
      </div>

      <div className="card">
        <h2><Icon name="phone" />安裝到 iPhone 主畫面</h2>
        <ol className="small" style={{ paddingLeft: 20, margin: 0 }}>
          <li>用 <b>Safari</b> 打開 MY ROOM 的網址（需要 HTTPS，例如 GitHub Pages）。</li>
          <li>點下方的「分享」按鈕 <span aria-hidden>⬆︎</span>。</li>
          <li>選「加入主畫面」，名稱保留 MY ROOM，按「加入」。</li>
          <li>之後從主畫面圖示打開，就像 App 一樣全螢幕，也能離線使用。</li>
        </ol>
        <p className="muted">注意：Safari 和主畫面 App 的資料是分開的；請一直從同一個入口使用，或用備份檔轉移。</p>
      </div>

      <div className="card">
        <h2>危險區域</h2>
        <button className="btn danger block" onClick={async () => {
          if (!(await confirmDialog('確定要刪除這台裝置上所有 MY ROOM 資料嗎？建議先匯出備份。', { danger: true, ok: '繼續' }))) return;
          if (!(await confirmDialog('最後確認：刪除後無法復原。', { danger: true, ok: '全部刪除' }))) return;
          await run(async () => { await resetAll(); await ensureSeed(); }, '已重新開始');
        }}>刪除所有資料，重新開始</button>
      </div>

      <Sheet open={!!summary} onClose={() => setSummary(null)} title="匯入摘要">
        {summary && (
          <div className="stack">
            <p className="small" style={{ margin: 0 }}>備份時間：{new Date(summary.file.exportedAt).toLocaleString('zh-TW')} · 共 {summary.totalRows} 筆</p>
            {summary.alreadyImported && <p style={{ margin: 0, color: 'var(--danger)', fontWeight: 700 }}>⚠️ 這個備份檔之前已經匯入過了。選「合併」不會產生重複資料。</p>}
            <div className="list" data-testid="import-summary">
              {summary.rows.map((r) => <div key={r.store} className="row small between" style={{ padding: '4px 0' }}><span>{STORE_LABEL[r.store]}</span><span>{r.total} 筆{r.existing ? `（${r.existing} 筆已存在）` : ''}</span></div>)}
            </div>
            <p className="muted" style={{ margin: 0 }}>合併：保留目前資料，只加入新的。覆蓋：用備份取代目前所有資料。過程中若發生錯誤，原有資料不會被改動。</p>
            <div className="grid3">
              <button className="btn" onClick={() => setSummary(null)}>取消</button>
              <button className="btn primary" disabled={busy} onClick={() => apply('merge')} data-testid="import-merge">合併</button>
              <button className="btn danger" disabled={busy} onClick={() => apply('overwrite')} data-testid="import-overwrite">覆蓋</button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
