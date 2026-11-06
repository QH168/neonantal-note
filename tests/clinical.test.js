import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGa, gaFmt, calcAge, buildSummary, ngayTinhTuoi, tuoiCuaDong } from '../src/lib/clinical.js';
import { addDays, isoOf } from '../src/lib/dates.js';

const NOW = new Date(2026, 9, 20); // 20/10/2026

test('đọc tuổi thai dạng 346', () => {
  assert.deepEqual(parseGa('346'), { w: 34, d: 6, days: 244 });
  assert.equal(parseGa('347'), null);   // ngày > 6
  assert.equal(parseGa('19 0'), null);
  assert.equal(gaFmt('320'), '32w0d');
});

test('tính ngày tuổi và tuổi thai hiệu chỉnh', () => {
  // sinh 08/10, 34w6d → 12 ngày tuổi → 244+12 = 256 = 36w4d, còn 24 ngày đến 40w
  const r = calcAge({ dob: '0810', ga: '346' }, NOW);
  assert.equal(r.days, '12 ngày');
  assert.equal(r.pma, '36w4d');
  assert.equal(r.to40, undefined); // không còn hiện "còn bao nhiêu ngày đến 40w"
});

test('ngày sinh "tương lai" được hiểu là năm trước; ngày sai báo lỗi', () => {
  const r = calcAge({ dob: '2512', ga: '280' }, NOW); // 25/12/2025
  assert.equal(r.days, '299 ngày');
  assert.ok(calcAge({ dob: '3102', ga: '346' }, NOW).err);
  assert.ok(calcAge({ dob: '0810', ga: '4' }, NOW).err);
});

test('tổng hợp y lệnh', () => {
  const rooms = [{ id: 'r1', name: 'Phòng 1' }, { id: 'r2', name: 'Phòng 2' }];
  const patients = [
    { id: 'a', roomId: 'r1', code: 'Giường 1', dob: '0810', ga: '346', wt: '1850', note: 'Theo dõi cân' },
    { id: 'b', roomId: 'r1', code: 'Giường 3', dob: '', ga: '', wt: '' }
  ];
  const todosByPid = { a: [{ text: 'Cân bé', done: true }, { text: 'Cập nhật y lệnh', done: false }] };
  const s = buildSummary({ rooms, patients, todosByPid, now: NOW });
  assert.match(s, /^KHÁM SÁNG 20\/10\/2026 - Y LỆNH/);
  assert.match(s, /Còn 1 việc ở 1 bệnh nhân\./);
  assert.match(s, /PHÒNG 1\nGiường 1 - 36w4d - 1850 g\n- Cập nhật y lệnh\nGhi chú: Theo dõi cân\n\nGiường 3 - Tiếp tục y lệnh cũ/);
  assert.doesNotMatch(s, /PHÒNG 2/);
});

test('cộng ngày qua tháng', () => {
  assert.equal(addDays('2026-11-01', -1), '2026-10-31');
  assert.equal(isoOf(new Date(2026, 0, 5)), '2026-01-05');
});

test('nhập tuổi thai theo nhiều cách', () => {
  for (const s of ['346', '34w6d', '34w6', '34+6', '34 6', '34.6', '34,6', '34/6', '3406', '34 tuần 6 ngày', ' 346 ']) {
    assert.deepEqual(parseGa(s), { w: 34, d: 6, days: 244 }, s);
  }
  assert.deepEqual(parseGa('34'), { w: 34, d: 0, days: 238 });
  assert.equal(parseGa('347'), null);
  assert.equal(parseGa('196'), null);
  assert.equal(parseGa(''), null);
});

test('nhập ngày sinh theo nhiều cách', () => {
  for (const s of ['0810', '08/10', '8/10', '8-10', '8.10', '08/10/2026', '081026', '08102026']) {
    const r = calcAge({ dob: s, ga: '346' }, NOW);
    assert.equal(r.days, '12 ngày', s);
  }
  assert.match(calcAge({ dob: '', ga: '346' }, NOW).err, /Chưa nhập ngày sinh/);
  assert.match(calcAge({ dob: '0810', ga: '' }, NOW).err, /Chưa nhập tuổi thai/);
  assert.match(calcAge({ dob: '0810', ga: '34x' }, NOW).err, /Chưa đọc được tuổi thai "34x"/);
  assert.match(calcAge({ dob: '01/12/2026', ga: '346' }, NOW).err, /sau ngày hôm nay/);
});

