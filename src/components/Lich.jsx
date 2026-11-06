// Khung lịch dùng chung (v9.5, bảng 16c): ô ngày tròn 40px, vùng chạm cả ô cao 58px.
// Dùng cho lịch tab Việc (Tasks.jsx) và lịch tab Khám (LichKham, kèm chọn khoảng nhiều ngày + bảng tổng hợp nhiều ngày).
// Chỉ ĐỌC dữ liệu (useDaKhamThang, useBeKhoang); không ghi gì vào cơ sở dữ liệu.
import { useMemo, useState } from 'react';
import { taoOThang, chonKhoang, soNgayKhoang } from '../lib/lich.js';
import { tongHopNhieuNgay } from '../lib/tong-hop.js';
import { copyText } from '../lib/clinical.js';
import { fmtDM, parseIso } from '../lib/dates.js';
import { useBeKhoang, useDaKhamThang } from '../hooks.js';
import { useVietTat } from './VietTat.jsx';
import { Chevron, XIcon, Sheet, DongBtn, useDongSheet } from './ui.jsx';

export const monthOfIso = (iso) => { const d = parseIso(iso); return { y: d.getFullYear(), m: d.getMonth() }; };

/** "02/11" hoặc, khi hai ngày khác năm, "28/12/2026". */
const nhanNgay = (iso, kemNam) => fmtDM(iso) + (kemNam ? '/' + iso.slice(0, 4) : '');

const THU = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/**
 * Khung lịch tháng.
 * - month = { y, m } (m: 0..11), setMonth đổi tháng.
 * - chon: ngày đang chọn (tô xanh); khoang: { dau, cuoi } (dải xanh rất nhạt, hai đầu tròn nhạt).
 * - khoaTuongLai: ngày sau `today` chữ nhạt, không chạm được (lịch Khám).
 * - dem(iso) → { chu, loai: 'xanh' | 'sot' | 'be', aria } hoặc null: chữ nhỏ dưới vòng tròn.
 * - onClose: có thì hiện nút đóng ở đầu (dùng trong Sheet, đóng có chuyển động).
 * - children: phần dưới lưới (chú giải, nút…). inline: khung có viền, đặt thẳng trong trang (PC).
 */
export function KhungLich({ month, setMonth, today, chon = null, khoang = null, khoaTuongLai = false, onPick, dem, onClose, children, inline = false, label = 'Lịch', dau = null }) {
  const dongSheet = useDongSheet();
  const dong = onClose && (dongSheet ? () => dongSheet(onClose) : onClose);
  const { y, m } = month;
  const di = (delta) => { const d = new Date(y, m + delta, 1); setMonth({ y: d.getFullYear(), m: d.getMonth() }); };
  const lo = khoang?.dau && khoang?.cuoi ? (khoang.dau <= khoang.cuoi ? khoang.dau : khoang.cuoi) : khoang?.dau || null;
  const hi = khoang?.dau && khoang?.cuoi ? (khoang.dau <= khoang.cuoi ? khoang.cuoi : khoang.dau) : khoang?.dau || null;
  const o = taoOThang(y, m + 1).flat();
  const Goc = inline ? 'section' : 'div';
  return (
    <Goc className={'lich' + (inline ? ' lich-pc' : '')} aria-label={inline ? label : undefined}>
      {dau}
      <div className="lich-dau">
        <button type="button" className="lich-nut" aria-label="Tháng trước" onClick={() => di(-1)}><Chevron dir="left" size={18} /></button>
        <h2 className="lich-tieu-de">Tháng {m + 1}, {y}</h2>
        <button type="button" className="lich-nut" aria-label="Tháng sau" onClick={() => di(1)}><Chevron size={18} /></button>
        {dong && <button type="button" className="lich-nut" aria-label="Đóng lịch" onClick={dong}><XIcon /></button>}
      </div>
      <div className="lich-thu" aria-hidden="true">{THU.map((t) => <span key={t} className={t === 'CN' ? 'cn' : ''}>{t}</span>)}</div>
      <div className="lich-luoi">
        {o.map((c) => {
          if (!c.trongThang) return <span key={c.iso} className="lich-trong" aria-hidden="true" />;
          const xa = khoaTuongLai && c.iso > today;
          const d = dem?.(c.iso) || null;
          const laDau = lo && c.iso === lo, laCuoi = hi && c.iso === hi;
          const giua = lo && hi && lo < hi && c.iso > lo && c.iso < hi;
          const dai = lo && hi && lo < hi && (laDau || laCuoi || giua);
          const dangChon = chon === c.iso;
          const cls = ['lich-cell',
            c.laChuNhat ? 'cn' : '', c.iso === today ? 'nay' : '', dangChon ? 'chon' : '', xa ? 'xa' : '',
            laDau ? 'dau' : '', laCuoi ? 'cuoi' : '', giua ? 'giua' : '', dai ? 'co-dai' : ''].filter(Boolean).join(' ');
          const nhanAria = `Ngày ${c.ngay} tháng ${m + 1}` + (d?.aria || '') + (c.iso === today ? ', hôm nay' : '')
            + (laDau || laCuoi ? ', đầu hoặc cuối khoảng đã chọn' : '') + (giua ? ', trong khoảng đã chọn' : '');
          return (
            <button key={c.iso} type="button" className={cls} aria-label={nhanAria} aria-pressed={!!(dangChon || laDau || laCuoi || giua)}
              disabled={xa} onClick={() => onPick(c.iso)}>
              <span className="lich-dai" aria-hidden="true" />
              <span className="lich-o">{c.ngay}</span>
              <span className={'lich-dem ' + (d?.loai || '')}>{d?.chu || ''}</span>
            </button>
          );
        })}
      </div>
      {children}
    </Goc>
  );
}

