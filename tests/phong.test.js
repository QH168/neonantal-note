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

// ---- 22/11: chép cả phòng ngày trước sang hôm nay ----
import { phongDichChep, lapKeHoachChepPhong } from '../src/lib/phong.js';
import { readFileSync } from 'node:fs';

const TU = '2026-11-21';
const PH = [
  { id: 'r1', name: 'Phòng 1', order: 1 },
  { id: 'r2', name: 'Phòng 2', order: 2 },
  { id: 'r1x', name: 'phòng  1 ', order: 9, deleted: true },
  { id: 'r5x', name: 'Phòng 5', order: 5, deleted: true }
];
const bn = (id, code, order, extra = {}) => ({ id, roomId: 'r1', examDate: TU, code, dob: '0810', ga: '346', wt: '1800', note: 'ghi chú ' + code, order, ...extra });
const vi = (id, text, done, order, extra = {}) => ({ id, patientId: 'x', text, done, order, ...extra });
const kehoach = (o = {}) => lapKeHoachChepPhong({
  rooms: PH, roomId: 'r1', tuNgay: TU, homNay: HOM_NAY, cur: [],
  beNguon: [bn('a', 'G01', 1), bn('b', 'G02', 2), bn('o', 'G09', 1, { roomId: 'r2' })],
  viecTheoBe: {
    a: [vi('t2', 'Việc xong', true, 2, { doneAt: 1234 }), vi('t1', 'Việc chưa xong', false, 1), vi('t3', 'Việc đã xoá', false, 3, { deleted: true })],
    b: []
  }, ...o
});

test('chép phòng: chép mọi bé còn sống của đúng phòng, kèm ghi chú và TẤT CẢ việc (xong và chưa xong)', () => {
  const k = kehoach({ homNay: '2026-11-22' });
  assert.equal(k.ok, true);
  assert.deepEqual([k.soBe, k.soViec, k.boQua.length], [2, 2, 0]);
  assert.deepEqual(k.ke.map((x) => x.be.code), ['G01', 'G02']);
  assert.equal(k.ke[0].be.note, 'ghi chú G01');
  assert.equal(k.ke[0].be.roomId, 'r1');
  assert.equal(k.ke[0].be.examDate, '2026-11-22');
  assert.equal(k.ke[0].be.copiedFrom, 'a');
  assert.equal(k.ke[0].be.done, false);
  // việc: theo order, đánh số lại từ 1, giữ xong/chưa xong và giờ xong; việc đã xoá không chép
  assert.deepEqual(k.ke[0].viec, [
    { text: 'Việc chưa xong', done: false, doneAt: null, order: 1 },
    { text: 'Việc xong', done: true, doneAt: 1234, order: 2 }
  ]);
});

test('chép phòng: KHÔNG mang daNhapMay (và không mang trường lạ nào khác)', () => {
  const k = lapKeHoachChepPhong({
    rooms: PH, roomId: 'r1', tuNgay: TU, homNay: '2026-11-22', cur: [],
    beNguon: [bn('a', 'G01', 1, { daNhapMay: true, done: true, id2: 'x' })], viecTheoBe: {}
  });
  assert.equal(k.ke[0].be.daNhapMay, undefined);
  assert.equal(k.ke[0].be.done, false);
  assert.deepEqual(Object.keys(k.ke[0].be).sort(), ['code', 'copiedFrom', 'dob', 'done', 'examDate', 'ga', 'note', 'order', 'roomId', 'wt']);
});

test('chép phòng: bé đã có hôm nay (cùng phòng + mã, không phân biệt hoa thường; hoặc đã chép từ bé này) bị bỏ qua', () => {
  const cur = [
    { id: 'h1', roomId: 'r1', examDate: '2026-11-22', code: ' g01 ', order: 4 },
    { id: 'h2', roomId: 'r1', examDate: '2026-11-22', code: '', copiedFrom: 'b', order: 5 },
    { id: 'h3', roomId: 'r2', examDate: '2026-11-22', code: 'G02', order: 6 }, // phòng khác: không chặn
    { id: 'h4', roomId: 'r1', examDate: '2026-11-22', code: 'G02', deleted: true }
  ];
  const k = kehoach({ homNay: '2026-11-22', cur });
  assert.deepEqual(k.boQua, [{ id: 'a', ly: 'trung' }, { id: 'b', ly: 'trung' }]);
  assert.deepEqual([k.ok, k.soBe, k.soViec, k.ke.length], [true, 0, 0, 0]);
});

test('chép phòng: hai bé trùng mã trong cùng lượt chỉ chép một; bé không mã đều chép; thứ tự nối tiếp bé hôm nay', () => {
  const cur = [{ id: 'h', roomId: 'r2', examDate: '2026-11-22', code: 'Z', order: 7 }];
  const k = kehoach({
    homNay: '2026-11-22', cur,
    beNguon: [bn('a', 'G01', 1), bn('a2', 'g01', 2), bn('n1', '', 3), bn('n2', '', 4)], viecTheoBe: {}
  });
  assert.deepEqual(k.ke.map((x) => x.nguonId), ['a', 'n1', 'n2']);
  assert.deepEqual(k.boQua, [{ id: 'a2', ly: 'trung' }]);
  assert.deepEqual(k.ke.map((x) => x.be.order), [8, 9, 10]);
});

