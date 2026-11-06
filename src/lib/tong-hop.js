// Tổng hợp y lệnh nhiều ngày (v9.5). Hàm thuần, không chạm giao diện hay CSDL.
// Tuổi của MỖI dòng bé tính theo examDate của chính dòng đó (không dùng hôm nay, không dùng đầu/cuối khoảng).
import { tuoiCuaDong } from './clinical.js';
import { p2, parseIso } from './dates.js';
import { soSanhBe } from './thu-tu.js';
import { soNgayKhoang } from './lich.js';

const alive = (r) => !r.deleted;
const TEN_PHONG_MAT = 'Phòng đã xoá';

const dm = (iso) => { const d = parseIso(iso); return p2(d.getDate()) + '/' + p2(d.getMonth() + 1); };
const dmy = (iso) => dm(iso) + '/' + parseIso(iso).getFullYear();

/**
 * Các phòng cần hiện khi xem bé (kể cả bé ở phòng đã xoá): phòng còn sống theo thứ tự,
 * rồi phòng đã xoá mà có bé, rồi phòng không tìm thấy (tên 'Phòng đã xoá').
 * Gọi lại với kết quả của chính nó vẫn ra đúng kết quả đó.
 */
export function phongChoXem(tatCaPhong, patients) {
  const theoOrder = (ds) => ds
    .map((r, i) => [r, i])
    .sort((a, b) => ((a[0].order || 0) - (b[0].order || 0)) || (a[1] - b[1]))
    .map(([r]) => r);
  const coBe = new Set(patients.map((p) => p.roomId));
  const biet = new Set(tatCaPhong.map((r) => r.id));
  const song = theoOrder(tatCaPhong.filter(alive));
  const daXoa = theoOrder(tatCaPhong.filter((r) => !alive(r) && coBe.has(r.id)));
  const matDau = [...coBe].filter((id) => !biet.has(id)).sort()
    .map((id) => ({ id, name: TEN_PHONG_MAT, order: Number.MAX_SAFE_INTEGER, deleted: true }));
  return [...song, ...daXoa, ...matDau];
}

/** So sánh tự nhiên, không phân biệt hoa thường: G2 trước G10. */
function soTuNhien(a, b) {
  const ta = a.toLowerCase().match(/\d+|\D+/g) || [];
  const tb = b.toLowerCase().match(/\d+|\D+/g) || [];
  for (let i = 0; i < Math.min(ta.length, tb.length); i++) {
    const x = ta[i], y = tb[i];
    if (x === y) continue;
    const sx = /^\d/.test(x), sy = /^\d/.test(y);
    if (sx && sy) { const n = +x - +y; if (n) return n; if (x.length !== y.length) return x.length - y.length; continue; }
    return x < y ? -1 : 1;
  }
  return ta.length - tb.length;
}

const soDong = (a, b) => (a.examDate < b.examDate ? -1 : a.examDate > b.examDate ? 1 : soSanhBe(a.p, b.p));

/**
 * @param tuNgay, denNgay  'YYYY-MM-DD' (đưa ngược vẫn được)
 * @param rooms            tất cả phòng (kể cả đã xoá); hàm tự dùng phongChoXem
 * @param patients         bé của khoảng (mọi ngày); dòng đã xoá và bé ngoài khoảng bị bỏ
 * @param todosByPid       { [patientId]: việc[] }; việc đã xoá bị bỏ
 * @param cachXep          'ngay' | 'ma'
 * @returns { text, soNgay, soLuot, soMaGiuong, soBeChuaCoMa }
 *   soNgay = số ngày của khoảng (cả hai đầu); soLuot = số dòng bé; soMaGiuong = số nhóm phòng + mã (bé không mã mỗi dòng một nhóm).
 */