/**
 * Lịch tab Khám (bảng 16e): nút gạt "Xem một ngày / Tổng hợp nhiều ngày"; số dưới ngày = số bé đã khám.
 * Xem một ngày: chạm ngày trước hôm nay → onXemNgay(iso); chạm hôm nay → onVeHomNay(). Ngày tương lai không chạm được.
 * Nhiều ngày: chạm ngày đầu rồi ngày cuối (chonKhoang), "Chọn lại", nút "Xem tổng hợp n ngày".
 */
export function LichKham({ today, dangXem, onXemNgay, onVeHomNay, onClose, wide = false }) {
  const dongSheet = useDongSheet();
  const dong = () => (dongSheet ? dongSheet(onClose) : onClose());
  const [month, setMonth] = useState(() => monthOfIso(dangXem || today));
  const [cheDo, setCheDo] = useState('mot'); // 'mot' | 'nhieu'
  const [khoang, setKhoang] = useState({ dau: null, cuoi: null });
  const [mo, setMo] = useState(false);
  const { daKham } = useDaKhamThang(month.y, month.m + 1);
  const du = !!(khoang.dau && khoang.cuoi);
  const data = useBeKhoang(khoang.dau, khoang.cuoi); // hai đầu null → rỗng, không truy vấn
  const soNgay = du ? soNgayKhoang(khoang.dau, khoang.cuoi) : 0;
  const kemNam = du && khoang.dau.slice(0, 4) !== khoang.cuoi.slice(0, 4);

  const chonNgay = (iso) => {
    if (iso > today) return;
    if (cheDo === 'mot') {
      if (iso === today) onVeHomNay(); else onXemNgay(iso);
      dong();
      return;
    }
    setKhoang((k) => chonKhoang(k, iso));
  };
  const dem = (iso) => {
    const n = daKham[iso] || 0;
    return n ? { chu: n + ' bé', loai: 'be', aria: `, ${n} bé đã khám` } : null;
  };
  const gat = (
    <div role="group" aria-label="Cách chọn ngày" className="seg full lich-gat">
      <button type="button" aria-pressed={cheDo === 'mot'} onClick={() => setCheDo('mot')}>Xem một ngày</button>
      <button type="button" aria-pressed={cheDo === 'nhieu'} onClick={() => setCheDo('nhieu')}>Tổng hợp nhiều ngày</button>
    </div>
  );
  return (
    <>
      <KhungLich month={month} setMonth={setMonth} today={today} khoaTuongLai onClose={onClose} onPick={chonNgay} dem={dem}
        chon={cheDo === 'mot' ? dangXem : null} khoang={cheDo === 'nhieu' ? khoang : null} dau={gat}>
        {cheDo === 'mot' ? (
          <p className="lich-ghi">Số dưới ngày là số bé đã khám. Chạm một ngày trước hôm nay để xem lại danh sách ngày đó.</p>
        ) : (
          <>
            <p className="lich-ghi">Số dưới ngày là số bé đã khám. Chạm ngày đầu rồi ngày cuối để chọn khoảng.</p>
            {khoang.dau && (
              <div className="lich-khoang">
                <span className="lich-khoang-chu">
                  {du ? (
                    <>
                      <b>{nhanNgay(khoang.dau, kemNam)} đến {nhanNgay(khoang.cuoi, kemNam)}</b>
                      <span>{soNgay} ngày{data.ready ? `, ${data.patients.length} lượt khám` : ''}</span>
                    </>
                  ) : (
                    <>
                      <b>Đã chọn {nhanNgay(khoang.dau)}</b>
                      <span>Chạm ngày cuối để chọn xong khoảng</span>
                    </>
                  )}
                </span>
                <button type="button" className="lich-lai" onClick={() => setKhoang({ dau: null, cuoi: null })}>Chọn lại</button>
              </div>
            )}
            <button type="button" className="btn primary big" disabled={!du || !data.ready} onClick={() => setMo(true)}>
              {du ? `Xem tổng hợp ${soNgay} ngày` : 'Xem tổng hợp'}
            </button>
          </>
        )}
      </KhungLich>
      {mo && du && <TongHopNhieu tu={khoang.dau} den={khoang.cuoi} data={data} wide={wide} onClose={() => setMo(false)} />}
    </>
  );
}

