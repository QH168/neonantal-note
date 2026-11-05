// Mọi thao tác ghi dữ liệu của app. Luôn đi qua addRow/updateRow/softDelete để có updatedAt.
import { chuanHoaTags, chuanTenViec } from './viec.js';
import { sapBe, orderTiepTheo } from './thu-tu.js';
import { chuanKey, BO_MAU } from './viet-tat.js';
import { db, addRow, updateRow, softDelete, getDeviceId, getMeta, setMeta } from '../db.js';

const alive = (r) => !r.deleted;

// ---------- Hàm thuần (kiểm được bằng Node) ----------
// Phần thay đổi khi đánh dấu xong / bỏ xong: xong → doneAt = giờ, bỏ xong → doneAt = null.
// Dòng cũ chưa có doneAt vẫn là "đã xong" (done: true), chỉ không có giờ.
export const phanDoiXong = (done, now = Date.now()) => (done ? { done: true, doneAt: now } : { done: false, doneAt: null });
// Phần thay đổi khi khôi phục sau xoá: CHỈ đổi deleted, giữ nguyên mọi ô khác.
export const phanKhoiPhuc = () => ({ deleted: false });

// Khôi phục một dòng đã xoá mềm (chỉ updateRow { deleted: false }). Bảng bất kỳ trong DATA_TABLES.
export async function khoiPhuc(table, id) {
  await updateRow(table, id, phanKhoiPhuc());
  return { ok: true };
}
// Khôi phục nhiều dòng (Hoàn tác "Xoá việc đã xong"): mỗi dòng một updateRow. Trả về mảng id đã khôi phục.
export async function khoiPhucNhieu(table, ids) {
  const out = [];
  for (const id of ids || []) { await updateRow(table, id, phanKhoiPhuc()); out.push(id); }
  return out;
}

// ---------- Khởi tạo lần đầu ----------
let seeding = null;
export function ensureSeed() {
  return (seeding ||= doSeed()); // chỉ chạy một lần dù được gọi nhiều lần
}
async function doSeed() {
  if (!(await getMeta('seeded'))) {
    const n = await db.rooms.filter(alive).count();
    if (n === 0) {
      for (let i = 1; i <= 3; i++) await addRow('rooms', { name: 'Phòng ' + i, order: i });
    }
    await setMeta('seeded', true);
  }
  await seedAbbrevs();
}

// Gieo bộ viết tắt mẫu đúng MỘT LẦN (meta 'abbrevSeeded'). id cố định 'mau-<key>' nên hai máy cùng gieo
// rồi gộp sao lưu vẫn ra một dòng; mục đã có (còn hoặc đã xoá) theo key thì không gieo lại, nên mục
// bác sĩ đã xoá không quay lại và dữ liệu nhập từ sao lưu không bị nhân đôi.
export async function seedAbbrevs() {
  if (await getMeta('abbrevSeeded')) return;
  await getDeviceId();
  await db.transaction('rw', db.abbrevs, db.meta, async () => {
    const have = new Set((await db.abbrevs.toArray()).map((r) => r.key));
    for (const m of BO_MAU) {
      if (have.has(m.key)) continue;
      await addRow('abbrevs', { id: 'mau-' + m.key, key: m.key, text: m.text });
    }
    await setMeta('abbrevSeeded', true);
  });
}

// ---------- Mục Việc ----------
// Việc mới: có `tags` (chuẩn hoá), không cần `urgency`. Việc cũ (không có tags) giữ nguyên urgency.
export const addTask = (t) => addRow('tasks', {
  ...t,
  ...(Array.isArray(t.tags) ? { tags: chuanHoaTags(t.tags) } : {}),
  done: false
});
export const setTaskTags = (t, tags) => updateRow('tasks', t.id, { tags: chuanHoaTags(tags) });
export const setTaskNote = (id, note) => updateRow('tasks', id, { note });
// Sửa tên việc: bỏ khoảng trắng 2 đầu; rỗng thì không ghi (trả false).
export async function setTaskText(id, text) {
  const s = chuanTenViec(text);
  if (!s) return false;
  await updateRow('tasks', id, { text: s });
  return true;
}
export const setTaskZone = (id, zone) => updateRow('tasks', id, { zone });
export const toggleTask = (t) => updateRow('tasks', t.id, phanDoiXong(!t.done));
// Chạm vào số để đổi mức: 1→2→3→4→5 (NV)→1
export const cycleUrgency = (t) => updateRow('tasks', t.id, { urgency: (t.urgency % 5) + 1 });
export const removeTask = (id) => softDelete('tasks', id);
// Trả về danh sách id đã xoá mềm → giao diện gọi khoiPhucNhieu('tasks', ids) khi Hoàn tác.
export async function clearDone(date) {
  const done = await db.tasks.where('date').equals(date).filter((t) => alive(t) && t.done).toArray();
  const ids = [];
  for (const t of done) { await softDelete('tasks', t.id); ids.push(t.id); }
  return ids;
}
export const khoiPhucTask = (id) => khoiPhuc('tasks', id);

// ---------- Phòng ----------
export async function addRoom(name) {
  const rooms = await db.rooms.filter(alive).toArray();
  const order = rooms.reduce((m, r) => Math.max(m, r.order || 0), 0) + 1;
  return addRow('rooms', { name, order });
}
export const renameRoom = (id, name) => updateRow('rooms', id, { name });
export async function removeRoom(id) {
  const used = await db.exam_patients.where('roomId').equals(id).filter(alive).count();
  if (used > 0) return false; // phòng đã có bệnh nhân (kể cả ngày cũ) thì không xoá
  await softDelete('rooms', id);
  return true;
}

