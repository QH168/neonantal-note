// Lịch (v9.5): ô của tháng, đếm việc chưa xong, ngày sót gần nhất, đếm bé đã khám, chọn khoảng, số ngày khoảng.
// Mọi kết quả mong đợi ghi tay (tính từ lịch), không sinh bằng chính hàm đang kiểm.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taoOThang, demViecChuaXong, ngaySotGanNhat, demBeDaKham, chonKhoang, soNgayKhoang } from '../src/lib/lich.js';

const isoHang = (tuan) => tuan.map((o) => o.iso);

test('tháng 11/2026: 6 hàng, T2 đầu tuần, 01/11 là Chủ nhật ở cuối hàng đầu', () => {
  // 01/11/2026 là Chủ nhật → hàng đầu bắt đầu T2 26/10
  const t = taoOThang(2026, 11);
  assert.equal(t.length, 6);
  assert.deepEqual(isoHang(t[0]), ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
  assert.equal(t[0][0].trongThang, false);
  assert.equal(t[0][6].trongThang, true);
  assert.equal(t[0][6].laChuNhat, true);
  assert.equal(t[0][5].laChuNhat, false);
  assert.equal(t[5][0].iso, '2026-11-30');
  assert.equal(t[5][6].iso, '2026-12-06');
  assert.equal(t[5][1].trongThang, false);
  assert.equal(t[1][0].ngay, 2);
  // chỉ cột cuối là Chủ nhật
  for (const hang of t) hang.forEach((o, i) => assert.equal(o.laChuNhat, i === 6));
});

test('tháng 2/2027 (không nhuận) vừa đúng 4 hàng, bắt đầu T2 01/02', () => {
  const t = taoOThang(2027, 2);
  assert.equal(t.length, 4);
  assert.equal(t[0][0].iso, '2027-02-01');
  assert.equal(t[3][6].iso, '2027-02-28');
  assert.ok(t.flat().every((o) => o.trongThang));
});

test('tháng 2/2028 (năm nhuận): có ngày 29, 5 hàng, 01/02 là Thứ Ba', () => {
  const t = taoOThang(2028, 2);
  assert.equal(t.length, 5);
  assert.deepEqual(isoHang(t[0]).slice(0, 3), ['2028-01-31', '2028-02-01', '2028-02-02']);
  assert.equal(t[0][1].trongThang, true);
  assert.equal(t[0][0].trongThang, false);
  const thang = t.flat().filter((o) => o.trongThang);
  assert.equal(thang.length, 29);
  assert.equal(thang[28].iso, '2028-02-29');
  assert.equal(t[4][6].iso, '2028-03-05');
});

test('tháng 12/2026 tràn sang năm sau: hàng cuối kết thúc 03/01/2027 (Chủ nhật)', () => {
  const t = taoOThang(2026, 12);
  assert.equal(t.length, 5);
  assert.equal(t[0][0].iso, '2026-11-30');
  assert.equal(t[4][0].iso, '2026-12-28');
  assert.equal(t[4][6].iso, '2027-01-03');
  assert.equal(t[4][6].trongThang, false);
});

test('đếm việc chưa xong theo ngày: bỏ việc đã xong và dòng đã xoá', () => {
  const tasks = [
    { id: 'a', date: '2026-11-02', done: false },
    { id: 'b', date: '2026-11-02', done: true },
    { id: 'c', date: '2026-11-02', done: false, deleted: true },
    { id: 'd', date: '2026-11-02', done: false },
    { id: 'e', date: '2026-11-03', done: false },
    { id: 'f', date: '2026-11-04', done: true },
  ];
  assert.deepEqual(demViecChuaXong(tasks), { '2026-11-02': 2, '2026-11-03': 1 });
  assert.deepEqual(demViecChuaXong([]), {});
});

test('ngaySotGanNhat: ngày LỚN NHẤT trước hôm nay còn việc chưa xong', () => {
  const tasks = [
    { date: '2026-10-30', done: false },
    { date: '2026-11-04', done: false },
    { date: '2026-11-05', done: true },        // đã xong, không tính
    { date: '2026-11-03', done: false },
    { date: '2026-11-06', done: false },       // hôm nay, không tính
    { date: '2026-11-09', done: false },       // tương lai, không tính
    { date: '2026-11-05', done: false, deleted: true }, // đã xoá, không tính
  ];
  assert.equal(ngaySotGanNhat(tasks, '2026-11-06'), '2026-11-04');
});

test('ngaySotGanNhat: không còn sót thì null (kể cả chỉ có hôm nay, tương lai, đã xong, rỗng)', () => {
  assert.equal(ngaySotGanNhat([], '2026-11-06'), null);
  assert.equal(ngaySotGanNhat([{ date: '2026-11-06', done: false }, { date: '2026-12-01', done: false }], '2026-11-06'), null);
  assert.equal(ngaySotGanNhat([{ date: '2026-11-01', done: true }, { date: '2026-11-02', done: false, deleted: true }], '2026-11-06'), null);
});

test('ngaySotGanNhat: qua năm và qua tháng không lệch', () => {
  assert.equal(ngaySotGanNhat([{ date: '2026-12-30', done: false }, { date: '2026-12-01', done: false }], '2027-01-02'), '2026-12-30');
  assert.equal(ngaySotGanNhat([{ date: '2028-02-29', done: false }, { date: '2028-02-28', done: false }], '2028-03-01'), '2028-02-29');
});

test('demBeDaKham: chỉ done = true, không tính dòng đã xoá', () => {
  const ps = [
    { id: '1', examDate: '2026-11-02', done: true },
    { id: '2', examDate: '2026-11-02', done: true },
    { id: '3', examDate: '2026-11-02', done: false },
    { id: '4', examDate: '2026-11-02', done: true, deleted: true },
    { id: '5', examDate: '2026-11-03', done: false },
    { id: '6', examDate: '2026-11-04', done: true },
  ];
  assert.deepEqual(demBeDaKham(ps), { '2026-11-02': 2, '2026-11-04': 1 });
  assert.deepEqual(demBeDaKham([]), {});
});

test('chonKhoang: chưa chọn → đầu', () => {
  assert.deepEqual(chonKhoang({ dau: null, cuoi: null }, '2026-11-02'), { dau: '2026-11-02', cuoi: null });
  assert.deepEqual(chonKhoang(null, '2026-11-02'), { dau: '2026-11-02', cuoi: null });
});

test('chonKhoang: có đầu, chạm ngày sau → đủ hai đầu', () => {
  assert.deepEqual(chonKhoang({ dau: '2026-11-02', cuoi: null }, '2026-11-04'), { dau: '2026-11-02', cuoi: '2026-11-04' });
});

test('chonKhoang: có đầu, chạm ngày sớm hơn → tự đảo', () => {
  assert.deepEqual(chonKhoang({ dau: '2026-11-02', cuoi: null }, '2026-10-30'), { dau: '2026-10-30', cuoi: '2026-11-02' });
  // đảo qua năm
  assert.deepEqual(chonKhoang({ dau: '2027-01-02', cuoi: null }, '2026-12-28'), { dau: '2026-12-28', cuoi: '2027-01-02' });
});

test('chonKhoang: chạm lại đúng ngày đầu → khoảng 1 ngày', () => {
  assert.deepEqual(chonKhoang({ dau: '2026-11-02', cuoi: null }, '2026-11-02'), { dau: '2026-11-02', cuoi: '2026-11-02' });
});

test('chonKhoang: đã đủ hai đầu → bắt đầu lại (kể cả khoảng 1 ngày)', () => {
  assert.deepEqual(chonKhoang({ dau: '2026-11-02', cuoi: '2026-11-04' }, '2026-11-10'), { dau: '2026-11-10', cuoi: null });
  assert.deepEqual(chonKhoang({ dau: '2026-11-02', cuoi: '2026-11-02' }, '2026-11-02'), { dau: '2026-11-02', cuoi: null });
});

test('chonKhoang không đổi trạng thái đưa vào', () => {
  const tt = Object.freeze({ dau: '2026-11-02', cuoi: null });
  assert.doesNotThrow(() => chonKhoang(tt, '2026-11-05'));
});

test('soNgayKhoang tính cả hai đầu', () => {
  assert.equal(soNgayKhoang('2026-11-02', '2026-11-04'), 3);
  assert.equal(soNgayKhoang('2026-11-02', '2026-11-02'), 1);
  assert.equal(soNgayKhoang('2026-10-30', '2026-11-02'), 4);       // qua tháng: 30, 31, 01, 02
  assert.equal(soNgayKhoang('2026-12-28', '2027-01-02'), 6);       // qua năm: 28, 29, 30, 31, 01, 02
  assert.equal(soNgayKhoang('2028-02-27', '2028-03-01'), 4);       // năm nhuận: 27, 28, 29, 01
  assert.equal(soNgayKhoang('2027-02-27', '2027-03-01'), 3);       // năm thường: 27, 28, 01
  assert.equal(soNgayKhoang('2026-03-28', '2026-04-02'), 6);       // quanh thời điểm đổi giờ mùa hè ở nơi có DST
  assert.equal(soNgayKhoang('2028-01-01', '2028-12-31'), 366);
  assert.equal(soNgayKhoang('2027-01-01', '2027-12-31'), 365);
});

test('soNgayKhoang: đưa ngược đầu cuối vẫn ra cùng số', () => {
  assert.equal(soNgayKhoang('2026-11-04', '2026-11-02'), 3);
});