/**
 * Bảng tổng hợp nhiều ngày (bảng 16f). Văn bản sửa được; mỗi cách xếp ("Theo ngày" / "Theo mã giường") giữ bản sửa riêng:
 * đổi cách xếp không làm mất chữ đã sửa; "Soạn lại" chỉ làm lại cách đang xem. Tuổi tính theo ngày của từng dòng (tong-hop.js).
 */
function TongHopNhieu({ tu, den, data, wide, onClose }) {
  const [cach, setCach] = useState('ma'); // mặc định theo mã giường như canvas
  const [sua, setSua] = useState({ ngay: null, ma: null });
  const [msg, setMsg] = useState('');
  const goc = useMemo(() => {
    const lam = (cachXep) => tongHopNhieuNgay({ tuNgay: tu, denNgay: den, rooms: data.rooms, patients: data.patients, todosByPid: data.todosByPid, cachXep });
    return { ngay: lam('ngay'), ma: lam('ma') };
  }, [tu, den, data]);
  const kq = goc[cach];
  const text = sua[cach] ?? kq.text;
  const doiText = (x) => { setSua((s) => ({ ...s, [cach]: x })); setMsg(''); };
  const vt = useVietTat(text, doiText);
  const kemNam = tu.slice(0, 4) !== den.slice(0, 4);
  const copy = async () => {
    const ok = await copyText(text);
    setMsg(ok ? 'Đã sao chép' : 'Chưa sao chép được, hãy chọn hết nội dung trong khung rồi sao chép.');
  };
  return (
    <Sheet label="Tổng hợp nhiều ngày" className="sheet-nhieu" wide={wide} onClose={onClose}>
      <div className="nhieu-dau">
        <div className="grow">
          <h2 className="h2">Tổng hợp {nhanNgay(tu, kemNam)} đến {nhanNgay(den, kemNam)}</h2>
          <div className="muted small">{kq.soNgay} ngày, {kq.soLuot} lượt khám, {kq.soMaGiuong} mã giường</div>
        </div>
        <DongBtn className="icon-btn" aria-label="Đóng tổng hợp" onClose={onClose}><XIcon /></DongBtn>
      </div>
      <div role="group" aria-label="Cách xếp" className="seg full nhieu-gat">
        <button type="button" aria-pressed={cach === 'ngay'} onClick={() => { setCach('ngay'); setMsg(''); }}>Theo ngày</button>
        <button type="button" aria-pressed={cach === 'ma'} onClick={() => { setCach('ma'); setMsg(''); }}>Theo mã giường</button>
      </div>
      <label htmlFor="thn-text" className="muted small nhieu-nhan">Sửa được trước khi sao chép</label>
      {vt.strip}
      <textarea id="thn-text" className="input textarea mono nhieu-text" {...vt.props} />
      <div role="note" className="dai-canh-bao">Cùng mã giường ở các ngày khác nhau có thể là bé khác. App ghép theo phòng và mã, hãy kiểm tra trước khi gửi.</div>
      <div className="row8 wrap">
        <button type="button" className="btn primary big grow-ph" onClick={copy}>Sao chép</button>
        <button type="button" className="btn big" onClick={() => { setSua((s) => ({ ...s, [cach]: null })); setMsg(''); }}>Soạn lại</button>
        {msg && <span role="status" className="status">{msg}</span>}
      </div>
    </Sheet>
  );
}
