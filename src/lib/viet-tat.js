// Luật thay chữ viết tắt: gõ '/key' rồi dấu cách → thay bằng nội dung. Hàm thuần (không import db/React).
//
// Quy ước:
// - Key lưu không có '/', chữ thường, không khoảng trắng (chuanKey).
// - "map" = object { key: nội dung } (tạo từ danh sách bằng taoMap). "list" = mảng [{ key, text }].
// - Phím kích hoạt thay chữ: dấu cách, hoặc xuống dòng ('\n'). Giao diện gọi moRong sau khi ký tự đó
//   đã nằm trong text (caret đứng ngay sau nó).
// - '/key' chỉ tính khi đứng đầu chuỗi hoặc sau khoảng trắng/xuống dòng; key không chứa '/' hay khoảng trắng.

/** '/KMDM ' → 'kmdm' (bỏ '/' đầu, mọi khoảng trắng, chữ thường). */
export function chuanKey(s) {
  return String(s ?? '').replace(/^\s*\//, '').replace(/\s+/g, '').toLowerCase();
}

/** Danh sách [{key,text}] → object { key: text } (key đã chuẩn hoá). */
export function taoMap(list) {
  const map = {};
  for (const m of list || []) {
    const k = chuanKey(m?.key);
    if (k && typeof m.text === 'string' && m.text) map[k] = m.text;
  }
  return map;
}

// ---------- Viết tắt có sẵn (không sửa, không xoá được) ----------
// /t → giờ máy lúc gõ dạng 24h HH:mm (07:05, 14:30). Không lưu trong CSDL, không nằm trong file sao lưu.
// Mục tự tạo trùng key 't' trong thư viện KHÔNG bị xoá hay sửa, nhưng khi gõ thì mục có sẵn thắng.
export const CO_SAN = [{ key: 't', moTa: 'giờ hiện tại (vd. 14:05)' }];

/** Giờ máy dạng 24h 'HH:mm' (hàm thuần: nhận 
ow). */
export function gioHienTai(now = new Date()) {
  const hai = (n) => String(n).padStart(2, '0');
  return hai(now.getHours()) + ':' + hai(now.getMinutes());
}

/** Key (đã chuẩn hoá) có phải viết tắt có sẵn không. */
export const laCoSan = (key) => CO_SAN.some((m) => m.key === chuanKey(key));

/** Nội dung các viết tắt có sẵn tại thời điểm 
ow: [{ key, text, moTa, coSan: true }]. Giao diện thư viện dùng để hiện đầu danh sách. */
export function mucCoSan(now = new Date()) {
  return CO_SAN.map((m) => ({ key: m.key, text: gioHienTai(now), moTa: m.moTa, coSan: true }));
}

/** map người dùng + viết tắt có sẵn (có sẵn thắng khi trùng key). Không đổi map gốc. */
export function mapDayDu(map, now = new Date()) {
  const out = { ...(map || {}) };
  for (const m of mucCoSan(now)) out[m.key] = m.text;
  return out;
}

const LA_TRANG = /\s/;

/** Tìm token '/key' kết thúc đúng tại vị trí `den` (không gồm); trả { batDau, key, goc } hoặc null. */
function tokenTruoc(text, den) {
  let i = den;
  while (i > 0 && !LA_TRANG.test(text[i - 1])) i--;
  const tok = text.slice(i, den);
  if (!/^\/[^\s/]+$/.test(tok)) return null;
  return { batDau: i, key: tok.slice(1), goc: tok };
}

/**
 * Vừa gõ dấu cách/xuống dòng ngay trước `caret` và trước đó là '/key' có trong map → thay.
 * Trả { text, caret, key, goc, noiDung, batDau, phim } hoặc null (không khớp: giữ nguyên).
 * `goc` là đoạn người dùng đã gõ (giữ hoa/thường), `phim` là ký tự kích hoạt (' ' hoặc '\n').
 */
export function moRong(text, caret, map, now = new Date()) {
  if (typeof text !== 'string' || caret < 2 || caret > text.length) return null;
  map = mapDayDu(map, now);
  const phim = text[caret - 1];
  if (phim !== ' ' && phim !== '\n') return null;
  const tk = tokenTruoc(text, caret - 1);
  if (!tk) return null;
  const key = tk.key.toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(map, key)) return null;
  const noiDung = map[key];
  const moi = text.slice(0, tk.batDau) + noiDung + phim + text.slice(caret);
  return { text: moi, caret: tk.batDau + noiDung.length + 1, key, goc: tk.goc, noiDung, batDau: tk.batDau, phim };
}

