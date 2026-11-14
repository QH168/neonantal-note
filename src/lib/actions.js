// Mọi thao tác ghi dữ liệu của app. Luôn đi qua addRow/updateRow/softDelete để có updatedAt.
import { phongXoaDuoc } from './phong.js';
import { chuanHoaTags, chuanTenViec } from './viec.js';
import { sapBe, orderTiepTheo } from './thu-tu.js';
import { chuanKey, BO_MAU } from './viet-tat.js';
import { KHOA_MOC_NGAY_LAM_VIEC, chuanHoaMoc } from './cai-dat.js';
import { lapKeHoachDoiViec, keHoachHoanTacDoi, chonChepMotBe } from './hai-ngay.js';
import { alive, nhomTheo } from './chung.js';
import { db, addRow, updateRow, softDelete, getDeviceId, getMeta, setMeta } from '../db.js';

/**
 * Ghi nhiều dòng trong MỘT giao dịch: nhanh hơn ghi từng dòng riêng, màn hình chỉ vẽ lại một lần, và hoặc ghi hết hoặc không ghi gì.
 * Mỗi dòng vẫn đi qua addRow/updateRow/softDelete (có updatedAt + deviceId). Bảng meta luôn nằm trong giao dịch vì
 * các hàm đó đọc mã máy; gọi getDeviceId() trước để mã máy đã sẵn.
 */
