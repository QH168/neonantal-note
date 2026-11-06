// Chế độ 2 ngày, giao tour, dời việc, chép một bé (v9.6). Kết quả mong đợi tính tay, ghi thành hằng số.
// Giờ trong bài kiểm là giờ máy (new Date(2026, 10, ngày, giờ, phút)), nên chạy đúng ở mọi múi giờ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ghepHaiNgay, locThe, nhomGiaoTour, soanGiaoTour, mucTangGiamCan, viecConTuHomQua,
  lapKeHoachDoiViec, keHoachHoanTacDoi, chonChepMotBe, tachHaiNgay, tenPhongNgan, gioHhmm,
} from '../src/lib/hai-ngay.js';

const t = (d, h, m) => new Date(2026, 10, d, h, m).getTime(); // tháng 11/2026
const NOW = new Date(2026, 10, 5, 8, 0); // 08:00 ngày 05/11/2026 (ngày lịch hôm nay = 05/11)
const Q = '2026-11-04';
const H = '2026-11-05';

const R1 = { id: 'r1', name: 'Phòng 1', order: 1 };
const R2 = { id: 'r2', name: 'Phòng 2', order: 2 };

const be = (id, roomId, examDate, over = {}) => ({
  id, roomId, examDate, code: '', dob: '', ga: '', wt: '', note: '', done: false, order: 1, deleted: false,
  createdAt: new Date(2026, 10, Number(examDate.slice(8)), 9, 0).getTime(), ...over,
});
const vt = (id, text, over = {}) => ({ id, text, done: false, order: 1, createdAt: 1, ...over });

// ---- Bộ dữ liệu theo bảng 17a / 17d ----
// Tuổi tính tay theo NGÀY LỊCH hôm nay 05/11/2026:
//  G01 sinh 04/11, 38w0d (266 ngày): 1 ngày tuổi → 267 = 38w1d (38*7=266, +1)
//  G05 sinh 05/11, 34w2d (34*7+2=240): 0 ngày tuổi → 34w2d
//  G03 sinh 31/10, 36w4d (36*7+4=256): 5 ngày tuổi (31/10→05/11) → 261 = 37w2d (37*7=259, +2)
//  G12 sinh 01/11, 30w0d (210): 4 ngày tuổi → 214 = 30w4d
function boDuLieu() {
  const q = [
    be('q1', 'r1', Q, { code: 'G01', dob: '0411', ga: '380', wt: '1850', order: 1, createdAt: t(4, 9, 0) }),
    be('q2', 'r1', Q, { code: 'G05', dob: '0511', ga: '342', wt: '1950', note: 'Sinh mổ', order: 2, createdAt: t(5, 2, 30) }),
    be('q3', 'r1', Q, { code: 'G03', dob: '3110', ga: '364', wt: '2080', order: 3, createdAt: t(4, 10, 0) }),
    be('q4', 'r2', Q, { code: 'G12', dob: '0111', ga: '300', wt: '3200', order: 1, createdAt: t(4, 9, 30) }),
  ];
  const h = [
    be('h1', 'r1', H, { code: 'G01 ', dob: '04/11', ga: '380', wt: '1850', order: 1, copiedFrom: 'q1', createdAt: t(5, 7, 10) }),
    be('h2', 'r1', H, { code: 'G05', dob: '0511', ga: '342', wt: '1950', order: 2, copiedFrom: 'q2', createdAt: t(5, 7, 10) }),
    be('h3', 'r1', H, { code: 'G03', dob: '3110', ga: '364', wt: '2100', order: 3, copiedFrom: 'q3', createdAt: t(5, 7, 10) }),
  ];
  const todosByPid = {
    q1: [vt('tq1', 'Đo bilirubin')],
    q2: [vt('tq2a', 'Chụp X-quang ngực', { order: 1 }), vt('tq2b', 'Khí máu sau 6 giờ CPAP', { order: 2 })],
    q3: [vt('tq3', 'Siêu âm não')],
    h1: [vt('th1', 'Đo bilirubin ')],
    h2: [vt('th2a', 'Chụp X-quang ngực', { order: 1 }), vt('th2b', 'khí máu sau 6 giờ cpap', { order: 2, done: true })],
  };
  return { q, h, todosByPid };
}
const chay = (over = {}) => {
  const d = boDuLieu();
  return ghepHaiNgay({
    homQua: { ngay: Q, patients: d.q }, homNay: { ngay: H, patients: d.h },
    rooms: [R1, R2], todosByPid: d.todosByPid, mocPhut: 420, gioBatDauDem: 960, now: NOW, ...over,
  });
};
const theo = (kq, ma) => kq.the.find((c) => c.ma.trim().toLowerCase() === ma.toLowerCase());

