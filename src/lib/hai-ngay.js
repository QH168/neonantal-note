// Chế độ 2 ngày và tổng hợp giao tour (v9.6). Hàm thuần: không chạm giao diện hay CSDL; hàm dùng đồng hồ nhận `now`.
// "Hôm qua" / "hôm nay" ở đây là NGÀY LÀM VIỆC (xem ngayLamViec trong dates.js). Tuổi luôn tính theo NGÀY LỊCH của `now`.
import { calcAge, ngayTinhTuoi, parseDob } from './clinical.js';
import { p2, parseIso } from './dates.js';
import { soSanhBe } from './thu-tu.js';
import { phongChoXem } from './tong-hop.js';
import { MOC_MAC_DINH } from './cai-dat.js';

const alive = (r) => !r.deleted;

/** Giờ bắt đầu "đêm qua" (phút từ 00:00): 16:00 (bác sĩ duyệt, câu 2). */
export const GIO_BAT_DAU_DEM_MAC_DINH = 960;

const chuanMa = (s) => String(s ?? '').normalize('NFC').trim();
const khoaMa = (s) => chuanMa(s).toLowerCase();
const chuanChu = (s) => String(s ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
const laIso = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const laMs = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
const phutHopLe = (v, macDinh) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1440 ? Math.floor(v) : macDinh);

/** 'hh:mm' theo giờ máy của một mốc mili giây; thiếu hoặc lạ thì ''. */
export function gioHhmm(ms) {
  if (!laMs(ms)) return '';
  const d = new Date(ms);
  return p2(d.getHours()) + ':' + p2(d.getMinutes());
}

/** 'Phòng 1' → 'P1' CHỈ khi tên đúng dạng "Phòng <số>"; tên khác giữ nguyên (đã bỏ khoảng trắng hai đầu). */
export function tenPhongNgan(ten) {
  const s = chuanMa(ten);
  const m = /^Phòng (\d+)$/.exec(s);
  return m ? 'P' + m[1] : s;
}

// ---------- Cân nặng ----------
// Đọc cân thành số gram: số nguyên 100..9999, có thể có chữ g cuối ("1850", "1850 g"). Dấu chấm, phẩy, đơn vị khác,
// chữ lẫn trong số, số ngoài khoảng đều KHÔNG đọc được (trả null) — không đoán.
function docCan(v) {
  let n;
  if (typeof v === 'number') n = v;
  else {
    const s = String(v ?? '').trim().replace(/\s*g$/i, '');
    if (!/^\d{1,5}$/.test(s)) return null;
    n = Number(s);
  }
  return Number.isInteger(n) && n >= 100 && n <= 9999 ? n : null;
}

/**
 * Mức tăng giảm cân = hôm nay − hôm qua. Chỉ khi CẢ HAI cân đọc được thành số; thiếu hoặc lạ → null.
 * @returns { gram, huong: 'tang'|'giam'|'khong-doi', text: 'tăng 20 g' | 'giảm 40 g' | 'không đổi' } hoặc null
 */
export function mucTangGiamCan(canHomQua, canHomNay) {
  const a = docCan(canHomQua), b = docCan(canHomNay);
  if (a === null || b === null) return null;
  const gram = b - a;
  if (gram > 0) return { gram, huong: 'tang', text: `tăng ${gram} g` };
  if (gram < 0) return { gram, huong: 'giam', text: `giảm ${-gram} g` };
  return { gram: 0, huong: 'khong-doi', text: 'không đổi' };
}

// ---------- Cửa sổ "đêm qua" ----------
// Từ giờ bắt đầu đêm (mặc định 16:00) của ngày làm việc trước tới mốc của ngày làm việc nay; [bắt đầu, mốc).
function cuaSoDem(ngayHomQua, ngayHomNay, mocPhut, gioBatDauDem) {
  const moc = phutHopLe(mocPhut, MOC_MAC_DINH);
  const bd = phutHopLe(gioBatDauDem, GIO_BAT_DAU_DEM_MAC_DINH);
  const a = parseIso(ngayHomQua), b = parseIso(ngayHomNay);
  return {
    tu: new Date(a.getFullYear(), a.getMonth(), a.getDate(), 0, bd).getTime(),
    den: new Date(b.getFullYear(), b.getMonth(), b.getDate(), 0, moc).getTime(),
  };
}
const trongCuaSo = (ms, w) => laMs(ms) && ms >= w.tu && ms < w.den;

// ---------- Việc ----------
const soViecTrongBe = (a, b) => ((a.order || 0) - (b.order || 0)) || ((a.createdAt || 0) - (b.createdAt || 0))
  || String(a.id ?? '').localeCompare(String(b.id ?? ''));
