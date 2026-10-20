// Biểu tượng và các phần giao diện dùng chung.
import { useEffect } from 'react';

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
export const Chevron = ({ dir = 'right', size = 16, style }) => {
  const d = { right: 'M6 3.5l4.5 4.5L6 12.5', down: 'M4 6l4 4 4-4', left: 'M10 3.5L5.5 8l4.5 4.5' }[dir];
  return <svg width={size} height={size} viewBox="0 0 16 16" strokeWidth="2" style={style} {...S}><path d={d} /></svg>;
};
export const XIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" strokeWidth="1.8" {...S}><path d="M4.5 4.5l9 9M13.5 4.5l-9 9" /></svg>
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

export const PRI_NAME = { 1: 'đỏ', 2: 'vàng', 3: 'xanh lá', 4: 'xanh dương' };

/** Vòng tròn số mức khẩn cấp. */
export function PriDot({ n, faded }) {
  return <span className="pri" style={{ background: `var(--p${n})`, color: `var(--p${n}i)`, opacity: faded ? 0.45 : 1 }}>{n}</span>;
}

/** Bảng trượt lên (iPhone) / hộp giữa màn hình (PC). */
export function Sheet({ label, onClose, children, wide }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className={'sheet-wrap' + (wide ? ' center' : '')}>
      <button type="button" className="sheet-backdrop" aria-label={'Đóng ' + label.toLowerCase()} onClick={onClose} />
      <section className="sheet" role="dialog" aria-modal="true" aria-label={label}>
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
