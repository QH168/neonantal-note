// Tab Giờ (đợt 2): thanh giờ, chọn giờ nhanh, danh sách trong ngày, bảng giờ người khác dùng, bảng giờ của một bé.
// Mọi luật tính nằm ở src/lib/gio.js; mọi thao tác ghi gọi hàm trong src/lib/actions.js (mục "Giờ nhập máy").
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  datGioBe, hoanTacGioBe, datGioMaKhac, dienGioNhanh, hoanTacDienGio, themKhoang, themGioLe, suaKhoang, xoaKhoang, xoaCacKhoang,
  khoiPhucGioMay, themMaKhac, xoaMaKhac
} from '../lib/actions.js';
import {
  coGio, docGio, chuGio, thuTu, loiGio, trongKhoang, khoangHopLe, phanBoGio, gopPhut, thanhGio, CHUA_MA, tenKhoang, chuLoiNgan, chuLoiDai,
  buocKhoang, phutKhoang, chuKhoang, chuBuoc
} from '../lib/gio.js';
import { useHoanTac } from './HoanTac.jsx';
import { useVietTat } from './VietTat.jsx';
import { Sheet, SheetHead, PlusIcon, useDongSheet } from './ui.jsx';

const NGAY = 1440;
const NGOAI_KHAM = 'Ngoài tab Khám';
const BUOC = [1, 2, 3, 5];

const chuMa = (d) => d.ma || CHUA_MA;
const laSo = (v) => typeof v === 'number' && !Number.isNaN(v);
const gioKhoangChu = (t) => chuGio(((t % NGAY) + NGAY) % NGAY);

/** Lựa chọn chọn-giờ-nhanh lúc mở app / qua ngày làm việc mới: Từ = giờ máy lúc này, chọn tự động (mọi bé chưa có giờ), mở tự động. */
export function gioQMacDinh() {
  const d = new Date();
  return { tu: d.getHours() * 60 + d.getMinutes(), den: null, buoc: 1, chon: null, mo: null };
}

// Chữ lý do trùng (chuLoiNgan, chuLoiDai) nằm ở src/lib/gio.js, dùng chung với ô giờ ở tab Khám.