const viecSongCuaBe = (todosByPid, id) => ((todosByPid && todosByPid[id]) || []).filter(alive).slice().sort(soViecTrongBe);

/**
 * "Còn từ hôm qua" của tab Việc: việc chưa xong, chưa xoá của ĐÚNG ngày làm việc trước (không gồm ngày xa hơn).
 * Xếp theo createdAt tăng dần (thiếu createdAt đứng đầu), rồi id. Mỗi mục: { task, gioGhi: 'hh:mm' | '',
 * trongDem: bool, nhan: 'Ghi lúc 23:40 đêm qua' | '' }. Việc ghi lúc 03:10 thuộc ngày làm việc trước (date đã lưu theo
 * ngày làm việc), nên tự nằm trong danh sách này.
 */
export function viecConTuHomQua(tasks, { homQua, homNay, mocPhut, gioBatDauDem } = {}) {
  const w = cuaSoDem(homQua, homNay, mocPhut, gioBatDauDem);
  return (tasks || [])
    .filter((t) => alive(t) && !t.done && t.date === homQua)
    .sort((a, b) => ((a.createdAt || 0) - (b.createdAt || 0)) || String(a.id ?? '').localeCompare(String(b.id ?? '')))
    .map((task) => {
      const gioGhi = gioHhmm(task.createdAt);
      const trongDem = trongCuaSo(task.createdAt, w);
      return { task, gioGhi, trongDem, nhan: trongDem && gioGhi ? `Ghi lúc ${gioGhi} đêm qua` : '' };
    });
}

/**
 * Kế hoạch "Dời sang hôm nay". rows = các dòng việc (tasks); ids = id người dùng chọn.
 * Chỉ dời việc còn sống, chưa xong, có date là ngày TRƯỚC homNay. Bỏ id lạ, id lặp, việc đã xong/đã xoá/đã ở hôm nay hoặc sau.
 * @returns [{ id, dateCu }] theo thứ tự ids
 */
export function lapKeHoachDoiViec(rows, ids, homNay) {
  const byId = new Map((rows || []).map((r) => [r.id, r]));
  const seen = new Set();
  const out = [];
  for (const id of ids || []) {
    if (seen.has(id)) continue;
    seen.add(id);
    const r = byId.get(id);
    if (!r || !alive(r) || r.done || !laIso(r.date) || r.date >= homNay) continue;
    out.push({ id, dateCu: r.date });
  }
  return out;
}

/** Từ kết quả dời → việc cần ghi để Hoàn tác: [{ id, date }] trả về date cũ. */
export const keHoachHoanTacDoi = (daDoi) => (daDoi || []).map((x) => ({ id: x.id, date: x.dateCu }));

// ---------- Chép một bé ----------
/**
 * Luật chép MỘT bé sang hôm nay. src = dòng bé nguồn; cur = bé hiện có của hôm nay; roomIds = tập id phòng còn sống.
 * Cùng luật copyPatientsFrom (bỏ phòng đã xoá, không trùng phòng + mã) cộng hai điều chặt hơn để bấm hai lần không nhân đôi:
 * so mã không phân biệt hoa thường/khoảng trắng; bé đã chép từ chính bé này (copiedFrom) thì chặn kể cả không mã.
 * Bé không mã chỉ bị chặn bởi copiedFrom. @returns { ok: true } | { ok: false, ly: 'khong-thay' | 'phong-xoa' | 'trung' }
 */
export function chonChepMotBe({ src, cur, roomIds, homNay }) {
  if (!src || src.deleted) return { ok: false, ly: 'khong-thay' };
  if (homNay && src.examDate === homNay) return { ok: false, ly: 'trung' }; // bé của chính hôm nay, không chép vào chính nó
  if (!roomIds || !roomIds.has(src.roomId)) return { ok: false, ly: 'phong-xoa' };
  const ma = khoaMa(src.code);
  for (const c of cur || []) {
    if (!alive(c)) continue;
    if (c.copiedFrom === src.id) return { ok: false, ly: 'trung' };
    if (ma && c.roomId === src.roomId && khoaMa(c.code) === ma) return { ok: false, ly: 'trung' };
  }
  return { ok: true };
}