test('ghép theo phòng + mã (bỏ khoảng trắng, không phân biệt hoa thường): 4 thẻ, đếm chip đúng', () => {
  const kq = chay();
  assert.equal(kq.the.length, 4);
  assert.deepEqual(kq.dem, { tatCa: 4, moiDemQua: 1, conViec: 3, chuaChep: 1 });
  assert.equal(kq.soViecCon, 3);
  const g01 = theo(kq, 'G01');
  assert.equal(g01.homQua.id, 'q1');
  assert.equal(g01.homNay.id, 'h1'); // 'G01 ' (khoảng trắng cuối) ghép với 'G01'
  assert.equal(g01.ma, 'G01'); // mã hiển thị: bỏ khoảng trắng hai đầu, giữ chữ của hôm nay
});

test('ghép: không phân biệt hoa thường và bỏ khoảng trắng hai đầu', () => {
  const kq = ghepHaiNgay({
    homQua: { ngay: Q, patients: [be('a', 'r1', Q, { code: 'G01' })] },
    homNay: { ngay: H, patients: [be('b', 'r1', H, { code: '  g01 ' })] },
    rooms: [R1], todosByPid: {}, mocPhut: 420, now: NOW,
  });
  assert.equal(kq.the.length, 1);
  assert.equal(kq.the[0].homQua.id, 'a');
  assert.equal(kq.the[0].homNay.id, 'b');
});

test('mỗi bé nằm đúng một thẻ: không mất, không nhân đôi', () => {
  const kq = chay();
  const ids = kq.the.flatMap((c) => [c.homQua?.id, c.homNay?.id]).filter(Boolean).sort();
  assert.deepEqual(ids, ['h1', 'h2', 'h3', 'q1', 'q2', 'q3', 'q4']);
});

test('thứ tự: theo phòng, trong phòng theo thứ tự hôm nay, bé chỉ có hôm qua đứng sau', () => {
  const kq = chay();
  assert.deepEqual(kq.the.map((c) => c.ma), ['G01', 'G05', 'G03', 'G12']);
  assert.deepEqual(kq.phong.map((p) => [p.roomId, p.tenNgan, p.the.length]), [['r1', 'P1', 3], ['r2', 'P2', 1]]);
});

test('Mới đêm qua: chỉ G05 (hôm qua, không copiedFrom, tạo 02:30 trong 16:00 → 07:00), giờ vào 02:30', () => {
  const kq = chay();
  const g05 = theo(kq, 'G05');
  assert.equal(g05.moiDemQua, true);
  assert.equal(g05.gioVao, '02:30');
  assert.equal(theo(kq, 'G01').moiDemQua, false);
  assert.equal(theo(kq, 'G03').moiDemQua, false);
  assert.equal(theo(kq, 'G12').moiDemQua, false);
});

test('biên cửa sổ đêm qua: 15:59 không, 16:00 có, 06:59 có, 07:00 không; có copiedFrom thì không; không createdAt thì không', () => {
  const mk = (createdAt, over = {}) => ghepHaiNgay({
    homQua: { ngay: Q, patients: [be('x', 'r1', Q, { code: 'A', createdAt, ...over })] },
    homNay: { ngay: H, patients: [] }, rooms: [R1], todosByPid: {}, mocPhut: 420, gioBatDauDem: 960, now: NOW,
  }).the[0];
  assert.equal(mk(t(4, 15, 59)).moiDemQua, false);
  assert.equal(mk(t(4, 16, 0)).moiDemQua, true);
  assert.equal(mk(t(4, 23, 40)).moiDemQua, true);
  assert.equal(mk(t(5, 6, 59)).moiDemQua, true);
  assert.equal(mk(t(5, 7, 0)).moiDemQua, false);
  assert.equal(mk(t(5, 2, 30), { copiedFrom: 'z' }).moiDemQua, false);
  assert.equal(mk(undefined).moiDemQua, false);
  assert.equal(mk(undefined).gioVao, '');
  assert.equal(mk(0).moiDemQua, false);
});

