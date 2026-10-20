// Cơ sở dữ liệu trên máy (IndexedDB qua Dexie).
// 4 bảng theo tài liệu thiết kế (bỏ bảng users vì app dùng một người) + bảng meta.
import Dexie from 'dexie';

export const db = new Dexie('ghichu-sosinh');

// Chỉ liệt kê các cột cần TÌM/LỌC; các cột khác (nội dung, ghi chú...) vẫn lưu bình thường.
db.version(1).stores({
  tasks: 'id, date, zone, updatedAt',                          // mục Việc
  rooms: 'id, order, updatedAt',                               // danh sách phòng
  exam_patients: 'id, examDate, roomId, [examDate+roomId], updatedAt', // bé trong ngày khám
  patient_todos: 'id, patientId, updatedAt',                   // việc cần làm của bé
  meta: 'key'                                                  // cài đặt: deviceId, thư mục sao lưu...
});

// Khi thêm bảng/cột tìm kiếm sau này: thêm db.version(2).stores({...}) bên dưới, KHÔNG sửa version(1).

export const DATA_TABLES = ['tasks', 'rooms', 'exam_patients', 'patient_todos'];
export const ZONES = ['NICU', 'CT', 'KAN', 'PS-PM', 'BM'];

// crypto.randomUUID chỉ có trên HTTPS/localhost; khi thử qua IP mạng nội bộ (http) thì dùng dự phòng.
export function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

let cachedDeviceId;
export async function getDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;
  const row = await db.meta.get('deviceId');
  if (row) return (cachedDeviceId = row.value);
  cachedDeviceId = uuid();
  await db.meta.put({ key: 'deviceId', value: cachedDeviceId });
  return cachedDeviceId;
}

export async function getMeta(key) {
  return (await db.meta.get(key))?.value;
}
export async function setMeta(key, value) {
  await db.meta.put({ key, value });
}

// Mọi thao tác ghi đều đi qua 3 hàm dưới để luôn có updatedAt + deviceId (cần cho việc gộp dữ liệu).
export async function addRow(table, fields) {
  const row = {
    id: uuid(),
    ...fields,
    deleted: false,
    updatedAt: Date.now(),
    deviceId: await getDeviceId()
  };
  await db[table].add(row);
  return row;
}

export async function updateRow(table, id, changes) {
  await db[table].update(id, {
    ...changes,
    updatedAt: Date.now(),
    deviceId: await getDeviceId()
  });
}

// Không xoá hẳn: đánh dấu deleted để khi nhập file từ máy kia, dòng đã xoá không "sống lại".
export function softDelete(table, id) {
  return updateRow(table, id, { deleted: true });
}

// Xin trình duyệt giữ dữ liệu lâu dài (không tự xoá khi máy thiếu dung lượng).
export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}

// Ngày theo giờ máy, dạng YYYY-MM-DD (không dùng toISOString vì lệch múi giờ UTC+7).
export function todayStr(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