test('6 ví dụ đã thống nhất (tính ngày 21/10/2026)', () => {
  const now = new Date(2026, 9, 21);
  const cases = [
    ['0508', '25', '77 ngày', '36w0d'],
    ['2110', '346', '0 ngày', '34w6d'],
    ['1410', '286', '7 ngày', '29w6d'],
    ['0109', '240', '50 ngày', '31w1d'],
    ['2009', '320', '31 ngày', '36w3d'],
    ['0410', '390', '17 ngày', '41w3d']
  ];
  for (const [dob, ga, days, pma] of cases) {
    assert.deepEqual(calcAge({ dob, ga }, now), { days, pma }, dob + ' ' + ga);
  }
});

test('v9.5: buildSummary không truyền ngayTruoc cho văn bản y như cũ từng chữ', () => {
  const rooms = [{ id: 'r1', name: 'Phòng 1' }, { id: 'r2', name: 'Phòng 2' }];
  const patients = [
    { id: 'a', roomId: 'r1', code: 'Giường 1', dob: '0810', ga: '346', wt: '1850', note: 'Theo dõi cân' },
    { id: 'b', roomId: 'r1', code: 'Giường 3', dob: '', ga: '', wt: '' }
  ];
  const todosByPid = { a: [{ text: 'Cân bé', done: true }, { text: 'Cập nhật y lệnh', done: false }] };
  // Bản cũ, ghi tay từng chữ (20/10/2026: sinh 08/10 = 12 ngày tuổi, 244 + 12 = 256 = 36w4d)
  const CU = [
    'KHÁM SÁNG 20/10/2026 - Y LỆNH',
    'Tuổi thai ghi là tuổi thai hiệu chỉnh hôm nay.',
    'Còn 1 việc ở 1 bệnh nhân.',
    '',
    'PHÒNG 1',
    'Giường 1 - 36w4d - 1850 g',
    '- Cập nhật y lệnh',
    'Ghi chú: Theo dõi cân',
    '',
    'Giường 3 - Tiếp tục y lệnh cũ'
  ].join('\n');
  assert.equal(buildSummary({ rooms, patients, todosByPid, now: NOW }), CU);
  assert.equal(buildSummary({ rooms, patients, todosByPid, now: NOW, ngayTruoc: false }), CU);
  assert.equal(buildSummary({ rooms, patients: [], todosByPid: {}, now: NOW }),
    'KHÁM SÁNG 20/10/2026\nChưa có bệnh nhân trong danh sách hôm nay.');
});

test('v9.5: buildSummary ngayTruoc: true đổi đúng dòng hai và câu danh sách trống', () => {
  const rooms = [{ id: 'r1', name: 'Phòng 1' }];
  const patients = [{ id: 'a', roomId: 'r1', code: 'Giường 1', dob: '0810', ga: '346', wt: '1850', note: '' }];
  const todosByPid = { a: [{ text: 'Cập nhật y lệnh', done: false }] };
  const ngay = new Date(2026, 10, 3); // 03/11/2026: sinh 08/10 = 23 + 3 = 26 ngày tuổi; 244 + 26 = 270 = 38w4d
  assert.equal(buildSummary({ rooms, patients, todosByPid, now: ngay, ngayTruoc: true }), [
    'KHÁM SÁNG 03/11/2026 - Y LỆNH',
    'Tuổi thai ghi là tuổi thai hiệu chỉnh ngày 03/11.',
    'Còn 1 việc ở 1 bệnh nhân.',
    '',
    'PHÒNG 1',
    'Giường 1 - 38w4d - 1850 g',
    '- Cập nhật y lệnh'
  ].join('\n'));
  assert.equal(buildSummary({ rooms, patients: [], todosByPid: {}, now: ngay, ngayTruoc: true }),
    'KHÁM SÁNG 03/11/2026\nChưa có bệnh nhân trong danh sách ngày này.');
});

