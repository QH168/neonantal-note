// Mục Việc: khu vực, danh sách theo khu, form thêm việc, lịch.
import { useRef, useState, useEffect, useCallback } from 'react';
import { ZONES, LEGACY_ZONES } from '../db.js';
import { addTask, toggleTask, cycleUrgency, removeTask, setTaskTags, setTaskNote, setTaskText, setTaskZone } from '../lib/actions.js';
import { isoOf, parseIso } from '../lib/dates.js';
import { TAGS, TAG_COLOR, laViecMoi, batTatNhan, sapViec, khuHienThi, khuDeChon, boDemCham, themCham } from '../lib/viec.js';
import { useVietTat } from './VietTat.jsx';
import { CheckBtn, PriDot, PRI_NAME, Chevron, XIcon, SwipeRow, TagDot, Sheet, TrashIcon } from './ui.jsx';

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

/** 5 nút nhãn bật/tắt độc lập (dùng ở form thêm việc và bảng chi tiết việc). */
function TagBtns({ tags, onToggle, label }) {
  return (
    <div className="pri-pick" role="group" aria-label={label}>
      {TAGS.map((tag) => {
        const n = TAG_COLOR[tag];
        const on = tags.includes(tag);
        return (
          <button key={tag} type="button" aria-label={`Nhãn ${tag}`} aria-pressed={on} onClick={() => onToggle(tag)}
            className="pri-btn tag-btn" style={{ borderColor: `var(--p${n}e)`, ...(on ? { background: `var(--p${n})`, color: `var(--p${n}i)` } : {}) }}>{tag}</button>
        );
      })}
    </div>
  );
}

/** Ô tự lưu: gõ tới đâu lưu sau 0,4 giây; lưu nốt khi đóng. Trả [chữ, đổi, lưuNgay, đặtLại, bỏ]. */
function useTuLuu(goc, luu) {
  const [v, setV] = useState(goc);
  const pending = useRef(null);
  const timer = useRef();
  const luuRef = useRef(luu);
  luuRef.current = luu;
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (pending.current !== null) { const x = pending.current; pending.current = null; luuRef.current(x); }
  }, []);
  useEffect(() => () => flush(), [flush]); // lưu nốt khi đóng bảng
  const change = (x) => {
    setV(x);
    pending.current = x;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 400);
  };
  const datLai = (x) => { clearTimeout(timer.current); pending.current = null; setV(x); };
  const bo = () => { clearTimeout(timer.current); pending.current = null; };
  return [v, change, flush, datLai, bo];
}

/**
 * Bảng "chi tiết việc" (chạm 2 lần vào việc): sửa tên, khu, nhãn, ghi chú; xoá việc. Mọi ô tự lưu.
 * Việc cũ (có urgency, chưa có tags): hiện 5 nút nhãn chưa bật; bật nhãn đầu tiên thì thành kiểu mới.
 */