// ---------- Tách kết quả truy vấn một khoảng thành hai ngày ----------
/** k = kết quả useBeKhoang(homQua, homNay). Trả { ready, rooms, todosByPid, homQua: { ngay, patients }, homNay: { ngay, patients } }. */
export function tachHaiNgay(k, homQua, homNay) {
  const ps = k.patients || [];
  return {
    ready: k.ready,
    rooms: k.rooms,
    todosByPid: k.todosByPid,
    homQua: { ngay: homQua, patients: ps.filter((p) => p.examDate === homQua) },
    homNay: { ngay: homNay, patients: ps.filter((p) => p.examDate === homNay) },
  };
}

// ---------- Ghép hai ngày ----------
// Ngày sinh của một dòng để so hai bên: đọc được thành ngày thì so ngày, không thì so chữ số/chữ đã bỏ ký tự phân cách.
function ngaySinhDeSo(p, now) {
  const raw = String(p.dob ?? '').trim();
  if (!raw) return null;
  const moc = ngayTinhTuoi(p);
  const r = parseDob(raw, moc ? parseIso(moc) : now);
  return { t: r.date ? r.date.getTime() : null, s: raw.toLowerCase().replace(/[^0-9a-z]/g, '') };
}
function cungNgaySinh(a, b, now) {
  const x = ngaySinhDeSo(a, now), y = ngaySinhDeSo(b, now);
  if (!x || !y) return true; // một bên không ghi thì không có gì để so
  if (x.t !== null && y.t !== null) return x.t === y.t;
  return x.s === y.s;
}

/**
 * Chuẩn nhóm giao tour của một thẻ — MỖI BÉ ĐÚNG MỘT NHÓM, ưu tiên từ trên xuống:
 * 'beMoi' (mới đêm qua) → 'viecConLai' (còn việc chưa xong) → 'beOnDinh'.
 */
export const nhomGiaoTour = (the) => (the.moiDemQua ? 'beMoi' : the.soViecCon > 0 ? 'viecConLai' : 'beOnDinh');

/**
 * Ghép bé hôm qua và hôm nay thành thẻ (bảng 17a).
 * @param homQua, homNay  { ngay: 'YYYY-MM-DD', patients: dòng bé }  (ngày làm việc trước và ngày làm việc nay)
 * @param rooms           MỌI phòng (kể cả đã xoá); phòng đã xoá/không tìm thấy vẫn hiện (phongChoXem)
 * @param todosByPid      { [patientId]: việc[] } cho cả hai ngày
 * @param mocPhut         mốc ngày làm việc (phút), mặc định 420; kết thúc cửa sổ "đêm qua"
 * @param gioBatDauDem    phút bắt đầu "đêm qua", mặc định 960 (16:00)
 * @param now             đồng hồ (Date); tuổi tính theo NGÀY LỊCH của now
 *
 * Luật ghép: cùng phòng + cùng mã (bỏ khoảng trắng hai đầu, không phân biệt hoa thường). KHÔNG ghép khi: bé không mã;
 * trùng phòng + mã trong cùng một ngày (hiện đủ các dòng, không mất bé); cả hai bên có ngày sinh mà khác nhau (hai bé riêng).
 * Mỗi dòng bé còn sống nằm ĐÚNG MỘT thẻ.
 *
 * @returns {{
 *   homQua: string, homNay: string,
 *   the: Thẻ[],                                  // theo phòng, trong phòng: bé có hôm nay (thứ tự hôm nay) rồi bé chỉ có hôm qua
 *   phong: { roomId, ten, tenNgan, the: Thẻ[] }[],   // phòng có thẻ, theo phongChoXem
 *   dem: { tatCa, moiDemQua, conViec, chuaChep },    // số đếm cho 4 chip (các chip có thể chồng nhau)
 *   soViecCon: number
 * }}
 * Thẻ = { key, roomId, tenPhong, tenNgan, ma, homQua, homNay (dòng bé hoặc null), hienThi: { dob, ga, wt, note },
 *   tuoi: { days, pma } | null, loiTuoi, moiDemQua, gioVao ('hh:mm' | ''), chiCoHomQua, chiCoHomNay, chuaChep,
 *   viecConHomNay[], viecConTuHomQua[] (hôm qua chưa xong mà hôm nay chưa có chữ trùng), soViecCon, conViec,
 *   tangGiamCan ({gram,huong,text} | null; chỉ khi đã ghép), nhom ('beMoi'|'viecConLai'|'beOnDinh') }
 */
