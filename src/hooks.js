import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.js';
import { p2, cacNgay } from './lib/dates.js';
import { KHOA_CHE_DO, KHOA_LAN_MO, docCheDo, laToi, tangLanMo, chuanHoaMoc, KHOA_MOC_NGAY_LAM_VIEC } from './lib/cai-dat.js';
import { sapBe } from './lib/thu-tu.js';
import { phongChoXem } from './lib/tong-hop.js';
import { phongHomNay } from './lib/phong.js';
import { tachHaiNgay } from './lib/hai-ngay.js';
import { boDemCham, themCham } from './lib/viec.js';
import { alive, viecTheoBe } from './lib/chung.js';

/** Bé còn sống của các ngày trong [tu, den] (đã sapBe) và việc còn sống của các bé đó, đã chia theo bé. Đọc theo chỉ mục. */
async function docBeVaViec(tu, den) {
  const patients = sapBe(await db.exam_patients.where('examDate').between(tu, den, true, true).filter(alive).toArray());
  const todos = patients.length
    ? await db.patient_todos.where('patientId').anyOf(patients.map((p) => p.id)).filter(alive).toArray()
    : [];
  return { patients, todosByPid: viecTheoBe(todos) };
}

/**
 * NGÀY LÀM VIỆC (v9.6) — là "hôm nay" của Việc và Khám (useToday cũ theo ngày lịch đã bỏ) (ngày gán cho việc/bé mới, "Lấy danh sách
 * hôm qua", lịch, khoá ngày tương lai, chế độ 2 ngày).
 *
 * `mocPhut` = mốc đọc từ meta ('mocNgayLamViec', phút). Quy ước để Dữ liệu và Giao diện nối:
 *   - `undefined` hoặc `null` = CHƯA ĐỌC XONG meta  → { sanSang: false, homNay: null, homQua: null, ngayLich: <hôm nay lịch> }.
 *     Giao diện KHÔNG được vẽ app hay ghi ngày gì khi sanSang là false (useLiveQuery trả undefined lúc đang tải: truyền thẳng được).
 *   - Đã đọc xong thì phải truyền SỐ: Dữ liệu đổi "meta chưa có dòng" thành chuanHoaMoc(undefined) = 420 TRƯỚC khi truyền
 *     (nếu không, "chưa có giá trị" bị hiểu là "chưa đọc xong" và app đứng mãi). Số lạ cũng được chuẩn hoá về 420 ở đây.
 *   - Đổi mốc trong cài đặt có tác dụng ngay ở lần vẽ kế tiếp.
 * Trả { sanSang, homNay, homQua, ngayLich }: homNay = ngày làm việc; homQua = ngày làm việc trước; ngayLich = ngày lịch của
 * máy (để tính tuổi — KHÔNG theo mốc). Tự đổi khi qua mốc, qua nửa đêm (ngayLich) và khi mở lại app (kiểm mỗi 15 giây
 * và khi tab hiện lại).
 */
export function useNgayLamViec(mocPhut) {
  const sanSang = mocPhut !== undefined && mocPhut !== null;
  const moc = sanSang ? chuanHoaMoc(mocPhut) : null;
  const [, veLai] = useState(0);
  const cuoi = useRef('');
  const ngay = cacNgay(new Date(), moc === null ? 420 : moc);
  const khoa = moc === null ? 'chua|' + ngay.ngayLich : ngay.homNay + '|' + ngay.ngayLich;
  cuoi.current = khoa;
  useEffect(() => {
    const kiem = () => {
      const n = cacNgay(new Date(), moc === null ? 420 : moc);
      if ((moc === null ? 'chua|' + n.ngayLich : n.homNay + '|' + n.ngayLich) !== cuoi.current) veLai((x) => x + 1);
    };
    const iv = setInterval(kiem, 15 * 1000);
    document.addEventListener('visibilitychange', kiem);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', kiem); };
  }, [moc]);
  return {
    sanSang,
    homNay: sanSang ? ngay.homNay : null,
    homQua: sanSang ? ngay.homQua : null,
    ngayLich: ngay.ngayLich,
  };
}

/**
 * Mốc ngày làm việc (phút) đọc từ meta, tự cập nhật ngay khi đổi mốc (useLiveQuery trên db.meta).
 * Trả `undefined` khi CHƯA đọc xong meta; khi đọc xong luôn trả SỐ đã qua chuanHoaMoc (meta chưa có dòng hoặc hỏng → 420).
 * Callback luôn trả số (không bao giờ undefined) để phân biệt "chưa đọc xong" với "chưa có giá trị". Truyền thẳng cho useNgayLamViec.
 */
