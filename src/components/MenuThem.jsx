// Nút "…" ở đầu trang iPhone (phiếu 2026-11-09, mức 2): bảng xổ xuống chứa việc ít dùng.
// Chỉ dùng trên iPhone; PC vẫn có nút "/a" và đám mây riêng.
import { useEffect, useRef, useState } from 'react';
import { DotsIcon } from './ui.jsx';

/**
 * Nút tròn 44px "…" và bảng xổ xuống `role="menu"`.
 *  - nhan: aria-label của nút ("Thêm: …" mô tả các mục).
 *  - canhBao: hiện chấm đỏ (nên sao lưu hôm nay).
 *  - nhom: [{ ten, muc: [{ khoa, bieuTuong, ten, phu, tat, chon }] }]. `phu` là chữ phụ (chuỗi hoặc phần tử), `tat` làm dòng mờ và không bấm được.
 * Đóng khi chạm ngoài, Esc, bấm lại "…" hoặc chọn một dòng; đóng xong trả focus về nút "…".
 * Bảng nằm trong .ph-head (position: relative), mép phải cách màn hình 16px, ngay dưới hàng đầu.
 */
export default function MenuThem({ nhan, canhBao = false, nhom }) {
  const [mo, setMo] = useState(false);
  const nutRef = useRef(null);
  const bangRef = useRef(null);
  const dong = () => { setMo(false); nutRef.current?.focus({ preventScroll: true }); };

  useEffect(() => {
    if (!mo) return undefined;
    bangRef.current?.querySelector('[role="menuitem"]:not(:disabled)')?.focus({ preventScroll: true });
    const k = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setMo(false); nutRef.current?.focus({ preventScroll: true }); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [mo]);

  const phim = (e) => {
    if (e.key === 'Tab') { setMo(false); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const ds = [...bangRef.current.querySelectorAll('[role="menuitem"]:not(:disabled)')];
    if (!ds.length) return;
    e.preventDefault();
    const i = ds.indexOf(document.activeElement);
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? ds.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + ds.length) % ds.length;
    ds[j].focus({ preventScroll: true });
  };

  return (
    <>
      <button ref={nutRef} type="button" className={'round-btn rel mt-btn' + (mo ? ' on' : '')} aria-haspopup="menu" aria-expanded={mo}
        aria-label={nhan} onClick={() => (mo ? dong() : setMo(true))}>
        <DotsIcon />{canhBao && <span className="dot-alert" />}
      </button>
      {mo && (
        <>
          <div className="mt-nen" aria-hidden="true" onClick={dong} />
          <div ref={bangRef} className="mt-bang" role="menu" aria-label="Thêm" onKeyDown={phim}>
            {nhom.map((g, gi) => (
              <div key={g.ten} role="group" aria-label={g.ten} className={'mt-nhom' + (gi ? ' sau' : '')}>
                <div className="mt-grp" aria-hidden="true">{g.ten}</div>
                {g.muc.map((m) => (
                  <button key={m.khoa} type="button" role="menuitem" className="mt-it" disabled={!!m.tat}
                    onClick={() => { dong(); m.chon(); }}>
                    <span className="mt-ic" aria-hidden="true">{m.bieuTuong}</span>
                    <span className="mt-chu">
                      <span className="mt-t">{m.ten}</span>
                      {m.phu && <span className="mt-s">{m.phu}</span>}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
