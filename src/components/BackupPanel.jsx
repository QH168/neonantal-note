import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import {
  isIOS, hasFolderAccess, canShareFiles, prepareBackupFile, shareFile, downloadFile,
  chooseBackupFolder, getBackupFolder, saveToFolder, findLatestInFolder,
  importBackupFile, markExported
} from '../lib/backup.js';

const fmt = (ts) => (ts ? new Date(ts).toLocaleString('vi-VN') : 'chưa có');

export default function BackupPanel() {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingFile, setPendingFile] = useState(null); // dùng khi iOS chặn lần chia sẻ đầu

  const lastExport = useLiveQuery(() => db.meta.get('lastExport'))?.value;
  const lastImport = useLiveQuery(() => db.meta.get('lastImport'))?.value;
  const folder = useLiveQuery(() => db.meta.get('backupDir'))?.value;

  const overdue = !lastExport || Date.now() - lastExport.at > 24 * 3600 * 1000;
  const run = async (fn) => {
    setBusy(true); setMsg('');
    try { await fn(); } catch (e) {
      if (e?.name !== 'AbortError') setMsg('Lỗi: ' + (e?.message || e));
    } finally { setBusy(false); }
  };

  // ----- Xuất -----
  const handleExport = () => run(async () => {
    const file = await prepareBackupFile();

    if (hasFolderAccess() && !isIOS()) {
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

  // ----- Nhập -----
  const handlePickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    run(async () => {
      const r = await importBackupFile(file);
      setMsg(`Đã nhập ${file.name}: thêm ${r.added}, cập nhật ${r.updated}, giữ nguyên ${r.skipped}.`);
    });
  };

  const handleImportLatest = () => run(async () => {
    const dir = await getBackupFolder();
    if (!dir) { setMsg('Chưa chọn thư mục OneDrive.'); return; }
    const file = await findLatestInFolder(dir, { excludeDevice: 'pc' });
    if (!file) { setMsg('Không thấy file sao lưu nào từ iPhone trong thư mục.'); return; }
    const r = await importBackupFile(file);
    setMsg(`Đã nhập ${file.name}: thêm ${r.added}, cập nhật ${r.updated}, giữ nguyên ${r.skipped}.`);
  });

  return (
    <section className="card">
      <h2>Sao lưu &amp; OneDrive</h2>
      <p className={overdue ? 'warn' : 'muted'}>
        Lần xuất gần nhất: {fmt(lastExport?.at)}{overdue && ' — nên xuất bản sao lưu hôm nay'}
      </p>
      <p className="muted">Lần nhập gần nhất: {fmt(lastImport?.at)}{lastImport && ` (${lastImport.file})`}</p>

      <div className="row">
        <button className="primary" disabled={busy} onClick={handleExport}>Xuất sao lưu</button>
        <label className={`button ${busy ? 'disabled' : ''}`}>
          Nhập từ file…
          <input type="file" accept=".json,application/json" hidden onChange={handlePickFile} disabled={busy} />
        </label>
      </div>

      {pendingFile && <button className="primary" onClick={handleSharePending}>Chia sẻ file</button>}

      {hasFolderAccess() && !isIOS() && (
        <div className="row">
          <button disabled={busy} onClick={() => run(async () => {
            const d = await chooseBackupFolder(); setMsg(`Đã chọn thư mục: ${d.name}`);
          })}>{folder ? `Thư mục: ${folder.name} (đổi)` : 'Chọn thư mục OneDrive'}</button>
          {folder && <button disabled={busy} onClick={handleImportLatest}>Lấy bản mới nhất từ iPhone</button>}
        </div>
      )}

      {msg && <p className="msg">{msg}</p>}
    </section>
  );
}
