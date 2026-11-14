// Tính tuần tuổi và soạn tổng hợp y lệnh. Giữ đúng quy tắc của prototype.
import { p2, parseIso, ngayLichCuaMs } from './dates.js';
import { nhomTheo } from './chung.js';

/**
 * Đọc tuổi thai lúc sinh. Chấp nhận: 346, 34w6d, 34w6, 34+6, 34 6, 34.6, 34,6, 34/6, 34 (= 34w0d).
 * Trả về { w, d, days } hoặc null nếu không hợp lệ.
 */
export function parseGa(ga) {
  const s = String(ga || '').trim().toLowerCase().replace(/tuần|tuan/g, 'w').replace(/ngày|ngay/g, 'd');
  const m = /^(\d{2})\s*(?:w|\+|\.|,|\/|-|\s)?\s*(\d{1,2})?\s*d?$/.exec(s);
  if (!m) return null;
  const w = +m[1], d = m[2] === undefined ? 0 : +m[2];
  if (d > 6 || w < 20 || w > 45) return null;
  return { w, d, days: w * 7 + d };
}

/**
 * Đọc ngày sinh. Chấp nhận: 0810, 08/10, 8/10, 8-10, 8.10, 08/10/2026, 081026, 08102026.
 * Không ghi năm: lấy năm nay, nếu ra ngày tương lai thì lùi về năm trước.
 */
export function parseDob(dob, now = new Date()) {
  const s = String(dob || '').trim();
  let m = /^(\d{1,2})\s*[\/\-.\s]\s*(\d{1,2})(?:\s*[\/\-.\s]\s*(\d{2}|\d{4}))?$/.exec(s)
    || /^(\d{2})(\d{2})(\d{2}|\d{4})?$/.exec(s);
  if (!m) return { err: 'Ngày sinh nhập dạng ngày + tháng, ví dụ 0810 hoặc 08/10.' };
  const dd = +m[1], mm = +m[2];
  let y = m[3] ? +m[3] : null;
  if (y !== null && y < 100) y += 2000;
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let d = new Date(y ?? now.getFullYear(), mm - 1, dd);
  if (mm < 1 || mm > 12 || d.getDate() !== dd) return { err: `Ngày sinh "${s}" không có thật, hãy kiểm tra lại.` };
  if (y === null && d > t0) d = new Date(now.getFullYear() - 1, mm - 1, dd);
  if (d > t0) return { err: 'Ngày sinh đang sau ngày hôm nay, hãy kiểm tra lại.' };
  return { date: d };
}

export function gaFmt(ga) {
  const g = parseGa(ga);
  return g ? `${g.w}w${g.d}d` : '';
}

/**
 * Ngày tuổi và tuổi thai hiệu chỉnh.
 * dob dạng ddmm; năm = năm nay, nếu ra ngày tương lai thì lùi về năm trước.
 */
export function calcAge(p, now = new Date()) {
  const g = parseGa(p.ga);
  if (!g) {
    return { err: String(p.ga || '').trim()
      ? `Chưa đọc được tuổi thai "${String(p.ga).trim()}". Nhập ví dụ 346, 34w6d hoặc 34+6 (từ 20 đến 45 tuần).`
      : 'Chưa nhập tuổi thai lúc sinh (ví dụ 346 = 34w6d).' };
  }
  if (!String(p.dob || '').trim()) return { err: 'Chưa nhập ngày sinh (ví dụ 0810 = 08/10).' };
  const b = parseDob(p.dob, now);
  if (b.err) return { err: b.err };
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dob = b.date;
  const age = Math.round((t0 - dob) / 86400000);
  const tot = g.days + age;
  return {
    days: age + ' ngày',
    pma: Math.floor(tot / 7) + 'w' + (tot % 7) + 'd' // luôn ghi đủ tuần + ngày, ví dụ 36w0d, 36w3d
  };
}

