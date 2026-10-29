// Biểu tượng và các phần giao diện dùng chung.
import { useEffect, useRef, useState } from 'react';
import { TAG_COLOR } from '../lib/viec.js';

const S = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const Sun = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" strokeWidth="1.7" {...S}><circle cx="10" cy="10" r="3.4" /><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" /></svg>
);
export const Moon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" strokeWidth="1.7" {...S}><path d="M16.5 11.8A6.8 6.8 0 0 1 8.2 3.5a6.8 6.8 0 1 0 8.3 8.3z" /></svg>
);
export const CalIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" strokeWidth="1.7" {...S}><rect x="3" y="4.5" width="14" height="12.5" rx="2" /><path d="M3 8.5h14M7 3v3M13 3v3" /></svg>
);
export const CloudIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" strokeWidth="1.7" {...S}><path d="M6 15.5H5.2a3.2 3.2 0 0 1-.4-6.4A4.8 4.8 0 0 1 14.2 8a3.8 3.8 0 0 1 .8 7.5H14" /><path d="M10 17V10.5M7.6 12.8 10 10.4l2.4 2.4" /></svg>
);
export const PencilIcon = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" strokeWidth="1.6" {...S}><path d="M11.5 3.5l3 3-8 8H3.5v-3z" /></svg>
);
export const Chevron = ({ dir = 'right', size = 16, style }) => {
  const d = { right: 'M6 3.5l4.5 4.5L6 12.5', down: 'M4 6l4 4 4-4', left: 'M10 3.5L5.5 8l4.5 4.5' }[dir];
  return <svg width={size} height={size} viewBox="0 0 16 16" strokeWidth="2" style={style} {...S}><path d={d} /></svg>;
};
export const XIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" strokeWidth="1.8" {...S}><path d="M4.5 4.5l9 9M13.5 4.5l-9 9" /></svg>
);
export const TrashIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 22 22" strokeWidth="1.8" {...S}><path d="M4 6h14M9 6V4h4v2M6 6l1 12h8l1-12M9.5 9.5v5.5M12.5 9.5v5.5" /></svg>
);
const Tick = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" strokeWidth="2.3" {...S}><path d="M3 8.5l3.2 3.2L13 4.8" /></svg>
);

/** Ô vuông đánh dấu (vùng chạm 44–48px). */
export function CheckBtn({ done, label, onClick, small }) {
  return (
    <button type="button" className={'chk' + (small ? ' small' : '')} aria-pressed={done} aria-label={label} onClick={onClick}>
      <span className={'box' + (done ? ' on' : '')}><Tick size={small ? 14 : 16} /></span>
    </button>
  );
}

export const PRI_NAME = { 1: 'đỏ', 2: 'vàng', 3: 'xanh lá', 4: 'xanh dương', 5: 'NV' };
export const PRI_LEVELS = [1, 2, 3, 4, 5];
/** Chữ hiện trên nút/huy hiệu: số 1–4, riêng mức 5 ghi "NV". */
export const priLabel = (n) => (n === 5 ? 'NV' : String(n));

/** Vòng tròn số mức khẩn cấp. */
export function PriDot({ n, faded }) {
  return <span className={'pri' + (n === 5 ? ' nv' : '')} style={{ background: `var(--p${n})`, color: `var(--p${n}i)`, opacity: faded ? 0.45 : 1 }}>{priLabel(n)}</span>;
}

/** Chấm tròn chữ nhãn loại việc (NV/BM/CK/HC/XN). Màu lấy từ --p1…--p5 (có cả bản sáng/tối). */
export function TagDot({ tag, faded, className = '' }) {
  const n = TAG_COLOR[tag] || 1;
  return <span className={'tag-dot ' + className} style={{ background: `var(--p${n})`, color: `var(--p${n}i)`, opacity: faded ? 0.45 : 1 }}>{tag}</span>;
}

// ----- Vuốt trái để xoá, kiểu C (dùng chung cho dòng việc, việc cần làm của bé, thư viện viết tắt) -----
const NGUONG = 40;    // vuốt quá ngần này mới "gài" / mới trả về
let dangMo = null;    // hàm đóng của dòng đang gài: chỉ một dòng cùng lúc

