// Mục Khám: phòng, bệnh nhân, chi tiết bé, tổng hợp y lệnh.
import { useEffect, useRef, useState } from 'react';
import {
  addRoom, renameRoom, removeRoom, addPatient, updatePatient, removePatient,
  addTodo, toggleTodo, removeTodo, copyPatientsFrom
} from '../lib/actions.js';
import { calcAge, gaFmt, copyText } from '../lib/clinical.js';
import { addDays, fmtDM } from '../lib/dates.js';
import { CheckBtn, Chevron, XIcon, SheetHead, SwipeRow } from './ui.jsx';

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

function PatientRow({ p, todos, selected, onOpen }) {
  const left = todos.filter((t) => !t.done).length;
  const sub = [gaFmt(p.ga), p.wt ? p.wt + ' g' : ''].filter(Boolean).join(' · ') || 'Chưa có thông tin';
  return (
    <div className={'pat-row' + (selected ? ' sel' : '')} style={{ opacity: p.done ? 0.65 : 1 }}>
      <CheckBtn done={p.done} onClick={() => updatePatient(p.id, { done: !p.done })}
        label={(p.done ? 'Bỏ đánh dấu đã khám: ' : 'Đánh dấu đã khám: ') + (p.code || 'bệnh nhân')} />
      <button type="button" className="pat-open" onClick={onOpen}>
        <span className="pat-main">
          <span className="pat-code">{p.code || 'Chưa có mã'}</span>
          <span className="muted small">{sub}</span>
          {todos.length > 0 && (
            <span className="pat-todos">
              {todos.map((t) => (
                <span key={t.id} className="pat-todo">
                  <span className={'mini-box' + (t.done ? ' on' : '')} />
                  <span className={t.done ? 'done-text' : ''}>{t.text}</span>
                </span>
              ))}
            </span>
          )}
          {p.note?.trim() && <span className="pat-note">Ghi chú: {p.note}</span>}
        </span>
        {left > 0 && <span className="left-badge">Còn {left} việc</span>}
        <Chevron style={{ flex: 'none', color: 'var(--muted)' }} />
      </button>
    </div>
  );
}

export function RoomList({ rooms, patients, todosByPid, collapsed, onToggle, selPid, onOpen, today, compact }) {
  const add = async (roomId) => {
    const p = await addPatient(roomId, today);
    onOpen(p.id);
  };
  return rooms.map((r) => {
    const ps = patients.filter((p) => p.roomId === r.id);
    const dn = ps.filter((p) => p.done).length;
    const open = !collapsed[r.id];
    return (
      <section key={r.id} className="group">
        <h2 className="group-h">
          <button type="button" className="group-btn" aria-expanded={open} onClick={() => onToggle(r.id)}>
            <Chevron style={{ transform: `rotate(${open ? 90 : 0}deg)` }} />
            <span className="group-title">{r.name}</span>
            <span className="muted small">{ps.length ? `Đã khám ${dn}/${ps.length}` : 'Chưa có bệnh nhân'}</span>
          </button>
        </h2>
        {open && (
          <div className="stack8">
            {ps.map((p) => (
              <PatientRow key={p.id} p={p} todos={todosByPid[p.id] || []} selected={selPid === p.id} onOpen={() => onOpen(p.id)} />
            ))}
            <button type="button" className="add-dashed" onClick={() => add(r.id)}>
              + Thêm bệnh nhân{compact ? '' : ' vào ' + r.name}
            </button>
          </div>
        )}
      </section>
    );
  });
}

