// Tổng hợp nhiều ngày (v9.5). Tuổi thai trong kết quả mong đợi đều tính tay và ghi thành hằng số,
// KHÔNG gọi calcAge để sinh ra. Cách tính tay ghi ngay cạnh từng ca.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tongHopNhieuNgay, phongChoXem } from '../src/lib/tong-hop.js';

const R1 = { id: 'r1', name: 'Phòng 1', order: 1 };
const R2 = { id: 'r2', name: 'Phòng 2', order: 2 };
const HEADER_2 = 'Tuổi thai ghi là tuổi thai hiệu chỉnh của từng ngày.';

let seq = 0;
const be = (roomId, examDate, over = {}) => ({
  id: over.id || 'p' + ++seq, roomId, examDate, code: '', dob: '', ga: '', wt: '', note: '', done: false, order: 1, createdAt: 1, ...over,
});
const vt = (id, text, over = {}) => ({ id, text, done: false, order: 1, ...over });

// ---- Dữ liệu theo bảng 16f ----
// G01: sinh 14/10, 35w0d lúc sinh (245 ngày). 02/11 = 19 ngày tuổi → 264 = 37w5d (37*7=259, +5).
// G03: sinh 04/10, 34w0d (238). 02/11 = 29 ngày tuổi → 267 = 38w1d (266+1).
// G12: sinh 11/10, 40w0d (280). 02/11 = 22 ngày tuổi → 302 = 43w1d (301+1).
function duLieuCanvas() {
  const patients = [];
  const todosByPid = {};
  const them = (roomId, code, dob, ga, order, ngay, wt, todos) => {
    const p = be(roomId, `2026-11-${ngay}`, { id: `${code}-${ngay}`, code, dob, ga, wt, order });
    patients.push(p);
    if (todos) todosByPid[p.id] = todos;
  };
  them('r1', 'G01', '1410', '350', 1, '02', '1800', [vt('a1', 'Đo bilirubin', { done: true })]);
  them('r1', 'G01', '1410', '350', 1, '03', '1820', []);
  them('r1', 'G01', '1410', '350', 1, '04', '1850', [vt('a3', 'Đo bilirubin')]);
  them('r1', 'G03', '0410', '340', 2, '02', '2040', [vt('b1', 'Tăng sữa 5 ml/cữ', { done: true })]);
  them('r1', 'G03', '0410', '340', 2, '03', '2060', [vt('b2', 'Siêu âm não xuyên thóp', { done: true })]);
  them('r1', 'G03', '0410', '340', 2, '04', '2080', [vt('b3', 'Tăng sữa 5 ml/cữ')]);
  them('r2', 'G12', '1110', '400', 1, '02', '3150', []);
  them('r2', 'G12', '1110', '400', 1, '03', '3180', []);
  them('r2', 'G12', '1110', '400', 1, '04', '3200', []);
  patients.reverse(); // đảo thứ tự đầu vào: kết quả không được phụ thuộc thứ tự mảng
  return { rooms: [R1, R2], patients, todosByPid };
}

const THEO_MA = [
  'TỔNG HỢP 02/11 - 04/11/2026',
  HEADER_2,
  '',
  'PHÒNG 1 - G01',
  '02/11: 37w5d - 1800 g - Đo bilirubin',                 // 264 = 37w5d
  '03/11: 37w6d - 1820 g - Tiếp tục y lệnh cũ',           // 265 = 37w6d (259+6)
  '04/11: 38w0d - 1850 g - Đo bilirubin (chưa xong)',     // 266 = 38w0d
  '',
  'PHÒNG 1 - G03',
  '02/11: 38w1d - 2040 g - Tăng sữa 5 ml/cữ',             // 267
  '03/11: 38w2d - 2060 g - Siêu âm não xuyên thóp',       // 268
  '04/11: 38w3d - 2080 g - Tăng sữa 5 ml/cữ (chưa xong)', // 269
  '',
  'PHÒNG 2 - G12',
  '02/11: 43w1d - 3150 g - Tiếp tục y lệnh cũ',           // 302
  '03/11: 43w2d - 3180 g - Tiếp tục y lệnh cũ',           // 303
  '04/11: 43w3d - 3200 g - Tiếp tục y lệnh cũ',           // 304
].join('\n');