export function tongHopNhieuNgay({ tuNgay, denNgay, rooms, patients, todosByPid, cachXep = 'ma' }) {
  const [tu, den] = tuNgay <= denNgay ? [tuNgay, denNgay] : [denNgay, tuNgay];
  const soNgay = soNgayKhoang(tu, den);
  const ps = patients.filter((p) => alive(p) && p.examDate >= tu && p.examDate <= den);
  const dsPhong = phongChoXem(rooms, ps);
  const thuTuPhong = new Map(dsPhong.map((r, i) => [r.id, i]));
  const tenPhong = (id) => dsPhong[thuTuPhong.get(id)].name.toUpperCase();

  // Mỗi dòng bé thành một bản ghi đã dựng sẵn nội dung
  const dong = ps.map((p) => {
    const todos = (todosByPid?.[p.id] || []).filter(alive)
      .slice().sort((a, b) => (a.order || 0) - (b.order || 0) || (a.createdAt || 0) - (b.createdAt || 0));
    const noiDung = todos.length ? todos.map((t) => t.text + (t.done ? '' : ' (chưa xong)')).join('; ') : 'Tiếp tục y lệnh cũ';
    const c = tuoiCuaDong(p, parseIso(p.examDate)); // v9.6: ngày tính tuổi = ngayTinhTuoi(p) (bé sinh sau nửa đêm)
    const parts = [];
    if (!c.err) parts.push(c.pma);
    if (p.wt) parts.push(p.wt + ' g');
    parts.push(noiDung);
    const ma = String(p.code || '').trim();
    return { p, examDate: p.examDate, roomId: p.roomId, ma, noi: parts.join(' - '), ghiChu: p.note && p.note.trim() ? 'Ghi chú: ' + p.note.trim() : '' };
  });
  const dongLines = (d, truoc) => [truoc + d.noi, ...(d.ghiChu ? [d.ghiChu] : [])];

  // Nhóm theo phòng + mã (bé không mã: mỗi dòng một nhóm)
  const nhom = new Map();
  [...dong].sort(soDong).forEach((d, i) => {
    const key = d.ma ? d.roomId + '\u0000' + d.ma.toLowerCase() : d.roomId + '\u0000\u0001' + i;
    if (!nhom.has(key)) nhom.set(key, { roomId: d.roomId, ma: d.ma, dong: [] });
    nhom.get(key).dong.push(d);
  });
  const soMaGiuong = nhom.size;
  const soBeChuaCoMa = dong.filter((d) => !d.ma).length;

  const base = { soNgay, soLuot: dong.length, soMaGiuong, soBeChuaCoMa };
  if (!dong.length) return { ...base, text: 'Chưa có bệnh nhân trong khoảng này.' };

  const khac = tu.slice(0, 4) !== den.slice(0, 4);
  const dau = 'TỔNG HỢP ' + (khac ? dmy(tu) : dm(tu)) + ' - ' + dmy(den);
  const khoi = [];

  if (cachXep === 'ngay') {
    const ngays = [...new Set(dong.map((d) => d.examDate))].sort();
    for (const ngay of ngays) {
      const trongNgay = dong.filter((d) => d.examDate === ngay).sort((a, b) => soSanhBe(a.p, b.p));
      const cacPhong = dsPhong.filter((r) => trongNgay.some((d) => d.roomId === r.id));
      cacPhong.forEach((r, i) => {
        const lines = [];
        if (i === 0) lines.push('NGÀY ' + dm(ngay));
        lines.push(tenPhong(r.id));
        for (const d of trongNgay.filter((x) => x.roomId === r.id)) lines.push(...dongLines(d, (d.ma || 'Chưa có mã') + ': '));
        khoi.push(lines.join('\n'));
      });
    }
  } else {
    const ds = [...nhom.values()].sort((a, b) => {
      if (a.roomId !== b.roomId) return thuTuPhong.get(a.roomId) - thuTuPhong.get(b.roomId);
      if (!!a.ma !== !!b.ma) return a.ma ? -1 : 1; // bé có mã trước, bé chưa có mã sau
      if (a.ma) return soTuNhien(a.ma, b.ma);
      return soDong(a.dong[0], b.dong[0]);
    });
    for (const g of ds) {
      const lines = [tenPhong(g.roomId) + ' - ' + (g.ma || 'Chưa có mã')];
      for (const d of g.dong) lines.push(...dongLines(d, dm(d.examDate) + ': '));
      khoi.push(lines.join('\n'));
    }
  }

  const text = [dau, 'Tuổi thai ghi là tuổi thai hiệu chỉnh của từng ngày.', '', khoi.join('\n\n')].join('\n');
  return { ...base, text };
}
