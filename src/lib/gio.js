// Luật thuần cho tab Giờ (giờ nhập máy / giờ khám của bé, khoảng giờ người khác dùng, chia giờ nhanh).
// Không import db/React, không dùng window, không đọc đồng hồ: nhận mốc ngày làm việc qua tham số `moc`.
// Giờ lưu là số nguyên phút 0–1439 tính từ 00:00, hoặc null (chưa có giờ).
import { MOC_MAC_DINH, chuanHoaMoc } from './cai-dat.js';

const NGAY = 1440;

// Mốc lạ → chuanHoaMoc (mốc 0 hợp lệ); thiếu → 420.
const mocDung = (moc) => (moc === undefined || moc === null ? MOC_MAC_DINH : chuanHoaMoc(moc));

// Có giờ hợp lệ không: số nguyên 0..1439.
export const coGio = (t) => Number.isInteger(t) && t >= 0 && t < NGAY;

// Chữ → phút. Rỗng → null; sai → NaN.
// Nhận: '815', '0815', '8:15', '08h15', '8H15', '08.15' → 495; '8', '08', '8h' → 480.
export function docGio(chu) {
  if (chu === null || chu === undefined) return null;
  const s = String(chu).trim();
  if (s === '') return null;
  let h;
  let m;
  let kq = /^(\d{1,2})\s*[:hH.]\s*(\d{2})$/.exec(s);
  if (kq) {
    h = Number(kq[1]);
    m = Number(kq[2]);
  } else if ((kq = /^(\d{1,2})\s*[hH]?$/.exec(s))) {
    h = Number(kq[1]);
    m = 0;
  } else if ((kq = /^(\d{3,4})$/.exec(s))) {
    const d = kq[1];
    h = Number(d.slice(0, d.length - 2));
    m = Number(d.slice(-2));
  } else return NaN;
  return h > 23 || m > 59 ? NaN : h * 60 + m;
}

// 495 → '08h15'; không phải giờ hợp lệ → ''.
export const chuGio = (t) => (coGio(t) ? String(Math.floor(t / 60)).padStart(2, '0') + 'h' + String(t % 60).padStart(2, '0') : '');

// Thứ tự trong ngày làm việc: giờ trước mốc xếp cuối ngày (cộng 1440).
export const thuTu = (t, moc) => {
  const m = mocDung(moc);
  return t < m ? t + NGAY : t;
};

// Khoảng hợp lệ: cả hai đầu là giờ, đầu sau không trước đầu trước (theo thứ tự ngày làm việc).
export const khoangHopLe = (k, moc) => !!k && coGio(k.tu) && coGio(k.den) && thuTu(k.den, moc) >= thuTu(k.tu, moc);

// Giờ t nằm trong khoảng k (tính cả hai đầu). Khoảng không hợp lệ → false.
export const trongKhoang = (t, k, moc) => {
  if (!coGio(t) || !khoangHopLe(k, moc)) return false;
  const x = thuTu(t, moc);
  return x >= thuTu(k.tu, moc) && x <= thuTu(k.den, moc);
};

const khacId = (a, id) => id === undefined || id === null || a.id !== id;

// Các chỗ giờ của một bé trùng: với bé khác (kieu 'be') và với khoảng người khác dùng (kieu 'khoang').
// dong = [{ id, ma, gio }], khoang = [{ id, tu, den, bs }]. Bỏ qua chính nó (cùng id) và dòng không có giờ.
export function loiGio({ id, gio } = {}, dong = [], khoang = [], moc) {
  if (!coGio(gio)) return [];
  const kq = [];
  for (const d of dong || []) {
    if (d && khacId(d, id) && coGio(d.gio) && d.gio === gio) kq.push({ kieu: 'be', id: d.id, ma: d.ma, gio: d.gio });
  }
  for (const k of khoang || []) {
    if (k && khacId(k, id) && trongKhoang(gio, k, moc)) kq.push({ kieu: 'khoang', id: k.id, tu: k.tu, den: k.den, bs: k.bs });
  }
  return kq;
}

// Bảng phút bận theo vị trí trong ngày làm việc (0 = đúng mốc): chỉ các khoảng hợp lệ.
function bangKhoang(khoang, moc) {
  const ban = new Uint8Array(NGAY);
  for (const k of khoang || []) {
    if (!khoangHopLe(k, moc)) continue;
    for (let x = thuTu(k.tu, moc); x <= thuTu(k.den, moc); x++) ban[x - moc] = 1;
  }
  return ban;
}

