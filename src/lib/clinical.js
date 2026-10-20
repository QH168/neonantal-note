// Tính tuần tuổi và soạn tổng hợp y lệnh. Giữ đúng quy tắc của prototype.
import { p2 } from './dates.js';

/** '346' → { w: 34, d: 6, days: 244 }; sai định dạng → null */
export function parseGa(ga) {
  const m = /^(\d{2})(\d)$/.exec(String(ga || '').trim());
  if (!m) return null;
  const w = +m[1], d = +m[2];
  if (d > 6 || w < 20 || w > 45) return null;
  return { w, d, days: w * 7 + d };
}

export function gaFmt(ga) {
  const g = parseGa(ga);
  return g ? `${g.w}w${g.d}d` : '';
}

/**
 * Ngày tuổi, tuổi thai hiệu chỉnh, số ngày đến 40w.
 * dob dạng ddmm; năm = năm nay, nếu ra ngày tương lai thì lùi về năm trước.
 */
export function calcAge(p, now = new Date()) {
  const g = parseGa(p.ga);
  if (!g) return { err: 'Tuổi thai nhập dạng 346 (nghĩa là 34w6d).' };
  const m = /^(\d{2})(\d{2})$/.exec(String(p.dob || '').trim());
  if (!m) return { err: 'Ngày sinh nhập dạng ddmm, ví dụ 0510.' };
  const dd = +m[1], mm = +m[2];
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let dob = new Date(now.getFullYear(), mm - 1, dd);
  if (mm < 1 || mm > 12 || dob.getDate() !== dd) return { err: 'Ngày sinh không hợp lệ.' };
  if (dob > t0) dob = new Date(now.getFullYear() - 1, mm - 1, dd);
  const age = Math.round((t0 - dob) / 86400000);
  const tot = g.days + age;
  const left = 280 - tot;
  return {
    days: age + ' ngày',
    pma: Math.floor(tot / 7) + 'w' + (tot % 7) + 'd',
    to40: left > 0 ? 'Còn ' + left + ' ngày đến 40w' : left === 0 ? 'Vừa đủ 40w hôm nay' : 'Đã qua 40w ' + -left + ' ngày'
  };
}

/**
 * Soạn văn bản tổng hợp y lệnh.
 * @param rooms     phòng theo thứ tự
 * @param patients  bệnh nhân hôm nay
 * @param todosByPid { [patientId]: todo[] } (đã sắp thứ tự)
 */
export function buildSummary({ rooms, patients, todosByPid, now = new Date() }) {
  const dateStr = p2(now.getDate()) + '/' + p2(now.getMonth() + 1) + '/' + now.getFullYear();
  let nTodo = 0, nPat = 0;
  const blocks = [];
  rooms.forEach((r) => {
    const ps = patients.filter((p) => p.roomId === r.id);
    if (!ps.length) return;
    const rb = [r.name.toUpperCase()];
    ps.forEach((p, i) => {
      const pend = (todosByPid[p.id] || []).filter((t) => !t.done);
      const c = calcAge(p, now);
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
  if (!blocks.length) return 'KHÁM SÁNG ' + dateStr + '\nChưa có bệnh nhân trong danh sách hôm nay.';
  return [
    'KHÁM SÁNG ' + dateStr + ' - Y LỆNH',
    'Tuổi thai ghi là tuổi thai hiệu chỉnh hôm nay.',
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
