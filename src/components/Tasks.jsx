// Mục Việc: khu vực, danh sách theo khu, form thêm việc, lịch.
import { useState } from 'react';
import { ZONES } from '../db.js';
import { addTask, toggleTask, cycleUrgency, removeTask } from '../lib/actions.js';
import { isoOf, parseIso } from '../lib/dates.js';
import { CheckBtn, PriDot, PRI_NAME, PRI_LEVELS, priLabel, Chevron, XIcon } from './ui.jsx';

const byPri = (a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || a.urgency - b.urgency || (a.createdAt || 0) - (b.createdAt || 0);

/** Thanh khu vực: dạng cột (PC) hoặc chip vuốt ngang (iPhone). */
export function ZoneNav({ dayTasks, active, onPick, chips }) {
  const items = [['all', 'Tất cả', dayTasks.filter((t) => !t.done).length]].concat(
    ZONES.map((z) => [z, z, dayTasks.filter((t) => t.zone === z && !t.done).length])
  );
  return (
    <nav aria-label="Khu vực làm việc" className={chips ? 'chips noscroll' : 'zone-col'}>
      {items.map(([key, label, count]) => (
        <button key={key} type="button" aria-pressed={active === key} onClick={() => onPick(key)}
          className={(chips ? 'chip' : 'zone-btn') + (active === key ? ' on' : '')}>
          <span className={chips ? '' : 'grow'}>{label}</span>
          <span className="zone-count">{count}</span>
        </button>
      ))}
    </nav>
  );
}

function TaskRow({ t, chips }) {
  return (
    <div className={'task-row' + (chips ? ' compact' : '')}>
      <CheckBtn done={t.done} onClick={() => toggleTask(t)}
        label={(t.done ? 'Bỏ đánh dấu hoàn thành: ' : 'Đánh dấu hoàn thành: ') + t.text} />
      <span className={'task-text' + (t.done ? ' done' : '')}>{t.text}</span>
      <button type="button" className="icon-btn" onClick={() => cycleUrgency(t)}
        aria-label={`Mức ưu tiên ${t.urgency} (${PRI_NAME[t.urgency]}), bấm để đổi`}>
        <PriDot n={t.urgency} faded={t.done} />
      </button>
      <button type="button" className="icon-btn muted" aria-label="Xoá việc" onClick={() => removeTask(t.id)}><XIcon /></button>
    </div>
  );
}

/** Danh sách việc chia theo khu, thu gọn/mở rộng được. */
export function TaskGroups({ dayTasks, active, collapsed, onToggle, chips }) {
  const groups = ZONES.filter((z) => active === 'all' || active === z)
    .map((z) => ({ z, list: dayTasks.filter((t) => t.zone === z).sort(byPri) }))
    .filter((g) => g.list.length);
  if (!groups.length) return <div className="empty">Chưa có việc nào ở khu vực này.</div>;
  return groups.map(({ z, list }) => {
    const left = list.filter((t) => !t.done).length;
    const open = !collapsed[z];
    return (
      <section key={z} className="group">
        <h2 className="group-h">
          <button type="button" aria-expanded={open} onClick={() => onToggle(z)} className="group-btn">
            <Chevron style={{ transform: `rotate(${open ? 90 : 0}deg)` }} />
            <span className="group-title">{z}</span>
            <span className="muted small">{left === 0 ? 'Đã xong hết' : `Còn ${left}/${list.length} việc`}</span>
          </button>
        </h2>
        {open && <div className="stack8">{list.map((t) => <TaskRow key={t.id} t={t} chips={chips} />)}</div>}
      </section>
    );
  });
}

/** Form thêm việc. variant 'pc' = khung trên đầu; 'ph' = thanh dưới cùng iPhone. */
export function TaskForm({ variant, date, zone, setZone, pri, setPri }) {
  const [draft, setDraft] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    await addTask({ date, zone, urgency: pri, text });
  };
  const priBtns = (
    <div className="pri-pick">
      {PRI_LEVELS.map((n) => (
        <button key={n} type="button" aria-label={`Mức ưu tiên ${n} (${PRI_NAME[n]})`} aria-pressed={pri === n} onClick={() => setPri(n)}
          className={'pri-btn' + (n === 5 ? ' nv' : '')} style={{ borderColor: `var(--p${n}e)`, ...(pri === n ? { background: `var(--p${n})`, color: `var(--p${n}i)` } : {}) }}>{priLabel(n)}</button>
      ))}
    </div>
  );
  const zoneSel = (
    <>
      <label htmlFor={variant + '-zone'} className="sr-only">Khu vực</label>
      <select id={variant + '-zone'} value={zone} onChange={(e) => setZone(e.target.value)} className="select">
        {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
      </select>
    </>
  );
  const input = (
    <>
      <label htmlFor={variant + '-draft'} className="sr-only">Nội dung công việc</label>
      <input id={variant + '-draft'} type="text" value={draft} onChange={(e) => setDraft(e.target.value)}
        placeholder="Ghi chú việc cần làm…" autoComplete="off" className={variant === 'pc' ? 'bare-input' : 'input grow'} />
    </>
  );
  if (variant === 'pc') {
    return (
      <form onSubmit={submit} className="card task-form-pc">
        {input}
        <div className="task-form-bar">
          {zoneSel}
          <div className="row8"><span className="muted small">Ưu tiên</span>{priBtns}</div>
          <span className="grow" />
          <button type="submit" className="btn primary">Thêm việc</button>
        </div>
      </form>
    );
  }
  return (
    <form onSubmit={submit} className="task-form-ph">
      <div className="row8">{input}{zoneSel}</div>
      <div className="row8">{priBtns}<button type="submit" className="btn primary grow">Thêm việc</button></div>
    </form>
  );
}

/** Lịch tháng: số dưới mỗi ngày là số việc chưa xong. */
export function Calendar({ tasks, viewDate, today, month, setMonth, onPick, onClose }) {
  const { y, m } = month;
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const dim = new Date(y, m + 1, 0).getDate();
  const leftByDay = {};
  for (const t of tasks) if (!t.done) leftByDay[t.date] = (leftByDay[t.date] || 0) + 1;
  const overdue = tasks.filter((t) => t.date < today && !t.done).length;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(<span key={'e' + i} />);
  for (let d = 1; d <= dim; d++) {
    const iso = isoOf(new Date(y, m, d));
    const left = leftByDay[iso] || 0;
    const sel = iso === viewDate;
    const isT = iso === today;
    cells.push(
      <button key={iso} type="button" onClick={() => onPick(iso)}
        className={'cal-cell' + (sel ? ' sel' : '') + (isT && !sel ? ' today' : '')}
        aria-label={`Ngày ${d} tháng ${m + 1}` + (left ? `, còn ${left} việc chưa xong` : ', không có việc chưa xong') + (isT ? ', hôm nay' : '')}>
        <span className="cal-day">{d}</span>
        <span className={'cal-badge' + (left ? ' has' : '')}>{left || ''}</span>
      </button>
    );
  }
  const go = (delta) => {
    const d = new Date(y, m + delta, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
  };
  return (
    <section aria-label="Lịch công việc" className="cal">
      <div className="row-between">
        <button type="button" className="icon-btn" aria-label="Tháng trước" onClick={() => go(-1)}><Chevron dir="left" size={18} /></button>
        <div className="cal-title">Tháng {m + 1}/{y}</div>
        <div className="row0">
          <button type="button" className="icon-btn" aria-label="Tháng sau" onClick={() => go(1)}><Chevron size={18} /></button>
          {onClose && <button type="button" className="icon-btn" aria-label="Đóng lịch" onClick={onClose}><XIcon /></button>}
        </div>
      </div>
      <div className="cal-grid cal-wd">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((w) => <span key={w}>{w}</span>)}</div>
      <div className="cal-grid">{cells}</div>
      <div className="muted xsmall pad6">Số dưới mỗi ngày là số việc chưa hoàn thành.</div>
      <div className="bold pad6">Chưa xong ở các ngày trước: {overdue}</div>
    </section>
  );
}

export const monthOf = (iso) => { const d = parseIso(iso); return { y: d.getFullYear(), m: d.getMonth() }; };
