import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taoChamHaiLan, CUA_SO_HAI_LAN_MS } from '../src/lib/cham-hai-lan.js';

test('cửa sổ mặc định 350ms', () => assert.equal(CUA_SO_HAI_LAN_MS, 350));

test('đang tắt, chạm 1 lần: bật', () => {
  const c = taoChamHaiLan();
  assert.equal(c.cham(1000, false), 'bat');
});

test('đang bật, chạm 1 lần: không làm gì', () => {
  const c = taoChamHaiLan();
  assert.equal(c.cham(1000, true), 'khong');
});

test('đã bật sẵn, chạm 2 lần nhanh: mở bảng', () => {
  const c = taoChamHaiLan();
  assert.equal(c.cham(1000, true), 'khong');
  assert.equal(c.cham(1200, true), 'mo');
});

test('chạm 2 lần ngay sau cú vừa bật: không mở bảng', () => {
  const c = taoChamHaiLan();
  assert.equal(c.cham(1000, false), 'bat');
  assert.equal(c.cham(1150, true), 'khong');
});

test('sau cú "vừa bật + chạm thứ hai", cú kế tiếp bắt đầu cặp mới', () => {
  const c = taoChamHaiLan();
  c.cham(1000, false); c.cham(1100, true);
  assert.equal(c.cham(1200, true), 'khong'); // cú đầu của cặp mới, không phải cú thứ hai
  assert.equal(c.cham(1300, true), 'mo');
});

test('hai cú cách nhau quá cửa sổ: tính là hai cú đơn', () => {
  const c = taoChamHaiLan();
  assert.equal(c.cham(1000, true), 'khong');
  assert.equal(c.cham(1000 + 351, true), 'khong');
  assert.equal(c.cham(1000 + 351 + 350, true), 'mo'); // đúng mép cửa sổ vẫn tính
});

test('sau khi mở bảng, cú kế tiếp bắt đầu cặp mới', () => {
  const c = taoChamHaiLan();
  c.cham(1000, true); c.cham(1100, true);
  assert.equal(c.cham(1200, true), 'khong');
});

test('cửa sổ tuỳ chỉnh', () => {
  const c = taoChamHaiLan({ cuaSo: 100 });
  c.cham(1000, true);
  assert.equal(c.cham(1150, true), 'khong');
  assert.equal(c.cham(1200, true), 'mo');
});

test('tắt rồi bật lại: bật, rồi chờ hết cửa sổ, chạm khi đã bật chỉ là cú đơn', () => {
  const c = taoChamHaiLan();
  assert.equal(c.cham(1000, false), 'bat');
  assert.equal(c.cham(2000, true), 'khong');
});
