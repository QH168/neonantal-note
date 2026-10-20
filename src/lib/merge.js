// Logic gộp dữ liệu khi nhập file sao lưu. Không phụ thuộc trình duyệt nên chạy thử được bằng Node.

export const BACKUP_FORMAT = 'ghichu-sosinh-backup';
export const BACKUP_VERSION = 1;

/**
 * Gộp các dòng nhập vào với dòng đang có trên máy, theo quy tắc "bản sửa sau cùng thắng".
 * @param {Array} localRows   các dòng hiện có trên máy (có thể chứa undefined nếu không tìm thấy)
 * @param {Array} incomingRows các dòng trong file
 * @returns {{ toPut: Array, added: number, updated: number, skipped: number }}
 */
export function mergeRows(localRows, incomingRows) {
  const local = new Map();
  for (const r of localRows) if (r) local.set(r.id, r);

  const toPut = [];
  let added = 0, updated = 0, skipped = 0;

  for (const inc of incomingRows) {
    if (!inc || typeof inc.id !== 'string') { skipped++; continue; }
    const cur = local.get(inc.id);
    if (!cur) {
      toPut.push(inc); added++;
    } else if ((inc.updatedAt ?? 0) > (cur.updatedAt ?? 0)) {
      toPut.push(inc); updated++;
    } else {
      skipped++; // bản trên máy mới hơn hoặc bằng → giữ nguyên
    }
  }
  return { toPut, added, updated, skipped };
}

/** Kiểm tra file sao lưu có đúng định dạng không; trả về thông báo lỗi hoặc null. */
export function validateBackup(data, tables) {
  if (!data || data.format !== BACKUP_FORMAT) return 'File không phải bản sao lưu của app này.';
  if (data.version > BACKUP_VERSION) return 'File được tạo từ phiên bản app mới hơn. Hãy cập nhật app trước.';
  if (!data.tables || typeof data.tables !== 'object') return 'File thiếu dữ liệu.';
  for (const t of tables) {
    if (data.tables[t] !== undefined && !Array.isArray(data.tables[t])) return `Bảng ${t} trong file bị lỗi.`;
  }
  return null;
}

/** Tên file: ghichu_2026-10-19_2255_iphone.json */
export function backupFileName(date = new Date(), label = '') {
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}${p(date.getMinutes())}`;
  const safe = label.toLowerCase().replace(/[^a-z0-9-]+/g, '');
  return `ghichu_${stamp}${safe ? '_' + safe : ''}.json`;
}
