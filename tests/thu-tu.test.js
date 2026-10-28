import { test } from 'node:test';
import assert from 'node:assert/strict';
import { soSanhBe, sapBe, orderTiepTheo } from '../src/lib/thu-tu.js';

const ids = (l) => sapBe(l).map((p) => p.id);

test('createdAt trùng, order khác: theo order, mọi thứ tự đầu vào cho cùng kết quả', () => {
  const l = [{ id: 'z', order: 1, createdAt: 5 }, { id: 'a', order: 2, createdAt: 5 }, { id: 'm', order: 3, createdAt: 5 }];
  for (const p of [[0, 1, 2], [2, 1, 0], [1, 2, 0], [1, 0, 2]]) assert.deepEqual(ids(p.map((i) => l[i])), ['z', 'a', 'm']);
});

test('không order, createdAt trùng: theo id, ổn định', () => {
  const l = [{ id: 'b', createdAt: 1 }, { id: 'a', createdAt: 1 }];
  assert.deepEqual(ids(l), ['a', 'b']);
  assert.deepEqual(ids([...l].reverse()), ['a', 'b']);
});

test('dữ liệu cũ không order giữ thứ tự createdAt', () => {
  const l = [{ id: 'x', createdAt: 30 }, { id: 'y', createdAt: 10 }, { id: 'w', createdAt: 20 }];
  assert.deepEqual(ids(l), ['y', 'w', 'x']);
});

test('trộn có/không order: có order trước, không order sau theo createdAt', () => {
  const l = [{ id: 'tay', createdAt: 99 }, { id: 'c2', order: 2, createdAt: 50 }, { id: 'cu', createdAt: 1 }, { id: 'c1', order: 1, createdAt: 50 }];
  assert.deepEqual(ids(l), ['c1', 'c2', 'cu', 'tay']);
});

test('không sửa mảng gốc; order không phải số coi như không có', () => {
  const l = [{ id: 'b', order: 2 }, { id: 'a', order: 'x' }, { id: 'c', order: 1 }];
  const copy = JSON.stringify(l);
  assert.deepEqual(ids(l), ['c', 'b', 'a']);
  assert.equal(JSON.stringify(l), copy);
  assert.equal(soSanhBe(l[0], l[0]), 0);
});

test('bé thêm tay sau khi chép nằm cuối', () => {
  const chep = [{ id: 'q', order: 1, createdAt: 7 }, { id: 'p', order: 2, createdAt: 7 }];
  const tay = { id: 'a', order: orderTiepTheo(chep), createdAt: 8 };
  assert.equal(tay.order, 3);
  assert.deepEqual(ids([tay, ...chep]), ['q', 'p', 'a']);
});

test('orderTiepTheo: ngày trống hoặc toàn bé cũ không order -> 1; bỏ qua order lạ', () => {
  assert.equal(orderTiepTheo([]), 1);
  assert.equal(orderTiepTheo([{ id: 'a' }, { id: 'b', order: null }]), 1);
  assert.equal(orderTiepTheo([{ order: 4 }, { order: 2 }]), 5);
});
