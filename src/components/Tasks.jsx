// Mục Việc: khu vực, danh sách theo khu, form thêm việc, lịch.
import { useRef, useState, useEffect } from 'react';
import { ZONES, LEGACY_ZONES } from '../db.js';
import { addTask, toggleTask, cycleUrgency, removeTask, setTaskTags, setTaskNote } from '../lib/actions.js';
import { isoOf, parseIso } from '../lib/dates.js';
import { TAGS, TAG_COLOR, laViecMoi, batTatNhan, sapViec, khuHienThi, boDemCham, themCham } from '../lib/viec.js';
import { useVietTat } from './VietTat.jsx';
import { CheckBtn, PriDot, PRI_NAME, Chevron, XIcon, SwipeRow, TagDot, Sheet, SheetHead } from './ui.jsx';

/** Thanh khu vực: dạng cột (PC) hoặc chip vuốt ngang (iPhone). */
export function ZoneNav({ dayTasks, active, onPick, chips }) {
  const items = [['all', 'Tất cả', dayTasks.filter((t) => !t.done).length]].concat(
    khuHienThi(dayTasks, ZONES, LEGACY_ZONES).map((z) => [z, z, dayTasks.filter((t) => t.zone === z && !t.done).length])
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

/** Bảng "Nhãn của việc": 5 nút bật/tắt, lưu ngay khi chạm. */
function TagSheet({ t, wide, onClose }) {
  return (
    <Sheet label="Nhãn của việc" onClose={onClose} wide={wide}>
      <SheetHead title="Nhãn của việc" onClose={onClose} closeLabel="Đóng nhãn" />
      <div className="sheet-task">{t.text}</div>
      <div className="stack8">
        {TAGS.map((tag) => {
          const on = (t.tags || []).includes(tag);
          return (
            <button key={tag} type="button" aria-pressed={on} onClick={() => setTaskTags(t, batTatNhan(t.tags, tag))}
              className={'tag-opt' + (on ? ' on' : '')} style={{ '--tc': `var(--p${TAG_COLOR[tag]}e)`, '--tb': `var(--p${TAG_COLOR[tag]})` }}>
              <TagDot tag={tag} className="big" />
              <span className="grow tag-opt-name">{tag}</span>
              {on && <span className="tag-opt-on">Đã chọn ✓</span>}
            </button>
          );
        })}
      </div>
      <div className="muted xsmall">Nhãn là loại việc cần thực hiện. Chạm để bật/tắt, chọn được nhiều nhãn, có thể tắt hết.</div>
      <button type="button" className="btn primary big" onClick={onClose}>Xong</button>
    </Sheet>
  );
}

/** Bảng "Ghi chú": gõ tới đâu lưu tới đó (0,4 giây), như chi tiết của bé. */
function NoteSheet({ t, wide, onClose }) {
  const [v, setV] = useState(t.note || '');
  const pending = useRef(null);
  const timer = useRef();
  const flush = () => {
    clearTimeout(timer.current);
    if (pending.current !== null) { const x = pending.current; pending.current = null; setTaskNote(t.id, x); }
  };
  useEffect(() => () => flush(), []); // lưu nốt khi đóng
  const change = (x) => {
    setV(x);
    pending.current = x;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 400);
  };
  const vt = useVietTat(v, change, { onBlur: flush });
  const close = () => { flush(); onClose(); };
  const clear = () => { setV(''); pending.current = ''; flush(); };
  return (
    <Sheet label="Ghi chú" onClose={close} wide={wide}>
      <SheetHead title="Ghi chú" onClose={close} closeLabel="Đóng ghi chú" />
      <div className="muted small">Cho việc: <strong className="ink">{t.text}</strong></div>
      <div className="field">
        <label htmlFor="ghichu-viec" className="sr-only">Nội dung ghi chú</label>
        {vt.strip}
        <textarea id="ghichu-viec" rows={5} className="input textarea" {...vt.props} autoFocus />
      </div>
      <div className="muted xsmall">Tự lưu khi gõ. Ghi chú hiện chữ nhỏ dưới tên việc.</div>
      <div className="row8">
        <button type="button" className="btn danger-outline grow" disabled={!v} onClick={clear}>Xoá ghi chú</button>
        <button type="button" className="btn primary big grow2" onClick={close}>Xong</button>
      </div>
    </Sheet>
  );
}

function TaskRow({ t, chips }) {
  const [sheet, setSheet] = useState(null); // null | 'note' | 'tag'
  const bodyTaps = useRef([]);
  const tagTaps = useRef([]);
  const moi = laViecMoi(t);
  const wide = !chips;
  // Chạm 2 lần (trong 1 giây) vào thân dòng → ghi chú. Ô tick và vùng nhãn là phần tử khác nên không tính.
  const tapBody = () => {
    bodyTaps.current = themCham(bodyTaps.current, Date.now());
    if (boDemCham(bodyTaps.current, 2)) { bodyTaps.current = []; setSheet('note'); }
  };
  // Chạm 3 lần (trong 1 giây) vào cụm nhãn → bảng nhãn. Chạm 1–2 lần không làm gì.
  const tapTag = () => {
    tagTaps.current = themCham(tagTaps.current, Date.now());
    if (boDemCham(tagTaps.current, 3)) { tagTaps.current = []; setSheet('tag'); }
  };
  const tags = moi ? t.tags : [];
  const note = (t.note || '').trim();
  return (
    <>
      <SwipeRow className={'task-row' + (chips ? ' compact' : '')} label={t.text} onDelete={() => removeTask(t.id)}>
        <CheckBtn done={t.done} onClick={() => toggleTask(t)}
          label={(t.done ? 'Bỏ đánh dấu hoàn thành: ' : 'Đánh dấu hoàn thành: ') + t.text} />
        <div className="task-main" role="button" tabIndex={0} aria-label={'Mở ghi chú: ' + t.text}
          onClick={tapBody} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) setSheet('note'); }}>
          <span className={'task-text' + (t.done ? ' done' : '')}>{t.text}</span>
          {note && <span className="task-note">{note}</span>}
        </div>
        {moi ? (
          <button type="button" className="tag-zone" onClick={tapTag}
            aria-label={tags.length ? `Nhãn: ${tags.join(', ')}. Chạm 3 lần để đổi nhãn` : 'Chạm 3 lần để chọn nhãn'}>
            {tags.length ? tags.map((x) => <TagDot key={x} tag={x} faded={t.done} />) : <span className="tag-empty" aria-hidden="true" />}
          </button>
        ) : (
          <button type="button" className="icon-btn" onClick={() => cycleUrgency(t)}
            aria-label={`Mức ưu tiên ${t.urgency} (${PRI_NAME[t.urgency]}), bấm để đổi`}>
            <PriDot n={t.urgency} faded={t.done} />
          </button>
        )}
      </SwipeRow>
      {sheet === 'note' && <NoteSheet t={t} wide={wide} onClose={() => setSheet(null)} />}
      {sheet === 'tag' && moi && <TagSheet t={t} wide={wide} onClose={() => setSheet(null)} />}
    </>
  );
}