test('cửa sổ đêm qua với mốc 00:00 kết thúc lúc 00:00 và giờ bắt đầu đổi được', () => {
  const mk = (createdAt, moc, bd) => ghepHaiNgay({
    homQua: { ngay: Q, patients: [be('x', 'r1', Q, { code: 'A', createdAt })] },
    homNay: { ngay: H, patients: [] }, rooms: [R1], todosByPid: {}, mocPhut: moc, gioBatDauDem: bd, now: NOW,
  }).the[0].moiDemQua;
  assert.equal(mk(t(4, 23, 59), 0, 960), true);
  assert.equal(mk(t(5, 0, 0), 0, 960), false);
  assert.equal(mk(t(4, 17, 59), 420, 1080), false); // bắt đầu 18:00
  assert.equal(mk(t(4, 18, 0), 420, 1080), true);
  assert.equal(mk(t(4, 16, 0), 420, undefined), true); // mặc định 16:00
});

test('việc còn lại: việc hôm nay + việc hôm qua chưa xong mà hôm nay không có (so chữ không phân biệt hoa thường, khoảng trắng)', () => {
  const kq = chay();
  const g01 = theo(kq, 'G01');
  assert.deepEqual(g01.viecConHomNay.map((x) => x.id), ['th1']);
  assert.deepEqual(g01.viecConTuHomQua, []); // 'Đo bilirubin' hôm qua đã có bản chép
  const g05 = theo(kq, 'G05');
  assert.deepEqual(g05.viecConHomNay.map((x) => x.id), ['th2a']);
  assert.deepEqual(g05.viecConTuHomQua, []); // 'Khí máu...' hôm nay đã xong (khác hoa thường)
  const g03 = theo(kq, 'G03');
  assert.deepEqual(g03.viecConHomNay, []);
  assert.deepEqual(g03.viecConTuHomQua.map((x) => x.id), ['tq3']); // chưa được chép sang
  assert.deepEqual([g01.soViecCon, g05.soViecCon, g03.soViecCon, theo(kq, 'G12').soViecCon], [1, 1, 1, 0]);
});

test('việc đã xoá không tính; dòng bé đã xoá không hiện', () => {
  const d = boDuLieu();
  d.todosByPid.h1 = [vt('th1', 'Đo bilirubin', { deleted: true })];
  d.todosByPid.q1 = [vt('tq1', 'Đo bilirubin', { deleted: true })];
  d.h[2] = { ...d.h[2], deleted: true }; // h3 đã xoá
  const kq = ghepHaiNgay({ homQua: { ngay: Q, patients: d.q }, homNay: { ngay: H, patients: d.h }, rooms: [R1, R2], todosByPid: d.todosByPid, mocPhut: 420, now: NOW });
  assert.equal(theo(kq, 'G01').soViecCon, 0);
  const g03 = theo(kq, 'G03');
  assert.equal(g03.homNay, null); // chỉ còn hôm qua
  assert.equal(g03.chuaChep, true);
});

test('chỉ có hôm qua: thẻ gạch đứt, Chưa chép; tuổi tính theo ngày lịch hôm nay', () => {
  const g12 = theo(chay(), 'G12');
  assert.equal(g12.homNay, null);
  assert.equal(g12.chiCoHomQua, true);
  assert.equal(g12.chuaChep, true);
  assert.deepEqual(g12.tuoi, { days: '4 ngày', pma: '30w4d' });
});

test('tuổi các thẻ ghép (tính tay): G01 38w1d, G05 34w2d, G03 37w2d', () => {
  const kq = chay();
  assert.equal(theo(kq, 'G01').tuoi.pma, '38w1d');
  assert.equal(theo(kq, 'G05').tuoi.pma, '34w2d');
  assert.equal(theo(kq, 'G03').tuoi.pma, '37w2d');
  assert.equal(theo(kq, 'G03').tuoi.days, '5 ngày');
});

test('tuổi trong khung 02:30: ngày làm việc lùi một ngày nhưng tuổi vẫn tính theo ngày lịch', () => {
  // 02:30 ngày 05/11: ngày làm việc "hôm nay" = 04/11, "hôm qua" = 03/11. Bé G05 sinh 05/11, ghi examDate 04/11.
  const bé = be('n1', 'r1', Q, { code: 'G05', dob: '0511', ga: '342', wt: '1950', createdAt: t(5, 2, 30) });
  const kq = ghepHaiNgay({
    homQua: { ngay: '2026-11-03', patients: [] }, homNay: { ngay: Q, patients: [bé] },
    rooms: [R1], todosByPid: {}, mocPhut: 420, now: new Date(2026, 10, 5, 2, 30),
  });
  assert.deepEqual(kq.the[0].tuoi, { days: '0 ngày', pma: '34w2d' }); // không phải 364 ngày
});

