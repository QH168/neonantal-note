// Thanh "Đã xoá: … — Hoàn tác" dùng chung (v9.2). Đặt ở mức app để còn hiện sau khi bảng chi tiết đóng.
// Vẽ thẳng vào <body> bằng createPortal, z-index cao hơn bảng dưới (Sheet) và thanh thêm việc:
// luật cũ về Safari iPhone (phần đầu/thanh dưới đè lên phần tử không nằm ở body).
// Hẹn giờ 6 giây nằm ở đây, KHÔNG nằm trên dòng đã xoá, nên dòng bị gỡ khỏi trang không làm hỏng thanh.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBanPhim } from '../hooks.js';

export const THOI_GIAN_HOAN_TAC = 6000;
const THOI_GIAN_TIN = 4000; // thông báo kết quả sau khi bấm Hoàn tác (vd. "Đã có chữ tắt này, không khôi phục")

const Ctx = createContext({ hien: () => {}, an: () => {} });

/** Trả về { hien({ nhan, lam }), an() }. `lam` chạy khi bấm Hoàn tác; nếu trả về một chuỗi thì thanh hiện chuỗi đó thay cho nút. */
export const useHoanTac = () => useContext(Ctx);

export function HoanTacProvider({ children }) {
  const [muc, setMuc] = useState(null); // { id, nhan, lam } hoặc { id, tin }
  const banPhim = useBanPhim(); // bàn phím iPhone mở thì thanh nằm ngay trên bàn phím, không bị che
  const timer = useRef(null);
  const dem = useRef(0);
  const lenLich = useCallback((id, ms) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMuc((cur) => (cur && cur.id === id ? null : cur)), ms);
  }, []);
  const hien = useCallback(({ nhan, lam }) => {
    const id = ++dem.current;
    setMuc({ id, nhan, lam }); // xoá tiếp việc khác: thanh đổi sang việc mới nhất, tính lại 6 giây
    lenLich(id, THOI_GIAN_HOAN_TAC);
  }, [lenLich]);
  const an = useCallback(() => { clearTimeout(timer.current); setMuc(null); }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  // Thanh nổi ở đáy màn hình, trên bảng dưới (vd. chi tiết bé). Nếu nó rơi đúng chỗ ô đang gõ trong bảng (vd. ô thêm việc của bé
  // khi bàn phím mở) thì cuộn ô đó lên giữa bảng, để thanh không che chỗ đang gõ.
  const idMuc = muc?.id;
  useEffect(() => {
    if (!idMuc) return;
    const o = document.activeElement;
    const thanh = document.querySelector('.hoantac');
    if (!o || !thanh || !o.matches?.('input,textarea') || !o.closest?.('.sheet')) return;
    const a = o.getBoundingClientRect(), b = thanh.getBoundingClientRect();
    if (a.bottom > b.top && a.top < b.bottom) o.scrollIntoView({ block: 'center' });
  }, [idMuc]);
  const value = useMemo(() => ({ hien, an }), [hien, an]);

  const hoanTac = async () => {
    const m = muc;
    if (!m || !m.lam) return;
    clearTimeout(timer.current);
    setMuc(null);
    let tin;
    try { tin = await m.lam(); } catch { tin = 'Chưa khôi phục được. Hãy thử lại.'; }
    if (typeof tin === 'string' && tin) {
      const id = ++dem.current;
      setMuc({ id, tin });
      lenLich(id, THOI_GIAN_TIN);
    }
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div className={'hoantac-wrap' + (banPhim ? ' kb' : '')} style={banPhim ? { '--kb': banPhim.duoi + 'px' } : undefined} role="status" aria-live="polite" aria-atomic="true">
          {muc && (
            <div className="hoantac" key={muc.id}>
              <span className="hoantac-chu">{muc.tin || muc.nhan}</span>
              {muc.lam && <button type="button" className="hoantac-nut" onPointerDown={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()} onClick={hoanTac}>Hoàn tác</button>}
            </div>
          )}
        </div>,
        document.body
      )}
    </Ctx.Provider>
  );
}
