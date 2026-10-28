// Mọi thao tác ghi dữ liệu của app. Luôn đi qua addRow/updateRow/softDelete để có updatedAt.
import { chuanHoaTags } from './viec.js';
import { sapBe, orderTiepTheo } from './thu-tu.js';
import { chuanKey, BO_MAU } from './viet-tat.js';
import { db, addRow, updateRow, softDelete, getDeviceId, getMeta, setMeta } from '../db.js';

const alive = (r) => !r.deleted;

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
export const toggleTask = (t) => updateRow('tasks', t.id, { done: !t.done });
// Chạm vào số để đổi mức: 1→2→3→4→5 (NV)→1
export const cycleUrgency = (t) => updateRow('tasks', t.id, { urgency: (t.urgency % 5) + 1 });
export const removeTask = (id) => softDelete('tasks', id);
export async function clearDone(date) {
  const done = await db.tasks.where('date').equals(date).filter((t) => alive(t) && t.done).toArray();
  for (const t of done) await softDelete('tasks', t.id);
}

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
export const toggleTodo = (t) => updateRow('patient_todos', t.id, { done: !t.done });
export const removeTodo = (id) => softDelete('patient_todos', id);

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
