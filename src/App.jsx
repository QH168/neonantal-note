import { useEffect, useMemo, useState } from 'react';
import { useAppData, useMocNgayLamViec, useNgayLamViec, useViecNgay, useWide, useGiaoDien, useLanMoApp } from './hooks.js';
import { ensureSeed, clearDone, khoiPhucNhieu } from './lib/actions.js';
import { buildSummary } from './lib/clinical.js';
import { ZONES } from './db.js';
import { fmtLong, fmtDM, parseIso, p2 } from './lib/dates.js';
import { viecConTuHomQua } from './lib/hai-ngay.js';
import { ZoneNav, TaskGroups, TaskForm, LichViec, ConTuHomQua, monthOf } from './components/Tasks.jsx';
import { ExamActions, RoomManager, RoomList, PatientDetail, SummaryPanel } from './components/Exam.jsx';
import KhamNgayTruoc from './components/KhamNgayTruoc.jsx';
import KhamHaiNgay from './components/KhamHaiNgay.jsx';
import { LichKham } from './components/Lich.jsx';
import ThuVien from './components/ThuVien.jsx';
import { VietTatProvider } from './components/VietTat.jsx';
import { HoanTacProvider, useHoanTac } from './components/HoanTac.jsx';
import BackupPanel from './components/BackupPanel.jsx';
import { hienDongNhac } from './lib/cai-dat.js';
import { Sheet, CalIcon, CloudIcon, Chevron, GatHaiNgay } from './components/ui.jsx';

// Dòng nhắc cử chỉ ở tab Việc (v9.2): một dòng ở 393px
const CHU_NHAC_CU_CHI = 'Vuốt phải: xong · Vuốt trái: xoá · Chạm 2 lần: chi tiết';

export default function App() {
  return <VietTatProvider><HoanTacProvider><AppNgoai /></HoanTacProvider></VietTatProvider>;
}

