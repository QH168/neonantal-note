import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.js';
import { todayIso } from './lib/dates.js';
import { KHOA_CHE_DO, KHOA_LAN_MO, docCheDo, laToi, tangLanMo } from './lib/cai-dat.js';
import { sapBe } from './lib/thu-tu.js';

const alive = (r) => !r.deleted;

/** Ngày hôm nay, tự đổi khi qua nửa đêm hoặc khi mở lại app vào ngày mới. */
export function useToday() {
  const [t, setT] = useState(todayIso());
  useEffect(() => {
    const check = () => setT((old) => (old === todayIso() ? old : todayIso()));
    const iv = setInterval(check, 60 * 1000);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', check); };
  }, []);
  return t;
}

/** Màn hình rộng (PC) hay hẹp (điện thoại). */
export function useWide(minWidth = 900) {
  const q = `(min-width: ${minWidth}px)`;
  const [wide, setWide] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setWide(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, [q]);
  return wide;
}

const HE_TOI = '(prefers-color-scheme: dark)';

/**
 * Chế độ giao diện Sáng / Tối / Theo máy. Lưu ở localStorage khoá 'theme' (light|dark|auto), không vào CSDL.
 * Chỉ ghi khi người dùng chọn: người đã có 'light'/'dark' từ trước giữ nguyên giao diện; chưa có gì thì là Theo máy.
 * Theo máy: đi theo prefers-color-scheme và tự đổi khi máy đổi.
 */
export function useGiaoDien() {
  const [cheDo, setCheDoState] = useState(() => {
    try { return docCheDo(localStorage.getItem(KHOA_CHE_DO)); } catch { return 'auto'; }
  });
  const [heToi, setHeToi] = useState(() => !!window.matchMedia?.(HE_TOI).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(HE_TOI);
    if (!mq) return undefined;
    const on = () => setHeToi(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  const dark = laToi(cheDo, heToi);
  useEffect(() => {
    const el = document.documentElement;
    el.classList.add('th');
    el.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0E151C' : '#F2F7FB');
  }, [dark]);
  const setCheDo = useCallback((v) => {
    const c = docCheDo(v);
    setCheDoState(c);
    try { localStorage.setItem(KHOA_CHE_DO, c); } catch { /* bỏ qua */ }
  }, []);
  return { cheDo, setCheDo, dark };
}

// Mỗi lần mở app (tải trang) đếm một lần. Giữ kết quả ở biến module để React vẽ lại/gắn lại hai lần không đếm đôi.
let lanMoApp = null;
/** Số lần đã mở app, tính cả lần này. */
export function useLanMoApp() {
  if (lanMoApp === null) {
    let raw = null;
    try { raw = localStorage.getItem(KHOA_LAN_MO); } catch { /* bỏ qua */ }
    lanMoApp = tangLanMo(raw);
    try { localStorage.setItem(KHOA_LAN_MO, String(lanMoApp)); } catch { /* bỏ qua */ }
  }
  return lanMoApp;
}

/** Toàn bộ dữ liệu app cần, tự cập nhật khi cơ sở dữ liệu thay đổi (kể cả sau khi nhập file). */
export function useAppData(today) {
  const tasks = useLiveQuery(() => db.tasks.filter(alive).toArray(), []);
  const rooms = useLiveQuery(() => db.rooms.orderBy('order').filter(alive).toArray(), []);
  const patients = useLiveQuery(
    () => db.exam_patients.where('examDate').equals(today).filter(alive).toArray().then(sapBe),
    [today]
  );
  const todos = useLiveQuery(async () => {
    const ps = await db.exam_patients.where('examDate').equals(today).filter(alive).toArray();
    if (!ps.length) return [];
    return db.patient_todos.where('patientId').anyOf(ps.map((p) => p.id)).filter(alive).toArray();
  }, [today]);

  // Ngày khám gần nhất trước hôm nay (thường là hôm qua) để "Lấy danh sách"
  const prev = useLiveQuery(async () => {
    const last = await db.exam_patients.where('examDate').below(today).filter(alive).last();
    if (!last) return { date: null, count: 0 };
    const roomIds = new Set((await db.rooms.filter(alive).toArray()).map((r) => r.id));
    const count = await db.exam_patients
      .where('examDate').equals(last.examDate)
      .filter((p) => alive(p) && roomIds.has(p.roomId)).count();
    return { date: last.examDate, count };
  }, [today]);

  // Phòng nào đang có bệnh nhân (bất kỳ ngày nào) thì khoá nút xoá
  const roomUse = useLiveQuery(async () => {
    const out = {};
    const rs = await db.rooms.filter(alive).toArray();
    for (const r of rs) out[r.id] = await db.exam_patients.where('roomId').equals(r.id).filter(alive).count();
    return out;
  }, []);

  const lastExport = useLiveQuery(() => db.meta.get('lastExport'), [])?.value;

  const ready = tasks && rooms && patients && todos && prev && roomUse;
  const todosByPid = {};
  for (const t of todos || []) (todosByPid[t.patientId] ||= []).push(t);
  for (const k in todosByPid) todosByPid[k].sort((a, b) => (a.order || 0) - (b.order || 0) || (a.createdAt || 0) - (b.createdAt || 0));

  return { ready, tasks: tasks || [], rooms: rooms || [], patients: patients || [], todosByPid, prev: prev || { date: null, count: 0 }, roomUse: roomUse || {}, lastExport };
}

/** Danh sách viết tắt còn sống, xếp theo key; undefined-an toàn (chưa tải xong thì []). */
export function useAbbrevs() {
  const list = useLiveQuery(
    () => db.abbrevs.filter(alive).toArray().then((a) => a.sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0))),
    []
  );
  return list || [];
}
