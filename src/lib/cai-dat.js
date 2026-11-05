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

/** Hiện dòng nhắc cử chỉ khi còn trong 3 lần mở đầu tiên, hoặc khi danh sách việc của ngày đang xem trống. */
export const hienDongNhac = (soLanMo, soViec) => soLanMo <= SO_LAN_NHAC || soViec === 0;
