// Mọi thao tác ghi dữ liệu của app. Luôn đi qua addRow/updateRow/softDelete để có updatedAt.
import { db, addRow, updateRow, softDelete, getDeviceId, getMeta, setMeta } from '../db.js';

const alive = (r) => !r.deleted;

// ---------- Khởi tạo lần đầu ----------
let seeding = null;
export function ensureSeed() {
  return (seeding ||= doSeed()); // chỉ chạy một lần dù được gọi nhiều lần
}
async function doSeed() {
  if (await getMeta('seeded')) return;
  const n = await db.rooms.filter(alive).count();
  if (n === 0) {
    for (let i = 1; i <= 3; i++) await addRow('rooms', { name: 'Phòng ' + i, order: i });
  }
  await setMeta('seeded', true);
}

// ---------- Mục Việc ----------
export const addTask = (t) => addRow('tasks', { ...t, done: false });
export const toggleTask = (t) => updateRow('tasks', t.id, { done: !t.done });
// Chạm vào số để đổi mức: 1→2→3→4→5 (chị NV)→1
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
export const addPatient = (roomId, examDate) =>
  addRow('exam_patients', { roomId, examDate, code: '', dob: '', ga: '', wt: '', note: '', done: false });
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
    const src = await db.exam_patients.where('examDate').equals(srcDate).filter(alive).toArray();
    for (const p of src) {
      if (!roomIds.has(p.roomId)) continue;
      if (cur.some((c) => c.roomId === p.roomId && c.code === p.code)) continue;
      const np = await addRow('exam_patients', {
        roomId: p.roomId, examDate: today, code: p.code, dob: p.dob, ga: p.ga, wt: p.wt,
        note: '', done: false, copiedFrom: p.id
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
