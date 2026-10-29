// Biểu tượng và các phần giao diện dùng chung.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

// ----- Vuốt trái để xoá (dùng chung cho dòng việc, việc cần làm của bé, thư viện viết tắt) -----
const KEO_DAY = 56;   // kéo tới đây thì nút lộ đủ (p = 1)
const KEO_MAX = 72;   // kéo tối đa
const THOI_GIAN_XOA = 260;
let dangMo = null;    // hàm đóng của dòng đang mở: chỉ một dòng cùng lúc

const giamChuyenDong = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Dòng vuốt-để-xoá. Thẻ KHÔNG trượt; khi vuốt trái, tiến độ p (0..1) chạy theo ngón tay:
 * nút thùng rác (chỉ biểu tượng, viền đỏ) lộ dần từ phải sang trái, nhãn mờ dần, viền thẻ đỏ dần.
 * p được ghi thẳng vào biến CSS `--p` của phần tử (không setState mỗi lần kéo, nên không vẽ lại danh sách).
 * Thả quá nửa thì mở hẳn, chưa tới thì trả về. Chạm nút (chỉ khi đã mở) → dòng thu gọn rồi mới xoá.
 * Chuột (PC): rê vào dòng thì nút hiện đầy đủ, không cần kéo. Nút luôn có trong thứ tự Tab.
 * `label` là tên (để đọc "Xoá <kind>: <tên>"). `className` áp cho thân dòng.
 * Phần cuối dòng muốn mờ đi khi nút hiện (cụm nhãn, chấm mức) thì gắn thêm class `swipe-tail`.
 */
export function SwipeRow({ label, onDelete, className = '', kind = 'việc', children }) {
  const ref = useRef(null);
  const st = useRef(null);
  const vuaVuot = useRef(false);
  const daKeo = useRef(false);     // cú chạm hiện tại là cú kéo
  const nhanTrenNut = useRef(false);
  const xoaSt = useRef({ dang: false, goi: false, timer: null });
  const xoaRef = useRef(onDelete);
  xoaRef.current = onDelete;
  const [open, setOpen] = useState(false);
  const datP = (p) => { ref.current?.style.setProperty('--p', String(p)); };

  useEffect(() => { datP(open ? 1 : 0); }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const dong = () => setOpen(false);
    if (dangMo && dangMo !== dong) dangMo();
    dangMo = dong;
    const ngoai = (e) => { if (ref.current && !ref.current.contains(e.target)) dong(); };
    document.addEventListener('pointerdown', ngoai);
    return () => { document.removeEventListener('pointerdown', ngoai); if (dangMo === dong) dangMo = null; };
  }, [open]);

  // Gỡ giữa chừng lúc đang thu gọn thì vẫn xoá (không mất thao tác).
  useEffect(() => () => {
    const x = xoaSt.current;
    clearTimeout(x.timer);
    if (x.dang && !x.goi) { x.goi = true; xoaRef.current(); }
  }, []);

  const down = (e) => {
    if (e.pointerType === 'mouse' || !e.isPrimary) return; // PC dùng nút khi rê chuột, không rê-kéo
    daKeo.current = false;
    st.current = { x: e.clientX, y: e.clientY, on: false, d0: open ? KEO_DAY : 0, d: open ? KEO_DAY : 0 };
  };
  const move = (e) => {
    const s = st.current;
    if (!s) return;
    if (!s.on) {
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return; // chưa rõ là vuốt ngang
      s.on = true;
      s.x = e.clientX; // tính độ kéo từ lúc nhận ra là vuốt ngang để nút không nhảy
      daKeo.current = true;
      ref.current?.classList.add('drag');
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* bỏ qua */ }
      return;
    }
    s.d = Math.max(0, Math.min(KEO_MAX, s.d0 - (e.clientX - s.x)));
    datP(Math.min(1, s.d / KEO_DAY));
  };
  const up = () => {
    const s = st.current;
    st.current = null;
    if (!s || !s.on) return;
    ref.current?.classList.remove('drag');
    const mo = s.d / KEO_DAY > 0.5;
    datP(mo ? 1 : 0);
    setOpen(mo);
    vuaVuot.current = true; // chặn cú "click" ngay sau khi vuốt
    setTimeout(() => { vuaVuot.current = false; }, 400);
  };
  const huy = () => {
    const s = st.current;
    st.current = null;
    if (s?.on) { ref.current?.classList.remove('drag'); datP(open ? 1 : 0); }
  };
  const bam = (e) => {
    if (e.target.closest?.('.swipe-del')) return; // chạm nút xoá: để nút làm việc của nó
    if (vuaVuot.current) { e.stopPropagation(); return; }
    if (open) { e.stopPropagation(); setOpen(false); } // chạm vào dòng đang mở: chỉ trả về
  };

  const xoa = () => {
    const x = xoaSt.current;
    if (x.dang) return; // không xoá hai lần
    x.dang = true;
    const xong = () => { if (x.goi) return; x.goi = true; clearTimeout(x.timer); xoaRef.current(); };
    const el = ref.current;
    if (!el || giamChuyenDong()) { xong(); return; }
    // thu chiều cao về 0 + mờ, rồi mới gọi hàm xoá
    const gap = parseFloat(getComputedStyle(el.parentElement || el).rowGap) || 0;
    el.style.height = el.offsetHeight + 'px';
    el.style.overflow = 'hidden';
    void el.offsetHeight; // chốt chiều cao trước khi chạy chuyển tiếp
    el.style.transition = `height ${THOI_GIAN_XOA}ms ease, opacity 200ms ease, margin-bottom ${THOI_GIAN_XOA}ms ease`;
    el.style.height = '0px';
    el.style.opacity = '0';
    if (gap) el.style.marginBottom = -gap + 'px';
    x.timer = setTimeout(xong, THOI_GIAN_XOA);
  };
  // Cảm ứng: xử lý ở pointerup để chạm nhanh sau cú vuốt vẫn ăn (trình duyệt có thể không sinh click). Chuột/bàn phím dùng click.
  const nutXuong = () => { nhanTrenNut.current = true; };
  const nutLen = (e) => {
    const ok = nhanTrenNut.current;
    nhanTrenNut.current = false;
    if (!ok || e.pointerType === 'mouse' || daKeo.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) xoa();
  };
  const ten = `Xoá ${kind}: ${label}`;

  return (
    <div ref={ref} className={'swipe' + (open ? ' armed' : '')}>
      <div className={'swipe-body ' + className}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={huy} onClickCapture={bam}>
        {children}
        <button type="button" className="swipe-del" aria-label={ten} title={ten}
          onPointerDown={nutXuong} onPointerUp={nutLen} onClick={xoa}>
          <TrashIcon size={20} />
        </button>
      </div>
    </div>
  );
}

