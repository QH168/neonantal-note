// Ô giờ nhập máy ở tab Khám (tab Giờ, đợt 3): dòng bé, chi tiết bé và chữ giờ ở thẻ 2 ngày.
// Luật tính nằm ở src/lib/gio.js (xuLyGoGio, noiDungCanhBao, loiGio); ghi chỉ qua datGioBe / hoanTacGioBe trong src/lib/actions.js.
// Dữ liệu để kiểm trùng (bé hôm nay, mã khác, khoảng người khác) do App.jsx truyền xuống bằng GioKhamProvider.
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { datGioBe, hoanTacGioBe } from '../lib/actions.js';
import { coGio, chuGio, loiGio, xuLyGoGio, noiDungCanhBao, chuLoiDai, CHUA_MA } from '../lib/gio.js';
import { useHoanTac } from './HoanTac.jsx';

const Ctx = createContext({ dong: [], khoang: [], moc: undefined, dongMa: () => '' });

/** dong = gioDl.dong ([{ id, ma, gio }]), khoang = gioDl.khoang, moc = mốc ngày làm việc (phút). */
export function GioKhamProvider({ dong, khoang, moc, children }) {
  const value = useMemo(() => {
    const ma = new Map(dong.map((d) => [d.id, d.ma || '']));
    return { dong, khoang, moc, dongMa: (id) => ma.get(id) || '' };
  }, [dong, khoang, moc]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useGioKham = () => useContext(Ctx);

/** Giờ của bé p đang trùng (bé khác, mã khác hoặc khoảng người khác)? Chưa có giờ thì không trùng. */
export function useGioTrung(p) {
  const c = useContext(Ctx);
  const g = coGio(p?.gioNhap) ? p.gioNhap : null;
  return useMemo(() => (g === null ? [] : loiGio({ id: p.id, gio: g }, c.dong, c.khoang, c.moc)), [g, p?.id, c.dong, c.khoang, c.moc]);
}

/** Đồng hồ có chuông (bản thử lần 6). */
export function GioIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="13.5" r="7.5" /><path d="M12 9.5v4l2.5 2M6.7 18.8 5 21M17.3 18.8 19 21M3 7.6A3.4 3.4 0 0 1 7.8 3.4M21 7.6a3.4 3.4 0 0 0-4.8-4.2" />
    </svg>
  );
}

const boiDen = (o) => { try { o.setSelectionRange(0, o.value.length); } catch { /* bỏ qua */ } };
const dung = (e) => e.stopPropagation();

/**
 * Hộp cảnh báo trùng giờ: Sửa lại (mặc định, Esc), Giữ giờ cũ / Bỏ, Vẫn lưu. Chưa chọn thì chưa lưu.
 * Vẽ vào <body> (nằm trên bảng chi tiết bé và thanh Hoàn tác); Esc và Tab chỉ chạy trong hộp.
 */
function HopCanhBao({ nd, onChon }) {
  const hop = useRef(null);
  const chonRef = useRef(onChon);
  chonRef.current = onChon;
  useEffect(() => {
    hop.current?.querySelector('[data-mac-dinh]')?.focus({ preventScroll: true });
    const k = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); chonRef.current('sua'); return; }
      if (e.key !== 'Tab') return;
      const nut = [...hop.current.querySelectorAll('button')];
      const i = nut.indexOf(document.activeElement);
      e.preventDefault();
      nut[(i + (e.shiftKey ? nut.length - 1 : 1)) % nut.length].focus();
    };
    document.addEventListener('keydown', k, true);
    return () => document.removeEventListener('keydown', k, true);
  }, []);
  // Hộp là con React của dòng bé: chặn chạm/nhấn lan lên dòng (vuốt, mở chi tiết)
  return createPortal(
    <div className="gk-lop" onPointerDown={dung} onClick={dung} onPointerUp={dung}>
      <div className="gk-nen" aria-hidden="true" />
      <div ref={hop} className="gk-hop" role="alertdialog" aria-modal="true" aria-labelledby="gk-tieu" aria-describedby="gk-mota">
        <h2 id="gk-tieu">{nd.tieuDe}</h2>
        <div id="gk-mota" className="gk-mota">
          {nd.lyDo.map((c, i) => <p key={i}>{c}</p>)}
          <p className="gk-ghi">Chưa lưu.</p>
        </div>
        <button type="button" className="gk-chinh" data-mac-dinh onClick={() => onChon('sua')}>Sửa lại</button>
        <button type="button" className="gk-vien" onClick={() => onChon('giu')}>{nd.nutGiu}</button>
        <button type="button" className="gk-vien do" onClick={() => onChon('luu')}>{nd.nutLuu}</button>
      </div>
    </div>,
    document.body
  );
}