test('chép phòng: phòng ngày trước đã xoá → chép vào phòng còn sống cùng tên; không có thì báo lý do', () => {
  assert.deepEqual(phongDichChep(PH, 'r1x'), { room: PH[0], doiPhong: true }); // "phòng  1 " = "Phòng 1"
  assert.deepEqual(phongDichChep(PH, 'r1'), { room: PH[0], doiPhong: false });
  assert.equal(phongDichChep(PH, 'r5x'), null);
  assert.equal(phongDichChep(PH, 'khong-co'), null);
  const k = kehoach({ homNay: '2026-11-22', roomId: 'r1x', beNguon: [bn('a', 'G01', 1, { roomId: 'r1x' })], viecTheoBe: {} });
  assert.equal(k.ok, true);
  assert.equal(k.doiPhong, true);
  assert.equal(k.phongDich.id, 'r1');
  assert.equal(k.ke[0].be.roomId, 'r1');
  assert.deepEqual(kehoach({ homNay: '2026-11-22', roomId: 'r5x' }), { ok: false, ly: 'phong-xoa-khong-co-phong-cung-ten' });
  assert.deepEqual(kehoach({ homNay: '2026-11-22', roomId: 'khong-co' }), { ok: false, ly: 'khong-thay-phong' });
});

test('chép phòng: ngày sai (tuNgay không trước homNay, sai dạng) không chép', () => {
  for (const [tu, nay] of [[TU, TU], ['2026-11-22', TU], ['21/11', '2026-11-22'], [undefined, '2026-11-22'], [TU, '']]) {
    assert.deepEqual(kehoach({ tuNgay: tu, homNay: nay }), { ok: false, ly: 'ngay-sai' }, String(tu) + '/' + nay);
  }
});

test('chép phòng: qua tháng, qua năm; bé ngày khác và bé đã xoá của nguồn không chép', () => {
  const k = lapKeHoachChepPhong({
    rooms: PH, roomId: 'r1', tuNgay: '2026-12-31', homNay: '2027-01-01', cur: [],
    beNguon: [bn('a', 'G01', 1, { examDate: '2026-12-31' }), bn('b', 'G02', 2, { examDate: '2026-12-30' }), bn('c', 'G03', 3, { examDate: '2026-12-31', deleted: true })],
    viecTheoBe: {}
  });
  assert.deepEqual(k.ke.map((x) => x.nguonId), ['a']);
  assert.equal(k.ke[0].be.examDate, '2027-01-01');
});

test('chép phòng: phòng không có bé nguồn → ok, 0 bé (giao diện báo "phòng này không có bé")', () => {
  const k = kehoach({ homNay: '2026-11-22', beNguon: [] });
  assert.deepEqual([k.ok, k.soBe, k.soViec, k.boQua], [true, 0, 0, []]);
});

test('daNhapMay: các hàm chép bé trong actions.js không nhắc tới trường này', () => {
  const src = readFileSync(new URL('../src/lib/actions.js', import.meta.url), 'utf8');
  const tu = src.indexOf('export async function copyPatientsFrom');
  const den = src.indexOf('Chép CẢ PHÒNG'); // hết chepMotBe, trước chú thích của hàm chép phòng
  assert.ok(tu > 0 && den > tu);
  assert.doesNotMatch(src.slice(tu, den), /daNhapMay/);
  assert.match(src, /setDaNhapMay = \(id, giaTri\) => updateRow\('exam_patients', id, \{ daNhapMay: !!giaTri \}\)/);
});

test('daNhapMay: không cần db.version mới (không là chỉ mục)', () => {
  const db = readFileSync(new URL('../src/db.js', import.meta.url), 'utf8');
  assert.doesNotMatch(db, /daNhapMay/);
  assert.match(db, /exam_patients: 'id, examDate, roomId, \[examDate\+roomId\], updatedAt'/);
  assert.equal((db.match(/^db\.version\(\d+\)/gm) || []).length, 3); // version(1), version(2) (abbrevs), version(3) (gio_may, 25/11/2026); daNhapMay vẫn không cần version riêng
});

test('chép phòng: KHÔNG mang gioNhap, gioKham của bé nguồn (giờ không đi sang ngày mới)', () => {
  const k = lapKeHoachChepPhong({
    rooms: PH, roomId: 'r1', tuNgay: TU, homNay: '2026-11-22', cur: [],
    beNguon: [bn('a', 'G01', 1, { gioNhap: 495, gioKham: 600 }), bn('b', 'G02', 2, { gioNhap: null, gioKham: 0 })], viecTheoBe: {}
  });
  assert.equal(k.ke.length, 2);
  for (const x of k.ke) {
    assert.equal('gioNhap' in x.be, false);
    assert.equal('gioKham' in x.be, false);
  }
  assert.deepEqual(Object.keys(k.ke[0].be).sort(), ['code', 'copiedFrom', 'dob', 'done', 'examDate', 'ga', 'note', 'order', 'roomId', 'wt']);
});