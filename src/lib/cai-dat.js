// Luật thuần cho phần cài đặt giao diện (chế độ Sáng/Tối/Theo máy, dòng nhắc cử chỉ).
// Không dùng window/localStorage ở đây để Node kiểm được; nơi gọi (src/hooks.js) lo việc đọc/ghi.

/** Khoá localStorage lưu chế độ giao diện. Giá trị cũ 'light'/'dark' vẫn đọc đúng. */
export const KHOA_CHE_DO = 'theme';
/** Khoá localStorage đếm số lần mở app. */
export const KHOA_LAN_MO = 'soLanMo';
/** Dòng nhắc cử chỉ chỉ hiện trong chừng này lần mở app đầu tiên. */
export const SO_LAN_NHAC = 3;

export const CHE_DO = ['light', 'dark', 'auto'];

/** Giá trị đã lưu (có thể rỗng/hỏng) → 'light' | 'dark' | 'auto'. Chưa có hoặc lạ thì là 'auto'. */
export const docCheDo = (raw) => (CHE_DO.includes(raw) ? raw : 'auto');

/** Có dùng bản tối không? `heToi` là máy đang báo ưu tiên tối (prefers-color-scheme: dark). */
export const laToi = (cheDo, heToi) => (cheDo === 'dark' ? true : cheDo === 'light' ? false : !!heToi);

/** Số lần mở sau khi mở thêm một lần; giá trị đã lưu hỏng thì tính như chưa mở lần nào. */
export const tangLanMo = (raw) => {
  const n = Number.parseInt(raw, 10);
  return (Number.isFinite(n) && n > 0 ? Math.min(n, 999) : 0) + 1;
};

// ---------- Mốc ngày làm việc (v9.6) ----------
// Mốc lưu trong bảng meta (khoá KHOA_MOC_NGAY_LAM_VIEC), tính bằng phút từ 00:00, KHÔNG nằm trong file sao lưu.
// Phần đọc/ghi meta do agent Dữ liệu; ở đây chỉ có luật chuẩn hoá.
export const KHOA_MOC_NGAY_LAM_VIEC = 'mocNgayLamViec';
export const MOC_MAC_DINH = 420; // 07:00
export const MOC_HOP_LE = [0, 360, 420, 480]; // 00:00, 06:00, 07:00, 08:00

/** Giá trị đọc từ meta (số, chuỗi số, thiếu hoặc hỏng) → một trong MOC_HOP_LE. Lạ thì về 420. */
export function chuanHoaMoc(raw) {
  const n = typeof raw === 'number' ? raw : (typeof raw === 'string' && /^\d{1,4}$/.test(raw.trim()) ? Number(raw.trim()) : NaN);
  return MOC_HOP_LE.includes(n) ? n : MOC_MAC_DINH;
}

/** 420 → '07:00'. Giá trị lạ được chuẩn hoá về 420 trước. */
export function nhanMoc(phut) {
  const m = chuanHoaMoc(phut);
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

/** Câu giải thích dưới ô chọn mốc, đổi theo mốc đang chọn. */
export function giaiThichMoc(phut) {
  const m = chuanHoaMoc(phut);
  if (m === 0) return 'Ngày làm việc trùng ngày lịch: qua nửa đêm (00:00) là sang ngày mới.';
  const gio = nhanMoc(m);
  return `Từ 00:00 đến ${gio} app vẫn tính là ngày làm việc hôm trước. Việc và bé ghi trong đêm thuộc ngày hôm trước, đến ${gio} mới sang ngày mới. Tuổi và ngày tuổi vẫn tính theo ngày lịch.`;
}

/** Hiện dòng nhắc cử chỉ khi còn trong 3 lần mở đầu tiên, hoặc khi danh sách việc của ngày đang xem trống. */
export const hienDongNhac = (soLanMo, soViec) => soLanMo <= SO_LAN_NHAC || soViec === 0;
