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

// ---- v9 đợt 9.2: doneAt và khôi phục sau xoá (bác sĩ duyệt 05/11/2026) ----
test('doneAt: dòng cũ không có doneAt gộp được (thêm, cập nhật, giữ)', () => {
  const cu = { id: 'a', text: 'việc cũ', done: true, updatedAt: 100 }; // không có doneAt
  const r = mergeRows([cu], [{ id: 'a', text: 'việc cũ', done: true, doneAt: 500, updatedAt: 200 }, { id: 'b', done: true, updatedAt: 1 }]);
  assert.deepEqual([r.added, r.updated, r.skipped], [1, 1, 0]);
  assert.equal(r.toPut.find((x) => x.id === 'a').doneAt, 500);
  // bản trên máy mới hơn mà không có doneAt: giữ nguyên, không bị doneAt cũ hơn ghi đè
  const r2 = mergeRows([{ id: 'a', done: true, updatedAt: 300 }], [{ id: 'a', done: true, doneAt: 500, updatedAt: 200 }]);
  assert.equal(r2.toPut.length, 0);
});

test('doneAt: file sao lưu cũ (dòng không có doneAt) hợp lệ và nhập được; BACKUP_VERSION vẫn 1', () => {
  const cu = { format: BACKUP_FORMAT, version: 1, tables: {
    tasks: [{ id: 't', text: 'x', done: true, updatedAt: 1, deleted: false }],
    exam_patients: [{ id: 'p', code: 'G1', done: true, updatedAt: 1 }],
    patient_todos: [{ id: 'd', patientId: 'p', text: 'y', done: true, updatedAt: 1 }] } };
  assert.equal(validateBackup(cu, BANG), null);
  for (const t of Object.keys(cu.tables)) {
    const r = mergeRows([], cu.tables[t]);
    assert.equal(r.added, 1, t);
    assert.equal('doneAt' in r.toPut[0], false, t + ' không tự thêm doneAt');
  }
});

test('doneAt đi theo bản sửa sau cùng; bỏ xong đưa doneAt về null và thắng khi gộp', () => {
  const xong = { id: 'a', done: true, doneAt: 1000, updatedAt: 1000 };
  const bo = { id: 'a', done: false, doneAt: null, updatedAt: 2000 };
  const r = mergeRows([xong], [bo]);
  assert.equal(r.toPut[0].done, false);
  assert.equal(r.toPut[0].doneAt, null);
  // ngược lại: máy kia đánh dấu xong muộn hơn
  const r2 = mergeRows([bo], [{ ...xong, doneAt: 3000, updatedAt: 3000 }]);
  assert.equal(r2.toPut[0].doneAt, 3000);
  // bản cũ hơn không ghi đè
  assert.equal(mergeRows([bo], [xong]).toPut.length, 0);
});

test('hoàn tác xoá thắng khi gộp vì updatedAt mới hơn; giữ nguyên nhãn, ghi chú, trạng thái', () => {
  const goc = { id: 'a', text: 'Siêu âm', tags: ['NV', 'XN'], note: 'ghi chú', zone: 'CT', done: true, doneAt: 900, deleted: false, updatedAt: 1000 };
  const daXoa = { ...goc, deleted: true, updatedAt: 2000 };
  const khoiPhuc = { ...daXoa, deleted: false, updatedAt: 3000 };
  // máy kia còn bản đã xoá (2000), file từ máy này mang bản khôi phục (3000)
  const r = mergeRows([daXoa], [khoiPhuc]);
  assert.equal(r.toPut[0].deleted, false);
  assert.deepEqual(r.toPut[0].tags, ['NV', 'XN']);
  assert.equal(r.toPut[0].note, 'ghi chú');
  assert.equal(r.toPut[0].done, true);
  assert.equal(r.toPut[0].doneAt, 900);
  // và bản đã xoá cũ hơn không làm dòng khôi phục chết lại
  assert.equal(mergeRows([khoiPhuc], [daXoa]).toPut.length, 0);
});

test('actions.js: hàm thuần doneAt / khôi phục', async () => {
  const { phanDoiXong, phanKhoiPhuc } = await import('../src/lib/actions.js');
  assert.deepEqual(phanDoiXong(true, 1234), { done: true, doneAt: 1234 });
  assert.deepEqual(phanDoiXong(false, 1234), { done: false, doneAt: null });
  assert.equal(typeof phanDoiXong(true).doneAt, 'number');
  // khôi phục chỉ đổi deleted (không mang nhãn, ghi chú, trạng thái đi đâu)
  assert.deepEqual(phanKhoiPhuc(), { deleted: false });
});

