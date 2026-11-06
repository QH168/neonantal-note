// Ngày làm việc (v9.6). Mọi kết quả mong đợi đều tính tay và ghi thành hằng số, không sinh từ chính hàm được kiểm.
// Giờ trong bài kiểm là giờ máy (new Date(năm, tháng-1, ngày, giờ, phút)), nên bài chạy đúng ở mọi múi giờ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ngayLamViec, cacNgay, ngayLichCuaMs } from '../src/lib/dates.js';
import { MOC_MAC_DINH, MOC_HOP_LE, KHOA_MOC_NGAY_LAM_VIEC, chuanHoaMoc, nhanMoc, giaiThichMoc } from '../src/lib/cai-dat.js';

const at = (y, m, d, h = 0, mi = 0, s = 0, ms = 0) => new Date(y, m - 1, d, h, mi, s, ms);

test('ngayLamViec: biên 06:59 / 07:00 với mốc 07:00 (420)', () => {
  assert.equal(ngayLamViec(at(2026, 11, 5, 6, 59), 420), '2026-11-04');
  assert.equal(ngayLamViec(at(2026, 11, 5, 6, 59, 59, 999), 420), '2026-11-04');
  assert.equal(ngayLamViec(at(2026, 11, 5, 7, 0), 420), '2026-11-05');
  assert.equal(ngayLamViec(at(2026, 11, 5, 7, 0, 0, 1), 420), '2026-11-05');
});

test('ngayLamViec: qua nửa đêm và cuối ngày', () => {
  assert.equal(ngayLamViec(at(2026, 11, 5, 0, 0), 420), '2026-11-04');
  assert.equal(ngayLamViec(at(2026, 11, 5, 2, 30), 420), '2026-11-04'); // ví dụ đặc tả: 02:30 ngày 05/11 thuộc ngày làm việc 04/11
  assert.equal(ngayLamViec(at(2026, 11, 5, 23, 59, 59), 420), '2026-11-05');
});

test('ngayLamViec: qua tháng', () => {
  assert.equal(ngayLamViec(at(2026, 12, 1, 6, 59), 420), '2026-11-30');
  assert.equal(ngayLamViec(at(2026, 12, 1, 7, 0), 420), '2026-12-01');
  assert.equal(ngayLamViec(at(2026, 3, 1, 3, 0), 420), '2026-02-28'); // 2026 không nhuận
});

test('ngayLamViec: qua năm', () => {
  assert.equal(ngayLamViec(at(2027, 1, 1, 3, 0), 420), '2026-12-31');
  assert.equal(ngayLamViec(at(2027, 1, 1, 6, 59), 420), '2026-12-31');
  assert.equal(ngayLamViec(at(2027, 1, 1, 7, 0), 420), '2027-01-01');
});

test('ngayLamViec: 29/02 năm nhuận và 28/02 năm thường', () => {
  assert.equal(ngayLamViec(at(2028, 3, 1, 6, 0), 420), '2028-02-29');
  assert.equal(ngayLamViec(at(2028, 2, 29, 6, 0), 420), '2028-02-28');
  assert.equal(ngayLamViec(at(2028, 2, 29, 7, 0), 420), '2028-02-29');
  assert.equal(ngayLamViec(at(2027, 3, 1, 6, 0), 420), '2027-02-28');
});

test('ngayLamViec: mốc 00:00 đúng bằng ngày lịch', () => {
  assert.equal(ngayLamViec(at(2026, 11, 5, 0, 0), 0), '2026-11-05');
  assert.equal(ngayLamViec(at(2026, 11, 5, 23, 59, 59, 999), 0), '2026-11-05');
  assert.equal(ngayLamViec(at(2027, 1, 1, 0, 0), 0), '2027-01-01');
  assert.equal(ngayLamViec(at(2028, 2, 29, 0, 0), 0), '2028-02-29');
});

test('ngayLamViec: mốc 06:00 (360) và 08:00 (480)', () => {
  assert.equal(ngayLamViec(at(2026, 11, 5, 5, 59), 360), '2026-11-04');
  assert.equal(ngayLamViec(at(2026, 11, 5, 6, 0), 360), '2026-11-05');
  assert.equal(ngayLamViec(at(2026, 11, 5, 7, 59), 480), '2026-11-04');
  assert.equal(ngayLamViec(at(2026, 11, 5, 8, 0), 480), '2026-11-05');
});

