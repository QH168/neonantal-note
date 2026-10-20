import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, requestPersistentStorage } from '../db.js';
import {
  isIOS, hasFolderAccess, canShareFiles, prepareBackupFile, shareFile, downloadFile,
  chooseBackupFolder, getBackupFolder, saveToFolder, findLatestInFolder,
  importBackupFile, markExported
} from '../lib/backup.js';
import { SheetHead } from './ui.jsx';

const fmt = (ts) => (ts ? new Date(ts).toLocaleString('vi-VN') : 'chưa có');

export default function BackupPanel({ onClose }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingFile, setPendingFile] = useState(null); // khi iOS chặn lần chia sẻ đầu
  const [persisted, setPersisted] = useState(null);

  const lastExport = useLiveQuery(() => db.meta.get('lastExport'))?.value;
  const lastImport = useLiveQuery(() => db.meta.get('lastImport'))?.value;
  const folder = useLiveQuery(() => db.meta.get('backupDir'))?.value;
  const pcFolder = hasFolderAccess() && !isIOS();

  useEffect(() => { requestPersistentStorage().then(setPersisted).catch(() => setPersisted(false)); }, []);

  const overdue = !lastExport || Date.now() - lastExport.at > 24 * 3600 * 1000;
  const run = async (fn) => {
    setBusy(true); setMsg('');
    try { await fn(); } catch (e) {
      if (e?.name !== 'AbortError') setMsg('Lỗi: ' + (e?.message || e));
    } finally { setBusy(false); }
  };

  const handleExport = () => run(async () => {
    const file = await prepareBackupFile();
    if (pcFolder) {
      const dir = (await getBackupFolder()) || (await chooseBackupFolder());
      await saveToFolder(dir, file);
      await markExported(file.name);
      setMsg(`Đã lưu ${file.name} vào thư mục ${dir.name}. OneDrive sẽ tự đồng bộ.`);
      return;
    }
    if (canShareFiles(file)) {
      try {
        await shareFile(file);
      } catch (e) {
        if (e?.name === 'NotAllowedError') { setPendingFile(file); setMsg('Bấm nút "Chia sẻ file" bên dưới.'); return; }
        throw e;
      }
      await markExported(file.name);
      setMsg('Đã mở bảng Chia sẻ. Chọn OneDrive → thư mục GhiChuSoSinh.');
      return;
    }
    downloadFile(file);
    await markExported(file.name);
    setMsg(`Đã tải ${file.name} về máy. Hãy chép file vào thư mục OneDrive.`);
  });

  const handleSharePending = () => run(async () => {
    await shareFile(pendingFile);
    await markExported(pendingFile.name);
    setPendingFile(null);
    setMsg('Đã mở bảng Chia sẻ.');
  });

  const report = (file, r) => setMsg(`Đã nhập ${file.name}: thêm ${r.added}, cập nhật ${r.updated}, giữ nguyên ${r.skipped}.`);
  const handlePickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    run(async () => report(file, await importBackupFile(file)));
  };
  const handleImportLatest = () => run(async () => {
    const dir = await getBackupFolder();
    if (!dir) { setMsg('Chưa chọn thư mục OneDrive.'); return; }
    const file = await findLatestInFolder(dir, { excludeDevice: 'pc' });
    if (!file) { setMsg('Không thấy file sao lưu nào từ iPhone trong thư mục.'); return; }
    report(file, await importBackupFile(file));
  });

  return (
    <>
      <SheetHead title="Sao lưu & OneDrive" onClose={onClose} closeLabel="Đóng sao lưu" />
      <div className="stack4">
        <p className={'m0 small ' + (overdue ? 'warn' : 'muted')}>
          Lần xuất gần nhất: {fmt(lastExport?.at)}{overdue && ' — nên xuất bản sao lưu hôm nay'}
        </p>
        <p className="m0 small muted">Lần nhập gần nhất: {fmt(lastImport?.at)}{lastImport && ` (${lastImport.file})`}</p>
      </div>

      <div className="row8 wrap">
        <button type="button" className="btn primary" disabled={busy} onClick={handleExport}>Xuất sao lưu</button>
        <label className={'btn' + (busy ? ' disabled' : '')}>
          Nhập từ file…
          <input type="file" accept=".json,application/json" hidden onChange={handlePickFile} disabled={busy} />
        </label>
      </div>
      {pendingFile && <button type="button" className="btn primary" onClick={handleSharePending}>Chia sẻ file</button>}

      {pcFolder && (
        <div className="row8 wrap">
          <button type="button" className="btn ghost" disabled={busy} onClick={() => run(async () => {
            const d = await chooseBackupFolder(); setMsg(`Đã chọn thư mục: ${d.name}`);
          })}>{folder ? `Thư mục: ${folder.name} (đổi)` : 'Chọn thư mục OneDrive'}</button>
          {folder && <button type="button" className="btn ghost" disabled={busy} onClick={handleImportLatest}>Lấy bản mới nhất từ iPhone</button>}
        </div>
      )}

      {msg && <p role="status" className="msg">{msg}</p>}

      <div className="muted xsmall">
        Dữ liệu nằm trong máy này{persisted ? ' và đã được trình duyệt giữ lâu dài' : ''}. Xuất sao lưu lên OneDrive mỗi ngày để
        không mất khi đổi máy; nhập file ở máy kia để có cùng dữ liệu.
        {persisted === false && isIOS() && ' Trên iPhone, luôn mở app bằng icon ở Màn hình chính.'}
      </div>
    </>
  );
}
