// Mục Khám: phòng, bệnh nhân, chi tiết bé, tổng hợp y lệnh.
import { useEffect, useRef, useState } from 'react';
import {
  addRoom, renameRoom, removeRoom, addPatient, updatePatient, setPatientDone, removePatient,
  addTodo, toggleTodo, removeTodo, khoiPhucTodo, setTodoText, copyPatientsFrom
} from '../lib/actions.js';
import { calcAge, gaFmt, copyText } from '../lib/clinical.js';
import { addDays, fmtDM } from '../lib/dates.js';
import { boDemCham, themCham, gioXong, chuanTenViec } from '../lib/viec.js';
import { useVietTat } from './VietTat.jsx';
import { useHoanTac } from './HoanTac.jsx';
import { useTuLuu } from './Tasks.jsx';
import { Chevron, XIcon, SheetHead, SwipeRow, Sheet, DongBtn, TickOk, TrangThaiXong, TrashIcon, PlusIcon } from './ui.jsx';

/** Nút "Lấy danh sách hôm qua" + "Quản lý phòng". */
export function ExamActions({ prev, today, roomEdit, onToggleRoomEdit, compact }) {
  const [msg, setMsg] = useState('');
  const none = !prev.date || prev.count === 0;
  const isYesterday = prev.date === addDays(today, -1);
  const label = none || isYesterday ? 'Lấy danh sách hôm qua' : `Lấy danh sách ngày ${fmtDM(prev.date)}`;
  const hint = none
    ? 'Chưa có danh sách ngày trước.'
    : `Chép ${prev.count} bệnh nhân của ${isYesterday ? 'hôm qua' : 'ngày ' + fmtDM(prev.date)}, kèm việc chưa xong. Bệnh nhân đã có trong danh sách hôm nay sẽ không bị trùng.`;
  const run = async () => {
    const n = await copyPatientsFrom(prev.date, today);
    setMsg(n ? `Đã chép ${n} bệnh nhân.` : 'Không có bệnh nhân mới để chép.');
    setTimeout(() => setMsg(''), 3000);
  };
  return (
    <div className="stack6">
      <div className={compact ? 'row8 wrap' : 'stack8'}>
        <button type="button" className="btn primary left" disabled={none} onClick={run}>{label}</button>
        <button type="button" className="btn left" aria-expanded={roomEdit} onClick={onToggleRoomEdit}>Quản lý phòng</button>
      </div>
      <div className="muted xsmall">{msg || hint}</div>
    </div>
  );
}

function RoomNameInput({ room }) {
  const [v, setV] = useState(room.name);
  const t = useRef();
  useEffect(() => setV(room.name), [room.name]);
  const save = (val) => { clearTimeout(t.current); const n = val.trim(); if (n && n !== room.name) renameRoom(room.id, n); };
  return (
    <label className="grow row0">
      <span className="sr-only">Tên phòng</span>
      <input type="text" className="input grow" value={v}
        onChange={(e) => { const x = e.target.value; setV(x); clearTimeout(t.current); t.current = setTimeout(() => save(x), 600); }}
        onBlur={(e) => save(e.target.value)} />
    </label>
  );
}

export function RoomManager({ rooms, roomUse }) {
  const [draft, setDraft] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    setDraft('');
    await addRoom(name);
  };
  return (
    <section aria-label="Quản lý phòng" className="card stack8">
      <div className="bold">Danh sách phòng</div>
      {rooms.map((r) => {
        const locked = (roomUse[r.id] || 0) > 0;
        return (
          <div key={r.id} className="row4">
            <RoomNameInput room={r} />
            <button type="button" className="icon-btn muted" disabled={locked} style={{ opacity: locked ? 0.35 : 1 }}
              aria-label={locked ? `Không xoá được ${r.name} vì còn bệnh nhân` : `Xoá ${r.name}`} onClick={() => removeRoom(r.id)}><XIcon /></button>
          </div>
        );
      })}
      <form onSubmit={submit} className="row8">
        <label className="grow row0">
          <span className="sr-only">Tên phòng mới</span>
          <input type="text" className="input grow" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Tên phòng mới" autoComplete="off" />
        </label>
        <button type="submit" className="btn primary">Thêm phòng</button>
      </form>
      <div className="muted xsmall">Chỉ xoá được phòng chưa có bệnh nhân nào.</div>
    </section>
  );
}

