// Kiểm khungBanPhim (src/hooks.js) với visualViewport giả. Phiếu 2026-11-22, phần A.
// Màn hình giả cao 852; bàn phím iPhone cao khoảng 336.
import test from 'node:test';
import assert from 'node:assert/strict';
import { khungBanPhim } from '../src/hooks.js';

const H = 852;
const vv = (o) => ({ width: 393, height: H, offsetTop: 0, offsetLeft: 0, scale: 1, ...o });

test('bàn phím mở (che 336 ở đáy): trả khung còn thấy và duoi = 336', () => {
  assert.deepEqual(khungBanPhim(vv({ height: H - 336 }), H), { top: 0, height: 516, duoi: 336 });
});

test('bàn phím mở và iOS đã đẩy khung lên (offsetTop 200): vẫn là mở, top theo offsetTop, duoi trừ phần đã đẩy', () => {
  assert.deepEqual(khungBanPhim(vv({ height: H - 336, offsetTop: 200 }), H), { top: 200, height: 516, duoi: 136 });
});

test('bàn phím mở và khung bị đẩy hết cỡ (offsetTop 336): vẫn là mở, duoi = 0', () => {
  assert.deepEqual(khungBanPhim(vv({ height: H - 336, offsetTop: 336 }), H), { top: 336, height: 516, duoi: 0 });
});

test('bàn phím đã đóng nhưng Safari để offsetTop còn 120: KHÔNG phải bàn phím mở (null)', () => {
  assert.equal(khungBanPhim(vv({ height: H, offsetTop: 120 }), H), null);
});

test('chỉ co vài chục px (thanh địa chỉ Safari, ≤ 80px): không phải bàn phím (null)', () => {
  assert.equal(khungBanPhim(vv({ height: H - 60 }), H), null);
  assert.equal(khungBanPhim(vv({ height: H - 80 }), H), null);
  assert.notEqual(khungBanPhim(vv({ height: H - 81 }), H), null);
});

test('đang phóng to (scale 1.5): null dù khung nhìn nhỏ hơn cửa sổ', () => {
  assert.equal(khungBanPhim(vv({ height: 400, scale: 1.5 }), H), null);
  assert.equal(khungBanPhim(vv({ height: H - 336, offsetTop: 100, scale: 1.5 }), H), null);
});

test('không có visualViewport: null', () => {
  assert.equal(khungBanPhim(undefined, H), null);
  assert.equal(khungBanPhim(null, H), null);
});

test('offsetTop thiếu hoặc âm không làm hỏng khung', () => {
  assert.deepEqual(khungBanPhim({ height: 516, scale: 1 }, H), { top: 0, height: 516, duoi: 336 });
  assert.deepEqual(khungBanPhim(vv({ height: 516, offsetTop: -5 }), H), { top: 0, height: 516, duoi: 336 });
});