test('theo mã giường: đúng bảng 16f, tuổi tính theo từng ngày, đếm đúng', () => {
  const r = tongHopNhieuNgay({ tuNgay: '2026-11-02', denNgay: '2026-11-04', ...duLieuCanvas(), cachXep: 'ma' });
  assert.equal(r.text, THEO_MA);
  assert.equal(r.soNgay, 3);
  assert.equal(r.soLuot, 9);
  assert.equal(r.soMaGiuong, 3);
});

test('theo ngày: nhóm NGÀY, trong đó PHÒNG, bé theo thứ tự order', () => {
  const r = tongHopNhieuNgay({ tuNgay: '2026-11-02', denNgay: '2026-11-04', ...duLieuCanvas(), cachXep: 'ngay' });
  const mong = [
    'TỔNG HỢP 02/11 - 04/11/2026',
    HEADER_2,
    '',
    'NGÀY 02/11',
    'PHÒNG 1',
    'G01: 37w5d - 1800 g - Đo bilirubin',
    'G03: 38w1d - 2040 g - Tăng sữa 5 ml/cữ',
    '',
    'PHÒNG 2',
    'G12: 43w1d - 3150 g - Tiếp tục y lệnh cũ',
    '',
    'NGÀY 03/11',
    'PHÒNG 1',
    'G01: 37w6d - 1820 g - Tiếp tục y lệnh cũ',
    'G03: 38w2d - 2060 g - Siêu âm não xuyên thóp',
    '',
    'PHÒNG 2',
    'G12: 43w2d - 3180 g - Tiếp tục y lệnh cũ',
    '',
    'NGÀY 04/11',
    'PHÒNG 1',
    'G01: 38w0d - 1850 g - Đo bilirubin (chưa xong)',
    'G03: 38w3d - 2080 g - Tăng sữa 5 ml/cữ (chưa xong)',
    '',
    'PHÒNG 2',
    'G12: 43w3d - 3200 g - Tiếp tục y lệnh cũ',
  ].join('\n');
  assert.equal(r.text, mong);
  assert.equal(r.soNgay, 3);
  assert.equal(r.soLuot, 9);
  assert.equal(r.soMaGiuong, 3);
});

test('qua năm, ngày sinh không ghi năm: tuổi từng ngày tính theo ngày đó (28/12/2026 - 02/01/2027)', () => {
  // Sinh 28/12 (không ghi năm), 32w0d (224 ngày). Mỗi ngày khám nằm ở năm khác nhau của cùng khoảng.
  // 28/12/2026: 0 ngày → 224 = 32w0d. 01/01/2027: sinh 28/12/2026, 4 ngày (29, 30, 31, 01) → 228 = 32w4d.
  // 02/01/2027: 5 ngày → 229 = 32w5d (224+5).
  const patients = [
    be('r1', '2026-12-28', { code: 'G05', dob: '2812', ga: '320', wt: '1900' }),
    be('r1', '2027-01-01', { code: 'G05', dob: '2812', ga: '320', wt: '1930' }),
    be('r1', '2027-01-02', { code: 'G05', dob: '2812', ga: '320', wt: '1950' }),
  ];
  const r = tongHopNhieuNgay({ tuNgay: '2026-12-28', denNgay: '2027-01-02', rooms: [R1], patients, todosByPid: {}, cachXep: 'ma' });
  assert.equal(r.text, [
    'TỔNG HỢP 28/12/2026 - 02/01/2027',
    HEADER_2,
    '',
    'PHÒNG 1 - G05',
    '28/12: 32w0d - 1900 g - Tiếp tục y lệnh cũ',
    '01/01: 32w4d - 1930 g - Tiếp tục y lệnh cũ',
    '02/01: 32w5d - 1950 g - Tiếp tục y lệnh cũ',
  ].join('\n'));
  assert.equal(r.soNgay, 6);
  assert.equal(r.soLuot, 3);
});