// ---- v9.6: ngày tính tuổi của dòng đã qua (bé sinh sau nửa đêm). Kết quả mong đợi tính tay, không gọi calcAge để sinh ra. ----
const gio = (y, m, d, h = 0, mi = 0, s = 0, ms = 0) => new Date(y, m - 1, d, h, mi, s, ms).getTime(); // giờ máy

test('v9.6 ngayTinhTuoi: createdAt 02:30 ngày 05/11 và examDate 04/11 thì lấy ngày lịch của createdAt', () => {
  assert.equal(ngayTinhTuoi({ examDate: '2026-11-04', createdAt: gio(2026, 11, 5, 2, 30) }), '2026-11-05');
});

test('v9.6 ngayTinhTuoi: dữ liệu cũ tạo đúng ngày cho kết quả như trước', () => {
  assert.equal(ngayTinhTuoi({ examDate: '2026-10-21', createdAt: gio(2026, 10, 21, 9, 0) }), '2026-10-21');
  assert.equal(ngayTinhTuoi({ examDate: '2026-11-04', createdAt: gio(2026, 11, 4, 23, 59, 59, 999) }), '2026-11-04');
  assert.equal(ngayTinhTuoi({ examDate: '2026-11-04', createdAt: gio(2026, 11, 4, 0, 0) }), '2026-11-04');
});

test('v9.6 ngayTinhTuoi: createdAt sớm hơn examDate thì giữ examDate', () => {
  assert.equal(ngayTinhTuoi({ examDate: '2026-10-21', createdAt: gio(2026, 10, 20, 23, 0) }), '2026-10-21');
  assert.equal(ngayTinhTuoi({ examDate: '2026-10-21', createdAt: 1 }), '2026-10-21');
});

test('v9.6 ngayTinhTuoi: không có createdAt hoặc createdAt hỏng thì lấy examDate', () => {
  for (const c of [undefined, null, 0, NaN, '', 'abc', -5]) {
    assert.equal(ngayTinhTuoi({ examDate: '2026-11-04', createdAt: c }), '2026-11-04', JSON.stringify(c));
  }
  assert.equal(ngayTinhTuoi({ examDate: '2026-11-04' }), '2026-11-04');
});

test('v9.6 ngayTinhTuoi: tính theo ngày lịch giờ máy, không UTC (00:30 và 00:00 đúng nửa đêm)', () => {
  assert.equal(ngayTinhTuoi({ examDate: '2026-11-04', createdAt: gio(2026, 11, 5, 0, 30) }), '2026-11-05');
  assert.equal(ngayTinhTuoi({ examDate: '2026-11-04', createdAt: gio(2026, 11, 5, 0, 0) }), '2026-11-05');
  assert.equal(ngayTinhTuoi({ examDate: '2026-12-31', createdAt: gio(2027, 1, 1, 1, 0) }), '2027-01-01');
  assert.equal(ngayTinhTuoi({ examDate: '2028-02-28', createdAt: gio(2028, 2, 29, 3, 0) }), '2028-02-29');
});

test('v9.6 ngayTinhTuoi: thiếu examDate thì dùng ngày lịch của createdAt, thiếu cả hai thì null', () => {
  assert.equal(ngayTinhTuoi({ createdAt: gio(2026, 11, 5, 2, 30) }), '2026-11-05');
  assert.equal(ngayTinhTuoi({}), null);
  assert.equal(ngayTinhTuoi(null), null);
});

test('v9.6 bẫy nửa đêm: sinh "0511", GA 342, ghi 02:30 ngày 05/11 với examDate 04/11 → 0 ngày, 34w2d (không phải 364 ngày)', () => {
  // Tính tay: 34*7+2 = 240 ngày; ngày tính 05/11, sinh 05/11 → 0 ngày tuổi → 240 = 34w2d.
  const p = { dob: '0511', ga: '342', examDate: '2026-11-04', createdAt: gio(2026, 11, 5, 2, 30) };
  assert.deepEqual(tuoiCuaDong(p), { days: '0 ngày', pma: '34w2d' });
  // Cách cũ (tính theo examDate): 05/11 sau 04/11 nên lùi một năm, ra 05/11/2025 → 364 ngày. Giữ làm bằng chứng của cái bẫy.
  assert.equal(calcAge(p, new Date(2026, 10, 4)).days, '364 ngày');
});