test('ghép: bé không mã không bao giờ ghép', () => {
  const kq = ghepHaiNgay({
    homQua: { ngay: Q, patients: [be('a', 'r1', Q, { code: '' }), be('b', 'r1', Q, { code: '   ' })] },
    homNay: { ngay: H, patients: [be('c', 'r1', H, { code: '' })] },
    rooms: [R1], todosByPid: {}, mocPhut: 420, now: NOW,
  });
  assert.equal(kq.the.length, 3);
  assert.equal(kq.the.filter((c) => c.homQua && c.homNay).length, 0);
  assert.equal(kq.dem.chuaChep, 2);
});

test('ghép: trùng phòng + mã trong cùng ngày thì không ghép, hiện đủ, không mất bé', () => {
  const kq = ghepHaiNgay({
    homQua: { ngay: Q, patients: [be('a1', 'r1', Q, { code: 'G07', order: 1 }), be('a2', 'r1', Q, { code: 'g07', order: 2 })] },
    homNay: { ngay: H, patients: [be('b1', 'r1', H, { code: 'G07' })] },
    rooms: [R1], todosByPid: {}, mocPhut: 420, now: NOW,
  });
  assert.equal(kq.the.length, 3);
  assert.equal(kq.the.filter((c) => c.homQua && c.homNay).length, 0);
  assert.deepEqual(kq.the.flatMap((c) => [c.homQua?.id, c.homNay?.id]).filter(Boolean).sort(), ['a1', 'a2', 'b1']);
  // trùng ở phía hôm nay
  const kq2 = ghepHaiNgay({
    homQua: { ngay: Q, patients: [be('a1', 'r1', Q, { code: 'G07' })] },
    homNay: { ngay: H, patients: [be('b1', 'r1', H, { code: 'G07', order: 1 }), be('b2', 'r1', H, { code: 'G07', order: 2 })] },
    rooms: [R1], todosByPid: {}, mocPhut: 420, now: NOW,
  });
  assert.equal(kq2.the.length, 3);
  assert.equal(kq2.the.filter((c) => c.homQua && c.homNay).length, 0);
});

test('ghép: cùng mã khác phòng không ghép', () => {
  const kq = ghepHaiNgay({
    homQua: { ngay: Q, patients: [be('a', 'r1', Q, { code: 'G01' })] },
    homNay: { ngay: H, patients: [be('b', 'r2', H, { code: 'G01' })] },
    rooms: [R1, R2], todosByPid: {}, mocPhut: 420, now: NOW,
  });
  assert.equal(kq.the.length, 2);
});

test('ghép: ngày sinh hai bên khác nhau thì không ghép (câu 3), cách viết khác nhưng cùng ngày thì ghép', () => {
  const mk = (dobQ, dobH) => ghepHaiNgay({
    homQua: { ngay: Q, patients: [be('a', 'r1', Q, { code: 'G01', dob: dobQ, wt: '1850' })] },
    homNay: { ngay: H, patients: [be('b', 'r1', H, { code: 'G01', dob: dobH, wt: '1870' })] },
    rooms: [R1], todosByPid: {}, mocPhut: 420, now: NOW,
  });
  const khac = mk('0411', '0511');
  assert.equal(khac.the.length, 2);
  assert.ok(khac.the.every((c) => c.tangGiamCan === null)); // không tính tăng giảm cân
  assert.equal(mk('0411', '04/11').the.length, 1);
  assert.equal(mk('0411', '04/11/2026').the.length, 1);
  assert.equal(mk('0411', '').the.length, 1); // một bên trống thì không có gì để so
  assert.equal(mk('', '').the.length, 1);
  assert.equal(mk('0411', '0511').dem.chuaChep, 1);
});

