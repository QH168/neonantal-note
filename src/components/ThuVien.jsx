// Bảng "Thư viện viết tắt": thêm, tìm, sửa (chạm 2 lần vào dòng), xoá (vuốt trái thả qua 1/3, hoặc rê chuột rồi bấm thùng rác) + Hoàn tác.
import { useRef, useState } from 'react';
import { useAbbrevs } from '../hooks.js';
import { addAbbrev, updateAbbrev, removeAbbrev, khoiPhucAbbrev } from '../lib/actions.js';
import { chuanKey } from '../lib/viet-tat.js';
import { useHoanTac } from './HoanTac.jsx';
import { boDemCham, themCham } from '../lib/viec.js';
import { Sheet, SheetHead, SwipeRow, PlusIcon } from './ui.jsx';

const boDau = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

const LOI = {
  'key-rong': 'Chưa gõ chữ viết tắt. Ví dụ: /hcn',
  'noidung-rong': 'Chưa gõ chữ cần đổi thành. Ví dụ: Hội chẩn ngoại khoa'
};

export default function ThuVien({ wide, onClose }) {
  const list = useAbbrevs();
  const hoanTac = useHoanTac();
  const [k, setK] = useState('');
  const [v, setV] = useState('');
  const [q, setQ] = useState('');
  const [sua, setSua] = useState(null);     // dòng đang sửa (đã đổ lên form) hoặc null
  const [loi, setLoi] = useState('');
  const [hoi, setHoi] = useState(null);     // { muc, text } khi key trùng, chờ bác sĩ chọn ghi đè
  const [tin, setTin] = useState('');
  const keyRef = useRef(null);
  const cham = useRef({ id: null, mocs: [] }); // chạm 2 lần vào cùng một dòng (trong 1 giây) thì sửa

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
  // Chạm dòng: lần thứ hai trong 1 giây vào CÙNG dòng thì sửa (cùng luật chạm 2 lần của tab Việc). Nhấp đúp chuột cũng tính.
  const chamDong = (m) => {
    const c = cham.current;
    c.mocs = themCham(c.id === m.id ? c.mocs : [], Date.now());
    c.id = m.id;
    if (boDemCham(c.mocs, 2)) { cham.current = { id: null, mocs: [] }; batDauSua(m); }
  };
  const xoa = async (m) => {
    if (sua?.id === m.id) reset();
    await removeAbbrev(m.id);
    hoanTac.hien({
      nhan: 'Đã xoá: /' + m.key,
      // Trong lúc chờ đã có mục sống cùng chữ tắt thì không khôi phục (tránh hai mục trùng)
      lam: async () => {
        const r = await khoiPhucAbbrev(m.id);
        if (r.trung) return 'Đã có chữ tắt này, không khôi phục';
        if (r.loi) return 'Không khôi phục được';
        return undefined;
      }
    });
  };

  const qq = boDau(q.trim().replace(/^\//, ''));
  const hien = qq ? list.filter((m) => boDau(m.key).includes(qq) || boDau(m.text).includes(qq)) : list;

  return (
    <Sheet label="Thư viện viết tắt" onClose={onClose} wide={wide} className="vt-sheet">
      <SheetHead title="Thư viện viết tắt" onClose={onClose} closeLabel="Đóng thư viện" />

      <form onSubmit={gui} className={'vt-form' + (sua ? ' sua' : '')} aria-label={sua ? 'Sửa viết tắt' : 'Thêm viết tắt'}>
        {sua && <div className="bold">Đang sửa /{sua.key}</div>}
        <div className="row8 vt-form-row">
          <label className="field vt-key">
            <span className="muted small">Viết tắt</span>
            <input ref={keyRef} type="text" className="input vt-in" value={k} onChange={nhapK} placeholder="/hcn"
              autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          </label>
          <label className="field grow">
            <span className="muted small">Đổi thành</span>
            <input type="text" className="input vt-in" value={v} onChange={nhapV} placeholder="Hội chẩn ngoại khoa" autoComplete="off" />
          </label>
          {!sua && <button type="submit" className="vt-plus" aria-label="Thêm vào thư viện"><PlusIcon /></button>}
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
        {sua && (
          <div className="row8">
            <button type="submit" className="btn primary grow">Lưu thay đổi</button>
            <button type="button" className="btn" onClick={reset}>Huỷ sửa</button>
          </div>
        )}
        {tin && <div className="status" role="status">{tin}</div>}
      </form>

      <label className="field">
        <span className="sr-only">Tìm viết tắt</span>
        <input type="search" className="input vt-tim" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo chữ viết tắt hoặc nội dung" autoComplete="off" />
      </label>

      <div className="row-between muted small vt-dem"><span>{list.length} mục</span><span>Được sao lưu cùng dữ liệu</span></div>

      <div className="vt-list" role="list" aria-label="Danh sách viết tắt">
        {hien.length === 0 && <div className="empty vt-empty">{list.length ? 'Không có mục nào khớp.' : 'Thư viện đang trống.'}</div>}
        {hien.map((m) => (
          <div role="listitem" key={m.id} className={'vt-item-wrap' + (sua?.id === m.id ? ' on' : '')}>
            <SwipeRow kind="viết tắt" label={'/' + m.key} className="vt-item" onDelete={() => xoa(m)}>
              <div className="vt-hang" role="button" tabIndex={0} aria-label={'Sửa /' + m.key}
                onClick={() => chamDong(m)} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); batDauSua(m); } }}>
                <span className="vt-k">/{m.key}</span>
                <span className="vt-v">{m.text}</span>
              </div>
            </SwipeRow>
          </div>
        ))}
      </div>
      <div className="muted small vt-chu-thich">
        Chạm 2 lần vào dòng để sửa. Vuốt trái quá 1/3 rồi thả để xoá, có hoàn tác.
        {wide && ' Máy tính: nhấp đúp để sửa, rê chuột vào dòng rồi bấm thùng rác để xoá.'}
      </div>
    </Sheet>
  );
}