function TaskDetail({ t, wide, onClose }) {
  const [ten, doiTen, luuTen, datLaiTen, boTen] = useTuLuu(t.text, (x) => { setTaskText(t.id, x); });
  const [ghiChu, doiGhiChu, luuGhiChu, , boGhiChu] = useTuLuu(t.note || '', (x) => { setTaskNote(t.id, x); });
  const vtTen = useVietTat(ten, doiTen, { onBlur: () => { luuTen(); if (!ten.trim()) datLaiTen(t.text); } });
  const vtNote = useVietTat(ghiChu, doiGhiChu, { onBlur: luuGhiChu });
  const tags = laViecMoi(t) ? t.tags : [];
  const xoaViec = () => { boTen(); boGhiChu(); removeTask(t.id); onClose(); };
  return (
    <Sheet label="Chi tiết việc" onClose={onClose} wide={wide} className="sheet-half">
      <div className="sheet-grip" aria-hidden="true" />
      <div className="row-between sheet-r1">
        <label htmlFor="ten-viec" className="sr-only">Nội dung việc</label>
        <input id="ten-viec" type="text" className="sheet-name" autoComplete="off" {...vtTen.props} />
        <button type="button" className="icon-btn" aria-label="Đóng" onClick={onClose}><XIcon /></button>
      </div>
      {vtTen.strip}
      <div className="row8 sheet-r2">
        <label htmlFor="khu-viec" className="sr-only">Khu vực</label>
        <select id="khu-viec" className="select sheet-zone" value={t.zone} onChange={(e) => setTaskZone(t.id, e.target.value)}>
          {khuDeChon(ZONES, t.zone).map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        <span className="sheet-sep" aria-hidden="true" />
        <TagBtns tags={tags} label="Nhãn của việc" onToggle={(tag) => setTaskTags(t, batTatNhan(t.tags, tag))} />
      </div>
      <label htmlFor="ghichu-viec" className="sr-only">Ghi chú</label>
      <textarea id="ghichu-viec" className="sheet-note" placeholder="Ghi chú… (gõ / để viết tắt)" {...vtNote.props} />
      {vtNote.strip}
      <div className="row8 sheet-r4">
        <button type="button" className="sheet-del-task" onClick={xoaViec}><TrashIcon size={18} />Xoá việc</button>
        <span className="grow" />
        <button type="button" className="btn primary big sheet-done" onClick={onClose}>Xong</button>
      </div>
    </Sheet>
  );
}

function TaskRow({ t, chips, onOpen }) {
  const bodyTaps = useRef([]);
  const moi = laViecMoi(t);
  // Chạm 2 lần (trong 1 giây) vào thân dòng hoặc vùng nhãn → chi tiết việc. Ô tick là phần tử khác nên không tính.
  const tapBody = () => {
    bodyTaps.current = themCham(bodyTaps.current, Date.now());
    if (boDemCham(bodyTaps.current, 2)) { bodyTaps.current = []; onOpen(t.id); }
  };
  const tags = moi ? t.tags : [];
  const note = (t.note || '').trim();
  return (
    <SwipeRow className={'task-row' + (chips ? ' compact' : '')} label={t.text} onDelete={() => removeTask(t.id)}>
      <CheckBtn done={t.done} onClick={() => toggleTask(t)}
        label={(t.done ? 'Bỏ đánh dấu hoàn thành: ' : 'Đánh dấu hoàn thành: ') + t.text} />
      <div className="task-main" role="button" tabIndex={0} aria-label={'Mở chi tiết việc: ' + t.text}
        onClick={tapBody} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(t.id); }}>
        <span className={'task-text' + (t.done ? ' done' : '')}>{t.text}</span>
        {note && <span className="task-note">{note}</span>}
      </div>
      {moi ? (
        tags.length > 0 && (
          <div className="tag-zone swipe-tail" onClick={tapBody}>
            {tags.map((x) => <TagDot key={x} tag={x} faded={t.done} />)}
          </div>
        )
      ) : (
        <button type="button" className="icon-btn swipe-tail" onClick={() => cycleUrgency(t)}
          aria-label={`Mức ưu tiên ${t.urgency} (${PRI_NAME[t.urgency]}), bấm để đổi`}>
          <PriDot n={t.urgency} faded={t.done} />
        </button>
      )}
    </SwipeRow>
  );
}

/** Danh sách việc chia theo khu, thu gọn/mở rộng được. */
export function TaskGroups({ dayTasks, active, collapsed, onToggle, chips }) {
  // Bảng chi tiết đặt ở đây (không đặt trong TaskRow) để đổi khu mà bảng không bị đóng khi dòng chuyển nhóm.
  const [chiTietId, setChiTietId] = useState(null);
  const dangMo = chiTietId ? dayTasks.find((t) => t.id === chiTietId && !t.deleted) : null;
  const groups = khuHienThi(dayTasks, ZONES, LEGACY_ZONES).filter((z) => active === 'all' || active === z)
    .map((z) => ({ z, list: sapViec(dayTasks.filter((t) => t.zone === z)) }))
    .filter((g) => g.list.length);
  const sheet = dangMo && <TaskDetail key={dangMo.id} t={dangMo} wide={!chips} onClose={() => setChiTietId(null)} />;
  if (!groups.length) return <><div className="empty">Chưa có việc nào ở khu vực này.</div>{sheet}</>;
  return (
    <>
      {groups.map(({ z, list }) => {
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
            {open && <div className="stack8">{list.map((t) => <TaskRow key={t.id} t={t} chips={chips} onOpen={setChiTietId} />)}</div>}
          </section>
        );
      })}
      {sheet}
    </>
  );
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
  const tagBtns = <TagBtns tags={tags} label="Nhãn của việc mới" onToggle={(tag) => setTags(batTatNhan(tags, tag))} />;
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
