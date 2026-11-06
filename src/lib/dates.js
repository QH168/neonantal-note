// Tiện ích ngày tháng. Dùng chuỗi 'YYYY-MM-DD' theo giờ máy (không dùng toISOString vì lệch UTC+7).
import { MOC_MAC_DINH } from './cai-dat.js';
export const p2 = (n) => String(n).padStart(2, '0');
export const isoOf = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const todayIso = () => isoOf(new Date());

/** Ngày lịch (giờ máy, không UTC) của một mốc thời gian dạng mili giây. */
export const ngayLichCuaMs = (ms) => isoOf(new Date(ms));

/**
 * Ngày làm việc (v9.6) = ngày lịch của (giờ máy − mốc). Hàm thuần, nhận `now` (Date hoặc mili giây).
 * Tính trên giờ-phút của đồng hồ máy chứ không trừ mili giây, nên không lệch qua UTC hay giờ mùa hè.
 * mocPhut: số phút từ 00:00 (0, 360, 420, 480...). Không phải số hợp lệ thì dùng 420 (07:00); mốc 0 = ngày lịch.
 * Ví dụ: 02:30 ngày 05/11 với mốc 07:00 → '2026-11-04'; 07:00 ngày 05/11 → '2026-11-05'.
 */
export function ngayLamViec(now = new Date(), mocPhut = MOC_MAC_DINH) {
  const d = now instanceof Date ? now : new Date(now);
  const moc = Number.isFinite(mocPhut) && mocPhut >= 0 && mocPhut < 1440 ? Math.floor(mocPhut) : MOC_MAC_DINH;
  const phutTrongNgay = d.getHours() * 60 + d.getMinutes();
  return isoOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() - (phutTrongNgay < moc ? 1 : 0)));
}

/**
 * Ba ngày cho giao diện: homNay (ngày làm việc), homQua (ngày làm việc trước) và ngayLich (ngày lịch của máy,
 * dùng để tính tuổi). Không tự đọc đồng hồ: phải truyền `now`.
 */
export function cacNgay(now, mocPhut) {
  const homNay = ngayLamViec(now, mocPhut);
  return { homNay, homQua: addDays(homNay, -1), ngayLich: isoOf(now instanceof Date ? now : new Date(now)) };
}

export const parseIso = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (iso, n) => {
  const d = parseIso(iso);
  return isoOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};
const DAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
export const fmtLong = (d) => `${DAYS[d.getDay()]}, ${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
export const fmtDM = (iso) => {
  const d = parseIso(iso);
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`;
};
