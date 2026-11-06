// Cử chỉ vuốt dòng — hàm thuần (không dùng window, DOM, React) để kiểm được bằng Node.
// Quy ước: dx > 0 là vuốt phải (đánh dấu xong), dx < 0 là vuốt trái (xoá).
// Mọi hàm chịu được số không hợp lệ (NaN, undefined, chiều rộng 0): không ném lỗi, kết quả 've'.

export const NGUONG_NGANG = 8;      // px: dưới ngưỡng này chưa coi là vuốt (như SwipeRow cũ)
export const TI_LE_MOC = 1 / 3;     // mốc = 1/3 chiều rộng dòng
export const CAN_TOI_DA = 16;       // px: dòng việc đã xong chỉ nhúc nhích tối đa chừng này
export const HE_SO_CAN = 0.25;      // lực cản: dịch hiển thị = dx * hệ số (tới tối đa trên)

const so = (v) => (Number.isFinite(v) ? v : 0);
const rongHopLe = (rong) => Number.isFinite(rong) && rong > 0;

/**
 * Nhận biết hướng cử chỉ từ độ dời (dx, dy) so với điểm chạm đầu.
 * Trả 'ngang' (vuốt ngang, nên nhận cử chỉ), 'doc' (cuộn dọc, bỏ qua), 'chua' (chưa đủ 8px để quyết).
 * Chéo đúng 45° (|dx| = |dy|) tính là ngang khi đủ ngưỡng, giống SwipeRow cũ.
 */
export function huongCuChi(dx, dy) {
  const ax = Math.abs(so(dx)), ay = Math.abs(so(dy));
  if (ax >= NGUONG_NGANG && ax >= ay) return 'ngang';
  if (ay >= NGUONG_NGANG && ay > ax) return 'doc';
  return 'chua';
}

/** Vuốt này có được phép không? Phải: cần duocPhai. Trái: luôn được. dx = 0: không. */
export function duocVuot(dx, { duocPhai = true, duocTrai = true } = {}) {
  const d = so(dx);
  if (d < 0) return duocTrai !== false;
  if (d > 0) return duocPhai === true;
  return false;
}

/**
 * Độ dịch (px, có dấu) để hiển thị dòng. Vuốt phải khi duocPhai=false: 0.
 * Vuốt phải trên dòng đã xong: lực cản, chỉ nhúc nhích tối đa CAN_TOI_DA px.
 * Còn lại bám ngón tay, giới hạn trong [-rong, rong] (rong không hợp lệ thì 0).
 */
export function doDich(dx, rong, { duocPhai = true, daXong = false, duocTrai = true } = {}) {
  const d = so(dx);
  if (!rongHopLe(rong) || d === 0) return 0;
  if (d > 0) {
    if (!duocPhai) return 0;
    if (daXong) return Math.min(d * HE_SO_CAN, CAN_TOI_DA, rong);
    return Math.min(d, rong);
  }
  if (duocTrai === false) return 0;
  return Math.max(d, -rong);
}

/**
 * Đã qua mốc 1/3 chiều rộng chưa? Đúng mốc là qua (|dx| * 3 >= rong, tránh sai số số thực).
 * Hướng không được phép, hoặc vuốt phải trên việc đã xong: không bao giờ qua mốc.
 * Chiều rộng 0 hoặc không hợp lệ: false.
 */
export function quaMoc(dx, rong, { duocPhai = true, daXong = false, duocTrai = true } = {}) {
  const d = so(dx);
  if (!rongHopLe(rong) || d === 0) return false;
  if (d > 0 && (!duocPhai || daXong)) return false;
  if (d < 0 && duocTrai === false) return false;
  return Math.abs(d) * 3 >= rong;
}

/**
 * Nền sau dòng đang hiện: 'xong' (xanh, vuốt phải), 'xoa' (đỏ phấn, vuốt trái) hoặc null (không hiện).
 * Vuốt phải trên việc đã xong hoặc không được phải: null.
 */
export function nenHien(dx, { duocPhai = true, daXong = false, duocTrai = true } = {}) {
  const d = so(dx);
  if (d > 0) return duocPhai && !daXong ? 'xong' : null;
  if (d < 0) return duocTrai === false ? null : 'xoa';
  return null;
}

/**
 * Kết quả khi thả tay: 'xong' | 'xoa' | 've' (trượt về, không đổi gì).
 * Vuốt phải qua mốc → 'xong' (nếu duocPhai và dòng chưa xong). Vuốt trái qua mốc → 'xoa'
 * (kể cả dòng đã xong). Trước mốc, hướng không được phép, việc đã xong vuốt phải, chiều rộng 0 → 've'.
 */
export function ketQuaKhiTha(dx, rong, opts = {}) {
  if (!quaMoc(dx, rong, opts)) return 've';
  return so(dx) > 0 ? 'xong' : 'xoa';
}