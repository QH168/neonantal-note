// Biểu tượng và các phần giao diện dùng chung.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TAGS } from '../lib/viec.js';
import { huongCuChi, doDich, quaMoc, nenHien, ketQuaKhiTha } from '../lib/vuot.js';

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

/** Ô vuông đánh dấu (vùng chạm 44–48px). Còn dùng cho dòng bé ở tab Khám tới đợt 9.4. */
export function CheckBtn({ done, label, onClick, small }) {
  return (
    <button type="button" className={'chk' + (small ? ' small' : '')} aria-pressed={done} aria-label={label} onClick={onClick}>
      <span className={'box' + (done ? ' on' : '')}><Tick size={small ? 14 : 16} /></span>
    </button>
  );
}

/** Tích xanh tròn 26px cuối dòng việc đã xong. Chỉ để hiển thị, không bấm được. */
export function TickOk() {
  return <span className="tick-ok" role="img" aria-label="Đã xong"><Tick size={14} /></span>;
}

/** Dòng trạng thái trong chi tiết việc: "Chưa xong" + "Hoàn thành", hoặc "Đã xong lúc hh:mm" + "Bỏ đánh dấu xong". */
export function TrangThaiXong({ xong, gio, onDanhDau, onBo }) {
  return (
    <div className="trang-thai">
      <span className="trang-thai-chu" aria-live="polite">{xong ? (gio ? `Đã xong lúc ${gio}` : 'Đã xong') : 'Chưa xong'}</span>
      {xong
        ? <button type="button" className="nut-trang-thai bo" onClick={onBo}>Bỏ đánh dấu xong</button>
        : <button type="button" className="nut-trang-thai" onClick={onDanhDau}>Hoàn thành</button>}
    </div>
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

/** Màu nhãn loại việc (bảng 16a): nền nhạt `--tXX`, chữ đậm cùng tông `--tXXi`; có cả bản sáng và tối. Nhãn lạ dùng màu NV. */
export const mauNhan = (tag) => {
  const k = TAGS.includes(tag) ? tag : 'NV';
  return { '--tb': `var(--t${k})`, '--ti': `var(--t${k}i)` };
};

/** Huy hiệu tròn chữ nhãn loại việc (NV/BM/CK/HC/XN). Việc đã xong: mờ ~0,5. */
export function TagDot({ tag, faded, className = '' }) {
  return <span className={'tag-dot ' + className} style={{ ...mauNhan(tag), opacity: faded ? 0.5 : 1 }}>{tag}</span>;
}

// ----- Dòng vuốt (v9.2): vuốt phải = xong, vuốt trái = xoá; mốc 1/3 chiều rộng -----
const THOI_GIAN_XOA = 260;

const giamChuyenDong = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Dòng vuốt. Dòng trượt theo ngón tay; phía sau lộ nền xanh nhạt (vuốt phải) hoặc đỏ phấn (vuốt trái), không chữ, không biểu tượng.
 * Qua mốc 1/3 chiều rộng: nền đậm một nấc, rung nhẹ nếu máy có `navigator.vibrate`. Thả qua mốc: phải → onDone(), trái → xoá;
 * thả trước mốc: trượt về. Mọi con số do src/lib/vuot.js tính; ở đây chỉ nối vào ngón tay.
 * Khi kéo chỉ ghi biến CSS/thuộc tính data lên phần tử (không setState mỗi lần kéo, nên không vẽ lại danh sách).
 *  - onDone: có thì cho vuốt phải (thư viện viết tắt không truyền). daXong: dòng đã xong chỉ nhúc nhích rồi về.
 *  - onDelete: gọi SAU khi dòng đã thu lại (một lần duy nhất; gỡ dòng giữa chừng vẫn gọi).
 * Chuột (PC): không rê-kéo; rê vào dòng thì hiện nút thùng rác cạnh nhãn, Tab vào nút cũng hiện.
 * `label` là tên (để đọc "Xoá <kind>: <tên>"). `className` áp cho thân dòng.
 */
export function SwipeRow({ label, onDelete, onDone, daXong = false, className = '', kind = 'việc', children }) {
  const ref = useRef(null);
  const thanRef = useRef(null);
  const st = useRef(null);
  const vuaVuot = useRef(false);
  const hetVuot = useRef(null);
  const xoaSt = useRef({ dang: false, goi: false, timer: null });
  const xoaRef = useRef(onDelete);
  xoaRef.current = onDelete;
  const xongRef = useRef(onDone);
  xongRef.current = onDone;
  const opts = { duocPhai: !!onDone, daXong };
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const dat = (px, nen, qua, hien) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--dx', px + 'px');
    if (nen) el.dataset.nen = nen; // giữ nền cũ khi thả để nó mờ dần đúng màu
    if (qua !== null) el.dataset.qua = qua ? '1' : '0';
    el.dataset.hien = hien ? '1' : '0';
  };

  useEffect(() => () => {
    clearTimeout(hetVuot.current);
    // Gỡ giữa chừng lúc đang thu lại thì vẫn xoá (không mất thao tác).
    const x = xoaSt.current;
    clearTimeout(x.timer);
    if (x.dang && !x.goi) { x.goi = true; xoaRef.current(); }
  }, []);

  const down = (e) => {
    if (e.pointerType === 'mouse' || !e.isPrimary || xoaSt.current.dang) return; // PC dùng nút khi rê chuột, không rê-kéo
    st.current = { id: e.pointerId, x: e.clientX, y: e.clientY, on: false, rong: 0, dx: 0, qua: false };
  };
  const move = (e) => {
    const s = st.current;
    if (!s || e.pointerId !== s.id) return;
    const dx = e.clientX - s.x;
    if (!s.on) {
      const h = huongCuChi(dx, e.clientY - s.y);
      if (h === 'chua') return;
      if (h === 'doc') { st.current = null; return; } // cuộn dọc: bỏ cử chỉ
      s.on = true;
      s.rong = ref.current ? ref.current.getBoundingClientRect().width : 0;
      ref.current.dataset.keo = '1';
      ref.current.dataset.qua = '0';
      try { thanRef.current?.setPointerCapture(e.pointerId); } catch { /* bỏ qua */ }
    }
    s.dx = dx;
    const o = optsRef.current;
    const qua = quaMoc(dx, s.rong, o);
    if (qua && !s.qua) { try { navigator.vibrate?.(12); } catch { /* máy không rung */ } }
    s.qua = qua;
    const nen = nenHien(dx, o);
    dat(giamChuyenDong() ? 0 : doDich(dx, s.rong, o), nen, qua, !!nen);
  };
  const traVe = () => dat(0, null, null, false);
  const up = () => {
    const s = st.current;
    st.current = null;
    if (!s || !s.on) return;
    delete ref.current.dataset.keo;
    vuaVuot.current = true; // chặn cú "click" ngay sau khi vuốt (khỏi tính thành chạm 2 lần)
    clearTimeout(hetVuot.current);
    hetVuot.current = setTimeout(() => { vuaVuot.current = false; }, 400);
    const kq = ketQuaKhiTha(s.dx, s.rong, optsRef.current);
    if (kq === 'xoa') { xoa(); return; }
    traVe();
    if (kq === 'xong') xongRef.current?.();
  };
  const huy = () => { // trình duyệt giành cú chạm (cuộn dọc…): trả dòng về, không đổi gì
    const s = st.current;
    st.current = null;
    if (s?.on) { delete ref.current.dataset.keo; traVe(); }
  };
  const bam = (e) => {
    if (e.target.closest?.('.swipe-del')) return; // chạm nút xoá: để nút làm việc của nó
    if (vuaVuot.current) { e.stopPropagation(); e.preventDefault(); }
  };

  function xoa() {
    const x = xoaSt.current;
    if (x.dang) return; // không xoá hai lần
    x.dang = true;
    const xong = () => { if (x.goi) return; x.goi = true; clearTimeout(x.timer); xoaRef.current(); };
    const el = ref.current;
    if (!el || giamChuyenDong()) { xong(); return; }
    // dòng trượt hết ra trái, thu chiều cao về 0 + mờ, rồi mới gọi hàm xoá
    dat(-el.getBoundingClientRect().width, 'xoa', null, true);
    const gap = parseFloat(getComputedStyle(el.parentElement || el).rowGap) || 0;
    el.style.height = el.offsetHeight + 'px';
    void el.offsetHeight; // chốt chiều cao trước khi chạy chuyển tiếp
    el.style.transition = `height ${THOI_GIAN_XOA}ms ease, opacity 200ms ease, margin-bottom ${THOI_GIAN_XOA}ms ease`;
    el.style.height = '0px';
    el.style.opacity = '0';
    if (gap) el.style.marginBottom = -gap + 'px';
    x.timer = setTimeout(xong, THOI_GIAN_XOA);
  }
  const ten = `Xoá ${kind}: ${label}`;

  return (
    <div ref={ref} className="swipe">
      <div className="swipe-bg" aria-hidden="true" />
      <div ref={thanRef} className={'swipe-body ' + className}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={huy} onClickCapture={bam}>
        {children}
        <button type="button" className="swipe-del" aria-label={ten} title={ten} onClick={xoa}>
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

// Bảng chồng bảng: chỉ bảng trên cùng nhận phím Esc; khoá cuộn trang đếm theo số bảng đang mở.
const chongSheet = [];
let khoaDem = 0;
let khoaTruoc = '';
const khoaCuon = () => {
  if (khoaDem++ === 0) { khoaTruoc = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
  return () => { if (--khoaDem === 0) document.body.style.overflow = khoaTruoc; };
};

/**
 * Bảng trượt lên (iPhone) / hộp giữa màn hình (PC).
 * Mở: nền mờ dần rồi bảng trượt lên. Đóng (Esc, chạm nền, nút Đóng trong bảng): bảng trượt xuống, nền tắt dần,
 * xong mới gọi onClose (bảng chỉ bị gỡ khỏi trang sau chuyển động).
 * Khi bàn phím iPhone hiện (visualViewport thấp hơn cửa sổ) thì khung bảng co theo phần màn hình còn thấy,
 * nên bảng nằm trên bàn phím. Bảng mở thêm trên một bảng khác thì nằm trên, đóng trước.
 */
export function Sheet({ label, onClose, children, wide, className = '' }) {
  const wrap = useRef(null);
  const [ra, setRa] = useState(false);
  const c = useRef({ ra: false, goi: true, fn: null, timer: null, onClose, me: {} });
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
    const me = c.current.me;
    chongSheet.push(me);
    const k = (e) => { if (e.key === 'Escape' && chongSheet[chongSheet.length - 1] === me) dong(); };
    window.addEventListener('keydown', k);
    const mo = khoaCuon();
    return () => {
      window.removeEventListener('keydown', k);
      const i = chongSheet.indexOf(me);
      if (i >= 0) chongSheet.splice(i, 1);
      mo();
    };
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
          {!wide && <div className="sheet-grip" aria-hidden="true" />}
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