test('qua tháng và ngày sinh có đủ năm: sinh 15/10/2026, 40w0d; 04/11/2026 = 20 ngày tuổi → 300 = 42w6d', () => {
  // 15/10 → 31/10 = 16 ngày, → 04/11 = +4 = 20. 280 + 20 = 300 = 42*7 + 6.
  const patients = [be('r1', '2026-11-04', { code: 'G07', dob: '15/10/2026', ga: '400', wt: '3500' })];
  const r = tongHopNhieuNgay({ tuNgay: '2026-11-04', denNgay: '2026-11-04', rooms: [R1], patients, todosByPid: {}, cachXep: 'ma' });
  assert.match(r.text, /04\/11: 42w6d - 3500 g - Tiếp tục y lệnh cũ$/);
});

test('tuổi thai có ngày lẻ, qua tháng: sinh 30/10, 34w3d; 04/11 = 5 ngày tuổi → 246 = 35w1d', () => {
  // 34w3d = 241 ngày. 30/10 → 31/10 = 1, → 01/11 = 2, 02, 03, 04/11 = 5. 241 + 5 = 246 = 35*7 + 1.
  const patients = [be('r1', '2026-11-04', { code: 'G08', dob: '3010', ga: '343', wt: '2100' })];
  const r = tongHopNhieuNgay({ tuNgay: '2026-11-04', denNgay: '2026-11-04', rooms: [R1], patients, todosByPid: {}, cachXep: 'ma' });
  assert.match(r.text, /04\/11: 35w1d - 2100 g - Tiếp tục y lệnh cũ$/);
});

test('tháng 2 năm nhuận 2028 (có 29/02) và năm thường 2027', () => {
  // Sinh 27/02/2028, 30w0d (210). 29/02/2028: 2 ngày → 212 = 30w2d (210+2). 01/03/2028: 3 ngày → 213 = 30w3d.
  const nhuan = [
    be('r1', '2028-02-29', { code: 'G09', dob: '27/02/2028', ga: '300', wt: '1500' }),
    be('r1', '2028-03-01', { code: 'G09', dob: '27/02/2028', ga: '300', wt: '1510' }),
  ];
  const a = tongHopNhieuNgay({ tuNgay: '2028-02-29', denNgay: '2028-03-01', rooms: [R1], patients: nhuan, todosByPid: {}, cachXep: 'ma' });
  assert.equal(a.text.split('\n').slice(3).join('\n'), [
    'PHÒNG 1 - G09',
    '29/02: 30w2d - 1500 g - Tiếp tục y lệnh cũ',
    '01/03: 30w3d - 1510 g - Tiếp tục y lệnh cũ',
  ].join('\n'));
  assert.equal(a.soNgay, 2);
  // Sinh 27/02/2027, 30w0d. 01/03/2027: 27 → 28 = 1, → 01/03 = 2 (không có 29/02) → 212 = 30w2d.
  const thuong = [be('r1', '2027-03-01', { code: 'G09', dob: '27/02/2027', ga: '300', wt: '1500' })];
  const b = tongHopNhieuNgay({ tuNgay: '2027-03-01', denNgay: '2027-03-01', rooms: [R1], patients: thuong, todosByPid: {}, cachXep: 'ma' });
  assert.match(b.text, /01\/03: 30w2d - 1500 g/);
});

test('nhiều việc: theo thứ tự order, chưa xong kèm (chưa xong), nối bằng "; "', () => {
  const p = be('r1', '2026-11-02', { code: 'G01', dob: '1410', ga: '350', wt: '1800' });
  const todosByPid = {
    [p.id]: [
      vt('t3', 'Việc C', { order: 3 }),
      vt('t1', 'Việc A', { order: 1 }),
      vt('t2', 'Việc B', { order: 2, done: true }),
      vt('t4', 'Việc đã xoá', { order: 4, deleted: true }),
    ],
  };
  const r = tongHopNhieuNgay({ tuNgay: '2026-11-02', denNgay: '2026-11-02', rooms: [R1], patients: [p], todosByPid, cachXep: 'ma' });
  assert.match(r.text, /02\/11: 37w5d - 1800 g - Việc A \(chưa xong\); Việc B; Việc C \(chưa xong\)$/);
  assert.ok(!r.text.includes('đã xoá'));
});

