// Luật xoá phòng và lưới an toàn danh sách phòng hôm nay (phiếu 2026-11-09). Hàm thuần: không chạm giao diện/CSDL.
// Ngày là chuỗi YYYY-MM-DD nên so sánh chuỗi là đúng thứ tự thời gian (qua tháng, qua năm).
import { phongChoXem } from './tong-hop.js';

const DANG_NGAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Phòng có xoá được không. Chỉ xét bé SỐNG (không deleted) của đúng phòng đó.
 * examDate >= homNay chặn xoá (hôm nay và các ngày sau); examDate < homNay chỉ được đếm.
 * homNay là NGÀY LÀM VIỆC do nơi gọi truyền vào. Thiếu hoặc sai dạng thì KHÔNG xoá (duoc: false, hai số 0).
 * Trả { duoc, soBeHomNay (từ hôm nay trở đi), soBeNgayTruoc }.
 */
export function phongXoaDuoc(roomId, patients, homNay) {
  let soBeHomNay = 0;
  let soBeNgayTruoc = 0;
  if (typeof homNay !== 'string' || !DANG_NGAY.test(homNay) || !Array.isArray(patients)) {
    return { duoc: false, soBeHomNay, soBeNgayTruoc };
  }
  for (const p of patients) {
    if (!p || p.deleted || p.roomId !== roomId) continue;
    if (p.examDate >= homNay) soBeHomNay++;
    else soBeNgayTruoc++;
  }
  return { duoc: soBeHomNay === 0, soBeHomNay, soBeNgayTruoc };
}

/**
 * Lưới an toàn cho danh sách hôm nay: phòng còn sống theo thứ tự, rồi phòng đã xoá (hoặc không tìm thấy)
 * mà hôm nay có bé, mỗi phòng thêm daXoa. rooms = MỌI phòng kể cả đã xoá; patients = bé hôm nay.
 * Dùng phongChoXem nên phòng không tìm thấy mang tên 'Phòng đã xoá'.
 */
export function phongHomNay(rooms, patients) {
  const ps = (patients || []).filter((p) => p && !p.deleted);
  return phongChoXem(rooms || [], ps).map((r) => ({ ...r, daXoa: !!r.deleted }));
}