/**
 * Dòng vuốt-để-xoá. Thẻ KHÔNG trượt.
 * Cảm ứng: vuốt trái ≥40px → dòng sang trạng thái "đang xoá" (viền đỏ, phần cuối dòng đổi thành nút đỏ "Xoá" nằm trong thẻ);
 * vuốt phải, chạm chỗ khác hoặc mở dòng khác → trở lại. Chạm nút mới xoá.
 * Chuột (PC): rê vào dòng thì hiện nút "Xoá" viền đỏ cạnh nhãn. Nút luôn có trong thứ tự Tab.
 * `label` là tên (để đọc "Xoá <kind>: <tên>"). `className` áp cho thân dòng.
 * Phần cuối dòng muốn bị thay bằng nút khi đang xoá (cụm nhãn, chấm mức) thì gắn thêm class `swipe-tail`.
 */
export function SwipeRow({ label, onDelete, className = '', kind = 'việc', children }) {
  const ref = useRef(null);
  const st = useRef(null);
  const vuaVuot = useRef(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const dong = () => setOpen(false);
    if (dangMo && dangMo !== dong) dangMo();
    dangMo = dong;
    const ngoai = (e) => { if (ref.current && !ref.current.contains(e.target)) dong(); };
    document.addEventListener('pointerdown', ngoai);
    return () => { document.removeEventListener('pointerdown', ngoai); if (dangMo === dong) dangMo = null; };
  }, [open]);

  const down = (e) => {
    if (e.pointerType === 'mouse' || !e.isPrimary) return; // PC dùng nút "Xoá" khi rê chuột, không rê-kéo
    st.current = { x: e.clientX, y: e.clientY, on: false };
  };
  const move = (e) => {
    const s = st.current;
    if (!s || s.on) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return; // chưa rõ là vuốt ngang
    s.on = true;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* bỏ qua */ }
  };
  const up = (e) => {
    const s = st.current;
    st.current = null;
    if (!s || !s.on) return;
    const dx = e.clientX - s.x;
    if (!open && dx <= -NGUONG) setOpen(true);
    else if (open && dx >= NGUONG) setOpen(false);
    vuaVuot.current = true; // chặn cú "click" ngay sau khi vuốt
    setTimeout(() => { vuaVuot.current = false; }, 400);
  };
  const huy = () => { st.current = null; };
  const bam = (e) => {
    if (e.target.closest?.('.swipe-del')) return; // chạm nút xoá: để nút làm việc của nó
    if (vuaVuot.current) { e.stopPropagation(); return; }
    if (open) { e.stopPropagation(); setOpen(false); } // chạm vào dòng đang xoá: chỉ trả về
  };

  return (
    <div ref={ref} className={'swipe' + (open ? ' armed' : '')}>
      <div className={'swipe-body ' + className}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={huy} onClickCapture={bam}>
        {children}
        <button type="button" className="swipe-del" aria-label={`Xoá ${kind}: ${label}`} onClick={() => { setOpen(false); onDelete(); }}>
          <span className="swipe-del-face"><TrashIcon size={18} /><span className="swipe-del-t">Xoá</span></span>
        </button>
      </div>
    </div>
  );
}

/**
 * Bảng trượt lên (iPhone) / hộp giữa màn hình (PC).
 * Khi bàn phím iPhone hiện (visualViewport thấp hơn cửa sổ) thì khung bảng co theo phần màn hình còn thấy,
 * nên bảng nằm trên bàn phím.
 */
export function Sheet({ label, onClose, children, wide, className = '' }) {
  const wrap = useRef(null);
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [onClose]);
  useEffect(() => {
    const vv = window.visualViewport;
    const el = wrap.current;
    if (!vv || !el) return undefined;
    const khop = () => {
      const bp = window.innerHeight - vv.height - vv.offsetTop;
      if (vv.scale <= 1.01 && (bp > 80 || vv.offsetTop > 0)) {
        el.classList.add('kb');
        el.style.top = vv.offsetTop + 'px';
        el.style.bottom = 'auto';
        el.style.height = vv.height + 'px';
      } else {
        el.classList.remove('kb');
        el.style.top = ''; el.style.bottom = ''; el.style.height = '';
      }
    };
    khop();
    vv.addEventListener('resize', khop);
    vv.addEventListener('scroll', khop);
    return () => { vv.removeEventListener('resize', khop); vv.removeEventListener('scroll', khop); };
  }, []);
  return (
    <div ref={wrap} className={'sheet-wrap' + (wide ? ' center' : '')}>
      <button type="button" className="sheet-backdrop" aria-label={'Đóng ' + label.toLowerCase()} onClick={onClose} />
      <section className={'sheet' + (className ? ' ' + className : '')} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </section>
    </div>
  );
}

export function SheetHead({ title, onClose, closeLabel }) {
  return (
    <div className="row-between">
      <h2 className="h2">{title}</h2>
      <button type="button" className="icon-btn" aria-label={closeLabel || 'Đóng'} onClick={onClose}><XIcon /></button>
    </div>
  );
}
