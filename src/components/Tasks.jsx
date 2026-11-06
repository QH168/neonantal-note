// Mục Việc: khu vực, danh sách theo khu, form thêm việc, lịch.
import { useRef, useState, useEffect, useCallback } from 'react';
import { ZONES, LEGACY_ZONES } from '../db.js';
import { addTask, toggleTask, cycleUrgency, removeTask, khoiPhucTask, setTaskTags, setTaskNote, setTaskText, setTaskZone } from '../lib/actions.js';
import { isoOf, parseIso } from '../lib/dates.js';
import { TAGS, laViecMoi, batTatNhan, sapViec, khuHienThi, khuDeChon, boDemCham, themCham, gioXong, chuanTenViec, khiRoiOThemViec } from '../lib/viec.js';
import { useBanPhim } from '../hooks.js';
import { useVietTat } from './VietTat.jsx';
import { useHoanTac } from './HoanTac.jsx';
import { PriDot, PRI_NAME, Chevron, XIcon, SwipeRow, TagDot, TickOk, TrangThaiXong, mauNhan, Sheet, TrashIcon, PlusIcon, DongBtn, useDongSheet } from './ui.jsx';

/** Thanh khu vực: dạng cột (PC) hoặc chip vuốt ngang (iPhone). */
export function ZoneNav({ dayTasks, active, onPick, chips }) {
  const items = [['all', 'Tất cả', dayTasks.filter((t) => !t.done).length]].concat(
    khuHienThi(dayTasks, ZONES, LEGACY_ZONES).map((z) => [z, z, dayTasks.filter((t) => t.zone === z && !t.done).length])
  );
  return (
    <nav aria-label="Khu vực làm việc" className={chips ? 'chips noscroll' : 'zone-col'}>
      {items.map(([key, label, count]) => (
        <button key={key} type="button" aria-pressed={active === key} onClick={() => onPick(key)}
          className={(chips ? 'chip' : 'zone-btn') + (active === key ? ' on' : '') + (chips && !count ? ' zero' : '')}>
          <span className={chips ? '' : 'grow'}>{label}</span>
          {/* chip (iPhone): khu không có việc thì không ghi số 0, chữ nhạt */}
          {(!chips || count > 0) && <span className="zone-count">{count}</span>}
        </button>
      ))}
    </nav>
  );
}

/** 5 nút nhãn bật/tắt độc lập (dùng ở form thêm việc và bảng chi tiết việc). */
function TagBtns({ tags, onToggle, label, giuConTro: giu = false }) {
  return (
    <div className="pri-pick" role="group" aria-label={label}>
      {TAGS.map((tag) => (
        <button key={tag} type="button" aria-label={`Nhãn ${tag}`} aria-pressed={tags.includes(tag)} onClick={() => onToggle(tag)}
          onPointerDown={giu ? giuConTro : undefined} onMouseDown={giu ? giuConTro : undefined}
          className="pri-btn tag-btn" style={mauNhan(tag)}>{tag}</button>
      ))}
    </div>
  );
}

