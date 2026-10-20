// Mục Việc rút gọn, để minh hoạ cách nối giao diện với IndexedDB.
// Khi ghép vào prototype: thay useState chứa danh sách việc bằng useLiveQuery như dưới đây.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addRow, updateRow, softDelete, ZONES, todayStr } from '../db.js';

const URGENCY_COLOR = { 1: '#dc2626', 2: '#ca8a04', 3: '#16a34a', 4: '#2563eb' };

export default function TaskDemo() {
  const [date, setDate] = useState(todayStr());
  const [text, setText] = useState('');
  const [zone, setZone] = useState(ZONES[0]);
  const [urgency, setUrgency] = useState(3);

  // useLiveQuery tự chạy lại khi dữ liệu thay đổi (kể cả sau khi nhập file).
  const tasks = useLiveQuery(
    () => db.tasks.where('date').equals(date).filter((t) => !t.deleted).toArray(),
    [date]
  ) ?? [];

  const sorted = [...tasks].sort((a, b) => a.done - b.done || a.urgency - b.urgency);
  const doneCount = tasks.filter((t) => t.done).length;

  const add = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await addRow('tasks', { date, zone, urgency, text: text.trim(), done: false });
    setText('');
  };

  return (
    <section className="card">
      <div className="row between">
        <h2>Việc</h2>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <p className="muted">Đã xong {doneCount}/{tasks.length}</p>

      <form onSubmit={add} className="stack">
        <input placeholder="Nội dung việc" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="row">
          <select value={zone} onChange={(e) => setZone(e.target.value)}>
            {ZONES.map((z) => <option key={z}>{z}</option>)}
          </select>
          <select value={urgency} onChange={(e) => setUrgency(Number(e.target.value))}>
            {[1, 2, 3, 4].map((u) => <option key={u} value={u}>Mức {u}</option>)}
          </select>
          <button className="primary" type="submit">Thêm</button>
        </div>
      </form>

      <ul className="list">
        {sorted.map((t) => (
          <li key={t.id} className={t.done ? 'done' : ''}>
            <input type="checkbox" checked={t.done}
              onChange={() => updateRow('tasks', t.id, { done: !t.done })} />
            <span className="dot" style={{ background: URGENCY_COLOR[t.urgency] }}>{t.urgency}</span>
            <span className="grow">{t.text} <small className="muted">· {t.zone}</small></span>
            <button className="ghost" aria-label="Xoá" onClick={() => softDelete('tasks', t.id)}>✕</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
