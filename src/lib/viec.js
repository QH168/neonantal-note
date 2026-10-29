// Luật thuần cho tab Việc (nhãn, sắp xếp, khu hiển thị, đếm chạm). Không import db/React để Node kiểm được.

export const TAGS = ['NV', 'BM', 'CK', 'HC', 'XN'];
// Nhãn → số màu: giao diện dùng var(--pN)
export const TAG_COLOR = { NV: 1, BM: 2, CK: 3, HC: 4, XN: 5 };

// Việc mới có mảng tags (kể cả rỗng); việc cũ chỉ có urgency.
export const laViecMoi = (t) => Array.isArray(t?.tags);

// Lọc nhãn hợp lệ, bỏ trùng, xếp theo thứ tự TAGS.
export const chuanHoaTags = (arr) => {
  const co = new Set(Array.isArray(arr) ? arr : []);
  return TAGS.filter((x) => co.has(x));
};

// Trả mảng mới đã bật/tắt `tag` (không đổi mảng gốc). Nhãn lạ: bỏ qua.
export const batTatNhan = (tags, tag) => {
  const cur = chuanHoaTags(tags);
  if (!TAGS.includes(tag)) return cur;
  return chuanHoaTags(cur.includes(tag) ? cur.filter((x) => x !== tag) : [...cur, tag]);
};

// Chưa xong trước → createdAt tăng → id. Thiếu createdAt coi như 0.
export const soSanhViec = (a, b) =>
  (a.done ? 1 : 0) - (b.done ? 1 : 0) ||
  (a.createdAt || 0) - (b.createdAt || 0) ||
  String(a.id ?? '').localeCompare(String(b.id ?? ''));

export const sapViec = (list) => [...list].sort(soSanhViec);

// Khu để hiện chip/nhóm: `zones` + khu cũ trong `legacy` đang còn ít nhất một việc chưa xoá.
// Truyền ZONES và LEGACY_ZONES từ db.js vào (viec.js không import db.js).
export const khuHienThi = (tasks, zones, legacy = []) => {
  const con = new Set((tasks || []).filter((t) => !t.deleted).map((t) => t.zone));
  return [...zones, ...legacy.filter((z) => !zones.includes(z) && con.has(z))];
};

// `mocs`: các mốc thời gian chạm (ms). true nếu có >= n lần chạm nằm trong `cuaSo` ms
// tính tới mốc mới nhất (n=2 mở ghi chú, n=3 mở bảng nhãn).
export const boDemCham = (mocs, n, cuaSo = 1000) => {
  if (!Array.isArray(mocs) || n < 1 || mocs.length < n) return false;
  const s = [...mocs].sort((a, b) => a - b);
  const moi = s[s.length - 1];
  return moi - s[s.length - n] <= cuaSo;
};

// Thêm một lần chạm vào danh sách, bỏ mốc quá cũ (giữ tối đa 8). Trả mảng mới.
export const themCham = (mocs, now, cuaSo = 1000) =>
  [...(mocs || []).filter((m) => now - m <= cuaSo), now].slice(-8);

// Tên việc sau khi sửa: bỏ khoảng trắng 2 đầu. Rỗng → '' (nơi gọi không được ghi).
export const chuanTenViec = (s) => String(s ?? '').trim();

// Các khu để chọn trong bảng chi tiết việc: `zones` + (nếu việc đang ở khu cũ không có trong `zones`, vd. BM) khu đó,
// để ô chọn khu không làm mất khu hiện tại.
export const khuDeChon = (zones, khuHienTai) =>
  khuHienTai && !zones.includes(khuHienTai) ? [...zones, khuHienTai] : [...zones];
