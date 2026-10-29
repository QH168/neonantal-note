// Bảng "Thư viện viết tắt": thêm, tìm, sửa (bút chì), xoá (vuốt trái / rê chuột rồi chạm nút Xoá).
import { useRef, useState } from 'react';
import { useAbbrevs } from '../hooks.js';
import { addAbbrev, updateAbbrev, removeAbbrev } from '../lib/actions.js';
import { chuanKey } from '../lib/viet-tat.js';
import { Sheet, SheetHead, SwipeRow, PencilIcon } from './ui.jsx';

const boDau = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

const LOI = {
  'key-rong': 'Chưa gõ chữ viết tắt. Ví dụ: /hcn',
  'noidung-rong': 'Chưa gõ chữ cần đổi thành. Ví dụ: Hội chẩn ngoại khoa'
};

export default function ThuVien({ wide, onClose }) {
  const list = useAbbrevs();
  const [k, setK] = useState('');
  const [v, setV] = useState('');
  const [q, setQ] = useState('');
  const [sua, setSua] = useState(null);     // dòng đang sửa (đã đổ lên form) hoặc null
  const [loi, setLoi] = useState('');
  const [hoi, setHoi] = useState(null);     // { muc, text } khi key trùng, chờ bác sĩ chọn ghi đè
  const [tin, setTin] = useState('');
  const keyRef = useRef(null);

  const reset = () => { setK(''); setV(''); setSua(null); setLoi(''); setHoi(null); };
  const nhapK = (e) => { setK(e.target.value); setLoi(''); setHoi(null); setTin(''); };
  const nhapV = (e) => { setV(e.target.value); setLoi(''); setHoi(null); setTin(''); };

  const gui = async (e) => {
    e.preventDefault();
    setLoi(''); setHoi(null); setTin('');
    const r = sua ? await updateAbbrev(sua.id, { key: k, text: v }) : await addAbbrev(k, v);
    if (r.loi) { setLoi(LOI[r.loi] || 'Chưa lưu được.'); return; }
    if (r.trung) {
      if (sua) { setLoi(`/${r.muc.key} đã có ở mục khác (${r.muc.text}). Hãy chọn chữ viết tắt khác.`); return; }
      setHoi({ muc: r.muc, text: v.trim() });
      return;
    }
    setTin(sua ? `Đã lưu /${chuanKey(k)}.` : `Đã thêm /${chuanKey(k)} vào thư viện.`);
    reset();
    keyRef.current?.focus();
  };
  const ghiDe = async () => {
    const r = await updateAbbrev(hoi.muc.id, { text: hoi.text });
    if (r.loi) { setLoi(LOI[r.loi] || 'Chưa lưu được.'); setHoi(null); return; }
    setTin(`Đã ghi đè /${hoi.muc.key}.`);
    reset();
    keyRef.current?.focus();
  };
  const batDauSua = (m) => {
    setSua(m); setK('/' + m.key); setV(m.text); setLoi(''); setHoi(null); setTin('');
    setTimeout(() => keyRef.current?.focus(), 0);
  };
  const xoa = async (m) => {
    if (sua?.id === m.id) reset();
    await removeAbbrev(m.id);
  };

  const qq = boDau(q.trim().replace(/^\//, ''));
  const hien = qq ? list.filter((m) => boDau(m.key).includes(qq) || boDau(m.text).includes(qq)) : list;

  return (
    <Sheet label="Thư viện viết tắt" onClose={onClose} wide={wide} className="vt-sheet">
      <SheetHead title="Thư viện viết tắt" onClose={onClose} closeLabel="Đóng thư viện" />

      <form onSubmit={gui} className="vt-form" aria-label={sua ? 'Sửa viết tắt' : 'Thêm viết tắt'}>
        {sua && <div className="bold">Đang sửa /{sua.key}</div>}
        <div className="row8 vt-form-row">
          <label className="field vt-key">
            <span className="muted xsmall">Viết tắt</span>
            <input ref={keyRef} type="text" className="input vt-in" value={k} onChange={nhapK} placeholder="/hcn"
              autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          </label>
          <label className="field grow">
            <span className="muted xsmall">Đổi thành</span>
            <input type="text" className="input vt-in" value={v} onChange={nhapV} placeholder="Hội chẩn ngoại khoa" autoComplete="off" />
          </label>
        </div>
        {loi && <div className="err-box" role="alert">{loi}</div>}
        {hoi && (
          <div className="vt-ask" role="alert">
            <div>/{hoi.muc.key} đã có: <strong>{hoi.muc.text}</strong>. Ghi đè bằng <strong>{hoi.text}</strong>?</div>
            <div className="row8">
              <button type="button" className="btn primary grow" onClick={ghiDe}>Ghi đè</button>
              <button type="button" className="btn grow" onClick={() => setHoi(null)}>Thôi</button>
            </div>
          </div>
        )}
        <div className="row8">
          <button type="submit" className="btn primary grow">{sua ? 'Lưu thay đổi' : 'Thêm vào thư viện'}</button>
          {sua && <button type="button" className="btn" onClick={reset}>Huỷ sửa</button>}
        </div>
        {tin && <div className="status" role="status">{tin}</div>}
      </form>

      <label className="field">
        <span className="sr-only">Tìm viết tắt</span>
        <input type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm…" autoComplete="off" />
      </label>

      <div className="muted xsmall">Có {list.length} mục. Sửa, xoá, thêm tuỳ ý. Thư viện được sao lưu cùng dữ liệu.</div>

      <div className="vt-list" role="list" aria-label="Danh sách viết tắt">
        {hien.length === 0 && <div className="empty vt-empty">{list.length ? 'Không có mục nào khớp.' : 'Thư viện đang trống.'}</div>}
        {hien.map((m) => (
          <div role="listitem" key={m.id} className={'vt-item-wrap' + (sua?.id === m.id ? ' on' : '')}>
            <SwipeRow kind="viết tắt" label={'/' + m.key} className="vt-item" onDelete={() => xoa(m)}>
              <span className="vt-k">/{m.key}</span>
              <span className="vt-v">{m.text}</span>
              <button type="button" className="icon-btn muted" aria-label={'Sửa /' + m.key} onClick={() => batDauSua(m)}><PencilIcon /></button>
            </SwipeRow>
          </div>
        ))}
      </div>
      <div className="muted xsmall">Xoá một mục: vuốt dòng sang trái rồi chạm nút Xoá (máy tính: rê chuột vào dòng).</div>
    </Sheet>
  );
}