test('ghép: phòng đã xoá và phòng không còn trong danh sách vẫn hiện', () => {
  const r3 = { id: 'r3', name: 'Phòng 3', order: 3, deleted: true };
  const kq = ghepHaiNgay({
    homQua: { ngay: Q, patients: [be('a', 'r3', Q, { code: 'G09' }), be('z', 'rmat', Q, { code: 'G10' })] },
    homNay: { ngay: H, patients: [be('b', 'r1', H, { code: 'G01' })] },
    rooms: [R1, R2, r3], todosByPid: {}, mocPhut: 420, now: NOW,
  });
  assert.equal(kq.the.length, 3);
  const p = Object.fromEntries(kq.phong.map((x) => [x.roomId, x]));
  assert.equal(p.r3.ten, 'Phòng 3');
  assert.equal(p.r3.tenNgan, 'P3');
  assert.equal(p.rmat.ten, 'Phòng đã xoá');
  assert.equal(p.rmat.tenNgan, 'Phòng đã xoá');
  assert.deepEqual(kq.phong.map((x) => x.roomId), ['r1', 'r3', 'rmat']);
});

test('tăng giảm cân chỉ có khi đã ghép: G03 tăng 20 g (2080 → 2100), G01 và G05 không đổi', () => {
  const kq = chay();
  assert.deepEqual(theo(kq, 'G03').tangGiamCan, { gram: 20, huong: 'tang', text: 'tăng 20 g' });
  assert.equal(theo(kq, 'G01').tangGiamCan.gram, 0);
  assert.equal(theo(kq, 'G01').tangGiamCan.huong, 'khong-doi');
  assert.equal(theo(kq, 'G12').tangGiamCan, null); // chỉ có hôm qua
});

test('mucTangGiamCan: tính tay, thiếu hoặc lạ thì null (không đoán)', () => {
  assert.deepEqual(mucTangGiamCan('2080', '2100'), { gram: 20, huong: 'tang', text: 'tăng 20 g' }); // 2100-2080
  assert.deepEqual(mucTangGiamCan('2100', '2060'), { gram: -40, huong: 'giam', text: 'giảm 40 g' }); // 2060-2100
  assert.deepEqual(mucTangGiamCan('2100', '2100'), { gram: 0, huong: 'khong-doi', text: 'không đổi' });
  assert.deepEqual(mucTangGiamCan(' 1850 g ', '1870G'), { gram: 20, huong: 'tang', text: 'tăng 20 g' });
  assert.deepEqual(mucTangGiamCan(1850, 1900), { gram: 50, huong: 'tang', text: 'tăng 50 g' });
  for (const [a, b] of [['', '2100'], ['2100', ''], [undefined, '2100'], ['2100', null], ['abc', '2100'], ['2100', '21oo'],
    ['1.850', '1870'], ['1,85', '1870'], ['-1850', '1870'], ['50', '1870'], ['1850', '99999'], ['1850 kg', '1870']]) {
    assert.equal(mucTangGiamCan(a, b), null, JSON.stringify([a, b]));
  }
});

test('chip lọc: Tất cả / Mới đêm qua / Còn việc / Chưa chép', () => {
  const kq = chay();
  const ma = (cs) => cs.map((c) => c.ma);
  assert.deepEqual(ma(locThe(kq.the, 'tatCa')), ['G01', 'G05', 'G03', 'G12']);
  assert.deepEqual(ma(locThe(kq.the, 'moiDemQua')), ['G05']);
  assert.deepEqual(ma(locThe(kq.the, 'conViec')), ['G01', 'G05', 'G03']);
  assert.deepEqual(ma(locThe(kq.the, 'chuaChep')), ['G12']);
  assert.deepEqual(ma(locThe(kq.the, 'khong-co')), ['G01', 'G05', 'G03', 'G12']); // chip lạ = tất cả
});

test('nhomGiaoTour: mỗi bé đúng một nhóm', () => {
  const kq = chay();
  assert.deepEqual(kq.the.map((c) => [c.ma, nhomGiaoTour(c)]), [
    ['G01', 'viecConLai'], ['G05', 'beMoi'], ['G03', 'viecConLai'], ['G12', 'beOnDinh'],
  ]);
});

test('giao tour: văn bản đầy đủ theo bảng 17d (viết tay)', () => {
  const kq = chay();
  const text = soanGiaoTour({ ghep: kq, bat: { beMoi: true, viecConLai: true, beOnDinh: true, ghiChu: false } }).text;
  assert.equal(text, [
    'GIAO TOUR 04/11 - 05/11/2026',
    '4 bé. 1 mới đêm qua. 3 việc còn lại.',
    '',
    'BÉ MỚI ĐÊM QUA',
    'P1 - G05 - vào 02:30 - 34w2d - 1950 g',
    '- Chụp X-quang ngực',
    '',
    'VIỆC CÒN TỪ HÔM QUA',
    'P1 - G01 - 38w1d - 1850 g',
    '- Đo bilirubin',
    'P1 - G03 - 37w2d - 2100 g, tăng 20 g',
    '- Siêu âm não',
    '',
    'BÉ ỔN ĐỊNH',
    'P2 - G12 - 30w4d - 3200 g - chưa có trong danh sách hôm nay',
  ].join('\n'));
});