/**
 * Dòng bé (v9.4): không ô vuông, không mũi tên. Vuốt PHẢI qua 1/3 = đã khám (setPatientDone); không vuốt trái, không nút xoá.
 * Bé đã khám vuốt phải chỉ nhúc nhích. Chạm 1 lần (hoặc Tab + Enter) mở chi tiết; SwipeRow chặn cú click ngay sau khi vuốt.
 * Đã khám: chữ nhạt (--muted), không gạch ngang, tích xanh cuối dòng; "Còn n việc" vẫn hiện để không sót việc.
 */
function PatientRow({ p, todos, selected, onOpen }) {
  const left = todos.filter((t) => !t.done).length;
  const sub = [gaFmt(p.ga), p.wt ? p.wt + ' g' : ''].filter(Boolean).join(', ') || 'Chưa có thông tin';
  return (
    <SwipeRow className={'pat-row' + (selected ? ' sel' : '') + (p.done ? ' xong' : '')} kind="bé" label={p.code || 'bệnh nhân'}
      daXong={!!p.done} onDone={() => { if (!p.done) setPatientDone(p, true); }}>
      <button type="button" className="pat-open" onClick={onOpen}>
        <span className="pat-main">
          <span className="pat-code">{p.code || 'Chưa có mã'}</span>
          <span className="muted small">{sub}</span>
          {todos.length > 0 && (
            <span className="pat-todos">
              {todos.map((t) => <span key={t.id} className={'pat-todo' + (t.done ? ' xong' : '')}>{t.text}</span>)}
            </span>
          )}
          {p.note?.trim() && <span className="pat-note">Ghi chú: {p.note}</span>}
        </span>
        {left > 0 && <span className="left-badge">Còn {left} việc</span>}
      </button>
      {p.done && <TickOk nhan="Đã khám" />}
    </SwipeRow>
  );
}

export function RoomList({ rooms, patients, todosByPid, collapsed, onToggle, selPid, onOpen, today }) {
  // Phòng đang thu gọn: mở phòng ra rồi mới thêm, rồi mở chi tiết bé mới.
  const add = async (r, dangMo) => {
    if (!dangMo) onToggle(r.id);
    const p = await addPatient(r.id, today);
    onOpen(p.id);
  };
  return rooms.map((r) => {
    const ps = patients.filter((p) => p.roomId === r.id);
    const dn = ps.filter((p) => p.done).length;
    const open = !collapsed[r.id];
    return (
      <section key={r.id} className="group">
        <div className="room-h">
          <h2 className="group-h">
            <button type="button" className="group-btn" aria-expanded={open} onClick={() => onToggle(r.id)}>
              <Chevron style={{ transform: `rotate(${open ? 90 : 0}deg)` }} />
              <span className="group-title">{r.name}</span>
              <span className="muted small">{ps.length ? `Đã khám ${dn}/${ps.length}` : 'Chưa có bệnh nhân'}</span>
            </button>
          </h2>
          {/* nút "+" nằm NGOÀI nút thu gọn: chạm "+" không làm thu gọn phòng */}
          <button type="button" className="room-add" aria-label={'Thêm bé vào ' + r.name} onClick={() => add(r, open)}>
            <span className="room-add-o"><PlusIcon size={16} /></span>
          </button>
        </div>
        {open && ps.length > 0 && (
          <div className="stack8">
            {ps.map((p) => (
              <PatientRow key={p.id} p={p} todos={todosByPid[p.id] || []} selected={selPid === p.id} onOpen={() => onOpen(p.id)} />
            ))}
          </div>
        )}
      </section>
    );
  });
}