const laIso = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * Ngày dùng để tính tuổi cho một DÒNG BÉ ĐÃ QUA (xem lại ngày trước, tổng hợp nhiều ngày, giao tour) — v9.6.
 * Bé ghi sau nửa đêm thuộc ngày làm việc trước (examDate lùi một ngày) nhưng sinh ra "hôm nay" theo lịch; tính tuổi theo
 * examDate thì ngày sinh rơi vào tương lai và parseDob lùi một năm (ra ~364 ngày). Nên lấy ngày lịch (giờ máy) của createdAt
 * nếu muộn hơn examDate, không thì examDate. Không có createdAt hợp lệ → examDate. Thiếu cả hai → null.
 * Dòng cũ tạo đúng ngày: createdAt cùng ngày với examDate nên kết quả y như trước.
 * @returns 'YYYY-MM-DD' hoặc null
 */
export function ngayTinhTuoi(p) {
  const exam = laIso(p?.examDate) ? p.examDate : null;
  const c = p?.createdAt;
  const ngayTao = typeof c === 'number' && Number.isFinite(c) && c > 0 ? ngayLichCuaMs(c) : null;
  if (exam && ngayTao) return ngayTao > exam ? ngayTao : exam;
  return exam || ngayTao || null;
}

/**
 * Tuổi của một dòng bé đã qua, theo ngayTinhTuoi(p). Dòng không có ngày nào thì tính theo `now`.
 * Trả giống calcAge: { days, pma } hoặc { err }.
 */
export function tuoiCuaDong(p, now = new Date()) {
  const iso = ngayTinhTuoi(p);
  return calcAge(p, iso ? parseIso(iso) : now);
}

/**
 * Soạn văn bản tổng hợp y lệnh.
 * @param rooms     phòng theo thứ tự
 * @param patients  bệnh nhân hôm nay
 * @param todosByPid { [patientId]: todo[] } (đã sắp thứ tự)
 */
export function buildSummary({ rooms, patients, todosByPid, now = new Date(), ngayTruoc = false }) {
  const dateStr = p2(now.getDate()) + '/' + p2(now.getMonth() + 1) + '/' + now.getFullYear();
  let nTodo = 0, nPat = 0;
  const blocks = [];
  const theoPhong = nhomTheo(patients, (p) => p.roomId); // chia một lượt, không lọc lại cả danh sách cho từng phòng
  rooms.forEach((r) => {
    const ps = theoPhong.get(r.id);
    if (!ps) return;
    const rb = [r.name.toUpperCase()];
    ps.forEach((p, i) => {
      const pend = (todosByPid[p.id] || []).filter((t) => !t.done);
      // Hôm nay: theo ngày lịch của `now`. Ngày trước: theo ngày tính tuổi của chính dòng (bé sinh sau nửa đêm).
      const c = ngayTruoc ? tuoiCuaDong(p, now) : calcAge(p, now);
      const head = [p.code || 'Chưa có mã'];
      if (!c.err) head.push(c.pma);
      if (p.wt) head.push(p.wt + ' g');
      if (!pend.length) head.push('Tiếp tục y lệnh cũ');
      else { nTodo += pend.length; nPat += 1; }
      if (i > 0) rb.push('');
      rb.push(head.join(' - '));
      pend.forEach((t) => rb.push('- ' + t.text));
      if (p.note && p.note.trim()) rb.push('Ghi chú: ' + p.note.trim());
    });
    blocks.push(rb.join('\n'));
  });
  if (!blocks.length) return 'KHÁM SÁNG ' + dateStr + '\nChưa có bệnh nhân trong danh sách ' + (ngayTruoc ? 'ngày này.' : 'hôm nay.');
  return [
    'KHÁM SÁNG ' + dateStr + ' - Y LỆNH',
    ngayTruoc
      ? 'Tuổi thai ghi là tuổi thai hiệu chỉnh ngày ' + p2(now.getDate()) + '/' + p2(now.getMonth() + 1) + '.'
      : 'Tuổi thai ghi là tuổi thai hiệu chỉnh hôm nay.',
    nTodo > 0 ? 'Còn ' + nTodo + ' việc ở ' + nPat + ' bệnh nhân.' : 'Không có việc mới, tiếp tục y lệnh cũ.',
    '',
    blocks.join('\n\n')
  ].join('\n');
}

/** Chép văn bản vào bộ nhớ tạm; có cách dự phòng cho Safari cũ. */
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* thử cách dưới */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