// ---------- Bệnh nhân ----------
export async function addPatient(roomId, examDate) {
  // `order` chỉ là trường thường (không phải chỉ mục): bé thêm tay nằm cuối ngày khám.
  const cur = await db.exam_patients.where('examDate').equals(examDate).filter(alive).toArray();
  return addRow('exam_patients', {
    roomId, examDate, code: '', dob: '', ga: '', wt: '', note: '', done: false, order: orderTiepTheo(cur)
  });
}
export const updatePatient = (id, changes) => updateRow('exam_patients', id, changes);
// Đánh dấu đã khám / bỏ đánh dấu: p là dòng bé; done mặc định đảo trạng thái hiện tại. Ghi doneAt cùng lúc.
export const setPatientDone = (p, done = !p.done) => updateRow('exam_patients', p.id, phanDoiXong(done));
export async function removePatient(id) {
  await getDeviceId();
  await db.transaction('rw', db.exam_patients, db.patient_todos, db.meta, async () => {
    const todos = await db.patient_todos.where('patientId').equals(id).filter(alive).toArray();
    for (const t of todos) await softDelete('patient_todos', t.id);
    await softDelete('exam_patients', id);
  });
}

// ---------- Việc cần làm của bé ----------
export async function addTodo(patientId, text) {
  const n = await db.patient_todos.where('patientId').equals(patientId).count();
  return addRow('patient_todos', { patientId, text, done: false, order: n + 1 });
}
export const toggleTodo = (t) => updateRow('patient_todos', t.id, phanDoiXong(!t.done));
export const removeTodo = (id) => softDelete('patient_todos', id);
export const khoiPhucTodo = (id) => khoiPhuc('patient_todos', id);
// Sửa tên việc của bé: bỏ khoảng trắng 2 đầu; rỗng thì không ghi (trả false).
export async function setTodoText(id, text) {
  const s = chuanTenViec(text);
  if (!s) return false;
  await updateRow('patient_todos', id, { text: s });
  return true;
}

/**
 * Chép bệnh nhân của một ngày trước sang hôm nay, kèm việc chưa xong.
 * Bỏ qua bé đã có trong danh sách hôm nay (cùng phòng, cùng mã) và phòng đã xoá.
 */
export async function copyPatientsFrom(srcDate, today) {
  await getDeviceId();
  let added = 0;
  await db.transaction('rw', db.exam_patients, db.patient_todos, db.rooms, db.meta, async () => {
    const roomIds = new Set((await db.rooms.filter(alive).toArray()).map((r) => r.id));
    const cur = await db.exam_patients.where('examDate').equals(today).filter(alive).toArray();
    const src = sapBe(await db.exam_patients.where('examDate').equals(srcDate).filter(alive).toArray());
    let nextOrder = orderTiepTheo(cur);
    for (const p of src) {
      if (!roomIds.has(p.roomId)) continue;
      if (cur.some((c) => c.roomId === p.roomId && c.code === p.code)) continue;
      const np = await addRow('exam_patients', {
        roomId: p.roomId, examDate: today, code: p.code, dob: p.dob, ga: p.ga, wt: p.wt,
        note: '', done: false, copiedFrom: p.id, order: nextOrder++
      });
      const todos = await db.patient_todos.where('patientId').equals(p.id).filter((t) => alive(t) && !t.done).toArray();
      todos.sort((a, b) => (a.order || 0) - (b.order || 0));
      let i = 0;
      for (const t of todos) await addRow('patient_todos', { patientId: np.id, text: t.text, done: false, order: ++i });
      added++;
    }
  });
  return added;
}

// ---------- Viết tắt ----------
// addAbbrev trả về:
//   { ok: true, row }                  đã thêm
//   { loi: 'key-rong' | 'noidung-rong' }  thiếu chữ
//   { trung: true, muc }               key đã có (muc = dòng đang có) → giao diện hỏi ghi đè,
//                                      đồng ý thì gọi updateAbbrev(muc.id, { text })
const mucSongTheoKey = (key) => db.abbrevs.where('key').equals(key).filter(alive).first();
export async function addAbbrev(key, text) {
  const k = chuanKey(key);
  const t = String(text ?? '').trim();
  if (!k) return { loi: 'key-rong' };
  if (!t) return { loi: 'noidung-rong' };
  const muc = await mucSongTheoKey(k);
  if (muc) return { trung: true, muc };
  return { ok: true, row: await addRow('abbrevs', { key: k, text: t }) };
}
// changes có thể gồm key và/hoặc text. Đổi key sang key của mục khác → { trung: true, muc }.
export async function updateAbbrev(id, changes) {
  const c = { ...changes };
  if ('key' in c) {
    c.key = chuanKey(c.key);
    if (!c.key) return { loi: 'key-rong' };
    const muc = await mucSongTheoKey(c.key);
    if (muc && muc.id !== id) return { trung: true, muc };
  }
  if ('text' in c) {
    c.text = String(c.text ?? '').trim();
    if (!c.text) return { loi: 'noidung-rong' };
  }
  await updateRow('abbrevs', id, c);
  return { ok: true };
}
export const removeAbbrev = (id) => softDelete('abbrevs', id);
// Hoàn tác xoá viết tắt. Nếu trong lúc chờ đã có mục sống cùng key → KHÔNG khôi phục, trả { trung: true, muc }.
// Ngược lại khôi phục (chỉ đổi deleted) và trả { ok: true }. Dòng không còn → { loi: 'khong-thay' }.
export async function khoiPhucAbbrev(id) {
  const row = await db.abbrevs.get(id);
  if (!row) return { loi: 'khong-thay' };
  const muc = await mucSongTheoKey(row.key);
  if (muc && muc.id !== id) return { trung: true, muc };
  await updateRow('abbrevs', id, phanKhoiPhuc());
  return { ok: true };
}