async function ghiMotLuot(bang, lam) {
  await getDeviceId();
  return db.transaction('rw', [...bang, db.meta], lam);
}

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
// Khôi phục nhiều dòng (Hoàn tác "Xoá việc đã xong"): mỗi dòng một updateRow, tất cả trong một giao dịch. Trả về mảng id đã khôi phục.
export async function khoiPhucNhieu(table, ids) {
  const out = [...(ids || [])];
  await ghiMotLuot([db[table]], async () => {
    for (const id of out) await updateRow(table, id, phanKhoiPhuc());
  });
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
  const ids = [];
  await ghiMotLuot([db.tasks], async () => {
    const done = await db.tasks.where('date').equals(date).filter((t) => alive(t) && t.done).toArray();
    for (const t of done) { await softDelete('tasks', t.id); ids.push(t.id); }
  });
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
// Xoá mềm phòng khi từ homNay (ngày làm việc) trở đi không còn bé sống trong phòng; bé ngày trước giữ nguyên, vẫn xem được.
// Đọc lại bé của phòng và ghi trong CÙNG một giao dịch (đếm lại ngay lúc xoá). Thiếu/sai homNay thì không xoá.
// Trả { ok:true, soBeNgayTruoc } hoặc { ok:false, soBeHomNay } (ok:false vì thiếu homNay thì soBeHomNay = 0).
export async function removeRoom(id, homNay) {
  let kq = { ok: false, soBeHomNay: 0 };
  await ghiMotLuot([db.rooms, db.exam_patients], async () => {
    const room = await db.rooms.get(id);
    if (!room || room.deleted) return;
    const be = await db.exam_patients.where('roomId').equals(id).filter(alive).toArray();
    const x = phongXoaDuoc(id, be, homNay);
    if (!x.duoc) { kq = { ok: false, soBeHomNay: x.soBeHomNay }; return; }
    await softDelete('rooms', id);
    kq = { ok: true, soBeNgayTruoc: x.soBeNgayTruoc };
  });
  return kq;
}
// Hoàn tác xoá phòng: phòng về đúng chỗ cũ vì `order` không bị đổi.
export const khoiPhucRoom = (id) => khoiPhuc('rooms', id);

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
  await ghiMotLuot([db.exam_patients, db.patient_todos], async () => {
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

// Ghi chú của bé nguồn mang sang ngày mới (bác sĩ duyệt 14/11/2026). Dòng cũ không có ghi chú thì để trống.
const ghiChuChepSang = (p) => (typeof p.note === 'string' ? p.note : '');

// Chép việc CHƯA XONG (đã lọc sẵn) của bé nguồn sang bé mới, giữ thứ tự, đánh số lại từ 1. Gọi trong giao dịch.
async function chepViecChuaXong(viec, patientId) {
  let i = 0;
  for (const t of [...viec].sort((a, b) => (a.order || 0) - (b.order || 0))) {
    await addRow('patient_todos', { patientId, text: t.text, done: false, order: ++i });
  }
}

/**
 * Chép bệnh nhân của một ngày trước sang hôm nay, kèm ghi chú và việc chưa xong.
 * Bỏ qua bé đã có trong danh sách hôm nay (cùng phòng, cùng mã) và phòng đã xoá.
 */
export async function copyPatientsFrom(srcDate, today) {
  let added = 0;
  await ghiMotLuot([db.exam_patients, db.patient_todos, db.rooms], async () => {
    const roomIds = new Set((await db.rooms.filter(alive).toArray()).map((r) => r.id));
    const cur = await db.exam_patients.where('examDate').equals(today).filter(alive).toArray();
    const src = sapBe(await db.exam_patients.where('examDate').equals(srcDate).filter(alive).toArray());
    // Mã đã có hôm nay theo từng phòng (tra một bước, không dò lại cả danh sách hôm nay cho từng bé)
    const maDaCo = new Map();
    for (const [roomId, ds] of nhomTheo(cur, (c) => c.roomId)) maDaCo.set(roomId, new Set(ds.map((c) => c.code)));
    const canChep = src.filter((p) => roomIds.has(p.roomId) && !maDaCo.get(p.roomId)?.has(p.code));
    // Việc chưa xong của mọi bé cần chép: một lần đọc theo chỉ mục patientId
    const viecTheoNguon = canChep.length
      ? nhomTheo(await db.patient_todos.where('patientId').anyOf(canChep.map((p) => p.id)).filter((t) => alive(t) && !t.done).toArray(), (t) => t.patientId)
      : new Map();
    let nextOrder = orderTiepTheo(cur);
    for (const p of canChep) {
      const np = await addRow('exam_patients', {
        roomId: p.roomId, examDate: today, code: p.code, dob: p.dob, ga: p.ga, wt: p.wt,
        note: ghiChuChepSang(p), done: false, copiedFrom: p.id, order: nextOrder++
      });
      await chepViecChuaXong(viecTheoNguon.get(p.id) || [], np.id);
      added++;
    }
  });
  return added;
}

/**
 * Chép MỘT bé (và việc chưa xong của bé) sang ngày làm việc nay (v9.6). Cùng luật copyPatientsFrom: bỏ qua phòng đã xoá,
 * không trùng phòng + mã (chặt hơn một chút: xem chonChepMotBe). Không đổi copyPatientsFrom.
 * @returns { added: 1, id } khi đã chép; { added: 0, ly: 'trung' | 'phong-xoa' | 'khong-thay' } khi không chép.
 */
export async function chepMotBe(patientId, homNay) {
  let kq = { added: 0, ly: 'khong-thay' };
  await ghiMotLuot([db.exam_patients, db.patient_todos, db.rooms], async () => {
    const src = await db.exam_patients.get(patientId);
    const roomIds = new Set((await db.rooms.filter(alive).toArray()).map((r) => r.id));
    const cur = await db.exam_patients.where('examDate').equals(homNay).filter(alive).toArray();
    const luat = chonChepMotBe({ src, cur, roomIds, homNay });
    if (!luat.ok) { kq = { added: 0, ly: luat.ly }; return; }
    const np = await addRow('exam_patients', {
      roomId: src.roomId, examDate: homNay, code: src.code, dob: src.dob, ga: src.ga, wt: src.wt,
      note: ghiChuChepSang(src), done: false, copiedFrom: src.id, order: orderTiepTheo(cur)
    });
    await chepViecChuaXong(await db.patient_todos.where('patientId').equals(src.id).filter((t) => alive(t) && !t.done).toArray(), np.id);
    kq = { added: 1, id: np.id };
  });
  return kq;
}

// ---------- Dời việc sang hôm nay (v9.6) ----------
/**
 * "Dời sang hôm nay" / "Dời hết sang hôm nay": đổi `date` của các việc (bảng tasks) sang ngày làm việc nay, bằng updateRow
 * (có updatedAt). Chỉ dời việc còn sống, chưa xong, date là ngày trước homNay. Việc đã xong/đã xoá/đã ở hôm nay: bỏ qua.
 * @returns [{ id, dateCu }] các việc ĐÃ dời → đưa cho hoanTacDoiViec khi Hoàn tác (6 giây).
 */
export async function doiViecSangHomNay(ids, homNay) {
  const daDoi = [];
  await ghiMotLuot([db.tasks], async () => {
    const rows = (await db.tasks.bulkGet([...new Set(ids || [])])).filter(Boolean);
    for (const k of lapKeHoachDoiViec(rows, ids, homNay)) {
      await updateRow('tasks', k.id, { date: homNay });
      daDoi.push(k);
    }
  });
  return daDoi;
}

/** Hoàn tác doiViecSangHomNay: trả `date` về đúng ngày cũ. Trả mảng id đã trả lại. */
export async function hoanTacDoiViec(daDoi) {
  const out = [];
  await ghiMotLuot([db.tasks], async () => {
    const keHoach = keHoachHoanTacDoi(daDoi);
    const con = await db.tasks.bulkGet(keHoach.map((k) => k.id)); // một lần đọc; việc không còn thì bỏ qua
    for (const [i, k] of keHoach.entries()) {
      if (!con[i]) continue;
      await updateRow('tasks', k.id, { date: k.date });
      out.push(k.id);
    }
  });
  return out;
}

/**
 * Đặt mốc ngày làm việc (phút) cho máy này. Ghi vào bảng meta (KHÔNG nằm trong file sao lưu, mỗi máy tự đặt), có chuẩn hoá: số lạ về 420. Trả về giá trị đã lưu.
 */
export async function datMocNgayLamViec(phut) {
  const moc = chuanHoaMoc(phut);
  await setMeta(KHOA_MOC_NGAY_LAM_VIEC, moc);
  return moc;
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
