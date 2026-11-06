// Khám: xem lại một ngày trước (v9.5, bảng 16d). TUYỆT ĐỐI CHỈ XEM.
// - Chỉ có MỘT thao tác ghi: "Chép sang hôm nay" (copyPatientsFrom). Không nút "+", không vuốt, không quản lý phòng.
// - Chi tiết bé viết riêng (BeChiXem): không dùng PatientDetail hay useTuLuu, không có ô nhập, không tự lưu.
// - Tuổi tính theo NGÀY ĐÓ của chính dòng (tuoiCuaDong: bé ghi sau nửa đêm không bị lùi một năm), không bao giờ theo hôm nay.
// - Bé nào cũng hiện: phòng đã xoá, phòng không tìm thấy (hook trả phongChoXem).
import { useState } from 'react';
import { copyPatientsFrom } from '../lib/actions.js';
import { buildSummary, tuoiCuaDong, ngayTinhTuoi, gaFmt } from '../lib/clinical.js';
import { fmtDM, parseIso } from '../lib/dates.js';
import { gioXong } from '../lib/viec.js';
import { useBeNgay } from '../hooks.js';
import { SummaryPanel } from './Exam.jsx';
import { Sheet, DongBtn, TickOk, XIcon } from './ui.jsx';

/** Dòng số đo của bé ở ngày trước: "38w0d hôm đó, 1850 g" — tuổi tính theo ngày khám của chính dòng đó. */
export function soDoNgayTruoc(p) {
  const c = tuoiCuaDong(p, parseIso(p.examDate));
  const tuoi = c.err ? '' : c.pma + ' hôm đó';
  return [tuoi, p.wt ? p.wt + ' g' : ''].filter(Boolean).join(', ') || 'Chưa có thông tin';
}

/** Chi tiết bé CHỈ XEM: mã, phòng, ngày sinh, tuổi thai, cân nặng, tuổi tính sẵn theo ngày đó, ghi chú, việc, trạng thái khám. */
export function BeChiXem({ p, phong, todos, onClose }) {
  const dm = fmtDM(p.examDate);
  const dmTuoi = fmtDM(ngayTinhTuoi(p) || p.examDate); // bé ghi sau nửa đêm: tuổi tính tới ngày lịch bé được ghi
  const c = tuoiCuaDong(p, parseIso(p.examDate));
  const xong = todos.filter((t) => t.done).length;
  const o = (nhan, gt) => (
    <div className="field"><span className="muted small">{nhan}</span><div className="be-gt">{gt || '—'}</div></div>
  );
  return (
    <>
      <div className="be-head">
        <h2 className="be-ma-xem">{p.code || 'Chưa có mã'}</h2>
        {phong && <span className="be-phong">{phong}</span>}
        <DongBtn className="icon-btn" aria-label="Đóng chi tiết" onClose={onClose}><XIcon /></DongBtn>
      </div>
      <div role="status" className="dai-ngay-truoc nho">Chỉ xem, ngày {dm}. Không sửa được.</div>
      <div className="be-3">
        {o('Ngày sinh', p.dob)}
        {o('Tuổi thai', gaFmt(p.ga) || p.ga)}
        {o('Cân nặng, g', p.wt)}
      </div>
      <div className="be-tuoi">
        {c.err ? (
          <div className="be-kq be-kq-trong">Chưa tính được tuổi ngày {dmTuoi}. {c.err}</div>
        ) : (
          <div className="be-kq" role="status">
            <span>Ngày tuổi (ngày {dmTuoi})<b>{c.days}</b></span>
            <span>Hiệu chỉnh (ngày {dmTuoi})<b>{c.pma}</b></span>
          </div>
        )}
      </div>
      <h3 className="be-viec-h">Việc cần làm{todos.length > 0 && <span className="muted small">Đã xong {xong}/{todos.length}</span>}</h3>
      {todos.length > 0 ? (
        <div className="stack8">
          {todos.map((t) => (
            <div key={t.id} className={'xem-viec' + (t.done ? ' xong' : '')}>
              <span className="xem-viec-chu">{t.text}</span>
              {t.done ? <TickOk /> : <span className="xem-chua">Chưa xong</span>}
            </div>
          ))}
        </div>
      ) : <div className="muted small">Không có việc nào.</div>}
      <span className="sheet-nhan">Ghi chú</span>
      <div className="be-note-xem">{p.note?.trim() || 'Không có ghi chú.'}</div>
      <div className="trang-thai">
        <span className="trang-thai-chu">{p.done ? (gioXong(p.doneAt) ? `Đã khám lúc ${gioXong(p.doneAt)}` : 'Đã khám') : 'Chưa khám'}</span>
      </div>
      <div className="row8 sheet-r4">
        <span className="grow" />
        <DongBtn className="btn primary big sheet-done" onClose={onClose}>Đóng</DongBtn>
      </div>
    </>
  );
}

/**
 * Trang xem lại ngày `iso` (đã qua). `today` = hôm nay (đích của "Chép sang hôm nay"). `wide` = PC.
 * Trên iPhone trả về ba khối nằm thẳng trong khung app: dải vàng, danh sách cuộn, thanh nút đáy.
 * Trên PC trả về cột giữa (dải vàng, danh sách, nút, tổng hợp) và cột phải (chi tiết chỉ xem).
 * Bé đang xem (selPid) là state riêng của trang này, không dính với selPid của hôm nay.
 */