// ---------- Ô gõ giờ: 815 / 0815 / 8h15 → 08h15, kèm −1 / +1 vòng qua nửa đêm ----------
// value = phút | null (trống) | NaN (đang gõ dở/sai). onChange(phút | null | NaN).
function OGio({ id, nhan, value, onChange, goiY = '815' }) {
  const [chu, setChu] = useState(() => (laSo(value) ? chuGio(value) : ''));
  const dangGo = useRef(false);
  const vuaVao = useRef(false);
  useEffect(() => { if (!dangGo.current && !Number.isNaN(value)) setChu(chuGio(value)); }, [value]);
  const boiDen = (o) => { try { o.setSelectionRange(0, o.value.length); } catch { /* bỏ qua */ } };
  const doi = (b) => {
    const v = docGio(chu);
    if (!coGio(v)) return;
    const t = (v + b + NGAY) % NGAY;
    setChu(chuGio(t));
    onChange(t);
  };
  return (
    <div className="g-nhom">
      <label htmlFor={id}>{nhan}</label>
      <div className="g-buoc">
        <button type="button" className="g-nho" aria-label={nhan + ' bớt 1 phút'} onClick={() => doi(-1)}>−1</button>
        <input id={id} className="g-in g-to" inputMode="numeric" autoComplete="off" placeholder={goiY} value={chu}
          onChange={(e) => { setChu(e.target.value); onChange(docGio(e.target.value)); }}
          onFocus={(e) => { dangGo.current = true; vuaVao.current = true; boiDen(e.currentTarget); }}
          // Safari bỏ bôi đen khi nhấc tay: bôi lại ở cú click đầu sau khi vào ô
          onClick={(e) => { if (vuaVao.current) { vuaVao.current = false; const o = e.currentTarget, v = o.value; setTimeout(() => { if (o.value === v) boiDen(o); }, 0); } }}
          onBlur={() => { dangGo.current = false; const v = docGio(chu); if (coGio(v)) setChu(chuGio(v)); else if (v === null) setChu(laSo(value) ? chuGio(value) : ''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} />
        <button type="button" className="g-nho" aria-label={nhan + ' thêm 1 phút'} onClick={() => doi(1)}>+1</button>
      </div>
    </div>
  );
}

// ---------- Thanh giờ ----------
function ThanhGioView({ t, dong, khoang }) {
  const gioCuaMinh = useMemo(() => dong.filter((d) => coGio(d.gio)).map((d) => chuGio(d.gio)), [dong]);
  const aria = t.coGio
    ? `Từ ${chuGio(t.dau)} đến ${chuGio(t.cuoi)}. Của mình: ${gioCuaMinh.join(', ') || 'chưa có'}. Người khác dùng: ${t.khoi.map(tenKhoang).join(', ') || 'chưa có'}`
    : '';
  return (
    <section className="g-dai" aria-label="Thanh giờ">
      <div className="g-dai-dau"><span>Giờ đã có</span><span>{t.vach.length} bé · {khoang.length} mục người khác</span></div>
      {t.coGio ? (
        <>
          <div className="g-lan" role="img" aria-label={aria}>
            {t.khoi.map((k) => <b key={k.id} className={k.nhip.length ? 'nen' : undefined} style={{ left: k.left + '%', width: k.rong + '%' }}>{k.nhan && <span>{k.nhan}</span>}</b>)}
            {/* khoảng có bước: vạch nhỏ ở đáy cho từng phút đã dùng */}
            {t.khoi.flatMap((k) => k.nhip.map((n) => <b key={k.id + '-' + n.gio} className="nhip" style={{ left: n.left + '%', width: n.rong + '%' }} />))}
            {t.vach.map((v) => <i key={v.id} className={v.trung ? 'trung' : ''} style={{ left: v.left + '%', width: v.rong + '%' }} />)}
            {t.tam.map((v) => <i key={'t' + v.id} className="tam" style={{ left: v.left + '%', width: v.rong + '%' }} />)}
          </div>
          <div className="g-moc" aria-hidden="true">
            {t.moc.map((m) => <span key={m.cho + m.gio} className={m.cho} style={{ left: m.left + '%' }}>{chuGio(m.gio)}</span>)}
          </div>
          <div className="g-chu-giai">
            <span><i className="cham" />Của mình</span>
            <span><i className="cham ho" />Người khác dùng</span>
          </div>
        </>
      ) : <p className="g-chua">Chưa có giờ nào.</p>}
    </section>
  );
}

// ---------- Chọn giờ nhanh ----------
// Câu kết quả (hàm thuần của màn hình): { sai, cls, nhieu: [{ chu, dam }], keoDai }.
function ketQuaNhanh(q, ph, chonIds, dong, khoang, moc) {
  const mong = (id) => dong.find((d) => d.id === id);
  let sai = '';
  if (q.tu === null) sai = 'Gõ giờ bắt đầu, ví dụ 801.';
  else if (Number.isNaN(q.tu)) sai = 'Giờ bắt đầu chưa đúng. Gõ 801 hoặc 08h01.';
  else if (Number.isNaN(q.den)) sai = 'Giờ kết thúc chưa đúng. Gõ 807 hoặc 08h07.';
  else if (q.den !== null && thuTu(q.den, moc) < thuTu(q.tu, moc)) sai = 'Giờ kết thúc sớm hơn giờ bắt đầu.';
  if (sai) return { sai, cls: '', nhieu: [{ chu: sai }], keoDai: null };
  if (!chonIds.length) return { sai: '', cls: '', nhieu: [{ chu: 'Chạm vào bé để chọn.' }], keoDai: null };
  const nhieu = [];
  let cls = 'kt';
  let keoDai = null;
  const so = ph.gio.size;
  const tenThieu = ph.thieu.map((id) => chuMa(mong(id) || {})).join(', ');
  if (ph.thieu.length) {
    cls = 'vang';
    nhieu.push({ chu: `Khoảng này chỉ đủ ${so} giờ cho ${chonIds.length} bé. Chưa có giờ: ${tenThieu}.`, dam: true });
    const du = phanBoGio({ tu: q.tu, den: null, buoc: q.buoc, chon: chonIds }, dong, khoang, moc);
    if (du.hopLe && !du.thieu.length) keoDai = du.cuoi;
  } else {
    const dau = chonIds.map((id) => ph.gio.get(id)).find(laSo);
    nhieu.push({ chu: `${chonIds.length} bé, từ ${chuGio(dau)} đến ${chuGio(ph.cuoi)}, không trùng.` });
  }
  if (ph.bo.length) nhieu.push({ chu: 'Đã bỏ qua ' + gopPhut(ph.bo, moc).map((d) => (d.tu === d.den ? chuGio(d.tu) : chuGio(d.tu) + '–' + chuGio(d.den))).join(', ') + ' vì có người dùng.' });
  const ghiDe = chonIds.filter((id) => coGio(mong(id)?.gio) && ph.gio.has(id) && mong(id).gio !== ph.gio.get(id));
  if (ghiDe.length) nhieu.push({ chu: 'Sẽ thay giờ đã có của ' + ghiDe.map((id) => chuMa(mong(id))).join(', ') + '.' });
  return { sai: '', cls, nhieu, keoDai };
}

function ChonGioNhanh({ q, datQ, ph, chonIds, thieuIds, dong, khoang, nhom, ngoai, moc, homNay, mo, onXong }) {
  const hoanTac = useHoanTac();
  const dongRef = useRef(false);
  const [dangGhi, setDangGhi] = useState(false);
  const [hienMa, setHienMa] = useState(false);
  const [ma, setMa] = useState('');
  const [loiMa, setLoiMa] = useState('');
  const chonSet = useMemo(() => new Set(chonIds), [chonIds]);
  const thieuSet = useMemo(() => new Set(ph.thieu), [ph.thieu]);
  const kq = useMemo(() => ketQuaNhanh(q, ph, chonIds, dong, khoang, moc), [q, ph, chonIds, dong, khoang, moc]);
  const so = ph.gio.size;
  const conThieu = thieuIds.length;

  if (!mo) {
    return (
      <section className="g-nhanh" aria-label="Chọn giờ nhanh">
        <div className="g-tieu">
          <div>
            <h2>Chọn giờ nhanh</h2>
            <span className="g-ghi">{!dong.length ? 'Chưa có bé nào' : conThieu ? conThieu + ' bé chưa có giờ' : 'Cả ' + dong.length + ' bé đã có giờ'}</span>
          </div>
          <button type="button" id="g-mo-nhanh" className="btn sm" aria-label="Mở chọn giờ nhanh" onClick={() => datQ({ mo: true, chon: null })}>Mở</button>
        </div>
      </section>
    );
  }

  const bam = (id) => {
    const cur = q.chon === null ? [...thieuIds] : [...q.chon];
    const i = cur.indexOf(id);
    if (i >= 0) cur.splice(i, 1); else cur.push(id);
    datQ({ chon: cur });
  };
  const chonHet = () => {
    if (chonIds.length) datQ({ chon: [] });
    else if (conThieu) datQ({ chon: null });
    else datQ({ chon: dong.map((d) => d.id) });
  };
  const themMa = async () => {
    let r;
    try { r = await themMaKhac(homNay, ma); } catch { setLoiMa('Chưa lưu được. Hãy thử lại.'); return; }
    if (r.ok || r.ly === 'trung') {
      const id = r.id;
      if (q.chon !== null && !q.chon.includes(id)) datQ({ chon: [...q.chon, id] });
      setMa(''); setLoiMa(''); setHienMa(false);
    } else setLoiMa('Mã chỉ gồm chữ không dấu và số, tối đa 8 ký tự.');
  };
  const dien = async () => {
    if (dongRef.current) return; // chống bấm đúp: khoá ngay, trước cả lần vẽ lại
    dongRef.current = true;
    setDangGhi(true);
    try {
      const r = await dienGioNhanh(homNay, { tu: q.tu, den: q.den, buoc: q.buoc, chon: chonIds }, ph.gio, moc);
      if (!r.ok) {
        hoanTac.hien({ nhan: r.ly === 'da-doi' ? 'Dữ liệu vừa đổi, xem lại rồi bấm lần nữa.' : r.ly === 'khong-con-cho' ? 'Không còn chỗ trống trong khoảng này.' : 'Khoảng giờ chưa đúng, xem lại rồi bấm lần nữa.' });
        return;
      }
      hoanTac.hien({ nhan: `Đã điền ${r.so} giờ vào tab Khám`, lam: () => hoanTacDienGio(r.cu) });
      datQ({ tu: (r.cuoi + q.buoc) % NGAY, den: null, chon: null, mo: null });
      const conLai = dong.filter((d) => !coGio(d.gio) && !ph.gio.has(d.id)).length;
      if (!conLai) onXong();
    } catch {
      hoanTac.hien({ nhan: 'Chưa lưu được. Hãy thử lại.' });
    } finally {
      dongRef.current = false;
      setDangGhi(false);
    }
  };

  const nhomChip = [...nhom, ...(ngoai.length ? [{ id: '__ngoai', ten: NGOAI_KHAM, ds: ngoai }] : [])];
  return (
    <section className="g-nhanh" aria-label="Chọn giờ nhanh">
      <div className="g-tieu">
        <h2>Chọn giờ nhanh</h2>
        <button type="button" id="g-dong-nhanh" className="btn sm" aria-label="Đóng chọn giờ nhanh" onClick={() => datQ({ mo: false })}>Đóng</button>
      </div>
      <div className="g-hai-gio">
        <OGio id="g-tu" nhan="Từ" value={q.tu} goiY="801" onChange={(v) => datQ({ tu: v })} />
        <OGio id="g-den" nhan={q.den === null ? 'Đến (tự tính)' : 'Đến'} value={q.den === null ? ph.cuoi : q.den} goiY="–" onChange={(v) => datQ({ den: v })} />
      </div>
      <div className="g-nhom">
        <span className="g-lb" id="g-buoc-nhan">Mỗi bé cách</span>
        <div className="seg full" role="group" aria-labelledby="g-buoc-nhan">
          {BUOC.map((p) => <button key={p} type="button" aria-pressed={q.buoc === p} onClick={() => datQ({ buoc: p })}>{p} phút</button>)}
        </div>
      </div>
      <div className="g-nhom">
        <div className="g-tieu g-tieu-nho">
          <span className="g-ghi">Đang chọn {chonIds.length}/{dong.length} bé</span>
          <button type="button" className="btn sm" onClick={chonHet}>{chonIds.length ? 'Bỏ chọn hết' : conThieu ? 'Chọn bé chưa có giờ' : 'Chọn tất cả'}</button>
        </div>
        <div className="g-be-ds" role="group" aria-label="Chọn bé">
          {nhomChip.map((g) => (
            <div key={g.id} className="g-phong-nhom">
              <span className="g-phong">{g.ten}</span>
              {g.ds.map((d) => {
                const on = chonSet.has(d.id);
                const het = on && thieuSet.has(d.id);
                const nho = on ? (het ? 'thiếu giờ' : chuGio(ph.gio.get(d.id))) : coGio(d.gio) ? 'đã ' + chuGio(d.gio) : 'chưa có';
                return (
                  <button key={d.id} type="button" className={'g-cb' + (het ? ' thieu-gio' : '')} aria-pressed={on} onClick={() => bam(d.id)}>
                    <span className="g-cb-ma">{chuMa(d)}</span><small>{nho}</small>
                  </button>
                );
              })}
            </div>
          ))}
          <button type="button" className="g-cb net" aria-expanded={hienMa} onClick={() => setHienMa(!hienMa)}>Mã khác</button>
        </div>
        {hienMa && (
          <div className="g-them-ma">
            <input className="g-in" placeholder="Số giường, ví dụ G21" aria-label="Số giường ngoài tab Khám" autoComplete="off" autoCapitalize="characters" maxLength={8}
              value={ma} autoFocus onChange={(e) => { setMa(e.target.value); setLoiMa(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); themMa(); } }} />
            <button type="button" className="btn" onClick={themMa}>Thêm</button>
            {loiMa && <span className="g-loi" role="alert">{loiMa}</span>}
          </div>
        )}
      </div>
      <div className={'g-kq ' + kq.cls} role="status">
        {kq.nhieu.map((n, i) => <span key={i} className={n.dam ? 'dam' : ''}>{n.chu}</span>)}
        {kq.keoDai !== null && <button type="button" className="btn" onClick={() => datQ({ den: null })}>Kéo dài đến {chuGio(kq.keoDai)}</button>}
      </div>
      <button type="button" id="g-dien" className="btn primary big" disabled={!!kq.sai || !so || dangGhi} onClick={dien}>
        {so && !kq.sai ? `Điền ${so} giờ vào tab Khám` : 'Điền giờ vào tab Khám'}
      </button>
    </section>
  );
}

// ---------- Bảng giờ người khác dùng ----------
function BangKhoang({ khoangGoc, dong, khoang, moc, homNay }) {
  const hoanTac = useHoanTac();
  const dong_ = useDongSheet();
  const sua = !!khoangGoc;
  // Giờ lẻ (bác sĩ duyệt 26/11/2026) = dòng khoảng có tu = den; mở một giờ lẻ thì vào thẳng kiểu Giờ lẻ.
  const le0 = sua && khoangGoc.tu === khoangGoc.den;
  const [kieu, setKieu] = useState(le0 ? 'le' : 'khoang');
  const [f, setF] = useState(() => ({ tu: sua && !le0 ? khoangGoc.tu : null, den: sua && !le0 ? khoangGoc.den : null }));
  // Bước nhảy tự gõ (không có sẵn): trống = liền, 1–60 = cách đều.
  const [buocChu, setBuocChu] = useState(() => (sua && buocKhoang(khoangGoc) > 1 ? String(buocKhoang(khoangGoc)) : ''));
  const [le, setLe] = useState(() => (le0 ? [khoangGoc.tu] : []));
  const [go, setGo] = useState('');
  const [bs, setBs] = useState(sua ? khoangGoc.bs || '' : '');
  const [dangGhi, setDangGhi] = useState(false);
  const vt = useVietTat(bs, (v) => setBs(String(v).slice(0, 20)));
  const oLe = useRef(null);

  const sb = buocChu.trim();
  const buoc = sb === '' ? 1 : /^\d{1,2}$/.test(sb) && +sb >= 1 && +sb <= 60 ? +sb : NaN;
  const goV = docGio(go);
  const xepGio = useCallback((a) => [...a].sort((x, y) => thuTu(x, moc) - thuTu(y, moc)), [moc]);
  // Giờ lẻ sẽ lưu: các giờ đã thêm + giờ đang gõ đúng mà chưa bấm Thêm.
  const dsLe = useMemo(() => xepGio(coGio(goV) && !le.includes(goV) ? [...le, goV] : le), [le, goV, xepGio]);

  const thongTin = useMemo(() => {
    const khac = khoang.filter((o) => !sua || o.id !== khoangGoc.id);
    if (kieu === 'le') {
      if (go.trim() && Number.isNaN(goV)) return { sai: 'Giờ chưa đúng. Gõ 905 hoặc 09h05.' };
      if (!dsLe.length) return { sai: 'Gõ từng giờ người khác đã dùng, ví dụ 905, 912, 940.' };
      const trung = dong.filter((d) => coGio(d.gio) && dsLe.includes(d.gio));
      const chong = khac.filter((o) => dsLe.some((v) => trongKhoang(v, o, moc)));
      return { sai: '', trung, chong, ds: dsLe };
    }
    if (f.tu === null || f.den === null) return { sai: 'Gõ giờ bắt đầu và kết thúc, ví dụ 820 và 835.' };
    if (Number.isNaN(f.tu) || Number.isNaN(f.den)) return { sai: 'Giờ chưa đúng. Gõ 820 hoặc 08h20.' };
    if (thuTu(f.den, moc) < thuTu(f.tu, moc)) return { sai: 'Giờ kết thúc sớm hơn giờ bắt đầu.' };
    if (Number.isNaN(buoc)) return { sai: 'Cách mỗi gõ số phút từ 1 đến 60, hoặc để trống là liền.' };
    const k = { tu: f.tu, den: f.den, buoc };
    const ds = phutKhoang(k, moc);
    const trung = dong.filter((d) => coGio(d.gio) && trongKhoang(d.gio, k, moc));
    const chong = khac.filter((o) => ds.some((v) => trongKhoang(v, o, moc)));
    return { sai: '', trung, chong, ds };
  }, [kieu, f, buoc, go, goV, dsLe, dong, khoang, moc, sua, khoangGoc]);
  const co = thongTin.trung?.length > 0;
  const n = thongTin.ds?.length || 0;

  // Dòng đọc lại dưới ô Cách mỗi.
  let xem = 'Để trống: dùng liền mọi phút, như một ca từ 07h00 đến 07h05. Gõ số phút (ví dụ 5) khi người khác nhập cách đều; phút ở giữa vẫn chọn được.';
  if (kieu === 'khoang' && thongTin.ds) {
    const ds = thongTin.ds;
    const cuoi = ds[ds.length - 1];
    xem = buocKhoang({ buoc }) === 1
      ? `Dùng liền ${n} phút, từ ${chuGio(f.tu)} đến ${chuGio(f.den)}.`
      : `Dùng ${n} giờ: ${n <= 6 ? ds.map(chuGio).join(', ') : ds.slice(0, 3).map(chuGio).join(', ') + ' … ' + chuGio(cuoi)}. Phút ở giữa vẫn chọn được.`
        + (cuoi !== f.den ? ` ${chuGio(f.den)} lệch bước nên dừng ở ${chuGio(cuoi)}.` : '');
  }

  const doiKieu = (k) => {
    if (k === kieu) return;
    setKieu(k);
    setTimeout(() => document.getElementById(k === 'le' ? 'g-b-le' : 'g-b-tu')?.focus(), 0);
  };
  const themLe = (v = docGio(go)) => {
    if (v === null) { oLe.current?.focus(); return; }
    if (!coGio(v)) return; // sai: dòng báo đã nói
    setLe((a) => (a.includes(v) ? a : [...a, v]));
    setGo('');
    oLe.current?.focus();
  };

  const luu = async () => {
    if (dangGhi || thongTin.sai) return;
    setDangGhi(true);
    try {
      if (kieu === 'le') {
        const ds = thongTin.ds;
        const nhan = 'Đã lưu ' + ds.length + ' giờ lẻ: ' + ds.map(chuGio).join(', ');
        if (sua) {
          // Giờ đầu thay vào dòng đang sửa, các giờ sau thành dòng mới.
          const r = await suaKhoang(khoangGoc.id, { tu: ds[0], den: ds[0], bs, buoc: 1 }, moc);
          if (!r.ok) { hoanTac.hien({ nhan: 'Không lưu được, giờ này không còn nữa.' }); dong_(); return; }
          const them = ds.length > 1 ? await themGioLe(homNay, { ds: ds.slice(1), bs }) : { ok: true, ids: [] };
          hoanTac.hien({ nhan, lam: async () => { await xoaCacKhoang(them.ids || []); return (await suaKhoang(khoangGoc.id, r.cu, moc)).ok ? undefined : 'Không hoàn tác được.'; } });
        } else {
          const r = await themGioLe(homNay, { ds, bs });
          if (!r.ok) { hoanTac.hien({ nhan: 'Giờ chưa đúng, xem lại rồi bấm lần nữa.' }); setDangGhi(false); return; }
          hoanTac.hien({ nhan, lam: async () => ((await xoaCacKhoang(r.ids)) ? undefined : 'Không hoàn tác được.') });
        }
      } else {
        const yc = { tu: f.tu, den: f.den, bs, buoc };
        const nhan = 'Đã lưu khoảng ' + chuKhoang({ tu: f.tu, den: thongTin.ds[n - 1] }) + chuBuoc({ buoc });
        if (sua) {
          const r = await suaKhoang(khoangGoc.id, yc, moc);
          if (!r.ok) { hoanTac.hien({ nhan: 'Không lưu được, khoảng này không còn nữa.' }); dong_(); return; }
          hoanTac.hien({ nhan, lam: async () => ((await suaKhoang(khoangGoc.id, r.cu, moc)).ok ? undefined : 'Không hoàn tác được.') });
        } else {
          const r = await themKhoang(homNay, yc, moc);
          if (!r.ok) { hoanTac.hien({ nhan: 'Khoảng giờ chưa đúng, xem lại rồi bấm lần nữa.' }); setDangGhi(false); return; }
          hoanTac.hien({ nhan, lam: async () => ((await xoaKhoang(r.id)).ok ? undefined : 'Không hoàn tác được.') });
        }
      }
      dong_();
    } catch {
      hoanTac.hien({ nhan: 'Chưa lưu được. Hãy thử lại.' });
      setDangGhi(false);
    }
  };
  const xoa = async () => {
    if (dangGhi) return;
    setDangGhi(true);
    let r;
    try { r = await xoaKhoang(khoangGoc.id); } catch { hoanTac.hien({ nhan: 'Chưa xoá được. Hãy thử lại.' }); setDangGhi(false); return; }
    if (r.ok) {
      hoanTac.hien({ nhan: (le0 ? 'Đã xoá giờ ' : 'Đã xoá khoảng ') + chuKhoang(khoangGoc) + chuBuoc(khoangGoc), lam: async () => ((await khoiPhucGioMay(khoangGoc.id)).ok ? undefined : 'Không khôi phục được.') });
    }
    dong_();
  };

  const nhieu = n > 1 ? 'các giờ này.' : 'giờ này.';
  return (
    <>
      <div className="seg full" role="group" aria-label="Kiểu giờ">
        <button type="button" data-k="khoang" aria-pressed={kieu === 'khoang'} onClick={() => doiKieu('khoang')}>Khoảng giờ</button>
        <button type="button" data-k="le" aria-pressed={kieu === 'le'} onClick={() => doiKieu('le')}>Giờ lẻ</button>
      </div>
      {kieu === 'khoang' ? (
        <>
          <div className="g-hai-gio">
            <OGio id="g-b-tu" nhan="Từ" value={f.tu} goiY="820" onChange={(v) => setF((c) => ({ ...c, tu: v }))} />
            <OGio id="g-b-den" nhan="Đến" value={f.den} goiY="835" onChange={(v) => setF((c) => ({ ...c, den: v }))} />
          </div>
          <div className="g-nhom">
            <label htmlFor="g-b-nhip">Cách mỗi (phút)</label>
            <input id="g-b-nhip" className="g-in" inputMode="numeric" autoComplete="off" maxLength={2} placeholder="Để trống là liền" value={buocChu}
              onChange={(e) => setBuocChu(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} />
            <p className="g-goi-y">{xem}</p>
          </div>
        </>
      ) : (
        <div className="g-nhom">
          <label htmlFor="g-b-le">Giờ người khác đã dùng</label>
          <div className="g-them-ma">
            <input id="g-b-le" ref={oLe} className="g-in" inputMode="numeric" autoComplete="off" maxLength={5} placeholder="905" value={go}
              onChange={(e) => { const s = e.target.value; if (/^\d{4}$/.test(s.trim()) && coGio(docGio(s))) themLe(docGio(s)); else setGo(s); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); themLe(); } }} />
            <button type="button" className="btn" onClick={() => themLe()}>Thêm</button>
          </div>
          <p className="g-goi-y">Gõ đủ 4 số là tự thêm, ví dụ 0905. Thêm được nhiều giờ liền nhau.</p>
          {le.length > 0 && (
            <div className="g-le-ds" role="group" aria-label="Các giờ lẻ đã thêm">
              {xepGio(le).map((v) => (
                <button key={v} type="button" className={'g-le' + (dong.some((d) => d.gio === v) ? ' trung' : '')} aria-label={'Bỏ ' + chuGio(v)}
                  onClick={() => { setLe((a) => a.filter((z) => z !== v)); oLe.current?.focus(); }}>
                  {chuGio(v)}<span className="bo" aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <input id="g-b-bs" className="g-in" placeholder="Bác Sĩ" aria-label="Bác sĩ, không bắt buộc" autoComplete="off" {...vt.props} />
      {vt.strip}
      <div className={'g-kq ' + (thongTin.sai ? '' : co ? 'do' : thongTin.chong.length ? 'vang' : 'kt')} role="status">
        {thongTin.sai && <span>{thongTin.sai}</span>}
        {co && <span className="dam">Trùng giờ của mình: {thongTin.trung.map((d) => chuMa(d) + ' - ' + chuGio(d.gio)).join(', ')}</span>}
        {!thongTin.sai && thongTin.chong.length > 0 && <span>{kieu === 'le' ? 'Đã nằm trong ' : 'Chồng lên '}{thongTin.chong.map(tenKhoang).join(', ')}</span>}
        {!thongTin.sai && !co && !thongTin.chong.length && <span>Không trùng. Chọn giờ nhanh sẽ nhảy qua {kieu === 'le' || buocKhoang({ buoc }) > 1 ? nhieu : 'khoảng này.'}</span>}
      </div>
      <button type="button" className={'btn big ' + (co ? 'nguy' : 'primary')} disabled={!!thongTin.sai || dangGhi} onClick={luu}>
        {co ? 'Lưu dù đang trùng' : kieu === 'le' ? `Lưu ${n || ''} giờ lẻ` : buocKhoang({ buoc }) > 1 && n ? `Lưu ${n} giờ cách ${buoc} phút` : 'Lưu khoảng giờ'}
      </button>
      {sua && <div className="g-chan"><button type="button" className="g-xoa" disabled={dangGhi} onClick={xoa}>{le0 ? 'Xoá giờ này' : 'Xoá khoảng này'}</button></div>}
    </>
  );
}

// ---------- Bảng giờ của một bé / một mã khác ----------
function BangBe({ d, dong, khoang, moc, gioMay, tenPhong, onXemKham }) {
  const hoanTac = useHoanTac();
  const dongBang = useDongSheet();
  const ngoai = d.bang === 'gio_may';
  const [f, setF] = useState(() => ({ nhap: coGio(d.gio) ? d.gio : null, kham: coGio(d.gioKham) ? d.gioKham : null }));
  const [hienKham, setHienKham] = useState(coGio(d.gioKham));
  const [dangGhi, setDangGhi] = useState(false);
  const dongMa = useCallback((id) => dong.find((x) => x.id === id)?.ma || '', [dong]);
  const bayGio = docGio(gioMay);

  const tt = useMemo(() => {
    if (Number.isNaN(f.nhap) && f.nhap !== null) return { sai: 'Giờ nhập chưa đúng. Gõ 801 hoặc 08h01.' };
    if (f.kham !== null && Number.isNaN(f.kham)) return { sai: 'Giờ khám chưa đúng. Gõ 745 hoặc 07h45.' };
    if (f.nhap === null) return { sai: 'Gõ giờ nhập máy, ví dụ 801.' };
    const loi = loiGio({ id: d.id, gio: f.nhap }, dong, khoang, moc);
    const nguoc = f.kham !== null && thuTu(f.nhap, moc) < thuTu(f.kham, moc);
    return { sai: '', loi, nguoc };
  }, [f, dong, khoang, moc, d.id]);
  const trung = tt.loi?.length > 0;

  const ghi = (thayDoi) => (ngoai ? datGioMaKhac(d.id, thayDoi) : datGioBe(d.id, thayDoi));
  const hoanGhi = (cu) => (ngoai ? datGioMaKhac(d.id, cu) : hoanTacGioBe(d.id, cu));
  const luu = async () => {
    if (dangGhi || tt.sai) return;
    setDangGhi(true);
    let r;
    try { r = await ghi({ gioNhap: f.nhap, gioKham: f.kham }); } catch { hoanTac.hien({ nhan: 'Chưa lưu được. Hãy thử lại.' }); setDangGhi(false); return; }
    if (!r.ok) { hoanTac.hien({ nhan: 'Không lưu được, bé này không còn trong danh sách.' }); dongBang(); return; }
    hoanTac.hien({ nhan: 'Đã lưu giờ của ' + chuMa(d), lam: async () => ((await hoanGhi(r.cu)).ok ? undefined : 'Không hoàn tác được.') });
    dongBang();
  };
  const xoa = async () => {
    if (dangGhi) return;
    setDangGhi(true);
    let r;
    try { r = ngoai ? await xoaMaKhac(d.id) : await datGioBe(d.id, { gioNhap: null, gioKham: null }); } catch { hoanTac.hien({ nhan: 'Chưa xoá được. Hãy thử lại.' }); setDangGhi(false); return; }
    if (ngoai) {
      if (r.ok) {
        hoanTac.hien({
          nhan: 'Đã xoá mã ' + chuMa(d),
          lam: async () => {
            const k = await khoiPhucGioMay(d.id);
            if (k.ok) return undefined;
            return k.ly === 'trung' ? 'Đã có mã ' + chuMa(d) + ' trong ngày, không khôi phục.' : 'Không khôi phục được.';
          }
        });
      }
    } else {
      if (r.ok) hoanTac.hien({ nhan: 'Đã xoá giờ của ' + chuMa(d), lam: async () => ((await hoanTacGioBe(d.id, r.cu)).ok ? undefined : 'Không hoàn tác được.') });
    }
    dongBang();
  };

  return (
    <>
      {tenPhong && <div className="g-ghi g-phong-dong">{tenPhong}</div>}
      <div className="g-nhom">
        <OGio id="g-o-nhap" nhan="Giờ nhập máy" value={f.nhap} goiY="801" onChange={(v) => setF((c) => ({ ...c, nhap: v }))} />
        {laSo(bayGio) && <button type="button" className="g-nho g-bay-gio" onClick={() => setF((c) => ({ ...c, nhap: bayGio }))}>Bây giờ {chuGio(bayGio)}</button>}
      </div>
      <div className="g-nhom">
        {hienKham
          ? <OGio id="g-o-kham" nhan="Giờ khám (không bắt buộc)" value={f.kham} goiY="745" onChange={(v) => setF((c) => ({ ...c, kham: v }))} />
          : <button type="button" className="g-phu g-them-kham" onClick={() => setHienKham(true)}>Thêm giờ khám</button>}
      </div>
      <div className={'g-kq ' + (tt.sai ? '' : trung ? 'do' : tt.nguoc ? 'vang' : 'kt')} role="status">
        {tt.sai && <span>{tt.sai}</span>}
        {trung && tt.loi.map((e, i) => <span key={i} className="dam">{chuLoiDai(e, f.nhap, dongMa)}</span>)}
        {!tt.sai && !trung && !tt.nguoc && <span>Không trùng.</span>}
        {!tt.sai && tt.nguoc && <span>Giờ nhập sớm hơn giờ khám.</span>}
      </div>
      <button type="button" className={'btn big ' + (trung ? 'nguy' : 'primary')} disabled={!!tt.sai || dangGhi} onClick={luu}>
        {trung ? 'Lưu dù đang trùng' : 'Lưu giờ'}
      </button>
      <div className="g-chan">
        {!ngoai && <button type="button" className="g-phu" onClick={() => dongBang(() => onXemKham(d.id))}>Xem ở tab Khám</button>}
        {(coGio(d.gio) || ngoai) && <button type="button" className="g-xoa" disabled={dangGhi} onClick={xoa}>{ngoai ? 'Xoá mã này' : 'Xoá giờ'}</button>}
      </div>
    </>
  );
}

// ---------- Màn hình ----------
/**
 * Tab Giờ. dong = dòng giờ của ngày theo thứ tự chia (bé theo phòng, rồi mã khác): [{ id, ma, gio, gioKham, bang }];
 * khoang = [{ id, tu, den, bs }]; nhom = beTheoPhong().nhom (để chia chip theo phòng); tenPhong = Map idBe → tên phòng.
 * q / datQ: lựa chọn chọn-giờ-nhanh, giữ ở AppChinh để đổi tab không mất.
 */
export default function TabGio({ wide, homNay, mocPhut, gioMay, dong, khoang, nhom, tenPhong, q, datQ, onXemKham }) {
  const moc = mocPhut;
  const [bang, setBang] = useState(null); // { kieu: 'khoang', id: string | null } | { kieu: 'be', id }
  const goc = useRef(null);

  const thieuIds = useMemo(() => dong.filter((d) => !coGio(d.gio)).map((d) => d.id), [dong]);
  const chonIds = useMemo(() => {
    if (q.chon === null) return thieuIds;
    const s = new Set(q.chon);
    return dong.filter((d) => s.has(d.id)).map((d) => d.id);
  }, [q.chon, thieuIds, dong]);
  const mo = q.mo === null ? thieuIds.length > 0 : q.mo;
  const ph = useMemo(
    () => phanBoGio({ tu: q.tu, den: q.den, buoc: q.buoc, chon: chonIds }, dong, khoang, moc),
    [q.tu, q.den, q.buoc, chonIds, dong, khoang, moc]
  );
  const ngoai = useMemo(() => dong.filter((d) => d.bang === 'gio_may'), [dong]);
  // nhom là bé thô theo phòng; chip cần dòng giờ (ma, gio) của đúng bé đó
  const nhomChip = useMemo(() => {
    const theoId = new Map(dong.map((d) => [d.id, d]));
    return nhom.map((g) => ({ ...g, ds: g.ds.map((p) => theoId.get(p.id)).filter(Boolean) }));
  }, [nhom, dong]);
  const thanh = useMemo(() => thanhGio(dong, khoang, moc, mo ? ph.gio : null), [dong, khoang, moc, mo, ph.gio]);

  const loiMap = useMemo(() => {
    const m = new Map();
    for (const d of dong) if (coGio(d.gio)) m.set(d.id, loiGio({ id: d.id, gio: d.gio }, dong, khoang, moc));
    return m;
  }, [dong, khoang, moc]);
  const soTrung = useMemo(() => [...loiMap.values()].filter((l) => l.length).length, [loiMap]);
  const dongMa = useCallback((id) => dong.find((x) => x.id === id)?.ma || '', [dong]);

  // Danh sách trong ngày: bé có giờ, mã khác có giờ và khoảng người khác, theo thứ tự ngày làm việc; đoạn trống từ 5 phút.
  const dsNgay = useMemo(() => {
    const a = [];
    for (const d of dong) if (coGio(d.gio)) a.push({ t: thuTu(d.gio, moc), c: thuTu(d.gio, moc), d });
    for (const k of khoang) if (khoangHopLe(k, moc)) a.push({ t: thuTu(k.tu, moc), c: thuTu(k.den, moc), k });
    a.sort((x, y) => x.t - y.t || (x.k ? 0 : 1) - (y.k ? 0 : 1) || x.c - y.c);
    const ra = [];
    let cuoi = null;
    for (const o of a) {
      if (cuoi !== null && o.t - cuoi - 1 >= 5) ra.push({ trong: gioKhoangChu(cuoi + 1) + '–' + gioKhoangChu(o.t - 1), key: 'tr' + o.t });
      cuoi = cuoi === null ? o.c : Math.max(cuoi, o.c);
      ra.push(o);
    }
    return ra;
  }, [dong, khoang, moc]);

  // Dòng bảng đang mở bị xoá ở máy khác / hoàn tác: đóng bảng, không giữ chữ cũ
  const dangMo = bang?.kieu === 'be' ? dong.find((d) => d.id === bang.id) : bang?.id ? khoang.find((k) => k.id === bang.id) : null;
  useEffect(() => { if (bang && bang.id && !dangMo) setBang(null); }, [bang, dangMo]);

  const veDau = () => { if (wide) window.scrollTo({ top: 0 }); else if (goc.current) goc.current.scrollTop = 0; };
  const xemTrung = () => {
    const e = goc.current?.querySelector('.g-dong.trung');
    if (e) { e.scrollIntoView({ block: 'center' }); e.focus({ preventScroll: true }); }
  };

  return (
    <main ref={goc} className={(wide ? 'pc-main' : 'ph-main') + ' gio'} aria-label="Giờ nhập máy">
      <ThanhGioView t={thanh} dong={dong} khoang={khoang} />
      {soTrung > 0 && (
        <button type="button" className="g-bao do" onClick={xemTrung}>
          <span>{soTrung} bé đang trùng giờ</span><b>Xem</b>
        </button>
      )}
      <ChonGioNhanh q={q} datQ={datQ} ph={ph} chonIds={chonIds} thieuIds={thieuIds} dong={dong} khoang={khoang} nhom={nhomChip} ngoai={ngoai}
        moc={moc} homNay={homNay} mo={mo} onXong={veDau} />
      <div className="g-tieu g-trong-ngay">
        <h2>Trong ngày</h2>
        <button type="button" className="btn" aria-label="Thêm giờ người khác dùng, khoảng giờ hoặc giờ lẻ" onClick={() => setBang({ kieu: 'khoang', id: null })}>
          <PlusIcon size={16} />Thêm giờ người khác
        </button>
      </div>
      {!dsNgay.length && <p className="g-rong">Chưa có giờ nào. Chọn giờ nhanh ở trên, hoặc bấm "Thêm giờ người khác" để ghi giờ đã có người dùng.</p>}
      <div className="g-ds">
        {dsNgay.map((o) => {
          if (o.trong) return <div key={o.key} className="g-trong">trống {o.trong}</div>;
          if (o.k) {
            const dung = dong.filter((d) => coGio(d.gio) && trongKhoang(d.gio, o.k, moc));
            return (
              <button key={o.k.id} type="button" className={'g-dong ban' + (dung.length ? ' trung' : '')} onClick={() => setBang({ kieu: 'khoang', id: o.k.id })}>
                <span className="g">{chuKhoang(o.k)}</span>
                <span className="m">
                  <b>{o.k.bs ? o.k.bs + ' dùng' : 'Người khác dùng'}</b>
                  {buocKhoang(o.k) > 1 && <small>Cách {buocKhoang(o.k)} phút · {phutKhoang(o.k, moc).length} giờ</small>}
                  {dung.length > 0 && <small className="x">Trùng với {dung.map(chuMa).join(', ')}</small>}
                </span>
              </button>
            );
          }
          const l = loiMap.get(o.d.id) || [];
          const phong = o.d.bang === 'gio_may' ? NGOAI_KHAM : tenPhong.get(o.d.id) || '';
          const kham = coGio(o.d.gioKham) ? 'khám ' + chuGio(o.d.gioKham) : '';
          return (
            <button key={o.d.id} type="button" className={'g-dong' + (l.length ? ' trung' : '')} onClick={() => setBang({ kieu: 'be', id: o.d.id })}>
              <span className="g">{chuGio(o.d.gio)}</span>
              <span className="m">
                <b>{chuMa(o.d)}</b>
                <small>{[phong, kham].filter(Boolean).join(' · ')}</small>
                {l.length > 0 && <small className="x">{l.map((e) => chuLoiNgan(e, dongMa)).join(', ')}</small>}
              </span>
            </button>
          );
        })}
        {/* mã khác chưa có giờ: vẫn phải có chỗ chạm để điền giờ hoặc xoá mã gõ nhầm */}
        {ngoai.filter((d) => !coGio(d.gio)).map((d) => (
          <button key={d.id} type="button" className="g-dong" onClick={() => setBang({ kieu: 'be', id: d.id })}>
            <span className="g">–</span>
            <span className="m"><b>{chuMa(d)}</b><small>{NGOAI_KHAM} · chưa có giờ</small></span>
          </button>
        ))}
      </div>

      {bang?.kieu === 'khoang' && (!bang.id || dangMo) && (
        <Sheet key={bang.id || 'moi'} label={bang.id ? 'Sửa khoảng giờ' : 'Giờ người khác dùng'} wide={wide} onClose={() => setBang(null)}>
          <SheetHead title={!bang.id ? 'Giờ người khác dùng' : dangMo && dangMo.tu === dangMo.den ? 'Sửa giờ lẻ' : 'Sửa khoảng giờ'} onClose={() => setBang(null)} />
          <BangKhoang khoangGoc={bang.id ? dangMo : null} dong={dong} khoang={khoang} moc={moc} homNay={homNay} />
        </Sheet>
      )}
      {bang?.kieu === 'be' && dangMo && (
        <Sheet key={bang.id} label={'Giờ của ' + chuMa(dangMo)} wide={wide} onClose={() => setBang(null)}>
          <SheetHead title={'Giờ của ' + chuMa(dangMo)} onClose={() => setBang(null)} />
          <BangBe d={dangMo} dong={dong} khoang={khoang} moc={moc} gioMay={gioMay} tenPhong={tenPhong.get(dangMo.id) || (dangMo.bang === 'gio_may' ? NGOAI_KHAM : '')}
            onXemKham={(id) => { setBang(null); onXemKham(id); }} />
        </Sheet>
      )}
    </main>
  );
}
