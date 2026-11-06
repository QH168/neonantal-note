// Tổng hợp giao tour (v9.6, bảng 17d). Bảng dưới của chế độ 2 ngày ở tab Khám.
// Văn bản do soanGiaoTour (src/lib/hai-ngay.js) soạn. Bốn chip bật/tắt nhóm: Bé mới, Việc còn lại, Bé ổn định, Ghi chú (mặc định tắt).
// LUẬT GIỮ CHỮ ĐÃ SỬA: chưa sửa thì văn bản đi theo chip; ĐÃ SỬA thì đổi chip KHÔNG đụng vào chữ, mà báo rõ
// "văn bản chưa soạn lại" và chờ bấm "Soạn lại" mới soạn theo chip mới (đồng thời bỏ bản sửa).
import { useMemo, useState } from 'react';
import { soanGiaoTour } from '../lib/hai-ngay.js';
import { copyText } from '../lib/clinical.js';
import { fmtDM } from '../lib/dates.js';
import { useVietTat } from './VietTat.jsx';
import { Sheet, DongBtn, XIcon } from './ui.jsx';

const CHIP = [['beMoi', 'Bé mới'], ['viecConLai', 'Việc còn lại'], ['beOnDinh', 'Bé ổn định'], ['ghiChu', 'Ghi chú']];
const BAT_MAC_DINH = { beMoi: true, viecConLai: true, beOnDinh: true, ghiChu: false };

export default function GiaoTour({ ghep, wide, onClose }) {
  const [bat, setBat] = useState(BAT_MAC_DINH);
  const [sua, setSua] = useState(null);          // null = chưa sửa (văn bản đi theo chip); chuỗi = bản người dùng đã sửa
  const [chipDoi, setChipDoi] = useState(false); // chip đã đổi SAU khi sửa mà chưa bấm "Soạn lại"
  const [msg, setMsg] = useState('');
  const kq = useMemo(() => soanGiaoTour({ ghep, bat }), [ghep, bat]);
  const text = sua ?? kq.text;
  const doiText = (x) => { setSua(x); setMsg(''); };
  const vt = useVietTat(text, doiText);
  const bamChip = (k) => {
    setBat((b) => ({ ...b, [k]: !b[k] }));
    if (sua !== null) setChipDoi(true);
    setMsg('');
  };
  const soanLai = () => { setSua(null); setChipDoi(false); setMsg(''); };
  const copy = async () => {
    const ok = await copyText(text);
    setMsg(ok ? 'Đã sao chép' : 'Chưa sao chép được, hãy chọn hết nội dung trong khung rồi sao chép.');
  };
  return (
    <Sheet label="Tổng hợp giao tour" className="sheet-nhieu sheet-tour" wide={wide} onClose={onClose}>
      <div className="nhieu-dau">
        <div className="grow">
          <h2 className="h2">Giao tour {fmtDM(ghep.homQua)} sang {fmtDM(ghep.homNay)}</h2>
          <div className="muted small">{kq.soBe} bé, {kq.soMoiDemQua} mới đêm qua, {kq.soViecCon} việc còn lại</div>
        </div>
        <DongBtn className="icon-btn" aria-label="Đóng tổng hợp giao tour" onClose={onClose}><XIcon /></DongBtn>
      </div>
      <div role="group" aria-label="Phần đưa vào" className="tour-chips">
        {CHIP.map(([k, nhan]) => (
          <button key={k} type="button" aria-pressed={bat[k]} className="chip tour-chip" onClick={() => bamChip(k)}>{nhan}</button>
        ))}
      </div>
      {chipDoi && (
        <div role="alert" className="dai-canh-bao">
          Bạn đã sửa văn bản, nên chip vừa đổi chưa được áp dụng. Bấm "Soạn lại" để soạn theo chip mới (bản sửa sẽ mất).
        </div>
      )}
      <label htmlFor="gt-text" className="muted small nhieu-nhan">Sửa được trước khi sao chép</label>
      {vt.strip}
      <textarea id="gt-text" className="input textarea mono nhieu-text" {...vt.props} />
      <div className="row8 wrap">
        <button type="button" className="btn primary big grow-ph" onClick={copy}>Sao chép</button>
        <button type="button" className={'btn big' + (chipDoi ? ' can-soan' : '')} onClick={soanLai}>Soạn lại</button>
        {msg && <span role="status" className="status">{msg}</span>}
      </div>
    </Sheet>
  );
}