export function useMocNgayLamViec() {
  return useLiveQuery(async () => chuanHoaMoc((await db.meta.get(KHOA_MOC_NGAY_LAM_VIEC))?.value), []);
}

/** Giờ máy dạng hh:mm, tự cập nhật mỗi 30 giây và khi tab hiện lại (để ghi "đang là 02:30" ở đầu trang khi còn trước mốc). */
export function useGioMay() {
  const lay = () => { const d = new Date(); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  const [g, setG] = useState(lay);
  useEffect(() => {
    const kiem = () => setG(lay());
    const iv = setInterval(kiem, 30 * 1000);
    document.addEventListener('visibilitychange', kiem);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', kiem); };
  }, []);
  return g;
}

/** Câu báo tạm: `hien(chữ)` hiện câu báo rồi tự tắt sau `ms`; báo mới thay báo cũ và tính giờ lại. Trả [chữ, hien]. */
export function useBaoTam(ms) {
  const [bao, setBao] = useState('');
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  const hien = useCallback((chu) => {
    setBao(chu);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setBao(''), ms);
  }, [ms]);
  return [bao, hien];
}

/**
 * Chạm 2 lần (trong 1 giây) thì gọi `khiDu`. Trả hàm gắn vào onClick. Luật đếm là hàm thuần themCham/boDemCham (src/lib/viec.js).
 * Dùng chung cho dòng việc, việc còn từ hôm qua và việc của bé.
 */
export function useChamHaiLan(khiDu) {
  const mocs = useRef([]);
  return () => {
    mocs.current = themCham(mocs.current, Date.now());
    if (boDemCham(mocs.current, 2)) { mocs.current = []; khiDu(); }
  };
}

/** Ô tự lưu: gõ tới đâu lưu sau 0,4 giây; lưu nốt khi đóng. Trả [chữ, đổi, lưuNgay, đặtLại, bỏ]. */
export function useTuLuu(goc, luu) {
  const [v, setV] = useState(goc);
  const pending = useRef(null);
  const timer = useRef();
  const luuRef = useRef(luu);
  luuRef.current = luu;
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (pending.current !== null) { const x = pending.current; pending.current = null; luuRef.current(x); }
  }, []);
  useEffect(() => () => flush(), [flush]); // lưu nốt khi đóng bảng
  const change = (x) => {
    setV(x);
    pending.current = x;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 400);
  };
  const datLai = (x) => { clearTimeout(timer.current); pending.current = null; setV(x); };
  const bo = () => { clearTimeout(timer.current); pending.current = null; };
  return [v, change, flush, datLai, bo];
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

// Giá trị rỗng dùng lại (cùng một đối tượng mỗi lần vẽ, để phần ghi nhớ phía sau không tính lại vô ích)
const RONG = Object.freeze([]);
const KHONG = Object.freeze({});
const KHAM_TRONG = Object.freeze({ patients: RONG, todosByPid: KHONG });
const CHUA_CO_NGAY_TRUOC = Object.freeze({ date: null, count: 0 });