/** Một việc cần làm của bé: vuốt phải = xong, vuốt trái = xoá (có Hoàn tác), chạm 2 lần = bảng nhỏ sửa tên / bỏ đánh dấu xong / xoá. */
function TodoRow({ t, onOpen }) {
  const hoanTac = useHoanTac();
  const taps = useRef([]);
  const tap = () => {
    taps.current = themCham(taps.current, Date.now());
    if (boDemCham(taps.current, 2)) { taps.current = []; onOpen(t.id); }
  };
  const xoa = async () => {
    await removeTodo(t.id);
    hoanTac.hien({ nhan: 'Đã xoá: ' + t.text, lam: () => khoiPhucTodo(t.id) });
  };
  return (
    <SwipeRow className={'todo-row' + (t.done ? ' xong' : '')} label={t.text} daXong={!!t.done}
      onDone={() => { if (!t.done) toggleTodo(t); }} onDelete={xoa}>
      <div className="todo-main" role="button" tabIndex={0} aria-label={'Mở chi tiết việc của bé: ' + t.text}
        onClick={tap} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(t.id); }}>
        <span className={'todo-text' + (t.done ? ' done' : '')}>{t.text}</span>
      </div>
      {t.done && <TickOk />}
    </SwipeRow>
  );
}

/** Bảng nhỏ chi tiết việc của bé (mở trên bảng chi tiết bé nếu đang mở). Tên tự lưu; ô tên có viết tắt. */
function TodoDetail({ t, wide, onClose }) {
  const hoanTac = useHoanTac();
  const [ten, doiTen, luuTen, datLaiTen, boTen] = useTuLuu(t.text, (x) => { setTodoText(t.id, x); });
  const vt = useVietTat(ten, doiTen, { onBlur: () => { luuTen(); if (!ten.trim()) datLaiTen(t.text); } });
  // Xoá việc: bảng trượt xuống trước (DongBtn), xong mới xoá rồi hiện thanh Hoàn tác.
  const xoaViec = async () => {
    boTen();
    await removeTodo(t.id);
    onClose();
    hoanTac.hien({ nhan: 'Đã xoá: ' + t.text, lam: () => khoiPhucTodo(t.id) });
  };
  return (
    <Sheet label="Chi tiết việc của bé" onClose={onClose} wide={wide} className="sheet-todo">
      <div className="row-between sheet-r1">
        <label htmlFor="ten-viec-be" className="sr-only">Nội dung việc của bé</label>
        <textarea id="ten-viec-be" className="sheet-name" rows={ten.length > 52 ? 3 : ten.length > 26 ? 2 : 1} autoComplete="off" {...vt.props}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} />
        <DongBtn className="icon-btn" aria-label="Đóng" onClose={onClose}><XIcon /></DongBtn>
      </div>
      {vt.strip}
      <TrangThaiXong xong={!!t.done} gio={gioXong(t.doneAt)} onDanhDau={() => toggleTodo(t)} onBo={() => toggleTodo(t)} />
      <div className="row8 sheet-r4">
        <DongBtn className="sheet-del-task" onClose={xoaViec}><TrashIcon size={18} />Xoá việc</DongBtn>
        <span className="grow" />
        <DongBtn className="btn primary big sheet-done" onClose={onClose}>Xong</DongBtn>
      </div>
    </Sheet>
  );
}

/**
 * Chi tiết một bé (v9.4, bảng 16b). Gõ tới đâu lưu tới đó (sau 0,4 giây ngừng gõ).
 * `wide`: PC (bảng nhỏ mở giữa màn hình). `phong`: tên phòng của bé (chip cạnh ô mã).
 * Đóng (nút X, "Xong", Esc, chạm nền): lưu nốt rồi đóng; trên iPhone có chuyển động trượt xuống, trên PC (cột phải) đóng ngay.
 */