/**
 * Ô giờ nhập máy của một bé. `to`: bản lớn trong chi tiết bé (có đồng hồ bên trái ô).
 * Lưu khi gõ đủ 4 số, Enter hoặc rời ô. Rỗng = xoá giờ. Sai = không lưu, báo cách gõ. Esc = trả giờ cũ.
 * Trùng thì hỏi trước (HopCanhBao). Mỗi lần lưu có thanh Hoàn tác. Chạm hoặc vuốt bắt đầu trên ô không lan ra dòng.
 */
export function OGioKham({ p, to = false }) {
  const c = useGioKham();
  const hoanTac = useHoanTac();
  const goc = coGio(p.gioNhap) ? p.gioNhap : null;
  const ma = (p.code || '').trim() || CHUA_MA;
  const [chu, setChu] = useState(chuGio(goc));
  const [hoi, setHoi] = useState(null);       // { v, loi } khi đang hỏi trùng
  const sua = useRef(false);                  // đang sửa dở: giữ chữ đang gõ, không bị giờ lưu đè
  const vuaVao = useRef(false);
  const o = useRef(null);
  const loi = useGioTrung(p);
  const trung = loi.length > 0;
  const daGo = useRef(false);                 // đã gõ chữ khác trong lần sửa này (chỉ vào ô thì chưa tính)
  // giờ đổi từ nơi khác (Hoàn tác, tab Giờ, bảng chi tiết): cập nhật chữ, trừ khi đang gõ dở chữ khác
  useEffect(() => { if (!sua.current || !daGo.current) setChu(chuGio(goc)); }, [goc]);
  // Dòng/bảng bị gỡ khi đang gõ dở (trình duyệt không gửi "blur" cho ô bị gỡ): lưu nốt nếu không trùng
  const chuRef = useRef(chu);
  chuRef.current = chu;
  const chotRef = useRef(null);
  useEffect(() => () => { if (sua.current && !chotRef.current.hoi) chotRef.current.chot(chuRef.current, true); }, []);

  const hien = () => { sua.current = false; daGo.current = false; setChu(chuGio(goc)); };
  const ghi = async (v, nhan) => {
    let r;
    try { r = await datGioBe(p.id, { gioNhap: v }); } catch { hien(); hoanTac.hien({ nhan: 'Chưa lưu được. Hãy thử lại.' }); return; }
    if (!r.ok) { hien(); hoanTac.hien({ nhan: 'Không lưu được, bé này không còn trong danh sách.' }); return; }
    hoanTac.hien({ nhan, lam: async () => ((await hoanTacGioBe(p.id, r.cu)).ok ? undefined : 'Không hoàn tác được.') });
  };
  const chot = (chuGoc, khongHoi = false) => {
    if (!sua.current) return;
    sua.current = false;
    if (!daGo.current) { hien(); return; } // chỉ vào ô rồi ra, chưa gõ gì: không ghi (giờ có thể vừa đổi từ nơi khác)
    daGo.current = false;
    const q = xuLyGoGio({ chu: chuGoc, goc, id: p.id, dong: c.dong, khoang: c.khoang, moc: c.moc });
    if (q.kieu === 'hoi' && khongHoi) return; // dòng/bảng bị gỡ lúc đang gõ dở mà trùng: chưa chọn thì chưa lưu
    if (q.kieu === 'giu') { hien(); return; }
    if (q.kieu === 'xoa') { setChu(''); ghi(null, 'Đã xoá giờ của ' + ma); return; }
    if (q.kieu === 'sai') { hien(); hoanTac.hien({ nhan: 'Giờ chưa đúng nên chưa lưu. Gõ 801 hoặc 08h01.' }); return; }
    if (q.kieu === 'luu') { setChu(chuGio(q.v)); ghi(q.v, 'Đã lưu ' + ma + ' - ' + chuGio(q.v)); return; }
    sua.current = true; daGo.current = true; // giữ chữ đang gõ trong lúc hỏi
    setHoi(q);
  };
  const chon = (k) => {
    const q = hoi;
    setHoi(null);
    if (!q) return;
    sua.current = false; daGo.current = false;
    if (k === 'luu') { setChu(chuGio(q.v)); ghi(q.v, 'Đã lưu ' + ma + ' - ' + chuGio(q.v) + ', đang trùng'); return; }
    if (k === 'sua') { sua.current = true; daGo.current = true; o.current?.focus(); return; } // giữ nguyên chữ đang gõ; khi rời ô mà chưa đổi gì vẫn hỏi lại đúng luật
    hien();
  };
  chotRef.current = { chot, hoi };
  const nd = hoi ? noiDungCanhBao({ ma, v: hoi.v, goc, loi: hoi.loi, dongMa: c.dongMa }) : null;
  const tieuDe = trung ? loi.map((e) => chuLoiDai(e, goc, c.dongMa)).join('. ') : undefined;

  return (
    <>
      <label className={'o-gio' + (to ? ' to' : '') + (goc === null ? ' trong' : '') + (trung ? ' trung' : '')} title={tieuDe}
        onPointerDown={dung} onPointerUp={dung} onClick={dung}>
        <GioIcon />
        <input ref={o} id={(to ? 'gk-ct-' : 'gk-') + p.id} type="text" inputMode="numeric" autoComplete="off" enterKeyHint="done" placeholder="" value={chu}
          aria-label={'Giờ nhập máy của ' + (p.code?.trim() || 'bé chưa có mã')} aria-invalid={trung || undefined}
          onChange={(e) => {
            const x = e.currentTarget.value;
            sua.current = true;
            daGo.current = true;
            setChu(x);
            if (/^\d{4}$/.test(x.trim())) e.currentTarget.blur(); // đủ 4 số: lưu ngay
          }}
          onFocus={(e) => { sua.current = true; vuaVao.current = true; boiDen(e.currentTarget); }}
          // Safari bỏ bôi đen khi nhấc tay: bôi lại ở cú click đầu sau khi vào ô
          // (chỉ khi chữ chưa đổi: gõ nhanh ngay sau khi chạm thì không bôi đen lại, khỏi mất chữ vừa gõ).
          // Nhấc tay lần đầu cũng không cho Safari bỏ bôi đen (preventDefault ở mouseup), nên không phải chờ hẹn giờ.
          onMouseUp={(e) => { if (vuaVao.current) e.preventDefault(); }}
          onClick={(e) => { if (vuaVao.current) { vuaVao.current = false; const x = e.currentTarget, v = x.value; setTimeout(() => { if (x.value === v) boiDen(x); }, 0); } }}
          onBlur={(e) => { vuaVao.current = false; chot(e.currentTarget.value); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
            else if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); sua.current = false; hien(); e.currentTarget.blur(); }
          }} />
      </label>
      {nd && <HopCanhBao nd={nd} onChon={chon} />}
    </>
  );
}

/** Chữ giờ (không phải ô) ở thẻ 2 ngày: "08h01"; trùng thì chữ đỏ. Chưa có giờ thì không vẽ gì. */
export function ChuGioKham({ p }) {
  const loi = useGioTrung(p);
  if (!coGio(p?.gioNhap)) return null;
  return (
    <span className={'hn-gio' + (loi.length ? ' trung' : '')}>
      <span className="sr-only">Giờ nhập máy </span>{chuGio(p.gioNhap)}{loi.length > 0 && <span className="sr-only">, đang trùng giờ</span>}
    </span>
  );
}