test('ghi chú: thêm dòng ngay dưới; tuổi không tính được thì bỏ tuổi; thiếu cân thì bỏ cân', () => {
  const p = be('r1', '2026-11-02', { code: 'G01', dob: '', ga: '', wt: '', note: '  Theo dõi vàng da  ' });
  const r = tongHopNhieuNgay({ tuNgay: '2026-11-02', denNgay: '2026-11-02', rooms: [R1], patients: [p], todosByPid: {}, cachXep: 'ma' });
  assert.equal(r.text.split('\n').slice(3).join('\n'), [
    'PHÒNG 1 - G01',
    '02/11: Tiếp tục y lệnh cũ',
    'Ghi chú: Theo dõi vàng da',
  ].join('\n'));
  const q = be('r1', '2026-11-02', { code: 'G01', dob: '1410', ga: '350', wt: '1800', note: 'Ghi 1' });
  const t = tongHopNhieuNgay({ tuNgay: '2026-11-02', denNgay: '2026-11-02', rooms: [R1], patients: [q], todosByPid: {}, cachXep: 'ngay' });
  assert.match(t.text, /G01: 37w5d - 1800 g - Tiếp tục y lệnh cũ\nGhi chú: Ghi 1$/);
});

test('bé không có mã không bị ghép: mỗi dòng một nhóm "Chưa có mã"', () => {
  const x1 = be('r1', '2026-11-02', { code: '', wt: '900', order: 1 });
  const x2 = be('r1', '2026-11-02', { code: '   ', wt: '950', order: 2 });
  const x3 = be('r1', '2026-11-03', { code: '', wt: '980', order: 1 });
  const c = be('r1', '2026-11-02', { code: 'G01', wt: '1000', order: 3 });
  const r = tongHopNhieuNgay({ tuNgay: '2026-11-02', denNgay: '2026-11-03', rooms: [R1], patients: [x3, x2, c, x1], todosByPid: {}, cachXep: 'ma' });
  assert.equal(r.text.split('\n').slice(3).join('\n'), [
    'PHÒNG 1 - G01',
    '02/11: 1000 g - Tiếp tục y lệnh cũ',
    '',
    'PHÒNG 1 - Chưa có mã',
    '02/11: 900 g - Tiếp tục y lệnh cũ',
    '',
    'PHÒNG 1 - Chưa có mã',
    '02/11: 950 g - Tiếp tục y lệnh cũ',
    '',
    'PHÒNG 1 - Chưa có mã',
    '03/11: 980 g - Tiếp tục y lệnh cũ',
  ].join('\n'));
  assert.equal(r.soLuot, 4);
  assert.equal(r.soMaGiuong, 4);
  assert.equal(r.soBeChuaCoMa, 3);
  // theo ngày: bé không mã hiện "Chưa có mã"
  const n = tongHopNhieuNgay({ tuNgay: '2026-11-02', denNgay: '2026-11-03', rooms: [R1], patients: [x3, x2, c, x1], todosByPid: {}, cachXep: 'ngay' });
  assert.match(n.text, /NGÀY 02\/11\nPHÒNG 1\nChưa có mã: 900 g - Tiếp tục y lệnh cũ\nChưa có mã: 950 g - Tiếp tục y lệnh cũ\nG01: 1000 g/);
});