export default function KhamNgayTruoc({ iso, today, wide, onVeHomNay }) {
  const kq = useBeNgay(iso);
  const [selPid, setSelPid] = useState(null);
  const [sumOpen, setSumOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [dangChep, setDangChep] = useState(false);
  const { patients, todosByPid, rooms } = kq;
  const dm = fmtDM(iso);
  const trong = kq.ready && patients.length === 0;
  const sel = patients.find((p) => p.id === selPid);
  const tenPhong = (p) => {
    const r = rooms.find((x) => x.id === p.roomId);
    return r ? r.name + (r.deleted && r.name !== 'Phòng đã xoá' ? ' (đã xoá)' : '') : '';
  };
  const chep = async () => {
    if (dangChep) return;
    setDangChep(true);
    try {
      const n = await copyPatientsFrom(iso, today);
      setMsg(n ? `Đã chép ${n} bé sang hôm nay` : 'Không có bé nào cần chép');
    } finally { setDangChep(false); }
  };
  const build = () => buildSummary({ rooms, patients, todosByPid, now: parseIso(iso), ngayTruoc: true });

  const dai = (
    <div role="status" className="dai-ngay-truoc">
      <span className="grow">Đang xem ngày trước. Chỉ xem, không sửa.</span>
      <button type="button" className="dai-nut" onClick={onVeHomNay}>Về hôm nay</button>
    </div>
  );
  const danhSach = !kq.ready ? <div className="loading">Đang mở dữ liệu…</div> : trong ? (
    <div className="empty">Ngày {dm} không có bé nào trong danh sách.</div>
  ) : (
    <>
      {rooms.filter((r) => patients.some((p) => p.roomId === r.id)).map((r) => {
        const ps = patients.filter((p) => p.roomId === r.id);
        return (
          <section key={r.id} className="group nt-phong">
            <h2 className="nt-phong-h">
              <span className="group-title">{tenPhong({ roomId: r.id })}</span>
              <span className="muted small">Đã khám {ps.filter((p) => p.done).length}/{ps.length}</span>
            </h2>
            <div className="stack8">
              {ps.map((p) => {
                const ts = todosByPid[p.id] || [];
                return (
                  <button key={p.id} type="button" className={'nt-be' + (selPid === p.id ? ' sel' : '')} onClick={() => setSelPid(p.id)}>
                    <span className="nt-main">
                      <span className="pat-code">{p.code || 'Chưa có mã'}</span>
                      <span className="nt-sub">{soDoNgayTruoc(p)}</span>
                      {ts.map((t) => <span key={t.id} className="nt-viec">{t.text}{t.done ? '' : ', chưa xong'}</span>)}
                    </span>
                    {p.done && <TickOk nhan="Đã khám" />}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="nt-ghi">Chạm vào bé để xem chi tiết ngày đó. Không có nút thêm bé, không vuốt được, để tránh sửa nhầm hồ sơ cũ.</p>
    </>
  );
  const nut = (
    <div className="nt-nut">
      <button type="button" className="btn primary big grow" disabled={trong || !kq.ready || dangChep} onClick={chep}>Chép sang hôm nay</button>
      <button type="button" className="btn big grow" disabled={trong || !kq.ready} aria-expanded={sumOpen} onClick={() => setSumOpen(true)}>Tổng hợp ngày này</button>
    </div>
  );
  const thongBao = msg && <div role="status" className="nt-msg">{msg}</div>;
  const chiTiet = sel && <BeChiXem key={sel.id} p={sel} phong={tenPhong(sel)} todos={todosByPid[sel.id] || []} onClose={() => setSelPid(null)} />;
  const tieuDeTongHop = 'Tổng hợp ngày ' + dm;

  if (wide) {
    return (
      <>
        <main className="pc-main exam" aria-label={'Khám ngày ' + dm + ' (chỉ xem)'}>
          {dai}
          {danhSach}
          <div className="tong-hop-wrap nt-chan-pc">{thongBao}{nut}</div>
          {sumOpen && (
            <section className="card stack10" aria-label="Tổng hợp ngày này">
              <SummaryPanel build={build} tieuDe={tieuDeTongHop} onClose={() => setSumOpen(false)} />
            </section>
          )}
        </main>
        {sel && <aside className="card pc-detail" aria-label="Chi tiết bé ngày trước">{chiTiet}</aside>}
      </>
    );
  }
  return (
    <>
      <div className="nt-dai-ph">{dai}</div>
      <main className="ph-main exam nt-trang" aria-label={'Khám ngày ' + dm + ' (chỉ xem)'}>{danhSach}</main>
      <div className="nt-chan">{thongBao}{nut}</div>
      {sel && <Sheet label="Chi tiết bé ngày trước" className="sheet-be" onClose={() => setSelPid(null)}>{chiTiet}</Sheet>}
      {sumOpen && (
        <Sheet label="Tổng hợp ngày này" onClose={() => setSumOpen(false)}>
          <SummaryPanel build={build} tieuDe={tieuDeTongHop} onClose={() => setSumOpen(false)} />
        </Sheet>
      )}
    </>
  );
}
