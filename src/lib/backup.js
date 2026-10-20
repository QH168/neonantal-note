// Xuất / nhập file sao lưu (phương án B).
// - iPhone: xuất qua bảng Chia sẻ → chọn OneDrive (hoặc "Lưu vào Tệp" → OneDrive).
//           nhập bằng ô chọn file → duyệt Tệp → OneDrive.
// - PC (Chrome/Edge): chọn 1 lần thư mục OneDrive đã đồng bộ trên máy → app ghi/đọc file thẳng trong đó.
// - Trình duyệt khác: tải file về (Downloads) để bạn tự kéo vào OneDrive.
import { db, DATA_TABLES, getMeta, setMeta } from '../db.js';
import { BACKUP_FORMAT, BACKUP_VERSION, mergeRows, validateBackup, backupFileName } from './merge.js';

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const hasFolderAccess = () => typeof window.showDirectoryPicker === 'function';

export function canShareFiles(file) {
  try {
    return !!navigator.canShare && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

// ---------- XUẤT ----------

/** Gom toàn bộ dữ liệu (kể cả dòng đã đánh dấu xoá) thành một File JSON. */
export async function prepareBackupFile() {
  const tables = {};
  for (const t of DATA_TABLES) tables[t] = await db[t].toArray();
  const data = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    device: isIOS() ? 'iphone' : 'pc',
    tables
  };
  const json = JSON.stringify(data);
  const name = backupFileName(new Date(), data.device);
  return new File([json], name, { type: 'application/json' });
}

/** iPhone: mở bảng Chia sẻ. Phải gọi ngay trong lần bấm nút (iOS yêu cầu thao tác của người dùng). */
export async function shareFile(file) {
  await navigator.share({ files: [file], title: 'Sao lưu Ghi chú Sơ sinh' });
}

/** Tải file về thư mục Downloads (dự phòng cho mọi trình duyệt). */
export function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- THƯ MỤC ONEDRIVE TRÊN PC ----------

/** Chọn thư mục (ví dụ C:\Users\<bạn>\OneDrive\GhiChuSoSinh) và nhớ lại cho các lần sau. */
export async function chooseBackupFolder() {
  const dir = await window.showDirectoryPicker({ id: 'ghichu-backup', mode: 'readwrite' });
  await setMeta('backupDir', dir); // IndexedDB lưu được "tay cầm" thư mục trên Chrome/Edge
  return dir;
}

/** Lấy thư mục đã chọn và xin lại quyền nếu trình duyệt đã quên (cần gọi trong lần bấm nút). */
export async function getBackupFolder() {
  const dir = await getMeta('backupDir');
  if (!dir) return null;
  const opts = { mode: 'readwrite' };
  if ((await dir.queryPermission(opts)) === 'granted') return dir;
  if ((await dir.requestPermission(opts)) === 'granted') return dir;
  return null;
}

export async function saveToFolder(dir, file) {
  const handle = await dir.getFileHandle(file.name, { create: true });
  const w = await handle.createWritable();
  await w.write(file);
  await w.close();
}

/** Tìm file sao lưu mới nhất trong thư mục (ví dụ file iPhone vừa đẩy lên OneDrive). */
export async function findLatestInFolder(dir, { excludeDevice } = {}) {
  let latest = null;
  for await (const entry of dir.values()) {
    if (entry.kind !== 'file' || !/^ghichu_.*\.json$/.test(entry.name)) continue;
    if (excludeDevice && entry.name.includes(`_${excludeDevice}.json`)) continue;
    const f = await entry.getFile();
    if (!latest || f.lastModified > latest.lastModified) latest = f;
  }
  return latest;
}

// ---------- NHẬP ----------

/** Đọc file sao lưu và gộp vào máy. Trả về số dòng thêm mới / cập nhật / bỏ qua. */
export async function importBackupFile(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('Không đọc được file (không phải JSON hợp lệ).');
  }
  const err = validateBackup(data, DATA_TABLES);
  if (err) throw new Error(err);

  const total = { added: 0, updated: 0, skipped: 0 };
  // Một giao dịch: hoặc gộp hết, hoặc không ghi gì nếu có lỗi giữa chừng.
  await db.transaction('rw', DATA_TABLES.map((t) => db[t]), async () => {
    for (const t of DATA_TABLES) {
      const incoming = data.tables[t] || [];
      if (!incoming.length) continue;
      const local = await db[t].bulkGet(incoming.map((r) => r.id));
      const { toPut, added, updated, skipped } = mergeRows(local, incoming);
      if (toPut.length) await db[t].bulkPut(toPut);
      total.added += added;
      total.updated += updated;
      total.skipped += skipped;
    }
  });
  await setMeta('lastImport', { at: Date.now(), file: file.name, ...total });
  return total;
}

export async function markExported(fileName) {
  await setMeta('lastExport', { at: Date.now(), file: fileName });
}