/** Giờ máy dạng hh:mm, tự cập nhật mỗi 30 giây (chỉ để ghi "đang là 02:30" ở đầu trang khi còn trước mốc). */
function useGioMay() {
  const lay = () => { const d = new Date(); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  const [g, setG] = useState(lay);
  useEffect(() => {
    const kiem = () => setG(lay());
    const iv = setInterval(kiem, 30 * 1000);
    document.addEventListener('visibilitychange', kiem);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', kiem); };
  }, []);
  return g;
}

/**
 * Lớp ngoài (v9.6): CHỜ đọc xong mốc ngày làm việc từ meta rồi mới vẽ phần trong, để không bao giờ ghi nhầm ngày lúc tải trang.
 * homNay = NGÀY LÀM VIỆC (ngày gán cho việc/bé mới, lịch, khoá ngày tương lai, qua ngày mới); homQua = ngày làm việc trước;
 * ngayLich = ngày lịch của máy (tuổi, tiêu đề "KHÁM SÁNG" và tổng hợp y lệnh hôm nay vẫn theo ngày lịch).
 */
function AppNgoai() {
  const giaoDien = useGiaoDien();
  const mocPhut = useMocNgayLamViec();
  const ngay = useNgayLamViec(mocPhut);
  if (!ngay.sanSang) return <div className="loading">Đang mở dữ liệu…</div>;
  return <AppChinh mocPhut={mocPhut} homNay={ngay.homNay} homQua={ngay.homQua} ngayLich={ngay.ngayLich} cheDo={giaoDien.cheDo} setCheDo={giaoDien.setCheDo} />;
}

function AppChinh({ mocPhut, homNay, homQua, ngayLich, cheDo, setCheDo }) {
  const hoanTac = useHoanTac();
  const wide = useWide();
  const gio = useGioMay();
  const data = useAppData(homNay);

  const [tab, setTab] = useState('task');
  const lanMo = useLanMoApp();
  const [viewDate, setViewDate] = useState(homNay);
  const [calMonth, setCalMonth] = useState(monthOf(homNay));
  const [calOpen, setCalOpen] = useState(true);   // PC: lịch trong cột trái
  const [calSheet, setCalSheet] = useState(false); // iPhone: lịch trượt lên
  const [active, setActive] = useState('all');
  const [newZone, setNewZone] = useState('NICU');
  const [newTags, setNewTags] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [roomCollapsed, setRoomCollapsed] = useState({});
  const [roomEdit, setRoomEdit] = useState(false);
  const [selPid, setSelPid] = useState(null);
  const [sumOpen, setSumOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [vtOpen, setVtOpen] = useState(false);
  const [ngayTruoc, setNgayTruoc] = useState(null);  // v9.5: đang xem lại một ngày trước ở tab Khám (chỉ xem); null = hôm nay
  const [lichKham, setLichKham] = useState(false);
  // v9.6: chế độ "2 ngày" dùng chung cho Việc và Khám, giữ khi đổi tab; mỗi lần mở app là "Hôm nay"
  const [haiNgay, setHaiNgay] = useState(false);

  useEffect(() => { ensureSeed(); }, []);

  // Qua ngày làm việc mới (qua mốc, hoặc mở lại app): đưa mục Việc và Khám về hôm nay
  useEffect(() => { setViewDate(homNay); setCalMonth(monthOf(homNay)); setNgayTruoc(null); }, [homNay]);

  const { tasks, rooms, roomsHomNay, patients, todosByPid, prev, roomUse, roomUsePast, lastExport } = data;
  const dayTasks = useMemo(() => tasks.filter((t) => t.date === viewDate), [tasks, viewDate]);
  const overdue = tasks.filter((t) => t.date < homNay && !t.done).length;
  const isTask = tab === 'task';
  const isToday = viewDate === homNay;
  const sel = patients.find((p) => p.id === selPid);
  const tenPhong = (p) => roomsHomNay.find((r) => r.id === p.roomId)?.name || '';
  const examLeft = patients.reduce((n, p) => n + (todosByPid[p.id] || []).filter((t) => !t.done).length, 0);
  const backupDue = !lastExport || Date.now() - lastExport.at > 24 * 3600 * 1000;

  const total = isTask ? dayTasks.length : patients.length;
  const done = isTask ? dayTasks.filter((t) => t.done).length : patients.filter((p) => p.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const xemTruoc = !isTask && !!ngayTruoc;   // tab Khám đang xem ngày trước
  // 2 ngày: nút gạt ẩn khi đang xem một ngày khác (lịch Việc, ngày trước của Khám)
  const coGat = isTask ? isToday : !xemTruoc;
  const dang2Viec = isTask && isToday && haiNgay;
  const dang2Kham = !isTask && !xemTruoc && haiNgay;
  const heading = isTask ? (isToday ? 'Việc hôm nay' : 'Việc ngày ' + fmtDM(viewDate)) : (xemTruoc ? 'Khám ngày ' + fmtDM(ngayTruoc) : 'Khám bệnh hôm nay');
  const dateText = (dang2Viec || dang2Kham)
    ? `Hôm qua ${fmtDM(homQua)} và hôm nay ${fmtDM(homNay)}`
    : fmtLong(parseIso(isTask ? viewDate : (ngayTruoc || homNay)));
  // đang TRƯỚC mốc (vd. 02:30 ngày 05/11, mốc 07:00): "hôm nay" của app là ngày làm việc 04/11, ghi rõ để khỏi nhầm
  const truocMoc = homNay !== ngayLich;
  const daiMoc = truocMoc && coGat && (
    <div role="status" className="dai-moc">Ngày làm việc {fmtDM(homNay)} (đang là {gio}, {fmtDM(ngayLich)})</div>
  );

  // Việc 2 ngày: việc chưa xong của ĐÚNG ngày làm việc trước ("Còn từ hôm qua")
  const hq = useViecNgay(dang2Viec ? homQua : '');
  const conHomQua = useMemo(
    () => (dang2Viec ? viecConTuHomQua(hq.tasks, { homQua, homNay, mocPhut }) : []),
    [dang2Viec, hq.tasks, homQua, homNay, mocPhut]
  );

  // khu cũ (BM) không có trong ô chọn khu khi thêm việc
  const pickZone = (k) => { setActive(k); if (ZONES.includes(k)) setNewZone(k); };
  const toggleIn = (setter) => (k) => setter((c) => ({ ...c, [k]: !c[k] }));
  const goToday = () => { setViewDate(homNay); setCalMonth(monthOf(homNay)); };
  // Xem một ngày trước: bé đang mở và bảng tổng hợp của HÔM NAY được đóng lại, không lẫn với bé của ngày đang xem
  const xemNgayTruoc = (iso) => { setSelPid(null); setSumOpen(false); setNgayTruoc(iso); };
  const veHomNayKham = () => setNgayTruoc(null);
  // đổi Hôm nay / 2 ngày: đóng bé và bảng tổng hợp đang mở của chế độ kia, khỏi lẫn dòng hai ngày
  const doiPhamVi = (v) => { setSelPid(null); setSumOpen(false); setHaiNgay(v); };
  const summary = () => buildSummary({ rooms: roomsHomNay, patients, todosByPid });
  // Xoá việc đã xong: một lần Hoàn tác trả lại tất cả việc vừa xoá
  const xoaDaXong = async () => {
    const ids = await clearDone(viewDate);
    if (ids.length) hoanTac.hien({ nhan: `Đã xoá ${ids.length} việc đã xong`, lam: () => khoiPhucNhieu('tasks', ids) });
  };
  const clearDoneBtn = isTask && dayTasks.some((t) => t.done) && (
    <button type="button" className="btn ghost self-start" onClick={xoaDaXong}>Xoá việc đã xong</button>
  );
  const gat = coGat && <GatHaiNgay haiNgay={haiNgay} onDoi={doiPhamVi} ghiChu={isTask ? '' : 'Ghép theo phòng và mã'} />;


  const backupBtn = (
    <button type="button" className="round-btn rel" onClick={() => setBackupOpen(true)} aria-label={'Sao lưu và cài đặt' + (backupDue ? ' (nên sao lưu hôm nay)' : '')}>
      <CloudIcon />{backupDue && <span className="dot-alert" />}
    </button>
  );
  const vtBtn = (
    <button type="button" className="round-btn vt-btn" onClick={() => setVtOpen(true)} aria-label="Thư viện viết tắt">/a</button>
  );
  const vtSheet = vtOpen && <ThuVien wide={wide} onClose={() => setVtOpen(false)} />;
  const tabs = (
    <div className={'seg' + (wide ? '' : ' full')}>
      <button type="button" aria-pressed={isTask} onClick={() => setTab('task')}>Việc</button>
      <button type="button" aria-pressed={!isTask} onClick={() => setTab('exam')}>Khám</button>
    </div>
  );
  const examHint = isTask && isToday && examLeft > 0 && (
    <button type="button" className="exam-hint" onClick={() => setTab('exam')}>Khám: còn {examLeft} việc</button>
  );
  const backupSheet = backupOpen && (
    <Sheet label="Sao lưu và cài đặt" onClose={() => setBackupOpen(false)} wide={wide}>
      <BackupPanel onClose={() => setBackupOpen(false)} cheDo={cheDo} onDoiCheDo={setCheDo} />
    </Sheet>
  );

  const lichKhamSheet = lichKham && !isTask && (
    <Sheet label="Lịch khám" className="sheet-lich" wide={wide} onClose={() => setLichKham(false)}>
      <LichKham today={homNay} dangXem={ngayTruoc} wide={wide} onXemNgay={xemNgayTruoc} onVeHomNay={veHomNayKham} onClose={() => setLichKham(false)} />
    </Sheet>
  );

  if (!data.ready) return <div className="loading">Đang mở dữ liệu…</div>;

  // ===================== PC =====================
  if (wide) {
    return (
      <div className="pc">
        <div className="pc-top">
          {tabs}
          <div className="row8">{vtBtn}{backupBtn}</div>
        </div>

        <aside className="pc-side">
          <div className="stack4">
            <div className="muted small">{dateText}</div>
            <h1 className="h1">{heading}</h1>
          </div>
          {daiMoc}
          {!xemTruoc && (
            <div className="stack8">
              <div className="row-between muted small"><span>{isTask ? 'Đã hoàn thành' : 'Đã khám'}</span><span>{done}/{total}</span></div>
              <div className="bar"><div style={{ width: pct + '%' }} /></div>
            </div>
          )}
          {gat}

          {!isTask && (
            <button type="button" className={'btn cal-toggle' + (xemTruoc ? ' on' : '')} onClick={() => setLichKham(true)}>
              <CalIcon /><span className="grow left-text">Lịch khám</span>
            </button>
          )}
          {!isTask && !xemTruoc && !dang2Kham && <ExamActions prev={prev} today={homNay} roomEdit={roomEdit} onToggleRoomEdit={() => setRoomEdit(!roomEdit)} />}

          {isTask && (
            <>
              <div className="stack8">
                <button type="button" className="btn cal-toggle" aria-expanded={calOpen} onClick={() => setCalOpen(!calOpen)}>
                  <CalIcon /><span className="grow left-text">Lịch</span>
                  {overdue > 0 && <span className="badge">{overdue}</span>}
                  <Chevron dir="down" style={{ transform: `rotate(${calOpen ? 180 : 0}deg)` }} />
                </button>
                {calOpen && <LichViec inline tasks={tasks} viewDate={viewDate} today={homNay} month={calMonth} setMonth={setCalMonth} onPick={setViewDate} />}
                {!calOpen && !isToday && <button type="button" className="btn tint" onClick={goToday}>Về hôm nay</button>}
              </div>
              <ZoneNav dayTasks={dayTasks} active={active} onPick={pickZone} />
              {examHint}
              {clearDoneBtn}
            </>
          )}
        </aside>

        {isTask ? (
          <main className="pc-main">
            <TaskForm variant="pc" date={viewDate} zone={newZone} setZone={setNewZone} tags={newTags} setTags={setNewTags} />
            {dang2Viec && <ConTuHomQua muc={conHomQua} homNay={homNay} />}
            <TaskGroups dayTasks={dayTasks} active={active} collapsed={collapsed} onToggle={toggleIn(setCollapsed)} />
          </main>
        ) : xemTruoc ? (
          <KhamNgayTruoc key={ngayTruoc} wide iso={ngayTruoc} today={homNay} onVeHomNay={veHomNayKham} />
        ) : dang2Kham ? (
          <KhamHaiNgay wide homQua={homQua} homNay={homNay} mocPhut={mocPhut} ngayLich={ngayLich} />
        ) : (
          <>
            <main className="pc-main exam">
              {roomEdit && <RoomManager rooms={rooms} roomUse={roomUse} roomUsePast={roomUsePast} homNay={homNay} />}
              <RoomList rooms={roomsHomNay}patients={patients} todosByPid={todosByPid} collapsed={roomCollapsed}
                onToggle={toggleIn(setRoomCollapsed)} selPid={selPid} onOpen={setSelPid} today={homNay} />
              <div className="tong-hop-wrap"><button type="button" className="btn" aria-expanded={sumOpen} onClick={() => setSumOpen(true)}>Tổng hợp y lệnh</button></div>
              {sumOpen && <section className="card stack10" aria-label="Tổng hợp y lệnh"><SummaryPanel build={summary} onClose={() => setSumOpen(false)} /></section>}
            </main>
            {sel && (
              <aside className="card pc-detail" aria-label="Chi tiết bệnh nhân">
                <PatientDetail key={sel.id} wide p={sel} phong={tenPhong(sel)} todos={todosByPid[sel.id] || []} onClose={() => setSelPid(null)} />
              </aside>
            )}
          </>
        )}
        {backupSheet}
        {lichKhamSheet}
        {vtSheet}
      </div>
    );
  }

  // ===================== iPhone =====================
  return (
    <div className="phone-app">
      <header className="ph-head">
        <div className="row-between end">
          <div className="stack2 min0">
            <div className="muted small">{dateText}</div>
            <h1 className="h1 h1-ph">{heading}</h1>
          </div>
          <div className="row8 none">
            {vtBtn}
            {backupBtn}
            {isTask ? (
              <button type="button" className="round-btn rel" onClick={() => setCalSheet(true)} aria-label="Mở lịch">
                <CalIcon />{overdue > 0 && <span className="badge">{overdue}</span>}
              </button>
            ) : (
              <button type="button" className={'round-btn rel' + (xemTruoc ? ' on' : '')} onClick={() => setLichKham(true)} aria-label="Lịch khám">
                <CalIcon />
              </button>
            )}
          </div>
        </div>
        {daiMoc}
        {!xemTruoc && (
          <div className="row10">
            <div className="bar grow thin"><div style={{ width: pct + '%' }} /></div>
            <div className="prog-text">{isTask ? 'Đã xong' : 'Đã khám'} {done}/{total}</div>
            {isTask && !isToday && <button type="button" className="btn tint sm" onClick={goToday}>Về hôm nay</button>}
          </div>
        )}
      </header>
      <div className="ph-tabs">{tabs}</div>
      {gat && <div className="ph-gat">{gat}</div>}

      {isTask ? (
        <>
          <ZoneNav chips dayTasks={dayTasks} active={active} onPick={pickZone} />
          <main className="ph-main">
            {dang2Viec && <ConTuHomQua chips muc={conHomQua} homNay={homNay} />}
            {examHint}
            {hienDongNhac(lanMo, dayTasks.length) && <div className="muted xsmall dong-nhac">{CHU_NHAC_CU_CHI}</div>}
            <TaskGroups chips dayTasks={dayTasks} active={active} collapsed={collapsed} onToggle={toggleIn(setCollapsed)} />
            {clearDoneBtn}
          </main>
          <TaskForm variant="ph" date={viewDate} zone={newZone} setZone={setNewZone} tags={newTags} setTags={setNewTags} khuLoc={active} />
        </>
      ) : xemTruoc ? (
        <KhamNgayTruoc key={ngayTruoc} iso={ngayTruoc} today={homNay} onVeHomNay={veHomNayKham} />
      ) : dang2Kham ? (
        <KhamHaiNgay homQua={homQua} homNay={homNay} mocPhut={mocPhut} ngayLich={ngayLich} />
      ) : (
        <main className="ph-main exam">
          <ExamActions compact prev={prev} today={homNay} roomEdit={roomEdit} onToggleRoomEdit={() => setRoomEdit(!roomEdit)} />
          {roomEdit && <RoomManager rooms={rooms} roomUse={roomUse} roomUsePast={roomUsePast} homNay={homNay} />}
          <RoomList rooms={roomsHomNay}patients={patients} todosByPid={todosByPid} collapsed={roomCollapsed}
            onToggle={toggleIn(setRoomCollapsed)} selPid={selPid} onOpen={setSelPid} today={homNay} />
          <div className="tong-hop-wrap"><button type="button" className="btn" onClick={() => setSumOpen(true)}>Tổng hợp y lệnh</button></div>
        </main>
      )}

      {calSheet && isTask && (
        <Sheet label="Lịch công việc" className="sheet-lich" onClose={() => setCalSheet(false)}>
          <LichViec tasks={tasks} viewDate={viewDate} today={homNay} month={calMonth} setMonth={setCalMonth}
            onPick={(d) => setViewDate(d)} onClose={() => setCalSheet(false)} />
        </Sheet>
      )}
      {sel && !isTask && !dang2Kham && (
        <Sheet label="Chi tiết bệnh nhân" className="sheet-be" onClose={() => setSelPid(null)}>
          <PatientDetail key={sel.id} p={sel} phong={tenPhong(sel)} todos={todosByPid[sel.id] || []} onClose={() => setSelPid(null)} />
        </Sheet>
      )}
      {sumOpen && !isTask && !dang2Kham && (
        <Sheet label="Tổng hợp y lệnh" onClose={() => setSumOpen(false)}>
          <SummaryPanel build={summary} onClose={() => setSumOpen(false)} />
        </Sheet>
      )}
      {backupSheet}
      {lichKhamSheet}
      {vtSheet}
    </div>
  );
}
