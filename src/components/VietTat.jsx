// Viết tắt: gõ '/key' + dấu cách thì thay chữ; dải gợi ý; thông báo "Đã thay" + Hoàn tác.
// Dùng chung cho mọi ô gõ chữ qua hook useVietTat. Hàm thay chữ nằm ở src/lib/viet-tat.js.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAbbrevs } from '../hooks.js';
import { taoMap, moRong, hoanTac, goiY, chenGoiY } from '../lib/viet-tat.js';

const Ctx = createContext({ list: [], map: {} });

/** Một lần cho cả app: đọc thư viện viết tắt, chia cho mọi ô gõ. */
export function VietTatProvider({ children }) {
  const rows = useAbbrevs();
  const value = useMemo(() => {
    const list = rows.map((r) => ({ key: r.key, text: r.text }));
    return { list, map: taoMap(list) };
  }, [rows]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const THOI_GIAN_BAO = 4000;

/**
 * Hook cho một ô gõ (input hoặc textarea).
 * - value: chữ hiện có; setValue(chuỗi): đặt chữ mới (ô tự lưu cũng gọi qua đây).
 * - opts.onBlur: việc phụ khi rời ô (vd. lưu ngay).
 * Trả về { props, strip }: rải `props` vào ô, đặt `strip` ngay trên (hoặc dưới) ô.
 */
export function useVietTat(value, setValue, opts = {}) {
  const { list, map } = useContext(Ctx);
  const ref = useRef(null);
  const caretMoi = useRef(null);   // vị trí con trỏ cần đặt sau khi vẽ lại
  const giaTri = useRef(value);
  giaTri.current = value;
  const timer = useRef();
  const [caret, setCaret] = useState(0);
  const [focus, setFocus] = useState(false);
  const [bao, setBao] = useState(null); // { key, ketQua }

  useLayoutEffect(() => {
    const c = caretMoi.current;
    if (c === null) return;
    caretMoi.current = null;
    const el = ref.current;
    if (el && document.activeElement === el) { try { el.setSelectionRange(c, c); } catch { /* bỏ qua */ } }
    setCaret(c);
  });
  useEffect(() => () => clearTimeout(timer.current), []);

  const hienBao = (b) => {
    setBao(b);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setBao(null), THOI_GIAN_BAO);
  };

  const onChange = (e) => {
    const el = e.target;
    const text = el.value;
    const c = el.selectionEnd ?? text.length;
    const loai = e.nativeEvent?.inputType || '';
    // chỉ thay khi vừa GÕ thêm ký tự (không phải xoá/hoàn tác của hệ thống)
    if (text.length > giaTri.current.length && (loai === '' || loai.startsWith('insert'))) {
      const r = moRong(text, c, map);
      if (r) {
        caretMoi.current = r.caret;
        setValue(r.text);
        hienBao({ key: r.key, ketQua: r });
        return;
      }
    }
    setCaret(c);
    setValue(text);
  };
  const theoDoiCaret = (e) => setCaret(e.target.selectionEnd ?? 0);

  const gy = focus ? goiY(value, caret, list) : [];

  const chen = (g) => {
    const typed = value.slice(g.batDau, caret);
    const r = chenGoiY(value, caret, g.batDau, g.text);
    caretMoi.current = r.caret;
    setValue(r.text);
    hienBao({ key: g.key, ketQua: { batDau: g.batDau, noiDung: g.text, goc: typed, phim: ' ', key: g.key } });
    ref.current?.focus();
  };
  const hoan = () => {
    const r = hoanTac(giaTri.current, bao?.ketQua);
    setBao(null);
    if (!r) return;
    caretMoi.current = r.caret;
    setValue(r.text);
    ref.current?.focus();
  };

  const coTheHoan = bao && hoanTac(value, bao.ketQua) !== null;
  const giuFocus = (e) => e.preventDefault(); // chạm nút không làm mất bàn phím iPhone

  const strip = (gy.length > 0 || coTheHoan) ? (
    <div className="vt-strip">
      {gy.length > 0 && (
        <div className="vt-sug" role="group" aria-label="Gợi ý viết tắt">
          <span className="vt-sug-t">Gợi ý (chạm để chèn):</span>
          {gy.map((g) => (
            <button key={g.key} type="button" className="vt-chip" onPointerDown={giuFocus} onMouseDown={giuFocus} onClick={() => chen(g)}>
              <span className="vt-chip-k">/{g.key}</span><span className="vt-chip-v">· {g.text}</span>
            </button>
          ))}
        </div>
      )}
      {coTheHoan && (
        <div className="vt-toast" role="status">
          <span className="grow">Đã thay /{bao.key}</span>
          <button type="button" className="vt-undo" onPointerDown={giuFocus} onMouseDown={giuFocus} onClick={hoan}>Hoàn tác</button>
        </div>
      )}
    </div>
  ) : null;

  const props = {
    ref, value, onChange,
    onSelect: theoDoiCaret, onKeyUp: theoDoiCaret, onClick: theoDoiCaret,
    onFocus: (e) => { setFocus(true); setCaret(e.target.selectionEnd ?? 0); },
    onBlur: (e) => { setFocus(false); opts.onBlur?.(e); }
  };
  return { props, strip };
}
