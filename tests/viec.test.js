import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TAGS, TAG_COLOR, laViecMoi, chuanHoaTags, batTatNhan, soSanhViec, sapViec, khuHienThi, boDemCham, themCham, chuanTenViec, khuDeChon } from '../src/lib/viec.js';

test('TAGS và màu', () => {
  assert.deepEqual(TAGS, ['NV', 'BM', 'CK', 'HC', 'XN']);
  assert.deepEqual(TAG_COLOR, { NV: 1, BM: 2, CK: 3, HC: 4, XN: 5 });
});

test('laViecMoi: có mảng tags (kể cả rỗng) là việc mới', () => {
  assert.equal(laViecMoi({ tags: [] }), true);
  assert.equal(laViecMoi({ tags: ['NV'] }), true);
  assert.equal(laViecMoi({ urgency: 3 }), false);
  assert.equal(laViecMoi({ tags: 'NV' }), false);
  assert.equal(laViecMoi(null), false);
});

test('chuanHoaTags: lọc lạ, bỏ trùng, đúng thứ tự', () => {
  assert.deepEqual(chuanHoaTags(['XN', 'NV', 'XN', 'abc', 'CK']), ['NV', 'CK', 'XN']);
  assert.deepEqual(chuanHoaTags([]), []);
  assert.deepEqual(chuanHoaTags(undefined), []);
});

test('batTatNhan: bật, tắt, không đổi mảng gốc', () => {
  const g = ['NV', 'HC'];
  assert.deepEqual(batTatNhan(g, 'BM'), ['NV', 'BM', 'HC']);
  assert.deepEqual(batTatNhan(g, 'NV'), ['HC']);
  assert.deepEqual(g, ['NV', 'HC']);
  assert.deepEqual(batTatNhan([], 'XN'), ['XN']);
  assert.deepEqual(batTatNhan(['XN'], 'zzz'), ['XN']);
});

test('sapViec: chưa xong trước, rồi createdAt, rồi id; ổn định, không đổi gốc', () => {
  const l = [
    { id: 'd', done: true, createdAt: 1 },
    { id: 'b', createdAt: 5, urgency: 1 },
    { id: 'a', createdAt: 5, tags: ['NV'] },
    { id: 'c', createdAt: 2, urgency: 5 }
  ];
  const copy = JSON.stringify(l);
  assert.deepEqual(sapViec(l).map((t) => t.id), ['c', 'a', 'b', 'd']);
  assert.deepEqual(sapViec([...l].reverse()).map((t) => t.id), ['c', 'a', 'b', 'd']);
  assert.equal(JSON.stringify(l), copy);
  assert.ok(soSanhViec({ id: 'x', done: false }, { id: 'y', done: true }) < 0);
});

test('khuHienThi: khu cũ chỉ hiện khi còn việc chưa xoá', () => {
  const Z = ['NICU', 'CT'], L = ['BM'];
  assert.deepEqual(khuHienThi([], Z, L), ['NICU', 'CT']);
  assert.deepEqual(khuHienThi([{ zone: 'BM', deleted: true }], Z, L), ['NICU', 'CT']);
  assert.deepEqual(khuHienThi([{ zone: 'BM', done: true }], Z, L), ['NICU', 'CT', 'BM']);
  assert.deepEqual(khuHienThi([{ zone: 'CT' }], Z, L), ['NICU', 'CT']);
});

test('boDemCham: n lần chạm trong 1 giây', () => {
  assert.equal(boDemCham([100], 2), false);
  assert.equal(boDemCham([100, 900], 2), true);
  assert.equal(boDemCham([100, 1100], 2), true); // đúng 1000ms vẫn tính
  assert.equal(boDemCham([100, 1101], 2), false);
  assert.equal(boDemCham([0, 400, 800], 3), true);
  assert.equal(boDemCham([0, 400], 3), false);
  assert.equal(boDemCham([0, 900, 1500], 3), false);
  assert.equal(boDemCham([], 2), false);
});

test('themCham: bỏ mốc cũ, chạm chậm không cộng dồn', () => {
  let m = [];
  m = themCham(m, 0); m = themCham(m, 400);
  assert.equal(boDemCham(m, 2), true);
  assert.equal(boDemCham(m, 3), false);
  m = themCham(m, 800);
  assert.equal(boDemCham(m, 3), true);
  m = themCham([], 0); m = themCham(m, 2000);
  assert.deepEqual(m, [2000]);
  assert.equal(boDemCham(m, 2), false);
});

test('chuanTenViec: bỏ khoảng trắng 2 đầu, rỗng thì ra chuỗi rỗng', () => {
  assert.equal(chuanTenViec('  Siêu âm tim  '), 'Siêu âm tim');
  assert.equal(chuanTenViec('   '), '');
  assert.equal(chuanTenViec(undefined), '');
  assert.equal(chuanTenViec(null), '');
});

test('khuDeChon: giữ khu cũ (BM) để ô chọn khu không làm mất khu hiện tại', () => {
  const Z = ['NICU', 'CT'];
  assert.deepEqual(khuDeChon(Z, 'CT'), ['NICU', 'CT']);
  assert.deepEqual(khuDeChon(Z, 'BM'), ['NICU', 'CT', 'BM']);
  assert.deepEqual(khuDeChon(Z, undefined), ['NICU', 'CT']);
  assert.notEqual(khuDeChon(Z, 'CT'), Z); // trả mảng mới
});