test('actions.js (đọc mã nguồn, chưa chạy với IndexedDB): ghi doneAt, khôi phục, clearDone trả id, copyPatientsFrom không mang doneAt', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/lib/actions.js', import.meta.url), 'utf8');
  assert.match(src, /toggleTask = \(t\) => updateRow\('tasks', t\.id, phanDoiXong\(!t\.done\)\)/);
  assert.match(src, /toggleTodo = \(t\) => updateRow\('patient_todos', t\.id, phanDoiXong\(!t\.done\)\)/);
  assert.match(src, /setPatientDone = \(p, done = !p\.done\) => updateRow\('exam_patients', p\.id, phanDoiXong\(done\)\)/);
  assert.match(src, /export async function clearDone[\s\S]*?return ids;/);
  assert.match(src, /export async function khoiPhucNhieu[\s\S]*?updateRow\(table, id, phanKhoiPhuc\(\)\)/);
  assert.match(src, /export async function khoiPhucAbbrev[\s\S]*?mucSongTheoKey[\s\S]*?\{ trung: true, muc \}/);
  // việc tạo mới / bé chép sang hôm nay: không có doneAt, done:false
  const copy = /export async function copyPatientsFrom[\s\S]*?\r?\n}\r?\n/.exec(src)[0];
  assert.doesNotMatch(copy, /doneAt/);
  assert.match(copy, /done: false/);
  assert.doesNotMatch(/export const addTask[\s\S]*?done: false\r?\n\}\);/.exec(src)[0], /doneAt/);
});

// ---------- Đợt 9.6: mốc ngày làm việc, dời việc, chép một bé ----------
import { readFileSync as docFile } from 'node:fs';
import { chuanHoaMoc, KHOA_MOC_NGAY_LAM_VIEC } from '../src/lib/cai-dat.js';
const docMa = (duongDan) => docFile(new URL(duongDan, import.meta.url), 'utf8');

test('9.6: mốc ngày làm việc KHÔNG ra file sao lưu và nhập file không ghi đè mốc (đọc mã backup.js, db.js)', () => {
  const db = docMa('../src/db.js');
  const bk = docMa('../src/lib/backup.js');
  const tables = /export const DATA_TABLES = \[([^\]]*)\]/.exec(db)[1];
  assert.doesNotMatch(tables, /meta/);
  assert.equal(KHOA_MOC_NGAY_LAM_VIEC, 'mocNgayLamViec');
  // xuất: chỉ đọc từng bảng trong DATA_TABLES, không đọc db.meta
  const xuat = /export async function prepareBackupFile[\s\S]*?\r?\n}\r?\n/.exec(bk)[0];
  assert.match(xuat, /for \(const t of DATA_TABLES\) tables\[t\] = await db\[t\]\.toArray\(\)/);
  assert.doesNotMatch(xuat, /meta|getMeta|mocNgayLamViec/);
  // nhập: chỉ bulkPut các bảng DATA_TABLES; meta chỉ ghi 'lastImport'
  const nhap = /export async function importBackupFile[\s\S]*?\r?\n}\r?\n/.exec(bk)[0];
  assert.doesNotMatch(nhap, /mocNgayLamViec|data\.meta/);
  assert.deepEqual([...nhap.matchAll(/setMeta\('([^']+)'/g)].map((m) => m[1]), ['lastImport']);
  assert.doesNotMatch(nhap, /db\.meta/);
});