// Chia giờ nhanh. chon = id bé theo thứ tự chia; den null = đến hết ngày làm việc; buoc 1..60 (sai → 1).
// Mỗi bé lấy phút trống sớm nhất từ con trỏ, rồi con trỏ += buoc. Phút bận: trong khoảng, hoặc giờ của dòng có id KHÔNG nằm trong chon.
// Bé không được giờ (thieu) mà đang có giờ cũ thì giờ cũ vẫn còn → coi là bận và tính lại cho tới khi ổn định.
// Trả { hopLe, gio: Map id → phút, thieu: [id], bo: [phút bận đã nhảy qua], dau, cuoi }.
export function phanBoGio({ tu, den, buoc, chon } = {}, dong = [], khoang = [], moc) {
  const m = mocDung(moc);
  const ids = [...new Set(Array.isArray(chon) ? chon : [])];
  const hong = { hopLe: false, gio: new Map(), thieu: ids, bo: [], dau: null, cuoi: null };
  if (!coGio(tu)) return hong;
  const denTinh = den === null || den === undefined ? (m + NGAY - 1) % NGAY : den;
  if (!coGio(denTinh) || thuTu(denTinh, m) < thuTu(tu, m)) return hong;
  const b = Number.isInteger(buoc) && buoc >= 1 && buoc <= 60 ? buoc : 1;
  const dau = thuTu(tu, m);
  const cuoi = thuTu(denTinh, m);
  const chonSet = new Set(ids);
  const khoangBan = bangKhoang(khoang, m);
  // Giờ của dòng ngoài lượt chọn luôn bận; giờ cũ của bé đang chọn nhưng thiếu giờ sẽ được thêm dần.
  const banCoDinh = new Uint8Array(NGAY);
  const gioCu = new Map();
  for (const d of dong || []) {
    if (!d || !coGio(d.gio)) continue;
    if (chonSet.has(d.id)) gioCu.set(d.id, d.gio);
    else banCoDinh[thuTu(d.gio, m) - m] = 1;
  }
  const thieuGiu = new Set();
  for (;;) {
    const ban = new Uint8Array(NGAY);
    for (let i = 0; i < NGAY; i++) ban[i] = khoangBan[i] | banCoDinh[i];
    for (const id of thieuGiu) ban[thuTu(gioCu.get(id), m) - m] = 1;
    const gio = new Map();
    const thieu = [];
    const bo = [];
    let p = dau;
    for (const id of ids) {
      while (p <= cuoi && ban[p - m]) bo.push(p++ % NGAY);
      if (p > cuoi) {
        thieu.push(id);
        continue;
      }
      gio.set(id, p % NGAY);
      p += b;
    }
    // Có bé mới thiếu giờ mà còn giờ cũ chưa được coi là bận → thêm vào rồi tính lại.
    const them = thieu.filter((id) => gioCu.has(id) && !thieuGiu.has(id));
    if (them.length) {
      them.forEach((id) => thieuGiu.add(id));
      continue;
    }
    const dsGio = [...gio.values()].map((x) => thuTu(x, m));
    return {
      hopLe: true,
      gio,
      thieu,
      bo,
      dau: dsGio.length ? Math.min(...dsGio) % NGAY : null,
      cuoi: dsGio.length ? Math.max(...dsGio) % NGAY : null,
    };
  }
}

// Gộp các phút liền nhau (theo thứ tự ngày làm việc) thành đoạn [{ tu, den }].
export function gopPhut(mang, moc) {
  const m = mocDung(moc);
  const xs = [...new Set((mang || []).filter(coGio).map((t) => thuTu(t, m)))].sort((a, b) => a - b);
  const kq = [];
  for (const x of xs) {
    const cuoi = kq[kq.length - 1];
    if (cuoi && x === cuoi.den + 1) cuoi.den = x;
    else kq.push({ tu: x, den: x });
  }
  return kq.map((d) => ({ tu: d.tu % NGAY, den: d.den % NGAY }));
}

// Mọi mốc đã dùng theo thứ tự ngày làm việc: giờ của bé và hai đầu khoảng hợp lệ.
function cacMoc(dong, khoang, moc) {
  const xs = [];
  for (const d of dong || []) if (d && coGio(d.gio)) xs.push(thuTu(d.gio, moc));
  for (const k of khoang || []) if (khoangHopLe(k, moc)) xs.push(thuTu(k.tu, moc), thuTu(k.den, moc));
  return xs;
}

// Giờ đầu và giờ cuối (cho thanh giờ). Không có gì → null.
export function dauCuoi(dong, khoang, moc) {
  const m = mocDung(moc);
  const xs = cacMoc(dong, khoang, m);
  if (!xs.length) return null;
  return { dau: Math.min(...xs) % NGAY, cuoi: Math.max(...xs) % NGAY };
}

// Các đoạn trống nằm GIỮA các giờ/khoảng đã có, dài ít nhất toiThieu phút (đếm phút trống).
export function khoangTrong(dong, khoang, moc, toiThieu = 5) {
  const m = mocDung(moc);
  const xs = cacMoc(dong, khoang, m);
  if (!xs.length) return [];
  const ban = bangKhoang(khoang, m);
  for (const d of dong || []) if (d && coGio(d.gio)) ban[thuTu(d.gio, m) - m] = 1;
  const dau = Math.min(...xs);
  const cuoi = Math.max(...xs);
  const kq = [];
  let tu = null;
  for (let x = dau; x <= cuoi + 1; x++) {
    const trong = x <= cuoi && !ban[x - m];
    if (trong && tu === null) tu = x;
    if (!trong && tu !== null) {
      if (x - tu >= toiThieu) kq.push({ tu: tu % NGAY, den: (x - 1) % NGAY });
      tu = null;
    }
  }
  return kq;
}

// Mã giường ngoài tab Khám: bỏ khoảng trắng đầu/cuối, viết hoa, chỉ chữ không dấu, số, dấu gạch nối, 1–8 ký tự. Sai → ''.
export function maKhacHopLe(s) {
  if (typeof s !== 'string') return '';
  const v = s.trim().toUpperCase();
  return /^[A-Z0-9-]{1,8}$/.test(v) ? v : '';
}

// Ô "Bác Sĩ": gộp khoảng trắng, cắt 20 ký tự. Không phải chuỗi → ''.
export function chuanBacSi(s) {
  if (typeof s !== 'string') return '';
  return s.trim().replace(/\s+/g, ' ').slice(0, 20);
}