test('giao tour: tắt nhóm thì không hiện bé nhưng dòng đầu vẫn đếm đủ; mặc định ghi chú tắt', () => {
  const kq = chay();
  const r = soanGiaoTour({ ghep: kq, bat: { beMoi: false, viecConLai: true, beOnDinh: false, ghiChu: false } });
  assert.equal(r.text, [
    'GIAO TOUR 04/11 - 05/11/2026',
    '4 bé. 1 mới đêm qua. 3 việc còn lại.',
    '',
    'VIỆC CÒN TỪ HÔM QUA',
    'P1 - G01 - 38w1d - 1850 g',
    '- Đo bilirubin',
    'P1 - G03 - 37w2d - 2100 g, tăng 20 g',
    '- Siêu âm não',
  ].join('\n'));
  assert.equal(r.soBe, 4);
  const het = soanGiaoTour({ ghep: kq, bat: { beMoi: false, viecConLai: false, beOnDinh: false, ghiChu: false } });
  assert.equal(het.text, 'GIAO TOUR 04/11 - 05/11/2026\n4 bé. 1 mới đêm qua. 3 việc còn lại.');
  const macDinh = soanGiaoTour({ ghep: kq });
  assert.ok(!macDinh.text.includes('Ghi chú'));
});

test('giao tour: chip Ghi chú thêm dòng ghi chú (hôm nay, và hôm qua nếu khác)', () => {
  const kq = chay();
  const text = soanGiaoTour({ ghep: kq, bat: { beMoi: true, viecConLai: true, beOnDinh: true, ghiChu: true } }).text;
  assert.ok(text.includes('P1 - G05 - vào 02:30 - 34w2d - 1950 g\n- Chụp X-quang ngực\nGhi chú hôm qua: Sinh mổ'));
});

test('giao tour: bé chỉ có hôm qua còn việc chưa xong → nhóm việc còn lại, ghi chưa có trong danh sách hôm nay', () => {
  const kq = ghepHaiNgay({
    homQua: { ngay: Q, patients: [be('a', 'r2', Q, { code: 'G20', dob: '0111', ga: '300', wt: '3000', createdAt: t(4, 9, 0) })] },
    homNay: { ngay: H, patients: [] }, rooms: [R1, R2],
    todosByPid: { a: [vt('x1', 'Lấy máu'), vt('x2', 'Đã làm', { done: true })] }, mocPhut: 420, now: NOW,
  });
  assert.equal(kq.the[0].soViecCon, 1);
  assert.equal(soanGiaoTour({ ghep: kq }).text, [
    'GIAO TOUR 04/11 - 05/11/2026',
    '1 bé. 0 mới đêm qua. 1 việc còn lại.',
    '',
    'VIỆC CÒN TỪ HÔM QUA',
    'P2 - G20 - 30w4d - 3000 g - chưa có trong danh sách hôm nay',
    '- Lấy máu',
  ].join('\n'));
});

test('giao tour: bé không mã ghi "Chưa có mã"; danh sách trống; khác năm ghi đủ hai năm', () => {
  const kq = ghepHaiNgay({
    homQua: { ngay: '2026-12-31', patients: [] },
    homNay: { ngay: '2027-01-01', patients: [be('b', 'r1', '2027-01-01', { code: '', createdAt: new Date(2027, 0, 1, 9, 0).getTime() })] },
    rooms: [R1], todosByPid: {}, mocPhut: 420, now: new Date(2027, 0, 1, 8, 0),
  });
  assert.equal(soanGiaoTour({ ghep: kq }).text, [
    'GIAO TOUR 31/12/2026 - 01/01/2027',
    '1 bé. 0 mới đêm qua. 0 việc còn lại.',
    '',
    'BÉ ỔN ĐỊNH',
    'P1 - Chưa có mã - mới vào hôm nay',
  ].join('\n'));
  const trong = ghepHaiNgay({ homQua: { ngay: Q, patients: [] }, homNay: { ngay: H, patients: [] }, rooms: [R1], todosByPid: {}, mocPhut: 420, now: NOW });
  assert.equal(trong.the.length, 0);
  assert.deepEqual(trong.dem, { tatCa: 0, moiDemQua: 0, conViec: 0, chuaChep: 0 });
  assert.equal(soanGiaoTour({ ghep: trong }).text, 'GIAO TOUR 04/11 - 05/11/2026\nChưa có bé trong 2 ngày.');
});