/** Ô tự lưu: gõ tới đâu lưu sau 0,4 giây; lưu nốt khi đóng. Trả [chữ, đổi, lưuNgay, đặtLại, bỏ]. */
export function useTuLuu(goc, luu) {
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
 * Bảng "chi tiết việc" (chạm 2 lần vào việc): sửa tên, khu, nhãn, ghi chú; đánh dấu xong / bỏ; xoá việc. Mọi ô tự lưu.
 * Việc cũ (có urgency, chưa có tags): hiện 5 nút nhãn chưa bật; bật nhãn đầu tiên thì thành kiểu mới.
 */
function TaskDetail({ t, wide, onClose }) {
  const hoanTac = useHoanTac();
  const [ten, doiTen, luuTen, datLaiTen, boTen] = useTuLuu(t.text, (x) => { setTaskText(t.id, x); });
  const [ghiChu, doiGhiChu, luuGhiChu, , boGhiChu] = useTuLuu(t.note || '', (x) => { setTaskNote(t.id, x); });
  const vtTen = useVietTat(ten, doiTen, { onBlur: () => { luuTen(); if (!ten.trim()) datLaiTen(t.text); } });
  const vtNote = useVietTat(ghiChu, doiGhiChu, { onBlur: luuGhiChu });
  const tags = laViecMoi(t) ? t.tags : [];
  // Xoá việc: bảng trượt xuống trước (DongBtn), xong mới xoá, gỡ bảng và hiện thanh Hoàn tác.
  const xoaViec = async () => {
    boTen(); boGhiChu();
    await removeTask(t.id);
    onClose();
    hoanTac.hien({ nhan: 'Đã xoá: ' + t.text, lam: () => khoiPhucTask(t.id) });
  };
  return (
    <Sheet label="Chi tiết việc" onClose={onClose} wide={wide} className="sheet-half">
      <div className="row-between sheet-r1">
        <label htmlFor="ten-viec" className="sr-only">Nội dung việc</label>
        <textarea id="ten-viec" className="sheet-name" rows={ten.length > 52 ? 3 : ten.length > 26 ? 2 : 1} autoComplete="off" {...vtTen.props}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} />
        <DongBtn className="icon-btn" aria-label="Đóng" onClose={onClose}><XIcon /></DongBtn>
      </div>
      {vtTen.strip}
      <div className="sheet-nhom">
        <span className="sheet-nhan" id="khu-viec-nhan">Khu vực</span>
        <div className="chips-sheet noscroll" role="group" aria-label="Khu vực">
          {khuDeChon(ZONES, t.zone).map((z) => (
            <button key={z} type="button" aria-pressed={t.zone === z} className={'chip' + (t.zone === z ? ' on' : '')}
              onClick={() => { if (t.zone !== z) setTaskZone(t.id, z); }}>{z}</button>
          ))}
        </div>
      </div>
      <div className="sheet-nhom">
        <span className="sheet-nhan">Nhãn, chạm để bật hoặc tắt</span>
        <TagBtns tags={tags} label="Nhãn của việc" onToggle={(tag) => setTaskTags(t, batTatNhan(t.tags, tag))} />
      </div>
      <label htmlFor="ghichu-viec" className="sheet-nhan">Ghi chú</label>
      <textarea id="ghichu-viec" className="sheet-note" placeholder="Ghi chú… (gõ / để viết tắt)" {...vtNote.props} />
      {vtNote.strip}
      <TrangThaiXong xong={!!t.done} gio={gioXong(t.doneAt)} onDanhDau={() => toggleTask(t)} onBo={() => toggleTask(t)} />
      <div className="row8 sheet-r4">
        <DongBtn className="sheet-del-task" onClose={xoaViec}><TrashIcon size={18} />Xoá việc</DongBtn>
        <span className="grow" />
        <DongBtn className="btn primary big sheet-done" onClose={onClose}>Xong</DongBtn>
      </div>
    </Sheet>
  );
}

function TaskRow({ t, chips, onOpen }) {
  const hoanTac = useHoanTac();
  const bodyTaps = useRef([]);
  const [sang, setSang] = useState(false); // dòng sáng lên một nhịp (~140ms) mỗi lần chạm
  const hetSang = useRef(null);
  useEffect(() => () => clearTimeout(hetSang.current), []);
  const moi = laViecMoi(t);
  // Chạm 2 lần (trong 1 giây) vào thân dòng hoặc vùng nhãn → chi tiết việc.
  const tapBody = () => {
    setSang(true);
    clearTimeout(hetSang.current);
    hetSang.current = setTimeout(() => setSang(false), 140);
    bodyTaps.current = themCham(bodyTaps.current, Date.now());
    if (boDemCham(bodyTaps.current, 2)) { bodyTaps.current = []; onOpen(t.id); }
  };
  const tags = moi ? t.tags : [];
  const note = (t.note || '').trim();
  // Xoá mềm rồi hiện thanh Hoàn tác (hẹn giờ 6 giây nằm ở HoanTacProvider, không ở dòng này).
  const xoa = async () => {
    await removeTask(t.id);
    hoanTac.hien({ nhan: 'Đã xoá: ' + t.text, lam: () => khoiPhucTask(t.id) });
  };
  return (
    <SwipeRow className={'task-row' + (chips ? ' compact' : '') + (sang ? ' flash' : '') + (t.done ? ' xong' : '')} label={t.text}
      daXong={!!t.done} onDone={() => { if (!t.done) toggleTask(t); }} onDelete={xoa}>
      <div className="task-main" role="button" tabIndex={0} aria-label={'Mở chi tiết việc: ' + t.text}
        onClick={tapBody} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(t.id); }}>
        <span className={'task-text' + (t.done ? ' done' : '')}>{t.text}</span>
        {note && <span className="task-note">{note}</span>}
      </div>
      {moi ? (
        tags.length > 0 && (
          <div className="tag-zone" onClick={tapBody}>
            {tags.map((x) => <TagDot key={x} tag={x} faded={t.done} />)}
          </div>
        )
      ) : (
        <button type="button" className="icon-btn pri-chuyen" onClick={() => cycleUrgency(t)}
          aria-label={`Mức ưu tiên ${t.urgency} (${PRI_NAME[t.urgency]}), bấm để đổi`}>
          <PriDot n={t.urgency} faded={t.done} />
        </button>
      )}
      {t.done && <TickOk />}
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