test('v9.6 tuoiCuaDong qua năm: sinh "3112", GA 300, ghi 01:00 ngày 01/01/2027 với examDate 31/12/2026 → 1 ngày, 30w1d', () => {
  // 30*7 = 210; sinh 31/12/2026, ngày tính 01/01/2027 → 1 ngày → 211 = 30w1d.
  const p = { dob: '3112', ga: '300', examDate: '2026-12-31', createdAt: gio(2027, 1, 1, 1, 0) };
  assert.deepEqual(tuoiCuaDong(p), { days: '1 ngày', pma: '30w1d' });
});

test('v9.6 tuoiCuaDong ngày nhuận: sinh "2902", GA 280, ghi 03:00 ngày 29/02/2028 với examDate 28/02 → 0 ngày, 28w0d', () => {
  // 28*7 = 196 → 28w0d.
  const p = { dob: '2902', ga: '280', examDate: '2028-02-28', createdAt: gio(2028, 2, 29, 3, 0) };
  assert.deepEqual(tuoiCuaDong(p), { days: '0 ngày', pma: '28w0d' });
});

test('v9.6 tuoiCuaDong: dòng cũ tạo đúng ngày ra đúng kết quả của ca chuẩn (77 ngày, 36w0d)', () => {
  // Ca chuẩn đã thống nhất: tính ngày 21/10/2026, sinh 0508, 25 tuần → 77 ngày, 36w0d.
  const p = { dob: '0508', ga: '25', examDate: '2026-10-21', createdAt: gio(2026, 10, 21, 9, 0) };
  assert.deepEqual(tuoiCuaDong(p), { days: '77 ngày', pma: '36w0d' });
});

test('v9.6 tuoiCuaDong: không có examDate thì tính theo now truyền vào', () => {
  const p = { dob: '0508', ga: '25' };
  assert.deepEqual(tuoiCuaDong(p, new Date(2026, 9, 21, 9, 0)), { days: '77 ngày', pma: '36w0d' });
});

test('v9.6 tuoiCuaDong: báo lỗi như calcAge khi thiếu tuổi thai', () => {
  const r = tuoiCuaDong({ dob: '0511', ga: '', examDate: '2026-11-04', createdAt: gio(2026, 11, 5, 2, 30) });
  assert.ok(r.err);
});

test('v9.6 buildSummary ngayTruoc: bé sinh sau nửa đêm có tuổi đúng theo ngày ghi, không lùi một năm', () => {
  const rooms = [{ id: 'r1', name: 'Phòng 1' }];
  const patients = [{ id: 'a', roomId: 'r1', code: 'G05', dob: '0511', ga: '342', wt: '1950', note: '', examDate: '2026-11-04', createdAt: gio(2026, 11, 5, 2, 30) }];
  assert.equal(buildSummary({ rooms, patients, todosByPid: {}, now: new Date(2026, 10, 4), ngayTruoc: true }), [
    'KHÁM SÁNG 04/11/2026 - Y LỆNH',
    'Tuổi thai ghi là tuổi thai hiệu chỉnh ngày 04/11.',
    'Không có việc mới, tiếp tục y lệnh cũ.',
    '',
    'PHÒNG 1',
    'G05 - 34w2d - 1950 g - Tiếp tục y lệnh cũ'
  ].join('\n'));
});

test('v9.6 buildSummary hôm nay (không ngayTruoc) vẫn tính theo ngày lịch của now, kể cả khi dòng có createdAt', () => {
  const rooms = [{ id: 'r1', name: 'Phòng 1' }];
  const patients = [{ id: 'a', roomId: 'r1', code: 'G05', dob: '0511', ga: '342', wt: '', note: '', examDate: '2026-11-04', createdAt: gio(2026, 11, 5, 2, 30) }];
  // Đang 02:30 ngày 05/11 (ngày làm việc là 04/11): tuổi theo NGÀY LỊCH 05/11 → 0 ngày, 34w2d.
  const txt = buildSummary({ rooms, patients, todosByPid: {}, now: new Date(2026, 10, 5, 2, 30) });
  assert.ok(txt.includes('G05 - 34w2d - Tiếp tục y lệnh cũ'), txt);
});
