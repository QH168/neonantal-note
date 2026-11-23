// Luật xoá phòng và lưới an toàn danh sách phòng hôm nay (phiếu 2026-11-09). Hàm thuần: không chạm giao diện/CSDL.
// Ngày là chuỗi YYYY-MM-DD nên so sánh chuỗi là đúng thứ tự thời gian (qua tháng, qua năm).
import { phongChoXem } from './tong-hop.js';
import { chonChepMotBe } from './hai-ngay.js';
import { sapBe, orderTiepTheo } from './thu-tu.js';
import { alive } from './chung.js';

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

// ---------- Chép cả phòng của một ngày trước sang hôm nay (phiếu 2026-11-22, mục E) ----------
// Luật thuần: không chạm CSDL. actions.js (chepPhongSangHomNay) đọc dữ liệu, gọi hàm này rồi ghi trong MỘT giao dịch.

const khoaTenPhong = (s) => String(s ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Phòng đích khi chép. rooms = MỌI phòng (kể cả đã xoá). Phòng còn sống → chính nó. Phòng đã xoá → phòng còn sống CÙNG TÊN
 * (không phân biệt hoa thường, khoảng trắng), nhiều phòng trùng tên thì lấy phòng có order nhỏ nhất. Không có → null.
 * @returns { room, doiPhong: bool } | null
 */
export function phongDichChep(rooms, roomId) {
  const goc = (rooms || []).find((r) => r && r.id === roomId);
  if (!goc) return null;
  if (!goc.deleted) return { room: goc, doiPhong: false };
  const ten = khoaTenPhong(goc.name);
  const cungTen = (rooms || [])
    .filter((r) => r && !r.deleted && r.id !== goc.id && khoaTenPhong(r.name) === ten)
    .sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.id).localeCompare(String(b.id)));
  return cungTen.length ? { room: cungTen[0], doiPhong: true } : null;
}

/**
 * Kế hoạch chép MỌI bé còn sống của phòng `roomId` ở ngày `tuNgay` sang `homNay`.
 *  - rooms: mọi phòng (kể cả đã xoá); beNguon: bé của ngày tuNgay (mọi phòng cũng được, tự lọc); cur: bé hôm nay;
 *    viecTheoBe: { [patientId]: todo[] } của các bé nguồn (todo đã xoá tự bỏ).
 *  - Luật không trùng = chonChepMotBe (cùng phòng + mã không phân biệt hoa thường; copiedFrom; kể cả bé vừa được lên kế hoạch trong lần này).
 *  - Chép bé + ghi chú + TẤT CẢ việc còn sống (kể cả đã xong, giữ done/doneAt). KHÔNG mang daNhapMay.
 * @returns { ok: false, ly } | { ok: true, phongDich, doiPhong, ke: [{ nguonId, be, viec }], soBe, soViec, boQua: [{ id, ly }] }
 *   ly (ok:false): 'ngay-sai' | 'khong-thay-phong' | 'phong-xoa-khong-co-phong-cung-ten'
 *   ly (boQua[]): 'trung'
 */
export function lapKeHoachChepPhong({ rooms, roomId, beNguon, cur, viecTheoBe, tuNgay, homNay }) {
  if (!DANG_NGAY.test(String(tuNgay)) || !DANG_NGAY.test(String(homNay)) || tuNgay >= homNay) return { ok: false, ly: 'ngay-sai' };
  const pd = phongDichChep(rooms, roomId);
  if (!pd) {
    const goc = (rooms || []).find((r) => r && r.id === roomId);
    return { ok: false, ly: goc ? 'phong-xoa-khong-co-phong-cung-ten' : 'khong-thay-phong' };
  }
  const roomIds = new Set([pd.room.id]);
  const hienCo = [...(cur || [])];
  let order = orderTiepTheo(hienCo.filter(alive));
  const ke = [];
  const boQua = [];
  let soViec = 0;
  const nguon = sapBe((beNguon || []).filter((p) => alive(p) && p.roomId === roomId && p.examDate === tuNgay));
  for (const p of nguon) {
    const luat = chonChepMotBe({ src: { ...p, roomId: pd.room.id }, cur: hienCo, roomIds, homNay });
    if (!luat.ok) { boQua.push({ id: p.id, ly: luat.ly }); continue; }
    const be = {
      roomId: pd.room.id, examDate: homNay, code: p.code, dob: p.dob, ga: p.ga, wt: p.wt,
      note: typeof p.note === 'string' ? p.note : '', done: false, copiedFrom: p.id, order: order++
    };
    const viec = [...(viecTheoBe?.[p.id] || [])].filter(alive)
      .sort((a, b) => (a.order || 0) - (b.order || 0) || (a.createdAt || 0) - (b.createdAt || 0) || String(a.id ?? '').localeCompare(String(b.id ?? '')))
      .map((t, i) => ({ text: t.text, done: !!t.done, doneAt: t.done && typeof t.doneAt === 'number' ? t.doneAt : null, order: i + 1 }));
    soViec += viec.length;
    ke.push({ nguonId: p.id, be, viec });
    hienCo.push({ ...be, id: '__ke-' + p.id }); // để bé sau trong cùng lượt không trùng bé vừa lên kế hoạch
  }
  return { ok: true, phongDich: pd.room, doiPhong: pd.doiPhong, ke, soBe: ke.length, soViec, boQua };
}
