import { useEffect, useMemo, useState } from 'react';
import { useAppData, useToday, useWide } from './hooks.js';
import { ensureSeed, clearDone } from './lib/actions.js';
import { buildSummary } from './lib/clinical.js';
import { ZONES } from './db.js';
import { fmtLong, fmtDM, parseIso } from './lib/dates.js';
import { ZoneNav, TaskGroups, TaskForm, Calendar, monthOf } from './components/Tasks.jsx';
import { ExamActions, RoomManager, RoomList, PatientDetail, SummaryPanel } from './components/Exam.jsx';
import ThuVien from './components/ThuVien.jsx';
import { VietTatProvider } from './components/VietTat.jsx';
import BackupPanel from './components/BackupPanel.jsx';
import { Sheet, Sun, Moon, CalIcon, CloudIcon, Chevron } from './components/ui.jsx';

function readTheme() {
  try {
    const v = localStorage.getItem('theme');
    if (v) return v === 'dark';
  } catch { /* bỏ qua */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export default function App() {
  return <VietTatProvider><AppChinh /></VietTatProvider>;
}

function AppChinh() {
  const today = useToday();
  const wide = useWide();
  const data = useAppData(today);

  const [tab, setTab] = useState('task');
  const [dark, setDark] = useState(readTheme);
  const [viewDate, setViewDate] = useState(today);
  const [calMonth, setCalMonth] = useState(monthOf(today));
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

  useEffect(() => { ensureSeed(); }, []);
  useEffect(() => {
    const el = document.documentElement;
    el.classList.add('th');
    el.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0E151C' : '#F2F7FB');
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch { /* bỏ qua */ }
  }, [dark]);
  // Qua ngày mới: đưa mục Việc về hôm nay
  useEffect(() => { setViewDate(today); setCalMonth(monthOf(today)); }, [today]);

  const { tasks, rooms, patients, todosByPid, prev, roomUse, lastExport } = data;
  const dayTasks = useMemo(() => tasks.filter((t) => t.date === viewDate), [tasks, viewDate]);
  const overdue = tasks.filter((t) => t.date < today && !t.done).length;
  const isTask = tab === 'task';
  const isToday = viewDate === today;
  const sel = patients.find((p) => p.id === selPid);
  const examLeft = patients.reduce((n, p) => n + (todosByPid[p.id] || []).filter((t) => !t.done).length, 0);
  const backupDue = !lastExport || Date.now() - lastExport.at > 24 * 3600 * 1000;

  const total = isTask ? dayTasks.length : patients.length;
  const done = isTask ? dayTasks.filter((t) => t.done).length : patients.filter((p) => p.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const heading = isTask ? (isToday ? 'Việc hôm nay' : 'Việc ngày ' + fmtDM(viewDate)) : 'Khám bệnh hôm nay';
  const dateText = fmtLong(parseIso(isTask ? viewDate : today));

  // khu cũ (BM) không có trong ô chọn khu khi thêm việc
  const pickZone = (k) => { setActive(k); if (ZONES.includes(k)) setNewZone(k); };
  const toggleIn = (setter) => (k) => setter((c) => ({ ...c, [k]: !c[k] }));
  const goToday = () => { setViewDate(today); setCalMonth(monthOf(today)); };
  const summary = () => buildSummary({ rooms, patients, todosByPid });
  const clearDoneBtn = isTask && dayTasks.some((t) => t.done) && (
    <button type="button" className="btn ghost self-start" onClick={() => clearDone(viewDate)}>Xoá việc đã xong</button>
  );

  const themeBtn = (
    <button type="button" className="round-btn" onClick={() => setDark(!dark)} aria-label={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}>
      {dark ? <Sun /> : <Moon />}
    </button>
  );
  const backupBtn = (
    <button type="button" className="round-btn rel" onClick={() => setBackupOpen(true)} aria-label={'Sao lưu' + (backupDue ? ' (nên sao lưu hôm nay)' : '')}>
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
    <Sheet label="Sao lưu" onClose={() => setBackupOpen(false)} wide={wide}>
      <BackupPanel onClose={() => setBackupOpen(false)} />
    </Sheet>
  );

  if (!data.ready) return <div className="loading">Đang mở dữ liệu…</div>;

  // ===================== PC =====================
  if (wide) {
    return (
      <div className="pc">
        <div className="pc-top">
          {tabs}
          <div className="row8">{vtBtn}{backupBtn}{themeBtn}</div>
        </div>

        <aside className="pc-side">
          <div className="stack4">
            <div className="muted small">{dateText}</div>
            <h1 className="h1">{heading}</h1>
          </div>
          <div className="stack8">
            <div className="row-between muted small"><span>{isTask ? 'Đã hoàn thành' : 'Đã khám'}</span><span>{done}/{total}</span></div>
            <div className="bar"><div style={{ width: pct + '%' }} /></div>
          </div>

          {!isTask && <ExamActions prev={prev} today={today} roomEdit={roomEdit} onToggleRoomEdit={() => setRoomEdit(!roomEdit)} />}

          {isTask && (
            <>
              <div className="stack8">
                <button type="button" className="btn cal-toggle" aria-expanded={calOpen} onClick={() => setCalOpen(!calOpen)}>
                  <CalIcon /><span className="grow left-text">Lịch</span>
                  {overdue > 0 && <span className="badge">{overdue}</span>}
                  <Chevron dir="down" style={{ transform: `rotate(${calOpen ? 180 : 0}deg)` }} />
                </button>
                {calOpen && <Calendar tasks={tasks} viewDate={viewDate} today={today} month={calMonth} setMonth={setCalMonth} onPick={setViewDate} />}
                {!isToday && <button type="button" className="btn tint" onClick={goToday}>Về hôm nay</button>}
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
            <TaskGroups dayTasks={dayTasks} active={active} collapsed={collapsed} onToggle={toggleIn(setCollapsed)} />
          </main>
        ) : (
          <>
            <main className="pc-main exam">
              {roomEdit && <RoomManager rooms={rooms} roomUse={roomUse} />}
              <RoomList rooms={rooms} patients={patients} todosByPid={todosByPid} collapsed={roomCollapsed}
                onToggle={toggleIn(setRoomCollapsed)} selPid={selPid} onOpen={setSelPid} today={today} />
              <div><button type="button" className="btn" aria-expanded={sumOpen} onClick={() => setSumOpen(true)}>Tổng hợp</button></div>
              {sumOpen && <section className="card stack10" aria-label="Tổng hợp y lệnh"><SummaryPanel build={summary} onClose={() => setSumOpen(false)} /></section>}
            </main>
            {sel && (
              <aside className="card pc-detail" aria-label="Chi tiết bệnh nhân">
                <PatientDetail key={sel.id} p={sel} todos={todosByPid[sel.id] || []} onClose={() => setSelPid(null)} />
              </aside>
            )}
          </>
        )}
        {backupSheet}
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
            {themeBtn}
            {isTask && (
              <button type="button" className="pill-btn" onClick={() => setCalSheet(true)} aria-label="Mở lịch">
                <CalIcon />{overdue > 0 && <span className="badge">{overdue}</span>}
              </button>
            )}
          </div>
        </div>
        <div className="row10">
          <div className="bar grow thin"><div style={{ width: pct + '%' }} /></div>
          <div className="prog-text">{isTask ? 'Đã hoàn thành' : 'Đã khám'} {done}/{total}</div>
          {isTask && !isToday && <button type="button" className="btn tint sm" onClick={goToday}>Về hôm nay</button>}
        </div>
      </header>
      <div className="ph-tabs">{tabs}</div>

      {isTask ? (
        <>
          <ZoneNav chips dayTasks={dayTasks} active={active} onPick={pickZone} />
          <main className="ph-main">
            {examHint}
            {dayTasks.length > 0 && <div className="muted xsmall">Chạm 2 lần: chi tiết · Vuốt trái: xoá</div>}
            <TaskGroups chips dayTasks={dayTasks} active={active} collapsed={collapsed} onToggle={toggleIn(setCollapsed)} />
            {clearDoneBtn}
          </main>
          <TaskForm variant="ph" date={viewDate} zone={newZone} setZone={setNewZone} tags={newTags} setTags={setNewTags} />
        </>
      ) : (
        <main className="ph-main exam">
          <ExamActions compact prev={prev} today={today} roomEdit={roomEdit} onToggleRoomEdit={() => setRoomEdit(!roomEdit)} />
          {roomEdit && <RoomManager rooms={rooms} roomUse={roomUse} />}
          <RoomList compact rooms={rooms} patients={patients} todosByPid={todosByPid} collapsed={roomCollapsed}
            onToggle={toggleIn(setRoomCollapsed)} selPid={selPid} onOpen={setSelPid} today={today} />
          <div><button type="button" className="btn" onClick={() => setSumOpen(true)}>Tổng hợp</button></div>
        </main>
      )}

      {calSheet && isTask && (
        <Sheet label="Lịch" onClose={() => setCalSheet(false)}>
          <Calendar tasks={tasks} viewDate={viewDate} today={today} month={calMonth} setMonth={setCalMonth}
            onPick={(d) => setViewDate(d)} onClose={() => setCalSheet(false)} />
        </Sheet>
      )}
      {sel && !isTask && (
        <Sheet label="Chi tiết bệnh nhân" onClose={() => setSelPid(null)}>
          <PatientDetail key={sel.id} p={sel} todos={todosByPid[sel.id] || []} onClose={() => setSelPid(null)} />
        </Sheet>
      )}
      {sumOpen && !isTask && (
        <Sheet label="Tổng hợp y lệnh" onClose={() => setSumOpen(false)}>
          <SummaryPanel build={summary} onClose={() => setSumOpen(false)} />
        </Sheet>
      )}
      {backupSheet}
      {vtSheet}
    </div>
  );
}
