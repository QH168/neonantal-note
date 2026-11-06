// Khám: xem 2 ngày để giao tour (v9.6, bảng 17a, 17b). Ghép bé hôm qua + hôm nay theo PHÒNG + MÃ thành một thẻ 2 dòng.
// "Hôm qua" / "hôm nay" là NGÀY LÀM VIỆC (homQua, homNay do App truyền). Tuổi theo ngày LỊCH của máy (ghepHaiNgay lo).
// Thao tác ghi duy nhất của trang này: "Chép sang" (chepMotBe, một bé) và những gì PatientDetail tự lưu cho bé HÔM NAY.
// Không bao giờ ghi vào dòng của hôm qua: chạm thẻ có bé hôm nay → PatientDetail của dòng hôm nay (kèm khung "Đêm qua" chỉ xem);
// thẻ chỉ có hôm qua → BeChiXem (chi tiết chỉ xem, không ô nhập).
import { useMemo, useState } from 'react';
import { chepMotBe } from '../lib/actions.js';
import { ghepHaiNgay, locThe } from '../lib/hai-ngay.js';
import { useHaiNgayKham } from '../hooks.js';
import { PatientDetail } from './Exam.jsx';
import { BeChiXem } from './KhamNgayTruoc.jsx';
import GiaoTour from './GiaoTour.jsx';
import { Sheet, TickOk } from './ui.jsx';

const LY_KHONG_CHEP = {
  trung: 'Bé này đã có trong danh sách hôm nay.',
  'phong-xoa': 'Phòng của bé đã bị xoá, không chép được.',
  'khong-thay': 'Không tìm thấy bé để chép.'
};

const CHIP = [['tatCa', 'Tất cả', 'tatCa'], ['moiDemQua', 'Mới đêm qua', 'moiDemQua'], ['conViec', 'Còn việc', 'conViec'], ['chuaChep', 'Chưa chép', 'chuaChep']];

/** Dòng chữ của "Hôm qua" / "Đêm qua" trên thẻ. */
function dongQua(the) {
  const pq = the.homQua;
  if (!pq) return '';
  if (the.moiDemQua && pq.note?.trim()) return pq.note.trim();
  const con = the.viecConTuHomQua;
  return (pq.done ? 'Đã khám' : 'Chưa khám') + (con.length ? '. Còn: ' + con.map((t) => t.text).join(', ') : '');
}

/** Dòng chữ của "Hôm nay" trên thẻ: trạng thái khám, việc còn lại, mức tăng giảm cân (chỉ khi khác 0). */
function dongNay(the) {
  const ph = the.homNay;
  if (!ph) return '';
  let s = (the.chiCoHomNay ? 'Mới vào hôm nay. ' : '') + (ph.done ? 'Đã khám' : 'Chưa khám');
  if (the.viecConHomNay.length) s += `. Còn ${the.viecConHomNay.length} việc`;
  if (the.tangGiamCan && the.tangGiamCan.gram !== 0) s += ', ' + the.tangGiamCan.text;
  return s;
}