test('trùng phòng và mã trong cùng ngày: giữ đủ hai dòng, không gộp, không mất', () => {
  const a = be('r1', '2026-11-02', { code: 'G01', wt: '1800', order: 1 });
  const b = be('r1', '2026-11-02', { code: ' g01 ', wt: '2500', order: 2 });
  for (const cachXep of ['ma', 'ngay']) {
    const r = tongHopNhieuNgay({ tuNgay: '2026-11-02', denNgay: '2026-11-02', rooms: [R1], patients: [b, a], todosByPid: {}, cachXep });
    assert.equal(r.soLuot, 2);
    assert.match(r.text, /1800 g/);
    assert.match(r.text, /2500 g/);
  }
  const m = tongHopNhieuNgay({ tuNgay: '2026-11-02', denNgay: '2026-11-02', rooms: [R1], patients: [b, a], todosByPid: {}, cachXep: 'ma' });
  assert.equal(m.soMaGiuong, 1);
  assert.equal(m.text.split('\n').slice(3).join('\n'), [
    'PHÒNG 1 - G01',
    '02/11: 1800 g - Tiếp tục y lệnh cũ',
    '02/11: 2500 g - Tiếp tục y lệnh cũ',
  ].join('\n'));
});

test('ghép nhóm bỏ khoảng trắng hai đầu và không phân biệt hoa thường; hiện mã của dòng đầu tiên', () => {
  const a = be('r1', '2026-11-02', { code: ' g01', wt: '1800' });
  const b = be('r1', '2026-11-03', { code: 'G01 ', wt: '1820' });
  const r = tongHopNhieuNgay({ tuNgay: '2026-11-02', denNgay: '2026-11-03', rooms: [R1], patients: [b, a], todosByPid: {}, cachXep: 'ma' });
  assert.equal(r.soMaGiuong, 1);
  assert.equal(r.text.split('\n').slice(3).join('\n'), [
    'PHÒNG 1 - g01',
    '02/11: 1800 g - Tiếp tục y lệnh cũ',
    '03/11: 1820 g - Tiếp tục y lệnh cũ',
  ].join('\n'));
});

test('cùng mã ở hai phòng là hai nhóm; mã xếp tự nhiên (G2 trước G10)', () => {
  const ps = [
    be('r1', '2026-11-02', { code: 'G10', wt: '1' }),
    be('r1', '2026-11-02', { code: 'G2', wt: '2' }),
    be('r1', '2026-11-02', { code: 'G1', wt: '3' }),
    be('r2', '2026-11-02', { code: 'G1', wt: '4' }),
  ];
  const r = tongHopNhieuNgay({ tuNgay: '2026-11-02', denNgay: '2026-11-02', rooms: [R2, R1].sort((x, y) => x.order - y.order), patients: ps, todosByPid: {}, cachXep: 'ma' });
  const dau = r.text.split('\n').filter((l) => l.startsWith('PHÒNG'));
  assert.deepEqual(dau, ['PHÒNG 1 - G1', 'PHÒNG 1 - G2', 'PHÒNG 1 - G10', 'PHÒNG 2 - G1']);
  assert.equal(r.soMaGiuong, 4);
});

test('phòng đã xoá hoặc không tìm thấy: bé vẫn hiện, sau các phòng còn sống', () => {
  const rooms = [R1, R2, { id: 'r9', name: 'Phòng cũ', order: 3, deleted: true }, { id: 'r8', name: 'Phòng trống đã xoá', order: 4, deleted: true }];
  const ps = [
    be('rX', '2026-11-02', { code: 'G08', wt: '800' }),     // phòng không tìm thấy
    be('r9', '2026-11-02', { code: 'G07', wt: '700' }),     // phòng đã xoá
    be('r1', '2026-11-02', { code: 'G01', wt: '100' }),
  ];
  const r = tongHopNhieuNgay({ tuNgay: '2026-11-02', denNgay: '2026-11-02', rooms, patients: ps, todosByPid: {}, cachXep: 'ma' });
  assert.equal(r.soLuot, 3);
  assert.deepEqual(r.text.split('\n').filter((l) => l.startsWith('PHÒNG')), ['PHÒNG 1 - G01', 'PHÒNG CŨ - G07', 'PHÒNG ĐÃ XOÁ - G08']);
  const n = tongHopNhieuNgay({ tuNgay: '2026-11-02', denNgay: '2026-11-02', rooms, patients: ps, todosByPid: {}, cachXep: 'ngay' });
  assert.deepEqual(n.text.split('\n').filter((l) => l.startsWith('PHÒNG')), ['PHÒNG 1', 'PHÒNG CŨ', 'PHÒNG ĐÃ XOÁ']);
  assert.equal(n.soLuot, 3);
});