/** Chạm nút trong thanh thêm việc không được làm ô gõ mất con trỏ (bàn phím iPhone tụt xuống). */
const giuConTro = (e) => e.preventDefault();

/**
 * Form thêm việc. variant 'pc' = khung trên đầu (giữ bố cục cũ); 'ph' = thanh dưới cùng iPhone (bảng 15a, 15b):
 * một dòng gồm ô tròn + nút tròn "+"; chạm vào ô gõ thì bung hàng chip khu vực và hàng 5 nút nhãn ngay dưới ô, trên bàn phím.
 * `khuLoc` = chip khu đang lọc ở trên (để biết khu mặc định khi thu lại).
 */
export function TaskForm({ variant, date, zone, setZone, tags, setTags, khuLoc = 'all' }) {
  const ph = variant === 'ph';
  const [draft, setDraft] = useState('');
  const draftRef = useRef('');            // chữ mới nhất, để thêm liên tiếp nhanh không bao giờ tạo trùng
  const datDraft = (x) => { draftRef.current = x; setDraft(x); };
  const [mo, setMo] = useState(false);    // iPhone: đang bung hàng khu vực và nhãn
  const formRef = useRef(null);
  const trongForm = useRef(false);        // đang chạm bên trong form: cú blur sinh ra từ đó không được thu lại
  const hetChamTimer = useRef(null);
  const moi = useRef({});                 // giá trị mới nhất cho các trình nghe sự kiện
  moi.current = { mo, zone, tags, khuLoc };
  const banPhim = useBanPhim();           // cách tính dùng chung với Sheet và thanh Hoàn tác (hooks.js)

  // Rời ô: ô trống thì thu lại, nhãn về trống, khu về theo chip đang lọc (luật thuần khiRoiOThemViec trong src/lib/viec.js).
  const roiO = () => {
    const m = moi.current;
    if (!ph || !m.mo) return;
    const r = khiRoiOThemViec({ chu: draftRef.current, khuLoc: m.khuLoc, khuHienTai: m.zone, nhanHienTai: m.tags }, ZONES);
    if (!r.thuLai) return;
    setMo(false); setTags(r.nhan); setZone(r.khu);
    if (draftRef.current) datDraft('');
  };
  // Thu lại KHÔNG làm ngay ở pointerdown/blur: bố cục đổi dưới ngón tay thì cú chạm trượt sang phần tử khác (nhất là thanh Hoàn tác
  // và các dòng nằm đáy). Hoãn tới sau pointerup/blur ~80ms, tức sau cú click; chạm lại vào form trong lúc chờ thì huỷ.
  const thuTimer = useRef(null);
  const choNgoai = useRef(false);         // đang giữ ngón ở NGOÀI form (khi ô bung): thu lại khi nhấc ngón
  const lenThu = () => {
    clearTimeout(thuTimer.current);
    thuTimer.current = setTimeout(() => {
      if (trongForm.current) return;
      const truoc = moi.current.mo;
      roiO();
      if (truoc && !draftRef.current && document.activeElement === inputRef.current) inputRef.current.blur(); // thu lại thì bỏ cả con trỏ
    }, 80);
  };
  const vt = useVietTat(draft, datDraft, {
    onBlur: (e) => {
      // blur do chạm nút trong form (chip, nhãn, "+", gợi ý) hoặc trong thanh Hoàn tác thì không thu lại; chỉ thu khi chạm/rời ra ngoài
      if (trongForm.current || (e.relatedTarget && (formRef.current?.contains(e.relatedTarget) || e.relatedTarget.closest?.('.hoantac-wrap')))) return;
      lenThu();
    }
  });
  const inputRef = vt.props.ref;

  useEffect(() => {
    if (!ph) return undefined;
    const hetCham = () => {
      clearTimeout(hetChamTimer.current);
      hetChamTimer.current = setTimeout(() => { trongForm.current = false; }, 400);
      if (choNgoai.current) { choNgoai.current = false; lenThu(); }
    };
    window.addEventListener('pointerup', hetCham);
    window.addEventListener('pointercancel', hetCham);
    return () => { window.removeEventListener('pointerup', hetCham); window.removeEventListener('pointercancel', hetCham); clearTimeout(hetChamTimer.current); clearTimeout(thuTimer.current); };
  }, [ph]); // eslint-disable-line react-hooks/exhaustive-deps
  // Đang bung: chạm vào form hoặc thanh Hoàn tác thì không thu lại; chạm ra ngoài thì thu lại SAU khi nhấc ngón (kể cả khi ô đã mất con trỏ vì lý do khác)
  useEffect(() => {
    if (!ph || !mo) return undefined;
    const xuong = (e) => {
      if (!formRef.current) return;
      const t = e.target;
      if (formRef.current.contains(t)) { clearTimeout(thuTimer.current); choNgoai.current = false; return; }
      if (t.closest?.('.hoantac-wrap')) { trongForm.current = true; clearTimeout(hetChamTimer.current); clearTimeout(thuTimer.current); choNgoai.current = false; return; }
      trongForm.current = false; // chạm ngoài: cờ 'đang chạm trong form' của lần chạm trước không còn đúng
      clearTimeout(hetChamTimer.current);
      choNgoai.current = true;
    };
    document.addEventListener('pointerdown', xuong, true);
    return () => document.removeEventListener('pointerdown', xuong, true);
  }, [ph, mo]);
  // Đo chiều cao thật của thanh thêm việc để thanh Hoàn tác xoá nằm ngay trên nó (CSS: html.co-form-viec, biến --tf-cao)
  useEffect(() => {
    const f = formRef.current;
    if (!ph || !f) return undefined;
    const root = document.documentElement;
    const do_ = () => root.style.setProperty('--tf-cao', Math.round(f.getBoundingClientRect().height) + 'px');
    do_();
    root.classList.add('co-form-viec');
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(do_) : null;
    ro?.observe(f);
    return () => { ro?.disconnect(); root.classList.remove('co-form-viec'); root.style.removeProperty('--tf-cao'); };
  }, [ph]);

  const submit = async (e) => {
    e.preventDefault();
    const text = chuanTenViec(draftRef.current);
    if (!text) { if (ph) inputRef.current?.focus(); return; } // nút "+" khi ô trống: không tạo việc rỗng
    datDraft('');
    if (ph) inputRef.current?.focus();                        // giữ con trỏ để gõ tiếp
    await addTask({ date, zone, text, tags });
  };
  const tagBtns = <TagBtns tags={tags} label="Nhãn của việc mới" giuConTro={ph} onToggle={(tag) => setTags(batTatNhan(tags, tag))} />;
  const input = (
    <>
      <label htmlFor={variant + '-draft'} className="sr-only">Nội dung công việc</label>
      <input id={variant + '-draft'} type="text" {...vt.props}
        onFocus={(e) => { vt.props.onFocus(e); if (ph) setMo(true); }}
        onClick={(e) => { vt.props.onClick(e); if (ph) setMo(true); }} // đang có con trỏ mà chưa bung (vd. ô vừa thu lại) thì chạm lại sẽ bung
        placeholder={ph ? 'Ghi việc cần làm…' : 'Ghi chú việc cần làm…'} autoComplete="off" className={ph ? 'tf-in' : 'bare-input'} />
    </>
  );
  if (!ph) {
    return (
      <form onSubmit={submit} className="card task-form-pc">
        {vt.strip}
        {input}
        <div className="task-form-bar">
          <label htmlFor="pc-zone" className="sr-only">Khu vực</label>
          <select id="pc-zone" value={zone} onChange={(e) => setZone(e.target.value)} className="select">
            {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
          <div className="row8"><span className="muted small">Nhãn</span>{tagBtns}</div>
          <span className="grow" />
          <button type="submit" className="btn primary">Thêm việc</button>
        </div>
      </form>
    );
  }
  return (
    <form ref={formRef} onSubmit={submit} className={'task-form-ph' + (mo ? ' mo' : '') + (banPhim ? ' kb' : '')}
      style={banPhim ? { transform: `translateY(${-banPhim.duoi}px)` } : undefined}
      onPointerDownCapture={() => { trongForm.current = true; clearTimeout(hetChamTimer.current); }}>
      {vt.strip}
      <div className="tf-row">
        {input}
        <button type="submit" className="tf-plus" aria-label="Thêm việc" onPointerDown={giuConTro} onMouseDown={giuConTro}><PlusIcon /></button>
      </div>
      {mo && (
        <>
          <div className="chips-sheet noscroll tf-zones" role="group" aria-label="Khu vực">
            {ZONES.map((z) => (
              <button key={z} type="button" aria-pressed={zone === z} className={'chip' + (zone === z ? ' on' : '')}
                onPointerDown={giuConTro} onMouseDown={giuConTro} onClick={() => setZone(z)}>{z}</button>
            ))}
          </div>
          {tagBtns}
        </>
      )}
    </form>
  );
}
/** Lịch tháng: số dưới mỗi ngày là số việc chưa xong. */
export function Calendar({ tasks, viewDate, today, month, setMonth, onPick, onClose }) {
  const dongSheet = useDongSheet(); // trong bảng: đóng có chuyển động
  const dong = onClose && (dongSheet ? () => dongSheet(onClose) : onClose);
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
      <button key={iso} type="button" onClick={() => { onPick(iso); dong?.(); }}
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
          {dong && <button type="button" className="icon-btn" aria-label="Đóng lịch" onClick={dong}><XIcon /></button>}
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