/** Danh sách việc chia theo khu, thu gọn/mở rộng được. */
export function TaskGroups({ dayTasks, active, collapsed, onToggle, chips }) {
  const groups = khuHienThi(dayTasks, ZONES, LEGACY_ZONES).filter((z) => active === 'all' || active === z)
    .map((z) => ({ z, list: sapViec(dayTasks.filter((t) => t.zone === z)) }))
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
export function TaskForm({ variant, date, zone, setZone, tags, setTags }) {
  const [draft, setDraft] = useState('');
  const vt = useVietTat(draft, setDraft);
  const submit = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    await addTask({ date, zone, text, tags });
  };
  const tagBtns = (
    <div className="pri-pick" role="group" aria-label="Nhãn của việc mới">
      {TAGS.map((tag) => {
        const n = TAG_COLOR[tag];
        const on = tags.includes(tag);
        return (
          <button key={tag} type="button" aria-label={`Nhãn ${tag}`} aria-pressed={on} onClick={() => setTags(batTatNhan(tags, tag))}
            className="pri-btn tag-btn" style={{ borderColor: `var(--p${n}e)`, ...(on ? { background: `var(--p${n})`, color: `var(--p${n}i)` } : {}) }}>{tag}</button>
        );
      })}
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
      <input id={variant + '-draft'} type="text" {...vt.props}
        placeholder="Ghi chú việc cần làm…" autoComplete="off" className={variant === 'pc' ? 'bare-input' : 'input grow'} />
    </>
  );
  if (variant === 'pc') {
    return (
      <form onSubmit={submit} className="card task-form-pc">
        {vt.strip}
        {input}
        <div className="task-form-bar">
          {zoneSel}
          <div className="row8"><span className="muted small">Nhãn</span>{tagBtns}</div>
          <span className="grow" />
          <button type="submit" className="btn primary">Thêm việc</button>
        </div>
      </form>
    );
  }
  return (
    <form onSubmit={submit} className="task-form-ph">
      {vt.strip}
      <div className="row8">{input}{zoneSel}</div>
      <div className="muted xsmall">Nhãn (chọn được nhiều):</div>
      <div className="row8">{tagBtns}<button type="submit" className="btn primary grow">Thêm việc</button></div>
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
