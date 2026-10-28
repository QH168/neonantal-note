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

// ---- v8 đợt 2: bảng abbrevs (bác sĩ duyệt 28/10/2026) ----
const BANG = ['tasks', 'rooms', 'exam_patients', 'patient_todos', 'abbrevs'];

test('abbrevs gộp theo dòng như các bảng khác (sửa sau cùng thắng, xoá không sống lại)', () => {
  const local = [{ id: 'mau-ctm', key: 'ctm', text: 'Công thức máu', updatedAt: 100 }, { id: 'x', key: 'x', text: 'a', updatedAt: 500 }];
  const incoming = [
    { id: 'mau-ctm', key: 'ctm', text: 'Công thức máu', deleted: true, updatedAt: 200 },
    { id: 'x', key: 'x', text: 'cũ hơn', updatedAt: 400 },
    { id: 'moi', key: 'moi', text: 'Mới', updatedAt: 1 }
  ];
  const r = mergeRows(local, incoming);
  assert.deepEqual([r.added, r.updated, r.skipped], [1, 1, 1]);
  assert.equal(r.toPut.find((x) => x.id === 'mau-ctm').deleted, true);
});

test('file sao lưu bản cũ (không có abbrevs) vẫn hợp lệ; nhập không đụng viết tắt hiện có', () => {
  const cu = { format: BACKUP_FORMAT, version: 1, tables: { tasks: [], rooms: [], exam_patients: [], patient_todos: [] } };
  assert.equal(validateBackup(cu, BANG), null);
  // importBackupFile dùng `data.tables[t] || []` → bảng thiếu không có dòng nào để gộp, bảng abbrevs trên máy giữ nguyên.
  const incoming = cu.tables.abbrevs || [];
  assert.deepEqual(mergeRows([{ id: 'a', updatedAt: 1 }], incoming), { toPut: [], added: 0, updated: 0, skipped: 0 });
});

test('file mới có abbrevs hợp lệ; abbrevs hỏng bị báo lỗi', () => {
  assert.equal(validateBackup({ format: BACKUP_FORMAT, version: 1, tables: { abbrevs: [] } }, BANG), null);
  assert.ok(validateBackup({ format: BACKUP_FORMAT, version: 1, tables: { abbrevs: {} } }, BANG));
});

test('BACKUP_VERSION giữ 1: bảng mới là tuỳ chọn, bản app cũ nhập file mới vẫn được (bỏ qua abbrevs)', async () => {
  const { BACKUP_VERSION } = await import('../src/lib/merge.js');
  assert.equal(BACKUP_VERSION, 1);
});
