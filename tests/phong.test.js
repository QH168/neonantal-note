// Xoá phòng khi hôm nay không còn bé (phiếu 2026-11-09). Hàm thuần: ngày là chuỗi YYYY-MM-DD, so chuỗi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phongXoaDuoc, phongHomNay } from '../src/lib/phong.js';

const be = (id, roomId, examDate, extra = {}) => ({ id, roomId, examDate, ...extra });
const HOM_NAY = '2026-11-09';

test('phòng chỉ có bé ngày trước: xoá được, đếm đúng bé ngày trước', () => {
  const ps = [be('a', 'r3', '2026-11-08'), be('b', 'r3', '2026-11-01'), be('c', 'r3', '2026-10-31')];
  assert.deepEqual(phongXoaDuoc('r3', ps, HOM_NAY), { duoc: true, soBeHomNay: 0, soBeNgayTruoc: 3 });
});

test('phòng chưa từng có bé: xoá được, hai số đều 0', () => {
  assert.deepEqual(phongXoaDuoc('r1', [], HOM_NAY), { duoc: true, soBeHomNay: 0, soBeNgayTruoc: 0 });
});

test('có bé hôm nay thì không xoá được', () => {
  const ps = [be('a', 'r3', HOM_NAY), be('b', 'r3', '2026-11-08')];
  assert.deepEqual(phongXoaDuoc('r3', ps, HOM_NAY), { duoc: false, soBeHomNay: 1, soBeNgayTruoc: 1 });
});

test('có bé ngày sau hôm nay thì không xoá được (tính vào soBeHomNay)', () => {
  const ps = [be('a', 'r3', '2026-11-10'), be('b', 'r3', '2026-11-12')];
  assert.deepEqual(phongXoaDuoc('r3', ps, HOM_NAY), { duoc: false, soBeHomNay: 2, soBeNgayTruoc: 0 });
});

test('bé đã xoá (deleted) không tính', () => {
  const ps = [be('a', 'r3', HOM_NAY, { deleted: true }), be('b', 'r3', '2026-11-08', { deleted: true })];
  assert.deepEqual(phongXoaDuoc('r3', ps, HOM_NAY), { duoc: true, soBeHomNay: 0, soBeNgayTruoc: 0 });
});

test('bé của phòng khác không tính', () => {
  const ps = [be('a', 'r2', HOM_NAY), be('b', 'r2', '2026-11-08')];
  assert.deepEqual(phongXoaDuoc('r3', ps, HOM_NAY), { duoc: true, soBeHomNay: 0, soBeNgayTruoc: 0 });
});

test('hôm nay rỗng, undefined, null, sai dạng: không xoá', () => {
  const ps = [be('a', 'r3', '2026-11-08')];
  for (const h of ['', undefined, null, 5, '9/11/2026', '2026-11-9']) {
    const kq = phongXoaDuoc('r3', ps, h);
    assert.equal(kq.duoc, false, String(h));
  }
});

test('danh sách bé không phải mảng thì không xoá', () => {
  assert.equal(phongXoaDuoc('r3', undefined, HOM_NAY).duoc, false);
});

test('qua tháng: hôm nay 2026-12-01, bé 2026-11-30 là ngày trước', () => {
  const kq = phongXoaDuoc('r3', [be('a', 'r3', '2026-11-30')], '2026-12-01');
  assert.deepEqual(kq, { duoc: true, soBeHomNay: 0, soBeNgayTruoc: 1 });
});

test('qua năm: hôm nay 2027-01-01, bé 2026-12-31 là ngày trước; bé 2027-01-01 chặn', () => {
  assert.deepEqual(phongXoaDuoc('r3', [be('a', 'r3', '2026-12-31')], '2027-01-01'),
    { duoc: true, soBeHomNay: 0, soBeNgayTruoc: 1 });
  assert.equal(phongXoaDuoc('r3', [be('a', 'r3', '2026-12-31'), be('b', 'r3', '2027-01-01')], '2027-01-01').duoc, false);
});

// ---- Lưới an toàn: danh sách phòng hôm nay ----
const R1 = { id: 'r1', name: 'Phòng 1', order: 1 };
const R2 = { id: 'r2', name: 'Phòng 2', order: 2 };
const R3x = { id: 'r3', name: 'Phòng 3', order: 3, deleted: true };

test('lưới an toàn: bé hôm nay ở phòng đã xoá thì phòng đó có mặt, xếp sau, daXoa', () => {
  const kq = phongHomNay([R1, R2, R3x], [be('a', 'r3', HOM_NAY), be('b', 'r1', HOM_NAY)]);
  assert.deepEqual(kq.map((r) => r.id), ['r1', 'r2', 'r3']);
  assert.deepEqual(kq.map((r) => r.daXoa), [false, false, true]);
  assert.equal(kq[2].name, 'Phòng 3');
});

test('lưới an toàn: không có bé ở phòng đã xoá thì không hiện phòng đó', () => {
  const kq = phongHomNay([R1, R2, R3x], [be('b', 'r1', HOM_NAY)]);
  assert.deepEqual(kq.map((r) => r.id), ['r1', 'r2']);
  assert.ok(kq.every((r) => r.daXoa === false));
});

test('lưới an toàn: bé ở phòng không tìm thấy vẫn hiện, daXoa, xếp cuối', () => {
  const kq = phongHomNay([R1, R2], [be('a', 'rLa', HOM_NAY)]);
  assert.deepEqual(kq.map((r) => r.id), ['r1', 'r2', 'rLa']);
  assert.equal(kq[2].daXoa, true);
  assert.equal(kq[2].name, 'Phòng đã xoá');
});

test('lưới an toàn: bé đã xoá mềm ở phòng đã xoá không làm phòng hiện', () => {
  const kq = phongHomNay([R1, R3x], [be('a', 'r3', HOM_NAY, { deleted: true })]);
  assert.deepEqual(kq.map((r) => r.id), ['r1']);
});