test('tenPhongNgan: chỉ "Phòng <số>" mới viết tắt', () => {
  assert.equal(tenPhongNgan('Phòng 1'), 'P1');
  assert.equal(tenPhongNgan(' Phòng 12 '), 'P12');
  assert.equal(tenPhongNgan('Phòng 1A'), 'Phòng 1A');
  assert.equal(tenPhongNgan('Hồi sức'), 'Hồi sức');
  assert.equal(tenPhongNgan('phòng 2'), 'phòng 2');
  assert.equal(tenPhongNgan('Phòng'), 'Phòng');
  assert.equal(tenPhongNgan('Phòng 1 bis'), 'Phòng 1 bis');
  assert.equal(tenPhongNgan('Phòng 1'.normalize('NFD')), 'P1');
  assert.equal(tenPhongNgan(undefined), '');
});

test('gioHhmm: giờ máy; thiếu hoặc lạ thì rỗng', () => {
  assert.equal(gioHhmm(t(5, 2, 30)), '02:30');
  assert.equal(gioHhmm(t(4, 23, 40)), '23:40');
  assert.equal(gioHhmm(t(5, 0, 0)), '00:00');
  for (const v of [undefined, null, 0, NaN, 'x', -5]) assert.equal(gioHhmm(v), '');
});

// ---- Việc 2 ngày ----
test('viecConTuHomQua: chỉ việc chưa xong, chưa xoá của đúng ngày làm việc trước; giờ ghi từ createdAt', () => {
  const tasks = [
    { id: 'a', date: Q, text: 'Tối qua', done: false, createdAt: t(4, 23, 40) },
    { id: 'b', date: Q, text: 'Ghi 03:10', done: false, createdAt: t(5, 3, 10) }, // thuộc ngày làm việc trước (câu 4)
    { id: 'c', date: Q, text: 'Ban ngày', done: false, createdAt: t(4, 10, 0) },
    { id: 'd', date: Q, text: 'Không giờ', done: false },
    { id: 'e', date: Q, text: 'Đã xong', done: true, createdAt: t(4, 11, 0) },
    { id: 'f', date: Q, text: 'Đã xoá', done: false, deleted: true, createdAt: t(4, 11, 0) },
    { id: 'g', date: '2026-11-03', text: 'Xa hơn', done: false, createdAt: t(3, 11, 0) },
    { id: 'h', date: H, text: 'Hôm nay', done: false, createdAt: t(5, 8, 0) },
  ];
  const kq = viecConTuHomQua(tasks, { homQua: Q, homNay: H, mocPhut: 420, gioBatDauDem: 960 });
  assert.deepEqual(kq.map((x) => x.task.id), ['d', 'c', 'a', 'b']); // createdAt tăng dần, thiếu createdAt đứng đầu
  const theoId = Object.fromEntries(kq.map((x) => [x.task.id, x]));
  assert.deepEqual([theoId.a.gioGhi, theoId.a.trongDem, theoId.a.nhan], ['23:40', true, 'Ghi lúc 23:40 đêm qua']);
  assert.deepEqual([theoId.b.gioGhi, theoId.b.trongDem, theoId.b.nhan], ['03:10', true, 'Ghi lúc 03:10 đêm qua']);
  assert.deepEqual([theoId.c.gioGhi, theoId.c.trongDem, theoId.c.nhan], ['10:00', false, '']);
  assert.deepEqual([theoId.d.gioGhi, theoId.d.trongDem, theoId.d.nhan], ['', false, '']);
});

