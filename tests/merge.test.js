import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeRows, validateBackup, backupFileName, BACKUP_FORMAT } from '../src/lib/merge.js';

test('thêm dòng mới, cập nhật dòng cũ hơn, giữ dòng trên máy mới hơn', () => {
  const local = [
    { id: 'a', text: 'cũ', updatedAt: 100 },
    { id: 'b', text: 'máy này mới hơn', updatedAt: 300 },
    undefined // bulkGet trả undefined khi không tìm thấy
  ];
  const incoming = [
    { id: 'a', text: 'mới', updatedAt: 200 },
    { id: 'b', text: 'file cũ hơn', updatedAt: 250 },
    { id: 'c', text: 'dòng mới', updatedAt: 50 }
  ];
  const r = mergeRows(local, incoming);
  assert.equal(r.added, 1);
  assert.equal(r.updated, 1);
  assert.equal(r.skipped, 1);
  assert.deepEqual(r.toPut.map((x) => x.id).sort(), ['a', 'c']);
});

test('dòng đã xoá ở máy kia (deleted, mới hơn) ghi đè dòng còn sống', () => {
  const r = mergeRows([{ id: 'a', deleted: false, updatedAt: 1 }], [{ id: 'a', deleted: true, updatedAt: 2 }]);
  assert.equal(r.toPut[0].deleted, true);
});

test('bằng thời gian thì giữ bản trên máy; dòng thiếu id bị bỏ qua', () => {
  const r = mergeRows([{ id: 'a', updatedAt: 5 }], [{ id: 'a', updatedAt: 5 }, { text: 'không id' }]);
  assert.equal(r.toPut.length, 0);
  assert.equal(r.skipped, 2);
});

test('kiểm tra định dạng file', () => {
  assert.ok(validateBackup({}, ['tasks']));
  assert.ok(validateBackup({ format: BACKUP_FORMAT, version: 99, tables: {} }, ['tasks']));
  assert.ok(validateBackup({ format: BACKUP_FORMAT, version: 1, tables: { tasks: 'x' } }, ['tasks']));
  assert.equal(validateBackup({ format: BACKUP_FORMAT, version: 1, tables: { tasks: [] } }, ['tasks']), null);
});

test('tên file', () => {
  assert.equal(backupFileName(new Date(2026, 9, 19, 22, 5), 'iphone'), 'ghichu_2026-10-19_2205_iphone.json');
});