export function PatientDetail({ p, todos, onClose, wide = false, phong = '' }) {
  const [todoMoId, setTodoMoId] = useState(null);
  const todoMo = todoMoId ? todos.find((t) => t.id === todoMoId) : null;
  const [f, setF] = useState({ code: p.code, dob: p.dob, ga: p.ga, wt: p.wt, note: p.note });
  const [calc, setCalc] = useState(null);
  const [todoDraft, setTodoDraft] = useState('');
  const todoRef = useRef('');           // chữ mới nhất của ô thêm việc, để bấm "+" liên tiếp nhanh không tạo trùng
  const datTodo = (x) => { todoRef.current = x; setTodoDraft(x); };
  const pending = useRef({});
  const timer = useRef();
  const maRef = useRef(null);
  const flush = () => {
    clearTimeout(timer.current);
    const ch = pending.current;
    pending.current = {};
    if (Object.keys(ch).length) updatePatient(p.id, ch);
  };
  useEffect(() => () => flush(), []); // lưu nốt khi đóng
  // Bé mới (chưa có mã): đặt con trỏ vào ô mã để gõ ngay. Bé đã có mã thì không tự bật bàn phím.
  useEffect(() => { if (!p.code) maRef.current?.focus({ preventScroll: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const setField = (k, v) => {
    setF((x) => ({ ...x, [k]: v }));
    pending.current[k] = v;
    if (k === 'dob' || k === 'ga') setCalc(null); // sửa ngày sinh hoặc tuổi thai thì xoá kết quả tuổi cũ; chỉ tính lại khi bấm nút
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 400);
  };
  const set = (k) => (e) => setField(k, e.target.value);
  const dong = () => { flush(); onClose(); }; // MỘT đường đóng cho nút X và "Xong" (DongBtn thêm chuyển động trên iPhone)
  const vtNote = useVietTat(f.note, (x) => setField('note', x), { onBlur: flush });
  const vtTodo = useVietTat(todoDraft, datTodo);
  const oViecRef = vtTodo.props.ref;
  const submitTodo = async (e) => {
    e.preventDefault();
    const text = chuanTenViec(vtTodo.chot(todoRef.current)); // thay chữ tắt ở cuối rồi mới cắt khoảng trắng
    oViecRef.current?.focus();                                // giữ con trỏ để thêm tiếp
    if (!text) return;
    datTodo('');
    await addTodo(p.id, text);
  };
  const del = async () => {
    if (!window.confirm(`Xoá ${f.code || 'bệnh nhân này'} khỏi danh sách hôm nay?`)) return;
    pending.current = {};
    await removePatient(p.id);
    onClose();
  };
  const left = todos.filter((t) => !t.done).length;
  const giuConTro = (e) => e.preventDefault(); // chạm "+" không làm ô gõ mất con trỏ (bàn phím iPhone không tụt)
  const field = (k, label, extra = {}) => (
    <label className="field">
      <span className="muted small">{label}</span>
      <input type="text" className="input" value={f[k]} onChange={set(k)} onBlur={flush} autoComplete="off"
        inputMode="numeric" placeholder={extra.ph} aria-label={extra.ten} />
    </label>
  );
  return (
    <>
      <div className="be-head">
        <label htmlFor="be-ma" className="sr-only">Mã / giường</label>
        <input id="be-ma" ref={maRef} type="text" className="be-ma" value={f.code} onChange={set('code')} onBlur={flush}
          autoComplete="off" placeholder="Mã / giường" />
        {phong && <span className="be-phong">{phong}</span>}
        <DongBtn className="icon-btn" aria-label="Đóng chi tiết" onClose={dong}><XIcon /></DongBtn>
      </div>

      <div className="be-3">
        {field('dob', 'Ngày sinh', { ph: '0810' })}
        {field('ga', 'Tuổi thai', { ph: '346', ten: 'Tuổi thai lúc sinh' })}
        {field('wt', 'Cân nặng, g', { ph: '1850' })}
      </div>

      <div className="be-tuoi">
        <button type="button" className="btn outline-accent" onClick={() => setCalc(calcAge(f))}>Tính tuần tuổi</button>
        {!calc?.err && (
          calc ? (
            <div className="be-kq" role="status">
              <span>Ngày tuổi<b>{calc.days}</b></span>
              <span>Hiệu chỉnh<b>{calc.pma}</b></span>
            </div>
          ) : <div className="be-kq be-kq-trong">Bấm nút để tính ngày tuổi và tuổi thai hiệu chỉnh.</div>
        )}
      </div>
      {calc?.err && <div className="err-box" role="alert">{calc.err}</div>}

      <h3 className="be-viec-h">Việc cần làm{todos.length > 0 && <span className="muted small">Còn {left}/{todos.length}</span>}</h3>
      {todos.length > 0 && (
        <div className="stack8">
          {todos.map((t) => <TodoRow key={t.id} t={t} onOpen={setTodoMoId} />)}
        </div>
      )}
      {vtTodo.strip}
      <form onSubmit={submitTodo} className="be-them">
        <label className="grow row0">
          <span className="sr-only">Việc cần làm mới</span>
          <input type="text" className="tf-in" {...vtTodo.props} placeholder="Thêm việc cần làm…" autoComplete="off" />
        </label>
        <button type="submit" className="tf-plus" aria-label="Thêm việc của bé" onPointerDown={giuConTro} onMouseDown={giuConTro}><PlusIcon /></button>
      </form>

      <label htmlFor="ghichu-be" className="sheet-nhan">Ghi chú</label>
      {vtNote.strip}
      <textarea id="ghichu-be" rows={3} className="be-note" placeholder="Ghi chú… (gõ / để viết tắt)" {...vtNote.props} />

      <TrangThaiXong xong={!!p.done} gio={gioXong(p.doneAt)} chuaChu="Chưa khám" xongChu="Đã khám"
        nutDanhDau="Hoàn tất khám" nutBo="Bỏ đánh dấu đã khám"
        onDanhDau={() => setPatientDone(p, true)} onBo={() => setPatientDone(p, false)} />

      <div className="row8 sheet-r4">
        <button type="button" className="sheet-del-task" onClick={del}><TrashIcon size={18} />Xoá khỏi hôm nay</button>
        <span className="grow" />
        <DongBtn className="btn primary big sheet-done" onClose={dong}>Xong</DongBtn>
      </div>
      {todoMo && <TodoDetail key={todoMo.id} t={todoMo} wide={wide} onClose={() => setTodoMoId(null)} />}
    </>
  );
}
/** Tổng hợp y lệnh: sửa được, sao chép để gửi đồng nghiệp. */
export function SummaryPanel({ build, onClose }) {
  const [text, setText] = useState(build);
  const [msg, setMsg] = useState('');
  const vt = useVietTat(text, (x) => { setText(x); setMsg(''); });
  const copy = async () => {
    const ok = await copyText(text);
    setMsg(ok ? 'Đã sao chép' : 'Chưa sao chép được, hãy chọn hết nội dung trong khung rồi sao chép.');
  };
  return (
    <>
      <SheetHead title="Tổng hợp y lệnh" onClose={onClose} closeLabel="Đóng tổng hợp" />
      <div className="field">
        <label htmlFor="tonghop-noidung" className="sr-only">Nội dung tổng hợp, có thể sửa trước khi sao chép</label>
        {vt.strip}
        <textarea id="tonghop-noidung" rows={14} className="input textarea mono" {...vt.props} />
      </div>
      <div className="row8 wrap">
        <button type="button" className="btn primary big grow-ph" onClick={copy}>Sao chép</button>
        <button type="button" className="btn big" onClick={() => { setText(build()); setMsg(''); }}>Soạn lại</button>
        {msg && <span role="status" className="status">{msg}</span>}
      </div>
    </>
  );
}