/** Toàn bộ dữ liệu app cần, tự cập nhật khi cơ sở dữ liệu thay đổi (kể cả sau khi nhập file). */
export function useAppData(today) {
  const tasks = useLiveQuery(() => db.tasks.filter(alive).toArray(), []);
  const rooms = useLiveQuery(() => db.rooms.orderBy('order').filter(alive).toArray(), []);
  // `today` = NGÀY LÀM VIỆC (useNgayLamViec().homNay). Chưa có (null) thì không truy vấn gì và ready = false.
  // Bé hôm nay và việc của bé đọc trong MỘT truy vấn (trước đây danh sách bé bị đọc hai lần); todosByPid dựng sẵn ở đây
  // nên chỉ đổi khi dữ liệu đổi, không dựng lại mỗi lần vẽ.
  const kham = useLiveQuery(() => (today ? docBeVaViec(today, today) : KHAM_TRONG), [today]);

  // Ngày khám gần nhất trước hôm nay (thường là hôm qua) để "Lấy danh sách"
  const prev = useLiveQuery(async () => {
    if (!today) return { date: null, count: 0 };
    const last = await db.exam_patients.where('examDate').below(today).filter(alive).last();
    if (!last) return { date: null, count: 0 };
    const roomIds = new Set((await db.rooms.filter(alive).toArray()).map((r) => r.id));
    const count = await db.exam_patients
      .where('examDate').equals(last.examDate)
      .filter((p) => alive(p) && roomIds.has(p.roomId)).count();
    return { date: last.examDate, count };
  }, [today]);

  // Phòng còn bé từ hôm nay trở đi thì khoá nút xoá (phiếu 2026-11-09). Một truy vấn theo chỉ mục examDate (>= today),
  // không đọc các ngày trước. roomUsePast = số bé các ngày trước, CHỈ tính cho phòng hôm nay đã trống (phòng khác
  // không xoá được nên không cần số): mỗi phòng một lần đếm theo chỉ mục roomId. Dùng cho câu hỏi xác nhận.
  const roomStat = useLiveQuery(async () => {
    const hom = {}, truoc = {};
    if (!today) return { hom, truoc };
    const rs = await db.rooms.filter(alive).toArray();
    for (const r of rs) hom[r.id] = 0;
    await db.exam_patients.where('examDate').aboveOrEqual(today).filter(alive).each((p) => {
      if (p.roomId in hom) hom[p.roomId] += 1;
    });
    // Các phòng hôm nay đã trống: đếm bé ngày trước bằng MỘT truy vấn theo chỉ mục roomId (không hỏi từng phòng một)
    const trong = rs.filter((r) => hom[r.id] === 0).map((r) => r.id);
    for (const id of trong) truoc[id] = 0;
    if (trong.length) {
      await db.exam_patients.where('roomId').anyOf(trong).filter((p) => alive(p) && p.examDate < today).each((p) => { truoc[p.roomId] += 1; });
    }
    return { hom, truoc };
  }, [today]);
  // Mọi phòng kể cả đã xoá, để lưới an toàn hiện cả bé hôm nay nằm ở phòng đã xoá / không tìm thấy.
  const allRooms = useLiveQuery(() => db.rooms.toArray(), []);
  const patients = kham?.patients;
  const roomsHomNay = useMemo(() => phongHomNay(allRooms || [], patients || []), [allRooms, patients]);
  const lastExport = useLiveQuery(() => db.meta.get('lastExport'), [])?.value;

  const ready = !!(today && tasks && rooms && kham && prev && roomStat);
  return {
    ready,
    tasks: tasks || RONG,
    rooms: rooms || RONG,
    roomsHomNay,
    patients: patients || RONG,
    todosByPid: kham?.todosByPid || KHONG,
    prev: prev || CHUA_CO_NGAY_TRUOC,
    roomUse: roomStat?.hom || KHONG,
    roomUsePast: roomStat?.truoc || KHONG,
    lastExport
  };
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
    const { patients, todosByPid } = await docBeVaViec(a, b);
    const rooms = phongChoXem(await db.rooms.toArray(), patients);
    return { ready: true, patients, todosByPid, rooms };
  }, [tu, den]);
  if (!tu || !den) return KHOANG_TRONG;
  return kq || { ...KHOANG_TRONG, ready: false };
}

/**
 * CHỈ ĐỌC (v9.6): bé và việc của HAI ngày làm việc liền nhau cho chế độ 2 ngày và giao tour. Một truy vấn theo chỉ mục
 * examDate cho cả hai ngày + một truy vấn theo chỉ mục patientId; không đọc cả bảng. homQua hoặc homNay là null/undefined
 * (chế độ "Hôm nay", hoặc mốc chưa đọc xong) → không truy vấn gì, trả rỗng.
 * Trả { ready, rooms (phongChoXem: phòng còn sống, phòng đã xoá có bé, phòng không tìm thấy), todosByPid,
 * homQua: { ngay, patients }, homNay: { ngay, patients } } — đưa thẳng vào ghepHaiNgay của src/lib/hai-ngay.js.
 */
export function useHaiNgayKham(homQua, homNay) {
  const coCa = !!homQua && !!homNay;
  const k = useBeKhoang(coCa ? homQua : null, coCa ? homNay : null);
  return useMemo(() => tachHaiNgay(k, homQua || null, homNay || null), [k, homQua, homNay]);
}

/**
 * CHỈ ĐỌC (v9.6): việc (bảng tasks) còn sống của MỘT ngày, theo chỉ mục `date` — cho khung "Còn từ hôm qua".
 * iso rỗng → rỗng. Trả { ready, tasks } (cả việc đã xong; lọc ở viecConTuHomQua).
 */
export function useViecNgay(iso) {
  const ds = useLiveQuery(
    () => (iso ? db.tasks.where('date').equals(iso).filter(alive).toArray() : []),
    [iso]
  );
  return { ready: !!ds, tasks: ds || [] };
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
