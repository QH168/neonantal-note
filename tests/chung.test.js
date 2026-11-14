// Hàm dùng chung (src/lib/chung.js): chia nhóm một lượt, việc theo bé.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alive, nhomTheo, viecTheoBe } from '../src/lib/chung.js';

test('alive: dòng chưa xoá', () => {
  assert.equal(alive({}), true);
  assert.equal(alive({ deleted: false }), true);
  assert.equal(alive({ deleted: true }), false);
});

test('nhomTheo: giữ thứ tự gặp của nhóm và của dòng; cho kết quả như lọc từng nhóm', () => {
  const ds = [{ k: 'b', n: 1 }, { k: 'a', n: 2 }, { k: 'b', n: 3 }, { k: undefined, n: 4 }, { k: 'a', n: 5 }];
  const m = nhomTheo(ds, (x) => x.k);
  assert.deepEqual([...m.keys()], ['b', 'a', undefined]);
  for (const k of m.keys()) assert.deepEqual(m.get(k), ds.filter((x) => x.k === k));
  assert.equal(nhomTheo([], (x) => x).size, 0);
  assert.equal(nhomTheo(null, (x) => x).size, 0);
  assert.equal(m.get('không có'), undefined);
});

test('viecTheoBe: chia theo bé, xếp theo order rồi createdAt, không đổi mảng gốc', () => {
  const todos = [
    { id: 'c', patientId: 'p1', order: 2, createdAt: 1 },
    { id: 'a', patientId: 'p2', order: 1, createdAt: 9 },
    { id: 'b', patientId: 'p1', order: 1, createdAt: 5 },
    { id: 'd', patientId: 'p1', createdAt: 3 },
    { id: 'e', patientId: 'p1', createdAt: 2 }
  ];
  const goc = todos.map((t) => t.id).join();
  const r = viecTheoBe(todos);
  assert.deepEqual(Object.keys(r).sort(), ['p1', 'p2']);
  assert.deepEqual(r.p1.map((t) => t.id), ['e', 'd', 'b', 'c']);
  assert.deepEqual(r.p2.map((t) => t.id), ['a']);
  assert.equal(todos.map((t) => t.id).join(), goc);
  assert.deepEqual(viecTheoBe([]), {});
});
