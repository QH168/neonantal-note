import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.js';
import { p2, todayIso } from './lib/dates.js';
import { KHOA_CHE_DO, KHOA_LAN_MO, docCheDo, laToi, tangLanMo } from './lib/cai-dat.js';
import { sapBe } from './lib/thu-tu.js';
import { phongChoXem } from './lib/tong-hop.js';

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

/**
 * Bàn phím iPhone có đang mở không, và phần màn hình còn thấy nằm ở đâu. Dùng chung cho bảng dưới (Sheet),
 * thanh thêm việc và thanh Hoàn tác — một chỗ tính duy nhất.
 * `vv` = window.visualViewport, `innerH` = window.innerHeight (tham số để thử bằng visualViewport giả).
 * Trả null khi không có bàn phím (hoặc đang phóng to); ngược lại { top, height, duoi }:
 * top/height = khung còn thấy; duoi = khoảng từ đáy khung còn thấy tới đáy cửa sổ (chính là chiều cao bàn phím).
 */
export function khungBanPhim(vv, innerH) {
  if (!vv) return null;
  const duoi = innerH - vv.height - vv.offsetTop;
  if (vv.scale <= 1.01 && (duoi > 80 || vv.offsetTop > 0)) return { top: vv.offsetTop, height: vv.height, duoi: Math.max(0, duoi) };
  return null;
}

/** Gọi `khop(khung | null)` ngay và mỗi khi bàn phím mở/đóng/cuộn. Trả hàm gỡ. Không có visualViewport thì chỉ gọi khop(null). */
export function theoDoiBanPhim(khop) {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  if (!vv) { khop(null); return () => {}; }
  const chay = () => khop(khungBanPhim(vv, window.innerHeight));
  chay();
  vv.addEventListener('resize', chay);
  vv.addEventListener('scroll', chay);
  return () => { vv.removeEventListener('resize', chay); vv.removeEventListener('scroll', chay); };
}

/** Khung bàn phím dạng state (null khi không mở). Chỉ vẽ lại khi giá trị đổi. */
export function useBanPhim() {
  const [khung, setKhung] = useState(null);
  useEffect(() => theoDoiBanPhim((k) => setKhung((cu) => (
    (!cu && !k) || (cu && k && cu.top === k.top && cu.height === k.height && cu.duoi === k.duoi) ? cu : k
  ))), []);
  return khung;
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

const KHOANG_TRONG = { ready: true, patients: [], todosByPid: {}, rooms: [] };

/**
 * CHỈ ĐỌC (v9.5): bé và việc của một khoảng ngày [tu, den] (cả hai đầu), dùng chỉ mục examDate và patientId.
 * tu hoặc den là null → chưa truy vấn gì, trả về rỗng.
 * Trả { ready, patients (đã sapBe), todosByPid, rooms }; rooms = phongChoXem(mọi phòng, bé): phòng còn sống,
 * rồi phòng đã xoá có bé, rồi phòng không tìm thấy — nên không bé nào bị mất khi xem.
 * Không ghi gì vào CSDL.
 */
export function useBeKhoang(tu, den) {
  const kq = useLiveQuery(async () => {
    if (!tu || !den) return null;
    const [a, b] = tu <= den ? [tu, den] : [den, tu];
    const patients = sapBe(await db.exam_patients.where('examDate').between(a, b, true, true).filter(alive).toArray());
    const todosByPid = {};
    if (patients.length) {
      const todos = await db.patient_todos.where('patientId').anyOf(patients.map((p) => p.id)).filter(alive).toArray();
      for (const t of todos) (todosByPid[t.patientId] ||= []).push(t);
      for (const k in todosByPid) todosByPid[k].sort((x, y) => (x.order || 0) - (y.order || 0) || (x.createdAt || 0) - (y.createdAt || 0));
    }
    const rooms = phongChoXem(await db.rooms.toArray(), patients);
    return { ready: true, patients, todosByPid, rooms };
  }, [tu, den]);
  if (!tu || !den) return KHOANG_TRONG;
  return kq || { ...KHOANG_TRONG, ready: false };
}

/** CHỈ ĐỌC: bé và việc của MỘT ngày (xem ngày trước). Cùng giá trị trả về với useBeKhoang. */
export function useBeNgay(iso) {
  return useBeKhoang(iso, iso);
}

/**
 * CHỈ ĐỌC: số bé đã khám (done = true) theo từng ngày của một tháng, cho lịch Khám.
 * Truy vấn theo chỉ mục examDate trong tháng, không đọc cả bảng. thang là 1..12.
 * Trả { ready, daKham: { 'YYYY-MM-DD': n } }.
 */
export function useDaKhamThang(nam, thang) {
  const kq = useLiveQuery(async () => {
    const dau = `${nam}-${p2(thang)}-01`, cuoi = `${nam}-${p2(thang)}-31`;
    const out = {};
    await db.exam_patients.where('examDate').between(dau, cuoi, true, true)
      .filter((p) => alive(p) && p.done === true)
      .each((p) => { out[p.examDate] = (out[p.examDate] || 0) + 1; });
    return out;
  }, [nam, thang]);
  return { ready: !!kq, daKham: kq || {} };
}

/** Danh sách viết tắt còn sống, xếp theo key; undefined-an toàn (chưa tải xong thì []). */
export function useAbbrevs() {
  const list = useLiveQuery(
    () => db.abbrevs.filter(alive).toArray().then((a) => a.sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0))),
    []
  );
  return list || [];
}