export function ghepHaiNgay({ homQua, homNay, rooms = [], todosByPid = {}, mocPhut, gioBatDauDem, now = new Date() }) {
  const q = (homQua?.patients || []).filter(alive);
  const h = (homNay?.patients || []).filter(alive);
  const ngayQ = homQua?.ngay, ngayH = homNay?.ngay;
  const dsPhong = phongChoXem(rooms, [...q, ...h]);
  const thuTuPhong = new Map(dsPhong.map((r, i) => [r.id, i]));
  const phongTheoId = new Map(dsPhong.map((r) => [r.id, r]));
  const w = cuaSoDem(ngayQ, ngayH, mocPhut, gioBatDauDem);

  const khoa = (p) => (khoaMa(p.code) ? p.roomId + '\u0000' + khoaMa(p.code) : null);
  const dem = (ds) => { const m = new Map(); for (const p of ds) { const k = khoa(p); if (k) m.set(k, (m.get(k) || 0) + 1); } return m; };
  const demQ = dem(q), demH = dem(h);
  const hDuyNhat = new Map();
  for (const p of h) { const k = khoa(p); if (k && demH.get(k) === 1) hDuyNhat.set(k, p); }

  const capDoi = [];
  const daDung = new Set();
  for (const p of [...q].sort(soSanhBe)) {
    const k = khoa(p);
    let doi = k && demQ.get(k) === 1 ? hDuyNhat.get(k) || null : null;
    if (doi && !cungNgaySinh(p, doi, now)) doi = null;
    if (doi) daDung.add(doi.id);
    capDoi.push([p, doi]);
  }
  for (const p of [...h].sort(soSanhBe)) if (!daDung.has(p.id)) capDoi.push([null, p]);

  const taoThe = (pq, ph) => {
    const goc = ph || pq;
    const dob = chuanMa(ph?.dob) || chuanMa(pq?.dob);
    const ga = chuanMa(ph?.ga) || chuanMa(pq?.ga);
    const hienThi = { dob, ga, wt: chuanMa(goc.wt), note: goc.note || '' };
    const c = calcAge({ dob, ga }, now);
    const viecHomNay = ph ? viecSongCuaBe(todosByPid, ph.id) : [];
    const viecHomQua = pq ? viecSongCuaBe(todosByPid, pq.id) : [];
    const chuHomNay = new Set(viecHomNay.map((t) => chuanChu(t.text)));
    const viecConHomNay = viecHomNay.filter((t) => !t.done);
    const viecConTuHomQuaDs = viecHomQua.filter((t) => !t.done && !chuHomNay.has(chuanChu(t.text)));
    const moiDemQua = !!pq && !pq.copiedFrom && trongCuaSo(pq.createdAt, w);
    const phong = phongTheoId.get(goc.roomId);
    const the = {
      key: (pq?.id || '') + '|' + (ph?.id || ''),
      roomId: goc.roomId,
      tenPhong: phong ? phong.name : '',
      tenNgan: tenPhongNgan(phong ? phong.name : ''),
      ma: chuanMa(goc.code),
      homQua: pq || null,
      homNay: ph || null,
      hienThi,
      tuoi: c.err ? null : c,
      loiTuoi: c.err || '',
      moiDemQua,
      gioVao: moiDemQua ? gioHhmm(pq.createdAt) : '',
      chiCoHomQua: !!pq && !ph,
      chiCoHomNay: !pq && !!ph,
      chuaChep: !!pq && !ph,
      viecConHomNay,
      viecConTuHomQua: viecConTuHomQuaDs,
      soViecCon: viecConHomNay.length + viecConTuHomQuaDs.length,
      tangGiamCan: pq && ph ? mucTangGiamCan(pq.wt, ph.wt) : null,
    };
    the.conViec = the.soViecCon > 0;
    the.nhom = nhomGiaoTour(the);
    return { the, goc: ph || pq, coHomNay: !!ph };
  };

  const dsThe = capDoi.map(([pq, ph]) => taoThe(pq, ph));
  dsThe.sort((a, b) => {
    const pa = thuTuPhong.get(a.the.roomId), pb = thuTuPhong.get(b.the.roomId);
    if (pa !== pb) return pa - pb;
    if (a.coHomNay !== b.coHomNay) return a.coHomNay ? -1 : 1;
    return soSanhBe(a.goc, b.goc);
  });
  const the = dsThe.map((x) => x.the);

  const phong = [];
  for (const r of dsPhong) {
    const trongPhong = the.filter((t) => t.roomId === r.id);
    if (trongPhong.length) phong.push({ roomId: r.id, ten: r.name, tenNgan: tenPhongNgan(r.name), the: trongPhong });
  }
  return {
    homQua: ngayQ,
    homNay: ngayH,
    the,
    phong,
    dem: {
      tatCa: the.length,
      moiDemQua: the.filter((t) => t.moiDemQua).length,
      conViec: the.filter((t) => t.conViec).length,
      chuaChep: the.filter((t) => t.chuaChep).length,
    },
    soViecCon: the.reduce((n, t) => n + t.soViecCon, 0),
  };
}

