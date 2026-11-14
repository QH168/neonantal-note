import { useEffect, useMemo, useState } from 'react';
import { useAppData, useMocNgayLamViec, useNgayLamViec, useViecNgay, useWide, useGiaoDien, useLanMoApp, useGioMay, useBaoTam } from './hooks.js';
import { ensureSeed, clearDone, khoiPhucNhieu } from './lib/actions.js';
import { buildSummary } from './lib/clinical.js';
import { ZONES } from './db.js';
import { fmtLong, fmtDM, parseIso } from './lib/dates.js';
import { viecConTuHomQua } from './lib/hai-ngay.js';
import { ZoneNav, TaskGroups, TaskForm, LichViec, ConTuHomQua, monthOf } from './components/Tasks.jsx';
import { ExamActions, RoomManager, RoomList, PatientDetail, SummaryPanel, thongTinLayDanhSach, chepDanhSach } from './components/Exam.jsx';
import MenuThem from './components/MenuThem.jsx';
import KhamNgayTruoc from './components/KhamNgayTruoc.jsx';
import KhamHaiNgay from './components/KhamHaiNgay.jsx';
import { LichKham } from './components/Lich.jsx';
import ThuVien from './components/ThuVien.jsx';
import { VietTatProvider } from './components/VietTat.jsx';
import { HoanTacProvider, useHoanTac } from './components/HoanTac.jsx';
import BackupPanel from './components/BackupPanel.jsx';
import { hienDongNhac } from './lib/cai-dat.js';
import { Sheet, CalIcon, CloudIcon, Chevron, GatHaiNgay, ChepIcon, PhongIcon } from './components/ui.jsx';

// Dòng nhắc cử chỉ ở tab Việc (v9.2): một dòng ở 393px
const CHU_NHAC_CU_CHI = 'Vuốt phải: xong · Vuốt trái: xoá · Chạm 2 lần: chi tiết';
const MOT_NGAY_MS = 24 * 3600 * 1000;