test('ngayLamViec: tính theo giờ máy, không qua UTC (00:30 giờ máy)', () => {
  // 00:30 ngày 05/11 giờ máy: nếu nhầm UTC ở múi +7 sẽ ra 04/11 cho mốc 00:00.
  assert.equal(ngayLamViec(at(2026, 11, 5, 0, 30), 0), '2026-11-05');
  assert.equal(ngayLamViec(at(2026, 11, 5, 0, 30), 420), '2026-11-04');
});

test('ngayLamViec: nhận mili giây, mốc lạ về 420', () => {
  assert.equal(ngayLamViec(at(2026, 11, 5, 6, 59).getTime(), 420), '2026-11-04');
  assert.equal(ngayLamViec(at(2026, 11, 5, 6, 59), undefined), '2026-11-04');
  assert.equal(ngayLamViec(at(2026, 11, 5, 7, 0), NaN), '2026-11-05');
  assert.equal(ngayLamViec(at(2026, 11, 5, 6, 59), 'abc'), '2026-11-04');
});

test('cacNgay: homNay / homQua / ngayLich qua mốc, qua nửa đêm, qua năm', () => {
  assert.deepEqual(cacNgay(at(2026, 11, 5, 2, 30), 420), { homNay: '2026-11-04', homQua: '2026-11-03', ngayLich: '2026-11-05' });
  assert.deepEqual(cacNgay(at(2026, 11, 5, 7, 0), 420), { homNay: '2026-11-05', homQua: '2026-11-04', ngayLich: '2026-11-05' });
  assert.deepEqual(cacNgay(at(2027, 1, 1, 3, 0), 420), { homNay: '2026-12-31', homQua: '2026-12-30', ngayLich: '2027-01-01' });
  assert.deepEqual(cacNgay(at(2026, 3, 1, 3, 0), 420), { homNay: '2026-02-28', homQua: '2026-02-27', ngayLich: '2026-03-01' });
  assert.deepEqual(cacNgay(at(2028, 3, 1, 6, 0), 420), { homNay: '2028-02-29', homQua: '2028-02-28', ngayLich: '2028-03-01' });
  assert.deepEqual(cacNgay(at(2026, 11, 5, 2, 30), 0), { homNay: '2026-11-05', homQua: '2026-11-04', ngayLich: '2026-11-05' });
});

test('ngayLichCuaMs: ngày lịch giờ máy của một mốc thời gian (không UTC)', () => {
  assert.equal(ngayLichCuaMs(at(2026, 11, 5, 0, 30).getTime()), '2026-11-05');
  assert.equal(ngayLichCuaMs(at(2026, 11, 4, 23, 59, 59, 999).getTime()), '2026-11-04');
  assert.equal(ngayLichCuaMs(at(2027, 1, 1, 0, 0).getTime()), '2027-01-01');
});

test('chuanHoaMoc: chỉ nhận 0, 360, 420, 480; lạ về 420', () => {
  assert.equal(MOC_MAC_DINH, 420);
  assert.deepEqual(MOC_HOP_LE, [0, 360, 420, 480]);
  for (const v of [0, 360, 420, 480]) assert.equal(chuanHoaMoc(v), v);
  assert.equal(chuanHoaMoc('360'), 360);
  assert.equal(chuanHoaMoc('0'), 0);
  for (const v of [undefined, null, '', ' ', 'abc', NaN, Infinity, -60, 450, 421, 1440, 420.5, true, {}, [], '07:00']) {
    assert.equal(chuanHoaMoc(v), 420, 'giá trị lạ phải về 420: ' + JSON.stringify(v));
  }
});

test('khoá meta và nhãn mốc', () => {
  assert.equal(KHOA_MOC_NGAY_LAM_VIEC, 'mocNgayLamViec');
  assert.equal(nhanMoc(0), '00:00');
  assert.equal(nhanMoc(360), '06:00');
  assert.equal(nhanMoc(420), '07:00');
  assert.equal(nhanMoc(480), '08:00');
  assert.equal(nhanMoc('lạ'), '07:00');
});

test('giaiThichMoc: câu đổi theo mốc, mốc 00:00 nói là ngày lịch', () => {
  assert.match(giaiThichMoc(420), /07:00/);
  assert.match(giaiThichMoc(480), /08:00/);
  assert.notEqual(giaiThichMoc(420), giaiThichMoc(480));
  assert.match(giaiThichMoc(0), /nửa đêm|ngày lịch/);
  assert.equal(giaiThichMoc('lạ'), giaiThichMoc(420));
});
