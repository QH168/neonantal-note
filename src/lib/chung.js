// Hàm thuần dùng chung cho mọi nơi (dữ liệu, tổng hợp, màn hình). Không import db/React để Node kiểm được.

/** Dòng còn sống (chưa bị đánh dấu xoá). */
export const alive = (r) => !r.deleted;

/**
 * Chia một danh sách thành nhóm trong MỘT lượt duyệt. Trả Map { khoá → mảng }, giữ thứ tự gặp của khoá và của từng dòng.
 * Dùng thay cho kiểu "mỗi nhóm lọc lại cả danh sách một lần".
 */
export function nhomTheo(ds, khoa) {
  const m = new Map();
  for (const x of ds || []) {
    const k = khoa(x);
    const g = m.get(k);
    if (g) g.push(x); else m.set(k, [x]);
  }
  return m;
}

/** Thứ tự việc của một bé: theo `order`, rồi `createdAt`. */
export const soViecCuaBe = (a, b) => (a.order || 0) - (b.order || 0) || (a.createdAt || 0) - (b.createdAt || 0);

/** { [patientId]: việc[] đã xếp } từ một danh sách việc của nhiều bé. */
export function viecTheoBe(todos) {
  const out = {};
  for (const [pid, ds] of nhomTheo(todos, (t) => t.patientId)) out[pid] = ds.sort(soViecCuaBe);
  return out;
}