/** Lọc thẻ theo chip: 'tatCa' | 'moiDemQua' | 'conViec' | 'chuaChep'. Chip lạ = tất cả. */
export function locThe(the, chip) {
  switch (chip) {
    case 'moiDemQua': return the.filter((t) => t.moiDemQua);
    case 'conViec': return the.filter((t) => t.conViec);
    case 'chuaChep': return the.filter((t) => t.chuaChep);
    default: return the.slice();
  }
}

// ---------- Tổng hợp giao tour (bảng 17d) ----------
const dm = (iso) => { const d = parseIso(iso); return p2(d.getDate()) + '/' + p2(d.getMonth() + 1); };
const dmy = (iso) => dm(iso) + '/' + parseIso(iso).getFullYear();
const TIEU_DE_NHOM = [
  ['beMoi', 'BÉ MỚI ĐÊM QUA'],
  ['viecConLai', 'VIỆC CÒN TỪ HÔM QUA'],
  ['beOnDinh', 'BÉ ỔN ĐỊNH'],
];

function dongGiaoTour(the, coGhiChu) {
  const parts = [the.tenNgan, the.ma || 'Chưa có mã'];
  if (the.moiDemQua && the.gioVao) parts.push('vào ' + the.gioVao);
  if (the.tuoi) parts.push(the.tuoi.pma);
  if (the.hienThi.wt) {
    const tg = the.tangGiamCan && the.tangGiamCan.gram !== 0 ? ', ' + the.tangGiamCan.text : '';
    parts.push(the.hienThi.wt + ' g' + tg);
  }
  if (the.chiCoHomQua) parts.push('chưa có trong danh sách hôm nay');
  if (the.chiCoHomNay) parts.push('mới vào hôm nay');
  const lines = [parts.join(' - ')];
  for (const t of [...the.viecConHomNay, ...the.viecConTuHomQua]) lines.push('- ' + chuanMa(t.text));
  if (coGhiChu) {
    const nay = chuanMa(the.homNay?.note), qua = chuanMa(the.homQua?.note);
    if (nay) lines.push('Ghi chú: ' + nay);
    if (qua && chuanChu(qua) !== chuanChu(nay)) lines.push('Ghi chú hôm qua: ' + qua);
  }
  return lines;
}

/**
 * Văn bản giao tour. ghep = kết quả ghepHaiNgay. bat = { beMoi, viecConLai, beOnDinh, ghiChu } (mặc định bật ba nhóm, tắt ghi chú).
 * Dòng đầu luôn đếm đủ mọi bé và mọi việc dù nhóm đang tắt. Mỗi bé nằm đúng một nhóm (nhomGiaoTour). Tuổi theo ngày lịch (đã
 * tính trong ghepHaiNgay). Mức tăng giảm cân chỉ ghi khi khác 0.
 * @returns { text, soBe, soMoiDemQua, soViecCon, nhom: { beMoi: key[], viecConLai: key[], beOnDinh: key[] } }
 */
export function soanGiaoTour({ ghep, bat }) {
  const b = { beMoi: true, viecConLai: true, beOnDinh: true, ghiChu: false, ...(bat || {}) };
  const { the, homQua, homNay } = ghep;
  const khacNam = homQua.slice(0, 4) !== homNay.slice(0, 4);
  const dau = 'GIAO TOUR ' + (khacNam ? dmy(homQua) : dm(homQua)) + ' - ' + dmy(homNay);
  const nhom = { beMoi: [], viecConLai: [], beOnDinh: [] };
  for (const t of the) nhom[nhomGiaoTour(t)].push(t.key);
  const soMoiDemQua = the.filter((t) => t.moiDemQua).length;
  const kq = { soBe: the.length, soMoiDemQua, soViecCon: ghep.soViecCon, nhom };
  if (!the.length) return { ...kq, text: dau + '\nChưa có bé trong 2 ngày.' };

  const khoi = [dau + '\n' + `${the.length} bé. ${soMoiDemQua} mới đêm qua. ${ghep.soViecCon} việc còn lại.`];
  for (const [ma, tieuDe] of TIEU_DE_NHOM) {
    if (!b[ma]) continue;
    const ds = the.filter((t) => nhomGiaoTour(t) === ma);
    if (!ds.length) continue;
    khoi.push([tieuDe, ...ds.flatMap((t) => dongGiaoTour(t, !!b.ghiChu))].join('\n'));
  }
  return { ...kq, text: khoi.join('\n\n') };
}