/**
 * Khi lưu (bấm + hoặc Enter): nếu mục CUỐI của chuỗi là '/key' có trong map thì thay bằng nội dung.
 * Cùng luật moRong (đứng đầu chuỗi hoặc sau khoảng trắng, không phân biệt hoa thường).
 * Khoảng trắng thừa ở cuối bị bỏ khi xét; nếu có thay thì kết quả không còn khoảng trắng cuối.
 * Không khớp (hoặc rỗng/map rỗng): trả đúng chuỗi gốc.
 */
export function moRongKhiGui(text, map, now = new Date()) {
  if (typeof text !== 'string' || !map) return text;
  const cat = text.replace(/\s+$/, '');
  const r = moRong(cat + ' ', cat.length + 1, map, now);
  return r ? r.text.slice(0, -1) : text;
}

/**
 * Hoàn tác một lần thay: trả { text, caret } với '/key' + phím kích hoạt như cũ.
 * Trả null nếu chữ đã bị sửa (đoạn thay không còn nguyên chỗ cũ) — giao diện khi đó bỏ nút Hoàn tác.
 */
export function hoanTac(text, ketQua) {
  if (!ketQua || typeof text !== 'string') return null;
  const { batDau, noiDung, goc, phim } = ketQua;
  const het = batDau + noiDung.length;
  if (text.slice(batDau, het + 1) !== noiDung + phim) return null;
  return { text: text.slice(0, batDau) + goc + phim + text.slice(het + 1), caret: batDau + goc.length + 1 };
}

/**
 * Đang gõ '/' + ≥1 ký tự ngay trước caret (token đúng đầu từ): trả tối đa `toiDa` mục khớp ĐẦU key
 * (không phân biệt hoa thường), xếp theo key. Mỗi phần tử: { key, text, batDau } (batDau = vị trí '/').
 * Không đang gõ → [].
 */
export function goiY(text, caret, list, toiDa = 4, now = new Date()) {
  if (typeof text !== 'string' || caret < 2 || caret > text.length) return [];
  const tk = tokenTruoc(text, caret);
  if (!tk) return [];
  const q = tk.key.toLowerCase();
  const out = [];
  for (const m of [...(list || []).filter((x) => !laCoSan(x?.key)), ...mucCoSan(now)]) {
    const k = chuanKey(m?.key);
    if (k && m.text && k.startsWith(q)) out.push({ key: k, text: m.text, batDau: tk.batDau });
  }
  out.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return out.slice(0, toiDa);
}

/** Chạm gợi ý: thay đoạn từ batDau đến caret bằng nội dung + dấu cách. Trả { text, caret }. */
export function chenGoiY(text, caret, viTriBatDau, noiDung) {
  const moi = text.slice(0, viTriBatDau) + noiDung + ' ' + text.slice(caret);
  return { text: moi, caret: viTriBatDau + noiDung.length + 1 };
}

/** Bộ mẫu 13 mục (bác sĩ duyệt 28/10/2026). Key chữ thường, không có '/'. */
export const BO_MAU = [
  { key: 'kmdm', text: 'Khí máu động mạch' },
  { key: 'kmtm', text: 'Khí máu tĩnh mạch' },
  { key: 'ctm', text: 'Công thức máu' },
  { key: 'crp', text: 'CRP định lượng' },
  { key: 'cay', text: 'Cấy máu' },
  { key: 'xqn', text: 'X-quang ngực thẳng' },
  { key: 'sat', text: 'Siêu âm tim' },
  { key: 'san', text: 'Siêu âm não xuyên thóp' },
  { key: 'bil', text: 'Bilirubin toàn phần, trực tiếp' },
  { key: 'dgd', text: 'Điện giải đồ' },
  { key: 'dhmm', text: 'Đường huyết mao mạch' },
  { key: 'rop', text: 'Khám sàng lọc ROP' },
  { key: 'oae', text: 'Đo OAE sàng lọc thính lực' }
];