/** Chi tiết một bé. Gõ tới đâu lưu tới đó (sau 0,4 giây ngừng gõ). */
export function PatientDetail({ p, todos, onClose }) {
  const [f, setF] = useState({ code: p.code, dob: p.dob, ga: p.ga, wt: p.wt, note: p.note });
  const [calc, setCalc] = useState(null);
  const [todoDraft, setTodoDraft] = useState('');
  const pending = useRef({});
  const timer = useRef();
  const flush = () => {
    clearTimeout(timer.current);
    const ch = pending.current;
    pending.current = {};
    if (Object.keys(ch).length) updatePatient(p.id, ch);
  };
  useEffect(() => () => flush(), []); // lưu nốt khi đóng
  const set = (k) => (e) => {
    const v = e.target.value;
    setF((x) => ({ ...x, [k]: v }));
    pending.current[k] = v;
    if (k === 'dob' || k === 'ga') setCalc(null);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 400);
  };
  const submitTodo = async (e) => {
    e.preventDefault();
    const text = todoDraft.trim();
    if (!text) return;
    setTodoDraft('');
    await addTodo(p.id, text);
  };
  const del = async () => {
    if (!window.confirm(`Xoá ${f.code || 'bệnh nhân này'} khỏi danh sách hôm nay?`)) return;
    pending.current = {};
    await removePatient(p.id);
    onClose();
  };
  const field = (k, label, extra = {}) => (
    <label className={'field' + (extra.full ? ' full' : '')}>
      <span className="muted small">{label}</span>
      <input type="text" className="input" value={f[k]} onChange={set(k)} onBlur={flush} autoComplete="off"
        inputMode={extra.num ? 'numeric' : undefined} placeholder={extra.ph} />
    </label>
  );
  return (
    <>
      <SheetHead title={f.code || 'Bệnh nhân mới'} onClose={() => { flush(); onClose(); }} closeLabel="Đóng chi tiết" />
      <div className="grid2">
        {field('code', 'Mã / giường', { full: true })}
        {field('dob', 'Ngày sinh (ngày tháng)', { num: true, ph: '0810' })}
        {field('ga', 'Tuổi thai lúc sinh', { num: true, ph: '346 = 34w6d' })}
        {field('wt', 'Cân nặng (g)', { num: true, ph: '1850', full: true })}
      </div>
      <button type="button" className="btn outline-accent" onClick={() => setCalc(calcAge(f))}>Tính tuần tuổi</button>
      {calc && !calc.err && (
        <div className="calc-box">
          <span>Ngày tuổi: <strong>{calc.days}</strong></span>
          <span>Tuổi thai hiệu chỉnh: <strong>{calc.pma}</strong></span>
        </div>
      )}
      {calc?.err && <div className="err-box">{calc.err}</div>}

      <div className="stack8">
        <div className="bold">Việc cần làm</div>
        {todos.map((t) => (
          <SwipeRow key={t.id} className="todo-row" label={t.text} onDelete={() => removeTodo(t.id)}>
            <CheckBtn small done={t.done} onClick={() => toggleTodo(t)}
              label={(t.done ? 'Bỏ đánh dấu hoàn thành: ' : 'Đánh dấu hoàn thành: ') + t.text} />
            <span className={'todo-text' + (t.done ? ' done' : '')}>{t.text}</span>
          </SwipeRow>
        ))}
        <form onSubmit={submitTodo} className="row8">
          <label className="grow row0">
            <span className="sr-only">Việc cần làm mới</span>
            <input type="text" className="input grow" value={todoDraft} onChange={(e) => setTodoDraft(e.target.value)} placeholder="Thêm việc cần làm…" autoComplete="off" />
          </label>
          <button type="submit" className="btn primary">Thêm</button>
        </form>
      </div>

      <label className="field">
        <span className="bold">Ghi chú</span>
        <textarea rows={3} className="input textarea" value={f.note} onChange={set('note')} onBlur={flush} />
      </label>

      <div className="stack8">
        <button type="button" aria-pressed={p.done} onClick={() => updatePatient(p.id, { done: !p.done })}
          className={'btn big ' + (p.done ? 'done-btn' : 'primary')}>
          {p.done ? 'Đã khám xong (bấm để bỏ)' : 'Hoàn tất khám'}
        </button>
        <button type="button" className="btn ghost" onClick={del}>Xoá khỏi danh sách hôm nay</button>
      </div>
    </>
  );
}

/** Tổng hợp y lệnh: sửa được, sao chép để gửi đồng nghiệp. */
export function SummaryPanel({ build, onClose }) {
  const [text, setText] = useState(build);
  const [msg, setMsg] = useState('');
  const copy = async () => {
    const ok = await copyText(text);
    setMsg(ok ? 'Đã sao chép' : 'Chưa sao chép được, hãy chọn hết nội dung trong khung rồi sao chép.');
  };
  return (
    <>
      <SheetHead title="Tổng hợp y lệnh" onClose={onClose} closeLabel="Đóng tổng hợp" />
      <label className="field">
        <span className="sr-only">Nội dung tổng hợp, có thể sửa trước khi sao chép</span>
        <textarea rows={14} className="input textarea mono" value={text} onChange={(e) => { setText(e.target.value); setMsg(''); }} />
      </label>
      <div className="row8 wrap">
        <button type="button" className="btn primary grow-ph" onClick={copy}>Sao chép</button>
        <button type="button" className="btn ghost" onClick={() => { setText(build()); setMsg(''); }}>Soạn lại từ danh sách</button>
        {msg && <span role="status" className="status">{msg}</span>}
      </div>
    </>
  );
}