export default function KhamHaiNgay({ homQua, homNay, mocPhut, ngayLich, wide }) {
  const d = useHaiNgayKham(homQua, homNay);
  // `now` đổi theo ngày lịch (ngayLich) để tuổi tự cập nhật khi qua nửa đêm
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ghep = useMemo(() => ghepHaiNgay({ homQua: d.homQua, homNay: d.homNay, rooms: d.rooms, todosByPid: d.todosByPid, mocPhut, now: new Date() }), [d, mocPhut, ngayLich]);
  const [chip, setChip] = useState('tatCa');
  const [selKey, setSelKey] = useState(null);   // khoá thẻ ("idHômQua|idHômNay"), KHÔNG phải id một dòng: không lẫn hai ngày
  const [tourMo, setTourMo] = useState(false);
  const [msg, setMsg] = useState('');
  const [dangChep, setDangChep] = useState(false);

  const tenPhong = (roomId, ten) => {
    const r = d.rooms.find((x) => x.id === roomId);
    return r ? r.name + (r.deleted && r.name !== 'Phòng đã xoá' ? ' (đã xoá)' : '') : ten;
  };
  const phongHien = ghep.phong.map((p) => ({ ...p, the: locThe(p.the, chip) })).filter((p) => p.the.length);
  const the = selKey ? ghep.the.find((t) => t.key === selKey) : null;
  const dong = () => setSelKey(null);

  const chep = async (t) => {
    if (dangChep || !t.homQua) return;
    setDangChep(true);
    try {
      const r = await chepMotBe(t.homQua.id, homNay);
      setMsg(r.added ? `Đã chép ${t.ma || 'bé'} sang hôm nay.` : (LY_KHONG_CHEP[r.ly] || 'Không chép được.'));
    } finally { setDangChep(false); }
  };

  const the2 = (t) => {
    const qua = dongQua(t), nay = dongNay(t);
    const so = [t.tuoi ? t.tuoi.pma : '', t.hienThi.wt ? t.hienThi.wt + ' g' : ''].filter(Boolean).join(', ');
    const xong = !!t.homNay?.done;
    const cls = 'hn-the' + (t.moiDemQua ? ' moi' : '') + (t.chiCoHomQua ? ' chi-qua' : '') + (xong ? ' xong' : '');
    return (
      <article key={t.key} className={cls}>
        <button type="button" className="hn-mo" onClick={() => { setMsg(''); setSelKey(t.key); }}>
          <span className="hn-dau">
            <span className="pat-code">{t.ma || 'Chưa có mã'}</span>
            {so && <span className="hn-so">{so}</span>}
            {t.moiDemQua && <span className="hn-vao">Vào {t.gioVao} đêm qua</span>}
            {xong && <TickOk nhan="Đã khám hôm nay" />}
          </span>
          {t.chiCoHomQua ? (
            <span className="hn-chi-qua">Chỉ có hôm qua. Chưa có trong danh sách hôm nay</span>
          ) : (
            <span className="hn-luoi">
              {qua && (<><span className="hn-nhan">{t.moiDemQua ? 'Đêm qua' : 'Hôm qua'}</span><span className="hn-chu">{qua}</span></>)}
              {nay && (<><span className="hn-nhan">Hôm nay</span><span className="hn-chu hn-nay">{nay}</span></>)}
            </span>
          )}
        </button>
        {t.chiCoHomQua && (
          <button type="button" className="hn-chep" disabled={dangChep} aria-label={'Chép ' + (t.ma || 'bé') + ' sang hôm nay'} onClick={() => chep(t)}>Chép sang</button>
        )}
      </article>
    );
  };

  const chips = (
    <nav aria-label="Lọc" className="chips noscroll hn-chips">
      {CHIP.map(([k, nhan, dk]) => (
        <button key={k} type="button" aria-pressed={chip === k} onClick={() => setChip(k)}
          className={'chip' + (chip === k ? ' on' : '') + (k === 'moiDemQua' && chip !== k ? ' chip-dem' : '')}>
          <span>{nhan}</span><span className="zone-count">{ghep.dem[dk]}</span>
        </button>
      ))}
    </nav>
  );
  const danhSach = !d.ready ? <div className="loading">Đang mở dữ liệu…</div> : !ghep.the.length ? (
    <div className="empty">Chưa có bé nào trong 2 ngày.</div>
  ) : !phongHien.length ? (
    <div className="empty">Không có bé nào ở bộ lọc này.</div>
  ) : phongHien.map((p) => (
    <section key={p.roomId} className="group nt-phong">
      <h2 className="nt-phong-h"><span className="group-title">{tenPhong(p.roomId, p.ten)}</span><span className="muted small">{p.the.length} bé</span></h2>
      <div className="stack8">{p.the.map(the2)}</div>
    </section>
  ));
  const nutTour = (
    <button type="button" className="btn primary big hn-tour" disabled={!d.ready || !ghep.the.length} aria-expanded={tourMo} onClick={() => setTourMo(true)}>Tổng hợp giao tour</button>
  );
  const thongBao = msg && <div role="status" className="nt-msg">{msg}</div>;

  // chi tiết: bé có hôm nay → sửa được (dòng HÔM NAY), kèm khung "Đêm qua" chỉ xem; bé chỉ có hôm qua → chỉ xem
  let chiTiet = null, nhanChiTiet = 'Chi tiết bệnh nhân', laChiXem = false;
  if (the) {
    const ph = the.homNay, pq = the.homQua;
    const phong = tenPhong(the.roomId, the.tenPhong);
    if (ph && ph.examDate === homNay) {
      chiTiet = (
        <PatientDetail key={ph.id} wide={wide} p={ph} phong={phong} todos={d.todosByPid[ph.id] || []} onClose={dong}
          dem={pq && pq.examDate === homQua ? { p: pq, todos: d.todosByPid[pq.id] || [], moiDemQua: the.moiDemQua, gioVao: the.gioVao } : null} />
      );
    } else if (pq) {
      laChiXem = true;
      nhanChiTiet = 'Chi tiết bé hôm qua, chỉ xem';
      chiTiet = <BeChiXem key={pq.id} p={pq} phong={phong} todos={d.todosByPid[pq.id] || []} onClose={dong} />;
    }
  }
  const tour = tourMo && <GiaoTour ghep={ghep} wide={wide} onClose={() => setTourMo(false)} />;

  if (wide) {
    return (
      <>
        <main className="pc-main exam" aria-label="Khám, xem 2 ngày">
          {chips}
          {danhSach}
          <div className="tong-hop-wrap nt-chan-pc">{thongBao}{nutTour}</div>
        </main>
        {chiTiet && <aside className="card pc-detail" aria-label={laChiXem ? nhanChiTiet : 'Chi tiết bệnh nhân'}>{chiTiet}</aside>}
        {tour}
      </>
    );
  }
  return (
    <>
      {chips}
      <main className="ph-main exam hn-trang" aria-label="Khám, xem 2 ngày">{danhSach}</main>
      <div className="nt-chan">{thongBao}{nutTour}</div>
      {chiTiet && <Sheet label={nhanChiTiet} className="sheet-be" onClose={dong}>{chiTiet}</Sheet>}
      {tour}
    </>
  );
}
