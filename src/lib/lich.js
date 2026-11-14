// Lịch (v9.5). Hàm thuần: không chạm giao diện hay CSDL. Ngày là chuỗi 'YYYY-MM-DD' theo giờ máy.
import { isoOf } from './dates.js';
import { alive } from './chung.js';

/**
 * Các ô của một tháng, T2 là đầu tuần, Chủ nhật ở cột cuối (chỉ số 6).
 * Trả về mảng các hàng (4 đến 6 hàng), mỗi hàng 7 ô { iso, ngay, trongThang, laChuNhat }.
 * Ô thuộc tháng trước/sau (để đủ hàng) có trongThang = false.
 * @param nam   năm đầy đủ, ví dụ 2026
 * @param thang 1..12
 */
export function taoOThang(nam, thang) {
  const dauThang = new Date(nam, thang - 1, 1);
  const lui = (dauThang.getDay() + 6) % 7; // T2 = 0 ... CN = 6
  const soNgay = new Date(nam, thang, 0).getDate();
  const soHang = Math.ceil((lui + soNgay) / 7);
  const tuan = [];
  for (let h = 0; h < soHang; h++) {
    const hang = [];
    for (let c = 0; c < 7; c++) {
      const d = new Date(nam, thang - 1, 1 - lui + h * 7 + c);
      hang.push({
        iso: isoOf(d),
        ngay: d.getDate(),
        trongThang: d.getMonth() === thang - 1 && d.getFullYear() === nam,
        laChuNhat: c === 6,
      });
    }
    tuan.push(hang);
  }
  return tuan;
}

/** { [iso]: số việc chưa xong } cho các ngày có việc chưa xong. Bỏ việc đã xong và dòng đã xoá. */
export function demViecChuaXong(tasks) {
  const out = {};
  for (const t of tasks) {
    if (!alive(t) || t.done || !t.date) continue;
    out[t.date] = (out[t.date] || 0) + 1;
  }
  return out;
}

/** Ngày LỚN NHẤT trước hôm nay còn việc chưa xong; không có thì null. */
export function ngaySotGanNhat(tasks, today) {
  let best = null;
  for (const t of tasks) {
    if (!alive(t) || t.done || !t.date || t.date >= today) continue;
    if (best === null || t.date > best) best = t.date;
  }
  return best;
}

/** { [iso]: số bé đã khám } (done = true), không tính dòng đã xoá. Tính theo examDate. */
export function demBeDaKham(patients) {
  const out = {};
  for (const p of patients) {
    if (!alive(p) || p.done !== true || !p.examDate) continue;
    out[p.examDate] = (out[p.examDate] || 0) + 1;
  }
  return out;
}

/**
 * Chọn khoảng ngày trên lịch. tt = { dau, cuoi } (null/undefined = chưa chọn). Trả trạng thái mới.
 * - chưa chọn → đặt đầu.
 * - đã có đầu, chưa cuối: chạm đúng ngày đầu → khoảng 1 ngày; chạm ngày sớm hơn → tự đảo; sau đó → đủ hai đầu.
 * - đã đủ hai đầu → bắt đầu lại từ ngày vừa chạm.
 */
export function chonKhoang(tt, iso) {
  const dau = tt?.dau ?? null, cuoi = tt?.cuoi ?? null;
  if (!dau || cuoi) return { dau: iso, cuoi: null };
  if (iso === dau) return { dau, cuoi: dau };
  if (iso < dau) return { dau: iso, cuoi: dau };
  return { dau, cuoi: iso };
}

/** Số ngày của khoảng a..b, tính cả hai đầu. Đếm theo ngày lịch nên không lệch khi qua tháng, qua năm hay đổi giờ. */
export function soNgayKhoang(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  const u1 = Date.UTC(y1, m1 - 1, d1), u2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round(Math.abs(u2 - u1) / 86400000) + 1;
}