test('lapKeHoachDoiViec: bỏ việc đã xong, đã xoá, đã ở hôm nay hoặc sau hôm nay, id lạ, id lặp', () => {
  const rows = [
    { id: 'a', date: Q, done: false },
    { id: 'b', date: Q, done: true },
    { id: 'c', date: Q, done: false, deleted: true },
    { id: 'd', date: H, done: false },
    { id: 'e', date: '2026-11-06', done: false },
    { id: 'f', date: '2026-11-03', done: false },
    { id: 'g', date: undefined, done: false },
  ];
  const kh = lapKeHoachDoiViec(rows, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'a', 'khong-co'], H);
  assert.deepEqual(kh, [{ id: 'a', dateCu: Q }, { id: 'f', dateCu: '2026-11-03' }]);
  assert.deepEqual(lapKeHoachDoiViec(rows, [], H), []);
  assert.deepEqual(lapKeHoachDoiViec(rows, undefined, H), []);
});

test('Hoàn tác dời: trả đúng date cũ cho từng việc', () => {
  const kh = [{ id: 'a', dateCu: Q }, { id: 'f', dateCu: '2026-11-03' }];
  assert.deepEqual(keHoachHoanTacDoi(kh), [{ id: 'a', date: Q }, { id: 'f', date: '2026-11-03' }]);
  assert.deepEqual(keHoachHoanTacDoi(undefined), []);
});

// ---- Chép một bé ----
test('chonChepMotBe: cho chép; chặn khi trùng phòng + mã, đã chép từ chính bé này, phòng đã xoá, không thấy bé', () => {
  const src = be('q1', 'r1', Q, { code: 'G01' });
  const cur = [be('h9', 'r1', H, { code: 'G09' })];
  assert.deepEqual(chonChepMotBe({ src, cur, roomIds: new Set(['r1']) }), { ok: true });
  assert.deepEqual(chonChepMotBe({ src, cur: [...cur, be('h1', 'r1', H, { code: ' g01 ' })], roomIds: new Set(['r1']) }), { ok: false, ly: 'trung' });
  assert.deepEqual(chonChepMotBe({ src, cur: [be('h1', 'r2', H, { code: 'G01' })], roomIds: new Set(['r1']) }), { ok: true }); // khác phòng
  assert.deepEqual(chonChepMotBe({ src, cur: [be('h1', 'r1', H, { code: 'G01', deleted: true })], roomIds: new Set(['r1']) }), { ok: true }); // dòng đã xoá
  assert.deepEqual(chonChepMotBe({ src, cur, roomIds: new Set(['r2']) }), { ok: false, ly: 'phong-xoa' });
  assert.deepEqual(chonChepMotBe({ src: null, cur, roomIds: new Set(['r1']) }), { ok: false, ly: 'khong-thay' });
  assert.deepEqual(chonChepMotBe({ src: { ...src, deleted: true }, cur, roomIds: new Set(['r1']) }), { ok: false, ly: 'khong-thay' });
});

test('chonChepMotBe: bé không mã chỉ bị chặn khi đã chép chính bé này (bấm hai lần không nhân đôi)', () => {
  const src = be('q5', 'r1', Q, { code: '' });
  const roomIds = new Set(['r1']);
  assert.deepEqual(chonChepMotBe({ src, cur: [be('h5', 'r1', H, { code: '' })], roomIds }), { ok: true });
  assert.deepEqual(chonChepMotBe({ src, cur: [be('h6', 'r1', H, { code: '', copiedFrom: 'q5' })], roomIds }), { ok: false, ly: 'trung' });
  assert.deepEqual(chonChepMotBe({ src: be('q7', 'r1', Q, { code: 'G01' }), cur: [be('h7', 'r1', H, { code: 'X', copiedFrom: 'q7' })], roomIds }), { ok: false, ly: 'trung' });
});

// ---- Tách dữ liệu 2 ngày từ truy vấn một khoảng ----
test('tachHaiNgay: tách bé theo examDate, bỏ bé ngoài hai ngày', () => {
  const k = { ready: true, rooms: [R1], todosByPid: { a: [] }, patients: [
    be('a', 'r1', Q), be('b', 'r1', H), be('c', 'r1', '2026-11-03'), be('d', 'r1', H),
  ] };
  const kq = tachHaiNgay(k, Q, H);
  assert.equal(kq.ready, true);
  assert.deepEqual(kq.homQua.patients.map((p) => p.id), ['a']);
  assert.deepEqual(kq.homNay.patients.map((p) => p.id), ['b', 'd']);
  assert.equal(kq.homQua.ngay, Q);
  assert.equal(kq.homNay.ngay, H);
  assert.equal(kq.todosByPid, k.todosByPid);
  assert.equal(kq.rooms, k.rooms);
});