// ----- Bảng trượt lên / hộp giữa -----
const SheetCtx = createContext(null);
/** Trong một Sheet: trả về hàm đóng CÓ chuyển động `dong(fn?)` (chạy xong mới gọi fn, mặc định onClose của Sheet). Ngoài Sheet: null. */
export const useDongSheet = () => useContext(SheetCtx);
const THOI_GIAN_DONG = 360; // bảng 220ms; nền mờ tắt trễ 120ms + 220ms = 340ms

/**
 * Bảng trượt lên (iPhone) / hộp giữa màn hình (PC).
 * Mở: nền mờ dần rồi bảng trượt lên. Đóng (Esc, chạm nền, nút Đóng trong bảng): bảng trượt xuống, nền tắt dần,
 * xong mới gọi onClose (bảng chỉ bị gỡ khỏi trang sau chuyển động).
 * Khi bàn phím iPhone hiện (visualViewport thấp hơn cửa sổ) thì khung bảng co theo phần màn hình còn thấy,
 * nên bảng nằm trên bàn phím.
 */
export function Sheet({ label, onClose, children, wide, className = '' }) {
  const wrap = useRef(null);
  const [ra, setRa] = useState(false);
  const c = useRef({ ra: false, goi: true, fn: null, timer: null, onClose });
  c.current.onClose = onClose;
  const dong = useCallback((fn) => {
    const k = c.current;
    if (k.ra) return;
    k.ra = true; k.goi = false; k.fn = typeof fn === 'function' ? fn : null;
    const xong = () => { if (k.goi) return; k.goi = true; clearTimeout(k.timer); (k.fn || k.onClose)(); };
    if (giamChuyenDong()) { xong(); return; }
    setRa(true);
    k.timer = setTimeout(xong, THOI_GIAN_DONG);
  }, []);
  useEffect(() => () => { // gỡ giữa chừng khi đang đóng: vẫn báo cho nơi gọi
    const k = c.current;
    clearTimeout(k.timer);
    if (k.ra && !k.goi) { k.goi = true; (k.fn || k.onClose)(); }
  }, []);
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && dong();
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [dong]);
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
  // Vẽ thẳng vào <body>: trên Safari iPhone, bảng nằm trong vùng cuộn sẽ bị phần đầu/thanh dưới che.
  return createPortal(
    <SheetCtx.Provider value={dong}>
      <div ref={wrap} className={'sheet-wrap' + (wide ? ' center' : ' sheet-ph') + (ra ? ' out' : '')}>
        <button type="button" className="sheet-backdrop" aria-label={'Đóng ' + label.toLowerCase()} onClick={() => dong()} />
        <section className={'sheet' + (className ? ' ' + className : '')} role="dialog" aria-modal="true" aria-label={label}>
          {children}
        </section>
      </div>
    </SheetCtx.Provider>,
    document.body
  );
}

/** Nút đóng bảng có chuyển động (dùng trong nội dung Sheet do nơi khác dựng). */
export function DongBtn({ onClose, children, ...rest }) {
  const dong = useDongSheet();
  return <button type="button" {...rest} onClick={() => (dong ? dong(onClose) : onClose())}>{children}</button>;
}

export function SheetHead({ title, onClose, closeLabel }) {
  return (
    <div className="row-between">
      <h2 className="h2">{title}</h2>
      <DongBtn className="icon-btn" aria-label={closeLabel || 'Đóng'} onClose={onClose}><XIcon /></DongBtn>
    </div>
  );
}
