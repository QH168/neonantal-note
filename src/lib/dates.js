// Tiện ích ngày tháng. Dùng chuỗi 'YYYY-MM-DD' theo giờ máy (không dùng toISOString vì lệch UTC+7).
export const p2 = (n) => String(n).padStart(2, '0');
export const isoOf = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const todayIso = () => isoOf(new Date());
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