test('phongChoXem: phòng sống theo thứ tự, rồi phòng đã xoá có bé, rồi phòng không tìm thấy', () => {
  const tat = [
    { id: 'd2', name: 'Cũ 2', order: 5, deleted: true },
    R2,
    { id: 'd1', name: 'Cũ 1', order: 4, deleted: true },
    R1,
    { id: 'd3', name: 'Cũ không bé', order: 6, deleted: true },
  ];
  const ps = [{ roomId: 'zz' }, { roomId: 'd2' }, { roomId: 'd1' }, { roomId: 'r1' }];
  const kq = phongChoXem(tat, ps);
  assert.deepEqual(kq.map((r) => r.id), ['r1', 'r2', 'd1', 'd2', 'zz']);
  assert.equal(kq[4].name, 'Phòng đã xoá');
  assert.equal(kq[2].name, 'Cũ 1');
  // gọi lại với kết quả của chính nó cho cùng kết quả
  assert.deepEqual(phongChoXem(kq, ps).map((r) => r.id), ['r1', 'r2', 'd1', 'd2', 'zz']);
  // không bé nào ở phòng đã xoá thì không thêm
  assert.deepEqual(phongChoXem(tat, []).map((r) => r.id), ['r1', 'r2']);
});

test('dòng bé đã xoá và bé ngoài khoảng không được tính', () => {
  const ps = [
    be('r1', '2026-11-02', { code: 'G01', wt: '100' }),
    be('r1', '2026-11-02', { code: 'G02', wt: '200', deleted: true }),
    be('r1', '2026-11-05', { code: 'G03', wt: '300' }),
    be('r1', '2026-11-01', { code: 'G04', wt: '400' }),
  ];
  const r = tongHopNhieuNgay({ tuNgay: '2026-11-02', denNgay: '2026-11-04', rooms: [R1], patients: ps, todosByPid: {}, cachXep: 'ma' });
  assert.equal(r.soLuot, 1);
  assert.equal(r.soMaGiuong, 1);
  assert.ok(!r.text.includes('G02') && !r.text.includes('G03') && !r.text.includes('G04'));
  assert.equal(r.soNgay, 3); // số ngày của khoảng, tính cả hai đầu
});

test('không có bé nào: đúng một dòng thông báo, đếm bằng 0', () => {
  const r = tongHopNhieuNgay({ tuNgay: '2026-11-02', denNgay: '2026-11-04', rooms: [R1], patients: [], todosByPid: {}, cachXep: 'ma' });
  assert.equal(r.text, 'Chưa có bệnh nhân trong khoảng này.');
  assert.equal(r.soLuot, 0);
  assert.equal(r.soMaGiuong, 0);
  assert.equal(r.soNgay, 3);
});

test('đưa ngược tuNgay và denNgay vẫn ra cùng kết quả', () => {
  const d = duLieuCanvas();
  const xuoi = tongHopNhieuNgay({ tuNgay: '2026-11-02', denNgay: '2026-11-04', ...d, cachXep: 'ma' });
  const nguoc = tongHopNhieuNgay({ tuNgay: '2026-11-04', denNgay: '2026-11-02', ...d, cachXep: 'ma' });
  assert.equal(nguoc.text, xuoi.text);
});

test('tongHopNhieuNgay không đổi dữ liệu đưa vào', () => {
  const d = duLieuCanvas();
  const sao = JSON.stringify(d);
  Object.freeze(d.patients); Object.freeze(d.rooms);
  tongHopNhieuNgay({ tuNgay: '2026-11-02', denNgay: '2026-11-04', ...d, cachXep: 'ma' });
  tongHopNhieuNgay({ tuNgay: '2026-11-02', denNgay: '2026-11-04', ...d, cachXep: 'ngay' });
  assert.equal(JSON.stringify(d), sao);
});