test('9.6: hooks/actions của mốc: callback luôn trả số, ghi qua setMeta có chuẩn hoá (đọc mã, chưa chạy IndexedDB)', () => {
  const hk = docMa('../src/hooks.js');
  assert.match(hk, /export function useMocNgayLamViec\(\) \{\s*return useLiveQuery\(async \(\) => chuanHoaMoc\(\(await db\.meta\.get\(KHOA_MOC_NGAY_LAM_VIEC\)\)\?\.value\), \[\]\);/);
  const ac = docMa('../src/lib/actions.js');
  assert.match(ac, /export async function datMocNgayLamViec\(phut\) \{\s*const moc = chuanHoaMoc\(phut\);\s*await setMeta\(KHOA_MOC_NGAY_LAM_VIEC, moc\);/);
  // meta chưa có dòng hoặc giá trị lạ → 420; số hợp lệ giữ nguyên
  assert.equal(chuanHoaMoc(undefined), 420);
  assert.equal(chuanHoaMoc(555), 420);
  assert.equal(chuanHoaMoc(0), 0);
  assert.equal(chuanHoaMoc(480), 480);
});

test('9.6: file sao lưu định dạng cũ (không doneAt, không mốc, date/examDate cũ) gộp ra đúng, không đổi date/examDate', () => {
  const file = {
    format: BACKUP_FORMAT, version: 1, exportedAt: '2026-10-01T00:00:00.000Z', device: 'iphone',
    tables: {
      tasks: [{ id: 't1', text: 'xét nghiệm', date: '2026-09-30', done: true, updatedAt: 100 }],
      exam_patients: [{ id: 'p1', roomId: 'r1', examDate: '2026-09-30', code: '12', dob: '2909', updatedAt: 100 }],
      patient_todos: [{ id: 'v1', patientId: 'p1', text: 'siêu âm', done: false, updatedAt: 100 }]
    }
  };
  assert.equal(validateBackup(file, ['tasks', 'rooms', 'exam_patients', 'patient_todos', 'abbrevs']), null);
  // máy trống: thêm đủ, nguyên văn
  for (const t of ['tasks', 'exam_patients', 'patient_todos']) {
    const r = mergeRows([undefined], file.tables[t]);
    assert.equal(r.added, 1);
    assert.deepEqual(r.toPut, file.tables[t]);
  }
  // máy đã có bản cũ hơn, không có doneAt: file đè đúng, date/examDate giữ như trong file
  const r = mergeRows([{ id: 't1', text: 'cũ', date: '2026-09-29', done: false, updatedAt: 50 }], file.tables.tasks);
  assert.equal(r.updated, 1);
  assert.equal(r.toPut[0].date, '2026-09-30');
  assert.equal('doneAt' in r.toPut[0], false);
  // máy mới hơn: giữ nguyên bản máy
  assert.equal(mergeRows([{ id: 'p1', examDate: '2026-09-30', updatedAt: 200 }], file.tables.exam_patients).toPut.length, 0);
});

test('9.6: việc đã dời (date mới, updatedAt mới) thắng bản cũ khi gộp; Hoàn tác dời (updatedAt còn mới hơn) thắng bản đã dời', () => {
  const goc = { id: 't1', text: 'gọi hội chẩn', date: '2026-11-05', done: false, updatedAt: 1000 };
  const daDoi = { ...goc, date: '2026-11-06', updatedAt: 2000 };
  const hoanTac = { ...daDoi, date: '2026-11-05', updatedAt: 3000 };
  // PC còn bản gốc, nhận file iPhone đã dời → thành ngày mới
  let r = mergeRows([goc], [daDoi]);
  assert.equal(r.toPut[0].date, '2026-11-06');
  // iPhone đã dời, nhận file PC cũ (bản gốc) → giữ bản đã dời
  r = mergeRows([daDoi], [goc]);
  assert.equal(r.toPut.length, 0);
  // Hoàn tác có updatedAt mới hơn thắng cả bản đã dời lẫn bản gốc
  r = mergeRows([daDoi], [hoanTac]);
  assert.equal(r.toPut[0].date, '2026-11-05');
  r = mergeRows([hoanTac], [daDoi]);
  assert.equal(r.toPut.length, 0);
  // hai máy đặt mốc khác nhau: không liên quan dữ liệu (mốc không nằm trong bảng nào)
  r = mergeRows([goc], [goc]);
  assert.equal(r.toPut.length, 0);
});

test('9.6: bé chép từ chepMotBe (có copiedFrom) gộp được như dòng thường; việc chưa xong chép theo mang patientId mới', () => {
  const nguon = { id: 'p1', roomId: 'r1', examDate: '2026-11-05', code: '7', dob: '0511', done: false, updatedAt: 10 };
  const chep = { id: 'p2', roomId: 'r1', examDate: '2026-11-06', code: '7', dob: '0511', note: '', done: false, copiedFrom: 'p1', order: 1, updatedAt: 20, createdAt: 20, deviceId: 'x' };
  const viec = { id: 'v2', patientId: 'p2', text: 'siêu âm', done: false, order: 1, updatedAt: 20 };
  // máy kia chưa có bản chép: thêm nguyên văn, giữ copiedFrom
  let r = mergeRows([undefined], [chep]);
  assert.equal(r.added, 1);
  assert.equal(r.toPut[0].copiedFrom, 'p1');
  assert.equal(mergeRows([undefined], [viec]).added, 1);
  // bé nguồn không bị đổi khi gộp bản chép
  assert.equal(mergeRows([nguon], [nguon]).toPut.length, 0);
  // bản chép sửa sau (cân nặng) ở máy kia thắng, copiedFrom còn nguyên
  r = mergeRows([chep], [{ ...chep, wt: '3200', updatedAt: 30 }]);
  assert.equal(r.updated, 1);
  assert.equal(r.toPut[0].copiedFrom, 'p1');
  // file chứa bản chép nhập vào máy mới → validateBackup chấp nhận
  assert.equal(validateBackup({ format: BACKUP_FORMAT, version: 1, tables: { exam_patients: [nguon, chep], patient_todos: [viec] } }, ['exam_patients', 'patient_todos']), null);
  // chepMotBe thật sự ghi copiedFrom (đọc mã)
  assert.match(docMa('../src/lib/actions.js'), /export async function chepMotBe[\s\S]*?copiedFrom: src\.id/);
});