export default function App() {
  return <VietTatProvider><HoanTacProvider><AppNgoai /></HoanTacProvider></VietTatProvider>;
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

/** Tiêu đề và dòng ngày ở đầu trang (hàm thuần). `hai` = đang xem 2 ngày ở tab hiện tại. */
function chuDauTrang({ isTask, isToday, xemTruoc, hai, viewDate, ngayTruoc, homNay, homQua }) {
  const heading = isTask
    ? (isToday ? 'Việc hôm nay' : 'Việc ngày ' + fmtDM(viewDate))
    : (xemTruoc ? 'Khám ngày ' + fmtDM(ngayTruoc) : 'Khám bệnh hôm nay');
  const dateText = hai
    ? `Hôm qua ${fmtDM(homQua)} và hôm nay ${fmtDM(homNay)}`
    : fmtLong(parseIso(isTask ? viewDate : (ngayTruoc || homNay)));
  // iPhone ghi "Thứ Hai, 09/11", không năm (dòng 2 ngày giữ nguyên)
  return { heading, dateText, dateTextPh: hai ? dateText : dateText.replace(/\/\d{4}$/, '') };
}

/**
 * Bảng "…" ở đầu trang iPhone (mức 2): nhóm "Danh sách khám" chỉ có ở tab Khám chế độ Hôm nay (`dsKham`), nhóm "Ứng dụng" luôn có.
 * Trả { nhom, nhan } cho MenuThem; `nhan` là chữ đọc cho nút "…".
 */
function taoMenuThem({ dsKham, layDs, onLayDanhSach, roomEdit, onDoiQuanLyPhong, onMoThuVien, onMoSaoLuu, backupDue }) {
  const nhom = [
    ...(dsKham ? [{ ten: 'Danh sách khám', muc: [
      { khoa: 'lay', bieuTuong: <ChepIcon />, ten: layDs.label, phu: layDs.hintNgan, tat: layDs.none, chon: onLayDanhSach },
      { khoa: 'phong', bieuTuong: <PhongIcon />, ten: roomEdit ? 'Đóng quản lý phòng' : 'Quản lý phòng', phu: 'Đổi tên, thêm hoặc xoá phòng.', chon: onDoiQuanLyPhong }
    ] }] : []),
    { ten: 'Ứng dụng', muc: [
      { khoa: 'vt', bieuTuong: <span className="mt-ic-chu">/a</span>, ten: 'Thư viện viết tắt', chon: onMoThuVien },
      { khoa: 'sl', bieuTuong: <CloudIcon />, ten: 'Sao lưu và cài đặt',
        phu: backupDue ? <><span className="mt-cham" aria-hidden="true" />Nên sao lưu hôm nay</> : null, chon: onMoSaoLuu }
    ] }
  ];
  const nhan = 'Thêm: ' + nhom.flatMap((g) => g.muc.map((m) => m.ten.toLowerCase())).join(', ') + (backupDue ? ' (nên sao lưu hôm nay)' : '');
  return { nhom, nhan };
}

function AppChinh({ mocPhut, homNay, homQua, ngayLich, cheDo, setCheDo }) {
  const hoanTac = useHoanTac();
  const wide = useWide();
  const gio = useGioMay();
  const data = useAppData(homNay);
  const lanMo = useLanMoApp();

  // ----- Trạng thái màn hình -----
  const [tab, setTab] = useState('task');
  const [haiNgay, setHaiNgay] = useState(false);     // v9.6: "2 ngày" dùng chung cho Việc và Khám, giữ khi đổi tab; mỗi lần mở app là "Hôm nay"
  // tab Việc
  const [viewDate, setViewDate] = useState(homNay);
  const [calMonth, setCalMonth] = useState(monthOf(homNay));
  const [calOpen, setCalOpen] = useState(true);      // PC: lịch trong cột trái
  const [calSheet, setCalSheet] = useState(false);   // iPhone: lịch trượt lên
  const [active, setActive] = useState('all');
  const [newZone, setNewZone] = useState('NICU');
  const [newTags, setNewTags] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  // tab Khám
  const [roomCollapsed, setRoomCollapsed] = useState({});
  const [roomEdit, setRoomEdit] = useState(false);
  const [selPid, setSelPid] = useState(null);
  const [sumOpen, setSumOpen] = useState(false);
  const [ngayTruoc, setNgayTruoc] = useState(null);  // v9.5: đang xem lại một ngày trước ở tab Khám (chỉ xem); null = hôm nay
  const [lichKham, setLichKham] = useState(false);
  // bảng dùng chung
  const [backupOpen, setBackupOpen] = useState(false);
  const [vtOpen, setVtOpen] = useState(false);
  // iPhone: câu báo "Đã chép n bệnh nhân." sau khi bấm "Lấy danh sách hôm qua" trong bảng "…" (3 giây)
  const [baoChep, hienBaoChep] = useBaoTam(3000);

  useEffect(() => { ensureSeed(); }, []);

  // Qua ngày làm việc mới (qua mốc, hoặc mở lại app): đưa mục Việc và Khám về hôm nay
  useEffect(() => { setViewDate(homNay); setCalMonth(monthOf(homNay)); setNgayTruoc(null); }, [homNay]);

  // ----- Dữ liệu và số đếm (mỗi số một lượt duyệt, chỉ tính lại khi dữ liệu đổi) -----
  const { tasks, rooms, roomsHomNay, patients, todosByPid, prev, roomUse, roomUsePast, lastExport } = data;
  const dayTasks = useMemo(() => tasks.filter((t) => t.date === viewDate), [tasks, viewDate]);
  const overdue = useMemo(() => tasks.reduce((n, t) => n + (t.date < homNay && !t.done ? 1 : 0), 0), [tasks, homNay]);
  const examLeft = useMemo(
    () => patients.reduce((n, p) => n + (todosByPid[p.id] || []).reduce((k, t) => k + (t.done ? 0 : 1), 0), 0),
    [patients, todosByPid]
  );
  const isTask = tab === 'task';
  const [done, total] = useMemo(() => {
    const ds = isTask ? dayTasks : patients;
    return [ds.reduce((n, x) => n + (x.done ? 1 : 0), 0), ds.length];
  }, [isTask, dayTasks, patients]);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const isToday = viewDate === homNay;
  const sel = selPid ? patients.find((p) => p.id === selPid) : undefined;
  const tenPhong = (p) => roomsHomNay.find((r) => r.id === p.roomId)?.name || '';
  const backupDue = !lastExport || Date.now() - lastExport.at > MOT_NGAY_MS;

  // ----- Đang xem gì -----
  const xemTruoc = !isTask && !!ngayTruoc;   // tab Khám đang xem ngày trước
  // 2 ngày: nút gạt ẩn khi đang xem một ngày khác (lịch Việc, ngày trước của Khám)
  const coGat = isTask ? isToday : !xemTruoc;
  const dang2Viec = isTask && isToday && haiNgay;
  const dang2Kham = !isTask && !xemTruoc && haiNgay;
  const dsKham = !isTask && !xemTruoc && !dang2Kham;   // Khám ở chế độ Hôm nay: có "Lấy danh sách", "Quản lý phòng"
  const { heading, dateText, dateTextPh } = chuDauTrang({ isTask, isToday, xemTruoc, hai: dang2Viec || dang2Kham, viewDate, ngayTruoc, homNay, homQua });
  const tienDo = xemTruoc ? '' : `${isTask ? 'Đã xong' : 'Đã khám'} ${done}/${total}`;
  // đang TRƯỚC mốc (vd. 02:30 ngày 05/11, mốc 07:00): "hôm nay" của app là ngày làm việc 04/11, ghi rõ để khỏi nhầm
  const truocMoc = homNay !== ngayLich;

  // Việc 2 ngày: việc chưa xong của ĐÚNG ngày làm việc trước ("Còn từ hôm qua")
  const hq = useViecNgay(dang2Viec ? homQua : '');
  const conHomQua = useMemo(
    () => (dang2Viec ? viecConTuHomQua(hq.tasks, { homQua, homNay, mocPhut }) : []),
    [dang2Viec, hq.tasks, homQua, homNay, mocPhut]
  );

  // ----- Thao tác -----
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
  const layDanhSach = async () => hienBaoChep(await chepDanhSach(prev, homNay));

  if (!data.ready) return <div className="loading">Đang mở dữ liệu…</div>;

  // ----- Mảnh giao diện dùng cho cả PC và iPhone -----
  const tabs = (
    <div className={'seg' + (wide ? '' : ' full')}>
      <button type="button" aria-pressed={isTask} onClick={() => setTab('task')}>Việc</button>
      <button type="button" aria-pressed={!isTask} onClick={() => setTab('exam')}>Khám</button>
    </div>
  );
  const daiMoc = truocMoc && coGat && (
    <div role="status" className="dai-moc">Ngày làm việc {fmtDM(homNay)} (đang là {gio}, {fmtDM(ngayLich)})</div>
  );
  const examHint = isTask && isToday && examLeft > 0 && (
    <button type="button" className="exam-hint" onClick={() => setTab('exam')}>Khám: còn {examLeft} việc</button>
  );
  const clearDoneBtn = isTask && done > 0 && (
    <button type="button" className="btn ghost self-start" onClick={xoaDaXong}>Xoá việc đã xong</button>
  );
  const bangChung = (
    <>
      {backupOpen && (
        <Sheet label="Sao lưu và cài đặt" onClose={() => setBackupOpen(false)} wide={wide}>
          <BackupPanel onClose={() => setBackupOpen(false)} cheDo={cheDo} onDoiCheDo={setCheDo} />
        </Sheet>
      )}
      {lichKham && !isTask && (
        <Sheet label="Lịch khám" className="sheet-lich" wide={wide} onClose={() => setLichKham(false)}>
          <LichKham today={homNay} dangXem={ngayTruoc} wide={wide} onXemNgay={xemNgayTruoc} onVeHomNay={veHomNayKham} onClose={() => setLichKham(false)} />
        </Sheet>
      )}
      {vtOpen && <ThuVien wide={wide} onClose={() => setVtOpen(false)} />}
    </>
  );

  // ===================== PC =====================
  if (wide) {
    const gat = coGat && <GatHaiNgay haiNgay={haiNgay} onDoi={doiPhamVi} ghiChu={isTask ? '' : 'Ghép theo phòng và mã'} />;
    const vtBtn = (
      <button type="button" className="round-btn vt-btn" onClick={() => setVtOpen(true)} aria-label="Thư viện viết tắt">/a</button>
    );
    const backupBtn = (
      <button type="button" className="round-btn rel" onClick={() => setBackupOpen(true)} aria-label={'Sao lưu và cài đặt' + (backupDue ? ' (nên sao lưu hôm nay)' : '')}>
        <CloudIcon />{backupDue && <span className="dot-alert" />}
      </button>
    );
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
          {dsKham && <ExamActions prev={prev} today={homNay} roomEdit={roomEdit} onToggleRoomEdit={() => setRoomEdit(!roomEdit)} />}

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
              <RoomList rooms={roomsHomNay} patients={patients} todosByPid={todosByPid} collapsed={roomCollapsed}
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
        {bangChung}
      </div>
    );
  }

  // ===================== iPhone =====================
  // Mức 2: đầu trang gọn, việc ít dùng nằm trong bảng "…"
  const menu = taoMenuThem({
    dsKham, layDs: thongTinLayDanhSach(prev, homNay), onLayDanhSach: layDanhSach, roomEdit, backupDue,
    onDoiQuanLyPhong: () => setRoomEdit(!roomEdit), onMoThuVien: () => setVtOpen(true), onMoSaoLuu: () => setBackupOpen(true)
  });
  return (
    <div className="phone-app">
      <header className="ph-head">
        <div className="ph-r1">
          <div className="ph-tieu">
            <div className="ph-ngay">
              <span className="ph-ngay-chu">{dateTextPh}</span>
              {tienDo && <><span className="ph-ngay-cach" aria-hidden="true"> · </span><b className="ph-tiendo">{tienDo}</b></>}
            </div>
            <h1 className="h1 h1-ph">{heading}</h1>
          </div>
          {isTask ? (
            <button type="button" className="round-btn rel" onClick={() => setCalSheet(true)} aria-label="Mở lịch">
              <CalIcon />{overdue > 0 && <span className="badge">{overdue}</span>}
            </button>
          ) : (
            <button type="button" className={'round-btn rel' + (xemTruoc ? ' on' : '')} onClick={() => setLichKham(true)} aria-label="Lịch khám">
              <CalIcon />
            </button>
          )}
          <MenuThem key={tab + (dsKham ? 'k' : '')} nhan={menu.nhan} canhBao={backupDue} nhom={menu.nhom} />
        </div>
        {daiMoc}
        <div className="ph-r2">
          <div className="ph-seg">{tabs}</div>
          {coGat && <button type="button" className="ph-2ngay" aria-pressed={haiNgay} onClick={() => doiPhamVi(!haiNgay)}>2 ngày</button>}
          {isTask && !isToday && <button type="button" className="ph-vehn" onClick={goToday}>Về hôm nay</button>}
        </div>
        {baoChep && <div role="status" className="ph-chep">{baoChep}</div>}
      </header>

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
          {roomEdit && <RoomManager rooms={rooms} roomUse={roomUse} roomUsePast={roomUsePast} homNay={homNay} />}
          <RoomList rooms={roomsHomNay} patients={patients} todosByPid={todosByPid} collapsed={roomCollapsed}
            onToggle={toggleIn(setRoomCollapsed)} selPid={selPid} onOpen={setSelPid} today={homNay} />
          <div className="tong-hop-wrap"><button type="button" className="btn" onClick={() => setSumOpen(true)}>Tổng hợp y lệnh</button></div>
        </main>
      )}

      {calSheet && isTask && (
        <Sheet label="Lịch công việc" className="sheet-lich" onClose={() => setCalSheet(false)}>
          <LichViec tasks={tasks} viewDate={viewDate} today={homNay} month={calMonth} setMonth={setCalMonth}
            onPick={setViewDate} onClose={() => setCalSheet(false)} />
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
      {bangChung}
    </div>
  );
}
